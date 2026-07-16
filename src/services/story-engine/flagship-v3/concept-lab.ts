import { createHash } from 'node:crypto';
import { z } from 'zod';
import { FlagshipV3Error } from './pipeline';

const id = z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/);
const text = z.string().trim().min(12);
const detailed = z.string().trim().min(24);

export const MarketResearchSnapshotV3Schema = z.object({
  schemaVersion: z.literal(3),
  snapshotId: id,
  genreLane: z.string().trim().min(2).max(80),
  refreshedAt: z.string().datetime(),
  sources: z.array(z.object({
    id,
    url: z.string().url(),
    title: text,
    publisher: z.string().trim().min(2),
    observedAt: z.string().datetime(),
  }).strict()).min(3).max(30),
  signals: z.array(z.object({
    id,
    claim: detailed,
    sourceIds: z.array(id).min(1).max(8),
    confidence: z.number().min(0).max(1),
  }).strict()).min(3).max(20),
  prohibitedDirectImitation: z.array(text).min(3).max(20),
}).strict().superRefine((snapshot, ctx) => {
  const sourceIds = new Set(snapshot.sources.map(source => source.id));
  for (const [index, signal] of snapshot.signals.entries()) {
    if (signal.sourceIds.some(sourceId => !sourceIds.has(sourceId))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['signals', index, 'sourceIds'], message: 'Signal references an unknown source.' });
    }
  }
});

export type MarketResearchSnapshotV3 = z.infer<typeof MarketResearchSnapshotV3Schema>;

export const ConceptCandidateV3Schema = z.object({
  id,
  title: z.string().trim().min(8).max(220),
  premise: detailed,
  protagonistEngine: detailed,
  worldReaction: detailed,
  openingAdvantage: detailed,
  mechanismFingerprint: z.array(text).min(3).max(8),
  rewardLoopFingerprint: z.array(text).min(3).max(8),
  conflictEconomyFingerprint: z.array(text).min(3).max(8),
  seriality30: z.array(detailed).min(5).max(10),
  antiStupidOpponent: detailed,
  domainResearchNeeds: z.array(text).min(2).max(8),
}).strict();
export type ConceptCandidateV3 = z.infer<typeof ConceptCandidateV3Schema>;

export const ConceptBatchV3Schema = z.object({
  schemaVersion: z.literal(3),
  generatorId: id,
  candidates: z.array(ConceptCandidateV3Schema).length(10),
}).strict();

export const ConceptPairwiseJudgeV3Schema = z.object({
  schemaVersion: z.literal(3),
  judgeId: id,
  comparisons: z.array(z.object({
    leftId: id,
    rightId: id,
    winnerId: id,
    reason: detailed,
  }).strict()).length(190),
}).strict();

export const OpeningTrialV3Schema = z.object({
  schemaVersion: z.literal(3),
  candidateId: id,
  chapters: z.array(z.object({
    chapterNumber: z.number().int().min(1).max(3),
    title: z.string().trim().min(2).max(160),
    proseParagraphs: z.array(z.string().trim().min(20)).min(8).max(60),
    stateChange: detailed,
    earnedReward: detailed,
    unresolvedPressure: detailed,
  }).strict()).length(3),
}).strict().superRefine((trial, ctx) => {
  trial.chapters.forEach((chapter, index) => {
    if (chapter.chapterNumber !== index + 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chapters', index, 'chapterNumber'], message: 'Opening chapters must be 1, 2, 3.' });
    }
  });
});

export type OpeningTrialV3 = z.infer<typeof OpeningTrialV3Schema>;

export const OpeningReviewV3Schema = z.object({
  schemaVersion: z.literal(3),
  judgeId: id,
  ranking: z.array(id).length(3),
  scores: z.array(z.object({
    candidateId: id,
    openingPull: z.number().min(0).max(10),
    worldSpecificity: z.number().min(0).max(10),
    protagonistAgency: z.number().min(0).max(10),
    causalReward: z.number().min(0).max(10),
    characterLife: z.number().min(0).max(10),
    seriality30: z.number().min(0).max(10),
    proseNaturalness: z.number().min(0).max(10),
    readChapter4: z.number().min(0).max(10),
    criticalFails: z.array(z.string().trim().min(3)).max(10),
    evidence: z.array(z.object({
      chapterNumber: z.number().int().min(1).max(3),
      excerpt: z.string().trim().min(8).max(500),
      reason: text,
    }).strict()).min(2).max(8),
  }).strict()).length(3),
}).strict();

export interface ConceptTournamentV3Result {
  candidates: ConceptCandidateV3[];
  finalists: ConceptCandidateV3[];
  openingTrials: OpeningTrialV3[];
  openingReviews: z.infer<typeof OpeningReviewV3Schema>[];
  selected: ConceptCandidateV3;
  callCount: 11;
}

function parse<T>(schema: z.ZodType<T>, raw: string, label: string): T {
  let value: unknown;
  try {
    value = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch (caught) {
    throw new FlagshipV3Error('infra_blocked', `${label} returned invalid JSON.`, String(caught));
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new FlagshipV3Error('infra_blocked', `${label} violated its exact schema.`, parsed.error.issues);
  return parsed.data;
}

function fingerprint(candidate: ConceptCandidateV3): string {
  return createHash('sha256').update(JSON.stringify({
    mechanism: [...candidate.mechanismFingerprint].sort(),
    reward: [...candidate.rewardLoopFingerprint].sort(),
    conflict: [...candidate.conflictEconomyFingerprint].sort(),
  })).digest('hex');
}

function assertDistinctCandidates(candidates: ConceptCandidateV3[]): void {
  const ids = new Set(candidates.map(candidate => candidate.id));
  const fingerprints = new Set(candidates.map(fingerprint));
  if (ids.size !== 20) throw new FlagshipV3Error('setup_blocked', 'Concept Lab did not produce 20 unique candidate ids.');
  if (fingerprints.size !== 20) throw new FlagshipV3Error('setup_blocked', 'Concept Lab produced cloned mechanics with renamed surface details.');
}

function assertCompletePairwise(
  candidates: ConceptCandidateV3[],
  judge: z.infer<typeof ConceptPairwiseJudgeV3Schema>,
): void {
  const ids = new Set(candidates.map(candidate => candidate.id));
  const pairs = new Set<string>();
  for (const comparison of judge.comparisons) {
    if (!ids.has(comparison.leftId) || !ids.has(comparison.rightId) || !ids.has(comparison.winnerId)) {
      throw new FlagshipV3Error('setup_blocked', `${judge.judgeId} referenced an unknown candidate.`);
    }
    if (comparison.leftId === comparison.rightId || ![comparison.leftId, comparison.rightId].includes(comparison.winnerId)) {
      throw new FlagshipV3Error('setup_blocked', `${judge.judgeId} returned an invalid pairwise winner.`);
    }
    pairs.add([comparison.leftId, comparison.rightId].sort().join(':'));
  }
  if (pairs.size !== 190) throw new FlagshipV3Error('setup_blocked', `${judge.judgeId} did not compare every candidate pair exactly once.`);
}

const conceptPrompt = (snapshot: MarketResearchSnapshotV3, generator: string): string =>
  `GENERATOR=${generator}\nMARKET_RESEARCH=${JSON.stringify(snapshot)}\nTạo đúng 10 concept nam tần khác cơ chế, không mô phỏng trực tiếp tác phẩm nguồn.`;

const judgePrompt = (candidates: ConceptCandidateV3[], judge: string): string =>
  `JUDGE=${judge}\nCANDIDATES=${JSON.stringify(candidates)}\nBlind pairwise toàn bộ 190 cặp. Chấm cơ chế, nhân vật, causal world và khả năng biến hóa 30 chương.`;

const openingPrompt = (candidate: ConceptCandidateV3): string =>
  `CANDIDATE=${JSON.stringify(candidate)}\nMô phỏng ba chương mở đầu: main chủ động ở chương 1, lợi ích cụ thể trước hết chương 3, không đối thủ ngu hay tài nguyên vô nguồn.`;

const reviewPrompt = (trials: OpeningTrialV3[], judge: string): string =>
  `JUDGE=${judge}\nBLIND_OPENINGS=${JSON.stringify(trials)}\nXếp hạng ba opening và cung cấp evidence prose thật.`;

export async function runConceptTournamentV3(input: {
  snapshot: MarketResearchSnapshotV3;
  invoke: (call: { role: 'concept_generator' | 'concept_judge' | 'opening_simulator' | 'opening_judge'; index: number; prompt: string }) => Promise<string>;
}): Promise<ConceptTournamentV3Result> {
  const batches = await Promise.all([0, 1].map(async index =>
    parse(ConceptBatchV3Schema, await input.invoke({
      role: 'concept_generator',
      index,
      prompt: conceptPrompt(input.snapshot, `generator_${index + 1}`),
    }), `Concept Generator ${index + 1}`),
  ));
  const candidates = batches.flatMap(batch => batch.candidates);
  assertDistinctCandidates(candidates);

  const judges = await Promise.all([0, 1, 2].map(async index => {
    const judge = parse(ConceptPairwiseJudgeV3Schema, await input.invoke({
      role: 'concept_judge',
      index,
      prompt: judgePrompt(candidates, `judge_${index + 1}`),
    }), `Concept Judge ${index + 1}`);
    assertCompletePairwise(candidates, judge);
    return judge;
  }));
  const wins = new Map(candidates.map(candidate => [candidate.id, 0]));
  judges.forEach(judge => judge.comparisons.forEach(comparison =>
    wins.set(comparison.winnerId, (wins.get(comparison.winnerId) || 0) + 1),
  ));
  const finalists = [...candidates].sort((left, right) =>
    (wins.get(right.id) || 0) - (wins.get(left.id) || 0) || left.id.localeCompare(right.id),
  ).slice(0, 3);

  const openingTrials = await Promise.all(finalists.map(async (candidate, index) => {
    const trial = parse(OpeningTrialV3Schema, await input.invoke({
      role: 'opening_simulator',
      index,
      prompt: openingPrompt(candidate),
    }), `Opening Simulator ${candidate.id}`);
    if (trial.candidateId !== candidate.id) throw new FlagshipV3Error('setup_blocked', 'Opening Simulator changed candidate identity.');
    return trial;
  }));

  const openingReviews = await Promise.all([0, 1, 2].map(async index => {
    const review = parse(OpeningReviewV3Schema, await input.invoke({
      role: 'opening_judge',
      index,
      prompt: reviewPrompt(openingTrials, `opening_judge_${index + 1}`),
    }), `Opening Judge ${index + 1}`);
    const finalistIds = new Set(finalists.map(candidate => candidate.id));
    if (new Set(review.ranking).size !== 3 || review.ranking.some(candidateId => !finalistIds.has(candidateId))) {
      throw new FlagshipV3Error('setup_blocked', 'Opening Judge returned an invalid blind ranking.');
    }
    return review;
  }));

  const rankPoints = new Map(finalists.map(candidate => [candidate.id, 0]));
  openingReviews.forEach(review => review.ranking.forEach((candidateId, index) =>
    rankPoints.set(candidateId, (rankPoints.get(candidateId) || 0) + (3 - index)),
  ));
  const selected = [...finalists].sort((left, right) =>
    (rankPoints.get(right.id) || 0) - (rankPoints.get(left.id) || 0) || left.id.localeCompare(right.id),
  )[0];
  return { candidates, finalists, openingTrials, openingReviews, selected, callCount: 11 };
}
