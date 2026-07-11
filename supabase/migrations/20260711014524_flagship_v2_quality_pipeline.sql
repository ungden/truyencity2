-- Flagship v2: quality-first story contracts, observability, and infra isolation.
-- Safe to apply even when 0187 was not applied in production.

CREATE TABLE IF NOT EXISTS public.story_write_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id uuid,
  started_chapter int NOT NULL,
  last_chapter_number int,
  status text NOT NULL DEFAULT 'running',
  attempt_no int NOT NULL DEFAULT 1,
  idempotency_key text NOT NULL,
  model text,
  target_word_count int,
  context_size_chars int,
  quality_score numeric(4,2),
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, started_chapter, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.story_write_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.story_write_runs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number int NOT NULL,
  step text NOT NULL,
  artifact_ref text,
  digest text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, step, digest)
);

CREATE TABLE IF NOT EXISTS public.story_cast_ledger (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  brief_role text,
  first_seen_chapter int NOT NULL,
  last_seen_chapter int NOT NULL,
  appearance_count int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'alive',
  last_known_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, character_name)
);

ALTER TABLE public.story_write_runs
  ADD COLUMN IF NOT EXISTS pipeline_version text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS model_route jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS context_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS critic_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS revision_lineage jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS publication_decision text,
  ADD COLUMN IF NOT EXISTS failure_class text;

ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS story_spec_v2 jsonb,
  ADD COLUMN IF NOT EXISTS story_spec_v2_score jsonb,
  ADD COLUMN IF NOT EXISTS arc_plan_v2 jsonb,
  ADD COLUMN IF NOT EXISTS story_state_v2 jsonb;

ALTER TABLE public.project_daily_quotas
  ADD COLUMN IF NOT EXISTS failure_class text,
  ADD COLUMN IF NOT EXISTS infra_blocked_at timestamptz;

ALTER TABLE public.project_daily_quotas DROP CONSTRAINT IF EXISTS project_daily_quotas_status_check;
ALTER TABLE public.project_daily_quotas ADD CONSTRAINT project_daily_quotas_status_check
  CHECK (status IN ('active', 'completed', 'failed', 'infra_blocked'));

ALTER TABLE public.story_write_runs DROP CONSTRAINT IF EXISTS story_write_runs_status_check;
ALTER TABLE public.story_write_runs ADD CONSTRAINT story_write_runs_status_check
  CHECK (status IN ('running','saved','post_write_done','failed','infra_blocked','quality_rejected','human_gate'));

ALTER TABLE public.story_write_runs DROP CONSTRAINT IF EXISTS story_write_runs_publication_decision_check;
ALTER TABLE public.story_write_runs ADD CONSTRAINT story_write_runs_publication_decision_check
  CHECK (publication_decision IS NULL OR publication_decision IN ('publish','revise','reject','human_gate'));

ALTER TABLE public.story_write_runs DROP CONSTRAINT IF EXISTS story_write_runs_failure_class_check;
ALTER TABLE public.story_write_runs ADD CONSTRAINT story_write_runs_failure_class_check
  CHECK (failure_class IS NULL OR failure_class IN ('infrastructure','quality','setup','unknown'));

ALTER TABLE public.story_write_checkpoints DROP CONSTRAINT IF EXISTS story_write_checkpoints_step_check;
ALTER TABLE public.story_write_checkpoints ADD CONSTRAINT story_write_checkpoints_step_check
  CHECK (step IN ('context_assembled','chapter_generated','pre_save_qa_passed','chapter_saved','current_chapter_bumped','post_write_tasks_done','failed'));
ALTER TABLE public.story_write_checkpoints DROP CONSTRAINT IF EXISTS story_write_checkpoints_status_check;
ALTER TABLE public.story_write_checkpoints ADD CONSTRAINT story_write_checkpoints_status_check
  CHECK (status IN ('ok','failed'));
ALTER TABLE public.story_cast_ledger DROP CONSTRAINT IF EXISTS story_cast_ledger_status_check;
ALTER TABLE public.story_cast_ledger ADD CONSTRAINT story_cast_ledger_status_check
  CHECK (status IN ('alive','dead','missing','unknown'));

CREATE TABLE IF NOT EXISTS public.story_flagship_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number int,
  stage text NOT NULL CHECK (stage IN ('concept','story_spec','chapter_3','chapter_10','chapter_30','chapter_50','model_bakeoff')),
  reviewer_kind text NOT NULL CHECK (reviewer_kind IN ('human','independent_model','golden_corpus')),
  anonymous_candidate_id text,
  verdict text NOT NULL CHECK (verdict IN ('approved','rejected','preferred','tie')),
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewer_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.story_resource_ledger (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  resource_name text NOT NULL,
  amount text NOT NULL,
  source text NOT NULL,
  last_changed_chapter int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, resource_name)
);

CREATE TABLE IF NOT EXISTS public.story_promise_ledger (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  promise_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('open','advanced','paid','broken')),
  current_pressure text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, promise_id)
);

CREATE INDEX IF NOT EXISTS idx_story_write_runs_project_recent ON public.story_write_runs(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_write_checkpoints_run ON public.story_write_checkpoints(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_story_cast_ledger_recent ON public.story_cast_ledger(project_id, last_seen_chapter DESC);
CREATE INDEX IF NOT EXISTS idx_story_flagship_reviews_project_stage ON public.story_flagship_reviews(project_id, stage, created_at DESC);

ALTER TABLE public.story_write_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_write_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_cast_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_flagship_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_resource_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_promise_ledger ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.story_write_runs, public.story_write_checkpoints, public.story_cast_ledger, public.story_flagship_reviews, public.story_resource_ledger, public.story_promise_ledger FROM anon, authenticated;
GRANT ALL ON public.story_write_runs, public.story_write_checkpoints, public.story_cast_ledger, public.story_flagship_reviews, public.story_resource_ledger, public.story_promise_ledger TO service_role;

DROP POLICY IF EXISTS story_write_runs_service_all ON public.story_write_runs;
CREATE POLICY story_write_runs_service_all ON public.story_write_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_write_checkpoints_service_all ON public.story_write_checkpoints;
CREATE POLICY story_write_checkpoints_service_all ON public.story_write_checkpoints FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_cast_ledger_service_all ON public.story_cast_ledger;
CREATE POLICY story_cast_ledger_service_all ON public.story_cast_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_flagship_reviews_service_all ON public.story_flagship_reviews;
CREATE POLICY story_flagship_reviews_service_all ON public.story_flagship_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_resource_ledger_service_all ON public.story_resource_ledger;
CREATE POLICY story_resource_ledger_service_all ON public.story_resource_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS story_promise_ledger_service_all ON public.story_promise_ledger;
CREATE POLICY story_promise_ledger_service_all ON public.story_promise_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.commit_flagship_chapter_v2(
  p_project_id uuid,
  p_novel_id uuid,
  p_expected_current_chapter int,
  p_chapter_number int,
  p_title text,
  p_content text,
  p_quality_score numeric,
  p_story_state jsonb,
  p_cast_ledger jsonb,
  p_resource_ledger jsonb,
  p_promise_ledger jsonb,
  p_run_id uuid,
  p_context_manifest jsonb,
  p_editor_evidence jsonb,
  p_revision_lineage jsonb,
  p_prompt_version text,
  p_model_route jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_current int;
  v_pipeline text;
  v_novel uuid;
  v_item jsonb;
BEGIN
  SELECT current_chapter, style_directives->>'pipeline_version', novel_id
    INTO v_current, v_pipeline, v_novel
  FROM public.ai_story_projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_PROJECT_NOT_FOUND'; END IF;
  IF v_pipeline IS DISTINCT FROM 'flagship_v2' THEN RAISE EXCEPTION 'FLAGSHIP_PIPELINE_MISMATCH'; END IF;
  IF v_novel IS DISTINCT FROM p_novel_id THEN RAISE EXCEPTION 'FLAGSHIP_NOVEL_MISMATCH'; END IF;
  IF COALESCE(v_current, 0) <> p_expected_current_chapter OR p_chapter_number <> p_expected_current_chapter + 1 THEN
    RAISE EXCEPTION 'FLAGSHIP_CHAPTER_RACE expected %, actual %, requested %', p_expected_current_chapter, v_current, p_chapter_number;
  END IF;
  IF COALESCE((p_story_state->>'chapterNumber')::int, -1) <> p_chapter_number THEN
    RAISE EXCEPTION 'FLAGSHIP_STATE_SEQUENCE_MISMATCH';
  END IF;

  INSERT INTO public.chapters (novel_id, chapter_number, title, content, quality_score)
  VALUES (p_novel_id, p_chapter_number, p_title, p_content, p_quality_score);

  UPDATE public.ai_story_projects
  SET current_chapter = p_chapter_number, story_state_v2 = p_story_state, updated_at = now()
  WHERE id = p_project_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_cast_ledger, '[]'::jsonb)) LOOP
    INSERT INTO public.story_cast_ledger (
      project_id, character_name, first_seen_chapter, last_seen_chapter, appearance_count,
      status, last_known_location, updated_at
    ) VALUES (
      p_project_id, v_item->>'name', p_chapter_number, p_chapter_number, 1,
      COALESCE(v_item->>'status', 'unknown'), v_item->>'location', now()
    ) ON CONFLICT (project_id, character_name) DO UPDATE SET
      last_seen_chapter = EXCLUDED.last_seen_chapter,
      appearance_count = story_cast_ledger.appearance_count + 1,
      status = EXCLUDED.status,
      last_known_location = EXCLUDED.last_known_location,
      updated_at = now();
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_resource_ledger, '[]'::jsonb)) LOOP
    INSERT INTO public.story_resource_ledger (project_id, resource_name, amount, source, last_changed_chapter, updated_at)
    VALUES (p_project_id, v_item->>'resource', v_item->>'amount', v_item->>'source', (v_item->>'lastChangedChapter')::int, now())
    ON CONFLICT (project_id, resource_name) DO UPDATE SET
      amount = EXCLUDED.amount, source = EXCLUDED.source,
      last_changed_chapter = EXCLUDED.last_changed_chapter, updated_at = now();
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_promise_ledger, '[]'::jsonb)) LOOP
    INSERT INTO public.story_promise_ledger (project_id, promise_id, status, current_pressure, updated_at)
    VALUES (p_project_id, v_item->>'id', v_item->>'status', v_item->>'currentPressure', now())
    ON CONFLICT (project_id, promise_id) DO UPDATE SET
      status = EXCLUDED.status, current_pressure = EXCLUDED.current_pressure, updated_at = now();
  END LOOP;

  UPDATE public.story_write_runs SET
    status = 'saved', last_chapter_number = p_chapter_number, quality_score = p_quality_score,
    context_manifest = COALESCE(p_context_manifest, '[]'::jsonb),
    critic_evidence = COALESCE(p_editor_evidence, '[]'::jsonb),
    revision_lineage = COALESCE(p_revision_lineage, '[]'::jsonb),
    prompt_version = p_prompt_version, model_route = COALESCE(p_model_route, '{}'::jsonb),
    publication_decision = 'publish', failure_class = NULL, finished_at = now(), updated_at = now()
  WHERE id = p_run_id AND project_id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'FLAGSHIP_WRITE_RUN_MISSING'; END IF;

  INSERT INTO public.story_write_checkpoints (run_id, project_id, chapter_number, step, artifact_ref, digest, status, meta)
  VALUES
    (p_run_id, p_project_id, p_chapter_number, 'chapter_generated', NULL, md5(p_run_id::text || ':generated'), 'ok', jsonb_build_object('title', p_title)),
    (p_run_id, p_project_id, p_chapter_number, 'pre_save_qa_passed', NULL, md5(p_run_id::text || ':qa'), 'ok', jsonb_build_object('quality_score', p_quality_score)),
    (p_run_id, p_project_id, p_chapter_number, 'chapter_saved', 'chapters:' || p_chapter_number, md5(p_run_id::text || ':saved'), 'ok', jsonb_build_object('chapter_number', p_chapter_number)),
    (p_run_id, p_project_id, p_chapter_number, 'current_chapter_bumped', 'ai_story_projects:' || p_project_id, md5(p_run_id::text || ':bumped'), 'ok', jsonb_build_object('current_chapter', p_chapter_number))
  ON CONFLICT (run_id, step, digest) DO NOTHING;

  RETURN jsonb_build_object('chapter_number', p_chapter_number, 'run_id', p_run_id, 'committed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.commit_flagship_chapter_v2(uuid,uuid,int,int,text,text,numeric,jsonb,jsonb,jsonb,jsonb,uuid,jsonb,jsonb,jsonb,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_flagship_chapter_v2(uuid,uuid,int,int,text,text,numeric,jsonb,jsonb,jsonb,jsonb,uuid,jsonb,jsonb,jsonb,text,jsonb) TO service_role;
