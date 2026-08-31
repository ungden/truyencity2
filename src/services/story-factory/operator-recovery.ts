import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ArcPlanSchema,
  ModelRoutesSchema,
  StoryKernelSchema,
  StoryStateSchema,
} from './contracts';
import { requireMarketBlueprint } from './setup';
import {
  validateArcActivationBudget,
  validateArcAgainstKernel,
  validateArcResourceReachability,
  validateKernelState,
} from './validation';

type JsonRecord = Record<string, unknown>;

export type PlanBlockedRecovery = {
  jobId: string;
  projectId: string;
  chapterNumber: number;
  sourceRunId: string;
  sourceRunKind: string;
  discardedRollingPlan: boolean;
};

function asRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} is missing or malformed.`);
  }
  return value as JsonRecord;
}

/**
 * A plan block is recoverable only by throwing away its uncommitted window and
 * re-planning from the canonical state. This intentionally does not touch a
 * published chapter, the project state, or the failed run's evidence.
 */
export async function preparePlanBlockedRecovery(
  db: SupabaseClient,
  jobId: string,
  engineRelease: string,
): Promise<PlanBlockedRecovery & { planFeedback: JsonRecord }> {
  const { data, error } = await db.from('story_factory_jobs').select(`
    id, project_id, status, stage, current_chapter, rolling_plan, plan_feedback, lease_until,
    ai_story_projects!story_factory_jobs_project_id_fkey(
      id, engine_release, story_kernel, arc_plan, story_state, model_routes, market_blueprint
    )
  `).eq('id', jobId).single();
  if (error) throw error;

  const job = data as unknown as {
    id: string;
    project_id: string;
    status: string;
    stage: string;
    current_chapter: number;
    rolling_plan: unknown;
    plan_feedback: unknown;
    lease_until: string | null;
    ai_story_projects: unknown;
  };
  if (job.status !== 'plan_blocked' || job.stage !== 'plan') {
    throw new Error(`Job ${jobId} is ${job.status}/${job.stage}; repair-plan requires plan_blocked/plan.`);
  }
  if (job.lease_until !== null) {
    throw new Error(`Job ${jobId} still has a lease; wait for it to be cleared before repair-plan.`);
  }

  const project = asRecord(Array.isArray(job.ai_story_projects) ? job.ai_story_projects[0] : job.ai_story_projects, 'Story Factory project');
  if (project.engine_release !== engineRelease) {
    throw new Error(`Job ${jobId} is on ${String(project.engine_release)}, not the running release ${engineRelease}. Restage it before repair-plan.`);
  }

  const kernel = StoryKernelSchema.parse(project.story_kernel);
  const arc = ArcPlanSchema.parse(project.arc_plan);
  const state = StoryStateSchema.parse(project.story_state);
  ModelRoutesSchema.parse(project.model_routes);
  requireMarketBlueprint(project.market_blueprint);
  if (state.chapterNumber !== job.current_chapter) {
    throw new Error(`Job ${jobId} is at chapter ${job.current_chapter}, but canonical state is at chapter ${state.chapterNumber}.`);
  }
  validateKernelState(kernel, state);
  validateArcActivationBudget(arc);
  validateArcAgainstKernel(kernel, arc);
  validateArcResourceReachability({ kernel, arc, state });

  const planFeedback = asRecord(job.plan_feedback, 'Plan recovery feedback');
  if (planFeedback.source !== 'plan_blocked' && planFeedback.source !== 'editor_plan_scope') {
    throw new Error(`Job ${jobId} has no trusted plan-block recovery evidence.`);
  }

  const sourceRun = await db.from('story_factory_runs')
    .select('id,kind')
    .eq('job_id', job.id)
    .eq('status', 'blocked')
    .eq('error_code', 'plan_blocked')
    .eq('chapter_number', job.current_chapter + 1)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sourceRun.error) throw sourceRun.error;
  if (!sourceRun.data) {
    throw new Error(`Job ${jobId} has no blocked run for chapter ${job.current_chapter + 1}.`);
  }

  return {
    jobId: job.id,
    projectId: job.project_id,
    chapterNumber: job.current_chapter,
    sourceRunId: sourceRun.data.id,
    sourceRunKind: sourceRun.data.kind,
    discardedRollingPlan: job.rolling_plan !== null,
    planFeedback,
  };
}

export async function repairPlanBlockedJob(
  db: SupabaseClient,
  jobId: string,
  engineRelease: string,
  apply: boolean,
): Promise<PlanBlockedRecovery> {
  const prepared = await preparePlanBlockedRecovery(db, jobId, engineRelease);
  const { planFeedback, ...recovery } = prepared;
  if (!apply) return recovery;

  const now = new Date().toISOString();
  const recoveryEvidence = {
    ...planFeedback,
    operatorRecovery: {
      sourceRunId: recovery.sourceRunId,
      sourceRunKind: recovery.sourceRunKind,
      preparedAt: now,
      discardedRollingPlan: recovery.discardedRollingPlan,
    },
  };
  const { data, error } = await db.from('story_factory_jobs').update({
    status: 'ready',
    stage: 'plan',
    rolling_plan: null,
    plan_feedback: recoveryEvidence,
    retry_count: 0,
    last_error: null,
    lease_owner: null,
    lease_token: null,
    lease_until: null,
    next_run_at: now,
    updated_at: now,
  }).eq('id', recovery.jobId)
    .eq('status', 'plan_blocked')
    .eq('stage', 'plan')
    .is('lease_until', null)
    .select('id');
  if (error) throw error;
  if (data?.length !== 1) {
    throw new Error(`Job ${jobId} changed while repair-plan was being prepared; it was not requeued.`);
  }
  return recovery;
}
