-- Drafts discarded by an automatic replan did not consume reader-facing output and
-- must not exhaust the daily chapter quota. Refund only drafts created on today's
-- Ho Chi Minh quota date; older work remains counted in its original day.
BEGIN;
SET lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.replan_serial_cycle(
  p_job_id uuid, p_lease_token uuid, p_cycle_id uuid, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.serial_jobs;
  v_cycle public.serial_cycles;
  v_local_date date := timezone('Asia/Ho_Chi_Minh', now())::date;
  v_refund integer := 0;
BEGIN
  SELECT * INTO v_job FROM public.serial_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until < now() THEN
    RAISE EXCEPTION 'SERIAL_LEASE_INVALID';
  END IF;

  SELECT * INTO v_cycle FROM public.serial_cycles
  WHERE id = p_cycle_id AND serial_novel_id = v_job.serial_novel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_CYCLE_MISSING'; END IF;
  IF v_cycle.status = 'published' THEN RAISE EXCEPTION 'SERIAL_CYCLE_ALREADY_PUBLISHED'; END IF;

  SELECT count(*)::integer INTO v_refund
  FROM public.chapters
  WHERE novel_id = v_job.novel_id
    AND publication_state = 'draft'
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter
    AND timezone('Asia/Ho_Chi_Minh', created_at)::date = v_local_date;

  DELETE FROM public.chapters
  WHERE novel_id = v_job.novel_id AND publication_state = 'draft'
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;

  UPDATE public.serial_novels SET bible = v_cycle.checkpoint_bible, updated_at = now()
  WHERE id = v_job.serial_novel_id;

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
    chapters_today = CASE
      WHEN v_job.quota_date = v_local_date THEN greatest(0, v_job.chapters_today - v_refund)
      ELSE v_job.chapters_today
    END,
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
    'paused', v_cycle.replan_count + 1 >= 2,
    'quotaRefunded', v_refund
  );
END $$;
REVOKE ALL ON FUNCTION public.replan_serial_cycle(uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replan_serial_cycle(uuid,uuid,uuid,text) TO service_role;
COMMIT;
