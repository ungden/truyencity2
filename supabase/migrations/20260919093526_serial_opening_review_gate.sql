-- A serial needs two distinct human decisions:
--   1. the premise is worth spending on;
--   2. the four generated opening chapters are worth letting the runtime continue.
-- The original schema had only the first decision, despite the product contract saying
-- premise + four golden chapters. This migration makes the second gate atomic with the
-- chapter-four commit, so a cron cannot claim chapter five between two updates.
BEGIN;

SET lock_timeout = '5s';

ALTER TABLE public.serial_novels
  ADD COLUMN IF NOT EXISTS opening_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS opening_reviewed_by text;

ALTER TABLE public.serial_jobs DROP CONSTRAINT IF EXISTS serial_jobs_status_check;
ALTER TABLE public.serial_jobs ADD CONSTRAINT serial_jobs_status_check
  CHECK (status IN ('awaiting_approval', 'ready', 'running', 'opening_review', 'paused', 'completed'));

-- Defense in depth: even if an operator or old client accidentally puts a chapter-four
-- job back in `ready`, the claim itself still requires the opening review timestamp.
CREATE OR REPLACE FUNCTION public.claim_serial_job(
  p_owner text, p_lease_minutes integer DEFAULT 15, p_route_version text DEFAULT NULL
) RETURNS public.serial_jobs
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.serial_jobs; v_local_date date := timezone('Asia/Ho_Chi_Minh', now())::date;
BEGIN
  SELECT j.* INTO v_job FROM public.serial_jobs j
  JOIN public.serial_novels n ON n.id = j.serial_novel_id
  WHERE j.status = 'ready'
    AND j.next_run_at <= now()
    AND n.approved_at IS NOT NULL
    AND (j.current_chapter < 4 OR n.opening_reviewed_at IS NOT NULL)
    AND (p_route_version IS NULL OR n.route_version = p_route_version)
    AND (j.stage <> 'write' OR j.quota_date IS DISTINCT FROM v_local_date OR j.chapters_today < j.daily_target)
  ORDER BY j.next_run_at
  FOR UPDATE OF j SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  UPDATE public.serial_jobs SET
    status = 'running',
    lease_owner = p_owner,
    lease_token = gen_random_uuid(),
    lease_until = now() + make_interval(mins => p_lease_minutes),
    updated_at = now()
  WHERE id = v_job.id
  RETURNING * INTO v_job;
  RETURN v_job;
END $$;

CREATE OR REPLACE FUNCTION public.commit_serial_chapter(
  p_job_id uuid, p_lease_token uuid, p_run_id uuid, p_expected_chapter integer,
  p_title text, p_content text, p_bible jsonb, p_verdict jsonb, p_digest jsonb,
  p_scorecard_avg numeric, p_usage jsonb, p_cost_usd numeric, p_attempts integer,
  p_next_stage text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.serial_jobs;
  v_local_date date := timezone('Asia/Ho_Chi_Minh', now())::date;
  v_today integer;
  v_needs_opening_review boolean := false;
  v_next_status text;
BEGIN
  SELECT * INTO v_job FROM public.serial_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until < now() THEN
    RAISE EXCEPTION 'SERIAL_LEASE_INVALID';
  END IF;
  IF v_job.current_chapter + 1 <> p_expected_chapter THEN
    RAISE EXCEPTION 'SERIAL_CHAPTER_SEQUENCE_MISMATCH';
  END IF;
  IF EXISTS (SELECT 1 FROM public.chapters WHERE novel_id = v_job.novel_id AND chapter_number = p_expected_chapter) THEN
    RAISE EXCEPTION 'SERIAL_CHAPTER_ALREADY_EXISTS';
  END IF;

  INSERT INTO public.chapters (novel_id, chapter_number, title, content, publication_state)
  VALUES (v_job.novel_id, p_expected_chapter, p_title, p_content, 'draft');

  UPDATE public.serial_novels SET bible = p_bible, updated_at = now() WHERE id = v_job.serial_novel_id;

  UPDATE public.serial_runs SET
    status = 'committed', chapter_number = p_expected_chapter, attempts = p_attempts,
    verdict = p_verdict, digest = p_digest, scorecard_avg = p_scorecard_avg,
    usage = p_usage, cost_usd = p_cost_usd, finished_at = now()
  WHERE id = p_run_id AND serial_novel_id = v_job.serial_novel_id AND status = 'running';
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_RUN_NOT_RUNNING'; END IF;

  IF p_expected_chapter = 4 THEN
    SELECT opening_reviewed_at IS NULL INTO v_needs_opening_review
    FROM public.serial_novels WHERE id = v_job.serial_novel_id;
  END IF;
  v_next_status := CASE WHEN v_needs_opening_review THEN 'opening_review' ELSE 'ready' END;

  v_today := CASE WHEN v_job.quota_date = v_local_date THEN v_job.chapters_today + 1 ELSE 1 END;

  UPDATE public.serial_jobs SET
    current_chapter = p_expected_chapter,
    stage = p_next_stage,
    status = v_next_status,
    chapters_today = v_today,
    quota_date = v_local_date,
    consecutive_replans = 0,
    retry_count = 0,
    last_error = NULL,
    lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    next_run_at = now(),
    updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'chapterNumber', p_expected_chapter,
    'publication', 'draft',
    'chaptersToday', v_today,
    'status', v_next_status,
    'needsOpeningReview', v_needs_opening_review
  );
END $$;

REVOKE ALL ON FUNCTION public.commit_serial_chapter(
  uuid,uuid,uuid,integer,text,text,jsonb,jsonb,jsonb,numeric,jsonb,numeric,integer,text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_serial_chapter(
  uuid,uuid,uuid,integer,text,text,jsonb,jsonb,jsonb,numeric,jsonb,numeric,integer,text
) TO service_role;

REVOKE ALL ON FUNCTION public.claim_serial_job(text,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_serial_job(text,integer,text) TO service_role;

COMMIT;
