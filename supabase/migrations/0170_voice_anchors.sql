-- 0170: Voice anchors — Phase 27 W4.2.
-- Captures prose snippets from chương 1-3 (after they're written, become canonical
-- voice). Used as voice reference re-fed to Writer every 50 chapters to combat
-- voice drift over long-form novels.

CREATE TABLE IF NOT EXISTS public.voice_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  -- 'opening' (first 800 chars), 'dialogue' (first dialog block 800 chars),
  -- 'narration' (a descriptive passage 800 chars), 'inner_monologue', 'action_scene'
  snippet_type TEXT NOT NULL,
  snippet_text TEXT NOT NULL,
  -- Voice characteristics extracted from snippet (avg sentence length, dialogue
  -- ratio, etc.) — JSONB for flexible storage
  voice_metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, chapter_number, snippet_type)
);

CREATE INDEX IF NOT EXISTS idx_voice_anchors_project
  ON public.voice_anchors(project_id, chapter_number ASC);

ALTER TABLE public.voice_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.voice_anchors
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.voice_anchors IS
  'Phase 27 W4.2: voice anchor snippets from ch.1-3. Re-fed to Writer prompt every 50ch as voice reference to combat drift in long-form novels.';
