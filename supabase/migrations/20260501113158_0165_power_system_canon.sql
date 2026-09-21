ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS power_system_canon JSONB;

COMMENT ON COLUMN public.ai_story_projects.power_system_canon IS
  'Phase 27 W2.4: comprehensive power-system rules generated at setup.';;
