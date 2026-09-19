import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProviderUsage, StoryModelProvider } from '@/services/story-factory/provider';
import { geminiProvider } from '@/services/story-factory/provider';
import {
  BibleSchema, CyclePlanSchema, PremiseSchema, SerialRoutesSchema, scorecardAverage,
  type Bible, type CyclePlan, type Premise, type SerialRoutes,
} from './contracts';
import { SERIAL_PROMPT_VERSION } from './prompts';
import { foldVolume, planNextCycle, writeOneChapter } from './engine';

/**
 * The state machine. One stage per claim, lease-guarded, every mutation through an RPC.
 *
 * There is no blocked status to recover from. A chapter that will not come out right
 * replans its cycle; a cycle that will not come out right twice pauses the story for a
 * person to read it. That is the only place a human is required, and the job is to read,
 * not to repair.
 */

/** Chapters are private until their whole cycle publishes, so a volume is ten cycles. */
export const CYCLES_PER_VOLUME = 10;
/** Leave room for a write + judge + extract sequence inside one invocation. */
export const TICK_BUDGET_MS = 240_000;
const LEASE_MINUTES = 15;

export type SerialStage = 'plan_cycle' | 'write' | 'publish_cycle' | 'fold_volume';

interface SerialJobRow {
  id: string;
  serial_novel_id: string;
  novel_id: string;
  stage: SerialStage;
  current_chapter: number;
  current_cycle_id: string | null;
  lease_token: string;
  daily_target: number;
  consecutive_replans: number;
}

interface SerialNovelRow {
  id: string;
  premise: unknown;
  bible: unknown;
  routes: unknown;
}

export interface SerialTickResult {
  status: 'idle' | 'completed' | 'failed';
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
    updated_at: new Date().toISOString(), ...patch,
  }).eq('id', job.id).eq('lease_token', job.lease_token);
  if (error) throw error;
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
    checkpoint_bible: input.bible,
    status: 'writing',
  }).select('id').single();
  if (error) throw error;
  return (data as { id: string }).id;
}

async function stagePlanCycle(
  db: SupabaseClient, provider: StoryModelProvider, job: SerialJobRow,
): Promise<SerialTickResult> {
  const { premise, bible, routes } = await loadNovel(db, job.serial_novel_id);

  const { data: lastCycle, error: lastError } = await db.from('serial_cycles')
    .select('id,cycle_number,volume_number,plan,status')
    .eq('serial_novel_id', job.serial_novel_id)
    .order('cycle_number', { ascending: false }).limit(1).maybeSingle();
  if (lastError) throw lastError;

  const extending = job.current_cycle_id !== null;
  const previous = lastCycle && !extending ? CyclePlanSchema.safeParse(lastCycle.plan) : null;

  const planned = await planNextCycle({
    provider, routes, premise, bible,
    previousCycle: previous?.success ? previous.data : null,
    cycleNumber: extending
      ? (lastCycle?.cycle_number as number)
      : ((lastCycle?.cycle_number as number | undefined) ?? 0) + 1,
    volumeNumber: extending
      ? (lastCycle?.volume_number as number)
      : Math.floor((((lastCycle?.cycle_number as number | undefined) ?? 0)) / CYCLES_PER_VOLUME) + 1,
    startChapter: job.current_chapter + 1,
    recentVerdicts: [],
  });

  const cycleId = extending && job.current_cycle_id
    ? job.current_cycle_id
    : await openCycle(db, { job, novelId: job.serial_novel_id, cycle: planned.cycle, bible });

  if (extending) {
    // Rolling beats only: the cycle keeps its number, span and checkpoint.
    const { error } = await db.from('serial_cycles')
      .update({ plan: planned.cycle, updated_at: new Date().toISOString() })
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
  });

  return {
    status: 'completed', jobId: job.id, stage: 'plan_cycle',
    detail: `Cycle ${planned.cycle.cycleNumber} covers chapters ${planned.cycle.startChapter}-${planned.cycle.plannedEndChapter}.`,
    costUsd: planned.costUsd,
  };
}

async function stageWrite(
  db: SupabaseClient, provider: StoryModelProvider, job: SerialJobRow,
): Promise<SerialTickResult> {
  if (!job.current_cycle_id) {
    await releaseLease(db, job, { stage: 'plan_cycle', status: 'ready', next_run_at: new Date().toISOString() });
    return { status: 'completed', jobId: job.id, stage: 'write', detail: 'No open cycle; returning to planning.' };
  }

  const { premise, bible, routes } = await loadNovel(db, job.serial_novel_id);
  const { data: cycleRow, error: cycleError } = await db.from('serial_cycles')
    .select('id,plan,start_chapter,end_chapter').eq('id', job.current_cycle_id).single();
  if (cycleError) throw cycleError;
  const cycle = CyclePlanSchema.parse((cycleRow as { plan: unknown }).plan);
  const chapterNumber = job.current_chapter + 1;

  // Beat sheets are three chapters deep. Running past them means planning again.
  if (!cycle.beatSheets.some(sheet => sheet.chapterNumber === chapterNumber)) {
    await releaseLease(db, job, { stage: 'plan_cycle', status: 'ready', next_run_at: new Date().toISOString() });
    return { status: 'completed', jobId: job.id, stage: 'write', detail: `No beat sheet for chapter ${chapterNumber}.` };
  }

  const { data: previous } = await db.from('chapters')
    .select('content').eq('novel_id', job.novel_id).eq('chapter_number', job.current_chapter).maybeSingle();

  const { data: runRow, error: runError } = await db.from('serial_runs').insert({
    serial_novel_id: job.serial_novel_id, cycle_id: cycle.cycleNumber ? job.current_cycle_id : null,
    kind: 'chapter', chapter_number: chapterNumber, status: 'running',
    route_version: routes.routeVersion, prompt_version: SERIAL_PROMPT_VERSION,
  }).select('id').single();
  if (runError) throw runError;
  const runId = (runRow as { id: string }).id;

  const outcome = await writeOneChapter({
    provider, routes, premise, bible, cycle, chapterNumber,
    previousChapter: (previous as { content?: string } | null)?.content ?? null,
  });

  if (outcome.status === 'needs_replan') {
    await db.from('serial_runs').update({
      status: 'failed', usage: outcome.usages, cost_usd: outcome.costUsd,
      error: outcome.reason, finished_at: new Date().toISOString(),
    }).eq('id', runId);
    const { data, error } = await db.rpc('replan_serial_cycle', {
      p_job_id: job.id, p_lease_token: job.lease_token,
      p_cycle_id: job.current_cycle_id, p_reason: outcome.reason,
    });
    if (error) throw error;
    return {
      status: 'completed', jobId: job.id, stage: 'write', chapterNumber,
      detail: `Replanned cycle${(data as { paused?: boolean } | null)?.paused ? ' and paused for a read' : ''}: ${outcome.reason}`,
      costUsd: outcome.costUsd,
    };
  }

  const nextStage: SerialStage = chapterNumber >= cycle.plannedEndChapter ? 'publish_cycle' : 'write';
  const { error } = await db.rpc('commit_serial_chapter', {
    p_job_id: job.id, p_lease_token: job.lease_token, p_run_id: runId,
    p_expected_chapter: chapterNumber,
    p_title: outcome.chapter.title, p_content: outcome.chapter.content,
    p_bible: outcome.bible, p_verdict: outcome.verdict, p_digest: outcome.digest,
    p_scorecard_avg: scorecardAverage(outcome.verdict),
    p_usage: outcome.usages, p_cost_usd: outcome.costUsd, p_attempts: outcome.attempts,
    p_next_stage: nextStage,
  });
  if (error) throw error;

  return {
    status: 'completed', jobId: job.id, stage: 'write', chapterNumber,
    detail: `"${outcome.chapter.title}" (${outcome.attempts} attempt${outcome.attempts > 1 ? 's' : ''})`,
    costUsd: outcome.costUsd,
  };
}

async function stagePublishCycle(db: SupabaseClient, job: SerialJobRow): Promise<SerialTickResult> {
  if (!job.current_cycle_id) {
    await releaseLease(db, job, { stage: 'plan_cycle', status: 'ready', next_run_at: new Date().toISOString() });
    return { status: 'completed', jobId: job.id, stage: 'publish_cycle', detail: 'Nothing open to publish.' };
  }
  const { data: cycleRow, error: cycleError } = await db.from('serial_cycles')
    .select('cycle_number').eq('id', job.current_cycle_id).single();
  if (cycleError) throw cycleError;
  const cycleNumber = (cycleRow as { cycle_number: number }).cycle_number;
  const nextStage: SerialStage = cycleNumber % CYCLES_PER_VOLUME === 0 ? 'fold_volume' : 'plan_cycle';

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
}): Promise<SerialTickResult> {
  const { db } = input;
  const provider = input.provider ?? geminiProvider;

  const { data: claimed, error } = await db.rpc('claim_serial_job', {
    p_owner: input.owner ?? 'serial-cron',
    p_lease_minutes: LEASE_MINUTES,
    p_route_version: null,
  });
  if (error) throw error;
  if (!claimed) return { status: 'idle' };
  const job = claimed as SerialJobRow;

  try {
    switch (job.stage) {
      case 'plan_cycle': return await stagePlanCycle(db, provider, job);
      case 'write': return await stageWrite(db, provider, job);
      case 'publish_cycle': return await stagePublishCycle(db, job);
      case 'fold_volume': return await stageFoldVolume(db, job);
      default: throw new Error(`Unknown serial stage ${String(job.stage)}`);
    }
  } catch (stageError) {
    // Transport and provider failures are transient by default: back off and retry the
    // same stage. Nothing here can put a story into a state only a person can leave.
    const message = stageError instanceof Error ? stageError.message : String(stageError);
    await releaseLease(db, job, {
      status: 'ready',
      next_run_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      last_error: message.slice(0, 500),
    });
    return { status: 'failed', jobId: job.id, stage: job.stage, detail: message };
  }
}

/** Drain as many stages as the invocation budget allows. */
export async function runSerialTicks(input: {
  db: SupabaseClient;
  provider?: StoryModelProvider;
  budgetMs?: number;
  owner?: string;
}): Promise<{ results: SerialTickResult[]; costUsd: number }> {
  const budget = input.budgetMs ?? TICK_BUDGET_MS;
  const startedAt = Date.now();
  const results: SerialTickResult[] = [];
  let slowest = 0;

  for (;;) {
    const elapsed = Date.now() - startedAt;
    if (elapsed + slowest * 1.5 > budget) break;
    const before = Date.now();
    const result = await runSerialTick({ db: input.db, provider: input.provider, owner: input.owner });
    slowest = Math.max(slowest, Date.now() - before);
    if (result.status === 'idle') break;
    results.push(result);
    if (result.status === 'failed') break;
  }

  return { results, costUsd: Number(results.reduce((sum, r) => sum + (r.costUsd ?? 0), 0).toFixed(4)) };
}

/** Fleet-wide usage totals, for the dashboard and the cost target. */
export function summariseUsage(usages: ProviderUsage[]): { calls: number; costUsd: number } {
  return { calls: usages.length, costUsd: Number(usages.reduce((sum, u) => sum + u.costUsd, 0).toFixed(4)) };
}
