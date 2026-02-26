/**
 * API: Seed Platform Content
 *
 * POST /api/seed/generate-content
 *
 * Supports step-by-step execution to avoid timeouts:
 *   step=clear: Delete ALL AI-seeded data (ai_image_jobs, ai_story_projects, novels, ai_authors, cover files)
 *   step=1: Generate authors only
 *   step=2: Generate novels + projects via Gemini (errors on failure, no fallback)
 *   step=3: Activate initial batch
 *   step=covers: Enqueue cover jobs (batch)
 *   step=all: Run all steps (small batches only)
 *
 * Body (all optional):
 *   step: "clear" | "1" | "2" | "3" | "covers" | "all" (default "all")
 *   authorCount: number (default 200)
 *   novelsPerAuthor: number (default 20)
 *   activatePerAuthor: number (default 5)
 *   minChapters: number (default 1000)
 *   maxChapters: number (default 2000)
 *   coverJobLimit: number (default 20) — used when step=covers
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { ContentSeeder } from '@/services/content-seeder';

export const maxDuration = 300; // 5 minutes (Vercel Pro)
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
    const step = body.step || 'all';

    const seeder = new ContentSeeder(geminiKey);
    const config = {
      authorCount: body.authorCount || 200,
      novelsPerAuthor: body.novelsPerAuthor || 20,
      activatePerAuthor: body.activatePerAuthor || 5,
      minChapters: body.minChapters || 1000,
      maxChapters: body.maxChapters || 2000,
    };

    let result;

    if (step === 'clear') {
      result = await seeder.clearAll();
    } else if (step === '1') {
      result = await seeder.seedAuthorsOnly(config.authorCount);
    } else if (step === '2') {
      result = await seeder.seedNovelsOnly(config);
    } else if (step === '3') {
      result = await seeder.activateOnly(config.activatePerAuthor);
    } else if (step === 'covers') {
      const limit = body.coverJobLimit || 20;
      result = await seeder.enqueueCoversOnly(limit);
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
