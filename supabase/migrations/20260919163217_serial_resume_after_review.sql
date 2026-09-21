-- A human-reviewed resume starts a fresh bounded replan window. This is kept in
-- one database transaction so a paused job cannot be made ready while its open
-- cycle still carries the exhausted automatic-replan counter.
BEGIN;
SET lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.resume_serial_job(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.serial_jobs;
BEGIN
  SELECT * INTO v_job
  FROM public.serial_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_JOB_MISSING'; END IF;
  IF v_job.status <> 'paused' THEN RAISE EXCEPTION 'SERIAL_JOB_NOT_PAUSED'; END IF;

  IF v_job.current_cycle_id IS NOT NULL THEN
    UPDATE public.serial_cycles SET
      status = 'writing', replan_count = 0, updated_at = now()
    WHERE id = v_job.current_cycle_id
      AND serial_novel_id = v_job.serial_novel_id
      AND status <> 'published';

    IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_OPEN_CYCLE_MISSING'; END IF;
  END IF;

  UPDATE public.serial_jobs SET
    status = 'ready', consecutive_replans = 0, retry_count = 0,
    last_error = NULL,
    lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    next_run_at = now(), updated_at = now()
  WHERE id = v_job.id;

  RETURN jsonb_build_object(
    'resumed', true,
    'jobId', v_job.id,
    'cycleId', v_job.current_cycle_id,
    'nextStage', v_job.stage
  );
END $$;
REVOKE ALL ON FUNCTION public.resume_serial_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resume_serial_job(uuid) TO service_role;
COMMIT;
