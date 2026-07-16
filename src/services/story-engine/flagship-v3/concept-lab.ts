import { createHash } from 'node:crypto';
import { z } from 'zod';
import { FlagshipV3Error } from './pipeline';

const id = z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/);
const text = z.string().trim().min(12);
const detailed = z.string().trim().min(24);
const fingerprintToken = z.string().trim().min(4).max(120);
export const FLAGSHIP_V3_CONCEPT_PROMPT_VERSION = 'flagship-v3-concept-2026-07-16.2';

export const MarketResearchSnapshotV3Schema = z.object({
  schemaVersion: z.literal(3),
  snapshotId: id,
  genreLane: z.string().trim().min(2).max(80),
  refreshedAt: z.string().datetime(),
  commission: z.object({
    slotId: id,
    audience: detailed,
    desiredExperience: detailed,
    domainOpportunity: detailed,
    requiredMechanisms: z.array(detailed).min(2).max(10),
    openingRequirements: z.array(detailed).min(2).max(10),
    serialityRequirements: z.array(detailed).min(2).max(10),
    boundaries: z.array(text).min(3).max(20),
  }).strict(),
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
  protagonistContradiction: detailed,
  advantageLimits: detailed,
  worldReaction: detailed,
  openingAdvantage: detailed,
  firstThreeChapterMechanism: detailed,
  causalCost: detailed,
  mechanismFingerprint: z.array(fingerprintToken).min(3).max(8),
  rewardLoopFingerprint: z.array(fingerprintToken).min(3).max(8),
  conflictEconomyFingerprint: z.array(fingerprintToken).min(3).max(8),
  seriality30: z.array(detailed).length(5),
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
    reason: text,
  }).strict()).length(190),
}).strict();

export const ConceptPairwiseBatchV3Schema = z.object({
  schemaVersion: z.literal(3),
  judgeId: id,
  batchIndex: z.number().int().min(0).max(20),
  comparisons: z.array(z.object({
    leftId: id,
    rightId: id,
    winnerId: id,
    reason: text,
  }).strict()).min(1).max(20),
}).strict();

export const OpeningTrialV3Schema = z.object({
  schemaVersion: z.literal(3),
  candidateId: id,
  chapters: z.array(z.object({
    chapterNumber: z.number().int().min(1).max(3),
    title: z.string().trim().min(2).max(160),
    proseParagraphs: z.array(z.string().trim().min(20)).min(3).max(30),
    stateChange: detailed,
    earnedReward: detailed,
    unresolvedPressure: detailed,
  }).strict()).length(3),
}).strict().superRefine((trial, ctx) => {
  trial.chapters.forEach((chapter, index) => {
    if (chapter.chapterNumber !== index + 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chapters', index, 'chapterNumber'], message: 'Opening chapters must be 1, 2, 3.' });
    }
    if (chapter.proseParagraphs.join('\n').length < 1000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chapters', index, 'proseParagraphs'], message: 'Each opening simulation must contain at least 1000 prose characters.' });
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
  callCount: number;
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

async function settleAll<T>(promises: Array<Promise<T>>): Promise<T[]> {
  const settled = await Promise.allSettled(promises);
  const rejected = settled.filter((item): item is PromiseRejectedResult => item.status === 'rejected');
  if (rejected.length > 0) throw rejected[0].reason;
  return settled.map(item => (item as PromiseFulfilledResult<T>).value);
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const errors: unknown[] = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        errors.push(error);
      }
    }
  }));
  if (errors.length > 0) throw errors[0];
  return results;
}

const conceptPrompt = (snapshot: MarketResearchSnapshotV3, generator: string): string =>
  `GENERATOR=${generator}
STORY_COMMISSION=${JSON.stringify(snapshot.commission)}
MARKET_RESEARCH=${JSON.stringify({
    snapshotId: snapshot.snapshotId,
    genreLane: snapshot.genreLane,
    sources: snapshot.sources,
    signals: snapshot.signals,
    prohibitedDirectImitation: snapshot.prohibitedDirectImitation,
  })}
Tạo đúng 10 concept nam tần khác cơ chế. Mỗi concept phải thỏa commission riêng, kích hoạt cơ chế trong ba chương đầu, có mâu thuẫn nội tâm và giới hạn lợi thế thật, đủ biến hóa 30 chương, không mô phỏng trực tiếp tác phẩm nguồn.`;

const judgePrompt = (
  snapshot: MarketResearchSnapshotV3,
  candidates: ConceptCandidateV3[],
  judge: string,
  batchIndex: number,
  pairs: Array<{ leftId: string; rightId: string }>,
): string =>
  `JUDGE=${judge}
PAIR_BATCH_INDEX=${batchIndex}
STORY_COMMISSION=${JSON.stringify(snapshot.commission)}
CANDIDATES=${JSON.stringify(candidates)}
REQUIRED_PAIRS=${JSON.stringify(pairs)}
Chấm đúng và đủ các cặp trong REQUIRED_PAIRS, không thêm, không lặp. Chấm mức khớp commission, cơ chế hoạt động trong ba chương đầu, mâu thuẫn và giới hạn của main, causal world, chi phí thật và khả năng biến hóa 30 chương. Loại lợi thế toàn năng, đối thủ ngu, may mắn liên tục và tài nguyên vô nguồn.`;

const openingPrompt = (candidate: ConceptCandidateV3): string =>
  `CANDIDATE=${JSON.stringify(candidate)}\nMô phỏng ba chương mở đầu, mỗi chương ít nhất 1000 ký tự prose: main chủ động ở chương 1, lợi ích cụ thể trước hết chương 3, không đối thủ ngu hay tài nguyên vô nguồn.`;

const reviewPrompt = (trials: OpeningTrialV3[], judge: string): string =>
  `JUDGE=${judge}\nBLIND_OPENINGS=${JSON.stringify(trials)}\nXếp hạng ba opening và cung cấp evidence prose thật.`;

export function assessOpeningFinalistV3(
  reviews: z.infer<typeof OpeningReviewV3Schema>[],
  candidateId: string,
): { viable: boolean; mean: number } {
  const scores = reviews.flatMap(review => review.scores.filter(score => score.candidateId === candidateId));
  if (scores.length !== 3 || scores.some(score => score.criticalFails.length > 0)) {
    return { viable: false, mean: 0 };
  }
  const minimumsPassed = scores.every(score =>
    score.openingPull >= 7.5
    && score.worldSpecificity >= 7.5
    && score.protagonistAgency >= 7.5
    && score.causalReward >= 7.5
    && score.characterLife >= 7
    && score.seriality30 >= 7.5
    && score.proseNaturalness >= 7.5
    && score.readChapter4 >= 7,
  );
  const values = scores.flatMap(score => [
    score.openingPull,
    score.worldSpecificity,
    score.protagonistAgency,
    score.causalReward,
    score.characterLife,
    score.seriality30,
    score.proseNaturalness,
    score.readChapter4,
  ]);
  return {
    viable: minimumsPassed,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

export async function runConceptTournamentV3(input: {
  snapshot: MarketResearchSnapshotV3;
  invoke: (call: {
    role: 'concept_generator' | 'concept_judge' | 'opening_simulator' | 'opening_judge';
    index: number;
    batchIndex?: number;
    pairs?: Array<{ leftId: string; rightId: string }>;
    prompt: string;
  }) => Promise<string>;
}): Promise<ConceptTournamentV3Result> {
  const batches = await settleAll([0, 1].map(async index =>
    parse(ConceptBatchV3Schema, await input.invoke({
      role: 'concept_generator',
      index,
      prompt: `${conceptPrompt(input.snapshot, `generator_${index + 1}`)}
CONTRACT_VERSION=${FLAGSHIP_V3_CONCEPT_PROMPT_VERSION}
Mỗi candidate phải có seriality30 đúng 5 beat khác nhau, bao phủ năm chặng trong 30 chương; không trả 4 hoặc 6 beat.`,
    }), `Concept Generator ${index + 1}`),
  ));
  batches.forEach((batch, index) => {
    if (batch.generatorId !== `generator_${index + 1}`) {
      throw new FlagshipV3Error('infra_blocked', `Concept Generator ${index + 1} changed its required generatorId.`);
    }
  });
  const candidates = batches.flatMap(batch => batch.candidates);
  assertDistinctCandidates(candidates);

  const allPairs = candidates.flatMap((left, leftIndex) =>
    candidates.slice(leftIndex + 1).map(right => ({ leftId: left.id, rightId: right.id })),
  );
  const pairBatches = Array.from({ length: Math.ceil(allPairs.length / 20) }, (_, index) =>
    allPairs.slice(index * 20, index * 20 + 20),
  );
  const judgeBatches: Array<Array<z.infer<typeof ConceptPairwiseBatchV3Schema> | undefined>> =
    Array.from({ length: 3 }, () => new Array(pairBatches.length));
  const judgeTasks = [0, 1, 2].flatMap(index =>
    pairBatches.map((pairs, batchIndex) => ({ index, batchIndex, pairs })),
  );
  await mapConcurrent(judgeTasks, 3, async ({ index, batchIndex, pairs }) => {
      const judgeId = `judge_${index + 1}`;
      const candidateIds = new Set(pairs.flatMap(pair => [pair.leftId, pair.rightId]));
      const batchCandidates = candidates.filter(candidate => candidateIds.has(candidate.id));
      const batch = parse(ConceptPairwiseBatchV3Schema, await input.invoke({
        role: 'concept_judge',
        index,
        batchIndex,
        pairs,
        prompt: judgePrompt(input.snapshot, batchCandidates, judgeId, batchIndex, pairs),
      }), `Concept Judge ${index + 1} batch ${batchIndex}`);
      if (batch.judgeId !== judgeId || batch.batchIndex !== batchIndex) {
        throw new FlagshipV3Error('infra_blocked', `${judgeId} changed its batch identity.`);
      }
      const expected = new Set(pairs.map(pair => [pair.leftId, pair.rightId].sort().join(':')));
      const actual = new Set(batch.comparisons.map(pair => [pair.leftId, pair.rightId].sort().join(':')));
      if (actual.size !== expected.size || [...actual].some(pair => !expected.has(pair))) {
        throw new FlagshipV3Error('infra_blocked', `${judgeId} batch ${batchIndex} did not return exactly the required pairs.`);
      }
      judgeBatches[index][batchIndex] = batch;
      return batch;
  });
  const judges = [0, 1, 2].map(index => {
    const judgeId = `judge_${index + 1}`;
    const comparisons = judgeBatches[index].flatMap(batch => batch?.comparisons || []);
    const judge = ConceptPairwiseJudgeV3Schema.parse({
      schemaVersion: 3,
      judgeId,
      comparisons,
    });
    assertCompletePairwise(candidates, judge);
    return judge;
  });
  const wins = new Map(candidates.map(candidate => [candidate.id, 0]));
  judges.forEach(judge => judge.comparisons.forEach(comparison =>
    wins.set(comparison.winnerId, (wins.get(comparison.winnerId) || 0) + 1),
  ));
  const finalists = [...candidates].sort((left, right) =>
    (wins.get(right.id) || 0) - (wins.get(left.id) || 0) || left.id.localeCompare(right.id),
  ).slice(0, 3);

  const openingTrials = await settleAll(finalists.map(async (candidate, index) => {
    const trial = parse(OpeningTrialV3Schema, await input.invoke({
      role: 'opening_simulator',
      index,
      prompt: openingPrompt(candidate),
    }), `Opening Simulator ${candidate.id}`);
    if (trial.candidateId !== candidate.id) throw new FlagshipV3Error('setup_blocked', 'Opening Simulator changed candidate identity.');
    return trial;
  }));

  const openingReviews = await settleAll([0, 1, 2].map(async index => {
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
  const viable = finalists
    .map(candidate => ({ candidate, score: assessOpeningFinalistV3(openingReviews, candidate.id) }))
    .filter(item => item.score.viable);
  if (viable.length === 0) {
    throw new FlagshipV3Error('setup_blocked', 'No opening finalist passed the causal-world and reader-pull viability gate.');
  }
  const selected = viable.sort((left, right) =>
    (rankPoints.get(right.candidate.id) || 0) - (rankPoints.get(left.candidate.id) || 0)
    || right.score.mean - left.score.mean
    || left.candidate.id.localeCompare(right.candidate.id),
  )[0].candidate;
  return {
    candidates,
    finalists,
    openingTrials,
    openingReviews,
    selected,
    callCount: 2 + pairBatches.length * 3 + 3 + 3,
  };
}
