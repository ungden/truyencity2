CREATE TABLE IF NOT EXISTS public.plot_twists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  twist_name TEXT NOT NULL,
  twist_type TEXT NOT NULL,
  description TEXT NOT NULL,
  setup_chapters INTEGER[] DEFAULT '{}',
  reveal_chapter INTEGER NOT NULL,
  setup_hints JSONB DEFAULT '[]'::JSONB,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'seeding', 'imminent', 'revealed', 'abandoned')),
  importance INTEGER DEFAULT 50,
  volume_number INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plot_twists_project_status
  ON public.plot_twists(project_id, status, reveal_chapter);

CREATE INDEX IF NOT EXISTS idx_plot_twists_project_reveal
  ON public.plot_twists(project_id, reveal_chapter ASC);

ALTER TABLE public.plot_twists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.plot_twists
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.plot_twists IS
  'Phase 27 W3.1: pre-planned plot twists.';;
