import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isStoryFactoryEnabled } from '@/services/story-factory';

export const dynamic = 'force-dynamic';

const CLAIMABLE_STATUSES = ['setup', 'ready', 'writing', 'revise', 'plan', 'arc', 'cover', 'window_review'];

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startedAt = Date.now();
  const db = getSupabaseAdmin();
  const [runnable, latestRun] = await Promise.all([
    db.from('story_factory_jobs').select('*', { count: 'exact', head: true }).in('status', CLAIMABLE_STATUSES),
    db.from('story_factory_runs').select('started_at,status').order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (runnable.error || latestRun.error) {
    const message = runnable.error?.message ?? latestRun.error?.message ?? 'Unknown health-check query failure';
    console.error('[health-check]', message);
    return NextResponse.json({ status: 'failed', error: message }, { status: 500 });
  }

  const enabled = isStoryFactoryEnabled();
  const runnableJobs = runnable.count ?? 0;
  const lastRunAt = latestRun.data?.started_at ?? null;
  const lastRunAgeMinutes = lastRunAt
    ? Math.floor((Date.now() - new Date(lastRunAt).getTime()) / 60_000)
    : null;
  const stale = enabled && runnableJobs > 0 && (lastRunAgeMinutes === null || lastRunAgeMinutes > 30);
  const status = stale || (!enabled && runnableJobs > 0) ? 'critical' : 'healthy';
  const checks = [
    { name: 'Story Factory enabled', status: enabled ? 'pass' : 'fail', message: enabled ? 'Enabled' : 'STORY_FACTORY_ENABLED is not exactly true' },
    { name: 'Runnable jobs', status: stale ? 'fail' : 'pass', message: `${runnableJobs} job(s) claimable; last run ${lastRunAt ?? 'never'}` },
  ];
  const metrics = { enabled, runnableJobs, lastRunAt, lastRunAgeMinutes };
  const inserted = await db.from('health_checks').insert({
    status,
    score: status === 'healthy' ? 100 : 0,
    metrics,
    checks,
    summary: stale
      ? `Story Factory has ${runnableJobs} runnable job(s) but no run in over 30 minutes.`
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
