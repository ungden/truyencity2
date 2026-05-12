/**
 * Spawn novel "Mạt Thế: Ta Có Hầm Trú Ẩn Vạn Năng".
 * Genre: mat-the (doomsday hoarding sub-genre).
 * Created 2026-05-12 as Gemini-routing test novel.
 *
 * Workflow after spawn:
 *   1. ./node_modules/.bin/tsx scripts/spawn-mat-the-ham-tru-an.ts --apply
 *   2. mass-instantiate-templates: maps title → mat-the-doomsday-hoarder template
 *   3. GEMINI_TEST_KEY=... npx tsx scripts/_drive-mat-the-gemini.ts (drives setup via Gemini)
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const SEED = {
  title: 'Mạt Thế: Ta Có Hầm Trú Ẩn Vạn Năng',
  slug: 'mat-the-ta-co-ham-tru-an-van-nang',
  genre: 'mat-the' as const,
  main_character: 'Lương Hạo',
  description: 'Một đêm tháng Tư 2027, thiên thạch màu xanh va xuống Hà Nội — nhân loại 99% nhiễm zombie virus trong 72 giờ. Lương Hạo, kỹ sư kho vận 28 tuổi, mở mắt thấy app "Hầm Trú Ẩn Vạn Năng" trong điện thoại: mỗi món hàng quét QR là copy vào kho ảo vô hạn, có thể rút ra ở bất kỳ đâu, hồi phục độ tươi. Đối với người khác mạt thế là tận thế — với Hạo, đó là thương vụ thế kỷ.',
  world_description: `Hà Nội 2027 sau ngày D+72: 99% dân nhiễm zombie virus T-Aurora (đến từ thiên thạch xanh). Người sống sót chia thành 3 tầng:
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

Phase 4 (ch.600-1000): cosmic reveal — T-Aurora là test selection của "Cosmic Civilization Bureau". Top 1000 survivor toàn cầu được mời gia nhập. Endgame: MC cứu Hương + tích đủ "cosmic point" để mua "Resurrection Token" hồi sinh đồng đội cũ.`,
  total_planned_chapters: 1000,
};

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Spawn: ${SEED.title}  ${apply ? '[APPLY]' : '[DRY RUN]'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const { data: existing } = await s.from('novels').select('id').eq('slug', SEED.slug).maybeSingle();
  if (existing) {
    console.log(`Slug "${SEED.slug}" already exists — skip.`);
    return;
  }

  if (!apply) {
    console.log('Title:           ', SEED.title);
    console.log('Slug:            ', SEED.slug);
    console.log('Genre:           ', SEED.genre);
    console.log('MC:              ', SEED.main_character);
    console.log('Description len: ', SEED.description.length, 'chars');
    console.log('World desc len:  ', SEED.world_description.length, 'chars');
    console.log('\nDRY RUN. Pass --apply to execute.\n');
    return;
  }

  const ownerId = await getOwnerId();

  const { data: novel, error: novelErr } = await s.from('novels').insert({
    title: SEED.title,
    slug: SEED.slug,
    author: 'Truyện City',
    description: SEED.description,
    genres: [SEED.genre],
    status: 'Đang ra',
  }).select('id').single();
  if (novelErr || !novel) throw new Error(`novel: ${novelErr?.message}`);
  console.log(`✓ novel ${novel.id}`);

  const { data: project, error: projErr } = await s.from('ai_story_projects').insert({
    novel_id: novel.id,
    user_id: ownerId,
    genre: SEED.genre,
    main_character: SEED.main_character,
    world_description: SEED.world_description,
    total_planned_chapters: SEED.total_planned_chapters,
    current_chapter: 0,
    status: 'paused',
    pause_reason: 'gemini_test_2026-05-12',
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    temperature: 0.75,
    target_chapter_length: 2800,
    ai_model: 'gemini-3.1-flash-lite',
    style_directives: { disable_chapter_split: true },
  }).select('id').single();
  if (projErr || !project) throw new Error(`project: ${projErr?.message}`);
  console.log(`✓ project ${project.id}`);
  console.log(`\nNext: instantiate chapter_blueprints, then drive setup via Gemini.`);
  console.log(`Project ID: ${project.id}`);
  console.log(`Novel ID:   ${novel.id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
