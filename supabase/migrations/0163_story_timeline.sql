-- 0163: Story timeline — Phase 27 W2.2.
-- Track chapter ↔ in-world date so AI maintains time consistency over 1000+ chapters.
-- Pre-Phase-27 problem: AI could write "3 years later" then "2 years before" with no
-- check. MC's age drifted (still 18 at chapter 800 of a 1000-chapter cultivation novel).
-- Fix: AI extracts in-world time per chapter; consistency check flags violations.

CREATE TABLE IF NOT EXISTS public.story_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  -- Free-text in-world date (vd "Năm thứ 3 thời Đại Tấn", "Mùa hạ năm 2024", "Day 47")
  in_world_date_text TEXT,
  -- Days elapsed since chapter 1 (best-effort numeric for sanity-checking time jumps)
  days_elapsed_since_start NUMERIC,
  season TEXT,
  -- MC age (numeric for age-drift detection in long-form novels)
  mc_age NUMERIC,
  -- Was time explicitly mentioned in this chapter? (false = inferred from prev)
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
  'Phase 27 W2.2: chapter ↔ in-world date tracking. AI extracts time-elapsed + MC age per chapter post-write. Used for time-consistency check (no random "3 years later" → "2 years before").';
