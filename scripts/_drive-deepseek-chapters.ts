/**
 * Drive DeepSeek chapter writing on 8d8bce18 (Toàn Cầu Chuyển Chức).
 * Setup already complete via Gemini Pro thinking; this run only writes chapters
 * via deepseek-v4-flash so we can compare prose quality vs Mạt Thế's
 * Gemini Flash Lite chapters (c97b1d28).
 *
 * Run: npx tsx scripts/_drive-deepseek-chapters.ts [--chapters=5]
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

// Force DeepSeek for ALL tasks. Disable production Pro tier installer.
process.env.DISABLE_PRO_TIER = '1';

const PROJECT_ID = '8d8bce18-641b-42aa-9cc2-79651133b51f';

const DEEPSEEK_FLASH = 'deepseek-v4-flash';

const ALL_TASKS = [
  'architect', 'writer', 'writer_continuation', 'critic',
  'continuity_guardian', 'auto_revision',
  'synopsis', 'chapter_summary', 'combined_summary',
  'character_bible_refresh', 'volume_summary', 'character_arc', 'voice_fingerprint',
  'mc_power', 'foreshadowing_agenda', 'plot_tracker', 'character_knowledge',
  'relationships', 'economic', 'world_expansion', 'pacing_blueprint',
];

function installDeepSeekRouting(): void {
  const routing: Record<string, string> = {};
  for (const t of ALL_TASKS) routing[t] = DEEPSEEK_FLASH;
  routing['_default'] = DEEPSEEK_FLASH;
  globalThis.__MODEL_ROUTING__ = routing;
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const chaptersArg = process.argv.find((a) => a.startsWith('--chapters='));
  const chapterCount = chaptersArg ? parseInt(chaptersArg.split('=')[1], 10) : 5;

  console.log(`━━━ DRIVE: 8d8bce18 Toàn Cầu Chuyển Chức (DeepSeek chapters) ━━━`);
  console.log(`projectId : ${PROJECT_ID}`);
  console.log(`writer    : ${DEEPSEEK_FLASH}`);
  console.log(`chapters  : ${chapterCount}\n`);

  // Make sure project is in writable state; disable blueprint strict gating.
  const { data: existing } = await db.from('ai_story_projects').select('style_directives').eq('id', PROJECT_ID).single();
  await db.from('ai_story_projects').update({
    status: 'active',
    pause_reason: null,
    setup_stage: 'ready_to_write',
    setup_stage_attempts: 0,
    setup_stage_error: null,
    style_directives: { ...(existing?.style_directives || {}), require_full_chapter_blueprint: false, chapter_blueprint_version: null, disable_chapter_split: true },
    ai_model: DEEPSEEK_FLASH,
  }).eq('id', PROJECT_ID);
  console.log(`[seed] activated, blueprint strict OFF, ai_model=${DEEPSEEK_FLASH}`);

  installDeepSeekRouting();
  const { writeOneChapter } = await import('@/services/story-engine/pipeline/orchestrator');

  for (let i = 0; i < chapterCount; i++) {
    installDeepSeekRouting(); // re-pin
    console.log(`\n━━━━ Chapter ${i + 1}/${chapterCount} ━━━━`);
    const t0 = Date.now();
    try {
      const result = await writeOneChapter({ projectId: PROJECT_ID });
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      const ok = (result.chaptersCreated ?? 0) > 0;
      console.log(`[chapter] ok=${ok} ch=${result.lastChapterNumber} words=${result.wordCount} title="${result.title?.slice(0, 70)}" (${dt}s)`);
      if (!ok) {
        console.log(`[chapter] FAIL: ${result.error ?? '(no error field)'}`);
        break;
      }
    } catch (e) {
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[chapter] EXCEPTION after ${dt}s:`, e instanceof Error ? e.message : e);
      break;
    }
  }

  const { data: proj } = await db.from('ai_story_projects').select('novel_id').eq('id', PROJECT_ID).single();
  if (proj?.novel_id) {
    const { count } = await db.from('chapters').select('*', { count: 'exact', head: true }).eq('novel_id', proj.novel_id);
    console.log(`\nchapters in DB: ${count ?? 0}`);
  }
}

main().catch((e) => { console.error('[deepseek-drive] FATAL', e); process.exit(1); });
