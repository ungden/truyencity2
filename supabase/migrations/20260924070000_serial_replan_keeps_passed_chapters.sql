-- A chapter that will not come out right replans the cycle from that chapter, not from
-- the cycle's first chapter. On 2026-09-24 the beast-taming launch lost its four
-- opening chapters, already read and approved by a person, because chapter 5 failed
-- its judge twice: the old function deleted every draft in the cycle and rewound the
-- Bible to the cycle checkpoint.
--
-- p_from_chapter (optional): the first chapter to discard. Earlier drafts passed their
-- own judge and stay. The Bible is kept as it is, because a chapter that fails never
-- commits: it already describes the story through p_from_chapter - 1. If it does not,
-- the call falls back to the whole-cycle rewind rather than guess.
-- Omitting it keeps the old behaviour (used by a failed opening audit, whose findings
-- span the chapters).
BEGIN;
SET lock_timeout = '5s';

DROP FUNCTION IF EXISTS public.replan_serial_cycle(uuid, uuid, uuid, text);

CREATE FUNCTION public.replan_serial_cycle(
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
    'fromChapter', v_from,
    'keptThrough', v_from - 1,
    'paused', v_cycle.replan_count + 1 >= 2,
    'quotaRefunded', v_refund
  );
END $$;
REVOKE ALL ON FUNCTION public.replan_serial_cycle(uuid,uuid,uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replan_serial_cycle(uuid,uuid,uuid,text,integer) TO service_role;
COMMIT;
