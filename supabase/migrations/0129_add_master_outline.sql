-- Migration 0129: Add master_outline to ai_story_projects
ALTER TABLE ai_story_projects ADD COLUMN IF NOT EXISTS master_outline JSONB;
