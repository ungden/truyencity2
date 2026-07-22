import { z } from 'zod';
import {
  ArcPlanSchema,
  RollingPlanSchema,
  StoryFactoryError,
  type ArcPlan,
  type ModelRoutes,
  type RollingPlan,
  type StoryKernel,
  type StoryState,
} from './contracts';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { geminiProvider } from './provider';
import { EDITOR_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT } from './prompts';
import { validateRollingPlan } from './validation';

const PlannerScalarSchema = z.union([z.string(), z.number(), z.null()]);
const PlannerCompactDeltaSchema = z.object({
  id: z.string(),
  k: z.enum(['fact', 'resource_numeric', 'resource_state', 'knowledge', 'location', 'promise']),
  target: z.string(),
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
  v: z.literal(1),
  n: z.number().int().positive(),
  arc: z.number().int().positive(),
  time: z.number().int().min(0),
  pre: z.array(z.object({
    k: z.enum(['fact', 'resource', 'location', 'promise']),
    id: z.string(),
    value: z.union([z.string(), z.number()]),
  }).strict()).max(30),
  rules: z.array(z.string()).min(1).max(12),
  scenes: z.array(PlannerCompactSceneSchema).min(1).max(5),
  deltas: z.array(PlannerCompactDeltaSchema).min(1).max(30),
}).strict();

export const PlannerRollingPlanResponseSchema = z.object({
  v: z.literal(1),
  start: z.number().int().positive(),
  chaptersJson: z.array(z.string()).min(1).max(5),
}).strict();

const PLANNER_COMPACT_CONTRACT = {
  deltaTarget: {
    fact: 'target=factId; before/after là giá trị fact; change/source/sink=null',
    resource_numeric: 'target=resourceId; before/change/after là số; source hoặc sink mô tả nguồn tiền/vật tư, có thể null',
    resource_state: 'target=resourceId; before/after là trạng thái; source giải thích nguồn thay đổi; change/sink=null',
    knowledge: 'target=characterId; after=factId; source là nguồn học biết; before/change/sink=null',
    location: 'target=characterId; before/after là locationId; change/source/sink=null',
    promise: 'target=promiseId; before/after thuộc open|progressed|resolved|abandoned; change/source/sink=null',
  },
  chapterJson: {
    serialization: 'Mỗi phần tử chaptersJson là đúng một JSON object đã stringify, không markdown.',
    chapterFields: ['v=1', 'n', 'arc', 'time', 'pre', 'rules', 'scenes', 'deltas'],
    preFields: ['k', 'id', 'value'],
    sceneFields: ['id', 'pov', 'people', 'loc', 'dur', 'travel', 'goal', 'block', 'act', 'deltaIds'],
    deltaFields: ['id', 'k', 'target', 'before', 'change', 'after', 'source', 'sink'],
  },
  strictRules: [
    'Mọi field compact đều bắt buộc; dùng null đúng chỗ, không bỏ field.',
    'pre.k chỉ được fact|resource|location|promise; resource_numeric và resource_state chỉ dùng cho deltas.k.',
    'time, dur và travel là một số nguyên phút; travel không được là mảng hay mô tả tuyến đường.',
    'time là storyTime tuyệt đối ở cuối chương, không phải số phút của riêng chương. Với chương đầu: time >= State.storyTimeMinutes + tổng mọi scene.dur + scene.travel. Với chương sau: time >= time chương trước + tổng dur + travel của chương đó.',
    'Tính time tuần tự cho cả window sau khi đã chốt scenes; tuyệt đối không để time bằng thời điểm đầu chương khi chương có diễn biến.',
    'scene.id và mọi ID đều là string stable ID, không dùng số thứ tự trần.',
    'rules có ít nhất một world-rule ID tồn tại trong Kernel.',
    'scene.deltaIds chỉ chứa delta ID tồn tại trong cùng chương; cảnh nối có thể rỗng nhưng cả chương vẫn phải có deltas.',
    'Mỗi delta phải được ít nhất một scene.deltaIds tham chiếu.',
    'Nếu một nhân vật đổi location trong chương, tạo đúng một location delta từ vị trí đầu chương tới vị trí ở scene cuối của họ và gắn delta vào scene thực hiện lần di chuyển đầu tiên.',
  ],
} as const;

export function materializePlannerRollingPlan(value: z.infer<typeof PlannerRollingPlanResponseSchema>): RollingPlan {
  const compact = PlannerRollingPlanResponseSchema.parse(value);
  const chapters = compact.chaptersJson.map(raw => PlannerCompactChapterSchema.parse(JSON.parse(raw)));
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
        if (delta.k === 'resource_numeric') return { id: delta.id, kind: delta.k, resourceId: delta.target, before: delta.before, delta: delta.change, after: delta.after, source: delta.source, sink: delta.sink };
        if (delta.k === 'resource_state') return { id: delta.id, kind: delta.k, resourceId: delta.target, before: delta.before, after: delta.after, source: delta.source };
        if (delta.k === 'knowledge') return { id: delta.id, kind: delta.k, characterId: delta.target, factId: delta.after, source: delta.source };
        if (delta.k === 'location') return { id: delta.id, kind: delta.k, characterId: delta.target, beforeLocationId: delta.before, afterLocationId: delta.after };
        return { id: delta.id, kind: delta.k, promiseId: delta.target, before: delta.before, after: delta.after };
      }),
    })),
  });
}

export const WindowReviewSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pass'), issues: z.array(z.never()).length(0) }).strict(),
  z.object({
    status: z.literal('block'),
    issues: z.array(z.object({
      category: z.enum(['continuity_drift', 'voice_drift', 'repetition', 'reward_loop', 'progression']),
      evidence: z.string().trim().min(5).max(1_000),
      instruction: z.string().trim().min(5).max(1_000),
    }).strict()).min(1).max(3),
  }).strict(),
]);

const ArcLifecycleSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('continue'), nextArc: ArcPlanSchema }).strict(),
  z.object({ status: z.literal('finale'), nextArc: ArcPlanSchema }).strict(),
  z.object({ status: z.literal('complete'), nextArc: z.null() }).strict(),
]);

export type WindowReview = z.infer<typeof WindowReviewSchema>;
export type ArcLifecycle = z.infer<typeof ArcLifecycleSchema>;

export async function planRollingWindow(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  routes: ModelRoutes;
  recoveryEvidence?: unknown;
  provider?: StoryModelProvider;
}): Promise<{ rollingPlan: RollingPlan; usages: ProviderUsage[] }> {
  const provider = input.provider ?? geminiProvider;
  const usages: ProviderUsage[] = [];
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
            : 'Lập từ một đến năm chương tiếp theo, không vượt quá cuối arc.'
          : 'Tạo lại toàn bộ rolling window và sửa đúng các validation issue; không vá cục bộ.',
        kernel: input.kernel,
        arc: input.arc,
        state: input.state,
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
      const parsed = materializePlannerRollingPlan(result.value);
      validateRollingPlan({ kernel: input.kernel, arc: input.arc, state: input.state, rollingPlan: parsed });
      return { rollingPlan: parsed, usages };
    } catch (error) {
      lastError = error instanceof StoryFactoryError
        ? error
        : new StoryFactoryError('infra_blocked', 'Planner output failed the exact rolling-plan contract.', error instanceof z.ZodError ? error.issues : undefined);
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
    system: `${EDITOR_SYSTEM_PROMPT}\nỞ chế độ window review, chỉ kiểm drift, lặp và tiến triển trong năm chương; không chấm lại từng chương.`,
    prompt: JSON.stringify({
      task: 'Kiểm tra cửa sổ năm chương vừa commit.',
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
}): Promise<{ lifecycle: ArcLifecycle; usage: ProviderUsage }> {
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
  } else {
    const next = result.value.nextArc;
    if (next.arcNumber !== input.arc.arcNumber + 1 || next.startChapter !== input.state.chapterNumber + 1) {
      throw new StoryFactoryError('plan_blocked', 'Next arc is not contiguous with committed state.');
    }
    if (next.plannedEndChapter > input.maximumChapter) {
      throw new StoryFactoryError('plan_blocked', 'Next arc exceeds the hard safety chapter cap.');
    }
  }
  return { lifecycle: result.value, usage: result.usage };
}
