/**
 * CRUD for manual_revenue_entries — admin-entered ad revenue (AdSense/AdMob)
 * that doesn't sync via webhook.
 *
 * GET  /api/admin/manual-revenue       → list newest 100
 * POST /api/admin/manual-revenue       → create entry
 * Delete via /api/admin/manual-revenue/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const SOURCES = ['adsense_web', 'admob_mobile', 'other'] as const;

const CreateSchema = z.object({
  source: z.enum(SOURCES),
  amount_usd: z.number().nonnegative(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'period_start must be YYYY-MM-DD'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'period_end must be YYYY-MM-DD'),
  notes: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('manual_revenue_entries')
      .select('*')
      .order('period_end', { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, entries: data || [] });
  } catch (err) {
    console.error('[ManualRevenue] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 },
      );
    }

    if (new Date(parsed.data.period_end) < new Date(parsed.data.period_start)) {
      return NextResponse.json(
        { error: 'period_end must be on or after period_start' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('manual_revenue_entries')
      .insert({
        source: parsed.data.source,
        amount_usd: parsed.data.amount_usd,
        period_start: parsed.data.period_start,
        period_end: parsed.data.period_end,
        notes: parsed.data.notes ?? null,
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, entry: data });
  } catch (err) {
    console.error('[ManualRevenue] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
