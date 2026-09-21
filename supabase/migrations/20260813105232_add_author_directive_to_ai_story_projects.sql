-- Author steering: free-text direction for a RUNNING novel, read by the
-- Planner payload and the Writer brief from the next chapter on. Never canon;
-- validation and the ledger always win on conflict. Nullable = no directive.
ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS author_directive text;;
