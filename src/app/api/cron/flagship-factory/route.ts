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
import {
  FlagshipV3Error,
  canTransitionFactoryV3,
  getFlagshipV3ProviderReadiness,
  advanceFlagshipV3Arc,
  planNextFlagshipV3Window,
  writeFlagshipV3Chapter,
  decideFactoryV3QualityRecovery,
  type FactoryV3Status,
} from '@/services/story-engine/flagship-v3';

export const dynamic = 'force-dynamic';
export const maxDuration = 800;

type FactoryJob = {
  id: string;
  project_id: string;
  pipeline_version: 'flagship_v3';
  status: FactoryV3Status;
  stage: 'setup' | 'plan' | 'write' | 'review' | 'commit' | 'completion';
  current_chapter: number;
  max_chapters: number;
  completion_mode: 'narrative_ending' | 'hard_cap';
  attempt: number;
  lease_token: string;
  execution_mode: 'hidden_canary' | 'production';
  quality_attempts_for_chapter: number;
  window_regeneration_count: number;
};

type FactoryResult = {
  jobId: string;
  projectId: string;
  status: 'written' | 'completed' | 'infra_blocked' | 'quality_blocked' | 'plan_blocked' | 'skipped' | 'failed';
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

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const parts = [record.code, record.message, record.details, record.hint]
      .filter(part => typeof part === 'string' && part.trim().length > 0);
    if (parts.length) return parts.join(': ');
    try { return JSON.stringify(value); } catch { /* fall through */ }
  }
  return String(value);
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
  nextStatus: FactoryV3Status,
  nextStage: FactoryJob['stage'],
  chapterNumber: number,
  evidence: unknown[],
  failureClass?: string,
  errorMessage?: string,
): Promise<void> {
  if (!canTransitionFactoryV3(job.status, nextStatus)) {
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

function failureEvidence(caught: unknown): unknown[] {
  if (!(caught instanceof FlagshipV3Error) || !caught.detail || typeof caught.detail !== 'object') return [];
  const detail = caught.detail as Record<string, unknown>;
  const verdict = detail.verdict && typeof detail.verdict === 'object' ? detail.verdict as Record<string, unknown> : null;
  const editorEvidence = Array.isArray(detail.editorEvidence) ? detail.editorEvidence : [];
  const verdictEvidence = Array.isArray(verdict?.evidence) ? verdict.evidence : [];
  const seen = new Set<string>();
  return [...editorEvidence, ...verdictEvidence].filter(item => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);
}

async function ensureNextWindow(db: ReturnType<typeof getSupabaseAdmin>, projectId: string, nextChapter: number): Promise<'ready' | 'completed'> {
  const { data, error } = await db.from('chapter_blueprints').select('id').eq('project_id', projectId).eq('chapter_number', nextChapter).maybeSingle();
  if (error) throw new FlagshipV3Error('plan_blocked', `ChapterPlanV3 lookup failed: ${error.message}`);
  if (data) return 'ready';
  const { data: project, error: projectError } = await db.from('ai_story_projects')
    .select('current_chapter,arc_plan_v3').eq('id', projectId).single();
  if (projectError) throw new FlagshipV3Error('plan_blocked', `Arc lookup failed: ${projectError.message}`);
  const arc = project.arc_plan_v3 as { endChapter?: number } | null;
  if (nextChapter > Number(arc?.endChapter || 0)) {
    const transition = await advanceFlagshipV3Arc(projectId, { db });
    if (transition.completed) return 'completed';
  }
  await planNextFlagshipV3Window(projectId, { db });
  return 'ready';
}

async function processJob(db: ReturnType<typeof getSupabaseAdmin>, job: FactoryJob): Promise<FactoryResult> {
  const base = { jobId: job.id, projectId: job.project_id };
  let committedChapter: number | undefined;
  try {
    if (job.pipeline_version !== 'flagship_v3') {
      return { ...base, status: 'skipped', error: 'Only flagship_v3 is claimable.' };
    }
    if (job.status === 'infra_blocked') {
      await ensureNextWindow(db, job.project_id, job.current_chapter + 1);
      await advance(db, job, 'ready', 'plan', job.current_chapter, [{ step: 'rolling_plan_recovered' }]);
      return { ...base, status: 'infra_blocked', chapterNumber: job.current_chapter };
    }

    const writable = job.stage === 'write' && job.status === 'writing';
    if (!writable) {
      throw new FlagshipV3Error('plan_blocked', `Factory v3 job is not writable at ${job.status}/${job.stage}.`);
    }

    const { data: projectState, error: projectStateError } = await db.from('ai_story_projects')
      .select('current_chapter').eq('id', job.project_id).single();
    if (projectStateError) throw new FlagshipV3Error('plan_blocked', `Factory chapter state lookup failed: ${projectStateError.message}`);
    // A previous request may have committed the chapter but lost its job
    // checkpoint to a transient DB error. Never write the next chapter twice.
    if (Number(projectState.current_chapter || 0) > job.current_chapter) {
      committedChapter = Number(projectState.current_chapter);
      const windowState = await ensureNextWindow(db, job.project_id, committedChapter + 1);
      if (windowState === 'completed') {
        await advance(db, job, 'completed', 'completion', committedChapter, [{ reason: 'typed_ending_report' }]);
        return { ...base, status: 'completed', chapterNumber: committedChapter };
      }
      await advance(db, job, 'ready', 'plan', committedChapter, [{ step: 'commit_reconciled', chapterNumber: committedChapter }]);
      return { ...base, status: 'written', chapterNumber: committedChapter };
    }
    if (Number(projectState.current_chapter || 0) < job.current_chapter) {
      throw new FlagshipV3Error('plan_blocked', 'Factory job chapter is ahead of committed state.');
    }
    await ensureNextWindow(db, job.project_id, job.current_chapter + 1);
    const written = await writeFlagshipV3Chapter({ projectId: job.project_id }, { db });
    committedChapter = written.chapterNumber;
    if (written.chapterNumber >= job.max_chapters) {
      throw new FlagshipV3Error('plan_blocked', `Safety cap ${job.max_chapters} reached without an approved typed ending report.`);
    }
    const windowState = await ensureNextWindow(db, job.project_id, written.chapterNumber + 1);
    if (windowState === 'completed') {
      await advance(db, job, 'completed', 'completion', written.chapterNumber, [{ reason: 'typed_ending_report' }]);
      return { ...base, status: 'completed', chapterNumber: written.chapterNumber };
    }
    await advance(db, job, 'ready', 'plan', written.chapterNumber, [{ chapterNumber: written.chapterNumber, qualityScore: written.qualityScore }]);
    return { ...base, status: 'written', chapterNumber: written.chapterNumber };
  } catch (caught) {
    const code = caught instanceof FlagshipV3Error ? caught.code : undefined;
    const message = errorMessage(caught);
    const infra = code === 'infra_blocked';
    if (infra) {
      await advance(db, job, 'infra_blocked', committedChapter ? 'plan' : job.stage, committedChapter || job.current_chapter, [{ code, committedChapter: committedChapter || null }], 'infrastructure', message);
      return { ...base, status: 'infra_blocked', error: message };
    }
    if (code === 'quality_blocked') {
      const evidence = failureEvidence(caught);
      const recovery = decideFactoryV3QualityRecovery(job.quality_attempts_for_chapter);
      try {
        await advance(
          db,
          job,
          recovery === 'retry_fresh_draft' ? 'ready' : 'quality_blocked',
          'review',
          committedChapter || job.current_chapter,
          [{ code, evidence, recovery, draftAttempt: job.quality_attempts_for_chapter + 1 }],
          'quality',
          message,
        );
        return recovery === 'retry_fresh_draft'
          ? { ...base, status: 'skipped', error: 'Fresh-draft recovery queued.' }
          : { ...base, status: 'quality_blocked', error: message };
      } catch (transitionError) {
        return { ...base, status: 'failed', error: `${message}; quality transition: ${errorMessage(transitionError)}` };
      }
    }
    if (code === 'plan_blocked' && job.window_regeneration_count < 1) {
      try {
        const { error: resetError } = await db.rpc('reset_uncommitted_flagship_window_v3', {
          p_job_id: job.id,
          p_lease_token: job.lease_token,
        });
        if (resetError) throw resetError;
        await planNextFlagshipV3Window(job.project_id, { db });
        await advance(db, job, 'ready', 'plan', job.current_chapter, [{ code, recovery: 'window_regenerated_once' }]);
        return { ...base, status: 'skipped', error: 'Rolling window regenerated once.' };
      } catch (replanError) {
        const replanMessage = `${message}; window regeneration: ${errorMessage(replanError)}`;
        try {
          await advance(db, job, 'plan_blocked', 'plan', committedChapter || job.current_chapter, [{ code, recovery: 'window_regeneration_failed' }], 'setup', replanMessage);
          return { ...base, status: 'plan_blocked', error: replanMessage };
        } catch (transitionError) {
          return { ...base, status: 'failed', error: `${replanMessage}; plan transition: ${errorMessage(transitionError)}` };
        }
      }
    }
    if (code === 'plan_blocked' || code === 'setup_blocked') {
      try {
        await advance(db, job, 'plan_blocked', 'plan', committedChapter || job.current_chapter, [{ code }], 'setup', message);
        return { ...base, status: 'plan_blocked', error: message };
      } catch (transitionError) {
        return { ...base, status: 'failed', error: `${message}; plan transition: ${errorMessage(transitionError)}` };
      }
    }
    try {
      await advance(db, job, 'infra_blocked', committedChapter ? 'plan' : job.stage, committedChapter || job.current_chapter, [{ code: code || 'unknown_runtime' }], 'infrastructure', message);
    } catch (transitionError) {
      return { ...base, status: 'failed', error: `${message}; transition: ${errorMessage(transitionError)}` };
    }
    return { ...base, status: 'infra_blocked', error: message };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> { return run(request); }
export async function POST(request: NextRequest): Promise<NextResponse> { return run(request); }

async function run(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronAuth(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (process.env.FLAGSHIP_FACTORY_ENABLED !== '1') return NextResponse.json({ success: true, disabled: true });
  const db = getSupabaseAdmin();
  const { data: optedInProjects, error: readinessError } = await db.from('ai_story_projects')
    .select('id,style_directives')
    .contains('style_directives', { pipeline_version: 'flagship_v3' })
    .eq('status', 'paused')
    .eq('flagship_v3_status', 'ready_to_write')
    .limit(5000);
  if (readinessError) {
    return NextResponse.json({ success: false, error: `Factory readiness lookup failed: ${readinessError.message}` }, { status: 503 });
  }
  const providerReadiness = getFlagshipV3ProviderReadiness(optedInProjects || []);
  if (!providerReadiness.ready) {
    return NextResponse.json({
      success: true,
      autonomous: true,
      waitingForProvider: true,
      claimed: 0,
      providerReadiness,
    });
  }
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
