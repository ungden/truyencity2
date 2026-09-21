-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0121: Vault-based pg_cron — single source of truth
--
-- PROBLEM SOLVED:
--   Migration 0025 created 3 jobs with placeholder secrets.
--   Migration 0112 fixed 4 jobs but missed those 3.
--   Secrets were hardcoded in SQL files committed to git.
--   Vercel cron in vercel.json was dead (no Bearer auth) — now removed.
--
-- SOLUTION:
--   1. Read CRON_SECRET from Supabase Vault (already stored as 'cron_secret')
--   2. Unschedule ALL 7 jobs
--   3. Reschedule ALL 7 with vault-sourced secret
--   4. Single migration = single source of truth for all cron jobs
--
-- TO ROTATE SECRET:
--   1. Update vault: SELECT vault.update_secret(id, 'new_secret') FROM vault.secrets WHERE name='cron_secret';
--   2. Update Vercel env: CRON_SECRET=new_secret
--   3. Re-run this migration (or the DO block below)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  _secret TEXT;
  _base_url TEXT := 'https://truyencity2.vercel.app';
BEGIN
  -- Read secret from vault
  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  IF _secret IS NULL THEN
    RAISE EXCEPTION 'cron_secret not found in vault. Run: SELECT vault.create_secret(''<your_secret>'', ''cron_secret'');';
  END IF;

  -- ═══════════════════════════════════════════════════
  -- Step 1: Unschedule ALL existing cron jobs (idempotent)
  -- ═══════════════════════════════════════════════════
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN (
    'write-chapters-cron',
    'generate-covers-cron',
    'daily-rotate-cron',
    'daily-spawn-cron',
    'health-check-cron',
    'ai-editor-scan-cron',
    'ai-editor-rewrite-cron'
  );

  -- ═══════════════════════════════════════════════════
  -- Step 2: Reschedule ALL 7 jobs with vault secret
  -- ═══════════════════════════════════════════════════

  -- 1. write-chapters: every 5 minutes (core pipeline)
  PERFORM cron.schedule(
    'write-chapters-cron',
    '*/5 * * * *',
    format(
      'SELECT net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 290000) AS request_id;',
      _base_url || '/api/cron/write-chapters',
      json_build_object('Authorization', 'Bearer ' || _secret)::text
    )
  );

  -- 2. generate-covers: every 10 minutes
  PERFORM cron.schedule(
    'generate-covers-cron',
    '*/10 * * * *',
    format(
      'SELECT net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 290000) AS request_id;',
      _base_url || '/api/cron/generate-covers',
      json_build_object('Authorization', 'Bearer ' || _secret)::text
    )
  );

  -- 3. daily-rotate: midnight UTC (07:00 VN)
  PERFORM cron.schedule(
    'daily-rotate-cron',
    '0 0 * * *',
    format(
      'SELECT net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 30000) AS request_id;',
      _base_url || '/api/cron/daily-rotate',
      json_build_object('Authorization', 'Bearer ' || _secret)::text
    )
  );

  -- 4. daily-spawn: 23:55 UTC (06:55 VN next day)
  PERFORM cron.schedule(
    'daily-spawn-cron',
    '55 23 * * *',
    format(
      'SELECT net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 290000) AS request_id;',
      _base_url || '/api/cron/daily-spawn?target=20',
      json_build_object('Authorization', 'Bearer ' || _secret)::text
    )
  );

  -- 5. health-check: minute 2 every hour
  PERFORM cron.schedule(
    'health-check-cron',
    '2 * * * *',
    format(
      'SELECT net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 60000) AS request_id;',
      _base_url || '/api/cron/health-check',
      json_build_object('Authorization', 'Bearer ' || _secret)::text
    )
  );

  -- 6. ai-editor-scan: 00:05 UTC daily
  PERFORM cron.schedule(
    'ai-editor-scan-cron',
    '5 0 * * *',
    format(
      'SELECT net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 290000) AS request_id;',
      _base_url || '/api/cron/ai-editor-scan',
      json_build_object('Authorization', 'Bearer ' || _secret)::text
    )
  );

  -- 7. ai-editor-rewrite: every 10 minutes
  PERFORM cron.schedule(
    'ai-editor-rewrite-cron',
    '*/10 * * * *',
    format(
      'SELECT net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 290000) AS request_id;',
      _base_url || '/api/cron/ai-editor-rewrite?maxJobs=1&maxChaptersPerJob=2',
      json_build_object('Authorization', 'Bearer ' || _secret)::text
    )
  );

  RAISE NOTICE 'All 7 pg_cron jobs rescheduled with vault secret';
END;
$$;
