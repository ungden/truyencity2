/**
 * GEMINI TWIN drive — parallel comparison vs DeepSeek setup pipeline.
 *
 * Test novel: 8d8bce18 "Toàn Cầu Chuyển Chức: Thần Cấp Đồng Bộ"
 *   - vong-du genre, empty MC + world_description, 1000 chapter_blueprints
 *   - SAME structural profile as DeepSeek twin 1ef4aba8 (Toàn Cầu Thủ Hộ)
 *
 * Model routing:
 *   - Creative setup stages (Pro role) → gemini-3-flash-preview (thinking=high)
 *   - Cheap stages / volume tasks      → gemini-3.1-flash-lite
 *
 * API key: GEMINI_API_KEY env (overridden below via process.env if test key set).
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

// Test API key MUST be supplied via env: GEMINI_TEST_KEY (overrides GEMINI_API_KEY for this run).
// Run example:
//   GEMINI_TEST_KEY=AIza... npx tsx scripts/_drive-gemini-setup.ts
if (process.env.GEMINI_TEST_KEY) {
  process.env.GEMINI_API_KEY = process.env.GEMINI_TEST_KEY;
}
process.env.GEMINI_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'high';

const MODEL_PRO_ROLE = 'gemini-3-flash-preview';   // creative setup (thinking enabled)
const MODEL_FLASH_ROLE = 'gemini-3.1-flash-lite';  // volume / cheap stages

const PRO_TASKS = [
  'stage_idea', 'stage_world', 'stage_character',
  'master_outline', 'story_outline', 'story_bible', 'arc_plan',
];
const FLASH_TASKS = [
  'architect', 'critic', 'continuity_guardian', 'writer', 'writer_continuation',
  'auto_revision', 'stage_description', 'synopsis', 'chapter_summary', 'combined_summary',
  'character_bible_refresh', 'volume_summary', 'character_arc', 'voice_fingerprint',
  'mc_power', 'foreshadowing_agenda', 'plot_tracker', 'character_knowledge',
  'relationships', 'economic', 'world_expansion', 'pacing_blueprint',
];

function installGeminiRouting(): void {
  const routing: Record<string, string> = {};
  for (const t of PRO_TASKS) routing[t] = MODEL_PRO_ROLE;
  for (const t of FLASH_TASKS) routing[t] = MODEL_FLASH_ROLE;
  routing['_default'] = MODEL_FLASH_ROLE;
  globalThis.__MODEL_ROUTING__ = routing;
  console.log('[gemini-twin] routing installed', { pro: MODEL_PRO_ROLE, flash: MODEL_FLASH_ROLE });
}

const PROJECT_ID = '8d8bce18-641b-42aa-9cc2-79651133b51f';
const STAGED = new Set(['idea', 'world', 'character', 'description', 'master_outline', 'story_outline', 'arc_plan']);
const MAX_STEPS = 10;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function fetchStageProj() {
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,genre,main_character,world_description,master_outline,story_outline,story_bible,total_planned_chapters,setup_stage,setup_stage_attempts,novels!ai_story_projects_novel_id_fkey(id,title)')
    .eq('id', PROJECT_ID)
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  // Activate the project + reset setup_stage to fresh idea (clean baseline).
  await db.from('ai_story_projects').update({
    status: 'active',
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    setup_stage_error: null,
    pause_reason: null,
    setup_stage_updated_at: new Date().toISOString(),
  }).eq('id', PROJECT_ID);
  console.log(`[gemini-twin] activated ${PROJECT_ID}, fresh setup_stage=idea`);

  installGeminiRouting();
  const { runOneStage } = await import('@/services/story-engine/pipeline/setup-pipeline');

  for (let i = 0; i < MAX_STEPS; i++) {
    const p = await fetchStageProj();
    console.log(`\n[step ${i + 1}/${MAX_STEPS}] setup_stage=${p.setup_stage} attempts=${p.setup_stage_attempts}`);
    if (!STAGED.has(p.setup_stage)) {
      console.log(`[gemini-twin] stopped — setup_stage=${p.setup_stage} no longer staged. Done.`);
      break;
    }
    const t0 = Date.now();
    const advanced = await runOneStage(p as Parameters<typeof runOneStage>[0]);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[step ${i + 1}] runOneStage → advanced=${advanced} (${dt}s)`);

    if (!advanced) {
      const { data: errRow } = await db
        .from('ai_story_projects')
        .select('setup_stage_error, setup_stage_attempts')
        .eq('id', PROJECT_ID)
        .single();
      console.log(`[gemini-twin] error=${errRow?.setup_stage_error} attempts=${errRow?.setup_stage_attempts}`);
      if ((errRow?.setup_stage_attempts ?? 0) >= 3) break; // give up after 3 attempts/stage
    }
  }

  const final = await fetchStageProj();
  console.log(`\n━━━━ FINAL STATE (gemini twin) ━━━━`);
  console.log(`setup_stage=${final.setup_stage} attempts=${final.setup_stage_attempts}`);
  console.log(`main_character: ${final.main_character || '(empty)'}`);
  console.log(`world_description: ${(final.world_description ?? '').length} chars`);
  console.log(`story_outline: ${final.story_outline ? 'populated' : 'empty'}`);
  console.log(`master_outline: ${final.master_outline ? 'populated' : 'empty'}`);
}

main().catch((e) => { console.error('[gemini-twin] FATAL', e); process.exit(1); });
