CREATE TABLE IF NOT EXISTS character_bibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  last_refreshed_chapter INT NOT NULL,
  bible_text TEXT NOT NULL,
  power_realm_index INT,
  current_location TEXT,
  status TEXT NOT NULL DEFAULT 'alive',
  importance INT NOT NULL DEFAULT 50,
  key_relationships JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_character_bibles_project_importance
  ON character_bibles (project_id, importance DESC, last_refreshed_chapter DESC);

ALTER TABLE character_bibles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on character_bibles"
  ON character_bibles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users read own character_bibles"
  ON character_bibles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_story_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );;
