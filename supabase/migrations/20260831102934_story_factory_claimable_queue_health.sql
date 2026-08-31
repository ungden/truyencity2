-- Health monitoring must count exactly the jobs the worker can claim. A
-- cheaper REST filter over status/next_run_at/lease missed project release,
-- approval and execution-mode gates, creating false positive incidents.
CREATE OR REPLACE FUNCTION public.story_factory_claimable_queue_health(p_engine_release text)
RETURNS TABLE(runnable_jobs bigint, oldest_next_run_at timestamptz)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)::bigint, min(job.next_run_at)
  FROM public.story_factory_jobs job
  JOIN public.ai_story_projects project ON project.id = job.project_id
  JOIN public.novels novel ON novel.id = job.novel_id
  WHERE job.status IN ('setup', 'ready', 'finale')
    AND job.next_run_at <= now()
    AND (job.lease_until IS NULL OR job.lease_until < now())
    AND project.status = 'paused'
    AND project.engine_release = p_engine_release
    AND job.current_chapter < job.maximum_chapters
    AND (job.execution_mode = 'production' OR novel.hidden = true)
    AND public.story_factory_release_is_approved(job.benchmark_run_id, p_engine_release, project.model_routes);
$$;

REVOKE ALL ON FUNCTION public.story_factory_claimable_queue_health(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.story_factory_claimable_queue_health(text) TO service_role;
