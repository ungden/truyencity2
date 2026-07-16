-- Keep staged v3 plans separate from legacy/v2 chapter_blueprints until the
-- explicit archive-reset transaction swaps the canary to flagship_v3.

ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS initial_window_v3 jsonb;

CREATE TABLE IF NOT EXISTS public.story_benchmark_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_blueprint_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL CHECK (chapter_number >= 1),
  source_version integer,
  goal text,
  payoff text,
  ending_hook text,
  status text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  archive_reason text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, chapter_number, source_version, archive_reason)
);

CREATE INDEX IF NOT EXISTS idx_story_benchmark_plans_project
  ON public.story_benchmark_plans(project_id, chapter_number);

ALTER TABLE public.story_benchmark_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_benchmark_plans FROM anon, authenticated;
GRANT ALL ON public.story_benchmark_plans TO service_role;
DROP POLICY IF EXISTS story_benchmark_plans_service_all ON public.story_benchmark_plans;
CREATE POLICY story_benchmark_plans_service_all ON public.story_benchmark_plans
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

  FOR v_plan IN SELECT value FROM jsonb_array_elements(p_launch_pack#>'{initialWindow,plans}') LOOP
    IF COALESCE((v_plan->>'chapterNumber')::integer, -1) <> v_index + 1 THEN
      RAISE EXCEPTION 'FLAGSHIP_V3_INITIAL_WINDOW_NONCONTIGUOUS';
    END IF;
    v_index := v_index + 1;
  END LOOP;

  UPDATE public.ai_story_projects SET
    story_kernel_v3 = p_launch_pack->'kernel',
    arc_plan_v3 = p_launch_pack->'arc',
    story_state_v3 = p_launch_pack->'initialState',
    initial_window_v3 = p_launch_pack->'initialWindow',
    flagship_v3_status = 'staged',
    style_directives = COALESCE(style_directives, '{}'::jsonb)
      || jsonb_build_object(
        'flagship_model_routes_v3', p_routes,
        'flagship_v3_selected_concept_id', p_launch_pack->>'selectedConceptId'
      ),
    updated_at = now()
  WHERE id = p_project_id;

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
  v_plan jsonb;
  v_index integer := 0;
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
     OR COALESCE((v_project.story_state_v3->>'chapterNumber')::integer, -1) <> 0
     OR COALESCE((v_project.initial_window_v3->>'startChapter')::integer, -1) <> 1 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RESET_PRECONDITION_FAILED';
  END IF;
  v_plan_count := jsonb_array_length(COALESCE(v_project.initial_window_v3->'plans', '[]'::jsonb));
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

  INSERT INTO public.story_benchmark_plans (
    source_blueprint_id, project_id, chapter_number, source_version,
    goal, payoff, ending_hook, status, meta, archive_reason
  )
  SELECT id, project_id, chapter_number, version, goal, payoff, ending_hook,
    status, COALESCE(meta, '{}'::jsonb), 'flagship_v3_canary_reset'
  FROM public.chapter_blueprints
  WHERE project_id = p_project_id
  ON CONFLICT (project_id, chapter_number, source_version, archive_reason) DO NOTHING;

  DELETE FROM public.chapters WHERE novel_id = v_project.novel_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  DELETE FROM public.chapter_blueprints WHERE project_id = p_project_id;
  DELETE FROM public.project_daily_quotas WHERE project_id = p_project_id;

  FOR v_plan IN SELECT value FROM jsonb_array_elements(v_project.initial_window_v3->'plans') LOOP
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

  UPDATE public.ai_story_projects SET
    current_chapter = 0,
    flagship_v3_status = 'ready_to_write',
    style_directives = COALESCE(style_directives, '{}'::jsonb)
      || jsonb_build_object(
        'pipeline_version', 'flagship_v3',
        'publication_mode', 'offline_only',
        'factory_enabled', false,
        'production_daily_chapter_quota', 5,
        'prompt_version', 'flagship-v3.1-structured-scenes-fact-create'
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
  RETURN jsonb_build_object(
    'reset', true,
    'archived_chapters', v_archived,
    'deleted_chapters', v_deleted,
    'installed_plans', v_index,
    'project_id', p_project_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.stage_flagship_launch_pack_v3(uuid,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_reset_flagship_canary_v3(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stage_flagship_launch_pack_v3(uuid,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_reset_flagship_canary_v3(uuid,text) TO service_role;
