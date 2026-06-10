-- Quality Overhaul 1.6 — cross-chapter motif/repetition tracker.
-- The Critic only checks repetition WITHIN a chapter; the same imagery
-- ("ánh ban mai", "khóe miệng cong lên") recurring 5 chapters in a row was
-- invisible. Deterministic post-write extraction upserts here; pre-write the
-- Architect gets a [CẤM LẶP] ban list of motifs used ≥3 times in the last
-- 5 chapters.

CREATE TABLE IF NOT EXISTS public.motif_usage (
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  motif text NOT NULL,
  first_chapter int NOT NULL,
  last_chapter int NOT NULL,
  use_count int NOT NULL DEFAULT 1,
  -- chapter numbers where the motif appeared (capped at the most recent 20)
  chapters int[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (project_id, motif)
);

CREATE INDEX IF NOT EXISTS idx_motif_usage_recent
  ON public.motif_usage (project_id, last_chapter DESC);

ALTER TABLE public.motif_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS motif_usage_service_all ON public.motif_usage;
CREATE POLICY motif_usage_service_all ON public.motif_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);
