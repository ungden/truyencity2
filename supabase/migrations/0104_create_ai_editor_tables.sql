-- AI Editor tables for daily quality scan and cascade rewrite jobs.

CREATE TABLE IF NOT EXISTS editor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,
  failures JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  details JSONB DEFAULT '{}'::jsonb,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_reviews_project_chapter
  ON editor_reviews(project_id, chapter_number DESC);

CREATE INDEX IF NOT EXISTS idx_editor_reviews_low_score
  ON editor_reviews(overall_score, scanned_at DESC);

CREATE TABLE IF NOT EXISTS rewrite_chain_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  trigger_review_id UUID REFERENCES editor_reviews(id) ON DELETE SET NULL,
  start_chapter INTEGER NOT NULL,
  end_chapter INTEGER NOT NULL,
  current_chapter INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | running | completed | failed | cancelled
  attempts INTEGER NOT NULL DEFAULT 0,
  rewritten_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rewrite_chain_jobs_status
  ON rewrite_chain_jobs(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rewrite_chain_jobs_project
  ON rewrite_chain_jobs(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rewrite_chain_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES rewrite_chain_jobs(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  chapter_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | rewritten | failed | skipped
  before_score INTEGER,
  after_score INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_rewrite_chain_items_job_status
  ON rewrite_chain_items(job_id, status, chapter_number);

CREATE TABLE IF NOT EXISTS chapter_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  source VARCHAR(30) NOT NULL, -- original | auto_rewrite | manual_rewrite
  title TEXT,
  content TEXT,
  quality_score INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter
  ON chapter_versions(chapter_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_rewrite_chain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rewrite_chain_jobs_updated_at ON rewrite_chain_jobs;
CREATE TRIGGER trg_rewrite_chain_jobs_updated_at
  BEFORE UPDATE ON rewrite_chain_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_rewrite_chain_updated_at();

DROP TRIGGER IF EXISTS trg_rewrite_chain_items_updated_at ON rewrite_chain_items;
CREATE TRIGGER trg_rewrite_chain_items_updated_at
  BEFORE UPDATE ON rewrite_chain_items
  FOR EACH ROW
  EXECUTE FUNCTION update_rewrite_chain_updated_at();
