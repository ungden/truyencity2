/**
 * Phase S reset orchestrator (2026-05-15).
 *
 * Clears all chapters + canon data + outlines for a novel, archives
 * current setup to style_directives.archived_setup_<timestamp>, resets
 * setup_stage to 'idea' so cron picks it up via setup pipeline v3.
 *
 * KEEPS: novels.id, novels.slug, novels.cover_url, novels.title (may
 * change later if idea pivots), novels.author, ai_story_projects.id,
 * ai_story_projects.genre, ai_story_projects.topic_id.
 *
 * Usage:
 *   npx tsx scripts/reset-novel-setup.ts <novel_id>                  # dry-run
 *   npx tsx scripts/reset-novel-setup.ts <novel_id> --apply           # commit
 *   npx tsx scripts/reset-novel-setup.ts --all-production [--apply]   # all 13
 *
 * Rollback: scripts/rollback-reset.ts <novel_id> [--apply]
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Tables to clear data from (per project_id or novel_id)
// All have project_id column unless noted.
const TABLES_BY_PROJECT_ID = [
  'chapter_summaries',
  'story_synopsis',
  'arc_plans',
  'character_states',
  'character_arcs',
  'character_signature_traits',
  'foreshadowing_agenda',
  'foreshadowing_hints',
  'pacing_blueprints',
  'voice_fingerprints',
  'voice_anchors',
  'mc_power_states',
  'world_locations',
  'location_bibles',
  'story_memory_chunks',
  'plot_threads',
  'volume_summaries',
  'beat_usage',
  'plot_twists',
  'story_themes',
  'factions',
  'story_timeline',
  'item_events',
  'first_10_evaluations',
  'failed_memory_tasks',
  'chapter_blueprints',
];

// Project fields to NULL out (preserved via archive)
// Note: setupKernel lives inside story_outline JSONB, not own column;
// description lives in novels table; last_error doesn't exist.
const PROJECT_FIELDS_TO_RESET = [
  'master_outline',
  'story_outline',
  'story_bible',
  'worldbuilding_canon',
  'power_system_canon',
  'world_description',
  'cultivation_system',
  'magic_system',
  'martial_arts_system',
  'apocalypse_type',
  'supernatural_system',
  'political_system',
  'world_system',
  'romance_type',
  'game_system',
  'setup_stage_error',
];

interface ResetStats {
  novelId: string;
  novelTitle: string;
  projectId: string;
  chaptersDeleted: number;
  tablesCleared: Record<string, number>;
  fieldsReset: string[];
  archiveTimestamp: string;
  success: boolean;
  error?: string;
}

async function archiveCurrentSetup(
  projectId: string,
  apply: boolean,
): Promise<{ timestamp: string; success: boolean; error?: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Fetch current setup
  const { data: project, error: fetchErr } = await s
    .from('ai_story_projects')
    .select(
      'novel_id, main_character, master_outline, story_outline, story_bible, worldbuilding_canon, power_system_canon, world_description, target_chapter_length, setup_stage, ai_model, style_directives, cultivation_system, magic_system, martial_arts_system, apocalypse_type, supernatural_system, political_system, world_system, romance_type, game_system, sub_genres, mc_archetype, anti_tropes',
    )
    .eq('id', projectId)
    .maybeSingle();
  if (fetchErr || !project) {
    return { timestamp, success: false, error: fetchErr?.message || 'Project not found' };
  }

  // Also fetch novel.description (lives in novels table)
  const { data: novelRow } = await s
    .from('novels')
    .select('description')
    .eq('id', project.novel_id as string)
    .maybeSingle();

  const styleDirectives = (project.style_directives as Record<string, unknown>) || {};
  const archived = {
    timestamp,
    archived_at: new Date().toISOString(),
    main_character: project.main_character,
    master_outline: project.master_outline,
    story_outline: project.story_outline,
    story_bible: project.story_bible,
    worldbuilding_canon: project.worldbuilding_canon,
    power_system_canon: project.power_system_canon,
    world_description: project.world_description,
    novel_description: novelRow?.description,
    target_chapter_length: project.target_chapter_length,
    setup_stage: project.setup_stage,
    ai_model: project.ai_model,
    cultivation_system: project.cultivation_system,
    magic_system: project.magic_system,
    martial_arts_system: project.martial_arts_system,
    apocalypse_type: project.apocalypse_type,
    supernatural_system: project.supernatural_system,
    political_system: project.political_system,
    world_system: project.world_system,
    romance_type: project.romance_type,
    game_system: project.game_system,
    sub_genres: project.sub_genres,
    mc_archetype: project.mc_archetype,
    anti_tropes: project.anti_tropes,
  };

  if (!apply) return { timestamp, success: true };

  // Store under archived_setups[<timestamp>] — array of archive objects
  const existingArchives = (styleDirectives.archived_setups as unknown[]) || [];
  const updatedDirectives = {
    ...styleDirectives,
    archived_setups: [...existingArchives, archived].slice(-3), // Keep last 3 only
    last_reset_at: new Date().toISOString(),
  };

  const { error: updErr } = await s
    .from('ai_story_projects')
    .update({ style_directives: updatedDirectives })
    .eq('id', projectId);
  if (updErr) return { timestamp, success: false, error: updErr.message };

  return { timestamp, success: true };
}

async function deleteChapters(novelId: string, apply: boolean): Promise<number> {
  const { count } = await s
    .from('chapters')
    .select('id', { count: 'exact', head: true })
    .eq('novel_id', novelId);
  if (!apply) return count || 0;

  const { error } = await s.from('chapters').delete().eq('novel_id', novelId);
  if (error) {
    console.warn(`[reset] delete chapters failed for novel ${novelId}: ${error.message}`);
    return 0;
  }
  return count || 0;
}

async function clearTablesByProject(
  projectId: string,
  apply: boolean,
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const table of TABLES_BY_PROJECT_ID) {
    try {
      const { count } = await s
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
      if (count === null) continue;
      result[table] = count;
      if (!apply || count === 0) continue;
      const { error } = await s.from(table).delete().eq('project_id', projectId);
      if (error) {
        console.warn(`[reset] delete ${table} failed for ${projectId}: ${error.message}`);
      }
    } catch (e) {
      // Table may not exist (e.g. older schemas) — skip silently
      console.warn(`[reset] skip ${table}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}

async function resetProjectFields(projectId: string, apply: boolean): Promise<string[]> {
  if (!apply) return PROJECT_FIELDS_TO_RESET;

  const reset: Record<string, unknown> = {};
  for (const field of PROJECT_FIELDS_TO_RESET) {
    reset[field] = null;
  }
  // Also reset state
  reset.setup_stage = 'idea';
  reset.current_chapter = 0;
  reset.status = 'idea';
  reset.kernel_repair_attempts = 0;
  reset.setup_stage_attempts = 0;
  reset.pause_reason = null;

  const { error } = await s.from('ai_story_projects').update(reset).eq('id', projectId);
  if (error) {
    console.warn(`[reset] update project fields failed for ${projectId}: ${error.message}`);
    return [];
  }
  return PROJECT_FIELDS_TO_RESET;
}

async function pauseProduction(projectId: string, apply: boolean): Promise<boolean> {
  if (!apply) return true;
  const { data: row } = await s
    .from('ai_story_projects')
    .select('style_directives')
    .eq('id', projectId)
    .maybeSingle();
  const styleDirectives = (row?.style_directives as Record<string, unknown>) || {};
  const updated = {
    ...styleDirectives,
    production_enabled: false,
    production_paused_at: new Date().toISOString(),
    production_paused_reason: 'Phase S reset — awaiting setup pipeline v3 re-run',
  };
  const { error } = await s
    .from('ai_story_projects')
    .update({ style_directives: updated })
    .eq('id', projectId);
  return !error;
}

async function processNovel(novelId: string, apply: boolean): Promise<ResetStats> {
  // Resolve project + novel info
  const { data: novel } = await s
    .from('novels')
    .select('title')
    .eq('id', novelId)
    .maybeSingle();
  const novelTitle = (novel?.title as string) || `(novel ${novelId})`;

  const { data: project } = await s
    .from('ai_story_projects')
    .select('id')
    .eq('novel_id', novelId)
    .maybeSingle();
  const projectId = project?.id as string;

  const stats: ResetStats = {
    novelId,
    novelTitle: novelTitle.slice(0, 60),
    projectId: projectId || '',
    chaptersDeleted: 0,
    tablesCleared: {},
    fieldsReset: [],
    archiveTimestamp: '',
    success: false,
  };

  if (!projectId) {
    stats.error = 'No ai_story_projects row';
    return stats;
  }

  console.log(`\n████ ${novelTitle} ████  project=${projectId.slice(0, 8)}  ${apply ? 'APPLY' : 'DRY'}`);

  // Step 1: pause production
  const paused = await pauseProduction(projectId, apply);
  if (!paused && apply) {
    stats.error = 'Failed to pause production';
    return stats;
  }
  console.log(`  ✓ production paused`);

  // Step 2: archive current setup
  const arch = await archiveCurrentSetup(projectId, apply);
  if (!arch.success) {
    stats.error = `Archive failed: ${arch.error}`;
    return stats;
  }
  stats.archiveTimestamp = arch.timestamp;
  console.log(`  ✓ archive saved (timestamp=${arch.timestamp})`);

  // Step 3: delete chapters
  const chDeleted = await deleteChapters(novelId, apply);
  stats.chaptersDeleted = chDeleted;
  console.log(`  ✓ ${chDeleted} chapters ${apply ? 'deleted' : 'would delete'}`);

  // Step 4: clear canon tables
  const tablesCleared = await clearTablesByProject(projectId, apply);
  stats.tablesCleared = tablesCleared;
  const totalRowsCleared = Object.values(tablesCleared).reduce((a, b) => a + b, 0);
  const tablesWithRows = Object.entries(tablesCleared).filter(([_, c]) => c > 0);
  console.log(
    `  ✓ canon tables: ${totalRowsCleared} rows across ${tablesWithRows.length} tables (${apply ? 'cleared' : 'would clear'})`,
  );
  if (tablesWithRows.length > 0) {
    for (const [table, count] of tablesWithRows) {
      console.log(`      ${table}: ${count}`);
    }
  }

  // Step 5: reset project fields
  const fieldsReset = await resetProjectFields(projectId, apply);
  stats.fieldsReset = fieldsReset;
  console.log(`  ✓ ${fieldsReset.length} project fields ${apply ? 'reset' : 'would reset'}`);

  stats.success = true;
  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const allProduction = args.includes('--all-production');
  const singleNovelId = args.find(a => /^[0-9a-f]{8}-/.test(a));

  let novelIds: string[];
  if (singleNovelId) {
    novelIds = [singleNovelId];
  } else if (allProduction) {
    const { data: projects } = await s
      .from('ai_story_projects')
      .select('novel_id')
      .filter('style_directives->>production_enabled', 'eq', 'true');
    novelIds = (projects || []).map(p => p.novel_id).filter(Boolean) as string[];
    console.log(`Found ${novelIds.length} production novels`);
  } else {
    console.error('Usage: reset-novel-setup.ts <novel_id> | --all-production [--apply]');
    process.exit(1);
  }

  const results: ResetStats[] = [];
  for (const id of novelIds) {
    const r = await processNovel(id, apply);
    results.push(r);
  }

  console.log(`\n━━━━ SUMMARY ━━━━`);
  console.log(`Processed: ${results.length} novels`);
  console.log(`Success:   ${results.filter(r => r.success).length}`);
  console.log(`Failed:    ${results.filter(r => !r.success).length}`);
  console.log(`Total chapters ${apply ? 'deleted' : 'would delete'}: ${results.reduce((s, r) => s + r.chaptersDeleted, 0)}`);
  for (const r of results.filter(r => !r.success)) {
    console.log(`  ✗ ${r.novelTitle}: ${r.error}`);
  }
  if (!apply) {
    console.log(`\nDRY-RUN mode. Re-run with --apply to commit changes.`);
    console.log(`Archive will be saved to ai_story_projects.style_directives.archived_setups[] (last 3 kept).`);
    console.log(`Rollback: npx tsx scripts/rollback-reset.ts <novel_id> [--apply]`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
