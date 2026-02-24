-- ============================================================================
-- Migration 0133: Recreate character_arcs table with correct schema
--
-- The old character_arcs table had incompatible columns (start_state, arc_type
-- with NOT NULL constraints). Drop and recreate with the quality module schema.
-- Table has 0 rows so no data loss.
-- ============================================================================

DROP TABLE IF EXISTS character_arcs CASCADE;

CREATE TABLE character_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('protagonist', 'rival', 'mentor', 'love_interest', 'ally', 'villain', 'comic_relief', 'recurring_npc')),
  internal_conflict TEXT,
  arc_phases JSONB DEFAULT '[]'::jsonb,
  signature_traits JSONB DEFAULT '{}'::jsonb,
  relationship_with_mc TEXT,
  current_phase TEXT,
  appearance_count INT NOT NULL DEFAULT 0,
  last_seen_chapter INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_character_arcs_project
  ON character_arcs(project_id, character_name);

ALTER TABLE character_arcs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_full_character_arcs" ON character_arcs FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
