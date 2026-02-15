-- Migration: Add story_outline (jsonb) to ai_story_projects
-- and is_finale_arc (boolean) to arc_plans.
-- Supports: Gap 1 (persist StoryOutline), Gap 3 (finale detection).

ALTER TABLE ai_story_projects
  ADD COLUMN IF NOT EXISTS story_outline jsonb;

ALTER TABLE arc_plans
  ADD COLUMN IF NOT EXISTS is_finale_arc boolean DEFAULT false;
