-- 0161: Setup stage state machine.
-- Replace ad-hoc "regen lump call" với explicit pipeline: idea → world → character →
-- description → master_outline → story_outline → arc_plan → ready_to_write → writing → completed.
-- Each cron tick advances 1 stage. No fallback to defaults — stage retries until success.

ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS setup_stage TEXT NOT NULL DEFAULT 'ready_to_write',
  ADD COLUMN IF NOT EXISTS setup_stage_updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS setup_stage_error TEXT,
  ADD COLUMN IF NOT EXISTS setup_stage_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.ai_story_projects
  DROP CONSTRAINT IF EXISTS chk_setup_stage;
ALTER TABLE public.ai_story_projects
  ADD CONSTRAINT chk_setup_stage CHECK (setup_stage IN (
    'idea', 'world', 'character', 'description',
    'master_outline', 'story_outline', 'arc_plan',
    'ready_to_write', 'writing', 'completed'
  ));

-- Index for stage filter (cron picks up novels NOT in 'ready_to_write'/'writing'/'completed')
CREATE INDEX IF NOT EXISTS idx_ai_story_projects_setup_stage
  ON public.ai_story_projects(setup_stage, setup_stage_updated_at)
  WHERE setup_stage NOT IN ('ready_to_write', 'writing', 'completed');

-- Existing novels with full setup → 'ready_to_write' (default)
-- Wiped novels (world_description IS NULL) → 'idea' to restart pipeline
UPDATE public.ai_story_projects
SET setup_stage = 'idea', setup_stage_updated_at = now()
WHERE world_description IS NULL OR main_character = '' OR main_character IS NULL;

COMMENT ON COLUMN public.ai_story_projects.setup_stage IS
  'P-stage state machine. Cron init-prep reads + advances 1 stage per tick. No fallback.';
