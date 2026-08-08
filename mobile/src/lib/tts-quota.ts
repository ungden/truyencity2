/**
 * Daily listening quota for signed-out readers.
 *
 * The server-side counter (`record_tts_usage`) is keyed on a user id, so a
 * reader who never signs in was charged nothing and listened without limit —
 * the free cap was one sign-out away from not existing. This keeps the same
 * one-hour allowance on the device instead.
 *
 * A device-local counter is defeatable (clear data, reinstall). It isn't meant
 * to be tamper-proof — it's meant to make the free tier behave the same whether
 * or not someone is signed in. Signed-in users are still metered server-side.
 */
import { storage } from "@/lib/storage";

const STORAGE_KEY = "tts_usage_anonymous";

/** Matches `reader_tier_limits.daily_tts_limit_seconds` for the free tier. */
export const ANONYMOUS_DAILY_LIMIT_SECONDS = 3600;

interface AnonymousUsage {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  seconds: number;
}

/**
 * Local calendar date. Deliberately local, not UTC: a reader in Vietnam expects
 * their allowance to reset at local midnight.
 */
function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function read(): AnonymousUsage {
  const stored = storage.get<AnonymousUsage | null>(STORAGE_KEY, null);
  if (!stored || stored.date !== today()) {
    return { date: today(), seconds: 0 };
  }
  return stored;
}

/** Seconds listened today on this device while signed out. */
export function getAnonymousSecondsUsedToday(): number {
  return read().seconds;
}

/**
 * Add listening time and report the new total.
 * Rolls over automatically when the local date changes.
 */
export function addAnonymousSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return read().seconds;
  const usage = read();
  const next: AnonymousUsage = {
    date: usage.date,
    seconds: usage.seconds + Math.round(seconds),
  };
  storage.set(STORAGE_KEY, next);
  return next.seconds;
}
