
CREATE INDEX IF NOT EXISTS idx_ai_story_projects_status_chapter
  ON public.ai_story_projects(status, current_chapter, updated_at)
  WHERE status IN ('active', 'paused');

COMMENT ON INDEX idx_ai_story_projects_status_chapter IS
  'P7.1 (2026-04-30): partial index for cron write-chapters pickup. Covers status filter + current_chapter + updated_at lock window.';
;
