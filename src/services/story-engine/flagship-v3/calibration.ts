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
