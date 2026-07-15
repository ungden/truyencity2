-- Autonomous arc rollover. Planning may extend an arc, but only from the
-- committed state and only for an explicitly enrolled flagship factory job.
CREATE OR REPLACE FUNCTION public.commit_flagship_arc_v2(
  p_project_id uuid,
  p_expected_current_chapter integer,
  p_arc_plan jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_project record;
  v_start integer;
  v_end integer;
BEGIN
  SELECT id, status, current_chapter, flagship_setup_status, style_directives, arc_plan_v2
    INTO v_project FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_PROJECT_NOT_FOUND'; END IF;
  IF v_project.status IS DISTINCT FROM 'paused' OR v_project.flagship_setup_status IS DISTINCT FROM 'ready_to_write' THEN
    RAISE EXCEPTION 'FLAGSHIP_ARC_REQUIRES_PAUSED_READY_PROJECT';
  END IF;
  IF v_project.style_directives->>'pipeline_version' IS DISTINCT FROM 'flagship_v2'
     OR v_project.style_directives->>'factory_enabled' IS DISTINCT FROM 'true'
     OR v_project.style_directives->>'publication_mode' IS DISTINCT FROM 'automatic' THEN
    RAISE EXCEPTION 'FACTORY_OPT_IN_REQUIRED';
  END IF;
  IF COALESCE(v_project.current_chapter, 0) <> p_expected_current_chapter THEN RAISE EXCEPTION 'FLAGSHIP_ARC_RACE'; END IF;
  v_start := (p_arc_plan->>'startChapter')::integer;
  v_end := (p_arc_plan->>'endChapter')::integer;
  IF COALESCE((p_arc_plan->>'schemaVersion')::integer, -1) <> 2
     OR v_start <> p_expected_current_chapter + 1
     OR v_end < v_start + 4 OR v_end > v_start + 29 THEN
    RAISE EXCEPTION 'FLAGSHIP_ARC_CONTRACT_INVALID';
  END IF;
  UPDATE public.ai_story_projects
  SET arc_plan_v2 = p_arc_plan,
      style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
        'flagship_arc_history', COALESCE(style_directives->'flagship_arc_history', '[]'::jsonb) || jsonb_build_array(COALESCE(arc_plan_v2, '{}'::jsonb))
      ),
      updated_at = now()
  WHERE id = p_project_id;
  RETURN jsonb_build_object('saved', true, 'startChapter', v_start, 'endChapter', v_end);
END;
$$;

REVOKE ALL ON FUNCTION public.commit_flagship_arc_v2(uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_flagship_arc_v2(uuid, integer, jsonb) TO service_role;
