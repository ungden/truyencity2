import { z } from 'zod';

export const BlindCalibrationSampleV3Schema = z.object({
  id: z.string().trim().min(3),
  preferred: z.enum(['v3', 'baseline', 'tie']),
  firstPassPublished: z.boolean(),
  publishedWithinRevision: z.boolean(),
  criticalContinuityViolation: z.boolean(),
  wantsChapter4: z.boolean(),
  publishedCostUsd: z.number().min(0),
}).strict();

export const BlindCalibrationCorpusV3Schema = z.object({
  schemaVersion: z.literal(3),
  promptVersion: z.string().trim().min(3),
  routeVersion: z.string().trim().min(3),
  engineReleaseId: z.string().regex(/^fv3_[a-f0-9]{16}$/),
  launchPackDigest: z.string().regex(/^[a-f0-9]{64}$/),
  launchPackDigests: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(30),
  approvedBy: z.string().trim().min(3),
  distinctReviewers: z.number().int().min(1),
  samples: z.array(BlindCalibrationSampleV3Schema).min(50),
  evidence: z.array(z.unknown()).max(500).default([]),
}).strict();

export type BlindCalibrationCorpusV3 = z.infer<typeof BlindCalibrationCorpusV3Schema>;

export interface CalibrationMetricsV3 {
  sampleSize: number;
  blindPreferenceRate: number;
  firstPassPublishRate: number;
  withinRevisionPublishRate: number;
  criticalContinuityViolations: number;
  readChapter4Rate: number;
  medianCostUsd: number;
  approved: boolean;
}

const rate = (value: number, total: number): number => Number((total ? value / total : 0).toFixed(4));

export function computeCalibrationMetricsV3(corpus: BlindCalibrationCorpusV3): CalibrationMetricsV3 {
  const samples = corpus.samples;
  const decided = samples.filter(sample => sample.preferred !== 'tie');
  const costs = samples.map(sample => sample.publishedCostUsd).sort((left, right) => left - right);
  const middle = Math.floor(costs.length / 2);
  const medianCostUsd = Number((
    costs.length % 2 ? costs[middle] : (costs[middle - 1] + costs[middle]) / 2
  ).toFixed(6));
  const metrics = {
    sampleSize: samples.length,
    blindPreferenceRate: rate(decided.filter(sample => sample.preferred === 'v3').length, decided.length),
    firstPassPublishRate: rate(samples.filter(sample => sample.firstPassPublished).length, samples.length),
    withinRevisionPublishRate: rate(samples.filter(sample => sample.publishedWithinRevision).length, samples.length),
    criticalContinuityViolations: samples.filter(sample => sample.criticalContinuityViolation).length,
    readChapter4Rate: rate(samples.filter(sample => sample.wantsChapter4).length, samples.length),
    medianCostUsd,
  };
  return {
    ...metrics,
    approved: metrics.sampleSize >= 50
      && metrics.blindPreferenceRate >= 0.65
      && metrics.firstPassPublishRate >= 0.65
      && metrics.withinRevisionPublishRate >= 0.8
      && metrics.criticalContinuityViolations === 0
      && metrics.readChapter4Rate >= 0.7
      && corpus.distinctReviewers >= 5
      && metrics.medianCostUsd <= 0.25,
  };
}

export const MACHINE_JUDGE_LINEAGES_V3 = [
  'google/gemini-2.5-pro',
  'google/gemini-3-flash-preview',
  'google/gemini-3.1-pro-preview',
] as const;

const digest = z.string().regex(/^[a-f0-9]{64}$/);

export const FrozenBriefV3Schema = z.object({
  id: z.string().trim().min(3),
  projectId: z.string().uuid(),
  chapterNumber: z.number().int().min(1).max(10),
  briefDigest: digest,
  planDigest: digest,
  initialDraftDigest: digest,
  brief: z.unknown(),
}).strict();

export const FrozenBriefCorpusV3Schema = z.object({
  schemaVersion: z.literal(3),
  corpusVersion: z.string().trim().min(3),
  engineReleaseId: z.string().regex(/^fv3_[a-f0-9]{16}$/),
  launchPackDigests: z.array(digest).length(5),
  briefs: z.array(FrozenBriefV3Schema).length(50),
}).strict().superRefine((corpus, ctx) => {
  const projects = new Map<string, Set<number>>();
  for (const brief of corpus.briefs) {
    const chapters = projects.get(brief.projectId) || new Set<number>();
    if (chapters.has(brief.chapterNumber)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['briefs'], message: `Duplicate frozen brief ${brief.projectId}/${brief.chapterNumber}.` });
    }
    chapters.add(brief.chapterNumber);
    projects.set(brief.projectId, chapters);
  }
  if (projects.size !== 5 || [...projects.values()].some(chapters => chapters.size !== 10 || [...chapters].some(chapter => chapter < 1 || chapter > 10))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['briefs'], message: 'FrozenBriefCorpusV3 must contain exactly five projects with chapters 1-10 each.' });
  }
});

export type FrozenBriefCorpusV3 = z.infer<typeof FrozenBriefCorpusV3Schema>;

export const SequentialSurvivalSampleV3Schema = z.object({
  sampleId: z.string().trim().min(3),
  projectId: z.string().uuid(),
  chapterNumber: z.number().int().min(1).max(10),
  attempted: z.boolean(),
  terminalStatus: z.enum(['publish','quality_blocked','plan_blocked','infra_blocked','not_attempted']),
  schemaSuccess: z.boolean(),
  planSuccess: z.boolean(),
  infraSuccess: z.boolean(),
  firstPassPublished: z.boolean(),
  publishedWithinRepair: z.boolean(),
  publishedCostUsd: z.number().min(0),
  sourceRunDigest: digest,
}).strict();

export const SequentialSurvivalCorpusV3Schema = z.object({
  schemaVersion: z.literal(3),
  corpusVersion: z.string().trim().min(3),
  routeVersion: z.string().trim().min(3),
  engineReleaseId: z.string().regex(/^fv3_[a-f0-9]{16}$/),
  launchPackDigests: z.array(digest).length(5),
  samples: z.array(SequentialSurvivalSampleV3Schema).length(50),
}).strict().superRefine((corpus, ctx) => {
  const keys = new Set(corpus.samples.map(sample => `${sample.projectId}/${sample.chapterNumber}`));
  if (keys.size !== 50) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Sequential survival must contain five projects by chapters 1-10, including not-attempted outcomes.' });
});

export type SequentialSurvivalCorpusV3 = z.infer<typeof SequentialSurvivalCorpusV3Schema>;

export const MachineJudgmentV3Schema = z.object({
  judgeLineage: z.enum(MACHINE_JUDGE_LINEAGES_V3),
  preferred: z.enum(['candidate', 'control', 'tie']),
  desireToReadNext: z.boolean(),
  criticalContinuityViolation: z.boolean(),
  evidence: z.array(z.object({
    spanLabel: z.enum(['candidate', 'control']),
    excerpt: z.string().trim().min(1).max(800),
    reason: z.string().trim().min(5).max(800),
  }).strict()).min(1).max(8),
}).strict();

export const MachineCalibrationSampleV3Schema = z.object({
  sampleId: z.string().trim().min(3),
  projectId: z.string().uuid(),
  chapterNumber: z.number().int().min(1).max(10),
  planDigest: digest,
  initialDraftDigest: digest,
  attempted: z.boolean(),
  terminalStatus: z.enum(['publish','quality_blocked','plan_blocked','infra_blocked','not_attempted']),
  sourceRunDigest: digest,
  schemaSuccess: z.boolean(),
  planSuccess: z.boolean(),
  infraSuccess: z.boolean(),
  firstPassPublished: z.boolean(),
  publishedWithinRepair: z.boolean(),
  publishedCostUsd: z.number().min(0),
  judgments: z.array(MachineJudgmentV3Schema).length(3),
}).strict().superRefine((sample, ctx) => {
  const lineages = new Set(sample.judgments.map(judgment => judgment.judgeLineage));
  if (lineages.size !== MACHINE_JUDGE_LINEAGES_V3.length
    || MACHINE_JUDGE_LINEAGES_V3.some(lineage => !lineages.has(lineage))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['judgments'], message: 'Every sample requires the three exact independent judge lineages.' });
  }
});

export const MachineCalibrationCorpusV3Schema = z.object({
  schemaVersion: z.literal(3),
  calibrationMode: z.literal('machine_ensemble'),
  campaignId: z.string().uuid(),
  corpusVersion: z.string().trim().min(3),
  promptVersion: z.string().trim().min(3),
  routeVersion: z.string().trim().min(3),
  engineReleaseId: z.string().regex(/^fv3_[a-f0-9]{16}$/),
  launchPackDigests: z.array(digest).length(5),
  samples: z.array(MachineCalibrationSampleV3Schema).length(50),
}).strict().superRefine((corpus, ctx) => {
  const keys = new Set(corpus.samples.map(sample => `${sample.projectId}/${sample.chapterNumber}`));
  if (keys.size !== 50) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Machine calibration samples must be unique by project and chapter.' });
  }
});

export type MachineCalibrationCorpusV3 = z.infer<typeof MachineCalibrationCorpusV3Schema>;

export interface MachineCalibrationMetricsV3 {
  sampleSize: number;
  judgeLineages: string[];
  schemaSuccessRate: number;
  planSuccessRate: number;
  infraSuccessRate: number;
  firstPassPublishRate: number;
  withinRepairPublishRate: number;
  candidateMajorityPreferenceRate: number;
  desireToReadNextRate: number;
  criticalContinuityViolations: number;
  medianCostUsd: number;
  maxCostUsd: number;
  approved: boolean;
}

function hasMajority(sample: z.infer<typeof MachineCalibrationSampleV3Schema>, value: 'candidate' | 'control'): boolean {
  return sample.judgments.filter(judgment => judgment.preferred === value).length >= 2;
}

export function computeMachineCalibrationMetricsV3(corpus: MachineCalibrationCorpusV3): MachineCalibrationMetricsV3 {
  const samples = corpus.samples;
  const costs = samples.map(sample => sample.publishedCostUsd).sort((left, right) => left - right);
  const middle = Math.floor(costs.length / 2);
  const medianCostUsd = Number((costs.length % 2 ? costs[middle] : (costs[middle - 1] + costs[middle]) / 2).toFixed(6));
  const maxCostUsd = Number(Math.max(...costs).toFixed(6));
  const criticalContinuityViolations = samples.filter(sample =>
    sample.judgments.filter(judgment => judgment.criticalContinuityViolation).length >= 2,
  ).length;
  const metrics = {
    sampleSize: samples.length,
    judgeLineages: [...MACHINE_JUDGE_LINEAGES_V3],
    schemaSuccessRate: rate(samples.filter(sample => sample.schemaSuccess).length, samples.length),
    planSuccessRate: rate(samples.filter(sample => sample.planSuccess).length, samples.length),
    infraSuccessRate: rate(samples.filter(sample => sample.infraSuccess).length, samples.length),
    firstPassPublishRate: rate(samples.filter(sample => sample.firstPassPublished).length, samples.length),
    withinRepairPublishRate: rate(samples.filter(sample => sample.publishedWithinRepair).length, samples.length),
    candidateMajorityPreferenceRate: rate(samples.filter(sample => hasMajority(sample, 'candidate')).length, samples.length),
    desireToReadNextRate: rate(samples.filter(sample => sample.judgments.filter(judgment => judgment.desireToReadNext).length >= 2).length, samples.length),
    criticalContinuityViolations,
    medianCostUsd,
    maxCostUsd,
  };
  return {
    ...metrics,
    approved: metrics.sampleSize === 50
      && metrics.judgeLineages.length === 3
      && metrics.schemaSuccessRate === 1
      && metrics.planSuccessRate === 1
      && metrics.infraSuccessRate === 1
      && metrics.firstPassPublishRate >= 0.85
      && metrics.withinRepairPublishRate === 1
      && metrics.candidateMajorityPreferenceRate >= 0.65
      && metrics.desireToReadNextRate >= 0.7
      && metrics.criticalContinuityViolations === 0
      && metrics.medianCostUsd <= 0.25
      && metrics.maxCostUsd <= 0.5,
  };
}
