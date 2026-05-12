import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { computeRevenue, roundBucket, round4 } from '@/lib/admin/revenue';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type CostBucket = { today: number; week: number; month: number; total: number };

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();
    const weekAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const monthAgoIso = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [
      taskResult,
      totalCostResult,
      todayCostResult,
      weekCostResult,
      monthCostResult,
      chapterCostResult,
      chaptersTodayResult,
      revenue,
    ] = await Promise.all([
      supabase
        .from('cost_tracking')
        .select('task, input_tokens, output_tokens, cost')
        .gte('created_at', weekAgoIso),

      supabase
        .from('cost_tracking')
        .select('input_tokens, output_tokens, cost'),

      supabase
        .from('cost_tracking')
        .select('cost')
        .gte('created_at', todayStartIso),

      supabase
        .from('cost_tracking')
        .select('cost')
        .gte('created_at', weekAgoIso),

      supabase
        .from('cost_tracking')
        .select('cost')
        .gte('created_at', monthAgoIso),

      supabase
        .from('chapters')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgoIso),

      supabase
        .from('chapters')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStartIso),

      computeRevenue(supabase),
    ]);

    const taskMap = new Map<
      string,
      { calls: number; input_tokens: number; output_tokens: number; cost: number }
    >();
    if (taskResult.data) {
      for (const row of taskResult.data) {
        const k = row.task as string;
        const existing = taskMap.get(k) || {
          calls: 0,
          input_tokens: 0,
          output_tokens: 0,
          cost: 0,
        };
        existing.calls++;
        existing.input_tokens += (row.input_tokens as number) || 0;
        existing.output_tokens += (row.output_tokens as number) || 0;
        existing.cost += parseFloat(String(row.cost)) || 0;
        taskMap.set(k, existing);
      }
    }
    const taskBreakdown = Array.from(taskMap.entries())
      .map(([task, stats]) => ({ task, ...stats }))
      .sort((a, b) => b.cost - a.cost);

    const sumCost = (rows: Array<{ cost: unknown }> | null): number =>
      (rows || []).reduce((s, r) => s + (parseFloat(String(r.cost)) || 0), 0);

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    let totalCalls = 0;
    if (totalCostResult.data) {
      for (const row of totalCostResult.data) {
        totalInputTokens += (row.input_tokens as number) || 0;
        totalOutputTokens += (row.output_tokens as number) || 0;
        totalCost += parseFloat(String(row.cost)) || 0;
        totalCalls++;
      }
    }

    const costBucket: CostBucket = {
      today: round4(sumCost(todayCostResult.data)),
      week: round4(sumCost(weekCostResult.data)),
      month: round4(sumCost(monthCostResult.data)),
      total: round4(totalCost),
    };

    const chaptersLast7Days = chapterCostResult.count || 0;
    const costPerChapter = chaptersLast7Days > 0 ? costBucket.week / chaptersLast7Days : 0;
    const chaptersToday = chaptersTodayResult.count || 0;

    const revenueTotal = roundBucket(revenue.totalUsd);
    const profit: CostBucket = {
      today: round4(revenueTotal.today - costBucket.today),
      week: round4(revenueTotal.week - costBucket.week),
      month: round4(revenueTotal.month - costBucket.month),
      total: round4(revenueTotal.total - costBucket.total),
    };

    return NextResponse.json({
      success: true,
      summary: {
        todayCost: costBucket.today,
        weekCost: costBucket.week,
        monthCost: costBucket.month,
        totalCost: costBucket.total,
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        costPerChapter: round4(costPerChapter),
        chaptersLast7Days,
        chaptersToday,
      },
      cost: costBucket,
      revenue: {
        rate: revenue.rate,
        total: revenueTotal,
        vipOrders: roundBucket(revenue.vipOrdersUsd),
        creditTx: roundBucket(revenue.creditTxUsd),
        manualAds: roundBucket(revenue.manualAdsUsd),
      },
      profit,
      taskBreakdown,
    });
  } catch (error) {
    console.error('[CostTracking] API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
