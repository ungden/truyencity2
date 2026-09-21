-- Every lived-causality cycle must carry a review of the exact private draft
-- window before publication. serial_cycles is already RLS-protected and
-- service-role-only by the base Serial migration.
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE public.serial_cycles
  ADD COLUMN IF NOT EXISTS plan_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS narrative_review jsonb,
  ADD COLUMN IF NOT EXISTS narrative_review_fingerprint text,
  ADD COLUMN IF NOT EXISTS narrative_review_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS narrative_reviewed_at timestamptz;
COMMENT ON COLUMN public.serial_cycles.narrative_review IS
  'Literary review of the complete private cycle, including its causal repair target.';
COMMENT ON COLUMN public.serial_cycles.narrative_review_fingerprint IS
  'SHA-256 over the ordered chapter number, title and content reviewed by the runtime.';
UPDATE public.serial_cycles
SET plan_history = jsonb_build_array(plan)
WHERE plan_history = '[]'::jsonb;
CREATE OR REPLACE FUNCTION public.publish_serial_cycle(
  p_job_id uuid, p_lease_token uuid, p_cycle_id uuid, p_next_stage text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.serial_jobs;
  v_cycle public.serial_cycles;
  v_count integer;
  v_max integer;
  v_draft_snapshot jsonb;
BEGIN
  SELECT * INTO v_job FROM public.serial_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until < now() THEN
    RAISE EXCEPTION 'SERIAL_LEASE_INVALID';
  END IF;

  SELECT * INTO v_cycle FROM public.serial_cycles
  WHERE id = p_cycle_id AND serial_novel_id = v_job.serial_novel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_CYCLE_MISSING'; END IF;

  SELECT count(*), max(chapter_number), jsonb_agg(
    jsonb_build_object(
      'chapterNumber', chapter_number,
      'title', title,
      'content', content
    ) ORDER BY chapter_number
  ) INTO v_count, v_max, v_draft_snapshot FROM public.chapters
  WHERE novel_id = v_job.novel_id AND publication_state = 'draft'
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;
  IF v_count <> (v_cycle.end_chapter - v_cycle.start_chapter + 1) OR v_max <> v_cycle.end_chapter THEN
    RAISE EXCEPTION 'SERIAL_CYCLE_INCOMPLETE';
  END IF;

  IF COALESCE((v_cycle.plan->>'schemaVersion')::integer, 1) >= 2
    AND (
      v_cycle.narrative_review IS NULL
      OR v_cycle.narrative_review_fingerprint IS NULL
      OR v_cycle.narrative_review_snapshot IS DISTINCT FROM v_draft_snapshot
    )
  THEN
    RAISE EXCEPTION 'SERIAL_NARRATIVE_REVIEW_REQUIRED_OR_STALE';
  END IF;

  IF COALESCE((v_cycle.plan->>'schemaVersion')::integer, 1) >= 2
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(v_cycle.narrative_review->'findings', '[]'::jsonb)) finding
      WHERE
        (finding->>'target' IN ('foundation', 'plan') AND finding->>'severity' <> 'minor')
        OR (finding->>'target' = 'prose' AND finding->>'severity' = 'blocking')
    )
  THEN
    RAISE EXCEPTION 'SERIAL_NARRATIVE_REVIEW_BLOCKED';
  END IF;

  UPDATE public.chapters SET publication_state = 'published', published_at = now(), updated_at = now()
  WHERE novel_id = v_job.novel_id AND publication_state = 'draft'
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;

  UPDATE public.serial_cycles SET status = 'published', updated_at = now() WHERE id = v_cycle.id;

  UPDATE public.serial_runs SET status = 'published'
  WHERE serial_novel_id = v_job.serial_novel_id AND kind = 'chapter' AND status = 'committed'
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;

  UPDATE public.novels
  SET chapter_count = v_max, total_chapters = GREATEST(total_chapters, v_max), updated_at = now()
  WHERE id = v_job.novel_id;

  UPDATE public.serial_jobs SET
    stage = p_next_stage, status = 'ready', current_cycle_id = NULL,
    lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    next_run_at = now(), updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object('published', true, 'startChapter', v_cycle.start_chapter, 'endChapter', v_cycle.end_chapter);
END $$;
REVOKE ALL ON FUNCTION public.publish_serial_cycle(uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_serial_cycle(uuid,uuid,uuid,text) TO service_role;
COMMIT;
