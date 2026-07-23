CREATE OR REPLACE FUNCTION public.promote_story_factory_canary(p_job_id uuid, p_engine_release text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE job public.story_factory_jobs;
DECLARE cover text;
BEGIN
  SELECT * INTO job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF job.id IS NULL OR job.execution_mode <> 'hidden_canary' OR job.current_chapter < 10 THEN
    RAISE EXCEPTION 'FACTORY_CANARY_NOT_READY';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.story_factory_runs
    WHERE job_id = p_job_id AND kind = 'window_review' AND chapter_number = 10
      AND status = 'passed' AND engine_release = p_engine_release
  ) THEN RAISE EXCEPTION 'FACTORY_WINDOW_REVIEW_REQUIRED'; END IF;
  SELECT cover_url INTO cover FROM public.novels WHERE id = job.novel_id;
  IF cover IS NULL OR length(trim(cover)) = 0 THEN RAISE EXCEPTION 'FACTORY_COVER_REQUIRED'; END IF;

  UPDATE public.novels
  SET hidden = false,
      status = 'Đang ra',
      updated_at = now()
  WHERE id = job.novel_id;
  UPDATE public.story_factory_jobs SET execution_mode = 'production', updated_at = now() WHERE id = p_job_id;
  RETURN jsonb_build_object('jobId', p_job_id, 'executionMode', 'production', 'visible', true);
END $$;

REVOKE ALL ON FUNCTION public.promote_story_factory_canary(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_story_factory_canary(uuid, text) TO service_role;
