import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  ChapterPlanSchema,
  PlanAssessmentSchema,
  StoryKernelSchema,
  StoryStateSchema,
  type ChapterPlan,
  type StoryKernel,
  type StoryState,
} from './contracts';
import {
  geminiProvider,
  type ProviderUsage,
  type StoryModelProvider,
} from './provider';

export const STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL = 'story-factory-writer-bakeoff-v2-plan-qualified';
export const STORY_FACTORY_SEQUENTIAL_PROTOCOL = 'story-factory-sequential-survival-v1';
export const STORY_FACTORY_BENCHMARK_PROTOCOL = 'story-factory-validation-v3-sequential-reader';
export const STORY_FACTORY_BENCHMARK_SAMPLE_COUNT = 20;
export const STORY_FACTORY_WRITER_SAMPLE_COUNT = 10;

export const BenchmarkRouteSchema = z.object({
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

const PlanPassSchema = PlanAssessmentSchema.options[0];

export const PlanQualifiedWriterBriefSchema = z.object({
  id: z.string().trim().min(3).max(120),
  lane: z.string().trim().min(2).max(80),
  launchPackDigest: z.string().length(64),
  planDigest: z.string().length(64),
  kernel: StoryKernelSchema,
  state: StoryStateSchema,
  plan: ChapterPlanSchema,
  previousTail: z.string().max(8_000).nullable(),
  planAssessment: PlanPassSchema,
}).strict();

export const WriterBakeoffCorpusSchema = z.object({
  protocolVersion: z.literal(STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL),
  engineRelease: z.string().trim().min(4),
  builtAt: z.string().datetime(),
  planner: z.string().trim().min(3),
  planJudge: z.string().trim().min(3),
  sourceSequentialDigest: z.string().length(64),
  samples: z.array(PlanQualifiedWriterBriefSchema).length(STORY_FACTORY_WRITER_SAMPLE_COUNT),
}).strict().superRefine((corpus, ctx) => {
  if (new Set(corpus.samples.map(sample => sample.id)).size !== STORY_FACTORY_WRITER_SAMPLE_COUNT) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Writer brief IDs must be unique.' });
  }
  if (new Set(corpus.samples.map(sample => sample.lane)).size !== 4) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Writer bake-off must cover all four lanes.' });
  }
  for (const sample of corpus.samples) {
    if (sample.state.chapterNumber !== sample.plan.chapterNumber - 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['samples'],
        message: `Writer brief ${sample.id} does not start from the immediately preceding committed state.`,
      });
    }
  }
});

export const ContinuityIssueSchema = z.object({
  category: z.enum([
    'previous_ending',
    'timeline_location',
    'resource_ledger',
    'character_memory',
    'relationship_agenda',
    'emotion_reset',
    'world_rule',
  ]),
  severity: z.enum(['critical', 'major']),
  currentEvidence: z.string().trim().min(1).max(800),
  previousOrStateEvidence: z.string().trim().min(1).max(800),
  explanation: z.string().trim().min(5).max(1_000),
}).strict();

const continuityChecks = z.object({
  previousEndingRespected: z.boolean(),
  stateLedgerRespected: z.boolean(),
  characterMemoryRespected: z.boolean(),
  agendaAndEmotionProgress: z.boolean(),
}).strict();

export const ContinuityAssessmentSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('pass'),
    checks: continuityChecks.extend({
      previousEndingRespected: z.literal(true),
      stateLedgerRespected: z.literal(true),
      characterMemoryRespected: z.literal(true),
      agendaAndEmotionProgress: z.literal(true),
    }).strict(),
    issues: z.array(z.never()).length(0),
  }).strict(),
  z.object({
    status: z.literal('fail'),
    checks: continuityChecks,
    issues: z.array(ContinuityIssueSchema).min(1).max(4),
  }).strict(),
]);

export const SequentialBenchmarkSampleSchema = z.object({
  id: z.string().trim().min(3).max(120),
  lane: z.string().trim().min(2).max(80),
  launchPackDigest: z.string().length(64),
  planDigest: z.string().length(64),
  readerBrief: ReaderBriefSchema,
  content: z.string().trim().min(20),
  title: z.string().trim().min(2).max(180),
  allInCostUsd: z.number().nonnegative(),
  revisionCount: z.union([z.literal(0), z.literal(1)]),
  planAssessment: PlanPassSchema,
  continuityAssessment: ContinuityAssessmentSchema.options[0],
  stateBeforeDigest: z.string().length(64),
  stateAfterDigest: z.string().length(64),
}).strict();

export const SequentialBenchmarkCorpusSchema = z.object({
  protocolVersion: z.literal(STORY_FACTORY_SEQUENTIAL_PROTOCOL),
  engineRelease: z.string().trim().min(4),
  builtAt: z.string().datetime(),
  route: BenchmarkRouteSchema,
  continuityJudgeModel: z.string().trim().min(3),
  launchPackDigests: z.array(z.string().length(64)).length(4),
  setupSuccesses: z.literal(4),
  planSuccesses: z.literal(4),
  providerFailures: z.literal(0),
  generationFailures: z.literal(0),
  continuityFailures: z.literal(0),
  windowReviewFailures: z.literal(0),
  buildCostUsd: z.number().nonnegative(),
  samples: z.array(SequentialBenchmarkSampleSchema).length(STORY_FACTORY_BENCHMARK_SAMPLE_COUNT),
  windowReviews: z.array(z.object({
    lane: z.string().trim().min(2).max(80),
    status: z.literal('pass'),
  }).strict()).length(4),
}).strict().superRefine((corpus, ctx) => {
  if (new Set(corpus.samples.map(sample => sample.id)).size !== STORY_FACTORY_BENCHMARK_SAMPLE_COUNT) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Sequential sample IDs must be unique.' });
  }
  if (new Set(corpus.launchPackDigests).size !== 4) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['launchPackDigests'], message: 'Sequential launch packs must be unique.' });
  }
  const knownDigests = new Set(corpus.launchPackDigests);
  if (corpus.samples.some(sample => !knownDigests.has(sample.launchPackDigest))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Every sample must reference one launch pack.' });
  }
  const lanes = new Set(corpus.samples.map(sample => sample.lane));
  if (lanes.size !== 4 || [...lanes].some(lane => corpus.samples.filter(sample => sample.lane === lane).length !== 5)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['samples'], message: 'Sequential survival requires four lanes with five chapters each.' });
  }
  for (const lane of lanes) {
    const samples = corpus.samples.filter(sample => sample.lane === lane);
    for (let index = 1; index < samples.length; index += 1) {
      if (samples[index - 1].stateAfterDigest !== samples[index].stateBeforeDigest) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['samples'],
          message: `Lane ${lane} does not consume the exact state committed by its previous chapter.`,
        });
      }
    }
  }
});

export const ReaderJudgmentSchema = z.object({
  wantsNext: z.boolean(),
  reason: z.string().trim().min(5).max(2_000),
}).strict();

export const StoredReaderJudgmentSchema = ReaderJudgmentSchema.extend({
  sampleId: z.string().trim().min(3),
  model: z.string().trim().min(3),
  blinded: z.literal(true),
  usage: z.unknown(),
}).strict();

export const ValidationMetricsSchema = z.object({
  samplesExpected: z.literal(STORY_FACTORY_BENCHMARK_SAMPLE_COUNT),
  samplesCompleted: z.literal(STORY_FACTORY_BENCHMARK_SAMPLE_COUNT),
  judgeLineages: z.literal(3),
  desireToReadNext: z.number().min(0).max(1),
  criticalContinuityViolations: z.literal(0),
  firstPassPublishRate: z.number().min(0).max(1),
  finalPublishRate: z.literal(1),
  medianAllInCostUsd: z.number().nonnegative(),
  maxAllInCostUsd: z.number().nonnegative(),
  sequentialCostUsd: z.number().nonnegative(),
  judgmentCostUsd: z.number().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
}).strict();

export const ValidationManifestSchema = z.object({
  protocolVersion: z.literal(STORY_FACTORY_BENCHMARK_PROTOCOL),
  engineRelease: z.string().trim().min(4),
  route: BenchmarkRouteSchema,
  continuityJudgeModel: z.string().trim().min(3),
  judgeModels: z.array(z.string().trim().min(3)).length(3),
  launchPackDigests: z.array(z.string().length(64)).length(4),
  writerBakeoffRunId: z.string().uuid(),
  writerCorpusDigest: z.string().length(64),
  sequentialRunId: z.string().uuid(),
  corpusDigest: z.string().length(64),
  artifactStorageKey: z.string().trim().min(10),
  artifactSha256: z.string().length(64),
  metrics: ValidationMetricsSchema,
  passed: z.boolean(),
}).strict();

export type PlanQualifiedWriterBrief = z.infer<typeof PlanQualifiedWriterBriefSchema>;
export type WriterBakeoffCorpus = z.infer<typeof WriterBakeoffCorpusSchema>;
export type ContinuityAssessment = z.infer<typeof ContinuityAssessmentSchema>;
export type SequentialBenchmarkCorpus = z.infer<typeof SequentialBenchmarkCorpusSchema>;
export type StoredReaderJudgment = z.infer<typeof StoredReaderJudgmentSchema>;
export type ValidationMetrics = z.infer<typeof ValidationMetricsSchema>;
export type ValidationManifest = z.infer<typeof ValidationManifestSchema>;

export function digestArtifact(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildBlindReaderInput(input: {
  sample: z.infer<typeof SequentialBenchmarkSampleSchema>;
}) {
  return {
    premise: input.sample.readerBrief.premise,
    chapterNumber: input.sample.readerBrief.chapterNumber,
    previousTail: input.sample.readerBrief.previousTail,
    prose: input.sample.content,
  };
}

export async function assessSequentialContinuity(input: {
  kernel: StoryKernel;
  plan: ChapterPlan;
  stateBefore: StoryState;
  stateAfter: StoryState;
  previousTail: string | null;
  content: string;
  model: string;
  provider?: StoryModelProvider;
}): Promise<{ assessment: ContinuityAssessment; usage: ProviderUsage }> {
  const provider = input.provider ?? geminiProvider;
  const result = await provider.json({
    model: input.model,
    system: `Bạn là Continuity Judge độc lập cho truyện dài.
Chỉ kiểm tra chương hiện tại có thực sự nối từ đoạn kết và trạng thái đã commit hay không.
Không chấm văn hay, không thưởng việc bám checklist, không sửa plan và không quyết định xuất bản.
Fail khi nhân vật quên sự kiện/quan hệ, tài nguyên-thời gian-vị trí sai, cảm xúc hoặc agenda bị reset, hay quy tắc thế giới đổi cơ chế.
Mọi issue phải đưa evidence từ prose hiện tại và evidence đối chiếu từ previous tail hoặc state.`,
    prompt: JSON.stringify({
      task: 'Kiểm định continuity của một transition chương.',
      kernel: {
        protagonistId: input.kernel.protagonistId,
        characters: input.kernel.characters,
        worldRules: input.kernel.worldRules.filter(rule => input.plan.requiredWorldRuleIds.includes(rule.id)),
      },
      plan: input.plan,
      stateBefore: input.stateBefore,
      stateAfter: input.stateAfter,
      previousTail: input.previousTail,
      currentProse: input.content,
    }),
    schema: ContinuityAssessmentSchema,
    temperature: 0.2,
  });
  return { assessment: result.value, usage: result.usage };
}

export function calculateValidationMetrics(input: {
  corpus: SequentialBenchmarkCorpus;
  judgments: StoredReaderJudgment[];
  judgeModels: string[];
  judgmentCostUsd: number;
}): ValidationMetrics {
  const corpus = SequentialBenchmarkCorpusSchema.parse(input.corpus);
  if (input.judgeModels.length !== 3 || new Set(input.judgeModels).size !== 3) {
    throw new Error('Reader validation requires exactly three distinct judge lineages.');
  }
  const expectedJudgments = STORY_FACTORY_BENCHMARK_SAMPLE_COUNT * input.judgeModels.length;
  if (input.judgments.length !== expectedJudgments) {
    throw new Error(`Reader validation requires ${expectedJudgments} judgments; received ${input.judgments.length}.`);
  }
  let majorityWantsNext = 0;
  for (const sample of corpus.samples) {
    const sampleJudgments = input.judgments.filter(judgment => judgment.sampleId === sample.id);
    if (sampleJudgments.length !== 3
      || new Set(sampleJudgments.map(judgment => judgment.model)).size !== 3
      || sampleJudgments.some(judgment => !input.judgeModels.includes(judgment.model))) {
      throw new Error(`Sample ${sample.id} does not have three distinct expected reader lineages.`);
    }
    if (sampleJudgments.filter(judgment => judgment.wantsNext).length >= 2) majorityWantsNext += 1;
  }
  const costs = corpus.samples.map(sample => sample.allInCostUsd).sort((a, b) => a - b);
  return ValidationMetricsSchema.parse({
    samplesExpected: 20,
    samplesCompleted: 20,
    judgeLineages: 3,
    desireToReadNext: majorityWantsNext / STORY_FACTORY_BENCHMARK_SAMPLE_COUNT,
    criticalContinuityViolations: 0,
    firstPassPublishRate: corpus.samples.filter(sample => sample.revisionCount === 0).length
      / STORY_FACTORY_BENCHMARK_SAMPLE_COUNT,
    finalPublishRate: 1,
    medianAllInCostUsd: (costs[9] + costs[10]) / 2,
    maxAllInCostUsd: Math.max(...costs),
    sequentialCostUsd: corpus.buildCostUsd,
    judgmentCostUsd: input.judgmentCostUsd,
    totalCostUsd: corpus.buildCostUsd + input.judgmentCostUsd,
  });
}

export function validationPasses(metrics: ValidationMetrics): boolean {
  return metrics.samplesCompleted === STORY_FACTORY_BENCHMARK_SAMPLE_COUNT
    && metrics.judgeLineages === 3
    && metrics.firstPassPublishRate >= 0.85
    && metrics.finalPublishRate === 1
    && metrics.criticalContinuityViolations === 0
    && metrics.desireToReadNext >= 0.75
    && metrics.medianAllInCostUsd <= 0.25
    && metrics.maxAllInCostUsd <= 0.5;
}
