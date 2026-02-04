/**
 * API: Seed Platform Content
 *
 * POST /api/seed/generate-content
 *
 * Generates AI authors + novels at scale.
 * Auth: CRON_SECRET or development mode.
 *
 * Body (all optional):
 *   authorCount: number (default 200)
 *   novelsPerAuthor: number (default 20)
 *   activatePerAuthor: number (default 5)
 *   minChapters: number (default 1000)
 *   maxChapters: number (default 2000)
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

    const seeder = new ContentSeeder(geminiKey);
    const result = await seeder.seed({
      authorCount: body.authorCount || 200,
      novelsPerAuthor: body.novelsPerAuthor || 20,
      activatePerAuthor: body.activatePerAuthor || 5,
      minChapters: body.minChapters || 1000,
      maxChapters: body.maxChapters || 2000,
    });

    return NextResponse.json({
      success: true,
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
