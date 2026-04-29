-- 0154_location_timeline.sql — Location Timeline (Phase 22 continuity overhaul)
--
-- Tracks per-chapter location of each character. Enables geography teleportation detection
-- ("character at A in ch.10, suddenly at B in ch.11 with no travel scene").

CREATE TABLE IF NOT EXISTS location_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  character_name TEXT NOT NULL,
  location TEXT NOT NULL,
  transition_type TEXT NOT NULL DEFAULT 'unknown',  -- arrived|departed|stayed|teleport_flag|unknown
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, chapter_number, character_name)
);

CREATE INDEX IF NOT EXISTS idx_location_timeline_lookup
  ON location_timeline (project_id, character_name, chapter_number DESC);

ALTER TABLE location_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on location_timeline"
  ON location_timeline
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users read own location_timeline"
  ON location_timeline
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_story_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );
