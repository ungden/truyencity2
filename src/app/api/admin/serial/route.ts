import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_SERIAL_ROUTES, SERIAL_PROMPT_VERSION, isSerialEnabled } from '@/services/serial';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['approve', 'pause', 'resume']),
  jobId: z.string().uuid(),
}).strict();

interface RunRow { scorecard_avg: number | null; cost_usd: number | null; serial_novel_id: string }

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();

  const [jobsResult, runsResult] = await Promise.all([
    db.from('serial_jobs').select(`
      id, serial_novel_id, novel_id, status, stage, current_chapter, current_cycle_id,
      daily_target, chapters_today, quota_date, consecutive_replans, next_run_at, last_error,
      serial_novels!serial_jobs_serial_novel_id_fkey(approved_at, route_version, prompt_version),
      novels!serial_jobs_novel_id_fkey(title, slug, hidden, chapter_count)
    `).order('updated_at', { ascending: false }),
    db.from('serial_runs')
      .select('serial_novel_id,scorecard_avg,cost_usd')
      .eq('kind', 'chapter').not('scorecard_avg', 'is', null)
      .order('started_at', { ascending: false }).limit(200),
  ]);
  if (jobsResult.error || runsResult.error) {
    return NextResponse.json({ error: jobsResult.error?.message ?? runsResult.error?.message }, { status: 500 });
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
      readingScore: scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null,
      last10Usd: Number(runs.reduce((sum, run) => sum + Number(run.cost_usd ?? 0), 0).toFixed(3)),
    };
  });

  return NextResponse.json({
    enabled: isSerialEnabled(),
    routeVersion: DEFAULT_SERIAL_ROUTES.routeVersion,
    promptVersion: SERIAL_PROMPT_VERSION,
    jobs,
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action', issues: parsed.error.issues }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: job, error: lookupError } = await db.from('serial_jobs')
    .select('id,serial_novel_id,status').eq('id', parsed.data.jobId).single();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 404 });

  const now = new Date().toISOString();
  if (parsed.data.action === 'approve') {
    // The one human gate: someone read the premise and the opening chapters.
    const approved = await db.from('serial_novels').update({
      approved_at: now, approved_by: 'admin', updated_at: now,
    }).eq('id', job.serial_novel_id);
    if (approved.error) return NextResponse.json({ error: approved.error.message }, { status: 500 });
  }

  const { error } = await db.from('serial_jobs').update({
    status: parsed.data.action === 'pause' ? 'paused' : 'ready',
    lease_owner: null, lease_token: null, lease_until: null,
    next_run_at: now, last_error: null, updated_at: now,
  }).eq('id', parsed.data.jobId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, action: parsed.data.action, jobId: parsed.data.jobId });
}
