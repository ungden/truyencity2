-- 0169: Worldbuilding canon — Phase 27 W3.3.
-- Comprehensive worldbuilding doc generated at setup. Covers:
--   - cosmology (how the universe works)
--   - history (pre-story events, ages, dynasties)
--   - cultures (customs, taboos, religions)
--   - geography overview (regions + characteristics)
--   - economy (currency, trade)
--
-- Different from world_description (high-level premise blob) — this is a
-- structured, queryable canon that AI references for every chapter.

ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS worldbuilding_canon JSONB;

COMMENT ON COLUMN public.ai_story_projects.worldbuilding_canon IS
  'Phase 27 W3.3: comprehensive worldbuilding canon generated at setup. Schema: { cosmology, history: [{age, description, keyEvents}], cultures: [{name, customs, taboos, religion}], regions: [{name, description, climate, factions}], economy: { currency, tradeRoutes }, dailyLife }';
