-- SECURITY NOTICE: This migration contained a hardcoded CRON_SECRET in plaintext.
-- It has been superseded by migration 0121 which reads from Supabase Vault.
-- The secret in this file should be considered COMPROMISED and has been rotated.
-- See 0121_vault_cron_secrets.sql for the current approach.
--
-- Original purpose: Fix all pg_cron jobs: replace placeholder secrets with real CRON_SECRET.
-- All 4 jobs were sending "Bearer YOUR_CRON_SECRET" or "Bearer __CRON_SECRET__"
-- causing 401 Unauthorized on every call since migration 0102-0106.

-- ═══════════════════════════════════════════════════════════════════
-- 1. Unschedule all existing jobs (idempotent)
-- ═══════════════════════════════════════════════════════════════════

SELECT cron.unschedule('daily-spawn-cron')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-spawn-cron');

SELECT cron.unschedule('health-check-cron')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'health-check-cron');

SELECT cron.unschedule('ai-editor-scan-cron')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-editor-scan-cron');

SELECT cron.unschedule('ai-editor-rewrite-cron')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-editor-rewrite-cron');

-- ═══════════════════════════════════════════════════════════════════
-- 2. Reschedule with real secret
-- ═══════════════════════════════════════════════════════════════════

-- daily-spawn: 23:55 UTC daily, create 20 new novels
SELECT cron.schedule(
  'daily-spawn-cron',
  '55 23 * * *',
  $$
  SELECT net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/daily-spawn?target=20',
    headers := '{"Authorization": "Bearer a2049068a14e10bacb3ad2a435324fc5c758fc4675009dc852bba46ca9870af4"}'::jsonb,
    timeout_milliseconds := 290000
  ) AS request_id;
  $$
);

-- health-check: minute 2 every hour
SELECT cron.schedule(
  'health-check-cron',
  '2 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/health-check',
    headers := '{"Authorization": "Bearer a2049068a14e10bacb3ad2a435324fc5c758fc4675009dc852bba46ca9870af4"}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);

-- ai-editor-scan: 00:05 UTC daily
SELECT cron.schedule(
  'ai-editor-scan-cron',
  '5 0 * * *',
  $$
  SELECT net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/ai-editor-scan',
    headers := '{"Authorization": "Bearer a2049068a14e10bacb3ad2a435324fc5c758fc4675009dc852bba46ca9870af4"}'::jsonb,
    timeout_milliseconds := 290000
  ) AS request_id;
  $$
);

-- ai-editor-rewrite: every 10 minutes
SELECT cron.schedule(
  'ai-editor-rewrite-cron',
  '*/10 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/ai-editor-rewrite?maxJobs=1&maxChaptersPerJob=2',
    headers := '{"Authorization": "Bearer a2049068a14e10bacb3ad2a435324fc5c758fc4675009dc852bba46ca9870af4"}'::jsonb,
    timeout_milliseconds := 290000
  ) AS request_id;
  $$
);
