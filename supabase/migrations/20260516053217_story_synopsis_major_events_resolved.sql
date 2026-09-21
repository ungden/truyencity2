-- Phase 2026-05-16 root-cause fix: chapter event repetition.
-- Adds explicit ledger of major resolved events to story_synopsis.
ALTER TABLE story_synopsis
  ADD COLUMN IF NOT EXISTS major_events_resolved TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN story_synopsis.major_events_resolved IS
  'Phase 2026-05-16: structured ledger of major resolved events tagged by chapter. Used by generateArcPlan + Architect to prevent event re-staging in later arcs.';;
