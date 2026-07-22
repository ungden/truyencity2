import { z } from 'zod';

const stableId = z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/);
const shortText = z.string().trim().min(2).max(160);
const prose = z.string().trim().min(8).max(2_000);
const mechanicalText = z.string().trim().min(2).max(1_000);

export const VoiceContractSchema = z.object({
  register: shortText,
  sentenceRhythm: shortText,
  directness: z.enum(['reserved', 'balanced', 'direct']),
  addressRules: shortText,
  vocabulary: shortText,
  stressResponse: shortText,
  avoidances: shortText,
}).strict();

export const StoryCharacterSchema = z.object({
  id: stableId,
  name: z.string().trim().min(2).max(80),
  aliases: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
  role: z.enum(['protagonist', 'supporting', 'opposition']),
  agenda: prose,
  competence: prose,
  constraint: prose,
  moralBoundary: prose,
  voice: VoiceContractSchema,
}).strict();

export const StoryKernelSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(40).max(2_000),
  genreLane: z.string().trim().min(2).max(80),
  readerFantasy: prose,
  uniqueMechanism: prose,
  mechanismFingerprint: shortText,
  rewardLoopFingerprint: shortText,
  conflictEconomyFingerprint: shortText,
  protagonistId: stableId,
  characters: z.array(StoryCharacterSchema).min(3).max(24),
  worldRules: z.array(z.object({
    id: stableId,
    claim: prose,
    exceptions: z.array(prose).max(6).default([]),
  }).strict()).min(3).max(40),
  locations: z.array(z.object({ id: stableId, name: shortText }).strict()).min(2).max(80),
  travelRules: z.array(z.object({
    fromLocationId: stableId,
    toLocationId: stableId,
    minimumMinutes: z.number().int().nonnegative().max(100_000),
  }).strict()).max(240),
  resources: z.array(z.discriminatedUnion('kind', [
    z.object({
      id: stableId,
      name: shortText,
      kind: z.literal('numeric'),
      minimum: z.number().finite().optional(),
      maximum: z.number().finite().optional(),
    }).strict(),
    z.object({ id: stableId, name: shortText, kind: z.literal('state') }).strict(),
  ])).max(40),
  promises: z.array(z.object({ id: stableId, description: prose }).strict()).max(40),
  pleasureLoop: z.object({
    primary: prose,
    comfort: prose,
    setbackRecoveryChapters: z.number().int().min(1).max(8),
  }).strict(),
  endingDirection: z.object({
    protagonistTerminalState: prose,
    worldTerminalState: prose,
    promisesToResolve: z.array(stableId).max(40),
  }).strict(),
}).strict().superRefine((kernel, ctx) => {
  const characters = new Set(kernel.characters.map(item => item.id));
  if (!characters.has(kernel.protagonistId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['protagonistId'], message: 'Unknown protagonist id.' });
  }
  const locations = new Set(kernel.locations.map(item => item.id));
  kernel.travelRules.forEach((rule, index) => {
    if (!locations.has(rule.fromLocationId) || !locations.has(rule.toLocationId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['travelRules', index], message: 'Travel rule references an unknown location.' });
    }
  });
});

const storyFact = z.object({ id: stableId, value: z.string().trim().min(1).max(2_000) }).strict();

export const ChapterOutcomeContentSchema = z.object({
  event: z.string().trim().min(5).max(400),
  result: z.string().trim().min(5).max(400),
  method: z.string().trim().min(2).max(400).nullable(),
  endingSituation: z.string().trim().min(5).max(400),
  evidenceSpans: z.array(z.string().trim().min(2).max(500)).min(1).max(4),
}).strict();

export const ChapterOutcomeSchema = ChapterOutcomeContentSchema.extend({
  chapterNumber: z.number().int().positive(),
  title: z.string().trim().min(1).max(240),
}).strict();

export const StoryStateSchema = z.object({
  schemaVersion: z.literal(2),
  chapterNumber: z.number().int().nonnegative(),
  storyTimeMinutes: z.number().int().nonnegative(),
  facts: z.array(storyFact).max(500),
  characters: z.array(z.object({
    characterId: stableId,
    locationId: stableId,
    knownFactIds: z.array(stableId).max(500),
    relationshipState: z.record(z.string().max(500)).default({}),
  }).strict()).max(80),
  resources: z.array(z.discriminatedUnion('kind', [
    z.object({ resourceId: stableId, kind: z.literal('numeric'), value: z.number().finite() }).strict(),
    z.object({ resourceId: stableId, kind: z.literal('state'), value: z.string().max(1_000) }).strict(),
  ])).max(80),
  promises: z.array(z.object({
    promiseId: stableId,
    status: z.enum(['open', 'progressed', 'resolved', 'abandoned']),
  }).strict()).max(80),
  recentOutcomes: z.array(ChapterOutcomeSchema).max(12),
}).strict();

const arcPlanShape = {
  schemaVersion: z.literal(1),
  arcNumber: z.number().int().positive(),
  startChapter: z.number().int().positive(),
  plannedEndChapter: z.number().int().positive(),
  objective: prose,
  terminalChanges: z.array(prose).min(1).max(12),
  activeConflicts: z.array(prose).min(1).max(12),
  duePromiseIds: z.array(stableId).max(20),
  progression: z.array(prose).min(1).max(12),
} as const;

export const ArcPlanSchema = z.object(arcPlanShape).strict().superRefine((arc, ctx) => {
  const length = arc.plannedEndChapter - arc.startChapter + 1;
  if (length < 20 || length > 30) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plannedEndChapter'], message: 'An arc must span 20-30 chapters.' });
  }
});

// The first launch always starts at chapter one. Expressing the 20-30 chapter
// range directly in JSON Schema prevents the provider from producing an arc
// that application validation must reject after an otherwise expensive setup.
const InitialArcPlanSchema = z.object({
  ...arcPlanShape,
  startChapter: z.literal(1),
  plannedEndChapter: z.number().int().min(20).max(30),
}).strict();

const factDelta = z.object({
  id: stableId,
  kind: z.literal('fact'),
  factId: stableId,
  before: z.string().max(2_000).nullable(),
  after: z.string().trim().min(1).max(2_000),
}).strict();

const numericResourceDelta = z.object({
  id: stableId,
  kind: z.literal('resource_numeric'),
  resourceId: stableId,
  before: z.number().finite(),
  delta: z.number().finite(),
  after: z.number().finite(),
  source: z.string().trim().min(2).max(300).nullable(),
  sink: z.string().trim().min(2).max(300).nullable(),
}).strict();

const stateResourceDelta = z.object({
  id: stableId,
  kind: z.literal('resource_state'),
  resourceId: stableId,
  before: z.string().max(1_000),
  after: z.string().trim().min(1).max(1_000),
  source: z.string().trim().min(2).max(300),
}).strict();

const knowledgeDelta = z.object({
  id: stableId,
  kind: z.literal('knowledge'),
  characterId: stableId,
  factId: stableId,
  source: z.string().trim().min(2).max(300),
}).strict();

const locationDelta = z.object({
  id: stableId,
  kind: z.literal('location'),
  characterId: stableId,
  beforeLocationId: stableId,
  afterLocationId: stableId,
}).strict();

const promiseDelta = z.object({
  id: stableId,
  kind: z.literal('promise'),
  promiseId: stableId,
  before: z.enum(['open', 'progressed', 'resolved', 'abandoned']),
  after: z.enum(['open', 'progressed', 'resolved', 'abandoned']),
}).strict();

export const StateDeltaSchema = z.discriminatedUnion('kind', [
  factDelta,
  numericResourceDelta,
  stateResourceDelta,
  knowledgeDelta,
  locationDelta,
  promiseDelta,
]);

export const ChapterPlanSchema = z.object({
  schemaVersion: z.literal(1),
  chapterNumber: z.number().int().positive(),
  arcNumber: z.number().int().positive(),
  storyTimeAfterMinutes: z.number().int().nonnegative(),
  preconditions: z.array(z.object({
    kind: z.enum(['fact', 'resource', 'location', 'promise']),
    entityId: stableId,
    expected: z.union([z.string(), z.number()]),
  }).strict()).max(30),
  requiredWorldRuleIds: z.array(stableId).min(1).max(12),
  scenes: z.array(z.object({
    id: stableId,
    povCharacterId: stableId,
    participantIds: z.array(stableId).min(1).max(16),
    locationId: stableId,
    durationMinutes: z.number().int().min(1).max(10_000),
    travelMinutesFromPrevious: z.number().int().nonnegative().max(100_000),
    objective: mechanicalText,
    obstacle: mechanicalText,
    action: mechanicalText,
    requiredDeltaIds: z.array(stableId).max(20),
  }).strict()).min(1).max(5),
  requiredDeltas: z.array(StateDeltaSchema).min(1).max(30),
}).strict();

export const RollingPlanSchema = z.object({
  schemaVersion: z.literal(1),
  startChapter: z.number().int().positive(),
  plans: z.array(ChapterPlanSchema).min(1).max(5),
}).strict();

export const EditorIssueSchema = z.object({
  category: z.enum([
    'canon', 'timeline', 'location', 'resource', 'knowledge', 'authority',
    'pov', 'required_delta', 'causality', 'character_voice',
    'prose_naturalness', 'scene_effect', 'narrative_repetition', 'prompt_leak',
  ]),
  severity: z.enum(['critical', 'major', 'moderate']),
  scope: z.enum(['prose', 'plan', 'kernel']),
  evidence: z.string().trim().min(1).max(800),
  instruction: z.string().trim().min(5).max(800),
}).strict();

const deltaCheck = z.object({
  deltaId: stableId,
  realized: z.boolean(),
  evidence: z.string().trim().max(800),
}).strict();

export const EditorAssessmentSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('pass'),
    issues: z.array(EditorIssueSchema).length(0),
    deltaChecks: z.array(deltaCheck.extend({ realized: z.literal(true) })).min(1).max(30),
    outcome: ChapterOutcomeContentSchema,
  }).strict(),
  z.object({
    status: z.literal('revise'),
    issues: z.array(EditorIssueSchema).min(1).max(3),
    deltaChecks: z.array(deltaCheck).min(1).max(30),
  }).strict(),
]);

export const ModelRoutesSchema = z.object({
  setupGeneratorA: z.string().trim().min(3),
  setupGeneratorB: z.string().trim().min(3),
  setupJudge: z.string().trim().min(3),
  openingSimulator: z.string().trim().min(3),
  launchArchitect: z.string().trim().min(3),
  planner: z.string().trim().min(3),
  writer: z.string().trim().min(3),
  editor: z.string().trim().min(3),
  routeVersion: z.string().trim().min(3),
}).strict().superRefine((routes, ctx) => {
  if (routes.writer === routes.editor) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['editor'], message: 'Writer and Editor routes must be independent.' });
  }
});

export const LaunchPackSchema = z.object({
  schemaVersion: z.literal(1),
  selectedConceptId: stableId,
  kernel: StoryKernelSchema,
  arc: InitialArcPlanSchema,
  initialState: StoryStateSchema,
  coverPrompt: z.string().trim().min(20).max(2_000),
}).strict();

export type StoryKernel = z.infer<typeof StoryKernelSchema>;
export type StoryState = z.infer<typeof StoryStateSchema>;
export type ChapterOutcome = z.infer<typeof ChapterOutcomeSchema>;
export type ArcPlan = z.infer<typeof ArcPlanSchema>;
export type StateDelta = z.infer<typeof StateDeltaSchema>;
export type ChapterPlan = z.infer<typeof ChapterPlanSchema>;
export type RollingPlan = z.infer<typeof RollingPlanSchema>;
export type EditorAssessment = z.infer<typeof EditorAssessmentSchema>;
export type ModelRoutes = z.infer<typeof ModelRoutesSchema>;
export type LaunchPack = z.infer<typeof LaunchPackSchema>;

export type FactoryBlockCode = 'setup_blocked' | 'plan_blocked' | 'quality_blocked' | 'infra_blocked';

export class StoryFactoryError extends Error {
  constructor(public readonly code: FactoryBlockCode, message: string, public readonly evidence?: unknown) {
    super(message);
    this.name = 'StoryFactoryError';
  }
}
