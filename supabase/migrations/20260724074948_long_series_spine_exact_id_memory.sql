ALTER TABLE public.story_state_events
  ADD COLUMN IF NOT EXISTS related_entity_ids text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS story_state_events_related_entities_idx
  ON public.story_state_events USING gin (related_entity_ids);

CREATE OR REPLACE FUNCTION public.commit_story_factory_chapter(
  p_job_id uuid,
  p_lease_token uuid,
  p_run_id uuid,
  p_expected_chapter integer,
  p_title text,
  p_content text,
  p_state_after jsonb,
  p_remaining_plan jsonb,
  p_events jsonb,
  p_assessment jsonb,
  p_context_manifest jsonb,
  p_usage jsonb,
  p_cost_usd numeric,
  p_word_count integer,
  p_revision_count integer,
  p_engine_release text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE job public.story_factory_jobs;
DECLARE project public.ai_story_projects;
DECLARE event jsonb;
DECLARE local_date date := (timezone('Asia/Ho_Chi_Minh', now()))::date;
DECLARE new_today integer;
DECLARE remaining_plan_count integer := jsonb_array_length(COALESCE(p_remaining_plan->'plans', '[]'::jsonb));
BEGIN
  SELECT * INTO job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF job.id IS NULL OR job.lease_token IS DISTINCT FROM p_lease_token OR job.lease_until < now() THEN
    RAISE EXCEPTION 'FACTORY_LEASE_INVALID';
  END IF;
  SELECT * INTO project FROM public.ai_story_projects WHERE id = job.project_id FOR UPDATE;
  IF project.engine_release IS DISTINCT FROM p_engine_release THEN RAISE EXCEPTION 'FACTORY_RELEASE_MISMATCH'; END IF;
  IF job.current_chapter + 1 <> p_expected_chapter OR project.current_chapter + 1 <> p_expected_chapter THEN
    RAISE EXCEPTION 'FACTORY_CHAPTER_SEQUENCE_MISMATCH';
  END IF;
  IF (p_state_after->>'schemaVersion')::integer <> 2 THEN RAISE EXCEPTION 'FACTORY_STATE_VERSION_MISMATCH'; END IF;
  IF (p_state_after->>'chapterNumber')::integer <> p_expected_chapter THEN RAISE EXCEPTION 'FACTORY_STATE_SEQUENCE_MISMATCH'; END IF;
  IF jsonb_array_length(COALESCE(p_state_after->'recentOutcomes', '[]'::jsonb)) < 1 THEN
    RAISE EXCEPTION 'FACTORY_CHAPTER_OUTCOME_MISSING';
  END IF;
  IF (p_state_after->'recentOutcomes'->-1->>'chapterNumber')::integer <> p_expected_chapter THEN
    RAISE EXCEPTION 'FACTORY_CHAPTER_OUTCOME_SEQUENCE_MISMATCH';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_events) event_row
    WHERE event_row->>'kind' = 'chapter_outcome'
      AND (event_row->'after'->>'chapterNumber')::integer = p_expected_chapter
  ) THEN
    RAISE EXCEPTION 'FACTORY_OUTCOME_EVENT_MISSING';
  END IF;
  IF EXISTS (SELECT 1 FROM public.chapters WHERE novel_id = job.novel_id AND chapter_number = p_expected_chapter) THEN
    RAISE EXCEPTION 'FACTORY_CHAPTER_ALREADY_EXISTS';
  END IF;

  INSERT INTO public.chapters(novel_id, chapter_number, title, content, quality_score)
  VALUES (job.novel_id, p_expected_chapter, p_title, p_content, NULL);

  FOR event IN SELECT value FROM jsonb_array_elements(p_events)
  LOOP
    INSERT INTO public.story_state_events(
      project_id, chapter_number, delta_id, kind, entity_id, before_value,
      after_value, source, related_entity_ids
    ) VALUES (
      job.project_id, p_expected_chapter, event->>'deltaId', event->>'kind', event->>'entityId',
      event->'before', event->'after', NULLIF(event->>'source', ''),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(event->'relatedEntityIds', '[]'::jsonb)))
    );
  END LOOP;

  UPDATE public.ai_story_projects
  SET story_state = p_state_after, current_chapter = p_expected_chapter, updated_at = now()
  WHERE id = job.project_id;

  UPDATE public.novels
  SET chapter_count = p_expected_chapter, total_chapters = GREATEST(total_chapters, p_expected_chapter), updated_at = now()
  WHERE id = job.novel_id;

  new_today := CASE WHEN job.quota_date = local_date THEN job.chapters_today + 1 ELSE 1 END;
  UPDATE public.story_factory_jobs
  SET current_chapter = p_expected_chapter,
      rolling_plan = p_remaining_plan,
      plan_feedback = NULL,
      replan_attempts = 0,
      status = 'ready',
      stage = CASE
        WHEN p_expected_chapter % 5 = 0 THEN 'window_review'
        WHEN remaining_plan_count = 0 THEN 'plan'
        ELSE 'write'
      END,
      chapters_today = new_today,
      quota_date = local_date,
      next_run_at = CASE
        WHEN p_expected_chapter % 5 = 0 THEN now()
        WHEN new_today >= job.daily_target THEN ((local_date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ELSE now()
      END,
      lease_owner = NULL, lease_token = NULL, lease_until = NULL,
      last_run_id = p_run_id, updated_at = now()
  WHERE id = p_job_id;

  UPDATE public.story_factory_runs
  SET status = 'published', output_artifact = jsonb_build_object('title', p_title, 'stateAfter', p_state_after),
      editor_assessment = p_assessment, context_manifest = p_context_manifest, usage = p_usage,
      estimated_cost_usd = p_cost_usd, word_count = p_word_count, revision_count = p_revision_count,
      finished_at = now()
  WHERE id = p_run_id AND job_id = p_job_id AND status = 'running';
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_RUN_NOT_RUNNING'; END IF;

  RETURN jsonb_build_object('chapterNumber', p_expected_chapter, 'status', 'published');
END $$;

CREATE OR REPLACE FUNCTION public.commit_story_factory_arc_transition(
  p_job_id uuid,
  p_lease_token uuid,
  p_run_id uuid,
  p_lifecycle_status text,
  p_kernel_after jsonb,
  p_state_after jsonb,
  p_next_arc jsonb,
  p_output_artifact jsonb,
  p_usage jsonb,
  p_cost_usd numeric,
  p_engine_release text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE job public.story_factory_jobs;
DECLARE project public.ai_story_projects;
BEGIN
  SELECT * INTO job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF job.id IS NULL OR job.lease_token IS DISTINCT FROM p_lease_token OR job.lease_until < now() THEN
    RAISE EXCEPTION 'FACTORY_LEASE_INVALID';
  END IF;
  IF job.stage <> 'arc' OR job.current_chapter < 1 THEN RAISE EXCEPTION 'FACTORY_ARC_STAGE_INVALID'; END IF;
  IF p_lifecycle_status NOT IN ('continue', 'finale', 'complete') THEN RAISE EXCEPTION 'FACTORY_ARC_STATUS_INVALID'; END IF;

  SELECT * INTO project FROM public.ai_story_projects WHERE id = job.project_id FOR UPDATE;
  IF project.engine_release IS DISTINCT FROM p_engine_release THEN RAISE EXCEPTION 'FACTORY_RELEASE_MISMATCH'; END IF;
  IF project.current_chapter <> job.current_chapter THEN RAISE EXCEPTION 'FACTORY_CHAPTER_SEQUENCE_MISMATCH'; END IF;
  IF (p_state_after->>'chapterNumber')::integer <> job.current_chapter THEN RAISE EXCEPTION 'FACTORY_STATE_SEQUENCE_MISMATCH'; END IF;
  IF p_lifecycle_status = 'complete' AND p_next_arc IS NOT NULL THEN RAISE EXCEPTION 'FACTORY_COMPLETE_ARC_MUST_BE_NULL'; END IF;
  IF p_lifecycle_status <> 'complete' AND p_next_arc IS NULL THEN RAISE EXCEPTION 'FACTORY_NEXT_ARC_MISSING'; END IF;

  UPDATE public.ai_story_projects
  SET story_kernel = p_kernel_after,
      story_state = p_state_after,
      arc_plan = CASE WHEN p_lifecycle_status = 'complete' THEN arc_plan ELSE p_next_arc END,
      updated_at = now()
  WHERE id = project.id;

  UPDATE public.story_factory_jobs
  SET status = CASE
        WHEN p_lifecycle_status = 'complete' THEN 'completed'
        WHEN p_lifecycle_status = 'finale' THEN 'finale'
        ELSE 'ready'
      END,
      stage = CASE WHEN p_lifecycle_status = 'complete' THEN 'done' ELSE 'plan' END,
      rolling_plan = NULL,
      lease_owner = NULL,
      lease_token = NULL,
      lease_until = NULL,
      next_run_at = now(),
      completed_at = CASE WHEN p_lifecycle_status = 'complete' THEN now() ELSE completed_at END,
      last_run_id = p_run_id,
      updated_at = now()
  WHERE id = job.id;

  IF p_lifecycle_status = 'complete' THEN
    UPDATE public.novels SET status = 'Hoàn thành', updated_at = now() WHERE id = job.novel_id;
  END IF;

  UPDATE public.story_factory_runs
  SET status = 'passed',
      output_artifact = p_output_artifact,
      usage = p_usage,
      estimated_cost_usd = p_cost_usd,
      finished_at = now()
  WHERE id = p_run_id AND job_id = job.id AND kind = 'arc' AND status = 'running';
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_RUN_NOT_RUNNING'; END IF;

  RETURN jsonb_build_object('status', p_lifecycle_status, 'chapterNumber', job.current_chapter);
END $$;

REVOKE ALL ON FUNCTION public.commit_story_factory_chapter(
  uuid, uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb,
  jsonb, jsonb, numeric, integer, integer, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_story_factory_chapter(
  uuid, uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb,
  jsonb, jsonb, numeric, integer, integer, text
) TO service_role;

REVOKE ALL ON FUNCTION public.commit_story_factory_arc_transition(
  uuid, uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb, numeric, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_story_factory_arc_transition(
  uuid, uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb, numeric, text
) TO service_role;

-- The original sea-village canary remains an immutable benchmark corpus.
UPDATE public.story_factory_jobs
SET status = 'cancelled',
    stage = 'done',
    lease_owner = NULL,
    lease_token = NULL,
    lease_until = NULL,
    last_error = 'Archived at chapter 20 as the pre-long-series benchmark corpus.',
    completed_at = now(),
    updated_at = now()
WHERE id = '173c2314-c7c1-493a-8c72-bb98cec4ba03'::uuid
  AND current_chapter = 20;

UPDATE public.novels
SET hidden = true,
    status = 'Tạm dừng',
    updated_at = now()
WHERE id = '207d7e88-1ee5-4943-9172-e64f34447bb6'::uuid;

INSERT INTO public.story_state_events(
  project_id, chapter_number, delta_id, kind, entity_id, before_value,
  after_value, source, related_entity_ids
)
SELECT
  project_id,
  20,
  'corpus_archive_20260724',
  'corpus_archive',
  novel_id::text,
  NULL,
  jsonb_build_object('jobId', id, 'chapterNumber', current_chapter, 'reason', 'long_series_rebuild'),
  'operator-approved migration',
  '{}'::text[]
FROM public.story_factory_jobs
WHERE id = '173c2314-c7c1-493a-8c72-bb98cec4ba03'::uuid
ON CONFLICT (project_id, chapter_number, delta_id) DO NOTHING;
