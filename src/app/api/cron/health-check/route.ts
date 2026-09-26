import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSerialEnabled, serialIncidents, type SerialJobHealthRow } from '@/services/serial';
import { notifyStoryFactoryOperator } from '@/services/story-factory/alerts';

export const dynamic = 'force-dynamic';

/**
 * Watches the Serial fleet and mails a person when a story needs one: paused, waiting for
 * its opening review, stalled behind a cron that is not claiming it, or stuck on a dead
 * lease. The story factory is switched off (2026-09-24); its own cron still records its
 * heartbeat in health_checks for the factory admin page.
 *
 * Each incident key is forwarded to Resend as the idempotency key, so repeated runs of
 * this cron (Vercel, every 15 minutes) send one email per incident a day.
 */
const MAX_EMAILS_PER_RUN = 10;

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getSupabaseAdmin();
  const [jobsResult, novelsResult, lastRunResult] = await Promise.all([
    db.from('serial_jobs').select('id,serial_novel_id,status,stage,current_chapter,daily_target,chapters_today,quota_date,next_run_at,lease_until,last_error,updated_at'),
    db.from('serial_novels').select('id,title:premise->>title,schemaVersion:premise->>schemaVersion'),
    db.from('serial_runs').select('started_at').order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (jobsResult.error || novelsResult.error || lastRunResult.error) {
    const message = jobsResult.error?.message ?? novelsResult.error?.message ?? lastRunResult.error?.message ?? 'Unknown health-check query failure';
    console.error('[health-check]', message);
    return NextResponse.json({ status: 'failed', error: message }, { status: 500 });
  }

  const novels = new Map((novelsResult.data ?? []).map(row => {
    const novel = row as { id: string; title: string | null; schemaVersion: string | null };
    return [novel.id, novel];
  }));
  const jobs: SerialJobHealthRow[] = (jobsResult.data ?? []).map(row => {
    const job = row as Omit<SerialJobHealthRow, 'title' | 'schemaVersion'> & { serial_novel_id: string };
    const novel = novels.get(job.serial_novel_id);
    return { ...job, title: novel?.title ?? job.id, schemaVersion: Number(novel?.schemaVersion ?? 0) };
  });

  const incidents = serialIncidents({
    jobs, enabled: isSerialEnabled(), now: new Date(),
    lastRunAt: (lastRunResult.data as { started_at: string } | null)?.started_at ?? null,
  });
  const deliveries: Array<{ key: string; status: string }> = [];
  for (const incident of incidents.slice(0, MAX_EMAILS_PER_RUN)) {
    const delivery = await notifyStoryFactoryOperator({
      kind: incident.kind,
      idempotencyKey: incident.key,
      title: incident.title,
      message: incident.message,
      jobId: incident.jobId,
      stage: incident.stage,
      chapterNumber: incident.chapterNumber,
    });
    deliveries.push({ key: incident.key, status: delivery.status });
  }

  return NextResponse.json({
    status: incidents.length ? 'attention' : 'healthy',
    jobs: jobs.length,
    incidents: incidents.map(({ kind, title }) => ({ kind, title })),
    deliveries,
  });
}

export const POST = GET;
