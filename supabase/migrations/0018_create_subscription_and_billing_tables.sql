-- ============================================================================
-- SUBSCRIPTION & BILLING SYSTEM
-- Phase 2: Monetization for TruyenCity AI Writer
-- ============================================================================

-- Subscription tiers enum
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free', 'creator', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Subscription status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('stripe', 'vnpay', 'momo', 'bank_transfer', 'credits');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Transaction type enum
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('subscription', 'credit_purchase', 'credit_usage', 'refund', 'bonus');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- USER SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription details
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',

  -- Billing cycle
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Payment info (external provider IDs)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  vnpay_customer_id TEXT,
  momo_customer_id TEXT,

  -- Pricing
  price_vnd BIGINT NOT NULL DEFAULT 0, -- Price in VND
  price_usd DECIMAL(10, 2) DEFAULT 0,

  -- Trial
  trial_end TIMESTAMPTZ,
  has_used_trial BOOLEAN DEFAULT FALSE,

  -- Metadata
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active subscription per user
  UNIQUE(user_id)
);

-- ============================================================================
-- USER CREDITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Credit balance
  balance INTEGER NOT NULL DEFAULT 0, -- Current credits
  lifetime_earned INTEGER NOT NULL DEFAULT 0, -- Total earned (for stats)
  lifetime_spent INTEGER NOT NULL DEFAULT 0, -- Total spent (for stats)

  -- Daily limits based on subscription
  daily_limit INTEGER NOT NULL DEFAULT 3, -- Free tier default
  daily_used INTEGER NOT NULL DEFAULT 0,
  daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Bonus credits
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  bonus_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id),

  CONSTRAINT positive_balance CHECK (balance >= 0),
  CONSTRAINT positive_daily_used CHECK (daily_used >= 0)
);

-- ============================================================================
-- CREDIT TRANSACTIONS (Audit log for all credit movements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL, -- Positive for credit, negative for debit
  balance_after INTEGER NOT NULL, -- Balance after this transaction

  -- Reference info
  reference_type TEXT, -- 'chapter', 'subscription', 'purchase', etc.
  reference_id UUID, -- ID of related entity

  -- Payment info (for purchases)
  payment_method payment_method,
  payment_provider_id TEXT, -- External transaction ID
  price_vnd BIGINT,
  price_usd DECIMAL(10, 2),

  -- Description
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Usage metrics
  chapters_written INTEGER NOT NULL DEFAULT 0,
  words_generated INTEGER NOT NULL DEFAULT 0,
  api_calls INTEGER NOT NULL DEFAULT 0,
  ai_tokens_used BIGINT NOT NULL DEFAULT 0,

  -- Costs
  ai_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,

  -- Breakdown by model
  usage_by_model JSONB DEFAULT '{}',
  -- Example: {"deepseek-chat": {"calls": 10, "tokens": 50000, "cost": 0.05}}

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, period_start)
);

-- ============================================================================
-- SUBSCRIPTION TIER LIMITS (Configuration table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_tier_limits (
  tier subscription_tier PRIMARY KEY,

  -- Chapter limits
  daily_chapter_limit INTEGER NOT NULL,
  monthly_chapter_limit INTEGER,

  -- Project limits
  max_projects INTEGER NOT NULL,
  max_chapters_per_project INTEGER,

  -- Feature access
  can_use_autopilot BOOLEAN DEFAULT FALSE,
  can_export_epub BOOLEAN DEFAULT FALSE,
  can_export_pdf BOOLEAN DEFAULT FALSE,
  can_use_api BOOLEAN DEFAULT FALSE,
  can_use_advanced_models BOOLEAN DEFAULT FALSE,

  -- Quality settings
  max_chapter_length INTEGER NOT NULL DEFAULT 2500,
  priority_queue BOOLEAN DEFAULT FALSE,

  -- Pricing
  price_vnd_monthly BIGINT NOT NULL DEFAULT 0,
  price_usd_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Credits included
  monthly_credits INTEGER NOT NULL DEFAULT 0,

  description TEXT,
  features JSONB DEFAULT '[]'
);

-- Insert default tier limits
INSERT INTO subscription_tier_limits (
  tier, daily_chapter_limit, monthly_chapter_limit, max_projects, max_chapters_per_project,
  can_use_autopilot, can_export_epub, can_export_pdf, can_use_api, can_use_advanced_models,
  max_chapter_length, priority_queue, price_vnd_monthly, price_usd_monthly, monthly_credits,
  description, features
) VALUES
  ('free', 3, 90, 1, 100, FALSE, FALSE, FALSE, FALSE, FALSE, 2500, FALSE, 0, 0, 0,
   'Gói miễn phí cho người mới bắt đầu', '["3 chương/ngày", "1 dự án", "Thể loại cơ bản"]'::jsonb),
  ('creator', 30, 900, 5, 500, TRUE, TRUE, FALSE, FALSE, FALSE, 3500, FALSE, 199000, 8, 100,
   'Gói dành cho creator nghiêm túc', '["30 chương/ngày", "5 dự án", "Xuất EPUB", "Autopilot", "100 credits/tháng"]'::jsonb),
  ('pro', 100, 3000, -1, 1000, TRUE, TRUE, TRUE, TRUE, TRUE, 5000, TRUE, 499000, 20, 500,
   'Gói chuyên nghiệp không giới hạn', '["100 chương/ngày", "Không giới hạn dự án", "Xuất PDF", "API access", "Ưu tiên xử lý", "500 credits/tháng"]'::jsonb),
  ('enterprise', -1, -1, -1, -1, TRUE, TRUE, TRUE, TRUE, TRUE, 10000, TRUE, 0, 0, 10000,
   'Gói doanh nghiệp tùy chỉnh', '["Không giới hạn", "Hỗ trợ riêng", "SLA", "Custom AI models", "10000 credits/tháng"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  daily_chapter_limit = EXCLUDED.daily_chapter_limit,
  monthly_chapter_limit = EXCLUDED.monthly_chapter_limit,
  max_projects = EXCLUDED.max_projects,
  price_vnd_monthly = EXCLUDED.price_vnd_monthly,
  price_usd_monthly = EXCLUDED.price_usd_monthly,
  features = EXCLUDED.features;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_daily_reset ON user_credits(daily_reset_at);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
DO $$ BEGIN
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT
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
CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Tier limits are public
ALTER TABLE subscription_tier_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Tier limits are public"
  ON subscription_tier_limits FOR SELECT
  TO authenticated
  USING (TRUE);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to initialize user credits and subscription on signup
CREATE OR REPLACE FUNCTION initialize_user_billing()
RETURNS TRIGGER AS $$
BEGIN
  -- Create free subscription
  INSERT INTO user_subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  -- Initialize credits
  INSERT INTO user_credits (user_id, balance, daily_limit)
  VALUES (NEW.id, 0, 3)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_billing ON auth.users;
CREATE TRIGGER on_auth_user_created_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_billing();

-- Function to reset daily credits
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS void AS $$
BEGIN
  UPDATE user_credits
  SET
    daily_used = 0,
    daily_reset_at = NOW()
  WHERE daily_reset_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can write a chapter
CREATE OR REPLACE FUNCTION can_user_write_chapter(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_subscription subscription_tier;
  v_daily_limit INTEGER;
  v_daily_used INTEGER;
  v_balance INTEGER;
  v_daily_reset_at TIMESTAMPTZ;
BEGIN
  -- Get user subscription tier
  SELECT tier INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id AND status = 'active';

  IF NOT FOUND THEN
    v_subscription := 'free';
  END IF;

  -- Get user credits
  SELECT daily_limit, daily_used, balance, daily_reset_at
  INTO v_daily_limit, v_daily_used, v_balance, v_daily_reset_at
  FROM user_credits
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'no_credits_account',
      'tier', v_subscription
    );
  END IF;

  -- Check if daily reset needed
  IF v_daily_reset_at < NOW() - INTERVAL '24 hours' THEN
    v_daily_used := 0;
  END IF;

  -- Check daily limit (-1 means unlimited)
  IF v_daily_limit != -1 AND v_daily_used >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'daily_limit_reached',
      'tier', v_subscription,
      'daily_used', v_daily_used,
      'daily_limit', v_daily_limit,
      'reset_at', v_daily_reset_at + INTERVAL '24 hours'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'tier', v_subscription,
    'daily_used', v_daily_used,
    'daily_limit', v_daily_limit,
    'balance', v_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume a credit when writing a chapter
CREATE OR REPLACE FUNCTION consume_chapter_credit(
  p_user_id UUID,
  p_chapter_id UUID DEFAULT NULL,
  p_words_count INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_can_write JSONB;
  v_new_daily_used INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check if user can write
  v_can_write := can_user_write_chapter(p_user_id);

  IF NOT (v_can_write->>'allowed')::boolean THEN
    RETURN v_can_write;
  END IF;

  -- Update daily usage
  UPDATE user_credits
  SET
    daily_used = CASE
      WHEN daily_reset_at < NOW() - INTERVAL '24 hours' THEN 1
      ELSE daily_used + 1
    END,
    daily_reset_at = CASE
      WHEN daily_reset_at < NOW() - INTERVAL '24 hours' THEN NOW()
      ELSE daily_reset_at
    END,
    lifetime_spent = lifetime_spent + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING daily_used, balance INTO v_new_daily_used, v_new_balance;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after,
    reference_type, reference_id, description
  ) VALUES (
    p_user_id, 'credit_usage', -1, v_new_balance,
    'chapter', p_chapter_id,
    'Viết chương mới (' || COALESCE(p_words_count, 0) || ' từ)'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'daily_used', v_new_daily_used,
    'balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
