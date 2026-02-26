-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0135: Reader VIP System
--
-- Adds reader-facing monetization: Free (ads) vs VIP (no ads, unlimited
-- download, unlimited TTS). Separate from writer tiers (free/creator/pro/enterprise).
--
-- Model:
--   Free: Ads shown, 5 offline chapters/day, 60 min TTS/day
--   VIP:  No ads, unlimited offline, unlimited TTS, exclusive themes, early access
-- ═══════════════════════════════════════════════════════════════════════════

-- Reader tier enum
DO $$ BEGIN
  CREATE TYPE reader_tier AS ENUM ('free', 'vip');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Add reader_tier to user_subscriptions
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS reader_tier reader_tier NOT NULL DEFAULT 'free';

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS reader_tier_expires_at TIMESTAMPTZ;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS reader_tier_auto_renew BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS reader_tier_payment_method TEXT; -- 'apple_iap', 'google_play', 'vnpay', 'momo'

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS reader_tier_store_tx_id TEXT; -- Apple/Google transaction ID

-- Index for expiration checks
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_reader_tier
  ON user_subscriptions(reader_tier) WHERE reader_tier = 'vip';
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_reader_expires
  ON user_subscriptions(reader_tier_expires_at) WHERE reader_tier = 'vip';

-- ═══════════════════════════════════════════════════════════════════════════
-- Reader VIP tier configuration
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reader_tier_limits (
  tier reader_tier PRIMARY KEY,

  -- Ads
  show_ads BOOLEAN NOT NULL DEFAULT TRUE,

  -- Offline download limits (-1 = unlimited)
  daily_download_limit INTEGER NOT NULL DEFAULT 5,

  -- TTS limits (seconds per day, -1 = unlimited)
  daily_tts_limit_seconds INTEGER NOT NULL DEFAULT 3600, -- 60 minutes

  -- Features
  has_exclusive_themes BOOLEAN NOT NULL DEFAULT FALSE,
  has_early_access BOOLEAN NOT NULL DEFAULT FALSE,
  has_badge BOOLEAN NOT NULL DEFAULT FALSE,

  -- Pricing
  price_vnd_monthly BIGINT NOT NULL DEFAULT 0,
  price_usd_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,

  description TEXT,
  features JSONB DEFAULT '[]'
);

INSERT INTO reader_tier_limits (
  tier, show_ads, daily_download_limit, daily_tts_limit_seconds,
  has_exclusive_themes, has_early_access, has_badge,
  price_vnd_monthly, price_usd_monthly, description, features
) VALUES
  ('free', TRUE, 5, 3600, FALSE, FALSE, FALSE, 0, 0,
   'Doc truyen mien phi voi quang cao',
   '["Doc tat ca truyen", "5 chuong offline/ngay", "Nghe 60 phut/ngay", "Quang cao"]'::jsonb),
  ('vip', FALSE, -1, -1, TRUE, TRUE, TRUE, 49000, 1.99,
   'VIP - Trai nghiem doc khong gioi han',
   '["Khong quang cao", "Tai khong gioi han", "Nghe khong gioi han", "Theme doc quyen", "Huy hieu VIP", "Doc som"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  show_ads = EXCLUDED.show_ads,
  daily_download_limit = EXCLUDED.daily_download_limit,
  daily_tts_limit_seconds = EXCLUDED.daily_tts_limit_seconds,
  has_exclusive_themes = EXCLUDED.has_exclusive_themes,
  has_early_access = EXCLUDED.has_early_access,
  has_badge = EXCLUDED.has_badge,
  price_vnd_monthly = EXCLUDED.price_vnd_monthly,
  price_usd_monthly = EXCLUDED.price_usd_monthly,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

-- RLS
ALTER TABLE reader_tier_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Reader tier limits are public"
  ON reader_tier_limits FOR SELECT
  TO authenticated
  USING (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TTS Usage Tracking
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tts_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  seconds_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_tts_usage_user_date ON tts_usage(user_id, usage_date);

ALTER TABLE tts_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Users can view own TTS usage"
  ON tts_usage FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can insert own TTS usage"
  ON tts_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can update own TTS usage"
  ON tts_usage FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Download Usage Tracking
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS download_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chapters_downloaded INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_download_usage_user_date ON download_usage(user_id, usage_date);

ALTER TABLE download_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Users can view own download usage"
  ON download_usage FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can insert own download usage"
  ON download_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can update own download usage"
  ON download_usage FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper Functions
-- ═══════════════════════════════════════════════════════════════════════════

-- Check reader VIP status and limits
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

  -- Check if VIP has expired
  IF v_reader_tier = 'vip' AND v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    -- Expire the VIP
    UPDATE user_subscriptions
    SET reader_tier = 'free', reader_tier_auto_renew = FALSE
    WHERE user_id = p_user_id;
    v_reader_tier := 'free';
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

-- Record TTS usage (upsert)
CREATE OR REPLACE FUNCTION record_tts_usage(p_user_id UUID, p_seconds INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_new_total INTEGER;
  v_limit INTEGER;
  v_reader_tier reader_tier;
BEGIN
  -- Get reader tier
  SELECT us.reader_tier INTO v_reader_tier
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;
  IF NOT FOUND THEN v_reader_tier := 'free'; END IF;

  -- Get TTS limit
  SELECT daily_tts_limit_seconds INTO v_limit
  FROM reader_tier_limits WHERE tier = v_reader_tier;

  -- Upsert usage
  INSERT INTO tts_usage (user_id, usage_date, seconds_used, updated_at)
  VALUES (p_user_id, CURRENT_DATE, p_seconds, NOW())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET seconds_used = tts_usage.seconds_used + p_seconds, updated_at = NOW()
  RETURNING seconds_used INTO v_new_total;

  RETURN jsonb_build_object(
    'seconds_used_today', v_new_total,
    'daily_limit', v_limit,
    'can_continue', CASE WHEN v_limit = -1 THEN TRUE WHEN v_new_total < v_limit THEN TRUE ELSE FALSE END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record download usage (upsert)
CREATE OR REPLACE FUNCTION record_download_usage(p_user_id UUID, p_chapters INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_new_total INTEGER;
  v_limit INTEGER;
  v_reader_tier reader_tier;
BEGIN
  -- Get reader tier
  SELECT us.reader_tier INTO v_reader_tier
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;
  IF NOT FOUND THEN v_reader_tier := 'free'; END IF;

  -- Get download limit
  SELECT daily_download_limit INTO v_limit
  FROM reader_tier_limits WHERE tier = v_reader_tier;

  -- Upsert usage
  INSERT INTO download_usage (user_id, usage_date, chapters_downloaded, updated_at)
  VALUES (p_user_id, CURRENT_DATE, p_chapters, NOW())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET chapters_downloaded = download_usage.chapters_downloaded + p_chapters, updated_at = NOW()
  RETURNING chapters_downloaded INTO v_new_total;

  RETURN jsonb_build_object(
    'chapters_downloaded_today', v_new_total,
    'daily_limit', v_limit,
    'can_download_more', CASE WHEN v_limit = -1 THEN TRUE WHEN v_new_total < v_limit THEN TRUE ELSE FALSE END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
