import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isStoryFactoryEnabled, runStoryFactoryTicks, STORY_FACTORY_RELEASE } from '@/services/story-factory';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

async function recordFactoryHeartbeat(result: Awaited<ReturnType<typeof runStoryFactoryTicks>>) {
  try {
    const db = getSupabaseAdmin();
    const { count, error } = await db.from('story_factory_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['setup', 'ready', 'writing', 'revise', 'plan', 'arc', 'cover', 'window_review']);
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
    return NextResponse.json({ release: STORY_FACTORY_RELEASE, ...batch });
  } catch (error) {
    console.error('[story-factory]', error);
    return NextResponse.json({
      release: STORY_FACTORY_RELEASE,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export const POST = GET;
