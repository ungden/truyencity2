-- 0159: Critical index for cron pickup query.
-- Issue: write-chapters cron route SELECTs ai_story_projects WHERE status='active' or 'paused'
-- on every tick. With 1000+ rows this becomes a full table scan.
-- Fix: partial index covering only active/paused rows + secondary key for cron ordering.

CREATE INDEX IF NOT EXISTS idx_ai_story_projects_status_chapter
  ON public.ai_story_projects(status, current_chapter, updated_at)
  WHERE status IN ('active', 'paused');

COMMENT ON INDEX idx_ai_story_projects_status_chapter IS
  'P7.1 (2026-04-30): partial index for cron write-chapters pickup. Covers status filter + current_chapter + updated_at lock window.';
