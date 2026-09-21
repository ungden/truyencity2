
ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS pause_reason TEXT,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ai_story_projects.pause_reason IS
  'Auto-pause reason. Set by cron when circuit breaker fires or daily cost cap exceeded.';
COMMENT ON COLUMN public.ai_story_projects.paused_at IS
  'When the auto-pause occurred (UTC). Manual pauses leave this NULL.';

CREATE INDEX IF NOT EXISTS idx_ai_story_projects_paused_at
  ON public.ai_story_projects(paused_at DESC)
  WHERE paused_at IS NOT NULL;
;
