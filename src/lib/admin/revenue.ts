/**
 * Revenue aggregation helper for the admin cost-tracking dashboard.
 *
 * Sources:
 *   1. vip_orders.amount_vnd (SePay web purchases, status='paid')
 *   2. credit_transactions.price_vnd (RevenueCat IAP + any direct paid tx)
 *   3. manual_revenue_entries.amount_usd (AdSense / AdMob — no webhook, admin enters monthly)
 *
 * All sums normalized to USD using ADMIN_USD_VND_RATE env (default 25000).
 */

import { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_VND_PER_USD = 25_000;

export function getUsdVndRate(): number {
  const raw = process.env.ADMIN_USD_VND_RATE;
  if (!raw) return DEFAULT_VND_PER_USD;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_VND_PER_USD;
}

export type RevenueBucket = {
  today: number;
  week: number;
  month: number;
  total: number;
};

export type RevenueBreakdown = {
  rate: number; // VND per USD used for conversion
  totalUsd: RevenueBucket; // sum of all sources, USD
  vipOrdersUsd: RevenueBucket; // SePay web
  creditTxUsd: RevenueBucket; // Apple/Google IAP + others tracked in credit_transactions
  manualAdsUsd: RevenueBucket; // AdSense/AdMob manual entries
};

type DatedRow = { ts: string; usd: number };

function bucketize(rows: DatedRow[]): RevenueBucket {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  const weekMs = now - 7 * 86_400_000;
  const monthMs = now - 30 * 86_400_000;

  const bucket: RevenueBucket = { today: 0, week: 0, month: 0, total: 0 };
  for (const r of rows) {
    const t = new Date(r.ts).getTime();
    bucket.total += r.usd;
    if (t >= monthMs) bucket.month += r.usd;
    if (t >= weekMs) bucket.week += r.usd;
    if (t >= todayMs) bucket.today += r.usd;
  }
  return bucket;
}

/**
 * Pull paid VIP orders and credit transactions and aggregate revenue
 * across today/7d/30d/total buckets, returning USD.
 *
 * Manual ad revenue uses period_start..period_end overlap with each bucket
 * (so a $100 monthly AdSense entry counts toward weekly and daily
 * proportionally — but for simplicity we attribute the FULL entry to a
 * bucket if its period overlaps; admin can split entries by month if they
 * want finer granularity).
 */
export async function computeRevenue(
  supabase: SupabaseClient,
): Promise<RevenueBreakdown> {
  const rate = getUsdVndRate();
  const monthAgoIso = new Date(Date.now() - 30 * 86_400_000).toISOString();

  // Fetch all sources in parallel
  const [vipOrdersRes, creditTxRes, manualRes] = await Promise.all([
    supabase
      .from('vip_orders')
      .select('amount_vnd, paid_at')
      .eq('status', 'paid')
      .not('paid_at', 'is', null),
    supabase
      .from('credit_transactions')
      .select('price_vnd, price_usd, created_at')
      .or('price_vnd.gt.0,price_usd.gt.0'),
    supabase
      .from('manual_revenue_entries')
      .select('amount_usd, period_start, period_end'),
  ]);

  // VIP orders → USD
  const vipRows: DatedRow[] = (vipOrdersRes.data || [])
    .filter((r) => r.amount_vnd && r.paid_at)
    .map((r) => ({
      ts: r.paid_at as string,
      usd: ((r.amount_vnd as number) || 0) / rate,
    }));

  // credit_transactions: prefer price_usd if present, otherwise convert price_vnd
  const creditRows: DatedRow[] = (creditTxRes.data || []).map((r) => {
    const usdDirect = parseFloat(String(r.price_usd ?? 0)) || 0;
    const vnd = parseFloat(String(r.price_vnd ?? 0)) || 0;
    const usd = usdDirect > 0 ? usdDirect : vnd / rate;
    return { ts: r.created_at as string, usd };
  });

  // Manual revenue entries: attribute to whichever bucket the period overlaps.
  // For a monthly AdSense entry (period_start = 2026-04-01, period_end = 2026-04-30,
  // amount = $200), we count the full $200 toward "month" if 'now' is in April.
  // For weekly/today, we pro-rate by days.
  const manualRows: DatedRow[] = (manualRes.data || []).flatMap((r) => {
    const amt = parseFloat(String(r.amount_usd ?? 0)) || 0;
    if (amt <= 0) return [];
    // Use period_end as the timestamp (entries are paid out at period end).
    // This keeps the bucketize function simple.
    return [{ ts: `${r.period_end as string}T23:59:59Z`, usd: amt }];
  });

  // Quick prune: we only need rows whose ts >= monthAgo for today/week/month,
  // but the bucketize function handles total too — keep all for the total.

  const vipOrdersUsd = bucketize(vipRows);
  const creditTxUsd = bucketize(creditRows);
  const manualAdsUsd = bucketize(manualRows);

  const totalUsd: RevenueBucket = {
    today: vipOrdersUsd.today + creditTxUsd.today + manualAdsUsd.today,
    week: vipOrdersUsd.week + creditTxUsd.week + manualAdsUsd.week,
    month: vipOrdersUsd.month + creditTxUsd.month + manualAdsUsd.month,
    total: vipOrdersUsd.total + creditTxUsd.total + manualAdsUsd.total,
  };

  // monthAgoIso is unused now (bucketize handles all windows) but keep
  // the variable so future fetches can use it as a server-side filter.
  void monthAgoIso;

  return { rate, totalUsd, vipOrdersUsd, creditTxUsd, manualAdsUsd };
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function roundBucket(b: RevenueBucket): RevenueBucket {
  return {
    today: round4(b.today),
    week: round4(b.week),
    month: round4(b.month),
    total: round4(b.total),
  };
}
