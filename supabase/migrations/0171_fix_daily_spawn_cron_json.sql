-- Phase 29: Fix daily-spawn-cron JSON syntax + re-enable disabled crons.
--
-- Bug 1: daily-spawn-cron command was failing for 6+ days with:
--   ERROR: invalid input syntax for type json — Token "}"
--
-- Root cause: SQL operator precedence. The cron command built JSON via:
--   '{"Authorization":"Bearer ' || secret || '"}'::jsonb
-- The `::` cast binds tighter than `||`, so PostgreSQL parsed this as:
--   '{"Authorization":"Bearer ' || secret || ('"}'::jsonb)
-- Casting the bare string `"}` to jsonb fails because it's invalid JSON.
--
-- Fix: use `jsonb_build_object()` at runtime (also reads secret dynamically
-- so future rotations work without re-migration).
--
-- Bug 2: both daily-rotate-cron AND daily-spawn-cron were marked active=false
-- (manually disabled around 2026-04-29). Without daily-rotate auto-activating
-- paused projects, the entire writing fleet stalls — by 2026-05-02 we had
-- 975/975 projects paused, 0 active, 0 chapters written in 24h.
--
-- Re-enable both. daily-rotate fires at 00:00 UTC = 7 AM Vietnam time.

DO $$
DECLARE
  spawn_jobid bigint;
  rotate_jobid bigint;
BEGIN
  -- Look up current job IDs (don't assume 25/31 from any specific environment)
  SELECT jobid INTO spawn_jobid FROM cron.job WHERE jobname = 'daily-spawn-cron';
  SELECT jobid INTO rotate_jobid FROM cron.job WHERE jobname = 'daily-rotate-cron';

  -- Fix the daily-spawn command + re-enable
  IF spawn_jobid IS NOT NULL THEN
    PERFORM cron.alter_job(
      spawn_jobid,
      NULL,  -- keep schedule '55 23 * * *'
      $cmd$SELECT net.http_get(
        url := 'https://truyencity2.vercel.app/api/cron/daily-spawn?target=5',
        headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')),
        timeout_milliseconds := 290000
      ) AS request_id;$cmd$,
      NULL, NULL, true  -- active := true
    );
    RAISE NOTICE 'Fixed daily-spawn-cron (jobid %) — JSON syntax corrected, active=true', spawn_jobid;
  ELSE
    RAISE WARNING 'daily-spawn-cron not found — skip';
  END IF;

  -- Re-enable daily-rotate (its command was already correct, just disabled)
  IF rotate_jobid IS NOT NULL THEN
    PERFORM cron.alter_job(rotate_jobid, NULL, NULL, NULL, NULL, true);
    RAISE NOTICE 'Re-enabled daily-rotate-cron (jobid %)', rotate_jobid;
  ELSE
    RAISE WARNING 'daily-rotate-cron not found — skip';
  END IF;
END $$;
