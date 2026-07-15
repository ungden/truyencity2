-- Enforce one Vietnam-calendar daily quota for each autonomous flagship.
-- Quota accounting is triggered by the same transaction that inserts the
-- chapter, so a published chapter can never escape the counter.

CREATE OR REPLACE FUNCTION public.record_flagship_factory_chapter_quota_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project record;
  v_vn_date date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_target integer;
BEGIN
  SELECT id, style_directives INTO v_project
  FROM public.ai_story_projects
  WHERE novel_id = NEW.novel_id
    AND style_directives->>'pipeline_version' = 'flagship_v2'
    AND style_directives->>'factory_enabled' = 'true'
    AND style_directives->>'publication_mode' = 'automatic'
  LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_target := LEAST(500, GREATEST(1, COALESCE(
    NULLIF(v_project.style_directives->>'production_daily_chapter_quota', '')::integer,
    20
  )));
  INSERT INTO public.project_daily_quotas (
    project_id, vn_date, target_chapters, written_chapters, status,
    next_due_at, slot_seed, retry_count, last_error, updated_at
  ) VALUES (
    v_project.id, v_vn_date, v_target, 1,
    CASE WHEN v_target <= 1 THEN 'completed' ELSE 'active' END,
    CASE WHEN v_target <= 1 THEN NULL ELSE now() END,
    (hashtext(v_project.id::text || ':' || v_vn_date::text) & 2147483647), 0, NULL, now()
  ) ON CONFLICT (project_id, vn_date) DO UPDATE SET
    target_chapters = EXCLUDED.target_chapters,
    written_chapters = project_daily_quotas.written_chapters + 1,
    status = CASE
      WHEN project_daily_quotas.written_chapters + 1 >= EXCLUDED.target_chapters THEN 'completed'
      ELSE 'active'
    END,
    next_due_at = CASE
      WHEN project_daily_quotas.written_chapters + 1 >= EXCLUDED.target_chapters THEN NULL
      ELSE now()
    END,
    retry_count = 0,
    last_error = NULL,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flagship_factory_chapter_quota_v1 ON public.chapters;
CREATE TRIGGER trg_flagship_factory_chapter_quota_v1
AFTER INSERT ON public.chapters
FOR EACH ROW EXECUTE FUNCTION public.record_flagship_factory_chapter_quota_v1();

CREATE OR REPLACE FUNCTION public.claim_flagship_factory_job(
  p_worker_id text,
  p_lease_seconds integer DEFAULT 900
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.story_factory_jobs;
  v_token uuid := gen_random_uuid();
  v_vn_date date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF length(trim(COALESCE(p_worker_id,''))) < 2 OR p_lease_seconds NOT BETWEEN 60 AND 3600 THEN
    RAISE EXCEPTION 'FACTORY_CLAIM_ARGUMENT_INVALID';
  END IF;

  INSERT INTO public.project_daily_quotas (
    project_id, vn_date, target_chapters, written_chapters, status,
    next_due_at, slot_seed, retry_count, updated_at
  )
  SELECT p.id, v_vn_date,
    LEAST(500, GREATEST(1, COALESCE(NULLIF(p.style_directives->>'production_daily_chapter_quota','')::integer, 20))),
    0, 'active', now(), (hashtext(p.id::text || ':' || v_vn_date::text) & 2147483647), 0, now()
  FROM public.ai_story_projects p
  JOIN public.story_factory_jobs j ON j.project_id = p.id
  WHERE p.style_directives->>'pipeline_version' = 'flagship_v2'
    AND p.style_directives->>'factory_enabled' = 'true'
    AND p.style_directives->>'publication_mode' = 'automatic'
    AND j.status IN ('queued','setup','ready','writing','finale','infra_blocked')
  ON CONFLICT (project_id, vn_date) DO NOTHING;

  SELECT j.* INTO v_job FROM public.story_factory_jobs j
  JOIN public.ai_story_projects p ON p.id = j.project_id
  JOIN public.project_daily_quotas q ON q.project_id = j.project_id AND q.vn_date = v_vn_date
  WHERE j.status IN ('queued','setup','ready','writing','finale','infra_blocked')
    AND (j.lease_until IS NULL OR j.lease_until < now())
    AND p.style_directives->>'pipeline_version' = 'flagship_v2'
    AND p.style_directives->>'factory_enabled' = 'true'
    AND p.style_directives->>'publication_mode' = 'automatic'
    AND q.status = 'active'
    AND q.written_chapters < q.target_chapters
    AND (q.next_due_at IS NULL OR q.next_due_at <= now())
  ORDER BY j.updated_at ASC
  LIMIT 1 FOR UPDATE OF j SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.story_factory_jobs
  SET lease_owner = p_worker_id,
      lease_token = v_token,
      lease_until = now() + make_interval(secs => p_lease_seconds),
      status = CASE WHEN status = 'queued' THEN 'setup' WHEN status = 'ready' THEN 'writing' ELSE status END,
      stage = CASE WHEN status = 'queued' THEN 'setup' WHEN status = 'ready' THEN 'write' ELSE stage END,
      attempt = attempt + 1, updated_at = now()
  WHERE id = v_job.id
  RETURNING * INTO v_job;
  RETURN jsonb_build_object('job', to_jsonb(v_job), 'worker_id', p_worker_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_flagship_factory_chapter_quota_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_flagship_factory_job(text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_flagship_factory_chapter_quota_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_flagship_factory_job(text,integer) TO service_role;
