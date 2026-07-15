-- A retryable provider failure may be followed by a deterministic setup or
-- quality failure on the next leased attempt. Preserve the fail-closed result
-- instead of leaving the job stranded in infra_blocked.
CREATE OR REPLACE FUNCTION public.advance_flagship_factory_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_expected_status text,
  p_next_status text,
  p_next_stage text,
  p_chapter_number integer,
  p_checkpoint_status text DEFAULT 'passed',
  p_input_digest text DEFAULT '',
  p_output_digest text DEFAULT NULL,
  p_evidence jsonb DEFAULT '[]'::jsonb,
  p_failure_class text DEFAULT NULL,
  p_error_message text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.story_factory_jobs;
BEGIN
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_JOB_NOT_FOUND'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.ai_story_projects p
    WHERE p.id = v_job.project_id
      AND p.style_directives->>'pipeline_version' = 'flagship_v2'
      AND p.style_directives->>'factory_enabled' = 'true'
      AND p.style_directives->>'publication_mode' = 'automatic'
  ) THEN RAISE EXCEPTION 'FACTORY_OPT_IN_REVOKED'; END IF;
  IF v_job.status IS DISTINCT FROM p_expected_status OR v_job.lease_token IS DISTINCT FROM p_lease_token
     OR v_job.lease_until IS NULL OR v_job.lease_until < now() THEN RAISE EXCEPTION 'FACTORY_LEASE_OR_STATE_MISMATCH'; END IF;
  IF p_next_status NOT IN ('queued','setup','ready','writing','finale','blocked','infra_blocked','completed','cancelled')
     OR p_next_stage NOT IN ('setup','plan','write','review','commit','completion') THEN RAISE EXCEPTION 'FACTORY_NEXT_STATE_INVALID'; END IF;
  IF p_checkpoint_status NOT IN ('started','passed','failed','skipped') THEN RAISE EXCEPTION 'FACTORY_CHECKPOINT_STATUS_INVALID'; END IF;
  IF length(trim(COALESCE(p_input_digest,''))) < 8 THEN RAISE EXCEPTION 'FACTORY_INPUT_DIGEST_REQUIRED'; END IF;
  IF NOT (
    (v_job.status = 'queued' AND p_next_status IN ('setup','cancelled')) OR
    (v_job.status = 'setup' AND p_next_status IN ('setup','ready','blocked','infra_blocked','cancelled')) OR
    (v_job.status = 'ready' AND p_next_status IN ('writing','cancelled')) OR
    (v_job.status = 'writing' AND p_next_status IN ('writing','ready','finale','completed','blocked','infra_blocked')) OR
    (v_job.status = 'finale' AND p_next_status IN ('writing','completed','blocked','infra_blocked')) OR
    (v_job.status = 'blocked' AND p_next_status IN ('setup','ready','writing','cancelled')) OR
    (v_job.status = 'infra_blocked' AND p_next_status IN ('infra_blocked','queued','setup','ready','writing','blocked','cancelled'))
  ) THEN RAISE EXCEPTION 'FACTORY_INVALID_TRANSITION'; END IF;
  INSERT INTO public.story_factory_checkpoints(job_id, project_id, stage, chapter_number, attempt, status, input_digest, output_digest, evidence, failure_class, error_message)
  VALUES (v_job.id, v_job.project_id, p_next_stage, p_chapter_number, v_job.attempt, p_checkpoint_status, NULLIF(p_input_digest,''), p_output_digest, COALESCE(p_evidence,'[]'::jsonb), p_failure_class, p_error_message);
  UPDATE public.story_factory_jobs SET status = p_next_status, stage = p_next_stage,
    current_chapter = GREATEST(current_chapter, p_chapter_number), lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    failure_class = p_failure_class, last_error = p_error_message, completed_at = CASE WHEN p_next_status = 'completed' THEN now() ELSE completed_at END,
    updated_at = now() WHERE id = v_job.id RETURNING * INTO v_job;
  RETURN to_jsonb(v_job);
END;
$$;

REVOKE ALL ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) TO service_role;
