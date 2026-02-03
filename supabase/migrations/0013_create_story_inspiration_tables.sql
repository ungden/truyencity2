-- ============================================================================
-- STORY INSPIRATION SYSTEM
-- Tables for importing, analyzing, and creating inspired stories
-- ============================================================================

-- Table: Imported source stories for analysis
CREATE TABLE IF NOT EXISTS source_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Source story info
  title TEXT NOT NULL,
  author TEXT,
  source_url TEXT,

  -- Content (raw text pasted/imported)
  content TEXT NOT NULL,
  total_chapters INTEGER DEFAULT 1,

  -- Analysis status
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Story structure analysis (extracted from source)
CREATE TABLE IF NOT EXISTS story_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_story_id UUID REFERENCES source_stories(id) ON DELETE CASCADE NOT NULL,

  -- Genre detection
  detected_genre TEXT,
  sub_genres TEXT[], -- Array of sub-genres

  -- Plot structure
  plot_structure JSONB, -- {exposition, rising_action, climax, falling_action, resolution}

  -- Character analysis
  characters JSONB, -- [{name, role, archetype, traits, relationships}]
  main_character_traits TEXT[],

  -- World building
  world_type TEXT, -- cultivation, fantasy, urban, etc.
  power_system TEXT, -- Description of power/cultivation system
  setting_elements JSONB, -- {locations, factions, items, rules}

  -- Story hooks and themes
  main_hooks TEXT[], -- What makes this story engaging
  themes TEXT[], -- Underlying themes
  conflict_types TEXT[], -- Types of conflicts used

  -- Pacing analysis
  pacing_style TEXT, -- fast, medium, slow
  chapter_structure TEXT, -- cliffhanger, episodic, arc-based

  -- Summary
  full_plot_summary TEXT,
  arc_summaries JSONB, -- [{arc_number, title, summary, chapters_covered}]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Inspired story outlines (rewritten based on source)
CREATE TABLE IF NOT EXISTS story_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_analysis_id UUID REFERENCES story_analysis(id) ON DELETE SET NULL,

  -- New story info
  title TEXT NOT NULL,
  tagline TEXT, -- One-line hook
  genre TEXT NOT NULL,

  -- Main character
  main_character_name TEXT NOT NULL,
  main_character_description TEXT,
  main_character_motivation TEXT,

  -- World building (transformed from source)
  world_description TEXT,
  power_system TEXT,
  unique_elements TEXT[], -- What makes this world unique

  -- Plot outline
  total_planned_chapters INTEGER DEFAULT 100,
  arc_outlines JSONB, -- [{arc_number, title, description, start_chapter, end_chapter, key_events, climax}]
  chapter_outlines JSONB, -- [{chapter_number, title, summary, key_points, characters_involved}]

  -- Story hooks (inspired but transformed)
  story_hooks TEXT[],
  main_conflicts TEXT[],

  -- Differences from source (to ensure originality)
  transformation_notes TEXT, -- How this differs from source

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'writing', 'completed')),

  -- Link to AI project when created
  ai_project_id UUID REFERENCES ai_story_projects(id) ON DELETE SET NULL,
  novel_id UUID REFERENCES novels(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Track inspiration writing jobs
CREATE TABLE IF NOT EXISTS inspiration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Job type
  job_type TEXT NOT NULL CHECK (job_type IN ('analyze', 'outline', 'write_chapter', 'write_batch')),

  -- References
  source_story_id UUID REFERENCES source_stories(id) ON DELETE CASCADE,
  outline_id UUID REFERENCES story_outlines(id) ON DELETE CASCADE,

  -- Progress
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'stopped')),
  progress INTEGER DEFAULT 0, -- 0-100
  step_message TEXT,
  error_message TEXT,

  -- Results
  result_data JSONB, -- Flexible result storage

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_source_stories_user_id ON source_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_source_stories_status ON source_stories(analysis_status);
CREATE INDEX IF NOT EXISTS idx_story_analysis_source ON story_analysis(source_story_id);
CREATE INDEX IF NOT EXISTS idx_story_outlines_user_id ON story_outlines(user_id);
CREATE INDEX IF NOT EXISTS idx_story_outlines_status ON story_outlines(status);
CREATE INDEX IF NOT EXISTS idx_inspiration_jobs_user_id ON inspiration_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_jobs_status ON inspiration_jobs(status);

-- Enable RLS
ALTER TABLE source_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
DO $$
BEGIN
  -- source_stories policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'source_stories' AND policyname = 'source_stories_select_own') THEN
    CREATE POLICY source_stories_select_own ON source_stories FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'source_stories' AND policyname = 'source_stories_insert_own') THEN
    CREATE POLICY source_stories_insert_own ON source_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'source_stories' AND policyname = 'source_stories_update_own') THEN
    CREATE POLICY source_stories_update_own ON source_stories FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'source_stories' AND policyname = 'source_stories_delete_own') THEN
    CREATE POLICY source_stories_delete_own ON source_stories FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- story_analysis policies (via source_stories ownership)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_analysis' AND policyname = 'story_analysis_select_own') THEN
    CREATE POLICY story_analysis_select_own ON story_analysis FOR SELECT
      USING (EXISTS (SELECT 1 FROM source_stories ss WHERE ss.id = source_story_id AND ss.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_analysis' AND policyname = 'story_analysis_insert_own') THEN
    CREATE POLICY story_analysis_insert_own ON story_analysis FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM source_stories ss WHERE ss.id = source_story_id AND ss.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_analysis' AND policyname = 'story_analysis_update_own') THEN
    CREATE POLICY story_analysis_update_own ON story_analysis FOR UPDATE
      USING (EXISTS (SELECT 1 FROM source_stories ss WHERE ss.id = source_story_id AND ss.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_analysis' AND policyname = 'story_analysis_delete_own') THEN
    CREATE POLICY story_analysis_delete_own ON story_analysis FOR DELETE
      USING (EXISTS (SELECT 1 FROM source_stories ss WHERE ss.id = source_story_id AND ss.user_id = auth.uid()));
  END IF;

  -- story_outlines policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_outlines' AND policyname = 'story_outlines_select_own') THEN
    CREATE POLICY story_outlines_select_own ON story_outlines FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_outlines' AND policyname = 'story_outlines_insert_own') THEN
    CREATE POLICY story_outlines_insert_own ON story_outlines FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_outlines' AND policyname = 'story_outlines_update_own') THEN
    CREATE POLICY story_outlines_update_own ON story_outlines FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_outlines' AND policyname = 'story_outlines_delete_own') THEN
    CREATE POLICY story_outlines_delete_own ON story_outlines FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- inspiration_jobs policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspiration_jobs' AND policyname = 'inspiration_jobs_select_own') THEN
    CREATE POLICY inspiration_jobs_select_own ON inspiration_jobs FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspiration_jobs' AND policyname = 'inspiration_jobs_insert_own') THEN
    CREATE POLICY inspiration_jobs_insert_own ON inspiration_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspiration_jobs' AND policyname = 'inspiration_jobs_update_own') THEN
    CREATE POLICY inspiration_jobs_update_own ON inspiration_jobs FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspiration_jobs' AND policyname = 'inspiration_jobs_delete_own') THEN
    CREATE POLICY inspiration_jobs_delete_own ON inspiration_jobs FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Service role bypass policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'source_stories' AND policyname = 'source_stories_service_role') THEN
    CREATE POLICY source_stories_service_role ON source_stories FOR ALL USING (auth.jwt()->>'role' = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_analysis' AND policyname = 'story_analysis_service_role') THEN
    CREATE POLICY story_analysis_service_role ON story_analysis FOR ALL USING (auth.jwt()->>'role' = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_outlines' AND policyname = 'story_outlines_service_role') THEN
    CREATE POLICY story_outlines_service_role ON story_outlines FOR ALL USING (auth.jwt()->>'role' = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspiration_jobs' AND policyname = 'inspiration_jobs_service_role') THEN
    CREATE POLICY inspiration_jobs_service_role ON inspiration_jobs FOR ALL USING (auth.jwt()->>'role' = 'service_role');
  END IF;
END
$$;
