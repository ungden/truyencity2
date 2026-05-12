/**
 * Drive "Mạt Thế: Ta Có Hầm Trú Ẩn Vạn Năng" end-to-end via Gemini routing.
 *
 * Steps:
 *   1. Seed novel with hand-crafted description + world_description
 *   2. Activate, install Gemini routing (Pro role = gemini-3-flash-preview thinking=high,
 *      Flash role = gemini-3.1-flash-lite)
 *   3. Drive setup pipeline (idea → world → character → description → master_outline →
 *      story_outline → arc_plan → ready_to_write)
 *   4. Drive chapter writing for N chapters via writeOneChapter loop
 *
 * Run:
 *   GEMINI_TEST_KEY=AIza... npx tsx scripts/_drive-mat-the-gemini.ts [--chapters=5]
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

// API key override (must precede any service imports).
if (process.env.GEMINI_TEST_KEY) process.env.GEMINI_API_KEY = process.env.GEMINI_TEST_KEY;
process.env.GEMINI_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'high';
// Disable production Pro tier — our Gemini routing must win, not get overwritten.
process.env.DISABLE_PRO_TIER = '1';

const PROJECT_ID = 'c97b1d28-3421-44bb-bcfe-98055c44943a';
const NOVEL_ID   = '2fe03cf2-34fe-45b5-8fa6-26dcd13ca468';

const MODEL_PRO_ROLE = 'gemini-3-flash-preview';
const MODEL_FLASH_ROLE = 'gemini-3.1-flash-lite';

const HAND_CRAFTED_MC = 'Lương Hạo';
const HAND_CRAFTED_DESC = 'Một đêm tháng Tư 2027, thiên thạch màu xanh va xuống Hà Nội — nhân loại 99% nhiễm zombie virus trong 72 giờ. Lương Hạo, kỹ sư kho vận 28 tuổi, mở mắt thấy app "Hầm Trú Ẩn Vạn Năng" trong điện thoại: mỗi món hàng quét QR là copy vào kho ảo vô hạn, có thể rút ra ở bất kỳ đâu, hồi phục độ tươi. Đối với người khác mạt thế là tận thế — với Hạo, đó là thương vụ thế kỷ.';
const HAND_CRAFTED_WORLD = `Hà Nội 2027 sau ngày D+72: 99% dân nhiễm zombie virus T-Aurora (đến từ thiên thạch xanh). Người sống sót chia thành 3 tầng:
  • Hệ phái quân sự (Bộ Tư Lệnh Thủ Đô — 2 vạn lính sống sót, kiểm soát Mỹ Đình + sân bay Nội Bài + bệnh viện 108)
  • Hệ phái dân thường co cụm thành 17 trại tị nạn ("safe zones"): trường THPT Chu Văn An, KĐT Times City, chung cư Royal City, Vincom Bà Triệu...
  • Hệ phái thương nhân — đầu nậu trao đổi hàng hóa giữa các zone, đơn vị tiền tệ mới = "thẻ tích điểm Vinmart đỏ" + đạn 9mm.

MC Lương Hạo (28t, kỹ sư kho vận Yusen Logistics trước mạt thế, sống ở chung cư Royal City Thanh Xuân tầng 22). Mạt thế ngày D+0: thiên thạch xanh va xuống Đông Anh 19h47, T-Aurora virus rò rỉ lan thành mưa axit xanh trong 6 giờ. Đến D+3, 99% Hà Nội nhiễm. MC tỉnh dậy thấy app "Hầm Trú Ẩn Vạn Năng" trên điện thoại — UI đơn giản: ô vuông Inventory + nút "Quét" + nút "Rút". Cơ chế:
  • Quét QR / barcode bất cứ món hàng nào (đồ ăn, vũ khí, thuốc, xe cộ) → copy vào inventory vô hạn dung lượng.
  • Rút ra ở vị trí GPS hiện tại, instant. Đồ ăn / thuốc giữ độ tươi mãi mãi.
  • Limit: phải có quyền sở hữu hoặc kẻ mất kiểm soát (zombie, người chết). Không quét được vật vẫn thuộc về người sống tỉnh táo.
  • Cooldown: rút món > 10kg cooldown 30 giây / món.
  • Bí mật MC: thật ra app này là "Hồi Quy Khí" — MC kiếp trước đã chết ở D+30, được "Tia Xanh Cosmic" cho trở lại D+0 để cứu Hương (em gái cùng cha khác mẹ, đang ở Times City an toàn zone, không biết anh có app).

Phase 1 playground (ch.1-100): Royal City building → quận Thanh Xuân → cầu vượt Lê Văn Lương. MC tích trữ siêu thị Vinmart B1, kho Yusen Logistics, kho dược ABC bệnh viện 354. Đối thủ local: nhóm xã hội đen Sơn "Hói" (cũ trước mạt thế) cướp tại sảnh Royal City.

Phase 2 (ch.100-300): MC merge với safe zone Times City — trở thành đầu nậu thương nhân. Đối thủ: hệ phái quân sự Mỹ Đình ép thuế / sung công kho. Phe phụ: bác sĩ Nguyễn Khánh (Times City medbay), đồng đội kho vận Phạm Đăng Linh (cuối kiếp trước đã chết cứu MC).

Phase 3 (ch.300-600): xuyên Hà Nội mở rộng — Hải Phòng, Bắc Ninh. MC kiến lập liên minh thương nhân Bắc Bộ. Đối thủ: Hắc Vũ Hội (tổ chức thương nhân Trung Quốc xuyên biên giới Cao Bằng buôn vũ khí + người).

Phase 4 (ch.600-1000): cosmic reveal — T-Aurora là test selection của "Cosmic Civilization Bureau". Top 1000 survivor toàn cầu được mời gia nhập. Endgame: MC cứu Hương + tích đủ "cosmic point" để mua "Resurrection Token" hồi sinh đồng đội cũ.`;

const STAGED = new Set(['idea', 'world', 'character', 'description', 'master_outline', 'story_outline', 'arc_plan']);

// Promote chapter-writing 3-agent pipeline to Pro role (gemini-3-flash-preview
// thinking=high) — initial Flash Lite run produced critically repetitive prose
// ("là một" 12× per chapter) that Critic kept rejecting.
const PRO_TASKS = [
  'stage_idea', 'stage_world', 'stage_character',
  'master_outline', 'story_outline', 'story_bible', 'arc_plan',
  // promoted from FLASH:
  'architect', 'writer', 'writer_continuation', 'critic',
];
const FLASH_TASKS = [
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

async function fetchStageProj() {
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,genre,main_character,world_description,master_outline,story_outline,story_bible,total_planned_chapters,setup_stage,setup_stage_attempts,novels!ai_story_projects_novel_id_fkey(id,title)')
    .eq('id', PROJECT_ID).single();
  if (error) throw error;
  return data;
}

async function seedAndActivate() {
  // Update novel.description
  await db.from('novels').update({
    description: HAND_CRAFTED_DESC,
  }).eq('id', NOVEL_ID);

  // Update project: seed world + MC, set ai_model to gemini flash lite, activate.
  await db.from('ai_story_projects').update({
    status: 'active',
    pause_reason: null,
    main_character: HAND_CRAFTED_MC,
    world_description: HAND_CRAFTED_WORLD,
    ai_model: 'gemini-3.1-flash-lite',
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    setup_stage_error: null,
    setup_stage_updated_at: new Date().toISOString(),
    temperature: 1.0,                 // Gemini 3 recommended
    target_chapter_length: 2800,
    style_directives: { disable_chapter_split: true },
  }).eq('id', PROJECT_ID);

  console.log(`[seed] project activated, MC=${HAND_CRAFTED_MC}, world=${HAND_CRAFTED_WORLD.length} chars`);
}

async function driveSetup() {
  const { runOneStage } = await import('@/services/story-engine/pipeline/setup-pipeline');
  const MAX_STEPS = 12;
  for (let i = 0; i < MAX_STEPS; i++) {
    const p = await fetchStageProj();
    console.log(`\n[setup ${i + 1}/${MAX_STEPS}] stage=${p.setup_stage} attempts=${p.setup_stage_attempts}`);
    if (!STAGED.has(p.setup_stage)) {
      console.log(`[setup] reached ${p.setup_stage} — leaving setup loop`);
      return;
    }
    const t0 = Date.now();
    const advanced = await runOneStage(p as Parameters<typeof runOneStage>[0]);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[setup] ${p.setup_stage} → advanced=${advanced} (${dt}s)`);
    if (!advanced) {
      const { data: err } = await db.from('ai_story_projects').select('setup_stage_error,setup_stage_attempts').eq('id', PROJECT_ID).single();
      console.log(`[setup] err: ${err?.setup_stage_error} attempts=${err?.setup_stage_attempts}`);
      if ((err?.setup_stage_attempts ?? 0) >= 4) {
        console.log('[setup] giving up after 4 attempts on this stage');
        return;
      }
    }
  }
}

async function driveChapters(count: number) {
  const { writeOneChapter } = await import('@/services/story-engine/pipeline/orchestrator');
  for (let i = 0; i < count; i++) {
    // Re-install Gemini routing in case writeOneChapter's installModelTierRouting()
    // (which is no-op due to DISABLE_PRO_TIER=1) somehow cleared it.
    installGeminiRouting();
    console.log(`\n━━━━ Chapter write ${i + 1}/${count} ━━━━`);
    const t0 = Date.now();
    try {
      const result = await writeOneChapter({ projectId: PROJECT_ID });
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[chapter] result: ${JSON.stringify({
        success: result.success,
        chaptersCreated: result.chaptersCreated,
        lastChapterNumber: result.lastChapterNumber,
        wordCount: result.wordCount,
        title: result.title?.slice(0, 60),
      })} (${dt}s)`);
      if (!result.success) {
        console.log(`[chapter] FAIL: ${result.error}`);
        break;
      }
    } catch (e) {
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[chapter] EXCEPTION after ${dt}s:`, e instanceof Error ? e.message : e);
      break;
    }
  }
}

async function main() {
  const chaptersArg = process.argv.find((a) => a.startsWith('--chapters='));
  const chapterCount = chaptersArg ? parseInt(chaptersArg.split('=')[1], 10) : 3;

  console.log(`━━━━ DRIVE: Mạt Thế Ta Có Hầm Trú Ẩn Vạn Năng (Gemini) ━━━━`);
  console.log(`projectId: ${PROJECT_ID}`);
  console.log(`Pro role : ${MODEL_PRO_ROLE} (thinking=high)`);
  console.log(`Flash    : ${MODEL_FLASH_ROLE}`);
  console.log(`chapters : ${chapterCount}`);
  console.log('');

  installGeminiRouting();
  console.log('[boot] routing installed', globalThis.__MODEL_ROUTING__);

  await seedAndActivate();
  await driveSetup();
  await driveChapters(chapterCount);

  // Final state
  const final = await fetchStageProj();
  const { count: chapterCount2 } = await db.from('chapters').select('*', { count: 'exact', head: true }).eq('novel_id', NOVEL_ID);
  console.log(`\n━━━━ FINAL ━━━━`);
  console.log(`setup_stage: ${final.setup_stage}  current_chapter: cf above`);
  console.log(`MC: ${final.main_character}`);
  console.log(`world_description: ${(final.world_description ?? '').length} chars`);
  console.log(`master_outline: ${final.master_outline ? 'populated' : 'empty'}`);
  console.log(`story_outline:  ${final.story_outline ? 'populated' : 'empty'}`);
  console.log(`chapters in DB: ${chapterCount2 ?? 0}`);
}

main().catch((e) => { console.error('[drive] FATAL', e); process.exit(1); });
