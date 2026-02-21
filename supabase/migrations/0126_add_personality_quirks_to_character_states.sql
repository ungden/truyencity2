-- Migration 0126: Add personality quirks to character_states
ALTER TABLE character_states ADD COLUMN IF NOT EXISTS personality_quirks TEXT;
