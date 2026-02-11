/**
 * Story Factory Types
 * TypeScript interfaces matching the database schema from 0022_create_factory_tables.sql
 */

// ==============================================
// ENUMS & CONSTANTS
// ==============================================

export type FactoryGenre =
  | 'system-litrpg'
  | 'urban-modern'
  | 'romance'
  | 'huyen-huyen'
  | 'action-adventure'
  | 'historical'
  | 'tien-hiep'
  | 'sci-fi-apocalypse'
  | 'horror-mystery';

export type WritingStyle = 'dramatic' | 'humorous' | 'poetic' | 'romantic' | 'epic' | 'dark' | 'adventurous' | 'standard';
export type ToneStyle = 'serious' | 'lighthearted' | 'dark' | 'emotional' | 'exciting' | 'balanced';
export type VocabularyLevel = 'simple' | 'standard' | 'literary';
export type AuthorStatus = 'active' | 'inactive' | 'retired';

export type IdeaStatus = 'generated' | 'approved' | 'blueprint_created' | 'in_production' | 'rejected';
export type BlueprintStatus = 'generated' | 'cover_pending' | 'ready' | 'in_production';
export type ProductionStatus = 'queued' | 'active' | 'writing' | 'paused' | 'finished' | 'error';
export type WriteQueueStatus = 'pending' | 'writing' | 'quality_check' | 'rewriting' | 'completed' | 'failed';
export type PublishQueueStatus = 'scheduled' | 'publishing' | 'published' | 'failed';
export type PublishSlot = 'morning' | 'afternoon' | 'evening';

export type ErrorType = 'ai_failure' | 'quality_failure' | 'publish_failure' | 'system_error' | 'rate_limit';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'ignored';

export type RunType = 'daily_tasks' | 'main_loop' | 'writer_worker' | 'publisher';

export type EndingType = 'happy' | 'bittersweet' | 'tragic' | 'open';
export type TargetAudience = 'male' | 'female' | 'general';
export type ContentRating = 'all_ages' | 'teen' | 'mature' | 'adult';

// Default genre distribution percentages
export const DEFAULT_GENRE_DISTRIBUTION: Record<FactoryGenre, number> = {
  'system-litrpg': 20,
  'urban-modern': 18,
  'romance': 15,
  'huyen-huyen': 12,
  'action-adventure': 10,
  'historical': 10,
  'tien-hiep': 8,
  'sci-fi-apocalypse': 5,
  'horror-mystery': 2,
};

// Publishing slots configuration
export interface PublishSlotConfig {
  name: PublishSlot;
  start_hour: number;
  end_hour: number;
  chapters: number;
}

export const DEFAULT_PUBLISH_SLOTS: PublishSlotConfig[] = [
  { name: 'morning', start_hour: 6, end_hour: 10, chapters: 7 },
  { name: 'afternoon', start_hour: 12, end_hour: 14, chapters: 6 },
  { name: 'evening', start_hour: 18, end_hour: 22, chapters: 7 },
];

// ==============================================
// 1. FACTORY CONFIG
// ==============================================

export interface FactoryConfig {
  id: string;

  // Idea Generation
  ideas_per_day: number;
  genre_distribution: Record<FactoryGenre, number>;

  // Production
  max_active_stories: number;
  chapters_per_story_per_day: number;
  new_stories_per_day: number;

  // Story Parameters
  min_chapters: number;
  max_chapters: number;
  target_chapter_length: number;

  // Publishing Slots
  publish_slots: PublishSlotConfig[];

  // Quality Control
  min_chapter_quality: number;
  max_rewrite_attempts: number;

  // AI Settings
  ai_provider: string;
  ai_model: string;
  ai_image_model: string;
  ai_temperature: number;

  // Operational
  is_running: boolean;
  last_daily_run: string | null;

  updated_at: string;
}

// ==============================================
// 2. AI AUTHOR PROFILES
// ==============================================

export interface AIAuthorProfile {
  id: string;

  // Identity
  pen_name: string;
  avatar_url: string | null;
  bio: string | null;

  // Writing Style
  writing_style: WritingStyle;
  tone: ToneStyle;
  vocabulary_level: VocabularyLevel;

  // Specialization
  primary_genres: FactoryGenre[];
  secondary_genres: FactoryGenre[];
  avoid_genres: FactoryGenre[];

  // AI Prompt Persona
  persona_prompt: string;
  style_examples: string | null;

  // Stats
  total_stories: number;
  total_chapters: number;
  avg_quality_score: number;

  // Status
  status: AuthorStatus;
  created_at: string;
  updated_at: string;
}

// ==============================================
// 3. STORY IDEAS
// ==============================================

export interface StoryIdea {
  id: string;

  // Basic Info
  genre: FactoryGenre;
  sub_genre: string | null;
  title: string;
  premise: string | null;
  hook: string | null;
  usp: string | null;

  // Story Elements
  protagonist_archetype: string | null;
  antagonist_type: string | null;
  setting_type: string | null;
  power_system_type: string | null;
  main_conflict: string | null;

  // Planning
  estimated_chapters: number;
  target_audience: TargetAudience;
  content_rating: ContentRating;

  // Tags
  tags: string[];
  tropes: string[];

  // Lifecycle
  status: IdeaStatus;
  priority: number;
  rejection_reason: string | null;

  // Tracking
  created_at: string;
  approved_at: string | null;
  production_started_at: string | null;
}

// ==============================================
// 4. STORY BLUEPRINTS
// ==============================================

export interface PowerSystemLevel {
  name: string;
  description: string;
  requirements: string;
}

export interface PowerSystemConfig {
  name: string;
  levels: PowerSystemLevel[];
  rules: string[];
}

export interface LocationInfo {
  name: string;
  description: string;
  significance: string;
}

export interface FactionInfo {
  name: string;
  description: string;
  alignment: string;
  key_members: string[];
}

export interface CharacterInfo {
  name: string;
  age: number | null;
  gender: string | null;
  personality: string;
  appearance: string;
  background: string;
  goals: string[];
  abilities: string[];
  weaknesses: string[];
}

export interface CharacterRelationship {
  char1: string;
  char2: string;
  relationship: string;
  evolution: string;
}

export interface ArcOutline {
  arc_number: number;
  title: string;
  start_chapter: number;
  end_chapter: number;
  summary: string;
  tension_curve: string;
  climax_chapter: number;
  key_events: string[];
}

export interface PlotPoint {
  chapter: number;
  event: string;
  impact: string;
}

export interface PlannedTwist {
  target_chapter: number;
  twist_type: string;
  description: string;
  foreshadowing_start: number;
}

export interface StoryBlueprint {
  id: string;
  idea_id: string | null;
  author_id: string | null;

  // Basic Info
  title: string;
  genre: FactoryGenre;
  sub_genre: string | null;

  // Synopsis
  short_synopsis: string | null;
  full_synopsis: string | null;

  // World Bible
  world_name: string | null;
  world_description: string | null;
  world_history: string | null;
  power_system: PowerSystemConfig | null;
  locations: LocationInfo[];
  factions: FactionInfo[];
  world_rules: string[];

  // Characters
  protagonist: CharacterInfo | null;
  antagonists: CharacterInfo[];
  supporting_characters: CharacterInfo[];
  character_relationships: CharacterRelationship[];

  // Plot Structure
  total_planned_chapters: number | null;
  arc_outlines: ArcOutline[];
  major_plot_points: PlotPoint[];
  planned_twists: PlannedTwist[];
  ending_type: EndingType | null;

  // Cover Image
  cover_prompt: string | null;
  cover_url: string | null;

  // Metadata
  status: BlueprintStatus;
  quality_score: number | null;
  generation_tokens: number | null;

  created_at: string;
  updated_at: string;
}

// ==============================================
// 5. PRODUCTION QUEUE
// ==============================================

export interface ProductionQueueItem {
  id: string;
  blueprint_id: string | null;
  novel_id: string | null;
  project_id: string | null;
  author_id: string | null;

  // Production State
  status: ProductionStatus;
  priority: number;

  // Chapter Tracking
  current_chapter: number;
  total_chapters: number | null;
  chapters_per_day: number;

  // Daily Tracking
  last_write_date: string | null;
  chapters_written_today: number;

  // Context Memory
  last_chapter_summary: string | null;
  running_plot_threads: PlotThreadState[];
  character_states: Record<string, CharacterState>;

  // Quality Stats
  total_rewrites: number;
  avg_chapter_quality: number | null;
  quality_scores: number[];

  // Error Tracking
  consecutive_errors: number;
  last_error: string | null;
  last_error_at: string | null;

  // Lifecycle
  queued_at: string;
  activated_at: string | null;
  paused_at: string | null;
  paused_reason: string | null;
  finished_at: string | null;

  updated_at: string;
}

export interface PlotThreadState {
  id: string;
  name: string;
  status: 'active' | 'resolved';
  last_mentioned_chapter: number;
}

export interface CharacterState {
  name: string;
  current_state: string;
  location: string;
  last_chapter: number;
}

// ==============================================
// 6. CHAPTER WRITE QUEUE
// ==============================================

export interface ChapterWriteQueueItem {
  id: string;
  production_id: string;

  // Chapter Info
  chapter_number: number;
  arc_number: number | null;

  // Writing State
  status: WriteQueueStatus;
  attempt_count: number;

  // Context for writing
  previous_summary: string | null;
  plot_objectives: string | null;
  tension_target: number | null;
  special_instructions: string | null;

  // Result
  result_chapter_id: string | null;
  content_preview: string | null;
  word_count: number | null;
  quality_score: number | null;

  // Error
  error_message: string | null;

  // Timing
  scheduled_slot: PublishSlot | null;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;

  created_at: string;
}

// ==============================================
// 7. CHAPTER PUBLISH QUEUE
// ==============================================

export interface ChapterPublishQueueItem {
  id: string;
  production_id: string;
  chapter_id: string;

  // Scheduling
  scheduled_time: string;
  publish_slot: PublishSlot | null;

  // State
  status: PublishQueueStatus;
  published_at: string | null;
  error_message: string | null;
  retry_count: number;

  created_at: string;
}

// ==============================================
// 8. FACTORY STATS
// ==============================================

export interface FactoryStats {
  id: string;
  stat_date: string;

  // Production Stats
  active_stories: number;
  stories_started: number;
  stories_finished: number;
  stories_paused: number;
  stories_errored: number;

  // Chapter Stats
  chapters_written: number;
  chapters_published: number;
  chapters_rewritten: number;
  chapters_failed: number;
  avg_chapter_quality: number | null;
  avg_chapter_length: number | null;

  // Idea Stats
  ideas_generated: number;
  blueprints_created: number;
  covers_generated: number;

  // Error Stats
  total_errors: number;
  ai_errors: number;
  quality_errors: number;
  publish_errors: number;

  // AI Usage
  total_ai_calls: number;
  total_tokens_used: number;
  total_image_generations: number;
  estimated_cost_usd: number | null;

  // Performance
  avg_chapter_write_time_seconds: number | null;
  avg_idea_generation_time_seconds: number | null;

  created_at: string;
}

// ==============================================
// 9. FACTORY ERRORS
// ==============================================

export interface FactoryError {
  id: string;

  // Context
  production_id: string | null;
  novel_id: string | null;
  chapter_number: number | null;

  // Error Info
  error_type: ErrorType;
  error_code: string | null;
  error_message: string;
  error_details: Record<string, unknown> | null;
  stack_trace: string | null;

  // Severity
  severity: ErrorSeverity;
  requires_attention: boolean;

  // Resolution
  status: ErrorStatus;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  auto_resolved: boolean;

  created_at: string;
}

// ==============================================
// 10. FACTORY RUN LOG
// ==============================================

export interface FactoryRunLog {
  id: string;

  // Run Info
  run_type: RunType;
  started_at: string;
  completed_at: string | null;

  // Results
  status: 'running' | 'completed' | 'failed';
  results: Record<string, unknown> | null;
  error_message: string | null;

  // Metrics
  duration_seconds: number | null;
  items_processed: number;
}

// ==============================================
// DASHBOARD STATS (from get_factory_dashboard_stats function)
// ==============================================

export interface FactoryDashboardStats {
  active_stories: number;
  queued_stories: number;
  total_stories: number;
  chapters_today: number;
  pending_ideas: number;
  ready_blueprints: number;
  pending_publishes: number;
  new_errors: number;
  total_authors: number;
}

// ==============================================
// SERVICE RESULT TYPES
// ==============================================

export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface BatchResult<T = void> {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ item: T; success: boolean; error?: string }>;
}

// ==============================================
// AI GENERATION TYPES
// ==============================================

export interface IdeaGenerationPrompt {
  genre: FactoryGenre;
  avoid_similar_to?: string[];
  target_audience?: TargetAudience;
  include_tropes?: string[];
  exclude_tropes?: string[];
  special_instructions?: string; // For quality improvement feedback
}

export interface BlueprintGenerationInput {
  idea: StoryIdea;
  author: AIAuthorProfile;
  target_chapters: number;
}

export interface ChapterGenerationInput {
  blueprint: StoryBlueprint;
  production: ProductionQueueItem;
  chapter_number: number;
  previous_chapters_summary: string;
  plot_objectives: string;
  tension_target: number;
  special_instructions?: string;
  author_persona: string;
}

export interface ChapterQualityCheckInput {
  content: string;
  chapter_number: number;
  genre: FactoryGenre;
  blueprint: StoryBlueprint;
  min_quality_score: number;
}

export interface ChapterQualityResult {
  score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  metrics: {
    length_score: number;
    pacing_score: number;
    dialogue_ratio: number;
    consistency_score: number;
    engagement_score: number;
  };
}

export interface CoverGenerationInput {
  title: string;
  genre: FactoryGenre;
  protagonist: CharacterInfo | null;
  setting: string;
  tone: ToneStyle;
}

// ==============================================
// SCHEDULING TYPES
// ==============================================

export interface ScheduledPublish {
  production_id: string;
  chapter_id: string;
  scheduled_time: Date;
  slot: PublishSlot;
}

export interface DailyWriteSchedule {
  production_id: string;
  chapters_to_write: number;
  priority: number;
}

// ==============================================
// BOOTSTRAP TYPES
// ==============================================

export interface BootstrapConfig {
  total_stories: number;
  genre_distribution?: Record<FactoryGenre, number>;
  start_immediately?: boolean;
}

export interface BootstrapProgress {
  phase: 'ideas' | 'blueprints' | 'covers' | 'production' | 'complete';
  total: number;
  completed: number;
  current_item?: string;
  errors: string[];
}

// ==============================================
// GEMINI SPECIFIC TYPES
// ==============================================

export interface GeminiGenerateOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  systemInstruction?: string;
}

// Image resolution options
export type ImageResolution = '1K' | '2K' | '4K';

// Aspect ratio options for image generation
export type ImageAspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

// Gemini image model
export type GeminiImageModel = 'gemini-3-pro-image-preview';

export interface GeminiImageOptions {
  model?: GeminiImageModel;
  numberOfImages?: number;
  aspectRatio?: ImageAspectRatio;
  imageSize?: ImageResolution;
  personGeneration?: 'dont_allow' | 'allow_adult';
  safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high';
  useGoogleSearch?: boolean;  // Enable grounding with Google Search
}

export interface GeminiImageResult {
  success: boolean;
  images?: Array<{
    base64: string;
    mimeType: string;
  }>;
  text?: string;  // Model may return text alongside images
  error?: string;
}
