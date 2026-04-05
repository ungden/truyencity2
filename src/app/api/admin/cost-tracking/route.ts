import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Run 4 queries in parallel
    const [dailyResult, taskResult, totalsResult, chapterCostResult] = await Promise.all([
      // 1. Daily totals (last 30 days) — RPC may not exist, handle gracefully
      supabase.rpc('get_daily_cost' as never).then(
        (r: { data: unknown; error: unknown }) => r,
        () => ({ data: null, error: null }),
      ),

      // 2. Task breakdown (last 7 days) — raw SQL via cost_tracking
      supabase
        .from('cost_tracking')
        .select('task, input_tokens, output_tokens, cost')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),

      // 3. Running totals
      supabase
        .from('cost_tracking')
        .select('input_tokens, output_tokens, cost'),

      // 4. Chapter count last 7 days (for cost-per-chapter)
      supabase
        .from('chapters')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

    // Aggregate task breakdown manually
    const taskMap = new Map<string, { calls: number; input_tokens: number; output_tokens: number; cost: number }>();
    if (taskResult.data) {
      for (const row of taskResult.data) {
        const existing = taskMap.get(row.task) || { calls: 0, input_tokens: 0, output_tokens: 0, cost: 0 };
        existing.calls++;
        existing.input_tokens += row.input_tokens || 0;
        existing.output_tokens += row.output_tokens || 0;
        existing.cost += parseFloat(String(row.cost)) || 0;
        taskMap.set(row.task, existing);
      }
    }
    const taskBreakdown = Array.from(taskMap.entries())
      .map(([task, stats]) => ({ task, ...stats }))
      .sort((a, b) => b.cost - a.cost);

    // Aggregate totals
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    let totalCalls = 0;
    if (totalsResult.data) {
      for (const row of totalsResult.data) {
        totalInputTokens += row.input_tokens || 0;
        totalOutputTokens += row.output_tokens || 0;
        totalCost += parseFloat(String(row.cost)) || 0;
        totalCalls++;
      }
    }

    // Today and period costs from task data
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    let todayCost = 0;
    let weekCost = 0;
    let monthCost = 0;
    if (totalsResult.data) {
      for (const row of totalsResult.data) {
        const cost = parseFloat(String(row.cost)) || 0;
        // We don't have created_at in the select, so use taskResult data for period breakdown
        // For simplicity, use taskResult (7-day window) for week cost
      }
    }
    // Use taskResult for week cost
    weekCost = taskBreakdown.reduce((sum, t) => sum + t.cost, 0);

    // For today cost, we need a separate query
    const { data: todayData } = await supabase
      .from('cost_tracking')
      .select('cost')
      .gte('created_at', todayStart);

    if (todayData) {
      todayCost = todayData.reduce((sum, r) => sum + (parseFloat(String(r.cost)) || 0), 0);
    }

    // Month cost
    const { data: monthData } = await supabase
      .from('cost_tracking')
      .select('cost')
      .gte('created_at', monthAgo);

    if (monthData) {
      monthCost = monthData.reduce((sum, r) => sum + (parseFloat(String(r.cost)) || 0), 0);
    }

    // Cost per chapter (7 days)
    const chaptersLast7Days = chapterCostResult.count || 0;
    const costPerChapter = chaptersLast7Days > 0 ? weekCost / chaptersLast7Days : 0;

    // Daily breakdown from RPC or manual aggregation
    const dailyData = dailyResult.data || [];

    return NextResponse.json({
      success: true,
      summary: {
        todayCost: Math.round(todayCost * 10000) / 10000,
        weekCost: Math.round(weekCost * 10000) / 10000,
        monthCost: Math.round(monthCost * 10000) / 10000,
        totalCost: Math.round(totalCost * 10000) / 10000,
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        costPerChapter: Math.round(costPerChapter * 10000) / 10000,
        chaptersLast7Days,
      },
      taskBreakdown,
      dailyData,
    });
  } catch (error) {
    console.error('[CostTracking] API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
