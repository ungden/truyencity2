ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS worldbuilding_canon JSONB;

COMMENT ON COLUMN public.ai_story_projects.worldbuilding_canon IS
  'Phase 27 W3.3: comprehensive worldbuilding canon generated at setup.';;
