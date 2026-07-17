BEGIN;

ALTER TABLE public.story_calibration_campaigns_v3
  ADD COLUMN IF NOT EXISTS launch_pack_digests jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.story_factory_calibrations
  ADD COLUMN IF NOT EXISTS launch_pack_digests jsonb NOT NULL DEFAULT '[]'::jsonb;

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
  IF NOT EXISTS (SELECT 1 FROM public.story_factory_calibrations c
    WHERE c.engine_release_id=p_engine_release_id AND c.route_version=v_routes->>'routeVersion'
      AND c.launch_pack_digests @> jsonb_build_array(v_pack_digest)
      AND c.status='approved' AND c.sample_size>=50 AND c.distinct_reviewers>=5
      AND c.blind_preference_rate>=0.65 AND c.first_pass_publish_rate>=0.65
      AND c.within_revision_publish_rate>=0.80 AND c.critical_continuity_violations=0
      AND c.read_chapter_4_rate>=0.70 AND c.median_cost_usd<=0.25) THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_APPROVED_RELEASE_CALIBRATION_SET_REQUIRED';
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

REVOKE ALL ON FUNCTION public.promote_flagship_v3_factory_release(uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.promote_flagship_v3_factory_release(uuid,text,integer,text) TO service_role;

COMMIT;
