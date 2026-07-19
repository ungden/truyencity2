import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  MACHINE_JUDGE_LINEAGES_V3,
  MachineCalibrationCorpusV3Schema,
  MachineJudgmentV3Schema,
  SequentialSurvivalCorpusV3Schema,
  type MachineCalibrationCorpusV3,
  type SequentialSurvivalCorpusV3,
} from './calibration';

const digest = z.string().regex(/^[a-f0-9]{64}$/);

export const MachineCalibrationPairV3Schema = z.object({
  sampleId: z.string().trim().min(3),
  projectId: z.string().uuid(),
  chapterNumber: z.number().int().min(1).max(10),
  planDigest: digest,
  initialDraftDigest: digest,
  brief: z.unknown(),
  candidate: z.object({ title: z.string().min(1), content: z.string().min(1000) }).strict(),
  control: z.object({ title: z.string().min(1), content: z.string().min(1000) }).strict(),
}).strict();

export const MachineCalibrationPairCorpusV3Schema = z.object({
  schemaVersion: z.literal(3),
  campaignId: z.string().uuid(),
  corpusVersion: z.string().trim().min(3),
  promptVersion: z.string().trim().min(3),
  routeVersion: z.string().trim().min(3),
  engineReleaseId: z.string().regex(/^fv3_[a-f0-9]{16}$/),
  launchPackDigests: z.array(digest).length(5),
  pairs: z.array(MachineCalibrationPairV3Schema).length(50),
}).strict();

export type MachineCalibrationPairCorpusV3 = z.infer<typeof MachineCalibrationPairCorpusV3Schema>;

export const BlindMachineJudgmentOutputV3Schema = z.object({
  preferred: z.enum(['a', 'b', 'tie']),
  desireToReadNextA: z.boolean(),
  desireToReadNextB: z.boolean(),
  criticalContinuityViolationA: z.boolean(),
  criticalContinuityViolationB: z.boolean(),
  evidence: z.array(z.object({
    spanLabel: z.enum(['a', 'b']),
    excerpt: z.string().trim().min(1).max(800),
    reason: z.string().trim().min(5).max(800),
  }).strict()).min(1).max(8),
}).strict();

export type BlindMachineJudgmentOutputV3 = z.infer<typeof BlindMachineJudgmentOutputV3Schema>;

function candidateIsA(sampleId: string): boolean {
  return Number.parseInt(createHash('sha256').update(sampleId).digest('hex').slice(0, 2), 16) % 2 === 0;
}

export function buildBlindMachineJudgePromptV3(pair: z.infer<typeof MachineCalibrationPairV3Schema>): {
  prompt: string;
  candidateLabel: 'a' | 'b';
} {
  const candidateLabel = candidateIsA(pair.sampleId) ? 'a' : 'b';
  const options = candidateLabel === 'a'
    ? { a: pair.candidate, b: pair.control }
    : { a: pair.control, b: pair.candidate };
  return {
    candidateLabel,
    prompt: `Blind review hai phiên bản của cùng một chapter brief. Không đoán model, provider, route, chi phí hoặc verdict trước đó.
BRIEF=${JSON.stringify(pair.brief)}
OPTION_A=${JSON.stringify(options.a)}
OPTION_B=${JSON.stringify(options.b)}
Chọn bản có nhân quả, continuity, giọng nhân vật, độ tự nhiên và lực đọc tiếp tốt hơn. Đánh desireToReadNext và criticalContinuityViolation riêng cho A và B; critical chỉ true khi chính option đó có lỗi canon/timeline/resource/knowledge nghiêm trọng. Evidence phải trích đúng option. Chỉ trả JSON theo schema.`,
  };
}

export async function runMachineEnsembleV3(
  rawCorpus: MachineCalibrationPairCorpusV3,
  rawSequential: SequentialSurvivalCorpusV3,
  dependencies: {
    judge(input: {
      lineage: typeof MACHINE_JUDGE_LINEAGES_V3[number];
      sampleId: string;
      prompt: string;
    }): Promise<BlindMachineJudgmentOutputV3>;
  },
): Promise<MachineCalibrationCorpusV3> {
  const corpus = MachineCalibrationPairCorpusV3Schema.parse(rawCorpus);
  const sequential = SequentialSurvivalCorpusV3Schema.parse(rawSequential);
  if (sequential.engineReleaseId !== corpus.engineReleaseId
    || sequential.routeVersion !== corpus.routeVersion
    || JSON.stringify(sequential.launchPackDigests) !== JSON.stringify(corpus.launchPackDigests)) {
    throw new Error('Machine calibration preference and sequential-survival corpora do not share one release/route/launch-pack set.');
  }
  const operationalByKey = new Map(sequential.samples.map(sample => [`${sample.projectId}/${sample.chapterNumber}`, sample]));
  const samples = [];
  for (const pair of corpus.pairs) {
    const blind = buildBlindMachineJudgePromptV3(pair);
    const operational = operationalByKey.get(`${pair.projectId}/${pair.chapterNumber}`);
    if (!operational) throw new Error(`Missing sequential outcome for ${pair.projectId}/${pair.chapterNumber}.`);
    const judgments = [];
    for (const lineage of MACHINE_JUDGE_LINEAGES_V3) {
      const raw = await dependencies.judge({ lineage, sampleId: pair.sampleId, prompt: blind.prompt });
      const output = BlindMachineJudgmentOutputV3Schema.parse(raw);
      const preferred = output.preferred === 'tie'
        ? 'tie' as const
        : output.preferred === blind.candidateLabel ? 'candidate' as const : 'control' as const;
      judgments.push(MachineJudgmentV3Schema.parse({
        judgeLineage: lineage,
        preferred,
      desireToReadNext: blind.candidateLabel === 'a' ? output.desireToReadNextA : output.desireToReadNextB,
      criticalContinuityViolation: blind.candidateLabel === 'a'
        ? output.criticalContinuityViolationA
        : output.criticalContinuityViolationB,
        evidence: output.evidence.map(item => ({
          spanLabel: item.spanLabel === blind.candidateLabel ? 'candidate' : 'control',
          excerpt: item.excerpt,
          reason: item.reason,
        })),
      }));
    }
    samples.push({
      sampleId: pair.sampleId,
      projectId: pair.projectId,
      chapterNumber: pair.chapterNumber,
      planDigest: pair.planDigest,
      initialDraftDigest: pair.initialDraftDigest,
      attempted: operational.attempted,
      terminalStatus: operational.terminalStatus,
      sourceRunDigest: operational.sourceRunDigest,
      schemaSuccess: operational.schemaSuccess,
      planSuccess: operational.planSuccess,
      infraSuccess: operational.infraSuccess,
      firstPassPublished: operational.firstPassPublished,
      publishedWithinRepair: operational.publishedWithinRepair,
      publishedCostUsd: operational.publishedCostUsd,
      judgments,
    });
  }
  return MachineCalibrationCorpusV3Schema.parse({
    schemaVersion: 3,
    calibrationMode: 'machine_ensemble',
    campaignId: corpus.campaignId,
    corpusVersion: corpus.corpusVersion,
    promptVersion: corpus.promptVersion,
    routeVersion: corpus.routeVersion,
    engineReleaseId: corpus.engineReleaseId,
    launchPackDigests: corpus.launchPackDigests,
    samples,
  });
}
