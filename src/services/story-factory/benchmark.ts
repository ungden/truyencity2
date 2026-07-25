import { createHash } from 'node:crypto';
import { z } from 'zod';

export const STORY_FACTORY_BENCHMARK_PROTOCOL = 'story-factory-benchmark-v2-reader-blind';
export const STORY_FACTORY_BENCHMARK_SAMPLE_COUNT = 20;

const WriterRouteSchema = z.object({
  planner: z.string().trim().min(3),
  planJudge: z.string().trim().min(3),
  writer: z.string().trim().min(3),
  editor: z.string().trim().min(3),
  routeVersion: z.string().trim().min(3),
}).strict();

export const ReaderBriefSchema = z.object({
  premise: z.string().trim().min(20).max(1_500),
  chapterNumber: z.number().int().min(1).max(1_200),
  previousTail: z.string().max(8_000).nullable(),
}).strict();

export const SequentialBenchmarkSampleSchema = z.object({
  id: z.string().trim().min(3).max(120),
  lane: z.string().trim().min(2).max(80),
  launchPackDigest: z.string().length(64),
  readerBrief: ReaderBriefSchema,
  control: z.string().trim().min(20),
  candidate: z.string().trim().min(20),
  candidateTitle: z.string().trim().min(2).max(180),
  candidateCostUsd: z.number().nonnegative(),
  candidateRevisionCount: z.union([z.literal(0), z.literal(1)]),
  continuityPassed: z.literal(true),
}).strict();

export const SequentialBenchmarkCorpusSchema = z.object({
  protocolVersion: z.literal(STORY_FACTORY_BENCHMARK_PROTOCOL),
  engineRelease: z.string().trim().min(4),
  builtAt: z.string().datetime(),
  candidateRoute: WriterRouteSchema,
  controlRoute: WriterRouteSchema,
  launchPackDigests: z.array(z.string().length(64)).length(4),
  setupSuccesses: z.literal(4),
  planSuccesses: z.literal(4),
  providerFailures: z.literal(0),
  generationFailures: z.literal(0),
  buildCostUsd: z.number().nonnegative(),
  samples: z.array(SequentialBenchmarkSampleSchema).length(STORY_FACTORY_BENCHMARK_SAMPLE_COUNT),
}).strict().superRefine((corpus, ctx) => {
  if (new Set(corpus.samples.map(sample => sample.id)).size !== STORY_FACTORY_BENCHMARK_SAMPLE_COUNT) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Benchmark sample IDs must be unique.' });
  }
  if (new Set(corpus.launchPackDigests).size !== 4) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['launchPackDigests'], message: 'Benchmark launch packs must be unique.' });
  }
  const knownDigests = new Set(corpus.launchPackDigests);
  if (corpus.samples.some(sample => !knownDigests.has(sample.launchPackDigest))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Every sample must reference one benchmark launch pack.' });
  }
  const lanes = new Set(corpus.samples.map(sample => sample.lane));
  if (lanes.size !== 4 || [...lanes].some(lane => corpus.samples.filter(sample => sample.lane === lane).length !== 5)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Benchmark requires four lanes with five sequential chapters each.' });
  }
});

export const ReaderJudgmentSchema = z.object({
  preference: z.enum(['A', 'B', 'tie']),
  wantsNextA: z.boolean(),
  wantsNextB: z.boolean(),
  reason: z.string().trim().min(5).max(2_000),
}).strict();

export const StoredReaderJudgmentSchema = ReaderJudgmentSchema.extend({
  sampleId: z.string().trim().min(3),
  model: z.string().trim().min(3),
  blinded: z.literal(true),
  swap: z.boolean(),
  usage: z.unknown(),
}).strict();

export const BenchmarkMetricsV2Schema = z.object({
  samplesExpected: z.literal(STORY_FACTORY_BENCHMARK_SAMPLE_COUNT),
  samplesCompleted: z.literal(STORY_FACTORY_BENCHMARK_SAMPLE_COUNT),
  judgeLineages: z.literal(3),
  majorityPreference: z.number().min(0).max(1),
  desireToReadNext: z.number().min(0).max(1),
  criticalContinuityViolations: z.literal(0),
  firstPassPublishRate: z.number().min(0).max(1),
  finalPublishRate: z.literal(1),
  medianCandidateCostUsd: z.number().nonnegative(),
  maxCandidateCostUsd: z.number().nonnegative(),
  buildCostUsd: z.number().nonnegative(),
  judgmentCostUsd: z.number().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
}).strict();

export const BenchmarkManifestV2Schema = z.object({
  protocolVersion: z.literal(STORY_FACTORY_BENCHMARK_PROTOCOL),
  engineRelease: z.string().trim().min(4),
  candidateRoute: WriterRouteSchema,
  controlRoute: WriterRouteSchema,
  judgeModels: z.array(z.string().trim().min(3)).length(3),
  launchPackDigests: z.array(z.string().length(64)).length(4),
  corpusDigest: z.string().length(64),
  artifactStorageKey: z.string().trim().min(10),
  artifactSha256: z.string().length(64),
  metrics: BenchmarkMetricsV2Schema,
  passed: z.boolean(),
}).strict();

export type SequentialBenchmarkCorpus = z.infer<typeof SequentialBenchmarkCorpusSchema>;
export type StoredReaderJudgment = z.infer<typeof StoredReaderJudgmentSchema>;
export type BenchmarkMetricsV2 = z.infer<typeof BenchmarkMetricsV2Schema>;
export type BenchmarkManifestV2 = z.infer<typeof BenchmarkManifestV2Schema>;

export function digestArtifact(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildBlindReaderInput(input: {
  sample: z.infer<typeof SequentialBenchmarkSampleSchema>;
  swap: boolean;
}) {
  return {
    brief: input.sample.readerBrief,
    versionA: input.swap ? input.sample.candidate : input.sample.control,
    versionB: input.swap ? input.sample.control : input.sample.candidate,
  };
}

export function calculateBenchmarkMetrics(input: {
  corpus: SequentialBenchmarkCorpus;
  judgments: StoredReaderJudgment[];
  judgeModels: string[];
  judgmentCostUsd: number;
}): BenchmarkMetricsV2 {
  const corpus = SequentialBenchmarkCorpusSchema.parse(input.corpus);
  if (input.judgeModels.length !== 3 || new Set(input.judgeModels).size !== 3) {
    throw new Error('Benchmark requires exactly three distinct judge lineages.');
  }
  const expectedJudgments = STORY_FACTORY_BENCHMARK_SAMPLE_COUNT * input.judgeModels.length;
  if (input.judgments.length !== expectedJudgments) {
    throw new Error(`Benchmark requires ${expectedJudgments} judgments; received ${input.judgments.length}.`);
  }
  let majorityWins = 0;
  let majorityWantsNext = 0;
  for (const sample of corpus.samples) {
    const sampleJudgments = input.judgments.filter(judgment => judgment.sampleId === sample.id);
    if (sampleJudgments.length !== 3
      || new Set(sampleJudgments.map(judgment => judgment.model)).size !== 3
      || sampleJudgments.some(judgment => !input.judgeModels.includes(judgment.model))) {
      throw new Error(`Sample ${sample.id} does not have three distinct expected judge lineages.`);
    }
    const candidatePreferred = sampleJudgments.filter(judgment => (
      judgment.preference === (judgment.swap ? 'A' : 'B')
    )).length;
    const wantsCandidate = sampleJudgments.filter(judgment => (
      judgment.swap ? judgment.wantsNextA : judgment.wantsNextB
    )).length;
    if (candidatePreferred >= 2) majorityWins += 1;
    if (wantsCandidate >= 2) majorityWantsNext += 1;
  }
  const costs = corpus.samples.map(sample => sample.candidateCostUsd).sort((a, b) => a - b);
  const metrics = {
    samplesExpected: 20 as const,
    samplesCompleted: 20 as const,
    judgeLineages: 3 as const,
    majorityPreference: majorityWins / STORY_FACTORY_BENCHMARK_SAMPLE_COUNT,
    desireToReadNext: majorityWantsNext / STORY_FACTORY_BENCHMARK_SAMPLE_COUNT,
    criticalContinuityViolations: 0 as const,
    firstPassPublishRate: corpus.samples.filter(sample => sample.candidateRevisionCount === 0).length
      / STORY_FACTORY_BENCHMARK_SAMPLE_COUNT,
    finalPublishRate: 1 as const,
    medianCandidateCostUsd: (costs[9] + costs[10]) / 2,
    maxCandidateCostUsd: Math.max(...costs),
    buildCostUsd: corpus.buildCostUsd,
    judgmentCostUsd: input.judgmentCostUsd,
    totalCostUsd: corpus.buildCostUsd + input.judgmentCostUsd,
  };
  return BenchmarkMetricsV2Schema.parse(metrics);
}

export function benchmarkPasses(metrics: BenchmarkMetricsV2): boolean {
  return metrics.samplesCompleted === STORY_FACTORY_BENCHMARK_SAMPLE_COUNT
    && metrics.judgeLineages === 3
    && metrics.firstPassPublishRate >= 0.85
    && metrics.finalPublishRate === 1
    && metrics.criticalContinuityViolations === 0
    && metrics.majorityPreference >= 0.7
    && metrics.desireToReadNext >= 0.75
    && metrics.medianCandidateCostUsd <= 0.25
    && metrics.maxCandidateCostUsd <= 0.5;
}
