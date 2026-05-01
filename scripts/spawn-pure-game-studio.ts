/**
 * Spawn 1 PURE game-development studio novel — canonical TQ trope
 * 《我可能是个假游戏制作人》 (I Might Be a Fake Game Designer).
 *
 * Why a separate novel: the existing "Studio Game Của Ta Mở Ở Dị Giới"
 * (slug: studio-game-cua-ta-mo-o-di-gioi-choi-game-la-hoc-vo) is a
 * HYBRID — dị giới tu-tiên setting + customers gain real combat skills
 * from playing MC's games. That's still the net-cafe DNA (game-as-buff
 * delivery) wearing a "studio" hat. User wants a novel where:
 *   - Setting = parallel Earth (NO tu-tiên, NO fantasy world)
 *   - MC = pure indie dev / studio owner releasing games to a real
 *     parallel-Earth audience that consumes games for entertainment
 *   - Conflict = industry war with monopoly corporations (Tencent /
 *     NetEase analogs), streamer reactions, AAA progression
 *   - NO combat link, NO "play game = learn martial arts"
 *
 * Sub-genre: 'game-parallel-world' — the SUB_GENRE_RULE we just
 * upgraded with explicit Game Catalog Tiering (Tier S indie horror /
 * Tier S+ AAA / Tier B Snake-tier filler) + 4 Antagonist Design
 * conflict types (tập đoàn copy / streamer war / talent poaching /
 * platform war).
 *
 * Status: 'Đang ra' (VN canonical) so homepage filters surface it.
 *
 * Usage: ./node_modules/.bin/tsx scripts/spawn-pure-game-studio.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateMasterOutline } from '@/services/story-engine/plan/master-outline';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import { validateStoryOutlineOrThrow } from '@/services/story-engine/utils/story-outline-validator';
import { generateNovelDescription } from '@/services/story-engine/utils/description-generator';
import type { GeminiConfig, GenreType, StoryOutline } from '@/services/story-engine/types';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const MAX_PLANNED_CHAPTERS = 600;

interface NovelSeed {
  title: string;
  slug: string;
  genre: GenreType;
  topic_id?: string;
  sub_genres?: string[];
  main_character: string;
  description: string;
  world_description: string;
  total_planned_chapters: number;
}

const SEED: NovelSeed = {
  title: 'Lập Trình Game Cứu Thế Giới: Cơn Ác Mộng Của Tập Đoàn P2W',
  slug: 'lap-trinh-game-cuu-the-gioi-con-ac-mong-cua-tap-doan-p2w',
  genre: 'do-thi',
  // KHÔNG dùng topic_id 'do-thi-giai-tri-luu' (entertainment IP carry — phim/nhạc/sách)
  // Vì game-parallel-world là pure game dev, narrower scope
  sub_genres: ['game-parallel-world'],
  main_character: 'Trần Vũ',
  description: 'Trần Vũ — ex-QA studio AAA bị burnout, đêm nghỉ việc tỉnh dậy ở thế giới song song Đông Châu năm 2024. Công nghệ ngang Trái Đất, NHƯNG ngành game cực tệ: P2W mobile thống trị, AAA copy-paste sáo rỗng, indie không hệ sinh thái, esports chỉ là gimmick TV. Hệ Thống Thu Thập Cảm Xúc giúp MC release game indie thu Điểm sợ hãi/ức chế/cảm động → đổi source code Earth game/engine. Mở studio Lạc Hồng Studio: Five Nights at Freddys → Getting Over It → Undertale → Stardew Valley → CS:GO → AAA Dark Souls → platform Hồng Tâm → VR Sword Art Online. Đối đầu tập đoàn độc quyền Hằng Nguyên (Tencent analog) và Vạn Giới Entertainment (NetEase analog). KHÔNG combat — face-slap qua streamer reactions + cộng đồng + thị phần.',
  world_description: `BỐI CẢNH: Trần Vũ, 27 tuổi, ex-QA studio AAA tại Hà Nội (kiệt sức 5 năm crunch, vừa nghỉ việc). Đêm nghỉ tỉnh dậy ở thế giới song song "Đông Châu" — quốc gia hư cấu Á Đông năm 2024, công nghệ ngang Trái Đất.

DISTINCTION (KHÁC HOÀN TOÀN với Studio Game Của Ta Mở Ở Dị Giới):
- KHÔNG tu-tiên, KHÔNG võ-lâm, KHÔNG dị giới fantasy. Setting = parallel Earth thuần túy.
- KHÔNG customer học võ qua game. KHÔNG combat-link. KHÔNG mana-tablet console.
- Audience của MC = NGƯỜI BÌNH THƯỜNG ở Đông Châu — sinh viên, nhân viên, streamer, học sinh — họ chơi game chỉ để GIẢI TRÍ thuần túy. Không có cảnh giới, không có công pháp, không có yêu thú.
- MC = INDIE DEVELOPER thuần túy. Code C++/C#/Unity/Unreal Engine. Release game qua Hồng Tâm Store (Steam analog Đông Châu).
- Conflict = INDUSTRY WAR (P2W tập đoàn vs indie sáng tạo), KHÔNG personal combat.

ĐÔNG CHÂU 2024 (parallel Earth setting):
- Thủ đô: Long Hải Đô (Hong Kong + Thượng Hải vibe, cyberpunk Á Đông neon)
- Công nghệ: smartphone OLED, internet 5G, AR/VR đang phát triển, streaming "Hỏa Lực" platform (Twitch analog), social media "Vi Bác" (Weibo analog), payment "Hồng Bao Pay" (Alipay analog)
- Thị trường game: 95% là P2W mobile, "khoá rương ngẫu nhiên" + "VIP nạp 10000 mới chơi được", AAA chỉ có 2 studio (làm clone Western), indie KHÔNG có platform riêng (toàn upload free trên forum)
- Esports: chỉ tổ chức gimmick TV show, không league chuyên nghiệp, không salary cho pro player
- Gaming culture: gamer hardcore khao khát game có cốt truyện + design tử tế, streamer cộng đồng nhỏ chỉ 1-2 ngàn viewer

TẬP ĐOÀN ĐỘC QUYỀN (CẤM combat MC, conflict qua market only):
1. Hằng Nguyên Group — Tencent analog. CEO: Lý Hằng Phong (50 tuổi, đại tài phiệt). Sản phẩm: 200+ game P2W mobile, mỗi tháng release 5 game clone, kiếm 80% doanh thu thị trường qua MOBA & MMO P2W.
2. Vạn Giới Entertainment — NetEase analog. CEO: Hứa Minh Triết (45 tuổi). Sản phẩm: clone game phương Tây (DOTA → "Vạn Giới Anh Hùng", LoL → "Anh Hùng Đại Chiến"), copy nhanh + marketing đè bẹp indie.
3. Liên minh "Hiệp Hội Phát Triển Game Đông Châu" — do 2 tập đoàn trên control, cấp quyền release game, indie không vào liên minh = không lên Hồng Tâm Store homepage.

GOLDEN FINGER — HỆ THỐNG THU THẬP CẢM XÚC:
- MC release game → game thủ trải nghiệm → hệ thống thu Điểm Cảm Xúc tương ứng
  • SỢ HÃI (jump scare, atmospheric horror): từ Five Nights at Freddys / Outlast / Resident Evil
  • ỨC CHẾ (rage / frustration / "ơn giời cuối cùng"): từ Getting Over It / Cuphead / Dark Souls / Sekiro
  • CẢM ĐỘNG (cathartic / emotional payoff): từ Undertale / To The Moon / Celeste / Hades
  • THỎA MÃN (creative satisfaction): từ Minecraft / Stardew Valley / Hollow Knight
- Điểm Cảm Xúc = currency mua source code Earth game, engine, kỹ năng dev (Unity expert, art direction, sound design, narrative writing).
- MC KHÔNG nhớ chi tiết code Earth game — chỉ nhớ TRẢI NGHIỆM player. Phải mua source code qua hệ thống → adapt → re-implement.

NHÂN VẬT MC:
- Trần Vũ — 27, ex-QA studio AAA tại Hà Nội, vừa burnout nghỉ việc.
- Personality: introvert, pragmatic, perfectionist trong design, thẳng thắn trong dev culture (KHÔNG crunch team). Hài hước âm thầm — comment cynical về industry P2W.
- Skills cốt lõi: nhớ TRẢI NGHIỆM 1000+ game Earth (KHÔNG nhớ code), QA expert (test → catch bug), critical thinking về game design.
- Bối cảnh nghề: tốt nghiệp Đại Học Bách Khoa Hà Nội ngành CNTT, làm QA 5 năm tại studio AAA "Tinh Hà Studio" (Hà Nội) trước khi bị burnout.
- Tài sản ban đầu ở Đông Châu: căn hộ 1 phòng tại Long Hải Đô (thừa kế từ "Trần Vũ" parallel — cũng QA bị layoff), 200 triệu Đông Tệ tiết kiệm (~200 triệu VND), laptop cũ + IDE đầy đủ, 1 đăng ký Hồng Tâm Developer (50 Đông Tệ/năm).

PHASE ROADMAP (cấu trúc 4 phase cho 600 chương total_planned, theo SUB_GENRE_RULE 'game-parallel-world'):

PHASE 1 (ch.1-50) — KHỞI NGHIỆP TINH GỌN:
- MC ĐÃ có laptop + golden finger activated + ý tưởng đầu trong tay (chương 1).
- Release game indie nhỏ đột phá (game đầu là Five Nights at Freddys clone — horror jump-scare 4 đêm, dev 2 tháng solo).
- Marketing 0 đồng qua streamer cộng đồng nhỏ — streamer la hét/phá chuột → viral organic.
- Thu Điểm Sợ Hãi đầu tiên → mua source code FNAF gốc + thanh toán bug fix.
- Vốn liếng đầu tay: 50000 Đông Tệ doanh thu Hồng Tâm Store sau 3 tuần.
- Antagonist phase 1: streamer "BTV Game" của Hằng Nguyên review tiêu cực giả vờ → cộng đồng phát hiện → boycott BTV.

PHASE 2 (ch.51-200) — STUDIO + BẢN QUYỀN WAR:
- Tuyển team 5-10 người (họa sĩ bị tẩy chay vì style indie, nhạc sĩ thất nghiệp, ex-AAA dev quit Hằng Nguyên).
- Tựa game tầm trung: Getting Over It, Undertale, Stardew Valley, CS:GO clone.
- Tập đoàn lớn copy clone (Hằng Nguyên ra "Sợ Hãi 5 Đêm" clone FNAF chỉ 1 tháng sau MC ra game).
- MC face-slap bằng cập nhật core feature (FNAF DLC mới với 5 đêm + lore complex), bản nhái không kịp.
- Esports đầu tiên: tổ chức CS:GO tournament 8 team indie, viral cộng đồng.

PHASE 3 (ch.201-400) — PHÁ VỠ ĐỘC QUYỀN + HỆ SINH THÁI:
- Game AAA đầu tiên: Dark Souls clone "Hắc Hồn" — game = nghệ thuật, doanh thu 500 triệu Đông Tệ.
- Build platform riêng "Hồng Tâm Indie Hub" cạnh tranh Hồng Tâm Store của Hằng Nguyên.
- Thu hút 100+ indie devs khác → ecosystem phá vỡ độc quyền.
- Tổ chức esports global: CS:GO Championship 32 team, salary chuyên nghiệp.
- Hằng Nguyên + Vạn Giới hợp lực ngầm: lobby chính phủ, talent poaching team MC.

PHASE 4 (ch.401-600) — VR / METAVERSE:
- Hệ thống đưa hắc khoa kỹ → MC làm thiết bị VR neural-interface (Sword Art Online + Ready Player One).
- Metaverse thành "thế giới thứ hai", apply quân sự / y tế / giáo dục.
- MC = Bố Già công nghệ Đông Châu, đối đầu cosmic-scale với "Hằng Nguyên Bắc Mỹ" (parallel Tencent quốc tế).

ENGAGEMENT TROPES BẮT BUỘC (theo SUB_GENRE_RULE):
1. STREAMER POV (30-40% chương): cảnh streamer/người chơi vật vã trải nghiệm game của MC + reaction cộng đồng mạng "Vi Bác". Engine sảng văn hiệu quả nhất.
2. MC PERSONA "TRÙM PHẢN DIỆN GIẤU MẶT": người chơi gọi MC là "Cẩu Tặc Lạc Hồng", "Ác Ma Thiết Kế" vì hay ra game hành hạ tâm lý — NHƯNG mỗi game mới ra ai cũng nạp tiền. Dramatic irony.
3. VĂN HÓA INFUSION: cài cắm aesthetic Á Đông (Cyberpunk Trung Hoa, kiếm hiệp Kim Dung, thần thoại Việt Nam, văn hóa lịch sử Đông Á) → game không chỉ giải trí mà "khai sáng" gamer Đông Châu.

ANTI-PATTERNS (CẤM theo SUB_GENRE_RULE):
- KHÔNG MC combat (MC = creator, không pro gamer).
- KHÔNG harem (love interest single — nữ team member nhạc sĩ slow-burn, chương 100+).
- KHÔNG copy plot game/phim Earth gốc 100% — adapt + Á Đông angle.
- KHÔNG instant master (MC luôn fail debug + crunch + bug crashes lần đầu).
- KHÔNG tu-tiên / dị giới / fantasy customer / combat-link.
- KHÔNG CEO Hằng Nguyên / Vạn Giới đến PvP MC qua game (childish trope).

TONE: pragmatic + meta-comedy + cultural-impact glamour. Match phase: phase 1-2 underdog grind, phase 3 mogul, phase 4 visionary.

CHAPTER STRUCTURE: 30% MC creative work + 30% streamer/community POV + 25% business politics + 15% team dynamics.`,
  total_planned_chapters: 600,
};

// ── Helpers (copied from spawn-phase20-representatives.ts) ──────────

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function generateStoryOutline(projectId: string, seed: NovelSeed): Promise<void> {
  const cfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.75, maxTokens: 8192 };
  const prompt = `Bạn là biên tập viên xuất bản truyện mạng TQ chuyên nghiệp. Hãy thiết kế dàn ý chi tiết cho tiểu thuyết sau:

TIÊU ĐỀ: ${seed.title}
NHÂN VẬT CHÍNH: ${seed.main_character}
GENRE: ${seed.genre}${seed.sub_genres?.length ? ` (sub: ${seed.sub_genres.join(', ')})` : ''}
WORLD: ${seed.world_description.slice(0, 2500)}

Trả về JSON đầy đủ các trường (CANONICAL SCHEMA — dùng đúng tên field, KHÔNG đổi):
{
  "id": "string",
  "title": "${seed.title}",
  "genre": "${seed.genre}",
  "premise": "1-2 câu tóm tắt premise cốt lõi của truyện (golden finger + setting + protagonist + main conflict trong 1 đoạn ngắn)",
  "themes": ["theme1", "theme2", "theme3"],
  "mainConflict": "Xung đột chính xuyên suốt truyện",
  "targetChapters": ${seed.total_planned_chapters},
  "protagonist": {
    "name": "${seed.main_character}",
    "startingState": "Tình trạng + nghề nghiệp + tài sản + quan hệ MC ở chương 1",
    "endGoal": "Mục tiêu cuối cùng của MC ở cuối truyện",
    "characterArc": "Hành trình growth của MC qua 4 phase"
  },
  "majorPlotPoints": [
    {"chapter": 1, "event": "Sự kiện chương 1 — kích hoạt golden finger / hook"},
    {"chapter": 50, "event": "..."},
    {"chapter": 200, "event": "..."},
    {"chapter": 400, "event": "..."},
    {"chapter": 600, "event": "..."}
  ],
  "endingVision": "Tầm nhìn kết thúc truyện — MC đạt được gì, world thay đổi ra sao",
  "uniqueHooks": ["hook1 đặc trưng cho truyện", "hook2", "hook3"]
}

YÊU CẦU CỨNG:
- protagonist.name PHẢI là "${seed.main_character}" (KHÔNG đổi tên)
- premise + mainConflict + majorPlotPoints PHẢI reflect đúng world_description (Hằng Nguyên Group + Vạn Giới Entertainment, Hệ Thống Thu Thập Cảm Xúc, FNAF/Getting Over It/Undertale catalog)
- KHÔNG combat / KHÔNG tu-tiên / KHÔNG harem (single love interest slow-burn)
- majorPlotPoints PHẢI có ≥6 events theo phase roadmap trong world_description

Trả JSON thuần (không markdown).`;
  const res = await callGemini(prompt, cfg);
  const parsed = parseJSON<StoryOutline>(res.content);
  if (!parsed) throw new Error('story_outline parseJSON returned null');
  // Defensive validator: fails LOUDLY at spawn time if schema drifts back to wrong fields.
  // Prevents the 2026-04-29 incident (10 chapters of off-premise content) from recurring.
  const outline = validateStoryOutlineOrThrow(parsed, `spawn-pure-game-studio[${seed.slug}]`);
  if (outline.protagonist) outline.protagonist.name = seed.main_character;
  const { error } = await s.from('ai_story_projects').update({ story_outline: outline }).eq('id', projectId);
  if (error) throw new Error(`save story_outline failed: ${error.message}`);
}

async function createNovelAndProject(seed: NovelSeed, ownerId: string): Promise<string> {
  // 2026-04-29 standard: ALL descriptions go through shared generator with
  // built-in validator. No more hand-typed seed.description (it leaked
  // engineering jargon). Validator catches face-slap/Tone:/anti-pattern
  // flags and rejects → auto-retry up to 3× with explicit feedback.
  console.log(`  → Generating reader-facing description...`);
  const description = await generateNovelDescription({
    title: seed.title,
    genre: seed.genre,
    subGenres: seed.sub_genres,
    mainCharacter: seed.main_character,
    worldDescription: seed.world_description,
  });
  console.log(`  ✓ Description: ${description.length} chars`);

  const { data: novel, error: novelErr } = await s.from('novels').insert({
    title: seed.title,
    slug: seed.slug,
    author: 'Truyện City',
    description,
    genres: [seed.genre],
    status: 'Đang ra',  // VN canonical
  }).select('id').single();
  if (novelErr || !novel) throw new Error(`novel insert failed: ${novelErr?.message}`);
  console.log(`  ✓ Novel created: ${novel.id}`);

  const styleDirectives: Record<string, unknown> = {
    disable_chapter_split: true,  // keep AI 2800-word output as 1 reader chapter
  };

  const projectInsert: Record<string, unknown> = {
    novel_id: novel.id,
    user_id: ownerId,
    genre: seed.genre,
    main_character: seed.main_character,
    world_description: seed.world_description,
    total_planned_chapters: Math.min(seed.total_planned_chapters, MAX_PLANNED_CHAPTERS),
    current_chapter: 0,
    status: 'paused',
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    temperature: 0.75,
    target_chapter_length: 2800,
    ai_model: 'deepseek-v4-flash',
    style_directives: styleDirectives,
  };
  if (seed.sub_genres?.length) projectInsert.sub_genres = seed.sub_genres;

  const { data: project, error: projErr } = await s.from('ai_story_projects')
    .insert(projectInsert)
    .select('id')
    .single();
  if (projErr || !project) throw new Error(`project insert failed: ${projErr?.message}`);
  console.log(`  ✓ Project created: ${project.id} (paused, disable_chapter_split=true)`);
  return project.id;
}

async function generateOutlines(projectId: string, seed: NovelSeed): Promise<void> {
  const cfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.7, maxTokens: 4096 };
  console.log(`  → story_outline...`);
  await generateStoryOutline(projectId, seed);
  console.log(`  → master_outline...`);
  const cappedTotal = Math.min(seed.total_planned_chapters, MAX_PLANNED_CHAPTERS);
  // DeepSeek occasionally returns shape without majorArcs — retry up to 3 times.
  let master = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    master = await generateMasterOutline(projectId, seed.title, seed.genre, seed.world_description, cappedTotal, cfg);
    if (master?.majorArcs?.length) break;
    console.warn(`  ⚠ master_outline attempt ${attempt}/3 incomplete — retrying`);
  }
  if (!master?.majorArcs?.length) throw new Error('master_outline failed after 3 attempts');
  console.log(`  ✓ master_outline saved (${master.majorArcs.length} arcs)`);

  const lastArcEnd = Math.max(...master.majorArcs.map(a => a.endChapter || 0));
  if (lastArcEnd > 0) {
    const driftRatio = Math.abs(lastArcEnd - cappedTotal) / cappedTotal;
    if (driftRatio > 0.1) {
      const newTotal = Math.round(lastArcEnd / 50) * 50 || lastArcEnd;
      await s.from('ai_story_projects').update({ total_planned_chapters: newTotal }).eq('id', projectId);
      console.log(`  ✓ total_planned_chapters auto-synced: ${cappedTotal} → ${newTotal}`);
    }
  }
}

async function activateProject(projectId: string): Promise<void> {
  const { error } = await s.from('ai_story_projects').update({ status: 'active' }).eq('id', projectId);
  if (error) throw new Error(`activate failed: ${error.message}`);
  console.log(`  ✓ Activated`);
}

// Reset today's quota row so cron picks up immediately (avoids the
// stale-quota bug we just fixed in wipe-fixed-novels.ts).
async function ensureFreshQuota(projectId: string): Promise<void> {
  const vnDate = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  // Try update first (in case daily-spawn-cron already created the row)
  const { data: existing } = await s.from('project_daily_quotas')
    .select('vn_date')
    .eq('project_id', projectId)
    .eq('vn_date', vnDate)
    .maybeSingle();
  if (existing) {
    await s.from('project_daily_quotas').update({
      written_chapters: 0,
      status: 'active',
      next_due_at: new Date().toISOString(),
      retry_count: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq('project_id', projectId).eq('vn_date', vnDate);
    console.log(`  ✓ Quota for ${vnDate} reset (existing row)`);
  } else {
    console.log(`  ℹ No quota row yet for ${vnDate} — cron will create one on next tick`);
  }
}

async function main(): Promise<void> {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  SPAWN: Pure Game Dev Studio (canonical 假游戏制作人)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Idempotency: skip if slug already exists
  const { data: existing } = await s.from('novels').select('id').eq('slug', SEED.slug).maybeSingle();
  if (existing) {
    console.log(`✗ Novel with slug "${SEED.slug}" already exists (id=${existing.id}). Aborting to avoid duplicate.`);
    return;
  }

  const ownerId = await getOwnerId();
  console.log(`Owner: ${ownerId}\n`);
  console.log(`▶ [${SEED.genre} / sub: ${SEED.sub_genres?.join(',')}] ${SEED.title}`);

  try {
    const projectId = await createNovelAndProject(SEED, ownerId);
    console.log(`\n✓ Done. Project ${projectId} is paused/setup_stage=idea.`);
    console.log(`  Setup state machine must reach ready_to_write before chapter 1.`);
    console.log(`  URL: https://truyencity.com/truyen/${SEED.slug}`);
  } catch (e) {
    console.error(`✗ Failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

main().catch(console.error);
