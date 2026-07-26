-- Typed causal mechanics change the artifact contracts and benchmark protocol.
-- The migration is deliberately fail-closed: no historical benchmark can promote this release.
-- Older evidence remains available, but cannot authorize this release.
UPDATE public.story_factory_runs
SET benchmark_protocol_version = 'legacy_incomparable',
    output_artifact = COALESCE(output_artifact, '{}'::jsonb) || jsonb_build_object(
      'supersededBy', 'story-factory-validation-v4-causal-reader',
      'supersededAt', now()
    )
WHERE kind = 'benchmark'
  AND benchmark_protocol_version IN (
    'story-factory-validation-v3-sequential-reader',
    'story-factory-writer-bakeoff-v2-plan-qualified',
    'story-factory-sequential-survival-v1'
  );

CREATE OR REPLACE FUNCTION public.story_factory_release_is_approved(
  p_benchmark_id uuid,
  p_engine_release text,
  p_model_routes jsonb
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.story_factory_runs benchmark
    JOIN public.story_factory_runs writer_validation
      ON writer_validation.id::text = benchmark.output_artifact->'manifest'->>'writerBakeoffRunId'
    JOIN public.story_factory_runs sequential_validation
      ON sequential_validation.id::text = benchmark.output_artifact->'manifest'->>'sequentialRunId'
    WHERE benchmark.id = p_benchmark_id
      AND benchmark.kind = 'benchmark'
      AND benchmark.status = 'passed'
      AND benchmark.error_code IS NULL
      AND benchmark.engine_release = p_engine_release
      AND benchmark.benchmark_protocol_version = 'story-factory-validation-v4-causal-reader'
      AND benchmark.output_artifact->'manifest'->>'passed' = 'true'
      AND benchmark.model_routes->'route'->>'planner' = p_model_routes->>'planner'
      AND benchmark.model_routes->'route'->>'planJudge' = p_model_routes->>'planJudge'
      AND benchmark.model_routes->'route'->>'writer' = p_model_routes->>'writer'
      AND benchmark.model_routes->'route'->>'editor' = p_model_routes->>'editor'
      AND benchmark.model_routes->'route'->>'routeVersion' = p_model_routes->>'routeVersion'
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'samplesCompleted')::integer, 0) = 20
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'firstPassPublishRate')::numeric, 0) >= 0.85
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'finalPublishRate')::numeric, 0) = 1
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'criticalContinuityViolations')::integer, -1) = 0
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'desireToReadNext')::numeric, 0) >= 0.75
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'medianAllInCostUsd')::numeric, 999) <= 0.25
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'maxAllInCostUsd')::numeric, 999) <= 0.50
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'totalCostUsd')::numeric, 999) <= 50
      AND writer_validation.kind = 'benchmark'
      AND writer_validation.status = 'passed'
      AND writer_validation.error_code IS NULL
      AND writer_validation.engine_release = p_engine_release
      AND writer_validation.benchmark_protocol_version = 'story-factory-writer-bakeoff-v3-causal-qualified'
      AND writer_validation.output_artifact->>'recommended' = p_model_routes->>'writer'
      AND writer_validation.output_artifact->>'corpusDigest'
        = benchmark.output_artifact->'manifest'->>'writerCorpusDigest'
      AND COALESCE((writer_validation.input_artifact->>'allPlansPassed')::boolean, false)
      AND COALESCE((writer_validation.input_artifact->>'allCausalPlansPassed')::boolean, false)
      AND sequential_validation.kind = 'benchmark'
      AND sequential_validation.status = 'passed'
      AND sequential_validation.error_code IS NULL
      AND sequential_validation.engine_release = p_engine_release
      AND sequential_validation.benchmark_protocol_version = 'story-factory-sequential-survival-v2-causal-continuity'
      AND sequential_validation.output_artifact->>'corpusDigest'
        = benchmark.output_artifact->'manifest'->>'corpusDigest'
      AND sequential_validation.model_routes->'route'->>'writer' = p_model_routes->>'writer'
  );
$$;

REVOKE ALL ON FUNCTION public.story_factory_release_is_approved(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.story_factory_release_is_approved(uuid, text, jsonb) TO service_role;

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
  WHERE job.status IN ('setup', 'ready', 'finale', 'writing')
    AND job.next_run_at <= now()
    AND (job.lease_until IS NULL OR job.lease_until < now())
    AND project.status = 'paused'
    AND project.engine_release = p_engine_release
    AND job.current_chapter < job.maximum_chapters
    AND (job.execution_mode = 'production' OR novel.hidden = true)
    AND public.story_factory_release_is_approved(job.benchmark_run_id, p_engine_release, project.model_routes)
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

CREATE OR REPLACE FUNCTION public.promote_story_factory_canary(p_job_id uuid, p_engine_release text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  job public.story_factory_jobs;
  project public.ai_story_projects;
  cover text;
  latest_review_status text;
  latest_review_release text;
  setup_digest text;
BEGIN
  SELECT * INTO job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
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
  IF NOT public.story_factory_release_is_approved(job.benchmark_run_id, p_engine_release, project.model_routes) THEN
    RAISE EXCEPTION 'FACTORY_VALIDATION_V4_REQUIRED';
  END IF;

  SELECT output_artifact->>'launchPackDigest' INTO setup_digest
  FROM public.story_factory_runs
  WHERE job_id = p_job_id
    AND kind = 'setup'
    AND status = 'passed'
    AND error_code IS NULL
    AND engine_release = p_engine_release
  ORDER BY finished_at DESC NULLS LAST, started_at DESC
  LIMIT 1;
  IF setup_digest IS DISTINCT FROM job.launch_pack_digest THEN
    RAISE EXCEPTION 'FACTORY_LAUNCH_PACK_DIGEST_MISMATCH';
  END IF;

  SELECT status, engine_release INTO latest_review_status, latest_review_release
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

  UPDATE public.novels SET hidden = false, status = 'Đang ra', updated_at = now() WHERE id = job.novel_id;
  UPDATE public.story_factory_jobs SET execution_mode = 'production', updated_at = now() WHERE id = p_job_id;

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
