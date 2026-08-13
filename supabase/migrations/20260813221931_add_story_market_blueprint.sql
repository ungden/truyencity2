ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS market_blueprint jsonb;

ALTER TABLE public.ai_story_projects
  DROP CONSTRAINT IF EXISTS ai_story_projects_market_blueprint_object,
  ADD CONSTRAINT ai_story_projects_market_blueprint_object
    CHECK (market_blueprint IS NULL OR jsonb_typeof(market_blueprint) = 'object');

COMMENT ON COLUMN public.ai_story_projects.market_blueprint IS
  'Structured market contract: topic collision, comparison/conflict engines, early payoffs, and scale ladder. Planner guidance, never published canon.';
