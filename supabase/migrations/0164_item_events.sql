-- 0164: Item events — Phase 27 W2.3.
-- Tracks items picked up, used, lost, gifted by characters across chapters.
-- Pre-Phase-27 problem: AI could have MC pick up artifact A at ch.50, never
-- mention again, then "MC dùng A" at ch.500 even though it was lost at ch.200.
-- Or worse: AI invents items MC never had.

CREATE TABLE IF NOT EXISTS public.item_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  character_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  -- 'picked' = obtained / 'used' = consumed-once / 'equipped' = bound long-term /
  -- 'lost' = stolen/dropped / 'gifted' = given away / 'destroyed' = broken /
  -- 'mentioned' = referenced (no state change)
  event_type TEXT NOT NULL CHECK (event_type IN ('picked','used','equipped','lost','gifted','destroyed','mentioned')),
  -- Free-text describing the event (for debugging + reader-facing tracking)
  description TEXT,
  -- Importance 0-100; high = items that should be tracked closely (artifacts, key clues)
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
  'Phase 27 W2.3: per-chapter item event log. AI extracts item picked/used/lost/gifted events post-write. Used to compute current inventory + flag impossible item references.';
