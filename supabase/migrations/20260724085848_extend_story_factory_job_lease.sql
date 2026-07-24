-- Concept Lab and full-draft repair can legitimately exceed the old five
-- minute lease. A short lease let another cron claim the same immutable stage
-- while the first worker was still waiting on the provider. Keep one generous
-- lease per tick; the reconciler still closes genuinely abandoned work.
CREATE OR REPLACE FUNCTION public.claim_story_factory_job(
  p_worker_id text,
  p_engine_release text
)
RETURNS SETOF public.story_factory_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE claimed_id uuid;
BEGIN
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
    AND (
      job.stage = 'setup'
      OR EXISTS (
        SELECT 1
        FROM public.story_factory_runs benchmark
        WHERE benchmark.kind = 'benchmark'
          AND benchmark.status = 'passed'
          AND benchmark.engine_release = p_engine_release
      )
    )
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

REVOKE ALL ON FUNCTION public.claim_story_factory_job(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_story_factory_job(text, text)
  TO service_role;
