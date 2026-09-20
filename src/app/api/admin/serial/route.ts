import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  DEFAULT_SERIAL_ROUTES, SERIAL_PREMISE_CATALOG, SERIAL_PROMPT_VERSION, isSerialEnabled,
} from '@/services/serial';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['approve', 'restart_opening', 'release', 'pause', 'resume']),
  jobId: z.string().uuid(),
}).strict();

interface RunRow {
  scorecard_avg: number | null;
  cost_usd: number | null;
  serial_novel_id: string;
  chapter_number: number | null;
  opening_audit: { passed?: boolean; summary?: string; findings?: unknown[] } | null;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();

  const [jobsResult, runsResult] = await Promise.all([
    db.from('serial_jobs').select(`
      id, serial_novel_id, novel_id, status, stage, current_chapter, current_cycle_id,
      daily_target, chapters_today, quota_date, consecutive_replans, next_run_at, last_error,
      serial_novels!serial_jobs_serial_novel_id_fkey(approved_at, opening_reviewed_at, route_version, prompt_version),
      novels!serial_jobs_novel_id_fkey(title, slug, hidden, chapter_count)
    `).order('updated_at', { ascending: false }),
    db.from('serial_runs')
      .select('serial_novel_id,chapter_number,scorecard_avg,cost_usd,opening_audit')
      .eq('kind', 'chapter').not('scorecard_avg', 'is', null)
      .order('started_at', { ascending: false }).limit(200),
  ]);
  if (jobsResult.error || runsResult.error) {
    return NextResponse.json({ error: jobsResult.error?.message ?? runsResult.error?.message }, { status: 500 });
  }

  const openingReviewNovelIds = (jobsResult.data ?? [])
    .filter(job => job.status === 'opening_review')
    .map(job => job.novel_id as string);
  const openingResult = openingReviewNovelIds.length > 0
    ? await db.from('chapters')
      .select('novel_id,chapter_number,title,content,publication_state')
      .in('novel_id', openingReviewNovelIds)
      .eq('publication_state', 'draft')
      .lte('chapter_number', 4)
      .order('chapter_number', { ascending: true })
    : { data: [], error: null };
  if (openingResult.error) {
    return NextResponse.json({ error: openingResult.error.message }, { status: 500 });
  }

  // Reading score over the last ten chapters per story: the number that replaces a
  // block count as the health signal.
  const byNovel = new Map<string, RunRow[]>();
  for (const run of (runsResult.data ?? []) as RunRow[]) {
    const bucket = byNovel.get(run.serial_novel_id) ?? [];
    if (bucket.length < 10) bucket.push(run);
    byNovel.set(run.serial_novel_id, bucket);
  }

  const jobs = (jobsResult.data ?? []).map(job => {
    const runs = byNovel.get(job.serial_novel_id as string) ?? [];
    const scores = runs.map(run => Number(run.scorecard_avg)).filter(Number.isFinite);
    return {
      ...job,
      openingChapters: (openingResult.data ?? []).filter(chapter => chapter.novel_id === job.novel_id),
      openingAudit: runs.find(run => run.chapter_number === 4 && run.opening_audit)?.opening_audit ?? null,
      readingScore: scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null,
      last10Usd: Number(runs.reduce((sum, run) => sum + Number(run.cost_usd ?? 0), 0).toFixed(3)),
    };
  });

  return NextResponse.json({
    enabled: isSerialEnabled(),
    routeVersion: DEFAULT_SERIAL_ROUTES.routeVersion,
    promptVersion: SERIAL_PROMPT_VERSION,
    // Local, versioned premises. Returning them here does not seed a novel, approve a
    // job or call a provider; the admin has to review one and use the dry-run CLI first.
    catalog: SERIAL_PREMISE_CATALOG,
    jobs,
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action', issues: parsed.error.issues }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: job, error: lookupError } = await db.from('serial_jobs')
    .select('id,serial_novel_id,status,current_chapter').eq('id', parsed.data.jobId).single();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 404 });

  const now = new Date().toISOString();
  if (parsed.data.action === 'restart_opening' || parsed.data.action === 'release') {
    const fn = parsed.data.action === 'restart_opening' ? 'restart_serial_opening' : 'release_serial_novel';
    const args = parsed.data.action === 'restart_opening'
      ? { p_job_id: job.id, p_reason: 'Opening rejected from the admin review.' }
      : { p_job_id: job.id };
    const { data, error } = await db.rpc(fn, args);
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ ok: true, action: parsed.data.action, jobId: job.id, result: data });
  }
  if (parsed.data.action === 'resume') {
    if (job.status !== 'paused') {
      return NextResponse.json({ error: 'Only a paused job can be resumed.' }, { status: 409 });
    }
    const { data, error } = await db.rpc('resume_serial_job', { p_job_id: job.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ ok: true, action: parsed.data.action, jobId: job.id, result: data });
  }
  if (parsed.data.action === 'approve') {
    const approval = job.status === 'awaiting_approval'
      ? { approved_at: now, approved_by: 'admin', updated_at: now }
      : job.status === 'opening_review' && job.current_chapter === 4
        ? { opening_reviewed_at: now, opening_reviewed_by: 'admin', updated_at: now }
        : null;
    if (!approval) {
      return NextResponse.json({ error: 'Job is not waiting for premise or opening approval.' }, { status: 409 });
    }
    const approved = await db.from('serial_novels').update(approval).eq('id', job.serial_novel_id);
    if (approved.error) return NextResponse.json({ error: approved.error.message }, { status: 500 });
  }
  if (parsed.data.action === 'pause' && ['awaiting_approval', 'opening_review'].includes(job.status)) {
    return NextResponse.json({ error: 'A review gate cannot be replaced by pause.' }, { status: 409 });
  }

  const { error } = await db.from('serial_jobs').update({
    status: parsed.data.action === 'pause' ? 'paused' : 'ready',
    lease_owner: null, lease_token: null, lease_until: null,
    next_run_at: now, last_error: null, updated_at: now,
  }).eq('id', parsed.data.jobId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, action: parsed.data.action, jobId: parsed.data.jobId });
}
