import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSerialEnabled, runSerialTicks, TICK_BUDGET_MS } from '@/services/serial';

/**
 * 300s is the Vercel ceiling without Fluid compute. The engine is handed the deadline and
 * never starts a paid call it cannot finish before it: completed layers are checkpointed
 * and the next tick resumes there, so a slow planner or a repair costs time, not money.
 */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSerialEnabled()) {
    return NextResponse.json({ status: 'disabled', reason: 'SERIAL_ENGINE_ENABLED is not exactly true' });
  }

  const db = getSupabaseAdmin();
  const startedAt = Date.now();

  // Return leases whose invocation died mid-stage before claiming anything new.
  const reconciled = await db.rpc('reconcile_serial_jobs', { p_stale_minutes: 0 });
  if (reconciled.error) {
    console.error('[serial-cron] reconcile failed', reconciled.error.message);
    return NextResponse.json({ status: 'failed', error: reconciled.error.message }, { status: 500 });
  }

  try {
    const { results, costUsd } = await runSerialTicks({
      db,
      budgetMs: Math.min(TICK_BUDGET_MS, maxDuration * 1_000 - 40_000),
      owner: `serial-cron-${startedAt}`,
      // Leave room to write the checkpoint and the HTTP response after the last call.
      deadline: startedAt + maxDuration * 1_000 - 15_000,
    });
    return NextResponse.json({
      status: 'ok',
      reclaimedLeases: reconciled.data ?? 0,
      stages: results.length,
      costUsd,
      elapsedMs: Date.now() - startedAt,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[serial-cron]', message);
    return NextResponse.json({ status: 'failed', error: message }, { status: 500 });
  }
}
