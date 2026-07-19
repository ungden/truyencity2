-- Make flagship_v3 a real paused-project factory. The job is the only runtime
-- control plane: hidden canaries are writable while their project and novel
-- stay fail-closed, and promotion only changes the job mode plus visibility.

BEGIN;

ALTER TABLE public.story_factory_jobs
  ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS quality_attempts_for_chapter integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS window_regeneration_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.story_factory_jobs
  DROP CONSTRAINT IF EXISTS story_factory_jobs_execution_mode_check,
  DROP CONSTRAINT IF EXISTS story_factory_jobs_quality_attempts_for_chapter_check,
  DROP CONSTRAINT IF EXISTS story_factory_jobs_window_regeneration_count_check;
ALTER TABLE public.story_factory_jobs
  ADD CONSTRAINT story_factory_jobs_execution_mode_check
    CHECK (execution_mode IN ('hidden_canary','production')),
  ADD CONSTRAINT story_factory_jobs_quality_attempts_for_chapter_check
    CHECK (quality_attempts_for_chapter BETWEEN 0 AND 1),
  ADD CONSTRAINT story_factory_jobs_window_regeneration_count_check
    CHECK (window_regeneration_count BETWEEN 0 AND 1);

CREATE INDEX IF NOT EXISTS story_factory_jobs_v3_mode_claim_idx
  ON public.story_factory_jobs(execution_mode,status,lease_until,updated_at)
  WHERE pipeline_version='flagship_v3' AND status IN ('ready','writing','finale','infra_blocked');

-- Immutable setup provenance. Research ends here and never enters WriterBrief.
CREATE TABLE IF NOT EXISTS public.story_factory_commissions_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL UNIQUE,
  project_id uuid REFERENCES public.ai_story_projects(id) ON DELETE RESTRICT,
  commission jsonb NOT NULL,
  research_snapshot jsonb NOT NULL,
  research_digest text NOT NULL CHECK (research_digest ~ '^[a-f0-9]{64}$'),
  setup_release_id text NOT NULL,
  status text NOT NULL DEFAULT 'commissioned' CHECK (status IN ('commissioned','generating','judging','selected','launch_pack_ready','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.story_setup_attempts_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.story_factory_commissions_v3(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('concept_generator','concept_judge','opening_writer','opening_judge','kernel_architect','state_seeder','arc_architect','rolling_planner')),
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  prompt_version text NOT NULL,
  model_route text NOT NULL,
  input_digest text NOT NULL CHECK (input_digest ~ '^[a-f0-9]{64}$'),
  output_digest text CHECK (output_digest IS NULL OR output_digest ~ '^[a-f0-9]{64}$'),
  output_artifact jsonb,
  validation_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  result text NOT NULL CHECK (result IN ('valid','invalid','infra_blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(commission_id,role,attempt_no,input_digest)
);

CREATE TABLE IF NOT EXISTS public.story_portfolio_signatures_v3 (
  project_id uuid PRIMARY KEY REFERENCES public.ai_story_projects(id) ON DELETE RESTRICT,
  selected_concept_id text NOT NULL,
  mechanism_fingerprint text NOT NULL CHECK (mechanism_fingerprint ~ '^[a-f0-9]{64}$'),
  reward_loop_fingerprint text NOT NULL CHECK (reward_loop_fingerprint ~ '^[a-f0-9]{64}$'),
  conflict_economy_fingerprint text NOT NULL CHECK (conflict_economy_fingerprint ~ '^[a-f0-9]{64}$'),
  signature_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mechanism_fingerprint,reward_loop_fingerprint,conflict_economy_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.story_launch_packs_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.story_factory_commissions_v3(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE RESTRICT,
  engine_release_id text NOT NULL,
  route_version text NOT NULL,
  launch_pack_digest text NOT NULL CHECK (launch_pack_digest ~ '^[a-f0-9]{64}$'),
  launch_pack jsonb NOT NULL,
  selected_concept_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('valid','rejected','staged')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id,engine_release_id,launch_pack_digest)
);

CREATE OR REPLACE FUNCTION public.guard_immutable_flagship_v3_factory_artifact()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  RAISE EXCEPTION 'FLAGSHIP_V3_FACTORY_ARTIFACT_IMMUTABLE';
END; $$;

CREATE OR REPLACE FUNCTION public.guard_story_factory_commission_v3()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FLAGSHIP_V3_FACTORY_ARTIFACT_IMMUTABLE'; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.slot_key IS DISTINCT FROM OLD.slot_key
     OR NEW.commission IS DISTINCT FROM OLD.commission OR NEW.research_snapshot IS DISTINCT FROM OLD.research_snapshot
     OR NEW.research_digest IS DISTINCT FROM OLD.research_digest OR NEW.setup_release_id IS DISTINCT FROM OLD.setup_release_id
     OR (OLD.project_id IS NOT NULL AND NEW.project_id IS DISTINCT FROM OLD.project_id) THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_FACTORY_ARTIFACT_IMMUTABLE';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.guard_story_launch_pack_v3()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FLAGSHIP_V3_FACTORY_ARTIFACT_IMMUTABLE'; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.commission_id IS DISTINCT FROM OLD.commission_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.engine_release_id IS DISTINCT FROM OLD.engine_release_id
     OR NEW.route_version IS DISTINCT FROM OLD.route_version OR NEW.launch_pack_digest IS DISTINCT FROM OLD.launch_pack_digest
     OR NEW.launch_pack IS DISTINCT FROM OLD.launch_pack OR NEW.selected_concept_id IS DISTINCT FROM OLD.selected_concept_id THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_FACTORY_ARTIFACT_IMMUTABLE';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS story_factory_commissions_v3_immutable ON public.story_factory_commissions_v3;
CREATE TRIGGER story_factory_commissions_v3_immutable BEFORE UPDATE OR DELETE ON public.story_factory_commissions_v3
  FOR EACH ROW EXECUTE FUNCTION public.guard_story_factory_commission_v3();
DROP TRIGGER IF EXISTS story_setup_attempts_v3_immutable ON public.story_setup_attempts_v3;
CREATE TRIGGER story_setup_attempts_v3_immutable BEFORE UPDATE OR DELETE ON public.story_setup_attempts_v3
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_flagship_v3_factory_artifact();
DROP TRIGGER IF EXISTS story_portfolio_signatures_v3_immutable ON public.story_portfolio_signatures_v3;
CREATE TRIGGER story_portfolio_signatures_v3_immutable BEFORE UPDATE OR DELETE ON public.story_portfolio_signatures_v3
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_flagship_v3_factory_artifact();
DROP TRIGGER IF EXISTS story_launch_packs_v3_immutable ON public.story_launch_packs_v3;
CREATE TRIGGER story_launch_packs_v3_immutable BEFORE UPDATE OR DELETE ON public.story_launch_packs_v3
  FOR EACH ROW EXECUTE FUNCTION public.guard_story_launch_pack_v3();

ALTER TABLE public.story_factory_commissions_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_setup_attempts_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_portfolio_signatures_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_launch_packs_v3 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_factory_commissions_v3,public.story_setup_attempts_v3,
  public.story_portfolio_signatures_v3,public.story_launch_packs_v3 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.story_factory_commissions_v3,public.story_setup_attempts_v3,
  public.story_portfolio_signatures_v3,public.story_launch_packs_v3 TO service_role;
GRANT UPDATE(status,project_id) ON public.story_factory_commissions_v3 TO service_role;
GRANT UPDATE(status) ON public.story_launch_packs_v3 TO service_role;
CREATE POLICY story_factory_commissions_v3_service ON public.story_factory_commissions_v3 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY story_setup_attempts_v3_service ON public.story_setup_attempts_v3 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY story_portfolio_signatures_v3_service ON public.story_portfolio_signatures_v3 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY story_launch_packs_v3_service ON public.story_launch_packs_v3 FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enroll_flagship_factory_job_v3_mode(
  p_project_id uuid,
  p_execution_mode text,
  p_max_chapters integer DEFAULT 1200,
  p_completion_mode text DEFAULT 'narrative_ending'
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_project public.ai_story_projects; v_novel public.novels; v_job public.story_factory_jobs;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_V3_PROJECT_NOT_FOUND'; END IF;
  SELECT * INTO v_novel FROM public.novels WHERE id=v_project.novel_id FOR UPDATE;
  IF v_project.status IS DISTINCT FROM 'paused' THEN RAISE EXCEPTION 'FACTORY_V3_PROJECT_MUST_STAY_PAUSED'; END IF;
  IF v_project.style_directives->>'pipeline_version' IS DISTINCT FROM 'flagship_v3'
     OR v_project.flagship_v3_status IS DISTINCT FROM 'ready_to_write'
     OR v_project.story_kernel_v3 IS NULL OR v_project.arc_plan_v3 IS NULL OR v_project.story_state_v3 IS NULL THEN
    RAISE EXCEPTION 'FACTORY_V3_ARTIFACTS_NOT_READY';
  END IF;
  IF p_execution_mode NOT IN ('hidden_canary','production') THEN RAISE EXCEPTION 'FACTORY_V3_EXECUTION_MODE_INVALID'; END IF;
  IF p_execution_mode='hidden_canary' AND (
    v_project.style_directives->>'publication_mode' IS DISTINCT FROM 'offline_only'
    OR COALESCE((v_project.style_directives->>'factory_enabled')::boolean,false)
    OR COALESCE(v_novel.hidden,false) IS NOT TRUE
  ) THEN RAISE EXCEPTION 'FACTORY_V3_HIDDEN_CANARY_FAIL_CLOSED_REQUIRED'; END IF;
  IF p_execution_mode='production' AND (
    v_project.style_directives->>'publication_mode' IS DISTINCT FROM 'automatic'
    OR v_project.style_directives->>'factory_enabled' IS DISTINCT FROM 'true'
  ) THEN RAISE EXCEPTION 'FACTORY_V3_PRODUCTION_OPT_IN_REQUIRED'; END IF;
  IF p_max_chapters NOT BETWEEN 100 AND 1200 THEN RAISE EXCEPTION 'FACTORY_V3_MAX_CHAPTERS_INVALID'; END IF;
  IF p_completion_mode NOT IN ('narrative_ending','hard_cap') THEN RAISE EXCEPTION 'FACTORY_V3_COMPLETION_MODE_INVALID'; END IF;
  INSERT INTO public.story_factory_jobs(
    project_id,novel_id,pipeline_version,execution_mode,status,stage,current_chapter,
    forecast_chapters,max_chapters,completion_mode,quality_attempts_for_chapter,window_regeneration_count
  ) VALUES (
    v_project.id,v_project.novel_id,'flagship_v3',p_execution_mode,'ready','plan',COALESCE(v_project.current_chapter,0),
    900,p_max_chapters,p_completion_mode,0,0
  ) ON CONFLICT(project_id) DO UPDATE SET
    pipeline_version='flagship_v3',execution_mode=EXCLUDED.execution_mode,status='ready',stage='plan',
    current_chapter=COALESCE(v_project.current_chapter,0),forecast_chapters=900,max_chapters=EXCLUDED.max_chapters,
    completion_mode=EXCLUDED.completion_mode,quality_attempts_for_chapter=0,window_regeneration_count=0,
    lease_owner=NULL,lease_token=NULL,lease_until=NULL,failure_class=NULL,last_error=NULL,updated_at=now()
  RETURNING * INTO v_job;
  RETURN to_jsonb(v_job);
END; $$;

CREATE OR REPLACE FUNCTION public.claim_flagship_factory_job(
  p_worker_id text,p_lease_seconds integer DEFAULT 900
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_job public.story_factory_jobs; v_token uuid:=gen_random_uuid(); v_vn_date date:=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF length(trim(COALESCE(p_worker_id,'')))<2 OR p_lease_seconds NOT BETWEEN 60 AND 3600 THEN RAISE EXCEPTION 'FACTORY_CLAIM_ARGUMENT_INVALID'; END IF;
  INSERT INTO public.project_daily_quotas(project_id,vn_date,target_chapters,written_chapters,status,next_due_at,slot_seed,retry_count,updated_at)
  SELECT p.id,v_vn_date,
    CASE WHEN j.execution_mode='hidden_canary' THEN 5 ELSE LEAST(20,GREATEST(1,COALESCE(NULLIF(p.style_directives->>'production_daily_chapter_quota','')::integer,5))) END,
    0,'active',now(),(hashtext(p.id::text||':'||v_vn_date::text)&2147483647),0,now()
  FROM public.ai_story_projects p JOIN public.story_factory_jobs j ON j.project_id=p.id
  JOIN public.novels n ON n.id=p.novel_id
  WHERE j.pipeline_version='flagship_v3' AND p.status='paused' AND p.style_directives->>'pipeline_version'='flagship_v3'
    AND j.status IN ('ready','writing','finale','infra_blocked')
    AND ((j.execution_mode='hidden_canary' AND p.style_directives->>'publication_mode'='offline_only'
          AND COALESCE((p.style_directives->>'factory_enabled')::boolean,false)=false AND n.hidden=true)
      OR (j.execution_mode='production' AND p.style_directives->>'publication_mode'='automatic'
          AND p.style_directives->>'factory_enabled'='true'))
  ON CONFLICT(project_id,vn_date) DO NOTHING;

  SELECT j.* INTO v_job FROM public.story_factory_jobs j
  JOIN public.ai_story_projects p ON p.id=j.project_id JOIN public.novels n ON n.id=p.novel_id
  JOIN public.project_daily_quotas q ON q.project_id=j.project_id AND q.vn_date=v_vn_date
  WHERE j.pipeline_version='flagship_v3' AND j.status IN ('ready','writing','finale','infra_blocked')
    AND (j.lease_until IS NULL OR j.lease_until<now()) AND p.status='paused'
    AND p.style_directives->>'pipeline_version'='flagship_v3'
    AND ((j.execution_mode='hidden_canary' AND p.style_directives->>'publication_mode'='offline_only'
          AND COALESCE((p.style_directives->>'factory_enabled')::boolean,false)=false AND n.hidden=true)
      OR (j.execution_mode='production' AND p.style_directives->>'publication_mode'='automatic'
          AND p.style_directives->>'factory_enabled'='true'))
    AND q.status='active' AND q.written_chapters<q.target_chapters AND (q.next_due_at IS NULL OR q.next_due_at<=now())
  ORDER BY CASE WHEN j.execution_mode='hidden_canary' THEN 0 ELSE 1 END,j.updated_at
  LIMIT 1 FOR UPDATE OF j SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.story_factory_jobs SET lease_owner=p_worker_id,lease_token=v_token,
    lease_until=now()+make_interval(secs=>p_lease_seconds),
    status=CASE WHEN status='ready' THEN 'writing' ELSE status END,
    stage=CASE WHEN status='ready' THEN 'write' ELSE stage END,attempt=attempt+1,updated_at=now()
  WHERE id=v_job.id RETURNING * INTO v_job;
  RETURN jsonb_build_object('job',to_jsonb(v_job),'worker_id',p_worker_id);
END; $$;

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
      WHEN p_failure_class='quality' AND p_next_status='ready' THEN v_job.quality_attempts_for_chapter+1
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
  UPDATE public.story_factory_jobs SET window_regeneration_count=1,updated_at=now() WHERE id=v_job.id;
  RETURN jsonb_build_object('reset',true,'deleted_plans',v_deleted,'next_chapter',v_job.current_chapter+1);
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_flagship_v3_project_paused()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF (NEW.style_directives->>'pipeline_version'='flagship_v3' OR NEW.flagship_v3_status IS NOT NULL)
     AND NEW.status IS DISTINCT FROM 'paused' THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_MUST_STAY_PAUSED'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_flagship_v3_project_paused ON public.ai_story_projects;
CREATE TRIGGER enforce_flagship_v3_project_paused BEFORE INSERT OR UPDATE ON public.ai_story_projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_flagship_v3_project_paused();

CREATE OR REPLACE FUNCTION public.record_flagship_factory_chapter_quota_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_project public.ai_story_projects; v_job public.story_factory_jobs;
  v_vn_date date:=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date; v_target integer;
BEGIN
  SELECT p.* INTO v_project FROM public.ai_story_projects p
  JOIN public.story_factory_jobs j ON j.project_id=p.id
  WHERE p.novel_id=NEW.novel_id AND j.pipeline_version='flagship_v3'
    AND ((j.execution_mode='hidden_canary' AND p.style_directives->>'publication_mode'='offline_only')
      OR (j.execution_mode='production' AND p.style_directives->>'publication_mode'='automatic'
          AND p.style_directives->>'factory_enabled'='true'))
  LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE project_id=v_project.id;
  v_target:=CASE WHEN v_job.execution_mode='hidden_canary' THEN 5
    ELSE LEAST(20,GREATEST(1,COALESCE(NULLIF(v_project.style_directives->>'production_daily_chapter_quota','')::integer,5))) END;
  INSERT INTO public.project_daily_quotas(project_id,vn_date,target_chapters,written_chapters,status,next_due_at,slot_seed,retry_count,last_error,failure_class,updated_at)
  VALUES(v_project.id,v_vn_date,v_target,1,CASE WHEN v_target<=1 THEN 'completed' ELSE 'active' END,
    CASE WHEN v_target<=1 THEN NULL ELSE now() END,(hashtext(v_project.id::text||':'||v_vn_date::text)&2147483647),0,NULL,NULL,now())
  ON CONFLICT(project_id,vn_date) DO UPDATE SET target_chapters=EXCLUDED.target_chapters,
    written_chapters=public.project_daily_quotas.written_chapters+1,
    status=CASE WHEN public.project_daily_quotas.written_chapters+1>=EXCLUDED.target_chapters THEN 'completed' ELSE 'active' END,
    next_due_at=CASE WHEN public.project_daily_quotas.written_chapters+1>=EXCLUDED.target_chapters THEN NULL ELSE now() END,
    retry_count=0,last_error=NULL,failure_class=NULL,updated_at=now();
  RETURN NEW;
END; $$;

ALTER TABLE public.story_machine_judgments_v3
  DROP CONSTRAINT IF EXISTS story_machine_judgments_v3_judge_lineage_check;
ALTER TABLE public.story_machine_judgments_v3
  ADD CONSTRAINT story_machine_judgments_v3_judge_lineage_check CHECK (judge_lineage IN (
    'google/gemini-2.5-pro','google/gemini-3-flash-preview','google/gemini-3.1-pro-preview'
  ));

CREATE OR REPLACE FUNCTION public.promote_flagship_v3_factory_release(
  p_project_id uuid,p_engine_release_id text,p_daily_quota integer,p_confirmation text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_project public.ai_story_projects; v_novel public.novels; v_routes jsonb;
  v_job public.story_factory_jobs; v_pack_digest text;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'PROMOTE_APPROVED_V3_FACTORY' THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROMOTION_CONFIRMATION_REQUIRED'; END IF;
  IF p_daily_quota NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'FLAGSHIP_V3_DAILY_QUOTA_INVALID'; END IF;
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  SELECT * INTO v_novel FROM public.novels WHERE id=v_project.novel_id FOR UPDATE;
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE project_id=p_project_id FOR UPDATE;
  IF NOT FOUND OR v_job.pipeline_version<>'flagship_v3' OR v_job.execution_mode<>'hidden_canary' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_HIDDEN_CANARY_JOB_REQUIRED';
  END IF;
  v_routes:=v_project.style_directives->'flagship_model_routes_v3';
  v_pack_digest:=v_project.style_directives->>'flagship_launch_pack_digest_v3';
  IF v_project.style_directives#>>'{flagship_release_v3,releaseId}' IS DISTINCT FROM p_engine_release_id THEN RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_MISMATCH'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.story_factory_calibrations c
    JOIN public.story_calibration_campaigns_v3 campaign ON campaign.id=c.campaign_id
    WHERE c.engine_release_id=p_engine_release_id AND c.route_version=v_routes->>'routeVersion'
      AND c.calibration_mode='machine_ensemble' AND campaign.calibration_mode='machine_ensemble'
      AND c.launch_pack_digests ? v_pack_digest AND jsonb_array_length(c.launch_pack_digests)=5
      AND c.status='approved' AND campaign.status='approved' AND c.sample_size=50 AND c.judge_count=3
      AND jsonb_array_length(c.judge_lineages)=3
      AND c.judge_lineages @> '["google/gemini-2.5-pro","google/gemini-3-flash-preview","google/gemini-3.1-pro-preview"]'::jsonb
      AND c.schema_success_rate=1 AND c.plan_success_rate=1 AND c.infra_success_rate=1
      AND c.blind_preference_rate>=0.65 AND c.first_pass_publish_rate>=0.85
      AND c.within_revision_publish_rate=1 AND c.critical_continuity_violations=0
      AND c.read_chapter_4_rate>=0.70 AND c.median_cost_usd<=0.25 AND c.max_cost_usd<=0.50
      AND (SELECT count(*) FROM public.story_machine_judgments_v3 j WHERE j.campaign_id=c.campaign_id)=150
      AND (SELECT count(DISTINCT j.sample_key) FROM public.story_machine_judgments_v3 j WHERE j.campaign_id=c.campaign_id)=50
  ) THEN RAISE EXCEPTION 'FLAGSHIP_V3_MACHINE_CALIBRATION_REQUIRED'; END IF;
  IF v_project.status IS DISTINCT FROM 'paused' OR v_project.flagship_v3_status IS DISTINCT FROM 'ready_to_write'
     OR COALESCE(v_project.current_chapter,0)<10 OR v_job.current_chapter<>v_project.current_chapter
     OR COALESCE(v_novel.hidden,false) IS NOT TRUE THEN RAISE EXCEPTION 'FLAGSHIP_V3_HIDDEN_TEN_CHAPTER_CANARY_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.story_cover_manifests_v3 c WHERE c.project_id=p_project_id AND c.novel_id=v_project.novel_id
     AND c.approved AND c.title=v_novel.title AND c.cover_url=v_novel.cover_url AND c.watermark='truyencity.com'
     AND c.width*3=c.height*2) THEN RAISE EXCEPTION 'FLAGSHIP_V3_APPROVED_COVER_MANIFEST_REQUIRED'; END IF;
  UPDATE public.ai_story_projects SET status='paused',style_directives=COALESCE(style_directives,'{}'::jsonb)||jsonb_build_object(
    'pipeline_version','flagship_v3','publication_mode','automatic','factory_enabled',true,
    'production_daily_chapter_quota',p_daily_quota),pause_reason='flagship_v3_factory_controlled',updated_at=now()
  WHERE id=p_project_id;
  UPDATE public.novels SET hidden=false,updated_at=now() WHERE id=v_project.novel_id;
  UPDATE public.story_factory_jobs SET execution_mode='production',status='ready',stage='plan',
    lease_owner=NULL,lease_token=NULL,lease_until=NULL,failure_class=NULL,last_error=NULL,updated_at=now()
  WHERE id=v_job.id RETURNING * INTO v_job;
  RETURN jsonb_build_object('promoted',true,'project_id',p_project_id,'engine_release_id',p_engine_release_id,'job',to_jsonb(v_job));
END; $$;

CREATE OR REPLACE VIEW public.factory_story_status_v3 WITH (security_invoker=true) AS
SELECT p.id AS project_id,p.novel_id,n.title,p.status AS project_status,p.current_chapter,p.flagship_v3_status,
  j.id AS job_id,j.status AS job_status,j.stage AS job_stage,j.failure_class AS job_failure_class,
  j.last_error AS job_last_error,j.lease_until,q.vn_date,q.status AS quota_status,q.written_chapters,
  q.target_chapters,q.next_due_at,r.id AS latest_run_id,r.status AS latest_run_status,
  r.failure_class AS latest_run_failure_class,r.publication_decision AS latest_publication_decision,
  r.quality_score AS latest_quality_score,r.prompt_version AS latest_prompt_version,r.model_route AS latest_model_route,
  r.error_message AS latest_run_error,r.updated_at AS latest_run_updated_at,
  j.execution_mode,j.quality_attempts_for_chapter,j.window_regeneration_count,n.hidden AS novel_hidden,
  p.style_directives#>>'{flagship_release_v3,releaseId}' AS engine_release_id
FROM public.ai_story_projects p JOIN public.novels n ON n.id=p.novel_id
LEFT JOIN public.story_factory_jobs j ON j.project_id=p.id AND j.pipeline_version='flagship_v3'
LEFT JOIN public.project_daily_quotas q ON q.project_id=p.id AND q.vn_date=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
LEFT JOIN LATERAL(SELECT run.* FROM public.story_write_runs run WHERE run.project_id=p.id
  AND run.pipeline_version='flagship_v3' ORDER BY run.updated_at DESC LIMIT 1) r ON true
WHERE p.style_directives->>'pipeline_version'='flagship_v3';
REVOKE ALL ON public.factory_story_status_v3 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.factory_story_status_v3 TO service_role;

REVOKE ALL ON FUNCTION public.enroll_flagship_factory_job_v3_mode(uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_flagship_factory_job(text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reset_uncommitted_flagship_window_v3(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.promote_flagship_v3_factory_release(uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_flagship_factory_job_v3_mode(uuid,text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_flagship_factory_job(text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_uncommitted_flagship_window_v3(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_flagship_v3_factory_release(uuid,text,integer,text) TO service_role;

COMMIT;
