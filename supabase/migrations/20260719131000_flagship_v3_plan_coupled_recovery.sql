-- Production canary evidence showed two independent drafts repeating the same
-- timeline defect inherited from the rolling plan. Count both failed drafts
-- explicitly and reset the draft budget only when the uncommitted window is
-- regenerated under its one-shot recovery budget.

ALTER TABLE public.story_factory_jobs
  DROP CONSTRAINT IF EXISTS story_factory_jobs_quality_attempts_for_chapter_check;

ALTER TABLE public.story_factory_jobs
  ADD CONSTRAINT story_factory_jobs_quality_attempts_for_chapter_check
  CHECK (quality_attempts_for_chapter BETWEEN 0 AND 2);

CREATE OR REPLACE FUNCTION public.advance_flagship_factory_job(
  p_job_id uuid,p_lease_token uuid,p_expected_status text,p_next_status text,p_next_stage text,
  p_chapter_number integer,p_checkpoint_status text DEFAULT 'passed',p_input_digest text DEFAULT '',
  p_output_digest text DEFAULT NULL,p_evidence jsonb DEFAULT '[]'::jsonb,p_failure_class text DEFAULT NULL,
  p_error_message text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_job public.story_factory_jobs;
BEGIN
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_JOB_NOT_FOUND'; END IF;
  IF v_job.pipeline_version IS DISTINCT FROM 'flagship_v3' THEN RAISE EXCEPTION 'FACTORY_V3_PIPELINE_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.ai_story_projects p JOIN public.novels n ON n.id=p.novel_id
    WHERE p.id=v_job.project_id AND p.status='paused' AND p.style_directives->>'pipeline_version'='flagship_v3'
      AND ((v_job.execution_mode='hidden_canary' AND p.style_directives->>'publication_mode'='offline_only'
            AND COALESCE((p.style_directives->>'factory_enabled')::boolean,false)=false AND n.hidden=true)
        OR (v_job.execution_mode='production' AND p.style_directives->>'publication_mode'='automatic'
            AND p.style_directives->>'factory_enabled'='true'))) THEN RAISE EXCEPTION 'FACTORY_V3_MODE_REVOKED'; END IF;
  IF v_job.status IS DISTINCT FROM p_expected_status OR v_job.lease_token IS DISTINCT FROM p_lease_token
     OR v_job.lease_until IS NULL OR v_job.lease_until<now() THEN RAISE EXCEPTION 'FACTORY_LEASE_OR_STATE_MISMATCH'; END IF;
  IF p_next_status NOT IN ('ready','writing','finale','quality_blocked','plan_blocked','infra_blocked','completed','cancelled')
     OR p_next_stage NOT IN ('plan','write','review','commit','completion') THEN RAISE EXCEPTION 'FACTORY_V3_NEXT_STATE_INVALID'; END IF;
  IF p_checkpoint_status NOT IN ('started','passed','failed','skipped') THEN RAISE EXCEPTION 'FACTORY_CHECKPOINT_STATUS_INVALID'; END IF;
  IF length(trim(COALESCE(p_input_digest,'')))<8 THEN RAISE EXCEPTION 'FACTORY_INPUT_DIGEST_REQUIRED'; END IF;
  IF NOT ((v_job.status='ready' AND p_next_status IN ('writing','cancelled'))
    OR (v_job.status='writing' AND p_next_status IN ('ready','finale','quality_blocked','plan_blocked','infra_blocked','completed'))
    OR (v_job.status='finale' AND p_next_status IN ('writing','completed','quality_blocked','plan_blocked','infra_blocked'))
    OR (v_job.status='infra_blocked' AND p_next_status IN ('ready','writing','plan_blocked','cancelled'))) THEN
    RAISE EXCEPTION 'FACTORY_V3_INVALID_TRANSITION';
  END IF;
  IF p_failure_class='quality' AND p_next_status='ready' AND v_job.quality_attempts_for_chapter>=1 THEN
    RAISE EXCEPTION 'FACTORY_V3_QUALITY_RECOVERY_EXHAUSTED';
  END IF;
  INSERT INTO public.story_factory_checkpoints(job_id,project_id,stage,chapter_number,attempt,status,input_digest,output_digest,evidence,failure_class,error_message)
  VALUES(v_job.id,v_job.project_id,p_next_stage,p_chapter_number,v_job.attempt,p_checkpoint_status,NULLIF(p_input_digest,''),p_output_digest,
    COALESCE(p_evidence,'[]'::jsonb),p_failure_class,p_error_message);
  UPDATE public.story_factory_jobs SET status=p_next_status,stage=p_next_stage,
    current_chapter=GREATEST(current_chapter,p_chapter_number),lease_owner=NULL,lease_token=NULL,lease_until=NULL,
    quality_attempts_for_chapter=CASE
      WHEN p_chapter_number>v_job.current_chapter THEN 0
      WHEN p_failure_class='quality' AND p_next_status IN ('ready','quality_blocked')
        THEN LEAST(2,v_job.quality_attempts_for_chapter+1)
      ELSE quality_attempts_for_chapter END,
    window_regeneration_count=CASE WHEN p_chapter_number>v_job.current_chapter THEN 0 ELSE window_regeneration_count END,
    failure_class=p_failure_class,last_error=p_error_message,
    completed_at=CASE WHEN p_next_status='completed' THEN now() ELSE completed_at END,updated_at=now()
  WHERE id=v_job.id RETURNING * INTO v_job;
  RETURN to_jsonb(v_job);
END; $$;

CREATE OR REPLACE FUNCTION public.reset_uncommitted_flagship_window_v3(
  p_job_id uuid,p_lease_token uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_job public.story_factory_jobs; v_deleted integer;
BEGIN
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.pipeline_version<>'flagship_v3' THEN RAISE EXCEPTION 'FACTORY_V3_JOB_NOT_FOUND'; END IF;
  IF v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until IS NULL OR v_job.lease_until<now() THEN RAISE EXCEPTION 'FACTORY_LEASE_OR_STATE_MISMATCH'; END IF;
  IF v_job.window_regeneration_count>=1 THEN RAISE EXCEPTION 'FACTORY_V3_WINDOW_REGENERATION_EXHAUSTED'; END IF;
  DELETE FROM public.chapter_blueprints WHERE project_id=v_job.project_id AND version=3
    AND chapter_number>v_job.current_chapter AND status<>'used';
  GET DIAGNOSTICS v_deleted=ROW_COUNT;
  UPDATE public.story_factory_jobs SET window_regeneration_count=1,quality_attempts_for_chapter=0,updated_at=now() WHERE id=v_job.id;
  RETURN jsonb_build_object('reset',true,'deleted_plans',v_deleted,'next_chapter',v_job.current_chapter+1);
END; $$;

REVOKE ALL ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reset_uncommitted_flagship_window_v3(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_uncommitted_flagship_window_v3(uuid,uuid) TO service_role;
