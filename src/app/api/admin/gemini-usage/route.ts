import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { GEMINI_PRICING_VERSION } from '@/services/gemini-usage-ledger';

export const dynamic = 'force-dynamic';

interface DailyGeminiUsageRow {
  vn_date: string;
  model: string;
  operation: string;
  price_status: 'priced' | 'unpriced';
  calls: number | string;
  prompt_tokens: number | string;
  cached_input_tokens: number | string;
  candidate_tokens: number | string;
  candidate_text_tokens: number | string;
  candidate_image_tokens: number | string;
  thinking_tokens: number | string;
  tool_use_prompt_tokens: number | string;
  total_tokens: number | string;
  grounding_search_queries: number | string;
  token_cost_usd: number | string;
  grounding_cost_upper_usd: number | string;
}

function number(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requestedDays = Number(request.nextUrl.searchParams.get('days') ?? '31');
  const days = Number.isInteger(requestedDays) ? Math.min(90, Math.max(1, requestedDays)) : 31;
  const start = new Date(Date.now() - (days - 1) * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const { data, error } = await getSupabaseAdmin()
    .from('gemini_usage_daily')
    .select('*')
    .gte('vn_date', start)
    .order('vn_date', { ascending: false })
    .order('token_cost_usd', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as DailyGeminiUsageRow[];
  const totals = rows.reduce((summary, row) => ({
    calls: summary.calls + number(row.calls),
    promptTokens: summary.promptTokens + number(row.prompt_tokens),
    cachedInputTokens: summary.cachedInputTokens + number(row.cached_input_tokens),
    candidateTokens: summary.candidateTokens + number(row.candidate_tokens),
    candidateImageTokens: summary.candidateImageTokens + number(row.candidate_image_tokens),
    thinkingTokens: summary.thinkingTokens + number(row.thinking_tokens),
    totalTokens: summary.totalTokens + number(row.total_tokens),
    groundingSearchQueries: summary.groundingSearchQueries + number(row.grounding_search_queries),
    tokenCostUsd: summary.tokenCostUsd + number(row.token_cost_usd),
    groundingCostUpperUsd: summary.groundingCostUpperUsd + number(row.grounding_cost_upper_usd),
    unpricedCalls: summary.unpricedCalls + (row.price_status === 'unpriced' ? number(row.calls) : 0),
  }), {
    calls: 0,
    promptTokens: 0,
    cachedInputTokens: 0,
    candidateTokens: 0,
    candidateImageTokens: 0,
    thinkingTokens: 0,
    totalTokens: 0,
    groundingSearchQueries: 0,
    tokenCostUsd: 0,
    groundingCostUpperUsd: 0,
    unpricedCalls: 0,
  });

  return NextResponse.json({
    timeZone: 'Asia/Ho_Chi_Minh',
    startDate: start,
    days,
    pricingVersion: GEMINI_PRICING_VERSION,
    totals,
    rows,
    accountingNotes: {
      tokenCostUsd: 'Versioned Gemini Standard list-price estimate from provider usageMetadata.',
      groundingCostUpperUsd: 'Maximum incremental Search charge. The shared monthly free allowance is not attributed to one response.',
      excluded: ['context-cache storage duration', 'invoice credits', 'taxes', 'provider invoice rounding'],
    },
  });
}
