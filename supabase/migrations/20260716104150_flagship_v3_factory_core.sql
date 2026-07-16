-- Flagship v3 core: typed story artifacts, immutable chapter attempts,
-- stable-id ledgers, single transactional publication and operator telemetry.
-- This migration never upgrades or resumes a v2 project.

ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS story_kernel_v3 jsonb,
  ADD COLUMN IF NOT EXISTS arc_plan_v3 jsonb,
  ADD COLUMN IF NOT EXISTS story_state_v3 jsonb,
  ADD COLUMN IF NOT EXISTS flagship_v3_status text;
ALTER TABLE public.ai_story_projects DROP CONSTRAINT IF EXISTS ai_story_projects_flagship_v3_status_check;
ALTER TABLE public.ai_story_projects ADD CONSTRAINT ai_story_projects_flagship_v3_status_check
  CHECK (flagship_v3_status IS NULL OR flagship_v3_status IN (
    'staged','ready_to_write','setup_blocked','plan_blocked','rejected'
  ));

ALTER TABLE public.story_write_runs
  ADD COLUMN IF NOT EXISTS realized_delta_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd numeric(10,6);

ALTER TABLE public.story_factory_jobs DROP CONSTRAINT IF EXISTS story_factory_jobs_pipeline_version_check;
ALTER TABLE public.story_factory_jobs ADD CONSTRAINT story_factory_jobs_pipeline_version_check
  CHECK (pipeline_version IN ('flagship_v2','flagship_v3'));
ALTER TABLE public.story_factory_jobs DROP CONSTRAINT IF EXISTS story_factory_jobs_status_check;
ALTER TABLE public.story_factory_jobs ADD CONSTRAINT story_factory_jobs_status_check
  CHECK (status IN (
    'queued','setup','ready','writing','finale','blocked','quality_blocked',
    'plan_blocked','infra_blocked','completed','cancelled'
  ));

CREATE TABLE IF NOT EXISTS public.story_chapter_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL UNIQUE REFERENCES public.story_write_runs(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE RESTRICT,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE RESTRICT,
  chapter_number integer NOT NULL CHECK (chapter_number > 0),
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  pipeline_version text NOT NULL CHECK (pipeline_version = 'flagship_v3'),
  status text NOT NULL CHECK (status IN (
    'running','published','quality_blocked','plan_blocked','setup_blocked','infra_blocked','commit_failed'
  )),
  prompt_version text NOT NULL,
  model_route jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  draft_title text,
  draft_content text,
  quality_verdict jsonb NOT NULL DEFAULT '{}'::jsonb,
  editor_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  realized_delta_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  revision_lineage jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE(project_id, chapter_number, attempt_no)
);

CREATE INDEX IF NOT EXISTS idx_story_chapter_attempts_project_chapter
  ON public.story_chapter_attempts(project_id, chapter_number, attempt_no DESC);
CREATE INDEX IF NOT EXISTS idx_story_chapter_attempts_status
  ON public.story_chapter_attempts(status, started_at DESC);

CREATE OR REPLACE FUNCTION public.guard_finished_story_chapter_attempt_v3()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_ATTEMPT_DELETE_FORBIDDEN';
  END IF;
  IF OLD.status <> 'running' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_FINISHED_ATTEMPT_IMMUTABLE';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.run_id IS DISTINCT FROM OLD.run_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.novel_id IS DISTINCT FROM OLD.novel_id
     OR NEW.chapter_number IS DISTINCT FROM OLD.chapter_number
     OR NEW.attempt_no IS DISTINCT FROM OLD.attempt_no
     OR NEW.pipeline_version IS DISTINCT FROM OLD.pipeline_version THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_ATTEMPT_IDENTITY_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_finished_story_chapter_attempt_v3 ON public.story_chapter_attempts;
CREATE TRIGGER trg_guard_finished_story_chapter_attempt_v3
BEFORE UPDATE OR DELETE ON public.story_chapter_attempts
FOR EACH ROW EXECUTE FUNCTION public.guard_finished_story_chapter_attempt_v3();

CREATE TABLE IF NOT EXISTS public.story_cast_ledger_v3 (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  character_id text NOT NULL,
  character_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('alive','dead','missing','unknown')),
  location_id text NOT NULL,
  relationship_state text NOT NULL,
  knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_changed_chapter integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, character_id)
);

CREATE TABLE IF NOT EXISTS public.story_resource_ledger_v3 (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  resource_id text NOT NULL,
  value jsonb NOT NULL,
  source text NOT NULL,
  last_changed_chapter integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, resource_id)
);

CREATE TABLE IF NOT EXISTS public.story_promise_ledger_v3 (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  promise_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('open','advanced','paid','broken')),
  pressure text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, promise_id)
);

CREATE TABLE IF NOT EXISTS public.story_benchmark_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_chapter_id uuid,
  project_id uuid NOT NULL,
  novel_id uuid NOT NULL,
  chapter_number integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  quality_score numeric,
  source_pipeline_version text NOT NULL,
  archive_reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, chapter_number, source_pipeline_version, archive_reason)
);

CREATE TABLE IF NOT EXISTS public.story_factory_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_version text NOT NULL CHECK (pipeline_version = 'flagship_v3'),
  prompt_version text NOT NULL,
  route_version text NOT NULL,
  sample_size integer NOT NULL CHECK (sample_size >= 50),
  blind_preference_rate numeric(5,4) NOT NULL CHECK (blind_preference_rate BETWEEN 0 AND 1),
  first_pass_publish_rate numeric(5,4) NOT NULL CHECK (first_pass_publish_rate BETWEEN 0 AND 1),
  within_revision_publish_rate numeric(5,4) NOT NULL CHECK (within_revision_publish_rate BETWEEN 0 AND 1),
  critical_continuity_violations integer NOT NULL CHECK (critical_continuity_violations >= 0),
  read_chapter_4_rate numeric(5,4) NOT NULL CHECK (read_chapter_4_rate BETWEEN 0 AND 1),
  median_cost_usd numeric(10,6) NOT NULL CHECK (median_cost_usd >= 0),
  status text NOT NULL CHECK (status IN ('approved','rejected')),
  approved_by text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prompt_version, route_version)
);

ALTER TABLE public.story_chapter_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_cast_ledger_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_resource_ledger_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_promise_ledger_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_benchmark_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_factory_calibrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.story_chapter_attempts, public.story_cast_ledger_v3,
  public.story_resource_ledger_v3, public.story_promise_ledger_v3,
  public.story_benchmark_chapters, public.story_factory_calibrations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.story_chapter_attempts, public.story_cast_ledger_v3,
  public.story_resource_ledger_v3, public.story_promise_ledger_v3,
  public.story_benchmark_chapters, public.story_factory_calibrations TO service_role;

DROP POLICY IF EXISTS story_chapter_attempts_service_all ON public.story_chapter_attempts;
CREATE POLICY story_chapter_attempts_service_all ON public.story_chapter_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_cast_ledger_v3_service_all ON public.story_cast_ledger_v3;
CREATE POLICY story_cast_ledger_v3_service_all ON public.story_cast_ledger_v3
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_resource_ledger_v3_service_all ON public.story_resource_ledger_v3;
CREATE POLICY story_resource_ledger_v3_service_all ON public.story_resource_ledger_v3
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_promise_ledger_v3_service_all ON public.story_promise_ledger_v3;
CREATE POLICY story_promise_ledger_v3_service_all ON public.story_promise_ledger_v3
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_benchmark_chapters_service_all ON public.story_benchmark_chapters;
CREATE POLICY story_benchmark_chapters_service_all ON public.story_benchmark_chapters
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_factory_calibrations_service_all ON public.story_factory_calibrations;
CREATE POLICY story_factory_calibrations_service_all ON public.story_factory_calibrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.stage_flagship_launch_pack_v3(
  p_project_id uuid,
  p_launch_pack jsonb,
  p_routes jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project public.ai_story_projects;
  v_plan jsonb;
  v_index integer := 0;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  IF v_project.status IS DISTINCT FROM 'paused' THEN RAISE EXCEPTION 'FLAGSHIP_V3_STAGE_REQUIRES_PAUSED_PROJECT'; END IF;
  IF COALESCE((p_launch_pack->>'schemaVersion')::integer, -1) <> 3
     OR p_launch_pack#>>'{kernel,pipelineVersion}' IS DISTINCT FROM 'flagship_v3'
     OR COALESCE((p_launch_pack#>>'{initialState,chapterNumber}')::integer, -1) <> 0
     OR COALESCE((p_launch_pack#>>'{initialWindow,startChapter}')::integer, -1) <> 1
     OR jsonb_array_length(COALESCE(p_launch_pack#>'{initialWindow,plans}', '[]'::jsonb)) <> 5 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_LAUNCH_PACK_INVALID';
  END IF;
  IF length(trim(COALESCE(p_routes->>'routeVersion',''))) < 3
     OR length(trim(COALESCE(p_routes->>'writer',''))) < 3
     OR length(trim(COALESCE(p_routes->>'editor',''))) < 3
     OR p_routes->>'writer' = p_routes->>'editor'
     OR jsonb_array_length(COALESCE(p_routes->'setupGenerators','[]'::jsonb)) <> 2
     OR jsonb_array_length(COALESCE(p_routes->'setupJudges','[]'::jsonb)) <> 3
     OR length(trim(COALESCE(p_routes->>'openingSimulator',''))) < 3
     OR length(trim(COALESCE(p_routes->>'launchArchitect',''))) < 3 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_ROUTES_INVALID';
  END IF;

  UPDATE public.ai_story_projects SET
    story_kernel_v3 = p_launch_pack->'kernel',
    arc_plan_v3 = p_launch_pack->'arc',
    story_state_v3 = p_launch_pack->'initialState',
    flagship_v3_status = 'staged',
    style_directives = COALESCE(style_directives, '{}'::jsonb)
      || jsonb_build_object(
        'flagship_model_routes_v3', p_routes,
        'flagship_v3_selected_concept_id', p_launch_pack->>'selectedConceptId'
      ),
    updated_at = now()
  WHERE id = p_project_id;

  DELETE FROM public.chapter_blueprints
  WHERE project_id = p_project_id AND version = 3 AND status <> 'used';
  FOR v_plan IN SELECT value FROM jsonb_array_elements(p_launch_pack#>'{initialWindow,plans}') LOOP
    IF COALESCE((v_plan->>'chapterNumber')::integer, -1) <> v_index + 1 THEN
      RAISE EXCEPTION 'FLAGSHIP_V3_INITIAL_WINDOW_NONCONTIGUOUS';
    END IF;
    INSERT INTO public.chapter_blueprints (
      project_id, chapter_number, goal, payoff, ending_hook, status, version, meta
    ) VALUES (
      p_project_id,
      (v_plan->>'chapterNumber')::integer,
      v_plan->>'chapterPromise',
      COALESCE(v_plan#>>'{scenes,-1,payoff}', v_plan->>'chapterPromise'),
      v_plan->>'nextChapterPressure',
      'planned',
      3,
      jsonb_build_object('chapterPlanV3', v_plan, 'pipelineVersion', 'flagship_v3')
    );
    v_index := v_index + 1;
  END LOOP;
  RETURN jsonb_build_object('staged', true, 'project_id', p_project_id, 'plan_count', v_index);
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_reset_flagship_canary_v3(
  p_project_id uuid,
  p_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project public.ai_story_projects;
  v_archived integer := 0;
  v_deleted integer := 0;
  v_plan_count integer := 0;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'ARCHIVE_AND_RESET_V3_CANARY' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RESET_CONFIRMATION_REQUIRED';
  END IF;
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  IF v_project.status IS DISTINCT FROM 'paused'
     OR v_project.flagship_v3_status IS DISTINCT FROM 'staged'
     OR v_project.story_kernel_v3 IS NULL
     OR v_project.arc_plan_v3 IS NULL
     OR COALESCE((v_project.story_state_v3->>'chapterNumber')::integer, -1) <> 0 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RESET_PRECONDITION_FAILED';
  END IF;
  SELECT count(*) INTO v_plan_count FROM public.chapter_blueprints
  WHERE project_id = p_project_id AND version = 3 AND chapter_number BETWEEN 1 AND 5
    AND meta->>'pipelineVersion' = 'flagship_v3';
  IF v_plan_count <> 5 THEN RAISE EXCEPTION 'FLAGSHIP_V3_INITIAL_PLANS_REQUIRED'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.story_factory_jobs
    WHERE project_id = p_project_id AND lease_until >= now()
  ) THEN RAISE EXCEPTION 'FLAGSHIP_V3_ACTIVE_LEASE_BLOCKS_RESET'; END IF;

  INSERT INTO public.story_benchmark_chapters (
    source_chapter_id, project_id, novel_id, chapter_number, title, content,
    quality_score, source_pipeline_version, archive_reason, metadata
  )
  SELECT c.id, p_project_id, c.novel_id, c.chapter_number, c.title, c.content,
    c.quality_score, COALESCE(v_project.style_directives->>'pipeline_version','unknown'),
    'flagship_v3_canary_reset',
    jsonb_build_object('archived_from_current_chapter', v_project.current_chapter)
  FROM public.chapters c WHERE c.novel_id = v_project.novel_id
  ON CONFLICT (project_id, chapter_number, source_pipeline_version, archive_reason) DO NOTHING;
  GET DIAGNOSTICS v_archived = ROW_COUNT;

  DELETE FROM public.chapters WHERE novel_id = v_project.novel_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  DELETE FROM public.project_daily_quotas WHERE project_id = p_project_id;

  UPDATE public.ai_story_projects SET
    current_chapter = 0,
    flagship_v3_status = 'ready_to_write',
    style_directives = COALESCE(style_directives, '{}'::jsonb)
      || jsonb_build_object(
        'pipeline_version', 'flagship_v3',
        'publication_mode', 'offline_only',
        'factory_enabled', false,
        'production_daily_chapter_quota', 5,
        'prompt_version', 'flagship-v3.0-structured-scenes-reeditor'
      ),
    pause_reason = 'flagship_v3_offline_calibration',
    updated_at = now()
  WHERE id = p_project_id;
  UPDATE public.novels SET hidden = true, total_chapters = 0, updated_at = now()
  WHERE id = v_project.novel_id;
  UPDATE public.story_factory_jobs SET
    pipeline_version = 'flagship_v3',
    status = 'cancelled',
    stage = 'plan',
    current_chapter = 0,
    forecast_chapters = 900,
    max_chapters = 1200,
    lease_owner = NULL,
    lease_token = NULL,
    lease_until = NULL,
    failure_class = NULL,
    last_error = 'Awaiting flagship v3 offline calibration',
    updated_at = now()
  WHERE project_id = p_project_id;
  RETURN jsonb_build_object('reset', true, 'archived', v_archived, 'deleted', v_deleted, 'project_id', p_project_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_flagship_v3_factory(
  p_project_id uuid,
  p_daily_quota integer,
  p_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project public.ai_story_projects;
  v_novel public.novels;
  v_routes jsonb;
  v_calibration public.story_factory_calibrations;
  v_job jsonb;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'PROMOTE_APPROVED_V3_FACTORY' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_PROMOTION_CONFIRMATION_REQUIRED';
  END IF;
  IF p_daily_quota NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'FLAGSHIP_V3_DAILY_QUOTA_INVALID'; END IF;
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  SELECT * INTO v_novel FROM public.novels WHERE id = v_project.novel_id FOR UPDATE;
  v_routes := v_project.style_directives->'flagship_model_routes_v3';
  SELECT * INTO v_calibration FROM public.story_factory_calibrations
  WHERE pipeline_version = 'flagship_v3'
    AND prompt_version = v_project.style_directives->>'prompt_version'
    AND route_version = v_routes->>'routeVersion'
    AND status = 'approved'
    AND sample_size >= 50
    AND blind_preference_rate >= 0.65
    AND first_pass_publish_rate >= 0.65
    AND within_revision_publish_rate >= 0.80
    AND critical_continuity_violations = 0
    AND read_chapter_4_rate >= 0.70
    AND median_cost_usd <= 0.35
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_APPROVED_CALIBRATION_REQUIRED'; END IF;
  IF v_project.status IS DISTINCT FROM 'paused'
     OR v_project.flagship_v3_status IS DISTINCT FROM 'ready_to_write'
     OR COALESCE(v_project.current_chapter, 0) < 3 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_READY_FOR_PROMOTION';
  END IF;
  IF length(trim(COALESCE(v_novel.cover_url,''))) < 5 THEN RAISE EXCEPTION 'FLAGSHIP_V3_VALID_COVER_REQUIRED'; END IF;

  UPDATE public.ai_story_projects SET
    style_directives = COALESCE(style_directives, '{}'::jsonb)
      || jsonb_build_object(
        'pipeline_version', 'flagship_v3',
        'publication_mode', 'automatic',
        'factory_enabled', true,
        'production_daily_chapter_quota', p_daily_quota
      ),
    pause_reason = 'flagship_v3_factory_controlled',
    updated_at = now()
  WHERE id = p_project_id;
  UPDATE public.novels SET hidden = false, updated_at = now() WHERE id = v_project.novel_id;
  SELECT public.enroll_flagship_factory_job_v3(p_project_id, 1200, 'narrative_ending') INTO v_job;
  RETURN jsonb_build_object('promoted', true, 'project_id', p_project_id, 'job', v_job);
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_flagship_chapter_v3(
  p_project_id uuid,
  p_novel_id uuid,
  p_expected_current_chapter integer,
  p_chapter_number integer,
  p_title text,
  p_content text,
  p_quality_score numeric,
  p_story_state jsonb,
  p_run_id uuid,
  p_attempt_id uuid,
  p_context_manifest jsonb,
  p_editor_evidence jsonb,
  p_realized_delta_evidence jsonb,
  p_revision_lineage jsonb,
  p_quality_verdict jsonb,
  p_prompt_version text,
  p_model_route jsonb,
  p_estimated_cost_usd numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project public.ai_story_projects;
  v_attempt public.story_chapter_attempts;
  v_item jsonb;
  v_character_name text;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  IF v_project.style_directives->>'pipeline_version' IS DISTINCT FROM 'flagship_v3' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_PIPELINE_MISMATCH';
  END IF;
  IF v_project.status IS DISTINCT FROM 'paused' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_MUST_STAY_PAUSED';
  END IF;
  IF v_project.flagship_v3_status IS DISTINCT FROM 'ready_to_write' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_SETUP_NOT_READY';
  END IF;
  IF v_project.novel_id IS DISTINCT FROM p_novel_id THEN RAISE EXCEPTION 'FLAGSHIP_V3_NOVEL_MISMATCH'; END IF;
  IF COALESCE(v_project.current_chapter, 0) <> p_expected_current_chapter
     OR p_chapter_number <> p_expected_current_chapter + 1 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_CHAPTER_RACE';
  END IF;
  IF COALESCE((p_story_state->>'chapterNumber')::integer, -1) <> p_chapter_number THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_STATE_SEQUENCE_MISMATCH';
  END IF;
  IF jsonb_array_length(COALESCE(p_realized_delta_evidence, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_REALIZED_DELTA_EVIDENCE_REQUIRED';
  END IF;

  SELECT * INTO v_attempt FROM public.story_chapter_attempts
  WHERE id = p_attempt_id AND run_id = p_run_id AND project_id = p_project_id
    AND chapter_number = p_chapter_number AND status = 'running'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_RUNNING_ATTEMPT_MISSING'; END IF;

  INSERT INTO public.chapters (novel_id, chapter_number, title, content, quality_score)
  VALUES (p_novel_id, p_chapter_number, p_title, p_content, p_quality_score);

  UPDATE public.ai_story_projects
  SET current_chapter = p_chapter_number, story_state_v3 = p_story_state, updated_at = now()
  WHERE id = p_project_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_story_state->'characters', '[]'::jsonb)) LOOP
    SELECT character->>'name' INTO v_character_name
    FROM jsonb_array_elements(COALESCE(v_project.story_kernel_v3->'characters', '[]'::jsonb)) character
    WHERE character->>'id' = v_item->>'characterId'
    LIMIT 1;
    IF v_character_name IS NULL THEN RAISE EXCEPTION 'FLAGSHIP_V3_CHARACTER_NAME_MISSING'; END IF;
    INSERT INTO public.story_cast_ledger_v3 (
      project_id, character_id, character_name, status, location_id,
      relationship_state, knowledge, last_changed_chapter, updated_at
    ) VALUES (
      p_project_id, v_item->>'characterId', v_character_name, v_item->>'status',
      v_item->>'locationId', v_item->>'relationshipState',
      COALESCE(v_item->'knowledge', '[]'::jsonb), p_chapter_number, now()
    ) ON CONFLICT (project_id, character_id) DO UPDATE SET
      character_name = EXCLUDED.character_name,
      status = EXCLUDED.status,
      location_id = EXCLUDED.location_id,
      relationship_state = EXCLUDED.relationship_state,
      knowledge = EXCLUDED.knowledge,
      last_changed_chapter = EXCLUDED.last_changed_chapter,
      updated_at = now();
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_story_state->'resources', '[]'::jsonb)) LOOP
    INSERT INTO public.story_resource_ledger_v3 (
      project_id, resource_id, value, source, last_changed_chapter, updated_at
    ) VALUES (
      p_project_id, v_item->>'resourceId', v_item->'value', v_item->>'source',
      (v_item->>'lastChangedChapter')::integer, now()
    ) ON CONFLICT (project_id, resource_id) DO UPDATE SET
      value = EXCLUDED.value,
      source = EXCLUDED.source,
      last_changed_chapter = EXCLUDED.last_changed_chapter,
      updated_at = now();
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_story_state->'promises', '[]'::jsonb)) LOOP
    INSERT INTO public.story_promise_ledger_v3 (project_id, promise_id, status, pressure, updated_at)
    VALUES (p_project_id, v_item->>'promiseId', v_item->>'status', v_item->>'pressure', now())
    ON CONFLICT (project_id, promise_id) DO UPDATE SET
      status = EXCLUDED.status,
      pressure = EXCLUDED.pressure,
      updated_at = now();
  END LOOP;

  UPDATE public.story_write_runs SET
    status = 'saved',
    last_chapter_number = p_chapter_number,
    quality_score = p_quality_score,
    context_manifest = COALESCE(p_context_manifest, '[]'::jsonb),
    critic_evidence = COALESCE(p_editor_evidence, '[]'::jsonb),
    realized_delta_evidence = COALESCE(p_realized_delta_evidence, '[]'::jsonb),
    revision_lineage = COALESCE(p_revision_lineage, '[]'::jsonb),
    quality_verdict = COALESCE(p_quality_verdict, '{}'::jsonb),
    estimated_cost_usd = p_estimated_cost_usd,
    prompt_version = p_prompt_version,
    model_route = COALESCE(p_model_route, '{}'::jsonb),
    publication_decision = 'publish',
    failure_class = NULL,
    finished_at = now(),
    updated_at = now()
  WHERE id = p_run_id AND project_id = p_project_id AND status = 'running';
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_WRITE_RUN_MISSING'; END IF;

  UPDATE public.story_chapter_attempts SET
    status = 'published',
    draft_title = p_title,
    draft_content = p_content,
    quality_verdict = COALESCE(p_quality_verdict, '{}'::jsonb),
    editor_evidence = COALESCE(p_editor_evidence, '[]'::jsonb),
    realized_delta_evidence = COALESCE(p_realized_delta_evidence, '[]'::jsonb),
    revision_lineage = COALESCE(p_revision_lineage, '[]'::jsonb),
    estimated_cost_usd = p_estimated_cost_usd,
    finished_at = now()
  WHERE id = p_attempt_id AND status = 'running';
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_ATTEMPT_COMMIT_FAILED'; END IF;

  INSERT INTO public.story_write_checkpoints (
    run_id, project_id, chapter_number, step, artifact_ref, digest, status, meta
  ) VALUES
    (p_run_id, p_project_id, p_chapter_number, 'chapter_generated', 'story_chapter_attempts:' || p_attempt_id, md5(p_run_id::text || ':v3-generated'), 'ok', jsonb_build_object('attempt_id', p_attempt_id)),
    (p_run_id, p_project_id, p_chapter_number, 'pre_save_qa_passed', NULL, md5(p_run_id::text || ':v3-qa'), 'ok', jsonb_build_object('quality_score', p_quality_score)),
    (p_run_id, p_project_id, p_chapter_number, 'chapter_saved', 'chapters:' || p_chapter_number, md5(p_run_id::text || ':v3-saved'), 'ok', jsonb_build_object('chapter_number', p_chapter_number)),
    (p_run_id, p_project_id, p_chapter_number, 'current_chapter_bumped', 'ai_story_projects:' || p_project_id, md5(p_run_id::text || ':v3-bumped'), 'ok', jsonb_build_object('current_chapter', p_chapter_number))
  ON CONFLICT (run_id, step, digest) DO NOTHING;

  RETURN jsonb_build_object('committed', true, 'chapter_number', p_chapter_number, 'attempt_id', p_attempt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_flagship_factory_job_v3(
  p_project_id uuid,
  p_max_chapters integer DEFAULT 1200,
  p_completion_mode text DEFAULT 'narrative_ending'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project public.ai_story_projects;
  v_job public.story_factory_jobs;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_V3_PROJECT_NOT_FOUND'; END IF;
  IF v_project.status IS DISTINCT FROM 'paused' THEN RAISE EXCEPTION 'FACTORY_V3_PROJECT_MUST_STAY_PAUSED'; END IF;
  IF v_project.style_directives->>'pipeline_version' IS DISTINCT FROM 'flagship_v3'
     OR v_project.style_directives->>'factory_enabled' IS DISTINCT FROM 'true'
     OR v_project.style_directives->>'publication_mode' IS DISTINCT FROM 'automatic' THEN
    RAISE EXCEPTION 'FACTORY_V3_EXPLICIT_OPT_IN_REQUIRED';
  END IF;
  IF v_project.flagship_v3_status IS DISTINCT FROM 'ready_to_write'
     OR v_project.story_kernel_v3 IS NULL OR v_project.arc_plan_v3 IS NULL OR v_project.story_state_v3 IS NULL THEN
    RAISE EXCEPTION 'FACTORY_V3_ARTIFACTS_NOT_READY';
  END IF;
  IF p_max_chapters NOT BETWEEN 100 AND 5000 THEN RAISE EXCEPTION 'FACTORY_V3_MAX_CHAPTERS_INVALID'; END IF;
  IF p_completion_mode NOT IN ('narrative_ending','hard_cap') THEN RAISE EXCEPTION 'FACTORY_V3_COMPLETION_MODE_INVALID'; END IF;

  INSERT INTO public.story_factory_jobs (
    project_id, novel_id, pipeline_version, status, stage, current_chapter,
    forecast_chapters, max_chapters, completion_mode
  ) VALUES (
    v_project.id, v_project.novel_id, 'flagship_v3', 'ready', 'plan',
    COALESCE(v_project.current_chapter, 0), 900, p_max_chapters, p_completion_mode
  ) ON CONFLICT (project_id) DO UPDATE SET
    pipeline_version = 'flagship_v3',
    status = 'ready',
    stage = 'plan',
    current_chapter = COALESCE(v_project.current_chapter, 0),
    forecast_chapters = 900,
    max_chapters = p_max_chapters,
    completion_mode = p_completion_mode,
    lease_owner = NULL,
    lease_token = NULL,
    lease_until = NULL,
    failure_class = NULL,
    last_error = NULL,
    updated_at = now()
  RETURNING * INTO v_job;
  RETURN to_jsonb(v_job);
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_flagship_rolling_window_v3(
  p_project_id uuid,
  p_expected_current_chapter integer,
  p_window jsonb,
  p_prompt_version text,
  p_model_route jsonb,
  p_context_manifest jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project public.ai_story_projects;
  v_plan jsonb;
  v_start integer;
  v_index integer := 0;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;
  IF v_project.status IS DISTINCT FROM 'paused'
     OR v_project.style_directives->>'pipeline_version' IS DISTINCT FROM 'flagship_v3'
     OR v_project.flagship_v3_status IS DISTINCT FROM 'ready_to_write' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_ROLLING_PROJECT_NOT_READY';
  END IF;
  IF COALESCE(v_project.current_chapter, 0) <> p_expected_current_chapter THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_ROLLING_STATE_RACE';
  END IF;
  IF jsonb_array_length(COALESCE(p_window->'plans','[]'::jsonb)) <> 5 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_ROLLING_REQUIRES_FIVE_PLANS';
  END IF;
  v_start := COALESCE((p_window->>'startChapter')::integer, -1);
  IF v_start <> p_expected_current_chapter + 1 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_ROLLING_START_MISMATCH';
  END IF;

  FOR v_plan IN SELECT value FROM jsonb_array_elements(p_window->'plans') LOOP
    IF COALESCE((v_plan->>'chapterNumber')::integer, -1) <> v_start + v_index THEN
      RAISE EXCEPTION 'FLAGSHIP_V3_ROLLING_NONCONTIGUOUS';
    END IF;
    INSERT INTO public.chapter_blueprints (
      project_id, chapter_number, goal, payoff, ending_hook, status, version, meta, updated_at
    ) VALUES (
      p_project_id,
      (v_plan->>'chapterNumber')::integer,
      v_plan->>'chapterPromise',
      COALESCE(v_plan#>>'{scenes,-1,payoff}', v_plan->>'chapterPromise'),
      v_plan->>'nextChapterPressure',
      'planned',
      3,
      jsonb_build_object(
        'chapterPlanV3', v_plan,
        'pipelineVersion', 'flagship_v3',
        'promptVersion', p_prompt_version,
        'modelRoute', COALESCE(p_model_route, '{}'::jsonb),
        'contextManifest', COALESCE(p_context_manifest, '[]'::jsonb)
      ),
      now()
    ) ON CONFLICT (project_id, chapter_number) DO UPDATE SET
      goal = EXCLUDED.goal,
      payoff = EXCLUDED.payoff,
      ending_hook = EXCLUDED.ending_hook,
      status = 'planned',
      version = 3,
      meta = EXCLUDED.meta,
      updated_at = now()
    WHERE public.chapter_blueprints.status <> 'used';
    v_index := v_index + 1;
  END LOOP;
  RETURN jsonb_build_object('committed', true, 'start_chapter', v_start, 'plan_count', v_index);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_flagship_factory_job(
  p_worker_id text,
  p_lease_seconds integer DEFAULT 900
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job public.story_factory_jobs;
  v_token uuid := gen_random_uuid();
  v_vn_date date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF length(trim(COALESCE(p_worker_id,''))) < 2 OR p_lease_seconds NOT BETWEEN 60 AND 3600 THEN
    RAISE EXCEPTION 'FACTORY_CLAIM_ARGUMENT_INVALID';
  END IF;

  INSERT INTO public.project_daily_quotas (
    project_id, vn_date, target_chapters, written_chapters, status,
    next_due_at, slot_seed, retry_count, updated_at
  )
  SELECT p.id, v_vn_date,
    LEAST(20, GREATEST(1, COALESCE(NULLIF(p.style_directives->>'production_daily_chapter_quota','')::integer, 5))),
    0, 'active', now(), (hashtext(p.id::text || ':' || v_vn_date::text) & 2147483647), 0, now()
  FROM public.ai_story_projects p
  JOIN public.story_factory_jobs j ON j.project_id = p.id
  WHERE j.pipeline_version = 'flagship_v3'
    AND p.status = 'paused'
    AND p.style_directives->>'pipeline_version' = 'flagship_v3'
    AND p.style_directives->>'factory_enabled' = 'true'
    AND p.style_directives->>'publication_mode' = 'automatic'
    AND j.status IN ('ready','writing','finale','infra_blocked')
  ON CONFLICT (project_id, vn_date) DO NOTHING;

  SELECT j.* INTO v_job
  FROM public.story_factory_jobs j
  JOIN public.ai_story_projects p ON p.id = j.project_id
  JOIN public.project_daily_quotas q ON q.project_id = j.project_id AND q.vn_date = v_vn_date
  WHERE j.pipeline_version = 'flagship_v3'
    AND j.status IN ('ready','writing','finale','infra_blocked')
    AND (j.lease_until IS NULL OR j.lease_until < now())
    AND p.status = 'paused'
    AND p.style_directives->>'pipeline_version' = 'flagship_v3'
    AND p.style_directives->>'factory_enabled' = 'true'
    AND p.style_directives->>'publication_mode' = 'automatic'
    AND q.status = 'active'
    AND q.written_chapters < q.target_chapters
    AND (q.next_due_at IS NULL OR q.next_due_at <= now())
  ORDER BY j.updated_at ASC
  LIMIT 1 FOR UPDATE OF j SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;

  UPDATE public.story_factory_jobs SET
    lease_owner = p_worker_id,
    lease_token = v_token,
    lease_until = now() + make_interval(secs => p_lease_seconds),
    status = CASE WHEN status = 'ready' THEN 'writing' ELSE status END,
    stage = CASE WHEN status = 'ready' THEN 'write' ELSE stage END,
    attempt = attempt + 1,
    updated_at = now()
  WHERE id = v_job.id
  RETURNING * INTO v_job;
  RETURN jsonb_build_object('job', to_jsonb(v_job), 'worker_id', p_worker_id);
END;
$$;

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
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job public.story_factory_jobs;
BEGIN
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_JOB_NOT_FOUND'; END IF;
  IF v_job.pipeline_version IS DISTINCT FROM 'flagship_v3' THEN RAISE EXCEPTION 'FACTORY_V3_PIPELINE_REQUIRED'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.ai_story_projects p
    WHERE p.id = v_job.project_id AND p.status = 'paused'
      AND p.style_directives->>'pipeline_version' = 'flagship_v3'
      AND p.style_directives->>'factory_enabled' = 'true'
      AND p.style_directives->>'publication_mode' = 'automatic'
  ) THEN RAISE EXCEPTION 'FACTORY_V3_OPT_IN_REVOKED'; END IF;
  IF v_job.status IS DISTINCT FROM p_expected_status OR v_job.lease_token IS DISTINCT FROM p_lease_token
     OR v_job.lease_until IS NULL OR v_job.lease_until < now() THEN
    RAISE EXCEPTION 'FACTORY_LEASE_OR_STATE_MISMATCH';
  END IF;
  IF p_next_status NOT IN (
    'ready','writing','finale','quality_blocked','plan_blocked','infra_blocked','completed','cancelled'
  ) OR p_next_stage NOT IN ('plan','write','review','commit','completion') THEN
    RAISE EXCEPTION 'FACTORY_V3_NEXT_STATE_INVALID';
  END IF;
  IF p_checkpoint_status NOT IN ('started','passed','failed','skipped') THEN
    RAISE EXCEPTION 'FACTORY_CHECKPOINT_STATUS_INVALID';
  END IF;
  IF length(trim(COALESCE(p_input_digest,''))) < 8 THEN RAISE EXCEPTION 'FACTORY_INPUT_DIGEST_REQUIRED'; END IF;
  IF NOT (
    (v_job.status = 'ready' AND p_next_status IN ('writing','cancelled')) OR
    (v_job.status = 'writing' AND p_next_status IN ('ready','finale','quality_blocked','plan_blocked','infra_blocked','completed')) OR
    (v_job.status = 'finale' AND p_next_status IN ('writing','completed','quality_blocked','plan_blocked','infra_blocked')) OR
    (v_job.status = 'infra_blocked' AND p_next_status IN ('ready','writing','plan_blocked','cancelled'))
  ) THEN RAISE EXCEPTION 'FACTORY_V3_INVALID_TRANSITION'; END IF;

  INSERT INTO public.story_factory_checkpoints (
    job_id, project_id, stage, chapter_number, attempt, status,
    input_digest, output_digest, evidence, failure_class, error_message
  ) VALUES (
    v_job.id, v_job.project_id, p_next_stage, p_chapter_number, v_job.attempt,
    p_checkpoint_status, NULLIF(p_input_digest,''), p_output_digest,
    COALESCE(p_evidence,'[]'::jsonb), p_failure_class, p_error_message
  );

  UPDATE public.story_factory_jobs SET
    status = p_next_status,
    stage = p_next_stage,
    current_chapter = GREATEST(current_chapter, p_chapter_number),
    lease_owner = NULL,
    lease_token = NULL,
    lease_until = NULL,
    failure_class = p_failure_class,
    last_error = p_error_message,
    completed_at = CASE WHEN p_next_status = 'completed' THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = v_job.id
  RETURNING * INTO v_job;
  RETURN to_jsonb(v_job);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_flagship_factory_chapter_quota_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project public.ai_story_projects;
  v_vn_date date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_target integer;
BEGIN
  SELECT * INTO v_project FROM public.ai_story_projects
  WHERE novel_id = NEW.novel_id
    AND style_directives->>'pipeline_version' IN ('flagship_v2','flagship_v3')
    AND style_directives->>'factory_enabled' = 'true'
    AND style_directives->>'publication_mode' = 'automatic'
  LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_target := LEAST(
    CASE WHEN v_project.style_directives->>'pipeline_version' = 'flagship_v3' THEN 20 ELSE 500 END,
    GREATEST(1, COALESCE(NULLIF(v_project.style_directives->>'production_daily_chapter_quota','')::integer, 5))
  );
  INSERT INTO public.project_daily_quotas (
    project_id, vn_date, target_chapters, written_chapters, status,
    next_due_at, slot_seed, retry_count, last_error, failure_class, updated_at
  ) VALUES (
    v_project.id, v_vn_date, v_target, 1,
    CASE WHEN v_target <= 1 THEN 'completed' ELSE 'active' END,
    CASE WHEN v_target <= 1 THEN NULL ELSE now() END,
    (hashtext(v_project.id::text || ':' || v_vn_date::text) & 2147483647),
    0, NULL, NULL, now()
  ) ON CONFLICT (project_id, vn_date) DO UPDATE SET
    target_chapters = EXCLUDED.target_chapters,
    written_chapters = public.project_daily_quotas.written_chapters + 1,
    status = CASE WHEN public.project_daily_quotas.written_chapters + 1 >= EXCLUDED.target_chapters THEN 'completed' ELSE 'active' END,
    next_due_at = CASE WHEN public.project_daily_quotas.written_chapters + 1 >= EXCLUDED.target_chapters THEN NULL ELSE now() END,
    retry_count = 0,
    last_error = NULL,
    failure_class = NULL,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_stale_story_runs_v3(p_stale_minutes integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_runs integer := 0;
  v_attempts integer := 0;
  v_jobs integer := 0;
BEGIN
  IF p_stale_minutes NOT BETWEEN 5 AND 240 THEN RAISE EXCEPTION 'FLAGSHIP_V3_STALE_WINDOW_INVALID'; END IF;
  UPDATE public.story_write_runs SET
    status = 'infra_blocked',
    failure_class = 'infrastructure',
    error_message = 'INFRA_BLOCKED: stale running write reconciled after lease window',
    finished_at = now(),
    updated_at = now()
  WHERE pipeline_version = 'flagship_v3' AND status = 'running'
    AND updated_at < now() - make_interval(mins => p_stale_minutes);
  GET DIAGNOSTICS v_runs = ROW_COUNT;

  UPDATE public.story_chapter_attempts SET
    status = 'infra_blocked',
    error_message = 'INFRA_BLOCKED: stale running attempt reconciled after lease window',
    finished_at = now()
  WHERE status = 'running' AND started_at < now() - make_interval(mins => p_stale_minutes);
  GET DIAGNOSTICS v_attempts = ROW_COUNT;

  UPDATE public.story_factory_jobs SET
    status = 'infra_blocked',
    stage = CASE WHEN stage = 'write' THEN 'write' ELSE 'plan' END,
    lease_owner = NULL,
    lease_token = NULL,
    lease_until = NULL,
    failure_class = 'infrastructure',
    last_error = 'INFRA_BLOCKED: expired flagship v3 lease reconciled',
    updated_at = now()
  WHERE pipeline_version = 'flagship_v3'
    AND status IN ('writing','finale')
    AND lease_until < now();
  GET DIAGNOSTICS v_jobs = ROW_COUNT;
  RETURN jsonb_build_object('runs', v_runs, 'attempts', v_attempts, 'jobs', v_jobs);
END;
$$;

DROP VIEW IF EXISTS public.factory_story_status_v3;
CREATE VIEW public.factory_story_status_v3
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  p.novel_id,
  n.title,
  p.status AS project_status,
  p.current_chapter,
  p.flagship_v3_status,
  j.id AS job_id,
  j.status AS job_status,
  j.stage AS job_stage,
  j.failure_class AS job_failure_class,
  j.last_error AS job_last_error,
  j.lease_until,
  q.vn_date,
  q.status AS quota_status,
  q.written_chapters,
  q.target_chapters,
  q.next_due_at,
  r.id AS latest_run_id,
  r.status AS latest_run_status,
  r.failure_class AS latest_run_failure_class,
  r.publication_decision AS latest_publication_decision,
  r.quality_score AS latest_quality_score,
  r.prompt_version AS latest_prompt_version,
  r.model_route AS latest_model_route,
  r.error_message AS latest_run_error,
  r.updated_at AS latest_run_updated_at
FROM public.ai_story_projects p
JOIN public.novels n ON n.id = p.novel_id
LEFT JOIN public.story_factory_jobs j ON j.project_id = p.id AND j.pipeline_version = 'flagship_v3'
LEFT JOIN public.project_daily_quotas q ON q.project_id = p.id
  AND q.vn_date = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
LEFT JOIN LATERAL (
  SELECT run.* FROM public.story_write_runs run
  WHERE run.project_id = p.id AND run.pipeline_version = 'flagship_v3'
  ORDER BY run.updated_at DESC LIMIT 1
) r ON true
WHERE p.style_directives->>'pipeline_version' = 'flagship_v3';

REVOKE ALL ON public.factory_story_status_v3 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.factory_story_status_v3 TO service_role;

REVOKE ALL ON FUNCTION public.guard_finished_story_chapter_attempt_v3() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stage_flagship_launch_pack_v3(uuid,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_reset_flagship_canary_v3(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_flagship_v3_factory(uuid,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_flagship_chapter_v3(uuid,uuid,integer,integer,text,text,numeric,jsonb,uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,text,jsonb,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enroll_flagship_factory_job_v3(uuid,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_flagship_rolling_window_v3(uuid,integer,jsonb,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_flagship_factory_job(text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_flagship_factory_chapter_quota_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_stale_story_runs_v3(integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.guard_finished_story_chapter_attempt_v3() TO service_role;
GRANT EXECUTE ON FUNCTION public.stage_flagship_launch_pack_v3(uuid,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_reset_flagship_canary_v3(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_flagship_v3_factory(uuid,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_flagship_chapter_v3(uuid,uuid,integer,integer,text,text,numeric,jsonb,uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,text,jsonb,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.enroll_flagship_factory_job_v3(uuid,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_flagship_rolling_window_v3(uuid,integer,jsonb,text,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_flagship_factory_job(text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_flagship_factory_chapter_quota_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_stale_story_runs_v3(integer) TO service_role;
