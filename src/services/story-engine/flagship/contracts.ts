import { z } from 'zod';
import { GenreLaneV2Schema } from './portfolio-taxonomy';

const nonGeneric = z.string().trim().min(20);
const namedText = z.string().trim().min(2);
const range = (value: string): [number, number] => value.split('-').map(Number) as [number, number];
const contiguousFromOneThroughThirty = (values: string[]): boolean => {
  const ranges = values.map(range).sort((a, b) => a[0] - b[0]);
  let expected = 1;
  for (const [start, end] of ranges) {
    if (start !== expected || end < start) return false;
    expected = end + 1;
  }
  return expected >= 31;
};

export const PleasureProfileV2Schema = z.object({
  realityMode: z.enum(['realistic', 'fictionalized', 'alternate_world']),
  advantage: nonGeneric,
  knowledgeLimit: nonGeneric,
  primaryRewardLoop: z.array(nonGeneric).min(4).max(7),
  comfortLoop: z.array(nonGeneric).min(2).max(6),
  setbackRecoveryWindow: z.number().int().min(1).max(3),
  faceSlapPolicy: nonGeneric,
  progressionSignals: z.array(namedText).min(4).max(10),
}).strict();

export type PleasureProfileV2 = z.infer<typeof PleasureProfileV2Schema>;

export const StorySpecV2ObjectSchema = z.object({
  schemaVersion: z.literal(2),
  pipelineVersion: z.literal('flagship_v2'),
  title: namedText,
  genre: z.enum([
    'tien-hiep', 'huyen-huyen', 'do-thi', 'kiem-hiep', 'lich-su', 'khoa-huyen',
    'vong-du', 'dong-nhan', 'mat-the', 'linh-di', 'quan-truong', 'di-gioi',
    'ngon-tinh', 'quy-tac-quai-dam', 'ngu-thu-tien-hoa', 'khoai-xuyen',
  ]),
  genreLane: GenreLaneV2Schema,
  serialityEngine: z.object({
    recurringSituation: nonGeneric,
    variationAxes: z.array(nonGeneric).min(3).max(8),
    escalationVectors: z.array(nonGeneric).min(3).max(8),
    depletionRisks: z.array(nonGeneric).min(3).max(8),
  }).strict(),
  progressionCurrencies: z.array(z.object({
    name: namedText,
    kind: z.enum(['power', 'material', 'social', 'institutional', 'knowledge', 'life']),
    source: nonGeneric,
    spend: nonGeneric,
    visibility: nonGeneric,
  }).strict()).min(3).max(10),
  storyIdentity: z.object({
    uniqueMechanism: nonGeneric,
    emotionalCore: nonGeneric,
    domainTruthSources: z.array(nonGeneric).min(3).max(10),
    forbiddenGenericMoves: z.array(nonGeneric).min(5).max(20),
    similarityRisks: z.array(nonGeneric).min(3).max(10),
  }).strict(),
  pleasureProfile: PleasureProfileV2Schema,
  readerFantasy: nonGeneric,
  premise: nonGeneric,
  endingDirection: nonGeneric,
  protagonist: z.object({
    name: namedText,
    publicIdentity: nonGeneric,
    desire: nonGeneric,
    fear: nonGeneric,
    contradiction: nonGeneric,
    misbelief: nonGeneric,
    competence: nonGeneric,
    blindSpot: nonGeneric,
    privateAgenda: nonGeneric,
    leverage: nonGeneric,
    moralBoundary: nonGeneric,
    decisionSignature: nonGeneric,
    changeTrigger: nonGeneric,
    voiceContract: nonGeneric,
  }).strict(),
  cast: z.array(z.object({
    name: namedText,
    socialIdentity: nonGeneric,
    agenda: nonGeneric,
    leverage: nonGeneric,
    conflictWithProtagonist: nonGeneric,
    moralBoundary: nonGeneric,
    decisionSignature: nonGeneric,
    relationshipBehavior: nonGeneric,
    voiceContract: nonGeneric,
    firstAppearanceChapter: z.number().int().min(1).max(30),
  }).strict()).min(3).max(8),
  causalWorldRules: z.array(z.object({
    rule: nonGeneric,
    // These are actor labels, not explanatory prose. Requiring 20 characters
    // rewarded padded names and rejected precise groups such as "thợ già".
    beneficiary: namedText,
    harmedParty: namedText,
    enforcement: nonGeneric,
    cost: nonGeneric,
    consequence: nonGeneric,
    evidenceSource: nonGeneric,
    exceptions: nonGeneric,
    sceneAffordances: z.array(nonGeneric).min(2).max(5),
  }).strict()).min(4).max(12),
  resourceEconomy: z.array(z.object({
    resource: namedText,
    source: nonGeneric,
    spendRule: nonGeneric,
    scarcity: nonGeneric,
  })).min(3).max(10),
  conflictLadder: z.array(z.object({
    chapterRange: z.string().regex(/^\d+-\d+$/),
    actor: namedText,
    stake: nonGeneric,
    escalationCause: nonGeneric,
    resolutionChanges: nonGeneric,
  })).min(3).max(6),
  promisePayoffLedger: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]+$/),
    promise: nonGeneric,
    plantedByChapter: z.number().int().min(1).max(30),
    payoffWindow: z.string().regex(/^\d+-\d+$/),
    payoff: nonGeneric,
  })).min(5).max(15),
  runway30: z.array(z.object({
    chapterRange: z.string().regex(/^\d+-\d+$/),
    irreversibleChange: nonGeneric,
    protagonistChoice: nonGeneric,
    payoff: nonGeneric,
  })).min(5).max(10),
  volumeSpine: z.array(z.object({
    name: namedText,
    direction: nonGeneric,
    terminalChange: nonGeneric,
  })).min(3).max(8),
}).strict();

export const StorySpecV2Schema = StorySpecV2ObjectSchema.superRefine((spec, ctx) => {
  const castNames = [spec.protagonist.name, ...spec.cast.map(member => member.name)].map(name => name.toLowerCase());
  if (new Set(castNames).size !== castNames.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cast'], message: 'Protagonist and cast names must be unique.' });
  const resourceNames = spec.resourceEconomy.map(item => item.resource.toLowerCase());
  if (new Set(resourceNames).size !== resourceNames.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resourceEconomy'], message: 'Resource names must be unique.' });
  const promiseIds = spec.promisePayoffLedger.map(item => item.id);
  if (new Set(promiseIds).size !== promiseIds.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['promisePayoffLedger'], message: 'Promise ids must be unique.' });
  if (!contiguousFromOneThroughThirty(spec.conflictLadder.map(item => item.chapterRange))) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['conflictLadder'], message: 'Conflict ladder must cover contiguous chapters 1-30 or more.' });
  if (!contiguousFromOneThroughThirty(spec.runway30.map(item => item.chapterRange))) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['runway30'], message: 'Runway must cover contiguous chapters 1-30.' });
  for (const [index, promise] of spec.promisePayoffLedger.entries()) {
    const [payoffStart, payoffEnd] = range(promise.payoffWindow);
    if (payoffEnd < payoffStart || payoffStart < promise.plantedByChapter) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['promisePayoffLedger', index, 'payoffWindow'], message: 'Payoff window must be ordered after the promise is planted.' });
  }
});

export type StorySpecV2 = z.infer<typeof StorySpecV2Schema>;

export const ArcPlanV2Schema = z.object({
  schemaVersion: z.literal(2),
  arcId: z.string().regex(/^[a-z0-9][a-z0-9_-]+$/),
  startChapter: z.number().int().min(1),
  endChapter: z.number().int().min(1),
  direction: nonGeneric,
  terminalChange: nonGeneric,
  activeConflicts: z.array(z.object({
    actor: namedText,
    objective: nonGeneric,
    leverage: nonGeneric,
    nextMove: nonGeneric,
  }).strict()).min(1).max(8),
  duePromises: z.array(z.string().regex(/^[a-z0-9][a-z0-9_-]+$/)).max(10),
  rollingBeats: z.array(z.object({
    chapterRange: z.string().regex(/^\d+-\d+$/),
    pressure: nonGeneric,
    causalChange: nonGeneric,
  }).strict()).min(2).max(10),
}).strict().superRefine((arc, ctx) => {
  if (arc.endChapter < arc.startChapter || arc.endChapter - arc.startChapter > 29) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endChapter'], message: 'Arc must cover 1-30 ordered chapters.' });
  }
});

export type ArcPlanV2 = z.infer<typeof ArcPlanV2Schema>;

export const StoryStateV2Schema = z.object({
  schemaVersion: z.literal(2),
  chapterNumber: z.number().int().min(0),
  facts: z.record(z.string(), z.string()),
  timeline: z.array(z.object({
    chapter: z.number().int().min(0),
    event: nonGeneric,
  }).strict()).max(80),
  cast: z.array(z.object({
    name: namedText,
    status: z.enum(['alive', 'dead', 'missing', 'unknown']),
    location: z.string().trim().min(2),
    knowledge: z.array(z.string().trim().min(5)).max(20),
    relationshipToProtagonist: z.string().trim().min(5),
  }).strict()).max(20),
  resources: z.array(z.object({
    resource: namedText,
    amount: z.string().trim().min(1),
    source: z.string().trim().min(5),
    lastChangedChapter: z.number().int().min(0),
  }).strict()).max(20),
  promises: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]+$/),
    status: z.enum(['open', 'advanced', 'paid', 'broken']),
    currentPressure: z.string().trim().min(5),
  }).strict()).max(30),
  recentSummary: z.string().max(5000),
  previousEnding: z.string().max(6000),
  retrievalNotes: z.array(z.string().trim().min(10)).max(12),
}).strict();

export type StoryStateV2 = z.infer<typeof StoryStateV2Schema>;

export const ChapterSceneV2Schema = z.object({
  id: z.string().regex(/^scene_[a-z0-9_-]+$/),
  pov: namedText,
  desire: nonGeneric,
  opposition: nonGeneric,
  tactic: nonGeneric,
  irreversibleChange: nonGeneric,
  informationDelta: nonGeneric,
  cost: nonGeneric,
  payoff: nonGeneric,
  exitHook: nonGeneric,
}).strict();

export const ChapterPlanV2Schema = z.object({
  schemaVersion: z.literal(2),
  chapterNumber: z.number().int().min(1),
  chapterPromise: nonGeneric,
  stateBefore: z.record(z.string(), z.string()),
  scenes: z.array(ChapterSceneV2Schema).min(2).max(5),
  stateAfter: z.record(z.string(), z.string()),
  promisesAdvanced: z.array(z.string()).max(5),
  promisesPaid: z.array(z.string()).max(3),
  nextChapterPressure: nonGeneric,
  stateDelta: z.object({
    facts: z.record(z.string(), z.string()),
    cast: z.array(z.object({
      name: namedText,
      status: z.enum(['alive', 'dead', 'missing', 'unknown']).optional(),
      location: z.string().trim().min(2).optional(),
      learned: z.array(z.string().trim().min(5)).max(10),
      relationshipChange: z.string().trim().min(5).optional(),
    }).strict()).max(12),
    resources: z.array(z.object({
      resource: namedText,
      amountAfter: z.string().trim().min(1),
      source: z.string().trim().min(5),
    }).strict()).max(12),
    promises: z.array(z.object({
      id: z.string().regex(/^[a-z0-9][a-z0-9_-]+$/),
      status: z.enum(['open', 'advanced', 'paid', 'broken']),
      currentPressure: z.string().trim().min(5),
    }).strict()).max(10),
  }).strict(),
}).strict();

export type ChapterPlanV2 = z.infer<typeof ChapterPlanV2Schema>;
export type ChapterSceneV2 = z.infer<typeof ChapterSceneV2Schema>;

export interface ContractIssue {
  path: string;
  message: string;
}

export function parseStorySpecV2(input: unknown): { success: true; data: StorySpecV2 } | { success: false; issues: ContractIssue[] } {
  const result = StorySpecV2Schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
  };
}

export function parseChapterPlanV2(input: unknown): { success: true; data: ChapterPlanV2 } | { success: false; issues: ContractIssue[] } {
  const result = ChapterPlanV2Schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
  };
}

export function parseArcPlanV2(input: unknown): { success: true; data: ArcPlanV2 } | { success: false; issues: ContractIssue[] } {
  const result = ArcPlanV2Schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) };
}

export function parseStoryStateV2(input: unknown): { success: true; data: StoryStateV2 } | { success: false; issues: ContractIssue[] } {
  const result = StoryStateV2Schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) };
}

export function sceneCreatesStateChange(scene: ChapterSceneV2): boolean {
  const normalized = `${scene.irreversibleChange} ${scene.informationDelta} ${scene.cost} ${scene.payoff}`.toLowerCase();
  const emptySignals = [
    'không có gì thay đổi', 'mọi thứ như cũ', 'chỉ để giới thiệu', 'không đáng kể',
    'none', 'n/a', 'không có chi phí', 'không có payoff',
  ];
  if (emptySignals.some(signal => normalized.includes(signal))) return false;
  return new Set([
    scene.irreversibleChange.trim().toLowerCase(),
    scene.informationDelta.trim().toLowerCase(),
    scene.cost.trim().toLowerCase(),
    scene.payoff.trim().toLowerCase(),
  ]).size >= 3;
}

export function validateChapterPlanSemantics(plan: ChapterPlanV2): ContractIssue[] {
  const issues: ContractIssue[] = [];
  for (const [index, scene] of plan.scenes.entries()) {
    if (!sceneCreatesStateChange(scene)) {
      issues.push({ path: `scenes.${index}`, message: 'Scene does not create a concrete state change.' });
    }
  }
  const before = JSON.stringify(plan.stateBefore);
  const after = JSON.stringify(plan.stateAfter);
  if (before === after) {
    issues.push({ path: 'stateAfter', message: 'Chapter stateAfter must differ from stateBefore.' });
  }
  return issues;
}

const EXPERIENCE_STOP_WORDS = new Set(['của', 'và', 'cho', 'một', 'những', 'được', 'trong', 'bằng', 'với', 'thành', 'người', 'nhân', 'vật']);

function experienceTokens(values: string[]): string[] {
  return [...new Set(values.join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{4,}/g) || [])]
    .filter(token => !EXPERIENCE_STOP_WORDS.has(token));
}

function planMatchesExperience(plan: ChapterPlanV2, signals: string[]): boolean {
  const haystack = JSON.stringify({ promise: plan.chapterPromise, scenes: plan.scenes.map(scene => scene.payoff), after: plan.stateAfter }).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const tokens = experienceTokens(signals);
  return tokens.filter(token => haystack.includes(token)).length >= Math.min(2, tokens.length);
}

export function validatePleasureWindow(plans: ChapterPlanV2[], profile: PleasureProfileV2): ContractIssue[] {
  const issues: ContractIssue[] = [];
  if (plans.length !== 5) return [{ path: 'plans', message: 'Pleasure validation requires one five-chapter rolling window.' }];
  const sortedPlans = [...plans].sort((a, b) => a.chapterNumber - b.chapterNumber);
  const openingWindow = sortedPlans[0].chapterNumber === 1;
  const earnedPayoffChapters = sortedPlans.filter(plan => plan.scenes.some(scene => scene.payoff.trim().length >= 20));
  const progressionChapters = sortedPlans.filter(plan => plan.stateDelta.resources.length > 0 || plan.promisesPaid.length > 0 || planMatchesExperience(plan, profile.progressionSignals));
  const comfortChapters = sortedPlans.filter(plan => planMatchesExperience(plan, profile.comfortLoop));

  if (earnedPayoffChapters.length < 2) issues.push({ path: 'plans', message: 'Five-chapter window needs at least two earned competence payoffs.' });
  if (progressionChapters.length < 1) issues.push({ path: 'plans', message: 'Five-chapter window needs at least one concrete progression change.' });
  if (comfortChapters.length < 1) issues.push({ path: 'plans', message: 'Five-chapter window needs at least one story-specific comfort payoff.' });
  if (openingWindow) {
    const first = sortedPlans[0];
    if (!first.scenes.some(scene => scene.pov.trim().length >= 2 && scene.tactic.trim().length >= 20)) {
      issues.push({ path: 'plans.0', message: 'Chapter 1 must give the protagonist an active agency move.' });
    }
    const firstThree = sortedPlans.filter(plan => plan.chapterNumber <= 3);
    if (!firstThree.some(plan => plan.stateDelta.resources.length > 0)) {
      issues.push({ path: 'plans', message: 'Opening must earn a material gain by chapter 3.' });
    }
  }
  return issues;
}
