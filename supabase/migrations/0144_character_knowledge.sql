-- ============================================================================
-- Migration 0144: Character Knowledge Graph
--
-- Tracks what each character KNOWS at each point in the story.
-- Prevents knowledge inconsistencies (e.g., character acts on info they don't have).
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  character_name TEXT NOT NULL,
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN (
    'secret', 'relationship', 'event', 'location', 'ability', 'plan', 'identity'
  )),
  knowledge TEXT NOT NULL,
  source_character TEXT,           -- Who told them / null if self-discovered
  is_secret BOOLEAN NOT NULL DEFAULT false,
  revealed_to TEXT[] DEFAULT '{}', -- Other characters who also know this
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups: character knowledge for a project
CREATE INDEX IF NOT EXISTS idx_character_knowledge_project
  ON character_knowledge(project_id, character_name, chapter_number DESC);

-- Fast lookups: secrets only
CREATE INDEX IF NOT EXISTS idx_character_knowledge_secrets
  ON character_knowledge(project_id, is_secret) WHERE is_secret = true;

-- RLS
ALTER TABLE character_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on character_knowledge"
  ON character_knowledge
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
