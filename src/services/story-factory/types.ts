/**
 * Story Factory Type Definitions
 * Định nghĩa các types cho hệ thống công xưởng truyện quy mô lớn
 */

// ==================== IDEA BANK ====================

export interface StoryIdea {
  id: string;
  title: string;
  premise: string;  // Ý tưởng chính trong 1-2 câu
  genre: GenreType;
  subGenres: string[];
  tags: string[];
  hooks: string[];  // Các điểm hấp dẫn chính
  targetAudience: 'male' | 'female' | 'both';
  estimatedChapters: number;
  uniqueSellingPoint: string;  // Điểm khác biệt so với truyện khác
  inspirationSources?: string[];  // Nguồn cảm hứng
  createdAt: Date;
  usedCount: number;  // Đã dùng bao nhiêu lần
  successRate?: number;  // Tỷ lệ thành công (reader engagement)
}

export interface IdeaMashup {
  ideaA: StoryIdea;
  ideaB: StoryIdea;
  resultIdea: StoryIdea;
  mashupType: 'setting' | 'character' | 'plot' | 'power_system';
}

// ==================== DOPAMINE PATTERNS ====================

export interface DopaminePattern {
  name: string;
  description: string;
  frequency: 'every_chapter' | 'every_3_chapters' | 'every_5_chapters' | 'every_10_chapters' | 'every_arc' | 'arc_end' | 'major_arc';
  intensity: 'low' | 'medium' | 'high' | 'very_high' | 'extreme';
  setup: string;
  payoff: string;
}

// ==================== GENRE TEMPLATES ====================

export type GenreType =
  | 'tien-hiep'      // Tu tiên
  | 'huyen-huyen'    // Huyền huyễn
  | 'do-thi'         // Đô thị
  | 'kiem-hiep'      // Kiếm hiệp
  | 'dong-nhan'      // Đồng nhân
  | 'khoa-huyen'     // Khoa huyễn
  | 'lich-su'        // Lịch sử
  | 'quan-truong'    // Quan trường
  | 'vong-du'        // Võng du
  | 'di-gioi'        // Dị giới
  | 'mat-the'        // Mạt thế
  | 'linh-di';       // Linh dị

export interface GenreTemplate {
  genre: GenreType;
  name: string;
  description: string;

  // Story structure
  typicalArcs: ArcTemplate[];
  chapterFormula: ChapterFormula;
  pacingGuide: PacingGuide;

  // Character templates
  protagonistTypes: ProtagonistTemplate[];
  antagonistTypes: AntagonistTemplate[];
  supportingTypes: SupportingCharacterTemplate[];

  // World building
  settingTemplates: SettingTemplate[];
  powerSystems: PowerSystemTemplate[];

  // Reader engagement
  dopaminePatterns: DopaminePattern[];
  cliffhangerTypes: string[];

  // Writing style
  toneKeywords: string[];
  avoidKeywords: string[];
  compositionRatio: {
    dialogue: number;
    description: number;
    innerThoughts: number;
    action: number;
  };
}

export interface ArcTemplate {
  name: string;
  chapterRange: [number, number];  // [start, end] relative position
  description: string;
  keyEvents: string[];
  tensionCurve: number[];  // 0-100 array
  typicalTwists: string[];
}

export interface ChapterFormula {
  targetWordCount: number;
  minDialogueSegments: number;
  requiredElements: string[];
  forbiddenElements: string[];
  openingHookType: 'action' | 'mystery' | 'conflict' | 'revelation';
  cliffhangerIntensity: 'mild' | 'medium' | 'intense';
}

export interface PacingGuide {
  chapterRanges: {
    range: [number, number];
    pace: 'very_fast' | 'fast' | 'medium' | 'slow';
    focus: string;
    dopamineFrequency: 'high' | 'medium' | 'low';
  }[];
}

// ==================== CHARACTER ARCHETYPES ====================

export interface CharacterArchetype {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'love_interest' | 'mentor';
  description: string;
  personalityTraits: string[];
  backgroundTemplates: string[];
  growthArc: string;
  typicalAbilities: string[];
  weaknesses: string[];
  catchphrases: string[];
  relationshipPatterns: {
    withProtagonist?: string;
    withAntagonist?: string;
    withLoveInterest?: string;
  };
}

export interface ProtagonistTemplate extends CharacterArchetype {
  role: 'protagonist';
  goldenFingerType: string;  // Cheat/đặc quyền của nhân vật chính
  startingCondition: 'weak' | 'crippled' | 'fallen' | 'reborn' | 'transmigrated';
  motivationType: 'revenge' | 'protection' | 'power' | 'freedom' | 'love' | 'justice';
  growthRate: 'explosive' | 'steady' | 'slow_then_fast';
}

export interface AntagonistTemplate extends CharacterArchetype {
  role: 'antagonist';
  villainType: 'arrogant_young_master' | 'scheming_elder' | 'jealous_peer' | 'ancient_enemy' | 'hidden_mastermind';
  threatLevel: 'minor' | 'arc_boss' | 'major' | 'final';
  defeatMethod: 'combat' | 'outsmart' | 'expose' | 'redemption';
}

export interface SupportingCharacterTemplate extends CharacterArchetype {
  role: 'supporting' | 'love_interest' | 'mentor';
  supportType: 'comic_relief' | 'loyal_friend' | 'mysterious_ally' | 'rival_friend';
  plotRelevance: 'background' | 'recurring' | 'essential';
}

// ==================== WORLD BUILDING ====================

export interface SettingTemplate {
  id: string;
  name: string;
  type: 'sect' | 'city' | 'realm' | 'dimension' | 'planet' | 'company' | 'school';
  description: string;
  hierarchyLevels: string[];
  resources: string[];
  conflicts: string[];
  atmosphere: string;
}

export interface PowerSystemTemplate {
  id: string;
  name: string;
  type: 'cultivation' | 'magic' | 'martial' | 'technology' | 'supernatural';
  levels: PowerLevel[];
  specializations: string[];
  resources: string[];  // Pills, artifacts, etc.
  limitations: string[];
  breakthroughRequirements: string[];
}

export interface PowerLevel {
  name: string;
  rank: number;
  description: string;
  typicalAbilities: string[];
  breakthroughDifficulty: 'easy' | 'medium' | 'hard' | 'bottleneck';
}

// ==================== BLUEPRINT ====================

export interface StoryBlueprint {
  id: string;
  createdAt: Date;
  status: 'draft' | 'approved' | 'in_production' | 'completed';

  // Core info
  idea: StoryIdea;
  genre: GenreType;
  targetChapters: number;

  // Characters
  protagonist: GeneratedCharacter;
  antagonists: GeneratedCharacter[];
  supportingCast: GeneratedCharacter[];

  // World
  worldSetting: GeneratedWorld;
  powerSystem: GeneratedPowerSystem;

  // Plot
  plotOutline: PlotOutline;
  arcs: GeneratedArc[];
  plannedTwists: PlannedTwist[];

  // Style
  writingStyle: WritingStyle;
  authorPersona: string;
}

export interface GeneratedCharacter {
  name: string;
  archetype: string;
  age: number;
  gender: 'male' | 'female';
  appearance: string;
  personality: string;
  background: string;
  abilities: string[];
  weaknesses: string[];
  goals: string[];
  secrets: string[];
  relationshipMap: Record<string, string>;
  growthPlan: {
    chapter: number;
    development: string;
  }[];
}

export interface GeneratedWorld {
  name: string;
  type: string;
  geography: string;
  society: string;
  politics: string;
  economy: string;
  culture: string;
  conflicts: string[];
  secrets: string[];
  locations: {
    name: string;
    type: string;
    description: string;
    significance: string;
  }[];
}

export interface GeneratedPowerSystem {
  name: string;
  description: string;
  levels: {
    name: string;
    requirements: string;
    abilities: string;
  }[];
  specializations: string[];
  resources: string[];
  limitations: string[];
  mcStartLevel: string;
  mcEndLevel: string;
}

export interface PlotOutline {
  premise: string;
  incitingIncident: string;
  majorConflicts: string[];
  climax: string;
  resolution: string;
  themes: string[];
  subplots: {
    name: string;
    description: string;
    startChapter: number;
    endChapter: number;
  }[];
}

export interface GeneratedArc {
  number: number;
  name: string;
  chapterRange: [number, number];
  premise: string;
  mainConflict: string;
  setting: string;
  newCharacters: string[];
  powerUpEvents: string[];
  romanticDevelopment?: string;
  conclusion: string;
  transitionToNext: string;
}

export interface PlannedTwist {
  chapter: number;
  type: 'revelation' | 'betrayal' | 'power_up' | 'death' | 'return' | 'identity';
  description: string;
  foreshadowingChapters: number[];
  impact: 'minor' | 'major' | 'game_changing';
}

export interface WritingStyle {
  tone: string[];
  pacing: 'very_fast' | 'fast' | 'medium' | 'slow';
  dialogueStyle: 'witty' | 'formal' | 'casual' | 'dramatic';
  descriptionLevel: 'minimal' | 'moderate' | 'detailed';
  actionSceneStyle: 'choreographed' | 'visceral' | 'cinematic';
  humorLevel: 'none' | 'light' | 'moderate' | 'heavy';
}

// ==================== PRODUCTION ====================

export interface ProductionJob {
  id: string;
  blueprintId: string;
  status: 'queued' | 'generating' | 'writing' | 'reviewing' | 'completed' | 'failed';
  priority: number;

  // Progress
  currentChapter: number;
  targetChapters: number;
  chaptersPerDay: number;

  // Stats
  totalWordsWritten: number;
  averageQualityScore: number;
  startedAt?: Date;
  completedAt?: Date;

  // Worker info
  assignedWorker?: string;
  lastActivity?: Date;

  // Error handling
  errorCount: number;
  lastError?: string;
}

export interface WorkerStatus {
  id: string;
  status: 'idle' | 'working' | 'paused' | 'error';
  currentJob?: string;
  currentChapter?: number;
  performance: {
    chaptersWritten: number;
    averageTime: number;  // ms per chapter
    averageQuality: number;
    errorRate: number;
  };
}

export interface ProductionBatch {
  id: string;
  name: string;
  createdAt: Date;
  status: 'planning' | 'generating_blueprints' | 'in_production' | 'completed';

  // Configuration
  totalStories: number;
  genres: GenreType[];
  chaptersPerStory: number;
  dailyChaptersPerStory: number;

  // Workers
  workerCount: number;

  // Progress
  storiesCompleted: number;
  totalChaptersWritten: number;

  // Stats
  averageQuality: number;
  estimatedCompletion?: Date;
}

// ==================== QUALITY ====================

export interface QualityReport {
  chapterId: string;
  storyId: string;

  // Scores (0-10)
  overallScore: number;
  writingQuality: number;
  plotConsistency: number;
  characterConsistency: number;
  pacing: number;
  engagement: number;
  dopamineDelivery: number;

  // Issues
  issues: QualityIssue[];

  // Recommendation
  action: 'approve' | 'revise' | 'rewrite';
  revisionNotes?: string;
}

export interface QualityIssue {
  type: 'plot_hole' | 'character_inconsistency' | 'pacing_issue' | 'weak_hook' | 'missing_cliffhanger' | 'repetitive' | 'low_engagement';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  location?: string;  // Where in the chapter
  suggestion?: string;
}

// ==================== PUBLISHING ====================

export interface PublishingConfig {
  platform: 'truyencity' | 'webnovel' | 'wattpad' | 'custom';
  schedule: 'immediate' | 'daily' | 'custom';
  chaptersPerRelease: number;
  releaseTime?: string;  // HH:MM
}

export interface PublishingJob {
  id: string;
  storyId: string;
  platform: string;
  status: 'queued' | 'publishing' | 'published' | 'failed';
  chaptersToPublish: number[];
  publishedAt?: Date;
  error?: string;
}

// ==================== ANALYTICS ====================

export interface StoryAnalytics {
  storyId: string;

  // Reader metrics
  totalViews: number;
  uniqueReaders: number;
  averageReadTime: number;

  // Retention
  chapterRetention: Record<number, number>;  // chapter -> % readers still reading
  dropOffPoints: number[];  // Chapters where readers drop off

  // Engagement
  commentsPerChapter: number;
  ratingsAverage: number;
  ratingsCount: number;

  // Revenue (if applicable)
  totalRevenue: number;
  revenuePerChapter: number;
}

// ==================== FACTORY CONFIG ====================

export interface StoryFactoryConfig {
  // AI Provider
  primaryProvider: 'deepseek' | 'openrouter' | 'claude' | 'openai';
  fallbackProvider?: string;

  // Workers
  maxWorkers: number;
  workerTimeout: number;  // ms

  // Quality
  minQualityScore: number;  // 0-10
  autoRewriteThreshold: number;  // Below this, auto rewrite

  // Production
  defaultChaptersPerDay: number;
  batchSize: number;  // How many chapters to generate at once

  // Publishing
  autoPublish: boolean;
  publishingConfigs: PublishingConfig[];
}

// ==================== EVENTS ====================

export type FactoryEvent =
  | { type: 'batch_created'; batchId: string; storyCount: number }
  | { type: 'blueprint_generated'; blueprintId: string; storyId: string }
  | { type: 'chapter_written'; storyId: string; chapter: number; quality: number }
  | { type: 'chapter_published'; storyId: string; chapter: number; platform: string }
  | { type: 'story_completed'; storyId: string; totalChapters: number }
  | { type: 'quality_issue'; storyId: string; chapter: number; issue: string }
  | { type: 'worker_error'; workerId: string; error: string };

export interface FactoryEventHandler {
  onEvent: (event: FactoryEvent) => Promise<void>;
}
