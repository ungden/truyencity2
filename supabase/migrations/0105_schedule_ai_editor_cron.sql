-- AI Editor cron jobs
-- 1) Daily quality scan for latest chapters
-- 2) Frequent rewrite worker to process chain jobs

select cron.unschedule('ai-editor-scan-cron')
where exists (
  select 1 from cron.job where jobname = 'ai-editor-scan-cron'
);

select cron.unschedule('ai-editor-rewrite-cron')
where exists (
  select 1 from cron.job where jobname = 'ai-editor-rewrite-cron'
);

select cron.schedule(
  'ai-editor-scan-cron',
  '5 0 * * *',
  $$
  select net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/ai-editor-scan',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 290000
  ) as request_id;
  $$
);

select cron.schedule(
  'ai-editor-rewrite-cron',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/ai-editor-rewrite?maxJobs=1&maxChaptersPerJob=2',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 290000
  ) as request_id;
  $$
);
