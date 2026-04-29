/**
 * Migration check + drift detector (Phase 23 S7)
 *
 * GET — returns list of migrations in repo vs applied in DB.
 * POST { action: 'check' } — returns drift.
 *
 * Auto-applying migrations from the API is RISKY (privilege + DDL). For now this
 * endpoint reports drift; operator runs migrations via Supabase MCP / dashboard.
 *
 * Auth: isAuthorizedAdmin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { readdirSync } from 'fs';
import { join } from 'path';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

async function listLocalMigrations(): Promise<string[]> {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter(f => /^\d+_.+\.sql$/.test(f))
      .sort();
  } catch (e) {
    console.warn('[Migrations] read local failed:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

async function listAppliedMigrations(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  // Supabase tracks migrations in supabase_migrations.schema_migrations
  // (a hidden schema). Direct PostgREST access not available — we approximate
  // by checking whether migration-introduced tables exist.
  // For production this is best-effort; rely on Supabase MCP for authoritative answer.
  const probes = [
    { name: '0153_character_bibles', table: 'character_bibles' },
    { name: '0154_location_timeline', table: 'location_timeline' },
    { name: '0155_quality_metrics', table: 'quality_metrics' },
    { name: '0156_cost_tracking_metadata', table: 'cost_tracking', column: 'metadata' },
    { name: '0157_failed_memory_tasks', table: 'failed_memory_tasks' },
  ];
  const applied: string[] = [];
  for (const p of probes) {
    const { error } = await supabase.from(p.table).select(p.column || '*').limit(1);
    if (!error) applied.push(p.name);
  }
  return applied;
}

export async function GET(req: NextRequest) {
  const auth = await isAuthorizedAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const local = await listLocalMigrations();
  const applied = await listAppliedMigrations();

  // Pending = files in repo but probe table missing
  const localBaseNames = local.map(f => f.replace(/\.sql$/, ''));
  const pending = localBaseNames.filter(n => {
    // Only check Phase 22+ migrations; older are presumed applied
    const num = parseInt(n.split('_')[0], 10);
    if (num < 153) return false;
    return !applied.includes(n);
  });

  return NextResponse.json({
    repo_count: local.length,
    applied_phase22_plus: applied,
    pending_phase22_plus: pending,
    instruction: pending.length > 0
      ? 'Apply pending migrations via Supabase MCP / dashboard. This API does NOT auto-apply DDL for safety.'
      : 'All Phase 22+ migrations applied.',
  });
}

export const POST = GET;
