-- 0167: Plot twists registry — Phase 27 W3.1.
-- Pre-planned reveals that span 50-500 chapters. Different from foreshadowing
-- (single hint → single payoff) — twists are major narrative reversals that
-- reshape the reader's understanding of preceding chapters.

CREATE TABLE IF NOT EXISTS public.plot_twists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  -- Free-text twist title for admin tracking
  twist_name TEXT NOT NULL,
  -- 'identity' = char's true identity revealed; 'betrayal' = ally turns enemy;
  -- 'origin' = backstory reveal; 'death-faked' = char thought dead returns;
  -- 'power-hidden' = char hid true power; 'world-truth' = world cosmology shift;
  -- 'enemy-true' = real antagonist revealed behind decoy; 'other'
  twist_type TEXT NOT NULL,
  -- Concise description of the twist itself
  description TEXT NOT NULL,
  -- Setup chain: what hints/scenes plant this twist (chapters where setup happens)
  setup_chapters INTEGER[] DEFAULT '{}',
  -- The chapter where the twist is REVEALED
  reveal_chapter INTEGER NOT NULL,
  -- Hint chain: short phrases / events that gradually build to the reveal
  setup_hints JSONB DEFAULT '[]'::JSONB,
  -- 'planned' = registered, no setup yet; 'seeding' = setup chapters reached
  -- 'imminent' = reveal_chapter within 10ch; 'revealed' = done; 'abandoned' = dropped
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'seeding', 'imminent', 'revealed', 'abandoned')),
  -- Importance 0-100; major twists drive entire arcs (80-100), minor reveals (30-50)
  importance INTEGER DEFAULT 50,
  -- Volume the twist belongs to (Phase 26 hierarchy)
  volume_number INTEGER,
  -- Notes for AI-friendly hints/dependencies
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
  'Phase 27 W3.1: pre-planned plot twists. Generated at master_outline stage. Status flows planned → seeding → imminent → revealed. Architect prompt seeds setup hints; Critic gates reveal chapters.';
