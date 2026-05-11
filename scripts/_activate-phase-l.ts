/**
 * Activate Phase L 100 novels for cron writer pickup.
 *
 * Cron write-chapters auto-advances setup_stage: idea → world → ... → arc_plan → ready_to_write
 * via DeepSeek setup-pipeline. No Opus outlines for Phase L (DeepSeek auto-generate).
 *
 * Usage:
 *   npx tsx scripts/_activate-phase-l.ts          # dry run
 *   npx tsx scripts/_activate-phase-l.ts --apply  # activate
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const APPLY = process.argv.includes('--apply');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data: projects, error } = await db
    .from('ai_story_projects')
    .select('id, novels!ai_story_projects_novel_id_fkey(title)')
    .eq('pause_reason', 'phase_l_100ideas_2026-05-11');
  if (error || !projects) {
    console.error('Query error:', error);
    process.exit(1);
  }

  console.log(`Phase L projects: ${projects.length}`);

  // Verify chapter_blueprints coverage
  const ids = projects.map((p) => p.id);
  const { count: cbCount } = await db
    .from('chapter_blueprints')
    .select('*', { count: 'exact', head: true })
    .in('project_id', ids);
  console.log(`Chapter blueprints: ${cbCount} / ${projects.length * 1000} expected`);

  if ((cbCount ?? 0) < projects.length * 1000) {
    console.error(`⚠ Coverage incomplete (${cbCount}/${projects.length * 1000}) — wait mass-instantiate finish`);
    if (APPLY) process.exit(1);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — pass --apply to flip status=active, pause_reason=NULL');
    return;
  }

  console.log(`\nActivating ${projects.length} novels...`);
  const { error: updErr } = await db
    .from('ai_story_projects')
    .update({
      status: 'active',
      pause_reason: null,
    })
    .eq('pause_reason', 'phase_l_100ideas_2026-05-11');
  if (updErr) {
    console.error('Update error:', updErr);
    process.exit(1);
  }
  console.log(`✓ ${projects.length} novels activated. Cron writer will pickup next tick (within 5 min).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
