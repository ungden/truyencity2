-- 0168: Story themes — Phase 27 W3.2.
-- Tracks main + supporting themes (vd "growth through suffering", "loyalty
-- vs ambition", "memory and identity"). Each chapter is associated with which
-- themes it reinforces. Used to detect theme drift across long-form novels.

CREATE TABLE IF NOT EXISTS public.story_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  -- 'main' (1-2 themes that drive the entire novel) | 'supporting' (3-5 sub-themes)
  theme_role TEXT NOT NULL CHECK (theme_role IN ('main', 'supporting')),
  theme_name TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Symbolic motifs that reinforce this theme (vd "white cranes", "broken jade",
  -- "rain at dusk") — recur across chapters
  motifs JSONB DEFAULT '[]'::JSONB,
  -- Importance 0-100
  importance INTEGER DEFAULT 50,
  -- How many chapters this theme has been actively reinforced
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
  'Phase 27 W3.2: theme registry + reinforcement tracker. Generated at master_outline stage. Critic checks chapter for theme reinforcement; flags drift if main theme not reinforced for >30 chapters.';
