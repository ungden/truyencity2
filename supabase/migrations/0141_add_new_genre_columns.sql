-- Add missing genre-specific columns for 6 new genres (Phase 10A)
-- These genres were added to genre-config.ts but their required DB columns were never created

ALTER TABLE ai_story_projects ADD COLUMN IF NOT EXISTS martial_arts_system TEXT;  -- kiem-hiep
ALTER TABLE ai_story_projects ADD COLUMN IF NOT EXISTS apocalypse_type TEXT;       -- mat-the
ALTER TABLE ai_story_projects ADD COLUMN IF NOT EXISTS supernatural_system TEXT;   -- linh-di
ALTER TABLE ai_story_projects ADD COLUMN IF NOT EXISTS political_system TEXT;      -- quan-truong
ALTER TABLE ai_story_projects ADD COLUMN IF NOT EXISTS world_system TEXT;          -- di-gioi
ALTER TABLE ai_story_projects ADD COLUMN IF NOT EXISTS romance_type TEXT;          -- ngon-tinh

COMMENT ON COLUMN ai_story_projects.martial_arts_system IS 'Kiem-hiep: martial arts schools, techniques, power levels';
COMMENT ON COLUMN ai_story_projects.apocalypse_type IS 'Mat-the: apocalypse type, survival rules, threat system';
COMMENT ON COLUMN ai_story_projects.supernatural_system IS 'Linh-di: supernatural/occult system, ghost types, rituals';
COMMENT ON COLUMN ai_story_projects.political_system IS 'Quan-truong: political hierarchy, factions, promotion mechanics';
COMMENT ON COLUMN ai_story_projects.world_system IS 'Di-gioi: other-world system, races, magic/abilities, power ranks';
COMMENT ON COLUMN ai_story_projects.romance_type IS 'Ngon-tinh: romance subtype, setting, character dynamics, tone';
