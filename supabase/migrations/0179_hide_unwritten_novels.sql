-- Track 4 (2026-05-29): hide novels that never wrote a chapter.
--
-- The mass-spawn path (daily-spawn → ContentSeeder) created a `novels` row
-- IMMEDIATELY visible the moment a project was spawned — long before (and often
-- WITHOUT ever) writing chapter 1. Audit at this date: of 1,183 visible novels,
-- only 354 have ≥1 chapter; 829 are empty shells. A reader browsing discovery
-- clicks into one of these and finds nothing — a big part of the "dỏm" feeling.
--
-- Track 4 reframes visibility as EARNED: a novel surfaces only after it passes
-- the canon + foundation gate AND writes ch.1 (write-chapters flips hidden=false
-- on that first gated chapter; ContentSeeder now spawns novels hidden=true).
--
-- This migration is the one-off backfill for rows that predate that rule: hide
-- every currently-visible novel with no chapters. They are NOT deleted — each
-- stays reachable by direct link and flips back to visible automatically when it
-- finally writes ch.1. Idempotent: re-running only affects still-visible 0-chapter
-- rows, of which there will be none after the first run.

UPDATE novels
SET hidden = true
WHERE hidden = false
  AND COALESCE(chapter_count, 0) = 0;
