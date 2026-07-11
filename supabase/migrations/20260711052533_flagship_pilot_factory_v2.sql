CREATE OR REPLACE FUNCTION public.create_flagship_pilot_v2(
  p_working_title text,
  p_slug text,
  p_brief jsonb,
  p_model_routes jsonb,
  p_target_chapter_length int DEFAULT 2400
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_novel_id uuid := gen_random_uuid();
  v_project_id uuid := gen_random_uuid();
BEGIN
  IF length(trim(p_working_title)) < 5 OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'FLAGSHIP_PILOT_IDENTITY_INVALID';
  END IF;
  IF p_target_chapter_length < 1500 OR p_target_chapter_length > 5000 THEN
    RAISE EXCEPTION 'FLAGSHIP_TARGET_LENGTH_INVALID';
  END IF;
  IF COALESCE((p_brief->>'schemaVersion')::int, -1) <> 2
     OR p_brief->>'language' IS DISTINCT FROM 'vi'
     OR p_brief->>'genre' IS NULL THEN
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

  INSERT INTO public.novels (
    id, title, slug, author, description, status, genres, hidden,
    total_chapters, chapter_count, created_at, updated_at
  ) VALUES (
    v_novel_id, trim(p_working_title), p_slug, 'TruyenCity Flagship Lab',
    'Pilot đang ở concept gate; chưa xuất bản và chưa có canon được duyệt.',
    'Đang chuẩn bị', ARRAY['Đô Thị'], true, 0, 0, now(), now()
  );

  INSERT INTO public.ai_story_projects (
    id, novel_id, main_character, genre, writing_style, target_chapter_length,
    ai_model, temperature, current_chapter, total_planned_chapters, status,
    pause_reason, paused_at, setup_stage, setup_stage_attempts,
    setup_stage_error, setup_stage_updated_at, style_directives,
    flagship_setup_brief_v2, flagship_setup_status, created_at, updated_at
  ) VALUES (
    v_project_id, v_novel_id, 'AWAITING_HUMAN_CONCEPT_SELECTION', p_brief->>'genre',
    'flagship_story_specific', p_target_chapter_length, NULL, 0.8, 0, NULL, 'paused',
    'flagship_v2_manual_pilot', now(), 'idea', 0,
    'flagship_v2 manual setup: run concept tournament by project id', now(),
    jsonb_build_object(
      'pipeline_version', 'flagship_v2',
      'publication_mode', 'human_gate',
      'flagship_setup_mode', 'manual_only',
      'flagship_model_routes', p_model_routes,
      'production_enabled', false
    ),
    p_brief, 'brief_ready', now(), now()
  );

  RETURN jsonb_build_object(
    'created', true,
    'project_id', v_project_id,
    'novel_id', v_novel_id,
    'status', 'paused',
    'setup_status', 'brief_ready'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_flagship_pilot_v2(text,text,jsonb,jsonb,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_flagship_pilot_v2(text,text,jsonb,jsonb,int) TO service_role;
