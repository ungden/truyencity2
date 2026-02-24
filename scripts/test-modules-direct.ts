/**
 * Direct test of foreshadowing + world map modules
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { generateForeshadowingAgenda } from '../src/services/story-engine/memory/foreshadowing-planner';
import { initializeWorldMap } from '../src/services/story-engine/memory/world-expansion-tracker';
import { generateCharacterArc } from '../src/services/story-engine/memory/character-arc-engine';
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const PID = '12f9b422-7b15-42c4-9f20-5388f5ba7139';
const CONFIG = { model: 'gemini-3-flash-preview', temperature: 0.5, maxTokens: 4096 };

async function main() {
  console.log('Loading project data...');
  const [{ data: proj }, { data: syn }] = await Promise.all([
    db.from('ai_story_projects').select('master_outline,total_planned_chapters,main_character').eq('id', PID).single(),
    db.from('story_synopsis').select('synopsis_text,open_threads').eq('project_id', PID).order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const total = proj!.total_planned_chapters || 1688;
  const mc = proj!.main_character || 'MC';
  // Stringify master_outline if it's JSONB (object from DB)
  const rawMO = proj?.master_outline;
  const masterOutline: string | undefined = rawMO
    ? (typeof rawMO === 'string' ? rawMO : JSON.stringify(rawMO))
    : undefined;
  console.log(`Project: ${PID}, MC: ${mc}, total: ${total}`);
  console.log(`Master outline: ${masterOutline ? masterOutline.length + ' chars' : 'NULL'}`);
  console.log(`Synopsis: ${syn?.synopsis_text ? syn.synopsis_text.length + ' chars' : 'NULL'}`);
  console.log(`Open threads: ${syn?.open_threads?.length || 0}`);

  // ── Test 1: Foreshadowing ──────────────────────────────────────────
  console.log('\n=== TEST 1: Foreshadowing Agenda (arc 10) ===');
  try {
    await generateForeshadowingAgenda(
      PID, 10, 181, 200, total,
      syn?.synopsis_text, masterOutline,
      syn?.open_threads || [], 'khoa-huyen' as any, CONFIG,
    );
    console.log('SUCCESS');
  } catch (err: any) {
    console.error('FAILED:', err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
  }

  const { data: hints, count: hintCount } = await db.from('foreshadowing_plans')
    .select('hint_id,hint_text,hint_type,plant_chapter,payoff_chapter', { count: 'exact' })
    .eq('project_id', PID);
  console.log(`Result: ${hintCount} hints`);
  for (const h of hints || []) {
    console.log(`  ${h.hint_id}: [${h.hint_type}] plant@ch${h.plant_chapter} -> payoff@ch${h.payoff_chapter}`);
    console.log(`    ${h.hint_text?.slice(0, 100)}`);
  }

  // ── Test 2: World Map ──────────────────────────────────────────────
  console.log('\n=== TEST 2: World Map ===');
  try {
    await initializeWorldMap(PID, masterOutline, 'khoa-huyen' as any, total, CONFIG);
    console.log('SUCCESS');
  } catch (err: any) {
    console.error('FAILED:', err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
  }

  const { data: locs, count: locCount } = await db.from('location_bibles')
    .select('location_name,arc_range,explored', { count: 'exact' })
    .eq('project_id', PID);
  console.log(`Result: ${locCount} locations`);
  for (const l of locs || []) {
    console.log(`  ${l.location_name}: arcs ${JSON.stringify(l.arc_range)} ${l.explored ? '(explored)' : ''}`);
  }

  // ── Test 3: Character Arc ──────────────────────────────────────────
  console.log('\n=== TEST 3: Character Arc ===');
  try {
    await generateCharacterArc(
      PID, mc, 'khoa-huyen' as any, mc, 161, total,
      syn?.synopsis_text, undefined, CONFIG,
    );
    console.log('SUCCESS');
  } catch (err: any) {
    console.error('FAILED:', err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
  }

  const { data: arcs, count: arcCount } = await db.from('character_arcs')
    .select('character_name,role,current_phase,appearance_count', { count: 'exact' })
    .eq('project_id', PID);
  console.log(`Result: ${arcCount} character arcs`);
  for (const a of arcs || []) {
    console.log(`  ${a.character_name} (${a.role}): phase="${a.current_phase}", appearances=${a.appearance_count}`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
