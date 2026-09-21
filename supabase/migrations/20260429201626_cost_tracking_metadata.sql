ALTER TABLE cost_tracking ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;;
