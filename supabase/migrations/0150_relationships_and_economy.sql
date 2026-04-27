-- Migration 0150: Character Relationships + Economic Ledger
--
-- Adds 2 lightweight coherence tables for long-form coherence:
--   1. character_relationships — track A↔B emotional state per chapter (love/hate/neutral)
--   2. economic_ledger — track money/resources for do-thi/quan-truong (prevent illogical wealth)
--
-- Both are populated by post-write extraction tasks and queried by context-assembler
-- before each chapter to surface latent contradictions.

-- ── Character Relationships ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  -- Relationship from character_a's perspective toward character_b
  character_a TEXT NOT NULL,
  character_b TEXT NOT NULL,
  relationship_type TEXT NOT NULL,  -- love, friendship, rivalry, hate, family, mentor, enemy, ally, neutral, romantic_interest
  intensity INT,                     -- 1-10 intensity scale
  notes TEXT,                        -- brief context
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_char_rel_project_chapter
  ON public.character_relationships (project_id, chapter_number DESC);
CREATE INDEX IF NOT EXISTS idx_char_rel_pair
  ON public.character_relationships (project_id, character_a, character_b);

COMMENT ON TABLE public.character_relationships IS
  'Tracks evolving A→B relationship state per chapter. Used to detect illogical flips (yêu→thù without trigger) — supports long-form coherence.';

-- ── Economic Ledger (do-thi / quan-truong / kinh-doanh genres) ──

CREATE TABLE IF NOT EXISTS public.economic_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  -- Track financial state of MC + key entities
  entity_name TEXT NOT NULL,         -- "MC" or company/character name
  entity_type TEXT,                  -- 'mc', 'company', 'family', 'investor'
  -- Wealth/resources state
  cash_estimate TEXT,                -- e.g., "5 tỷ", "200 nguyên" — flexible string for currency
  assets TEXT[],                     -- list of significant assets (real estate, businesses, etc.)
  monthly_revenue TEXT,
  team_size INT,                     -- for businesses
  -- Recent material change
  delta_summary TEXT,                -- "Earned X from Y deal", "Acquired Z"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_econ_ledger_project_chapter
  ON public.economic_ledger (project_id, chapter_number DESC);
CREATE INDEX IF NOT EXISTS idx_econ_ledger_entity
  ON public.economic_ledger (project_id, entity_name);

COMMENT ON TABLE public.economic_ledger IS
  'Tracks MC and key entities financial state per chapter for do-thi/quan-truong/kinh-doanh genres. Prevents illogical wealth jumps (MC kiếm 1 tỷ ch.20 nhưng tiêu 100 tỷ ch.50 không có deal lớn).';
