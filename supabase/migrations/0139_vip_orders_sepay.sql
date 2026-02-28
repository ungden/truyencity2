-- Migration: Create vip_orders table for SePay bank transfer payments
-- Used to track pending QR payments on web before SePay webhook confirms them

CREATE TABLE IF NOT EXISTS vip_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Order details
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount_vnd INTEGER NOT NULL,
  payment_code TEXT NOT NULL UNIQUE,  -- e.g. "TCVIP{short_id}" — unique per order
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  
  -- SePay webhook data (filled when payment confirmed)
  sepay_transaction_id INTEGER,  -- SePay's transaction ID (for dedup)
  sepay_reference_code TEXT,     -- Bank reference code
  paid_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  
  -- Indexes
  CONSTRAINT unique_sepay_tx UNIQUE (sepay_transaction_id)
);

-- Indexes for common queries
CREATE INDEX idx_vip_orders_user_id ON vip_orders(user_id);
CREATE INDEX idx_vip_orders_payment_code ON vip_orders(payment_code);
CREATE INDEX idx_vip_orders_status ON vip_orders(status) WHERE status = 'pending';

-- RLS
ALTER TABLE vip_orders ENABLE ROW LEVEL SECURITY;

-- Users can read their own orders
CREATE POLICY "Users can view own vip_orders"
  ON vip_orders FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (via API routes)
-- No INSERT/UPDATE policies for anon/authenticated — handled by service role in API

-- Auto-expire stale pending orders (pg_cron job)
-- Run every 5 minutes to mark expired pending orders
SELECT cron.schedule(
  'expire-stale-vip-orders',
  '*/5 * * * *',
  $$UPDATE vip_orders SET status = 'expired' WHERE status = 'pending' AND expires_at < now()$$
);
