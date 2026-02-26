/**
 * API: Enrich Novels with Rich Content + Covers
 *
 * POST /api/seed/enrich-novels
 *
 * Modes:
 *   mode=descriptions  — Enrich descriptions only (fast, text-only)
 *   mode=covers        — Generate covers only (slow, image gen)
 *   mode=all           — Both descriptions + covers
 *
 * Body:
 *   mode: "descriptions" | "covers" | "all" (default "descriptions")
 *   enrichLimit: number (default 20) — novels to enrich per call
 *   coverLimit: number (default 5)   — covers to generate per call
 *
 * Designed to be called repeatedly until all novels are enriched.
 * Each call processes a batch, picks up where last call left off.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { NovelEnricher } from '@/services/novel-enricher';

export const maxDuration = 300; // 5 min
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'descriptions';
    const enrichLimit = body.enrichLimit || 20;
    const coverLimit = body.coverLimit || 5;

    const enricher = new NovelEnricher(geminiKey);
    let result;

    if (mode === 'descriptions') {
      result = await enricher.enrichDescriptions(enrichLimit);
    } else if (mode === 'covers') {
      result = await enricher.generateCovers(coverLimit);
    } else {
      result = await enricher.enrichAndCover(enrichLimit, coverLimit);
    }

    return NextResponse.json({
      success: true,
      mode,
      ...result,
      durationSeconds: Math.round(result.durationMs / 1000),
    });
  } catch (error) {
    console.error('[Enrich] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
