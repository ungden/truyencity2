-- Quality Overhaul 1.6 — cross-chapter motif/repetition tracker.
CREATE TABLE IF NOT EXISTS public.motif_usage (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  motif text NOT NULL,
  first_chapter int NOT NULL,
  last_chapter int NOT NULL,
  use_count int NOT NULL DEFAULT 1,
  chapters int[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (project_id, motif)
);

CREATE INDEX IF NOT EXISTS idx_motif_usage_recent
  ON public.motif_usage (project_id, last_chapter DESC);

ALTER TABLE public.motif_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS motif_usage_service_all ON public.motif_usage;
CREATE POLICY motif_usage_service_all ON public.motif_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);;
