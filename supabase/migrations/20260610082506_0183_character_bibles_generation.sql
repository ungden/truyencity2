-- Quality Overhaul 2.1 — character bible pedigree + grounding.
ALTER TABLE public.character_bibles
  ADD COLUMN IF NOT EXISTS generation int NOT NULL DEFAULT 0;

ALTER TABLE public.character_bibles
  ADD COLUMN IF NOT EXISTS grounding jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.character_bibles.generation IS
  'Number of LLM refresh cycles this bible has been through (pedigree).';
COMMENT ON COLUMN public.character_bibles.grounding IS
  'What the latest refresh saw: {states_count, latest_state_chapter, chunks_used, corrected_fields}.';;
