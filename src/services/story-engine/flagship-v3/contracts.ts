import { z } from 'zod';

const id = z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/);
const named = z.string().trim().min(2).max(80);
const text = z.string().trim().min(8);
const detailed = z.string().trim().min(20);

export const CharacterVoiceV3Schema = z.object({
  summary: detailed,
  positiveExamples: z.array(text).min(2).max(5),
  forbiddenPatterns: z.array(text).min(2).max(8),
}).strict();

export const StoryCharacterV3Schema = z.object({
  id,
  name: z.string().trim().min(2).max(80),
  aliases: z.array(z.string().trim().min(1).max(80)).max(8),
  role: z.enum(['protagonist', 'cast']),
  publicIdentity: detailed,
  agenda: detailed,
  competence: detailed,
  constraint: detailed,
  moralBoundary: detailed,
  decisionSignature: detailed,
  voice: CharacterVoiceV3Schema,
}).strict();

export const StoryResourceV3Schema = z.object({
  id,
  name: z.string().trim().min(2).max(80),
  mode: z.enum(['numeric', 'state']),
  unit: z.string().trim().min(1).max(40).nullable(),
  sourceRules: z.array(text).min(1).max(6),
  spendRules: z.array(text).min(1).max(6),
  referenceScale: z.array(text).min(1).max(5).nullable(),
  exchangeAnchors: z.array(z.object({
    itemId: id,
    name: named,
    quantity: z.number().positive().finite(),
    unit: z.string().trim().min(1).max(40),
    costAmount: z.number().positive().finite(),
    tolerancePercent: z.number().min(0).max(100),
  }).strict()).max(16),
  minimumValue: z.number().finite().nullable(),
  maximumValue: z.number().finite().nullable(),
  scarcity: detailed,
}).strict().superRefine((resource, ctx) => {
  if (resource.mode === 'numeric' && !resource.unit) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['unit'], message: 'Numeric resources require a unit.' });
  }
  if (resource.mode === 'numeric' && (!resource.referenceScale || !resource.referenceScale.some(anchor => /\d/u.test(anchor)))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['referenceScale'],
      message: 'Numeric resources require at least one explicit quantitative reference scale.',
    });
  }
  if (resource.mode === 'numeric' && (
    resource.minimumValue === null
    || resource.maximumValue === null
    || resource.minimumValue >= resource.maximumValue
  )) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['minimumValue'], message: 'Numeric resources require finite minimumValue < maximumValue.' });
  }
  if (resource.mode === 'state' && (
    resource.referenceScale !== null
    || resource.minimumValue !== null
    || resource.maximumValue !== null
  )) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['referenceScale'], message: 'State resources use null scale and numeric bounds.' });
  }
  if (resource.mode === 'state' && resource.exchangeAnchors.length > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exchangeAnchors'], message: 'State resources cannot define numeric exchange anchors.' });
  }
  const anchorIds = resource.exchangeAnchors.map(anchor => anchor.itemId);
  if (new Set(anchorIds).size !== anchorIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exchangeAnchors'], message: 'Exchange anchor item ids must be unique per resource.' });
  }
});

const ResourceConsiderationV3Schema = z.object({
  itemId: id,
  name: named,
  quantity: z.number().positive().finite(),
  unit: z.string().trim().min(1).max(40),
}).strict();

const ResourceTransactionKindV3Schema = z.enum(['gain', 'purchase', 'fee', 'transfer', 'consume', 'adjustment']);

export const StoryKernelV3Schema = z.object({
  schemaVersion: z.literal(3),
  pipelineVersion: z.literal('flagship_v3'),
  title: z.string().trim().min(8).max(220),
  genre: z.string().trim().min(2).max(80),
  concept: z.object({
    signature: detailed,
    uniqueMechanism: detailed,
    readerFantasy: detailed,
    recurringSituation: detailed,
    variationAxes: z.array(text).min(3).max(8),
    antiCloneFingerprint: z.array(text).min(3).max(10),
  }).strict(),
  pleasure: z.object({
    primaryRewardLoop: z.array(text).min(3).max(7),
    comfortLoop: z.array(text).min(2).max(6),
    setbackRecoveryWindow: z.number().int().min(1).max(3),
    progressionSignals: z.array(named).min(3).max(10),
  }).strict(),
  protagonistId: id,
  characters: z.array(StoryCharacterV3Schema).min(4).max(16),
  worldClaims: z.array(z.object({
    id,
    claim: detailed,
    sourceRef: text,
    enforcement: detailed,
    exceptions: detailed,
  }).strict()).min(4).max(20),
  resources: z.array(StoryResourceV3Schema).min(3).max(16),
  promises: z.array(z.object({
    id,
    description: detailed,
    payoffCondition: detailed,
  }).strict()).min(4).max(20),
  endingContract: z.object({
    emotionalState: detailed,
    materialState: detailed,
    worldState: detailed,
    promisesThatMustClose: z.array(id).min(1).max(20),
    targetChapterRange: z.object({
      min: z.number().int().min(100),
      forecast: z.number().int().min(100),
      max: z.number().int().min(100).max(5000),
    }).strict(),
  }).strict(),
}).strict().superRefine((kernel, ctx) => {
  const characterIds = kernel.characters.map(character => character.id);
  const resourceIds = kernel.resources.map(resource => resource.id);
  const promiseIds = kernel.promises.map(promise => promise.id);
  const protagonists = kernel.characters.filter(character => character.role === 'protagonist');
  if (new Set(characterIds).size !== characterIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['characters'], message: 'Character ids must be unique.' });
  }
  if (new Set(resourceIds).size !== resourceIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resources'], message: 'Resource ids must be unique.' });
  }
  if (new Set(promiseIds).size !== promiseIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['promises'], message: 'Promise ids must be unique.' });
  }
  if (protagonists.length !== 1 || protagonists[0]?.id !== kernel.protagonistId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['protagonistId'], message: 'Kernel requires exactly one matching protagonist.' });
  }
  const closing = new Set(kernel.endingContract.promisesThatMustClose);
  for (const promiseId of closing) {
    if (!promiseIds.includes(promiseId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endingContract', 'promisesThatMustClose'], message: `Unknown promise ${promiseId}.` });
    }
  }
  const range = kernel.endingContract.targetChapterRange;
  if (!(range.min <= range.forecast && range.forecast <= range.max)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endingContract', 'targetChapterRange'], message: 'Target range must be min <= forecast <= max.' });
  }
});

export type StoryKernelV3 = z.infer<typeof StoryKernelV3Schema>;

export const ArcPlanV3Schema = z.object({
  schemaVersion: z.literal(3),
  arcMode: z.enum(['standard', 'finale']).optional(),
  arcId: id,
  startChapter: z.number().int().min(1),
  endChapter: z.number().int().min(1),
  direction: detailed,
  terminalChange: detailed,
  activeConflicts: z.array(z.object({
    id,
    actorIds: z.array(id).min(1).max(6),
    objective: detailed,
    leverage: detailed,
    nextMove: detailed,
  }).strict()).min(1).max(10),
  duePromiseIds: z.array(id).max(12),
  progressionBudget: z.array(z.object({
    signal: named,
    requiredChange: detailed,
  }).strict()).min(2).max(10),
}).strict().superRefine((arc, ctx) => {
  const length = arc.endChapter - arc.startChapter + 1;
  const mode = arc.arcMode ?? 'standard';
  const valid = mode === 'standard' ? length >= 20 && length <= 30 : length >= 5 && length <= 20;
  if (!valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endChapter'],
      message: mode === 'standard' ? 'Standard arc must contain 20-30 chapters.' : 'Finale arc must contain 5-20 chapters.',
    });
  }
  if (length % 5 !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endChapter'], message: 'Arc length must align to five-chapter rolling windows.' });
  }
});

export type ArcPlanV3 = z.infer<typeof ArcPlanV3Schema>;

const ResourceValueV3Schema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('numeric'), amount: z.number().finite(), unit: z.string().trim().min(1).max(40) }).strict(),
  z.object({ mode: z.literal('state'), value: z.string().trim().min(2).max(240) }).strict(),
]);

export const StoryStateV3Schema = z.object({
  schemaVersion: z.literal(3),
  chapterNumber: z.number().int().min(0),
  facts: z.array(z.object({
    id,
    value: text,
    sourceChapter: z.number().int().min(0),
    scope: z.enum(['invariant', 'arc', 'local']).optional(),
    status: z.enum(['active', 'retired']).optional(),
  }).strict()).max(100),
  timeline: z.array(z.object({
    chapter: z.number().int().min(0),
    startMinute: z.number().int().min(0),
    durationMinutes: z.number().int().min(1),
    locationId: id,
    event: text,
  }).strict()).max(100),
  characters: z.array(z.object({
    characterId: id,
    status: z.enum(['alive', 'dead', 'missing', 'unknown']),
    locationId: id,
    knowledge: z.array(z.object({
      factId: id,
      learnedChapter: z.number().int().min(0),
      source: text,
    }).strict()).max(40),
    relationshipState: text,
  }).strict()).max(24),
  resources: z.array(z.object({
    resourceId: id,
    value: ResourceValueV3Schema,
    source: text,
    lastChangedChapter: z.number().int().min(0),
  }).strict()).max(24),
  promises: z.array(z.object({
    promiseId: id,
    status: z.enum(['open', 'advanced', 'paid', 'broken']),
    pressure: text,
  }).strict()).max(40),
  recentSummary: z.string().max(5000),
  previousEnding: z.string().max(6000),
  retrievalNotes: z.array(text).max(8),
}).strict().superRefine((state, ctx) => {
  const uniqueGroups: Array<[string, string[]]> = [
    ['facts', state.facts.map(item => item.id)],
    ['characters', state.characters.map(item => item.characterId)],
    ['resources', state.resources.map(item => item.resourceId)],
    ['promises', state.promises.map(item => item.promiseId)],
  ];
  for (const [path, values] of uniqueGroups) {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: `${path} ids must be unique.` });
    }
  }
});

export type StoryStateV3 = z.infer<typeof StoryStateV3Schema>;

export const ChapterDeltaV3Schema = z.discriminatedUnion('kind', [
  z.object({
    id,
    kind: z.literal('fact'),
    factId: id,
    valueBefore: text.nullable(),
    valueAfter: text,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('character_location'),
    characterId: id,
    locationAfter: id,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('character_knowledge'),
    characterId: id,
    factId: id,
    learnedFrom: text,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('relationship'),
    characterId: id,
    relationshipAfter: text,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('resource_numeric'),
    resourceId: id,
    before: z.number().finite(),
    delta: z.number().finite(),
    after: z.number().finite(),
    unit: z.string().trim().min(1).max(40),
    source: text,
    sink: text,
    transactionKind: ResourceTransactionKindV3Schema,
    consideration: z.array(ResourceConsiderationV3Schema).max(8),
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('resource_state'),
    resourceId: id,
    before: text,
    after: text,
    source: text,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('promise'),
    promiseId: id,
    statusAfter: z.enum(['open', 'advanced', 'paid', 'broken']),
    pressureAfter: text,
    evidenceRequired: z.literal(true),
  }).strict(),
]);

export type ChapterDeltaV3 = z.infer<typeof ChapterDeltaV3Schema>;

export const ChapterDeltaDraftV3Schema = z.discriminatedUnion('kind', [
  z.object({
    id,
    kind: z.literal('fact'),
    factId: id,
    valueAfter: text,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('character_location'),
    characterId: id,
    locationAfter: id,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('character_knowledge'),
    characterId: id,
    factId: id,
    learnedFrom: text,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('relationship'),
    characterId: id,
    relationshipAfter: text,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('resource_numeric'),
    resourceId: id,
    delta: z.number().finite(),
    source: text,
    sink: text,
    transactionKind: ResourceTransactionKindV3Schema,
    consideration: z.array(ResourceConsiderationV3Schema).max(8),
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('resource_state'),
    resourceId: id,
    after: text,
    source: text,
    evidenceRequired: z.literal(true),
  }).strict(),
  z.object({
    id,
    kind: z.literal('promise'),
    promiseId: id,
    statusAfter: z.enum(['open', 'advanced', 'paid', 'broken']),
    pressureAfter: text,
    evidenceRequired: z.literal(true),
  }).strict(),
]);

export type ChapterDeltaDraftV3 = z.infer<typeof ChapterDeltaDraftV3Schema>;

export const ChapterSceneV3Schema = z.object({
  id,
  povCharacterId: id,
  participantIds: z.array(id).min(1).max(10),
  locationId: id,
  durationMinutes: z.number().int().min(1).max(1440),
  travelMinutesFromPrevious: z.number().int().min(0).max(1440),
  desire: detailed,
  opposition: detailed,
  tactic: detailed,
  cost: detailed,
  payoff: detailed,
  irreversibleChange: detailed,
  informationDelta: detailed,
  hookIntent: z.enum(['threat_arrives', 'choice_forced', 'truth_reframed', 'opportunity_opens', 'cost_revealed', 'relationship_turns']),
  unresolvedQuestion: detailed,
  requiredDeltaIds: z.array(id).min(1).max(12)
    .describe('NON-EMPTY: every scene must list at least one required delta id implemented by that scene.'),
}).strict();

export const ChapterPlanV3Schema = z.object({
  schemaVersion: z.literal(3),
  chapterNumber: z.number().int().min(1),
  elapsedMinutesSincePreviousChapter: z.number().int().min(0).max(525_600)
    .describe('Narrative time elapsed since the prior committed chapter; engine derives absolute scene times.'),
  chapterPromise: detailed,
  preconditions: z.array(z.object({
    factId: id,
    expectedValue: text,
  }).strict()).max(20),
  scenes: z.array(ChapterSceneV3Schema).min(1).max(5),
  requiredDeltas: z.array(ChapterDeltaV3Schema).min(1).max(24),
  nextChapterPressure: detailed,
}).strict().superRefine((plan, ctx) => {
  const sceneIds = plan.scenes.map(scene => scene.id);
  const deltaIds = plan.requiredDeltas.map(delta => delta.id);
  if (new Set(sceneIds).size !== sceneIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scenes'], message: 'Scene ids must be unique.' });
  }
  if (new Set(deltaIds).size !== deltaIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['requiredDeltas'], message: 'Delta ids must be unique.' });
  }
  const knownDeltas = new Set(deltaIds);
  for (const [sceneIndex, scene] of plan.scenes.entries()) {
    for (const deltaId of scene.requiredDeltaIds) {
      if (!knownDeltas.has(deltaId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scenes', sceneIndex, 'requiredDeltaIds'], message: `Unknown delta ${deltaId}.` });
      }
    }
  }
});

export type ChapterPlanV3 = z.infer<typeof ChapterPlanV3Schema>;
export type ChapterSceneV3 = z.infer<typeof ChapterSceneV3Schema>;

export const ChapterPlanDraftV3Schema = z.object({
  schemaVersion: z.literal(3),
  chapterNumber: z.number().int().min(1),
  elapsedMinutesSincePreviousChapter: z.number().int().min(0).max(525_600),
  chapterPromise: detailed,
  preconditions: z.array(z.object({ factId: id, expectedValue: text }).strict()).max(20),
  scenes: z.array(ChapterSceneV3Schema).min(1).max(5),
  requiredDeltas: z.array(ChapterDeltaDraftV3Schema).min(1).max(24),
  nextChapterPressure: detailed,
}).strict();

export type ChapterPlanDraftV3 = z.infer<typeof ChapterPlanDraftV3Schema>;

export const RollingPlanWindowV3Schema = z.object({
  schemaVersion: z.literal(3),
  startChapter: z.number().int().min(1),
  plans: z.array(ChapterPlanV3Schema).length(5),
}).strict().superRefine((window, ctx) => {
  window.plans.forEach((plan, index) => {
    if (plan.chapterNumber !== window.startChapter + index) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plans', index, 'chapterNumber'], message: 'Rolling window chapters must be contiguous.' });
    }
  });
});

export type RollingPlanWindowV3 = z.infer<typeof RollingPlanWindowV3Schema>;

export const RollingPlanWindowDraftV3Schema = z.object({
  schemaVersion: z.literal(3),
  startChapter: z.number().int().min(1),
  plans: z.array(ChapterPlanDraftV3Schema).length(5),
}).strict().superRefine((window, ctx) => {
  window.plans.forEach((plan, index) => {
    if (plan.chapterNumber !== window.startChapter + index) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plans', index, 'chapterNumber'], message: 'Rolling window chapters must be contiguous.' });
    }
  });
});

export type RollingPlanWindowDraftV3 = z.infer<typeof RollingPlanWindowDraftV3Schema>;

export function parseV3<T>(
  schema: z.ZodType<T>,
  input: unknown,
): { success: true; data: T } | { success: false; issues: Array<{ path: string; message: string }> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  return {
    success: false,
    issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
  };
}
