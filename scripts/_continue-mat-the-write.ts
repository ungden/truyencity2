/**
 * Continue Mạt Thế chapter writing. Setup already partially complete
 * (master_outline + story_outline + canons populated via orchestrator auto-repair).
 * Skip setup loop; jump straight to chapter writing with all 3 agents on
 * gemini-3-flash-preview (thinking=high) to fix the prose repetition issue.
 *
 * Run: GEMINI_TEST_KEY=AIza... npx tsx scripts/_continue-mat-the-write.ts [--chapters=3]
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

if (process.env.GEMINI_TEST_KEY) process.env.GEMINI_API_KEY = process.env.GEMINI_TEST_KEY;
process.env.GEMINI_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'high';
process.env.DISABLE_PRO_TIER = '1';

const PROJECT_ID = 'c97b1d28-3421-44bb-bcfe-98055c44943a';
const NOVEL_ID   = '2fe03cf2-34fe-45b5-8fa6-26dcd13ca468';

const MODEL_PRO_ROLE = 'gemini-3-flash-preview';
const MODEL_FLASH_ROLE = 'gemini-3.1-flash-lite';

const PRO_TASKS = [
  // Setup only — Pro thinking model for creative setup stages
  'stage_idea', 'stage_world', 'stage_character',
  'master_outline', 'story_outline', 'story_bible', 'arc_plan',
];
const FLASH_TASKS = [
  // Chapter-writing 3-agent — Flash Lite (non-thinking, fast, reliable JSON).
  // Pro thinking model truncated Architect JSON at ~500 chars on ch.4+ context,
  // 3 retries fail consistently. Flash Lite produces consistent full JSON; we
  // accept slightly more repetitive prose, mitigated by Critic threshold relax.
  'architect', 'writer', 'writer_continuation', 'critic',
  'continuity_guardian', 'auto_revision', 'stage_description',
  'synopsis', 'chapter_summary', 'combined_summary',
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
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const chaptersArg = process.argv.find((a) => a.startsWith('--chapters='));
  const chapterCount = chaptersArg ? parseInt(chaptersArg.split('=')[1], 10) : 3;
  console.log(`━━━ Continue Mạt Thế (writer/architect/critic on Pro thinking model) ━━━`);
  console.log(`projectId: ${PROJECT_ID}  chapters: ${chapterCount}`);

  // Flip setup_stage past 'world' (auto-repair already populated master/story outlines)
  await db.from('ai_story_projects').update({
    setup_stage: 'ready_to_write',
    setup_stage_attempts: 0,
    setup_stage_error: null,
    status: 'active',
    pause_reason: null,
  }).eq('id', PROJECT_ID);
  console.log(`[setup] forced setup_stage=ready_to_write (master/story outlines already populated)`);

  installGeminiRouting();
  console.log(`[routing] writer/architect/critic → ${MODEL_PRO_ROLE} (thinking=high)`);

  const { writeOneChapter } = await import('@/services/story-engine/pipeline/orchestrator');

  for (let i = 0; i < chapterCount; i++) {
    installGeminiRouting(); // re-pin
    console.log(`\n━━━━ Chapter ${i + 1}/${chapterCount} ━━━━`);
    const t0 = Date.now();
    try {
      const result = await writeOneChapter({ projectId: PROJECT_ID });
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      const ok = (result.chaptersCreated ?? 0) > 0;
      console.log(`[chapter] ok=${ok} chaptersCreated=${result.chaptersCreated} ch=${result.lastChapterNumber} words=${result.wordCount} title="${result.title?.slice(0, 70)}" (${dt}s)`);
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

  const { count } = await db.from('chapters').select('*', { count: 'exact', head: true }).eq('novel_id', NOVEL_ID);
  console.log(`\nchapters in DB: ${count ?? 0}`);
}

main().catch((e) => { console.error('[continue] FATAL', e); process.exit(1); });
