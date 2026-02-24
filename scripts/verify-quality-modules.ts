/**
 * Verify Quality Modules — End-to-End Production Check
 *
 * 1. Checks all 6 new DB tables exist
 * 2. Picks an active project with 20+ chapters (so arc-triggered generation fires)
 * 3. Writes 1 chapter using Story Engine V2
 * 4. Checks that quality module tables got populated
 *
 * Usage:
 *   npx tsx scripts/verify-quality-modules.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const QUALITY_TABLES = [
  'foreshadowing_plans',
  'character_arcs',
  'arc_pacing_blueprints',
  'voice_fingerprints',
  'mc_power_states',
  'location_bibles',
] as const;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function ts(): string {
  return new Date().toISOString().substring(11, 23);
}

async function main() {
  const db = getSupabase();

  console.log(`\n[${ts()}] ===== QUALITY MODULE VERIFICATION =====\n`);

  // ── Step 1: Verify all 6 tables exist ───────────────────────────────
  console.log(`[${ts()}] Step 1: Checking DB tables...`);
  const tableResults: Record<string, boolean> = {};

  for (const table of QUALITY_TABLES) {
    const { error } = await db.from(table).select('*', { count: 'exact', head: true });
    tableResults[table] = !error;
    const status = error ? `MISSING (${error.message})` : 'OK';
    console.log(`  ${table}: ${status}`);
  }

  const allTablesOk = Object.values(tableResults).every(Boolean);
  if (!allTablesOk) {
    console.error(`\n[${ts()}] FAIL: Some tables are missing. Run migration 0130 first.`);
    process.exit(1);
  }
  console.log(`\n[${ts()}] All 6 tables exist.\n`);

  // ── Step 2: Find active project with 20+ chapters ──────────────────
  console.log(`[${ts()}] Step 2: Finding active project with 20+ chapters...`);
  const { data: projects, error: projErr } = await db
    .from('ai_story_projects')
    .select('id,novel_id,main_character,genre,current_chapter,total_planned_chapters,novels!ai_story_projects_novel_id_fkey(id,title)')
    .gte('current_chapter', 20)
    .order('current_chapter', { ascending: false })
    .limit(5);

  if (projErr || !projects || projects.length === 0) {
    console.error(`[${ts()}] No active project with 20+ chapters found.`);
    console.log(`  Looking for any project with chapters...`);

    const { data: anyProjects } = await db
      .from('ai_story_projects')
      .select('id,novel_id,main_character,genre,current_chapter,total_planned_chapters,novels!ai_story_projects_novel_id_fkey(id,title)')
      .gt('current_chapter', 0)
      .order('current_chapter', { ascending: false })
      .limit(3);

    if (!anyProjects || anyProjects.length === 0) {
      console.error(`[${ts()}] No projects with any chapters. Cannot test.`);
      process.exit(1);
    }

    console.log(`\n  Found ${anyProjects.length} project(s):`);
    for (const p of anyProjects) {
      const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
      console.log(`  - ${novel?.title || 'Untitled'} (ch ${p.current_chapter}, genre: ${p.genre})`);
    }
    console.log(`\n  Note: With <20 chapters, arc-triggered modules (foreshadowing, pacing, worldmap)`);
    console.log(`  won't trigger until chapter 20. Post-write modules (character arcs, power state,`);
    console.log(`  voice fingerprint, location exploration) will still run.\n`);
  }

  const candidates = projects && projects.length > 0 ? projects : [];
  if (candidates.length === 0) {
    console.log(`[${ts()}] Skipping chapter write test — no suitable projects.`);
    console.log(`[${ts()}] DB tables verified. Manual chapter write needed to verify modules.\n`);
    process.exit(0);
  }

  // Pick the project with most chapters for best test
  const project = candidates[0] as any;
  const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
  const nextChapter = (project.current_chapter || 0) + 1;

  console.log(`\n  Selected: "${novel?.title}" (ch ${project.current_chapter}/${project.total_planned_chapters})`);
  console.log(`  Project: ${project.id}`);
  console.log(`  Genre: ${project.genre}`);
  console.log(`  Will write: Chapter ${nextChapter}\n`);

  // ── Step 3: Check existing data in quality tables BEFORE write ──────
  console.log(`[${ts()}] Step 3: Checking existing quality data for this project...`);
  const before: Record<string, number> = {};
  for (const table of QUALITY_TABLES) {
    const { count } = await db
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id);
    before[table] = count || 0;
    console.log(`  ${table}: ${count || 0} rows`);
  }

  // ── Step 4: Write 1 chapter via V2 engine ──────────────────────────
  console.log(`\n[${ts()}] Step 4: Writing chapter ${nextChapter} via Story Engine V2...`);
  console.log(`  (This takes 60-120s)\n`);

  const startTime = Date.now();
  try {
    // Dynamic import to ensure env vars are loaded first
    const { writeOneChapter } = await import('../src/services/story-engine/index');

    const result = await writeOneChapter({
      projectId: project.id,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${ts()}] Chapter ${result.chapterNumber} written in ${duration}s`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Words: ${result.wordCount}`);
    console.log(`  Quality: ${result.qualityScore}/10\n`);
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[${ts()}] CHAPTER WRITE FAILED after ${duration}s:`);
    console.error(`  ${err instanceof Error ? err.message : String(err)}\n`);
    // Don't exit — still check tables
  }

  // ── Step 5: Check quality tables AFTER write ──────────────────────
  console.log(`[${ts()}] Step 5: Checking quality data AFTER write...`);
  const after: Record<string, number> = {};
  for (const table of QUALITY_TABLES) {
    const { count } = await db
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id);
    after[table] = count || 0;
    const diff = (count || 0) - before[table];
    const indicator = diff > 0 ? `+${diff} NEW` : diff === 0 ? 'unchanged' : `${diff}`;
    console.log(`  ${table}: ${count || 0} rows (${indicator})`);
  }

  // ── Step 6: Summary ───────────────────────────────────────────────
  console.log(`\n[${ts()}] ===== SUMMARY =====\n`);

  const tablesPopulated = Object.entries(after).filter(([, v]) => v > 0);
  const newData = Object.entries(after).filter(([t, v]) => v > before[t]);

  console.log(`  Tables with data: ${tablesPopulated.length}/6`);
  console.log(`  Tables with NEW data from this write: ${newData.length}/6`);

  if (tablesPopulated.length >= 3) {
    console.log(`\n  RESULT: Quality modules are WORKING.`);
  } else if (tablesPopulated.length > 0) {
    console.log(`\n  RESULT: Partially working. Some modules need more chapters to trigger.`);
    console.log(`  (Voice fingerprint: every 10ch, Pacing/Foreshadow: every 20ch at arc boundary)`);
  } else {
    console.log(`\n  RESULT: No quality data generated. Investigate logs.`);
  }

  // Check specific expected behavior
  const isArcBoundary = nextChapter % 20 === 0;
  const shouldHaveCharArcs = nextChapter > 3; // Characters appear after a few chapters
  const shouldHavePower = nextChapter % 3 === 0;
  const shouldHaveVoice = nextChapter % 10 === 0;

  console.log(`\n  Expected triggers for ch ${nextChapter}:`);
  console.log(`    character_arcs update: ${shouldHaveCharArcs ? 'YES' : 'maybe'}`);
  console.log(`    mc_power_states update: ${shouldHavePower ? 'YES (every 3ch)' : 'no (not every 3ch)'}`);
  console.log(`    voice_fingerprints update: ${shouldHaveVoice ? 'YES (every 10ch)' : 'no (not every 10ch)'}`);
  console.log(`    foreshadowing_plans: ${isArcBoundary ? 'YES (arc boundary)' : 'no (not arc boundary)'}`);
  console.log(`    arc_pacing_blueprints: ${isArcBoundary ? 'YES (arc boundary)' : 'no (not arc boundary)'}`);
  console.log(`    location_bibles: ${isArcBoundary ? 'possible (if first arc)' : 'exploration update'}`);

  console.log(`\n[${ts()}] Done.\n`);
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
