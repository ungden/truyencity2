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
    const errors: string[] = [];
    let created = 0;
    const maxAttempts = 4;

    for (let attempt = 1; attempt <= maxAttempts && created < target; attempt++) {
      const remaining = target - created;
      const result = await seeder.spawnDailyNovels(remaining);
      created += result.created;
      if (result.errors.length > 0) {
        errors.push(...result.errors.map((e) => `[attempt ${attempt}] ${e}`));
      }
    }

    if (created < target) {
      return NextResponse.json(
        {
          success: false,
          target,
          created,
          missing: target - created,
          errors,
          error: `Daily spawn incomplete: required ${target}, created ${created}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      target,
      created,
      errors,
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
