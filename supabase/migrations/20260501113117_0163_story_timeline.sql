CREATE TABLE IF NOT EXISTS public.story_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  in_world_date_text TEXT,
  days_elapsed_since_start NUMERIC,
  season TEXT,
  mc_age NUMERIC,
  explicit_in_chapter BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_story_timeline_project_chapter
  ON public.story_timeline(project_id, chapter_number DESC);

ALTER TABLE public.story_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.story_timeline
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.story_timeline IS
  'Phase 27 W2.2: chapter ↔ in-world date tracking. AI extracts time-elapsed + MC age per chapter post-write. Used for time-consistency check.';;
