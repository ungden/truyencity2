-- Migration: Create plot_threads table for Plot Thread Manager
-- Phase 1 of 4: Long-form story scalability improvements

-- ============================================================================
-- PLOT THREADS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS plot_threads (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'main', 'sub', 'background')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'developing', 'climax', 'resolved', 'legacy')),
  start_chapter INTEGER NOT NULL,
  target_payoff_chapter INTEGER,
  resolved_chapter INTEGER,
  last_active_chapter INTEGER NOT NULL,
  related_characters TEXT[] DEFAULT '{}',
  related_locations TEXT[] DEFAULT '{}',
  related_arcs INTEGER[] DEFAULT '{}',
  foreshadowing_hints JSONB DEFAULT '[]',
  payoff_description TEXT,
  importance INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_plot_threads_project ON plot_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_plot_threads_status ON plot_threads(project_id, status);
CREATE INDEX IF NOT EXISTS idx_plot_threads_priority ON plot_threads(project_id, importance DESC);
CREATE INDEX IF NOT EXISTS idx_plot_threads_start ON plot_threads(project_id, start_chapter);
CREATE INDEX IF NOT EXISTS idx_plot_threads_active ON plot_threads(project_id, last_active_chapter);

-- RLS Policies
ALTER TABLE plot_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to plot_threads"
  ON plot_threads FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage plot_threads"
  ON plot_threads FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- UPDATE TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_plot_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_plot_thread_timestamp ON plot_threads;
CREATE TRIGGER trigger_update_plot_thread_timestamp
  BEFORE UPDATE ON plot_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_plot_thread_timestamp();

-- ============================================================================
-- ENHANCE CHARACTER TRACKER FOR RE-INTRODUCTION
-- ============================================================================

-- Add columns if not exist
ALTER TABLE character_tracker 
  ADD COLUMN IF NOT EXISTS relationship_summary TEXT,
  ADD COLUMN IF NOT EXISTS key_facts TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pending_promises TEXT[] DEFAULT '{}';

-- Index for character lookups
CREATE INDEX IF NOT EXISTS idx_character_tracker_last_seen 
  ON character_tracker(project_id, last_seen_chapter);

-- ============================================================================
-- VOLUME SUMMARIES TABLE (For Phase 2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS volume_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  volume_number INTEGER NOT NULL,
  start_chapter INTEGER NOT NULL,
  end_chapter INTEGER NOT NULL,
  title TEXT,
  summary TEXT NOT NULL,
  major_milestones TEXT[] DEFAULT '{}',
  arcs_included INTEGER[] DEFAULT '{}',
  plot_threads_resolved TEXT[] DEFAULT '{}',
  plot_threads_introduced TEXT[] DEFAULT '{}',
  character_development JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, volume_number)
);

CREATE INDEX IF NOT EXISTS idx_volume_summaries_project ON volume_summaries(project_id);
CREATE INDEX IF NOT EXISTS idx_volume_summaries_chapters ON volume_summaries(project_id, start_chapter, end_chapter);

ALTER TABLE volume_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to volume_summaries"
  ON volume_summaries FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage volume_summaries"
  ON volume_summaries FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- WORLD RULES INDEX TABLE (For Phase 3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS world_rules_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  rule_text TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'power_system', 'politics', 'economy'
  tags TEXT[] DEFAULT '{}', -- e.g., ['realm=kimet', 'skill=fire']
  introduced_chapter INTEGER NOT NULL,
  importance INTEGER DEFAULT 50, -- 0-100
  usage_count INTEGER DEFAULT 0,
  last_referenced_chapter INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_world_rules_project ON world_rules_index(project_id);
CREATE INDEX IF NOT EXISTS idx_world_rules_category ON world_rules_index(project_id, category);
CREATE INDEX IF NOT EXISTS idx_world_rules_tags ON world_rules_index USING GIN(tags);

ALTER TABLE world_rules_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to world_rules_index"
  ON world_rules_index FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage world_rules_index"
  ON world_rules_index FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- MILESTONE VALIDATIONS TABLE (For Phase 4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS milestone_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  milestone_chapter INTEGER NOT NULL,
  validation_type TEXT NOT NULL, -- 'thread_resolution', 'character_arc', 'power_consistency'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'warning')),
  details JSONB DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, milestone_chapter, validation_type)
);

CREATE INDEX IF NOT EXISTS idx_milestone_validations_project ON milestone_validations(project_id);
CREATE INDEX IF NOT EXISTS idx_milestone_validations_chapter ON milestone_validations(project_id, milestone_chapter);

ALTER TABLE milestone_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to milestone_validations"
  ON milestone_validations FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage milestone_validations"
  ON milestone_validations FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- HELPER FUNCTION: Get Active Plot Threads
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_plot_threads(
  p_project_id UUID,
  p_current_chapter INTEGER
)
RETURNS TABLE (
  thread_id TEXT,
  thread_name TEXT,
  thread_priority TEXT,
  thread_status TEXT,
  chapters_until_deadline INTEGER,
  importance_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.name,
    pt.priority,
    pt.status,
    COALESCE(pt.target_payoff_chapter - p_current_chapter, 9999),
    pt.importance
  FROM plot_threads pt
  WHERE pt.project_id = p_project_id
    AND pt.status NOT IN ('resolved', 'legacy')
  ORDER BY 
    CASE pt.priority 
      WHEN 'critical' THEN 1 
      WHEN 'main' THEN 2 
      WHEN 'sub' THEN 3 
      ELSE 4 
    END,
    pt.importance DESC,
    pt.last_active_chapter DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Check Abandoned Threads
-- ============================================================================

CREATE OR REPLACE FUNCTION check_abandoned_threads(
  p_project_id UUID,
  p_current_chapter INTEGER,
  p_threshold INTEGER DEFAULT 100
)
RETURNS TABLE (
  thread_id TEXT,
  thread_name TEXT,
  chapters_inactive INTEGER,
  risk_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.name,
    p_current_chapter - pt.last_active_chapter,
    CASE 
      WHEN p_current_chapter - pt.last_active_chapter > p_threshold THEN 'abandoned'
      WHEN p_current_chapter - pt.last_active_chapter > (p_threshold / 2) THEN 'at_risk'
      ELSE 'active'
    END
  FROM plot_threads pt
  WHERE pt.project_id = p_project_id
    AND pt.status NOT IN ('resolved', 'legacy')
    AND p_current_chapter - pt.last_active_chapter > (p_threshold / 2)
  ORDER BY p_current_chapter - pt.last_active_chapter DESC;
END;
$$ LANGUAGE plpgsql;
