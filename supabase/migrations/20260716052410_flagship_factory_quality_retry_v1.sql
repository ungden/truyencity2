-- A rejected draft is not a rejected story. Persist the complete verdict and
-- allow a bounded number of fresh attempts for the same uncommitted chapter.
-- Setup/canon failures remain blocked and no rejected prose is ever published.

ALTER TABLE public.story_write_runs
  ADD COLUMN IF NOT EXISTS quality_verdict jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.record_flagship_factory_quality_failure_v1(
  p_project_id uuid,
  p_error_message text,
  p_evidence jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_vn_date date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_target integer;
  v_retry_count integer;
  v_next_due_at timestamptz;
BEGIN
  IF jsonb_typeof(COALESCE(p_evidence, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'FACTORY_QUALITY_EVIDENCE_MUST_BE_ARRAY';
  END IF;

  SELECT LEAST(500, GREATEST(1, COALESCE(
    NULLIF(p.style_directives->>'production_daily_chapter_quota', '')::integer,
    20
  ))) INTO v_target
  FROM public.ai_story_projects p
  JOIN public.story_factory_jobs j ON j.project_id = p.id
  WHERE p.id = p_project_id
    AND p.style_directives->>'pipeline_version' = 'flagship_v2'
    AND p.style_directives->>'factory_enabled' = 'true'
    AND p.style_directives->>'publication_mode' = 'automatic';
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_OPT_IN_REVOKED'; END IF;

  INSERT INTO public.project_daily_quotas (
    project_id, vn_date, target_chapters, written_chapters, status,
    next_due_at, slot_seed, retry_count, last_error, failure_class, updated_at
  ) VALUES (
    p_project_id, v_vn_date, v_target, 0, 'active', now(),
    (hashtext(p_project_id::text || ':' || v_vn_date::text) & 2147483647),
    0, NULL, NULL, now()
  ) ON CONFLICT (project_id, vn_date) DO NOTHING;

  UPDATE public.project_daily_quotas q SET
    retry_count = q.retry_count + 1,
    status = 'active',
    failure_class = 'quality',
    last_error = left(COALESCE(p_error_message, 'QUALITY_REJECTED'), 1000),
    next_due_at = now() + make_interval(mins => LEAST(30, 5 * power(2, LEAST(q.retry_count, 3))::integer)),
    updated_at = now()
  WHERE q.project_id = p_project_id AND q.vn_date = v_vn_date
  RETURNING q.retry_count, q.next_due_at INTO v_retry_count, v_next_due_at;

  RETURN jsonb_build_object(
    'project_id', p_project_id,
    'vn_date', v_vn_date,
    'retry_count', v_retry_count,
    'next_due_at', v_next_due_at,
    'evidence_count', jsonb_array_length(COALESCE(p_evidence, '[]'::jsonb))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_flagship_factory_quality_failure_v1(uuid,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_flagship_factory_quality_failure_v1(uuid,text,jsonb)
  TO service_role;
