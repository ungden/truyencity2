-- Quality Overhaul 2.1 — character bible pedigree + grounding.
-- Bibles are LLM-regenerated every ~20 chapters (50-100 cycles for a
-- 1000-2000 chapter novel). Without pedigree there's no way to see how many
-- generations a bible has survived or what data grounded the latest refresh —
-- silent drift was undiagnosable. The deterministic fields (status /
-- power_realm_index) are now validated against character_states after every
-- refresh; `grounding` records what the refresh actually saw.

ALTER TABLE public.character_bibles
  ADD COLUMN IF NOT EXISTS generation int NOT NULL DEFAULT 0;

ALTER TABLE public.character_bibles
  ADD COLUMN IF NOT EXISTS grounding jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.character_bibles.generation IS
  'Number of LLM refresh cycles this bible has been through (pedigree).';
COMMENT ON COLUMN public.character_bibles.grounding IS
  'What the latest refresh saw: {states_count, latest_state_chapter, chunks_used, corrected_fields}.';
