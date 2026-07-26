-- A chapter run can include Planner, Writer, Editor, one rewrite and
-- re-editor. Five minutes allows a second worker to reclaim a healthy job
-- while the first worker is still inside its provider calls.

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
  JOIN public.story_factory_runs writer_validation
    ON writer_validation.id::text = benchmark.output_artifact->'manifest'->>'writerBakeoffRunId'
  JOIN public.story_factory_runs sequential_validation
    ON sequential_validation.id::text = benchmark.output_artifact->'manifest'->>'sequentialRunId'
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
    AND benchmark.benchmark_protocol_version = 'story-factory-validation-v3-sequential-reader'
    AND benchmark.output_artifact->'manifest'->>'passed' = 'true'
    AND benchmark.model_routes->'route'->>'planner' = project.model_routes->>'planner'
    AND benchmark.model_routes->'route'->>'planJudge' = project.model_routes->>'planJudge'
    AND benchmark.model_routes->'route'->>'writer' = project.model_routes->>'writer'
    AND benchmark.model_routes->'route'->>'editor' = project.model_routes->>'editor'
    AND benchmark.model_routes->'route'->>'routeVersion' = project.model_routes->>'routeVersion'
    AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'samplesCompleted')::integer, 0) = 20
    AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'firstPassPublishRate')::numeric, 0) >= 0.85
    AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'finalPublishRate')::numeric, 0) = 1
    AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'criticalContinuityViolations')::integer, -1) = 0
    AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'desireToReadNext')::numeric, 0) >= 0.75
    AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'medianAllInCostUsd')::numeric, 999) <= 0.25
    AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'maxAllInCostUsd')::numeric, 999) <= 0.50
    AND writer_validation.kind = 'benchmark'
    AND writer_validation.status = 'passed'
    AND writer_validation.engine_release = p_engine_release
    AND writer_validation.benchmark_protocol_version = 'story-factory-writer-bakeoff-v2-plan-qualified'
    AND writer_validation.output_artifact->>'recommended' = project.model_routes->>'writer'
    AND writer_validation.output_artifact->>'corpusDigest'
      = benchmark.output_artifact->'manifest'->>'writerCorpusDigest'
    AND sequential_validation.kind = 'benchmark'
    AND sequential_validation.status = 'passed'
    AND sequential_validation.engine_release = p_engine_release
    AND sequential_validation.benchmark_protocol_version = 'story-factory-sequential-survival-v1'
    AND sequential_validation.output_artifact->>'corpusDigest'
      = benchmark.output_artifact->'manifest'->>'corpusDigest'
    AND sequential_validation.model_routes->'route'->>'writer' = project.model_routes->>'writer'
  ORDER BY job.next_run_at, job.created_at
  FOR UPDATE OF job SKIP LOCKED
  LIMIT 1;

  IF claimed_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  UPDATE public.story_factory_jobs job
  SET status = 'writing',
      lease_owner = p_worker_id,
      lease_token = gen_random_uuid(),
      lease_until = now() + interval '30 minutes',
      updated_at = now(),
      last_error = NULL
  WHERE job.id = claimed_id
  RETURNING job.*;
END $$;

REVOKE ALL ON FUNCTION public.claim_story_factory_job(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_story_factory_job(text, text) TO service_role;
