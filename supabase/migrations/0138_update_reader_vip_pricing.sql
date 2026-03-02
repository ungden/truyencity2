-- Migration 0138: Update reader VIP pricing and features
--
-- Changes:
-- 1. Free tier: download limit 0 (VIP only), TTS 1h/day, updated features
-- 2. VIP tier: 99,000 VND/month ($3.99), updated features description
-- 3. Add price_vnd_yearly column for annual pricing

-- Add yearly pricing column
ALTER TABLE reader_tier_limits
  ADD COLUMN IF NOT EXISTS price_vnd_yearly BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_usd_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Update free tier: no downloads (VIP feature), 1h TTS
UPDATE reader_tier_limits SET
  daily_download_limit = 0,
  daily_tts_limit_seconds = 3600,
  has_exclusive_themes = FALSE,
  has_early_access = FALSE,
  has_badge = FALSE,
  price_vnd_monthly = 0,
  price_usd_monthly = 0,
  price_vnd_yearly = 0,
  price_usd_yearly = 0,
  description = 'Doc truyen mien phi voi quang cao',
  features = '["Doc tat ca truyen", "Nghe audio 1 tieng/ngay", "Quang cao"]'::jsonb
WHERE tier = 'free';

-- Update VIP tier: 99k/month, 999k/year
UPDATE reader_tier_limits SET
  show_ads = FALSE,
  daily_download_limit = -1,
  daily_tts_limit_seconds = -1,
  has_exclusive_themes = FALSE,
  has_early_access = FALSE,
  has_badge = FALSE,
  price_vnd_monthly = 99000,
  price_usd_monthly = 3.99,
  price_vnd_yearly = 999000,
  price_usd_yearly = 39.99,
  description = 'VIP - Trai nghiem doc khong gioi han',
  features = '["Khong quang cao", "Tai truyen ve doc offline", "Nghe audio khong gioi han"]'::jsonb
WHERE tier = 'vip';
