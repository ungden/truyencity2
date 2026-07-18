-- Machine-only flagship v3 promotion gate. This migration is deliberately
-- fail-closed: it creates telemetry and approval contracts but never resumes a
-- project, enrolls a job, resets a canary, or unhides a novel by itself.

BEGIN;

CREATE TABLE IF NOT EXISTS public.story_plan_attempts_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  start_chapter integer NOT NULL CHECK (start_chapter > 0),
  attempt_no integer NOT NULL CHECK (attempt_no IN (1,2)),
  artifact_digest text NOT NULL CHECK (artifact_digest ~ '^[a-f0-9]{64}$'),
  model_route text NOT NULL,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  validation_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  result text NOT NULL CHECK (result IN ('valid','invalid')),
  engine_release_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, start_chapter, engine_release_id, attempt_no)
);

ALTER TABLE public.story_factory_calibrations
  ADD COLUMN IF NOT EXISTS calibration_mode text NOT NULL DEFAULT 'human_panel',
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS judge_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS judge_lineages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS schema_success_rate numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_success_rate numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infra_success_rate numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS judgment_evidence jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.story_factory_calibrations
  DROP CONSTRAINT IF EXISTS story_factory_calibrations_calibration_mode_check;
ALTER TABLE public.story_factory_calibrations
  ADD CONSTRAINT story_factory_calibrations_calibration_mode_check
  CHECK (calibration_mode IN ('human_panel','machine_ensemble'));

ALTER TABLE public.story_calibration_campaigns_v3
  ADD COLUMN IF NOT EXISTS calibration_mode text NOT NULL DEFAULT 'human_panel',
  ADD COLUMN IF NOT EXISTS corpus_version text,
  ADD COLUMN IF NOT EXISTS launch_pack_digests jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS judge_lineages jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.story_calibration_campaigns_v3
  DROP CONSTRAINT IF EXISTS story_calibration_campaigns_v3_calibration_mode_check;
ALTER TABLE public.story_calibration_campaigns_v3
  ADD CONSTRAINT story_calibration_campaigns_v3_calibration_mode_check
  CHECK (calibration_mode IN ('human_panel','machine_ensemble'));

DO $$ BEGIN
  ALTER TABLE public.story_factory_calibrations
    ADD CONSTRAINT story_factory_calibrations_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.story_calibration_campaigns_v3(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.story_machine_judgments_v3 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.story_calibration_campaigns_v3(id) ON DELETE RESTRICT,
  sample_key text NOT NULL,
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE RESTRICT,
  chapter_number integer NOT NULL CHECK (chapter_number BETWEEN 1 AND 10),
  judge_lineage text NOT NULL CHECK (judge_lineage IN (
    'google/gemini-2.5-pro','openai/gpt-5.6-luna','openrouter/x-ai/grok-4.5'
  )),
  preferred text NOT NULL CHECK (preferred IN ('candidate','control','tie')),
  desire_to_read_next boolean NOT NULL,
  critical_continuity_violation boolean NOT NULL,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, sample_key, judge_lineage)
);

CREATE INDEX IF NOT EXISTS story_plan_attempts_v3_project_idx
  ON public.story_plan_attempts_v3(project_id, start_chapter, created_at);
CREATE INDEX IF NOT EXISTS story_machine_judgments_v3_campaign_idx
  ON public.story_machine_judgments_v3(campaign_id, sample_key, judge_lineage);

ALTER TABLE public.story_plan_attempts_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_machine_judgments_v3 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_plan_attempts_v3, public.story_machine_judgments_v3 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.story_plan_attempts_v3, public.story_machine_judgments_v3 TO service_role;
DROP POLICY IF EXISTS story_plan_attempts_v3_service_insert ON public.story_plan_attempts_v3;
CREATE POLICY story_plan_attempts_v3_service_insert ON public.story_plan_attempts_v3
  FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS story_plan_attempts_v3_service_select ON public.story_plan_attempts_v3;
CREATE POLICY story_plan_attempts_v3_service_select ON public.story_plan_attempts_v3
  FOR SELECT TO service_role USING (true);
DROP POLICY IF EXISTS story_machine_judgments_v3_service_insert ON public.story_machine_judgments_v3;
CREATE POLICY story_machine_judgments_v3_service_insert ON public.story_machine_judgments_v3
  FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS story_machine_judgments_v3_service_select ON public.story_machine_judgments_v3;
CREATE POLICY story_machine_judgments_v3_service_select ON public.story_machine_judgments_v3
  FOR SELECT TO service_role USING (true);

CREATE OR REPLACE FUNCTION public.commit_flagship_machine_calibration_v3(
  p_corpus jsonb, p_metrics jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE
  v_campaign_id uuid := (p_corpus->>'campaignId')::uuid;
  v_sample jsonb;
  v_judgment jsonb;
  v_status text;
  v_judgment_count integer := 0;
BEGIN
  IF p_corpus->>'calibrationMode' IS DISTINCT FROM 'machine_ensemble'
     OR jsonb_array_length(COALESCE(p_corpus->'samples','[]'::jsonb)) <> 50
     OR jsonb_array_length(COALESCE(p_corpus->'launchPackDigests','[]'::jsonb)) <> 5
     OR jsonb_array_length(COALESCE(p_metrics->'judgeLineages','[]'::jsonb)) <> 3 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_MACHINE_CORPUS_INCOMPLETE';
  END IF;
  v_status := CASE WHEN COALESCE((p_metrics->>'approved')::boolean,false) THEN 'approved' ELSE 'rejected' END;
  INSERT INTO public.story_calibration_campaigns_v3(
    id,name,engine_release_id,route_version,launch_pack_digest,status,answer_key,
    calibration_mode,corpus_version,launch_pack_digests,judge_lineages,closed_at
  ) VALUES (
    v_campaign_id,'machine-ensemble-'||(p_corpus->>'corpusVersion'),p_corpus->>'engineReleaseId',
    p_corpus->>'routeVersion',p_corpus->'launchPackDigests'->>0,v_status,'{}'::jsonb,
    'machine_ensemble',p_corpus->>'corpusVersion',p_corpus->'launchPackDigests',
    p_metrics->'judgeLineages',now()
  );
  FOR v_sample IN SELECT value FROM jsonb_array_elements(p_corpus->'samples') LOOP
    IF jsonb_array_length(COALESCE(v_sample->'judgments','[]'::jsonb)) <> 3 THEN
      RAISE EXCEPTION 'FLAGSHIP_V3_MACHINE_SAMPLE_JUDGES_INCOMPLETE';
    END IF;
    FOR v_judgment IN SELECT value FROM jsonb_array_elements(v_sample->'judgments') LOOP
      INSERT INTO public.story_machine_judgments_v3(
        campaign_id,sample_key,project_id,chapter_number,judge_lineage,preferred,
        desire_to_read_next,critical_continuity_violation,evidence
      ) VALUES (
        v_campaign_id,v_sample->>'sampleId',(v_sample->>'projectId')::uuid,
        (v_sample->>'chapterNumber')::integer,v_judgment->>'judgeLineage',v_judgment->>'preferred',
        (v_judgment->>'desireToReadNext')::boolean,(v_judgment->>'criticalContinuityViolation')::boolean,
        v_judgment->'evidence'
      );
      v_judgment_count := v_judgment_count + 1;
    END LOOP;
  END LOOP;
  IF v_judgment_count <> 150 THEN RAISE EXCEPTION 'FLAGSHIP_V3_MACHINE_JUDGMENT_COUNT_INVALID'; END IF;
  INSERT INTO public.story_factory_calibrations(
    pipeline_version,prompt_version,route_version,sample_size,blind_preference_rate,
    first_pass_publish_rate,within_revision_publish_rate,critical_continuity_violations,
    read_chapter_4_rate,median_cost_usd,status,approved_by,evidence,engine_release_id,
    launch_pack_digest,launch_pack_digests,distinct_reviewers,calibration_mode,campaign_id,
    judge_count,judge_lineages,schema_success_rate,plan_success_rate,infra_success_rate,
    max_cost_usd,judgment_evidence
  ) VALUES (
    'flagship_v3',p_corpus->>'promptVersion',p_corpus->>'routeVersion',50,
    (p_metrics->>'candidateMajorityPreferenceRate')::numeric,(p_metrics->>'firstPassPublishRate')::numeric,
    (p_metrics->>'withinRepairPublishRate')::numeric,(p_metrics->>'criticalContinuityViolations')::integer,
    (p_metrics->>'desireToReadNextRate')::numeric,(p_metrics->>'medianCostUsd')::numeric,
    v_status,'machine_ensemble',p_corpus->'samples',p_corpus->>'engineReleaseId',
    p_corpus->'launchPackDigests'->>0,p_corpus->'launchPackDigests',0,'machine_ensemble',v_campaign_id,
    3,p_metrics->'judgeLineages',(p_metrics->>'schemaSuccessRate')::numeric,
    (p_metrics->>'planSuccessRate')::numeric,(p_metrics->>'infraSuccessRate')::numeric,
    (p_metrics->>'maxCostUsd')::numeric,p_corpus->'samples'
  );
  RETURN jsonb_build_object('campaign_id',v_campaign_id,'status',v_status,'judgments',v_judgment_count);
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
  IF p_quality_score IS NOT NULL THEN RAISE EXCEPTION 'FLAGSHIP_V3_NUMERIC_QUALITY_SCORE_FORBIDDEN'; END IF;
  IF p_quality_verdict ?| ARRAY['weightedMean','axes','confidence','planFidelity'] THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_NUMERIC_QUALITY_VERDICT_FORBIDDEN';
  END IF;
  IF p_quality_verdict->>'decision' IS DISTINCT FROM 'publish' THEN RAISE EXCEPTION 'FLAGSHIP_V3_NON_PUBLISH_COMMIT_FORBIDDEN'; END IF;
  UPDATE public.story_write_runs SET engine_release_id=p_engine_release_id WHERE id=p_run_id AND status='running';
  UPDATE public.story_chapter_attempts SET engine_release_id=p_engine_release_id WHERE id=p_attempt_id AND status='running';
  SELECT public.commit_flagship_chapter_v3(
    p_project_id,p_novel_id,p_expected_current_chapter,p_chapter_number,p_title,p_content,
    NULL,p_story_state,p_run_id,p_attempt_id,p_context_manifest,p_editor_evidence,
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

CREATE OR REPLACE FUNCTION public.promote_flagship_v3_factory_release(
  p_project_id uuid, p_engine_release_id text, p_daily_quota integer, p_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_project public.ai_story_projects; v_novel public.novels; v_routes jsonb; v_job jsonb; v_pack_digest text;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'PROMOTE_APPROVED_V3_FACTORY' THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROMOTION_CONFIRMATION_REQUIRED'; END IF;
  IF p_daily_quota NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'FLAGSHIP_V3_DAILY_QUOTA_INVALID'; END IF;
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  SELECT * INTO v_novel FROM public.novels WHERE id=v_project.novel_id FOR UPDATE;
  v_routes := v_project.style_directives->'flagship_model_routes_v3';
  v_pack_digest := v_project.style_directives->>'flagship_launch_pack_digest_v3';
  IF v_project.style_directives#>>'{flagship_release_v3,releaseId}' IS DISTINCT FROM p_engine_release_id THEN RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_MISMATCH'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.story_factory_calibrations c
    JOIN public.story_calibration_campaigns_v3 campaign ON campaign.id=c.campaign_id
    WHERE c.engine_release_id=p_engine_release_id
      AND c.route_version=v_routes->>'routeVersion'
      AND c.calibration_mode='machine_ensemble' AND campaign.calibration_mode='machine_ensemble'
      AND c.launch_pack_digests ? v_pack_digest AND jsonb_array_length(c.launch_pack_digests)=5
      AND c.status='approved' AND campaign.status='approved'
      AND c.sample_size=50 AND c.judge_count=3
      AND jsonb_array_length(c.judge_lineages)=3
      AND c.judge_lineages @> '["google/gemini-2.5-pro","openai/gpt-5.6-luna","openrouter/x-ai/grok-4.5"]'::jsonb
      AND c.schema_success_rate=1 AND c.plan_success_rate=1 AND c.infra_success_rate=1
      AND c.blind_preference_rate>=0.65 AND c.first_pass_publish_rate>=0.85
      AND c.within_revision_publish_rate=1 AND c.critical_continuity_violations=0
      AND c.read_chapter_4_rate>=0.70 AND c.median_cost_usd<=0.25 AND c.max_cost_usd<=0.50
      AND (SELECT count(*) FROM public.story_machine_judgments_v3 j WHERE j.campaign_id=c.campaign_id)=150
      AND (SELECT count(DISTINCT j.sample_key) FROM public.story_machine_judgments_v3 j WHERE j.campaign_id=c.campaign_id)=50
  ) THEN RAISE EXCEPTION 'FLAGSHIP_V3_MACHINE_CALIBRATION_REQUIRED'; END IF;
  IF v_project.status IS DISTINCT FROM 'paused' OR v_project.flagship_v3_status IS DISTINCT FROM 'ready_to_write'
     OR COALESCE(v_project.current_chapter,0)<10 THEN RAISE EXCEPTION 'FLAGSHIP_V3_HIDDEN_TEN_CHAPTER_CANARY_REQUIRED'; END IF;
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

REVOKE ALL ON FUNCTION public.commit_flagship_chapter_release_v3(uuid,uuid,integer,integer,text,text,numeric,jsonb,uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,text,jsonb,numeric,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.commit_flagship_machine_calibration_v3(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.promote_flagship_v3_factory_release(uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_flagship_chapter_release_v3(uuid,uuid,integer,integer,text,text,numeric,jsonb,uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,text,jsonb,numeric,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_flagship_machine_calibration_v3(jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_flagship_v3_factory_release(uuid,text,integer,text) TO service_role;

COMMIT;
