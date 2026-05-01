-- 0165: Power system canon — Phase 27 W2.4.
-- Generated at project setup. Comprehensive RULES doc for the world's power system:
-- cảnh giới ladder, breakthrough conditions, ceiling, side effects, item tiers.
-- Different from state/mc-power-state.ts which tracks MC's CURRENT level —
-- this is the CANON RULES that govern everyone in the world.

-- Add JSONB column to existing projects table.
ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS power_system_canon JSONB;

COMMENT ON COLUMN public.ai_story_projects.power_system_canon IS
  'Phase 27 W2.4: comprehensive power-system rules generated at setup. Schema: { ladder: [{name, description, requirements, ceiling}], breakthroughs: [{from, to, conditions, sideEffects}], itemTiers: [...], cultivationRules: "...", commonViolations: [...] }';
