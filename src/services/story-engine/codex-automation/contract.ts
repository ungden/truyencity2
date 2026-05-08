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
  mode: 'qa-slow' | 'production';
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
