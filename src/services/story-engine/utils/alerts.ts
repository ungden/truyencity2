/**
 * Alert Webhook (Phase 23 S4)
 *
 * Sends alerts to Discord/Slack when system health degrades.
 * Env: ALERT_WEBHOOK_URL (Discord/Slack webhook).
 *
 * Triggers handled elsewhere — this module just provides sendAlert().
 */

const WEBHOOK = process.env.ALERT_WEBHOOK_URL;

export type Severity = 'info' | 'warn' | 'critical';

const EMOJI: Record<Severity, string> = {
  info: 'ℹ️',
  warn: '⚠️',
  critical: '🚨',
};

interface AlertOptions {
  source?: string;
  fields?: Record<string, string | number>;
}

let lastSentAt: Record<string, number> = {};
const COOLDOWN_MS = 15 * 60 * 1000; // 15 min cooldown per alert key

export async function sendAlert(
  severity: Severity,
  message: string,
  options?: AlertOptions,
): Promise<void> {
  if (!WEBHOOK) {
    console.warn(`[Alert ${severity}] ${message} (ALERT_WEBHOOK_URL not set)`);
    return;
  }

  // Throttle duplicate alerts
  const key = `${severity}:${message.slice(0, 80)}`;
  const now = Date.now();
  if (lastSentAt[key] && now - lastSentAt[key] < COOLDOWN_MS) {
    return; // throttled
  }
  lastSentAt[key] = now;

  const fieldsStr = options?.fields
    ? '\n' + Object.entries(options.fields).map(([k, v]) => `**${k}**: ${v}`).join('\n')
    : '';

  const text = `${EMOJI[severity]} **${severity.toUpperCase()}** ${options?.source ? `[${options.source}]` : ''} ${message}${fieldsStr}`;

  // Discord webhook format. Slack uses similar `text` field.
  const body = {
    content: text,
    username: 'TruyenCity Engine',
  };

  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`[Alert] Webhook returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
  } catch (e) {
    console.warn('[Alert] Webhook failed:', e instanceof Error ? e.message : String(e));
  }
}

/**
 * Reset cooldown cache (for tests).
 */
export function resetAlertCooldown(): void {
  lastSentAt = {};
}
