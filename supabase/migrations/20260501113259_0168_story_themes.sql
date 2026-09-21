CREATE TABLE IF NOT EXISTS public.story_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  theme_role TEXT NOT NULL CHECK (theme_role IN ('main', 'supporting')),
  theme_name TEXT NOT NULL,
  description TEXT NOT NULL,
  motifs JSONB DEFAULT '[]'::JSONB,
  importance INTEGER DEFAULT 50,
  reinforcement_count INTEGER DEFAULT 0,
  last_reinforced_chapter INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, theme_name)
);

CREATE INDEX IF NOT EXISTS idx_story_themes_project_role
  ON public.story_themes(project_id, theme_role, importance DESC);

ALTER TABLE public.story_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.story_themes
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.story_themes IS
  'Phase 27 W3.2: theme registry + reinforcement tracker.';;
