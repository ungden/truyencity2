-- Isolated flagship setup artifacts. Legacy setup_stage remains untouched and cannot
-- act as a fallback for flagship projects.

ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS flagship_setup_brief_v2 jsonb,
  ADD COLUMN IF NOT EXISTS flagship_concept_tournament_v2 jsonb,
  ADD COLUMN IF NOT EXISTS flagship_setup_selection_v2 jsonb,
  ADD COLUMN IF NOT EXISTS flagship_setup_artifacts_v2 jsonb,
  ADD COLUMN IF NOT EXISTS flagship_setup_status text;

ALTER TABLE public.ai_story_projects DROP CONSTRAINT IF EXISTS ai_story_projects_flagship_setup_status_check;
ALTER TABLE public.ai_story_projects ADD CONSTRAINT ai_story_projects_flagship_setup_status_check
  CHECK (flagship_setup_status IS NULL OR flagship_setup_status IN (
    'brief_ready', 'tournament_generating', 'concept_review', 'kernel_generating',
    'story_spec_review', 'ready_to_write', 'setup_blocked', 'infra_blocked'
  ));

CREATE INDEX IF NOT EXISTS idx_ai_story_projects_flagship_setup_status
  ON public.ai_story_projects(flagship_setup_status, updated_at)
  WHERE style_directives->>'pipeline_version' = 'flagship_v2';

CREATE TABLE IF NOT EXISTS public.story_flagship_setup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('concept_tournament','launch_pack','rolling_plan')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','saved','setup_blocked','infra_blocked','human_gate')),
  model text NOT NULL,
  model_routes jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_version text NOT NULL,
  call_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  artifact_snapshot jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE public.story_flagship_setup_runs
  ADD COLUMN IF NOT EXISTS model_routes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS artifact_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_story_flagship_setup_runs_project_recent
  ON public.story_flagship_setup_runs(project_id, started_at DESC);

ALTER TABLE public.story_flagship_setup_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_flagship_setup_runs FROM anon, authenticated;
GRANT ALL ON public.story_flagship_setup_runs TO service_role;
DROP POLICY IF EXISTS story_flagship_setup_runs_service_all ON public.story_flagship_setup_runs;
CREATE POLICY story_flagship_setup_runs_service_all ON public.story_flagship_setup_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP FUNCTION IF EXISTS public.install_flagship_setup_brief_v2(uuid,jsonb);
CREATE OR REPLACE FUNCTION public.install_flagship_setup_brief_v2(
  p_project_id uuid,
  p_brief jsonb,
  p_model_routes jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pipeline text;
  v_status text;
  v_current int;
BEGIN
  SELECT style_directives->>'pipeline_version', status, COALESCE(current_chapter, 0)
    INTO v_pipeline, v_status, v_current
  FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_PROJECT_NOT_FOUND'; END IF;
  IF v_pipeline IS DISTINCT FROM 'flagship_v2' THEN RAISE EXCEPTION 'FLAGSHIP_PIPELINE_MISMATCH'; END IF;
  IF v_status IS DISTINCT FROM 'paused' OR v_current <> 0 THEN RAISE EXCEPTION 'FLAGSHIP_SETUP_REQUIRES_PAUSED_UNWRITTEN_PROJECT'; END IF;
  IF COALESCE((p_brief->>'schemaVersion')::int, -1) <> 2 OR p_brief->>'language' IS DISTINCT FROM 'vi' THEN
    RAISE EXCEPTION 'FLAGSHIP_SETUP_BRIEF_INVALID';
  END IF;
  IF p_model_routes IS NULL
     OR p_model_routes->>'writer' IS NULL OR p_model_routes->>'editor' IS NULL
     OR p_model_routes->>'setupCreative' IS NULL OR p_model_routes->>'setupJudge' IS NULL
     OR p_model_routes->>'director' IS NULL OR p_model_routes->>'planner' IS NULL
     OR p_model_routes->>'writer' = p_model_routes->>'editor'
     OR p_model_routes->>'setupCreative' = p_model_routes->>'setupJudge' THEN
    RAISE EXCEPTION 'FLAGSHIP_MODEL_ROUTES_INVALID';
  END IF;

  DELETE FROM public.chapter_blueprints WHERE project_id = p_project_id;
  UPDATE public.ai_story_projects
  SET flagship_setup_brief_v2 = p_brief,
      flagship_concept_tournament_v2 = NULL,
      flagship_setup_selection_v2 = NULL,
      flagship_setup_artifacts_v2 = NULL,
      story_spec_v2 = NULL,
      story_spec_v2_score = NULL,
      arc_plan_v2 = NULL,
      story_state_v2 = NULL,
      flagship_setup_status = 'brief_ready',
      setup_stage_error = 'flagship_v2 manual setup: run concept tournament by project id',
      setup_stage_attempts = 0,
      setup_stage_updated_at = now(),
      style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
        'pipeline_version', 'flagship_v2',
        'publication_mode', 'human_gate',
        'flagship_setup_mode', 'manual_only',
        'flagship_model_routes', p_model_routes
      ),
      updated_at = now()
  WHERE id = p_project_id;
  RETURN jsonb_build_object('installed', true, 'status', 'brief_ready');
END;
$$;

CREATE OR REPLACE FUNCTION public.save_flagship_concept_tournament_v2(
  p_project_id uuid,
  p_tournament jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pipeline text;
  v_status text;
  v_current int;
BEGIN
  SELECT style_directives->>'pipeline_version', status, COALESCE(current_chapter, 0)
    INTO v_pipeline, v_status, v_current
  FROM public.ai_story_projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_PROJECT_NOT_FOUND'; END IF;
  IF v_pipeline IS DISTINCT FROM 'flagship_v2' THEN RAISE EXCEPTION 'FLAGSHIP_PIPELINE_MISMATCH'; END IF;
  IF v_status IS DISTINCT FROM 'paused' OR v_current <> 0 THEN RAISE EXCEPTION 'FLAGSHIP_SETUP_REQUIRES_PAUSED_UNWRITTEN_PROJECT'; END IF;
  IF p_tournament->>'status' IS DISTINCT FROM 'awaiting_human_selection' THEN RAISE EXCEPTION 'FLAGSHIP_TOURNAMENT_STATUS_INVALID'; END IF;
  IF jsonb_array_length(COALESCE(p_tournament->'openings', '[]'::jsonb)) <> 3 THEN RAISE EXCEPTION 'FLAGSHIP_TOURNAMENT_OPENINGS_INVALID'; END IF;

  UPDATE public.ai_story_projects
  SET flagship_concept_tournament_v2 = p_tournament,
      flagship_setup_selection_v2 = NULL,
      flagship_setup_artifacts_v2 = NULL,
      story_spec_v2 = NULL,
      story_spec_v2_score = NULL,
      arc_plan_v2 = NULL,
      story_state_v2 = NULL,
      flagship_setup_status = 'concept_review',
      style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
        'pipeline_version', 'flagship_v2',
        'publication_mode', 'human_gate',
        'flagship_human_gate', 'concept'
      ),
      updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object('saved', true, 'status', 'concept_review');
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_flagship_launch_pack_v2(
  p_project_id uuid,
  p_selection jsonb,
  p_launch_pack jsonb,
  p_foundation_score jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pipeline text;
  v_status text;
  v_current int;
  v_tournament jsonb;
  v_candidate_id text;
  v_plan jsonb;
BEGIN
  SELECT style_directives->>'pipeline_version', status, COALESCE(current_chapter, 0), flagship_concept_tournament_v2
    INTO v_pipeline, v_status, v_current, v_tournament
  FROM public.ai_story_projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_PROJECT_NOT_FOUND'; END IF;
  IF v_pipeline IS DISTINCT FROM 'flagship_v2' THEN RAISE EXCEPTION 'FLAGSHIP_PIPELINE_MISMATCH'; END IF;
  IF v_status IS DISTINCT FROM 'paused' OR v_current <> 0 THEN RAISE EXCEPTION 'FLAGSHIP_SETUP_REQUIRES_PAUSED_UNWRITTEN_PROJECT'; END IF;
  IF v_tournament IS NULL THEN RAISE EXCEPTION 'FLAGSHIP_TOURNAMENT_MISSING'; END IF;
  v_candidate_id := p_selection->>'candidateId';
  IF v_candidate_id IS NULL OR NOT COALESCE(v_tournament->'ranking'->'finalistIds', '[]'::jsonb) ? v_candidate_id THEN
    RAISE EXCEPTION 'FLAGSHIP_SELECTION_NOT_A_FINALIST';
  END IF;
  IF p_launch_pack->>'selectedConceptId' IS DISTINCT FROM v_candidate_id THEN RAISE EXCEPTION 'FLAGSHIP_SELECTED_CONCEPT_CHANGED'; END IF;
  IF COALESCE((p_foundation_score->>'passed')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'FLAGSHIP_FOUNDATION_NOT_PASSED'; END IF;

  INSERT INTO public.story_flagship_reviews(project_id, stage, reviewer_kind, anonymous_candidate_id, verdict, scores, evidence, reviewer_ref)
  VALUES (
    p_project_id, 'concept', 'human', v_candidate_id, 'approved', '{}'::jsonb,
    jsonb_build_array(jsonb_build_object('rationale', p_selection->>'rationale')),
    p_selection->>'approvedBy'
  );

  DELETE FROM public.chapter_blueprints WHERE project_id = p_project_id AND chapter_number BETWEEN 1 AND 5;
  FOR v_plan IN SELECT value FROM jsonb_array_elements(p_launch_pack->'rollingChapterPlans') LOOP
    INSERT INTO public.chapter_blueprints (
      project_id, chapter_number, arc_number, goal, conflict, payoff, ending_hook,
      "cast", resource_ledger_delta, world_state_delta, authority_constraints,
      status, version, meta, updated_at
    ) VALUES (
      p_project_id,
      (v_plan->>'chapterNumber')::int,
      1,
      v_plan->>'chapterPromise',
      (v_plan->'scenes'->0)->>'opposition',
      (v_plan->'scenes'->-1)->>'payoff',
      v_plan->>'nextChapterPressure',
      ARRAY(SELECT DISTINCT value->>'pov' FROM jsonb_array_elements(v_plan->'scenes')),
      COALESCE(v_plan->'stateDelta'->'resources', '[]'::jsonb)::text,
      COALESCE(v_plan->'stateDelta'->'facts', '{}'::jsonb)::text,
      'Only authority explicitly present in StorySpecV2 and StoryStateV2 is allowed.',
      'planned', 2, jsonb_build_object('chapterPlanV2', v_plan, 'pipelineVersion', 'flagship_v2'), now()
    );
  END LOOP;

  UPDATE public.ai_story_projects
  SET flagship_setup_selection_v2 = p_selection,
      flagship_setup_artifacts_v2 = p_launch_pack,
      story_spec_v2 = p_launch_pack->'storySpec',
      story_spec_v2_score = p_foundation_score,
      arc_plan_v2 = p_launch_pack->'arcPlan',
      story_state_v2 = p_launch_pack->'storyState',
      flagship_setup_status = 'story_spec_review',
      setup_stage = 'ready_to_write',
      setup_stage_error = 'flagship_v2 awaits explicit StorySpec human approval',
      setup_stage_attempts = 0,
      setup_stage_updated_at = now(),
      updated_at = now()
  WHERE id = p_project_id;

  UPDATE public.novels
  SET title = p_launch_pack->'storySpec'->>'title',
      description = p_launch_pack->'storySpec'->>'premise',
      updated_at = now()
  WHERE id = (SELECT novel_id FROM public.ai_story_projects WHERE id = p_project_id);

  RETURN jsonb_build_object('saved', true, 'status', 'story_spec_review', 'candidate_id', v_candidate_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_flagship_story_spec_v2(
  p_project_id uuid,
  p_reviewer_ref text,
  p_evidence jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pipeline text;
  v_setup_status text;
  v_score jsonb;
BEGIN
  SELECT style_directives->>'pipeline_version', flagship_setup_status, story_spec_v2_score
    INTO v_pipeline, v_setup_status, v_score
  FROM public.ai_story_projects
  WHERE id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_PROJECT_NOT_FOUND'; END IF;
  IF v_pipeline IS DISTINCT FROM 'flagship_v2' OR v_setup_status IS DISTINCT FROM 'story_spec_review' THEN
    RAISE EXCEPTION 'FLAGSHIP_STORY_SPEC_NOT_READY_FOR_APPROVAL';
  END IF;
  IF COALESCE((v_score->>'passed')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'FLAGSHIP_FOUNDATION_NOT_PASSED'; END IF;

  INSERT INTO public.story_flagship_reviews(project_id, stage, reviewer_kind, verdict, evidence, reviewer_ref)
  VALUES (p_project_id, 'story_spec', 'human', 'approved', COALESCE(p_evidence, '[]'::jsonb), p_reviewer_ref);

  UPDATE public.ai_story_projects
  SET flagship_setup_status = 'ready_to_write',
      setup_stage_error = NULL,
      style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
        'pipeline_version', 'flagship_v2',
        'publication_mode', 'human_gate',
        'flagship_human_gate', 'story_spec',
        'prompt_version', 'flagship-setup-v2.0'
      ),
      updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object('approved', true, 'status', 'ready_to_write');
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_flagship_rolling_window_v2(
  p_project_id uuid,
  p_expected_current_chapter int,
  p_window jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pipeline text;
  v_setup_status text;
  v_status text;
  v_current int;
  v_arc_end int;
  v_plan jsonb;
  v_expected int := p_expected_current_chapter + 1;
BEGIN
  SELECT style_directives->>'pipeline_version', flagship_setup_status, status,
         COALESCE(current_chapter, 0), (arc_plan_v2->>'endChapter')::int
    INTO v_pipeline, v_setup_status, v_status, v_current, v_arc_end
  FROM public.ai_story_projects
  WHERE id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_PROJECT_NOT_FOUND'; END IF;
  IF v_pipeline IS DISTINCT FROM 'flagship_v2' OR v_setup_status IS DISTINCT FROM 'ready_to_write' THEN RAISE EXCEPTION 'FLAGSHIP_SETUP_NOT_APPROVED'; END IF;
  IF v_status IS DISTINCT FROM 'paused' THEN RAISE EXCEPTION 'FLAGSHIP_ROLLING_PLAN_REQUIRES_PAUSED_PROJECT'; END IF;
  IF v_current <> p_expected_current_chapter THEN RAISE EXCEPTION 'FLAGSHIP_ROLLING_PLAN_RACE'; END IF;
  IF COALESCE((p_window->>'startChapter')::int, -1) <> v_expected OR COALESCE((p_window->>'endChapter')::int, -1) <> v_expected + 4 THEN
    RAISE EXCEPTION 'FLAGSHIP_ROLLING_WINDOW_SEQUENCE_INVALID';
  END IF;
  IF v_expected + 4 > v_arc_end THEN RAISE EXCEPTION 'FLAGSHIP_ROLLING_WINDOW_EXCEEDS_ARC'; END IF;
  IF jsonb_array_length(COALESCE(p_window->'plans', '[]'::jsonb)) <> 5 THEN RAISE EXCEPTION 'FLAGSHIP_ROLLING_WINDOW_SIZE_INVALID'; END IF;

  FOR v_plan IN SELECT value FROM jsonb_array_elements(p_window->'plans') LOOP
    IF COALESCE((v_plan->>'chapterNumber')::int, -1) <> v_expected THEN RAISE EXCEPTION 'FLAGSHIP_ROLLING_PLAN_NOT_CONTIGUOUS'; END IF;
    INSERT INTO public.chapter_blueprints (
      project_id, chapter_number, arc_number, goal, conflict, payoff, ending_hook,
      "cast", resource_ledger_delta, world_state_delta, authority_constraints,
      status, version, meta, updated_at
    ) VALUES (
      p_project_id, v_expected, 1, v_plan->>'chapterPromise',
      (v_plan->'scenes'->0)->>'opposition', (v_plan->'scenes'->-1)->>'payoff',
      v_plan->>'nextChapterPressure',
      ARRAY(SELECT DISTINCT value->>'pov' FROM jsonb_array_elements(v_plan->'scenes')),
      COALESCE(v_plan->'stateDelta'->'resources', '[]'::jsonb)::text,
      COALESCE(v_plan->'stateDelta'->'facts', '{}'::jsonb)::text,
      'Only authority explicitly present in StorySpecV2 and StoryStateV2 is allowed.',
      'planned', 2, jsonb_build_object('chapterPlanV2', v_plan, 'pipelineVersion', 'flagship_v2'), now()
    );
    v_expected := v_expected + 1;
  END LOOP;
  RETURN jsonb_build_object('saved', true, 'start_chapter', p_expected_current_chapter + 1, 'end_chapter', p_expected_current_chapter + 5);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_flagship_checkpoint_v2(
  p_project_id uuid,
  p_stage text,
  p_reviewer_ref text,
  p_scores jsonb DEFAULT '{}'::jsonb,
  p_evidence jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pipeline text;
  v_gate text;
  v_current int;
  v_required_chapter int;
  v_previous_gate text;
BEGIN
  v_required_chapter := CASE p_stage WHEN 'chapter_3' THEN 3 WHEN 'chapter_10' THEN 10 WHEN 'chapter_30' THEN 30 WHEN 'chapter_50' THEN 50 ELSE NULL END;
  v_previous_gate := CASE p_stage WHEN 'chapter_3' THEN 'story_spec' WHEN 'chapter_10' THEN 'chapter_3' WHEN 'chapter_30' THEN 'chapter_10' WHEN 'chapter_50' THEN 'chapter_30' ELSE NULL END;
  IF v_required_chapter IS NULL THEN RAISE EXCEPTION 'FLAGSHIP_CHECKPOINT_STAGE_INVALID'; END IF;

  SELECT style_directives->>'pipeline_version', style_directives->>'flagship_human_gate', COALESCE(current_chapter, 0)
    INTO v_pipeline, v_gate, v_current
  FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_PROJECT_NOT_FOUND'; END IF;
  IF v_pipeline IS DISTINCT FROM 'flagship_v2' THEN RAISE EXCEPTION 'FLAGSHIP_PIPELINE_MISMATCH'; END IF;
  IF v_current < v_required_chapter THEN RAISE EXCEPTION 'FLAGSHIP_CHECKPOINT_CHAPTER_NOT_REACHED'; END IF;
  IF v_gate IS DISTINCT FROM v_previous_gate THEN RAISE EXCEPTION 'FLAGSHIP_CHECKPOINT_OUT_OF_ORDER expected previous gate % actual %', v_previous_gate, v_gate; END IF;

  INSERT INTO public.story_flagship_reviews(project_id, chapter_number, stage, reviewer_kind, verdict, scores, evidence, reviewer_ref)
  VALUES (p_project_id, v_required_chapter, p_stage, 'human', 'approved', COALESCE(p_scores, '{}'::jsonb), COALESCE(p_evidence, '[]'::jsonb), p_reviewer_ref);
  UPDATE public.ai_story_projects
  SET style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object('flagship_human_gate', p_stage), updated_at = now()
  WHERE id = p_project_id;
  RETURN jsonb_build_object('approved', true, 'stage', p_stage, 'chapter', v_required_chapter);
END;
$$;

REVOKE ALL ON FUNCTION public.install_flagship_setup_brief_v2(uuid,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_flagship_concept_tournament_v2(uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_flagship_launch_pack_v2(uuid,jsonb,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_flagship_story_spec_v2(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_flagship_rolling_window_v2(uuid,int,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_flagship_checkpoint_v2(uuid,text,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.install_flagship_setup_brief_v2(uuid,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_flagship_concept_tournament_v2(uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_flagship_launch_pack_v2(uuid,jsonb,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_flagship_story_spec_v2(uuid,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_flagship_rolling_window_v2(uuid,int,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_flagship_checkpoint_v2(uuid,text,text,jsonb,jsonb) TO service_role;
