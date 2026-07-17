import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { callFlagshipModel } from '../flagship/provider';
import { toGeminiResponseJsonSchema } from '../flagship/setup-response-schemas';
import { getSupabase } from '../utils/supabase';
import { ArcPlanV3Schema, StoryKernelV3Schema, StoryStateV3Schema, parseV3, type ArcPlanV3, type StoryKernelV3, type StoryStateV3 } from './contracts';
import { buildV3PlannerContext } from './context';
import { requireFlagshipModelRoutesV3 } from './model-routes';
import { FlagshipV3Error } from './pipeline';
import { assertFlagshipReleaseV3, getFlagshipReleaseManifestV3 } from './release';

export const V3_ARC_PLANNER_PROMPT_VERSION = 'flagship-v3.1-arc-closure-ending-contract';

const ArcClosureV3Schema = z.object({
  closedArcId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  terminalChangeAchieved: z.boolean(),
  terminalChangeEvidenceFactIds: z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).max(12),
  unresolvedConflictIds: z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).max(12),
  summary: z.string().trim().min(20),
}).strict().superRefine((closure, ctx) => {
  if (closure.terminalChangeAchieved && closure.terminalChangeEvidenceFactIds.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['terminalChangeEvidenceFactIds'], message: 'Achieved terminal change requires committed fact evidence.' });
  }
});

export const EndingReadinessV3Schema = z.object({
  deterministicReady: z.boolean(),
  requiredPromiseIds: z.array(z.string()).max(20),
  unpaidPromiseIds: z.array(z.string()).max(20),
  atOrAfterMinimumChapter: z.boolean(),
  rationale: z.string().trim().min(20),
}).strict();

export const ArcTransitionProposalV3Schema = z.object({
  schemaVersion: z.literal(3),
  closure: ArcClosureV3Schema,
  requestCompletion: z.boolean(),
  nextArc: ArcPlanV3Schema.nullable(),
}).strict();

export const ArcTransitionJudgeV3Schema = z.object({
  approved: z.boolean(),
  evidence: z.array(z.string().trim().min(8)).min(1).max(10),
  criticalIssues: z.array(z.string().trim().min(8)).max(10),
}).strict();

export type EndingReadinessV3 = z.infer<typeof EndingReadinessV3Schema>;

export function assessEndingReadinessV3(kernel: StoryKernelV3, state: StoryStateV3): EndingReadinessV3 {
  const byId = new Map(state.promises.map(promise => [promise.promiseId, promise.status]));
  const requiredPromiseIds = kernel.endingContract.promisesThatMustClose;
  const unpaidPromiseIds = requiredPromiseIds.filter(id => byId.get(id) !== 'paid');
  const atOrAfterMinimumChapter = state.chapterNumber >= kernel.endingContract.targetChapterRange.min;
  return {
    deterministicReady: unpaidPromiseIds.length === 0 && atOrAfterMinimumChapter,
    requiredPromiseIds,
    unpaidPromiseIds,
    atOrAfterMinimumChapter,
    rationale: unpaidPromiseIds.length
      ? `Chưa thể kết thúc vì các promise bắt buộc chưa paid: ${unpaidPromiseIds.join(', ')}.`
      : atOrAfterMinimumChapter
        ? 'Các promise bắt buộc đã paid và truyện đã qua số chương tối thiểu.'
        : `Các promise đã paid nhưng mới ở chương ${state.chapterNumber}, dưới mốc tối thiểu ${kernel.endingContract.targetChapterRange.min}.`,
  };
}

function cleanJson(raw: string): unknown {
  return JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
}

function parseRequired<T>(label: string, schema: z.ZodType<T>, value: unknown): T {
  const parsed = parseV3(schema, value);
  if (!parsed.success) throw new FlagshipV3Error('infra_blocked', `${label} violated its exact contract.`, parsed.issues);
  return parsed.data;
}

function validateTransition(input: {
  currentArc: ArcPlanV3;
  state: StoryStateV3;
  readiness: EndingReadinessV3;
  proposal: z.infer<typeof ArcTransitionProposalV3Schema>;
}): void {
  const { currentArc, state, readiness, proposal } = input;
  if (state.chapterNumber !== currentArc.endChapter || proposal.closure.closedArcId !== currentArc.arcId) {
    throw new FlagshipV3Error('plan_blocked', 'Arc transition does not close the exact committed arc boundary.');
  }
  if (proposal.requestCompletion) {
    if ((currentArc.arcMode ?? 'standard') !== 'finale' || !readiness.deterministicReady || proposal.nextArc !== null || !proposal.closure.terminalChangeAchieved) {
      throw new FlagshipV3Error('plan_blocked', 'Completion requires a finale arc, paid ending promises, minimum length and no next arc.');
    }
    return;
  }
  if ((currentArc.arcMode ?? 'standard') === 'finale' && readiness.deterministicReady) {
    throw new FlagshipV3Error('plan_blocked', 'A ready finale must complete instead of opening another arc.');
  }
  if (!proposal.nextArc) throw new FlagshipV3Error('plan_blocked', 'A non-completing arc transition requires nextArc.');
  if (proposal.nextArc.startChapter !== state.chapterNumber + 1) {
    throw new FlagshipV3Error('plan_blocked', 'Next arc must start immediately after committed state.');
  }
  const expectedMode = readiness.deterministicReady ? 'finale' : 'standard';
  if ((proposal.nextArc.arcMode ?? 'standard') !== expectedMode) {
    throw new FlagshipV3Error('plan_blocked', `Next arc must be ${expectedMode} at this ending-readiness state.`);
  }
  const factIds = new Set(state.facts.map(fact => fact.id));
  if (proposal.closure.terminalChangeEvidenceFactIds.some(id => !factIds.has(id))) {
    throw new FlagshipV3Error('plan_blocked', 'Arc closure cites evidence facts outside committed state.');
  }
}

export async function advanceFlagshipV3Arc(
  projectId: string,
  dependencies: { db?: SupabaseClient; invoke?: (role: 'planner' | 'judge', system: string, user: string) => Promise<string> } = {},
): Promise<{ completed: boolean; nextArc: ArcPlanV3 | null }> {
  const db = dependencies.db || getSupabase();
  const { data, error } = await db.from('ai_story_projects')
    .select('status,current_chapter,style_directives,flagship_v3_status,story_kernel_v3,arc_plan_v3,story_state_v3')
    .eq('id', projectId).single();
  if (error || !data) throw new FlagshipV3Error('setup_blocked', error?.message || 'Flagship v3 project not found.');
  const style = data.style_directives as { pipeline_version?: string; flagship_release_v3?: unknown } | null;
  if (data.status !== 'paused' || data.flagship_v3_status !== 'ready_to_write' || style?.pipeline_version !== 'flagship_v3') {
    throw new FlagshipV3Error('setup_blocked', 'Arc lifecycle requires an approved paused flagship_v3 project.');
  }
  try { assertFlagshipReleaseV3(style.flagship_release_v3); } catch (caught) {
    throw new FlagshipV3Error('setup_blocked', caught instanceof Error ? caught.message : String(caught));
  }
  const kernel = parseRequired('StoryKernelV3', StoryKernelV3Schema, data.story_kernel_v3);
  const arc = parseRequired('ArcPlanV3', ArcPlanV3Schema, data.arc_plan_v3);
  const state = parseRequired('StoryStateV3', StoryStateV3Schema, data.story_state_v3);
  if (Number(data.current_chapter || 0) !== state.chapterNumber || state.chapterNumber !== arc.endChapter) {
    throw new FlagshipV3Error('plan_blocked', 'Arc lifecycle can run only on an exact committed arc boundary.');
  }
  const routes = requireFlagshipModelRoutesV3(data.style_directives);
  const readiness = assessEndingReadinessV3(kernel, state);
  const context = buildV3PlannerContext({ kernel, arc, state });
  const system = 'Bạn là Arc Planner. Chỉ đóng arc hiện tại và đề xuất đúng một arc kế tiếp, hoặc completion khi finale đã hoàn tất. Không viết prose, không sửa canon, chỉ trả JSON đúng schema.';
  const user = `ENDING_READINESS=${JSON.stringify(readiness)}\nROLE_CONTEXT=${context.text}\nĐóng arc ${arc.arcId} tại chương ${state.chapterNumber}. Nếu readiness true và arc hiện tại chưa phải finale, tạo finale 5-20 chương. Nếu chưa ready, tạo standard arc 20-30 chương. Chỉ requestCompletion khi arc hiện tại là finale và ending contract đã thực hiện.`;
  let proposal: z.infer<typeof ArcTransitionProposalV3Schema>;
  let judge: z.infer<typeof ArcTransitionJudgeV3Schema>;
  let estimatedCostUsd = 0;
  try {
    const proposalRaw = dependencies.invoke
      ? await dependencies.invoke('planner', system, user)
      : await (async () => { const response = await callFlagshipModel(user, {
        model: routes.planner, temperature: 0.15, maxTokens: 16384, thinkingLevel: 'medium', systemPrompt: system,
        responseJsonSchema: toGeminiResponseJsonSchema(ArcTransitionProposalV3Schema),
      }, { jsonMode: true, schemaName: 'flagship_v3_arc_transition', tracking: { projectId, chapterNumber: state.chapterNumber, task: 'flagship_v3_arc_planner' } }); estimatedCostUsd += Number(response.estimatedCostUsd || 0); return response.content; })();
    proposal = parseRequired('ArcTransitionProposalV3', ArcTransitionProposalV3Schema, cleanJson(proposalRaw));
    validateTransition({ currentArc: arc, state, readiness, proposal });
    const judgeSystem = 'Bạn là reviewer độc lập của arc transition. Kiểm tra nhân quả, ending contract, promise và progression. Không sửa proposal. Chỉ trả JSON.';
    const judgeUser = `KERNEL_ENDING=${JSON.stringify(kernel.endingContract)}\nSTATE=${JSON.stringify(state)}\nCURRENT_ARC=${JSON.stringify(arc)}\nREADINESS=${JSON.stringify(readiness)}\nPROPOSAL=${JSON.stringify(proposal)}`;
    const judgeRaw = dependencies.invoke
      ? await dependencies.invoke('judge', judgeSystem, judgeUser)
      : await (async () => { const response = await callFlagshipModel(judgeUser, {
        model: routes.editor, temperature: 0.1, maxTokens: 8192, thinkingLevel: 'medium', systemPrompt: judgeSystem,
        responseJsonSchema: toGeminiResponseJsonSchema(ArcTransitionJudgeV3Schema),
      }, { jsonMode: true, schemaName: 'flagship_v3_arc_judge', tracking: { projectId, chapterNumber: state.chapterNumber, task: 'flagship_v3_arc_judge' } }); estimatedCostUsd += Number(response.estimatedCostUsd || 0); return response.content; })();
    judge = parseRequired('ArcTransitionJudgeV3', ArcTransitionJudgeV3Schema, cleanJson(judgeRaw));
  } catch (caught) {
    if (caught instanceof FlagshipV3Error) throw caught;
    const message = caught instanceof Error ? caught.message : String(caught);
    const failure = classifyStoryFailure(message);
    throw new FlagshipV3Error(failure === 'setup' ? 'setup_blocked' : 'infra_blocked', message);
  }
  if (!judge.approved || judge.criticalIssues.length) {
    throw new FlagshipV3Error('plan_blocked', 'Independent arc reviewer rejected the transition.', judge);
  }
  const release = getFlagshipReleaseManifestV3();
  const { error: commitError } = await db.rpc('commit_flagship_arc_transition_v3', {
    p_project_id: projectId,
    p_expected_current_chapter: state.chapterNumber,
    p_closed_arc: arc,
    p_closure: proposal.closure,
    p_ending_readiness: readiness,
    p_next_arc: proposal.nextArc,
    p_completion_report: proposal.requestCompletion ? { schemaVersion: 3, endingContract: kernel.endingContract, closure: proposal.closure, judge } : null,
    p_prompt_version: V3_ARC_PLANNER_PROMPT_VERSION,
    p_engine_release_id: release.releaseId,
    p_model_route: routes,
    p_context_manifest: context.manifest,
    p_estimated_cost_usd: estimatedCostUsd,
  });
  if (commitError) throw new FlagshipV3Error('commit_failed', `Could not commit arc transition: ${commitError.message}`);
  return { completed: proposal.requestCompletion, nextArc: proposal.nextArc };
}
