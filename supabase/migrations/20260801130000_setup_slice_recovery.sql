-- Setup runs in 300s slices on Vercel and CANNOT complete in one: Concept Lab is nine
-- provider calls with checkpoint-resume designed for exactly this. But the recovery
-- machinery treated every killed slice as a transient FAILURE: a 30-minute lease
-- stalled each resume, and reconcile's retry budget (5) parked the job before a
-- 5-7 slice setup could finish. Observed live on the first cron-driven canary.
--
-- Two changes, both scoped to stage='setup':
--   * claim leases setup for 8 minutes instead of 30 — a dead function cannot outlive
--     300s, so 8 minutes bounds the stall per slice without risking a live worker.
--   * reconcile parks setup only after 12 requeues. Slice deaths are the NORMAL way
--     setup progresses; checkpoints make the work monotonic. The higher cap still
--     bounds a genuinely crash-looping setup instead of letting it burn forever.
SET lock_timeout = '5s';

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

  -- 'writing' is deliberately NOT claimable: expired jobs return exclusively through
  -- reconcile_story_factory_jobs, which counts the crash and requeues with backoff.
  SELECT job.id INTO claimed_id
  FROM public.story_factory_jobs job
  JOIN public.ai_story_projects project ON project.id = job.project_id
  JOIN public.novels novel ON novel.id = job.novel_id
  WHERE job.status IN ('setup', 'ready', 'finale')
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
      -- Setup slices die at the 300s route ceiling by design; an 8-minute lease
      -- resumes the next slice quickly. Chapter work keeps the full 30 minutes so a
      -- slow provider stage can never be reclaimed mid-commit.
      lease_until = now() + CASE WHEN job.stage = 'setup' THEN interval '8 minutes' ELSE interval '30 minutes' END,
      updated_at = now(),
      last_error = NULL
  WHERE job.id = claimed_id
  RETURNING job.*;
END $$;

REVOKE ALL ON FUNCTION public.claim_story_factory_job(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_story_factory_job(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_story_factory_jobs(p_stale_minutes integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.story_factory_runs run
  SET status = 'infra_blocked', error_code = 'stale_lease', error_message = 'Worker lease expired.', finished_at = now()
  FROM public.story_factory_jobs job
  WHERE run.id = job.last_run_id AND run.status = 'running'
    AND job.status = 'writing' AND job.lease_until < now() - make_interval(mins => p_stale_minutes);

  -- Backoff 5, 10, 20, 40, 80 minutes; floor above the invocation budget. Setup gets
  -- a 12-requeue cap (slice deaths are its normal progress mechanism, checkpointed
  -- and monotonic) and a flat 1-minute backoff so the next slice starts immediately.
  UPDATE public.story_factory_jobs
  SET status = CASE
        WHEN stage = 'setup' AND retry_count >= 12 THEN 'infra_blocked'
        WHEN stage <> 'setup' AND retry_count >= 5 THEN 'infra_blocked'
        ELSE 'ready'
      END,
      retry_count = retry_count + 1,
      next_run_at = CASE
        WHEN stage = 'setup' AND retry_count >= 12 THEN next_run_at
        WHEN stage <> 'setup' AND retry_count >= 5 THEN next_run_at
        WHEN stage = 'setup' THEN now() + interval '1 minute'
        ELSE now() + make_interval(mins => (5 * power(2, LEAST(retry_count, 5)))::integer)
      END,
      last_error = 'Worker lease expired.',
      lease_owner = NULL,
      lease_token = NULL,
      lease_until = NULL,
      updated_at = now()
  WHERE status = 'writing' AND lease_until < now() - make_interval(mins => p_stale_minutes);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

REVOKE ALL ON FUNCTION public.reconcile_story_factory_jobs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_story_factory_jobs(integer) TO service_role;
