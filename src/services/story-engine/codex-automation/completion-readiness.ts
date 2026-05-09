export type CompletionReadinessVerdict = 'continue' | 'enter_finale' | 'complete' | 'repair';

export interface CompletionReadinessFacts {
  projectId: string;
  currentChapter: number;
  forecastChapters: number;
  minChaptersBeforeFinale?: number;
  finaleMode?: boolean;
  finalChapterClosed?: boolean;
  latestContinuityVerdict?: 'pass' | 'revise' | 'block' | null;
  latestMemoryOk?: boolean | null;
  latestQualityVerdict?: 'pass' | 'revise' | 'block' | null;
  recentPassRate?: number | null;
  recentAverageScore?: number | null;
  recentBlockCount?: number;
  recentReviseCount?: number;
  recentEndingGreenWindows?: number;
  openCriticalThreads?: number;
  openMainThreads?: number;
  openSubThreads?: number;
  majorThreadsWithPayoffPlan?: number;
  unresolvedCliffhanger?: boolean;
}

export interface CompletionReadinessReport {
  projectId: string;
  verdict: CompletionReadinessVerdict;
  currentChapter: number;
  forecastChapters: number;
  shouldExtendForecast: boolean;
  nextForecastChapters?: number;
  shouldEnterFinale: boolean;
  shouldMarkCompleted: boolean;
  reasons: string[];
  blockers: string[];
  metrics: {
    recentPassRate: number | null;
    recentAverageScore: number | null;
    recentEndingGreenWindows: number;
    openCriticalThreads: number;
    openMainThreads: number;
    openSubThreads: number;
    majorThreadsWithPayoffPlan: number;
  };
}

export interface ForecastExtensionEntry {
  at: string;
  from: number;
  to: number;
  reason: string;
}

export const DEFAULT_FOCUS_PROJECT_TITLE = 'Thực Thần Đô Thị';

function boundedForecastExtension(forecastChapters: number): number {
  const block = Math.min(100, Math.max(50, Math.ceil(Math.max(forecastChapters, 1) * 0.08)));
  return forecastChapters + block;
}

function isHealthyRecentWindow(facts: CompletionReadinessFacts): boolean {
  return (
    (facts.recentPassRate ?? 0) >= 0.95 &&
    (facts.recentAverageScore ?? 0) >= 82 &&
    (facts.recentBlockCount || 0) === 0 &&
    (facts.recentReviseCount || 0) === 0 &&
    (facts.recentEndingGreenWindows || 0) >= 2
  );
}

export function evaluateCompletionReadinessFacts(facts: CompletionReadinessFacts): CompletionReadinessReport {
  const currentChapter = Math.max(0, facts.currentChapter || 0);
  const forecastChapters = Math.max(1, facts.forecastChapters || 1);
  const minChaptersBeforeFinale = facts.minChaptersBeforeFinale ?? 30;
  const openCriticalThreads = facts.openCriticalThreads || 0;
  const openMainThreads = facts.openMainThreads || 0;
  const openSubThreads = facts.openSubThreads || 0;
  const majorThreadsWithPayoffPlan = facts.majorThreadsWithPayoffPlan || 0;
  const blockers: string[] = [];
  const reasons: string[] = [];

  if (facts.latestContinuityVerdict && facts.latestContinuityVerdict !== 'pass') {
    blockers.push(`latest continuity verdict=${facts.latestContinuityVerdict}`);
  }
  if (facts.latestMemoryOk === false) blockers.push('latest memory health failed');
  if (facts.latestQualityVerdict && facts.latestQualityVerdict !== 'pass') {
    blockers.push(`latest quality verdict=${facts.latestQualityVerdict}`);
  }
  if ((facts.recentBlockCount || 0) > 0) blockers.push(`recent block count=${facts.recentBlockCount}`);

  const nearOrPastForecast = currentChapter >= Math.max(1, forecastChapters - 5);
  const healthyRecentWindow = isHealthyRecentWindow(facts);
  const majorOpenThreads = openCriticalThreads + openMainThreads;
  const hasPayoffPlanForMajorThreads = majorOpenThreads === 0 || majorThreadsWithPayoffPlan >= majorOpenThreads;
  const hasNarrativeMass = currentChapter >= minChaptersBeforeFinale;
  const canEnterFinale = (
    hasNarrativeMass &&
    healthyRecentWindow &&
    openCriticalThreads === 0 &&
    openMainThreads <= 1 &&
    hasPayoffPlanForMajorThreads &&
    !facts.unresolvedCliffhanger
  );
  const canComplete = Boolean(
    facts.finaleMode &&
    facts.finalChapterClosed &&
    healthyRecentWindow &&
    majorOpenThreads === 0 &&
    !facts.unresolvedCliffhanger,
  );

  if (blockers.length > 0) {
    return {
      projectId: facts.projectId,
      verdict: 'repair',
      currentChapter,
      forecastChapters,
      shouldExtendForecast: false,
      shouldEnterFinale: false,
      shouldMarkCompleted: false,
      reasons,
      blockers,
      metrics: {
        recentPassRate: facts.recentPassRate ?? null,
        recentAverageScore: facts.recentAverageScore ?? null,
        recentEndingGreenWindows: facts.recentEndingGreenWindows || 0,
        openCriticalThreads,
        openMainThreads,
        openSubThreads,
        majorThreadsWithPayoffPlan,
      },
    };
  }

  if (canComplete) {
    reasons.push('finale mode is closed cleanly and recent quality windows are green');
    return {
      projectId: facts.projectId,
      verdict: 'complete',
      currentChapter,
      forecastChapters,
      shouldExtendForecast: false,
      shouldEnterFinale: false,
      shouldMarkCompleted: true,
      reasons,
      blockers,
      metrics: {
        recentPassRate: facts.recentPassRate ?? null,
        recentAverageScore: facts.recentAverageScore ?? null,
        recentEndingGreenWindows: facts.recentEndingGreenWindows || 0,
        openCriticalThreads,
        openMainThreads,
        openSubThreads,
        majorThreadsWithPayoffPlan,
      },
    };
  }

  if (canEnterFinale) {
    reasons.push('major threads are paid/planned and ending readiness windows are green');
    return {
      projectId: facts.projectId,
      verdict: 'enter_finale',
      currentChapter,
      forecastChapters,
      shouldExtendForecast: false,
      shouldEnterFinale: true,
      shouldMarkCompleted: false,
      reasons,
      blockers,
      metrics: {
        recentPassRate: facts.recentPassRate ?? null,
        recentAverageScore: facts.recentAverageScore ?? null,
        recentEndingGreenWindows: facts.recentEndingGreenWindows || 0,
        openCriticalThreads,
        openMainThreads,
        openSubThreads,
        majorThreadsWithPayoffPlan,
      },
    };
  }

  if (nearOrPastForecast) {
    reasons.push('story is near/past forecast but not ending-ready; forecast should extend instead of forcing finale');
  } else {
    reasons.push('story is not completion-ready yet; continue the next sequential chapter');
  }

  return {
    projectId: facts.projectId,
    verdict: 'continue',
    currentChapter,
    forecastChapters,
    shouldExtendForecast: nearOrPastForecast,
    nextForecastChapters: nearOrPastForecast ? boundedForecastExtension(forecastChapters) : undefined,
    shouldEnterFinale: false,
    shouldMarkCompleted: false,
    reasons,
    blockers,
    metrics: {
      recentPassRate: facts.recentPassRate ?? null,
      recentAverageScore: facts.recentAverageScore ?? null,
      recentEndingGreenWindows: facts.recentEndingGreenWindows || 0,
      openCriticalThreads,
      openMainThreads,
      openSubThreads,
      majorThreadsWithPayoffPlan,
    },
  };
}

export function appendForecastHistory(
  styleDirectives: Record<string, unknown> | null | undefined,
  report: CompletionReadinessReport,
  at = new Date().toISOString(),
): Record<string, unknown> {
  const existing = styleDirectives || {};
  const history = Array.isArray(existing.forecast_history)
    ? existing.forecast_history as ForecastExtensionEntry[]
    : [];
  if (!report.shouldExtendForecast || !report.nextForecastChapters) {
    return {
      ...existing,
      forecast_chapters: report.forecastChapters,
    };
  }
  return {
    ...existing,
    forecast_chapters: report.nextForecastChapters,
    forecast_history: [
      ...history,
      {
        at,
        from: report.forecastChapters,
        to: report.nextForecastChapters,
        reason: report.reasons.join('; ') || 'not ending-ready',
      },
    ],
  };
}
