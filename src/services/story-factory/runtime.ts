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
  type ChapterPlan,
  type ModelRoutes,
  type RollingPlan,
} from './contracts';
import { generateFactoryCover } from './cover';
import {
  loadContinuityPacket,
  memoryEntityIdsForArc,
  memoryEntityIdsForPlan,
} from './memory';
import {
  draftStoryChapter,
  reviseStoryChapter,
  type ChapterAttemptTelemetry,
  type ChapterPipelineResult,
  type PendingRevision,
} from './pipeline';
import { planArcLifecycle, planRollingWindow, reviewFiveChapterWindow } from './planner';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { digestArtifact } from './benchmark';
import {
  FACTORY_PLANNER_VERSION,
  FACTORY_SETUP_VERSION,
  STORY_FACTORY_RELEASE,
  STORY_FACTORY_REVISION,
} from './release';
import { MarketBlueprintSchema, runConceptLab } from './setup';
import type { SetupCheckpoint } from './setup';

interface FactoryJobRow {
  id: string;
  project_id: string;
  novel_id: string;
  execution_mode: 'hidden_canary' | 'production';
  status: string;
  stage: 'setup' | 'plan' | 'write' | 'revise' | 'window_review' | 'arc' | 'cover' | 'done';
  current_chapter: number;
  rolling_plan: unknown;
  plan_feedback: unknown;
  replan_attempts: number;
  retry_count: number;
  last_run_id: string | null;
  setup_input: unknown;
  minimum_chapters: number;
  maximum_chapters: number;
  daily_target: number;
  chapters_today: number;
  quota_date: string | null;
  lease_token: string;
  benchmark_run_id: string | null;
  launch_pack_digest: string | null;
}

interface FactoryProjectRow {
  id: string;
  novel_id: string;
  story_kernel: unknown;
  arc_plan: unknown;
  story_state: unknown;
  market_blueprint: unknown | null;
  engine_release: string;
  model_routes: unknown;
  // Free-text author steering for the running novel (nullable). Read by the
  // Planner and the Writer brief from the next chapter on; never canon.
  author_directive: string | null;
}

export interface FactoryTickResult {
  status: 'disabled' | 'idle' | 'completed' | 'blocked';
  jobId?: string;
  stage?: string;
  chapterNumber?: number;
  error?: string;
}

/** Consecutive transient failures a job absorbs before it parks for an operator. */
export const INFRA_RETRY_LIMIT = 5;

/**
 * 5, 10, 20, 40, 80 minutes. The 5-minute floor is deliberately above TICK_BUDGET_MS:
 * with a 1-minute floor, a failing job re-entered the queue inside the same batched
 * invocation and burned two or three of its five retries in one cron slot. Mirrors
 * the SQL backoff in reconcile_story_factory_jobs — change both together.
 */
export function infraBackoffMs(retryCount: number): number {
  return 5 * 2 ** Math.min(retryCount, INFRA_RETRY_LIMIT) * 60_000;
}

/**
 * How long one invocation keeps claiming work. Below the route's 300s ceiling by
 * enough that a stage started just under the deadline still finishes and commits.
 */
export const TICK_BUDGET_MS = 200_000;

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

function pipelineTelemetryFromError(error: StoryFactoryError): ChapterAttemptTelemetry | undefined {
  const evidence = error.evidence as { pipelineTelemetry?: ChapterAttemptTelemetry } | undefined;
  return evidence?.pipelineTelemetry;
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
    engine_revision: STORY_FACTORY_REVISION,
  }).select('id').single();
  if (error) throw error;
  const { error: jobError } = await db.from('story_factory_jobs').update({ last_run_id: data.id }).eq('id', job.id).eq('lease_token', job.lease_token);
  if (jobError) throw jobError;
  return data.id as string;
}

async function blockRun(db: SupabaseClient, job: FactoryJobRow, runId: string | null, error: unknown, options?: { retryOnce?: boolean }): Promise<FactoryTickResult> {
  const factoryError = error instanceof StoryFactoryError
    ? error
    : new StoryFactoryError('infra_blocked', error instanceof Error ? error.message : String(error));
  if (runId) {
    const evidence = factoryError.evidence as {
      usages?: unknown;
      pipelineTelemetry?: ChapterAttemptTelemetry;
    } | undefined;
    const pipelineTelemetry = pipelineTelemetryFromError(factoryError);
    const failedUsages = pipelineTelemetry?.usages
      ?? (Array.isArray(evidence?.usages) ? evidence.usages as ProviderUsage[] : []);
    const existing = await db.from('story_factory_runs').select('output_artifact').eq('id', runId).single();
    const output = existing.data?.output_artifact && typeof existing.data.output_artifact === 'object'
      ? existing.data.output_artifact as Record<string, unknown>
      : {};
    const runUpdate = await db.from('story_factory_runs').update({
      status: factoryError.code === 'infra_blocked' ? 'infra_blocked' : 'blocked',
      error_code: factoryError.code,
      error_message: factoryError.message,
      output_artifact: {
        ...output,
        evidence: factoryError.evidence ?? null,
        attemptTelemetry: pipelineTelemetry ?? null,
      },
      editor_assessment: pipelineTelemetry?.finalAssessment ?? pipelineTelemetry?.initialAssessment ?? null,
      usage: failedUsages,
      estimated_cost_usd: usageCost(failedUsages),
      revision_count: pipelineTelemetry?.revisionCount ?? 0,
      draft_attempts: pipelineTelemetry?.draftAttempts ?? 0,
      first_pass: pipelineTelemetry?.firstPass ?? null,
      published_after_rewrite: factoryError.code === 'quality_blocked' && pipelineTelemetry?.revisionCount === 1
        ? false
        : null,
      finished_at: new Date().toISOString(),
    }).eq('id', runId).eq('status', 'running');
    // blockRun is the terminal handler — it must not throw — but a swallowed failure
    // here leaves a run row lying about its outcome, so at least say it happened.
    if (runUpdate.error) console.warn('[story-factory] blockRun run update failed:', runUpdate.error.message);
  }
  // Infrastructure failures are transient by definition — a provider hiccup, a socket
  // reset, an expired lease. Parking the job on the first one made the fleet drain to
  // zero with nothing running. Semantic blocks (setup/plan/quality) are verdicts about
  // the story itself and park for an operator — except when the caller knows the next
  // attempt materially differs (retryOnce: a first plan verdict whose evidence just
  // became plan_feedback), which earns exactly one automatic retry before parking.
  const retryable = (factoryError.code === 'infra_blocked' && job.retry_count < INFRA_RETRY_LIMIT)
    || options?.retryOnce === true;
  const now = new Date();
  const jobUpdate = await db.from('story_factory_jobs').update({
    status: retryable ? 'ready' : factoryError.code,
    retry_count: job.retry_count + 1,
    last_error: factoryError.message,
    lease_owner: null,
    lease_token: null,
    lease_until: null,
    updated_at: now.toISOString(),
    ...(retryable
      ? { next_run_at: new Date(now.getTime() + infraBackoffMs(job.retry_count)).toISOString() }
      : {}),
  }).eq('id', job.id).eq('lease_token', job.lease_token);
  if (jobUpdate.error) console.warn('[story-factory] blockRun job update failed:', jobUpdate.error.message);
  return {
    status: retryable ? 'completed' : 'blocked',
    jobId: job.id,
    stage: job.stage,
    chapterNumber: job.current_chapter,
    error: factoryError.message,
  };
}

async function recoverUncommittedPlan(
  db: SupabaseClient,
  job: FactoryJobRow,
  runId: string,
  error: StoryFactoryError,
): Promise<FactoryTickResult> {
  if (job.replan_attempts >= 1) {
    // The second plan-scope verdict parks — but its evidence must survive, and the
    // rejected window must not: a plain revive would otherwise re-write from the
    // SAME uncommitted plan and reproduce the verdict (one novel looped exactly so
    // on a repeated sales-cycle window). Feed forward, drop the window, and point
    // the revive straight at an informed replan.
    const fed = await db.from('story_factory_jobs').update({
      stage: 'plan',
      rolling_plan: null,
      plan_feedback: { source: 'editor_plan_scope', message: error.message, evidence: error.evidence ?? null },
      updated_at: new Date().toISOString(),
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (fed.error) console.warn('[story-factory] plan-scope feedback write failed:', fed.error.message);
    return blockRun(db, job, runId, error);
  }
  const now = new Date().toISOString();
  const pipelineTelemetry = pipelineTelemetryFromError(error);
  const runUpdate = await db.from('story_factory_runs').update({
    status: 'blocked',
    error_code: error.code,
    error_message: error.message,
    output_artifact: {
      evidence: error.evidence ?? null,
      attemptTelemetry: pipelineTelemetry ?? null,
      recovery: 'discard_uncommitted_window',
    },
    editor_assessment: pipelineTelemetry?.finalAssessment ?? pipelineTelemetry?.initialAssessment ?? null,
    usage: pipelineTelemetry?.usages ?? [],
    estimated_cost_usd: usageCost(pipelineTelemetry?.usages ?? []),
    revision_count: pipelineTelemetry?.revisionCount ?? 0,
    draft_attempts: pipelineTelemetry?.draftAttempts ?? 0,
    first_pass: pipelineTelemetry?.firstPass ?? null,
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
    const launchPackDigest = digestArtifact(pack);
    const protagonist = pack.kernel.characters.find(character => character.id === pack.kernel.protagonistId)!;
    const now = new Date().toISOString();
    const projectUpdate = await db.from('ai_story_projects').update({
      main_character: protagonist.name,
      genre: pack.kernel.genreLane,
      story_kernel: pack.kernel,
      arc_plan: pack.arc,
      story_state: pack.initialState,
      market_blueprint: result.selectedConcept.marketBlueprint,
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
      status: 'ready', stage: 'cover', rolling_plan: null, setup_input: null, retry_count: 0,
      launch_pack_digest: launchPackDigest,
      lease_owner: null, lease_token: null, lease_until: null, next_run_at: now, updated_at: now,
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (jobUpdate.error) throw jobUpdate.error;
    const runUpdate = await db.from('story_factory_runs').update({
      status: 'passed',
      model_routes: routes,
      input_artifact: {
        setupRevision: FACTORY_SETUP_VERSION,
        commission: setupInput.commission,
        research: setupInput.research,
        candidates: result.candidates,
      },
      output_artifact: {
        setupRevision: FACTORY_SETUP_VERSION,
        launchPack: pack,
        launchPackDigest,
        selectedConcept: result.selectedConcept,
      },
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
      status: 'ready', stage: 'plan', retry_count: 0, lease_owner: null, lease_token: null, lease_until: null, next_run_at: now, updated_at: now,
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (jobUpdate.error) throw jobUpdate.error;
    const runUpdate = await db.from('story_factory_runs').update({ status: 'passed', output_artifact: cover, finished_at: now }).eq('id', runId);
    if (runUpdate.error) throw runUpdate.error;
    return { status: 'completed', jobId: job.id, stage: 'cover', chapterNumber: job.current_chapter };
  } catch (error) {
    return blockRun(db, job, runId, error);
  }
}

/**
 * The newest prior plan run for the same chapter that carries a checkpoint — a run
 * killed by the 300s ceiling stays 'running' (later swept to infra_blocked) with its
 * checkpoint intact in output_artifact. Best-effort: any failure just means a cold
 * start, which is what happened on every plan run before checkpoints existed.
 */
async function loadPlanCheckpoint(db: SupabaseClient, job: FactoryJobRow, currentRunId: string): Promise<unknown> {
  const prior = await db.from('story_factory_runs')
    .select('output_artifact')
    .eq('job_id', job.id)
    .eq('kind', 'plan')
    .eq('chapter_number', job.current_chapter + 1)
    .neq('id', currentRunId)
    .not('output_artifact->planCheckpoint', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prior.error) {
    console.warn('[story-factory] plan checkpoint lookup failed (cold start):', prior.error.message);
    return undefined;
  }
  return (prior.data?.output_artifact as { planCheckpoint?: unknown } | null | undefined)?.planCheckpoint;
}

async function runPlan(db: SupabaseClient, job: FactoryJobRow, project: FactoryProjectRow, provider?: StoryModelProvider): Promise<FactoryTickResult> {
  const runId = await createRun(db, job, 'plan', job.current_chapter + 1);
  try {
    const versioned = await db.from('story_factory_runs').update({
      input_artifact: { plannerRevision: FACTORY_PLANNER_VERSION },
    }).eq('id', runId).eq('status', 'running');
    if (versioned.error) throw versioned.error;
    const resume = await loadPlanCheckpoint(db, job, runId);
    const kernel = StoryKernelSchema.parse(project.story_kernel);
    const arc = ArcPlanSchema.parse(project.arc_plan);
    const state = StoryStateSchema.parse(project.story_state);
    const routes = ModelRoutesSchema.parse(project.model_routes);
    const marketBlueprint = project.market_blueprint == null
      ? null
      : MarketBlueprintSchema.parse(project.market_blueprint);
    const continuityPacket = await loadContinuityPacket({
      db,
      projectId: project.id,
      state,
      entityIds: memoryEntityIdsForArc(kernel, arc, state),
    });
    const planned = await planRollingWindow({
      kernel,
      arc,
      state,
      routes,
      continuityPacket,
      recoveryEvidence: job.plan_feedback ?? undefined,
      // Recovery plans one chapter at a time: multi-pool worlds fail on the
      // arithmetic of threading balances across a three-chapter window (a
      // lãnh-chúa canary mis-chained stamina/corpse/fertility twice in a row).
      // One chapter cuts the chained bookkeeping to a third; the next window is
      // planned fresh from committed state.
      //
      // The same degradation applies when the stage keeps dying on the wall
      // clock: two or more burned retries mean the full window did not fit the
      // 300s route ceiling (Đại Địa planned ch 40-42 for 4 hours of stale
      // leases on 2026-08-13), so the code shrinks the ask instead of letting
      // the fifth retry park the job. A one-chapter window is always legal and
      // the next window plans fresh from committed state.
      requiredWindowSize: job.plan_feedback || job.retry_count >= 2 ? 1 : undefined,
      authorDirective: project.author_directive,
      marketBlueprint,
      provider,
      resume,
      onCheckpoint: async checkpoint => {
        const saved = await db.from('story_factory_runs').update({
          output_artifact: { planCheckpoint: checkpoint },
        }).eq('id', runId).eq('status', 'running');
        if (saved.error) throw saved.error;
      },
    });
    const now = new Date().toISOString();
    const jobUpdate = await db.from('story_factory_jobs').update({
      rolling_plan: planned.rollingPlan, plan_feedback: null, status: 'ready', stage: 'write', retry_count: 0, lease_owner: null,
      lease_token: null, lease_until: null, next_run_at: now, updated_at: now,
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (jobUpdate.error) throw jobUpdate.error;
    const runUpdate = await db.from('story_factory_runs').update({
      status: 'passed', model_routes: { planner: routes.planner, planJudge: routes.planJudge },
      input_artifact: { plannerRevision: FACTORY_PLANNER_VERSION },
      output_artifact: {
        ...planned.rollingPlan,
        attemptLineage: planned.attempts,
        advisories: planned.advisories,
      },
      editor_assessment: planned.assessment,
      usage: planned.usages, estimated_cost_usd: usageCost(planned.usages), finished_at: now,
    }).eq('id', runId);
    if (runUpdate.error) throw runUpdate.error;
    return { status: 'completed', jobId: job.id, stage: 'plan', chapterNumber: job.current_chapter };
  } catch (error) {
    // A semantic plan verdict must become plan_feedback before the job parks:
    // the next attempt then plans against the failure evidence, and the changed
    // recovery digest invalidates the dead chain's checkpoint — a blind revive
    // would otherwise resume the stored chain and reproduce the same verdict
    // forever. Best-effort: a failed write still parks the job normally.
    if (error instanceof StoryFactoryError && error.code === 'plan_blocked') {
      // Did THIS attempt already plan against a previous verdict's feedback?
      // job.plan_feedback is the claim-time snapshot, so it answers exactly that.
      const alreadyFed = (job.plan_feedback as { source?: string } | null)?.source === 'plan_blocked';
      const evidence = (error.evidence ?? {}) as Record<string, unknown>;
      const fed = await db.from('story_factory_jobs').update({
        plan_feedback: {
          source: 'plan_blocked',
          message: error.message,
          validation: evidence.validation ?? null,
          judgeIssues: evidence.judgeIssues ?? null,
        },
        updated_at: new Date().toISOString(),
      }).eq('id', job.id).eq('lease_token', job.lease_token);
      if (fed.error) console.warn('[story-factory] plan_blocked feedback write failed:', fed.error.message);
      // First verdict of a chain retries once automatically with the feedback in
      // hand; a second consecutive verdict parks for an operator.
      return blockRun(db, job, runId, error, { retryOnce: !fed.error && !alreadyFed });
    }
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
  const nextPlan = rolling.plans.find(item => item.chapterNumber === nextChapter + 1);
  if (plan.arcNumber !== arc.arcNumber) return blockRun(db, job, null, new StoryFactoryError('plan_blocked', 'Rolling plan belongs to a different arc.'));
  const runId = await createRun(db, job, 'chapter', plan.chapterNumber);
  try {
    const entityIds = memoryEntityIdsForPlan(kernel, plan);
    const continuityPacket = await loadContinuityPacket({
      db,
      projectId: project.id,
      state,
      entityIds,
    });
    let previousChapter: string | undefined;
    if (plan.chapterNumber > 1) {
      const { data, error } = await db.from('chapters').select('content').eq('novel_id', job.novel_id).eq('chapter_number', plan.chapterNumber - 1).single();
      if (error || !data?.content) throw new StoryFactoryError('plan_blocked', 'Previous published chapter is missing.');
      previousChapter = data.content;
    }
    const drafted = await draftStoryChapter({
      kernel,
      state,
      plan,
      nextPlan,
      previousChapter,
      continuityPacket,
      authorDirective: project.author_directive,
      routes,
      provider,
    });
    if (drafted.decision === 'revise') {
      // Hand the rewrite to its own tick. The run row stays 'running' so it remains the
      // single record of this chapter attempt and the commit guard still applies.
      return handOffRevision(db, job, runId, drafted.pending, plan.chapterNumber);
    }
    return commitChapter(db, job, runId, rolling, plan, drafted.result, 'write');
  } catch (error) {
    if (error instanceof StoryFactoryError && error.code === 'plan_blocked') {
      return recoverUncommittedPlan(db, job, runId, error);
    }
    return blockRun(db, job, runId, error);
  }
}

async function commitChapter(
  db: SupabaseClient,
  job: FactoryJobRow,
  runId: string,
  rolling: RollingPlan,
  plan: ChapterPlan,
  result: ChapterPipelineResult,
  stage: 'write' | 'revise',
): Promise<FactoryTickResult> {
  const remainingPlan = {
    ...rolling,
    startChapter: plan.chapterNumber + 1,
    plans: rolling.plans.filter(item => item.chapterNumber > plan.chapterNumber),
  };
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
    p_attempt_telemetry: result.attemptTelemetry,
    p_engine_release: STORY_FACTORY_RELEASE,
  });
  if (error) throw error;
  return { status: 'completed', jobId: job.id, stage, chapterNumber: plan.chapterNumber };
}

async function handOffRevision(
  db: SupabaseClient,
  job: FactoryJobRow,
  runId: string,
  pending: PendingRevision,
  chapterNumber: number,
): Promise<FactoryTickResult> {
  const now = new Date().toISOString();
  const runUpdate = await db.from('story_factory_runs').update({
    output_artifact: { pendingRevision: pending },
    editor_assessment: pending.assessment,
    usage: pending.usages,
    estimated_cost_usd: usageCost(pending.usages),
    revision_count: 0,
    draft_attempts: 1,
    first_pass: false,
  }).eq('id', runId).eq('status', 'running');
  if (runUpdate.error) throw runUpdate.error;
  const jobUpdate = await db.from('story_factory_jobs').update({
    status: 'ready', stage: 'revise', retry_count: 0,
    lease_owner: null, lease_token: null, lease_until: null,
    next_run_at: now, updated_at: now,
  }).eq('id', job.id).eq('lease_token', job.lease_token);
  if (jobUpdate.error) throw jobUpdate.error;
  return { status: 'completed', jobId: job.id, stage: 'revise', chapterNumber };
}

export function readPendingRevision(artifact: unknown): PendingRevision | null {
  if (!artifact || typeof artifact !== 'object') return null;
  const pending = (artifact as { pendingRevision?: unknown }).pendingRevision;
  if (!pending || typeof pending !== 'object') return null;
  const candidate = pending as Partial<PendingRevision>;
  const draft = candidate.draft as { title?: unknown; content?: unknown } | undefined;
  if (typeof draft?.title !== 'string' || typeof draft.content !== 'string') return null;
  // Only a 'revise' assessment can drive a rewrite: buildRevisionContext throws on
  // anything else, which would cost a claim plus two provider calls before failing.
  // Rejecting here instead routes to restartDraft, which is free.
  const assessment = candidate.assessment as { status?: unknown; continuityIssues?: unknown; readingIssues?: unknown } | undefined;
  if (assessment?.status !== 'revise') return null;
  if (!Array.isArray(assessment.continuityIssues) || !Array.isArray(assessment.readingIssues)) return null;
  return {
    draft: candidate.draft as PendingRevision['draft'],
    assessment: candidate.assessment as PendingRevision['assessment'],
    usages: Array.isArray(candidate.usages) ? candidate.usages as ProviderUsage[] : [],
    telemetry: (candidate.telemetry ?? {
      initialDraft: null, initialAssessment: null, revisionDraft: null, finalAssessment: null,
      usages: [], revisionCount: 0, draftAttempts: 1, firstPass: false,
    }) as ChapterAttemptTelemetry,
  };
}

async function runRevision(db: SupabaseClient, job: FactoryJobRow, project: FactoryProjectRow, provider?: StoryModelProvider): Promise<FactoryTickResult> {
  const restartDraft = async (reason: string): Promise<FactoryTickResult> => {
    // A lost or unreadable pending draft is recoverable: redraft the chapter from the
    // committed state. Nothing was persisted, so this is a clean retry rather than a block.
    const now = new Date().toISOString();
    if (job.last_run_id) {
      // Close the abandoned run first. Leaving it 'running' orphans it forever: the
      // next createRun repoints last_run_id, and both sweepers key on job state this
      // run will never see again — the row would sit "in flight" in telemetry for good.
      const closed = await db.from('story_factory_runs').update({
        status: 'failed',
        error_code: 'revision_restarted',
        error_message: reason,
        finished_at: now,
      }).eq('id', job.last_run_id).eq('job_id', job.id).eq('status', 'running');
      if (closed.error) console.warn('[story-factory] could not close abandoned revision run:', closed.error.message);
    }
    const update = await db.from('story_factory_jobs').update({
      status: 'ready', stage: 'write', last_error: reason,
      lease_owner: null, lease_token: null, lease_until: null, next_run_at: now, updated_at: now,
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (update.error) throw update.error;
    return { status: 'completed', jobId: job.id, stage: 'write', chapterNumber: job.current_chapter };
  };

  if (!job.last_run_id) return restartDraft('Revision stage has no run to resume.');
  const runRow = await db.from('story_factory_runs').select('id,output_artifact,status')
    .eq('id', job.last_run_id).eq('job_id', job.id).maybeSingle();
  if (runRow.error) throw runRow.error;
  if (!runRow.data || runRow.data.status !== 'running') return restartDraft('Revision run is no longer open.');
  const pending = readPendingRevision(runRow.data.output_artifact);
  if (!pending) return restartDraft('Revision run has no readable pending draft.');

  const stateResult = StoryStateSchema.safeParse(project.story_state);
  const kernelResult = StoryKernelSchema.safeParse(project.story_kernel);
  const arcResult = ArcPlanSchema.safeParse(project.arc_plan);
  const routesResult = ModelRoutesSchema.safeParse(project.model_routes);
  const rollingResult = RollingPlanSchema.safeParse(job.rolling_plan);
  if (!stateResult.success || !kernelResult.success || !arcResult.success || !routesResult.success) {
    return blockRun(db, job, runRow.data.id, new StoryFactoryError('setup_blocked', 'Story setup artifacts are invalid.'));
  }
  if (!rollingResult.success) {
    return blockRun(db, job, runRow.data.id, new StoryFactoryError('plan_blocked', 'Rolling plan is invalid.', rollingResult.error.issues));
  }
  const nextChapter = stateResult.data.chapterNumber + 1;
  const plan = rollingResult.data.plans.find(item => item.chapterNumber === nextChapter);
  if (!plan) return restartDraft('Rolling plan no longer covers the pending chapter.');
  const nextPlan = rollingResult.data.plans.find(item => item.chapterNumber === nextChapter + 1);

  try {
    const continuityPacket = await loadContinuityPacket({
      db,
      projectId: project.id,
      state: stateResult.data,
      entityIds: memoryEntityIdsForPlan(kernelResult.data, plan),
    });
    let previousChapter: string | undefined;
    if (plan.chapterNumber > 1) {
      const { data, error } = await db.from('chapters').select('content').eq('novel_id', job.novel_id).eq('chapter_number', plan.chapterNumber - 1).single();
      if (error || !data?.content) throw new StoryFactoryError('plan_blocked', 'Previous published chapter is missing.');
      previousChapter = data.content;
    }
    const result = await reviseStoryChapter({
      kernel: kernelResult.data,
      state: stateResult.data,
      plan,
      nextPlan,
      previousChapter,
      continuityPacket,
      authorDirective: project.author_directive,
      routes: routesResult.data,
      provider,
      pending,
    });
    return commitChapter(db, job, runRow.data.id, rollingResult.data, plan, result, 'revise');
  } catch (error) {
    if (error instanceof StoryFactoryError && error.code === 'plan_blocked') {
      return recoverUncommittedPlan(db, job, runRow.data.id, error);
    }
    // A transient failure during the rewrite must not discard the paid first draft
    // and the Editor findings that motivated it: blockRun would close the run, and
    // the next tick's restartDraft would redraft blind — likely reproducing the same
    // defect at the cost of two more provider calls. Keep the run (and its pending
    // payload) open and retry the rewrite itself, with backoff.
    const infra = error instanceof StoryFactoryError && error.code === 'infra_blocked'
      ? error
      : !(error instanceof StoryFactoryError)
        ? new StoryFactoryError('infra_blocked', error instanceof Error ? error.message : String(error))
        : null;
    if (infra && job.retry_count < INFRA_RETRY_LIMIT) {
      const now = new Date();
      const held = await db.from('story_factory_jobs').update({
        status: 'ready',
        stage: 'revise',
        retry_count: job.retry_count + 1,
        last_error: infra.message,
        lease_owner: null, lease_token: null, lease_until: null,
        next_run_at: new Date(now.getTime() + infraBackoffMs(job.retry_count)).toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', job.id).eq('lease_token', job.lease_token);
      if (held.error) console.warn('[story-factory] could not hold revision for retry:', held.error.message);
      return { status: 'completed', jobId: job.id, stage: 'revise', chapterNumber: job.current_chapter, error: infra.message };
    }
    // A draft that fails its one rewrite parks — but a FRESH draft usually passes
    // (every manual revive of this state has), so the first such park per chapter
    // earns one automatic restart. The run history is the counter: a second
    // quality park on the same chapter parks for the operator. Uses retry backoff,
    // and the next tick's restartDraft redrafts from committed state.
    if (error instanceof StoryFactoryError && error.code === 'quality_blocked') {
      const chapterNumber = job.current_chapter + 1;
      const prior = await db.from('story_factory_runs')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', job.id).eq('kind', 'chapter').eq('chapter_number', chapterNumber)
        .eq('error_code', 'quality_blocked').neq('id', runRow.data.id);
      const retryOnce = !prior.error && (prior.count ?? 0) === 0;
      return blockRun(db, job, runRow.data.id, error, { retryOnce });
    }
    return blockRun(db, job, runRow.data.id, error);
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
    // The reviewer cross-checks balances quoted in prose. currentState only holds
    // the balance AFTER the last chapter, so without the in-window transition
    // history every historical "tổng cộng/còn lại" sentence reads as a mismatch —
    // one canary lost a review round to exactly that false positive.
    const events = await db.from('story_state_events')
      .select('chapter_number,entity_id,before_value,after_value,source')
      .eq('project_id', project.id).eq('kind', 'resource_numeric')
      .lte('chapter_number', job.current_chapter)
      .order('chapter_number').order('id');
    if (events.error) throw events.error;
    const reviewed = await reviewFiveChapterWindow({
      kernel, arc, state,
      chapters: (chapters ?? []).map(chapter => ({ chapterNumber: chapter.chapter_number, title: chapter.title, content: chapter.content ?? '' })),
      resourceTransitions: (events.data ?? []).map(event => ({
        chapterNumber: event.chapter_number,
        entityId: event.entity_id,
        before: event.before_value,
        after: event.after_value,
        source: event.source,
      })),
      routes, provider,
    });
    if (reviewed.review.status === 'block') {
      // Hidden chapters are still drafts: park so the operator can repair the
      // prose and re-review. Published chapters are canon a reader may have seen
      // — they cannot be repaired, so parking would stall the novel forever on a
      // verdict about unchangeable text. Instead the verdict becomes steering:
      // the issues land in plan_feedback, the stale rolling plan is dropped, and
      // the next window is planned against them. The run row still records the
      // honest blocked verdict for telemetry.
      if (job.execution_mode === 'production') {
        const now = new Date().toISOString();
        const runUpdate = await db.from('story_factory_runs').update({
          status: 'blocked', error_code: 'quality_blocked',
          error_message: 'Window review blocked on published canon; verdict fed forward to the next window plan.',
          output_artifact: { evidence: { review: reviewed.review } },
          usage: [reviewed.usage], estimated_cost_usd: reviewed.usage.costUsd, finished_at: now,
        }).eq('id', runId);
        if (runUpdate.error) throw runUpdate.error;
        const jobUpdate = await db.from('story_factory_jobs').update({
          // Steering must still respect the arc boundary: at plannedEndChapter the
          // next stage is the arc transition, not a plan for a chapter the current
          // arc cannot contain (two seniors dead-ended planning ch26 of a 25-chapter
          // arc). The feedback survives either way and steers the next window.
          status: 'ready', stage: state.chapterNumber >= arc.plannedEndChapter ? 'arc' : 'plan', retry_count: 0,
          rolling_plan: null,
          plan_feedback: {
            source: 'window_review_public',
            message: 'Cửa sổ vừa xuất bản bị reviewer chê; không thể sửa chương đã đăng — cửa sổ kế tiếp phải đổi hướng theo các issue này.',
            issues: reviewed.review.issues,
          },
          lease_owner: null, lease_token: null, lease_until: null,
          next_run_at: nextRunAfterNonChapterStage(job, new Date(now)), updated_at: now,
        }).eq('id', job.id).eq('lease_token', job.lease_token);
        if (jobUpdate.error) throw jobUpdate.error;
        return { status: 'completed', jobId: job.id, stage: 'window_review', chapterNumber: job.current_chapter };
      }
      throw new StoryFactoryError('quality_blocked', 'Five-chapter window review detected drift.', {
        review: reviewed.review,
        usages: [reviewed.usage],
      });
    }
    const now = new Date().toISOString();
    const nextRunAt = nextRunAfterNonChapterStage(job, new Date(now));
    const nextStage = state.chapterNumber >= arc.plannedEndChapter ? 'arc' : 'write';
    const runUpdate = await db.from('story_factory_runs').update({
      status: 'passed', output_artifact: reviewed.review, usage: [reviewed.usage],
      estimated_cost_usd: reviewed.usage.costUsd, finished_at: now,
    }).eq('id', runId);
    if (runUpdate.error) throw runUpdate.error;
    const jobUpdate = await db.from('story_factory_jobs').update({
      status: 'ready', stage: nextStage, retry_count: 0, lease_owner: null, lease_token: null, lease_until: null,
      next_run_at: nextRunAt, updated_at: now,
    }).eq('id', job.id).eq('lease_token', job.lease_token);
    if (jobUpdate.error) throw jobUpdate.error;
    // >= 10, not === 10: a promotion that fails once (missing cover, digest mismatch)
    // must get another chance at the next window review — with strict equality the
    // novel kept writing chapters forever with hidden = true and no reader. Promotion
    // failure is also non-fatal by design: the review itself passed and the job should
    // keep writing; blockRun here would be wrong twice over (the review run is already
    // 'passed', so its error write would no-op, and an infra retry would re-run a
    // review that already succeeded).
    if (job.current_chapter >= 10 && job.execution_mode === 'hidden_canary') {
      const promoted = await db.rpc('promote_story_factory_canary', { p_job_id: job.id, p_engine_release: STORY_FACTORY_RELEASE });
      if (promoted.error) {
        console.warn('[story-factory] canary promotion deferred:', promoted.error.message);
        const noted = await db.from('story_factory_jobs')
          .update({ last_error: `promotion deferred: ${promoted.error.message}`, updated_at: new Date().toISOString() })
          .eq('id', job.id);
        if (noted.error) console.warn('[story-factory] could not record promotion failure:', noted.error.message);
      }
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
    const marketBlueprint = project.market_blueprint == null
      ? null
      : MarketBlueprintSchema.parse(project.market_blueprint);
    const result = await planArcLifecycle({
      kernel, arc, state, routes, provider, marketBlueprint,
      minimumCompletionChapter: Math.max(
        job.minimum_chapters,
        kernel.seriesSpine.targetEndingRange.minimumChapter,
      ),
      maximumChapter: Math.min(
        job.maximum_chapters,
        kernel.seriesSpine.targetEndingRange.maximumChapter,
      ),
    });
    const committed = await db.rpc('commit_story_factory_arc_transition', {
      p_job_id: job.id,
      p_lease_token: job.lease_token,
      p_run_id: runId,
      p_lifecycle_status: result.lifecycle.status,
      p_kernel_after: result.kernelAfter,
      p_state_after: result.stateAfter,
      p_next_arc: result.lifecycle.nextArc,
      p_output_artifact: result.lifecycle,
      p_usage: [result.usage],
      p_cost_usd: result.usage.costUsd,
      p_engine_release: STORY_FACTORY_RELEASE,
    });
    if (committed.error) throw committed.error;
    return { status: 'completed', jobId: job.id, stage: 'arc', chapterNumber: job.current_chapter };
  } catch (error) {
    return blockRun(db, job, runId, error);
  }
}

/**
 * Execute as many queued stages as fit in the invocation budget.
 *
 * One stage per invocation capped the entire fleet at the cron frequency: on a five
 * minute schedule that is 288 stage executions per day shared across every novel, and
 * a chapter costs one to two of them. Claiming is FOR UPDATE ... SKIP LOCKED, so draining
 * inside one invocation is safe for concurrent workers. Each job is isolated so one
 * blocked novel cannot end the batch for the others.
 */
export async function runStoryFactoryTicks(options?: {
  db?: SupabaseClient;
  provider?: StoryModelProvider;
  workerId?: string;
  budgetMs?: number;
  now?: () => number;
}): Promise<{ status: 'disabled' | 'idle' | 'completed'; results: FactoryTickResult[] }> {
  if (!isStoryFactoryEnabled()) return { status: 'disabled', results: [] };
  const clock = options?.now ?? (() => Date.now());
  const budget = options?.budgetMs ?? TICK_BUDGET_MS;
  const start = clock();
  const results: FactoryTickResult[] = [];
  let slowestStageMs = 0;
  let consecutiveThrows = 0;
  for (;;) {
    const stageStart = clock();
    if (!shouldStartAnotherStage({
      completed: results.length,
      elapsedMs: stageStart - start,
      slowestStageMs,
      budgetMs: budget,
    })) break;
    // The isolation boundary. Several failure points sit outside any stage's own
    // try (createRun, the claim RPC, run-row lookups): without this catch, one
    // job's transient DB error aborts the whole invocation and erases the report
    // of chapters other jobs already committed in this batch.
    let result: FactoryTickResult;
    try {
      result = await runStoryFactoryTick(options);
      consecutiveThrows = 0;
    } catch (error) {
      consecutiveThrows += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[story-factory] tick threw outside stage handling:', message);
      results.push({ status: 'blocked', error: message });
      // Three raw throws in a row means the failure is environmental (DB down,
      // credentials), not job-specific — stop burning the budget against it.
      if (consecutiveThrows >= 3) break;
      slowestStageMs = Math.max(slowestStageMs, clock() - stageStart);
      continue;
    }
    slowestStageMs = Math.max(slowestStageMs, clock() - stageStart);
    if (result.status === 'idle' || result.status === 'disabled') break;
    results.push(result);
  }
  return { status: results.length ? 'completed' : 'idle', results };
}

/**
 * Adaptive, because stage cost varies by an order of magnitude: a cover or an already
 * planned chapter finishes in seconds, while a chapter needing a rewrite can run two
 * full provider timeouts. Admit another stage only if the slowest one observed so far
 * would still fit with margin, so the invocation is never cut off mid-chapter.
 */
export function shouldStartAnotherStage(input: {
  completed: number;
  elapsedMs: number;
  slowestStageMs: number;
  budgetMs: number;
}): boolean {
  if (input.completed === 0) return true;
  return input.elapsedMs + input.slowestStageMs * 1.5 <= input.budgetMs;
}

export async function runStoryFactoryTick(options?: {
  db?: SupabaseClient;
  provider?: StoryModelProvider;
  workerId?: string;
}): Promise<FactoryTickResult> {
  if (!isStoryFactoryEnabled()) return { status: 'disabled' };
  const db = options?.db ?? getSupabaseAdmin();
  const workerId = options?.workerId ?? `factory-${crypto.randomUUID()}`;
  // Stale window 0: reconcile is the only path that returns an expired-lease job to
  // the queue (claim no longer admits 'writing'), and it must run before this tick's
  // claim so every crash is counted against the retry budget. With the old 10-minute
  // window, claim re-acquired the job the moment its lease expired and a crash-looping
  // job retried forever with retry_count frozen at zero.
  await db.rpc('reconcile_story_factory_jobs', { p_stale_minutes: 0 });
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
  if (job.stage === 'revise') return runRevision(db, job, project, options?.provider);
  return runChapter(db, job, project, options?.provider);
}
