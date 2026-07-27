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

const PlannerScalarSchema = z.union([z.string(), z.number(), z.null()]);
const PlannerCompactDeltaSchema = z.object({
  id: z.string(),
  k: z.enum(['fact', 'resource_numeric', 'resource_state', 'knowledge', 'location', 'promise', 'relationship']),
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
  chaptersJson: z.array(z.string()).min(1).max(5),
}).strict();

const PLANNER_COMPACT_CONTRACT = {
  deltaTarget: {
    fact: 'target=factId; before/after là giá trị fact; change/source/sink=null',
    resource_numeric: 'target=resourceId; change là số khác 0; before/after bắt buộc null vì code tính tuần tự từ State; change > 0 bắt buộc source khác null và sink=null; change < 0 bắt buộc sink khác null và source=null',
    resource_state: 'target=resourceId; before/after là trạng thái; source giải thích nguồn thay đổi; change/sink=null',
    knowledge: 'target=characterId; after=factId; source là nguồn học biết; before/change/sink=null',
    location: 'target=characterId; before/after là locationId; change/source/sink=null',
    promise: 'target=promiseId; before/after thuộc open|progressed|resolved|abandoned; change/source/sink=null',
    relationship: 'target=characterId; counterpart=counterpartId; before là trạng thái cũ hoặc null; after là trạng thái mới; source giải thích sự kiện; change/sink=null',
  },
  chapterJson: {
    serialization: 'Mỗi phần tử chaptersJson là đúng một JSON object đã stringify, không markdown.',
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
    'Với từng scene, theo dõi vị trí trước đó của từng người trong scene.people. Nếu bất kỳ người nào phải đi từ nơi khác tới scene.loc, scene.travel phải ít nhất bằng directMinimumMinutes lớn nhất của tất cả người đến scene; không được lấy riêng thời gian của POV hoặc dùng 0.',
    'scene.id và mọi ID đều là string stable ID, không dùng số thứ tự trần.',
    'rules chỉ chứa world-rule ID tồn tại trong Kernel và có thể rỗng khi chương không trực tiếp thi hành luật thế giới nào.',
    'scene.people chỉ gồm nhân vật đang có mặt vật lý ở scene.loc; nếu nhân vật chỉ được nhắc tới hoặc là động lực ở nơi khác thì không đưa vào people.',
    'scene.deltaIds chỉ chứa delta ID tồn tại trong cùng chương; cảnh nối có thể rỗng nhưng cả chương vẫn phải có deltas.',
    'Mỗi delta phải được ít nhất một scene.deltaIds tham chiếu.',
    'rules chỉ chứa world-rule thực sự được thi hành trong chương. Nếu chương mới quyết định hoặc hứa sẽ dùng cơ chế ở tương lai thì chưa đưa rule đó vào rules.',
    'Mọi chuyển đổi/công suất/quyền hạn/constraint thực sự dùng phải có một mechanics entry tham chiếu worldMechanics ID. Mỗi entry bắt buộc gắn ít nhất một delta bằng primaryDeltaId; các delta còn lại nằm trong additionalDeltaIds. role=effect nghĩa mechanic trực tiếp tạo delta; role=support nghĩa mechanic chỉ cấp quyền hoặc điều kiện cho delta do mechanic effect khác tạo. Mỗi resource delta phải có đúng một effect owner nhưng có thể có nhiều support. Conversion luôn effect; constraint luôn support. Conversion phải gắn đủ delta đầu vào và đầu ra. Capability là effect chỉ khi nó trực tiếp tạo resource/fact thuộc effectResourceIds/effectFactIds, còn nếu chỉ cho phép conversion hoặc mechanic khác thì dùng support. Không tạo mechanics entry nếu cơ chế không liên quan state transition trong chương.',
    'Conversion là một batch nguyên tử: chỉ commit toàn bộ input và output trong cùng scene khi batch hoàn tất. Chương chuẩn bị chưa hoàn tất batch phải dùng fact hoặc resource_state để ghi tiến độ; không được trừ trước một phần input numeric rồi để output sang chương sau.',
    'Giữ goal/block/act ngắn và cơ học; chỉ đưa nhân vật, rule và delta thật sự cần cho chương.',
    'knowledge.after phải là fact ID đã tồn tại trong State. Nếu nhân vật học một fact mới, tạo fact delta khai báo fact đó trước knowledge delta trong cùng chương và gắn cả hai vào scene học biết.',
    'relationship.before phải bằng chính xác State.characters[characterId].relationshipState[counterpartId], hoặc null nếu pair chưa có entry; không suy ra quan hệ ban đầu từ role, agenda hay mô tả Kernel.',
    'Nếu một nhân vật đổi location trong chương, tạo đúng một location delta từ vị trí đầu chương tới vị trí ở scene cuối của họ và gắn delta vào scene thực hiện lần di chuyển đầu tiên.',
  ],
} as const;

export function materializePlannerRollingPlan(
  value: z.infer<typeof PlannerRollingPlanResponseSchema>,
  initialState: StoryState,
): RollingPlan {
  const compact = PlannerRollingPlanResponseSchema.parse(value);
  const chapters = compact.chaptersJson.map(raw => PlannerCompactChapterSchema.parse(JSON.parse(raw)));
  const resourceBalances = new Map(initialState.resources.flatMap(resource => (
    resource.kind === 'numeric' ? [[resource.resourceId, resource.value] as const] : []
  )));
  return RollingPlanSchema.parse({
    schemaVersion: compact.v,
    startChapter: compact.start,
    plans: chapters.map(chapter => ({
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
        if (delta.k === 'fact') return { id: delta.id, kind: delta.k, factId: delta.target, before: delta.before, after: delta.after };
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
        if (delta.k === 'resource_state') return { id: delta.id, kind: delta.k, resourceId: delta.target, before: delta.before, after: delta.after, source: delta.source };
        if (delta.k === 'knowledge') return { id: delta.id, kind: delta.k, characterId: delta.target, factId: delta.after, source: delta.source };
        if (delta.k === 'location') return { id: delta.id, kind: delta.k, characterId: delta.target, beforeLocationId: delta.before, afterLocationId: delta.after };
        if (delta.k === 'relationship') return {
          id: delta.id,
          kind: delta.k,
          characterId: delta.target,
          counterpartId: delta.counterpart,
          before: delta.before,
          after: delta.after,
          source: delta.source,
        };
        return { id: delta.id, kind: delta.k, promiseId: delta.target, before: delta.before, after: delta.after };
      }),
      mechanicUses: chapter.mechanics.map(use => ({
        id: use.id,
        sceneId: use.scene,
        mechanicId: use.mechanic,
        role: use.role,
        actorId: use.actor,
        quantity: use.qty,
        preconditionFactIds: use.facts,
        deltaIds: [use.primaryDeltaId, ...use.additionalDeltaIds],
      })),
    })),
  });
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

export async function assessRollingPlan(input: {
  provider: StoryModelProvider;
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  rollingPlan: RollingPlan;
  model: string;
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
        outcomeWeight: 'Kết quả phải có trọng lượng tương xứng chuẩn bị và phản lực; không dùng tai họa cưỡng ép, quần chúng làm nền hoặc một thao tác giải quyết toàn bộ xung đột.',
      },
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
}): Promise<{ rollingPlan: RollingPlan; assessment: PlanAssessment; usages: ProviderUsage[] }> {
  const provider = input.provider ?? geminiProvider;
  const usages: ProviderUsage[] = [];
  validateArcResourceReachability({
    kernel: input.kernel,
    arc: input.arc,
    state: input.state,
  });
  let previousResponse: unknown;
  let validationIssues: unknown;
  let lastError: StoryFactoryError | undefined;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await provider.json({
      model: input.routes.planner,
      system: PLANNER_SYSTEM_PROMPT,
      prompt: JSON.stringify({
        task: attempt === 1
          ? input.recoveryEvidence
            ? 'Lập lại toàn bộ rolling window chưa commit từ state hiện tại; xử lý bằng chứng cho thấy plan trước không tạo tiến triển mới.'
            : input.requiredWindowSize
              ? `Lập đúng ${input.requiredWindowSize} chương tiếp theo, không vượt quá cuối arc.`
              : 'Lập từ một đến năm chương tiếp theo, không vượt quá cuối arc.'
          : 'Tạo lại toàn bộ rolling window và sửa đúng các validation issue; không vá cục bộ.',
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
        travelConstraints: {
          initialLocationsByCharacter: Object.fromEntries(
            input.state.characters.map(item => [item.characterId, item.locationId]),
          ),
          directMinimumMinutes: input.kernel.travelRules.map(rule => ({
            fromLocationId: rule.fromLocationId,
            toLocationId: rule.toLocationId,
            minimumMinutes: rule.minimumMinutes,
          })),
          sceneRule: 'Theo dõi vị trí của từng người qua từng scene. scene.travel phải >= thời gian trực tiếp lớn nhất của mọi scene.people đi từ vị trí trước đó tới scene.loc; nếu thiếu route thì không cho người đó xuất hiện trong scene.',
        },
        continuityPacket: input.continuityPacket ?? null,
        nextChapter: input.state.chapterNumber + 1,
        maximumEndChapter: input.arc.plannedEndChapter,
        compactContract: PLANNER_COMPACT_CONTRACT,
        recoveryEvidence: input.recoveryEvidence,
        previousResponse: attempt === 1 ? undefined : previousResponse,
        validationIssues: attempt === 1 ? undefined : validationIssues,
      }),
      schema: PlannerRollingPlanResponseSchema,
      temperature: attempt === 1 ? 0.7 : 0.4,
    });
    usages.push(result.usage);
    try {
      const parsed = materializePlannerRollingPlan(result.value, input.state);
      if (input.requiredWindowSize && parsed.plans.length !== input.requiredWindowSize) {
        throw new StoryFactoryError('plan_blocked', 'Planner returned the wrong required window size.', {
          requiredWindowSize: input.requiredWindowSize,
          actualWindowSize: parsed.plans.length,
        });
      }
      validateRollingPlan({ kernel: input.kernel, arc: input.arc, state: input.state, rollingPlan: parsed });
      const judged = await assessRollingPlan({
        provider,
        kernel: input.kernel,
        arc: input.arc,
        state: input.state,
        rollingPlan: parsed,
        model: input.routes.planJudge,
      });
      usages.push(judged.usage);
      if (judged.assessment.status === 'pass') {
        return { rollingPlan: parsed, assessment: judged.assessment, usages };
      }
      lastError = new StoryFactoryError('plan_blocked', 'Plan Judge rejected the rolling window.', judged.assessment.issues);
      previousResponse = result.value;
      validationIssues = judged.assessment.issues;
    } catch (error) {
      if (error instanceof StoryFactoryError && error.code === 'infra_blocked') throw error;
      lastError = error instanceof StoryFactoryError
        ? error
        : new StoryFactoryError('plan_blocked', 'Planner output failed the exact rolling-plan contract.', error instanceof z.ZodError ? error.issues : undefined);
      previousResponse = result.value;
      validationIssues = {
        message: lastError.message,
        evidence: lastError.evidence ?? null,
      };
    }
  }
  if (lastError) {
    throw new StoryFactoryError(lastError.code, lastError.message, {
      validation: lastError.evidence ?? null,
      usages,
    });
  }
  throw new StoryFactoryError('plan_blocked', 'Planner repair budget was exhausted.', { usages });
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
