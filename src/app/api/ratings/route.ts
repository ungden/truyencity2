import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { RatingSubmitSchema, ValidationError, createValidationErrorResponse } from '@/lib/security/validation';

export const maxDuration = 10;

// Helper: compute rating stats using DB-level AVG via RPC
async function getRatingStats(supabase: Awaited<ReturnType<typeof createServerClient>>, novelId: string) {
  const { data, error } = await supabase.rpc('get_novel_stats', { p_novel_id: novelId });

  if (error || !data) {
    console.warn('[ratings] get_novel_stats RPC failed:', error?.message);
    return { rating_count: 0, rating_avg: 0 };
  }

  const stats = typeof data === 'string' ? JSON.parse(data) : data;
  return {
    rating_count: stats.rating_count ?? 0,
    rating_avg: stats.rating_avg ?? 0,
  };
}

// GET /api/ratings?novel_id=xxx — get current user's rating + avg
export async function GET(request: NextRequest) {
  try {
    const novelId = request.nextUrl.searchParams.get('novel_id');
    if (!novelId) {
      return NextResponse.json({ error: 'novel_id required' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { rating_count, rating_avg } = await getRatingStats(supabase, novelId);

    // Get current user's rating
    let user_score: number | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userRating } = await supabase
        .from('ratings')
        .select('score')
        .eq('novel_id', novelId)
        .eq('user_id', user.id)
        .single();
      user_score = userRating?.score ?? null;
    }

    return NextResponse.json({ rating_avg, rating_count, user_score });
  } catch (error) {
    console.error('[ratings] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ratings — create or update rating
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parseResult = RatingSubmitSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return createValidationErrorResponse(new ValidationError('Validation failed', errors));
    }

    const { novel_id, score } = parseResult.data;

    // Upsert rating
    const { data, error } = await supabase
      .from('ratings')
      .upsert(
        {
          user_id: user.id,
          novel_id,
          score,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,novel_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[ratings] Upsert error:', error);
      return NextResponse.json({ error: 'Không thể đánh giá' }, { status: 500 });
    }

    // Return updated aggregates
    const { rating_count, rating_avg } = await getRatingStats(supabase, novel_id);

    return NextResponse.json({
      success: true,
      rating: data,
      rating_avg,
      rating_count,
    });
  } catch (error) {
    console.error('[ratings] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
