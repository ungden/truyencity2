-- Mobile reader/library call these every minute (TTS) or before download to
-- enforce per-tier daily caps. Both were referenced from the client but never
-- created in the DB, so the call returned an error and the client treated
-- the response as null → quota was effectively infinite. Free users could
-- listen unlimited TTS and the download UI never noticed it should block.

CREATE OR REPLACE FUNCTION public.record_tts_usage(p_user_id uuid, p_seconds integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reader_tier reader_tier;
  v_expires_at TIMESTAMPTZ;
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  IF p_seconds IS NULL OR p_seconds < 0 THEN p_seconds := 0; END IF;

  SELECT us.reader_tier, us.reader_tier_expires_at INTO v_reader_tier, v_expires_at
  FROM user_subscriptions us WHERE us.user_id = p_user_id;
  IF v_reader_tier IS NULL THEN v_reader_tier := 'free'; END IF;
  IF v_reader_tier IN ('vip', 'super_vip') AND v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    v_reader_tier := 'free';
  END IF;

  SELECT daily_tts_limit_seconds INTO v_limit FROM reader_tier_limits WHERE tier = v_reader_tier;
  IF v_limit IS NULL THEN v_limit := 3600; END IF;

  INSERT INTO tts_usage (user_id, usage_date, seconds_used, updated_at)
  VALUES (p_user_id, CURRENT_DATE, p_seconds, now())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    seconds_used = tts_usage.seconds_used + EXCLUDED.seconds_used,
    updated_at = now()
  RETURNING seconds_used INTO v_used;

  RETURN jsonb_build_object(
    'seconds_used_today', v_used,
    'daily_limit', v_limit,
    'can_continue', (v_limit = -1 OR v_used < v_limit)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_download_usage(p_user_id uuid, p_chapters integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reader_tier reader_tier;
  v_expires_at TIMESTAMPTZ;
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  IF p_chapters IS NULL OR p_chapters < 0 THEN p_chapters := 0; END IF;

  SELECT us.reader_tier, us.reader_tier_expires_at INTO v_reader_tier, v_expires_at
  FROM user_subscriptions us WHERE us.user_id = p_user_id;
  IF v_reader_tier IS NULL THEN v_reader_tier := 'free'; END IF;
  IF v_reader_tier IN ('vip', 'super_vip') AND v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    v_reader_tier := 'free';
  END IF;

  SELECT daily_download_limit INTO v_limit FROM reader_tier_limits WHERE tier = v_reader_tier;
  IF v_limit IS NULL THEN v_limit := 0; END IF;

  INSERT INTO download_usage (user_id, usage_date, chapters_downloaded, updated_at)
  VALUES (p_user_id, CURRENT_DATE, p_chapters, now())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    chapters_downloaded = download_usage.chapters_downloaded + EXCLUDED.chapters_downloaded,
    updated_at = now()
  RETURNING chapters_downloaded INTO v_used;

  RETURN jsonb_build_object(
    'chapters_downloaded_today', v_used,
    'daily_limit', v_limit,
    'can_download_more', (v_limit = -1 OR v_used < v_limit)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.record_tts_usage(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_download_usage(uuid, integer) TO authenticated, service_role;
