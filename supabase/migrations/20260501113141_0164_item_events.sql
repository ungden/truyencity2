CREATE TABLE IF NOT EXISTS public.item_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  character_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('picked','used','equipped','lost','gifted','destroyed','mentioned')),
  description TEXT,
  importance INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_events_project_char
  ON public.item_events(project_id, character_name);

CREATE INDEX IF NOT EXISTS idx_item_events_project_chapter
  ON public.item_events(project_id, chapter_number DESC);

CREATE INDEX IF NOT EXISTS idx_item_events_project_item
  ON public.item_events(project_id, item_name);

ALTER TABLE public.item_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.item_events
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.item_events IS
  'Phase 27 W2.3: per-chapter item event log.';;
