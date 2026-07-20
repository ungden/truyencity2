import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { runStoryFactoryTick, STORY_FACTORY_RELEASE } from '@/services/story-factory';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runStoryFactoryTick();
    return NextResponse.json({ release: STORY_FACTORY_RELEASE, ...result });
  } catch (error) {
    console.error('[story-factory]', error);
    return NextResponse.json({
      release: STORY_FACTORY_RELEASE,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export const POST = GET;
