-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0147: Super VIP + Chapter Boost Cards
--
-- Adds super_vip tier (199k/month) with 3 boost cards/month.
-- Boost card: apply to novel → 2x chapters/day for 7 days.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Extend reader_tier enum with super_vip
ALTER TYPE reader_tier ADD VALUE IF NOT EXISTS 'super_vip';

-- 2. Add boost card columns to user_subscriptions
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS boost_cards_remaining INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_cards_reset_at TIMESTAMPTZ;

-- 3. Insert super_vip tier config
INSERT INTO reader_tier_limits (
  tier, show_ads, daily_download_limit, daily_tts_limit_seconds,
  has_exclusive_themes, has_early_access, has_badge,
  price_vnd_monthly, price_vnd_yearly, price_usd_monthly,
  description, features
) VALUES (
  'super_vip', FALSE, -1, -1, TRUE, TRUE, TRUE,
  199000, 1990000, 7.99,
  'Super VIP - Tất cả quyền VIP + Thẻ thúc chương',
  '["Không quảng cáo", "Tải không giới hạn", "Nghe không giới hạn", "Theme độc quyền", "Huy hiệu Super VIP", "Đọc sớm", "3 Thẻ thúc chương/tháng"]'::jsonb
) ON CONFLICT (tier) DO NOTHING;

-- 4. Novel boosts table
CREATE TABLE IF NOT EXISTS novel_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL, -- started_at + 7 days
  multiplier INTEGER NOT NULL DEFAULT 2, -- 2x chapters/day
  status TEXT NOT NULL DEFAULT 'active', -- active, expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_novel_boosts_novel_status
  ON novel_boosts(novel_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_novel_boosts_user
  ON novel_boosts(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_novel_boosts_expiry
  ON novel_boosts(expires_at) WHERE status = 'active';

ALTER TABLE novel_boosts ENABLE ROW LEVEL SECURITY;

-- Users can read their own boosts
CREATE POLICY "Users can view own boosts"
  ON novel_boosts FOR SELECT
  USING (auth.uid() = user_id);

-- Service role for insert/update
CREATE POLICY "Service role full access boosts"
  ON novel_boosts FOR ALL
  USING (auth.role() = 'service_role');

-- 5. RPC: use_boost_card
CREATE OR REPLACE FUNCTION use_boost_card(p_user_id UUID, p_novel_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier reader_tier;
  v_cards INTEGER;
  v_existing_boost UUID;
  v_boost_id UUID;
  v_expires TIMESTAMPTZ;
BEGIN
  -- Check user is super_vip
  SELECT reader_tier, boost_cards_remaining
  INTO v_tier, v_cards
  FROM user_subscriptions
  WHERE user_id = p_user_id;

  IF v_tier IS NULL OR v_tier != 'super_vip' THEN
    RETURN jsonb_build_object('error', 'Chỉ Super VIP mới sử dụng được thẻ thúc chương');
  END IF;

  IF v_cards <= 0 THEN
    RETURN jsonb_build_object('error', 'Bạn đã hết thẻ thúc chương tháng này');
  END IF;

  -- Check novel not already boosted by this user
  SELECT id INTO v_existing_boost
  FROM novel_boosts
  WHERE user_id = p_user_id
    AND novel_id = p_novel_id
    AND status = 'active'
  LIMIT 1;

  IF v_existing_boost IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Truyện này đang được thúc chương rồi');
  END IF;

  -- Check novel exists
  IF NOT EXISTS (SELECT 1 FROM novels WHERE id = p_novel_id) THEN
    RETURN jsonb_build_object('error', 'Truyện không tồn tại');
  END IF;

  -- Deduct card
  UPDATE user_subscriptions
  SET boost_cards_remaining = boost_cards_remaining - 1
  WHERE user_id = p_user_id;

  -- Create boost (7 days)
  v_expires := now() + INTERVAL '7 days';
  INSERT INTO novel_boosts (user_id, novel_id, expires_at, multiplier)
  VALUES (p_user_id, p_novel_id, v_expires, 2)
  RETURNING id INTO v_boost_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'boost_id', v_boost_id,
    'expires_at', v_expires,
    'cards_remaining', v_cards - 1
  );
END;
$$;

-- 6. RPC: get active boosts for a novel (used by cron)
CREATE OR REPLACE FUNCTION get_novel_boost_multiplier(p_novel_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(multiplier), 1)
  FROM novel_boosts
  WHERE novel_id = p_novel_id
    AND status = 'active'
    AND expires_at > now();
$$;

-- 7. pg_cron: expire boost cards every hour
SELECT cron.schedule(
  'expire-novel-boosts',
  '23 * * * *',
  $$UPDATE novel_boosts SET status = 'expired' WHERE expires_at < now() AND status = 'active'$$
);

-- 8. Update get_reader_status to include boost info
CREATE OR REPLACE FUNCTION get_reader_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_tier reader_tier;
  v_expires_at TIMESTAMPTZ;
  v_limits RECORD;
  v_tts_used INTEGER;
  v_dl_used INTEGER;
  v_boost_cards INTEGER;
  v_active_boosts JSONB;
BEGIN
  -- Get current tier
  SELECT us.reader_tier, us.reader_tier_expires_at, us.boost_cards_remaining
  INTO v_reader_tier, v_expires_at, v_boost_cards
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;

  IF v_reader_tier IS NULL THEN
    v_reader_tier := 'free';
    v_boost_cards := 0;
  END IF;

  -- Auto-downgrade expired VIP/Super VIP
  IF v_reader_tier IN ('vip', 'super_vip') AND v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    UPDATE user_subscriptions
    SET reader_tier = 'free', reader_tier_auto_renew = FALSE,
        reader_tier_expires_at = NULL, boost_cards_remaining = 0
    WHERE user_id = p_user_id;
    v_reader_tier := 'free';
    v_boost_cards := 0;
  END IF;

  -- Get tier limits (fallback to free if super_vip not in limits table yet)
  SELECT * INTO v_limits
  FROM reader_tier_limits
  WHERE tier = v_reader_tier;

  IF v_limits IS NULL THEN
    SELECT * INTO v_limits FROM reader_tier_limits WHERE tier = 'free';
  END IF;

  -- Get today's usage
  SELECT COALESCE(seconds_used, 0) INTO v_tts_used
  FROM tts_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  SELECT COALESCE(chapters_downloaded, 0) INTO v_dl_used
  FROM download_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  IF v_tts_used IS NULL THEN v_tts_used := 0; END IF;
  IF v_dl_used IS NULL THEN v_dl_used := 0; END IF;

  -- Get active boosts
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'novel_id', nb.novel_id,
    'novel_title', n.title,
    'expires_at', nb.expires_at,
    'multiplier', nb.multiplier
  )), '[]'::jsonb)
  INTO v_active_boosts
  FROM novel_boosts nb
  JOIN novels n ON n.id = nb.novel_id
  WHERE nb.user_id = p_user_id AND nb.status = 'active' AND nb.expires_at > now();

  RETURN jsonb_build_object(
    'reader_tier', v_reader_tier,
    'expires_at', v_expires_at,
    'show_ads', v_limits.show_ads,
    'daily_download_limit', v_limits.daily_download_limit,
    'daily_tts_limit_seconds', v_limits.daily_tts_limit_seconds,
    'downloads_used_today', v_dl_used,
    'tts_seconds_used_today', v_tts_used,
    'has_exclusive_themes', v_limits.has_exclusive_themes,
    'has_early_access', v_limits.has_early_access,
    'has_badge', v_limits.has_badge,
    'can_download', (v_limits.daily_download_limit = -1 OR v_dl_used < v_limits.daily_download_limit),
    'can_use_tts', (v_limits.daily_tts_limit_seconds = -1 OR v_tts_used < v_limits.daily_tts_limit_seconds),
    'boost_cards_remaining', COALESCE(v_boost_cards, 0),
    'active_boosts', v_active_boosts
  );
END;
$$;
