import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  ArcPlanSchema,
  CanonExtensionSchema,
  PlanAssessmentSchema,
  RollingPlanSchema,
  StoryFactoryError,
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
import { EDITOR_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT, PLAN_JUDGE_SYSTEM_PROMPT } from './prompts';
import {
  applyCanonExtension,
  validateArcAgainstKernel,
  validateArcResourceReachability,
  validateRollingPlan,
} from './validation';

type PlanRevisionIssues = Extract<PlanAssessment, { status: 'revise' }>['issues'];

export type PlannerAttemptTelemetry = {
  attempt: 'initial' | 'mechanical_repair' | 'judge_replan';
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
  chapters: z.array(PlannerCompactChapterSchema).min(1).max(5),
}).strict();

const PLANNER_COMPACT_CONTRACT = {
  deltaTarget: {
    fact: 'target=factId; before=null vì code lấy tuần tự từ State; after là giá trị fact mới; change/source/sink=null',
    resource_numeric: 'target=resourceId; change là số khác 0; before/after bắt buộc null vì code tính tuần tự từ State; change > 0 bắt buộc source khác null và sink=null; change < 0 bắt buộc sink khác null và source=null',
    resource_state: 'target=resourceId; before=null vì code lấy tuần tự từ State; after là trạng thái mới; source giải thích nguồn thay đổi; change/sink=null',
    knowledge: 'target=characterId; after=factId; source là nguồn học biết; before/change/sink=null',
    promise: 'target=promiseId; before=null vì code lấy tuần tự từ State; after thuộc open|progressed|resolved|abandoned; change/source/sink=null',
    relationship: 'target=characterId; counterpart=counterpartId; before=null vì code lấy tuần tự từ State; after là trạng thái mới; source giải thích sự kiện; change/sink=null',
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
    'Mọi chuyển đổi/công suất/quyền hạn/constraint thực sự dùng phải có một mechanics entry tham chiếu worldMechanics ID. Mỗi entry bắt buộc gắn ít nhất một delta bằng primaryDeltaId; các delta còn lại nằm trong additionalDeltaIds. role=effect nghĩa mechanic trực tiếp tạo delta; role=support nghĩa mechanic chỉ cấp quyền hoặc điều kiện cho delta do mechanic effect khác tạo. Mỗi resource delta phải có đúng một effect owner nhưng có thể có nhiều support. Conversion luôn effect; constraint luôn support. Conversion phải gắn đủ delta đầu vào và đầu ra. Capability là effect chỉ khi nó trực tiếp tạo resource/fact đúng resourceId và direction đã khai báo trong effectResources hoặc effectFactIds; nếu chỉ cho phép conversion/mechanic khác thì dùng support. Không tạo mechanics entry nếu cơ chế không liên quan state transition trong chương.',
    'Với conversion, primaryDeltaId phải là một resource_numeric delta thuộc input/output của conversion trong cùng scene; code sẽ tự suy ra toàn bộ numeric delta mà conversion sở hữu và không bao giờ cho conversion sở hữu fact hoặc resource_state. Với capability effect, chỉ gắn resource delta đúng direction hoặc fact thuộc effectFactIds.',
    'Nếu quên conversion use nhưng toàn bộ vector input/output và quantity khớp duy nhất với một worldMechanic trong cùng scene, compiler có thể khôi phục use tất định. Nếu có từ hai mechanic/vector cùng khớp, plan vẫn bị block; vì vậy vẫn phải khai báo mechanic khi ý nghĩa giao dịch có thể mơ hồ.',
    'Nếu quên capability effect nhưng delta, direction và đúng một allowed actor đang có mặt cùng khớp duy nhất, compiler có thể khôi phục use tất định. Hai capability cùng có thể tạo delta hoặc một conversion cạnh tranh vẫn làm plan bị block.',
    'Trước khi tạo bất kỳ resource_numeric hoặc resource_state delta nào, phải tìm đúng một conversion/capability effect trong arc có quyền tạo resource đó. Nếu không có effect mechanic, không được thay đổi resource; dùng fact, relationship hoặc promise delta chỉ khi loại đó phản ánh đúng thay đổi và ID hợp lệ.',
    'Kiểm công suất capability theo qty <= maximumUnitsPerMinute * availableMinutes. Với role=effect, availableMinutes=scene.dur. Với role=support, availableMinutes=scene.dur+scene.travel vì support có thể vận hành trong chính quãng chuyển cảnh.',
    'Khai báo đầy đủ mechanic tạo fact/resource và mechanic sử dụng nó trong đúng scene; compiler sẽ sắp thứ tự dependency tất định trong scene. Fact ngoại cảnh không có effect mechanic như thời tiết bắt đầu chỉ trở thành khả dụng sau scene ghi fact delta; capability phụ thuộc nó phải ở scene sau.',
    'Conversion là một batch nguyên tử: chỉ commit toàn bộ input và output trong cùng scene khi batch hoàn tất. Chương chuẩn bị chưa hoàn tất batch phải dùng fact hoặc resource_state để ghi tiến độ; không được trừ trước một phần input numeric rồi để output sang chương sau.',
    'Giữ goal/block/act ngắn và cơ học; chỉ đưa nhân vật, rule và delta thật sự cần cho chương.',
    'knowledge.after phải là fact ID đã tồn tại trong State. Nếu nhân vật học một fact mới, tạo fact delta khai báo fact đó trước knowledge delta trong cùng chương và gắn cả hai vào scene học biết.',
    'Fact được mechanic khác dùng làm requiredFact là precondition có kiểu và giá trị khóa. Nếu một capability tạo/cập nhật fact đó để mechanic sau sử dụng, fact delta.after phải đúng required expected trong factContracts; không thay marker precondition bằng tên bản vẽ, lời mô tả hoặc kết quả prose.',
    'Với fact, resource_state, promise và relationship, luôn gửi before=null; compiler tự lấy before thật và cập nhật tuần tự qua cả window. Không chép lại ledger bằng model.',
    'Không tạo location delta. Chỉ khai báo đúng scene.people, scene.loc và scene.travel; compiler là nguồn duy nhất tự sinh location delta từ vị trí đầu chương tới scene cuối của từng nhân vật.',
  ],
} as const;

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

export const WindowReviewSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('pass'),
    checks: z.object({
      structureVariety: z.literal(true),
      reactionVariety: z.literal(true),
      voiceSeparation: z.literal(true),
      earnedProgression: z.literal(true),
    }).strict(),
    issues: z.array(z.never()).length(0),
  }).strict(),
  z.object({
    status: z.literal('block'),
    checks: z.object({
      structureVariety: z.boolean(),
      reactionVariety: z.boolean(),
      voiceSeparation: z.boolean(),
      earnedProgression: z.boolean(),
    }).strict(),
    issues: z.array(z.object({
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
      ]),
      evidence: z.string().trim().min(5).max(1_000),
      instruction: z.string().trim().min(5).max(1_000),
    }).strict()).min(1).max(3),
  }).strict(),
]);

const ArcLifecycleSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('continue'), nextArc: ArcPlanSchema, canonExtension: CanonExtensionSchema }).strict(),
  z.object({ status: z.literal('finale'), nextArc: ArcPlanSchema, canonExtension: CanonExtensionSchema }).strict(),
  z.object({ status: z.literal('complete'), nextArc: z.null(), canonExtension: z.null() }).strict(),
]);

export type WindowReview = z.infer<typeof WindowReviewSchema>;
export type ArcLifecycle = z.infer<typeof ArcLifecycleSchema>;

const PlanJudgeWireSchema = z.object({
  status: z.enum(['pass', 'revise']),
  checks: z.object({
    protagonistAgency: z.boolean(),
    earnedProgression: z.boolean(),
    oppositionAgenda: z.boolean(),
    sceneVariety: z.boolean(),
    stageAlignment: z.boolean(),
    outcomeWeight: z.boolean(),
  }).strict(),
  checkEvidence: z.object({
    protagonistAgency: z.string().trim().min(3).max(800),
    earnedProgression: z.string().trim().min(3).max(800),
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
        characters: input.kernel.characters.map(character => ({
          id: character.id,
          role: character.role,
          agenda: character.agenda,
          competence: character.competence,
          constraint: character.constraint,
        })),
        pleasureLoop: input.kernel.pleasureLoop,
      },
      arc: input.arc,
      state: input.state,
      rollingPlan: input.rollingPlan,
      auditSignals,
      mandatoryChecks: {
        protagonistAgency: 'Nhân vật chính hoặc POV phải đưa ra lựa chọn có ý nghĩa và chịu hậu quả, không chỉ được cơ hội rơi vào tay.',
        earnedProgression: 'Độ lớn thay đổi phải tương xứng chuẩn bị, chi phí, rủi ro và thang hiện tại; thay đổi trên 5 lần baseline cần tích lũy nhiều bước cụ thể.',
        oppositionAgenda: 'Đối lực phải có lựa chọn, đối sách và hậu quả theo agenda riêng; chỉ gây hấn rồi kinh ngạc/thua/chạy không đạt.',
        sceneVariety: 'Window không được lặp công thức giải thích cơ chế → biểu diễn thành công → người khác kinh ngạc/tôn sùng → nhận thưởng.',
        stageAlignment: 'Xung đột và reward loop phải phục vụ stage hiện tại, không nhảy sớm.',
        outcomeWeight: 'Kết quả phải có trọng lượng tương xứng chuẩn bị và phản lực. Quyết định, phân tích, ký hợp tác hoặc mua đầu vào chỉ là setup; không được commit fact tuyên bố đã hết lỗ, có lãi, thành công hay giải quyết xung đột trước khi hành động tạo kết quả thực sự xảy ra.',
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

export async function planRollingWindow(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  routes: ModelRoutes;
  requiredWindowSize?: 1 | 2 | 3 | 4 | 5;
  recoveryEvidence?: unknown;
  continuityPacket?: ContinuityPacket;
  provider?: StoryModelProvider;
}): Promise<{
  rollingPlan: RollingPlan;
  assessment: PlanAssessment;
  usages: ProviderUsage[];
  attempts: PlannerAttemptTelemetry[];
}> {
  const provider = input.provider ?? geminiProvider;
  const usages: ProviderUsage[] = [];
  const attempts: PlannerAttemptTelemetry[] = [];
  validateArcResourceReachability({
    kernel: input.kernel,
    arc: input.arc,
    state: input.state,
  });
  const requestPlan = async (inputForAttempt: {
    task: string;
    previousResponse?: unknown;
    validationIssues?: unknown;
    temperature: number;
  }) => {
    const result = await provider.json({
      model: input.routes.planner,
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

  const materializeAndValidate = (value: z.infer<typeof PlannerRollingPlanResponseSchema>): RollingPlan => {
    const parsed = materializePlannerRollingPlan(value, input.state, input.kernel);
    if (input.requiredWindowSize && parsed.plans.length !== input.requiredWindowSize) {
      throw new StoryFactoryError('plan_blocked', 'Planner returned the wrong required window size.', {
        requiredWindowSize: input.requiredWindowSize,
        actualWindowSize: parsed.plans.length,
      });
    }
    validateRollingPlan({ kernel: input.kernel, arc: input.arc, state: input.state, rollingPlan: parsed });
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
  for (let mechanicalAttempt = 1; mechanicalAttempt <= 2; mechanicalAttempt += 1) {
    const result = await requestPlan({
      task: mechanicalAttempt === 1
        ? input.recoveryEvidence
          ? 'Lập lại toàn bộ rolling window chưa commit từ state hiện tại; xử lý bằng chứng cho thấy plan trước không tạo tiến triển mới.'
          : input.requiredWindowSize
            ? `Lập đúng ${input.requiredWindowSize} chương tiếp theo, không vượt quá cuối arc.`
            : 'Lập từ một đến năm chương tiếp theo, không vượt quá cuối arc.'
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

  const judged = await assessRollingPlan({
    provider,
    kernel: input.kernel,
    arc: input.arc,
    state: input.state,
    rollingPlan: currentPlan,
    model: input.routes.planJudge,
  });
  usages.push(judged.usage);
  if (judged.assessment.status === 'pass') {
    return { rollingPlan: currentPlan, assessment: judged.assessment, usages, attempts };
  }

  const judgeRepair = await requestPlan({
    task: `Tạo lại toàn bộ rolling window đúng một lần theo evidence của Plan Judge; giữ contract cơ học hợp lệ và không vá cục bộ.
Mọi issue là yêu cầu bắt buộc, không phải gợi ý. opposition_agenda phải trở thành một đối sách/hành động có hậu quả trong plan, không chỉ là ý định hoặc cảm xúc. state_transition/earned_progression phải có bước chuyển tương xứng chuẩn bị và không dùng trạng thái tuyệt đối thiếu căn cứ.
Nếu validation báo required fact sai, delta tạo fact phải dùng chính xác expected trong factContracts trước mechanic sử dụng; không dùng mô tả thay marker precondition.
Sau khi lập lại, tự đối chiếu từng issue với scene và delta mới trước khi trả kết quả.`,
    previousResponse: currentResponse,
    validationIssues: judged.assessment.issues,
    temperature: 0.1,
  });
  let repairedPlan: RollingPlan;
  try {
    repairedPlan = materializeAndValidate(judgeRepair.value);
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
    throw new StoryFactoryError('plan_blocked', normalized.message, {
      validation: normalized.evidence ?? null,
      judgeIssues: judged.assessment.issues,
      usages,
      attempts,
    });
  }
  const rejudged = await assessRollingPlan({
    provider,
    kernel: input.kernel,
    arc: input.arc,
    state: input.state,
    rollingPlan: repairedPlan,
    model: input.routes.planJudge,
    repairIssues: judged.assessment.issues,
  });
  usages.push(rejudged.usage);
  if (rejudged.assessment.status === 'pass') {
    return { rollingPlan: repairedPlan, assessment: rejudged.assessment, usages, attempts };
  }
  throw new StoryFactoryError('plan_blocked', 'Plan Judge rejected the rolling window after one full replan.', {
    firstAssessment: judged.assessment,
    firstPlanDigest: digestRollingPlan(currentPlan),
    firstIssueSnapshot: planIssueSnapshot(currentPlan, judged.assessment),
    validation: rejudged.assessment.issues,
    repairedPlanDigest: digestRollingPlan(repairedPlan),
    repairedIssueSnapshot: planIssueSnapshot(repairedPlan, rejudged.assessment),
    usages,
    attempts,
  });
}

export async function reviewFiveChapterWindow(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
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
Phải đọc trải nghiệm của cả cửa sổ: bắt lặp chức năng “giải thích cơ chế → biểu diễn → quần chúng kinh ngạc”, stock reaction tương đương dù khác từ, main và đối thủ nói cùng giọng, đối thủ liên tục làm công cụ, hoặc progression tăng mạnh thiếu tích lũy/chi phí.
Chỉ báo tối đa ba lỗi drift hoặc pattern quan trọng; evidence phải trích từ và so sánh các chương cụ thể.`,
    prompt: JSON.stringify({
      task: 'Kiểm tra cửa sổ năm chương vừa commit.',
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
      chapters: input.chapters,
    }),
    schema: WindowReviewSchema,
    temperature: 0.4,
  });
  return { review: result.value, usage: result.usage };
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
  const result = await provider.json({
    model: input.routes.planner,
    system: `${PLANNER_SYSTEM_PROMPT}\nỞ ranh giới arc, quyết định tiếp tục, vào finale hoặc kết thúc tự nhiên. Không kéo dài chỉ để đủ quota.`,
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
    schema: ArcLifecycleSchema,
    temperature: 0.6,
  });
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
