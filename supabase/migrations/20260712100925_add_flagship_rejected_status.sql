ALTER TABLE public.ai_story_projects DROP CONSTRAINT IF EXISTS ai_story_projects_flagship_setup_status_check;
ALTER TABLE public.ai_story_projects ADD CONSTRAINT ai_story_projects_flagship_setup_status_check
  CHECK (flagship_setup_status IS NULL OR flagship_setup_status IN (
    'brief_ready', 'tournament_generating', 'concept_review', 'kernel_generating',
    'story_spec_review', 'ready_to_write', 'setup_blocked', 'infra_blocked', 'rejected'
  ));
CREATE OR REPLACE FUNCTION public.reject_flagship_pilot_v2(
  p_project_id uuid,
  p_reviewer_ref text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pipeline text;
  v_status text;
  v_current int;
  v_novel_id uuid;
BEGIN
  IF length(trim(COALESCE(p_reviewer_ref, ''))) < 2 OR length(trim(COALESCE(p_reason, ''))) < 20 THEN
    RAISE EXCEPTION 'FLAGSHIP_REJECTION_EVIDENCE_INVALID';
  END IF;

  SELECT style_directives->>'pipeline_version', status, COALESCE(current_chapter, 0), novel_id
    INTO v_pipeline, v_status, v_current, v_novel_id
  FROM public.ai_story_projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_PROJECT_NOT_FOUND'; END IF;
  IF v_pipeline IS DISTINCT FROM 'flagship_v2' THEN RAISE EXCEPTION 'FLAGSHIP_PIPELINE_MISMATCH'; END IF;
  IF v_status IS DISTINCT FROM 'paused' OR v_current <> 0 THEN
    RAISE EXCEPTION 'FLAGSHIP_REJECTION_REQUIRES_PAUSED_UNWRITTEN_PROJECT';
  END IF;

  INSERT INTO public.story_flagship_reviews(
    project_id, stage, reviewer_kind, verdict, evidence, reviewer_ref
  ) VALUES (
    p_project_id, 'concept', 'human', 'rejected',
    jsonb_build_array(jsonb_build_object('reason', trim(p_reason))), trim(p_reviewer_ref)
  );

  UPDATE public.ai_story_projects
  SET flagship_setup_status = 'rejected',
      setup_stage_error = left('flagship_v2 rejected: ' || trim(p_reason), 500),
      setup_stage_updated_at = now(),
      style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
        'pipeline_version', 'flagship_v2',
        'publication_mode', 'human_gate',
        'flagship_human_gate', 'rejected',
        'production_enabled', false
      ),
      updated_at = now()
  WHERE id = p_project_id;

  UPDATE public.novels
  SET hidden = true,
      status = 'Đã từ chối',
      updated_at = now()
  WHERE id = v_novel_id;

  RETURN jsonb_build_object('rejected', true, 'project_id', p_project_id, 'status', 'rejected');
END;
$$;
REVOKE ALL ON FUNCTION public.reject_flagship_pilot_v2(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_flagship_pilot_v2(uuid,text,text) TO service_role;
