-- Placeholder token __CRON_SECRET__ is replaced at deploy-time only,
-- then reverted locally to avoid committing real secrets.

SELECT cron.unschedule('ai-editor-scan-cron')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ai-editor-scan-cron'
);

SELECT cron.unschedule('ai-editor-rewrite-cron')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ai-editor-rewrite-cron'
);

SELECT cron.schedule(
  'ai-editor-scan-cron',
  '5 0 * * *',
  $$
  SELECT net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/ai-editor-scan',
    headers := '{"Authorization": "Bearer __CRON_SECRET__"}'::jsonb,
    timeout_milliseconds := 290000
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'ai-editor-rewrite-cron',
  '*/10 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://truyencity2.vercel.app/api/cron/ai-editor-rewrite?maxJobs=1&maxChaptersPerJob=2',
    headers := '{"Authorization": "Bearer __CRON_SECRET__"}'::jsonb,
    timeout_milliseconds := 290000
  ) AS request_id;
  $$
);
