-- Migration 0012: Create plot_arcs and planned_twists tables for storytelling intelligence

-- ============================================================================
-- PLOT ARCS TABLE - Theo dõi cung truyện, cao trào, tension
-- ============================================================================
CREATE TABLE IF NOT EXISTS plot_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  arc_number INTEGER NOT NULL,
  start_chapter INTEGER NOT NULL,
  end_chapter INTEGER NOT NULL,
  arc_title TEXT NOT NULL,
  arc_description TEXT,

  -- Tension curve: array of integers 0-100 representing tension for each chapter in this arc
  tension_curve INTEGER[] DEFAULT ARRAY[]::INTEGER[],

  -- Climax planning
  climax_chapter INTEGER,
  climax_description TEXT,
  resolution_chapters INTEGER[] DEFAULT ARRAY[]::INTEGER[],

  -- Arc theme and goals
  theme TEXT, -- "revenge", "power-up", "romance", "mystery", etc.
  main_goal TEXT, -- What should be achieved by end of this arc

  -- Status
  status TEXT DEFAULT 'planning', -- 'planning', 'in_progress', 'completed'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, arc_number),
  CHECK (start_chapter <= end_chapter),
  CHECK (climax_chapter IS NULL OR (climax_chapter >= start_chapter AND climax_chapter <= end_chapter)),
  CHECK (tension_curve IS NULL OR array_length(tension_curve, 1) = (end_chapter - start_chapter + 1))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plot_arcs_project_id ON plot_arcs(project_id);
CREATE INDEX IF NOT EXISTS idx_plot_arcs_status ON plot_arcs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_plot_arcs_chapters ON plot_arcs(project_id, start_chapter, end_chapter);

-- ============================================================================
-- PLANNED TWISTS TABLE - Lập kế hoạch twist trước để foreshadow
-- ============================================================================
CREATE TABLE IF NOT EXISTS planned_twists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES plot_arcs(id) ON DELETE CASCADE,

  -- Twist planning
  target_chapter INTEGER NOT NULL,
  twist_type TEXT NOT NULL, -- 'betrayal', 'revelation', 'power_up', 'death', 'reunion', 'hidden_identity', 'plot_reversal'
  twist_description TEXT NOT NULL,

  -- Foreshadowing
  foreshadowing_chapters INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  foreshadowing_hints JSONB DEFAULT '[]'::jsonb, -- Array of {chapter: number, hint: string}

  -- Impact
  impact_level INTEGER DEFAULT 50, -- 0-100, how shocking/important is this twist
  affected_characters TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Status
  status TEXT DEFAULT 'planned', -- 'planned', 'foreshadowed', 'revealed'
  revealed_at_chapter INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CHECK (impact_level >= 0 AND impact_level <= 100),
  CHECK (twist_type IN ('betrayal', 'revelation', 'power_up', 'death', 'reunion', 'hidden_identity', 'plot_reversal', 'alliance', 'inheritance', 'prophecy'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planned_twists_project_id ON planned_twists(project_id);
CREATE INDEX IF NOT EXISTS idx_planned_twists_arc_id ON planned_twists(arc_id);
CREATE INDEX IF NOT EXISTS idx_planned_twists_target_chapter ON planned_twists(project_id, target_chapter);
CREATE INDEX IF NOT EXISTS idx_planned_twists_status ON planned_twists(project_id, status);

-- ============================================================================
-- CHARACTER ARCS TABLE - Theo dõi sự phát triển nhân vật
-- ============================================================================
CREATE TABLE IF NOT EXISTS character_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,

  -- Character arc definition
  start_state TEXT NOT NULL, -- "weak and naive", "arrogant young master"
  current_state TEXT NOT NULL, -- "determined but reckless"
  target_state TEXT NOT NULL, -- "wise and powerful"

  -- Arc type
  arc_type TEXT DEFAULT 'growth', -- 'growth', 'fall', 'redemption', 'corruption', 'static'

  -- Milestones
  milestones JSONB DEFAULT '[]'::jsonb, -- Array of {chapter: number, event: string, change: string}

  -- Current stats (for cultivation/power tracking)
  current_chapter INTEGER DEFAULT 1,
  current_power_level TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, character_name),
  CHECK (arc_type IN ('growth', 'fall', 'redemption', 'corruption', 'static', 'transformation'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_character_arcs_project_id ON character_arcs(project_id);
CREATE INDEX IF NOT EXISTS idx_character_arcs_character_name ON character_arcs(project_id, character_name);

-- ============================================================================
-- HIERARCHICAL SUMMARIES TABLE - Tóm tắt theo cấp để tiết kiệm token
-- ============================================================================
CREATE TABLE IF NOT EXISTS hierarchical_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,

  -- Hierarchy level
  level TEXT NOT NULL, -- 'chapter', 'arc', 'volume'
  level_number INTEGER NOT NULL, -- Arc number or volume number

  -- Chapter range
  start_chapter INTEGER NOT NULL,
  end_chapter INTEGER NOT NULL,

  -- Summary content
  summary TEXT NOT NULL,
  key_events JSONB DEFAULT '[]'::jsonb,
  character_changes JSONB DEFAULT '[]'::jsonb,
  plot_threads_opened JSONB DEFAULT '[]'::jsonb,
  plot_threads_closed JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  word_count INTEGER DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, level, level_number),
  CHECK (level IN ('arc', 'volume')),
  CHECK (start_chapter <= end_chapter)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hierarchical_summaries_project_id ON hierarchical_summaries(project_id);
CREATE INDEX IF NOT EXISTS idx_hierarchical_summaries_level ON hierarchical_summaries(project_id, level, level_number);
CREATE INDEX IF NOT EXISTS idx_hierarchical_summaries_chapters ON hierarchical_summaries(project_id, start_chapter, end_chapter);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE plot_arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_twists ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hierarchical_summaries ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read, authenticated can write
DROP POLICY IF EXISTS "Allow public read access to plot_arcs" ON plot_arcs;
CREATE POLICY "Allow public read access to plot_arcs"
  ON plot_arcs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage plot_arcs" ON plot_arcs;
CREATE POLICY "Allow authenticated users to manage plot_arcs"
  ON plot_arcs FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public read access to planned_twists" ON planned_twists;
CREATE POLICY "Allow public read access to planned_twists"
  ON planned_twists FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage planned_twists" ON planned_twists;
CREATE POLICY "Allow authenticated users to manage planned_twists"
  ON planned_twists FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public read access to character_arcs" ON character_arcs;
CREATE POLICY "Allow public read access to character_arcs"
  ON character_arcs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage character_arcs" ON character_arcs;
CREATE POLICY "Allow authenticated users to manage character_arcs"
  ON character_arcs FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public read access to hierarchical_summaries" ON hierarchical_summaries;
CREATE POLICY "Allow public read access to hierarchical_summaries"
  ON hierarchical_summaries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage hierarchical_summaries" ON hierarchical_summaries;
CREATE POLICY "Allow authenticated users to manage hierarchical_summaries"
  ON hierarchical_summaries FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-create plot arcs every 10 chapters
CREATE OR REPLACE FUNCTION auto_create_plot_arc()
RETURNS TRIGGER AS $$
BEGIN
  -- When project reaches chapters 1, 11, 21, 31... create a new arc automatically
  IF NEW.current_chapter % 10 = 1 AND NEW.current_chapter > 1 THEN
    INSERT INTO plot_arcs (
      project_id,
      arc_number,
      start_chapter,
      end_chapter,
      arc_title,
      arc_description,
      status
    ) VALUES (
      NEW.id,
      (NEW.current_chapter / 10) + 1,
      NEW.current_chapter,
      NEW.current_chapter + 9,
      'Arc ' || ((NEW.current_chapter / 10) + 1),
      'Automatically generated arc',
      'in_progress'
    ) ON CONFLICT (project_id, arc_number) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create arcs
DROP TRIGGER IF EXISTS trigger_auto_create_plot_arc ON ai_story_projects;
CREATE TRIGGER trigger_auto_create_plot_arc
  AFTER UPDATE OF current_chapter ON ai_story_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_plot_arc();

-- Function to generate arc summary when arc completes
CREATE OR REPLACE FUNCTION generate_arc_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_summary_text TEXT;
  v_key_events JSONB;
BEGIN
  -- When arc status changes to 'completed', generate hierarchical summary
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get all chapter summaries in this arc
    SELECT
      string_agg(summary, ' ') AS summary_text,
      jsonb_agg(key_events) AS events
    INTO v_summary_text, v_key_events
    FROM story_graph_nodes
    WHERE project_id = NEW.project_id
      AND chapter_number >= NEW.start_chapter
      AND chapter_number <= NEW.end_chapter;

    -- Insert hierarchical summary
    INSERT INTO hierarchical_summaries (
      project_id,
      level,
      level_number,
      start_chapter,
      end_chapter,
      summary,
      key_events
    ) VALUES (
      NEW.project_id,
      'arc',
      NEW.arc_number,
      NEW.start_chapter,
      NEW.end_chapter,
      COALESCE(v_summary_text, 'No summary available'),
      COALESCE(v_key_events, '[]'::jsonb)
    ) ON CONFLICT (project_id, level, level_number)
    DO UPDATE SET
      summary = EXCLUDED.summary,
      key_events = EXCLUDED.key_events,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate arc summaries
DROP TRIGGER IF EXISTS trigger_generate_arc_summary ON plot_arcs;
CREATE TRIGGER trigger_generate_arc_summary
  AFTER UPDATE OF status ON plot_arcs
  FOR EACH ROW
  EXECUTE FUNCTION generate_arc_summary();

-- Done!
