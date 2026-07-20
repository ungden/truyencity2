-- Move a blocked hidden canary onto a new code/prompt release without
-- restaging its launch pack. This deliberately preserves every committed
-- chapter, StoryStateV3 entry, ledger row and uncommitted ChapterPlanV3.

BEGIN;

CREATE OR REPLACE FUNCTION public.upgrade_hidden_canary_release_v3(
  p_project_id uuid,
  p_release_manifest jsonb,
  p_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project public.ai_story_projects;
  v_novel public.novels;
  v_job public.story_factory_jobs;
  v_pack public.story_launch_packs_v3;
  v_release_id text := p_release_manifest->>'releaseId';
  v_launch_digest text;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'UPGRADE_BLOCKED_HIDDEN_CANARY_RELEASE_V3' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_UPGRADE_CONFIRMATION_REQUIRED';
  END IF;
  IF p_release_manifest->>'pipelineVersion' IS DISTINCT FROM 'flagship_v3'
     OR COALESCE(v_release_id, '') !~ '^fv3_[a-f0-9]{16}$'
     OR length(trim(COALESCE(p_release_manifest->>'promptVersion', ''))) < 3 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_MANIFEST_INVALID';
  END IF;

  SELECT * INTO v_project
  FROM public.ai_story_projects
  WHERE id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_PROJECT_NOT_FOUND'; END IF;

  SELECT * INTO v_novel
  FROM public.novels
  WHERE id = v_project.novel_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_NOVEL_NOT_FOUND'; END IF;

  SELECT * INTO v_job
  FROM public.story_factory_jobs
  WHERE project_id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_JOB_NOT_FOUND'; END IF;

  IF v_project.status IS DISTINCT FROM 'paused'
     OR v_project.flagship_v3_status IS DISTINCT FROM 'ready_to_write'
     OR v_project.style_directives->>'pipeline_version' IS DISTINCT FROM 'flagship_v3'
     OR v_project.style_directives->>'publication_mode' IS DISTINCT FROM 'offline_only'
     OR COALESCE((v_project.style_directives->>'factory_enabled')::boolean, false)
     OR COALESCE(v_novel.hidden, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_UPGRADE_REQUIRES_HIDDEN_CANARY';
  END IF;
  IF COALESCE(v_project.current_chapter, 0)
       IS DISTINCT FROM COALESCE((v_project.story_state_v3->>'chapterNumber')::integer, -1) THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_UPGRADE_STATE_DRIFT';
  END IF;
  IF v_job.pipeline_version IS DISTINCT FROM 'flagship_v3'
     OR v_job.execution_mode IS DISTINCT FROM 'hidden_canary'
     OR v_job.status IS DISTINCT FROM 'quality_blocked'
     OR v_job.current_chapter IS DISTINCT FROM COALESCE(v_project.current_chapter, 0)
     OR v_job.lease_until IS NOT NULL
     OR v_job.lease_token IS NOT NULL THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_UPGRADE_JOB_NOT_BLOCKED';
  END IF;
  IF v_project.style_directives#>>'{flagship_release_v3,releaseId}' IS NOT DISTINCT FROM v_release_id THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_UPGRADE_REQUIRES_NEW_RELEASE';
  END IF;

  v_launch_digest := v_project.style_directives->>'flagship_launch_pack_digest_v3';
  IF COALESCE(v_launch_digest, '') !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_UPGRADE_LAUNCH_DIGEST_INVALID';
  END IF;
  SELECT * INTO v_pack
  FROM public.story_launch_packs_v3
  WHERE project_id = p_project_id
    AND launch_pack_digest = v_launch_digest
  ORDER BY created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_V3_RELEASE_UPGRADE_LAUNCH_PACK_MISSING'; END IF;

  INSERT INTO public.story_launch_packs_v3(
    commission_id, project_id, engine_release_id, route_version,
    launch_pack_digest, launch_pack, selected_concept_id, status
  ) VALUES (
    v_pack.commission_id, v_pack.project_id, v_release_id, v_pack.route_version,
    v_pack.launch_pack_digest, v_pack.launch_pack, v_pack.selected_concept_id, 'staged'
  ) ON CONFLICT(project_id, engine_release_id, launch_pack_digest) DO NOTHING;

  UPDATE public.ai_story_projects
  SET style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
        'flagship_release_v3', p_release_manifest,
        'prompt_version', p_release_manifest->>'promptVersion'
      ),
      updated_at = now()
  WHERE id = p_project_id;

  UPDATE public.story_factory_jobs
  SET status = 'ready',
      stage = 'plan',
      quality_attempts_for_chapter = 0,
      lease_owner = NULL,
      lease_token = NULL,
      lease_until = NULL,
      failure_class = NULL,
      last_error = NULL,
      updated_at = now()
  WHERE id = v_job.id
  RETURNING * INTO v_job;

  RETURN jsonb_build_object(
    'upgraded', true,
    'project_id', p_project_id,
    'engine_release_id', v_release_id,
    'current_chapter', v_project.current_chapter,
    'story_state_chapter', (v_project.story_state_v3->>'chapterNumber')::integer,
    'job_status', v_job.status,
    'execution_mode', v_job.execution_mode,
    'novel_hidden', v_novel.hidden,
    'launch_pack_digest', v_launch_digest
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upgrade_hidden_canary_release_v3(uuid,jsonb,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_hidden_canary_release_v3(uuid,jsonb,text)
  TO service_role;

COMMIT;
