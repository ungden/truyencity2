-- ============================================================
-- Migration: Set up pg_cron to auto-call Vercel write-chapters endpoint
-- 
-- This runs entirely on Supabase — no local machine needed.
-- pg_cron triggers pg_net HTTP GET to Vercel every 5 minutes.
-- ============================================================

-- Step 1: Enable required extensions (idempotent)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Step 2: Grant usage to postgres role (needed for cron.schedule)
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Step 3: Unschedule existing jobs if they exist (idempotent)
select cron.unschedule('write-chapters-cron')
where exists (
  select 1 from cron.job where jobname = 'write-chapters-cron'
);

select cron.unschedule('daily-rotate-cron')
where exists (
  select 1 from cron.job where jobname = 'daily-rotate-cron'
);

-- Step 4: Schedule write-chapters cron — every 5 minutes
-- Picks up to 20 active projects per tick, writes 1 chapter each.
-- ~196 active projects × 5 chapters = 980 chapters needed.
-- At 20 chapters/tick × 12 ticks/hour = 240 chapters/hour → ~4 hours total.
select cron.schedule(
  'write-chapters-cron',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/write-chapters',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 290000
  ) as request_id;
  $$
);

-- Step 5: Schedule generate-covers cron — every 10 minutes
-- Generates ~8-12 book covers per tick via Gemini 3 Pro Image Preview.
-- 200 novels ÷ 8/tick × 10min = ~4 hours for all covers.
-- Auto-stops when all novels have covers (returns "All novels have covers").
select cron.unschedule('generate-covers-cron')
where exists (
  select 1 from cron.job where jobname = 'generate-covers-cron'
);

select cron.schedule(
  'generate-covers-cron',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/generate-covers',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 290000
  ) as request_id;
  $$
);

-- Step 6: Schedule daily-rotate cron — once per day at midnight UTC (7am Vietnam)
-- Activates paused novels, balances per-author load
select cron.schedule(
  'daily-rotate-cron',
  '0 0 * * *',
  $$
  select net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/daily-rotate',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);
