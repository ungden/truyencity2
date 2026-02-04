/**
 * API: Seed Platform Content
 *
 * POST /api/seed/generate-content
 *
 * Supports step-by-step execution to avoid timeouts:
 *   step=1: Generate authors only
 *   step=2: Generate novels + projects (uses fallback if Gemini slow)
 *   step=3: Activate initial batch
 *   step=all: Run all steps (small batches only)
 *
 * Body (all optional):
 *   step: "1" | "2" | "3" | "all" (default "all")
 *   authorCount: number (default 200)
 *   novelsPerAuthor: number (default 20)
 *   activatePerAuthor: number (default 5)
 *   minChapters: number (default 1000)
 *   maxChapters: number (default 2000)
 *   useGemini: boolean (default true) — set false to use fallback templates only (fast)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContentSeeder } from '@/services/story-writing-factory/content-seeder';

export const maxDuration = 300; // 5 minutes (Vercel Pro)
export const dynamic = 'force-dynamic';

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === 'development';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const step = body.step || 'all';

    const seeder = new ContentSeeder(geminiKey);
    const config = {
      authorCount: body.authorCount || 200,
      novelsPerAuthor: body.novelsPerAuthor || 20,
      activatePerAuthor: body.activatePerAuthor || 5,
      minChapters: body.minChapters || 1000,
      maxChapters: body.maxChapters || 2000,
      useGemini: body.useGemini !== false,
    };

    let result;

    if (step === '1') {
      result = await seeder.seedAuthorsOnly(config.authorCount);
    } else if (step === '2') {
      result = await seeder.seedNovelsOnly(config);
    } else if (step === '3') {
      result = await seeder.activateOnly(config.activatePerAuthor);
    } else {
      result = await seeder.seed(config);
    }

    return NextResponse.json({
      success: true,
      step,
      ...result,
      durationSeconds: Math.round(result.durationMs / 1000),
    });
  } catch (error) {
    console.error('[Seed] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
