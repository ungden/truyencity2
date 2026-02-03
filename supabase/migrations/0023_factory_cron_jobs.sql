-- ============================================================
-- Factory Cron Jobs Setup
-- Requires pg_cron extension (enabled in Supabase Dashboard)
-- ============================================================

-- Enable pg_cron extension if not already enabled
-- This needs to be done via Supabase Dashboard > Database > Extensions
-- Or run: CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ============================================================
-- Cron Job 1: Main Loop (Every 10 minutes)
-- ============================================================
-- Schedules chapters, triggers writing, publishes due chapters
-- Runs every 10 minutes from 6 AM to 11 PM (Vietnam time = UTC+7)

-- To create this cron job, run in SQL Editor after enabling pg_cron:
/*
SELECT cron.schedule(
  'factory-main-loop',
  '*/10 * * * *',  -- Every 10 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/factory-main-loop',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- ============================================================
-- Cron Job 2: Daily Tasks (Once at midnight Vietnam time)
-- ============================================================
-- Resets counters, generates ideas, creates blueprints, starts productions
-- Runs at 00:00 Vietnam time = 17:00 UTC

/*
SELECT cron.schedule(
  'factory-daily-tasks',
  '0 17 * * *',  -- 00:00 Vietnam (17:00 UTC)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/factory-daily-tasks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- ============================================================
-- Cron Job 3: Writer Worker (Every 5 minutes during active hours)
-- ============================================================
-- Writes pending chapters in batches
-- Runs every 5 minutes from 5 AM to 11 PM Vietnam time

/*
SELECT cron.schedule(
  'factory-writer-worker',
  '*/5 5-23 * * *',  -- Every 5 minutes, 5 AM to 11 PM Vietnam
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/factory-writer-worker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"batch_size": 5}'::jsonb
  );
  $$
);
*/

-- ============================================================
-- Cron Job 4: Publisher (Every 15 minutes)
-- ============================================================
-- Publishes scheduled chapters
-- Runs every 15 minutes

/*
SELECT cron.schedule(
  'factory-publisher',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/factory-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- ============================================================
-- View active cron jobs
-- ============================================================
/*
SELECT * FROM cron.job;
*/

-- ============================================================
-- Unschedule a cron job
-- ============================================================
/*
SELECT cron.unschedule('factory-main-loop');
SELECT cron.unschedule('factory-daily-tasks');
SELECT cron.unschedule('factory-writer-worker');
SELECT cron.unschedule('factory-publisher');
*/

-- ============================================================
-- View cron job run history
-- ============================================================
/*
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 50;
*/

-- ============================================================
-- Alternative: Use Supabase Edge Function Schedules
-- ============================================================
-- If pg_cron is not available, you can set up cron jobs using:
-- 1. External cron services (cron-job.org, EasyCron)
-- 2. Vercel Cron Jobs (if using Vercel)
-- 3. GitHub Actions with schedule
-- 4. Railway/Render cron jobs
--
-- Example curl command to trigger manually:
-- curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/factory-main-loop' \
--   -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
--   -H 'Content-Type: application/json'
