-- Phase N.1 (2026-05-12): DOME-inspired causal chain tracking.
--
-- Current character_knowledge tracks "char X knows Y at ch.Z" but không track WHY.
-- Ch.500 MC nhắc fact Y, reader confused vì không có context setup.
--
-- causal_chain TEXT[]: entries describing how knowledge was acquired:
--   ["event:ch.50_uchiha_reveal", "char:Itachi_told_MC", "scene:cave_meeting"]
--
-- Used by context-assembler (N.2) to surface relevant past events when current
-- chapter references this knowledge.

ALTER TABLE character_knowledge
  ADD COLUMN IF NOT EXISTS causal_chain TEXT[] DEFAULT '{}';

COMMENT ON COLUMN character_knowledge.causal_chain IS
  'Phase N.1 (2026-05-12): DOME-inspired causal chain tracking WHY char knows fact. Entries: ["event:ch.50_uchiha_reveal", "char:Itachi_told_MC", "scene:cave_meeting"]. Used by context-assembler to surface relevant past events when current chapter references this knowledge.';
