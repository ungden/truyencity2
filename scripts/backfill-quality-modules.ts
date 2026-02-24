/**
 * Backfill Quality Modules — One-time script
 *
 * Generates missing foreshadowing, pacing blueprints, and world maps
 * for the CURRENT arc of each active project.
 *
 * Only generates data that doesn't already exist (each module has internal guards).
 * Runs in batches to avoid overwhelming the Gemini API.
 *
 * Usage: npx tsx scripts/backfill-quality-modules.ts [--limit=10] [--dry-run]
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Import story engine modules
import { generateForeshadowingAgenda } from '../src/services/story-engine/memory/foreshadowing-planner';
import { generatePacingBlueprint } from '../src/services/story-engine/memory/pacing-director';
import { initializeWorldMap } from '../src/services/story-engine/memory/world-expansion-tracker';
import type { GeminiConfig, GenreType } from '../src/services/story-engine/types';

const ARC_SIZE = 20;
const BATCH_SIZE = 5; // Process 5 projects at a time
const DELAY_MS = 2000; // 2 second delay between batches

const config: GeminiConfig = {
  model: 'gemini-3-flash-preview',
  temperature: 0.5,
  maxTokens: 4096,
};

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;
  const dryRun = args.includes('--dry-run');

  console.log(`Backfill Quality Modules — ${new Date().toISOString()}`);
  console.log(`Limit: ${limit} projects | Dry run: ${dryRun}`);
  console.log('='.repeat(80));

  // 1. Get all active projects with current chapter
  const { data: projects, error: projErr } = await supabase
    .from('ai_story_projects')
    .select('id, current_chapter, genre, total_planned_chapters, master_outline')
    .eq('status', 'active')
    .gt('current_chapter', 20) // Only projects past arc 1
    .order('current_chapter', { ascending: false })
    .limit(limit);

  if (projErr || !projects?.length) {
    console.log('No active projects found:', projErr?.message);
    return;
  }

  console.log(`Found ${projects.length} active projects past arc 1\n`);

  // 2. Check which projects are missing quality modules for their current arc
  const tasks: Array<{
    projectId: string;
    currentArc: number;
    genre: GenreType;
    totalPlanned: number;
    missing: string[];
  }> = [];

  for (const p of projects) {
    const currentArc = Math.ceil((p.current_chapter || 1) / ARC_SIZE);

    // Check foreshadowing
    const { count: fhCount } = await supabase
      .from('foreshadowing_plans')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', p.id)
      .eq('arc_number', currentArc);

    // Check pacing
    const { count: pbCount } = await supabase
      .from('arc_pacing_blueprints')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', p.id)
      .eq('arc_number', currentArc);

    // Check world map
    const { count: lbCount } = await supabase
      .from('location_bibles')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', p.id);

    const missing: string[] = [];
    if ((fhCount ?? 0) === 0) missing.push('foreshadowing');
    if ((pbCount ?? 0) === 0) missing.push('pacing');
    if ((lbCount ?? 0) === 0) missing.push('worldmap');

    if (missing.length > 0) {
      tasks.push({
        projectId: p.id,
        currentArc,
        genre: (p.genre || 'tien-hiep') as GenreType,
        totalPlanned: p.total_planned_chapters || 1000,
        missing,
      });
    }
  }

  console.log(`Projects needing backfill: ${tasks.length}/${projects.length}`);
  console.log(`Total modules to generate: ${tasks.reduce((sum, t) => sum + t.missing.length, 0)}\n`);

  if (dryRun) {
    for (const t of tasks) {
      console.log(`  [DRY] ${t.projectId.slice(0, 8)} arc ${t.currentArc}: ${t.missing.join(', ')}`);
    }
    return;
  }

  // 3. Process in batches
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tasks.length / BATCH_SIZE)} ---`);

    await Promise.all(batch.map(async (task) => {
      const arcStart = (task.currentArc - 1) * ARC_SIZE + 1;
      const arcEnd = task.currentArc * ARC_SIZE;

      // Load context
      const [{ data: synRow }, { data: arcPlanRow }, { data: synopsisRow }] = await Promise.all([
        supabase.from('story_synopsis').select('synopsis_text').eq('project_id', task.projectId)
          .order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('arc_plans').select('plan_text').eq('project_id', task.projectId)
          .eq('arc_number', task.currentArc).maybeSingle(),
        supabase.from('story_synopsis').select('open_threads').eq('project_id', task.projectId)
          .order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
      ]);

      // Load master outline
      const { data: projRow } = await supabase
        .from('ai_story_projects')
        .select('master_outline')
        .eq('id', task.projectId)
        .maybeSingle();
      const rawMO = projRow?.master_outline;
      const masterOutlineStr = rawMO
        ? (typeof rawMO === 'string' ? rawMO : JSON.stringify(rawMO))
        : undefined;

      const openThreads: string[] = synopsisRow?.open_threads || [];
      const modulePromises: Promise<void>[] = [];

      if (task.missing.includes('foreshadowing')) {
        modulePromises.push(
          generateForeshadowingAgenda(
            task.projectId, task.currentArc, arcStart, arcEnd, task.totalPlanned,
            synRow?.synopsis_text, masterOutlineStr, openThreads, task.genre, config,
          ).then(() => console.log(`  ✓ ${task.projectId.slice(0, 8)} foreshadowing arc ${task.currentArc}`))
            .catch((e) => {
              errors++;
              console.error(`  ✗ ${task.projectId.slice(0, 8)} foreshadowing: ${e instanceof Error ? e.message : String(e)}`);
            }),
        );
      }

      if (task.missing.includes('pacing')) {
        modulePromises.push(
          generatePacingBlueprint(
            task.projectId, task.currentArc, arcStart, arcEnd, task.genre,
            arcPlanRow?.plan_text, config,
          ).then(() => console.log(`  ✓ ${task.projectId.slice(0, 8)} pacing arc ${task.currentArc}`))
            .catch((e) => {
              errors++;
              console.error(`  ✗ ${task.projectId.slice(0, 8)} pacing: ${e instanceof Error ? e.message : String(e)}`);
            }),
        );
      }

      if (task.missing.includes('worldmap')) {
        modulePromises.push(
          initializeWorldMap(
            task.projectId, masterOutlineStr, task.genre, task.totalPlanned, config,
          ).then(() => console.log(`  ✓ ${task.projectId.slice(0, 8)} worldmap`))
            .catch((e) => {
              errors++;
              console.error(`  ✗ ${task.projectId.slice(0, 8)} worldmap: ${e instanceof Error ? e.message : String(e)}`);
            }),
        );
      }

      await Promise.all(modulePromises);
      processed++;
    }));

    // Delay between batches
    if (i + BATCH_SIZE < tasks.length) {
      console.log(`  Waiting ${DELAY_MS}ms...`);
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Done. Processed: ${processed}, Errors: ${errors}`);

  // 4. Verify results
  const tables = ['foreshadowing_plans', 'arc_pacing_blueprints', 'location_bibles'];
  console.log('\nPost-backfill counts:');
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count}`);
  }
}

main().catch(console.error);
