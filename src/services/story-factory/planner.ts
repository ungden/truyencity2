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
  provider?: StoryModelProvider;
}): Promise<{ rollingPlan: RollingPlan; usage: ProviderUsage }> {
  const provider = input.provider ?? geminiProvider;
  const result = await provider.json({
    model: input.routes.planner,
    system: PLANNER_SYSTEM_PROMPT,
    prompt: JSON.stringify({
      task: 'Lập từ một đến năm chương tiếp theo, không vượt quá cuối arc.',
      kernel: input.kernel,
      arc: input.arc,
      state: input.state,
      nextChapter: input.state.chapterNumber + 1,
      maximumEndChapter: input.arc.plannedEndChapter,
    }),
    schema: RollingPlanSchema,
    temperature: 0.7,
  });
  try {
    validateRollingPlan({ kernel: input.kernel, arc: input.arc, state: input.state, rollingPlan: result.value });
  } catch (error) {
    if (error instanceof StoryFactoryError) throw error;
    throw new StoryFactoryError('plan_blocked', error instanceof Error ? error.message : String(error));
  }
  return { rollingPlan: result.value, usage: result.usage };
}

export async function reviewTenChapterWindow(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
  routes: ModelRoutes;
  provider?: StoryModelProvider;
}): Promise<{ review: WindowReview; usage: ProviderUsage }> {
  if (input.chapters.length !== 10) throw new Error('Window review requires exactly ten committed chapters.');
  const provider = input.provider ?? geminiProvider;
  const result = await provider.json({
    model: input.routes.editor,
    system: `${EDITOR_SYSTEM_PROMPT}\nỞ chế độ window review, chỉ kiểm drift, lặp và tiến triển trong mười chương; không chấm lại từng chương.`,
    prompt: JSON.stringify({
      task: 'Kiểm tra cửa sổ mười chương vừa commit.',
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
