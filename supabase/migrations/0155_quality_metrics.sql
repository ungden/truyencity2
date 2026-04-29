-- 0155_quality_metrics.sql — Quality Metrics (Phase 22 Stage 2 Q8)
--
-- Per-chapter quality scores logged after write. Enables A/B tests, regression detection,
-- and reader-retention correlation analysis.

CREATE TABLE IF NOT EXISTS quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  novel_id UUID,
  -- Critic-emitted scores (0-10)
  overall_score INT,
  dopamine_score INT,
  pacing_score INT,
  ending_hook_score INT,
  word_count INT,
  word_ratio NUMERIC(4,2),       -- actual/target
  -- Continuity counts
  contradictions_critical INT NOT NULL DEFAULT 0,
  contradictions_warning INT NOT NULL DEFAULT 0,
  guardian_issues_critical INT NOT NULL DEFAULT 0,
  guardian_issues_major INT NOT NULL DEFAULT 0,
  guardian_issues_moderate INT NOT NULL DEFAULT 0,
  -- Recovery actions
  rewrites_attempted INT NOT NULL DEFAULT 0,
  auto_revised BOOLEAN NOT NULL DEFAULT false,
  -- Pipeline metadata
  context_size_chars INT,        -- assembled context length
  writer_evidence_chars INT,     -- Writer's evidence pack size
  -- Free-form structured detail for later analysis
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_project_chapter
  ON quality_metrics (project_id, chapter_number DESC);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_overall
  ON quality_metrics (overall_score) WHERE overall_score IS NOT NULL;

ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on quality_metrics"
  ON quality_metrics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users read own quality_metrics"
  ON quality_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_story_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );
