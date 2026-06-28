-- 0187_story_engine_observability.sql
-- Ainovel-inspired production observability: write runs, checkpoints, and cast ledger.

CREATE TABLE IF NOT EXISTS public.story_write_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id uuid,
  started_chapter int NOT NULL,
  last_chapter_number int,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','saved','post_write_done','failed')),
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

CREATE INDEX IF NOT EXISTS idx_story_write_runs_project_recent
  ON public.story_write_runs (project_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_write_runs_status
  ON public.story_write_runs (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.story_write_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.story_write_runs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number int NOT NULL,
  step text NOT NULL CHECK (
    step IN (
      'context_assembled',
      'chapter_generated',
      'pre_save_qa_passed',
      'chapter_saved',
      'current_chapter_bumped',
      'post_write_tasks_done',
      'failed'
    )
  ),
  artifact_ref text,
  digest text NOT NULL,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','failed')),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, step, digest)
);

CREATE INDEX IF NOT EXISTS idx_story_write_checkpoints_run
  ON public.story_write_checkpoints (run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_story_write_checkpoints_project_chapter
  ON public.story_write_checkpoints (project_id, chapter_number, created_at DESC);

CREATE TABLE IF NOT EXISTS public.story_cast_ledger (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  brief_role text,
  first_seen_chapter int NOT NULL,
  last_seen_chapter int NOT NULL,
  appearance_count int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'alive' CHECK (status IN ('alive','dead','missing','unknown')),
  last_known_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_story_cast_ledger_recent
  ON public.story_cast_ledger (project_id, last_seen_chapter DESC);

ALTER TABLE public.admin_review_queue
  DROP CONSTRAINT IF EXISTS admin_review_queue_reason_check;

ALTER TABLE public.admin_review_queue
  ADD CONSTRAINT admin_review_queue_reason_check CHECK (reason IN (
    'golden_fallback',
    'revise_pass_failed',
    'major_contradiction_unfixed',
    'quality_circuit_breaker',
    'foreshadowing_abandoned',
    'story_rule_violation'
  ));

ALTER TABLE public.story_write_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_write_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_cast_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS story_write_runs_service_all ON public.story_write_runs;
CREATE POLICY story_write_runs_service_all ON public.story_write_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS story_write_checkpoints_service_all ON public.story_write_checkpoints;
CREATE POLICY story_write_checkpoints_service_all ON public.story_write_checkpoints
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS story_cast_ledger_service_all ON public.story_cast_ledger;
CREATE POLICY story_cast_ledger_service_all ON public.story_cast_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);
