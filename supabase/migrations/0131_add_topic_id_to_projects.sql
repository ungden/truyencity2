-- ============================================================================
-- Migration 0131: Add topic_id column to ai_story_projects
--
-- Allows story engine to inject genre-specific topic prompt hints
-- (e.g. "Khởi Nghiệp Kinh Doanh" hints for do-thi genre)
-- ============================================================================

ALTER TABLE ai_story_projects
  ADD COLUMN IF NOT EXISTS topic_id TEXT;

-- Optional: backfill from genre topics if needed in future
COMMENT ON COLUMN ai_story_projects.topic_id IS 'References a topic ID from GENRE_CONFIG.topics[] for genre-specific prompt hints';
