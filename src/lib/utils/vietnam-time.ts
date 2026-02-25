/**
 * Shared Vietnam timezone utility.
 * Replaces 2 duplicate copies across cron/admin routes.
 */

export function getVietnamDayBounds(now: Date = new Date()): {
  vnDate: string;
  startIso: string;
  endIso: string;
} {
  const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const y = vnNow.getFullYear();
  const m = vnNow.getMonth();
  const d = vnNow.getDate();

  const startVN = new Date(y, m, d, 0, 0, 0);
  const endVN = new Date(y, m, d, 23, 59, 59, 999);
  const offsetMs = 7 * 60 * 60 * 1000;

  return {
    vnDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    startIso: new Date(startVN.getTime() - offsetMs).toISOString(),
    endIso: new Date(endVN.getTime() - offsetMs).toISOString(),
  };
}
