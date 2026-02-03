-- Migration: Phase 2 Tables for Story Writing Factory
-- Creates: embedding_cache, cost_tracking

-- ============================================================================
-- EMBEDDING CACHE TABLE
-- Caches embeddings to reduce API costs
-- ============================================================================

CREATE TABLE IF NOT EXISTS embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  text_hash VARCHAR(64) NOT NULL,
  embedding vector(1536),
  model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, text_hash)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_embedding_cache_lookup
  ON embedding_cache(project_id, text_hash);

-- Index for LRU eviction (by hit count)
CREATE INDEX IF NOT EXISTS idx_embedding_cache_hits
  ON embedding_cache(project_id, hit_count DESC);

-- ============================================================================
-- COST TRACKING TABLE
-- Tracks API costs for budget management
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  task VARCHAR(50) NOT NULL, -- 'writing', 'qc', 'summarization', 'outline', 'extraction'
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for daily cost queries
CREATE INDEX IF NOT EXISTS idx_cost_tracking_daily
  ON cost_tracking(project_id, created_at DESC);

-- Index for task-based analysis
CREATE INDEX IF NOT EXISTS idx_cost_tracking_task
  ON cost_tracking(project_id, task, created_at DESC);

-- ============================================================================
-- QC RESULTS TABLE
-- Stores QC evaluation results for analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS qc_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,

  -- Scores
  continuity_score INTEGER,
  repetition_score INTEGER,
  power_sanity_score INTEGER,
  new_info_score INTEGER,
  pacing_score INTEGER,
  overall_score INTEGER,

  -- Result
  passed BOOLEAN DEFAULT false,
  action VARCHAR(20), -- 'pass', 'auto_rewrite', 'human_review', 'fail'

  -- Details (JSON)
  failures JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  details JSONB DEFAULT '{}'::jsonb,

  -- Rewrite tracking
  rewrite_count INTEGER DEFAULT 0,
  original_chapter_id UUID REFERENCES chapters(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_qc_results_project
  ON qc_results(project_id, chapter_number);

CREATE INDEX IF NOT EXISTS idx_qc_results_failed
  ON qc_results(project_id, passed) WHERE passed = false;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get daily cost for a project
CREATE OR REPLACE FUNCTION get_daily_cost(p_project_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(cost), 0)
  FROM cost_tracking
  WHERE project_id = p_project_id
    AND created_at::DATE = p_date;
$$ LANGUAGE SQL STABLE;

-- Function to get cost by task type
CREATE OR REPLACE FUNCTION get_cost_by_task(p_project_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE(task VARCHAR, total_cost DECIMAL, call_count BIGINT) AS $$
  SELECT
    task,
    SUM(cost) as total_cost,
    COUNT(*) as call_count
  FROM cost_tracking
  WHERE project_id = p_project_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY task
  ORDER BY total_cost DESC;
$$ LANGUAGE SQL STABLE;

-- Function to get cache hit rate
CREATE OR REPLACE FUNCTION get_cache_hit_rate(p_project_id UUID)
RETURNS TABLE(total_entries BIGINT, total_hits BIGINT, estimated_savings DECIMAL) AS $$
  SELECT
    COUNT(*) as total_entries,
    SUM(hit_count - 1) as total_hits, -- -1 because first access isn't a "hit"
    SUM((hit_count - 1) * 0.0001)::DECIMAL as estimated_savings -- ~$0.0001 per embedding
  FROM embedding_cache
  WHERE project_id = p_project_id;
$$ LANGUAGE SQL STABLE;

-- Function to get QC pass rate
CREATE OR REPLACE FUNCTION get_qc_pass_rate(p_project_id UUID, p_last_n_chapters INTEGER DEFAULT 20)
RETURNS TABLE(total_chapters BIGINT, passed_chapters BIGINT, pass_rate DECIMAL, avg_score DECIMAL) AS $$
  SELECT
    COUNT(*) as total_chapters,
    SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed_chapters,
    ROUND(AVG(CASE WHEN passed THEN 100.0 ELSE 0.0 END), 1) as pass_rate,
    ROUND(AVG(overall_score), 1) as avg_score
  FROM (
    SELECT passed, overall_score
    FROM qc_results
    WHERE project_id = p_project_id
    ORDER BY chapter_number DESC
    LIMIT p_last_n_chapters
  ) recent;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update hit count timestamp
CREATE OR REPLACE FUNCTION update_embedding_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_embedding_cache_update
  BEFORE UPDATE ON embedding_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_cache_timestamp();
