/**
 * Story Engine v2 — Type Definitions
 *
 * Single source of truth for all types used across the pipeline.
 * Every type here is actively used; no dead types.
 */

// ── Genre ────────────────────────────────────────────────────────────────────

export type GenreType =
  | 'tien-hiep' | 'huyen-huyen' | 'do-thi' | 'kiem-hiep' | 'lich-su'
  | 'khoa-huyen' | 'vong-du' | 'dong-nhan' | 'mat-the' | 'linh-di'
  | 'quan-truong' | 'di-gioi' | 'ngon-tinh';

// ── Agent Roles ──────────────────────────────────────────────────────────────

export type AgentRole = 'architect' | 'writer' | 'critic';

// ── Dopamine ─────────────────────────────────────────────────────────────────

export type DopamineType =
  | 'face_slap' | 'power_reveal' | 'treasure_gain' | 'breakthrough'
  | 'revenge' | 'recognition' | 'beauty_encounter' | 'secret_identity'
  | 'business_success' | 'harvest' | 'flex_wealth' | 'comfort' | 'comedy_misunderstanding'
  | 'steal_luck' | 'simulate_success' | 'tears_of_regret' | 'flex_power_casual'
  | 'civilization_harvest' | 'player_exploitation' | 'two_world_shock' | 'master_flex' | 'book_manifestation' | 'monster_evolution';

// ── Engine Config ────────────────────────────────────────────────────────────

export interface EngineConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  targetWordCount: number;
  genre: GenreType;
  topicId?: string;
  minQualityScore: number;
  maxRetries: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  model: 'gemini-3-flash-preview',
  temperature: 0.75,
  maxTokens: 32768,
  targetWordCount: 2800,
  genre: 'tien-hiep',
  minQualityScore: 7,
  maxRetries: 3,
};

// ── Write Input ──────────────────────────────────────────────────────────────

export interface WriteChapterInput {
  projectId: string;
  novelId: string;
  storyTitle: string;
  protagonistName: string;
  genre: GenreType;
  chapterNumber: number;
  totalPlannedChapters: number;
  worldDescription?: string;
  customPrompt?: string;
}

// ── Write Result ─────────────────────────────────────────────────────────────

export interface WriteChapterResult {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  qualityScore: number;
  criticReport?: CriticOutput;
  duration: number;
}

// ── Chapter Outline (Architect output) ───────────────────────────────────────

export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  summary: string;
  pov: string;
  location: string;
  scenes: SceneOutline[];
  tensionLevel: number;
  dopaminePoints: DopaminePoint[];
  /** Emotional arc for the chapter - guides tone shifts */
  emotionalArc?: EmotionalArc;
  cliffhanger: string;
  targetWordCount: number;
}

export interface SceneOutline {
  order: number;
  setting: string;
  characters: string[];
  goal: string;
  conflict: string;
  resolution: string;
  dopamineType?: DopamineType;
  estimatedWords: number;
  /** Optional per-scene POV character — enables multi-POV storytelling */
  pov?: string;
}

export interface EmotionalArc {
  opening: string;
  midpoint: string;
  climax: string;
  closing: string;
}

export interface DopaminePoint {
  type: DopamineType;
  scene: number;
  description: string;
  intensity: number;
  setup?: string;
  payoff?: string;
}

// ── Critic Output ────────────────────────────────────────────────────────────

export interface CriticOutput {
  overallScore: number;
  dopamineScore: number;
  pacingScore: number;
  issues: CriticIssue[];
  approved: boolean;
  requiresRewrite: boolean;
  rewriteInstructions?: string;
}

export interface CriticIssue {
  type: 'pacing' | 'consistency' | 'continuity' | 'dopamine' | 'quality' | 'word_count' | 'dialogue' | 'critic_error' | 'logic' | 'detail';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  suggestion?: string;
}

// ── World Constraints ────────────────────────────────────────────────────────

export interface WorldConstraint {
  id: string;
  project_id?: string;
  blueprint_id?: string;
  category: 'quantity' | 'hierarchy' | 'rule' | 'geography' | 'character_limit' | 'power_cap';
  subject: string;
  predicate: string;
  value: string | number;
  context: string;
  immutable: boolean;
}

// ── Context Payload (assembled before writing) ───────────────────────────────

export interface ContextPayload {
  // Layer 0: Chapter Bridge
  previousSummary?: string;
  previousMcState?: string;
  previousCliffhanger?: string;
  previousEnding?: string;

  // Layer 1: Story Bible
  storyBible?: string;
  hasStoryBible: boolean;

  // Layer 2: Rolling Synopsis
  synopsis?: string;
  synopsisStructured?: {
    mc_current_state?: string;
    active_allies?: string[];
    active_enemies?: string[];
    open_threads?: string[];
  };

  // Layer 3: Recent Chapters
  recentChapters: string[];

  // Layer 4: Arc Plan
  arcPlan?: string;
  chapterBrief?: string;
  arcPlanThreads?: {
    threads_to_advance?: string[];
    threads_to_resolve?: string[];
    new_threads?: string[];
  };

  // Anti-repetition
  previousTitles: string[];
  recentOpenings: string[];
  recentCliffhangers: string[];

  // Character states
  characterStates?: string;

  // Genre boundary
  genreBoundary?: string;

  // RAG semantic context
  ragContext?: string;

  // Scalability modules
  plotThreads?: string;
  beatGuidance?: string;
  worldRules?: string;
  masterOutline?: string;

  // Arc chapter summaries (for synopsis generation)
  arcChapterSummaries?: Array<{ chapter_number: number; title: string; summary: string }>;
}

// ── Chapter Summary (stored in DB) ───────────────────────────────────────────

export interface ChapterSummary {
  summary: string;
  openingSentence: string;
  mcState: string;
  cliffhanger: string;
}

// ── Story Plan Types ─────────────────────────────────────────────────────────

export interface StoryOutline {
  title: string;
  genre: GenreType;
  premise: string;
  themes: string[];
  mainConflict: string;
  targetChapters: number;
  protagonist: {
    name: string;
    startingState: string;
    endGoal: string;
    characterArc: string;
  };
  majorPlotPoints: Array<{ chapter: number; event: string }>;
  endingVision: string;
}

export interface ArcOutline {
  arcNumber: number;
  title: string;
  theme: ArcTheme;
  premise: string;
  startChapter: number;
  endChapter: number;
  chapterCount: number;
  setup: string;
  confrontation: string;
  resolution: string;
  climax: string;
  cliffhanger: string;
  protagonistGrowth: string;
  startingRealm: string;
  endingRealm: string;
  chapterOutlines: ArcChapterPlan[];
  tensionCurve: number[];
}

export type ArcTheme =
  | 'foundation' | 'conflict' | 'growth' | 'betrayal' | 'redemption'
  | 'revelation' | 'war' | 'triumph' | 'tournament' | 'exploration'
  | 'revenge' | 'romance' | 'finale';

export interface ArcChapterPlan {
  chapterNumber: number;
  title: string;
  brief: string;
  tensionLevel: number;
}

// ── Power System ─────────────────────────────────────────────────────────────

export interface PowerSystem {
  name: string;
  realms: PowerRealm[];
  resources: string[];
  techniqueGrades: string[];
  itemGrades: string[];
  currencies?: Array<{
    name: string;
    value: number;
    description: string;
  }>;
}

export interface PowerRealm {
  name: string;
  description: string;
  index?: number;
  rank?: number;
  subLevels?: number;
  abilities?: string[];
  breakthroughDifficulty?: string;
}

// ── Style Bible ──────────────────────────────────────────────────────────────

export interface StyleBible {
  authorVoice: string;
  narrativeStyle: 'first_person' | 'third_person_limited' | 'third_person_omniscient';
  toneKeywords: string[];
  avoidKeywords: string[];
  dialogueRatio: [number, number];
  descriptionRatio: [number, number];
  innerThoughtRatio: [number, number];
  actionRatio: [number, number];
  pacingStyle: 'fast' | 'medium' | 'slow';
  genreConventions: string[];
}

// ── Gemini API ───────────────────────────────────────────────────────────────

export interface GeminiResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  finishReason: string;
}

export interface GeminiConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}
