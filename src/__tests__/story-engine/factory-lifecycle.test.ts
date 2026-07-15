import {
  assertFactoryTransition,
  canTransitionFactoryJob,
  decideAfterChapter,
  factoryEligibility,
} from '@/services/story-engine/flagship/factory-lifecycle';
import { hasCompletePersistedRollingWindow } from '@/services/story-engine/flagship/factory-setup';
import { ChapterPlanV2Schema } from '@/services/story-engine/flagship/contracts';
import { readFileSync } from 'fs';
import path from 'path';

describe('flagship factory lifecycle', () => {
  it('has one dedicated scheduler and never revives a legacy writing cron', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      crons?: Array<{ path: string; schedule: string }>;
    };
    expect(vercel.crons).toEqual([{
      path: '/api/cron/flagship-factory',
      schedule: '*/5 * * * *',
    }]);
  });

  it('accepts only an explicit flagship auto opt-in', () => {
    expect(factoryEligibility({
      pipelineVersion: 'flagship_v2', factoryEnabled: true, publicationMode: 'automatic',
      setupStatus: 'ready_to_write', currentChapter: 0,
    }).eligible).toBe(true);
    expect(factoryEligibility({ pipelineVersion: 'legacy', factoryEnabled: true, publicationMode: 'automatic' }).eligible).toBe(false);
    expect(factoryEligibility({ pipelineVersion: 'flagship_v2', factoryEnabled: true, publicationMode: 'human_gate' }).eligible).toBe(false);
    expect(factoryEligibility({ pipelineVersion: 'flagship_v2', factoryEnabled: true, publicationMode: 'automatic', setupStatus: 'rejected' }).eligible).toBe(false);
  });

  it('has no implicit retry from terminal states', () => {
    expect(canTransitionFactoryJob('completed', 'writing')).toBe(false);
    expect(canTransitionFactoryJob('cancelled', 'queued')).toBe(false);
    expect(() => assertFactoryTransition('completed', 'queued')).toThrow('FACTORY_INVALID_TRANSITION');
    expect(canTransitionFactoryJob('infra_blocked', 'queued')).toBe(true);
  });

  it('reuses a complete persisted five-chapter window instead of paying for a duplicate planner call', () => {
    const launchPack = JSON.parse(readFileSync(path.join(
      process.cwd(),
      'blueprints/flagship-portfolio-v1/materialized/hx-04/launch-pack.json',
    ), 'utf8')) as { rollingChapterPlans: unknown[] };
    const rows = launchPack.rollingChapterPlans.map(plan => {
      const parsed = ChapterPlanV2Schema.parse(plan);
      return { chapter_number: parsed.chapterNumber, meta: { chapterPlanV2: parsed } };
    });
    expect(hasCompletePersistedRollingWindow(rows, 1)).toBe(true);
    expect(hasCompletePersistedRollingWindow(rows.slice(0, 4), 1)).toBe(false);
    expect(hasCompletePersistedRollingWindow(rows, 2)).toBe(false);
  });

  const healthy = {
    projectId: 'p', currentChapter: 30, forecastChapters: 1000,
    latestContinuityVerdict: 'pass' as const, latestMemoryOk: true,
    latestQualityVerdict: 'pass' as const, recentPassRate: 1,
    recentAverageScore: 90, recentBlockCount: 0, recentReviseCount: 0,
    recentEndingGreenWindows: 2, openCriticalThreads: 0,
    openMainThreads: 0, openSubThreads: 0, majorThreadsWithPayoffPlan: 0,
  };

  it('continues sequentially and extends forecast only when needed', () => {
    const decision = decideAfterChapter({
      ...healthy, verdict: 'continue', shouldExtendForecast: true,
      nextForecastChapters: 1100, shouldEnterFinale: false,
      shouldMarkCompleted: false, reasons: ['extend'], blockers: [],
      metrics: { recentPassRate: 1, recentAverageScore: 90, recentEndingGreenWindows: 2, openCriticalThreads: 0, openMainThreads: 0, openSubThreads: 0, majorThreadsWithPayoffPlan: 0 },
    }, 1000, 2000);
    expect(decision).toMatchObject({ status: 'ready', stage: 'plan', forecastChapters: 1100 });
  });

  it('blocks quality repair and completes only after clean ending', () => {
    const report = {
      ...healthy, verdict: 'repair' as const, shouldExtendForecast: false,
      shouldEnterFinale: false, shouldMarkCompleted: false, reasons: [],
      blockers: ['continuity'], metrics: { recentPassRate: 1, recentAverageScore: 90, recentEndingGreenWindows: 2, openCriticalThreads: 0, openMainThreads: 0, openSubThreads: 0, majorThreadsWithPayoffPlan: 0 },
    };
    expect(decideAfterChapter(report, 31, 2000).status).toBe('blocked');
    const complete = { ...report, verdict: 'complete' as const, blockers: [], reasons: ['closed'] };
    expect(decideAfterChapter(complete, 31, 2000)).toMatchObject({ status: 'completed', stage: 'completion' });
  });
});
