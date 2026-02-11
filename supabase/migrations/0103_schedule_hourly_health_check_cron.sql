-- Schedule hourly health-check cron for observability freshness.
-- Runs at minute 2 every hour to avoid collisions at :00.

select cron.unschedule('health-check-cron')
where exists (
  select 1 from cron.job where jobname = 'health-check-cron'
);

select cron.schedule(
  'health-check-cron',
  '2 * * * *',
  $$
  select net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/health-check',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);
