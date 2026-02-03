-- Create claude_code_tasks table for Claude Code integration
CREATE TABLE IF NOT EXISTS claude_code_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'write_chapter',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  prompt TEXT,
  chapter_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  result_chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_claude_code_tasks_user_id ON claude_code_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_claude_code_tasks_project_id ON claude_code_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_claude_code_tasks_status ON claude_code_tasks(status);
CREATE INDEX IF NOT EXISTS idx_claude_code_tasks_created_at ON claude_code_tasks(created_at DESC);

-- Enable RLS
ALTER TABLE claude_code_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'claude_code_tasks' AND policyname = 'Users can view own tasks'
  ) THEN
    CREATE POLICY "Users can view own tasks"
      ON claude_code_tasks FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Users can create their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'claude_code_tasks' AND policyname = 'Users can create own tasks'
  ) THEN
    CREATE POLICY "Users can create own tasks"
      ON claude_code_tasks FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Users can update their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'claude_code_tasks' AND policyname = 'Users can update own tasks'
  ) THEN
    CREATE POLICY "Users can update own tasks"
      ON claude_code_tasks FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Users can delete their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'claude_code_tasks' AND policyname = 'Users can delete own tasks'
  ) THEN
    CREATE POLICY "Users can delete own tasks"
      ON claude_code_tasks FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_claude_code_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_claude_code_tasks_updated_at ON claude_code_tasks;
CREATE TRIGGER trigger_claude_code_tasks_updated_at
  BEFORE UPDATE ON claude_code_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_claude_code_tasks_updated_at();
