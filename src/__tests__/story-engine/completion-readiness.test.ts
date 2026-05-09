import {
  appendForecastHistory,
  evaluateCompletionReadinessFacts,
} from '@/services/story-engine/codex-automation/completion-readiness';

const healthyWindow = {
  latestContinuityVerdict: 'pass' as const,
  latestMemoryOk: true,
  latestQualityVerdict: 'pass' as const,
  recentPassRate: 1,
  recentAverageScore: 90,
  recentBlockCount: 0,
  recentReviseCount: 0,
  recentEndingGreenWindows: 2,
};

describe('completion readiness for focus bulk', () => {
  it('does not stop at forecast when the story is not ending-ready', () => {
    const report = evaluateCompletionReadinessFacts({
      projectId: 'p',
      currentChapter: 961,
      forecastChapters: 961,
      ...healthyWindow,
      openCriticalThreads: 1,
      openMainThreads: 3,
      openSubThreads: 7,
      majorThreadsWithPayoffPlan: 1,
    });
    expect(report.verdict).toBe('continue');
    expect(report.shouldExtendForecast).toBe(true);
    expect(report.nextForecastChapters).toBeGreaterThan(961);
    expect(report.shouldEnterFinale).toBe(false);
  });

  it('records forecast extension history instead of forcing a finale', () => {
    const report = evaluateCompletionReadinessFacts({
      projectId: 'p',
      currentChapter: 1000,
      forecastChapters: 1000,
      ...healthyWindow,
      openMainThreads: 2,
    });
    const style = appendForecastHistory({ codex_focus_bulk: true }, report, '2026-05-08T00:00:00.000Z');
    expect(style.forecast_chapters).toBe(report.nextForecastChapters);
    expect(style.forecast_history).toEqual([
      expect.objectContaining({ from: 1000, to: report.nextForecastChapters }),
    ]);
  });

  it('enters finale only when major threads are paid or planned and recent windows are green', () => {
    const report = evaluateCompletionReadinessFacts({
      projectId: 'p',
      currentChapter: 120,
      forecastChapters: 600,
      ...healthyWindow,
      openCriticalThreads: 0,
      openMainThreads: 1,
      openSubThreads: 4,
      majorThreadsWithPayoffPlan: 1,
      unresolvedCliffhanger: false,
    });
    expect(report.verdict).toBe('enter_finale');
    expect(report.shouldEnterFinale).toBe(true);
  });

  it('does not enter finale if recent quality has revise/block signals', () => {
    const report = evaluateCompletionReadinessFacts({
      projectId: 'p',
      currentChapter: 120,
      forecastChapters: 600,
      latestContinuityVerdict: 'pass',
      latestMemoryOk: true,
      latestQualityVerdict: 'pass',
      recentPassRate: 0.9,
      recentAverageScore: 88,
      recentBlockCount: 0,
      recentReviseCount: 1,
      recentEndingGreenWindows: 2,
      openCriticalThreads: 0,
      openMainThreads: 0,
      majorThreadsWithPayoffPlan: 0,
    });
    expect(report.verdict).toBe('continue');
    expect(report.shouldEnterFinale).toBe(false);
  });

  it('marks complete only when finale mode has closed cleanly', () => {
    const report = evaluateCompletionReadinessFacts({
      projectId: 'p',
      currentChapter: 180,
      forecastChapters: 600,
      ...healthyWindow,
      finaleMode: true,
      finalChapterClosed: true,
      openCriticalThreads: 0,
      openMainThreads: 0,
      unresolvedCliffhanger: false,
    });
    expect(report.verdict).toBe('complete');
    expect(report.shouldMarkCompleted).toBe(true);
  });

  it('requires repair when latest continuity or memory health fails', () => {
    const report = evaluateCompletionReadinessFacts({
      projectId: 'p',
      currentChapter: 20,
      forecastChapters: 600,
      ...healthyWindow,
      latestContinuityVerdict: 'block',
      latestMemoryOk: false,
    });
    expect(report.verdict).toBe('repair');
    expect(report.blockers).toEqual(expect.arrayContaining(['latest continuity verdict=block', 'latest memory health failed']));
  });
});
