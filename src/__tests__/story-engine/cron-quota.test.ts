import {
  computeQuotaCadenceCeiling,
  computeQuotaInitialCadenceMinutes,
  getDefaultDailyChapterQuota,
  getProjectDailyChapterQuota,
  isDailyQuotaDue,
} from '@/lib/story-production-quota';

describe('story production quota', () => {
  it('uses WRITE_CHAPTERS_DAILY_QUOTA as the default quota', () => {
    expect(getDefaultDailyChapterQuota({ WRITE_CHAPTERS_DAILY_QUOTA: '50' } as unknown as NodeJS.ProcessEnv)).toBe(50);
  });

  it('lets project style_directives override the default quota', () => {
    const quota = getProjectDailyChapterQuota(
      { style_directives: { production_daily_chapter_quota: 50 } },
      { WRITE_CHAPTERS_DAILY_QUOTA: '20' } as unknown as NodeJS.ProcessEnv,
    );

    expect(quota).toBe(50);
  });

  it('computes initial due cadence from the effective quota', () => {
    expect(computeQuotaInitialCadenceMinutes(120, 50)).toBe(2);
    expect(computeQuotaInitialCadenceMinutes(120, 20)).toBe(6);
  });

  it('uses the effective quota for next_due_at cadence ceilings', () => {
    expect(computeQuotaCadenceCeiling(120, 50, true)).toBe(3);
    expect(computeQuotaCadenceCeiling(120, 20, true)).toBe(6);
    expect(computeQuotaCadenceCeiling(120, 50, false)).toBe(5);
  });

  it('parses database timestamptz offsets when checking due quotas', () => {
    const now = new Date('2026-05-09T18:16:00.000Z');

    expect(isDailyQuotaDue({
      status: 'active',
      written_chapters: 2,
      target_chapters: 55,
      next_due_at: '2026-05-09T18:14:48.083+00:00',
    }, now)).toBe(true);
  });

  it('does not mark future or completed quotas as due', () => {
    const now = new Date('2026-05-09T18:16:00.000Z');

    expect(isDailyQuotaDue({
      status: 'active',
      written_chapters: 2,
      target_chapters: 55,
      next_due_at: '2026-05-09T18:20:00.000+00:00',
    }, now)).toBe(false);

    expect(isDailyQuotaDue({
      status: 'completed',
      written_chapters: 55,
      target_chapters: 55,
      next_due_at: '2026-05-09T18:14:48.083+00:00',
    }, now)).toBe(false);
  });
});
