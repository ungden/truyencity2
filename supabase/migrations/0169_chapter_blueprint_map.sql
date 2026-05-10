-- 0169_chapter_blueprint_map.sql
-- Full-novel chapter blueprint map for long-running story production.

CREATE TABLE IF NOT EXISTS public.chapter_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL CHECK (chapter_number > 0),
  volume_number INT,
  arc_number INT,
  sub_arc_number INT,
  title_hint TEXT,
  goal TEXT NOT NULL,
  conflict TEXT,
  payoff TEXT NOT NULL,
  ending_hook TEXT,
  "cast" TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  resource_ledger_delta TEXT,
  world_state_delta TEXT,
  species_delta TEXT,
  template_inspiration TEXT,
  authority_constraints TEXT,
  forbidden_terms TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'used', 'repaired', 'invalid')),
  version INT NOT NULL DEFAULT 1,
  actual_summary_delta TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_chapter_blueprints_project_chapter
  ON public.chapter_blueprints(project_id, chapter_number);

CREATE INDEX IF NOT EXISTS idx_chapter_blueprints_project_status
  ON public.chapter_blueprints(project_id, status);

CREATE TABLE IF NOT EXISTS public.story_blueprint_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  target_chapters INT NOT NULL CHECK (target_chapters > 0),
  generated_chapters INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'valid', 'invalid', 'failed')),
  last_error TEXT,
  coverage_ok BOOLEAN NOT NULL DEFAULT false,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_story_blueprint_runs_project_version
  ON public.story_blueprint_runs(project_id, version DESC);

ALTER TABLE public.chapter_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_blueprint_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on chapter_blueprints"
  ON public.chapter_blueprints
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on story_blueprint_runs"
  ON public.story_blueprint_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users read own chapter_blueprints"
  ON public.chapter_blueprints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_story_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users read own story_blueprint_runs"
  ON public.story_blueprint_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_story_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );
