-- Complete the human launch workflow around the serial engine:
--   * a failed private opening can be restarted atomically;
--   * releasing a novel is an explicit, fail-closed decision;
--   * an automatic replan reuses its cycle number instead of accidentally opening
--     the next numbered cycle at the same chapter.
BEGIN;

SET lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.replan_serial_cycle(
  p_job_id uuid, p_lease_token uuid, p_cycle_id uuid, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.serial_jobs; v_cycle public.serial_cycles;
BEGIN
  SELECT * INTO v_job FROM public.serial_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until < now() THEN
    RAISE EXCEPTION 'SERIAL_LEASE_INVALID';
  END IF;

  SELECT * INTO v_cycle FROM public.serial_cycles
  WHERE id = p_cycle_id AND serial_novel_id = v_job.serial_novel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_CYCLE_MISSING'; END IF;
  IF v_cycle.status = 'published' THEN RAISE EXCEPTION 'SERIAL_CYCLE_ALREADY_PUBLISHED'; END IF;

  DELETE FROM public.chapters
  WHERE novel_id = v_job.novel_id AND publication_state = 'draft'
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;

  UPDATE public.serial_novels SET bible = v_cycle.checkpoint_bible, updated_at = now()
  WHERE id = v_job.serial_novel_id;

  -- Keep this row as the open cycle. stagePlanCycle sees current_cycle_id and replaces
  -- its rolling plan in place, preserving the same cycle number and checkpoint.
  UPDATE public.serial_cycles SET
    status = 'writing', replan_count = replan_count + 1, updated_at = now()
  WHERE id = v_cycle.id;

  UPDATE public.serial_runs SET status = 'replanned', error = p_reason, finished_at = now()
  WHERE serial_novel_id = v_job.serial_novel_id AND status IN ('running', 'committed')
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;

  UPDATE public.serial_jobs SET
    current_chapter = v_cycle.start_chapter - 1,
    stage = 'plan_cycle',
    status = CASE WHEN v_cycle.replan_count + 1 >= 2 THEN 'paused' ELSE 'ready' END,
    current_cycle_id = v_cycle.id,
    consecutive_replans = v_job.consecutive_replans + 1,
    last_error = p_reason,
    lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    next_run_at = now(), updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'replanned', true,
    'cycleId', v_cycle.id,
    'cycleNumber', v_cycle.cycle_number,
    'fromChapter', v_cycle.start_chapter,
    'paused', v_cycle.replan_count + 1 >= 2
  );
END $$;

CREATE OR REPLACE FUNCTION public.restart_serial_opening(
  p_job_id uuid, p_reason text DEFAULT 'Opening rejected by human review.'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.serial_jobs; v_cycle public.serial_cycles;
BEGIN
  SELECT * INTO v_job FROM public.serial_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_JOB_MISSING'; END IF;
  IF v_job.status <> 'opening_review' OR v_job.current_chapter <> 4 OR v_job.current_cycle_id IS NULL THEN
    RAISE EXCEPTION 'SERIAL_OPENING_NOT_REVIEWABLE';
  END IF;

  SELECT * INTO v_cycle FROM public.serial_cycles
  WHERE id = v_job.current_cycle_id AND serial_novel_id = v_job.serial_novel_id FOR UPDATE;
  IF NOT FOUND OR v_cycle.start_chapter <> 1 OR v_cycle.status = 'published' THEN
    RAISE EXCEPTION 'SERIAL_OPENING_CYCLE_INVALID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.chapters
    WHERE novel_id = v_job.novel_id AND chapter_number <= 4 AND publication_state = 'published'
  ) THEN
    RAISE EXCEPTION 'SERIAL_OPENING_ALREADY_PUBLISHED';
  END IF;

  DELETE FROM public.chapters
  WHERE novel_id = v_job.novel_id AND publication_state = 'draft'
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;

  UPDATE public.serial_runs SET
    status = 'replanned', error = p_reason, finished_at = now()
  WHERE serial_novel_id = v_job.serial_novel_id
    AND kind = 'chapter' AND status IN ('running', 'committed')
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;

  UPDATE public.serial_novels SET
    bible = v_cycle.checkpoint_bible,
    opening_reviewed_at = NULL,
    opening_reviewed_by = NULL,
    updated_at = now()
  WHERE id = v_job.serial_novel_id;

  UPDATE public.serial_cycles SET
    status = 'writing', replan_count = 0, updated_at = now()
  WHERE id = v_cycle.id;

  UPDATE public.serial_jobs SET
    status = 'ready', stage = 'plan_cycle',
    current_chapter = 0, current_cycle_id = v_cycle.id,
    chapters_today = 0, quota_date = NULL,
    consecutive_replans = 0, retry_count = 0,
    last_error = p_reason,
    lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    next_run_at = now(), updated_at = now()
  WHERE id = v_job.id;

  RETURN jsonb_build_object(
    'restarted', true,
    'jobId', v_job.id,
    'cycleId', v_cycle.id,
    'nextChapter', 1
  );
END $$;

CREATE OR REPLACE FUNCTION public.release_serial_novel(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.serial_jobs;
  v_serial public.serial_novels;
  v_novel public.novels;
  v_first_cycle public.serial_cycles;
BEGIN
  SELECT * INTO v_job FROM public.serial_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_JOB_MISSING'; END IF;

  SELECT * INTO v_serial FROM public.serial_novels WHERE id = v_job.serial_novel_id FOR UPDATE;
  SELECT * INTO v_novel FROM public.novels WHERE id = v_job.novel_id FOR UPDATE;
  IF v_serial.opening_reviewed_at IS NULL THEN RAISE EXCEPTION 'SERIAL_OPENING_NOT_APPROVED'; END IF;

  SELECT * INTO v_first_cycle FROM public.serial_cycles
  WHERE serial_novel_id = v_serial.id AND cycle_number = 1 AND status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_FIRST_CYCLE_NOT_PUBLISHED'; END IF;
  IF COALESCE(v_novel.chapter_count, 0) < v_first_cycle.end_chapter THEN
    RAISE EXCEPTION 'SERIAL_PUBLIC_CHAPTER_COUNT_INCOMPLETE';
  END IF;
  IF length(trim(COALESCE(v_novel.cover_url, ''))) < 5 THEN
    RAISE EXCEPTION 'SERIAL_VALID_COVER_REQUIRED';
  END IF;

  UPDATE public.novels SET hidden = false, status = 'Đang ra', updated_at = now()
  WHERE id = v_novel.id;

  RETURN jsonb_build_object(
    'released', true,
    'novelId', v_novel.id,
    'slug', v_novel.slug,
    'publishedThrough', v_first_cycle.end_chapter
  );
END $$;

REVOKE ALL ON FUNCTION public.replan_serial_cycle(uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restart_serial_opening(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_serial_novel(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replan_serial_cycle(uuid,uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.restart_serial_opening(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_serial_novel(uuid) TO service_role;

COMMIT;
