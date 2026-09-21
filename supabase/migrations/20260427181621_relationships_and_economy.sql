CREATE TABLE IF NOT EXISTS public.character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  character_a TEXT NOT NULL,
  character_b TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  intensity INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_char_rel_project_chapter
  ON public.character_relationships (project_id, chapter_number DESC);
CREATE INDEX IF NOT EXISTS idx_char_rel_pair
  ON public.character_relationships (project_id, character_a, character_b);

COMMENT ON TABLE public.character_relationships IS
  'Tracks evolving A->B relationship state per chapter. Used to detect illogical flips (yeu->thu without trigger) - supports long-form coherence.';

CREATE TABLE IF NOT EXISTS public.economic_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  entity_name TEXT NOT NULL,
  entity_type TEXT,
  cash_estimate TEXT,
  assets TEXT[],
  monthly_revenue TEXT,
  team_size INT,
  delta_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_econ_ledger_project_chapter
  ON public.economic_ledger (project_id, chapter_number DESC);
CREATE INDEX IF NOT EXISTS idx_econ_ledger_entity
  ON public.economic_ledger (project_id, entity_name);

COMMENT ON TABLE public.economic_ledger IS
  'Tracks MC and key entities financial state per chapter for do-thi/quan-truong/kinh-doanh genres. Prevents illogical wealth jumps.';;
