-- ============================================================================
-- JOB QUEUE SYSTEM
-- Phase 3: Performance - Reliable async job processing
-- ============================================================================

-- Job status enum
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying', 'timeout');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Job type enum
DO $$ BEGIN
  CREATE TYPE job_type AS ENUM ('write_chapter', 'batch_write', 'analyze_chapter', 'generate_summary', 'export_story');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- JOB QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job definition
  type job_type NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = more priority

  -- Payload and result
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,

  -- Retry configuration
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  timeout_ms INTEGER NOT NULL DEFAULT 300000, -- 5 minutes default

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Progress tracking
  progress INTEGER NOT NULL DEFAULT 0, -- 0-100
  progress_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding next job to process (most critical query)
CREATE INDEX IF NOT EXISTS idx_job_queue_next_job
  ON job_queue (status, scheduled_for, priority DESC, created_at)
  WHERE status IN ('pending', 'retrying');

-- Index for user's jobs
CREATE INDEX IF NOT EXISTS idx_job_queue_user_id ON job_queue(user_id);

-- Index for job status
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);

-- Index for cleanup (old completed/failed jobs)
CREATE INDEX IF NOT EXISTS idx_job_queue_cleanup
  ON job_queue (completed_at)
  WHERE status IN ('completed', 'failed');

-- Index for type-based queries
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
DO $$ BEGIN
CREATE POLICY "Users can view own jobs"
  ON job_queue FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Users can insert their own jobs
DO $$ BEGIN
CREATE POLICY "Users can create own jobs"
  ON job_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Users can update their own pending jobs (e.g., cancel)
DO $$ BEGIN
CREATE POLICY "Users can update own pending jobs"
  ON job_queue FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'retrying'))
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ADDITIONAL PERFORMANCE INDEXES FOR EXISTING TABLES
-- ============================================================================

-- ai_story_projects indexes
CREATE INDEX IF NOT EXISTS idx_ai_story_projects_user_status
  ON ai_story_projects(user_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_story_projects_novel_id
  ON ai_story_projects(novel_id);

-- chapters indexes
CREATE INDEX IF NOT EXISTS idx_chapters_novel_number
  ON chapters(novel_id, chapter_number);

CREATE INDEX IF NOT EXISTS idx_chapters_created_at
  ON chapters(created_at DESC);

-- story_graph_nodes indexes
CREATE INDEX IF NOT EXISTS idx_story_graph_nodes_project_chapter
  ON story_graph_nodes(project_id, chapter_number);

-- plot_arcs indexes
CREATE INDEX IF NOT EXISTS idx_plot_arcs_project_status
  ON plot_arcs(project_id, status);

-- novels indexes
CREATE INDEX IF NOT EXISTS idx_novels_user_id
  ON novels(user_id);

CREATE INDEX IF NOT EXISTS idx_novels_status
  ON novels(status);

CREATE INDEX IF NOT EXISTS idx_novels_created_at
  ON novels(created_at DESC);

-- ============================================================================
-- FUNCTIONS FOR JOB PROCESSING
-- ============================================================================

-- Function to get and lock next job (atomic operation)
CREATE OR REPLACE FUNCTION get_and_lock_next_job()
RETURNS job_queue AS $$
DECLARE
  v_job job_queue;
BEGIN
  SELECT * INTO v_job
  FROM job_queue
  WHERE status IN ('pending', 'retrying')
    AND scheduled_for <= NOW()
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE job_queue
    SET
      status = 'processing',
      started_at = NOW(),
      attempts = attempts + 1,
      updated_at = NOW()
    WHERE id = v_job.id;

    v_job.status := 'processing';
    v_job.started_at := NOW();
    v_job.attempts := v_job.attempts + 1;
  END IF;

  RETURN v_job;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM job_queue
  WHERE status IN ('completed', 'failed', 'timeout')
    AND completed_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Function to check for stuck jobs (processing for too long)
CREATE OR REPLACE FUNCTION check_stuck_jobs()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE job_queue
  SET
    status = 'timeout',
    error = 'Job exceeded timeout while processing',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE status = 'processing'
    AND started_at < NOW() - (timeout_ms || ' milliseconds')::INTERVAL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;
