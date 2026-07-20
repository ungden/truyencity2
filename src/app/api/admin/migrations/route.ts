import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

async function probeCanonicalSchema() {
  const supabase = getSupabaseAdmin();
  const probes = [
    { table: 'ai_story_projects', columns: 'id,engine_release,story_kernel,arc_plan,story_state' },
    { table: 'story_factory_jobs', columns: 'id,status,stage,rolling_plan,lease_until' },
    { table: 'story_factory_runs', columns: 'id,kind,status,engine_release' },
    { table: 'story_state_events', columns: 'id,event_type,payload' },
  ];
  const results: Array<{ table: string; ready: boolean; error?: string }> = [];
  for (const p of probes) {
    const { error } = await supabase.from(p.table).select(p.columns).limit(1);
    results.push({ table: p.table, ready: !error, ...(error ? { error: error.message } : {}) });
  }
  return results;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await isAuthorizedAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tables = await probeCanonicalSchema();
  const ready = tables.every(table => table.ready);
  return NextResponse.json({
    canonical_factory_ready: ready,
    tables,
    instruction: ready
      ? 'Canonical Story Factory schema is ready.'
      : 'Apply the canonical cleanup migration with the operator CLI.',
  }, { status: ready ? 200 : 503 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
