-- Canonical Story Factory clean break.
-- This migration is intentionally destructive to legacy writing data. It is
-- fail-closed until a verified audit bundle and checksum exist in the private
-- factory-audit bucket.

SET lock_timeout = '10s';
SET statement_timeout = '120s';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'factory-audit' AND public = false
  ) OR NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'factory-audit' AND name LIKE 'exports/%.jsonl.gz'
  ) OR NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'factory-audit' AND name LIKE 'exports/%.jsonl.gz.sha256'
  ) THEN
    RAISE EXCEPTION 'FACTORY_AUDIT_BUNDLE_REQUIRED';
  END IF;
END $$;

DO $$
DECLARE job record;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN RETURN; END IF;
  FOR job IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('write-chapters-cron', 'flagship-factory-cron')
       OR command LIKE '%/api/cron/write-chapters%'
       OR command LIKE '%/api/cron/flagship-factory%'
  LOOP
    PERFORM cron.unschedule(job.jobid);
  END LOOP;
END $$;

CREATE TEMP TABLE factory_old_novels ON COMMIT DROP AS
SELECT DISTINCT novel_id FROM public.ai_story_projects WHERE novel_id IS NOT NULL;

-- Drop every table whose purpose was tied to the old project graph. All of
-- these are writing/control-plane tables; reader tables reference novels, not
-- ai_story_projects.
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT DISTINCT child.relname AS table_name
    FROM pg_constraint constraint_row
    JOIN pg_class parent ON parent.oid = constraint_row.confrelid
    JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
    JOIN pg_class child ON child.oid = constraint_row.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    WHERE constraint_row.contype = 'f'
      AND parent_ns.nspname = 'public'
      AND parent.relname = 'ai_story_projects'
      AND child_ns.nspname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', item.table_name);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.story_benchmark_chapters CASCADE;
DROP TABLE IF EXISTS public.story_calibration_ballots_v3 CASCADE;
DROP TABLE IF EXISTS public.story_calibration_campaigns_v3 CASCADE;
DROP TABLE IF EXISTS public.story_calibration_samples_v3 CASCADE;
DROP TABLE IF EXISTS public.story_factory_calibrations CASCADE;
DROP TABLE IF EXISTS public.story_machine_judgments_v3 CASCADE;
DROP TABLE IF EXISTS public.story_setup_attempts_v3 CASCADE;
DROP TABLE IF EXISTS public.story_synopsis CASCADE;
DROP TABLE IF EXISTS public.story_themes CASCADE;
DROP TABLE IF EXISTS public.ai_prompt_templates CASCADE;
DROP TABLE IF EXISTS public.chapter_versions CASCADE;
DROP TABLE IF EXISTS public.rewrite_chain_items CASCADE;

DELETE FROM public.novels WHERE id IN (SELECT novel_id FROM factory_old_novels);
DROP TABLE IF EXISTS public.ai_story_projects CASCADE;

-- Remove old functions and views that may survive because SQL-language bodies
-- are not always dependency tracked.
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT procedure.proname AS function_name,
           pg_get_function_identity_arguments(procedure.oid) AS identity_arguments
    FROM pg_proc procedure
    JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND (
        procedure.proname ILIKE '%flagship%'
        OR procedure.proname ILIKE '%story_factory%'
        OR procedure.proname ILIKE '%story_run%'
        OR procedure.proname IN (
          'archive_old_rag_chunks', 'auto_create_plot_arc', 'can_use_beat',
          'check_abandoned_threads', 'check_romance_stalls', 'generate_arc_summary',
          'get_active_plot_threads', 'get_battle_variety_report', 'get_cache_hit_rate',
          'get_chapter_costs', 'get_character_state', 'get_characters_needing_development',
          'get_cost_by_task', 'get_daily_cost', 'get_novel_cost_detail',
          'get_novel_costs', 'get_novel_costs_with_engagement', 'get_qc_pass_rate',
          'get_writing_style_trends', 'guard_finished_story_chapter_attempt_v3',
          'guard_story_launch_pack_v3', 'match_anchor_chunks', 'match_story_chunks',
          'search_story_context', 'update_embedding_cache_timestamp',
          'update_plot_thread_timestamp', 'update_rewrite_chain_updated_at',
          'upgrade_hidden_canary_release_v3'
        )
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', item.function_name, item.identity_arguments);
  END LOOP;
END $$;

DROP VIEW IF EXISTS public.factory_story_status_v3 CASCADE;

CREATE TABLE public.ai_story_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  novel_id uuid NOT NULL UNIQUE REFERENCES public.novels(id) ON DELETE CASCADE,
  main_character text,
  genre text NOT NULL,
  status text NOT NULL DEFAULT 'paused' CHECK (status = 'paused'),
  current_chapter integer NOT NULL DEFAULT 0 CHECK (current_chapter >= 0),
  story_kernel jsonb,
  arc_plan jsonb,
  story_state jsonb,
  engine_release text NOT NULL,
  model_routes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.story_factory_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL UNIQUE REFERENCES public.novels(id) ON DELETE CASCADE,
  execution_mode text NOT NULL DEFAULT 'hidden_canary' CHECK (execution_mode IN ('hidden_canary', 'production')),
  status text NOT NULL DEFAULT 'setup' CHECK (status IN (
    'setup', 'ready', 'writing', 'setup_blocked', 'plan_blocked',
    'quality_blocked', 'infra_blocked', 'finale', 'completed', 'cancelled'
  )),
  stage text NOT NULL DEFAULT 'setup' CHECK (stage IN ('setup', 'plan', 'write', 'window_review', 'arc', 'cover', 'done')),
  current_chapter integer NOT NULL DEFAULT 0 CHECK (current_chapter >= 0),
  rolling_plan jsonb,
  setup_input jsonb,
  daily_target integer NOT NULL DEFAULT 5 CHECK (daily_target BETWEEN 1 AND 30),
  chapters_today integer NOT NULL DEFAULT 0 CHECK (chapters_today >= 0),
  quota_date date NOT NULL DEFAULT (timezone('Asia/Ho_Chi_Minh', now()))::date,
  minimum_chapters integer NOT NULL DEFAULT 800 CHECK (minimum_chapters BETWEEN 1 AND 1200),
  maximum_chapters integer NOT NULL DEFAULT 1200 CHECK (maximum_chapters BETWEEN 1 AND 1200),
  next_run_at timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  lease_token uuid,
  lease_until timestamptz,
  last_run_id uuid,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (minimum_chapters <= maximum_chapters)
);

CREATE TABLE public.story_factory_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.story_factory_jobs(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id uuid REFERENCES public.novels(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('setup', 'plan', 'chapter', 'arc', 'window_review', 'cover', 'benchmark', 'smoke')),
  chapter_number integer,
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'passed', 'published', 'blocked', 'infra_blocked', 'failed')),
  engine_release text NOT NULL,
  model_routes jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_artifact jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_artifact jsonb NOT NULL DEFAULT '{}'::jsonb,
  editor_assessment jsonb,
  context_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_cost_usd numeric NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  word_count integer,
  revision_count integer NOT NULL DEFAULT 0 CHECK (revision_count BETWEEN 0 AND 1),
  error_code text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE public.story_state_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL CHECK (chapter_number > 0),
  delta_id text NOT NULL,
  kind text NOT NULL,
  entity_id text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, chapter_number, delta_id)
);

ALTER TABLE public.story_factory_jobs
  ADD CONSTRAINT story_factory_jobs_last_run_id_fkey
  FOREIGN KEY (last_run_id) REFERENCES public.story_factory_runs(id) ON DELETE SET NULL;

CREATE INDEX story_factory_jobs_claim_idx ON public.story_factory_jobs(status, next_run_at, lease_until);
CREATE INDEX story_factory_runs_project_idx ON public.story_factory_runs(project_id, started_at DESC);
CREATE INDEX story_factory_runs_release_idx ON public.story_factory_runs(engine_release, kind, status);
CREATE INDEX story_state_events_project_chapter_idx ON public.story_state_events(project_id, chapter_number);

ALTER TABLE public.ai_story_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_factory_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_factory_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_state_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_story_projects_service_only ON public.ai_story_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY story_factory_jobs_service_only ON public.story_factory_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY story_factory_runs_service_only ON public.story_factory_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY story_state_events_service_only ON public.story_state_events FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.ai_story_projects, public.story_factory_jobs, public.story_factory_runs, public.story_state_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_story_projects, public.story_factory_jobs, public.story_factory_runs, public.story_state_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.story_state_events_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.claim_story_factory_job(p_worker_id text, p_engine_release text)
RETURNS SETOF public.story_factory_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE claimed_id uuid;
BEGIN
  SELECT job.id INTO claimed_id
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
    AND (
      job.stage = 'setup'
      OR EXISTS (
        SELECT 1 FROM public.story_factory_runs benchmark
        WHERE benchmark.kind = 'benchmark'
          AND benchmark.status = 'passed'
          AND benchmark.engine_release = p_engine_release
      )
    )
  ORDER BY job.next_run_at, job.created_at
  FOR UPDATE OF job SKIP LOCKED
  LIMIT 1;

  IF claimed_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  UPDATE public.story_factory_jobs job
  SET status = 'writing', lease_owner = p_worker_id, lease_token = gen_random_uuid(),
      lease_until = now() + interval '5 minutes', updated_at = now(), last_error = NULL
  WHERE job.id = claimed_id
  RETURNING job.*;
END $$;

CREATE OR REPLACE FUNCTION public.commit_story_factory_chapter(
  p_job_id uuid,
  p_lease_token uuid,
  p_run_id uuid,
  p_expected_chapter integer,
  p_title text,
  p_content text,
  p_state_after jsonb,
  p_remaining_plan jsonb,
  p_events jsonb,
  p_assessment jsonb,
  p_context_manifest jsonb,
  p_usage jsonb,
  p_cost_usd numeric,
  p_word_count integer,
  p_revision_count integer,
  p_engine_release text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE job public.story_factory_jobs;
DECLARE project public.ai_story_projects;
DECLARE event jsonb;
DECLARE local_date date := (timezone('Asia/Ho_Chi_Minh', now()))::date;
DECLARE new_today integer;
BEGIN
  SELECT * INTO job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF job.id IS NULL OR job.lease_token IS DISTINCT FROM p_lease_token OR job.lease_until < now() THEN
    RAISE EXCEPTION 'FACTORY_LEASE_INVALID';
  END IF;
  SELECT * INTO project FROM public.ai_story_projects WHERE id = job.project_id FOR UPDATE;
  IF project.engine_release IS DISTINCT FROM p_engine_release THEN RAISE EXCEPTION 'FACTORY_RELEASE_MISMATCH'; END IF;
  IF job.current_chapter + 1 <> p_expected_chapter OR project.current_chapter + 1 <> p_expected_chapter THEN
    RAISE EXCEPTION 'FACTORY_CHAPTER_SEQUENCE_MISMATCH';
  END IF;
  IF (p_state_after->>'chapterNumber')::integer <> p_expected_chapter THEN RAISE EXCEPTION 'FACTORY_STATE_SEQUENCE_MISMATCH'; END IF;
  IF EXISTS (SELECT 1 FROM public.chapters WHERE novel_id = job.novel_id AND chapter_number = p_expected_chapter) THEN
    RAISE EXCEPTION 'FACTORY_CHAPTER_ALREADY_EXISTS';
  END IF;

  INSERT INTO public.chapters(novel_id, chapter_number, title, content, quality_score)
  VALUES (job.novel_id, p_expected_chapter, p_title, p_content, NULL);

  FOR event IN SELECT value FROM jsonb_array_elements(p_events)
  LOOP
    INSERT INTO public.story_state_events(
      project_id, chapter_number, delta_id, kind, entity_id, before_value, after_value, source
    ) VALUES (
      job.project_id, p_expected_chapter, event->>'deltaId', event->>'kind', event->>'entityId',
      event->'before', event->'after', NULLIF(event->>'source', '')
    );
  END LOOP;

  UPDATE public.ai_story_projects
  SET story_state = p_state_after, current_chapter = p_expected_chapter, updated_at = now()
  WHERE id = job.project_id;

  UPDATE public.novels
  SET chapter_count = p_expected_chapter, total_chapters = GREATEST(total_chapters, p_expected_chapter), updated_at = now()
  WHERE id = job.novel_id;

  new_today := CASE WHEN job.quota_date = local_date THEN job.chapters_today + 1 ELSE 1 END;
  UPDATE public.story_factory_jobs
  SET current_chapter = p_expected_chapter,
      rolling_plan = p_remaining_plan,
      status = 'ready',
      stage = CASE WHEN p_expected_chapter % 10 = 0 THEN 'window_review' ELSE 'write' END,
      chapters_today = new_today,
      quota_date = local_date,
      next_run_at = CASE
        WHEN new_today >= job.daily_target THEN ((local_date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ELSE now()
      END,
      lease_owner = NULL, lease_token = NULL, lease_until = NULL,
      last_run_id = p_run_id, updated_at = now()
  WHERE id = p_job_id;

  UPDATE public.story_factory_runs
  SET status = 'published', output_artifact = jsonb_build_object('title', p_title, 'stateAfter', p_state_after),
      editor_assessment = p_assessment, context_manifest = p_context_manifest, usage = p_usage,
      estimated_cost_usd = p_cost_usd, word_count = p_word_count, revision_count = p_revision_count,
      finished_at = now()
  WHERE id = p_run_id AND job_id = p_job_id AND status = 'running';
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_RUN_NOT_RUNNING'; END IF;

  RETURN jsonb_build_object('chapterNumber', p_expected_chapter, 'status', 'published');
END $$;

CREATE OR REPLACE FUNCTION public.reconcile_story_factory_jobs(p_stale_minutes integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.story_factory_runs run
  SET status = 'infra_blocked', error_code = 'stale_lease', error_message = 'Worker lease expired.', finished_at = now()
  FROM public.story_factory_jobs job
  WHERE run.id = job.last_run_id AND run.status = 'running'
    AND job.status = 'writing' AND job.lease_until < now() - make_interval(mins => p_stale_minutes);

  UPDATE public.story_factory_jobs
  SET status = 'infra_blocked', last_error = 'Worker lease expired.', lease_owner = NULL,
      lease_token = NULL, lease_until = NULL, updated_at = now()
  WHERE status = 'writing' AND lease_until < now() - make_interval(mins => p_stale_minutes);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

CREATE OR REPLACE FUNCTION public.promote_story_factory_canary(p_job_id uuid, p_engine_release text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE job public.story_factory_jobs;
DECLARE cover text;
BEGIN
  SELECT * INTO job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF job.id IS NULL OR job.execution_mode <> 'hidden_canary' OR job.current_chapter < 10 THEN
    RAISE EXCEPTION 'FACTORY_CANARY_NOT_READY';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.story_factory_runs
    WHERE job_id = p_job_id AND kind = 'window_review' AND chapter_number = 10
      AND status = 'passed' AND engine_release = p_engine_release
  ) THEN RAISE EXCEPTION 'FACTORY_WINDOW_REVIEW_REQUIRED'; END IF;
  SELECT cover_url INTO cover FROM public.novels WHERE id = job.novel_id;
  IF cover IS NULL OR length(trim(cover)) = 0 THEN RAISE EXCEPTION 'FACTORY_COVER_REQUIRED'; END IF;

  UPDATE public.novels SET hidden = false, updated_at = now() WHERE id = job.novel_id;
  UPDATE public.story_factory_jobs SET execution_mode = 'production', updated_at = now() WHERE id = p_job_id;
  RETURN jsonb_build_object('jobId', p_job_id, 'executionMode', 'production', 'visible', true);
END $$;

REVOKE ALL ON FUNCTION public.claim_story_factory_job(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_story_factory_chapter(uuid, uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, numeric, integer, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_story_factory_jobs(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_story_factory_canary(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_story_factory_job(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_story_factory_chapter(uuid, uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, numeric, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_story_factory_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_story_factory_canary(uuid, text) TO service_role;
