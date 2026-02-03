-- Story Writing Sessions Table for Admin Tool
-- Stores chat-based writing sessions with AI

-- Create story_writing_sessions table
CREATE TABLE IF NOT EXISTS story_writing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'planning', 'writing', 'reviewing', 'completed', 'error')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_step TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create story_writing_outlines table for planning
CREATE TABLE IF NOT EXISTS story_writing_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  synopsis TEXT,
  total_chapters INTEGER NOT NULL DEFAULT 100,
  arcs JSONB NOT NULL DEFAULT '[]'::jsonb,
  characters JSONB NOT NULL DEFAULT '[]'::jsonb,
  world_building TEXT,
  themes TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ai_provider_settings table for user's API keys
CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  provider_configs JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_provider TEXT DEFAULT 'openrouter',
  default_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_story_writing_sessions_user_id ON story_writing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_story_writing_sessions_project_id ON story_writing_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_story_writing_sessions_status ON story_writing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_story_writing_outlines_user_id ON story_writing_outlines(user_id);
CREATE INDEX IF NOT EXISTS idx_story_writing_outlines_project_id ON story_writing_outlines(project_id);

-- Enable RLS
ALTER TABLE story_writing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_writing_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_writing_sessions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_writing_sessions' AND policyname = 'Users can view their own sessions') THEN
    CREATE POLICY "Users can view their own sessions" ON story_writing_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_writing_sessions' AND policyname = 'Users can create their own sessions') THEN
    CREATE POLICY "Users can create their own sessions" ON story_writing_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_writing_sessions' AND policyname = 'Users can update their own sessions') THEN
    CREATE POLICY "Users can update their own sessions" ON story_writing_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_writing_sessions' AND policyname = 'Users can delete their own sessions') THEN
    CREATE POLICY "Users can delete their own sessions" ON story_writing_sessions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for story_writing_outlines
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_writing_outlines' AND policyname = 'Users can view their own outlines') THEN
    CREATE POLICY "Users can view their own outlines" ON story_writing_outlines
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_writing_outlines' AND policyname = 'Users can create their own outlines') THEN
    CREATE POLICY "Users can create their own outlines" ON story_writing_outlines
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_writing_outlines' AND policyname = 'Users can update their own outlines') THEN
    CREATE POLICY "Users can update their own outlines" ON story_writing_outlines
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'story_writing_outlines' AND policyname = 'Users can delete their own outlines') THEN
    CREATE POLICY "Users can delete their own outlines" ON story_writing_outlines
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for ai_provider_settings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_provider_settings' AND policyname = 'Users can view their own provider settings') THEN
    CREATE POLICY "Users can view their own provider settings" ON ai_provider_settings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_provider_settings' AND policyname = 'Users can create their own provider settings') THEN
    CREATE POLICY "Users can create their own provider settings" ON ai_provider_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_provider_settings' AND policyname = 'Users can update their own provider settings') THEN
    CREATE POLICY "Users can update their own provider settings" ON ai_provider_settings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_provider_settings' AND policyname = 'Users can delete their own provider settings') THEN
    CREATE POLICY "Users can delete their own provider settings" ON ai_provider_settings
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_story_writing_sessions_updated_at ON story_writing_sessions;
CREATE TRIGGER update_story_writing_sessions_updated_at
  BEFORE UPDATE ON story_writing_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_story_writing_outlines_updated_at ON story_writing_outlines;
CREATE TRIGGER update_story_writing_outlines_updated_at
  BEFORE UPDATE ON story_writing_outlines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_provider_settings_updated_at ON ai_provider_settings;
CREATE TRIGGER update_ai_provider_settings_updated_at
  BEFORE UPDATE ON ai_provider_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
