/**
 * What a person must be told about the Serial fleet. Pure: the health-check cron loads the
 * rows, this decides, the alert module mails. A paused or stalled story otherwise waits in
 * silence until someone happens to open the operator.
 *
 * Each incident carries a deterministic key. The mailer forwards it as the idempotency key,
 * so a story paused for a day is one email, not ninety-six.
 */

export interface SerialJobHealthRow {
  id: string;
  title: string;
  /** Retired v3 premises are paused on purpose and never alert. */
  schemaVersion: number;
  status: string;
  stage: string;
  current_chapter: number;
  daily_target: number;
  chapters_today: number;
  quota_date: string | null;
  next_run_at: string | null;
  lease_until: string | null;
  last_error: string | null;
  updated_at: string;
}

export type SerialIncidentKind = 'serial_paused' | 'serial_review' | 'serial_stalled' | 'serial_lease' | 'serial_disabled';

export interface SerialIncident {
  kind: SerialIncidentKind;
  key: string;
  title: string;
  message: string;
  jobId?: string;
  stage?: string;
  chapterNumber?: number;
}

/**
 * The fleet is stalled when a story has been due this long AND the cron has started no run
 * for this long. Per-story waiting is normal: one cron drains five stories in turn, and the
 * last one after midnight can start half an hour late. The first version alerted per story
 * and mailed five false "stalled" emails at 00:00 on 2026-09-26, when every quota reset at once.
 */
export const STALL_MINUTES = 30;
/** A lease this far past its end means an invocation died without returning it. */
export const LEASE_GRACE_MINUTES = 20;

export function hoChiMinhDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
}

/** Same text for the same incident: Resend rejects a reused idempotency key with a different body. */
function clock(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function minutesSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return (now.getTime() - new Date(iso).getTime()) / 60_000;
}

/**
 * When a ready job became claimable. A job that used up yesterday's quota keeps yesterday's
 * next_run_at, but it could not run before local midnight.
 */
export function dueSince(job: SerialJobHealthRow, today: string): string | null {
  if (!job.next_run_at) return null;
  if (job.quota_date === today) return job.next_run_at;
  const midnight = `${today}T00:00:00+07:00`;
  return new Date(job.next_run_at) > new Date(midnight) ? job.next_run_at : new Date(midnight).toISOString();
}

export function serialIncidents(input: {
  jobs: SerialJobHealthRow[];
  enabled: boolean;
  now: Date;
  /** started_at of the newest serial run of any story: proof the cron is working. */
  lastRunAt: string | null;
}): SerialIncident[] {
  const { now } = input;
  const today = hoChiMinhDate(now);
  // awaiting_approval is a premise a person seeded and has not approved yet: known, not news.
  const live = input.jobs.filter(job => job.schemaVersion !== 3 && job.status !== 'completed' && job.status !== 'awaiting_approval');
  const incidents: SerialIncident[] = [];

  if (!input.enabled && live.some(job => job.status === 'ready')) {
    incidents.push({
      kind: 'serial_disabled',
      key: `serial:disabled:${today}`,
      title: 'Hệ viết truyện đang tắt',
      message: `SERIAL_ENGINE_ENABLED không phải "true" trong khi ${live.filter(job => job.status === 'ready').length} truyện đang chờ viết.`,
    });
  }

  for (const job of live) {
    const base = { jobId: job.id, stage: job.stage, chapterNumber: job.current_chapter };
    if (job.status === 'paused') {
      incidents.push({
        ...base,
        kind: 'serial_paused',
        key: `serial:paused:${job.id}:${job.updated_at}`,
        title: `Truyện tạm dừng: ${job.title}`,
        message: `Dừng ở chương ${job.current_chapter}, bước ${job.stage}. ${job.last_error ?? 'Không có ghi chú lỗi.'}`,
      });
      continue;
    }
    if (job.status === 'opening_review') {
      incidents.push({
        ...base,
        kind: 'serial_review',
        key: `serial:review:${job.id}:${job.updated_at}`,
        title: `Cần đọc và duyệt mở đầu: ${job.title}`,
        message: `Bốn chương mở đầu đã viết xong và đang chờ người đọc duyệt (serial:operator approve).${job.last_error ? ` Ghi chú biên tập: ${job.last_error}` : ''}`,
      });
      continue;
    }
    if (job.status === 'running') {
      const overrun = minutesSince(job.lease_until, now);
      if (overrun !== null && overrun > LEASE_GRACE_MINUTES) {
        incidents.push({
          ...base,
          kind: 'serial_lease',
          key: `serial:lease:${job.id}:${job.lease_until}`,
          title: `Lượt viết bị treo: ${job.title}`,
          message: `Lease hết hạn lúc ${clock(job.lease_until!)} mà chưa được trả; lượt chạy có thể đã chết giữa chừng.`,
        });
      }
      continue;
    }
  }

  // One fleet incident: stories long due, and the cron has not started anything lately.
  const longDue = !input.enabled ? [] : live.filter(job => {
    if (job.status !== 'ready') return false;
    const quotaLeft = job.quota_date !== today || job.chapters_today < job.daily_target;
    const waited = minutesSince(dueSince(job, today), now);
    return quotaLeft && waited !== null && waited > STALL_MINUTES;
  });
  const idle = minutesSince(input.lastRunAt, now);
  if (longDue.length && (idle === null || idle > STALL_MINUTES)) {
    incidents.push({
      kind: 'serial_stalled',
      // Keyed to the last run, so the text stays identical for as long as the stall lasts.
      key: `serial:stalled:${input.lastRunAt ?? today}`,
      title: 'Cron viết truyện không chạy',
      message: `Có truyện đã đến hạn hơn ${STALL_MINUTES} phút, nhưng lượt chạy gần nhất `
        + `${input.lastRunAt ? `bắt đầu lúc ${clock(input.lastRunAt)}` : 'chưa từng có'}.`,
    });
  }
  return incidents;
}
