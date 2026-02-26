-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0137: Fix VIP Expiration Cleanup
--
-- Fixes get_reader_status() to clear reader_tier_expires_at when VIP expires.
-- Without this, expired VIP users repeatedly hit the UPDATE branch on every
-- status check (harmless but wasteful).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_reader_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_reader_tier reader_tier;
  v_expires_at TIMESTAMPTZ;
  v_limits RECORD;
  v_tts_used INTEGER;
  v_downloads_used INTEGER;
BEGIN
  -- Get user reader tier
  SELECT us.reader_tier, us.reader_tier_expires_at
  INTO v_reader_tier, v_expires_at
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;

  -- Default to free if no subscription
  IF NOT FOUND THEN
    v_reader_tier := 'free';
    v_expires_at := NULL;
  END IF;

  -- Check if VIP has expired — clear expires_at to avoid repeated UPDATEs
  IF v_reader_tier = 'vip' AND v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    UPDATE user_subscriptions
    SET reader_tier = 'free',
        reader_tier_auto_renew = FALSE,
        reader_tier_expires_at = NULL
    WHERE user_id = p_user_id;
    v_reader_tier := 'free';
    v_expires_at := NULL;
  END IF;

  -- Get tier limits
  SELECT * INTO v_limits
  FROM reader_tier_limits
  WHERE tier = v_reader_tier;

  -- Get today's TTS usage
  SELECT COALESCE(seconds_used, 0) INTO v_tts_used
  FROM tts_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
  IF NOT FOUND THEN v_tts_used := 0; END IF;

  -- Get today's download usage
  SELECT COALESCE(chapters_downloaded, 0) INTO v_downloads_used
  FROM download_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
  IF NOT FOUND THEN v_downloads_used := 0; END IF;

  RETURN jsonb_build_object(
    'reader_tier', v_reader_tier,
    'expires_at', v_expires_at,
    'show_ads', v_limits.show_ads,
    'daily_download_limit', v_limits.daily_download_limit,
    'daily_tts_limit_seconds', v_limits.daily_tts_limit_seconds,
    'downloads_used_today', v_downloads_used,
    'tts_seconds_used_today', v_tts_used,
    'has_exclusive_themes', v_limits.has_exclusive_themes,
    'has_early_access', v_limits.has_early_access,
    'has_badge', v_limits.has_badge,
    'can_download', CASE
      WHEN v_limits.daily_download_limit = -1 THEN TRUE
      WHEN v_downloads_used < v_limits.daily_download_limit THEN TRUE
      ELSE FALSE
    END,
    'can_use_tts', CASE
      WHEN v_limits.daily_tts_limit_seconds = -1 THEN TRUE
      WHEN v_tts_used < v_limits.daily_tts_limit_seconds THEN TRUE
      ELSE FALSE
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
