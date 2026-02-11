/**
 * Supabase pg_cron Target: Daily New Story Spawn
 *
 * Called once per day before daily rotation.
 * Creates a fixed number of new novels/projects (default: 20).
 * New projects are created as paused so rotation can activate fairly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContentSeeder } from '@/services/story-writing-factory/content-seeder';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === 'development';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });
  }

  const targetParam = Number(request.nextUrl.searchParams.get('target') || '20');
  const target = Number.isFinite(targetParam) ? Math.min(Math.max(1, targetParam), 100) : 20;

  try {
    const seeder = new ContentSeeder(geminiKey);
    const result = await seeder.spawnDailyNovels(target);

    return NextResponse.json({
      success: true,
      target,
      created: result.created,
      errors: result.errors,
      durationSeconds: Math.round(result.durationMs / 1000),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
