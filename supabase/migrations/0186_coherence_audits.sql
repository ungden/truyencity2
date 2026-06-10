-- Quality Overhaul 4.2 — persisted coherence audits.
-- scripts/coherence-audit-v2.ts computed 5-dimension audits but results were
-- printed to stdout and lost. The runner now lives in the engine
-- (quality/audit-runner.ts), runs from the quality-trend cron every 50
-- chapters per production novel, and persists here for the /admin/quality
-- dashboard — the ch.8-vs-ch.800 uniformity validator.

CREATE TABLE IF NOT EXISTS public.coherence_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id uuid REFERENCES public.novels(id) ON DELETE CASCADE,
  chapter_start int NOT NULL,
  chapter_end int NOT NULL,
  audit_type text NOT NULL DEFAULT 'coherence_5dim',
  -- {coherence_score, continuity_score, character_consistency_score,
  --  progression_score, quality_stability_score, risk_level, verdict}
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- {key_issues[], structural: {gap_count, missing_summary_count, ...}}
  findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coherence_audits_project
  ON public.coherence_audits (project_id, created_at DESC);

ALTER TABLE public.coherence_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coherence_audits_service_all ON public.coherence_audits;
CREATE POLICY coherence_audits_service_all ON public.coherence_audits
  FOR ALL TO service_role USING (true) WITH CHECK (true);
