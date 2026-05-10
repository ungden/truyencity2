import {
  computeQuotaCadenceCeiling,
  computeQuotaInitialCadenceMinutes,
  computeRecoverableRoutineRetryDelayMinutes,
  getDefaultDailyChapterQuota,
  getProjectDailyChapterQuota,
  isRecoverableRoutineWriteError,
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

    expect(isDailyQuotaDue({
      status: 'active',
      written_chapters: '2' as unknown as number,
      target_chapters: '55' as unknown as number,
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

  it('treats routine writer gate failures as recoverable but keeps setup/blueprint faults hard', () => {
    expect(isRecoverableRoutineWriteError(
      'FLASH_CHEAP_GATE_BLOCKED: word_count_low:Chuong 2160 tu | unscheduled_rival_intrusion',
    )).toBe(true);
    expect(isRecoverableRoutineWriteError('timeout calling deepseek')).toBe(true);
    expect(isRecoverableRoutineWriteError('CHAPTER_BLUEPRINT_MISSING_OR_INVALID: missing ch43')).toBe(false);
    expect(isRecoverableRoutineWriteError('PUBLISHED_SETUP_KERNEL_MISSING')).toBe(false);
  });

  it('backs off recoverable routine retries without making them permanent stops', () => {
    expect(computeRecoverableRoutineRetryDelayMinutes(1, 5)).toBe(3);
    expect(computeRecoverableRoutineRetryDelayMinutes(4, 5)).toBe(3);
    expect(computeRecoverableRoutineRetryDelayMinutes(5, 5)).toBe(15);
    expect(computeRecoverableRoutineRetryDelayMinutes(6, 5)).toBe(30);
    expect(computeRecoverableRoutineRetryDelayMinutes(8, 5)).toBe(120);
    expect(computeRecoverableRoutineRetryDelayMinutes(12, 5)).toBe(180);
  });
});
