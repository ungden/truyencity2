-- Benchmark V2 makes run telemetry fail-closed and binds every canary to one
-- immutable, reader-blind benchmark approval. Historical benchmark rows remain
-- queryable but can no longer authorize writing or publication.

ALTER TABLE public.story_factory_runs
  ADD COLUMN IF NOT EXISTS benchmark_protocol_version text,
  ADD COLUMN IF NOT EXISTS artifact_digest text,
  ADD COLUMN IF NOT EXISTS first_pass boolean,
  ADD COLUMN IF NOT EXISTS published_after_rewrite boolean,
  ADD COLUMN IF NOT EXISTS draft_attempts smallint NOT NULL DEFAULT 0;

ALTER TABLE public.story_factory_runs
  DROP CONSTRAINT IF EXISTS story_factory_runs_draft_attempts_check;
ALTER TABLE public.story_factory_runs
  ADD CONSTRAINT story_factory_runs_draft_attempts_check
  CHECK (draft_attempts BETWEEN 0 AND 2);

ALTER TABLE public.story_factory_jobs
  ADD COLUMN IF NOT EXISTS benchmark_run_id uuid,
  ADD COLUMN IF NOT EXISTS launch_pack_digest text;

ALTER TABLE public.story_factory_jobs
  DROP CONSTRAINT IF EXISTS story_factory_jobs_benchmark_run_id_fkey;
ALTER TABLE public.story_factory_jobs
  ADD CONSTRAINT story_factory_jobs_benchmark_run_id_fkey
  FOREIGN KEY (benchmark_run_id) REFERENCES public.story_factory_runs(id) ON DELETE RESTRICT;

UPDATE public.story_factory_runs
SET benchmark_protocol_version = 'legacy_incomparable'
WHERE kind = 'benchmark'
  AND benchmark_protocol_version IS NULL;

-- Preserve the contradictory values before normalizing them. This is the audit
-- trail for the one-way repair and avoids another live table solely for cleanup.
UPDATE public.story_factory_runs
SET output_artifact = COALESCE(output_artifact, '{}'::jsonb) || jsonb_build_object(
      'telemetryRepair',
      jsonb_build_object(
        'repairedAt', now(),
        'previousStatus', status,
        'previousErrorCode', error_code,
        'reason', 'terminal_success_contained_error'
      )
    ),
    status = CASE
      WHEN error_code IN ('infra_blocked', 'stale_lease') THEN 'infra_blocked'
      ELSE 'failed'
    END,
    error_message = COALESCE(error_message, 'Historical terminal success contained an error code.'),
    finished_at = COALESCE(finished_at, now())
WHERE status IN ('passed', 'published')
  AND error_code IS NOT NULL;

UPDATE public.story_factory_runs
SET error_code = CASE
      WHEN status = 'infra_blocked' THEN 'legacy_infra_blocked'
      WHEN status = 'blocked' THEN 'legacy_blocked'
      ELSE 'legacy_failed'
    END,
    error_message = COALESCE(error_message, 'Historical terminal failure had no typed error.'),
    finished_at = COALESCE(finished_at, now())
WHERE status IN ('blocked', 'infra_blocked', 'failed')
  AND error_code IS NULL;

UPDATE public.story_factory_runs
SET error_code = NULL,
    error_message = NULL,
    finished_at = NULL
WHERE status = 'running';

ALTER TABLE public.story_factory_runs
  DROP CONSTRAINT IF EXISTS story_factory_runs_terminal_consistency_check;
ALTER TABLE public.story_factory_runs
  ADD CONSTRAINT story_factory_runs_terminal_consistency_check
  CHECK (
    (status = 'running' AND finished_at IS NULL AND error_code IS NULL)
    OR
    (status IN ('passed', 'published') AND finished_at IS NOT NULL AND error_code IS NULL)
    OR
    (status IN ('blocked', 'infra_blocked', 'failed') AND finished_at IS NOT NULL AND error_code IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS story_factory_runs_benchmark_protocol_idx
  ON public.story_factory_runs(benchmark_protocol_version, engine_release, status)
  WHERE kind = 'benchmark';

CREATE OR REPLACE FUNCTION public.claim_story_factory_job(p_worker_id text, p_engine_release text)
RETURNS SETOF public.story_factory_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE claimed_id uuid;
BEGIN
  UPDATE public.story_factory_runs run
  SET status = 'infra_blocked',
      error_code = 'infra_blocked',
      error_message = 'Run lease expired before completion.',
      finished_at = now()
  FROM public.story_factory_jobs job
  JOIN public.ai_story_projects project ON project.id = job.project_id
  JOIN public.novels novel ON novel.id = job.novel_id
  WHERE run.job_id = job.id
    AND run.status = 'running'
    AND job.status = 'writing'
    AND job.lease_until < now()
    AND project.status = 'paused'
    AND project.engine_release = p_engine_release
    AND (job.execution_mode = 'production' OR novel.hidden = true);

  SELECT job.id INTO claimed_id
  FROM public.story_factory_jobs job
  JOIN public.ai_story_projects project ON project.id = job.project_id
  JOIN public.novels novel ON novel.id = job.novel_id
  JOIN public.story_factory_runs benchmark ON benchmark.id = job.benchmark_run_id
  WHERE job.status IN ('setup', 'ready', 'finale', 'writing')
    AND job.next_run_at <= now()
    AND (job.lease_until IS NULL OR job.lease_until < now())
    AND project.status = 'paused'
    AND project.engine_release = p_engine_release
    AND job.current_chapter < job.maximum_chapters
    AND (job.execution_mode = 'production' OR novel.hidden = true)
    AND benchmark.kind = 'benchmark'
    AND benchmark.status = 'passed'
    AND benchmark.engine_release = p_engine_release
    AND benchmark.benchmark_protocol_version = 'story-factory-benchmark-v2-reader-blind'
    AND benchmark.model_routes->'candidate'->>'planner' = project.model_routes->>'planner'
    AND benchmark.model_routes->'candidate'->>'planJudge' = project.model_routes->>'planJudge'
    AND benchmark.model_routes->'candidate'->>'writer' = project.model_routes->>'writer'
    AND benchmark.model_routes->'candidate'->>'editor' = project.model_routes->>'editor'
    AND benchmark.model_routes->'candidate'->>'routeVersion' = project.model_routes->>'routeVersion'
  ORDER BY job.next_run_at, job.created_at
  FOR UPDATE OF job SKIP LOCKED
  LIMIT 1;

  IF claimed_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  UPDATE public.story_factory_jobs job
  SET status = 'writing',
      lease_owner = p_worker_id,
      lease_token = gen_random_uuid(),
      lease_until = now() + interval '5 minutes',
      updated_at = now(),
      last_error = NULL
  WHERE job.id = claimed_id
  RETURNING job.*;
END $$;

REVOKE ALL ON FUNCTION public.claim_story_factory_job(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_story_factory_job(text, text) TO service_role;

DROP FUNCTION IF EXISTS public.commit_story_factory_chapter(
  uuid, uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb,
  jsonb, jsonb, numeric, integer, integer, text
);

CREATE FUNCTION public.commit_story_factory_chapter(
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
  p_attempt_telemetry jsonb,
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
  IF EXISTS (SELECT 1 FROM public.chapters WHERE novel_id = job.novel_id AND chapter_number = p_expected_chapter) THEN
    RAISE EXCEPTION 'FACTORY_CHAPTER_ALREADY_EXISTS';
  END IF;

  INSERT INTO public.chapters(novel_id, chapter_number, title, content, quality_score)
  VALUES (job.novel_id, p_expected_chapter, p_title, p_content, NULL);

  FOR event IN SELECT value FROM jsonb_array_elements(p_events)
  LOOP
    INSERT INTO public.story_state_events(
      project_id, chapter_number, delta_id, kind, entity_id, before_value, after_value, source
    ) VALUES (
      job.project_id, p_expected_chapter, event->>'deltaId', event->>'kind', event->>'entityId',
      event->'before', event->'after', NULLIF(event->>'source', '')
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
        WHEN new_today >= job.daily_target THEN ((local_date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ELSE now()
      END,
      lease_owner = NULL, lease_token = NULL, lease_until = NULL,
      last_run_id = p_run_id, updated_at = now()
  WHERE id = p_job_id;

  UPDATE public.story_factory_runs
  SET status = 'published',
      output_artifact = jsonb_build_object(
        'title', p_title,
        'stateAfter', p_state_after,
        'attemptTelemetry', p_attempt_telemetry
      ),
      editor_assessment = p_assessment,
      context_manifest = p_context_manifest,
      usage = p_usage,
      estimated_cost_usd = p_cost_usd,
      word_count = p_word_count,
      revision_count = p_revision_count,
      draft_attempts = 1 + p_revision_count,
      first_pass = (p_revision_count = 0),
      published_after_rewrite = (p_revision_count = 1),
      error_code = NULL,
      error_message = NULL,
      finished_at = now()
  WHERE id = p_run_id AND job_id = p_job_id AND status = 'running';
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_RUN_NOT_RUNNING'; END IF;

  RETURN jsonb_build_object('chapterNumber', p_expected_chapter, 'status', 'published');
END $$;

REVOKE ALL ON FUNCTION public.commit_story_factory_chapter(
  uuid, uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb,
  jsonb, jsonb, numeric, integer, integer, jsonb, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_story_factory_chapter(
  uuid, uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb,
  jsonb, jsonb, numeric, integer, integer, jsonb, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.promote_story_factory_canary(p_job_id uuid, p_engine_release text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  job public.story_factory_jobs;
  project public.ai_story_projects;
  benchmark public.story_factory_runs;
  cover text;
  latest_review_status text;
  latest_review_release text;
  setup_digest text;
BEGIN
  SELECT * INTO job
  FROM public.story_factory_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF job.id IS NULL OR job.execution_mode <> 'hidden_canary' OR job.current_chapter < 10 THEN
    RAISE EXCEPTION 'FACTORY_CANARY_NOT_READY';
  END IF;
  IF job.benchmark_run_id IS NULL OR job.launch_pack_digest IS NULL THEN
    RAISE EXCEPTION 'FACTORY_CANARY_PROVENANCE_REQUIRED';
  END IF;

  SELECT * INTO project FROM public.ai_story_projects WHERE id = job.project_id;
  IF project.engine_release IS DISTINCT FROM p_engine_release THEN
    RAISE EXCEPTION 'FACTORY_RELEASE_MISMATCH';
  END IF;

  SELECT * INTO benchmark FROM public.story_factory_runs WHERE id = job.benchmark_run_id;
  IF benchmark.id IS NULL
    OR benchmark.kind <> 'benchmark'
    OR benchmark.status <> 'passed'
    OR benchmark.engine_release IS DISTINCT FROM p_engine_release
    OR benchmark.benchmark_protocol_version IS DISTINCT FROM 'story-factory-benchmark-v2-reader-blind'
    OR benchmark.model_routes->'candidate'->>'planner' IS DISTINCT FROM project.model_routes->>'planner'
    OR benchmark.model_routes->'candidate'->>'planJudge' IS DISTINCT FROM project.model_routes->>'planJudge'
    OR benchmark.model_routes->'candidate'->>'writer' IS DISTINCT FROM project.model_routes->>'writer'
    OR benchmark.model_routes->'candidate'->>'editor' IS DISTINCT FROM project.model_routes->>'editor'
    OR benchmark.model_routes->'candidate'->>'routeVersion' IS DISTINCT FROM project.model_routes->>'routeVersion'
  THEN
    RAISE EXCEPTION 'FACTORY_BENCHMARK_V2_REQUIRED';
  END IF;

  SELECT output_artifact->>'launchPackDigest' INTO setup_digest
  FROM public.story_factory_runs
  WHERE job_id = p_job_id
    AND kind = 'setup'
    AND status = 'passed'
    AND engine_release = p_engine_release
  ORDER BY finished_at DESC NULLS LAST, started_at DESC
  LIMIT 1;
  IF setup_digest IS DISTINCT FROM job.launch_pack_digest THEN
    RAISE EXCEPTION 'FACTORY_LAUNCH_PACK_DIGEST_MISMATCH';
  END IF;

  SELECT status, engine_release
  INTO latest_review_status, latest_review_release
  FROM public.story_factory_runs
  WHERE job_id = p_job_id
    AND kind = 'window_review'
    AND chapter_number = 10
  ORDER BY finished_at DESC NULLS LAST, started_at DESC
  LIMIT 1;
  IF latest_review_status IS DISTINCT FROM 'passed'
    OR latest_review_release IS DISTINCT FROM p_engine_release
  THEN
    RAISE EXCEPTION 'FACTORY_LATEST_WINDOW_REVIEW_REQUIRED';
  END IF;

  SELECT cover_url INTO cover FROM public.novels WHERE id = job.novel_id;
  IF cover IS NULL OR length(trim(cover)) = 0 THEN RAISE EXCEPTION 'FACTORY_COVER_REQUIRED'; END IF;

  UPDATE public.novels
  SET hidden = false, status = 'Đang ra', updated_at = now()
  WHERE id = job.novel_id;
  UPDATE public.story_factory_jobs
  SET execution_mode = 'production', updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'jobId', p_job_id,
    'executionMode', 'production',
    'visible', true,
    'benchmarkRunId', job.benchmark_run_id,
    'launchPackDigest', job.launch_pack_digest,
    'reviewRelease', latest_review_release
  );
END $$;

REVOKE ALL ON FUNCTION public.promote_story_factory_canary(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_story_factory_canary(uuid, text) TO service_role;
