import type { ChapterPlanV3, StoryStateV3 } from './contracts';
import type { FlagshipModelRoutesV3 } from './model-routes';
import type { FlagshipLaunchPackV3 } from './setup';
import { buildV3RoleContexts } from './context';
import {
  FlagshipV3Error,
  executeFlagshipV3Pipeline,
  type FlagshipV3ModelCall,
  type FlagshipV3ModelRole,
} from './pipeline';
import type { QualityVerdictV3 } from './quality';
import { applyChapterStateV3 } from './state-transition';

export interface OfflineOpeningModelResponseV3 {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  finishReason: string;
  reused?: boolean;
}

export interface OfflineOpeningModelRequestV3 {
  chapterNumber: number;
  model: string;
  call: FlagshipV3ModelCall;
}

export interface OfflineOpeningCallRecordV3 {
  chapterNumber: number;
  role: FlagshipV3ModelRole;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  finishReason: string;
  reused: boolean;
}

export interface OfflineOpeningChapterV3 {
  chapterNumber: number;
  status: 'publish' | 'quality_blocked' | 'plan_blocked' | 'infra_blocked';
  title: string | null;
  content: string | null;
  verdict: QualityVerdictV3 | null;
  callRoles: FlagshipV3ModelRole[];
  calls: OfflineOpeningCallRecordV3[];
  estimatedCostUsd: number;
  stateAfter: StoryStateV3 | null;
  error: string | null;
  detail: unknown;
}

export interface OfflineOpeningRunV3 {
  schemaVersion: 3;
  title: string;
  routeVersion: string;
  requestedChapters: number;
  completedChapters: number;
  stoppedAtChapter: number | null;
  estimatedCostUsd: number;
  chapters: OfflineOpeningChapterV3[];
  finalState: StoryStateV3;
}

function errorStatus(error: FlagshipV3Error): OfflineOpeningChapterV3['status'] {
  if (error.code === 'quality_blocked') return 'quality_blocked';
  if (error.code === 'plan_blocked') return 'plan_blocked';
  return 'infra_blocked';
}

function failureDraft(detail: unknown): { title: string | null; content: string | null; verdict: QualityVerdictV3 | null; callRoles: FlagshipV3ModelRole[] } {
  const value = detail && typeof detail === 'object' ? detail as Record<string, unknown> : {};
  const draft = value.draft && typeof value.draft === 'object' ? value.draft as Record<string, unknown> : {};
  return {
    title: typeof draft.title === 'string' ? draft.title : null,
    content: typeof draft.content === 'string' ? draft.content : null,
    verdict: value.verdict && typeof value.verdict === 'object' ? value.verdict as QualityVerdictV3 : null,
    callRoles: Array.isArray(value.callRoles) ? value.callRoles as FlagshipV3ModelRole[] : [],
  };
}

export async function runOfflineOpeningV3(
  input: {
    launchPack: FlagshipLaunchPackV3;
    routes: FlagshipModelRoutesV3;
    chapters?: number;
    targetWordCount?: number;
  },
  dependencies: {
    invoke(request: OfflineOpeningModelRequestV3): Promise<OfflineOpeningModelResponseV3>;
  },
): Promise<OfflineOpeningRunV3> {
  const requestedChapters = input.chapters ?? 3;
  if (!Number.isInteger(requestedChapters) || requestedChapters < 1 || requestedChapters > 5) {
    throw new Error('Offline opening supports between one and five staged chapters.');
  }
  const plans = input.launchPack.initialWindow.plans.slice(0, requestedChapters);
  if (plans.length !== requestedChapters) throw new Error('Launch pack does not contain the requested opening window.');

  return runOfflinePlannedWindowV3({
    title: input.launchPack.kernel.title,
    kernel: input.launchPack.kernel,
    arc: input.launchPack.arc,
    state: input.launchPack.initialState,
    plans,
    routes: input.routes,
    targetWordCount: input.targetWordCount,
  }, dependencies);
}

export async function runOfflinePlannedWindowV3(
  input: {
    title: string;
    kernel: FlagshipLaunchPackV3['kernel'];
    arc: FlagshipLaunchPackV3['arc'];
    state: StoryStateV3;
    plans: ChapterPlanV3[];
    routes: FlagshipModelRoutesV3;
    targetWordCount?: number;
    previousChapterContent?: string;
  },
  dependencies: {
    invoke(request: OfflineOpeningModelRequestV3): Promise<OfflineOpeningModelResponseV3>;
  },
): Promise<OfflineOpeningRunV3> {
  if (input.plans.length < 1 || input.plans.length > 5) {
    throw new Error('Offline planned window supports between one and five chapters.');
  }
  input.plans.forEach((plan, index) => {
    if (plan.chapterNumber !== input.state.chapterNumber + index + 1) {
      throw new Error('Offline planned window must be contiguous with committed state.');
    }
  });

  let state = input.state;
  let previousChapterTail = input.previousChapterContent
    || (input.state.chapterNumber > 0 ? input.state.previousEnding : '');
  const chapters: OfflineOpeningChapterV3[] = [];
  for (const plan of input.plans) {
    const calls: OfflineOpeningCallRecordV3[] = [];
    let chapterCost = 0;
    try {
      const contexts = buildV3RoleContexts({
        kernel: input.kernel,
        arc: input.arc,
        state,
        plan,
        previousChapterTail,
      });
      const generated = await executeFlagshipV3Pipeline({
        kernel: input.kernel,
        arc: input.arc,
        state,
        plan,
        targetWordCount: input.targetWordCount ?? 1800,
        previousChapterTail,
        contexts,
      }, {
        invoke: async call => {
          const model = call.role === 'writer' || call.role === 'writer_revision'
            ? input.routes.writer
            : input.routes.editor;
          const response = await dependencies.invoke({ chapterNumber: plan.chapterNumber, model, call });
          if (!Number.isFinite(response.estimatedCostUsd) || response.estimatedCostUsd < 0) {
            throw new FlagshipV3Error('infra_blocked', `${model} returned an invalid cost estimate.`);
          }
          chapterCost += response.estimatedCostUsd;
          calls.push({
            chapterNumber: plan.chapterNumber,
            role: call.role,
            model,
            promptTokens: response.promptTokens,
            completionTokens: response.completionTokens,
            estimatedCostUsd: response.estimatedCostUsd,
            finishReason: response.finishReason,
            reused: response.reused === true,
          });
          if (chapterCost > input.routes.maxPublishedChapterCostUsd) {
            throw new FlagshipV3Error(
              'infra_blocked',
              `COST_CAP_BLOCKED: estimated $${chapterCost.toFixed(4)} exceeds route cap $${input.routes.maxPublishedChapterCostUsd.toFixed(4)}.`,
            );
          }
          return response.content;
        },
      });
      state = applyChapterStateV3({
        state,
        plan,
        title: generated.title,
        content: generated.content,
        realizedDeltaIds: generated.verdict.realizedDeltaEvidence.map(item => item.deltaId),
      });
      previousChapterTail = generated.content;
      chapters.push({
        chapterNumber: plan.chapterNumber,
        status: 'publish',
        title: generated.title,
        content: generated.content,
        verdict: generated.verdict,
        callRoles: generated.callRoles,
        calls,
        estimatedCostUsd: Number(chapterCost.toFixed(6)),
        stateAfter: state,
        error: null,
        detail: null,
      });
    } catch (caught) {
      const error = caught instanceof FlagshipV3Error
        ? caught
        : new FlagshipV3Error('infra_blocked', caught instanceof Error ? caught.message : String(caught));
      const failure = failureDraft(error.detail);
      chapters.push({
        chapterNumber: plan.chapterNumber,
        status: errorStatus(error),
        title: failure.title,
        content: failure.content,
        verdict: failure.verdict,
        callRoles: failure.callRoles.length ? failure.callRoles : calls.map(call => call.role),
        calls,
        estimatedCostUsd: Number(chapterCost.toFixed(6)),
        stateAfter: null,
        error: error.message,
        detail: error.detail ?? null,
      });
      break;
    }
  }

  const completedChapters = chapters.filter(chapter => chapter.status === 'publish').length;
  const failed = chapters.find(chapter => chapter.status !== 'publish');
  return {
    schemaVersion: 3,
    title: input.title,
    routeVersion: input.routes.routeVersion,
    requestedChapters: input.plans.length,
    completedChapters,
    stoppedAtChapter: failed?.chapterNumber ?? null,
    estimatedCostUsd: Number(chapters.reduce((sum, chapter) => sum + chapter.estimatedCostUsd, 0).toFixed(6)),
    chapters,
    finalState: state,
  };
}
