-- Unblock the Story Factory production line.
--
-- Diagnosis (2026-07-31): the fleet had produced zero published chapters in 19 days
-- while 40+ engine fixes landed. The cause was not a defect in any single component
-- but the shape of the approval gate itself:
--
--   * STORY_FACTORY_RELEASE hashed nine version strings, including prompt, planner
--     and validator revisions. Almost every fix changed one of them.
--   * claim_story_factory_job required project.engine_release = the running release,
--     so every fix orphaned every in-flight job.
--   * story_factory_release_is_approved required a chain of FOUR benchmark runs, all
--     carrying that same release, with ~20 numeric thresholds including
--     samplesCompleted = 20 and finalPublishRate = 1.
--
-- The chain could therefore only ever complete if no fix was needed during a
-- multi-hour, ~$50 run: fixing whatever the benchmark caught destroyed the evidence
-- the fix was made to obtain. That is a deadlock by construction.
--
-- This migration replaces the pre-flight quality gate with a cheap mechanical smoke
-- gate, and moves quality evidence onto the hidden canary that already exists in the
-- runtime: a novel writes chapters 1-10 unpublished, window reviews run at 5 and 10,
-- and promote_story_factory_canary makes it public. That measures the real pipeline
-- on real accumulating state, and the chapters are saleable output rather than
-- discarded benchmark samples.

-- 1. Telemetry: record the engine revision (prompt/planner/validator/route versions)
--    that produced each run, now that those no longer belong to the release identity.
ALTER TABLE public.story_factory_runs
  ADD COLUMN IF NOT EXISTS engine_revision text;

COMMENT ON COLUMN public.story_factory_runs.engine_revision IS
  'Hash of prompt/planner/validator/context/memory/window-review/route versions. Telemetry for quality attribution; never gates job claiming.';

-- 2. Bounded self-healing for transient infrastructure failures.
ALTER TABLE public.story_factory_jobs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0);

COMMENT ON COLUMN public.story_factory_jobs.retry_count IS
  'Consecutive infra_blocked retries. Reset on every committed chapter. Semantic blocks (setup/plan/quality) never retry.';

-- 3. The rewrite path becomes its own stage so a single tick never has to fit
--    Writer + Editor + Rewrite + Editor inside the 300s Vercel ceiling.
ALTER TABLE public.story_factory_jobs
  DROP CONSTRAINT IF EXISTS story_factory_jobs_stage_check;
ALTER TABLE public.story_factory_jobs
  ADD CONSTRAINT story_factory_jobs_stage_check
  CHECK (stage IN ('setup', 'plan', 'write', 'revise', 'window_review', 'arc', 'cover', 'done'));

-- 4. Mechanical smoke gate replaces the four-run benchmark chain.
--
-- The gate now answers exactly one question: does the machine run end to end on this
-- release with this writer route? Editorial quality is decided by the hidden canary
-- and by window review, on real chapters.
--
-- p_benchmark_id is retained for signature compatibility and provenance but is no
-- longer required to match: a job does not need to carry a benchmark id to run.
CREATE OR REPLACE FUNCTION public.story_factory_release_is_approved(
  p_benchmark_id uuid,
  p_engine_release text,
  p_model_routes jsonb
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.story_factory_runs smoke
    WHERE smoke.kind = 'smoke'
      AND smoke.status = 'passed'
      AND smoke.error_code IS NULL
      AND smoke.engine_release = p_engine_release
      AND smoke.model_routes->'route'->>'writer' = p_model_routes->>'writer'
      AND smoke.model_routes->'route'->>'editor' = p_model_routes->>'editor'
      AND smoke.model_routes->'route'->>'planner' = p_model_routes->>'planner'
      AND COALESCE((smoke.output_artifact->>'chaptersCompleted')::integer, 0) >= 5
      AND COALESCE((smoke.output_artifact->>'criticalContinuityViolations')::integer, -1) = 0
  );
$$;

REVOKE ALL ON FUNCTION public.story_factory_release_is_approved(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.story_factory_release_is_approved(uuid, text, jsonb) TO service_role;

-- 5. Claim: restore the 30 minute lease.
--
-- 20260726091255 restored it deliberately; 20260726133707 reinstated a stale copy of
-- the function body five hours later and silently put it back to 5 minutes. A 5 minute
-- lease equals the route's maxDuration exactly, so a chapter that takes the full budget
-- has its lease expire at the moment it commits and raises FACTORY_LEASE_INVALID —
-- the chapter is written, paid for, and thrown away.
CREATE OR REPLACE FUNCTION public.claim_story_factory_job(p_worker_id text, p_engine_release text)
RETURNS SETOF public.story_factory_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE claimed_id uuid;
BEGIN
  UPDATE public.story_factory_runs run
  SET status = 'infra_blocked',
      error_code = 'infra_blocked',
      error_message = 'Run lease expired before completion.',
      finished_at = now()
  FROM public.story_factory_jobs job
  JOIN public.ai_story_projects project ON project.id = job.project_id
  JOIN public.novels novel ON novel.id = job.novel_id
  WHERE run.job_id = job.id
    AND run.status = 'running'
    AND job.status = 'writing'
    AND job.lease_until < now()
    AND project.status = 'paused'
    AND project.engine_release = p_engine_release
    AND (job.execution_mode = 'production' OR novel.hidden = true);

  SELECT job.id INTO claimed_id
  FROM public.story_factory_jobs job
  JOIN public.ai_story_projects project ON project.id = job.project_id
  JOIN public.novels novel ON novel.id = job.novel_id
  WHERE job.status IN ('setup', 'ready', 'finale', 'writing')
    AND job.next_run_at <= now()
    AND (job.lease_until IS NULL OR job.lease_until < now())
    AND project.status = 'paused'
    AND project.engine_release = p_engine_release
    AND job.current_chapter < job.maximum_chapters
    AND (job.execution_mode = 'production' OR novel.hidden = true)
    AND public.story_factory_release_is_approved(job.benchmark_run_id, p_engine_release, project.model_routes)
  ORDER BY job.next_run_at, job.created_at
  FOR UPDATE OF job SKIP LOCKED
  LIMIT 1;

  IF claimed_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  UPDATE public.story_factory_jobs job
  SET status = 'writing',
      lease_owner = p_worker_id,
      lease_token = gen_random_uuid(),
      lease_until = now() + interval '30 minutes',
      updated_at = now(),
      last_error = NULL
  WHERE job.id = claimed_id
  RETURNING job.*;
END $$;

REVOKE ALL ON FUNCTION public.claim_story_factory_job(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_story_factory_job(text, text) TO service_role;

-- 6. Reconcile requeues a stale lease instead of parking the job forever.
--
-- Previously an expired lease set status = 'infra_blocked', which is not in the
-- claimable set, so the job was unreachable until an operator intervened by hand.
-- With no operator watching, the fleet drained to zero: 12 of 12 jobs were parked.
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
  SET status = CASE WHEN retry_count >= 5 THEN 'infra_blocked' ELSE 'ready' END,
      retry_count = retry_count + 1,
      next_run_at = CASE
        WHEN retry_count >= 5 THEN next_run_at
        ELSE now() + make_interval(mins => power(2, LEAST(retry_count, 5))::integer)
      END,
      last_error = 'Worker lease expired.',
      lease_owner = NULL,
      lease_token = NULL,
      lease_until = NULL,
      updated_at = now()
  WHERE status = 'writing' AND lease_until < now() - make_interval(mins => p_stale_minutes);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

REVOKE ALL ON FUNCTION public.reconcile_story_factory_jobs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_story_factory_jobs(integer) TO service_role;

-- 7. Commit resets the retry budget: a chapter that lands proves the job is healthy.
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
  p_attempt_telemetry jsonb,
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
DECLARE remaining_plan_count integer := jsonb_array_length(COALESCE(p_remaining_plan->'plans', '[]'::jsonb));
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
  IF (p_state_after->>'schemaVersion')::integer <> 2 THEN RAISE EXCEPTION 'FACTORY_STATE_VERSION_MISMATCH'; END IF;
  IF (p_state_after->>'chapterNumber')::integer <> p_expected_chapter THEN RAISE EXCEPTION 'FACTORY_STATE_SEQUENCE_MISMATCH'; END IF;
  IF jsonb_array_length(COALESCE(p_state_after->'recentOutcomes', '[]'::jsonb)) < 1 THEN
    RAISE EXCEPTION 'FACTORY_CHAPTER_OUTCOME_MISSING';
  END IF;
  IF (p_state_after->'recentOutcomes'->-1->>'chapterNumber')::integer <> p_expected_chapter THEN
    RAISE EXCEPTION 'FACTORY_CHAPTER_OUTCOME_SEQUENCE_MISMATCH';
  END IF;
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
      plan_feedback = NULL,
      replan_attempts = 0,
      retry_count = 0,
      status = 'ready',
      stage = CASE
        WHEN p_expected_chapter % 5 = 0 THEN 'window_review'
        WHEN remaining_plan_count = 0 THEN 'plan'
        ELSE 'write'
      END,
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
  SET status = 'published',
      output_artifact = jsonb_build_object(
        'title', p_title,
        'stateAfter', p_state_after,
        'attemptTelemetry', p_attempt_telemetry
      ),
      editor_assessment = p_assessment,
      context_manifest = p_context_manifest,
      usage = p_usage,
      estimated_cost_usd = p_cost_usd,
      word_count = p_word_count,
      revision_count = p_revision_count,
      draft_attempts = 1 + p_revision_count,
      first_pass = (p_revision_count = 0),
      published_after_rewrite = (p_revision_count = 1),
      error_code = NULL,
      error_message = NULL,
      finished_at = now()
  WHERE id = p_run_id AND job_id = p_job_id AND status = 'running';
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_RUN_NOT_RUNNING'; END IF;

  RETURN jsonb_build_object('chapterNumber', p_expected_chapter, 'status', 'published');
END $$;

REVOKE ALL ON FUNCTION public.commit_story_factory_chapter(
  uuid, uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb,
  jsonb, jsonb, numeric, integer, integer, jsonb, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_story_factory_chapter(
  uuid, uuid, uuid, integer, text, text, jsonb, jsonb, jsonb, jsonb,
  jsonb, jsonb, numeric, integer, integer, jsonb, text
) TO service_role;

-- 8. Promotion keeps the two cheap, real signals and drops the benchmark cross-checks
--    that the smoke gate no longer produces.
CREATE OR REPLACE FUNCTION public.promote_story_factory_canary(p_job_id uuid, p_engine_release text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  job public.story_factory_jobs;
  project public.ai_story_projects;
  cover text;
  latest_review_status text;
  latest_review_release text;
  setup_digest text;
BEGIN
  SELECT * INTO job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF job.id IS NULL OR job.execution_mode <> 'hidden_canary' OR job.current_chapter < 10 THEN
    RAISE EXCEPTION 'FACTORY_CANARY_NOT_READY';
  END IF;
  IF job.launch_pack_digest IS NULL THEN
    RAISE EXCEPTION 'FACTORY_CANARY_PROVENANCE_REQUIRED';
  END IF;

  SELECT * INTO project FROM public.ai_story_projects WHERE id = job.project_id;
  IF project.engine_release IS DISTINCT FROM p_engine_release THEN
    RAISE EXCEPTION 'FACTORY_RELEASE_MISMATCH';
  END IF;

  SELECT output_artifact->>'launchPackDigest' INTO setup_digest
  FROM public.story_factory_runs
  WHERE job_id = p_job_id
    AND kind = 'setup'
    AND status = 'passed'
    AND error_code IS NULL
    AND engine_release = p_engine_release
  ORDER BY finished_at DESC NULLS LAST, started_at DESC
  LIMIT 1;
  IF setup_digest IS DISTINCT FROM job.launch_pack_digest THEN
    RAISE EXCEPTION 'FACTORY_LAUNCH_PACK_DIGEST_MISMATCH';
  END IF;

  SELECT status, engine_release INTO latest_review_status, latest_review_release
  FROM public.story_factory_runs
  WHERE job_id = p_job_id
    AND kind = 'window_review'
    AND chapter_number = 10
  ORDER BY finished_at DESC NULLS LAST, started_at DESC
  LIMIT 1;
  IF latest_review_status IS DISTINCT FROM 'passed'
    OR latest_review_release IS DISTINCT FROM p_engine_release
  THEN
    RAISE EXCEPTION 'FACTORY_LATEST_WINDOW_REVIEW_REQUIRED';
  END IF;

  SELECT cover_url INTO cover FROM public.novels WHERE id = job.novel_id;
  IF cover IS NULL OR length(trim(cover)) = 0 THEN RAISE EXCEPTION 'FACTORY_COVER_REQUIRED'; END IF;

  UPDATE public.novels SET hidden = false, status = 'Đang ra', updated_at = now() WHERE id = job.novel_id;
  UPDATE public.story_factory_jobs SET execution_mode = 'production', updated_at = now() WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'jobId', p_job_id,
    'executionMode', 'production',
    'visible', true,
    'launchPackDigest', job.launch_pack_digest,
    'reviewRelease', latest_review_release
  );
END $$;

REVOKE ALL ON FUNCTION public.promote_story_factory_canary(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_story_factory_canary(uuid, text) TO service_role;
