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

  it('claims autonomous jobs only inside their Vietnam-day quota and accounts in the chapter transaction', () => {
    const sql = readFileSync('supabase/migrations/20260715212604_flagship_factory_daily_quota_v1.sql', 'utf8');
    expect(sql).toContain("v_vn_date date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date");
    expect(sql).toContain("q.written_chapters < q.target_chapters");
    expect(sql).toContain("AFTER INSERT ON public.chapters");
    expect(sql).toContain("written_chapters = project_daily_quotas.written_chapters + 1");
  });

  it('rearms a canary without reusing checkpoint attempts or stealing an active lease', () => {
    const script = readFileSync('scripts/flagship-start-first-five.ts', 'utf8');
    expect(script).not.toContain('attempt: 0');
    expect(script).toContain('has an active factory lease; refusing to rearm a running job');
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

  it('locks rolling-window identifiers and records typed validation details', () => {
    const planner = readFileSync('src/services/story-engine/flagship/rolling-planner.ts', 'utf8');
    expect(planner).toContain('copy byte-for-byte từ COMMITTED_STATE');
    expect(planner).toContain('failure.detail');
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
