/**
 * Spawn 1 LITERARY GENESIS novel — canonical TQ trope 文笔造世 / 文创流.
 *
 * Sub-genre: 'viet-van-sang-the' — MC mang thư viện Earth (tiểu thuyết
 * + phim + manga + sử thi) sang chép qua portal Thiên Đạo Thư Viện;
 * tu sĩ / kiếm khách / pháp sư từ các thế giới khác đọc truyện của MC
 * "nhập tâm" → lĩnh ngộ chiêu thức / công pháp / vũ khí từ tiểu thuyết
 * → đem về thế giới họ chiến đấu / đột phá.
 *
 * Top examples (canonical TQ): 《我有一座洪荒书院》《我的书友是诸天大佬》
 *
 * Engine sảng văn: dramatic irony — tu sĩ Kim Đan / Nguyên Anh / Hóa
 * Thần QUỲ chờ MC update chương mới (depend on MC chapters as source
 * of breakthrough). MC = AUTHOR thuần, KHÔNG combat.
 *
 * Status: 'Đang ra' (VN canonical) so homepage filters surface it.
 *
 * Usage: ./node_modules/.bin/tsx scripts/spawn-literary-genesis.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateMasterOutline } from '@/services/story-engine/pipeline/master-outline';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
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
  title: 'Đại Văn Hào Đa Vũ Trụ: Tu Sĩ Quỳ Cầu Ta Update Chương Mới',
  slug: 'dai-van-hao-da-vu-tru-tu-si-quy-cau-ta-update-chuong-moi',
  genre: 'do-thi',
  sub_genres: ['viet-van-sang-the'],
  main_character: 'Lê Mạnh Khang',
  description: 'Lê Mạnh Khang — sinh viên Văn khoa Đại học Quốc gia Hà Nội, NEET 1 năm sau tốt nghiệp, cuồng đọc văn học Đông-Tây-Cổ-Kim. Một đêm ngủ dậy, máy tính cũ phát ra cổng Thiên Đạo Thư Viện — tu sĩ Cửu Châu Đại Lục, kiếm khách Hắc Sa Lục, pháp sư đại lục Aurelia... vào đọc tiểu thuyết MC chép từ Earth. Đọc nhập tâm = lĩnh ngộ chiêu thức / công pháp / vũ khí. Tu sĩ Kim Đan đọc Tam Quốc → ngộ "Trường Bản Pha Thất Tiến Thất Xuất". Pháp sư Aurelia đọc Harry Potter → tự tạo Wand-Lore tông phái mới. MC = AUTHOR thuần, không combat — face-slap qua chương mới release đè bẹp đối thủ.',
  world_description: `BỐI CẢNH: Lê Mạnh Khang, 24 tuổi, sinh viên Văn khoa Đại học Quốc gia Hà Nội tốt nghiệp 1 năm, hiện NEET ở căn hộ thuê 18m² tại quận Cầu Giấy. Cuồng đọc văn học từ thiếu niên — đã đọc Tam Quốc Diễn Nghĩa, Tây Du Ký, Thủy Hử, Hồng Lâu Mộng (cả 4 đại danh tác Trung Hoa); Truyện Kiều, Lục Vân Tiên, Chinh Phụ Ngâm (văn học VN); Lord of the Rings, Harry Potter, A Song of Ice and Fire (Western fantasy); One Piece, Naruto, Slam Dunk, Death Note (manga); Sherlock Holmes, Agatha Christie (trinh thám). Nhớ TUYỆT ĐỐI từng cảnh, từng chiêu, từng câu thoại.

GOLDEN FINGER — THIÊN ĐẠO THƯ VIỆN:
Một đêm sau khi đọc xong Hồng Lâu Mộng lần thứ 7, máy tính Dell cũ thừa kế từ ông nội phát sáng → hiện ra "Thiên Đạo Thư Viện System". MC ngồi trước laptop type chương → chương xuất hiện trong Thư Viện cosmic-scale → độc giả từ vạn giới đến đọc.

CƠ CHẾ "NHẬP TÂM" READING:
- Reader đọc tiểu thuyết MC chép → nếu đủ kiến tính + linh tâm tương thích, "nhập tâm" thành nhân vật → trải nghiệm full plot từ POV nhân vật (1 chương 30 phút thực = vài năm in-book) → ngộ chiêu thức/công pháp/triết lý → mang về thế giới họ thực hành = breakthrough cảnh giới.
- Tu sĩ Kim Đan Cửu Châu đọc Tam Quốc Diễn Nghĩa nhập tâm Triệu Vân → ngộ "Trường Bản Pha Thất Tiến Thất Xuất" body-control kiếm pháp.
- Pháp sư Aurelia đọc Harry Potter nhập tâm Snape → tự tạo Wand-Lore "Pháp Trượng Tâm Linh" tông phái mới.
- Kiếm khách Hắc Sa đọc Tiếu Ngạo Giang Hồ nhập tâm Lệnh Hồ Xung → ngộ "Độc Cô Cửu Kiếm".
- Đệ tử ngoại môn đọc Đấu Phá Thương Khung nhập tâm Tiêu Viêm → ngộ "Phần Quyết" hỏa diễm hệ.
- Hiệp khách Tây Vực đọc One Piece nhập tâm Luffy → ngộ Haki (Bá Vương Sắc).
- Trinh thám Sherlock Holmes → reader ngộ "Khoa Học Suy Luận" (hệ thống điều tra mới).

ĐA VŨ TRỤ READER ECOSYSTEM:
1. CỬU CHÂU ĐẠI LỤC (TQ tu-tiên): tu sĩ Luyện Khí → Hóa Thần. 7 đại tông môn (Thanh Vân, Thiên Long, Vạn Hoa, Linh Đan, Hắc Phong, Tử Hà, Kim Quang). Đọc nhiều: Tam Quốc, Tây Du, Thủy Hử, kiếm hiệp Kim Dung.
2. HẮC SA LỤC (võ-lâm cổ): kiếm khách + sát thủ + bang phái. Đọc nhiều: Tiếu Ngạo Giang Hồ, Thiên Long Bát Bộ, Anh Hùng Xạ Điêu.
3. AURELIA (Western fantasy): mage + knight + elf + dwarf. Đọc Harry Potter, LOTR, Game of Thrones (đọc qua bản dịch tự động Thư Viện).
4. TÂY VỰC (anime/manga style): hiệp khách hành tẩu, biển đảo. Đọc One Piece, Naruto, Bleach.
5. THẦN GIỚI THƯỢNG CỔ: cổ thần + tiên đế đã biến mất triệu năm. Đọc Hồng Lâu Mộng (philosophy), Tử Vi Đẩu Số (cosmology), Trường Hận Ca (poetic).

NHÂN VẬT MC:
- Lê Mạnh Khang — 24, sinh viên Văn khoa NEET, sống một mình ở Hà Nội. Cha mẹ ở quê Hải Dương, em gái đang học cấp 3.
- Personality: hiền, trầm, đam mê đọc, thẳng thắn nhận xét văn chương. KHÔNG ngạo mạn — MC thấy mình "chỉ là người chép văn", các tác giả gốc mới là thiên tài.
- Skill cốt lõi: NHỚ chính xác cốt truyện + đối thoại + chiêu thức + tên nhân vật + thế giới quan của 1000+ tác phẩm Earth. KHÔNG biết võ, KHÔNG biết tu vi.
- Bối cảnh nghề: tốt nghiệp Văn khoa với luận văn về "Tam Quốc Diễn Nghĩa: Cấu trúc Bi kịch Anh hùng".
- Tài sản ban đầu: căn hộ thuê 3 triệu/tháng, laptop Dell cũ, kệ sách 500+ cuốn, 50 triệu VND tiết kiệm.

DRAMATIC IRONY ENGINE (cốt lõi):
- Tu sĩ Kim Đan Cửu Châu (đại lão 300 tuổi) chờ chương mới của MC release để đột phá Nguyên Anh. MC ngồi máy lạnh ăn mì gói gõ phím vô tư.
- Pháp sư Aurelia tự xưng "đệ tử bậc nhất của Đại Thần Lê Mạnh Khang" — MC đang đi mua trà sữa.
- Kiếm khách Hắc Sa hỏi MC trong forum "Đại Thần ơi cho em hỏi 'Trường Bản Pha' của Triệu tướng quân là kiếm pháp thuộc nội gia hay ngoại gia?" — MC trả lời "ờ tùy bạn cảm nhận thôi" → reader chấn động "Đại Thần để chúng ta tự ngộ".
- Cộng đồng forum đa vũ trụ + meme + theory crafting về tác phẩm MC chép.

ANTAGONIST DESIGN (KHÔNG combat MC):
1. RIVAL TÁC GIẢ ĐA VŨ TRỤ: 1-2 author khác cũng có Thiên Đạo Thư Viện access (đối thủ trọng sinh / hậu duệ Văn Thần) → cạnh tranh viết tác phẩm hay nhất → MC face-slap qua catalog Earth tốt hơn (Tây Du > tác phẩm rival's "Thần Khỉ Du Ký Truyền Kỳ" tự sáng tác).
2. ĐẠO TẶC VĂN HỌC: tu sĩ đọc xong tự xuất bản "Tam Quốc Diễn Nghĩa: Triệu Vân Truyện" claim mình tác giả → cộng đồng đa vũ trụ phát hiện qua mismatch chi tiết → MC win.
3. MISINTERPRETATION CRISIS: tu sĩ đọc nhầm Hồng Lâu Mộng thành "tu vi pháp môn" → đột phá sai → MC release chương "thuyết minh" để correct.
4. CỔ THẦN AWAKENING: cổ thần thượng cổ đọc chương MC → bị "trigger" thức tỉnh → muốn "thưởng MC" bằng cách đem MC về thiên giới (forced ascension threat).

PHẢN DIỆN CẤM:
- Rival author đến PvP MC qua "duel viết văn trên đài" childish.
- Tu sĩ đại lão đến đập MC để "cướp Thư Viện" — Thư Viện không thể cướp (system bound).
- MC bị forced reveal identity public ở Earth (phá personality lock — MC ẩn cư NEET).

PHASE ROADMAP (cấu trúc 4 phase cho 600 chương):

PHASE 1 (ch.1-50) — TÂN THỦ + TAM QUỐC ARC:
- MC chép Tam Quốc Diễn Nghĩa làm tác phẩm đầu (chương "Liên hoàn kế Hỏa Thiêu Xích Bích" → tu sĩ Kim Đan ngộ trận pháp).
- Reader đầu tiên: tu sĩ Trúc Cơ tên "Trần Hạo" (Cửu Châu) — đại diện cho engine "Đại lão thấp tầng" cảm khái.
- Forum đa vũ trụ tâng MC làm "Đại Văn Thần".

PHASE 2 (ch.51-200) — TÂY DU + KIẾM HIỆP + HARRY POTTER MULTI-WORK:
- Release Tây Du Ký song song → tu sĩ ngộ "72 Phép Biến Hóa", pháp sư Aurelia ngộ Transfiguration.
- Tiếu Ngạo Giang Hồ → kiếm khách Hắc Sa ngộ Độc Cô Cửu Kiếm.
- Harry Potter → Wand-Lore tông phái mới ở Aurelia.
- MC build forum + chat group đa vũ trụ.

PHASE 3 (ch.201-400) — ĐẠI VĂN HÀO + RIVAL AUTHOR:
- Release ASoIaF + One Piece + Naruto + Hồng Lâu Mộng concurrent.
- Rival author Cửu Châu xuất hiện (hậu duệ Văn Thần thượng cổ) — cạnh tranh views/đệ tử.
- MC hợp tác với 1-2 reader đại lão (Trần Hạo từ Cửu Châu, Magus Aldric từ Aurelia) thành "đại đệ tử" (proxy).

PHASE 4 (ch.401-600) — THIÊN ĐẠO + COSMIC SCALE:
- Cổ thần thượng cổ awaken → forced ascension threat.
- MC negotiate qua việc release "tác phẩm cosmic" (Hồng Lâu Mộng version philosophical, Tử Vi Đẩu Số astrology).
- MC trở thành Thiên Đạo Văn Khố Quản Lý — không lên thiên giới, vẫn ở Earth.

TONE: light comedy + dramatic irony + literary nostalgia + multi-cultural celebration. Match phase: phase 1-2 underdog NEET, phase 3 mogul + community leader, phase 4 cosmic visionary.

CHAPTER STRUCTURE: 25% MC writing chapters (recreation Earth content) + 35% reader nhập tâm experience (tu sĩ POV trải nghiệm tác phẩm) + 25% multi-verse forum/community reactions + 15% MC Earth life (gia đình, bạn bè, đi mua đồ ăn).

ANTI-PATTERNS: KHÔNG MC combat, KHÔNG MC thực sự tu luyện, KHÔNG copy plot 100% (phải có VN/Á Đông angle khi adapt), KHÔNG harem tu sĩ nữ (single love interest slow-burn — biên tập nhà xuất bản ở Earth chương 80+).`,
  total_planned_chapters: 600,
};

// ── Helpers (same as spawn-pure-game-studio.ts) ──────────

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

Trả về JSON với schema:
{
  "protagonist": { "name": "...", "background": "...", "motivation": "..." },
  "supportingCast": [{"name":"...", "role":"...", "personality":"..."}],
  "powerSystem": { "name": "...", "rules": "..." },
  "antagonists": [{"name":"...", "role":"...", "scale":"..."}],
  "openingHook": "Ch.1 mở thế nào để hook reader trong 3 trang đầu",
  "majorThemes": ["...", "..."],
  "settingDetails": "..."
}

YÊU CẦU CỨNG:
- protagonist.name PHẢI là "Lê Mạnh Khang" (KHÔNG đổi tên)
- antagonists đúng theo world_description (Rival author + Đạo tặc văn học + Cổ thần threat)
- KHÔNG combat / KHÔNG MC thực sự tu luyện / KHÔNG harem
- powerSystem = Thiên Đạo Thư Viện theo world_description

Trả JSON thuần (không markdown).`;
  const res = await callGemini(prompt, cfg);
  const outline = parseJSON<StoryOutline>(res.content);
  if (!outline) throw new Error('story_outline parseJSON returned null');
  if (outline.protagonist) outline.protagonist.name = seed.main_character;
  const { error } = await s.from('ai_story_projects').update({ story_outline: outline }).eq('id', projectId);
  if (error) throw new Error(`save story_outline failed: ${error.message}`);
}

async function createNovelAndProject(seed: NovelSeed, ownerId: string): Promise<string> {
  const { data: novel, error: novelErr } = await s.from('novels').insert({
    title: seed.title,
    slug: seed.slug,
    author: 'Truyện City',
    description: seed.description,
    genres: [seed.genre],
    status: 'Đang ra',
  }).select('id').single();
  if (novelErr || !novel) throw new Error(`novel insert failed: ${novelErr?.message}`);
  console.log(`  ✓ Novel created: ${novel.id}`);

  const styleDirectives: Record<string, unknown> = {
    disable_chapter_split: true,
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
  // DeepSeek occasionally returns master_outline shape without majorArcs.
  // Retry up to 3 times before giving up.
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

async function ensureFreshQuota(projectId: string): Promise<void> {
  const vnDate = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: existing } = await s.from('project_daily_quotas')
    .select('vn_date').eq('project_id', projectId).eq('vn_date', vnDate).maybeSingle();
  if (existing) {
    await s.from('project_daily_quotas').update({
      written_chapters: 0, status: 'active', next_due_at: new Date().toISOString(),
      retry_count: 0, last_error: null, updated_at: new Date().toISOString(),
    }).eq('project_id', projectId).eq('vn_date', vnDate);
    console.log(`  ✓ Quota for ${vnDate} reset`);
  } else {
    console.log(`  ℹ No quota row yet for ${vnDate} — cron will create one on next tick`);
  }
}

async function main(): Promise<void> {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  SPAWN: Literary Genesis (canonical 文笔造世)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const { data: existing } = await s.from('novels').select('id').eq('slug', SEED.slug).maybeSingle();
  if (existing) {
    console.log(`✗ Novel with slug "${SEED.slug}" already exists (id=${existing.id}). Aborting.`);
    return;
  }

  const ownerId = await getOwnerId();
  console.log(`Owner: ${ownerId}\n`);
  console.log(`▶ [${SEED.genre} / sub: ${SEED.sub_genres?.join(',')}] ${SEED.title}`);

  try {
    const projectId = await createNovelAndProject(SEED, ownerId);
    await generateOutlines(projectId, SEED);
    await activateProject(projectId);
    await ensureFreshQuota(projectId);
    console.log(`\n✓ Done. Cron will write ch.1 within next */5 tick.`);
    console.log(`  URL: https://truyencity.com/truyen/${SEED.slug}`);
  } catch (e) {
    console.error(`✗ Failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

main().catch(console.error);
