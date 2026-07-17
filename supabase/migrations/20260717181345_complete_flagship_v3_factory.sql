-- Complete the fail-closed flagship v3 control plane. This migration does not
-- resume, publish or delete any story. All mutable operator functions remain
-- service-role only and every public table is protected by RLS.

BEGIN;

ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS completion_report_v3 jsonb;

ALTER TABLE public.story_write_runs
  ADD COLUMN IF NOT EXISTS engine_release_id text;
ALTER TABLE public.story_chapter_attempts
  ADD COLUMN IF NOT EXISTS engine_release_id text;

ALTER TABLE public.story_factory_calibrations
  ADD COLUMN IF NOT EXISTS engine_release_id text,
  ADD COLUMN IF NOT EXISTS launch_pack_digest text,
  ADD COLUMN IF NOT EXISTS distinct_reviewers integer NOT NULL DEFAULT 0;

ALTER TABLE public.story_factory_calibrations
  DROP CONSTRAINT IF EXISTS story_factory_calibrations_prompt_version_route_version_key;
DROP INDEX IF EXISTS public.story_factory_calibrations_release_route_unique;
CREATE UNIQUE INDEX story_factory_calibrations_release_route_unique
  ON public.story_factory_calibrations(engine_release_id, route_version, launch_pack_digest);

CREATE TABLE IF NOT EXISTS public.story_fact_ledger_v3 (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  fact_id text NOT NULL,
  value text NOT NULL,
  scope text NOT NULL DEFAULT 'local' CHECK (scope IN ('invariant','arc','local')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  source_chapter integer NOT NULL CHECK (source_chapter >= 0),
  last_seen_chapter integer NOT NULL CHECK (last_seen_chapter >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, fact_id)
);

CREATE TABLE IF NOT EXISTS public.story_knowledge_ledger_v3 (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  character_id text NOT NULL,
  fact_id text NOT NULL,
  learned_chapter integer NOT NULL CHECK (learned_chapter >= 0),
  source text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, character_id, fact_id)
);

CREATE TABLE IF NOT EXISTS public.story_arc_ledger_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  arc_id text NOT NULL,
  start_chapter integer NOT NULL,
  end_chapter integer NOT NULL,
  arc_mode text NOT NULL CHECK (arc_mode IN ('standard','finale')),
  arc_plan jsonb NOT NULL,
  closure jsonb NOT NULL,
  ending_readiness jsonb NOT NULL,
  completion_report jsonb,
  prompt_version text NOT NULL,
  engine_release_id text NOT NULL,
  model_route jsonb NOT NULL,
  context_manifest jsonb NOT NULL,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  closed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, arc_id)
);

CREATE TABLE IF NOT EXISTS public.story_cover_manifests_v3 (
  project_id uuid PRIMARY KEY REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  cover_url text NOT NULL,
  title text NOT NULL,
  watermark text NOT NULL CHECK (watermark = 'truyencity.com'),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  rendered_sha256 text NOT NULL CHECK (rendered_sha256 ~ '^[a-f0-9]{64}$'),
  renderer_version text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  verified_at timestamptz NOT NULL DEFAULT now(),
  CHECK (width * 3 = height * 2)
);

CREATE TABLE IF NOT EXISTS public.story_calibration_campaigns_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  engine_release_id text NOT NULL,
  route_version text NOT NULL,
  launch_pack_digest text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','approved','rejected')),
  answer_key jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.story_calibration_samples_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.story_calibration_campaigns_v3(id) ON DELETE CASCADE,
  sample_key text NOT NULL,
  title text NOT NULL,
  chapter_number integer NOT NULL CHECK (chapter_number > 0),
  option_a text NOT NULL,
  option_b text NOT NULL,
  machine_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, sample_key)
);

CREATE TABLE IF NOT EXISTS public.story_calibration_ballots_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.story_calibration_campaigns_v3(id) ON DELETE CASCADE,
  sample_id uuid NOT NULL REFERENCES public.story_calibration_samples_v3(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  preferred text NOT NULL CHECK (preferred IN ('a','b','tie')),
  wants_next boolean NOT NULL,
  critical_continuity_violation boolean NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sample_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS story_fact_ledger_v3_retrieval_idx
  ON public.story_fact_ledger_v3(project_id, status, scope, last_seen_chapter DESC);
CREATE INDEX IF NOT EXISTS story_knowledge_ledger_v3_retrieval_idx
  ON public.story_knowledge_ledger_v3(project_id, character_id, learned_chapter DESC);
CREATE INDEX IF NOT EXISTS story_arc_ledger_v3_project_idx
  ON public.story_arc_ledger_v3(project_id, end_chapter DESC);
CREATE INDEX IF NOT EXISTS story_calibration_samples_campaign_idx
  ON public.story_calibration_samples_v3(campaign_id, created_at);

ALTER TABLE public.story_fact_ledger_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_knowledge_ledger_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_arc_ledger_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_cover_manifests_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_calibration_campaigns_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_calibration_samples_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_calibration_ballots_v3 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.story_fact_ledger_v3, public.story_knowledge_ledger_v3,
  public.story_arc_ledger_v3, public.story_cover_manifests_v3,
  public.story_calibration_campaigns_v3, public.story_calibration_samples_v3,
  public.story_calibration_ballots_v3 FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.story_fact_ledger_v3, public.story_knowledge_ledger_v3,
  public.story_arc_ledger_v3, public.story_cover_manifests_v3,
  public.story_calibration_campaigns_v3, public.story_calibration_samples_v3,
  public.story_calibration_ballots_v3 TO service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'story_fact_ledger_v3','story_knowledge_ledger_v3','story_arc_ledger_v3',
    'story_cover_manifests_v3','story_calibration_campaigns_v3',
    'story_calibration_samples_v3','story_calibration_ballots_v3'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t || '_service_all', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.stage_flagship_launch_pack_release_v3(
  p_project_id uuid, p_launch_pack jsonb, p_routes jsonb,
  p_release_manifest jsonb, p_launch_pack_digest text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF p_release_manifest->>'pipelineVersion' IS DISTINCT FROM 'flagship_v3'
     OR length(COALESCE(p_release_manifest->>'releaseId','')) < 20
     OR p_release_manifest->>'promptVersion' IS NULL
     OR p_launch_pack_digest !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_MANIFEST_INVALID';
  END IF;
  SELECT public.stage_flagship_launch_pack_v3(p_project_id, p_launch_pack, p_routes) INTO v_result;
  UPDATE public.ai_story_projects SET
    style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
      'flagship_release_v3', p_release_manifest,
      'flagship_launch_pack_digest_v3', p_launch_pack_digest,
      'prompt_version', p_release_manifest->>'promptVersion'
    ), updated_at = now()
  WHERE id = p_project_id;
  RETURN v_result || jsonb_build_object('engine_release_id', p_release_manifest->>'releaseId', 'launch_pack_digest', p_launch_pack_digest);
END; $$;

CREATE OR REPLACE FUNCTION public.archive_reset_flagship_canary_release_v3(
  p_project_id uuid, p_engine_release_id text, p_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_project public.ai_story_projects; v_result jsonb;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  IF v_project.style_directives#>>'{flagship_release_v3,releaseId}' IS DISTINCT FROM p_engine_release_id THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_MISMATCH';
  END IF;
  SELECT public.archive_reset_flagship_canary_v3(p_project_id, p_confirmation) INTO v_result;
  DELETE FROM public.story_fact_ledger_v3 WHERE project_id=p_project_id;
  DELETE FROM public.story_knowledge_ledger_v3 WHERE project_id=p_project_id;
  DELETE FROM public.story_arc_ledger_v3 WHERE project_id=p_project_id;
  UPDATE public.ai_story_projects SET style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
    'flagship_release_v3', v_project.style_directives->'flagship_release_v3',
    'flagship_launch_pack_digest_v3', v_project.style_directives->>'flagship_launch_pack_digest_v3',
    'prompt_version', v_project.style_directives#>>'{flagship_release_v3,promptVersion}'
  ), completion_report_v3=NULL WHERE id = p_project_id;
  RETURN v_result || jsonb_build_object('engine_release_id', p_engine_release_id);
END; $$;

CREATE OR REPLACE FUNCTION public.commit_flagship_chapter_release_v3(
  p_project_id uuid, p_novel_id uuid, p_expected_current_chapter integer,
  p_chapter_number integer, p_title text, p_content text, p_quality_score numeric,
  p_story_state jsonb, p_run_id uuid, p_attempt_id uuid, p_context_manifest jsonb,
  p_editor_evidence jsonb, p_realized_delta_evidence jsonb, p_revision_lineage jsonb,
  p_quality_verdict jsonb, p_prompt_version text, p_model_route jsonb,
  p_estimated_cost_usd numeric, p_engine_release_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_project public.ai_story_projects; v_result jsonb; v_item jsonb; v_knowledge jsonb;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND OR v_project.style_directives#>>'{flagship_release_v3,releaseId}' IS DISTINCT FROM p_engine_release_id THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_MISMATCH';
  END IF;
  UPDATE public.story_write_runs SET engine_release_id=p_engine_release_id WHERE id=p_run_id AND status='running';
  UPDATE public.story_chapter_attempts SET engine_release_id=p_engine_release_id WHERE id=p_attempt_id AND status='running';
  SELECT public.commit_flagship_chapter_v3(
    p_project_id,p_novel_id,p_expected_current_chapter,p_chapter_number,p_title,p_content,
    p_quality_score,p_story_state,p_run_id,p_attempt_id,p_context_manifest,p_editor_evidence,
    p_realized_delta_evidence,p_revision_lineage,p_quality_verdict,p_prompt_version,p_model_route,
    p_estimated_cost_usd
  ) INTO v_result;
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_story_state->'facts','[]'::jsonb)) LOOP
    INSERT INTO public.story_fact_ledger_v3(project_id,fact_id,value,scope,status,source_chapter,last_seen_chapter)
    VALUES (p_project_id,v_item->>'id',v_item->>'value',COALESCE(v_item->>'scope','local'),COALESCE(v_item->>'status','active'),
      COALESCE((v_item->>'sourceChapter')::integer,p_chapter_number),p_chapter_number)
    ON CONFLICT(project_id,fact_id) DO UPDATE SET value=EXCLUDED.value,scope=EXCLUDED.scope,status=EXCLUDED.status,
      source_chapter=EXCLUDED.source_chapter,last_seen_chapter=EXCLUDED.last_seen_chapter,updated_at=now();
  END LOOP;
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_story_state->'characters','[]'::jsonb)) LOOP
    FOR v_knowledge IN SELECT value FROM jsonb_array_elements(COALESCE(v_item->'knowledge','[]'::jsonb)) LOOP
      INSERT INTO public.story_knowledge_ledger_v3(project_id,character_id,fact_id,learned_chapter,source)
      VALUES (p_project_id,v_item->>'characterId',v_knowledge->>'factId',(v_knowledge->>'learnedChapter')::integer,v_knowledge->>'source')
      ON CONFLICT(project_id,character_id,fact_id) DO UPDATE SET learned_chapter=EXCLUDED.learned_chapter,source=EXCLUDED.source,updated_at=now();
    END LOOP;
  END LOOP;
  RETURN v_result || jsonb_build_object('engine_release_id', p_engine_release_id);
END; $$;

CREATE OR REPLACE VIEW public.factory_story_cost_v3
WITH (security_invoker=true) AS
SELECT a.project_id,a.chapter_number,
  a.estimated_cost_usd AS prose_editor_cost_usd,
  COALESCE((b.meta->>'rollingPlannerCostUsd')::numeric/5,0) AS rolling_planner_amortized_usd,
  COALESCE(ar.estimated_cost_usd/NULLIF(ar.end_chapter-ar.start_chapter+1,0),0) AS arc_lifecycle_amortized_usd,
  a.estimated_cost_usd
    + COALESCE((b.meta->>'rollingPlannerCostUsd')::numeric/5,0)
    + COALESCE(ar.estimated_cost_usd/NULLIF(ar.end_chapter-ar.start_chapter+1,0),0) AS all_in_cost_usd
FROM public.story_chapter_attempts a
LEFT JOIN public.chapter_blueprints b ON b.project_id=a.project_id AND b.chapter_number=a.chapter_number AND b.version=3
LEFT JOIN public.story_arc_ledger_v3 ar ON ar.project_id=a.project_id AND a.chapter_number BETWEEN ar.start_chapter AND ar.end_chapter
WHERE a.status='published';

REVOKE ALL ON public.factory_story_cost_v3 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.factory_story_cost_v3 TO service_role;

CREATE OR REPLACE FUNCTION public.commit_flagship_arc_transition_v3(
  p_project_id uuid, p_expected_current_chapter integer, p_closed_arc jsonb,
  p_closure jsonb, p_ending_readiness jsonb, p_next_arc jsonb,
  p_completion_report jsonb, p_prompt_version text, p_engine_release_id text,
  p_model_route jsonb, p_context_manifest jsonb, p_estimated_cost_usd numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_project public.ai_story_projects; v_is_completion boolean;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  IF COALESCE(v_project.current_chapter,0) <> p_expected_current_chapter
     OR COALESCE((p_closed_arc->>'endChapter')::integer,-1) <> p_expected_current_chapter
     OR v_project.arc_plan_v3->>'arcId' IS DISTINCT FROM p_closed_arc->>'arcId' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_ARC_TRANSITION_RACE';
  END IF;
  IF v_project.style_directives#>>'{flagship_release_v3,releaseId}' IS DISTINCT FROM p_engine_release_id THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_MISMATCH';
  END IF;
  v_is_completion := p_completion_report IS NOT NULL;
  IF v_is_completion AND (
    COALESCE(p_closed_arc->>'arcMode','standard') <> 'finale'
    OR COALESCE((p_ending_readiness->>'deterministicReady')::boolean,false) IS NOT TRUE
    OR p_next_arc IS NOT NULL
  ) THEN RAISE EXCEPTION 'FLAGSHIP_V3_INVALID_COMPLETION_REPORT'; END IF;
  IF NOT v_is_completion AND (
    p_next_arc IS NULL OR COALESCE((p_next_arc->>'startChapter')::integer,-1) <> p_expected_current_chapter + 1
  ) THEN RAISE EXCEPTION 'FLAGSHIP_V3_NEXT_ARC_REQUIRED'; END IF;
  INSERT INTO public.story_arc_ledger_v3(project_id,arc_id,start_chapter,end_chapter,arc_mode,arc_plan,closure,
    ending_readiness,completion_report,prompt_version,engine_release_id,model_route,context_manifest,estimated_cost_usd)
  VALUES(p_project_id,p_closed_arc->>'arcId',(p_closed_arc->>'startChapter')::integer,(p_closed_arc->>'endChapter')::integer,
    COALESCE(p_closed_arc->>'arcMode','standard'),p_closed_arc,p_closure,p_ending_readiness,p_completion_report,
    p_prompt_version,p_engine_release_id,COALESCE(p_model_route,'{}'::jsonb),COALESCE(p_context_manifest,'[]'::jsonb),COALESCE(p_estimated_cost_usd,0));
  UPDATE public.ai_story_projects SET arc_plan_v3=COALESCE(p_next_arc,arc_plan_v3),
    completion_report_v3=p_completion_report,updated_at=now() WHERE id=p_project_id;
  RETURN jsonb_build_object('committed',true,'completed',v_is_completion,'next_arc_id',p_next_arc->>'arcId');
END; $$;

CREATE OR REPLACE FUNCTION public.commit_flagship_rolling_window_release_v3(
  p_project_id uuid, p_expected_current_chapter integer, p_window jsonb,
  p_prompt_version text, p_model_route jsonb, p_context_manifest jsonb,
  p_engine_release_id text, p_estimated_cost_usd numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_project public.ai_story_projects; v_result jsonb;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND OR v_project.style_directives#>>'{flagship_release_v3,releaseId}' IS DISTINCT FROM p_engine_release_id THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_MISMATCH';
  END IF;
  SELECT public.commit_flagship_rolling_window_v3(p_project_id,p_expected_current_chapter,p_window,p_prompt_version,p_model_route,p_context_manifest) INTO v_result;
  UPDATE public.chapter_blueprints SET meta=COALESCE(meta,'{}'::jsonb)||jsonb_build_object(
    'engineReleaseId',p_engine_release_id,'rollingPlannerCostUsd',COALESCE(p_estimated_cost_usd,0))
  WHERE project_id=p_project_id AND chapter_number BETWEEN (p_window->>'startChapter')::integer AND (p_window->>'startChapter')::integer+4 AND version=3;
  RETURN v_result||jsonb_build_object('engine_release_id',p_engine_release_id,'estimated_cost_usd',COALESCE(p_estimated_cost_usd,0));
END; $$;

CREATE OR REPLACE FUNCTION public.promote_flagship_v3_factory_release(
  p_project_id uuid, p_engine_release_id text, p_daily_quota integer, p_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_project public.ai_story_projects; v_novel public.novels; v_routes jsonb; v_job jsonb;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'PROMOTE_APPROVED_V3_FACTORY' THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROMOTION_CONFIRMATION_REQUIRED'; END IF;
  IF p_daily_quota NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'FLAGSHIP_V3_DAILY_QUOTA_INVALID'; END IF;
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  SELECT * INTO v_novel FROM public.novels WHERE id=v_project.novel_id FOR UPDATE;
  v_routes := v_project.style_directives->'flagship_model_routes_v3';
  IF v_project.style_directives#>>'{flagship_release_v3,releaseId}' IS DISTINCT FROM p_engine_release_id THEN RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_MISMATCH'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.story_factory_calibrations c
    WHERE c.engine_release_id=p_engine_release_id AND c.route_version=v_routes->>'routeVersion'
      AND c.launch_pack_digest=v_project.style_directives->>'flagship_launch_pack_digest_v3'
      AND c.status='approved' AND c.sample_size>=50 AND c.distinct_reviewers>=5
      AND c.blind_preference_rate>=0.65 AND c.first_pass_publish_rate>=0.65
      AND c.within_revision_publish_rate>=0.80 AND c.critical_continuity_violations=0
      AND c.read_chapter_4_rate>=0.70 AND c.median_cost_usd<=0.25) THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_APPROVED_RELEASE_CALIBRATION_REQUIRED';
  END IF;
  IF v_project.status IS DISTINCT FROM 'paused' OR v_project.flagship_v3_status IS DISTINCT FROM 'ready_to_write'
     OR COALESCE(v_project.current_chapter,0)<3 THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_READY_FOR_PROMOTION'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.story_cover_manifests_v3 c WHERE c.project_id=p_project_id AND c.novel_id=v_project.novel_id
     AND c.approved AND c.title=v_novel.title AND c.cover_url=v_novel.cover_url AND c.watermark='truyencity.com'
     AND c.width*3=c.height*2) THEN RAISE EXCEPTION 'FLAGSHIP_V3_APPROVED_COVER_MANIFEST_REQUIRED'; END IF;
  UPDATE public.ai_story_projects SET style_directives=COALESCE(style_directives,'{}'::jsonb)||jsonb_build_object(
    'pipeline_version','flagship_v3','publication_mode','automatic','factory_enabled',true,
    'production_daily_chapter_quota',p_daily_quota),pause_reason='flagship_v3_factory_controlled',updated_at=now()
  WHERE id=p_project_id;
  UPDATE public.novels SET hidden=false,updated_at=now() WHERE id=v_project.novel_id;
  SELECT public.enroll_flagship_factory_job_v3(p_project_id,1200,'narrative_ending') INTO v_job;
  RETURN jsonb_build_object('promoted',true,'project_id',p_project_id,'engine_release_id',p_engine_release_id,'job',v_job);
END; $$;

-- Repair two legacy functions currently reported by linked database lint.
CREATE OR REPLACE FUNCTION public.can_user_write_chapter(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_subscription text; v_daily_limit integer; v_daily_used integer; v_balance integer; v_reset timestamptz;
BEGIN
  SELECT tier::text INTO v_subscription FROM public.user_subscriptions WHERE user_id=p_user_id AND status='active';
  IF NOT FOUND THEN v_subscription := 'free'; END IF;
  SELECT daily_limit,daily_used,balance,daily_reset_at INTO v_daily_limit,v_daily_used,v_balance,v_reset
    FROM public.user_credits WHERE user_id=p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed',false,'reason','no_credits_account','tier',v_subscription); END IF;
  IF v_reset < now()-interval '24 hours' THEN v_daily_used:=0; END IF;
  IF v_daily_limit<>-1 AND v_daily_used>=v_daily_limit THEN RETURN jsonb_build_object('allowed',false,'reason','daily_limit_reached','tier',v_subscription,'daily_used',v_daily_used,'daily_limit',v_daily_limit,'reset_at',v_reset+interval '24 hours'); END IF;
  RETURN jsonb_build_object('allowed',true,'tier',v_subscription,'daily_used',v_daily_used,'daily_limit',v_daily_limit,'balance',v_balance);
END; $$;

CREATE OR REPLACE FUNCTION public.archive_old_rag_chunks(p_chapter_buffer integer DEFAULT 800,p_dry_run boolean DEFAULT false)
RETURNS TABLE(project_id uuid,archived_count bigint) LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE rec record; v_archived bigint;
BEGIN
  FOR rec IN SELECT asp.id,asp.current_chapter FROM public.ai_story_projects asp WHERE asp.current_chapter>p_chapter_buffer LOOP
    IF p_dry_run THEN SELECT count(*) INTO v_archived FROM public.story_memory_chunks smc WHERE smc.project_id=rec.id AND smc.chapter_number<(rec.current_chapter-p_chapter_buffer);
    ELSE DELETE FROM public.story_memory_chunks smc WHERE smc.project_id=rec.id AND smc.chapter_number<(rec.current_chapter-p_chapter_buffer); GET DIAGNOSTICS v_archived=ROW_COUNT; END IF;
    IF v_archived>0 THEN project_id:=rec.id; archived_count:=v_archived; RETURN NEXT; END IF;
  END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.stage_flagship_launch_pack_release_v3(uuid,jsonb,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.archive_reset_flagship_canary_release_v3(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.commit_flagship_chapter_release_v3(uuid,uuid,integer,integer,text,text,numeric,jsonb,uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,text,jsonb,numeric,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.commit_flagship_arc_transition_v3(uuid,integer,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,jsonb,jsonb,numeric) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.commit_flagship_rolling_window_release_v3(uuid,integer,jsonb,text,jsonb,jsonb,text,numeric) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.promote_flagship_v3_factory_release(uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stage_flagship_launch_pack_release_v3(uuid,jsonb,jsonb,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_reset_flagship_canary_release_v3(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_flagship_chapter_release_v3(uuid,uuid,integer,integer,text,text,numeric,jsonb,uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,text,jsonb,numeric,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_flagship_arc_transition_v3(uuid,integer,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,jsonb,jsonb,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_flagship_rolling_window_release_v3(uuid,integer,jsonb,text,jsonb,jsonb,text,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_flagship_v3_factory_release(uuid,text,integer,text) TO service_role;

COMMIT;
