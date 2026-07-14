import { z } from 'zod';

export const OpeningReviewAxisV1Schema = z.enum([
  'opening_pull',
  'world_specificity',
  'protagonist_agency',
  'causal_reward',
  'character_life',
  'seriality_30',
  'prose_naturalness',
  'read_chapter_4',
]);

export const OpeningCriticalFailV1Schema = z.enum([
  'continuity_or_logic_break',
  'unearned_money_or_resource',
  'passive_protagonist',
  'stupid_opponent_face_slap',
  'generic_world_reskin',
  'prolonged_misery',
  'ai_sounding_prose',
  'domain_falsehood',
]);

const axes = z.object({
  opening_pull: z.number().int().min(1).max(5),
  world_specificity: z.number().int().min(1).max(5),
  protagonist_agency: z.number().int().min(1).max(5),
  causal_reward: z.number().int().min(1).max(5),
  character_life: z.number().int().min(1).max(5),
  seriality_30: z.number().int().min(1).max(5),
  prose_naturalness: z.number().int().min(1).max(5),
  read_chapter_4: z.number().int().min(1).max(5),
}).strict();

export const BlindOpeningBallotV1Schema = z.object({
  blindCode: z.string().regex(/^(HX|TH|DT)\d{2}-[A-C]$/),
  axes,
  criticalFails: z.array(OpeningCriticalFailV1Schema).max(8),
  evidence: z.array(z.object({
    axis: OpeningReviewAxisV1Schema,
    chapterNumber: z.number().int().min(1).max(3),
    span: z.string().trim().min(8).max(600),
    reason: z.string().trim().min(20).max(500),
  }).strict()).min(2).max(8),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().min(30).max(800),
}).strict();

export const BlindSlotReviewV1Schema = z.object({
  schemaVersion: z.literal(1),
  ballots: z.array(BlindOpeningBallotV1Schema).length(3),
}).strict();

export type BlindOpeningBallotV1 = z.infer<typeof BlindOpeningBallotV1Schema>;
export type BlindSlotReviewV1 = z.infer<typeof BlindSlotReviewV1Schema>;

const weights: Record<z.infer<typeof OpeningReviewAxisV1Schema>, number> = {
  opening_pull: 1.5,
  world_specificity: 1.5,
  protagonist_agency: 1.25,
  causal_reward: 1.25,
  character_life: 1,
  seriality_30: 1.25,
  prose_naturalness: 1.5,
  read_chapter_4: 2,
};

export function scoreBlindOpening(ballot: BlindOpeningBallotV1): number {
  const weighted = Object.entries(weights).reduce((total, [axis, weight]) => total + ballot.axes[axis as keyof typeof ballot.axes] * weight, 0);
  const maximum = Object.values(weights).reduce((total, weight) => total + 5 * weight, 0);
  const criticalPenalty = ballot.criticalFails.length * 25;
  return Math.max(0, Math.round((weighted / maximum) * 1000) / 10 - criticalPenalty);
}

export function rankBlindSlotReview(review: BlindSlotReviewV1): Array<BlindOpeningBallotV1 & { score: number }> {
  return review.ballots
    .map(ballot => ({ ...ballot, score: scoreBlindOpening(ballot) }))
    .sort((left, right) => right.score - left.score || right.confidence - left.confidence || left.blindCode.localeCompare(right.blindCode));
}
