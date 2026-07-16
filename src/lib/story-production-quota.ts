// 2026-05-12: bumped 20 → 50 default. Gemini Flash Lite writes ~1-2 min/chapter
// reliably; 50 ch/day per active focused project fits in cron tick budget.
// Override via WRITE_CHAPTERS_DAILY_QUOTA env or per-project style_directives.
const FALLBACK_DAILY_CHAPTER_QUOTA = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getDefaultDailyChapterQuota(env: NodeJS.ProcessEnv = process.env): number {
  return clamp(parsePositiveInt(env.WRITE_CHAPTERS_DAILY_QUOTA) ?? FALLBACK_DAILY_CHAPTER_QUOTA, 1, 500);
}

export function getProjectDailyChapterQuota(
  project: { id?: unknown; style_directives?: Record<string, unknown> | null },
  env: NodeJS.ProcessEnv = process.env,
): number {
  const override = parsePositiveInt(project.style_directives?.production_daily_chapter_quota);
  return clamp(override ?? getDefaultDailyChapterQuota(env), 1, 500);
}

export function computeQuotaInitialCadenceMinutes(activeWindowMinutes: number, dailyQuota: number): number {
  return Math.max(2, Math.floor(activeWindowMinutes / Math.max(1, dailyQuota)));
}

export function computeQuotaCadenceCeiling(
  activeWindowMinutes: number,
  dailyQuota: number,
  inBurstWindow: boolean,
): number {
  if (!inBurstWindow) return 5;
  return Math.max(3, Math.floor(activeWindowMinutes / Math.max(1, dailyQuota)));
}

export function computeDynamicResumeBatchSizeForQuota(input: {
  activeCount: number;
  dailyQuota: number;
  ticksPerDay: number;
  minBatch: number;
  maxBatch: number;
}): number {
  const requiredPerTick = Math.ceil((input.activeCount * input.dailyQuota) / Math.max(1, input.ticksPerDay));
  const buffered = Math.ceil(requiredPerTick * 1.2);
  return clamp(buffered, input.minBatch, input.maxBatch);
}

export function isRecoverableRoutineWriteError(errorMsg: string): boolean {
  const normalized = errorMsg.toLowerCase();
  if (
    errorMsg.startsWith('PUBLISHED_SETUP_KERNEL_MISSING') ||
    errorMsg.startsWith('CHAPTER_BLUEPRINT_MISSING_OR_INVALID') ||
    errorMsg.startsWith('SETUP_KERNEL_DEAD_LETTER') ||
    normalized.includes('cost cap')
  ) {
    return false;
  }

  return (
    errorMsg.startsWith('FLASH_CHEAP_GATE_BLOCKED') ||
    errorMsg.startsWith('FLASH_CHEAP_CAUSAL_GATE_FAILED') ||
    normalized.includes('rate limit') ||
    normalized.includes('timeout') ||
    normalized.includes('fetch failed') ||
    normalized.includes('network') ||
    normalized.includes('temporarily unavailable') ||
    // ROOT FIX (2026-06-02): content-quality blocks are RECOVERABLE-ROUTINE, not
    // novel-killing. A single hard chapter that fails the Critic gate / bridge
    // check / pre-publish consistency must NOT permanently pause a 1000-chapter
    // novel — the next fresh generation often passes. These cool down with
    // exponential backoff (→ 3h) and surface on the dashboard instead of dying.
    // The truly-unrecoverable cases (missing setup kernel / blueprint / dead
    // letter / cost cap) are excluded by the early `return false` above.
    normalized.includes('failed quality gate after') ||
    normalized.includes('bridge broken') ||
    normalized.includes('critical contradictions detected') ||
    normalized.includes('blocking business-logic consistency')
  );
}

export type StoryFailureClass = 'infrastructure' | 'quality' | 'setup' | 'unknown';

/** Infrastructure outages must never consume content-quality retries or mutate canon. */
export function classifyStoryFailure(errorMsg: string): StoryFailureClass {
  const normalized = errorMsg.toLowerCase();
  if (
    normalized.startsWith('infra_blocked:') ||
    /\b402\b|insufficient balance|billing|payment required|quota exceeded|invalid api key|unauthorized|forbidden/.test(normalized) ||
    /(?:\b404\b.*\bmodel\b|\bmodel\b.*(?:not found|no longer available|unsupported|does not exist))/.test(normalized) ||
    /rate limit|timeout|fetch failed|network|temporarily unavailable|\b5\d\d\b/.test(normalized)
  ) return 'infrastructure';
  if (
    normalized.startsWith('setup_blocked:') ||
    normalized.startsWith('human_gate:') ||
    errorMsg.startsWith('PUBLISHED_SETUP_KERNEL_MISSING') ||
    errorMsg.startsWith('SETUP_KERNEL_DEAD_LETTER') ||
    errorMsg.startsWith('CHAPTER_BLUEPRINT_MISSING_OR_INVALID') ||
    errorMsg.startsWith('FLAGSHIP_STORY_SPEC_INVALID') ||
    errorMsg.startsWith('FLAGSHIP_CHAPTER_PLAN_INVALID')
  ) return 'setup';
  if (
    normalized.startsWith('quality_rejected:') ||
    normalized.includes('failed quality gate') ||
    normalized.includes('flagship_quality_rejected') ||
    normalized.includes('critical contradictions') ||
    normalized.includes('bridge broken')
  ) return 'quality';
  return 'unknown';
}

export function computeRecoverableRoutineRetryDelayMinutes(
  retryCount: number,
  maxFastRetries: number,
): number {
  if (retryCount < maxFastRetries) return 3;
  const slowRetryIndex = Math.max(0, retryCount - maxFastRetries);
  return Math.min(180, 15 * (2 ** Math.min(slowRetryIndex, 4)));
}

export function isDailyQuotaDue(
  quota: {
    status?: string | null;
    written_chapters?: number | null;
    target_chapters?: number | null;
    next_due_at?: string | null;
  },
  now: Date = new Date(),
): boolean {
  if (quota.status === 'completed' || quota.status === 'infra_blocked') return false;
  const written = Number(quota.written_chapters ?? 0);
  const target = Number(quota.target_chapters ?? 0);
  if (!Number.isFinite(written) || !Number.isFinite(target)) return true;
  if (written >= target) return false;
  if (!quota.next_due_at) return true;

  const nextDueMs = Date.parse(quota.next_due_at);
  if (!Number.isFinite(nextDueMs)) return true;
  return nextDueMs <= now.getTime();
}
