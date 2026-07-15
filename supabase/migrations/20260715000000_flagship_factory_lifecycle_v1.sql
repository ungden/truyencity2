-- Flagship auto-factory control plane.
-- This is intentionally separate from the legacy production_queue and from
-- ai_story_projects.setup_stage.  No legacy project can enter these tables.

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
  completion_mode text NOT NULL DEFAULT 'narrative_ending' CHECK (completion_mode IN ('narrative_ending','hard_cap')),
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  lease_owner text,
  lease_token uuid,
  lease_until timestamptz,
  last_run_id uuid,
  failure_class text CHECK (failure_class IS NULL OR failure_class IN ('setup','quality','continuity','infrastructure','completion','unknown')),
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
  failure_class text CHECK (failure_class IS NULL OR failure_class IN ('setup','quality','continuity','infrastructure','completion','unknown')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, stage, chapter_number, attempt, status, input_digest)
);

CREATE INDEX IF NOT EXISTS idx_story_factory_jobs_claim
  ON public.story_factory_jobs(status, stage, lease_until, updated_at)
  WHERE status IN ('queued','setup','ready','writing','finale','infra_blocked');
CREATE INDEX IF NOT EXISTS idx_story_factory_checkpoints_job
  ON public.story_factory_checkpoints(job_id, created_at DESC);

ALTER TABLE public.story_factory_jobs ALTER COLUMN max_chapters SET DEFAULT 1000;

ALTER TABLE public.story_factory_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_factory_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_factory_jobs, public.story_factory_checkpoints FROM anon, authenticated;
GRANT ALL ON public.story_factory_jobs, public.story_factory_checkpoints TO service_role;
DROP POLICY IF EXISTS story_factory_jobs_service_all ON public.story_factory_jobs;
CREATE POLICY story_factory_jobs_service_all ON public.story_factory_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_factory_checkpoints_service_all ON public.story_factory_checkpoints;
CREATE POLICY story_factory_checkpoints_service_all ON public.story_factory_checkpoints FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enrolment is the only way to create a job. It requires an explicit flagship
-- factory opt-in and never changes a legacy project or invents setup artifacts.
CREATE OR REPLACE FUNCTION public.enroll_flagship_factory_job(
  p_project_id uuid,
  p_max_chapters integer DEFAULT 1000,
  p_completion_mode text DEFAULT 'narrative_ending'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_project record;
  v_job public.story_factory_jobs;
BEGIN
  SELECT id, novel_id, status, COALESCE(current_chapter,0) AS current_chapter,
         style_directives, flagship_setup_status
    INTO v_project
  FROM public.ai_story_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_PROJECT_NOT_FOUND'; END IF;
  IF v_project.style_directives->>'pipeline_version' IS DISTINCT FROM 'flagship_v2' THEN
    RAISE EXCEPTION 'FACTORY_PIPELINE_MISMATCH';
  END IF;
  IF v_project.style_directives->>'factory_enabled' IS DISTINCT FROM 'true'
     OR v_project.style_directives->>'publication_mode' IS DISTINCT FROM 'automatic' THEN
    RAISE EXCEPTION 'FACTORY_OPT_IN_REQUIRED';
  END IF;
  IF v_project.flagship_setup_status = 'rejected' THEN RAISE EXCEPTION 'FACTORY_SETUP_REJECTED'; END IF;
  IF p_max_chapters < 1 OR p_max_chapters > 5000 THEN RAISE EXCEPTION 'FACTORY_MAX_CHAPTERS_INVALID'; END IF;
  IF p_completion_mode NOT IN ('narrative_ending','hard_cap') THEN RAISE EXCEPTION 'FACTORY_COMPLETION_MODE_INVALID'; END IF;
  INSERT INTO public.story_factory_jobs (project_id, novel_id, status, stage, current_chapter, max_chapters, completion_mode)
  VALUES (v_project.id, v_project.novel_id, 'queued', 'setup', v_project.current_chapter, p_max_chapters, p_completion_mode)
  ON CONFLICT (project_id) DO UPDATE SET updated_at = now()
  RETURNING * INTO v_job;
  RETURN jsonb_build_object('enrolled', true, 'job_id', v_job.id, 'status', v_job.status, 'stage', v_job.stage);
END;
$$;

-- Claim uses row locks and a lease so thousands of independent stories can be
-- processed by many workers without duplicate chapter work.
CREATE OR REPLACE FUNCTION public.claim_flagship_factory_job(
  p_worker_id text,
  p_lease_seconds integer DEFAULT 900
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.story_factory_jobs;
  v_token uuid := gen_random_uuid();
BEGIN
  IF length(trim(COALESCE(p_worker_id,''))) < 2 OR p_lease_seconds NOT BETWEEN 60 AND 3600 THEN
    RAISE EXCEPTION 'FACTORY_CLAIM_ARGUMENT_INVALID';
  END IF;
  SELECT j.* INTO v_job FROM public.story_factory_jobs j
  JOIN public.ai_story_projects p ON p.id = j.project_id
  WHERE j.status IN ('queued','setup','ready','writing','finale','infra_blocked')
    AND (j.lease_until IS NULL OR j.lease_until < now())
    AND p.style_directives->>'pipeline_version' = 'flagship_v2'
    AND p.style_directives->>'factory_enabled' = 'true'
    AND p.style_directives->>'publication_mode' = 'automatic'
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

CREATE OR REPLACE FUNCTION public.advance_flagship_factory_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_expected_status text,
  p_next_status text,
  p_next_stage text,
  p_chapter_number integer,
  p_checkpoint_status text DEFAULT 'passed',
  p_input_digest text DEFAULT '',
  p_output_digest text DEFAULT NULL,
  p_evidence jsonb DEFAULT '[]'::jsonb,
  p_failure_class text DEFAULT NULL,
  p_error_message text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.story_factory_jobs;
BEGIN
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_JOB_NOT_FOUND'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.ai_story_projects p
    WHERE p.id = v_job.project_id
      AND p.style_directives->>'pipeline_version' = 'flagship_v2'
      AND p.style_directives->>'factory_enabled' = 'true'
      AND p.style_directives->>'publication_mode' = 'automatic'
  ) THEN RAISE EXCEPTION 'FACTORY_OPT_IN_REVOKED'; END IF;
  IF v_job.status IS DISTINCT FROM p_expected_status OR v_job.lease_token IS DISTINCT FROM p_lease_token
     OR v_job.lease_until IS NULL OR v_job.lease_until < now() THEN RAISE EXCEPTION 'FACTORY_LEASE_OR_STATE_MISMATCH'; END IF;
  IF p_next_status NOT IN ('queued','setup','ready','writing','finale','blocked','infra_blocked','completed','cancelled')
     OR p_next_stage NOT IN ('setup','plan','write','review','commit','completion') THEN RAISE EXCEPTION 'FACTORY_NEXT_STATE_INVALID'; END IF;
  IF p_checkpoint_status NOT IN ('started','passed','failed','skipped') THEN RAISE EXCEPTION 'FACTORY_CHECKPOINT_STATUS_INVALID'; END IF;
  IF length(trim(COALESCE(p_input_digest,''))) < 8 THEN RAISE EXCEPTION 'FACTORY_INPUT_DIGEST_REQUIRED'; END IF;
  IF NOT (
    (v_job.status = 'queued' AND p_next_status IN ('setup','cancelled')) OR
    (v_job.status = 'setup' AND p_next_status IN ('setup','ready','blocked','infra_blocked','cancelled')) OR
    (v_job.status = 'ready' AND p_next_status IN ('writing','cancelled')) OR
    (v_job.status = 'writing' AND p_next_status IN ('writing','ready','finale','completed','blocked','infra_blocked')) OR
    (v_job.status = 'finale' AND p_next_status IN ('writing','completed','blocked','infra_blocked')) OR
    (v_job.status = 'blocked' AND p_next_status IN ('setup','ready','writing','cancelled')) OR
    (v_job.status = 'infra_blocked' AND p_next_status IN ('infra_blocked','queued','setup','ready','writing','cancelled'))
  ) THEN RAISE EXCEPTION 'FACTORY_INVALID_TRANSITION'; END IF;
  INSERT INTO public.story_factory_checkpoints(job_id, project_id, stage, chapter_number, attempt, status, input_digest, output_digest, evidence, failure_class, error_message)
  VALUES (v_job.id, v_job.project_id, p_next_stage, p_chapter_number, v_job.attempt, p_checkpoint_status, NULLIF(p_input_digest,''), p_output_digest, COALESCE(p_evidence,'[]'::jsonb), p_failure_class, p_error_message);
  UPDATE public.story_factory_jobs SET status = p_next_status, stage = p_next_stage,
    current_chapter = GREATEST(current_chapter, p_chapter_number), lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    failure_class = p_failure_class, last_error = p_error_message, completed_at = CASE WHEN p_next_status = 'completed' THEN now() ELSE completed_at END,
    updated_at = now() WHERE id = v_job.id RETURNING * INTO v_job;
  RETURN to_jsonb(v_job);
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_flagship_factory_job(uuid,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_flagship_factory_job(text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_flagship_factory_job(uuid,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_flagship_factory_job(text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_flagship_factory_job(uuid,uuid,text,text,text,integer,text,text,text,jsonb,text,text) TO service_role;
