-- Cron job to auto-downgrade expired VIP users
-- Runs every 6 hours to catch expired subscriptions promptly

SELECT cron.schedule(
  'expire-vip-subscriptions',
  '17 */6 * * *',  -- every 6 hours at :17 to avoid on-the-hour contention
  $$
  UPDATE user_subscriptions
  SET
    reader_tier = 'free',
    reader_tier_auto_renew = false,
    updated_at = now()
  WHERE
    reader_tier = 'vip'
    AND reader_tier_expires_at IS NOT NULL
    AND reader_tier_expires_at < now();
  $$
);
