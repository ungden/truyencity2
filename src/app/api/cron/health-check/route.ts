import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isStoryFactoryEnabled, STORY_FACTORY_RELEASE } from '@/services/story-factory';

export const dynamic = 'force-dynamic';

interface ClaimableQueueHealth {
  runnable_jobs: number | string;
  oldest_next_run_at: string | null;
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startedAt = Date.now();
  const db = getSupabaseAdmin();
  const [queueHealth, latestRun, blockedJobs] = await Promise.all([
    // This database function carries every eligibility guard from
    // claim_story_factory_job, including release approval and project mode.
    db.rpc('story_factory_claimable_queue_health', { p_engine_release: STORY_FACTORY_RELEASE }).maybeSingle(),
    db.from('story_factory_runs').select('started_at,status').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('story_factory_jobs').select('id', { count: 'exact', head: true }).in('status', ['setup_blocked', 'plan_blocked', 'quality_blocked', 'infra_blocked']),
  ]);

  if (queueHealth.error || latestRun.error || blockedJobs.error) {
    const message = queueHealth.error?.message ?? latestRun.error?.message ?? blockedJobs.error?.message ?? 'Unknown health-check query failure';
    console.error('[health-check]', message);
    return NextResponse.json({ status: 'failed', error: message }, { status: 500 });
  }

  const queue = queueHealth.data as ClaimableQueueHealth | null;
  const enabled = isStoryFactoryEnabled();
  const runnableJobs = Number(queue?.runnable_jobs ?? 0);
  const oldestRunnableAt = queue?.oldest_next_run_at ?? null;
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
  const blockedJobCount = blockedJobs.count ?? 0;
  const status = stale || blockedJobCount > 0 || (!enabled && runnableJobs > 0) ? 'critical' : 'healthy';
  const checks = [
    { name: 'Story Factory enabled', status: enabled ? 'pass' : 'fail', message: enabled ? 'Enabled' : 'STORY_FACTORY_ENABLED is not exactly true' },
    {
      name: 'Runnable jobs',
      status: stale ? 'fail' : 'pass',
      message: `${runnableJobs} job(s) claimable; oldest due ${oldestRunnableAt ?? 'n/a'}; last run ${lastRunAt ?? 'never'}`,
    },
    { name: 'Blocked jobs', status: blockedJobCount > 0 ? 'fail' : 'pass', message: `${blockedJobCount} job(s) need operator action` },
  ];
  const metrics = {
    enabled,
    runnableJobs,
    oldestRunnableAt,
    oldestRunnableAgeMinutes,
    lastRunAt,
    lastRunAgeMinutes,
    blockedJobCount,
  };
  const inserted = await db.from('health_checks').insert({
    status,
    score: status === 'healthy' ? 100 : 0,
    metrics,
    checks,
    summary: stale
      ? `Story Factory has ${runnableJobs} runnable job(s); the oldest has been claimable for over 30 minutes.`
      : blockedJobCount > 0
        ? `Story Factory has ${blockedJobCount} blocked job(s); no new draft will be generated until the incident is repaired.`
      : !enabled && runnableJobs > 0
        ? `Story Factory is disabled while ${runnableJobs} job(s) are runnable.`
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
