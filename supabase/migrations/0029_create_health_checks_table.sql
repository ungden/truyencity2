-- Health check results table for daily system monitoring
CREATE TABLE IF NOT EXISTS health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Overall status
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  
  -- Metrics snapshot (JSONB for flexibility)
  metrics JSONB NOT NULL DEFAULT '{}',
  
  -- Individual check results
  checks JSONB NOT NULL DEFAULT '[]',
  
  -- Summary
  summary TEXT,
  
  -- Duration of the health check itself
  duration_ms INTEGER
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at ON health_checks(created_at DESC);

-- Keep only last 90 days of health checks (cleanup policy)
-- Can be run manually or via pg_cron
CREATE OR REPLACE FUNCTION cleanup_old_health_checks() RETURNS void AS $$
BEGIN
  DELETE FROM health_checks WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;
