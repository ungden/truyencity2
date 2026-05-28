-- Track 3 (2026-05-29): clear stale foundation verdict where canon is NULL.
--
-- A project's style_directives.foundation_review_latest.passed=true attests to a
-- power_system_canon + worldbuilding_canon that existed when the review ran. The
-- reset path (scripts/reset-novel-setup.ts) used to NULL those canon columns while
-- leaving the verdict in place, so the Track 1 write gate could read passed=true
-- against wiped canon (the c97b1d28 / f783a0ae case — 11 rows at audit time).
--
-- The reset script is fixed to strip the verdict going forward. This migration is
-- the idempotent one-off cleanup for rows that already drifted: archive the stale
-- verdict under foundation_review_cleared_stale and remove the live keys. Re-running
-- is a no-op once canon is NULL-and-unverified everywhere.

UPDATE ai_story_projects
SET style_directives =
  (style_directives - 'foundation_review_latest' - 'foundation_review_history')
  || jsonb_build_object(
       'foundation_review_cleared_stale',
       jsonb_build_object(
         'clearedAt', now()::text,
         'reason', 'Track 3 cleanup: canon columns NULL but foundation verdict said passed=true',
         'previous', style_directives->'foundation_review_latest'
       ))
WHERE (style_directives->'foundation_review_latest'->>'passed')::boolean IS TRUE
  AND (worldbuilding_canon IS NULL OR power_system_canon IS NULL);
