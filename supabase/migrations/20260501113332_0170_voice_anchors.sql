CREATE TABLE IF NOT EXISTS public.voice_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  snippet_type TEXT NOT NULL,
  snippet_text TEXT NOT NULL,
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
  'Phase 27 W4.2: voice anchor snippets from ch.1-3.';;
