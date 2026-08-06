import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  ArcPlanSchema,
  CanonExtensionSchema,
  PlanAssessmentSchema,
  RollingPlanSchema,
  StoryFactoryError,
  WorldMechanicSchema,
  type ArcPlan,
  type ModelRoutes,
  type PlanAssessment,
  type RollingPlan,
  type StoryKernel,
  type StoryState,
} from './contracts';
import type { ContinuityPacket } from './memory';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { geminiProvider } from './provider';

// Defined here, not in release.ts: release → benchmark → planner already exists, so a
// planner → release import closes a cycle and breaks the production bundle (TDZ at init).
export const FACTORY_PLANNER_VERSION = 'story-factory-planner-66-plan-checkpoint';
import { EDITOR_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT, PLAN_JUDGE_SYSTEM_PROMPT } from './prompts';
import {
  applyCanonExtension,
  collectPlanAdvisories,
  validateArcAgainstKernel,
  validateArcResourceReachability,
  validateRollingPlan,
  type PlanAdvisory,
} from './validation';

type PlanRevisionIssues = Extract<PlanAssessment, { status: 'revise' }>['issues'];

export type PlannerAttemptTelemetry = {
  attempt: 'initial' | 'mechanical_repair' | 'judge_replan' | 'judge_replan_mechanical_repair';
  responseDigest: string;
  status: 'validated' | 'invalid';
  validationMessage: string | null;
  validationEvidence: unknown;
  usage: ProviderUsage;
};

const PlannerScalarSchema = z.union([z.string(), z.number(), z.null()]);
const PlannerCompactDeltaSchema = z.object({
  id: z.string(),
  k: z.enum(['fact', 'resource_numeric', 'resource_state', 'knowledge', 'promise', 'relationship']),
  target: z.string(),
  counterpart: z.string().nullable(),
  before: PlannerScalarSchema,
  change: z.number().nullable(),
  after: PlannerScalarSchema,
  source: z.string().nullable(),
  sink: z.string().nullable(),
}).strict();
const PlannerCompactSceneSchema = z.object({
  id: z.string(),
  pov: z.string(),
  people: z.array(z.string()).min(1).max(16),
  loc: z.string(),
  dur: z.number().int().min(1).max(10_000),
  travel: z.number().int().min(0).max(100_000),
  goal: z.string(),
  block: z.string(),
  act: z.string(),
  deltaIds: z.array(z.string()).max(20),
}).strict();

const PlannerCompactChapterSchema = z.object({
  v: z.literal(2),
  n: z.number().int().min(1),
  arc: z.number().int().min(1),
  time: z.number().int().min(0),
  pre: z.array(z.object({
    k: z.enum(['fact', 'resource', 'location', 'promise']),
    id: z.string(),
    value: z.union([z.string(), z.number()]),
  }).strict()).max(30),
  rules: z.array(z.string()).max(12),
  scenes: z.array(PlannerCompactSceneSchema).min(1).max(5),
  deltas: z.array(PlannerCompactDeltaSchema).min(1).max(30),
  mechanics: z.array(z.object({
    id: z.string(),
    scene: z.string(),
    mechanic: z.string(),
    role: z.enum(['effect', 'support']),
    actor: z.string(),
    qty: z.number().finite().min(0.000001).max(1_000_000),
    facts: z.array(z.string()).max(20),
    primaryDeltaId: z.string(),
    additionalDeltaIds: z.array(z.string()).max(29),
  }).strict()).max(30),
}).strict();

export const PlannerRollingPlanResponseSchema = z.object({
  v: z.literal(2),
  start: z.number().int().min(1),
  chapters: z.array(PlannerCompactChapterSchema).min(1).max(3),
}).strict();

const PLANNER_COMPACT_CONTRACT = {
  deltaTarget: {
    fact: 'target=factId; before=null vì code lấy tuần tự từ State; after là giá trị fact mới; change/source/sink=null',
    resource_numeric: 'target=resourceId; change là số khác 0; before/after bắt buộc null vì code tính tuần tự từ State; change > 0 bắt buộc source khác null và sink=null; change < 0 bắt buộc sink khác null và source=null',
    resource_state: 'target=resourceId; before=null vì code lấy tuần tự từ State; after là trạng thái mới; source giải thích nguồn thay đổi; change/sink=null',
    knowledge: 'target=characterId; after=factId; source là nguồn học biết; before/change/sink=null',
    promise: 'target=promiseId; before=null vì code lấy tuần tự từ State; after thuộc open|progressed|resolved|abandoned; change/source/sink=null',
    relationship: 'target=characterId là chủ thể có thái độ/quan hệ nội tâm thay đổi; counterpart=counterpartId là người mà thái độ đó hướng tới; before=null vì code lấy tuần tự từ State; after chỉ mô tả trạng thái mới của target đối với counterpart; source giải thích sự kiện; change/sink=null. Nếu cả hai phía thay đổi thì cần hai delta riêng.',
  },
  chapterJson: {
    serialization: 'Trả chapters là mảng object theo schema; không stringify JSON bên trong string và không markdown.',
    chapterFields: ['v=2', 'n', 'arc', 'time', 'pre', 'rules', 'scenes', 'deltas', 'mechanics'],
    preFields: ['k', 'id', 'value'],
    sceneFields: ['id', 'pov', 'people', 'loc', 'dur', 'travel', 'goal', 'block', 'act', 'deltaIds'],
    deltaFields: ['id', 'k', 'target', 'counterpart', 'before', 'change', 'after', 'source', 'sink'],
    mechanicFields: ['id', 'scene', 'mechanic', 'role=effect|support', 'actor', 'qty', 'facts', 'primaryDeltaId', 'additionalDeltaIds'],
  },
  strictRules: [
    'Mọi field compact đều bắt buộc; dùng null đúng chỗ, không bỏ field. counterpart chỉ khác null với relationship.',
    'resource_numeric phải ghi nguồn/đích theo dấu của change: change dương có source cụ thể và sink=null; change âm có sink cụ thể và source=null; không tạo delta change=0.',
    'pre.k chỉ được fact|resource|location|promise; resource_numeric và resource_state chỉ dùng cho deltas.k.',
    'Mỗi pre.value là giá trị equality chính xác tại đầu chương, tuyệt đối không dùng như minimum/maximum hay ngưỡng. Ví dụ State có 100 thì pre resource phải là 100, không phải 20 với ý nghĩa “ít nhất 20”.',
    'time, dur và travel là số nguyên phút; mỗi scene.dur bắt buộc trong khoảng 1-10000, scene.travel trong khoảng 0-100000; tuyệt đối không dùng dur=0; travel không được là mảng hay mô tả tuyến đường.',
    'time là storyTime tuyệt đối ở cuối chương, không phải số phút của riêng chương. Với chương đầu: time >= State.storyTimeMinutes + tổng mọi scene.dur + scene.travel. Với chương sau: time >= time chương trước + tổng dur + travel của chương đó.',
    'Tính time tuần tự cho cả window sau khi đã chốt scenes; tuyệt đối không để time bằng thời điểm đầu chương khi chương có diễn biến.',
    'Với từng scene, theo dõi vị trí trước đó của từng người trong scene.people. Nếu bất kỳ người nào phải đi từ nơi khác tới scene.loc, scene.travel phải ít nhất bằng thời gian đường đi có hướng ngắn nhất qua travelEdges; không được lấy riêng thời gian của POV hoặc dùng 0.',
    'scene.id và mọi ID đều là string stable ID, không dùng số thứ tự trần.',
    'rules chỉ chứa world-rule ID tồn tại trong Kernel và có thể rỗng khi chương không trực tiếp thi hành luật thế giới nào.',
    'scene.people chỉ gồm nhân vật đang có mặt vật lý ở scene.loc; nếu nhân vật chỉ được nhắc tới hoặc là động lực ở nơi khác thì không đưa vào people.',
    'scene.deltaIds chỉ chứa delta ID tồn tại trong cùng chương; cảnh nối có thể rỗng nhưng cả chương vẫn phải có deltas.',
    'Mỗi delta phải được ít nhất một scene.deltaIds tham chiếu.',
    'rules chỉ chứa world-rule thực sự được thi hành trong chương. Nếu chương mới quyết định hoặc hứa sẽ dùng cơ chế ở tương lai thì chưa đưa rule đó vào rules.',
    'Mọi chuyển đổi/công suất/quyền hạn/constraint thực sự dùng phải có một mechanics entry tham chiếu worldMechanics ID. Mỗi entry bắt buộc gắn ít nhất một delta bằng primaryDeltaId; các delta còn lại nằm trong additionalDeltaIds. role=effect nghĩa mechanic trực tiếp tạo delta; role=support nghĩa mechanic chỉ cấp quyền hoặc điều kiện cho delta do mechanic effect khác tạo. Mỗi resource delta dương và mọi resource_state phải có đúng một effect owner nhưng có thể có nhiều support. Resource delta âm được phép không có mechanic chỉ khi đó là khoản thanh toán/tiêu hao ra bên ngoài, sink ghi rõ đích không phải mechanic ID và đúng ownerEntityId của resource có mặt trong scene.people. Input của conversion vẫn phải thuộc conversion effect. Conversion luôn effect; constraint luôn support. Conversion phải gắn đủ delta đầu vào và đầu ra. Capability là effect chỉ khi nó trực tiếp tạo resource/fact đúng resourceId và direction đã khai báo trong effectResources hoặc effectFactIds; nếu chỉ cho phép conversion/mechanic khác thì dùng support. Không tạo mechanics entry nếu cơ chế không liên quan state transition trong chương.',
    'Với conversion, primaryDeltaId phải là một resource_numeric delta thuộc input/output của conversion trong cùng scene; code sẽ tự suy ra toàn bộ numeric delta mà conversion sở hữu và không bao giờ cho conversion sở hữu fact hoặc resource_state. Với capability effect, chỉ gắn resource delta đúng direction hoặc fact thuộc effectFactIds.',
    'Nếu quên conversion use nhưng toàn bộ vector input/output và quantity khớp duy nhất với một worldMechanic trong cùng scene, compiler có thể khôi phục use tất định. Nếu có từ hai mechanic/vector cùng khớp, plan vẫn bị block; vì vậy vẫn phải khai báo mechanic khi ý nghĩa giao dịch có thể mơ hồ.',
    'Nếu quên capability effect nhưng delta, direction và đúng một allowed actor đang có mặt cùng khớp duy nhất, compiler có thể khôi phục use tất định. Hai capability cùng có thể tạo delta hoặc một conversion cạnh tranh vẫn làm plan bị block.',
    'Trước khi tạo resource_numeric dương hoặc resource_state delta, phải tìm đúng một conversion/capability effect trong arc có quyền tạo resource đó. Resource_numeric âm chỉ được bỏ effect mechanic khi chủ sở hữu resource có mặt và thực sự trả/tiêu ra ngoài với sink cụ thể không phải mechanic ID; nếu là đầu vào chuyển hóa thì vẫn phải gắn conversion. Nếu không thỏa một trong hai trường hợp, không được thay đổi resource; dùng fact, relationship hoặc promise delta chỉ khi loại đó phản ánh đúng thay đổi và ID hợp lệ.',
    'Kiểm công suất capability theo qty <= maximumUnitsPerMinute * availableMinutes. Với role=effect, availableMinutes=scene.dur. Với role=support, availableMinutes=scene.dur+scene.travel vì support có thể vận hành trong chính quãng chuyển cảnh.',
    'Khai báo đầy đủ mechanic tạo fact/resource và mechanic sử dụng nó trong đúng scene; compiler sẽ sắp thứ tự dependency tất định trong scene. Fact ngoại cảnh không có effect mechanic như thời tiết bắt đầu chỉ trở thành khả dụng sau scene ghi fact delta; capability phụ thuộc nó phải ở scene sau.',
    'Conversion là một batch nguyên tử: chỉ commit toàn bộ input và output trong cùng scene khi batch hoàn tất. Chương chuẩn bị chưa hoàn tất batch phải dùng fact hoặc resource_state để ghi tiến độ; không được trừ trước một phần input numeric rồi để output sang chương sau.',
    'Giữ goal/block/act ngắn và cơ học; chỉ đưa nhân vật, rule và delta thật sự cần cho chương.',
    'knowledge.after phải là fact ID đã tồn tại trong State. Nếu nhân vật học một fact mới, tạo fact delta khai báo fact đó trước knowledge delta trong cùng chương và gắn cả hai vào scene học biết.',
    'Fact được mechanic khác dùng làm requiredFact là precondition có kiểu và giá trị khóa. Nếu một capability tạo/cập nhật fact đó để mechanic sau sử dụng, fact delta.after phải đúng required expected trong factContracts; không thay marker precondition bằng tên bản vẽ, lời mô tả hoặc kết quả prose.',
    'Với fact, resource_state, promise và relationship, luôn gửi before=null; compiler tự lấy before thật và cập nhật tuần tự qua cả window. Không chép lại ledger bằng model.',
    'Relationship delta có hướng: target là chính nhân vật đổi thái độ, counterpart là người được hướng tới. Không ghi thành tích “đã thuyết phục được người khác” vào relationship của target; nếu người bị thuyết phục đổi niềm tin thì chính người đó phải là target. Nếu prose cần cả hai người đổi thái độ, tạo hai delta riêng.',
    'Không tạo location delta. Chỉ khai báo đúng scene.people, scene.loc và scene.travel; compiler là nguồn duy nhất tự sinh location delta từ vị trí đầu chương tới scene cuối của từng nhân vật.',
  ],
} as const;

type PlannerMechanicGuide = {
  planningRule: string;
  mechanics: Array<{
    mechanicId: string;
    kind: StoryKernel['worldMechanics'][number]['kind'];
    availableAtWindowStart: boolean;
    blockedByFacts: Array<{
      factId: string;
      expected: string | number;
      current: string | number | null;
      producerMechanicIds: string[];
    }>;
    blockedByResources: Array<{
      resourceId: string;
      current: string | number | null;
      minimumForOneUse: number | null;
      producerMechanicIds: string[];
    }>;
    capacity: null | {
      unit: string | null;
      maximumUnitsPerMinute: number;
      minimumAvailableMinutesForOneUnit: number;
      rule: string;
    };
    unlocksFactIds: string[];
    unlocksResourceIds: string[];
  }>;
};

/**
 * Compile the causal dependency graph into a small, state-aware projection.
 *
 * The Planner already receives the exact mechanics contract, but asking a
 * model to rediscover producer -> prerequisite edges inside a large Kernel is
 * both wasteful and unreliable. This guide contains no story prose and makes
 * no creative choice: it only states which active mechanics are legal now and
 * which active mechanics can unlock their missing inputs.
 */
export function buildPlannerMechanicGuide(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
}): PlannerMechanicGuide {
  const facts = new Map(input.state.facts.map(fact => [fact.id, fact.value]));
  const resources = new Map(input.state.resources.map(resource => [
    resource.resourceId,
    resource.value,
  ]));
  const activeIds = new Set(input.arc.activeMechanicIds);
  const activeMechanics = input.kernel.worldMechanics.filter(mechanic => activeIds.has(mechanic.id));

  const factProducers = new Map<string, string[]>();
  const resourceProducers = new Map<string, string[]>();
  const addProducer = (index: Map<string, string[]>, targetId: string, mechanicId: string) => {
    index.set(targetId, [...new Set([...(index.get(targetId) ?? []), mechanicId])].sort());
  };
  for (const mechanic of activeMechanics) {
    if (mechanic.kind === 'conversion') {
      mechanic.outputsPerBatch.forEach(output =>
        addProducer(resourceProducers, output.resourceId, mechanic.id));
    } else if (mechanic.kind === 'capability') {
      mechanic.effectFactIds.forEach(factId =>
        addProducer(factProducers, factId, mechanic.id));
      mechanic.effectResources
        .filter(effect => effect.direction === 'increase' || effect.direction === 'state_change')
        .forEach(effect => addProducer(resourceProducers, effect.resourceId, mechanic.id));
    }
  }

  const isUsableResource = (value: string | number | undefined): boolean => (
    typeof value === 'number' ? value > 0 : typeof value === 'string' && value.trim().length > 0
  );
  const conditionMatches = (
    current: string | number | undefined,
    expected: string | number,
  ): boolean => (
    current === expected
    || (typeof expected === 'number'
      && typeof current === 'string'
      && current.trim() !== ''
      && Number(current) === expected)
  );

  return {
    planningRule: 'Nếu availableAtWindowStart=false, phải dùng một producerMechanicId hợp lệ ở scene/chương trước rồi mới dùng mechanic bị khóa. Nếu producerMechanicIds rỗng thì không được dùng mechanic đó trong window.',
    mechanics: activeMechanics.map(mechanic => {
      const requiredFacts = mechanic.kind === 'conversion' ? [] : mechanic.requiredFacts;
      const requiredResources = mechanic.kind === 'conversion'
        ? mechanic.inputsPerBatch.map(inputResource => ({
          resourceId: inputResource.resourceId,
          minimumForOneUse: inputResource.amount,
        }))
        : mechanic.kind === 'capability'
          ? mechanic.requiredResourceIds.map(resourceId => ({
            resourceId,
            minimumForOneUse: null,
          }))
          : [];
      const blockedByFacts = requiredFacts
        .filter(condition => !conditionMatches(facts.get(condition.factId), condition.expected))
        .map(condition => ({
          factId: condition.factId,
          expected: condition.expected,
          current: facts.get(condition.factId) ?? null,
          producerMechanicIds: factProducers.get(condition.factId) ?? [],
        }));
      const blockedByResources = [...new Map(
        requiredResources.map(requirement => [requirement.resourceId, requirement]),
      ).values()]
        .filter(requirement => {
          const current = resources.get(requirement.resourceId);
          return requirement.minimumForOneUse === null
            ? !isUsableResource(current)
            : typeof current !== 'number' || current < requirement.minimumForOneUse;
        })
        .map(requirement => ({
          resourceId: requirement.resourceId,
          current: resources.get(requirement.resourceId) ?? null,
          minimumForOneUse: requirement.minimumForOneUse,
          producerMechanicIds: resourceProducers.get(requirement.resourceId) ?? [],
        }));
      const unlocksFactIds = mechanic.kind === 'capability'
        ? [...mechanic.effectFactIds].sort()
        : [];
      const unlocksResourceIds = mechanic.kind === 'conversion'
        ? [...new Set(mechanic.outputsPerBatch.map(output => output.resourceId))].sort()
        : mechanic.kind === 'capability'
          ? [...new Set(mechanic.effectResources
            .filter(effect => effect.direction === 'increase' || effect.direction === 'state_change')
            .map(effect => effect.resourceId))].sort()
          : [];

      return {
        mechanicId: mechanic.id,
        kind: mechanic.kind,
        availableAtWindowStart: blockedByFacts.length === 0 && blockedByResources.length === 0,
        blockedByFacts,
        blockedByResources,
        capacity: mechanic.kind === 'capability' && mechanic.maximumUnitsPerMinute !== null
          ? {
            unit: mechanic.capacityUnit,
            maximumUnitsPerMinute: mechanic.maximumUnitsPerMinute,
            minimumAvailableMinutesForOneUnit: Math.ceil(1 / mechanic.maximumUnitsPerMinute),
            rule: 'availableMinutes phải >= ceil(qty / maximumUnitsPerMinute); effect dùng scene.dur, support dùng scene.dur + scene.travel.',
          }
          : null,
        unlocksFactIds,
        unlocksResourceIds,
      };
    }),
  };
}

function signedConversionVector(
  mechanic: Extract<StoryKernel['worldMechanics'][number], { kind: 'conversion' }>,
): Array<{ resourceId: string; amount: number }> {
  const signed = new Map<string, { resourceId: string; amount: number }>();
  const add = (resourceId: string, amount: number) => {
    const direction = amount < 0 ? 'input' : 'output';
    const key = `${resourceId}\u0000${direction}`;
    const previous = signed.get(key);
    signed.set(key, {
      resourceId,
      amount: (previous?.amount ?? 0) + amount,
    });
  };
  mechanic.inputsPerBatch.forEach(item => add(item.resourceId, -item.amount));
  mechanic.outputsPerBatch.forEach(item => add(item.resourceId, item.amount));
  return [...signed.values()].filter(item => Math.abs(item.amount) > 1e-9);
}

function deriveEffectOwnership(
  chapter: z.infer<typeof PlannerCompactChapterSchema>,
  kernel: StoryKernel | undefined,
): Map<string, string[]> {
  const ownership = new Map<string, string[]>();
  if (!kernel) return ownership;
  const mechanics = new Map(kernel.worldMechanics.map(mechanic => [mechanic.id, mechanic]));
  const claimed = new Set<string>();
  const chapterDeltaOrder = new Map(chapter.deltas.map((delta, index) => [delta.id, index]));

  // Conversion contracts are quantitative and therefore stronger than the
  // model's duplicated delta links. Allocate their signed resource deltas
  // first. This correctly separates a chained +1000 output from the following
  // -1000 input even when both conversions run in the same scene.
  for (const use of chapter.mechanics) {
    const mechanic = mechanics.get(use.mechanic);
    if (mechanic?.kind !== 'conversion') continue;
    const sceneDeltaIds = new Set(
      chapter.scenes.find(scene => scene.id === use.scene)?.deltaIds ?? [],
    );
    const signedExpected = signedConversionVector(mechanic).map(item => ({
      resourceId: item.resourceId,
      amount: item.amount * use.qty,
    }));
    const netExpected = new Map<string, number>();
    for (const leg of signedExpected) {
      netExpected.set(leg.resourceId, (netExpected.get(leg.resourceId) ?? 0) + leg.amount);
    }
    const preferred = new Map(
      [use.primaryDeltaId, ...use.additionalDeltaIds].map((deltaId, index) => [deltaId, index]),
    );
    const owned: string[] = [];
    for (const resourceId of new Set(signedExpected.map(item => item.resourceId))) {
      const candidates = chapter.deltas
        .filter(delta => (
          !claimed.has(delta.id)
          && sceneDeltaIds.has(delta.id)
          && delta.k === 'resource_numeric'
          && delta.target === resourceId
          && delta.change !== null
        ))
        .sort((left, right) => (
          (preferred.get(left.id) ?? Number.MAX_SAFE_INTEGER)
          - (preferred.get(right.id) ?? Number.MAX_SAFE_INTEGER)
          || (chapterDeltaOrder.get(left.id) ?? 0) - (chapterDeltaOrder.get(right.id) ?? 0)
        ));
      const netAmount = netExpected.get(resourceId) ?? 0;
      const exactNet = Math.abs(netAmount) <= 1e-9
        ? undefined
        : candidates.find(delta => Math.abs((delta.change ?? 0) - netAmount) <= 1e-9);
      if (exactNet) {
        owned.push(exactNet.id);
        claimed.add(exactNet.id);
        continue;
      }
      for (const { amount } of signedExpected.filter(item => item.resourceId === resourceId)) {
        const directional = candidates.filter(delta => (
          !claimed.has(delta.id)
          && Math.sign(delta.change ?? 0) === Math.sign(amount)
        ));
        const exact = directional.find(delta => Math.abs((delta.change ?? 0) - amount) <= 1e-9);
        if (exact) {
          owned.push(exact.id);
          claimed.add(exact.id);
          continue;
        }
        let accumulated = 0;
        for (const candidate of directional) {
          owned.push(candidate.id);
          claimed.add(candidate.id);
          accumulated += candidate.change ?? 0;
          if (Math.abs(accumulated - amount) <= 1e-9
            || Math.abs(accumulated) >= Math.abs(amount)) break;
        }
      }
    }
    ownership.set(use.id, owned);
  }

  // Capability effects have a declared resource direction/fact allow-list but
  // no quantitative conversion equation. Respect the model's selected delta
  // only after conversion ownership has been resolved, and never double-claim.
  for (const use of chapter.mechanics) {
    const mechanic = mechanics.get(use.mechanic);
    if (mechanic?.kind !== 'capability' || use.role !== 'effect') continue;
    const sceneDeltaIds = new Set(
      chapter.scenes.find(scene => scene.id === use.scene)?.deltaIds ?? [],
    );
    const resourceDirections = new Set(
      mechanic.effectResources.map(effect => `${effect.resourceId}:${effect.direction}`),
    );
    const factIds = new Set(mechanic.effectFactIds);
    const owned = [use.primaryDeltaId, ...use.additionalDeltaIds].filter(deltaId => {
      if (claimed.has(deltaId) || !sceneDeltaIds.has(deltaId)) return false;
      const delta = chapter.deltas.find(item => item.id === deltaId);
      if (!delta) return false;
      if (delta.k === 'fact') return factIds.has(delta.target);
      if (delta.k === 'resource_state') {
        return resourceDirections.has(`${delta.target}:state_change`);
      }
      if (delta.k === 'resource_numeric' && delta.change !== null) {
        const direction = delta.change > 0 ? 'increase' : 'decrease';
        return resourceDirections.has(`${delta.target}:${direction}`);
      }
      return false;
    });
    owned.forEach(deltaId => claimed.add(deltaId));
    ownership.set(use.id, owned);
  }
  return ownership;
}

function inferExactConversionUses(
  chapter: z.infer<typeof PlannerCompactChapterSchema>,
  kernel: StoryKernel | undefined,
): z.infer<typeof PlannerCompactChapterSchema> {
  if (!kernel) return chapter;
  const augmented = {
    ...chapter,
    mechanics: [...chapter.mechanics],
  };
  const conversions = kernel.worldMechanics.filter(mechanic => mechanic.kind === 'conversion');
  const numericDeltas = chapter.deltas.filter(delta => (
    delta.k === 'resource_numeric' && delta.change !== null
  ));

  for (let pass = 0; pass < numericDeltas.length; pass += 1) {
    const ownership = deriveEffectOwnership(augmented, kernel);
    const claimed = new Set(
      augmented.mechanics
        .filter(use => use.role === 'effect')
        .flatMap(use => ownership.get(use.id) ?? []),
    );
    const unclaimed = numericDeltas.filter(delta => !claimed.has(delta.id));
    if (!unclaimed.length) break;
    const candidates: Array<{
      sceneId: string;
      mechanicId: string;
      quantity: number;
      deltaIds: string[];
    }> = [];

    for (const scene of chapter.scenes) {
      const sceneDeltaIds = new Set(scene.deltaIds);
      const available = unclaimed.filter(delta => sceneDeltaIds.has(delta.id));
      for (const mechanic of conversions) {
        const perBatch = signedConversionVector(mechanic);
        const quantities = new Set<number>();
        for (const delta of available) {
          const unit = perBatch.find(item => (
            item.resourceId === delta.target
            && Math.sign(item.amount) === Math.sign(delta.change ?? 0)
          ))?.amount;
          if (!unit || Math.sign(unit) !== Math.sign(delta.change ?? 0)) continue;
          const quantity = (delta.change ?? 0) / unit;
          if (quantity > 0 && Number.isFinite(quantity)) quantities.add(quantity);
        }
        for (const quantity of [...quantities].sort((left, right) => left - right)) {
          if (mechanic.maximumBatchesPerUse !== null
            && quantity > mechanic.maximumBatchesPerUse + 1e-9) continue;
          const matched: string[] = [];
          let complete = true;
          for (const { resourceId, amount: unit } of perBatch) {
            const expected = unit * quantity;
            if (Math.abs(expected) <= 1e-9) continue;
            const exact = available.filter(delta => (
              delta.target === resourceId
              && Math.abs((delta.change ?? 0) - expected) <= 1e-9
            ));
            // Inference is fail-closed: an exact vector must identify one and
            // only one delta for every leg. Ambiguous matches stay unowned and
            // are rejected by causal validation.
            if (exact.length !== 1) {
              complete = false;
              break;
            }
            matched.push(exact[0].id);
          }
          if (complete && matched.length) {
            candidates.push({
              sceneId: scene.id,
              mechanicId: mechanic.id,
              quantity,
              deltaIds: [...new Set(matched)],
            });
          }
        }
      }
    }

    const candidatesByDelta = new Map<string, typeof candidates>();
    for (const candidate of candidates) {
      for (const deltaId of candidate.deltaIds) {
        candidatesByDelta.set(deltaId, [
          ...(candidatesByDelta.get(deltaId) ?? []),
          candidate,
        ]);
      }
    }
    const selected = candidates
      .filter(candidate => candidate.deltaIds.every(deltaId => (
        candidatesByDelta.get(deltaId)?.length === 1
      )))
      .sort((left, right) => (
        chapter.scenes.findIndex(scene => scene.id === left.sceneId)
        - chapter.scenes.findIndex(scene => scene.id === right.sceneId)
        || left.mechanicId.localeCompare(right.mechanicId)
        || left.quantity - right.quantity
      ));
    let added = false;
    const selectedDeltaIds = new Set<string>();
    for (const candidate of selected) {
      if (candidate.deltaIds.some(deltaId => selectedDeltaIds.has(deltaId))) continue;
      const scene = chapter.scenes.find(item => item.id === candidate.sceneId);
      if (!scene) continue;
      const digest = createHash('sha256')
        .update(`${candidate.sceneId}\u0000${candidate.mechanicId}\u0000${candidate.quantity}\u0000${candidate.deltaIds.join('\u0000')}`)
        .digest('hex')
        .slice(0, 12);
      augmented.mechanics.push({
        id: `inferred_${digest}`,
        scene: candidate.sceneId,
        mechanic: candidate.mechanicId,
        role: 'effect',
        actor: scene.pov,
        qty: candidate.quantity,
        facts: [],
        primaryDeltaId: candidate.deltaIds[0],
        additionalDeltaIds: candidate.deltaIds.slice(1),
      });
      candidate.deltaIds.forEach(deltaId => selectedDeltaIds.add(deltaId));
      added = true;
    }
    if (!added) break;
  }
  return augmented;
}

function inferExactCapabilityUses(
  chapter: z.infer<typeof PlannerCompactChapterSchema>,
  kernel: StoryKernel | undefined,
): z.infer<typeof PlannerCompactChapterSchema> {
  if (!kernel) return chapter;
  const augmented = {
    ...chapter,
    mechanics: [...chapter.mechanics],
  };
  const ownership = deriveEffectOwnership(augmented, kernel);
  const claimed = new Set(
    augmented.mechanics
      .filter(use => use.role === 'effect')
      .flatMap(use => ownership.get(use.id) ?? []),
  );
  const capabilities = kernel.worldMechanics.filter(mechanic => mechanic.kind === 'capability');
  const conversions = kernel.worldMechanics.filter(mechanic => mechanic.kind === 'conversion');
  const candidatesByDelta = new Map<string, Array<{
    sceneId: string;
    mechanicId: string;
    actorId: string;
  }>>();

  for (const scene of chapter.scenes) {
    const participantIds = new Set([scene.pov, ...scene.people]);
    for (const deltaId of scene.deltaIds) {
      if (claimed.has(deltaId)) continue;
      const delta = chapter.deltas.find(item => item.id === deltaId);
      if (!delta || !['fact', 'resource_numeric', 'resource_state'].includes(delta.k)) continue;
      // A partial conversion vector must never be reinterpreted as a
      // capability effect merely to make validation pass.
      if (delta.k === 'resource_numeric' && delta.change !== null) {
        const conversionCouldOwn = conversions.some(mechanic => (
          delta.change! < 0
            ? mechanic.inputsPerBatch.some(item => item.resourceId === delta.target)
            : mechanic.outputsPerBatch.some(item => item.resourceId === delta.target)
        ));
        if (conversionCouldOwn) continue;
      }
      for (const mechanic of capabilities) {
        const matches = delta.k === 'fact'
          ? mechanic.effectFactIds.includes(delta.target)
          : delta.k === 'resource_state'
            ? mechanic.effectResources.some(effect => (
              effect.resourceId === delta.target && effect.direction === 'state_change'
            ))
            : mechanic.effectResources.some(effect => (
              effect.resourceId === delta.target
              && effect.direction === ((delta.change ?? 0) > 0 ? 'increase' : 'decrease')
            ));
        if (!matches) continue;
        const actors = mechanic.allowedActorIds.filter(actorId => participantIds.has(actorId));
        if (actors.length !== 1) continue;
        candidatesByDelta.set(deltaId, [
          ...(candidatesByDelta.get(deltaId) ?? []),
          {
            sceneId: scene.id,
            mechanicId: mechanic.id,
            actorId: actors[0],
          },
        ]);
      }
    }
  }

  const unique = [...candidatesByDelta.entries()]
    .filter(([, candidates]) => candidates.length === 1)
    .map(([deltaId, candidates]) => ({ deltaId, ...candidates[0] }));
  const groups = new Map<string, typeof unique>();
  for (const candidate of unique) {
    const key = `${candidate.sceneId}\u0000${candidate.mechanicId}\u0000${candidate.actorId}`;
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  for (const group of [...groups.values()].sort((left, right) => (
    chapter.scenes.findIndex(scene => scene.id === left[0].sceneId)
      - chapter.scenes.findIndex(scene => scene.id === right[0].sceneId)
      || left[0].mechanicId.localeCompare(right[0].mechanicId)
  ))) {
    const numericQuantities = [...new Set(group.flatMap(candidate => {
      const delta = chapter.deltas.find(item => item.id === candidate.deltaId);
      return delta?.k === 'resource_numeric' && delta.change !== null
        ? [Math.abs(delta.change)]
        : [];
    }))];
    if (numericQuantities.length > 1) continue;
    const quantity = numericQuantities[0] ?? 1;
    const deltaIds = group.map(candidate => candidate.deltaId);
    const digest = createHash('sha256')
      .update(`${group[0].sceneId}\u0000${group[0].mechanicId}\u0000${group[0].actorId}\u0000${quantity}\u0000${deltaIds.join('\u0000')}`)
      .digest('hex')
      .slice(0, 12);
    augmented.mechanics.push({
      id: `inferred_${digest}`,
      scene: group[0].sceneId,
      mechanic: group[0].mechanicId,
      role: 'effect',
      actor: group[0].actorId,
      qty: quantity,
      facts: [],
      primaryDeltaId: deltaIds[0],
      additionalDeltaIds: deltaIds.slice(1),
    });
  }
  return augmented;
}

function orderMechanicUsesByDependency(
  chapter: z.infer<typeof PlannerCompactChapterSchema>,
  kernel: StoryKernel | undefined,
  effectOwnership: Map<string, string[]>,
): z.infer<typeof PlannerCompactChapterSchema>['mechanics'] {
  if (!kernel) return chapter.mechanics;
  const mechanics = new Map(kernel.worldMechanics.map(mechanic => [mechanic.id, mechanic]));
  const deltas = new Map(chapter.deltas.map(delta => [delta.id, delta]));
  const sceneOrder = new Map(chapter.scenes.map((scene, index) => [scene.id, index]));
  const originalOrder = new Map(chapter.mechanics.map((use, index) => [use.id, index]));
  const result: z.infer<typeof PlannerCompactChapterSchema>['mechanics'] = [];

  for (const scene of chapter.scenes) {
    const uses = chapter.mechanics.filter(use => use.scene === scene.id);
    const dependencies = new Map(uses.map(use => [use.id, new Set<string>()]));
    for (const consumer of uses) {
      const consumerMechanic = mechanics.get(consumer.mechanic);
      if (!consumerMechanic) continue;
      const requiredFacts = consumerMechanic.kind === 'capability'
        || consumerMechanic.kind === 'constraint'
        ? consumerMechanic.requiredFacts
        : [];
      const requiredResources = new Set<string>();
      if (consumerMechanic.kind === 'capability') {
        consumerMechanic.requiredResourceIds.forEach(resourceId => requiredResources.add(resourceId));
      }
      if (consumerMechanic.kind === 'conversion') {
        consumerMechanic.inputsPerBatch.forEach(input => requiredResources.add(input.resourceId));
      }
      for (const producer of uses) {
        if (producer.id === consumer.id || producer.role !== 'effect') continue;
        const ownedDeltas = (effectOwnership.get(producer.id) ?? [])
          .map(deltaId => deltas.get(deltaId))
          .filter((delta): delta is NonNullable<typeof delta> => Boolean(delta));
        const producesRequiredFact = requiredFacts.some(required => (
          ownedDeltas.some(delta => (
            delta.k === 'fact'
            && delta.target === required.factId
            && String(delta.after) === String(required.expected)
          ))
        ));
        const producesRequiredResource = ownedDeltas.some(delta => (
          requiredResources.has(delta.target)
          && (
            (delta.k === 'resource_numeric' && (delta.change ?? 0) > 0)
            || delta.k === 'resource_state'
          )
        ));
        if (producesRequiredFact || producesRequiredResource) {
          dependencies.get(consumer.id)!.add(producer.id);
        }
      }
    }
    const pending = new Map(uses.map(use => [use.id, use]));
    while (pending.size) {
      const ready = [...pending.values()]
        .filter(use => [...(dependencies.get(use.id) ?? [])].every(id => !pending.has(id)))
        .sort((left, right) => (
          (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0)
        ));
      if (!ready.length) {
        // Preserve the original order on a dependency cycle so the causal
        // validator can report the actual impossible plan rather than silently
        // inventing an order.
        result.push(...[...pending.values()].sort((left, right) => (
          (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0)
        )));
        pending.clear();
        break;
      }
      for (const use of ready) {
        result.push(use);
        pending.delete(use.id);
      }
    }
  }
  const knownScenes = new Set(chapter.scenes.map(scene => scene.id));
  result.push(...chapter.mechanics
    .filter(use => !knownScenes.has(use.scene))
    .sort((left, right) => (
      (sceneOrder.get(left.scene) ?? Number.MAX_SAFE_INTEGER)
      - (sceneOrder.get(right.scene) ?? Number.MAX_SAFE_INTEGER)
      || (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0)
    )));
  return result;
}

export function materializePlannerRollingPlan(
  value: z.infer<typeof PlannerRollingPlanResponseSchema>,
  initialState: StoryState,
  kernel?: StoryKernel,
): RollingPlan {
  const compact = PlannerRollingPlanResponseSchema.parse(value);
  const chapters = compact.chapters;
  const compactIssues = chapters.flatMap(chapter => {
    const augmented = inferExactCapabilityUses(
      inferExactConversionUses(chapter, kernel),
      kernel,
    );
    const ownership = deriveEffectOwnership(augmented, kernel);
    const ownedDeltaIds = new Set([...ownership.values()].flat());
    return augmented.deltas.flatMap(delta => {
      const issues: Array<{
        category: 'missing_provenance' | 'missing_effect_owner';
        chapterNumber: number;
        deltaId: string;
        resourceId: string;
        message: string;
      }> = [];
      if (delta.k === 'resource_state') {
        if (typeof delta.source !== 'string' || delta.source.trim().length < 2) {
          issues.push({
            category: 'missing_provenance',
            chapterNumber: chapter.n,
            deltaId: delta.id,
            resourceId: delta.target,
            message: 'resource_state requires a concrete source explaining the state transition.',
          });
        }
        if (kernel && !ownedDeltaIds.has(delta.id)) {
          issues.push({
            category: 'missing_effect_owner',
            chapterNumber: chapter.n,
            deltaId: delta.id,
            resourceId: delta.target,
            message: 'resource_state requires exactly one active capability effect owner; otherwise use an existing fact, relationship or promise delta.',
          });
        }
      }
      return issues;
    });
  });
  if (compactIssues.length) {
    throw new StoryFactoryError(
      'plan_blocked',
      `Planner compact window has ${compactIssues.length} independently repairable state-transition issues.`,
      { issues: compactIssues },
    );
  }
  const resourceBalances = new Map(initialState.resources.flatMap(resource => (
    resource.kind === 'numeric' ? [[resource.resourceId, resource.value] as const] : []
  )));
  const resourceStates = new Map(initialState.resources.flatMap(resource => (
    resource.kind === 'state' ? [[resource.resourceId, resource.value] as const] : []
  )));
  const factValues = new Map(initialState.facts.map(fact => [fact.id, fact.value] as const));
  const promiseStatuses = new Map(initialState.promises.map(promise => (
    [promise.promiseId, promise.status] as const
  )));
  const relationshipValues = new Map<string, string>(initialState.characters.flatMap(character => (
    Object.entries(character.relationshipState).map(([counterpartId, value]) => (
      [`${character.characterId}\u0000${counterpartId}`, value] as const
    ))
  )));
  const characterLocations = new Map(initialState.characters.map(character => (
    [character.characterId, character.locationId] as const
  )));
  const rolling = RollingPlanSchema.parse({
    schemaVersion: compact.v,
    startChapter: compact.start,
    plans: chapters.map(chapter => {
      const augmentedChapter = inferExactCapabilityUses(
        inferExactConversionUses(chapter, kernel),
        kernel,
      );
      const effectOwnership = deriveEffectOwnership(augmentedChapter, kernel);
      const orderedMechanicUses = orderMechanicUsesByDependency(
        augmentedChapter,
        kernel,
        effectOwnership,
      );
      return {
      schemaVersion: compact.v,
      chapterNumber: chapter.n,
      arcNumber: chapter.arc,
      storyTimeAfterMinutes: chapter.time,
      preconditions: chapter.pre.map(item => ({ kind: item.k, entityId: item.id, expected: item.value })),
      requiredWorldRuleIds: chapter.rules,
      scenes: chapter.scenes.map(scene => ({
        id: scene.id,
        povCharacterId: scene.pov,
        participantIds: scene.people,
        locationId: scene.loc,
        durationMinutes: scene.dur,
        travelMinutesFromPrevious: scene.travel,
        objective: scene.goal,
        obstacle: scene.block,
        action: scene.act,
        requiredDeltaIds: scene.deltaIds,
      })),
      requiredDeltas: chapter.deltas.map(delta => {
        if (delta.k === 'fact') {
          const before = factValues.get(delta.target) ?? null;
          const after = delta.after === null ? null : String(delta.after);
          if (after !== null) factValues.set(delta.target, after);
          return { id: delta.id, kind: delta.k, factId: delta.target, before, after };
        }
        if (delta.k === 'resource_numeric') {
          const before = resourceBalances.get(delta.target);
          if (before === undefined || delta.change === null || delta.change === 0) {
            throw new StoryFactoryError('plan_blocked', 'Planner numeric delta lacks a valid ledger balance or non-zero change.', {
              deltaId: delta.id,
              resourceId: delta.target,
              before: before ?? null,
              change: delta.change,
            });
          }
          const after = before + delta.change;
          resourceBalances.set(delta.target, after);
          return {
            id: delta.id,
            kind: delta.k,
            resourceId: delta.target,
            before,
            delta: delta.change,
            after,
            source: delta.source,
            sink: delta.sink,
          };
        }
        if (delta.k === 'resource_state') {
          const before = resourceStates.get(delta.target);
          if (before === undefined) {
            throw new StoryFactoryError('plan_blocked', 'Planner state-resource delta references a missing ledger resource.', {
              deltaId: delta.id,
              resourceId: delta.target,
            });
          }
          const after = delta.after === null ? null : String(delta.after);
          if (after !== null) resourceStates.set(delta.target, after);
          return { id: delta.id, kind: delta.k, resourceId: delta.target, before, after, source: delta.source };
        }
        if (delta.k === 'knowledge') return { id: delta.id, kind: delta.k, characterId: delta.target, factId: delta.after, source: delta.source };
        if (delta.k === 'relationship') {
          const key = `${delta.target}\u0000${delta.counterpart ?? ''}`;
          const before = relationshipValues.get(key) ?? null;
          const after = delta.after === null ? null : String(delta.after);
          if (after !== null) relationshipValues.set(key, after);
          return {
            id: delta.id,
            kind: delta.k,
            characterId: delta.target,
            counterpartId: delta.counterpart,
            before,
            after,
            source: delta.source,
          };
        }
        const before = promiseStatuses.get(delta.target);
        if (before === undefined) {
          throw new StoryFactoryError('plan_blocked', 'Planner promise delta references a missing ledger promise.', {
            deltaId: delta.id,
            promiseId: delta.target,
          });
        }
        if (typeof delta.after === 'string'
          && ['open', 'progressed', 'resolved', 'abandoned'].includes(delta.after)) {
          promiseStatuses.set(delta.target, delta.after as 'open' | 'progressed' | 'resolved' | 'abandoned');
        }
        return { id: delta.id, kind: delta.k, promiseId: delta.target, before, after: delta.after };
      }),
      mechanicUses: orderedMechanicUses.map(use => {
        const mechanic = kernel?.worldMechanics.find(item => item.id === use.mechanic);
        const declaredFacts = mechanic?.kind === 'capability' || mechanic?.kind === 'constraint'
          ? mechanic.requiredFacts.map(condition => condition.factId)
          : [];
        const modelDeltaIds = [use.primaryDeltaId, ...use.additionalDeltaIds];
        const sceneDeltaIds = new Set(
          chapter.scenes.find(scene => scene.id === use.scene)?.deltaIds ?? [],
        );
        const deltaIds = effectOwnership.get(use.id) ?? modelDeltaIds;
        return {
          id: use.id,
          sceneId: use.scene,
          mechanicId: use.mechanic,
          role: use.role,
          actorId: use.actor,
          quantity: use.qty,
          // Required facts belong to the mechanic contract. The compiler carries
          // them into the canonical plan instead of making the model duplicate
          // IDs it already selected by mechanicId. Validation still checks the
          // live sequential value, so this cannot make a false precondition true.
          preconditionFactIds: [...new Set([...use.facts, ...declaredFacts])],
          deltaIds,
        };
      }),
      };
    }),
  });
  for (const plan of rolling.plans) {
    for (const characterId of characterLocations.keys()) {
      const beforeLocationId = characterLocations.get(characterId)!;
      const appearances = plan.scenes.filter(scene => scene.participantIds.includes(characterId));
      const afterLocationId = appearances.at(-1)?.locationId ?? beforeLocationId;
      if (afterLocationId === beforeLocationId) continue;
      const existing = plan.requiredDeltas.filter(delta =>
        delta.kind === 'location' && delta.characterId === characterId);
      if (existing.length === 0) {
        const id = `loc_${plan.chapterNumber}_${createHash('sha256').update(characterId).digest('hex').slice(0, 12)}`;
        plan.requiredDeltas.push({
          id,
          kind: 'location',
          characterId,
          beforeLocationId,
          afterLocationId,
        });
        const firstMovement = appearances.find(scene => scene.locationId !== beforeLocationId);
        if (firstMovement && !firstMovement.requiredDeltaIds.includes(id)) {
          firstMovement.requiredDeltaIds.push(id);
        }
      }
      characterLocations.set(characterId, afterLocationId);
    }
  }
  return RollingPlanSchema.parse(rolling);
}

function plannerContractFailureEvidence(error: unknown): {
  kind: string;
  message: string;
  issues?: z.ZodIssue[];
} {
  if (error instanceof z.ZodError) {
    return {
      kind: 'ZodError',
      message: 'Planner compact output does not match the exact schema.',
      issues: error.issues,
    };
  }
  if (error instanceof Error) {
    return {
      kind: error.name || 'Error',
      message: error.message || 'Planner contract materialization failed.',
    };
  }
  return {
    kind: 'UnknownError',
    message: String(error),
  };
}

const WindowEvidenceSpanSchema = z.object({
  chapterNumber: z.number().int().min(1).max(1_200),
  quote: z.string().trim().min(5).max(320),
}).strict();

const WindowCheckEvidenceSchema = z.object({
  structureVariety: z.array(WindowEvidenceSpanSchema).min(2).max(5),
  reactionVariety: z.array(WindowEvidenceSpanSchema).min(2).max(5),
  voiceSeparation: z.array(WindowEvidenceSpanSchema).min(2).max(5),
  earnedProgression: z.array(WindowEvidenceSpanSchema).min(2).max(5),
  causalLearning: z.array(WindowEvidenceSpanSchema).min(2).max(5),
}).strict();

const WindowChapterPatternSchema = z.object({
  chapterNumber: z.number().int().min(1).max(1_200),
  dominantStructure: z.enum([
    'explain_then_demonstrate',
    'investigate_then_infer',
    'negotiate_then_trade',
    'attempt_fail_adapt',
    'confront_then_shift',
    'relationship_action',
    'explore_then_discover',
    'mixed_other',
  ]),
  validationSource: z.enum([
    'material_consequence',
    'self_assertion',
    'expert_surprise',
    'crowd_surprise',
    'opponent_reaction',
    'independent_measurement',
    'relationship_change',
    'unresolved',
  ]),
  evidenceStage: z.enum(['hypothesis', 'single_observation', 'repeated_observation', 'established_fact']),
  claimStrength: z.enum(['provisional', 'single_trial', 'repeatable', 'absolute']),
  evidence: z.array(WindowEvidenceSpanSchema).min(1).max(2),
}).strict();

const WindowIssueSchema = z.object({
  category: z.enum([
    'continuity_drift',
    'voice_drift',
    'repetition',
    'reward_loop',
    'progression',
    'resource_drift',
    'artifact_drift',
    'prose_pattern',
    'opposition_agency',
    'earned_progression',
    'premature_certainty',
  ]),
  evidence: z.array(WindowEvidenceSpanSchema).min(1).max(4),
  instruction: z.string().trim().min(5).max(1_000),
}).strict();

/**
 * Style-of-claim observations (prose_pattern, premature_certainty) are advisories:
 * recorded on the run row for the Writer prompts of the NEXT window, never blocking.
 * They are heuristic classifications that re-roll differently on every review pass
 * (temperature 0.4), so gating publication on them produced an unwinnable
 * whack-a-mole — the same failure mode the causal validator's advisory split fixed.
 * Coherence and ledger categories stay hard.
 */
export const ADVISORY_WINDOW_CATEGORIES: ReadonlySet<string> = new Set(['prose_pattern', 'premature_certainty']);

export const WindowPassSchema = z.object({
  status: z.literal('pass'),
  checks: z.object({
    structureVariety: z.literal(true),
    reactionVariety: z.literal(true),
    voiceSeparation: z.literal(true),
    earnedProgression: z.literal(true),
    causalLearning: z.literal(true),
  }).strict(),
  checkEvidence: WindowCheckEvidenceSchema,
  chapterPatterns: z.array(WindowChapterPatternSchema).length(5),
  issues: z.array(z.never()).length(0),
  advisories: z.array(WindowIssueSchema).max(4).default([]),
}).strict();

const WindowBlockSchema = z.object({
  status: z.literal('block'),
  checks: z.object({
    structureVariety: z.boolean(),
    reactionVariety: z.boolean(),
    voiceSeparation: z.boolean(),
    earnedProgression: z.boolean(),
    causalLearning: z.boolean(),
  }).strict(),
  checkEvidence: WindowCheckEvidenceSchema,
  chapterPatterns: z.array(WindowChapterPatternSchema).length(5),
  issues: z.array(WindowIssueSchema).min(1).max(3),
  advisories: z.array(WindowIssueSchema).max(4).default([]),
}).strict();

export const WindowReviewSchema = z.discriminatedUnion('status', [
  WindowPassSchema,
  WindowBlockSchema,
]);

/**
 * Gemini constrained decoding rejects the canonical review schema because it
 * nests five evidence arrays inside a discriminated union. Keep the durable
 * contract expressive, but ask the provider for one compact flat wire shape
 * and derive pass/block in application code. The model cannot self-declare a
 * pass while also reporting an issue.
 */
export const WindowReviewWireSchema = z.object({
  v: z.literal(1),
  checks: z.object({
    s: z.boolean(),
    r: z.boolean(),
    v: z.boolean(),
    e: z.boolean(),
    l: z.boolean(),
  }).strict(),
  evidence: z.array(z.object({
    k: z.enum(['s', 'r', 'v', 'e', 'l']),
    c: z.number().int(),
    q: z.string(),
  }).strict()).max(25),
  patterns: z.array(z.object({
    c: z.number().int(),
    s: z.enum(['xd', 'ii', 'nt', 'ta', 'cs', 'ra', 'ed', 'mo']),
    v: z.enum(['mc', 'sa', 'es', 'cs', 'or', 'im', 'rc', 'un']),
    e: z.enum(['h', 's', 'r', 'f']),
    k: z.enum(['p', 's', 'r', 'a']),
    q: z.string(),
  }).strict()).length(5),
  issues: z.array(z.object({
    k: z.enum(['cd', 'vd', 'rp', 'rl', 'pg', 'rd', 'ad', 'pp', 'oa', 'ep', 'pc']),
    c: z.number().int(),
    q: z.string(),
    fix: z.string(),
  }).strict()).max(3),
}).strict();

export function materializeWindowReview(value: unknown): WindowReview {
  const wire = WindowReviewWireSchema.parse(value);
  const checkNames = {
    s: 'structureVariety',
    r: 'reactionVariety',
    v: 'voiceSeparation',
    e: 'earnedProgression',
    l: 'causalLearning',
  } as const;
  const checkEvidence = Object.fromEntries(Object.entries(checkNames).map(([key, name]) => [
    name,
    wire.evidence
      .filter(item => item.k === key)
      .map(item => ({ chapterNumber: item.c, quote: item.q })),
  ]));
  const structures = {
    xd: 'explain_then_demonstrate',
    ii: 'investigate_then_infer',
    nt: 'negotiate_then_trade',
    ta: 'attempt_fail_adapt',
    cs: 'confront_then_shift',
    ra: 'relationship_action',
    ed: 'explore_then_discover',
    mo: 'mixed_other',
  } as const;
  const validationSources = {
    mc: 'material_consequence',
    sa: 'self_assertion',
    es: 'expert_surprise',
    cs: 'crowd_surprise',
    or: 'opponent_reaction',
    im: 'independent_measurement',
    rc: 'relationship_change',
    un: 'unresolved',
  } as const;
  const evidenceStages = {
    h: 'hypothesis',
    s: 'single_observation',
    r: 'repeated_observation',
    f: 'established_fact',
  } as const;
  const claimStrengths = {
    p: 'provisional',
    s: 'single_trial',
    r: 'repeatable',
    a: 'absolute',
  } as const;
  const issueCategories = {
    cd: 'continuity_drift',
    vd: 'voice_drift',
    rp: 'repetition',
    rl: 'reward_loop',
    pg: 'progression',
    rd: 'resource_drift',
    ad: 'artifact_drift',
    pp: 'prose_pattern',
    oa: 'opposition_agency',
    ep: 'earned_progression',
    pc: 'premature_certainty',
  } as const;
  const checks: z.infer<typeof WindowBlockSchema>['checks'] = {
    structureVariety: wire.checks.s,
    reactionVariety: wire.checks.r,
    voiceSeparation: wire.checks.v,
    earnedProgression: wire.checks.e,
    causalLearning: wire.checks.l,
  };
  const reported = wire.issues.map(issue => ({
    category: issueCategories[issue.k],
    evidence: [{ chapterNumber: issue.c, quote: issue.q }],
    instruction: issue.fix,
  }));
  const issues = reported.filter(issue => !ADVISORY_WINDOW_CATEGORIES.has(issue.category));
  const advisories = reported.filter(issue => ADVISORY_WINDOW_CATEGORIES.has(issue.category));
  if (!reported.length && !Object.values(checks).every(Boolean)) {
    throw new StoryFactoryError('infra_blocked', 'Window Review cannot fail a check without an evidence issue.');
  }
  for (const issue of issues) {
    if (issue.category === 'voice_drift') checks.voiceSeparation = false;
    else if (issue.category === 'repetition') checks.structureVariety = false;
    else if (issue.category === 'opposition_agency') checks.reactionVariety = false;
    else if (issue.category === 'reward_loop'
      || issue.category === 'progression'
      || issue.category === 'earned_progression') checks.earnedProgression = false;
    else checks.causalLearning = false;
  }
  if (!issues.length) {
    // Only advisories (or nothing) remain: the decision is pass, and the pass
    // contract requires every check true — advisory observations must not leave
    // a failed check behind as a blocking side channel.
    for (const key of Object.keys(checks) as Array<keyof typeof checks>) checks[key] = true;
  }
  return WindowReviewSchema.parse({
    status: issues.length ? 'block' : 'pass',
    checks,
    checkEvidence,
    chapterPatterns: wire.patterns.map(pattern => ({
      chapterNumber: pattern.c,
      dominantStructure: structures[pattern.s],
      validationSource: validationSources[pattern.v],
      evidenceStage: evidenceStages[pattern.e],
      claimStrength: claimStrengths[pattern.k],
      evidence: [{ chapterNumber: pattern.c, quote: pattern.q }],
    })),
    issues,
    advisories,
  });
}

const ArcLifecycleSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('continue'), nextArc: ArcPlanSchema, canonExtension: CanonExtensionSchema }).strict(),
  z.object({ status: z.literal('finale'), nextArc: ArcPlanSchema, canonExtension: CanonExtensionSchema }).strict(),
  z.object({ status: z.literal('complete'), nextArc: z.null(), canonExtension: z.null() }).strict(),
]);

export type WindowReview = z.infer<typeof WindowReviewSchema>;
export type ArcLifecycle = z.infer<typeof ArcLifecycleSchema>;

function validateWindowEvidence(
  review: WindowReview,
  chapters: Array<{ chapterNumber: number; content: string }>,
): void {
  const chapterMap = new Map(chapters.map(chapter => [chapter.chapterNumber, chapter.content]));
  const evidenceGroups = [
    ...Object.entries(review.checkEvidence),
    ...review.chapterPatterns.map((pattern, index) => [`chapterPatterns.${index}`, pattern.evidence] as const),
    ...review.issues.map((issue, index) => [`issues.${index}`, issue.evidence] as const),
  ];
  for (const [group, spans] of evidenceGroups) {
    for (const span of spans) {
      const prose = chapterMap.get(span.chapterNumber);
      if (!prose || !prose.includes(span.quote)) {
        throw new StoryFactoryError(
          'infra_blocked',
          'Window Review returned evidence that code cannot ground in the committed chapter prose.',
          { group, span },
        );
      }
    }
  }
  const patternNumbers = review.chapterPatterns.map(pattern => pattern.chapterNumber);
  const expectedNumbers = chapters.map(chapter => chapter.chapterNumber).sort((a, b) => a - b);
  if (
    new Set(patternNumbers).size !== chapters.length
    || [...patternNumbers].sort((a, b) => a - b).some((chapterNumber, index) => chapterNumber !== expectedNumbers[index])
  ) {
    throw new StoryFactoryError(
      'infra_blocked',
      'Window Review must analyze each committed chapter exactly once.',
      { expectedNumbers, patternNumbers },
    );
  }
  for (const [check, spans] of Object.entries(review.checkEvidence)) {
    if (new Set(spans.map(span => span.chapterNumber)).size < 2) {
      throw new StoryFactoryError(
        'infra_blocked',
        'Window Review check evidence must compare at least two different chapters.',
        { check, spans },
      );
    }
  }
}

function applyDeterministicWindowPolicy(
  review: WindowReview,
  realityMode: StoryKernel['realityMode'],
): WindowReview {
  const explainAndValidate = review.chapterPatterns.filter(pattern => (
    pattern.dominantStructure === 'explain_then_demonstrate'
    && ['expert_surprise', 'crowd_surprise', 'opponent_reaction'].includes(pattern.validationSource)
  ));
  const prematureCertainty = realityMode === 'grounded'
    ? review.chapterPatterns.filter(pattern => (
      pattern.claimStrength === 'absolute'
      && ['hypothesis', 'single_observation'].includes(pattern.evidenceStage)
    ))
    : [];
  const derivedIssues: z.infer<typeof WindowIssueSchema>[] = [];
  if (explainAndValidate.length >= 3) {
    derivedIssues.push({
      category: 'prose_pattern',
      evidence: explainAndValidate.slice(0, 4).flatMap(pattern => pattern.evidence.slice(0, 1)),
      instruction: 'Thay đổi cơ chế tạo và kiểm chứng kết quả; không tiếp tục dùng giải thích rồi biểu diễn để phản ứng kinh ngạc xác nhận nhân vật chính.',
    });
  }
  if (prematureCertainty.length > 0) {
    derivedIssues.push({
      category: 'premature_certainty',
      evidence: prematureCertainty.slice(0, 4).flatMap(pattern => pattern.evidence.slice(0, 1)),
      instruction: 'Trong bối cảnh grounded, giữ kết luận ở mức giả thuyết hoặc thử nghiệm cho tới khi có đủ quan sát lặp lại; không tuyên bố tối ưu hay tuyệt đối từ một lần thử.',
    });
  }
  if (derivedIssues.length === 0) return review;
  // Derived pattern signals are advisories by definition: the underlying labels
  // re-roll on every review pass, so blocking on them made the gate unwinnable.
  // The verdict and checks stay exactly as the reviewer returned them.
  return WindowReviewSchema.parse({
    ...review,
    advisories: [...review.advisories, ...derivedIssues].slice(0, 4),
  });
}

const PlanJudgeWireSchema = z.object({
  status: z.enum(['pass', 'revise']),
  checks: z.object({
    protagonistAgency: z.boolean(),
    earnedProgression: z.boolean(),
    domainPlausibility: z.boolean(),
    oppositionAgenda: z.boolean(),
    sceneVariety: z.boolean(),
    stageAlignment: z.boolean(),
    outcomeWeight: z.boolean(),
  }).strict(),
  checkEvidence: z.object({
    protagonistAgency: z.string().trim().min(3).max(800),
    earnedProgression: z.string().trim().min(3).max(800),
    domainPlausibility: z.string().trim().min(3).max(800),
    oppositionAgenda: z.string().trim().min(3).max(800),
    sceneVariety: z.string().trim().min(3).max(800),
    stageAlignment: z.string().trim().min(3).max(800),
    outcomeWeight: z.string().trim().min(3).max(800),
  }).strict(),
  issues: z.array(PlanAssessmentSchema.options[1].shape.issues.element).max(3),
}).strict();

function validatePlanAssessment(plan: RollingPlan, assessment: PlanAssessment): void {
  if (assessment.status === 'pass') return;
  for (const issue of assessment.issues) {
    const chapter = plan.plans.find(item => item.chapterNumber === issue.chapterNumber);
    if (!chapter) {
      throw new StoryFactoryError('infra_blocked', 'Plan Judge referenced an unknown chapter.', issue);
    }
    if (issue.sceneId && !chapter.scenes.some(scene => scene.id === issue.sceneId)) {
      throw new StoryFactoryError('infra_blocked', 'Plan Judge referenced an unknown scene.', issue);
    }
    if (issue.deltaId && !chapter.requiredDeltas.some(delta => delta.id === issue.deltaId)) {
      throw new StoryFactoryError('infra_blocked', 'Plan Judge referenced an unknown delta.', issue);
    }
  }
}

function digestRollingPlan(plan: RollingPlan): string {
  return createHash('sha256').update(JSON.stringify(plan)).digest('hex');
}

function planIssueSnapshot(plan: RollingPlan, assessment: PlanAssessment): unknown[] {
  if (assessment.status === 'pass') return [];
  return assessment.issues.map(issue => {
    const chapter = plan.plans.find(item => item.chapterNumber === issue.chapterNumber);
    const scene = issue.sceneId
      ? chapter?.scenes.find(item => item.id === issue.sceneId)
      : undefined;
    const delta = issue.deltaId
      ? chapter?.requiredDeltas.find(item => item.id === issue.deltaId)
      : undefined;
    return {
      issue,
      scene: scene
        ? {
            id: scene.id,
            objective: scene.objective,
            obstacle: scene.obstacle,
            action: scene.action,
            requiredDeltaIds: scene.requiredDeltaIds,
          }
        : null,
      delta: delta ?? null,
    };
  });
}

export async function assessRollingPlan(input: {
  provider: StoryModelProvider;
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  rollingPlan: RollingPlan;
  model: string;
  repairIssues?: PlanRevisionIssues;
  advisories?: PlanAdvisory[];
}): Promise<{ assessment: PlanAssessment; usage: ProviderUsage }> {
  const auditSignals = input.rollingPlan.plans.map(chapter => ({
    chapterNumber: chapter.chapterNumber,
    scenes: chapter.scenes.map(scene => ({
      sceneId: scene.id,
      participants: scene.participantIds,
      objective: scene.objective,
      obstacle: scene.obstacle,
      plannedAction: scene.action,
    })),
    stateTransitions: chapter.requiredDeltas.map(delta => ({ deltaId: delta.id, kind: delta.kind })),
  }));
  const result = await input.provider.json({
    model: input.model,
    system: PLAN_JUDGE_SYSTEM_PROMPT,
    prompt: JSON.stringify({
      task: 'Đánh giá rolling plan theo agency, đối lực, tích lũy, biến hóa cảnh và stage; không chấm prose, không kiểm số học.',
      kernel: {
        protagonistId: input.kernel.protagonistId,
        realityMode: input.kernel.realityMode,
        worldBaseline: input.kernel.worldModel.baseline,
        characters: input.kernel.characters.map(character => ({
          id: character.id,
          role: character.role,
          agenda: character.agenda,
          competence: character.competence,
          constraint: character.constraint,
        })),
        pleasureLoop: input.kernel.pleasureLoop,
        activeWorldMechanics: input.kernel.worldMechanics.filter(mechanic =>
          input.arc.activeMechanicIds.includes(mechanic.id)),
        activeWorldRules: input.kernel.worldRules.filter(rule =>
          input.arc.activeWorldRuleIds.includes(rule.id)),
      },
      arc: input.arc,
      state: input.state,
      rollingPlan: input.rollingPlan,
      auditSignals,
      // Pattern matches over free-form scene text that the code refuses to treat as
      // verdicts. Each is a question to answer from the window, not a defect to accept.
      advisorySignals: input.advisories?.length
        ? {
          note: 'Đây là tín hiệu từ dò khuôn mẫu trên văn bản cảnh, KHÔNG phải lỗi đã xác nhận. Chỉ mở issue nếu bạn đọc plan và thấy đúng là sai; nếu không thì bỏ qua.',
          signals: input.advisories,
        }
        : undefined,
      mandatoryChecks: {
        protagonistAgency: 'Nhân vật chính hoặc POV phải đưa ra lựa chọn có ý nghĩa và chịu hậu quả, không chỉ được cơ hội rơi vào tay.',
        earnedProgression: 'Độ lớn thay đổi phải tương xứng chuẩn bị, chi phí, rủi ro và thang hiện tại; thay đổi trên 5 lần baseline cần tích lũy nhiều bước cụ thể.',
        domainPlausibility: 'Grounded phải khả thi về công cụ, dung sai, thời gian, lao động và kết quả ngoài đời; speculative phải nhất quán nguồn lực, chi phí và giới hạn nội tại.',
        oppositionAgenda: 'Đối lực phải có lựa chọn, đối sách và hậu quả theo agenda riêng; chỉ gây hấn rồi kinh ngạc/thua/chạy không đạt.',
        sceneVariety: 'Window không được lặp công thức giải thích cơ chế → biểu diễn thành công → người khác kinh ngạc/tôn sùng → nhận thưởng.',
        stageAlignment: 'Xung đột và reward loop phải phục vụ stage hiện tại, không nhảy sớm.',
        outcomeWeight: 'Kết quả phải có trọng lượng tương xứng chuẩn bị và phản lực. Quyết định, phân tích, ký hợp tác hoặc mua đầu vào chỉ là setup; không được commit fact tuyên bố đã hết lỗ, có lãi, thành công hay giải quyết xung đột trước khi hành động tạo kết quả thực sự xảy ra.',
        stateTransitionOwnership: 'Mỗi relationship delta phải cập nhật đúng người thực sự đổi thái độ: characterId/target là chủ thể của thái độ, counterpartId là người thái độ hướng tới. “A thuyết phục được B” không phải trạng thái quan hệ của A; nếu B chuyển từ nghi ngờ sang tin thì B phải là target. Hai phía cùng đổi cần hai delta.',
      },
      repairVerification: input.repairIssues
        ? {
            priorIssues: input.repairIssues,
            rule: 'Đây là lần kiểm tra sau replan. Với từng prior issue, chỉ được coi là đã sửa nếu plan mới có hành động/chuyển trạng thái cụ thể giải quyết nguyên nhân gốc. Đổi wording, trì hoãn hậu quả hoặc thay một cực đoan bằng cực đoan khác không đạt.',
          }
        : null,
      evidenceRule: 'Với mỗi check, checkEvidence phải chỉ rõ chapterNumber và ít nhất một sceneId hoặc deltaId làm căn cứ; không chấp nhận lời khen chung.',
    }),
    schema: PlanJudgeWireSchema,
    temperature: 0.3,
  });
  const failedChecks = Object.entries(result.value.checks).filter(([, passed]) => !passed).map(([gate]) => gate);
  if (failedChecks.length > 0 && result.value.issues.length === 0) {
    throw new StoryFactoryError('infra_blocked', 'Plan Judge returned a failed gate without evidence.', { failedChecks });
  }
  const assessment = PlanAssessmentSchema.parse(
    result.value.issues.length > 0 || failedChecks.length > 0
      ? { status: 'revise', issues: result.value.issues }
      : { status: 'pass', issues: [] },
  );
  validatePlanAssessment(input.rollingPlan, assessment);
  return { assessment, usage: result.usage };
}

/**
 * A judge-replan chain runs up to six planner/judge calls, each of which can take
 * 100-250s against Vercel's 300s ceiling. Every stable intermediate — the validated
 * mechanical plan, the first judge verdict, the validated replan — is checkpointed
 * into the run row, so a killed invocation resumes mid-chain instead of re-buying
 * the whole sequence. Raw planner responses are stored, not materialized plans:
 * resume re-materializes and re-validates deterministically against current durable
 * state, so a checkpoint written against different state simply fails validation
 * and is ignored. Provenance is compared field-by-field (never by serialized JSON —
 * Postgres JSONB reorders object keys).
 */
export const PlanCheckpointSchema = z.object({
  provenance: z.object({
    nextChapter: z.number().int(),
    plannerVersion: z.string(),
    routeVersion: z.string(),
    recoveryDigest: z.string().nullable(),
  }),
  mechanicalResponse: z.unknown(),
  judgeAssessment: PlanAssessmentSchema.optional(),
  judgeReplanResponse: z.unknown().optional(),
});
export type PlanCheckpoint = z.infer<typeof PlanCheckpointSchema>;

export async function planRollingWindow(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  routes: ModelRoutes;
  requiredWindowSize?: 1 | 2 | 3;
  recoveryEvidence?: unknown;
  continuityPacket?: ContinuityPacket;
  provider?: StoryModelProvider;
  /** Raw candidate checkpoint (from a prior run row); validated and matched internally. */
  resume?: unknown;
  /** Persist a checkpoint; failures are logged and never abort the chain. */
  onCheckpoint?: (checkpoint: PlanCheckpoint) => Promise<void>;
}): Promise<{
  rollingPlan: RollingPlan;
  assessment: PlanAssessment;
  usages: ProviderUsage[];
  attempts: PlannerAttemptTelemetry[];
  advisories: PlanAdvisory[];
}> {
  const provider = input.provider ?? geminiProvider;
  const usages: ProviderUsage[] = [];
  const attempts: PlannerAttemptTelemetry[] = [];
  validateArcResourceReachability({
    kernel: input.kernel,
    arc: input.arc,
    state: input.state,
  });

  const provenance: PlanCheckpoint['provenance'] = {
    nextChapter: input.state.chapterNumber + 1,
    plannerVersion: FACTORY_PLANNER_VERSION,
    routeVersion: input.routes.routeVersion,
    recoveryDigest: input.recoveryEvidence === undefined
      ? null
      : createHash('sha256').update(JSON.stringify(input.recoveryEvidence)).digest('hex'),
  };
  const resumeParsed = input.resume === undefined ? undefined : PlanCheckpointSchema.safeParse(input.resume);
  const resume = resumeParsed?.success
    && resumeParsed.data.provenance.nextChapter === provenance.nextChapter
    && resumeParsed.data.provenance.plannerVersion === provenance.plannerVersion
    && resumeParsed.data.provenance.routeVersion === provenance.routeVersion
    && resumeParsed.data.provenance.recoveryDigest === provenance.recoveryDigest
    ? resumeParsed.data
    : undefined;
  const saveCheckpoint = async (checkpoint: Omit<PlanCheckpoint, 'provenance'>) => {
    try {
      await input.onCheckpoint?.({ provenance, ...checkpoint });
    } catch (error) {
      console.warn('[story-factory] plan checkpoint persist failed (chain continues):',
        error instanceof Error ? error.message : String(error));
    }
  };
  const requestPlan = async (inputForAttempt: {
    task: string;
    previousResponse?: unknown;
    validationIssues?: unknown;
    temperature: number;
  }) => {
    const result = await provider.json({
      model: input.routes.planner,
      reasoningEffort: 'high',
      system: PLANNER_SYSTEM_PROMPT,
      prompt: JSON.stringify({
        task: inputForAttempt.task,
        kernel: input.kernel,
        arc: input.arc,
        state: input.state,
        ledgerSnapshot: {
          facts: Object.fromEntries(input.state.facts.map(item => [item.id, item.value])),
          resources: Object.fromEntries(input.state.resources.map(item => {
            const definition = input.kernel.resources.find(resource => resource.id === item.resourceId);
            return [item.resourceId, {
              value: item.value,
              name: definition?.name,
              unit: definition?.kind === 'numeric' ? definition.unit : null,
            }];
          })),
          locations: Object.fromEntries(input.state.characters.map(item => [item.characterId, item.locationId])),
          relationships: input.state.characters.flatMap(character => (
            Object.entries(character.relationshipState).map(([counterpartId, value]) => ({
              characterId: character.characterId,
              counterpartId,
              value,
            }))
          )),
          encounters: input.state.characters.flatMap(character => (
            character.encounteredCharacterIds.map(counterpartId => ({
              characterId: character.characterId,
              counterpartId,
            }))
          )),
          promises: Object.fromEntries(input.state.promises.map(item => [item.promiseId, item.status])),
        },
        factContracts: Object.fromEntries(input.state.facts.map(fact => [
          fact.id,
          {
            current: fact.value,
            requiredExpectedValues: [...new Set(input.kernel.worldMechanics.flatMap(mechanic => (
              mechanic.kind === 'capability' || mechanic.kind === 'constraint'
                ? mechanic.requiredFacts
                  .filter(required => required.factId === fact.id)
                  .map(required => required.expected)
                : []
            )))],
            producedByMechanicIds: input.kernel.worldMechanics.flatMap(mechanic => (
              mechanic.kind === 'capability' && mechanic.effectFactIds.includes(fact.id)
                ? [mechanic.id]
                : []
            )),
          },
        ])),
        mechanicDependencyGuide: buildPlannerMechanicGuide({
          kernel: input.kernel,
          arc: input.arc,
          state: input.state,
        }),
        travelConstraints: {
          initialLocationsByCharacter: Object.fromEntries(
            input.state.characters.map(item => [item.characterId, item.locationId]),
          ),
          travelEdges: input.kernel.travelRules.map(rule => ({
            fromLocationId: rule.fromLocationId,
            toLocationId: rule.toLocationId,
            minimumMinutes: rule.minimumMinutes,
          })),
          sceneRule: 'Theo dõi vị trí từng người qua từng scene. Code tính shortest path có hướng trên travelEdges; scene.travel phải >= thời gian shortest-path lớn nhất của mọi scene.people đi từ vị trí trước đó tới scene.loc. Không cần tạo scene ở mỗi location trung gian.',
        },
        continuityPacket: input.continuityPacket ?? null,
        nextChapter: input.state.chapterNumber + 1,
        maximumEndChapter: input.arc.plannedEndChapter,
        compactContract: PLANNER_COMPACT_CONTRACT,
        recoveryEvidence: input.recoveryEvidence,
        previousResponse: inputForAttempt.previousResponse,
        validationIssues: inputForAttempt.validationIssues,
      }),
      schema: PlannerRollingPlanResponseSchema,
      schemaComplexity: 'omit_array_max',
      temperature: inputForAttempt.temperature,
    });
    usages.push(result.usage);
    return result;
  };

  let advisories: PlanAdvisory[] = [];
  const materializeAndValidate = (value: z.infer<typeof PlannerRollingPlanResponseSchema>): RollingPlan => {
    const parsed = materializePlannerRollingPlan(value, input.state, input.kernel);
    if (input.requiredWindowSize && parsed.plans.length !== input.requiredWindowSize) {
      throw new StoryFactoryError('plan_blocked', 'Planner returned the wrong required window size.', {
        requiredWindowSize: input.requiredWindowSize,
        actualWindowSize: parsed.plans.length,
      });
    }
    const collected = collectPlanAdvisories(() => validateRollingPlan({
      kernel: input.kernel, arc: input.arc, state: input.state, rollingPlan: parsed,
    }));
    advisories = collected.advisories;
    return parsed;
  };

  const normalizePlanError = (error: unknown): StoryFactoryError => (
    error instanceof StoryFactoryError
      ? error
      : new StoryFactoryError(
        'plan_blocked',
        'Planner output failed the exact rolling-plan contract.',
        plannerContractFailureEvidence(error),
      )
  );

  let currentResponse: z.infer<typeof PlannerRollingPlanResponseSchema> | undefined;
  let currentPlan: RollingPlan | undefined;
  let mechanicalError: StoryFactoryError | undefined;
  if (resume) {
    const stored = PlannerRollingPlanResponseSchema.safeParse(resume.mechanicalResponse);
    if (stored.success) {
      try {
        currentPlan = materializeAndValidate(stored.data);
        currentResponse = stored.data;
      } catch (error) {
        if (error instanceof StoryFactoryError && error.code === 'infra_blocked') throw error;
        currentPlan = undefined;
        currentResponse = undefined;
      }
    }
  }
  // Later checkpoint fields are only trustworthy if the mechanical plan they were
  // derived from is the one we are actually using.
  const resumedMechanical = Boolean(currentPlan);
  for (let mechanicalAttempt = 1; !currentPlan && mechanicalAttempt <= 2; mechanicalAttempt += 1) {
    const result = await requestPlan({
      task: mechanicalAttempt === 1
        ? input.recoveryEvidence
          ? 'Lập lại toàn bộ rolling window chưa commit từ state hiện tại; xử lý bằng chứng cho thấy plan trước không tạo tiến triển mới.'
          : input.requiredWindowSize
            ? `Lập đúng ${input.requiredWindowSize} chương tiếp theo, không vượt quá cuối arc.`
            : 'Lập từ một đến ba chương tiếp theo, không vượt quá cuối arc.'
        : 'Tạo lại toàn bộ rolling window và sửa đúng các validation issue cơ học; không vá cục bộ.',
      previousResponse: mechanicalAttempt === 1 ? undefined : currentResponse,
      validationIssues: mechanicalAttempt === 1 ? undefined : {
        message: mechanicalError?.message,
        evidence: mechanicalError?.evidence ?? null,
      },
      // Mechanical planning is a constrained compiler input, not a prose
      // diversity task. Keep it reproducible; the independent Plan Judge still
      // owns the qualitative reading check.
      temperature: mechanicalAttempt === 1 ? 0.2 : 0.1,
    });
    currentResponse = result.value;
    try {
      currentPlan = materializeAndValidate(result.value);
      attempts.push({
        attempt: mechanicalAttempt === 1 ? 'initial' : 'mechanical_repair',
        responseDigest: digestRollingPlan(currentPlan),
        status: 'validated',
        validationMessage: null,
        validationEvidence: null,
        usage: result.usage,
      });
      mechanicalError = undefined;
      break;
    } catch (error) {
      if (error instanceof StoryFactoryError && error.code === 'infra_blocked') throw error;
      mechanicalError = normalizePlanError(error);
      attempts.push({
        attempt: mechanicalAttempt === 1 ? 'initial' : 'mechanical_repair',
        responseDigest: createHash('sha256')
          .update(JSON.stringify(result.value))
          .digest('hex'),
        status: 'invalid',
        validationMessage: mechanicalError.message,
        validationEvidence: mechanicalError.evidence ?? null,
        usage: result.usage,
      });
    }
  }
  if (!currentPlan || !currentResponse) {
    throw new StoryFactoryError('plan_blocked', mechanicalError?.message ?? 'Planner mechanical repair budget was exhausted.', {
      validation: mechanicalError?.evidence ?? null,
      usages,
      attempts,
    });
  }
  if (!resumedMechanical) {
    await saveCheckpoint({ mechanicalResponse: currentResponse });
  }

  let judgedAssessment: PlanAssessment;
  if (resumedMechanical && resume?.judgeAssessment) {
    judgedAssessment = resume.judgeAssessment;
  } else {
    const judged = await assessRollingPlan({
      provider,
      kernel: input.kernel,
      arc: input.arc,
      state: input.state,
      rollingPlan: currentPlan,
      model: input.routes.planJudge,
      advisories,
    });
    usages.push(judged.usage);
    judgedAssessment = judged.assessment;
  }
  if (judgedAssessment.status === 'pass') {
    return { rollingPlan: currentPlan, assessment: judgedAssessment, usages, attempts, advisories };
  }
  await saveCheckpoint({ mechanicalResponse: currentResponse, judgeAssessment: judgedAssessment });

  let resumedReplan: { plan: RollingPlan; raw: unknown } | undefined;
  if (resumedMechanical && resume?.judgeAssessment && resume.judgeReplanResponse !== undefined) {
    const storedReplan = PlannerRollingPlanResponseSchema.safeParse(resume.judgeReplanResponse);
    if (storedReplan.success) {
      try {
        resumedReplan = { plan: materializeAndValidate(storedReplan.data), raw: storedReplan.data };
      } catch (error) {
        if (error instanceof StoryFactoryError && error.code === 'infra_blocked') throw error;
        resumedReplan = undefined;
      }
    }
  }

  const produceReplan = async (): Promise<{ plan: RollingPlan; raw: unknown }> => {
    const judgeRepair = await requestPlan({
      task: `Tạo lại toàn bộ rolling window đúng một lần theo evidence của Plan Judge; giữ contract cơ học hợp lệ và không vá cục bộ.
  Mọi issue là yêu cầu bắt buộc, không phải gợi ý. opposition_agenda phải trở thành một đối sách/hành động có hậu quả trong plan, không chỉ là ý định hoặc cảm xúc. state_transition/earned_progression phải có bước chuyển tương xứng chuẩn bị và không dùng trạng thái tuyệt đối thiếu căn cứ.
  Với relationship state_transition, target phải là chính nhân vật đổi thái độ và after chỉ mô tả thái độ của target đối với counterpart; không dùng relationship delta của người hành động để ghi rằng họ đã thuyết phục người khác.
  Đối thủ phải cản trở trước hoặc trong hành động quyết định; tuyệt đối không biến cú đánh, tai họa hay sai lầm của họ thành lực/công cụ/thời điểm vừa khít giúp main hoàn tất cơ chế.
  Nếu validation báo required fact sai, delta tạo fact phải dùng chính xác expected trong factContracts trước mechanic sử dụng; không dùng mô tả thay marker precondition.
  Sau khi lập lại, tự đối chiếu từng issue với scene và delta mới trước khi trả kết quả.`,
      previousResponse: currentResponse,
      validationIssues: judgedAssessment.issues,
      temperature: 0.1,
    });
    let repairedPlan: RollingPlan;
    let repairedRaw: unknown;
    try {
      repairedPlan = materializeAndValidate(judgeRepair.value);
      repairedRaw = judgeRepair.value;
      attempts.push({
        attempt: 'judge_replan',
        responseDigest: digestRollingPlan(repairedPlan),
        status: 'validated',
        validationMessage: null,
        validationEvidence: null,
        usage: judgeRepair.usage,
      });
    } catch (error) {
      if (error instanceof StoryFactoryError && error.code === 'infra_blocked') throw error;
      const normalized = normalizePlanError(error);
      attempts.push({
        attempt: 'judge_replan',
        responseDigest: createHash('sha256')
          .update(JSON.stringify(judgeRepair.value))
          .digest('hex'),
        status: 'invalid',
        validationMessage: normalized.message,
        validationEvidence: normalized.evidence ?? null,
        usage: judgeRepair.usage,
      });
      const mechanicalRepair = await requestPlan({
        task: 'Tạo lại toàn bộ rolling window sau Plan Judge và sửa đúng validation issue cơ học; không thay mục tiêu sửa nội dung của Plan Judge, không vá cục bộ.',
        previousResponse: judgeRepair.value,
        validationIssues: {
          message: normalized.message,
          evidence: normalized.evidence ?? null,
          judgeIssues: judgedAssessment.issues,
        },
        temperature: 0.1,
      });
      try {
        repairedPlan = materializeAndValidate(mechanicalRepair.value);
        repairedRaw = mechanicalRepair.value;
        attempts.push({
          attempt: 'judge_replan_mechanical_repair',
          responseDigest: digestRollingPlan(repairedPlan),
          status: 'validated',
          validationMessage: null,
          validationEvidence: null,
          usage: mechanicalRepair.usage,
        });
      } catch (repairError) {
        if (repairError instanceof StoryFactoryError && repairError.code === 'infra_blocked') throw repairError;
        const repairFailure = normalizePlanError(repairError);
        attempts.push({
          attempt: 'judge_replan_mechanical_repair',
          responseDigest: createHash('sha256')
            .update(JSON.stringify(mechanicalRepair.value))
            .digest('hex'),
          status: 'invalid',
          validationMessage: repairFailure.message,
          validationEvidence: repairFailure.evidence ?? null,
          usage: mechanicalRepair.usage,
        });
        throw new StoryFactoryError('plan_blocked', repairFailure.message, {
          validation: repairFailure.evidence ?? null,
          judgeIssues: judgedAssessment.issues,
          usages,
          attempts,
        });
      }
    }
    return { plan: repairedPlan, raw: repairedRaw };
  };

  const repaired = resumedReplan ?? await produceReplan();
  if (!resumedReplan) {
    await saveCheckpoint({
      mechanicalResponse: currentResponse,
      judgeAssessment: judgedAssessment,
      judgeReplanResponse: repaired.raw,
    });
  }
  const rejudged = await assessRollingPlan({
    provider,
    kernel: input.kernel,
    arc: input.arc,
    state: input.state,
    rollingPlan: repaired.plan,
    model: input.routes.planJudge,
    repairIssues: judgedAssessment.issues,
    advisories,
  });
  usages.push(rejudged.usage);
  if (rejudged.assessment.status === 'pass') {
    return { rollingPlan: repaired.plan, assessment: rejudged.assessment, usages, attempts, advisories };
  }
  throw new StoryFactoryError('plan_blocked', 'Plan Judge rejected the rolling window after one full replan.', {
    firstAssessment: judgedAssessment,
    firstPlanDigest: digestRollingPlan(currentPlan),
    firstIssueSnapshot: planIssueSnapshot(currentPlan, judgedAssessment),
    validation: rejudged.assessment.issues,
    repairedPlanDigest: digestRollingPlan(repaired.plan),
    repairedIssueSnapshot: planIssueSnapshot(repaired.plan, rejudged.assessment),
    usages,
    attempts,
  });
}

export async function reviewFiveChapterWindow(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
  resourceTransitions?: Array<{
    chapterNumber: number;
    entityId: string;
    before: unknown;
    after: unknown;
    source: string | null;
  }>;
  routes: ModelRoutes;
  provider?: StoryModelProvider;
}): Promise<{ review: WindowReview; usage: ProviderUsage }> {
  if (input.chapters.length !== 5) throw new Error('Window review requires exactly five committed chapters.');
  const provider = input.provider ?? geminiProvider;
  const result = await provider.json({
    model: input.routes.editor,
    system: `${EDITOR_SYSTEM_PROMPT}
Ở chế độ window review, đọc liền mạch năm chương và so với recentOutcomes/state đã commit.
Block nếu nhân vật phản ứng như quên sự kiện vừa trải qua, cơ chế vật phẩm/công nghệ đổi cách hoạt động, số tiền/khối lượng/giá trong prose lệch với ledger, hoặc năm chương lặp cùng cấu trúc mà không tạo tiến triển.
Kiểm số dư theo LỊCH SỬ: resourceTransitions là chuỗi giao dịch đã commit theo thứ tự (before → after tại từng chương). Một câu tổng kết số dư trong chương N phải khớp với after của transition cuối cùng tính đến thời điểm đó trong chương N — KHÔNG so với currentState, vì currentState chỉ là số dư sau chương cuối cửa sổ. Chỉ báo lỗi tiền khi con số lệch với transition lịch sử tương ứng.
Phải đọc trải nghiệm của cả cửa sổ: bắt lặp chức năng “giải thích cơ chế → biểu diễn → quần chúng kinh ngạc”, stock reaction tương đương dù khác từ, main và đối thủ nói cùng giọng, đối thủ liên tục làm công cụ, hoặc progression tăng mạnh thiếu tích lũy/chi phí.
Không mặc định một thiết kế là tối ưu hoặc một kết quả là tuyệt đối chỉ vì nhân vật giải thích tự tin hay thử thành công một lần. Với realityMode=grounded, kết luận phải tương xứng số lần quan sát và sai số thực tế.
Lập patterns cho đủ đúng năm chương trước khi kết luận. Mỗi quote trong evidence, patterns và issues phải được sao chép nguyên văn từ content của đúng chapterNumber; mỗi check phải so sánh ít nhất hai chương khác nhau.
Trạng thái pass cũng phải có bằng chứng cụ thể. Chỉ báo tối đa ba lỗi drift hoặc pattern quan trọng.`,
    prompt: JSON.stringify({
      task: 'Đọc năm chương như một độc giả liên tục, lập pattern map, rồi kiểm tra continuity và trải nghiệm đọc.',
      realityMode: input.kernel.realityMode,
      wireLegend: {
        checks: {
          s: 'structureVariety',
          r: 'reactionVariety',
          v: 'voiceSeparation',
          e: 'earnedProgression',
          l: 'causalLearning',
        },
        patternStructure: {
          xd: 'explain_then_demonstrate',
          ii: 'investigate_then_infer',
          nt: 'negotiate_then_trade',
          ta: 'attempt_fail_adapt',
          cs: 'confront_then_shift',
          ra: 'relationship_action',
          ed: 'explore_then_discover',
          mo: 'mixed_other',
        },
        validationSource: {
          mc: 'material_consequence',
          sa: 'self_assertion',
          es: 'expert_surprise',
          cs: 'crowd_surprise',
          or: 'opponent_reaction',
          im: 'independent_measurement',
          rc: 'relationship_change',
          un: 'unresolved',
        },
        evidenceStage: { h: 'hypothesis', s: 'single_observation', r: 'repeated_observation', f: 'established_fact' },
        claimStrength: { p: 'provisional', s: 'single_trial', r: 'repeatable', a: 'absolute' },
        issueCategory: {
          cd: 'continuity_drift',
          vd: 'voice_drift',
          rp: 'repetition',
          rl: 'reward_loop',
          pg: 'progression',
          rd: 'resource_drift',
          ad: 'artifact_drift',
          pp: 'prose_pattern',
          oa: 'opposition_agency',
          ep: 'earned_progression',
          pc: 'premature_certainty',
        },
        evidenceRule: 'evidence là mảng phẳng; mỗi check key s/r/v/e/l cần ít nhất hai quote thuộc hai chapter khác nhau.',
      },
      auditChecklist: [
        'nhân vật có nhớ và phản ứng theo các lần gặp/sự kiện trong recentOutcomes không',
        'artifact và world-rule quan trọng có giữ cùng cơ chế hoạt động không',
        'giá, tiền, khối lượng, tồn kho và lời nhẩm trong prose có khớp ledger không',
        'cửa sổ có payoff vật chất/tình cảm và progression mới không',
        'có lặp một công thức chuẩn bị - vận chuyển - bán mà thiếu biến hóa không',
        'có lặp stock reaction, đám đông kinh ngạc hoặc khoảnh khắc sinh tử cùng chức năng không',
        'main và đối thủ có agenda, giọng nói và cách hành động phân biệt không',
        'mức progression có được tích lũy và trả giá đủ trong năm chương không',
      ],
      kernelIdentity: {
        protagonistId: input.kernel.protagonistId,
        characters: input.kernel.characters,
        pleasureLoop: input.kernel.pleasureLoop,
      },
      arc: input.arc,
      currentState: input.state,
      resourceTransitions: input.resourceTransitions ?? [],
      chapters: input.chapters,
    }),
    schema: WindowReviewWireSchema,
    temperature: 0.4,
  });
  const materializeAndGround = (value: unknown) => {
    const materialized = materializeWindowReview(value);
    validateWindowEvidence(materialized, input.chapters);
    return applyDeterministicWindowPolicy(materialized, input.kernel.realityMode);
  };
  try {
    return { review: materializeAndGround(result.value), usage: result.usage };
  } catch (error) {
    // Reviewing five long chapters at once, the model measurably tends to compress or
    // paraphrase its quotes: one production window failed grounding four rolls in a
    // row and would have parked the job. Evidence grounding is a wire-discipline
    // failure, not a verdict — give the SAME model one corrective pass with the exact
    // grounding errors before treating it as infrastructure.
    if (!(error instanceof StoryFactoryError)) throw error;
    const corrective = await provider.json({
      model: input.routes.editor,
      system: `${EDITOR_SYSTEM_PROMPT}
Bản review trước bị từ chối vì evidence không sao chép NGUYÊN VĂN từ prose. Lập lại toàn bộ review; mỗi quote trong evidence, patterns và issues phải là 4-12 từ liên tiếp copy đúng từng ký tự từ content của đúng chapterNumber, và mỗi check phải có bằng chứng từ ít nhất hai chương khác nhau.`,
      prompt: JSON.stringify({
        task: 'Chấm lại window sau khi bị từ chối vì evidence không nguyên văn.',
        groundingErrors: { message: error.message, evidence: error.evidence ?? null },
        realityMode: input.kernel.realityMode,
        chapters: input.chapters,
        kernelIdentity: {
          protagonistId: input.kernel.protagonistId,
          characters: input.kernel.characters,
          pleasureLoop: input.kernel.pleasureLoop,
        },
        arc: input.arc,
        currentState: input.state,
      }),
      schema: WindowReviewWireSchema,
      temperature: 0.2,
    });
    const usageTotal = {
      ...corrective.usage,
      inputTokens: result.usage.inputTokens + corrective.usage.inputTokens,
      outputTokens: result.usage.outputTokens + corrective.usage.outputTokens,
      costUsd: result.usage.costUsd + corrective.usage.costUsd,
    };
    try {
      return { review: materializeAndGround(corrective.value), usage: usageTotal };
    } catch (secondError) {
      if (secondError instanceof StoryFactoryError) {
        throw new StoryFactoryError(secondError.code, secondError.message, {
          validation: secondError.evidence,
          firstAttempt: { message: error.message },
          usages: [usageTotal],
        });
      }
      throw secondError;
    }
  }
}

export async function planArcLifecycle(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  minimumCompletionChapter: number;
  maximumChapter: number;
  routes: ModelRoutes;
  provider?: StoryModelProvider;
}): Promise<{
  lifecycle: ArcLifecycle;
  kernelAfter: StoryKernel;
  stateAfter: StoryState;
  usage: ProviderUsage;
}> {
  if (input.state.chapterNumber < input.arc.plannedEndChapter) {
    throw new Error('Arc lifecycle can only run at an arc boundary.');
  }
  const provider = input.provider ?? geminiProvider;
  // Gemini constrained decoding rejects two shapes in the canonical
  // ArcLifecycleSchema (bisected live after the first arc boundary ever reached
  // in production 400'd INVALID_ARGUMENT): the discriminated union at the top,
  // and WorldMechanicSchema — itself a union — inside canonExtension. Same cure
  // the Launch World Architect already uses: flat nullable shape, mechanics
  // split into one array per kind, and the strict contract re-derived in code.
  const CanonExtensionWireSchema = CanonExtensionSchema.omit({ worldMechanics: true }).extend({
    mechanicConversions: z.array(z.object({ seedId: z.string(), definition: WorldMechanicSchema.options[0] }).strict()).max(8),
    mechanicCapabilities: z.array(z.object({ seedId: z.string(), definition: WorldMechanicSchema.options[1] }).strict()).max(8),
    mechanicConstraints: z.array(z.object({ seedId: z.string(), definition: WorldMechanicSchema.options[2] }).strict()).max(8),
  }).strict();
  const wireResult = await provider.json({
    model: input.routes.planner,
    system: `${PLANNER_SYSTEM_PROMPT}\nỞ ranh giới arc, quyết định tiếp tục, vào finale hoặc kết thúc tự nhiên. Không kéo dài chỉ để đủ quota.\nNếu status là continue hoặc finale thì nextArc và canonExtension là bắt buộc; nếu status là complete thì cả hai để null. Trong canonExtension, khai báo mechanic mới theo đúng ba mảng mechanicConversions/mechanicCapabilities/mechanicConstraints (mảng rỗng nếu không thêm loại đó); tổng cả ba tối đa tám.`,
    prompt: JSON.stringify({
      task: 'Đánh giá ending direction và lập arc tiếp theo nếu truyện chưa hoàn tất.',
      endingDirection: input.kernel.endingDirection,
      seriesSpine: input.kernel.seriesSpine,
      longPromises: input.kernel.longPromises,
      currentStage: input.kernel.seriesSpine.stages.find(stage => stage.id === input.arc.stageId),
      nextStage: input.kernel.seriesSpine.stages.find(stage => (
        stage.order === (input.kernel.seriesSpine.stages.find(current => current.id === input.arc.stageId)?.order ?? 0) + 1
      )) ?? null,
      currentArc: input.arc,
      currentState: input.state,
      minimumCompletionChapter: input.minimumCompletionChapter,
      maximumChapter: input.maximumChapter,
    }),
    schema: z.object({
      status: z.enum(['continue', 'finale', 'complete']),
      nextArc: ArcPlanSchema.nullable(),
      canonExtension: CanonExtensionWireSchema.nullable(),
    }).strict(),
    // Bisected live: Gemini's responseFormat compiler unrolls maxItems-bounded
    // arrays into the decoding grammar, and this schema's combined bound budget
    // deterministically 400s (any two of the arrays pass; all three fail). The
    // planner path avoids the same explosion the same way; zod still enforces
    // every bound after parse.
    schemaComplexity: 'omit_array_max',
    temperature: 0.6,
  });
  const materializedExtension = wireResult.value.canonExtension === null
    ? null
    : (({ mechanicConversions, mechanicCapabilities, mechanicConstraints, ...rest }) => ({
      ...rest,
      worldMechanics: [...mechanicConversions, ...mechanicCapabilities, ...mechanicConstraints],
    }))(wireResult.value.canonExtension);
  const lifecycleParsed = ArcLifecycleSchema.safeParse(
    wireResult.value.status === 'complete'
      ? { status: 'complete', nextArc: null, canonExtension: null }
      : { status: wireResult.value.status, nextArc: wireResult.value.nextArc, canonExtension: materializedExtension },
  );
  if (!lifecycleParsed.success) {
    throw new StoryFactoryError('plan_blocked', 'Arc lifecycle response is missing the next arc or canon extension.', {
      status: wireResult.value.status,
      hasNextArc: wireResult.value.nextArc !== null,
      hasCanonExtension: wireResult.value.canonExtension !== null,
    });
  }
  const result = { value: lifecycleParsed.data, usage: wireResult.usage };
  if (result.value.status === 'complete') {
    if (input.state.chapterNumber < input.minimumCompletionChapter) {
      throw new StoryFactoryError('plan_blocked', 'Planner tried to complete before the configured long-run floor.');
    }
    const unresolved = input.state.promises.filter(promise => promise.status !== 'resolved' && promise.status !== 'abandoned');
    if (unresolved.length) throw new StoryFactoryError('plan_blocked', 'Planner tried to complete with unresolved promises.', unresolved);
    return {
      lifecycle: result.value,
      kernelAfter: input.kernel,
      stateAfter: input.state,
      usage: result.usage,
    };
  } else {
    const next = result.value.nextArc;
    if (next.arcNumber !== input.arc.arcNumber + 1 || next.startChapter !== input.state.chapterNumber + 1) {
      throw new StoryFactoryError('plan_blocked', 'Next arc is not contiguous with committed state.');
    }
    if (next.plannedEndChapter > input.maximumChapter) {
      throw new StoryFactoryError('plan_blocked', 'Next arc exceeds the hard safety chapter cap.');
    }
    const currentStage = input.kernel.seriesSpine.stages.find(stage => stage.id === input.arc.stageId);
    const nextStage = input.kernel.seriesSpine.stages.find(stage => stage.id === next.stageId);
    if (!currentStage || !nextStage || nextStage.order < currentStage.order || nextStage.order > currentStage.order + 1) {
      throw new StoryFactoryError('plan_blocked', 'Arc transition skipped or rewound the immutable series spine.');
    }
    if (result.value.canonExtension.stageId !== next.stageId) {
      throw new StoryFactoryError('plan_blocked', 'Canon extension belongs to a different series stage.');
    }
    const currentStageCeiling = input.kernel.seriesSpine.stages
      .filter(stage => stage.order <= currentStage.order)
      .reduce((total, stage) => total + stage.targetSpanChapters, 0);
    if (nextStage.id === currentStage.id && next.plannedEndChapter > currentStageCeiling) {
      throw new StoryFactoryError(
        'plan_blocked',
        'Current series stage is exhausted but the next stage entry conditions were not reached.',
        { stageId: currentStage.id, currentStageCeiling, proposedArcEnd: next.plannedEndChapter },
      );
    }
    const extended = applyCanonExtension({
      kernel: input.kernel,
      state: input.state,
      extension: result.value.canonExtension,
    });
    validateArcAgainstKernel(extended.kernel, next);
    return {
      lifecycle: result.value,
      kernelAfter: extended.kernel,
      stateAfter: extended.state,
      usage: result.usage,
    };
  }
}
