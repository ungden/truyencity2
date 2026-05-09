import { existsSync, statSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import type { GenreType, StoryKernel } from '../types';

const nonEmptyString = z.string().trim().min(1);

const storyKernelSchema = z.object({
  readerFantasy: z.string().trim().min(30),
  protagonistEngine: z.string().trim().min(30),
  pleasureLoop: z.array(z.string().trim().min(8)).min(4).max(6),
  systemMechanic: z.object({
    name: nonEmptyString,
    input: nonEmptyString,
    output: nonEmptyString,
    limit: nonEmptyString,
    reward: nonEmptyString,
  }),
  mcSecret: z.object({
    secret: nonEmptyString,
    outsideWorldKnowledge: nonEmptyString,
    revealRule: nonEmptyString,
  }),
  benefitLoop: z.object({
    goal: nonEmptyString,
    action: nonEmptyString,
    benefit: nonEmptyString,
    cadence: nonEmptyString,
  }),
  interventionRule: z.string().trim().min(30),
  phase1Playground: z.object({
    locations: z.array(nonEmptyString).min(2),
    cast: z.array(nonEmptyString).min(2),
    resources: z.array(nonEmptyString).min(2),
    localAntagonists: z.array(nonEmptyString).min(1),
    repeatableSceneTypes: z.array(nonEmptyString).min(3),
  }),
  socialReactor: z.object({
    witnesses: z.array(nonEmptyString).min(1),
    reactionModes: z.array(nonEmptyString).min(2),
    reportBackCadence: nonEmptyString,
  }),
  noveltyLadder: z.array(z.object({
    chapterRange: nonEmptyString,
    newToy: nonEmptyString,
    keepsSameLane: nonEmptyString,
  })).min(3),
  controlRules: z.object({
    payoffCadence: nonEmptyString,
    attentionGradient: nonEmptyString,
    openThreadsPerArc: z.number().int().min(1).max(8),
    closeThreadsPerArc: z.number().int().min(1).max(8),
  }),
  patternCards: z.array(nonEmptyString).min(3),
});

const recordLike = z.record(z.unknown()).refine((value) => Object.keys(value).length > 0, {
  message: 'must be a non-empty object',
});

export const storyFactoryPayloadSchema = z.object({
  title: z.string().trim().min(4).max(90),
  genres: z.array(nonEmptyString).min(1).max(4),
  description: z.string().trim().min(250).max(2200),
  mainCharacter: z.string().trim().min(2).max(80),
  worldDescription: z.string().trim().min(600).max(8000),
  coverPrompt: z.string().trim().min(80).max(2500),
  setupKernel: storyKernelSchema,
  masterOutline: recordLike,
  storyOutline: recordLike,
  arcPlan: z.array(recordLike).min(3),
  totalPlannedChapters: z.number().int().min(300).max(1500).default(1000),
  focusKey: z.string().trim().max(80).optional(),
  subGenres: z.array(nonEmptyString).max(4).optional(),
  mcArchetype: z.string().trim().min(2).max(60).optional(),
  antiTropes: z.array(nonEmptyString).max(8).optional(),
});

export type StoryFactoryPayload = Omit<
  z.infer<typeof storyFactoryPayloadSchema>,
  'genres' | 'setupKernel'
> & {
  genres: GenreType[];
  setupKernel: StoryKernel;
};

export type CodexAutomationTaskType = 'new_story' | 'cover' | 'chapter';

export interface CodexAutomationTask {
  type: CodexAutomationTaskType;
  runDir: string;
  status: 'prepared' | 'blocked' | 'skipped';
  reason?: string;
  promptPath?: string;
  inputPath?: string;
  dryRunCommand?: string;
  applyCommand?: string;
  projectId?: string;
  novelId?: string;
  novelTitle?: string;
}

export interface CodexAutomationManifest {
  runId: string;
  mode: 'qa-slow' | 'production' | 'focus-bulk';
  vnDate: string;
  createdAt: string;
  quotas: {
    maxNewStories: number;
    maxCovers: number;
    maxChapters: number;
    newStoriesToday: number;
    coversToday: number;
    chaptersToday: number;
  };
  tasks: CodexAutomationTask[];
}

export interface CoverApplyInput {
  novelId: string;
  prompt: string;
  imagePath: string;
  provider: 'codex_image_tool';
}

export interface CodexAutomationReport {
  createdStories: number;
  generatedCovers: number;
  appliedChapters: number;
  blockedTasks: Array<{ type: CodexAutomationTaskType; reason: string }>;
  auditSummary?: string;
}

const characterStatusSchema = z.enum(['alive', 'dead', 'missing', 'unknown']);
const itemEventTypeSchema = z.enum(['picked', 'used', 'equipped', 'lost', 'gifted', 'destroyed', 'mentioned']);
const plotThreadStatusSchema = z.enum(['open', 'developing', 'climax', 'resolved', 'legacy']);
const plotThreadPrioritySchema = z.enum(['critical', 'main', 'sub', 'background']);

export const continuityExtractionPayloadSchema = z.object({
  summary: z.string().trim().min(40).max(2000),
  openingSentence: z.string().trim().min(10).max(500),
  mcState: z.string().trim().min(20).max(1000),
  cliffhanger: z.string().trim().min(10).max(1000),
  readerPayoff: z.object({
    tradeDividend: z.string().trim().max(700).nullable().optional(),
    progressionDelta: z.string().trim().max(700).nullable().optional(),
    comfortOrSwaggerBeat: z.string().trim().max(500).nullable().optional(),
    nextProfitHook: z.string().trim().max(700).nullable().optional(),
  }).optional(),
  characters: z.array(z.object({
    characterName: z.string().trim().min(2).max(80),
    status: characterStatusSchema.default('alive'),
    powerLevel: z.string().trim().max(120).nullable().optional(),
    powerRealmIndex: z.number().int().nullable().optional(),
    location: z.string().trim().max(160).nullable().optional(),
    personalityQuirks: z.string().trim().max(300).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })).min(1),
  timeline: z.object({
    inWorldDateText: z.string().trim().max(160).nullable().optional(),
    daysElapsedSinceStart: z.number().nullable().optional(),
    season: z.string().trim().max(60).nullable().optional(),
    mcAge: z.number().nullable().optional(),
    explicitInChapter: z.boolean().default(false),
    notes: z.string().trim().max(500).nullable().optional(),
  }).optional(),
  itemEvents: z.array(z.object({
    characterName: z.string().trim().min(2).max(80),
    itemName: z.string().trim().min(2).max(120),
    eventType: itemEventTypeSchema,
    description: z.string().trim().max(500).nullable().optional(),
    importance: z.number().int().min(0).max(100).default(50),
  })).default([]),
  plotThreads: z.array(z.object({
    id: z.string().trim().max(120).optional(),
    name: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(800),
    priority: plotThreadPrioritySchema.default('sub'),
    status: plotThreadStatusSchema.default('open'),
    targetPayoffChapter: z.number().int().positive().nullable().optional(),
    payoffDescription: z.string().trim().max(500).nullable().optional(),
    relatedCharacters: z.array(z.string().trim().min(2).max(80)).default([]),
    importance: z.number().int().min(0).max(100).default(50),
  })).default([]),
  relationships: z.array(z.object({
    characterA: z.string().trim().min(2).max(80),
    characterB: z.string().trim().min(2).max(80),
    relationshipType: z.string().trim().min(2).max(80),
    intensity: z.number().int().min(1).max(10).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })).default([]),
  economicLedger: z.array(z.object({
    entityName: z.string().trim().min(2).max(120),
    entityType: z.string().trim().max(80).nullable().optional(),
    cashEstimate: z.string().trim().max(120).nullable().optional(),
    assets: z.array(z.string().trim().min(1).max(120)).default([]),
    monthlyRevenue: z.string().trim().max(120).nullable().optional(),
    teamSize: z.number().int().min(0).nullable().optional(),
    deltaSummary: z.string().trim().min(5).max(500),
    notes: z.string().trim().max(500).nullable().optional(),
  })).default([]),
  tradeLedger: z.array(z.object({
    sourceWorld: z.string().trim().min(2).max(120),
    targetWorld: z.string().trim().min(2).max(120),
    resourceName: z.string().trim().min(2).max(120),
    quantity: z.string().trim().max(120).nullable().optional(),
    source: z.string().trim().min(5).max(500),
    cost: z.string().trim().min(2).max(300),
    expectedValue: z.string().trim().min(2).max(300),
    logisticsConstraint: z.string().trim().min(5).max(500),
    worldStateImpact: z.string().trim().min(5).max(500),
  })).default([]),
  worldStateDeltas: z.array(z.object({
    worldName: z.string().trim().min(2).max(120),
    deltaType: z.enum(['price', 'supply', 'demand', 'faction', 'law', 'culture', 'risk', 'other']).default('other'),
    description: z.string().trim().min(5).max(700),
    pressureChange: z.string().trim().max(300).nullable().optional(),
    relatedResources: z.array(z.string().trim().min(1).max(120)).default([]),
  })).default([]),
  factions: z.array(z.object({
    factionName: z.string().trim().min(2).max(120),
    factionType: z.enum(['sect', 'clan', 'corp', 'political', 'underground', 'guild', 'other']).default('other'),
    powerLevel: z.number().int().min(0).max(100).default(50),
    description: z.string().trim().max(800).nullable().optional(),
    alliances: z.array(z.string().trim().min(2).max(120)).default([]),
    rivalries: z.array(z.string().trim().min(2).max(120)).default([]),
    status: z.enum(['active', 'declining', 'fallen', 'hidden']).default('active'),
    importance: z.number().int().min(0).max(100).default(50),
  })).default([]),
});

export type ContinuityExtractionPayload = z.infer<typeof continuityExtractionPayloadSchema>;

export type ContinuityVerdict = 'pass' | 'revise' | 'block';

export interface ContinuityHealthIssue {
  code: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  message: string;
}

export interface ContinuityHealthReport {
  verdict: ContinuityVerdict;
  issues: ContinuityHealthIssue[];
  memoryRowsWritten: Record<string, number>;
  blockedNextChapterReason?: string | null;
}

export interface ContinuityAuditReport {
  projectId: string;
  checkedChapters: number[];
  verdict: ContinuityVerdict;
  issues: ContinuityHealthIssue[];
  missingByChapter: Record<number, string[]>;
}

export interface CodexChapterApplyReport {
  projectId: string;
  novelId: string;
  chapterNumber: number;
  qualityScore: number;
  continuityHealth: ContinuityHealthReport;
  applied: boolean;
}

export function parseStoryFactoryPayload(input: unknown): StoryFactoryPayload {
  return storyFactoryPayloadSchema.parse(input) as unknown as StoryFactoryPayload;
}

export function parseCoverApplyInput(input: unknown): CoverApplyInput {
  return z.object({
    novelId: z.string().uuid(),
    prompt: z.string().trim().min(30),
    imagePath: z.string().trim().min(1),
    provider: z.literal('codex_image_tool'),
  }).parse(input);
}

export function parseContinuityExtractionPayload(input: unknown): ContinuityExtractionPayload {
  return continuityExtractionPayloadSchema.parse(input);
}

export function getCoverMimeType(imagePath: string): string | null {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return null;
}

export function assertCoverImageFile(imagePath: string): { mimeType: string; sizeBytes: number } {
  const mimeType = getCoverMimeType(imagePath);
  if (!mimeType) {
    throw new Error('Cover image must be .png, .jpg, .jpeg, or .webp');
  }
  if (!existsSync(imagePath)) {
    throw new Error(`Cover image file not found: ${imagePath}`);
  }
  const stat = statSync(imagePath);
  if (!stat.isFile()) {
    throw new Error(`Cover image path is not a file: ${imagePath}`);
  }
  if (stat.size < 1024) {
    throw new Error(`Cover image is too small to be a real generated cover: ${stat.size} bytes`);
  }
  return { mimeType, sizeBytes: stat.size };
}
