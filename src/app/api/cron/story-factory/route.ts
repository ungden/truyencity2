import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  isStoryFactoryEnabled,
  deliverStoryFactoryOperatorAlerts,
  enqueueStoryFactoryOperatorAlert,
  runStoryFactoryTicks,
  STORY_FACTORY_RELEASE,
} from '@/services/story-factory';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

async function recordFactoryHeartbeat(result: Awaited<ReturnType<typeof runStoryFactoryTicks>>) {
  try {
    const db = getSupabaseAdmin();
    const checkedAt = new Date().toISOString();
    const { count, error } = await db.from('story_factory_jobs')
      .select('*', { count: 'exact', head: true })
      // Match the queue portion of claim_story_factory_job. A job with an active
      // lease is deliberately `writing`; a parallel cron cannot claim it and must
      // not report it as an idle, runnable job.
      .in('status', ['setup', 'ready', 'finale'])
      // A ready job waiting for its quota reset is scheduled, not runnable. Counting
      // it here made every healthy idle cron write a false critical heartbeat.
      .lte('next_run_at', checkedAt)
      .or(`lease_until.is.null,lease_until.lt.${checkedAt}`);
    if (error) throw error;
    const enabled = isStoryFactoryEnabled();
    const runnableJobs = count ?? 0;
    const stalled = enabled && runnableJobs > 0 && result.status !== 'completed';
    const status = stalled || (!enabled && runnableJobs > 0) ? 'critical' : 'healthy';
    const { error: insertError } = await db.from('health_checks').insert({
      status,
      score: status === 'healthy' ? 100 : 0,
      metrics: { enabled, runnableJobs, tickStatus: result.status, stagesCompleted: result.results.length },
      checks: [
        { name: 'Story Factory enabled', status: enabled ? 'pass' : 'fail' },
        { name: 'Cron tick', status: stalled ? 'fail' : 'pass', message: result.status },
      ],
      summary: stalled
        ? `Cron ran but ${runnableJobs} job(s) remain runnable without a completed stage.`
        : 'Story Factory cron heartbeat recorded.',
    });
    if (insertError) throw insertError;
    if (stalled) {
      await enqueueStoryFactoryOperatorAlert(db, {
        kind: 'stalled_cron',
        // A stalled queue is one incident per day, not a mail every two-minute
        // cron heartbeat. A terminal job error has its own run-scoped alert.
        idempotencyKey: `story-factory-stalled-${checkedAt.slice(0, 10)}`,
        title: 'cron đang kẹt',
        message: `Cron thấy ${runnableJobs} job có thể chạy nhưng tick không hoàn tất stage nào (${result.status}).`,
        stage: 'cron',
        errorCode: 'stalled_cron',
      });
    }
  } catch (error) {
    // Monitoring must never consume the writing tick. Vercel logs retain this failure.
    console.error('[story-factory] heartbeat failed', error);
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const batch = await runStoryFactoryTicks();
    await recordFactoryHeartbeat(batch);
    await deliverStoryFactoryOperatorAlerts(getSupabaseAdmin());
    return NextResponse.json({ release: STORY_FACTORY_RELEASE, ...batch });
  } catch (error) {
    console.error('[story-factory]', error);
    await enqueueStoryFactoryOperatorAlert(getSupabaseAdmin(), {
      kind: 'cron_failure',
      idempotencyKey: `story-factory-cron-failure-${new Date().toISOString().slice(0, 10)}`,
      title: 'cron lỗi',
      message: error instanceof Error ? error.message : String(error),
      stage: 'cron',
      errorCode: 'cron_failure',
    });
    return NextResponse.json({
      release: STORY_FACTORY_RELEASE,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export const POST = GET;
