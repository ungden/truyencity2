/**
 * Boost Card API — Use boost cards and check boost status
 *
 * POST: Use a boost card on a novel (Super VIP only)
 * GET:  Get user's boost status (cards remaining, active boosts)
 */

import { createServerClient } from '@/integrations/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const maxDuration = 15;

const UseBoostSchema = z.object({
  novel_id: z.string().uuid(),
});

// POST: Use a boost card
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = UseBoostSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'novel_id không hợp lệ' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('use_boost_card', {
      p_user_id: user.id,
      p_novel_id: parsed.data.novel_id,
    });

    if (error) {
      return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }

    const result = data as { error?: string; success?: boolean };
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Get boost status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('get_reader_status', {
      p_user_id: user.id,
    });

    if (error || !data) {
      return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }

    const status = data as { boost_cards_remaining: number; active_boosts: unknown[] };
    return NextResponse.json({
      boost_cards_remaining: status.boost_cards_remaining,
      active_boosts: status.active_boosts,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
