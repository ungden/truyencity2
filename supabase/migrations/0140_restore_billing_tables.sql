-- Migration 0140: Restore missing billing/reader VIP tables in production
--
-- Some environments can have migration history entries while a subset of billing
-- tables are missing (manual drift). This migration is idempotent and recreates
-- the required structures for Reader VIP + transaction logging.

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free', 'creator', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('stripe', 'vnpay', 'momo', 'bank_transfer', 'credits');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('subscription', 'credit_purchase', 'credit_usage', 'refund', 'bonus');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE reader_tier AS ENUM ('free', 'vip');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── Core billing tables ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  vnpay_customer_id TEXT,
  momo_customer_id TEXT,
  price_vnd BIGINT NOT NULL DEFAULT 0,
  price_usd DECIMAL(10, 2) DEFAULT 0,
  trial_end TIMESTAMPTZ,
  has_used_trial BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS reader_tier reader_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS reader_tier_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reader_tier_auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reader_tier_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS reader_tier_store_tx_id TEXT;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  payment_method payment_method,
  payment_provider_id TEXT,
  price_vnd BIGINT,
  price_usd DECIMAL(10, 2),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Reader VIP configuration ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reader_tier_limits (
  tier reader_tier PRIMARY KEY,
  show_ads BOOLEAN NOT NULL DEFAULT TRUE,
  daily_download_limit INTEGER NOT NULL DEFAULT 5,
  daily_tts_limit_seconds INTEGER NOT NULL DEFAULT 3600,
  has_exclusive_themes BOOLEAN NOT NULL DEFAULT FALSE,
  has_early_access BOOLEAN NOT NULL DEFAULT FALSE,
  has_badge BOOLEAN NOT NULL DEFAULT FALSE,
  price_vnd_monthly BIGINT NOT NULL DEFAULT 0,
  price_vnd_yearly BIGINT NOT NULL DEFAULT 0,
  price_usd_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  features JSONB DEFAULT '[]'
);

INSERT INTO reader_tier_limits (
  tier,
  show_ads,
  daily_download_limit,
  daily_tts_limit_seconds,
  has_exclusive_themes,
  has_early_access,
  has_badge,
  price_vnd_monthly,
  price_vnd_yearly,
  price_usd_monthly,
  description,
  features
) VALUES
  ('free', TRUE, 0, 3600, FALSE, FALSE, FALSE, 0, 0, 0, 'Reader free tier',
   '["Co quang cao", "Nghe audio 60 phut/ngay", "Khong tai offline"]'::jsonb),
  ('vip', FALSE, -1, -1, TRUE, TRUE, TRUE, 99000, 999000, 3.99, 'Reader VIP tier',
   '["Khong quang cao", "Tai offline khong gioi han", "Nghe audio khong gioi han"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  show_ads = EXCLUDED.show_ads,
  daily_download_limit = EXCLUDED.daily_download_limit,
  daily_tts_limit_seconds = EXCLUDED.daily_tts_limit_seconds,
  has_exclusive_themes = EXCLUDED.has_exclusive_themes,
  has_early_access = EXCLUDED.has_early_access,
  has_badge = EXCLUDED.has_badge,
  price_vnd_monthly = EXCLUDED.price_vnd_monthly,
  price_vnd_yearly = EXCLUDED.price_vnd_yearly,
  price_usd_monthly = EXCLUDED.price_usd_monthly,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

CREATE TABLE IF NOT EXISTS tts_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  seconds_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS download_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chapters_downloaded INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_reader_tier ON user_subscriptions(reader_tier) WHERE reader_tier = 'vip';
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_reader_expires ON user_subscriptions(reader_tier_expires_at) WHERE reader_tier = 'vip';
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_usage_user_date ON tts_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_download_usage_user_date ON download_usage(user_id, usage_date);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_tier_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Reader tier limits are public"
  ON reader_tier_limits FOR SELECT
  TO authenticated
  USING (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

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

-- ── Backfill/trigger ─────────────────────────────────────────────────────────

INSERT INTO user_subscriptions (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION initialize_user_billing()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_billing ON auth.users;
CREATE TRIGGER on_auth_user_created_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_billing();

-- ── Reader status helpers (idempotent) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION get_reader_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_reader_tier reader_tier;
  v_expires_at TIMESTAMPTZ;
  v_limits RECORD;
  v_tts_used INTEGER;
  v_downloads_used INTEGER;
BEGIN
  SELECT us.reader_tier, us.reader_tier_expires_at
  INTO v_reader_tier, v_expires_at
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;

  IF NOT FOUND THEN
    v_reader_tier := 'free';
    v_expires_at := NULL;
  END IF;

  IF v_reader_tier = 'vip' AND v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    UPDATE user_subscriptions
    SET reader_tier = 'free', reader_tier_auto_renew = FALSE, reader_tier_expires_at = NULL
    WHERE user_id = p_user_id;
    v_reader_tier := 'free';
    v_expires_at := NULL;
  END IF;

  SELECT * INTO v_limits
  FROM reader_tier_limits
  WHERE tier = v_reader_tier;

  SELECT COALESCE(seconds_used, 0) INTO v_tts_used
  FROM tts_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
  IF NOT FOUND THEN v_tts_used := 0; END IF;

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
