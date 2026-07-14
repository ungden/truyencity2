import { z } from 'zod';
import { ArcPlanV2Schema, ChapterPlanV2Schema, PleasureProfileV2Schema, StorySpecV2ObjectSchema, StorySpecV2Schema, StoryStateV2Schema } from './contracts';
import { GenreLaneV2Schema, PromotionCohortV1Schema } from './portfolio-taxonomy';
import { PortfolioSlotIdV1Schema } from './portfolio';
import { ChineseBenchmarkIdV1Schema } from './chinese-benchmark';
import { FlagshipMarketTitleV1Schema } from './market-title';

const concrete = z.string().trim().min(20);
const named = z.string().trim().min(2);
const conceptId = z.string().regex(/^concept_[a-z0-9_-]+$/);
const conceptText = concrete.max(360);

export const FlagshipSetupBriefV2Schema = z.object({
  schemaVersion: z.literal(2),
  language: z.literal('vi'),
  portfolioSlotId: PortfolioSlotIdV1Schema,
  genreLane: GenreLaneV2Schema,
  laneCardIds: z.array(z.string().regex(/^market_[a-z0-9_-]+$/)).min(1).max(4),
  distinctnessFingerprint: z.string().min(12),
  researchQuestions: z.array(concrete).min(3).max(8),
  promotionCohort: PromotionCohortV1Schema,
  genre: StorySpecV2ObjectSchema.shape.genre,
  audience: concrete,
  desiredExperience: concrete,
  domain: concrete,
  pleasureProfile: PleasureProfileV2Schema,
  boundaries: z.array(concrete).min(3).max(12),
  researchNotes: z.array(z.object({ source: concrete, finding: concrete }).strict()).min(3).max(20),
  seedConstraints: z.array(concrete).max(10),
}).strict();

export const ConceptCandidateV2Schema = z.object({
  id: conceptId,
  workingTitle: named.max(80),
  readerCuriosity: conceptText,
  readerFantasy: conceptText,
  premise: conceptText,
  irreversibleProblem: conceptText,
  protagonistContradiction: conceptText,
  domainMechanism: conceptText,
  conflictEngine: conceptText,
  emotionalCore: conceptText,
  differenceClaim: conceptText,
  nearestComparisonRisk: conceptText,
  serialityProof: conceptText,
  openingAdvantage: conceptText,
  progressionProof: conceptText,
  worldProof: z.object({
    signatureSituations: z.array(conceptText).length(3),
    institutionalReaction: conceptText,
    resourceCirculation: conceptText,
    thirtyChapterMutation: conceptText,
  }).strict(),
  antiCloneFingerprint: z.string().trim().min(12).max(240),
}).strict();

export const ConceptBatchV2Schema = z.object({
  schemaVersion: z.literal(2),
  candidates: z.array(ConceptCandidateV2Schema).length(20),
}).strict();

export const PairwiseMatchV2Schema = z.object({
  leftId: conceptId,
  rightId: conceptId,
  winnerId: conceptId,
  reason: concrete,
}).strict().superRefine((match, ctx) => {
  if (match.leftId === match.rightId || ![match.leftId, match.rightId].includes(match.winnerId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['winnerId'], message: 'Winner must be one of two different candidates.' });
  }
});

export const WorldKernelTrialV2Schema = z.object({
  candidateId: conceptId,
  signatureSituations: z.array(concrete).length(3),
  rules: z.array(StorySpecV2ObjectSchema.shape.causalWorldRules.element).length(3),
  resources: z.array(StorySpecV2ObjectSchema.shape.resourceEconomy.element).min(2).max(3),
  institutionalResponses: z.array(z.object({
    name: named,
    power: concrete,
    incentive: concrete,
    enforcementEvidence: concrete,
    pressureOnCast: concrete,
  }).strict()).min(2).max(3),
  thirtyChapterMutation: concrete,
}).strict();

export const ConceptRankingV2Schema = z.object({
  schemaVersion: z.literal(2),
  matches: z.array(PairwiseMatchV2Schema).min(3).max(190),
  ranking: z.array(z.object({ id: conceptId, wins: z.number().int().min(0), reason: concrete }).strict()).min(3).max(20),
  finalistIds: z.array(conceptId).length(3),
  finalistWorldKernels: z.array(WorldKernelTrialV2Schema).length(3),
}).strict();

export const OpeningChapterTrialV2Schema = z.object({
  chapterNumber: z.number().int().min(1).max(3),
  title: named,
  prose: z.string().trim().min(1200),
  causalStateChange: concrete,
  requiredPlanAnchor: z.string().trim().min(8).max(160),
  protagonistChoice: concrete,
  agencyMove: concrete,
  earnedReward: concrete.nullable(),
  materialProgression: concrete.nullable(),
  comfortPayoff: concrete.nullable(),
  costPaid: concrete,
  exitPressure: concrete,
}).strict();

export const OpeningChapterTransportV2Schema = OpeningChapterTrialV2Schema.omit({ prose: true }).extend({
  // A short spoken line can be a legitimate paragraph. Judge chapter substance by
  // total prose length instead of forcing every paragraph to satisfy a prose quota.
  proseParagraphs: z.array(z.string().trim().min(2).max(600)).min(8).max(20),
}).strict().superRefine((chapter, ctx) => {
  if (chapter.proseParagraphs.join('\n\n').length < 1200) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['proseParagraphs'], message: 'Opening prose paragraphs must total at least 1200 characters.' });
  }
});

export const OpeningTrialTransportV2Schema = z.object({
  schemaVersion: z.literal(2),
  candidateId: conceptId,
  chapters: z.array(OpeningChapterTransportV2Schema).length(3),
  continuityDigest: concrete,
  unresolvedPressure: concrete,
}).strict().superRefine((trial, ctx) => {
  const chapterThree = trial.chapters.find(chapter => chapter.chapterNumber === 3);
  for (const key of ['earnedReward', 'materialProgression', 'comfortPayoff'] as const) {
    if (!chapterThree?.[key]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chapters', 2, key], message: `${key} must be earned by chapter 3.` });
  }
});

export const OpeningTrialV2Schema = z.object({
  schemaVersion: z.literal(2),
  candidateId: conceptId,
  chapters: z.array(OpeningChapterTrialV2Schema).length(3),
  continuityDigest: concrete,
  unresolvedPressure: concrete,
}).strict().superRefine((trial, ctx) => {
  const sequence = trial.chapters.map(chapter => chapter.chapterNumber).sort();
  if (JSON.stringify(sequence) !== JSON.stringify([1, 2, 3])) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chapters'], message: 'Opening trial must contain chapters 1, 2 and 3 exactly once.' });
  }
  const chapterThree = trial.chapters.find(chapter => chapter.chapterNumber === 3);
  for (const key of ['earnedReward', 'materialProgression', 'comfortPayoff'] as const) {
    if (!chapterThree?.[key]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chapters', 2, key], message: `${key} must be earned by chapter 3.` });
  }
});

export const ConceptTournamentArtifactV2Schema = z.object({
  schemaVersion: z.literal(2),
  promptVersion: z.string().min(3),
  benchmarkId: ChineseBenchmarkIdV1Schema.nullable(),
  concepts: z.array(ConceptCandidateV2Schema).min(3).max(20),
  rejectedNearDuplicateIds: z.array(conceptId),
  ranking: ConceptRankingV2Schema,
  openings: z.array(OpeningTrialV2Schema).length(3),
  status: z.literal('awaiting_human_selection'),
}).strict();

export const HumanConceptSelectionV2Schema = z.object({
  schemaVersion: z.literal(2),
  candidateId: conceptId,
  approvedTitle: FlagshipMarketTitleV1Schema,
  approvedBy: z.string().trim().min(2),
  rationale: concrete,
  approvedAt: z.string().datetime(),
}).strict();

export const CharacterDesignV2Schema = z.object({
  schemaVersion: z.literal(2),
  protagonist: StorySpecV2ObjectSchema.shape.protagonist,
  cast: StorySpecV2ObjectSchema.shape.cast,
  relationshipConflicts: z.array(z.object({
    left: named,
    right: named,
    incompatibleNeeds: concrete,
    mutualDependence: concrete,
    likelyBreakingPoint: concrete,
  }).strict()).min(3).max(12),
}).strict();

export const CausalWorldV2Schema = z.object({
  schemaVersion: z.literal(2),
  rules: StorySpecV2ObjectSchema.shape.causalWorldRules,
  resources: StorySpecV2ObjectSchema.shape.resourceEconomy,
  institutions: z.array(z.object({
    name: named,
    power: concrete,
    incentive: concrete,
    enforcementEvidence: concrete,
    pressureOnCast: concrete,
  }).strict()).min(2).max(8),
  knowledgeDistribution: z.array(z.object({ holder: named, knows: concrete, doesNotKnow: concrete }).strict()).min(3).max(12),
}).strict();

export const FlagshipLaunchPackV2Schema = z.object({
  schemaVersion: z.literal(2),
  selectedConceptId: conceptId,
  storySpec: StorySpecV2Schema,
  arcPlan: ArcPlanV2Schema,
  storyState: StoryStateV2Schema,
  rollingChapterPlans: z.array(ChapterPlanV2Schema).length(5),
  status: z.literal('awaiting_story_spec_approval'),
}).strict().superRefine((pack, ctx) => {
  if (pack.arcPlan.startChapter !== 1 || pack.arcPlan.endChapter < 20 || pack.arcPlan.endChapter > 30) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['arcPlan'], message: 'First arc must cover chapters 1 through 20-30.' });
  }
  if (pack.storyState.chapterNumber !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['storyState', 'chapterNumber'], message: 'Launch state must start at chapter 0.' });
  }
  const chapters = pack.rollingChapterPlans.map(plan => plan.chapterNumber).sort((a, b) => a - b);
  if (JSON.stringify(chapters) !== JSON.stringify([1, 2, 3, 4, 5])) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rollingChapterPlans'], message: 'Launch pack must contain rolling plans 1-5.' });
  }
});

export const RollingPlanWindowV2Schema = z.object({
  schemaVersion: z.literal(2),
  startChapter: z.number().int().min(1),
  endChapter: z.number().int().min(1),
  plans: z.array(ChapterPlanV2Schema).length(5),
}).strict().superRefine((window, ctx) => {
  if (window.endChapter !== window.startChapter + 4) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endChapter'], message: 'Rolling window must cover exactly five chapters.' });
  }
  const expected = Array.from({ length: 5 }, (_, index) => window.startChapter + index);
  const actual = window.plans.map(plan => plan.chapterNumber);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plans'], message: 'Plans must be ordered and contiguous.' });
  }
  for (let index = 1; index < window.plans.length; index += 1) {
    if (JSON.stringify(window.plans[index - 1].stateAfter) !== JSON.stringify(window.plans[index].stateBefore)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plans', index, 'stateBefore'], message: 'Each plan must begin at the prior plan stateAfter.' });
    }
  }
});

export type FlagshipSetupBriefV2 = z.infer<typeof FlagshipSetupBriefV2Schema>;
export type ConceptCandidateV2 = z.infer<typeof ConceptCandidateV2Schema>;
export type ConceptBatchV2 = z.infer<typeof ConceptBatchV2Schema>;
export type ConceptRankingV2 = z.infer<typeof ConceptRankingV2Schema>;
export type WorldKernelTrialV2 = z.infer<typeof WorldKernelTrialV2Schema>;
export type OpeningTrialV2 = z.infer<typeof OpeningTrialV2Schema>;
export type OpeningTrialTransportV2 = z.infer<typeof OpeningTrialTransportV2Schema>;
export type ConceptTournamentArtifactV2 = z.infer<typeof ConceptTournamentArtifactV2Schema>;
export type HumanConceptSelectionV2 = z.infer<typeof HumanConceptSelectionV2Schema>;
export type CharacterDesignV2 = z.infer<typeof CharacterDesignV2Schema>;
export type CausalWorldV2 = z.infer<typeof CausalWorldV2Schema>;
export type FlagshipLaunchPackV2 = z.infer<typeof FlagshipLaunchPackV2Schema>;
export type RollingPlanWindowV2 = z.infer<typeof RollingPlanWindowV2Schema>;
