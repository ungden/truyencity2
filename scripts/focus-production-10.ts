/**
 * Focus production on the 10 allowlisted projects.
 *
 * Usage:
 *   ./node_modules/.bin/tsx scripts/focus-production-10.ts --dry-run
 *   ./node_modules/.bin/tsx scripts/focus-production-10.ts --apply
 *
 * Loads env in order: .env.runtime, then .env.local for missing values.
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.runtime' });
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const SUPABASE_URL_REQUIRED = SUPABASE_URL;
const SUPABASE_KEY_REQUIRED = SUPABASE_KEY;

const MEMORY_TABLES = [
  'chapter_summaries',
  'story_synopsis',
  'arc_plans',
  'character_states',
  'story_memory_chunks',
  'plot_threads',
  'world_rules_index',
  'beat_usage',
  'volume_summaries',
  'foreshadowing_plans',
  'character_arcs',
  'character_signature_traits',
  'pacing_blueprints',
  'voice_fingerprints',
  'mc_power_states',
  'world_locations',
  'location_bibles',
  'character_knowledge',
  'character_relationships',
  'character_bibles',
  'location_timeline',
  'quality_metrics',
  'quality_trends',
  'failed_memory_tasks',
  'project_daily_quotas',
];

async function main(): Promise<void> {
  const {
    FOCUSED_PROJECT_IDS,
    FOCUS_MODE_ENABLED,
  } = await import('../src/lib/story-production-focus');

  if (!FOCUS_MODE_ENABLED) {
    console.error('STORY_FOCUS_MODE=0 disables focus mode. Refusing to run focus reset.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL_REQUIRED, SUPABASE_KEY_REQUIRED, {
    auth: { persistSession: false },
  });

  console.log(`Story production focus reset (DRY_RUN=${DRY_RUN})`);
  console.log(`Focused project IDs (${FOCUSED_PROJECT_IDS.length}): ${FOCUSED_PROJECT_IDS.join(',')}\n`);

  const { data: targets, error: targetErr } = await supabase
    .from('ai_story_projects')
    .select('id,novel_id,genre,status,current_chapter,total_planned_chapters,setup_stage,created_at,novels!ai_story_projects_novel_id_fkey(title)')
    .in('id', FOCUSED_PROJECT_IDS)
    .order('created_at', { ascending: false });
  if (targetErr) throw targetErr;

  const targetIds = new Set((targets || []).map((p) => p.id));
  const missingIds = FOCUSED_PROJECT_IDS.filter((id) => !targetIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(`Focused project IDs missing in DB: ${missingIds.join(',')}`);
  }

  console.log('Targets:');
  for (const p of targets || []) {
    const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    console.log(`- ${p.id} | ${novel?.title || '?'} | ${p.genre} | ${p.status}/${p.setup_stage || '(null)'} | ch.${p.current_chapter || 0}/${p.total_planned_chapters || '?'}`);
  }

  const { count: activeCount } = await supabase
    .from('ai_story_projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  const { count: pausedCount } = await supabase
    .from('ai_story_projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paused');
  const { data: activeProjects } = await supabase
    .from('ai_story_projects')
    .select('id')
    .eq('status', 'active');
  const outsideActiveIds = (activeProjects || [])
    .map((p) => p.id)
    .filter((id) => !targetIds.has(id));

  console.log(`\nCurrent DB status: active=${activeCount || 0}, paused=${pausedCount || 0}`);
  console.log(`Active projects outside focus: ${outsideActiveIds.length}`);

  if (DRY_RUN) {
    console.log('\nDRY_RUN only. Re-run with --apply to pause outside focus and reset the 10 targets.');
    return;
  }

  const nowIso = new Date().toISOString();
  if (outsideActiveIds.length > 0) {
    console.log('\nPausing active projects outside focus...');
    for (let i = 0; i < outsideActiveIds.length; i += 100) {
      const chunk = outsideActiveIds.slice(i, i + 100);
      const { error } = await supabase
        .from('ai_story_projects')
        .update({
          status: 'paused',
          pause_reason: 'outside_focus_allowlist',
          paused_at: nowIso,
          updated_at: nowIso,
        })
        .in('id', chunk)
        .eq('status', 'active');
      if (error) throw error;
      console.log(`  paused ${chunk.length}`);
    }
  }

  const projectIds = FOCUSED_PROJECT_IDS;
  const novelIds = (targets || []).map((p) => p.novel_id).filter(Boolean);

  console.log('\nWiping generated memory/state for focused projects...');
  for (const table of MEMORY_TABLES) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .in('project_id', projectIds);
    if (error) console.warn(`  ${table}: ${error.message}`);
    else console.log(`  ${table}: ${count ?? 0}`);
  }

  console.log('\nDeleting focused chapters...');
  const { error: chapterErr, count: chapterCount } = await supabase
    .from('chapters')
    .delete({ count: 'exact' })
    .in('novel_id', novelIds);
  if (chapterErr) console.warn(`  chapters: ${chapterErr.message}`);
  else console.log(`  chapters: ${chapterCount ?? 0}`);

  console.log('\nResetting focused projects to paused/setup_stage=idea/current_chapter=0...');
  const { error: resetErr } = await supabase
    .from('ai_story_projects')
    .update({
      status: 'paused',
      pause_reason: null,
      paused_at: null,
      current_chapter: 0,
      main_character: '',
      world_description: null,
      master_outline: null,
      story_outline: null,
      story_bible: null,
      setup_stage: 'idea',
      setup_stage_attempts: 0,
      setup_stage_error: null,
      setup_stage_updated_at: nowIso,
      updated_at: nowIso,
    })
    .in('id', projectIds);
  if (resetErr) throw resetErr;

  const { error: novelErr } = await supabase
    .from('novels')
    .update({ chapter_count: 0, updated_at: nowIso })
    .in('id', novelIds);
  if (novelErr) console.warn(`novels.chapter_count reset skipped/failed: ${novelErr.message}`);

  const { data: verify } = await supabase
    .from('ai_story_projects')
    .select('id,status,current_chapter,setup_stage')
    .in('id', projectIds);
  const ok = (verify || []).every((p) =>
    p.status === 'paused' && (p.current_chapter || 0) === 0 && p.setup_stage === 'idea');

  console.log(`\nVerification: ${ok ? 'OK' : 'FAILED'}`);
  for (const p of verify || []) {
    console.log(`- ${p.id} | ${p.status}/${p.setup_stage} | ch.${p.current_chapter || 0}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
