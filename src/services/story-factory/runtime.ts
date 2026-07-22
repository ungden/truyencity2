import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getVietnamDayBounds } from '@/lib/utils/vietnam-time';
import {
  ArcPlanSchema,
  LaunchPackSchema,
  ModelRoutesSchema,
  RollingPlanSchema,
  StoryFactoryError,
  StoryKernelSchema,
  StoryStateSchema,
  type ModelRoutes,
} from './contracts';
import { generateFactoryCover } from './cover';
import { writeStoryChapter } from './pipeline';
import { planArcLifecycle, planRollingWindow, reviewFiveChapterWindow } from './planner';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { STORY_FACTORY_RELEASE } from './release';
import { runConceptLab } from './setup';
import type { SetupCheckpoint } from './setup';

interface FactoryJobRow {
  id: string;
  project_id: string;
  novel_id: string;
  execution_mode: 'hidden_canary' | 'production';
  status: string;
  stage: 'setup' | 'plan' | 'write' | 'window_review' | 'arc' | 'cover' | 'done';
  current_chapter: number;
  rolling_plan: unknown;
  plan_feedback: unknown;
  replan_attempts: number;
  setup_input: unknown;
  minimum_chapters: number;
  maximum_chapters: number;
  daily_target: number;
  chapters_today: number;
  quota_date: string | null;
  lease_token: string;
}

interface FactoryProjectRow {
  id: string;
  novel_id: string;
  story_kernel: unknown;
  arc_plan: unknown;
  story_state: unknown;
  engine_release: string;
  model_routes: unknown;
}

export interface FactoryTickResult {
  status: 'disabled' | 'idle' | 'completed' | 'blocked';
  jobId?: string;
  stage?: string;
  chapterNumber?: number;
  error?: string;
}

export function isStoryFactoryEnabled(value: string | undefined = process.env.STORY_FACTORY_ENABLED): boolean {
  return value?.trim() === 'true';
}

export function rollingPlanContainsChapter(value: unknown, chapterNumber: number): boolean {
  if (!value || typeof value !== 'object') return false;
  const plans = (value as { plans?: unknown }).plans;
  return Array.isArray(plans) && plans.some(plan => (
    !!plan && typeof plan === 'object' && (plan as { chapterNumber?: unknown }).chapterNumber === chapterNumber
  ));
}

export function nextRunAfterNonChapterStage(job: Pick<FactoryJobRow, 'daily_target' | 'chapters_today' | 'quota_date'>, now = new Date()): string {
  const bounds = getVietnamDayBounds(now);
  const quotaExhausted = job.quota_date === bounds.vnDate && job.chapters_today >= job.daily_target;
  return quotaExhausted
    ? new Date(new Date(bounds.endIso).getTime() + 1).toISOString()
    : now.toISOString();
}

function usageCost(usages: ProviderUsage[]): number {
  return usages.reduce((total, usage) => total + usage.costUsd, 0);
}

async function createRun(db: SupabaseClient, job: FactoryJobRow, kind: string, chapterNumber?: number) {
  const { data, error } = await db.from('story_factory_runs').insert({
    job_id: job.id,
    project_id: job.project_id,
    novel_id: job.novel_id,
    kind,
    chapter_number: chapterNumber ?? null,
    status: 'running',
    engine_release: STORY_FACTORY_RELEASE,
  }).select('id').single();
  if (error) throw error;
  const { error: jobError } = await db.from('story_factory_jobs').update({ last_run_id: data.id }).eq('id', job.id).eq('lease_token', job.lease_token);
  if (jobError) throw jobError;
  return data.id as string;
}

async function blockRun(db: SupabaseClient, job: FactoryJobRow, runId: string | null, error: unknown): Promise<FactoryTickResult> {
  const factoryError = error instanceof StoryFactoryError
    ? error
    : new StoryFactoryError('infra_blocked', error instanceof Error ? error.message : String(error));
  if (runId) {
    const existing = await db.from('story_factory_runs').select('output_artifact').eq('id', runId).single();
    const output = existing.data?.output_artifact && typeof existing.data.output_artifact === 'object'
      ? existing.data.output_artifact as Record<string, unknown>
      : {};
    await db.from('story_factory_runs').update({
      status: factoryError.code === 'infra_blocked' ? 'infra_blocked' : 'blocked',
      error_code: factoryError.code,
      error_message: factoryError.message,
      output_artifact: { ...output, evidence: factoryError.evidence ?? null },
      finished_at: new Date().toISOString(),
    }).eq('id', runId).eq('status', 'running');
  }
  await db.from('story_factory_jobs').update({
    status: factoryError.code,
    last_error: factoryError.message,
    lease_owner: null,
    lease_token: null,
    lease_until: null,
    updated_at: new Date().toISOString(),
  }).eq('id', job.id).eq('lease_token', job.lease_token);
  return { status: 'blocked', jobId: job.id, stage: job.stage, chapterNumber: job.current_chapter, error: factoryError.message };
}

async function recoverUncommittedPlan(
  db: SupabaseClient,
  job: FactoryJobRow,
  runId: string,
  error: StoryFactoryError,
): Promise<FactoryTickResult> {
  if (job.replan_attempts >= 1) return blockRun(db, job, runId, error);
  const now = new Date().toISOString();
  const runUpdate = await db.from('story_factory_runs').update({
    status: 'blocked',
    error_code: error.code,
    error_message: error.message,
    output_artifact: { evidence: error.evidence ?? null, recovery: 'discard_uncommitted_window' },
    finished_at: now,
  }).eq('id', runId).eq('status', 'running');
  if (runUpdate.error) throw runUpdate.error;
  const jobUpdate = await db.from('story_factory_jobs').update({
    status: 'ready',
    stage: 'plan',
    rolling_plan: null,
    plan_feedback: { message: error.message, evidence: error.evidence ?? null },
    replan_attempts: job.replan_attempts + 1,
    last_error: error.message,
    lease_owner: null,
    lease_token: null,
    lease_until: null,
    next_run_at: now,
    updated_at: now,
  }).eq('id', job.id).eq('lease_token', job.lease_token);
  if (jobUpdate.error) throw jobUpdate.error;
  return { status: 'completed', jobId: job.id, stage: 'plan', chapterNumber: job.current_chapter };
}

async function loadProject(db: SupabaseClient, projectId: string): Promise<FactoryProjectRow> {
  const { data, error } = await db.from('ai_story_projects').select('*').eq('id', projectId).single();
  if (error) throw error;
  if (data.engine_release !== STORY_FACTORY_RELEASE) throw new StoryFactoryError('setup_blocked', 'Project release does not match the running engine.');
  return data as FactoryProjectRow;
}

async function runSetup(db: SupabaseClient, job: FactoryJobRow, project: FactoryProjectRow, provider?: StoryModelProvider): Promise<FactoryTickResult> {
  const runId = await createRun(db, job, 'setup');
  try {
    const setupInput = job.setup_input as { commission?: unknown; research?: unknown } | null;
    if (!setupInput?.commission || !setupInput.research) throw new StoryFactoryError('setup_blocked', 'Setup job is missing commission or research snapshot.');
    const routes = ModelRoutesSchema.parse(project.model_routes);
    const previousRuns = await db.from('story_factory_runs').select('output_artifact')
      .eq('job_id', job.id).eq('kind', 'setup').eq('engine_release', STORY_FACTORY_RELEASE)
      .order('started_at', { ascending: false }).limit(20);
    if (previousRuns.error) throw previousRuns.error;
    const resume = (previousRuns.data ?? []).map(row => row.output_artifact as { checkpoint?: SetupCheckpoint } | null)
      .find(artifact => artifact?.checkpoint)?.checkpoint;
    const { data: signatureRows, error: signaturesError } = await db.from('ai_story_projects').select('story_kernel').not('story_kernel', 'is', null).neq('id', project.id);
    if (signaturesError) throw signaturesError;
    const existingSignatures = (signatureRows ?? []).flatMap(row => {
      const parsed = StoryKernelSchema.safeParse(row.story_kernel);
      return parsed.success ? [{
        mechanismFingerprint: parsed.data.mechanismFingerprint,
        rewardLoopFingerprint: parsed.data.rewardLoopFingerprint,
        conflictEconomyFingerprint: parsed.data.conflictEconomyFingerprint,
      }] : [];
    });
    const result = await runConceptLab({
      commission: setupInput.commission,
      research: setupInput.research,
      routes,
      existingSignatures,
      provider,
      resume,
      onCheckpoint: async checkpoint => {
        const checkpointUsages = Object.values(checkpoint).flatMap(stage => stage?.usage ? [stage.usage] : []);
        const updated = await db.from('story_factory_runs').update({
          output_artifact: { checkpoint },
          usage: checkpointUsages,
          estimated_cost_usd: usageCost(checkpointUsages),
        }).eq('id', runId).eq('status', 'running');
        if (updated.error) throw updated.error;
      },
    });
    const pack = LaunchPackSchema.parse(result.launchPack);
    const protagonist = pack.kernel.characters.find(character => character.id === pack.kernel.protagonistId)!;
    const now = new Date().toISOString();
    const projectUpdate = await db.from('ai_story_projects').update({
      main_character: protagonist.name,
      genre: pack.kernel.genreLane,
      story_kernel: pack.kernel,
      arc_plan: pack.arc,
      story_state: pack.initialState,
      current_chapter: 0,
      updated_at: now,
    }).eq('id', project.id).eq('engine_release', STORY_FACTORY_RELEASE);
    if (projectUpdate.error) throw projectUpdate.error;
    const novelUpdate = await db.from('novels').update({
      title: pack.kernel.title,
      description: pack.kernel.description,
      genres: [pack.kernel.genreLane],
      cover_prompt: pack.coverPrompt,
      hidden: true,
      chapter_count: 0,
      total_chapters: 0,
      updated_at: now,
    }).eq('id', job.novel_id);
    if (novelUpdate.error) throw novelUpdate.error;
    const jobUpdate = await db.from('story_factory_jobs').update({
      status: 'ready', stage: 'cover', rolling_plan: pack.initialRollingPlan, setup_input: null,
      lease_owner: null, lease_token: null, lease_until: null, next_run_at: now, updated_at: now,
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (jobUpdate.error) throw jobUpdate.error;
    const runUpdate = await db.from('story_factory_runs').update({
      status: 'passed',
      model_routes: routes,
      input_artifact: { commission: setupInput.commission, research: setupInput.research, candidates: result.candidates },
      output_artifact: { launchPack: pack, selectedConcept: result.selectedConcept },
      usage: result.usages,
      estimated_cost_usd: usageCost(result.usages),
      finished_at: now,
    }).eq('id', runId);
    if (runUpdate.error) throw runUpdate.error;
    return { status: 'completed', jobId: job.id, stage: 'setup', chapterNumber: 0 };
  } catch (error) {
    return blockRun(db, job, runId, error);
  }
}

async function runCover(db: SupabaseClient, job: FactoryJobRow, project: FactoryProjectRow): Promise<FactoryTickResult> {
  const runId = await createRun(db, job, 'cover');
  try {
    const kernel = StoryKernelSchema.parse(project.story_kernel);
    const { data: novel, error: novelError } = await db.from('novels').select('cover_prompt').eq('id', job.novel_id).single();
    if (novelError) throw novelError;
    if (!novel.cover_prompt) throw new StoryFactoryError('setup_blocked', 'Launch pack has no cover background prompt.');
    const cover = await generateFactoryCover({ db, novelId: job.novel_id, title: kernel.title, backgroundPrompt: novel.cover_prompt });
    const now = new Date().toISOString();
    const novelUpdate = await db.from('novels').update({ cover_url: cover.coverUrl, updated_at: now }).eq('id', job.novel_id);
    if (novelUpdate.error) throw novelUpdate.error;
    const jobUpdate = await db.from('story_factory_jobs').update({
      status: 'ready', stage: 'write', lease_owner: null, lease_token: null, lease_until: null, next_run_at: now, updated_at: now,
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (jobUpdate.error) throw jobUpdate.error;
    const runUpdate = await db.from('story_factory_runs').update({ status: 'passed', output_artifact: cover, finished_at: now }).eq('id', runId);
    if (runUpdate.error) throw runUpdate.error;
    return { status: 'completed', jobId: job.id, stage: 'cover', chapterNumber: job.current_chapter };
  } catch (error) {
    return blockRun(db, job, runId, error);
  }
}

async function runPlan(db: SupabaseClient, job: FactoryJobRow, project: FactoryProjectRow, provider?: StoryModelProvider): Promise<FactoryTickResult> {
  const runId = await createRun(db, job, 'plan', job.current_chapter + 1);
  try {
    const kernel = StoryKernelSchema.parse(project.story_kernel);
    const arc = ArcPlanSchema.parse(project.arc_plan);
    const state = StoryStateSchema.parse(project.story_state);
    const routes = ModelRoutesSchema.parse(project.model_routes);
    const planned = await planRollingWindow({
      kernel,
      arc,
      state,
      routes,
      recoveryEvidence: job.plan_feedback ?? undefined,
      provider,
    });
    const now = new Date().toISOString();
    const jobUpdate = await db.from('story_factory_jobs').update({
      rolling_plan: planned.rollingPlan, plan_feedback: null, status: 'ready', stage: 'write', lease_owner: null,
      lease_token: null, lease_until: null, next_run_at: now, updated_at: now,
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (jobUpdate.error) throw jobUpdate.error;
    const runUpdate = await db.from('story_factory_runs').update({
      status: 'passed', model_routes: { planner: routes.planner }, output_artifact: planned.rollingPlan,
      usage: planned.usages, estimated_cost_usd: usageCost(planned.usages), finished_at: now,
    }).eq('id', runId);
    if (runUpdate.error) throw runUpdate.error;
    return { status: 'completed', jobId: job.id, stage: 'plan', chapterNumber: job.current_chapter };
  } catch (error) {
    return blockRun(db, job, runId, error);
  }
}

async function runChapter(db: SupabaseClient, job: FactoryJobRow, project: FactoryProjectRow, provider?: StoryModelProvider): Promise<FactoryTickResult> {
  const stateResult = StoryStateSchema.safeParse(project.story_state);
  if (!stateResult.success) {
    return blockRun(db, job, null, new StoryFactoryError('setup_blocked', 'Story state is invalid.', stateResult.error.issues));
  }
  const nextChapter = stateResult.data.chapterNumber + 1;
  if (!rollingPlanContainsChapter(job.rolling_plan, nextChapter)) return runPlan(db, job, project, provider);

  const kernelResult = StoryKernelSchema.safeParse(project.story_kernel);
  const arcResult = ArcPlanSchema.safeParse(project.arc_plan);
  const routesResult = ModelRoutesSchema.safeParse(project.model_routes);
  const rollingResult = RollingPlanSchema.safeParse(job.rolling_plan);
  if (!kernelResult.success || !arcResult.success || !routesResult.success) {
    const evidence = [kernelResult, arcResult, routesResult]
      .filter(result => !result.success)
      .flatMap(result => result.success ? [] : result.error.issues);
    return blockRun(db, job, null, new StoryFactoryError('setup_blocked', 'Story setup artifacts are invalid.', evidence));
  }
  if (!rollingResult.success) {
    return blockRun(db, job, null, new StoryFactoryError('plan_blocked', 'Rolling plan is invalid.', rollingResult.error.issues));
  }
  const kernel = kernelResult.data;
  const arc = arcResult.data;
  const state = stateResult.data;
  const routes = routesResult.data;
  const rolling = rollingResult.data;
  const plan = rolling.plans.find(item => item.chapterNumber === nextChapter)!;
  if (plan.arcNumber !== arc.arcNumber) return blockRun(db, job, null, new StoryFactoryError('plan_blocked', 'Rolling plan belongs to a different arc.'));
  const runId = await createRun(db, job, 'chapter', plan.chapterNumber);
  try {
    let previousChapter: string | undefined;
    if (plan.chapterNumber > 1) {
      const { data, error } = await db.from('chapters').select('content').eq('novel_id', job.novel_id).eq('chapter_number', plan.chapterNumber - 1).single();
      if (error || !data?.content) throw new StoryFactoryError('plan_blocked', 'Previous published chapter is missing.');
      previousChapter = data.content;
    }
    const result = await writeStoryChapter({ kernel, state, plan, previousChapter, routes, provider });
    const remainingPlan = { ...rolling, startChapter: plan.chapterNumber + 1, plans: rolling.plans.filter(item => item.chapterNumber > plan.chapterNumber) };
    const { error } = await db.rpc('commit_story_factory_chapter', {
      p_job_id: job.id,
      p_lease_token: job.lease_token,
      p_run_id: runId,
      p_expected_chapter: plan.chapterNumber,
      p_title: result.draft.title,
      p_content: result.draft.content,
      p_state_after: result.stateAfter,
      p_remaining_plan: remainingPlan,
      p_events: result.stateEvents,
      p_assessment: result.assessment,
      p_context_manifest: result.contextManifest,
      p_usage: result.usages,
      p_cost_usd: usageCost(result.usages),
      p_word_count: result.wordCount,
      p_revision_count: result.revisionCount,
      p_engine_release: STORY_FACTORY_RELEASE,
    });
    if (error) throw error;
    return { status: 'completed', jobId: job.id, stage: 'write', chapterNumber: plan.chapterNumber };
  } catch (error) {
    if (error instanceof StoryFactoryError && error.code === 'plan_blocked') {
      return recoverUncommittedPlan(db, job, runId, error);
    }
    return blockRun(db, job, runId, error);
  }
}

async function runWindowReview(db: SupabaseClient, job: FactoryJobRow, project: FactoryProjectRow, provider?: StoryModelProvider): Promise<FactoryTickResult> {
  const runId = await createRun(db, job, 'window_review', job.current_chapter);
  try {
    const kernel = StoryKernelSchema.parse(project.story_kernel);
    const arc = ArcPlanSchema.parse(project.arc_plan);
    const state = StoryStateSchema.parse(project.story_state);
    const routes = ModelRoutesSchema.parse(project.model_routes);
    const { data: chapters, error } = await db.from('chapters').select('chapter_number,title,content')
      .eq('novel_id', job.novel_id).gte('chapter_number', job.current_chapter - 4).lte('chapter_number', job.current_chapter)
      .order('chapter_number');
    if (error) throw error;
    const reviewed = await reviewFiveChapterWindow({
      kernel, arc, state,
      chapters: (chapters ?? []).map(chapter => ({ chapterNumber: chapter.chapter_number, title: chapter.title, content: chapter.content ?? '' })),
      routes, provider,
    });
    if (reviewed.review.status === 'block') throw new StoryFactoryError('quality_blocked', 'Five-chapter window review detected drift.', reviewed.review.issues);
    const now = new Date().toISOString();
    const nextRunAt = nextRunAfterNonChapterStage(job, new Date(now));
    const nextStage = state.chapterNumber >= arc.plannedEndChapter ? 'arc' : 'write';
    const runUpdate = await db.from('story_factory_runs').update({
      status: 'passed', output_artifact: reviewed.review, usage: [reviewed.usage],
      estimated_cost_usd: reviewed.usage.costUsd, finished_at: now,
    }).eq('id', runId);
    if (runUpdate.error) throw runUpdate.error;
    const jobUpdate = await db.from('story_factory_jobs').update({
      status: 'ready', stage: nextStage, lease_owner: null, lease_token: null, lease_until: null,
      next_run_at: nextRunAt, updated_at: now,
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (jobUpdate.error) throw jobUpdate.error;
    if (job.current_chapter === 10 && job.execution_mode === 'hidden_canary') {
      const promoted = await db.rpc('promote_story_factory_canary', { p_job_id: job.id, p_engine_release: STORY_FACTORY_RELEASE });
      if (promoted.error) throw promoted.error;
    }
    return { status: 'completed', jobId: job.id, stage: 'window_review', chapterNumber: job.current_chapter };
  } catch (error) {
    return blockRun(db, job, runId, error);
  }
}

async function runArc(db: SupabaseClient, job: FactoryJobRow, project: FactoryProjectRow, provider?: StoryModelProvider): Promise<FactoryTickResult> {
  const runId = await createRun(db, job, 'arc', job.current_chapter);
  try {
    const kernel = StoryKernelSchema.parse(project.story_kernel);
    const arc = ArcPlanSchema.parse(project.arc_plan);
    const state = StoryStateSchema.parse(project.story_state);
    const routes = ModelRoutesSchema.parse(project.model_routes);
    const result = await planArcLifecycle({
      kernel, arc, state, routes, provider,
      minimumCompletionChapter: job.minimum_chapters,
      maximumChapter: job.maximum_chapters,
    });
    const now = new Date().toISOString();
    if (result.lifecycle.status === 'complete') {
      const jobUpdate = await db.from('story_factory_jobs').update({
        status: 'completed', stage: 'done', completed_at: now, lease_owner: null, lease_token: null, lease_until: null, updated_at: now,
      }).eq('id', job.id).eq('lease_token', job.lease_token);
      if (jobUpdate.error) throw jobUpdate.error;
      await db.from('novels').update({ status: 'Hoàn thành', updated_at: now }).eq('id', job.novel_id);
    } else {
      const projectUpdate = await db.from('ai_story_projects').update({ arc_plan: result.lifecycle.nextArc, updated_at: now }).eq('id', project.id);
      if (projectUpdate.error) throw projectUpdate.error;
      const jobUpdate = await db.from('story_factory_jobs').update({
        status: result.lifecycle.status === 'finale' ? 'finale' : 'ready', stage: 'plan', rolling_plan: null,
        lease_owner: null, lease_token: null, lease_until: null, next_run_at: now, updated_at: now,
      }).eq('id', job.id).eq('lease_token', job.lease_token);
      if (jobUpdate.error) throw jobUpdate.error;
    }
    const runUpdate = await db.from('story_factory_runs').update({
      status: 'passed', output_artifact: result.lifecycle, usage: [result.usage],
      estimated_cost_usd: result.usage.costUsd, finished_at: now,
    }).eq('id', runId);
    if (runUpdate.error) throw runUpdate.error;
    return { status: 'completed', jobId: job.id, stage: 'arc', chapterNumber: job.current_chapter };
  } catch (error) {
    return blockRun(db, job, runId, error);
  }
}

export async function runStoryFactoryTick(options?: {
  db?: SupabaseClient;
  provider?: StoryModelProvider;
  workerId?: string;
}): Promise<FactoryTickResult> {
  if (!isStoryFactoryEnabled()) return { status: 'disabled' };
  const db = options?.db ?? getSupabaseAdmin();
  const workerId = options?.workerId ?? `factory-${crypto.randomUUID()}`;
  await db.rpc('reconcile_story_factory_jobs', { p_stale_minutes: 10 });
  const { data, error } = await db.rpc('claim_story_factory_job', { p_worker_id: workerId, p_engine_release: STORY_FACTORY_RELEASE });
  if (error) throw error;
  const job = (Array.isArray(data) ? data[0] : data) as FactoryJobRow | undefined;
  if (!job) return { status: 'idle' };
  let project: FactoryProjectRow;
  try {
    project = await loadProject(db, job.project_id);
  } catch (caught) {
    return blockRun(db, job, null, caught);
  }
  if (job.stage === 'setup') return runSetup(db, job, project, options?.provider);
  if (job.stage === 'cover') return runCover(db, job, project);
  if (job.stage === 'window_review') return runWindowReview(db, job, project, options?.provider);
  if (job.stage === 'arc') return runArc(db, job, project, options?.provider);
  if (job.stage === 'plan') return runPlan(db, job, project, options?.provider);
  return runChapter(db, job, project, options?.provider);
}
