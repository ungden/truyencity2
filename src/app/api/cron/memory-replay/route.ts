/**
 * Memory Replay Cron (Phase 23 S2)
 *
 * Drains failed_memory_tasks queue with exponential backoff. Triggered by pg_cron
 * every 15 minutes. Auth via CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { drainRetryQueue } from '@/services/story-engine/utils/retry-queue';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const stats = await drainRetryQueue(20);
    return NextResponse.json({
      success: true,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

export const POST = GET;
