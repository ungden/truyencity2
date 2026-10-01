-- A story pauses when a replan does not help, not when a cycle has replanned twice.
--
-- Until now the pause counted every replan in the cycle: serial_cycles.replan_count + 1 >= 2.
-- The count never reset when chapters passed, so two unrelated failures a week apart paused
-- the story. The clan-legacy novel replanned at chapter 13, wrote 13-19 cleanly, failed once
-- at chapter 20 and paused (2026-09-28); beast-taming and card-profession paused the same way.
--
-- Now:
-- * A replan from the failing chapter pauses only when the job's consecutive_replans reaches
--   two, i.e. the replanned chapter failed again before anything committed.
--   commit_serial_chapter resets consecutive_replans to 0, and each such replan point lies
--   after the previous one, so this cannot loop.
-- * A rewind that discards committed drafts (a failed opening audit, or the fallback when the
--   Bible does not match the failing chapter) keeps the cycle-level count: it throws away
--   progress, so repeating it without a person is exactly the loop to stop.
BEGIN;
SET lock_timeout = '5s';



CREATE OR REPLACE FUNCTION public.replan_serial_cycle(
  p_job_id uuid, p_lease_token uuid, p_cycle_id uuid, p_reason text,
  p_from_chapter integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.serial_jobs;
  v_cycle public.serial_cycles;
  v_bible_chapter integer;
  v_from integer;
  v_local_date date := timezone('Asia/Ho_Chi_Minh', now())::date;
  v_refund integer := 0;
  v_discarded integer := 0;
  v_pause boolean;
BEGIN
  SELECT * INTO v_job FROM public.serial_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until < now() THEN
    RAISE EXCEPTION 'SERIAL_LEASE_INVALID';
  END IF;

  SELECT * INTO v_cycle FROM public.serial_cycles
  WHERE id = p_cycle_id AND serial_novel_id = v_job.serial_novel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_CYCLE_MISSING'; END IF;
  IF v_cycle.status = 'published' THEN RAISE EXCEPTION 'SERIAL_CYCLE_ALREADY_PUBLISHED'; END IF;

  SELECT (bible #>> '{symbolicCore,chapterNumber}')::integer INTO v_bible_chapter
  FROM public.serial_novels WHERE id = v_job.serial_novel_id;

  v_from := v_cycle.start_chapter;
  IF p_from_chapter IS NOT NULL
     AND p_from_chapter > v_cycle.start_chapter
     AND p_from_chapter <= v_cycle.end_chapter
     AND v_bible_chapter = p_from_chapter - 1 THEN
    v_from := p_from_chapter;
  END IF;

  SELECT count(*)::integer INTO v_refund
  FROM public.chapters
  WHERE novel_id = v_job.novel_id
    AND publication_state = 'draft'
    AND chapter_number BETWEEN v_from AND v_cycle.end_chapter
    AND timezone('Asia/Ho_Chi_Minh', created_at)::date = v_local_date;

  DELETE FROM public.chapters
  WHERE novel_id = v_job.novel_id AND publication_state = 'draft'
    AND chapter_number BETWEEN v_from AND v_cycle.end_chapter;
  GET DIAGNOSTICS v_discarded = ROW_COUNT;

  v_pause := v_job.consecutive_replans + 1 >= 2
    OR (v_discarded > 0 AND v_cycle.replan_count + 1 >= 2);

  IF v_from = v_cycle.start_chapter THEN
    UPDATE public.serial_novels SET bible = v_cycle.checkpoint_bible, updated_at = now()
    WHERE id = v_job.serial_novel_id;
  END IF;

  UPDATE public.serial_cycles SET
    status = 'writing', replan_count = replan_count + 1, updated_at = now()
  WHERE id = v_cycle.id;

  UPDATE public.serial_runs SET status = 'replanned', error = p_reason, finished_at = now()
  WHERE serial_novel_id = v_job.serial_novel_id AND status IN ('running', 'committed')
    AND chapter_number BETWEEN v_from AND v_cycle.end_chapter;

  UPDATE public.serial_jobs SET
    current_chapter = v_from - 1,
    stage = 'plan_cycle',
    status = CASE WHEN v_pause THEN 'paused' ELSE 'ready' END,
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
    'fromChapter', v_from,
    'keptThrough', v_from - 1,
    'paused', v_pause,
    'discardedDrafts', v_discarded,
    'quotaRefunded', v_refund
  );
END $$;
REVOKE ALL ON FUNCTION public.replan_serial_cycle(uuid,uuid,uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replan_serial_cycle(uuid,uuid,uuid,text,integer) TO service_role;
COMMIT;
