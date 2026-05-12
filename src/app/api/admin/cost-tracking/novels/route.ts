/**
 * GET /api/admin/cost-tracking/novels
 *
 * Returns per-novel cost rollup + engagement metrics ranked by total cost.
 * Backed by `get_novel_costs_with_engagement(p_limit, p_offset)` RPC
 * (migration 0175).
 *
 * Query params:
 *   ?limit=100 (default, max 500)
 *   ?offset=0 (default)
 */
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc('get_novel_costs_with_engagement', {
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const novels = (data || []) as Array<{
      project_id: string;
      novel_id: string;
      novel_title: string;
      current_chapter: number;
      total_cost: string;
      input_tokens: number;
      output_tokens: number;
      call_count: number;
      cost_per_chapter: string;
      status: string;
      total_reads: number;
      reads_last_7d: number;
      bookmark_count: number;
      rating_avg: string;
      rating_count: number;
    }>;

    const grandTotal = novels.reduce((s, n) => s + Number(n.total_cost), 0);
    const grandTokensIn = novels.reduce((s, n) => s + Number(n.input_tokens), 0);
    const grandTokensOut = novels.reduce((s, n) => s + Number(n.output_tokens), 0);

    return NextResponse.json({
      success: true,
      novels: novels.map((n) => ({
        ...n,
        total_cost: Number(n.total_cost),
        cost_per_chapter: Number(n.cost_per_chapter),
        rating_avg: Number(n.rating_avg),
        cost_per_1000_reads: n.total_reads > 0
          ? Math.round((Number(n.total_cost) / n.total_reads) * 1000 * 10000) / 10000
          : 0,
      })),
      pagination: { limit, offset, count: novels.length },
      summary: {
        grandTotal: Math.round(grandTotal * 10000) / 10000,
        grandTokensIn,
        grandTokensOut,
      },
    });
  } catch (error) {
    console.error('[NovelCosts] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
