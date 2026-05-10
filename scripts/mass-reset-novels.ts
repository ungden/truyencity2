// Mass reset novels — clear chapters + state for projects <200ch, drop ≥200ch
// keep title + genre + cover only on reset targets.
//
// Usage:
//   npx tsx scripts/mass-reset-novels.ts --dry-run [--mode=both|drop|reset] [--limit=N]
//   npx tsx scripts/mass-reset-novels.ts --apply [--mode=both|drop|reset] [--limit=N]
//
// EXEMPT projects (never touched):
//   - 2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c (Vạn Linh Phổ — 1000 blueprint built)
//   - 533d8455-9c28-4b48-994f-ab7090329db4 (sang-the-than-minh — focus production)
//   - cf63c678-a0b5-4df2-ae1c-6cb20210f589 (thien-dao-thu-vien — has setup)

import * as dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const EXEMPT_IDS = new Set([
  '2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c',
  '533d8455-9c28-4b48-994f-ab7090329db4',
  'cf63c678-a0b5-4df2-ae1c-6cb20210f589',
]);

// 58 tables with project_id FK to ai_story_projects (extracted from migrations)
const PROJECT_FK_TABLES = [
  'arc_pacing_blueprints', 'arc_plans', 'battle_records', 'beat_usage',
  'chapter_blueprints', 'chapter_summaries', 'character_arcs', 'character_bibles',
  'character_depth_profiles', 'character_knowledge', 'character_relationships',
  'character_states', 'character_tracker', 'character_voices', 'claude_code_tasks',
  'consistency_issues', 'cost_tracking', 'economic_ledger', 'editor_reviews',
  'embedding_cache', 'enemy_scaling', 'factions', 'failed_memory_tasks',
  'foreshadowing_plans', 'hierarchical_summaries', 'item_events', 'location_bibles',
  'location_timeline', 'mc_power_states', 'milestone_validations', 'planned_twists',
  'plot_arcs', 'plot_threads', 'plot_twists', 'power_progression', 'production_queue',
  'project_daily_quotas', 'qc_results', 'quality_metrics', 'quality_trends',
  'rewrite_chain_jobs', 'romance_progressions', 'story_blueprint_runs',
  'story_embeddings', 'story_memory_chunks', 'story_outlines', 'story_synopsis',
  'story_themes', 'story_timeline', 'story_writing_outlines', 'story_writing_sessions',
  'voice_anchors', 'voice_fingerprints', 'volume_summaries', 'world_constraints',
  'world_rules_index', 'world_state', 'writing_style_analytics',
];

interface ProjectRow {
  id: string;
  novel_id: string;
  current_chapter: number | null;
  status: string;
  pause_reason: string | null;
  genre: string | null;
}

interface NovelRow {
  id: string;
  title: string;
  slug: string;
}

function arg(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function loadProjects(db: SupabaseClient): Promise<ProjectRow[]> {
  const all: ProjectRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from('ai_story_projects')
      .select('id, novel_id, current_chapter, status, pause_reason, genre')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`load projects: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as ProjectRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function loadNovelTitles(db: SupabaseClient, novelIds: string[]): Promise<Map<string, NovelRow>> {
  const map = new Map<string, NovelRow>();
  const chunkSize = 100;
  for (let i = 0; i < novelIds.length; i += chunkSize) {
    const chunk = novelIds.slice(i, i + chunkSize);
    try {
      const { data, error } = await db
        .from('novels')
        .select('id, title, slug')
        .in('id', chunk);
      if (error) {
        console.warn(`novels chunk ${i}: ${error.message}`);
        continue;
      }
      for (const r of (data as NovelRow[] | null) || []) map.set(r.id, r);
    } catch (e) {
      console.warn(`novels chunk ${i} fetch error:`, (e as Error).message);
    }
  }
  return map;
}

async function deleteByProjectIds(
  db: SupabaseClient,
  table: string,
  projectIds: string[],
  log: string[],
): Promise<number> {
  if (projectIds.length === 0) return 0;
  // Batch in chunks of 200 to avoid URL length limits
  let total = 0;
  const chunkSize = 200;
  for (let i = 0; i < projectIds.length; i += chunkSize) {
    const chunk = projectIds.slice(i, i + chunkSize);
    const { error, count } = await db
      .from(table)
      .delete({ count: 'estimated' })
      .in('project_id', chunk);
    if (error) {
      // Some tables may not exist on the production DB (migrations not all
      // applied). Log + continue.
      log.push(`  [skip] DELETE ${table}: ${error.message}`);
      continue;
    }
    total += count ?? 0;
  }
  return total;
}

async function deleteChaptersByNovelIds(
  db: SupabaseClient,
  novelIds: string[],
  log: string[],
): Promise<number> {
  if (novelIds.length === 0) return 0;
  let total = 0;
  // Smaller chunks for chapters (high row count / novel) to avoid statement timeout
  const chunkSize = 25;
  for (let i = 0; i < novelIds.length; i += chunkSize) {
    const chunk = novelIds.slice(i, i + chunkSize);
    let attempt = 0;
    while (attempt < 3) {
      const { error, count } = await db
        .from('chapters')
        .delete({ count: 'estimated' })
        .in('novel_id', chunk);
      if (error) {
        attempt++;
        if (attempt >= 3) {
          log.push(`  [skip] DELETE chapters chunk ${i}: ${error.message}`);
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      total += count ?? 0;
      break;
    }
  }
  return total;
}

async function applyResetUpdates(
  db: SupabaseClient,
  resetIds: string[],
  resetNovelIds: string[],
  log: string[],
): Promise<void> {
  // Reset project columns. main_character is NOT NULL → use empty string.
  const projectPatch = {
    current_chapter: 0,
    status: 'paused',
    pause_reason: 'reset_for_re_blueprint_2026-05-10',
    paused_at: new Date().toISOString(),
    world_description: null,
    main_character: '',
    story_outline: null,
    master_outline: null,
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    setup_stage_error: null,
    style_directives: { reset_at: new Date().toISOString(), reset_phase: 're_blueprint_2026-05-10' },
    ai_model: 'deepseek-v4-flash',
    updated_at: new Date().toISOString(),
  };
  const chunkSize = 200;
  for (let i = 0; i < resetIds.length; i += chunkSize) {
    const chunk = resetIds.slice(i, i + chunkSize);
    const { error } = await db.from('ai_story_projects').update(projectPatch).in('id', chunk);
    if (error) log.push(`  [error] UPDATE projects chunk ${i}: ${error.message}`);
  }

  // Reset novel columns. total_chapters is NOT NULL → use 0.
  const novelPatch = {
    description: '',
    chapter_count: 0,
    total_chapters: 0,
    status: 'Đang ra',
    updated_at: new Date().toISOString(),
  };
  for (let i = 0; i < resetNovelIds.length; i += chunkSize) {
    const chunk = resetNovelIds.slice(i, i + chunkSize);
    const { error } = await db.from('novels').update(novelPatch).in('id', chunk);
    if (error) log.push(`  [error] UPDATE novels chunk ${i}: ${error.message}`);
  }
}

async function applyDropUpdates(
  db: SupabaseClient,
  dropIds: string[],
  log: string[],
): Promise<void> {
  const patch = {
    status: 'paused',
    pause_reason: 'dropped_2026-05-10_re_blueprint_phase',
    paused_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const chunkSize = 200;
  for (let i = 0; i < dropIds.length; i += chunkSize) {
    const chunk = dropIds.slice(i, i + chunkSize);
    // Only update if pause_reason is null OR doesn't already start with 'dropped_'
    // We do single update for simplicity; existing pause_reason will be overwritten.
    const { error } = await db.from('ai_story_projects').update(patch).in('id', chunk);
    if (error) log.push(`  [error] UPDATE drop chunk ${i}: ${error.message}`);
  }
}

async function main() {
  const apply = hasFlag('apply');
  const mode = (arg('mode') || 'both') as 'both' | 'drop' | 'reset';
  const limit = arg('limit') ? Number(arg('limit')) : 0;
  // Re-run specific phase only — useful when full run had partial errors.
  // 'all' (default): children delete + chapters delete + project/novel updates
  // 'updates': skip children + chapters delete; just apply UPDATE
  // 'chapters': just delete chapters (no children, no updates)
  const phase = (arg('phase') || 'all') as 'all' | 'updates' | 'chapters';

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const log: string[] = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = `/tmp/mass-reset-${ts}.log`;

  log.push(`=== Mass Reset Novels — ${apply ? 'APPLY' : 'DRY-RUN'} ===`);
  log.push(`Mode: ${mode}, Limit: ${limit || 'all'}`);
  log.push(`Started: ${new Date().toISOString()}\n`);

  console.log(log[0]);
  console.log(log[1]);

  // 1. Load all projects
  console.log('Loading projects...');
  const allProjects = await loadProjects(db);
  log.push(`Loaded ${allProjects.length} projects.`);

  // 2. Categorize
  const dropList: ProjectRow[] = [];
  const resetList: ProjectRow[] = [];
  let exemptCount = 0;
  for (const p of allProjects) {
    if (EXEMPT_IDS.has(p.id)) { exemptCount++; continue; }
    const ch = p.current_chapter ?? 0;
    if (ch >= 200) dropList.push(p);
    else resetList.push(p);
  }
  log.push(`Categorized: ${dropList.length} to drop (≥200ch), ${resetList.length} to reset (<200ch), ${exemptCount} exempt.`);
  console.log(log[log.length - 1]);

  // Apply limit if set
  const droppedTargets = mode === 'reset' ? [] : (limit ? dropList.slice(0, limit) : dropList);
  const resetTargets = mode === 'drop' ? [] : (limit ? resetList.slice(0, limit) : resetList);
  log.push(`After filters: drop=${droppedTargets.length}, reset=${resetTargets.length}\n`);
  console.log(log[log.length - 1]);

  // Get novel titles for sample preview
  const allNovelIds = [...new Set([...droppedTargets, ...resetTargets].map((p) => p.novel_id))];
  const novelMap = await loadNovelTitles(db, allNovelIds);

  // Print sample
  log.push('--- Sample (first 5 of each) ---');
  for (const p of droppedTargets.slice(0, 5)) {
    const n = novelMap.get(p.novel_id);
    log.push(`  DROP ch.${p.current_chapter} ${n?.title || '(no title)'} — ${p.id.slice(0, 8)}`);
  }
  for (const p of resetTargets.slice(0, 5)) {
    const n = novelMap.get(p.novel_id);
    log.push(`  RESET ch.${p.current_chapter} ${n?.title || '(no title)'} — ${p.id.slice(0, 8)}`);
  }
  console.log(log.slice(-11).join('\n'));

  // 3. Execute (or dry-run report)
  if (apply) {
    log.push('\n=== APPLYING CHANGES ===');
    console.log(log[log.length - 1]);

    if (droppedTargets.length > 0) {
      log.push(`[drop] Updating ${droppedTargets.length} projects to status=paused, pause_reason=dropped_2026-05-10_re_blueprint_phase...`);
      console.log(log[log.length - 1]);
      await applyDropUpdates(db, droppedTargets.map((p) => p.id), log);
    }

    if (resetTargets.length > 0) {
      const resetIds = resetTargets.map((p) => p.id);
      const resetNovelIds = resetTargets.map((p) => p.novel_id);

      if (phase === 'all') {
        log.push(`\n[reset] Deleting child rows from 58 tables for ${resetIds.length} projects...`);
        console.log(log[log.length - 1]);

        let totalDeleted = 0;
        for (const table of PROJECT_FK_TABLES) {
          const n = await deleteByProjectIds(db, table, resetIds, log);
          if (n > 0) {
            log.push(`  ${table}: ~${n} rows deleted`);
          }
          totalDeleted += n;
        }
        log.push(`[reset] ~${totalDeleted} child rows deleted across ${PROJECT_FK_TABLES.length} tables.`);
        console.log(log[log.length - 1]);
      }

      if (phase === 'all' || phase === 'chapters') {
        log.push(`[reset] Deleting chapters by novel_id for ${resetNovelIds.length} novels...`);
        console.log(log[log.length - 1]);
        const chaptersDeleted = await deleteChaptersByNovelIds(db, resetNovelIds, log);
        log.push(`  chapters: ~${chaptersDeleted} rows deleted`);
        console.log(log[log.length - 1]);
      }

      if (phase === 'all' || phase === 'updates') {
        log.push(`\n[reset] Resetting project + novel column values...`);
        console.log(log[log.length - 1]);
        await applyResetUpdates(db, resetIds, resetNovelIds, log);
        log.push(`[reset] Project + novel columns reset.`);
        console.log(log[log.length - 1]);
      }
    }

    log.push('\n=== DONE ===');
  } else {
    log.push('\n=== DRY RUN — no changes applied ===');
    log.push(`To apply: npx tsx scripts/mass-reset-novels.ts --apply --mode=${mode}${limit ? ` --limit=${limit}` : ''}`);
    console.log(log.slice(-2).join('\n'));
  }

  log.push(`Finished: ${new Date().toISOString()}`);
  writeFileSync(logPath, log.join('\n'), 'utf-8');
  console.log(`\nLog: ${logPath}`);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
