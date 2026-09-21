CREATE TABLE IF NOT EXISTS public.factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  faction_name TEXT NOT NULL,
  faction_type TEXT NOT NULL,
  power_level INTEGER DEFAULT 50,
  description TEXT,
  alliances JSONB DEFAULT '[]'::JSONB,
  rivalries JSONB DEFAULT '[]'::JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'declining', 'fallen', 'hidden')),
  first_seen_chapter INTEGER,
  last_active_chapter INTEGER,
  importance INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, faction_name)
);

CREATE INDEX IF NOT EXISTS idx_factions_project_active
  ON public.factions(project_id, status, last_active_chapter DESC);

CREATE INDEX IF NOT EXISTS idx_factions_project_importance
  ON public.factions(project_id, importance DESC);

ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.factions
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.factions IS
  'Phase 27 W2.5: faction registry + power balance tracker.';;
