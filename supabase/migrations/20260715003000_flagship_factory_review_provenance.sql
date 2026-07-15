-- Reclassify machine setup decisions without pretending they were human chat
-- approvals. This is intentionally a separate RPC so the historical setup
-- functions remain compatible with the manual pilot lane.
CREATE OR REPLACE FUNCTION public.mark_flagship_factory_review_v2(
  p_project_id uuid,
  p_stage text,
  p_reviewer_ref text,
  p_evidence jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_review_id uuid;
BEGIN
  IF p_stage NOT IN ('concept','story_spec') OR length(trim(COALESCE(p_reviewer_ref,''))) < 2 THEN
    RAISE EXCEPTION 'FACTORY_REVIEW_ARGUMENT_INVALID';
  END IF;
  SELECT id INTO v_review_id FROM public.story_flagship_reviews
  WHERE project_id = p_project_id AND stage = p_stage
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF v_review_id IS NULL THEN RAISE EXCEPTION 'FACTORY_REVIEW_NOT_FOUND'; END IF;
  UPDATE public.story_flagship_reviews
  SET reviewer_kind = 'independent_model', reviewer_ref = p_reviewer_ref,
      evidence = COALESCE(evidence, '[]'::jsonb) || COALESCE(p_evidence, '[]'::jsonb)
  WHERE id = v_review_id;
  UPDATE public.ai_story_projects
  SET style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
    'publication_mode', 'automatic', 'factory_enabled', true,
    'flagship_setup_mode', 'autonomous_factory'
  ), updated_at = now()
  WHERE id = p_project_id;
  RETURN jsonb_build_object('marked', true, 'review_id', v_review_id);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_flagship_factory_review_v2(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_flagship_factory_review_v2(uuid,text,text,jsonb) TO service_role;
