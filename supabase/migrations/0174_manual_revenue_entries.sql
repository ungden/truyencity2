-- Manual entry table for ad revenue (AdSense web, AdMob mobile, other)
-- that don't sync automatically to Supabase. Used by /admin/cost-tracking
-- to compute P/L = revenue - cost.
--
-- All other revenue sources (vip_orders, credit_transactions) come from
-- existing tables. This is only for revenue streams without webhooks.

CREATE TABLE IF NOT EXISTS public.manual_revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('adsense_web', 'admob_mobile', 'other')),
  amount_usd numeric(12, 4) NOT NULL CHECK (amount_usd >= 0),
  period_start date NOT NULL,
  period_end date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_manual_revenue_period
  ON public.manual_revenue_entries(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_manual_revenue_created_at
  ON public.manual_revenue_entries(created_at DESC);

ALTER TABLE public.manual_revenue_entries ENABLE ROW LEVEL SECURITY;

-- Service role only; admin pages access via service-role Supabase client.
-- Anon/authenticated reads are blocked (no RLS policy).
