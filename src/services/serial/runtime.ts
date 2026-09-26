import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ZodError } from 'zod';
import type { ProviderUsage, StoryModelProvider } from '@/services/story-factory/provider';
import { geminiProvider } from '@/services/story-factory/provider';
import { StoryFactoryError } from '@/services/story-factory/contracts';
import {
  BibleSchema, ChapterDigestSchema, ChapterDraftSchema, CyclePlanSchema, JudgeVerdictSchema, PremiseSchema, SerialRoutesSchema, scorecardAverage,
  storedOpeningAudit,
  type Bible, type CyclePlan, type Premise, type SerialRoutes,
} from './contracts';
import { SERIAL_PROMPT_VERSION } from './prompts';
import {
  assertTimeFor, auditFourChapterOpening, cyclePull, foldVolume, lowPullStreak, LOW_PULL_THRESHOLD, planNextCycle,
  SerialCheckpointError, SerialDeadlineError, splitOpeningFindings, writeOneChapter,
  type ChapterOutcome, type SerialDraftCheckpoint,
} from './engine';
import { CHAPTER_TIMEOUT_MS, SUPPORT_TIMEOUT_MS } from './agents';
import { SerialStateError } from './state';
import { NarrativeReviewSchema, narrativeReviewGate } from '@/services/narrative/foundation';
import { reviewNarrativeSequence } from './foundation';

/**
 * The state machine. One stage per claim, lease-guarded, every mutation through an RPC.
 *
 * There is no blocked status to recover from. A chapter that will not come out right
 * replans its cycle; a cycle that will not come out right twice pauses the story for a
 * person to read it. Premise approval and the chapter-four opening review are the two
 * launch gates. Deterministic input/configuration failures pause for correction;
 * transient failures have a durable retry budget across cron invocations.
 */

/** Chapters are private until their whole cycle publishes, so a volume is ten cycles. */
export const CYCLES_PER_VOLUME = 10;
/** Leave room for a write + judge + extract sequence inside one invocation. */
export const TICK_BUDGET_MS = 240_000;
const LEASE_MINUTES = 15;

export function serialFailureDisposition(error: unknown, retryCount: number): 'paused' | 'ready' {
  const evidence = error instanceof StoryFactoryError && error.evidence && typeof error.evidence === 'object'
    ? error.evidence as { providerCredential?: boolean; issues?: unknown } : null;
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof ZodError || error instanceof SerialStateError || evidence?.providerCredential
    || evidence?.issues || /structured-output JSON contract|application schema validation|Unknown serial stage/.test(message)) return 'paused';
  return retryCount >= 3 ? 'paused' : 'ready';
}

/** A plan that failed validation with no time left for its retry, fixed by the next tick. */
export const PLAN_RETRY_PREFIX = 'PLAN_RETRY: ';

export const editorialNotesFromError = (value: string | null): string[] => value && !value.startsWith(PLAN_RETRY_PREFIX)
  ? value.split(/\s+\|\s+/).map(note => note.trim().slice(0, 1_200)).filter(Boolean).slice(0, 8)
  : [];

export const mergeEditorialNotes = (fresh: string[], inherited: string[]): string[] =>
  [...new Set([...fresh, ...inherited])].slice(0, 8);

function parseDraftCheckpoint(value: unknown): SerialDraftCheckpoint | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (![1, 2].includes(Number(candidate.schemaVersion)) || !['judge', 'revision', 'extractor', 'verifier', 'literary_review'].includes(String(candidate.resumeFrom))) {
    return null;
  }
  const chapterRaw = candidate.chapter as Record<string, unknown> | undefined;
  const chapterNumber = chapterRaw?.chapterNumber;
  const chapter = ChapterDraftSchema.safeParse(chapterRaw && { title: chapterRaw.title, content: chapterRaw.content });
  const verdict = candidate.verdict === undefined ? null : JudgeVerdictSchema.safeParse(candidate.verdict);
  const digest = candidate.digest === undefined ? null : ChapterDigestSchema.safeParse(candidate.digest);
  if (!Number.isInteger(chapterNumber) || !chapter.success || (verdict && !verdict.success) || (digest && !digest.success)) return null;
  return {
    schemaVersion: Number(candidate.schemaVersion) as 1 | 2,
    resumeFrom: candidate.resumeFrom as SerialDraftCheckpoint['resumeFrom'],
    chapter: { chapterNumber: chapterNumber as number, ...chapter.data },
    verdict: verdict?.data,
    digest: digest?.data,
    attempts: Number.isInteger(candidate.attempts) && Number(candidate.attempts) > 0 ? Number(candidate.attempts) : 1,
    inputFingerprint: typeof candidate.inputFingerprint === 'string' ? candidate.inputFingerprint : undefined,
  };
}

function usagesFromError(error: unknown): ProviderUsage[] {
  if (!(error instanceof StoryFactoryError) || !error.evidence || typeof error.evidence !== 'object') return [];
  const evidence = error.evidence as { usage?: ProviderUsage; usages?: ProviderUsage[] };
  return Array.isArray(evidence.usages) ? evidence.usages : evidence.usage ? [evidence.usage] : [];
}

/**
 * A rolling plan supplies only the next beat-sheet window. The cycle promise and
 * its database bounds were fixed when the cycle opened; letting a later planner
 * replace them makes the finish line recede forever and can orphan draft chapters
 * outside serial_cycles.end_chapter.
 */
export function mergeRollingCyclePlan(input: {
  active: CyclePlan;
  rolling: CyclePlan;
  cycleNumber: number;
  volumeNumber: number;
  startChapter: number;
  endChapter: number;
}): CyclePlan {
  const beatSheets = input.rolling.beatSheets
    .filter(sheet => sheet.chapterNumber <= input.endChapter);
  return CyclePlanSchema.parse({
    ...input.active,
    cycleNumber: input.cycleNumber,
    volumeNumber: input.volumeNumber,
    startChapter: input.startChapter,
    plannedEndChapter: input.endChapter,
    beatSheets,
    editorialNotes: mergeEditorialNotes(input.rolling.editorialNotes, input.active.editorialNotes),
  });
}

export type SerialStage = 'plan_cycle' | 'write' | 'publish_cycle' | 'fold_volume';

interface SerialJobRow {
  id: string;
  serial_novel_id: string;
  novel_id: string;
  stage: SerialStage;
  current_chapter: number;
  current_cycle_id: string | null;
  retry_count: number;
  lease_token: string;
  daily_target: number;
  consecutive_replans: number;
  last_error: string | null;
}

interface SerialNovelRow {
  id: string;
  premise: unknown;
  bible: unknown;
  routes: unknown;
}

export interface SerialTickResult {
  /** deferred: stopped before a paid call it had no time to finish; resumes next tick. */
  status: 'idle' | 'completed' | 'failed' | 'deferred';
  jobId?: string;
  stage?: SerialStage;
  chapterNumber?: number;
  detail?: string;
  costUsd?: number;
}

export function isSerialEnabled(): boolean {
  return process.env.SERIAL_ENGINE_ENABLED === 'true';
}

async function loadNovel(db: SupabaseClient, id: string): Promise<{
  row: SerialNovelRow; premise: Premise; bible: Bible; routes: SerialRoutes;
}> {
  const { data, error } = await db.from('serial_novels')
    .select('id,premise,bible,routes').eq('id', id).single();
  if (error) throw error;
  const row = data as SerialNovelRow;
  return {
    row,
    premise: PremiseSchema.parse(row.premise),
    bible: BibleSchema.parse(row.bible),
    routes: SerialRoutesSchema.parse(row.routes),
  };
}

async function releaseLease(db: SupabaseClient, job: SerialJobRow, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('serial_jobs').update({
    lease_owner: null, lease_token: null, lease_until: null,
    retry_count: 0,
    updated_at: new Date().toISOString(), ...patch,
  }).eq('id', job.id).eq('lease_token', job.lease_token);
  if (error) throw error;
}

/**
 * Premise v3 ("lived-causality") is retired: it forbade the payoffs the genre is read
 * for. Stored v3 novels stay readable, but no new cycle is planned or written for them.
 */
async function pauseRetiredPremise(db: SupabaseClient, job: SerialJobRow, stage: SerialStage): Promise<SerialTickResult> {
  const reason = 'Premise v3 lived-causality đã ngừng dùng (2026-09-23). Seed lại truyện bằng premise văn phạm Faloo (schemaVersion 2).';
  await releaseLease(db, job, { status: 'paused', last_error: reason });
  return { status: 'completed', jobId: job.id, stage, detail: reason };
}

/** Hand the job back for the next tick without counting a failure. */
async function deferJob(
  db: SupabaseClient, job: SerialJobRow, stage: SerialStage, error: SerialDeadlineError,
  patch: Record<string, unknown> = {},
): Promise<SerialTickResult> {
  await releaseLease(db, job, {
    status: 'ready', retry_count: job.retry_count ?? 0, next_run_at: new Date().toISOString(), ...patch,
  });
  return { status: 'deferred', jobId: job.id, stage, detail: error.message };
}

/** Cycle rows carry the Bible as it stood before their first chapter, for a clean rollback. */
async function openCycle(db: SupabaseClient, input: {
  job: SerialJobRow; novelId: string; cycle: CyclePlan; bible: Bible;
}): Promise<string> {
  const { data, error } = await db.from('serial_cycles').insert({
    serial_novel_id: input.novelId,
    cycle_number: input.cycle.cycleNumber,
    volume_number: input.cycle.volumeNumber,
    start_chapter: input.cycle.startChapter,
    end_chapter: input.cycle.plannedEndChapter,
    plan: input.cycle,
    plan_history: [input.cycle],
    checkpoint_bible: input.bible,
    status: 'writing',
  }).select('id').single();
  if (error) throw error;
  return (data as { id: string }).id;
}

async function stagePlanCycle(
  db: SupabaseClient, provider: StoryModelProvider, job: SerialJobRow, deadline?: number,
): Promise<SerialTickResult> {
  const { premise, bible, routes } = await loadNovel(db, job.serial_novel_id);
  if (premise.schemaVersion !== 2) return pauseRetiredPremise(db, job, 'plan_cycle');

  const { data: lastCycle, error: lastError } = await db.from('serial_cycles')
    .select('id,cycle_number,volume_number,start_chapter,end_chapter,plan,plan_history,status')
    .eq('serial_novel_id', job.serial_novel_id)
    .order('cycle_number', { ascending: false }).limit(1).maybeSingle();
  if (lastError) throw lastError;

  const extending = job.current_cycle_id !== null;
  const previous = lastCycle && !extending ? CyclePlanSchema.safeParse(lastCycle.plan) : null;
  const active = lastCycle && extending ? CyclePlanSchema.safeParse(lastCycle.plan) : null;
  const { data: lastChapter, error: lastChapterError } = await db.from('chapters')
    .select('content').eq('novel_id', job.novel_id).eq('chapter_number', job.current_chapter).maybeSingle();
  if (lastChapterError) throw lastChapterError;

  let planned: Awaited<ReturnType<typeof planNextCycle>>;
  try {
    planned = await planNextCycle({
      provider, routes, premise, bible,
      previousChapter: (lastChapter as { content?: string } | null)?.content ?? null,
      previousCycle: previous?.success ? previous.data : null,
      activeCycle: active?.success ? active.data : null,
      cycleNumber: extending
        ? (lastCycle?.cycle_number as number)
        : ((lastCycle?.cycle_number as number | undefined) ?? 0) + 1,
      volumeNumber: extending
        ? (lastCycle?.volume_number as number)
        : Math.floor((((lastCycle?.cycle_number as number | undefined) ?? 0)) / CYCLES_PER_VOLUME) + 1,
      startChapter: job.current_chapter + 1,
      fixedEndChapter: extending ? (lastCycle?.end_chapter as number | undefined) : undefined,
      deadline,
      correction: job.last_error?.startsWith(PLAN_RETRY_PREFIX) ? job.last_error.slice(PLAN_RETRY_PREFIX.length) : null,
      editorialNotes: mergeEditorialNotes(
        editorialNotesFromError(job.last_error),
        active?.success ? active.data.editorialNotes : [],
      ),
    });
  } catch (error) {
    if (error instanceof SerialDeadlineError) {
      if (error.usages.length) {
        const saved = await db.from('serial_runs').insert({
          serial_novel_id: job.serial_novel_id, cycle_id: null, kind: 'plan_cycle', status: 'failed',
          usage: error.usages, cost_usd: Number(error.usages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6)),
          route_version: routes.routeVersion, prompt_version: SERIAL_PROMPT_VERSION,
          error: `Deferred retry: ${error.correction ?? ''}`.slice(0, 2_000),
          finished_at: new Date().toISOString(),
        });
        if (saved.error) throw saved.error;
      }
      return deferJob(db, job, 'plan_cycle', error, error.correction
        ? { last_error: `${PLAN_RETRY_PREFIX}${error.correction}`.slice(0, 2_000) }
        : {});
    }
    const evidence = error instanceof StoryFactoryError && error.evidence && typeof error.evidence === 'object'
      ? error.evidence as { usage?: ProviderUsage; issues?: unknown }
      : null;
    if (evidence?.usage) {
      await db.from('serial_runs').insert({
        serial_novel_id: job.serial_novel_id, cycle_id: null, kind: 'plan_cycle', status: 'failed',
        usage: [evidence.usage], cost_usd: evidence.usage.costUsd,
        route_version: routes.routeVersion, prompt_version: SERIAL_PROMPT_VERSION,
        error: JSON.stringify(evidence.issues ?? null).slice(0, 2_000),
        finished_at: new Date().toISOString(),
      });
    }
    throw error;
  }

  if (extending && active?.success && lastCycle) {
    planned = {
      ...planned,
      cycle: mergeRollingCyclePlan({
        active: active.data,
        rolling: planned.cycle,
        cycleNumber: lastCycle.cycle_number as number,
        volumeNumber: lastCycle.volume_number as number,
        startChapter: lastCycle.start_chapter as number,
        endChapter: lastCycle.end_chapter as number,
      }),
    };
  }

  const cycleId = extending && job.current_cycle_id
    ? job.current_cycle_id
    : await openCycle(db, { job, novelId: job.serial_novel_id, cycle: planned.cycle, bible });

  if (extending) {
    if (!lastCycle) throw new SerialStateError('serial_open_cycle_missing', 'Open cycle row disappeared before its rolling plan could be saved.');
    // Rolling beats only: the cycle keeps its number, span and checkpoint.
    const { error } = await db.from('serial_cycles')
      .update({
        plan: planned.cycle,
        plan_history: [
          ...(Array.isArray(lastCycle.plan_history) ? lastCycle.plan_history : [lastCycle.plan]),
          planned.cycle,
        ],
        status: 'writing', updated_at: new Date().toISOString(),
      })
      .eq('id', cycleId);
    if (error) throw error;
  }

  await db.from('serial_runs').insert({
    serial_novel_id: job.serial_novel_id, cycle_id: cycleId, kind: 'plan_cycle',
    status: 'committed', usage: planned.usages, cost_usd: planned.costUsd,
    route_version: routes.routeVersion, prompt_version: SERIAL_PROMPT_VERSION,
    finished_at: new Date().toISOString(),
  });

  await releaseLease(db, job, {
    stage: 'write', status: 'ready', current_cycle_id: cycleId, next_run_at: new Date().toISOString(),
    // A deferred plan's correction has now been applied; do not feed it to the next plan.
    ...(job.last_error?.startsWith(PLAN_RETRY_PREFIX) ? { last_error: null } : {}),
  });

  return {
    status: 'completed', jobId: job.id, stage: 'plan_cycle',
    detail: `Cycle ${planned.cycle.cycleNumber} covers chapters ${planned.cycle.startChapter}-${planned.cycle.plannedEndChapter}.`,
    costUsd: planned.costUsd,
  };
}

async function stageWrite(
  db: SupabaseClient, provider: StoryModelProvider, job: SerialJobRow, deadline?: number,
): Promise<SerialTickResult> {
  if (!job.current_cycle_id) {
    await releaseLease(db, job, { stage: 'plan_cycle', status: 'ready', next_run_at: new Date().toISOString() });
    return { status: 'completed', jobId: job.id, stage: 'write', detail: 'No open cycle; returning to planning.' };
  }

  const { premise, bible, routes } = await loadNovel(db, job.serial_novel_id);
  if (premise.schemaVersion !== 2) return pauseRetiredPremise(db, job, 'write');
  const { data: cycleRow, error: cycleError } = await db.from('serial_cycles')
    .select('id,plan,start_chapter,end_chapter,checkpoint_bible').eq('id', job.current_cycle_id).single();
  if (cycleError) throw cycleError;
  const parsedCycle = CyclePlanSchema.safeParse((cycleRow as { plan: unknown }).plan);
  if (!parsedCycle.success) {
    await releaseLease(db, job, {
      stage: 'plan_cycle', status: 'ready', next_run_at: new Date().toISOString(),
      last_error: 'Kế hoạch chu kỳ cũ chưa có hợp đồng tài sản có cấu trúc; lập lại kế hoạch trước khi viết.',
    });
    return {
      status: 'completed', jobId: job.id, stage: 'write',
      detail: 'Cycle plan predates the asset contract; returning to planning before any chapter call.',
    };
  }
  const cycle = parsedCycle.data;
  const startBible = BibleSchema.safeParse((cycleRow as { checkpoint_bible?: unknown }).checkpoint_bible);
  const chapterNumber = job.current_chapter + 1;

  // Beat sheets are three chapters deep. Running past them means planning again.
  if (!cycle.beatSheets.some(sheet => sheet.chapterNumber === chapterNumber)) {
    await releaseLease(db, job, { stage: 'plan_cycle', status: 'ready', next_run_at: new Date().toISOString() });
    return { status: 'completed', jobId: job.id, stage: 'write', detail: `No beat sheet for chapter ${chapterNumber}.` };
  }

  const { data: previous } = await db.from('chapters')
    .select('content').eq('novel_id', job.novel_id).eq('chapter_number', job.current_chapter).maybeSingle();

  const { data: checkpointRow, error: checkpointError } = await db.from('serial_runs')
    .select('draft_artifact')
    .eq('serial_novel_id', job.serial_novel_id)
    .eq('cycle_id', job.current_cycle_id)
    .eq('chapter_number', chapterNumber)
    .not('draft_artifact', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (checkpointError) throw checkpointError;
  const resumeArtifact = parseDraftCheckpoint((checkpointRow as { draft_artifact?: unknown } | null)?.draft_artifact);
  // Do not open a run row for a chapter this tick cannot even start.
  try {
    assertTimeFor(resumeArtifact ? SUPPORT_TIMEOUT_MS : CHAPTER_TIMEOUT_MS, deadline);
  } catch (error) {
    if (error instanceof SerialDeadlineError) return deferJob(db, job, 'write', error);
    throw error;
  }

  const { data: runRow, error: runError } = await db.from('serial_runs').insert({
    serial_novel_id: job.serial_novel_id, cycle_id: cycle.cycleNumber ? job.current_cycle_id : null,
    kind: 'chapter', chapter_number: chapterNumber, status: 'running',
    route_version: routes.routeVersion, prompt_version: SERIAL_PROMPT_VERSION,
  }).select('id').single();
  if (runError) throw runError;
  const runId = (runRow as { id: string }).id;

  let outcome: ChapterOutcome;
  try {
    outcome = await writeOneChapter({
      provider, routes, premise, bible, cycle, chapterNumber,
      previousChapter: (previous as { content?: string } | null)?.content ?? null,
      resumeArtifact,
      deadline,
    });
  } catch (error) {
    if (!(error instanceof SerialCheckpointError)) {
      const failedUsages = usagesFromError(error);
      const costUsd = Number(failedUsages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6));
      const saved = await db.from('serial_runs').update({
        status: 'failed', usage: failedUsages, cost_usd: costUsd,
        error: (error instanceof Error ? error.message : String(error)).slice(0, 4_000),
        finished_at: new Date().toISOString(),
      }).eq('id', runId);
      if (saved.error) throw saved.error;
      throw error;
    }
    const failedUsages = [...error.usages, ...usagesFromError(error.underlying)];
    const costUsd = Number(failedUsages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6));
    const saved = await db.from('serial_runs').update({
      status: 'failed', usage: failedUsages, cost_usd: costUsd,
      attempts: error.checkpoint.attempts,
      verdict: error.checkpoint.verdict ?? null,
      digest: error.checkpoint.digest ?? null,
      draft_artifact: error.checkpoint,
      error: error.message.slice(0, 4_000), finished_at: new Date().toISOString(),
    }).eq('id', runId);
    if (saved.error) throw saved.error;
    if (error.underlying instanceof SerialDeadlineError) {
      const deferred = await deferJob(db, job, 'write', error.underlying);
      return { ...deferred, chapterNumber, costUsd, detail: `Saved ${error.checkpoint.resumeFrom} checkpoint. ${error.underlying.message}` };
    }
    const retryCount = (job.retry_count ?? 0) + 1;
    await releaseLease(db, job, {
      status: serialFailureDisposition(error.underlying, retryCount),
      retry_count: retryCount,
      next_run_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      last_error: error.message.slice(0, 500),
    });
    return {
      status: 'failed', jobId: job.id, stage: 'write', chapterNumber,
      detail: `Saved ${error.checkpoint.resumeFrom} checkpoint: ${error.message}`,
      costUsd,
    };
  }

  if (outcome.status === 'needs_replan') {
    const savedFailure = await db.from('serial_runs').update({
      status: 'failed', usage: outcome.usages, cost_usd: outcome.costUsd,
      verdict: outcome.verdict, attempts: outcome.attempts,
      error: outcome.reason, finished_at: new Date().toISOString(),
    }).eq('id', runId);
    if (savedFailure.error) throw savedFailure.error;
    // Replan from this chapter: the ones before it passed their judge (and, in cycle 1,
    // a person's opening review). Rewinding the whole cycle threw those away.
    const { data, error } = await db.rpc('replan_serial_cycle', {
      p_job_id: job.id, p_lease_token: job.lease_token,
      p_cycle_id: job.current_cycle_id, p_reason: outcome.reason,
      p_from_chapter: chapterNumber,
    });
    if (error) throw error;
    return {
      status: 'completed', jobId: job.id, stage: 'write', chapterNumber,
      detail: `Replanned cycle${(data as { paused?: boolean } | null)?.paused ? ' and paused for a read' : ''}: ${outcome.reason}`,
      costUsd: outcome.costUsd,
    };
  }

  if (outcome.status === 'needs_review') {
    const savedReview = await db.from('serial_runs').update({
      status: 'failed', usage: outcome.usages, cost_usd: outcome.costUsd,
      verdict: outcome.verdict, attempts: outcome.attempts,
      digest: outcome.rejectedDigest,
      draft_artifact: {
        schemaVersion: 2,
        resumeFrom: 'extractor',
        reviewKind: outcome.reviewKind,
        chapter: outcome.chapter,
        verdict: outcome.verdict,
        attempts: outcome.attempts,
        inputFingerprint: outcome.inputFingerprint,
      },
      error: outcome.reason, finished_at: new Date().toISOString(),
    }).eq('id', runId);
    if (savedReview.error) throw savedReview.error;
    await releaseLease(db, job, { status: 'paused', last_error: outcome.reason });
    return {
      status: 'completed', jobId: job.id, stage: 'write', chapterNumber,
      detail: `Paused with private ${outcome.reviewKind} artifact: ${outcome.reason}`,
      costUsd: outcome.costUsd,
    };
  }

  let commitUsages = outcome.usages;
  let commitCostUsd = outcome.costUsd;
  let localOpeningNotes: string | null = null;
  if (chapterNumber === 4) {
    const { data: earlier, error: earlierError } = await db.from('chapters')
      .select('chapter_number,title,content')
      .eq('novel_id', job.novel_id)
      .gte('chapter_number', 1).lte('chapter_number', 3)
      .eq('publication_state', 'draft')
      .order('chapter_number', { ascending: true });
    if (earlierError) throw earlierError;
    const chapters = [
      ...((earlier ?? []) as Array<{ chapter_number: number; title: string; content: string }>).map(chapter => ({
        chapterNumber: chapter.chapter_number, title: chapter.title, content: chapter.content,
      })),
      { chapterNumber: 4, title: outcome.chapter.title, content: outcome.chapter.content },
    ];
    let audited: Awaited<ReturnType<typeof auditFourChapterOpening>>;
    try {
      assertTimeFor(SUPPORT_TIMEOUT_MS, deadline);
      audited = await auditFourChapterOpening({
        provider, routes, premise, chapters, bible,
        startBible: startBible.success ? startBible.data : undefined,
        approvedPlan: cycle,
      });
    } catch (error) {
      const reviewUsages = usagesFromError(error);
      const failedUsages = [...outcome.usages, ...reviewUsages];
      const failedCost = Number(failedUsages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6));
      const artifact: SerialDraftCheckpoint = {
        schemaVersion: 2, resumeFrom: 'literary_review',
        chapter: outcome.chapter, verdict: outcome.verdict, digest: outcome.digest,
        attempts: outcome.attempts, inputFingerprint: outcome.inputFingerprint,
      };
      const saved = await db.from('serial_runs').update({
        status: 'failed', usage: failedUsages, cost_usd: failedCost,
        verdict: outcome.verdict, digest: outcome.digest, attempts: outcome.attempts,
        draft_artifact: artifact,
        error: (error instanceof Error ? error.message : String(error)).slice(0, 4_000),
        finished_at: new Date().toISOString(),
      }).eq('id', runId);
      if (saved.error) throw saved.error;
      if (error instanceof SerialDeadlineError) {
        const deferred = await deferJob(db, job, 'write', error);
        return { ...deferred, chapterNumber, costUsd: failedCost, detail: `Saved literary-review checkpoint. ${error.message}` };
      }
      const retryCount = (job.retry_count ?? 0) + 1;
      await releaseLease(db, job, {
        status: serialFailureDisposition(error, retryCount), retry_count: retryCount,
        next_run_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        last_error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      });
      return {
        status: 'failed', jobId: job.id, stage: 'write', chapterNumber,
        detail: `Saved literary-review checkpoint: ${error instanceof Error ? error.message : String(error)}`,
        costUsd: failedCost,
      };
    }
    commitUsages = [...outcome.usages, ...audited.usages];
    commitCostUsd = Number((outcome.costUsd + audited.costUsd).toFixed(6));
    const savedAudit = await db.from('serial_runs').update({
      opening_audit: storedOpeningAudit(audited.audit, audited.narrativeReview),
    }).eq('id', runId);
    if (savedAudit.error) throw savedAudit.error;

    const { upstreamFindings, blockingProseFindings, mayPublish } = narrativeReviewGate(audited.narrativeReview);
    if (upstreamFindings.length > 0) {
      const reason = `Narrative foundation review requires upstream repair: ${upstreamFindings.map(finding =>
        `${finding.target}/${finding.kind}: ${finding.explanation} Direction: ${finding.direction}`
      ).join(' | ')}`.slice(0, 4_000);
      const savedUpstream = await db.from('serial_runs').update({
        status: 'failed', usage: commitUsages, cost_usd: commitCostUsd,
        verdict: outcome.verdict, digest: outcome.digest, attempts: outcome.attempts,
        draft_artifact: {
          schemaVersion: 2, resumeFrom: 'literary_review', chapter: outcome.chapter,
          verdict: outcome.verdict, digest: outcome.digest, attempts: outcome.attempts,
          inputFingerprint: outcome.inputFingerprint,
        },
        error: reason, finished_at: new Date().toISOString(),
      }).eq('id', runId);
      if (savedUpstream.error) throw savedUpstream.error;
      await releaseLease(db, job, { status: 'paused', last_error: reason });
      return {
        status: 'completed', jobId: job.id, stage: 'write', chapterNumber,
        detail: `Paused for foundation/plan review: ${reason}`,
        costUsd: commitCostUsd,
      };
    }

    if (!mayPublish) {
      const reason = `Opening literary review blocked prose: ${blockingProseFindings.map(finding =>
        `Ch.${finding.chapterNumber ?? '?'} ${finding.kind}: ${finding.explanation} Repair: ${finding.direction}`
      ).join(' | ')}`.slice(0, 4_000);
      const savedProse = await db.from('serial_runs').update({
        status: 'failed', usage: commitUsages, cost_usd: commitCostUsd,
        verdict: outcome.verdict,
        draft_artifact: {
          schemaVersion: 2,
          resumeFrom: 'literary_review',
          reviewKind: 'prose',
          chapter: outcome.chapter,
          verdict: outcome.verdict,
          digest: outcome.digest,
          attempts: outcome.attempts,
          inputFingerprint: outcome.inputFingerprint,
          openingAudit: audited.audit,
          narrativeReview: audited.narrativeReview,
        },
        error: reason, finished_at: new Date().toISOString(),
      }).eq('id', runId);
      if (savedProse.error) throw savedProse.error;
      await releaseLease(db, job, { status: 'paused', last_error: reason });
      return {
        status: 'completed', jobId: job.id, stage: 'write', chapterNumber,
        detail: `Paused with private prose artifact: ${reason}`,
        costUsd: commitCostUsd,
      };
    }

    const openingSplit = splitOpeningFindings(audited.audit);
    if (!audited.audit.passed && openingSplit.structural.length === 0) {
      // Local findings: the chapter-four commit already stops at the human opening review.
      // The reviewer gets the editor's notes and `serial:operator repair-opening` instead
      // of four discarded chapters.
      localOpeningNotes = openingSplit.local.map(finding =>
        `Ch.${finding.chapterNumber} ${finding.kind}: ${finding.explain} Hướng sửa: ${finding.repair}`).join(' | ');
    } else if (!audited.audit.passed) {
      const literary = blockingProseFindings.map(finding =>
        `Ch.${finding.chapterNumber ?? '?'} ${finding.kind}: ${finding.explanation} Repair: ${finding.direction}`
      );
      const mechanical = audited.audit.findings.map(finding =>
        `Ch.${finding.chapterNumber} ${finding.kind}: ${finding.explain} Repair: ${finding.repair}`
      );
      const reason = `Opening audit failed: ${[...mechanical, ...literary].join(' | ')}`.slice(0, 4_000);
      await db.from('serial_runs').update({
        status: 'failed', usage: commitUsages, cost_usd: commitCostUsd,
        error: reason, finished_at: new Date().toISOString(),
      }).eq('id', runId);
      const { data, error } = await db.rpc('replan_serial_cycle', {
        p_job_id: job.id, p_lease_token: job.lease_token,
        p_cycle_id: job.current_cycle_id, p_reason: reason,
      });
      if (error) throw error;
      return {
        status: 'completed', jobId: job.id, stage: 'write', chapterNumber,
        detail: `Opening audit rejected the draft${(data as { paused?: boolean } | null)?.paused ? ' and paused for a read' : ''}: ${audited.audit.summary}`,
        costUsd: commitCostUsd,
      };
    }
  }

  const nextStage: SerialStage = chapterNumber >= cycle.plannedEndChapter ? 'publish_cycle' : 'write';
  const { data: commit, error } = await db.rpc('commit_serial_chapter', {
    p_job_id: job.id, p_lease_token: job.lease_token, p_run_id: runId,
    p_expected_chapter: chapterNumber,
    p_title: outcome.chapter.title, p_content: outcome.chapter.content,
    p_bible: outcome.bible, p_verdict: outcome.verdict, p_digest: outcome.digest,
    p_scorecard_avg: scorecardAverage(outcome.verdict),
    p_usage: commitUsages, p_cost_usd: commitCostUsd, p_attempts: outcome.attempts,
    p_next_stage: nextStage,
  });
  if (error) throw error;
  const needsOpeningReview = Boolean((commit as { needsOpeningReview?: boolean } | null)?.needsOpeningReview);
  if (localOpeningNotes) {
    const noted = await db.from('serial_jobs')
      .update({ last_error: `Biên tập mở đầu đề nghị sửa cục bộ: ${localOpeningNotes}`.slice(0, 2_000) })
      .eq('id', job.id);
    if (noted.error) throw noted.error;
  }

  return {
    status: 'completed', jobId: job.id, stage: 'write', chapterNumber,
    detail: `"${outcome.chapter.title}" (${outcome.attempts} attempt${outcome.attempts > 1 ? 's' : ''})${needsOpeningReview ? '; paused for opening review' : ''}${outcome.mergeNotes.length ? `; set aside ${outcome.mergeNotes.length} extractor entr${outcome.mergeNotes.length > 1 ? 'ies' : 'y'}: ${outcome.mergeNotes.join(' | ').slice(0, 600)}` : ''}`,
    costUsd: commitCostUsd,
  };
}

const cycleDraftFingerprint = (chapters: Array<{ chapterNumber: number; title: string; content: string }>): string =>
  createHash('sha256').update(JSON.stringify(chapters.map(chapter => [
    chapter.chapterNumber, chapter.title, chapter.content,
  ]))).digest('hex');

async function stagePublishCycle(
  db: SupabaseClient, provider: StoryModelProvider, job: SerialJobRow,
): Promise<SerialTickResult> {
  if (!job.current_cycle_id) {
    await releaseLease(db, job, { stage: 'plan_cycle', status: 'ready', next_run_at: new Date().toISOString() });
    return { status: 'completed', jobId: job.id, stage: 'publish_cycle', detail: 'Nothing open to publish.' };
  }
  const { data: cycleRow, error: cycleError } = await db.from('serial_cycles')
    .select('cycle_number,start_chapter,end_chapter,plan,plan_history,checkpoint_bible,narrative_review,narrative_review_fingerprint,narrative_review_snapshot')
    .eq('id', job.current_cycle_id).single();
  if (cycleError) throw cycleError;
  const persistedCycle = cycleRow as {
    cycle_number: number;
    start_chapter?: number;
    end_chapter?: number;
    plan?: unknown;
    plan_history?: unknown;
    checkpoint_bible?: unknown;
    narrative_review?: unknown;
    narrative_review_fingerprint?: string | null;
    narrative_review_snapshot?: unknown;
  };
  const cycleNumber = persistedCycle.cycle_number;
  const nextStage: SerialStage = cycleNumber % CYCLES_PER_VOLUME === 0 ? 'fold_volume' : 'plan_cycle';

  const parsedPlan = CyclePlanSchema.safeParse(persistedCycle.plan);
  if (parsedPlan.success && parsedPlan.data.schemaVersion === 2) {
    const { premise, bible, routes } = await loadNovel(db, job.serial_novel_id);
    const startChapter = persistedCycle.start_chapter ?? parsedPlan.data.startChapter;
    const endChapter = persistedCycle.end_chapter ?? parsedPlan.data.plannedEndChapter;
    const { data: chapterRows, error: chaptersError } = await db.from('chapters')
      .select('chapter_number,title,content')
      .eq('novel_id', job.novel_id)
      .gte('chapter_number', startChapter).lte('chapter_number', endChapter)
      .eq('publication_state', 'draft')
      .order('chapter_number', { ascending: true });
    if (chaptersError) throw chaptersError;
    const chapters = ((chapterRows ?? []) as Array<{ chapter_number: number; title: string; content: string }>).map(chapter => ({
      chapterNumber: chapter.chapter_number, title: chapter.title, content: chapter.content,
    }));
    if (chapters.length !== endChapter - startChapter + 1) {
      throw new SerialStateError('cycle_review_incomplete', `Narrative review requires chapters ${startChapter}-${endChapter}.`);
    }
    const fingerprint = cycleDraftFingerprint(chapters);
    const cached = persistedCycle.narrative_review_fingerprint === fingerprint
      ? NarrativeReviewSchema.safeParse(persistedCycle.narrative_review)
      : null;
    let review = cached?.success ? cached.data : null;
    let reviewUsages: ProviderUsage[] = [];
    if (!review) {
      const startBible = BibleSchema.safeParse(persistedCycle.checkpoint_bible);
      try {
        const reviewed = await reviewNarrativeSequence({
          provider, routes, premise, chapters, bible,
          startBible: startBible.success ? startBible.data : undefined,
          approvedPlan: Array.isArray(persistedCycle.plan_history)
            ? persistedCycle.plan_history.flatMap(value => {
              const parsed = CyclePlanSchema.safeParse(value);
              return parsed.success ? [parsed.data] : [];
            })
            : [parsedPlan.data],
        });
        if (!reviewed) throw new SerialStateError('cycle_review_missing', 'Lived-causality cycle produced no narrative review.');
        review = reviewed.review;
        reviewUsages = [reviewed.usage];
      } catch (error) {
        reviewUsages = usagesFromError(error);
        const reviewCost = Number(reviewUsages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6));
        const savedFailedReview = await db.from('serial_runs').insert({
          serial_novel_id: job.serial_novel_id, cycle_id: job.current_cycle_id,
          kind: 'publish_cycle', status: 'failed', usage: reviewUsages, cost_usd: reviewCost,
          route_version: routes.routeVersion, prompt_version: SERIAL_PROMPT_VERSION,
          error: (error instanceof Error ? error.message : String(error)).slice(0, 4_000),
          finished_at: new Date().toISOString(),
        });
        if (savedFailedReview.error) throw savedFailedReview.error;
        const retryCount = (job.retry_count ?? 0) + 1;
        await releaseLease(db, job, {
          status: serialFailureDisposition(error, retryCount), retry_count: retryCount,
          next_run_at: new Date(Date.now() + 5 * 60_000).toISOString(),
          last_error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
        });
        return {
          status: 'failed', jobId: job.id, stage: 'publish_cycle',
          detail: `Cycle narrative review failed: ${error instanceof Error ? error.message : String(error)}`,
          costUsd: reviewCost,
        };
      }
      const savedReview = await db.from('serial_cycles').update({
        narrative_review: review,
        narrative_review_fingerprint: fingerprint,
        narrative_review_snapshot: chapters,
        narrative_reviewed_at: new Date().toISOString(),
      }).eq('id', job.current_cycle_id);
      if (savedReview.error) throw savedReview.error;
      const reviewCost = Number(reviewUsages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6));
      const savedRun = await db.from('serial_runs').insert({
        serial_novel_id: job.serial_novel_id, cycle_id: job.current_cycle_id,
        kind: 'publish_cycle', status: 'committed', usage: reviewUsages, cost_usd: reviewCost,
        route_version: routes.routeVersion, prompt_version: SERIAL_PROMPT_VERSION,
        finished_at: new Date().toISOString(),
      });
      if (savedRun.error) throw savedRun.error;
    }

    const { upstreamFindings, blockingProseFindings, mayPublish } = narrativeReviewGate(review);
    if (upstreamFindings.length > 0 || !mayPublish) {
      const findings = upstreamFindings.length > 0 ? upstreamFindings : blockingProseFindings;
      const reason = `Cycle literary review paused publication: ${findings.map(finding =>
        `${finding.target}/${finding.kind}: ${finding.explanation} Direction: ${finding.direction}`
      ).join(' | ')}`.slice(0, 4_000);
      await releaseLease(db, job, { status: 'paused', last_error: reason });
      return {
        status: 'completed', jobId: job.id, stage: 'publish_cycle',
        detail: reason,
        costUsd: Number(reviewUsages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6)),
      };
    }
  }

  if (parsedPlan.success && parsedPlan.data.schemaVersion === 1) {
    const held = await holdLowPullCycle(db, job, {
      cycleNumber,
      startChapter: persistedCycle.start_chapter ?? parsedPlan.data.startChapter,
      endChapter: persistedCycle.end_chapter ?? parsedPlan.data.plannedEndChapter,
    });
    if (held) return held;
  }

  const { data, error } = await db.rpc('publish_serial_cycle', {
    p_job_id: job.id, p_lease_token: job.lease_token,
    p_cycle_id: job.current_cycle_id, p_next_stage: nextStage,
  });
  if (error) throw error;
  const published = data as { startChapter: number; endChapter: number };
  return {
    status: 'completed', jobId: job.id, stage: 'publish_cycle',
    detail: `Published chapters ${published.startChapter}-${published.endChapter}.`,
  };
}

async function chapterVerdicts(db: SupabaseClient, serialNovelId: string, from: number, to: number) {
  const { data, error } = await db.from('serial_runs')
    .select('chapter_number,verdict,finished_at')
    .eq('serial_novel_id', serialNovelId)
    .eq('kind', 'chapter')
    .in('status', ['committed', 'published'])
    .gte('chapter_number', from).lte('chapter_number', to)
    .not('verdict', 'is', null)
    .order('finished_at', { ascending: true });
  if (error) throw error;
  // The newest committed verdict per chapter is the one that describes the private draft.
  const byChapter = new Map<number, unknown>();
  for (const row of (data ?? []) as Array<{ chapter_number: number; verdict: unknown }>) byChapter.set(row.chapter_number, row.verdict);
  return [...byChapter.values()].flatMap(value => {
    const parsed = JudgeVerdictSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * Two consecutive cycles that nobody would come back for stop here, private, for a
 * person to read. It is the only quality hold in the engine and it is about pull, not
 * arithmetic: a low score never blocks one chapter, only a pattern.
 */
async function holdLowPullCycle(db: SupabaseClient, job: SerialJobRow, cycle: {
  cycleNumber: number; startChapter: number; endChapter: number;
}): Promise<SerialTickResult | null> {
  if (cycle.cycleNumber < 2 || !job.current_cycle_id) return null;
  // Resuming a held job is the reader's decision to publish; hold each cycle once.
  // Cycle v1 has no narrative review, so its review column carries the marker.
  const { data: currentRow, error: currentError } = await db.from('serial_cycles')
    .select('narrative_review').eq('id', job.current_cycle_id).single();
  if (currentError) throw currentError;
  const marker = (currentRow as { narrative_review?: { lowPullHold?: unknown } | null }).narrative_review;
  if (marker?.lowPullHold) return null;
  const { data: previousRow, error } = await db.from('serial_cycles')
    .select('start_chapter,end_chapter')
    .eq('serial_novel_id', job.serial_novel_id)
    .eq('cycle_number', cycle.cycleNumber - 1)
    .maybeSingle();
  if (error) throw error;
  if (!previousRow) return null;
  const previous = previousRow as { start_chapter: number; end_chapter: number };
  const current = cyclePull(await chapterVerdicts(db, job.serial_novel_id, cycle.startChapter, cycle.endChapter));
  const before = cyclePull(await chapterVerdicts(db, job.serial_novel_id, previous.start_chapter, previous.end_chapter));
  if (!lowPullStreak(current, before)) return null;
  const reason = `Hai chu kỳ liền có điểm kéo đọc dưới ${LOW_PULL_THRESHOLD} (chu kỳ trước ${before}, chu kỳ này ${current}). Chu kỳ được giữ riêng tư để người đọc trước khi xuất bản; resume để xuất bản.`;
  const marked = await db.from('serial_cycles').update({
    narrative_review: { lowPullHold: { at: new Date().toISOString(), current, previous: before, threshold: LOW_PULL_THRESHOLD } },
    updated_at: new Date().toISOString(),
  }).eq('id', job.current_cycle_id);
  if (marked.error) throw marked.error;
  await releaseLease(db, job, { status: 'paused', last_error: reason });
  return { status: 'completed', jobId: job.id, stage: 'publish_cycle', detail: reason };
}

async function stageFoldVolume(db: SupabaseClient, job: SerialJobRow): Promise<SerialTickResult> {
  const { bible } = await loadNovel(db, job.serial_novel_id);
  const volumeNumber = bible.volumeSummaries.length + 1;
  const folded = foldVolume({ bible, volumeNumber });

  const { error } = await db.from('serial_novels')
    .update({ bible: folded, updated_at: new Date().toISOString() })
    .eq('id', job.serial_novel_id);
  if (error) throw error;

  await releaseLease(db, job, { stage: 'plan_cycle', status: 'ready', next_run_at: new Date().toISOString() });
  return { status: 'completed', jobId: job.id, stage: 'fold_volume', detail: `Folded volume ${volumeNumber}.` };
}

/** One claimed job, one stage. */
export async function runSerialTick(input: {
  db: SupabaseClient;
  provider?: StoryModelProvider;
  owner?: string;
  /** Epoch ms after which no paid call may start; the hosting function's ceiling. */
  deadline?: number;
}): Promise<SerialTickResult> {
  const { db } = input;
  const provider = input.provider ?? geminiProvider;

  const { data: claimed, error } = await db.rpc('claim_serial_job', {
    p_owner: input.owner ?? 'serial-cron',
    p_lease_minutes: LEASE_MINUTES,
    p_route_version: null,
  });
  if (error) throw error;
  // PostgREST can serialize a SQL NULL RPC result as the literal string "null".
  // Treat both shapes as an empty queue before attempting to read job fields.
  if (
    !claimed
    || claimed === 'null'
    || typeof claimed !== 'object'
    || !('id' in claimed)
    || typeof claimed.id !== 'string'
    || claimed.id.length === 0
  ) return { status: 'idle' };
  const job = claimed as SerialJobRow;

  try {
    switch (job.stage) {
      case 'plan_cycle': return await stagePlanCycle(db, provider, job, input.deadline);
      case 'write': return await stageWrite(db, provider, job, input.deadline);
      case 'publish_cycle': return await stagePublishCycle(db, provider, job);
      case 'fold_volume': return await stageFoldVolume(db, job);
      default: throw new Error(`Unknown serial stage ${String(job.stage)}`);
    }
  } catch (stageError) {
    if (stageError instanceof SerialDeadlineError) return deferJob(db, job, job.stage, stageError);
    // A malformed contract/key will not heal by rerunning the same paid stage.
    const message = stageError instanceof Error ? stageError.message : String(stageError);
    const evidence = stageError instanceof StoryFactoryError && stageError.evidence && typeof stageError.evidence === 'object'
      ? stageError.evidence as { issues?: unknown; usage?: ProviderUsage }
      : null;
    const issueText = evidence?.issues ? ` ${JSON.stringify(evidence.issues).slice(0, 320)}` : '';
    const detail = `${message}${issueText}`;
    const retryCount = (job.retry_count ?? 0) + 1;
    await releaseLease(db, job, {
      status: serialFailureDisposition(stageError, retryCount),
      retry_count: retryCount,
      next_run_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      last_error: detail.slice(0, 500),
    });
    return {
      status: 'failed', jobId: job.id, stage: job.stage, detail,
      costUsd: evidence?.usage?.costUsd,
    };
  }
}

/** Drain as many stages as the invocation budget allows. */
export async function runSerialTicks(input: {
  db: SupabaseClient;
  provider?: StoryModelProvider;
  budgetMs?: number;
  owner?: string;
  deadline?: number;
}): Promise<{ results: SerialTickResult[]; costUsd: number }> {
  const budget = input.budgetMs ?? TICK_BUDGET_MS;
  const startedAt = Date.now();
  const results: SerialTickResult[] = [];
  let slowest = 0;

  for (;;) {
    const elapsed = Date.now() - startedAt;
    if (elapsed + slowest * 1.5 > budget) break;
    const before = Date.now();
    const result = await runSerialTick({ db: input.db, provider: input.provider, owner: input.owner, deadline: input.deadline });
    slowest = Math.max(slowest, Date.now() - before);
    if (result.status === 'idle') break;
    results.push(result);
    if (result.status === 'failed' || result.status === 'deferred') break;
  }

  return { results, costUsd: Number(results.reduce((sum, r) => sum + (r.costUsd ?? 0), 0).toFixed(4)) };
}

/** Fleet-wide usage totals, for the dashboard and the cost target. */
export function summariseUsage(usages: ProviderUsage[]): { calls: number; costUsd: number } {
  return { calls: usages.length, costUsd: Number(usages.reduce((sum, u) => sum + u.costUsd, 0).toFixed(4)) };
}
