-- ============================================================================
-- Migration 0132: Fix character_arcs table — add missing columns
--
-- The character_arcs table was pre-created with only (id, project_id, 
-- character_name, created_at, updated_at). Migration 0130 skipped it
-- due to IF NOT EXISTS. This adds the 8 missing columns.
-- ============================================================================

ALTER TABLE character_arcs
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('protagonist', 'rival', 'mentor', 'love_interest', 'ally', 'villain', 'comic_relief', 'recurring_npc')),
  ADD COLUMN IF NOT EXISTS internal_conflict TEXT,
  ADD COLUMN IF NOT EXISTS arc_phases JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS signature_traits JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS relationship_with_mc TEXT,
  ADD COLUMN IF NOT EXISTS current_phase TEXT,
  ADD COLUMN IF NOT EXISTS appearance_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_seen_chapter INT;
