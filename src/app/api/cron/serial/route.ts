import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isSerialEnabled, runSerialTicks, TICK_BUDGET_MS } from '@/services/serial';

/**
 * 300s is the Vercel default ceiling without Fluid compute. A chapter is a write, a
 * judge and an extract — roughly 150s in practice — so it fits, and `runSerialTicks`
 * stops starting stages it cannot finish. Raise this to 800 once Fluid is enabled on
 * the project and the engine will simply drain more stages per invocation.
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
