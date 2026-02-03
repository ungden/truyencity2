// ============================================================================
// STORY INSPIRATION TYPES
// Types for importing, analyzing, and creating inspired stories
// ============================================================================

export interface SourceStory {
  id: string;
  user_id: string;
  title: string;
  author?: string;
  source_url?: string;
  content: string;
  total_chapters: number;
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Character analysis from source story
export interface AnalyzedCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  archetype: string; // "chosen one", "mentor", "rival", etc.
  traits: string[];
  relationships: Record<string, string>; // {characterName: relationshipType}
  powerLevel?: string;
  motivation?: string;
}

// Plot structure breakdown
export interface PlotStructure {
  exposition: string; // Setup and introduction
  inciting_incident: string; // What kicks off the story
  rising_action: string[]; // Key events building tension
  climax: string; // Main turning point
  falling_action: string[]; // Events after climax
  resolution: string; // How it ends
}

// Setting elements
export interface SettingElements {
  locations: Array<{ name: string; description: string; significance: string }>;
  factions: Array<{ name: string; role: string; power: string }>;
  items: Array<{ name: string; power: string; importance: string }>;
  rules: string[]; // World rules/laws
}

// Arc summary from analysis
export interface ArcSummary {
  arc_number: number;
  title: string;
  summary: string;
  chapters_covered: string; // e.g., "1-20"
  tension_peak: string;
  key_events: string[];
}

// Full story analysis
export interface StoryAnalysis {
  id: string;
  source_story_id: string;

  // Genre detection
  detected_genre: string;
  sub_genres: string[];

  // Plot structure
  plot_structure: PlotStructure;

  // Character analysis
  characters: AnalyzedCharacter[];
  main_character_traits: string[];

  // World building
  world_type: string;
  power_system: string;
  setting_elements: SettingElements;

  // Story hooks and themes
  main_hooks: string[];
  themes: string[];
  conflict_types: string[];

  // Pacing
  pacing_style: 'fast' | 'medium' | 'slow';
  chapter_structure: 'cliffhanger' | 'episodic' | 'arc-based';

  // Summaries
  full_plot_summary: string;
  arc_summaries: ArcSummary[];

  created_at: string;
  updated_at: string;
}

// Arc outline for new story
export interface ArcOutline {
  arc_number: number;
  title: string;
  description: string;
  start_chapter: number;
  end_chapter: number;
  key_events: string[];
  climax: string;
  tension_level: number; // 0-100
}

// Chapter outline for new story
export interface ChapterOutline {
  chapter_number: number;
  title: string;
  summary: string;
  key_points: string[];
  characters_involved: string[];
  estimated_words: number;
}

// Complete story outline (inspired/rewritten)
export interface StoryOutline {
  id: string;
  user_id: string;
  source_analysis_id?: string;

  // Basic info
  title: string;
  tagline?: string;
  genre: string;

  // Main character
  main_character_name: string;
  main_character_description?: string;
  main_character_motivation?: string;

  // World building
  world_description?: string;
  power_system?: string;
  unique_elements: string[];

  // Plot outline
  total_planned_chapters: number;
  arc_outlines: ArcOutline[];
  chapter_outlines: ChapterOutline[];

  // Hooks and conflicts
  story_hooks: string[];
  main_conflicts: string[];

  // Transformation notes
  transformation_notes?: string;

  // Status
  status: 'draft' | 'approved' | 'writing' | 'completed';

  // Links
  ai_project_id?: string;
  novel_id?: string;

  created_at: string;
  updated_at: string;
}

// Job tracking
export type InspirationJobType = 'analyze' | 'outline' | 'write_chapter' | 'write_batch';
export type InspirationJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';

export interface InspirationJob {
  id: string;
  user_id: string;
  job_type: InspirationJobType;
  source_story_id?: string;
  outline_id?: string;
  status: InspirationJobStatus;
  progress: number;
  step_message?: string;
  error_message?: string;
  result_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Step definitions for progress tracking
export type InspirationStep =
  | 'initializing'
  | 'reading_source'
  | 'analyzing_plot'
  | 'analyzing_characters'
  | 'analyzing_world'
  | 'generating_summary'
  | 'creating_outline'
  | 'transforming_plot'
  | 'planning_arcs'
  | 'planning_chapters'
  | 'writing'
  | 'saving'
  | 'completed'
  | 'failed'
  | 'stopped';

export interface InspirationProgress {
  isProcessing: boolean;
  currentStep: InspirationStep;
  progress: number;
  message: string;
  error?: string | null;
  jobId?: string | null;
}

// Input types for API
export interface ImportSourceStoryInput {
  title: string;
  author?: string;
  source_url?: string;
  content: string;
  total_chapters?: number;
}

export interface GenerateOutlineInput {
  source_analysis_id: string;
  new_title: string;
  main_character_name: string;
  main_character_description?: string;
  genre_override?: string;
  total_chapters?: number;
  transformation_style?: 'similar' | 'twist' | 'reimagine';
}

export interface CreateProjectFromOutlineInput {
  outline_id: string;
  writing_style?: string;
  ai_model?: string;
  temperature?: number;
  target_chapter_length?: number;
}
