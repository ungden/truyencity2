CREATE INDEX IF NOT EXISTS idx_story_chapter_attempts_novel
  ON public.story_chapter_attempts(novel_id, chapter_number);

REVOKE ALL ON public.factory_story_status_v3 FROM service_role;
GRANT SELECT ON public.factory_story_status_v3 TO service_role;
