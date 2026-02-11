-- Schedule daily spawn cron job for creating 20 new novels/projects per day.
-- Runs 5 minutes before daily rotate so new paused projects are immediately eligible.

select cron.unschedule('daily-spawn-cron')
where exists (
  select 1 from cron.job where jobname = 'daily-spawn-cron'
);

select cron.schedule(
  'daily-spawn-cron',
  '55 23 * * *',
  $$
  select net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/daily-spawn?target=20',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 290000
  ) as request_id;
  $$
);
