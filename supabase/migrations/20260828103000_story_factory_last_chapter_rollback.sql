-- A public Story Factory chapter is normally immutable. This narrowly scoped
-- corrective path is only for a verified defect in the *current last* chapter:
-- it restores the exact prior published state, archives the removed prose in
-- the paid run artifact, and refuses to race an active lease.

CREATE OR REPLACE FUNCTION public.rollback_story_factory_last_published_chapter(
  p_job_id uuid,
  p_expected_chapter integer,
  p_restore_state jsonb,
  p_published_run_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  job public.story_factory_jobs;
  project public.ai_story_projects;
  published_run public.story_factory_runs;
  removed_chapter public.chapters;
  restored_chapter integer;
BEGIN
  IF p_expected_chapter < 1 OR length(trim(p_reason)) < 12 THEN
    RAISE EXCEPTION 'FACTORY_ROLLBACK_INPUT_INVALID';
  END IF;
  restored_chapter := p_expected_chapter - 1;

  SELECT * INTO job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF job.id IS NULL THEN RAISE EXCEPTION 'FACTORY_JOB_NOT_FOUND'; END IF;
  IF job.status = 'writing' OR job.lease_token IS NOT NULL OR job.lease_until IS NOT NULL THEN
    RAISE EXCEPTION 'FACTORY_ROLLBACK_ACTIVE_LEASE';
  END IF;
  IF job.current_chapter <> p_expected_chapter THEN
    RAISE EXCEPTION 'FACTORY_ROLLBACK_NOT_LAST_CHAPTER';
  END IF;

  SELECT * INTO project FROM public.ai_story_projects WHERE id = job.project_id FOR UPDATE;
  IF project.current_chapter <> p_expected_chapter THEN
    RAISE EXCEPTION 'FACTORY_ROLLBACK_PROJECT_SEQUENCE_MISMATCH';
  END IF;
  IF (p_restore_state->>'schemaVersion')::integer <> 2
    OR (p_restore_state->>'chapterNumber')::integer <> restored_chapter THEN
    RAISE EXCEPTION 'FACTORY_ROLLBACK_RESTORE_STATE_INVALID';
  END IF;

  SELECT * INTO removed_chapter
  FROM public.chapters
  WHERE novel_id = job.novel_id AND chapter_number = p_expected_chapter
  FOR UPDATE;
  IF removed_chapter.id IS NULL THEN RAISE EXCEPTION 'FACTORY_ROLLBACK_CHAPTER_NOT_FOUND'; END IF;

  SELECT * INTO published_run
  FROM public.story_factory_runs
  WHERE id = p_published_run_id
    AND job_id = job.id
    AND project_id = project.id
    AND chapter_number = p_expected_chapter
  FOR UPDATE;
  IF published_run.id IS NULL OR published_run.status <> 'published' THEN
    RAISE EXCEPTION 'FACTORY_ROLLBACK_PUBLISHED_RUN_MISMATCH';
  END IF;

  UPDATE public.story_factory_runs
  SET status = 'failed',
      error_code = 'quality_rolled_back',
      error_message = p_reason,
      output_artifact = COALESCE(output_artifact, '{}'::jsonb) || jsonb_build_object(
        'publicationRollback', jsonb_build_object(
          'at', now(),
          'reason', p_reason,
          'restoredToChapter', restored_chapter,
          'removedChapter', jsonb_build_object(
            'id', removed_chapter.id,
            'chapterNumber', removed_chapter.chapter_number,
            'title', removed_chapter.title,
            'content', removed_chapter.content
          )
        )
      )
  WHERE id = published_run.id;

  DELETE FROM public.story_state_events
  WHERE project_id = project.id AND chapter_number = p_expected_chapter;
  DELETE FROM public.chapters WHERE id = removed_chapter.id;

  UPDATE public.ai_story_projects
  SET story_state = p_restore_state,
      current_chapter = restored_chapter,
      updated_at = now()
  WHERE id = project.id;

  UPDATE public.novels
  SET chapter_count = restored_chapter,
      total_chapters = LEAST(total_chapters, restored_chapter),
      updated_at = now()
  WHERE id = job.novel_id;

  UPDATE public.story_factory_jobs
  SET current_chapter = restored_chapter,
      rolling_plan = NULL,
      plan_feedback = NULL,
      replan_attempts = 0,
      retry_count = 0,
      chapters_today = GREATEST(chapters_today - 1, 0),
      status = 'cancelled',
      stage = 'plan',
      next_run_at = now(),
      last_run_id = published_run.id,
      last_error = p_reason,
      lease_owner = NULL,
      lease_token = NULL,
      lease_until = NULL,
      updated_at = now()
  WHERE id = job.id;

  RETURN jsonb_build_object(
    'status', 'rolled_back',
    'jobId', job.id,
    'removedChapter', p_expected_chapter,
    'restoredChapter', restored_chapter,
    'archivedRunId', published_run.id
  );
END $$;

REVOKE ALL ON FUNCTION public.rollback_story_factory_last_published_chapter(uuid, integer, jsonb, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_story_factory_last_published_chapter(uuid, integer, jsonb, uuid, text)
  TO service_role;
