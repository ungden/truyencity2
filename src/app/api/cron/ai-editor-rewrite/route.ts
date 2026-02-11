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
    const maxJobs = Number(request.nextUrl.searchParams.get('maxJobs') || '1');
    const maxChaptersPerJob = Number(request.nextUrl.searchParams.get('maxChaptersPerJob') || '2');

    const result = await aiEditorService.processRewriteWorker({
      maxJobs: Number.isFinite(maxJobs) ? Math.min(Math.max(1, maxJobs), 3) : 1,
      maxChaptersPerJob: Number.isFinite(maxChaptersPerJob)
        ? Math.min(Math.max(1, maxChaptersPerJob), 5)
        : 2,
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
