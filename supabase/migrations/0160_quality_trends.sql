-- 0160: Quality trend tracking — V1 of supreme goals verification.
-- Daily snapshot per project comparing early-chapter quality vs recent-chapter quality
-- to detect quality drift over long-form (1000+ chapter) novels.

CREATE TABLE IF NOT EXISTS public.quality_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  current_chapter INTEGER NOT NULL,
  -- Early window: avg(overall_score) of first N chapters with quality_metrics rows
  early_window_chapters INTEGER NOT NULL,
  early_avg_score NUMERIC(4,2),
  -- Recent window: avg(overall_score) of last N chapters (excluding overlap with early)
  recent_window_chapters INTEGER NOT NULL,
  recent_avg_score NUMERIC(4,2),
  -- Drift = recent - early. Negative = degrading.
  drift NUMERIC(4,2),
  -- Continuity issue trend
  critical_issues_total INTEGER DEFAULT 0,
  guardian_issues_total INTEGER DEFAULT 0,
  -- Alert level: ok | watch | warn | critical
  alert_level TEXT NOT NULL CHECK (alert_level IN ('ok', 'watch', 'warn', 'critical')),
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_quality_trends_project_date
  ON public.quality_trends(project_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_quality_trends_alert
  ON public.quality_trends(alert_level, snapshot_date DESC)
  WHERE alert_level IN ('warn', 'critical');

ALTER TABLE public.quality_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.quality_trends
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.quality_trends IS
  'V1 (2026-04-30): daily quality drift snapshot. Compare early chapters vs recent to detect long-form degradation. Updated by quality-trend-cron daily 00:30 VN.';
