-- ============================================================
-- Migration: Set up cron job to call write-chapters endpoint
-- ============================================================

-- Step 1: Enable required extensions (idempotent)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema net;

-- Step 2: Grant usage to postgres role (needed for cron.schedule)
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Step 3: Unschedule existing job if it exists (idempotent)
select cron.unschedule('write-chapters-cron')
where exists (
  select 1 from cron.job where jobname = 'write-chapters-cron'
);

-- Step 4: Schedule the cron job — every 5 minutes
-- NOTE: Replace YOUR_VERCEL_DOMAIN and YOUR_CRON_SECRET before running!
select cron.schedule(
  'write-chapters-cron',          -- job name
  '*/5 * * * *',                  -- every 5 minutes
  $$
  select net.http_get(
    url := 'https://YOUR_VERCEL_DOMAIN/api/cron/write-chapters',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || 'YOUR_CRON_SECRET'
    ),
    timeout_milliseconds := 240000 -- 4 mins timeout (endpoint runs ~45s)
  ) as request_id;
  $$
);
