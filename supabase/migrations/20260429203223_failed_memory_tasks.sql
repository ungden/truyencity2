CREATE TABLE IF NOT EXISTS failed_memory_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  novel_id UUID,
  chapter_number INT,
  task_name TEXT NOT NULL,
  task_payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | succeeded | failed_permanent
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_memory_pending
  ON failed_memory_tasks (status, next_retry_at) WHERE status IN ('pending','processing');

CREATE INDEX IF NOT EXISTS idx_failed_memory_project
  ON failed_memory_tasks (project_id, created_at DESC);

ALTER TABLE failed_memory_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on failed_memory_tasks"
  ON failed_memory_tasks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');;
