-- The hidden-canary quota trigger must not change the frozen v2 accounting
-- contract. Keep both pipelines isolated while preserving their prior caps.

BEGIN;

CREATE OR REPLACE FUNCTION public.record_flagship_factory_chapter_quota_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_project public.ai_story_projects; v_job public.story_factory_jobs;
  v_vn_date date:=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date; v_target integer;
BEGIN
  SELECT p.* INTO v_project FROM public.ai_story_projects p
  JOIN public.story_factory_jobs j ON j.project_id=p.id
  WHERE p.novel_id=NEW.novel_id AND (
    (j.pipeline_version='flagship_v3' AND (
      (j.execution_mode='hidden_canary' AND p.style_directives->>'publication_mode'='offline_only')
      OR (j.execution_mode='production' AND p.style_directives->>'publication_mode'='automatic'
          AND p.style_directives->>'factory_enabled'='true')
    )) OR (
      j.pipeline_version='flagship_v2' AND p.style_directives->>'pipeline_version'='flagship_v2'
      AND p.style_directives->>'publication_mode'='automatic' AND p.style_directives->>'factory_enabled'='true'
    )
  ) LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE project_id=v_project.id;
  v_target:=CASE
    WHEN v_job.pipeline_version='flagship_v3' AND v_job.execution_mode='hidden_canary' THEN 5
    WHEN v_job.pipeline_version='flagship_v3' THEN LEAST(20,GREATEST(1,COALESCE(NULLIF(v_project.style_directives->>'production_daily_chapter_quota','')::integer,5)))
    ELSE LEAST(500,GREATEST(1,COALESCE(NULLIF(v_project.style_directives->>'production_daily_chapter_quota','')::integer,20)))
  END;
  INSERT INTO public.project_daily_quotas(project_id,vn_date,target_chapters,written_chapters,status,next_due_at,slot_seed,retry_count,last_error,failure_class,updated_at)
  VALUES(v_project.id,v_vn_date,v_target,1,CASE WHEN v_target<=1 THEN 'completed' ELSE 'active' END,
    CASE WHEN v_target<=1 THEN NULL ELSE now() END,(hashtext(v_project.id::text||':'||v_vn_date::text)&2147483647),0,NULL,NULL,now())
  ON CONFLICT(project_id,vn_date) DO UPDATE SET target_chapters=EXCLUDED.target_chapters,
    written_chapters=public.project_daily_quotas.written_chapters+1,
    status=CASE WHEN public.project_daily_quotas.written_chapters+1>=EXCLUDED.target_chapters THEN 'completed' ELSE 'active' END,
    next_due_at=CASE WHEN public.project_daily_quotas.written_chapters+1>=EXCLUDED.target_chapters THEN NULL ELSE now() END,
    retry_count=0,last_error=NULL,failure_class=NULL,updated_at=now();
  RETURN NEW;
END; $$;

COMMIT;
