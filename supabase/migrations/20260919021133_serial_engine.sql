-- The serial engine's own tables. Nothing here touches the story-factory schema:
-- the two run side by side until the old one is retired.
SET lock_timeout = '5s';

-- One row per story. `premise` is immutable after approval; `bible` is rewritten
-- every chapter and is the only durable narrative state.
CREATE TABLE IF NOT EXISTS public.serial_novels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL UNIQUE REFERENCES public.novels(id) ON DELETE CASCADE,
  premise jsonb NOT NULL,
  bible jsonb NOT NULL,
  routes jsonb NOT NULL,
  route_version text NOT NULL,
  prompt_version text NOT NULL,
  -- The human gate. A job cannot be claimed until someone has read the premise
  -- and the first four chapters and said yes.
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.serial_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_novel_id uuid NOT NULL REFERENCES public.serial_novels(id) ON DELETE CASCADE,
  cycle_number integer NOT NULL CHECK (cycle_number > 0),
  volume_number integer NOT NULL CHECK (volume_number > 0),
  start_chapter integer NOT NULL CHECK (start_chapter > 0),
  end_chapter integer NOT NULL CHECK (end_chapter >= start_chapter),
  plan jsonb NOT NULL,
  -- The Bible as it stood before the cycle's first chapter. A replan restores it.
  checkpoint_bible jsonb NOT NULL,
  status text NOT NULL DEFAULT 'writing'
    CHECK (status IN ('writing', 'ready_to_publish', 'published', 'replanned')),
  replan_count integer NOT NULL DEFAULT 0 CHECK (replan_count BETWEEN 0 AND 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (serial_novel_id, cycle_number)
);
CREATE INDEX IF NOT EXISTS idx_serial_cycles_open
  ON public.serial_cycles(serial_novel_id, status, cycle_number DESC);

CREATE TABLE IF NOT EXISTS public.serial_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_novel_id uuid NOT NULL UNIQUE REFERENCES public.serial_novels(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  -- There is no *_blocked status on purpose. The old engine had four, and every
  -- production job is parked in one of them waiting for an operator.
  status text NOT NULL DEFAULT 'awaiting_approval'
    CHECK (status IN ('awaiting_approval', 'ready', 'running', 'paused', 'completed')),
  stage text NOT NULL DEFAULT 'plan_cycle'
    CHECK (stage IN ('plan_cycle', 'write', 'publish_cycle', 'fold_volume')),
  current_chapter integer NOT NULL DEFAULT 0,
  current_cycle_id uuid REFERENCES public.serial_cycles(id) ON DELETE SET NULL,
  daily_target integer NOT NULL DEFAULT 3 CHECK (daily_target BETWEEN 1 AND 12),
  chapters_today integer NOT NULL DEFAULT 0,
  quota_date date,
  consecutive_replans integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  lease_owner text,
  lease_token uuid,
  lease_until timestamptz,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_serial_jobs_claimable
  ON public.serial_jobs(next_run_at) WHERE status = 'ready';

CREATE TABLE IF NOT EXISTS public.serial_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_novel_id uuid NOT NULL REFERENCES public.serial_novels(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.serial_cycles(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('chapter', 'plan_cycle', 'publish_cycle', 'fold_volume')),
  chapter_number integer,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'committed', 'published', 'replanned', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  verdict jsonb,
  digest jsonb,
  -- The number the dashboard shows instead of a block count.
  scorecard_avg numeric(3, 2),
  usage jsonb NOT NULL DEFAULT '[]'::jsonb,
  cost_usd numeric(10, 4) NOT NULL DEFAULT 0,
  route_version text,
  prompt_version text,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_serial_runs_recent
  ON public.serial_runs(serial_novel_id, started_at DESC);

-- Service role only. These tables never reach a reader.
DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['serial_novels', 'serial_cycles', 'serial_jobs', 'serial_runs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', v_table);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_service_only', v_table);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      v_table || '_service_only', v_table);
  END LOOP;
END $$;

-- ---------------------------------------------------------------- claim

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
    AND (p_route_version IS NULL OR n.route_version = p_route_version)
    -- Daily quota throttles new chapters; it never gates a publish or a replan.
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

-- ------------------------------------------------------- commit a chapter

/**
 * One transaction: the draft chapter, the new Bible, the run telemetry and the job
 * cursor all move together, or none of them do. The chapter lands as a draft — a
 * reader sees nothing until its whole cycle passes review.
 */
CREATE OR REPLACE FUNCTION public.commit_serial_chapter(
  p_job_id uuid, p_lease_token uuid, p_run_id uuid, p_expected_chapter integer,
  p_title text, p_content text, p_bible jsonb, p_verdict jsonb, p_digest jsonb,
  p_scorecard_avg numeric, p_usage jsonb, p_cost_usd numeric, p_attempts integer,
  p_next_stage text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.serial_jobs; v_local_date date := timezone('Asia/Ho_Chi_Minh', now())::date; v_today integer;
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

  v_today := CASE WHEN v_job.quota_date = v_local_date THEN v_job.chapters_today + 1 ELSE 1 END;

  UPDATE public.serial_jobs SET
    current_chapter = p_expected_chapter,
    stage = p_next_stage,
    status = 'ready',
    chapters_today = v_today,
    quota_date = v_local_date,
    consecutive_replans = 0,
    retry_count = 0,
    last_error = NULL,
    lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    next_run_at = now(),
    updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object('chapterNumber', p_expected_chapter, 'publication', 'draft', 'chaptersToday', v_today);
END $$;

-- -------------------------------------------------------- publish a cycle

/** Every chapter of the cycle becomes visible at once, or none of them do. */
CREATE OR REPLACE FUNCTION public.publish_serial_cycle(
  p_job_id uuid, p_lease_token uuid, p_cycle_id uuid, p_next_stage text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.serial_jobs; v_cycle public.serial_cycles; v_count integer; v_max integer;
BEGIN
  SELECT * INTO v_job FROM public.serial_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until < now() THEN
    RAISE EXCEPTION 'SERIAL_LEASE_INVALID';
  END IF;

  SELECT * INTO v_cycle FROM public.serial_cycles
  WHERE id = p_cycle_id AND serial_novel_id = v_job.serial_novel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_CYCLE_MISSING'; END IF;

  SELECT count(*), max(chapter_number) INTO v_count, v_max FROM public.chapters
  WHERE novel_id = v_job.novel_id AND publication_state = 'draft'
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;
  IF v_count <> (v_cycle.end_chapter - v_cycle.start_chapter + 1) OR v_max <> v_cycle.end_chapter THEN
    RAISE EXCEPTION 'SERIAL_CYCLE_INCOMPLETE';
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

-- --------------------------------------------------------- replan a cycle

/**
 * Roll the private window back to its checkpoint and plan again. No reader ever saw
 * these chapters, so there is nothing to apologise for and no reason to park the job.
 */
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

  UPDATE public.serial_cycles SET
    status = 'replanned', replan_count = replan_count + 1, updated_at = now()
  WHERE id = v_cycle.id;

  UPDATE public.serial_runs SET status = 'replanned', error = p_reason, finished_at = now()
  WHERE serial_novel_id = v_job.serial_novel_id AND status IN ('running', 'committed')
    AND chapter_number BETWEEN v_cycle.start_chapter AND v_cycle.end_chapter;

  UPDATE public.serial_jobs SET
    current_chapter = v_cycle.start_chapter - 1,
    stage = 'plan_cycle',
    -- Two replans of the same cycle pauses the story for a human read. It is the one
    -- place a person is needed, and it is a read, not a repair.
    status = CASE WHEN v_cycle.replan_count + 1 >= 2 THEN 'paused' ELSE 'ready' END,
    current_cycle_id = NULL,
    consecutive_replans = v_job.consecutive_replans + 1,
    last_error = p_reason,
    lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    next_run_at = now(), updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'replanned', true,
    'fromChapter', v_cycle.start_chapter,
    'paused', v_cycle.replan_count + 1 >= 2
  );
END $$;

-- ------------------------------------------------- return expired leases

CREATE OR REPLACE FUNCTION public.reconcile_serial_jobs(p_stale_minutes integer DEFAULT 0)
RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.serial_jobs SET
      status = 'ready', retry_count = retry_count + 1,
      lease_owner = NULL, lease_token = NULL, lease_until = NULL,
      next_run_at = now() + make_interval(mins => LEAST(power(2, retry_count)::integer, 60)),
      last_error = 'Lease expired before the stage completed.',
      updated_at = now()
    WHERE status = 'running'
      AND lease_until < now() - make_interval(mins => p_stale_minutes)
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END $$;

DO $$
DECLARE v_signature text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.claim_serial_job(text,integer,text)',
    'public.commit_serial_chapter(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,jsonb,numeric,jsonb,numeric,integer,text)',
    'public.publish_serial_cycle(uuid,uuid,uuid,text)',
    'public.replan_serial_cycle(uuid,uuid,uuid,text)',
    'public.reconcile_serial_jobs(integer)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_signature);
  END LOOP;
END $$;
