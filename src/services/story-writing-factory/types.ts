/**
 * Story Writing Factory - Unified Types
 *
 * Hợp nhất types từ các tool cũ:
 * - dopamine-writing-optimizer.ts
 * - plot-arc-manager.ts
 * - story-factory/types.ts
 * - ai-story-writer.ts
 */

// ============================================================================
// BASIC TYPES
// ============================================================================

export type GenreType =
  | 'tien-hiep' | 'huyen-huyen' | 'do-thi' | 'kiem-hiep'
  | 'lich-su' | 'khoa-huyen' | 'vong-du' | 'dong-nhan'
  | 'mat-the' | 'linh-di' | 'quan-truong' | 'di-gioi'
  | 'ngon-tinh';

export type AIProviderType = 'openrouter' | 'deepseek' | 'openai' | 'claude' | 'gemini';

export type AgentRole = 'architect' | 'writer' | 'critic';

export type DopamineType =
  | 'face_slap' | 'power_reveal' | 'treasure_gain' | 'breakthrough'
  | 'revenge' | 'recognition' | 'beauty_encounter' | 'secret_identity';

// ============================================================================
// FACTORY CONFIG
// ============================================================================

export interface FactoryConfig {
  provider: AIProviderType;
  model: string;
  temperature: number;
  maxTokens: number;
  targetWordCount: number;
  genre: GenreType;
  /** Topic ID from GENRE_CONFIG (e.g. 'do-thi-thuong-chien') — used to load topicPromptHints */
  topicId?: string;
  minQualityScore: number;
  maxRetries: number;
  use3AgentWorkflow: boolean;
}

export const DEFAULT_CONFIG: FactoryConfig = {
  provider: 'gemini',
  model: 'gemini-3-flash-preview',
  temperature: 0.75,
  maxTokens: 8000,
  targetWordCount: 2800,
  genre: 'tien-hiep',
  minQualityScore: 7,
  maxRetries: 3,
  use3AgentWorkflow: true,
};

// ============================================================================
// WORLD BIBLE (từ dopamine-writing-optimizer)
// ============================================================================

export interface WorldBible {
  projectId: string;
  storyTitle: string;

  // Power System
  powerSystem: PowerSystem;

  // Protagonist
  protagonist: CharacterState;

  // NPCs & Relationships
  npcRelationships: NPCRelationship[];

  // Locations
  locations: LocationInfo[];

  // Plot
  openPlotThreads: PlotThread[];
  resolvedPlotThreads: PlotThread[];
  foreshadowing: Foreshadowing[];

  // World Rules
  worldRules: string[];
}

export interface PowerSystem {
  name: string;
  realms: PowerRealm[];
  resources: string[];
  techniqueGrades: string[];
  itemGrades: string[];
  currencies: CurrencyInfo[];
}

export interface PowerRealm {
  name: string;
  rank: number;
  subLevels: number;
  description: string;
  abilities: string[];
  breakthroughDifficulty: 'easy' | 'medium' | 'hard' | 'bottleneck';
}

export interface CurrencyInfo {
  name: string;
  value: number;
  description: string;
}

export interface CharacterState {
  name: string;
  realm: string;
  level: number;
  age: number;
  traits: string[];
  abilities: string[];
  inventory: InventoryItem[];
  goals: string[];
  status: 'active' | 'injured' | 'dead' | 'missing';
}

export interface InventoryItem {
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'treasure';
  grade: string;
  quantity: number;
  description?: string;
}

export interface NPCRelationship {
  name: string;
  role: 'ally' | 'enemy' | 'neutral' | 'mentor' | 'love_interest';
  realm?: string;
  affinity: number; // -100 to 100
  description: string;
  firstAppearance: number;
  lastAppearance?: number;
}

export interface LocationInfo {
  name: string;
  type: 'hometown' | 'sect' | 'city' | 'wilderness' | 'dungeon' | 'secret_realm';
  description: string;
  significance: string;
  visitHistory: { chapter: number; event: string }[];
}

export interface PlotThread {
  id: string;
  name: string;
  description: string;
  priority: 'main' | 'sub' | 'background';
  status: 'open' | 'developing' | 'resolved';
  startChapter: number;
  resolvedChapter?: number;
}

export interface Foreshadowing {
  id: string;
  hint: string;
  targetChapter: number;
  payoff: string;
  status: 'planted' | 'revealed';
}

// ============================================================================
// WORLD CONSTRAINTS (for consistency enforcement across all genres)
// ============================================================================

export interface WorldConstraint {
  id: string;
  projectId?: string;
  blueprintId?: string;
  category: 'quantity' | 'hierarchy' | 'rule' | 'geography' | 'character_limit' | 'power_cap';
  subject: string;
  predicate: string;
  value: string | number;
  context: string;
  immutable: boolean;
}

// ============================================================================
// STYLE BIBLE
// ============================================================================

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

// ============================================================================
// ARC TYPES (từ plot-arc-manager)
// ============================================================================

export interface StoryArc {
  id: string;
  projectId: string;
  arcNumber: number;
  title: string;
  theme: ArcTheme;
  startChapter: number;
  endChapter: number;
  tensionCurve: number[];
  climaxChapter: number;
  status: 'planned' | 'in_progress' | 'completed';
  summary?: string;
  isFinalArc?: boolean;
}

export type ArcTheme =
  | 'foundation' | 'conflict' | 'growth' | 'betrayal'
  | 'redemption' | 'revelation' | 'war' | 'triumph'
  | 'tournament' | 'exploration' | 'revenge' | 'romance'
  | 'finale';

export interface PlannedTwist {
  id: string;
  arcId: string;
  targetChapter: number;
  twistType: TwistType;
  description: string;
  foreshadowingHints: string[];
  status: 'planned' | 'foreshadowed' | 'revealed';
}

export type TwistType =
  | 'betrayal' | 'revelation' | 'hidden_identity' | 'power_up'
  | 'alliance_shift' | 'plot_reversal' | 'death' | 'resurrection';

// ============================================================================
// CHAPTER TYPES
// ============================================================================

export interface EmotionalArc {
  opening: string;
  midpoint: string;
  climax: string;
  closing: string;
}

export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  summary: string;
  pov: string;
  location: string;
  scenes: SceneOutline[];
  tensionLevel: number;
  dopaminePoints: DopaminePoint[];
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

export interface DopaminePoint {
  type: DopamineType;
  description: string;
  intensity: number; // 1-10
  setup: string;
  payoff: string;
}

export interface ChapterContent {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  qualityScore: number;
  dopamineDelivered: DopaminePoint[];
  status: 'draft' | 'reviewed' | 'approved' | 'published';
}

// ============================================================================
// QUALITY TYPES (từ quality-gate)
// ============================================================================

export interface QualityReport {
  chapterId: string;
  overallScore: number;
  writingQuality: number;
  pacing: number;
  engagement: number;
  dopamineDelivery: number;
  issues: QualityIssue[];
  action: 'approve' | 'revise' | 'rewrite';
  revisionNotes?: string;
}

export interface QualityIssue {
  type: 'word_count' | 'pacing' | 'weak_hook' | 'missing_cliffhanger' |
        'low_dopamine' | 'repetitive' | 'inconsistency';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  suggestion?: string;
}

export interface CompositionAnalysis {
  dialogueRatio: number;
  descriptionRatio: number;
  innerThoughtRatio: number;
  actionRatio: number;
  sentenceVariety: number;
  hookStrength: number;
  cliffhangerStrength: number;
}

// ============================================================================
// AGENT TYPES (từ dopamine-writing-optimizer)
// ============================================================================

export interface AgentConfig {
  role: AgentRole;
  provider: AIProviderType;
  model: string;
  temperature: number;
  systemPrompt: string;
}

export interface ArchitectOutput {
  chapterOutline: ChapterOutline;
  worldUpdates?: Partial<WorldBible>;
}

export interface WriterOutput {
  chapterContent: string;
  wordCount: number;
  title: string;
}

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
  type: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  location?: string;
}

// ============================================================================
// MEMORY/CONTEXT TYPES
// ============================================================================

export interface StoryMemory {
  projectId: string;
  chapterSummaries: ChapterSummary[];
  arcSummaries: ArcSummary[];
  beatLedger: BeatLedgerEntry[];
  activeContext: ActiveContext;
}

export interface ChapterSummary {
  chapterNumber: number;
  summary: string;
  keyEvents: string[];
  wordCount: number;
}

export interface ArcSummary {
  arcNumber: number;
  startChapter: number;
  endChapter: number;
  summary: string;
  majorEvents: string[];
}

export interface BeatLedgerEntry {
  beatType: string;
  lastUsedChapter: number;
  cooldownChapters: number;
}

export interface ActiveContext {
  recentChapters: ChapterSummary[];
  openPlotThreads: PlotThread[];
  characterStates: CharacterState[];
  currentLocation: string;
  currentArc: StoryArc | null;
  tensionTarget: number;
}

// ============================================================================
// IDEA & BLUEPRINT TYPES (từ story-factory)
// ============================================================================

export interface StoryIdea {
  id: string;
  title: string;
  tagline: string;
  genre: GenreType;
  premise: string;
  hooks: string[];
  uniqueSellingPoint: string;
  estimatedChapters: number;
}

export interface StoryBlueprint {
  id: string;
  ideaId: string;
  title: string;
  genre: GenreType;
  worldBible: WorldBible;
  styleBible: StyleBible;
  protagonist: CharacterState;
  plannedArcs: StoryArc[];
  targetChapters: number;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface FactoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
}

export interface ChapterResult extends FactoryResult<ChapterContent> {
  outline?: ChapterOutline;
  qualityReport?: QualityReport;
  criticReport?: CriticOutput;
  retryCount: number;
}

export interface BatchResult {
  success: boolean;
  chaptersGenerated: number;
  chaptersFailed: number;
  results: ChapterResult[];
  totalDuration: number;
}

// ============================================================================
// STORY OUTLINE TYPES (for full story planning)
// ============================================================================

export interface StoryOutline {
  id: string;
  title: string;
  genre: GenreType;
  premise: string;
  themes: string[];
  mainConflict: string;
  targetChapters: number;
  targetArcs: number;
  protagonist: {
    name: string;
    startingState: string;
    endGoal: string;
    characterArc: string;
  };
  majorPlotPoints: PlotPoint[];
  endingVision: string;
  uniqueHooks: string[];
}

export interface PlotPoint {
  id: string;
  name: string;
  description: string;
  targetArc: number;
  type: 'inciting_incident' | 'rising_action' | 'midpoint' | 'climax' | 'resolution';
  importance: 'critical' | 'major' | 'supporting';
}

export interface ArcOutline {
  id: string;
  arcNumber: number;
  title: string;
  theme: ArcTheme;
  premise: string;
  startChapter: number;
  endChapter: number;
  chapterCount: number;

  // Arc structure
  setup: string;
  confrontation: string;
  resolution: string;

  // Key events
  incitingIncident: string;
  midpoint: string;
  climax: string;
  cliffhanger: string;

  // Character
  protagonistGrowth: string;
  newCharacters: string[];
  enemyOrObstacle: string;

  // Power progression
  startingRealm: string;
  endingRealm: string;
  breakthroughs: string[];

  // Chapters outline
  chapterOutlines: ArcChapterPlan[];

  tensionCurve: number[];
  status: 'planned' | 'in_progress' | 'completed';
}

export interface ArcChapterPlan {
  chapterNumber: number;
  localNumber: number; // Position within arc (1, 2, 3...)
  title: string;
  purpose: string;
  keyEvents: string[];
  tensionLevel: number;
  dopamineType?: DopamineType;
  cliffhangerHint: string;
}

// ============================================================================
// RUNNER TYPES (for continuous execution)
// ============================================================================

export type RunnerStatus =
  | 'idle'
  | 'planning_story'
  | 'planning_arcs'
  | 'writing'
  | 'paused'
  | 'completed'
  | 'error';

export interface RunnerState {
  projectId: string;
  status: RunnerStatus;

  // Progress
  currentArc: number;
  currentChapter: number;
  totalArcs: number;
  totalChapters: number;

  // Timing
  startedAt: number;
  lastActivityAt: number;
  estimatedCompletion?: number;

  // Stats
  chaptersWritten: number;
  chaptersFailed: number;
  totalWords: number;
  averageWordsPerChapter: number;

  // Error handling
  lastError?: string;
  retryCount: number;
}

export interface RunnerCallbacks {
  onStoryPlanned?: (outline: StoryOutline) => void;
  onArcPlanned?: (arc: ArcOutline) => void;
  onArcStarted?: (arcNumber: number, arc: ArcOutline) => void;
  onArcCompleted?: (arcNumber: number, arc: ArcOutline) => void;
  onChapterStarted?: (chapterNumber: number) => void;
  onChapterCompleted?: (chapterNumber: number, result: ChapterResult) => void;
  onChapterFailed?: (chapterNumber: number, error: string) => void;
  onProgress?: (state: RunnerState) => void;
  onStatusChange?: (status: RunnerStatus, message: string) => void;
  onCompleted?: (state: RunnerState) => void;
  onError?: (error: string) => void;
}

export interface RunnerConfig {
  // Delays
  delayBetweenChapters: number; // ms
  delayBetweenArcs: number; // ms

  // Retries
  maxChapterRetries: number;
  maxArcRetries: number;

  // Auto-save
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // chapters

  // Quality
  minQualityToProgress: number;

  // Pause conditions
  pauseOnError: boolean;
  pauseAfterArc: boolean;
}
