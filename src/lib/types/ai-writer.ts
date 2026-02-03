import type { GenreKey } from './genre-config';

export interface StoryGraphNode {
  id: string;
  project_id: string;
  chapter_number: number;
  chapter_title?: string;
  summary: string;
  key_events?: KeyEvent[];
  character_states?: CharacterState[];
  plot_threads?: PlotThread[];
  cultivation_level?: string;
  magic_level?: string;
  social_status?: string;
  // Optional metadata for future checks (timeline/location/inventory/relations)
  locations?: string[];
  items?: string[];
  relationshipHints?: Array<{ pair: string; state: string }>;
  created_at: string;
}

export interface StoryContext {
  recentChapters: StoryGraphNode[];
  openPlotThreads: PlotThread[];
  characterStates: CharacterState[];
  worldState: Record<string, any>;
}

export interface ChapterResult {
  content: string;
  title: string;
  wordCount: number;
  summary: string;
  keyEvents: KeyEvent[];
  characterStates: CharacterState[];
  plotThreads: PlotThread[];
}

export interface KeyEvent {
  id: string;
  description: string;
  impact: string;
  charactersInvolved: string[];
  occurredInChapter: number;
}

export interface CharacterState {
  name: string;
  cultivation_level?: string;
  magic_level?: string;
  health_status: string;
  emotional_state: string;
  relationships: Record<string, string>;
  abilities: string[];
}

export interface PlotThread {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'developing' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  introducedInChapter: number;
  resolvedInChapter?: number;
}

export type WritingStep = 
  | 'initializing' 
  | 'analyzing' 
  | 'generating_prompt' 
  | 'writing' 
  | 'refining' 
  | 'checking_contradictions'
  | 'updating_graph' 
  | 'saving' 
  | 'completed' 
  | 'failed' 
  | 'stopped';

export interface WritingProgress {
  isWriting: boolean;
  currentStep: WritingStep;
  progress: number;
  message: string;
  error?: string | null;
  jobId?: string | null;
  resultChapterId?: string | null;
}

export interface AIStoryProject {
  id: string;
  user_id: string;
  novel_id: string;
  genre: GenreKey;
  main_character: string;
  cultivation_system?: string;
  magic_system?: string;
  modern_setting?: string;
  tech_level?: string;
  historical_period?: string;
  original_work?: string;
  game_system?: string;
  world_description?: string;
  writing_style: string;
  target_chapter_length: number;
  ai_model: string;
  temperature: number;
  current_chapter: number;
  total_planned_chapters: number;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;

  novel?: {
    id: string;
    title: string;
    author?: string;
    genres?: string[];
    cover_url?: string | null;
    description?: string | null;
  };
}

// ============================================================================
// PLOT ARC SYSTEM - For tension tracking and climax planning
// ============================================================================

export interface PlotArc {
  id: string;
  project_id: string;
  arc_number: number;
  start_chapter: number;
  end_chapter: number;
  arc_title: string;
  arc_description?: string;

  // Tension curve: array of 0-100 values for each chapter
  tension_curve?: number[];

  // Climax planning
  climax_chapter?: number;
  climax_description?: string;
  resolution_chapters?: number[];

  // Arc theme and goals
  theme?: string; // 'revenge', 'power-up', 'romance', 'mystery'
  main_goal?: string;

  // Status
  status: 'planning' | 'in_progress' | 'completed';

  created_at: string;
  updated_at: string;
}

// ============================================================================
// PLANNED TWISTS - For foreshadowing and storytelling
// ============================================================================

export type TwistType =
  | 'betrayal'
  | 'revelation'
  | 'power_up'
  | 'death'
  | 'reunion'
  | 'hidden_identity'
  | 'plot_reversal'
  | 'alliance'
  | 'inheritance'
  | 'prophecy';

export interface ForeshadowingHint {
  chapter: number;
  hint: string;
}

export interface PlannedTwist {
  id: string;
  project_id: string;
  arc_id?: string;

  // Twist planning
  target_chapter: number;
  twist_type: TwistType;
  twist_description: string;

  // Foreshadowing
  foreshadowing_chapters?: number[];
  foreshadowing_hints?: ForeshadowingHint[];

  // Impact
  impact_level: number; // 0-100
  affected_characters?: string[];

  // Status
  status: 'planned' | 'foreshadowed' | 'revealed';
  revealed_at_chapter?: number;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// CHARACTER ARC - For character development tracking
// ============================================================================

export type CharacterArcType =
  | 'growth'
  | 'fall'
  | 'redemption'
  | 'corruption'
  | 'static'
  | 'transformation';

export interface CharacterMilestone {
  chapter: number;
  event: string;
  change: string;
}

export interface CharacterArc {
  id: string;
  project_id: string;
  character_name: string;

  // Arc definition
  start_state: string; // "weak and naive"
  current_state: string; // "determined but reckless"
  target_state: string; // "wise and powerful"

  // Arc type
  arc_type: CharacterArcType;

  // Milestones
  milestones?: CharacterMilestone[];

  // Current stats
  current_chapter: number;
  current_power_level?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// HIERARCHICAL SUMMARIES - For long-term memory and token efficiency
// ============================================================================

export interface HierarchicalSummary {
  id: string;
  project_id: string;

  // Hierarchy
  level: 'arc' | 'volume';
  level_number: number; // Arc number or volume number

  // Chapter range
  start_chapter: number;
  end_chapter: number;

  // Summary content
  summary: string;
  key_events?: any[];
  character_changes?: any[];
  plot_threads_opened?: any[];
  plot_threads_closed?: any[];

  // Metadata
  word_count: number;
  generated_at: string;

  created_at: string;
  updated_at: string;
}