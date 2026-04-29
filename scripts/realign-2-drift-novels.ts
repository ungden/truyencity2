/**
 * Realign 2 drifted novels: their existing chapters drifted away from
 * the spawn-time premise (root cause: world_description not loaded by
 * context-assembler + story_outline schema mismatch — both fixed in
 * commit 2dff7fb). User wants to keep the chapters (content is good)
 * but sync metadata so future chapters stay coherent with what's
 * already been written.
 *
 * After this script runs, both novels become PROPER do-thi NEET
 * khởi nghiệp với hệ thống urban-life — what their chapters
 * actually show — instead of the canonical "pure game studio" /
 * "literary genesis" the spawn scripts originally promised.
 *
 * Operations per novel:
 *  1. UPDATE novels: title, slug, description (homepage display)
 *  2. UPDATE ai_story_projects: world_description (match real content),
 *     sub_genres (remove game-parallel-world / viet-van-sang-the,
 *     add kinh-doanh)
 *  3. Clear story_outline + master_outline (will regenerate)
 *  4. Regenerate story_outline (canonical schema) via DeepSeek
 *  5. Regenerate master_outline aligned with new premise via DeepSeek
 *  6. Reset daily quota so cron continues writing chapters today
 *
 * Slug WILL change — URLs bookmarked break, but only 10 chapters per
 * novel exist (created today) so disruption is minimal. The bookmark
 * count check before the run will report current state.
 *
 * Usage: ./node_modules/.bin/tsx scripts/realign-2-drift-novels.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateMasterOutline } from '@/services/story-engine/pipeline/master-outline';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import { validateStoryOutlineOrThrow } from '@/services/story-engine/utils/story-outline-validator';
import type { GeminiConfig, GenreType, StoryOutline } from '@/services/story-engine/types';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface RealignTarget {
  oldSlug: string;
  newTitle: string;
  newSlug: string;
  newDescription: string;
  newWorldDescription: string;
  newSubGenres: string[];
  newGenre: GenreType;
  newMainCharacter: string;
  totalPlannedChapters: number;
}

const TARGETS: RealignTarget[] = [
  {
    oldSlug: 'studio-indie-cua-ta-khien-streamer-toan-cau-dap-nat-ban-phim',
    newTitle: 'Hệ Thống Đô Thị: Đầu Bếp Phượng Đô Khởi Nghiệp F&B',
    newSlug: 'he-thong-do-thi-dau-bep-phuong-do-khoi-nghiep-fb',
    newDescription: 'Trần Vũ — sinh viên ra trường thất nghiệp ở Phượng Đô, sống trong căn phòng trọ tầng 2 nóng như lò bánh mì, bán 5 suất cơm hộp văn phòng mỗi ngày để tồn tại. Một sáng, chiếc Samsung J7 cũ bỗng cài đặt "HỆ THỐNG ĐÔ THỊ - PHIÊN BẢN THỬ NGHIỆM" với 4 nhánh kỹ năng (Nấu nướng / Kinh doanh / Tài chính / Nhiệm vụ). Từ công thức Cơm Chiên Hải Sản Chua Ngọt khiến khách Zalo đặt liên tục → tiệm ăn vỉa hè → quán ăn 2 cơ sở → chuỗi nhà hàng → đế chế F&B Phượng Đô. Tone realistic + cozy + numbers-driven. KHÔNG combat, KHÔNG huyền bí, KHÔNG harem.',
    newWorldDescription: `BỐI CẢNH: Trần Vũ, 25 tuổi, sinh viên Đại học Phượng Đô ngành Công nghệ Thực phẩm tốt nghiệp 1 năm, hiện ở căn phòng trọ tầng 2 đường Nguyễn Huệ, Phượng Đô. Tài khoản techcombank còn 1.800.000 đồng. Tiền phòng 4.500.000 sắp đến hạn. Mẹ ở quê (Hà Nam) gọi điện hỏi thăm, MC nói dối "đã có việc, sắp có lương".

NGHỀ HIỆN TẠI (chương 1): bán cơm hộp văn phòng giao Zalo. Mỗi ngày 5 suất, lãi 20K/suất → ~100K/ngày. Khách quen hội văn phòng đường Nguyễn Huệ. Bếp gas mini, chảo gang xước, thớt gỗ ngả màu sậm.

GOLDEN FINGER — HỆ THỐNG ĐÔ THỊ (PHIÊN BẢN THỬ NGHIỆM):
App tự cài đặt vô tình trên Samsung J7 cũ (mặt kính nứt, pin chai). Giao diện tối giản, không quảng cáo. 4 tabs:
1. Kỹ năng Nấu nướng (Sơ cấp → Trung cấp → Cao cấp → Đại sư): mỗi tier mở khóa công thức mới + tăng instinct (tay tự điều chỉnh lửa/gia vị).
2. Kỹ năng Kinh doanh (sơ cấp xuất hiện sau khi hoàn thành nhiệm vụ đầu): mở khóa pricing strategy, supply chain optimization, branding.
3. Tài chính: mở khi có doanh thu nhất định, gợi ý đầu tư + cảnh báo cash flow.
4. Nhiệm vụ: hệ thống tự đề xuất task có timer + reward "xu hệ thống" (currency in-game tích lũy đổi unlock skill).

CƠ CHẾ NÂNG CẤP:
- Mở app lần đầu → tự động unlock Nấu nướng Sơ cấp + công thức "Cơm Chiên Hải Sản Chua Ngọt" miễn phí
- Hoàn thành nhiệm vụ chính (vd: bán 50 suất trong 2 ngày) → reward 3M xu + skill mới
- Skill nấu nướng nâng cấp → công thức mới (Bún Bò Huế Cao Cấp / Phở Đặc Sản Hà Nội / Sushi Fusion / Bistro Sài Gòn / Lẩu Tứ Xuyên / Pizza Ý / Bánh Mì French Style)
- Mỗi công thức có "Hướng dẫn chi tiết" hiện ra khi nấu — body MC tự động điều chỉnh

PHƯỢNG ĐÔ — fictional metropolis Đại Nam (như Hà Nội/Sài Gòn fusion 2024):
- Đường Nguyễn Huệ: phố trung tâm, văn phòng tower, đông khách công sở
- Quận Bình Tân: khu trọ + chợ đầu mối + nhà hàng giá rẻ
- Đường Đinh Tiên Hoàng: phố ẩm thực truyền thống
- Tòa nhà Saigon Future Tower: trung tâm tài chính
- Khu Phú Mỹ Hưng: chuỗi nhà hàng cao cấp + mall

CAST CHÍNH:
- Khánh: bạn cùng quê Hà Nam, làm bảo vệ tòa nhà gần đó. Hỗ trợ MC ship hàng, sau thành đối tác kinh doanh.
- Chị Lan (cô Lan): chủ quầy thịt cá chợ Bình Tân. Cung cấp nguyên liệu giá hữu nghị.
- Phạm Minh: quản lý The Coffee House Phượng Đô, ký hợp đồng catering 200 suất/ngày → bước ngoặt lớn.
- Trọng: tay bảo kê khu phố cổ. Conflict tiềm năng: đòi tiền bảo kê + sau khi MC mở quán cố định.
- Linh: nữ điều phối content social media của MC, slow-burn romance từ chương 80+.

ANTAGONISTS:
1. Chuỗi cơm văn phòng "Cơm Phượng" — đối thủ cạnh tranh giá rẻ, dùng nguyên liệu kém chất lượng. Conflict qua market share, KHÔNG combat.
2. Tập đoàn F&B lớn "Hoa Sao Group" — sau khi MC scale lên chuỗi nhà hàng, Hoa Sao copy concept + lobby health authority gây khó dễ.
3. Đối tác cũ "Lý Phong" — tự xưng đầu bếp gốc Quảng Đông, kiện MC đạo công thức.

PHASE ROADMAP (cho 600 chương):
PHASE 1 (1-50): Khởi nghiệp Cơm Hộp — từ 5 suất/ngày → 50 suất/ngày, dồn vốn mở quầy cố định.
PHASE 2 (51-200): Quán ăn vỉa hè đầu tiên + 2-3 quán Phượng Đô. Đối đầu chuỗi Cơm Phượng.
PHASE 3 (201-400): Chuỗi nhà hàng Phượng Đô + brand "Hệ Thống Đô Thị". Phá vỡ Hoa Sao Group.
PHASE 4 (401-600): Empire F&B Đại Nam — IPO, mở chi nhánh các thành phố khác, app delivery riêng.

ANTI-PATTERNS:
- KHÔNG combat (MC = đầu bếp + doanh nhân, không võ sĩ)
- KHÔNG harem (single love interest Linh slow-burn)
- KHÔNG huyền bí (golden finger = app smartphone, không tu-tiên / linh thạch / cảnh giới)
- KHÔNG copy paste công thức Earth → "công thức gia truyền độc quyền" — luôn có process MC adapt + thử + sửa
- KHÔNG instant master (skill nâng cấp cần thời gian + nhiệm vụ)

TONE: realistic + cozy + numbers-driven (P&L explicit) + slow-burn pacing.

CHAPTER STRUCTURE: 30% MC nấu nướng/test công thức + 30% bán hàng/khách hàng phản hồi + 25% kinh doanh tính toán/đối thủ + 15% gia đình/bạn bè/MC personal life.`,
    newSubGenres: ['kinh-doanh'],
    newGenre: 'do-thi',
    newMainCharacter: 'Trần Vũ',
    totalPlannedChapters: 600,
  },
  {
    oldSlug: 'dai-van-hao-da-vu-tru-tu-si-quy-cau-ta-update-chuong-moi',
    newTitle: 'Hệ Thống Cơ Hội: NEET Văn Khoa Khởi Nghiệp Phượng Đô',
    newSlug: 'he-thong-co-hoi-neet-van-khoa-khoi-nghiep-phuong-do',
    newDescription: 'Lê Mạnh Khang — sinh viên Văn Hóa Du Lịch tốt nghiệp Đại học Phượng Đô, NEET 4 tháng, kiếm sống bằng freelance content quảng cáo trong quán net Net Việt. Tài khoản 127K xu, hồ sơ gửi 37 chỗ không hồi âm. Một đêm khuya, pop-up "HỆ THỐNG CƠ HỘI" hiện ra trên màn hình — gợi ý hợp đồng cụ thể có tên công ty + người liên lạc + giá trị dự án. Mở khóa "Gợi Ý Nội Dung" → lên cấp Biên Tập Marketing → Quản Lý Dự Án → Studio Content riêng → Agency truyền thông Phượng Đô. Tone urban hustle realistic + slow-burn growth.',
    newWorldDescription: `BỐI CẢNH: Lê Mạnh Khang, 24 tuổi, tốt nghiệp Đại học Phượng Đô khoa Văn Hóa - Du Lịch. NEET 4 tháng, hồ sơ gửi 37 chỗ (công ty truyền thông, tòa soạn báo) đều "Chúng tôi sẽ liên hệ sau" — không ai gọi. Sống trong phòng trọ thuê ngõ 146 quận Cầu Giấy Phượng Đô. Tài khoản 127K xu, kiếm 5-6M/tháng từ freelance content nhỏ lẻ.

NGHỀ HIỆN TẠI (chương 1): freelance writer ở quán net Net Việt — bài quảng cáo cửa hàng thời trang online (3000 từ, 2M/bài), edit nội dung mạng xã hội, dịch thuật cơ bản. Mỗi tối ngồi quán net 4-5 tiếng gõ chữ.

GOLDEN FINGER — HỆ THỐNG CƠ HỘI:
Pop-up không-thể-đóng xuất hiện trên màn hình PC quán net (không phải app smartphone). Giao diện màu xanh dương, không quảng cáo. Cơ chế:
1. Hệ thống quét profile MC (CV, portfolio, kỹ năng) → đề xuất CƠ HỘI VIỆC LÀM CỤ THỂ với tên công ty + người liên lạc thật + giá trị dự án + thời hạn.
2. MC nắm bắt cơ hội → unlock TÍNH NĂNG MỚI khi viết:
   - "Gợi Ý Nội Dung" (level 1): suggest 3 hooks/intro cho mỗi bài
   - "Phân Tích Audience" (level 2): xác định target reader + pain points
   - "Tối Ưu SEO" (level 3): keyword density + LSI + meta description
   - "Storytelling Framework" (level 4): adapt Pixar/Hero's Journey/StoryBrand
   - "Brand Voice Lock" (level 5): consistency check across content
3. Mỗi cơ hội nắm bắt thành công → lên 1 LEVEL tổng + reward xu + cơ hội cao cấp hơn unlock.

CƠ CHẾ ESCALATION:
- Level 1-5: hợp đồng freelance 2-5M (Sáng Tạo Media + shop nhỏ)
- Level 6-10: agency mid-size, hợp đồng 10-30M (campaign launch, brand book)
- Level 11-15: agency lớn, hợp đồng 50-100M (TVC script, content strategy)
- Level 16-20: studio MC tự mở, B2B services Phượng Đô
- Level 21+: agency Đại Nam, IPO, đa chi nhánh

PHƯỢNG ĐÔ (fictional metropolis Đại Nam 2024):
- Quận Cầu Giấy: khu trọ sinh viên + freelancer
- Quận 1 đường Nguyễn Huệ: trung tâm thương mại + agency lớn
- Tòa Saigon Future Tower: HQ tập đoàn truyền thông
- Khu D2 quận 7: studio + sản xuất content
- Đường Lý Tự Trọng: chuỗi quán cà phê content creator hangout

CAST CHÍNH:
- Chị Thu — Quản lý dự án Sáng Tạo Media, hợp đồng đầu tay 5M cho campaign thời trang. Đánh giá MC tốt → giới thiệu thêm dự án.
- Trọng — bạn quán net cùng cảnh, hay vay tiền không trả. Conflict nhẹ.
- Khánh — bạn cùng quê (Hải Dương), làm IT tại Phượng Đô. Đối tác kỹ thuật khi MC build platform.
- Anh Hùng — sếp agency lớn "Brand Connect" (Phase 2 antagonist business rival).
- Mai — designer freelance Phượng Đô, slow-burn romance từ chương 100+.

ANTAGONISTS (KHÔNG combat):
1. Brand Connect Group — agency lớn copy chiến lược MC, talent poaching → MC face-slap qua chất lượng + community trust.
2. Hội Đồng Quảng Cáo Đại Nam — cấp phép agency, do tập đoàn lớn lobby. Indie studio MC bị chèn ép giấy phép.
3. Critic giả mạo / KOL được thuê review tiêu cực campaign MC.

PHASE ROADMAP (cho 600 chương):
PHASE 1 (1-50): Freelance hợp đồng đầu tay (5M) → khởi đầu portfolio + lên level 5.
PHASE 2 (51-200): Studio nhỏ 2-3 người + agency mid-size, brand campaign Phượng Đô.
PHASE 3 (201-400): Agency lớn, đa client, đối đầu Brand Connect.
PHASE 4 (401-600): Empire truyền thông Đại Nam, IPO, mở chi nhánh.

ANTI-PATTERNS:
- KHÔNG combat (MC = writer + agency owner)
- KHÔNG harem (single love interest Mai slow-burn)
- KHÔNG huyền bí (Hệ thống = pop-up software, không tu-tiên / đa vũ trụ / Thiên Đạo)
- KHÔNG instant rich (hợp đồng tăng dần level by level, MC vẫn fail dự án thi thoảng)
- KHÔNG copy plot Earth content gốc — MC adapt + Vietnamese context

TONE: urban hustle realistic + slow-burn growth + numbers-driven (P&L per project) + community-focused.

CHAPTER STRUCTURE: 35% MC viết content/sáng tạo + 25% client meetings/feedback + 20% kinh doanh/đối thủ + 20% MC personal (gia đình, bạn bè, đời thường Phượng Đô).`,
    newSubGenres: ['kinh-doanh'],
    newGenre: 'do-thi',
    newMainCharacter: 'Lê Mạnh Khang',
    totalPlannedChapters: 600,
  },
];

const MAX_PLANNED = 600;

async function regenerateStoryOutline(projectId: string, target: RealignTarget): Promise<void> {
  const cfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.75, maxTokens: 8192 };
  const prompt = `Bạn là biên tập viên xuất bản truyện mạng TQ. Thiết kế dàn ý chi tiết cho tiểu thuyết:

TIÊU ĐỀ: ${target.newTitle}
NHÂN VẬT CHÍNH: ${target.newMainCharacter}
GENRE: ${target.newGenre}${target.newSubGenres.length ? ` (sub: ${target.newSubGenres.join(', ')})` : ''}
WORLD: ${target.newWorldDescription.slice(0, 2500)}

Trả về JSON đầy đủ các trường (CANONICAL SCHEMA — dùng đúng tên field):
{
  "id": "string",
  "title": "${target.newTitle}",
  "genre": "${target.newGenre}",
  "premise": "1-2 câu premise cốt lõi (golden finger + setting + protagonist + main conflict)",
  "themes": ["theme1", "theme2", "theme3"],
  "mainConflict": "Xung đột chính xuyên suốt",
  "targetChapters": ${target.totalPlannedChapters},
  "protagonist": {
    "name": "${target.newMainCharacter}",
    "startingState": "Tình trạng + nghề + tài sản + quan hệ chương 1 (theo world_description)",
    "endGoal": "Mục tiêu cuối cùng",
    "characterArc": "Hành trình growth qua 4 phase"
  },
  "majorPlotPoints": [
    {"chapter": 1, "event": "Sự kiện chương 1 — kích hoạt golden finger / hook"},
    {"chapter": 50, "event": "..."},
    {"chapter": 200, "event": "..."},
    {"chapter": 400, "event": "..."},
    {"chapter": 600, "event": "..."}
  ],
  "endingVision": "Tầm nhìn kết thúc",
  "uniqueHooks": ["hook1 đặc trưng", "hook2", "hook3"]
}

YÊU CẦU CỨNG:
- protagonist.name PHẢI là "${target.newMainCharacter}"
- premise + mainConflict + majorPlotPoints PHẢI reflect đúng world_description
- KHÔNG combat / KHÔNG tu-tiên / KHÔNG harem
- majorPlotPoints có ≥6 events theo phase roadmap

Trả JSON thuần (không markdown).`;
  const res = await callGemini(prompt, cfg);
  const parsed = parseJSON<StoryOutline>(res.content);
  if (!parsed) throw new Error('story_outline parseJSON returned null');
  const outline = validateStoryOutlineOrThrow(parsed, `realign[${target.newSlug}]`);
  if (outline.protagonist) outline.protagonist.name = target.newMainCharacter;
  const { error } = await s.from('ai_story_projects').update({ story_outline: outline }).eq('id', projectId);
  if (error) throw new Error(`save story_outline failed: ${error.message}`);
}

async function regenerateMasterOutline(projectId: string, target: RealignTarget): Promise<void> {
  const cfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.7, maxTokens: 4096 };
  const cappedTotal = Math.min(target.totalPlannedChapters, MAX_PLANNED);
  let master = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    master = await generateMasterOutline(projectId, target.newTitle, target.newGenre, target.newWorldDescription, cappedTotal, cfg);
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

async function ensureFreshQuota(projectId: string): Promise<void> {
  const vnDate = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  await s.from('project_daily_quotas').update({
    written_chapters: 0, status: 'active', next_due_at: new Date().toISOString(),
    retry_count: 0, last_error: null, updated_at: new Date().toISOString(),
  }).eq('project_id', projectId).eq('vn_date', vnDate);
}

async function realign(target: RealignTarget): Promise<void> {
  console.log(`\n▶ Realigning: ${target.oldSlug}`);
  console.log(`  → New title: ${target.newTitle}`);
  console.log(`  → New slug: ${target.newSlug}`);

  // 1. Look up novel + project
  const { data: novel } = await s.from('novels').select('id').eq('slug', target.oldSlug).maybeSingle();
  if (!novel?.id) {
    console.log(`  ✗ Novel not found: ${target.oldSlug}`);
    return;
  }
  const novelId = novel.id as string;
  const { data: project } = await s.from('ai_story_projects').select('id').eq('novel_id', novelId).maybeSingle();
  if (!project?.id) {
    console.log(`  ✗ Project not found for novel ${novelId}`);
    return;
  }
  const projectId = project.id as string;

  // 2. UPDATE novels: title + slug + description
  const { error: novelErr } = await s.from('novels').update({
    title: target.newTitle,
    slug: target.newSlug,
    description: target.newDescription,
    genres: [target.newGenre],
    updated_at: new Date().toISOString(),
  }).eq('id', novelId);
  if (novelErr) throw new Error(`novel update failed: ${novelErr.message}`);
  console.log(`  ✓ novels updated (title + slug + description)`);

  // 3. UPDATE ai_story_projects: world_description + sub_genres + main_character + clear outlines
  const { error: projErr } = await s.from('ai_story_projects').update({
    world_description: target.newWorldDescription,
    sub_genres: target.newSubGenres,
    main_character: target.newMainCharacter,
    genre: target.newGenre,
    total_planned_chapters: target.totalPlannedChapters,
    story_outline: null,
    master_outline: null,
  }).eq('id', projectId);
  if (projErr) throw new Error(`project update failed: ${projErr.message}`);
  console.log(`  ✓ ai_story_projects updated (world_description + sub_genres, outlines cleared)`);

  // 4. Regenerate story_outline (canonical schema)
  console.log(`  → Regenerating story_outline...`);
  await regenerateStoryOutline(projectId, target);
  console.log(`  ✓ story_outline regenerated`);

  // 5. Regenerate master_outline aligned with new world_description
  console.log(`  → Regenerating master_outline...`);
  await regenerateMasterOutline(projectId, target);

  // 6. Reset today's quota so cron picks up
  await ensureFreshQuota(projectId);
  console.log(`  ✓ quota reset for today — cron continues writing chapters`);

  console.log(`  URL: https://truyencity.com/truyen/${target.newSlug}`);
}

async function main(): Promise<void> {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  REALIGN: 2 drifted novels metadata → match content`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  for (const target of TARGETS) {
    try {
      await realign(target);
    } catch (e) {
      console.error(`  ✗ Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\n✓ Done. Existing chapters preserved. Future chapters will continue under new aligned metadata.`);
}

main().catch(console.error);
