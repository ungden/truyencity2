import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Operator alerts are deliberately independent of the writing provider. A
 * blocked Story Factory job must remain blocked even if email is unavailable;
 * email is an out-of-band invitation for a human to inspect and repair it.
 */
const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_SITE_URL = 'https://www.truyencity.com';
const MAX_RECIPIENTS = 4;

export type StoryFactoryAlertKind = 'terminal_block' | 'stalled_cron' | 'cron_failure';

export interface StoryFactoryOperatorAlert {
  kind: StoryFactoryAlertKind;
  idempotencyKey: string;
  title: string;
  message: string;
  jobId?: string;
  novelId?: string;
  runId?: string | null;
  stage?: string;
  chapterNumber?: number;
  errorCode?: string;
}

export interface AlertDeliveryResult {
  status: 'sent' | 'disabled' | 'failed';
}

interface AlertConfig {
  apiKey: string;
  from: string;
  recipients: string[];
  siteUrl: string;
}

interface OperatorAlertRow {
  id: string;
  dedupe_key: string;
  event_kind: StoryFactoryAlertKind;
  title: string;
  message: string;
  job_id: string | null;
  run_id: string | null;
  stage: string | null;
  chapter_number: number | null;
  error_code: string | null;
  attempt_count: number;
}

function configuredAlert(env: NodeJS.ProcessEnv): AlertConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.STORY_FACTORY_ALERT_FROM?.trim();
  const recipients = (env.STORY_FACTORY_ALERT_EMAIL ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(value => /^\S+@\S+\.\S+$/.test(value))
    .slice(0, MAX_RECIPIENTS);
  if (!apiKey || !from || !recipients.length) return null;
  return {
    apiKey,
    from,
    recipients,
    siteUrl: env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') || DEFAULT_SITE_URL,
  };
}

export function isStoryFactoryOperatorAlertConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return configuredAlert(env) !== null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function boundedMessage(value: string): string {
  return value.trim().slice(0, 2_000);
}

function alertSubject(alert: StoryFactoryOperatorAlert): string {
  const chapter = typeof alert.chapterNumber === 'number' ? ` · Ch${alert.chapterNumber}` : '';
  return `[TruyenCity] Cần can thiệp: ${alert.title}${chapter}`;
}

function alertText(alert: StoryFactoryOperatorAlert, siteUrl: string): string {
  const fields = [
    ['Loại', alert.kind],
    ['Job', alert.jobId],
    ['Run', alert.runId ?? undefined],
    ['Stage', alert.stage],
    ['Chương', typeof alert.chapterNumber === 'number' ? String(alert.chapterNumber) : undefined],
    ['Mã lỗi', alert.errorCode],
  ].filter((field): field is [string, string] => Boolean(field[1]));
  return [
    'Story Factory cần được kiểm tra.',
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
    '',
    boundedMessage(alert.message),
    '',
    `Mở vận hành: ${siteUrl}/admin`,
  ].join('\n');
}

function alertHtml(alert: StoryFactoryOperatorAlert, siteUrl: string): string {
  const details = [
    ['Loại', alert.kind],
    ['Job', alert.jobId],
    ['Run', alert.runId ?? undefined],
    ['Stage', alert.stage],
    ['Chương', typeof alert.chapterNumber === 'number' ? String(alert.chapterNumber) : undefined],
    ['Mã lỗi', alert.errorCode],
  ].filter((field): field is [string, string] => Boolean(field[1]));
  return `<main style="font-family:Arial,sans-serif;max-width:640px;margin:auto;line-height:1.5">
  <h2>Story Factory cần can thiệp</h2>
  <p>${escapeHtml(boundedMessage(alert.message))}</p>
  <table style="border-collapse:collapse">${details.map(([label, value]) => (
    `<tr><th style="text-align:left;padding:4px 12px 4px 0">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
  )).join('')}</table>
  <p><a href="${escapeHtml(`${siteUrl}/admin`)}">Mở trang vận hành TruyenCity</a></p>
</main>`;
}

/**
 * Sends one best-effort operational alert. Resend owns the 24-hour dedupe for
 * the deterministic idempotency key; callers never retry a failed email.
 */
export async function notifyStoryFactoryOperator(
  alert: StoryFactoryOperatorAlert,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<AlertDeliveryResult> {
  const config = configuredAlert(options.env ?? process.env);
  if (!config) {
    console.warn('[story-factory] operator alert disabled: missing RESEND_API_KEY, STORY_FACTORY_ALERT_FROM, or STORY_FACTORY_ALERT_EMAIL');
    return { status: 'disabled' };
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': alert.idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: config.recipients,
        subject: alertSubject(alert),
        text: alertText(alert, config.siteUrl),
        html: alertHtml(alert, config.siteUrl),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error('[story-factory] operator alert delivery failed:', response.status);
      return { status: 'failed' };
    }
    return { status: 'sent' };
  } catch (error) {
    console.error('[story-factory] operator alert delivery failed:', error instanceof Error ? error.message : String(error));
    return { status: 'failed' };
  }
}

/** Queue a terminal incident without allowing notification infrastructure to alter the story verdict. */
export async function enqueueStoryFactoryOperatorAlert(
  db: SupabaseClient,
  alert: StoryFactoryOperatorAlert,
): Promise<void> {
  try {
    const { error } = await db.from('story_factory_operator_alerts').upsert({
      dedupe_key: alert.idempotencyKey,
      event_kind: alert.kind,
      title: alert.title,
      message: boundedMessage(alert.message),
      job_id: alert.jobId ?? null,
      run_id: alert.runId ?? null,
      stage: alert.stage ?? null,
      chapter_number: alert.chapterNumber ?? null,
      error_code: alert.errorCode ?? null,
    }, { onConflict: 'dedupe_key', ignoreDuplicates: true });
    if (error) console.error('[story-factory] could not queue operator alert:', error.message);
  } catch (error) {
    console.error('[story-factory] could not queue operator alert:', error instanceof Error ? error.message : String(error));
  }
}

function retryDelayMs(attemptCount: number): number {
  return Math.min(24 * 60 * 60_000, 5 * 2 ** Math.max(0, attemptCount - 1) * 60_000);
}

/**
 * Delivers a small pending batch on every Story Factory cron. The dedupe key is
 * also forwarded to Resend, so concurrent serverless invocations cannot result
 * in duplicate mail. Failed delivery remains pending with bounded backoff.
 */
export async function deliverStoryFactoryOperatorAlerts(
  db: SupabaseClient,
  options: { env?: NodeJS.ProcessEnv; now?: Date; fetchImpl?: typeof fetch } = {},
): Promise<{ delivered: number; pending: number; disabled: boolean }> {
  const env = options.env ?? process.env;
  if (!isStoryFactoryOperatorAlertConfigured(env)) return { delivered: 0, pending: 0, disabled: true };
  const now = options.now ?? new Date();
  const { data, error } = await db.from('story_factory_operator_alerts')
    .select('id,dedupe_key,event_kind,title,message,job_id,run_id,stage,chapter_number,error_code,attempt_count')
    .eq('status', 'pending')
    .lte('next_attempt_at', now.toISOString())
    .lt('attempt_count', 5)
    .order('created_at', { ascending: true })
    .limit(10);
  if (error) {
    console.error('[story-factory] could not load operator alert outbox:', error.message);
    return { delivered: 0, pending: 0, disabled: false };
  }
  const rows = (data ?? []) as OperatorAlertRow[];
  let delivered = 0;
  for (const row of rows) {
    const attemptCount = row.attempt_count + 1;
    const delivery = await notifyStoryFactoryOperator({
      kind: row.event_kind,
      idempotencyKey: row.dedupe_key,
      title: row.title,
      message: row.message,
      jobId: row.job_id ?? undefined,
      runId: row.run_id,
      stage: row.stage ?? undefined,
      chapterNumber: row.chapter_number ?? undefined,
      errorCode: row.error_code ?? undefined,
    }, { env, fetchImpl: options.fetchImpl });
    if (delivery.status === 'sent') {
      const { error: updateError } = await db.from('story_factory_operator_alerts').update({
        status: 'sent', attempt_count: attemptCount, sent_at: now.toISOString(),
        last_error: null, updated_at: now.toISOString(),
      }).eq('id', row.id).eq('status', 'pending');
      if (updateError) console.error('[story-factory] could not mark operator alert sent:', updateError.message);
      else delivered += 1;
      continue;
    }
    const finalFailure = attemptCount >= 5;
    const { error: updateError } = await db.from('story_factory_operator_alerts').update({
      status: finalFailure ? 'failed' : 'pending',
      attempt_count: attemptCount,
      next_attempt_at: new Date(now.getTime() + retryDelayMs(attemptCount)).toISOString(),
      last_error: delivery.status === 'disabled' ? 'Email alert configuration is unavailable.' : 'Email provider rejected or timed out.',
      updated_at: now.toISOString(),
    }).eq('id', row.id).eq('status', 'pending');
    if (updateError) console.error('[story-factory] could not reschedule operator alert:', updateError.message);
  }
  return { delivered, pending: rows.length - delivered, disabled: false };
}
