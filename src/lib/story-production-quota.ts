const FALLBACK_DAILY_CHAPTER_QUOTA = 20;

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
