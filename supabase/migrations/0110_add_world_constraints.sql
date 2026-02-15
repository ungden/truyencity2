-- Add world_constraints table for story consistency
-- Stores hard immutable facts extracted from each story's World Bible.
-- These constraints are injected into AI prompts and validated programmatically
-- to prevent contradictions (e.g. saying 15 members when Bible says 10).

CREATE TABLE IF NOT EXISTS world_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  blueprint_id UUID DEFAULT NULL,  -- soft reference, no FK (table may not exist)
  category TEXT NOT NULL CHECK (category IN ('quantity', 'hierarchy', 'rule', 'geography', 'character_limit', 'power_cap')),
  subject TEXT NOT NULL,      -- entity name (faction, character, system, place)
  predicate TEXT NOT NULL,    -- property (snake_case)
  value TEXT NOT NULL,        -- the actual value (stringified)
  context TEXT NOT NULL,      -- human-readable sentence for prompt injection
  immutable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_world_constraints_project ON world_constraints(project_id);
CREATE INDEX IF NOT EXISTS idx_world_constraints_subject ON world_constraints(project_id, subject);
CREATE UNIQUE INDEX IF NOT EXISTS idx_world_constraints_unique
  ON world_constraints(project_id, subject, predicate);

COMMENT ON TABLE world_constraints IS 'Hard immutable facts from World Bible for consistency enforcement across all genres.';

-- RLS
ALTER TABLE world_constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON world_constraints
  FOR ALL USING (true) WITH CHECK (true);
