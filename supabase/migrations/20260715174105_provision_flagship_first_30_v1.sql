-- Idempotent production provisioning for the first 30 flagship stories.
-- The function only creates paused, hidden flagship_v2 rows with an explicit
-- story-specific brief. It never creates chapters and never reads legacy data.

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_story_projects_flagship_portfolio_slot
  ON public.ai_story_projects (
    (style_directives->>'portfolio_id'),
    (style_directives->>'portfolio_slot_id')
  )
  WHERE style_directives->>'pipeline_version' = 'flagship_v2'
    AND style_directives->>'portfolio_id' IS NOT NULL
    AND style_directives->>'portfolio_slot_id' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.provision_flagship_portfolio_story_v1(
  p_slot_id text,
  p_title text,
  p_slug text,
  p_description text,
  p_cover_url text,
  p_genre text,
  p_main_character text,
  p_brief jsonb,
  p_model_routes jsonb,
  p_max_chapters integer DEFAULT 1000
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_novel_id uuid;
  v_project_id uuid;
  v_existing record;
  v_job jsonb;
BEGIN
  IF p_slot_id !~ '^(HX|TH|DT)-[0-9]{2}$'
     OR length(trim(COALESCE(p_title, ''))) < 20
     OR p_slug !~ '^flagship-(hx|th|dt)-[0-9]{2}$'
     OR p_slug IS DISTINCT FROM 'flagship-' || lower(p_slot_id)
     OR length(trim(COALESCE(p_description, ''))) < 20
     OR length(trim(COALESCE(p_main_character, ''))) < 20 THEN
    RAISE EXCEPTION 'FLAGSHIP_PORTFOLIO_IDENTITY_INVALID';
  END IF;
  IF p_cover_url !~ '^/covers/flagship-first-30/[a-z0-9-]+[.]webp$' THEN
    RAISE EXCEPTION 'FLAGSHIP_PORTFOLIO_COVER_INVALID';
  END IF;
  IF p_max_chapters NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'FLAGSHIP_PORTFOLIO_MAX_CHAPTERS_INVALID';
  END IF;
  IF COALESCE((p_brief->>'schemaVersion')::integer, -1) <> 2
     OR p_brief->>'language' IS DISTINCT FROM 'vi'
     OR p_brief->>'portfolioSlotId' IS DISTINCT FROM p_slot_id
     OR p_brief->>'genre' IS DISTINCT FROM p_genre THEN
    RAISE EXCEPTION 'FLAGSHIP_PORTFOLIO_BRIEF_INVALID';
  END IF;
  IF p_model_routes IS NULL
     OR p_model_routes->>'writer' IS NULL OR p_model_routes->>'editor' IS NULL
     OR p_model_routes->>'setupCreative' IS NULL OR p_model_routes->>'setupJudge' IS NULL
     OR p_model_routes->>'director' IS NULL OR p_model_routes->>'planner' IS NULL
     OR p_model_routes->>'writer' = p_model_routes->>'editor'
     OR p_model_routes->>'setupCreative' = p_model_routes->>'setupJudge' THEN
    RAISE EXCEPTION 'FLAGSHIP_PORTFOLIO_MODEL_ROUTES_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('flagship-first-30:' || p_slot_id));

  SELECT p.id AS project_id, p.novel_id, p.flagship_setup_status, p.current_chapter,
         j.id AS job_id, j.status AS job_status
    INTO v_existing
  FROM public.ai_story_projects p
  LEFT JOIN public.story_factory_jobs j ON j.project_id = p.id
  WHERE p.style_directives->>'pipeline_version' = 'flagship_v2'
    AND p.style_directives->>'portfolio_id' = 'flagship-first-30'
    AND p.style_directives->>'portfolio_slot_id' = p_slot_id
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.current_chapter > 0 THEN
      RETURN jsonb_build_object(
        'created', false,
        'project_id', v_existing.project_id,
        'novel_id', v_existing.novel_id,
        'job_id', v_existing.job_id,
        'job_status', v_existing.job_status,
        'setup_status', v_existing.flagship_setup_status,
        'reason', 'existing_story_already_writing'
      );
    END IF;
    UPDATE public.novels
    SET title = trim(p_title), description = trim(p_description), cover_url = p_cover_url,
        hidden = true, genres = ARRAY[p_genre], updated_at = now()
    WHERE id = v_existing.novel_id;
    UPDATE public.ai_story_projects
    SET style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
          'pipeline_version', 'flagship_v2',
          'portfolio_id', 'flagship-first-30',
          'portfolio_slot_id', p_slot_id,
          'publication_mode', 'automatic',
          'factory_enabled', true,
          'factory_max_chapters', p_max_chapters,
          'flagship_setup_mode', 'autonomous_factory',
          'flagship_model_routes', p_model_routes,
          'production_enabled', false
        ),
        updated_at = now()
    WHERE id = v_existing.project_id;
    IF v_existing.job_id IS NULL THEN
      v_job := public.enroll_flagship_factory_job(v_existing.project_id, p_max_chapters, 'narrative_ending');
    ELSE
      v_job := jsonb_build_object('job_id', v_existing.job_id, 'status', v_existing.job_status);
    END IF;
    RETURN jsonb_build_object(
      'created', false,
      'project_id', v_existing.project_id,
      'novel_id', v_existing.novel_id,
      'job', v_job,
      'setup_status', v_existing.flagship_setup_status,
      'reason', 'existing_story_reused'
    );
  END IF;

  IF EXISTS (SELECT 1 FROM public.novels WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'FLAGSHIP_PORTFOLIO_SLUG_CONFLICT';
  END IF;

  v_novel_id := gen_random_uuid();
  v_project_id := gen_random_uuid();

  INSERT INTO public.novels (
    id, title, slug, author, cover_url, description, status, genres, hidden,
    total_chapters, chapter_count, created_at, updated_at
  ) VALUES (
    v_novel_id, trim(p_title), p_slug, 'TruyenCity', p_cover_url,
    trim(p_description), 'Đang chuẩn bị', ARRAY[p_genre], true,
    0, 0, now(), now()
  );

  INSERT INTO public.ai_story_projects (
    id, novel_id, main_character, genre, writing_style, target_chapter_length,
    ai_model, temperature, current_chapter, total_planned_chapters, status,
    pause_reason, paused_at, setup_stage, setup_stage_attempts,
    setup_stage_error, setup_stage_updated_at, style_directives,
    flagship_setup_brief_v2, flagship_setup_status, created_at, updated_at
  ) VALUES (
    v_project_id, v_novel_id, trim(p_main_character), p_genre,
    'flagship_story_specific', 2400, NULL, 0.8, 0, p_max_chapters, 'paused',
    'flagship_factory_waiting_for_provider', now(), 'idea', 0,
    'flagship portfolio provisioned; factory waits for an explicit provider credential', now(),
    jsonb_build_object(
      'pipeline_version', 'flagship_v2',
      'portfolio_id', 'flagship-first-30',
      'portfolio_slot_id', p_slot_id,
      'publication_mode', 'automatic',
      'factory_enabled', true,
      'factory_max_chapters', p_max_chapters,
      'flagship_setup_mode', 'autonomous_factory',
      'flagship_model_routes', p_model_routes,
      'production_enabled', false
    ),
    p_brief, 'brief_ready', now(), now()
  );

  v_job := public.enroll_flagship_factory_job(v_project_id, p_max_chapters, 'narrative_ending');

  RETURN jsonb_build_object(
    'created', true,
    'project_id', v_project_id,
    'novel_id', v_novel_id,
    'job', v_job,
    'setup_status', 'brief_ready'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_flagship_portfolio_story_v1(
  text,text,text,text,text,text,text,jsonb,jsonb,integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_flagship_portfolio_story_v1(
  text,text,text,text,text,text,text,jsonb,jsonb,integer
) TO service_role;
