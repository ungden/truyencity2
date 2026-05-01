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
    { name: '0162_first_10_evaluations', table: 'first_10_evaluations' },
    { name: '0163_story_timeline', table: 'story_timeline' },
    { name: '0164_item_events', table: 'item_events' },
    { name: '0165_power_system_canon', table: 'ai_story_projects', column: 'power_system_canon' },
    { name: '0166_factions', table: 'factions' },
    { name: '0167_plot_twists', table: 'plot_twists' },
    { name: '0168_story_themes', table: 'story_themes' },
    { name: '0169_worldbuilding_canon', table: 'ai_story_projects', column: 'worldbuilding_canon' },
    { name: '0170_voice_anchors', table: 'voice_anchors' },
  ];
  const applied: string[] = [];
  for (const p of probes) {
    const { error } = await supabase.from(p.table).select(p.column || '*').limit(1);
    if (!error) applied.push(p.name);
  }
  return applied;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await isAuthorizedAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const local = await listLocalMigrations();
  const applied = await listAppliedMigrations();

  const localBaseNames = local.map(f => f.replace(/\.sql$/, ''));
  const pending = localBaseNames.filter(n => {
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
