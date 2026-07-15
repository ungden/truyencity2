/**
 * Unattended flagship story factory.
 *
 * This route is the only scheduler for factory-enabled flagship projects.
 * It never scans the legacy queue and never calls the legacy writer.  A
 * database lease owns a job for one state transition; the next cron tick
 * claims the next transition.  This makes thousands of novels horizontally
 * schedulable without keeping a request alive for an entire novel.
 */

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { extendFlagshipArcForFactory, FlagshipPipelineError, writeFlagshipChapter } from '@/services/story-engine/flagship';
import { advanceAutonomousFlagshipSetup } from '@/services/story-engine/flagship/factory-setup';
import { planNextFlagshipWindowForProject } from '@/services/story-engine/flagship/rolling-planner';
import { FlagshipSetupError } from '@/services/story-engine/flagship/setup';
import { canTransitionFactoryJob } from '@/services/story-engine/flagship/factory-lifecycle';

export const dynamic = 'force-dynamic';
export const maxDuration = 800;

type FactoryJob = {
  id: string;
  project_id: string;
  status: 'setup' | 'writing' | 'finale' | 'infra_blocked' | 'blocked' | 'ready' | 'queued';
  stage: 'setup' | 'plan' | 'write' | 'review' | 'commit' | 'completion';
  current_chapter: number;
  max_chapters: number;
  completion_mode: 'narrative_ending' | 'hard_cap';
  attempt: number;
  lease_token: string;
};

type FactoryResult = {
  jobId: string;
  projectId: string;
  status: 'setup' | 'written' | 'completed' | 'infra_blocked' | 'blocked' | 'skipped' | 'failed';
  chapterNumber?: number;
  error?: string;
};

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= tasks.length) return;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, tasks.length)) }, () => worker()));
  return results;
}

async function claim(db: ReturnType<typeof getSupabaseAdmin>, workerId: string, leaseSeconds: number): Promise<FactoryJob | null> {
  const { data, error } = await db.rpc('claim_flagship_factory_job', {
    p_worker_id: workerId,
    p_lease_seconds: leaseSeconds,
  });
  if (error) throw error;
  const job = (data as { job?: unknown } | null)?.job;
  return job ? job as FactoryJob : null;
}

async function advance(
  db: ReturnType<typeof getSupabaseAdmin>,
  job: FactoryJob,
  nextStatus: FactoryJob['status'] | 'completed',
  nextStage: FactoryJob['stage'],
  chapterNumber: number,
  evidence: unknown[],
  failureClass?: string,
  errorMessage?: string,
): Promise<void> {
  if (nextStatus !== 'completed' && !canTransitionFactoryJob(job.status, nextStatus)) {
    throw new Error(`FACTORY_INVALID_TRANSITION: ${job.status} -> ${nextStatus}`);
  }
  const input = { jobId: job.id, status: job.status, stage: job.stage, chapterNumber, attempt: job.attempt };
  const { error } = await db.rpc('advance_flagship_factory_job', {
    p_job_id: job.id,
    p_lease_token: job.lease_token,
    p_expected_status: job.status,
    p_next_status: nextStatus,
    p_next_stage: nextStage,
    p_chapter_number: chapterNumber,
    p_checkpoint_status: failureClass ? 'failed' : 'passed',
    p_input_digest: digest(input),
    p_output_digest: digest({ nextStatus, nextStage, chapterNumber }),
    p_evidence: evidence.slice(0, 50),
    p_failure_class: failureClass || null,
    p_error_message: errorMessage || null,
  });
  if (error) throw error;
}

async function preserveFactoryPause(db: ReturnType<typeof getSupabaseAdmin>, projectId: string, jobId: string): Promise<void> {
  const { error } = await db.from('ai_story_projects').update({
    status: 'paused',
    pause_reason: `flagship_factory_lease:${jobId}`,
    paused_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', projectId).in('status', ['active', 'paused']);
  if (error) throw error;
}

async function restoreFactoryProject(db: ReturnType<typeof getSupabaseAdmin>, projectId: string, jobId: string, status: 'active' | 'completed' = 'active'): Promise<void> {
  const { error } = await db.from('ai_story_projects').update({
    status,
    pause_reason: status === 'active' ? null : `flagship_factory_completed:${jobId}`,
    paused_at: status === 'active' ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', projectId).eq('pause_reason', `flagship_factory_lease:${jobId}`);
  if (error) throw error;
}

async function ensureNextWindow(db: ReturnType<typeof getSupabaseAdmin>, projectId: string, nextChapter: number): Promise<void> {
  const { data, error } = await db.from('chapter_blueprints').select('id').eq('project_id', projectId).eq('chapter_number', nextChapter).maybeSingle();
  if (error) throw new FlagshipSetupError('setup_blocked', `ChapterPlan lookup failed: ${error.message}`);
  if (data) return;
  try {
    await planNextFlagshipWindowForProject(projectId, { db });
  } catch (caught) {
    // The initial launch pack intentionally contains one 20-30 chapter arc.
    // At its boundary the factory asks a typed Arc Director for the next arc;
    // it never resumes with a generic outline or legacy planner.
    if (!(caught instanceof FlagshipSetupError) || caught.code !== 'human_gate') throw caught;
    await extendFlagshipArcForFactory(projectId, { db });
    await planNextFlagshipWindowForProject(projectId, { db });
  }
}

async function processJob(db: ReturnType<typeof getSupabaseAdmin>, job: FactoryJob): Promise<FactoryResult> {
  const base = { jobId: job.id, projectId: job.project_id };
  let committedChapter: number | undefined;
  try {
    if (job.stage === 'setup') {
      const setup = await advanceAutonomousFlagshipSetup(job.project_id, db);
      const nextStatus = setup.status === 'ready' ? 'ready' : 'setup';
      await advance(db, job, nextStatus, setup.status === 'ready' ? 'plan' : 'setup', job.current_chapter, [{ step: setup.step, candidateId: setup.candidateId || null }]);
      return { ...base, status: 'setup' };
    }

    if (job.stage === 'plan' && job.status === 'infra_blocked') {
      await ensureNextWindow(db, job.project_id, job.current_chapter + 1);
      await advance(db, job, 'ready', 'plan', job.current_chapter, [{ step: 'rolling_plan_recovered' }]);
      return { ...base, status: 'setup', chapterNumber: job.current_chapter };
    }

    const writable = job.stage === 'write' && (job.status === 'writing' || job.status === 'infra_blocked');
    if (!writable) {
      // A completion audit is deliberately not guessed. Hard caps are the
      // only automatic completion signal until a typed ending report exists.
      if (job.status === 'finale' && job.completion_mode === 'hard_cap') {
        await restoreFactoryProject(db, job.project_id, job.id, 'completed');
        await advance(db, job, 'completed', 'completion', job.current_chapter, [{ reason: 'hard_cap' }]);
        return { ...base, status: 'completed', chapterNumber: job.current_chapter };
      }
      throw new FlagshipSetupError('setup_blocked', `Factory job is not writable at ${job.status}/${job.stage}; no implicit recovery.`);
    }

    const { data: projectState, error: projectStateError } = await db.from('ai_story_projects')
      .select('current_chapter').eq('id', job.project_id).single();
    if (projectStateError) throw new FlagshipSetupError('setup_blocked', `Factory chapter state lookup failed: ${projectStateError.message}`);
    // A previous request may have committed the chapter but lost its job
    // checkpoint to a transient DB error. Never write the next chapter twice.
    if (Number(projectState.current_chapter || 0) > job.current_chapter) {
      committedChapter = Number(projectState.current_chapter);
      await ensureNextWindow(db, job.project_id, committedChapter + 1);
      await restoreFactoryProject(db, job.project_id, job.id, 'active');
      await advance(db, job, 'ready', 'plan', committedChapter, [{ step: 'commit_reconciled', chapterNumber: committedChapter }]);
      return { ...base, status: 'written', chapterNumber: committedChapter };
    }
    if (Number(projectState.current_chapter || 0) < job.current_chapter) {
      throw new FlagshipSetupError('setup_blocked', 'Factory job chapter is ahead of the committed project; no implicit repair.');
    }
    await preserveFactoryPause(db, job.project_id, job.id);
    const written = await writeFlagshipChapter({ projectId: job.project_id });
    committedChapter = written.chapterNumber;
    if (written.chapterNumber >= job.max_chapters) {
      await restoreFactoryProject(db, job.project_id, job.id, 'completed');
      await advance(db, job, 'completed', 'completion', written.chapterNumber, [{ reason: 'safety_max_chapters', maxChapters: job.max_chapters }]);
      return { ...base, status: 'completed', chapterNumber: written.chapterNumber };
    }
    await ensureNextWindow(db, job.project_id, written.chapterNumber + 1);
    await restoreFactoryProject(db, job.project_id, job.id, 'active');
    await advance(db, job, 'ready', 'plan', written.chapterNumber, [{ chapterNumber: written.chapterNumber, qualityScore: written.qualityScore }]);
    return { ...base, status: 'written', chapterNumber: written.chapterNumber };
  } catch (caught) {
    const code = caught instanceof FlagshipPipelineError || caught instanceof FlagshipSetupError ? caught.code : undefined;
    const message = caught instanceof Error ? caught.message : String(caught);
    const infra = code === 'infra_blocked';
    if (infra) {
      await advance(db, job, 'infra_blocked', committedChapter ? 'plan' : job.stage, committedChapter || job.current_chapter, [{ code, committedChapter: committedChapter || null }], 'infrastructure', message);
      return { ...base, status: 'infra_blocked', error: message };
    }
    try {
      await preserveFactoryPause(db, job.project_id, job.id);
      await advance(db, job, 'blocked', committedChapter ? 'plan' : job.stage === 'write' ? 'review' : job.stage, committedChapter || job.current_chapter, [{ code: code || 'unknown', committedChapter: committedChapter || null }], code === 'setup_blocked' ? 'setup' : 'quality', message);
    } catch (transitionError) {
      return { ...base, status: 'failed', error: `${message}; transition: ${transitionError instanceof Error ? transitionError.message : String(transitionError)}` };
    }
    return { ...base, status: 'blocked', error: message };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> { return run(request); }
export async function POST(request: NextRequest): Promise<NextResponse> { return run(request); }

async function run(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronAuth(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (process.env.FLAGSHIP_FACTORY_ENABLED !== '1') return NextResponse.json({ success: true, disabled: true });
  const db = getSupabaseAdmin();
  const concurrency = intEnv('FLAGSHIP_FACTORY_CONCURRENCY', 8, 1, 32);
  const leaseSeconds = intEnv('FLAGSHIP_FACTORY_LEASE_SECONDS', 900, 60, 3600);
  const workerPrefix = `flagship-factory:${process.env.VERCEL_REGION || 'local'}:${Date.now()}`;
  const tasks = Array.from({ length: concurrency }, (_, index) => async (): Promise<FactoryResult | null> => {
    const job = await claim(db, `${workerPrefix}:${index}`, leaseSeconds);
    return job ? processJob(db, job) : null;
  });
  const results = (await runWithConcurrency(tasks, concurrency)).filter((value): value is FactoryResult => Boolean(value));
  return NextResponse.json({ success: true, autonomous: true, claimed: results.length, results });
}
