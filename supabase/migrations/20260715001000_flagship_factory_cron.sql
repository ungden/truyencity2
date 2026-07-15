-- Schedule the isolated flagship factory worker.  The route remains disabled
-- until FLAGSHIP_FACTORY_ENABLED=1 is explicitly set in the deployment.
-- Secret is read from Vault; no credential is stored in migration history.
DO $$
DECLARE
  v_secret text;
  v_base_url text := 'https://truyencity2.vercel.app';
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'cron_secret not found in vault';
  END IF;

  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname = 'flagship-factory-cron';

  PERFORM cron.schedule(
    'flagship-factory-cron',
    '*/5 * * * *',
    format(
      'SELECT net.http_get(url := %L, headers := %L::jsonb, timeout_milliseconds := 290000) AS request_id;',
      v_base_url || '/api/cron/flagship-factory',
      json_build_object('Authorization', 'Bearer ' || v_secret)::text
    )
  );
END;
$$;
