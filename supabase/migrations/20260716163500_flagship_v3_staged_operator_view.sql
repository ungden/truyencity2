DROP VIEW IF EXISTS public.factory_story_status_v3;
CREATE VIEW public.factory_story_status_v3
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  p.novel_id,
  n.title,
  p.status AS project_status,
  p.current_chapter,
  p.flagship_v3_status,
  j.id AS job_id,
  j.status AS job_status,
  j.stage AS job_stage,
  j.failure_class AS job_failure_class,
  j.last_error AS job_last_error,
  j.lease_until,
  q.vn_date,
  q.status AS quota_status,
  q.written_chapters,
  q.target_chapters,
  q.next_due_at,
  r.id AS latest_run_id,
  r.status AS latest_run_status,
  r.failure_class AS latest_run_failure_class,
  r.publication_decision AS latest_publication_decision,
  r.quality_score AS latest_quality_score,
  r.prompt_version AS latest_prompt_version,
  r.model_route AS latest_model_route,
  r.error_message AS latest_run_error,
  r.updated_at AS latest_run_updated_at
FROM public.ai_story_projects p
JOIN public.novels n ON n.id = p.novel_id
LEFT JOIN public.story_factory_jobs j ON j.project_id = p.id AND j.pipeline_version = 'flagship_v3'
LEFT JOIN public.project_daily_quotas q ON q.project_id = p.id
  AND q.vn_date = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
LEFT JOIN LATERAL (
  SELECT run.* FROM public.story_write_runs run
  WHERE run.project_id = p.id AND run.pipeline_version = 'flagship_v3'
  ORDER BY run.updated_at DESC LIMIT 1
) r ON true
WHERE p.flagship_v3_status IS NOT NULL
   OR p.style_directives->>'pipeline_version' = 'flagship_v3';

REVOKE ALL ON public.factory_story_status_v3 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.factory_story_status_v3 TO service_role;
