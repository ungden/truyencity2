-- Daily hard quota tracking for writing scheduler.
-- Enforces exact per-project daily target accounting (Vietnam day).

CREATE TABLE IF NOT EXISTS project_daily_quotas (
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  vn_date DATE NOT NULL,
  target_chapters INTEGER NOT NULL DEFAULT 20 CHECK (target_chapters > 0),
  written_chapters INTEGER NOT NULL DEFAULT 0 CHECK (written_chapters >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  next_due_at TIMESTAMPTZ,
  slot_seed INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, vn_date)
);

CREATE INDEX IF NOT EXISTS idx_project_daily_quotas_vn_date
  ON project_daily_quotas(vn_date);

CREATE INDEX IF NOT EXISTS idx_project_daily_quotas_due
  ON project_daily_quotas(vn_date, status, written_chapters, next_due_at);
