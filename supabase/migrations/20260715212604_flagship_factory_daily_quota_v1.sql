-- Enforce one Vietnam-calendar daily quota for each autonomous flagship.
-- Quota accounting is triggered by the same transaction that inserts the
-- chapter, so a published chapter can never escape the counter.

-- The first Flagship control-plane migration was deployed outside the linked
-- timestamp history. Recreate its tables here before the quota and claim
-- functions use the story_factory_jobs row type.
CREATE TABLE IF NOT EXISTS public.story_factory_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL,
  pipeline_version text NOT NULL DEFAULT 'flagship_v2' CHECK (pipeline_version = 'flagship_v2'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued','setup','ready','writing','finale','blocked','infra_blocked','completed','cancelled'
  )),
  stage text NOT NULL DEFAULT 'setup' CHECK (stage IN ('setup','plan','write','review','commit','completion')),
  current_chapter integer NOT NULL DEFAULT 0 CHECK (current_chapter >= 0),
  forecast_chapters integer NOT NULL DEFAULT 30 CHECK (forecast_chapters >= 1),
  max_chapters integer NOT NULL DEFAULT 1000 CHECK (max_chapters BETWEEN 1 AND 5000),
  completion_mode text NOT NULL DEFAULT 'narrative_ending'
    CHECK (completion_mode IN ('narrative_ending','hard_cap')),
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  lease_owner text,
  lease_token uuid,
  lease_until timestamptz,
  last_run_id uuid,
  failure_class text CHECK (
    failure_class IS NULL OR failure_class IN ('setup','quality','continuity','infrastructure','completion','unknown')
  ),
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.story_factory_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.story_factory_jobs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('setup','plan','write','review','commit','completion')),
  chapter_number integer NOT NULL CHECK (chapter_number >= 0),
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  status text NOT NULL CHECK (status IN ('started','passed','failed','skipped')),
  input_digest text NOT NULL,
  output_digest text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_class text CHECK (
    failure_class IS NULL OR failure_class IN ('setup','quality','continuity','infrastructure','completion','unknown')
  ),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, stage, chapter_number, attempt, status, input_digest)
);

CREATE INDEX IF NOT EXISTS idx_story_factory_jobs_claim
  ON public.story_factory_jobs(status, stage, lease_until, updated_at)
  WHERE status IN ('queued','setup','ready','writing','finale','infra_blocked');
CREATE INDEX IF NOT EXISTS idx_story_factory_checkpoints_job
  ON public.story_factory_checkpoints(job_id, created_at DESC);

ALTER TABLE public.story_factory_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_factory_checkpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS story_factory_jobs_service_all ON public.story_factory_jobs;
CREATE POLICY story_factory_jobs_service_all ON public.story_factory_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_factory_checkpoints_service_all ON public.story_factory_checkpoints;
CREATE POLICY story_factory_checkpoints_service_all ON public.story_factory_checkpoints
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.story_factory_jobs, public.story_factory_checkpoints FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.story_factory_jobs, public.story_factory_checkpoints TO service_role;

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
