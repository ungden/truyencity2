import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isStoryFactoryEnabled } from '@/services/story-factory';

export const dynamic = 'force-dynamic';

// This must stay identical to claim_story_factory_job. In-progress work is
// represented by `writing` plus a live lease and is not waiting for a worker.
const CLAIMABLE_STATUSES = ['setup', 'ready', 'finale'] as const;

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const db = getSupabaseAdmin();
  const [runnable, latestRun] = await Promise.all([
    // Jobs waiting for quota/reset or held by a live worker are scheduled, not
    // stalled. Keep this predicate identical to the writing cron heartbeat and
    // the claim RPC so monitoring cannot manufacture a critical incident.
    db.from('story_factory_jobs').select('id,next_run_at')
      .in('status', CLAIMABLE_STATUSES)
      .lte('next_run_at', checkedAt)
      .or(`lease_until.is.null,lease_until.lt.${checkedAt}`)
      .order('next_run_at', { ascending: true }),
    db.from('story_factory_runs').select('started_at,status').order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (runnable.error || latestRun.error) {
    const message = runnable.error?.message ?? latestRun.error?.message ?? 'Unknown health-check query failure';
    console.error('[health-check]', message);
    return NextResponse.json({ status: 'failed', error: message }, { status: 500 });
  }

  const enabled = isStoryFactoryEnabled();
  const runnableJobs = runnable.data ?? [];
  const oldestRunnableAt = runnableJobs[0]?.next_run_at ?? null;
  const oldestRunnableAgeMinutes = oldestRunnableAt
    ? Math.floor((Date.now() - new Date(oldestRunnableAt).getTime()) / 60_000)
    : null;
  const lastRunAt = latestRun.data?.started_at ?? null;
  const lastRunAgeMinutes = lastRunAt
    ? Math.floor((Date.now() - new Date(lastRunAt).getTime()) / 60_000)
    : null;
  // A global last-run timestamp can be fresh while an earlier claimable job is
  // starving behind it. The due time of the oldest job is the authoritative
  // measure: a job that just became due gets its normal cron window; one left
  // claimable for 30+ minutes is an actionable stalled queue.
  const stale = enabled && (oldestRunnableAgeMinutes ?? 0) > 30;
  const status = stale || (!enabled && runnableJobs.length > 0) ? 'critical' : 'healthy';
  const checks = [
    { name: 'Story Factory enabled', status: enabled ? 'pass' : 'fail', message: enabled ? 'Enabled' : 'STORY_FACTORY_ENABLED is not exactly true' },
    {
      name: 'Runnable jobs',
      status: stale ? 'fail' : 'pass',
      message: `${runnableJobs.length} job(s) claimable; oldest due ${oldestRunnableAt ?? 'n/a'}; last run ${lastRunAt ?? 'never'}`,
    },
  ];
  const metrics = {
    enabled,
    runnableJobs: runnableJobs.length,
    oldestRunnableAt,
    oldestRunnableAgeMinutes,
    lastRunAt,
    lastRunAgeMinutes,
  };
  const inserted = await db.from('health_checks').insert({
    status,
    score: status === 'healthy' ? 100 : 0,
    metrics,
    checks,
    summary: stale
      ? `Story Factory has ${runnableJobs.length} runnable job(s); the oldest has been claimable for over 30 minutes.`
      : !enabled && runnableJobs.length > 0
        ? `Story Factory is disabled while ${runnableJobs.length} job(s) are runnable.`
        : 'Story Factory heartbeat is current.',
    duration_ms: Date.now() - startedAt,
  });
  if (inserted.error) {
    console.error('[health-check]', inserted.error.message);
    return NextResponse.json({ status: 'failed', error: inserted.error.message }, { status: 500 });
  }

  return NextResponse.json({ status, metrics, checks });
}

export const POST = GET;
