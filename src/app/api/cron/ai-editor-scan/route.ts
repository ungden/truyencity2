import { NextRequest, NextResponse } from 'next/server';
import { aiEditorService } from '@/services/story-writing-factory/ai-editor';

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

  try {
    const maxProjects = Number(request.nextUrl.searchParams.get('maxProjects') || '250');
    const lowScoreThreshold = Number(request.nextUrl.searchParams.get('lowScoreThreshold') || '65');

    const result = await aiEditorService.runDailyScan({
      maxProjects: Number.isFinite(maxProjects) ? Math.min(Math.max(10, maxProjects), 500) : 250,
      lowScoreThreshold: Number.isFinite(lowScoreThreshold) ? Math.min(Math.max(40, lowScoreThreshold), 90) : 65,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
