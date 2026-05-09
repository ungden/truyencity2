/**
 * Shared Vietnam timezone utility.
 * Replaces 2 duplicate copies across cron/admin routes.
 */

export function getVietnamDayBounds(now: Date = new Date()): {
  vnDate: string;
  startIso: string;
  endIso: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const getPart = (type: string) => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) throw new Error(`Missing Vietnam date part: ${type}`);
    return Number(value);
  };
  const y = getPart('year');
  const m = getPart('month');
  const d = getPart('day');

  const offsetMs = 7 * 60 * 60 * 1000;
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - offsetMs;
  const endUtcMs = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetMs;

  return {
    vnDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
  };
}
