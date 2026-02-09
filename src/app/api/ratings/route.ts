import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/ratings?novel_id=xxx — get current user's rating + avg
export async function GET(request: NextRequest) {
  const novelId = request.nextUrl.searchParams.get('novel_id');
  if (!novelId) {
    return NextResponse.json({ error: 'novel_id required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Get aggregate stats
  const { data: stats } = await supabase
    .from('ratings')
    .select('score')
    .eq('novel_id', novelId);

  const scores = stats || [];
  const rating_count = scores.length;
  const rating_avg = rating_count > 0
    ? Math.round((scores.reduce((s, r) => s + r.score, 0) / rating_count) * 100) / 100
    : 0;

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
}

// POST /api/ratings — create or update rating
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
  }

  const body = await request.json();
  const { novel_id, score } = body;

  if (!novel_id || !score || score < 1 || score > 5) {
    return NextResponse.json({ error: 'novel_id and score (1-5) required' }, { status: 400 });
  }

  // Upsert rating
  const { data, error } = await supabase
    .from('ratings')
    .upsert(
      {
        user_id: user.id,
        novel_id,
        score: Math.round(score),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,novel_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Rating upsert error:', error);
    return NextResponse.json({ error: 'Không thể đánh giá' }, { status: 500 });
  }

  // Return updated aggregates
  const { data: stats } = await supabase
    .from('ratings')
    .select('score')
    .eq('novel_id', novel_id);

  const scores = stats || [];
  const rating_count = scores.length;
  const rating_avg = rating_count > 0
    ? Math.round((scores.reduce((s, r) => s + r.score, 0) / rating_count) * 100) / 100
    : 0;

  return NextResponse.json({
    success: true,
    rating: data,
    rating_avg,
    rating_count,
  });
}
