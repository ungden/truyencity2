/**
 * Spawn flagship novel "Aniki" — do-thi mỹ-thực + trọng-sinh kinh-doanh blend.
 *
 * Concept (approved plan 2026-05-30): MC trọng sinh về Sài Gòn ~2010, kiếp trước
 * đi XKLĐ Nhật học nghề bếp + vận hành nhà hàng, nay về mở nhà hàng concept Nhật
 * tại 112 Trần Khắc Chân, P. Tân Định (quán CÓ THẬT ngoài đời — verbatim CTA),
 * đón đầu sóng đồ Nhật ở VN rồi mở rộng thành chuỗi/đế chế. Marketing tie-in:
 * mô tả tinh túy từng món ăn (food-porn) + dẫn độc giả tới quán thật.
 *
 * Genre do-thi (NON_COMBAT) + topic do-thi-my-thuc. Golden finger = tay nghề +
 * ký ức tương lai (KHÔNG huyền bí). mcOrigin=reincarnated.
 *
 * This is a BARE-ROW spawn (no auto-gen outline). Setup is authored by Claude
 * (setup_source=claude_code) and persisted via scripts/cc-apply-setup.ts, which
 * makes setup-pipeline.ts skip all auto-gen stages. Per-chapter writing then runs
 * on deepseek-v4-pro via the write-chapters cron.
 *
 * Workflow after spawn:
 *   1. npx tsx scripts/spawn-aniki.ts --apply        (capture projectId + novelId)
 *   2. craft blueprints/<projectId>/setup/* (8 artifacts)
 *   3. npx tsx scripts/cc-apply-setup.ts <projectId> <projectId>   (dry-run → --apply)
 *   4. write+audit ch.1-3 via scripts/write-chapter-flash.ts
 *   5. cover (Codex CLI) → toggle-production on
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
  title: 'Aniki: Trọng Sinh Mở Nhà Hàng Nhật Giữa Lòng Sài Gòn',
  slug: 'aniki-trong-sinh-mo-nha-hang-nhat-giua-long-sai-gon',
  genre: 'do-thi' as const,
  topic_id: 'do-thi-my-thuc',
  main_character: 'Trần Gia Khang',
  // Interim description — cc-apply-setup ghi đè bằng description.md craft tay.
  description: 'Một kiếp Trần Gia Khang đi xuất khẩu lao động ở Nhật, từ thằng rửa bát trong góc bếp izakaya Osaka leo lên bếp chính, học tới tận xương tủy nghề nấu lẫn cách vận hành một nhà hàng. Kiệt sức gục xuống giữa ca đêm, anh mở mắt lại ở Sài Gòn năm 2010 — lúc đồ Nhật ở Việt Nam còn lạ lẫm, lúc một tô ramen đúng vị vẫn là thứ xa xỉ. Với đôi tay đã quen dao thớt và cả một kho ký ức về những cơn sóng ẩm thực sắp ập tới, Khang mở một quán nhỏ mang tên Aniki ở 112 Trần Khắc Chân, Phường Tân Định. Từ đĩa cơm cá hồi áp chảo bốc khói tới bát ramen nước dùng hầm mười hai tiếng, mỗi món ăn là một lời mời gọi — và là viên gạch đầu tiên cho một đế chế ẩm thực.',
  // Interim world_description ≥500 chars để spawn hợp lệ; cc-apply-setup ghi đè bằng world.md.
  world_description: `Sài Gòn năm 2010 — thành phố của xe máy chen chúc, quán nhậu vỉa hè khói nướng mù mịt, cà phê bệt và những con hẻm chật. Văn hóa ẩm thực Nhật ở Việt Nam thời điểm này còn sơ khai: sushi bị xem là "cá sống đắt tiền", ramen gần như chưa ai biết tới, izakaya là khái niệm xa lạ. Chỉ vài năm sau, một cơn sóng đồ Nhật sẽ tràn vào — ramen, izakaya, omakase, đồ ăn vặt Nhật — và ai bắt sóng trước sẽ thắng.

Trần Gia Khang (sinh 1985) ở kiếp trước đi xuất khẩu lao động sang Nhật năm 2005, lăn lộn mười lăm năm từ chân rửa bát ở một izakaya nhỏ tại Osaka, lên phụ bếp, rồi bếp chính của một quán ramen có tiếng tại Tokyo. Anh thấm cả hai mặt: kỹ thuật bếp Nhật chuẩn mực (dashi, nước dùng tonkotsu, cách áp chảo, cách thái cá) lẫn nghệ thuật vận hành nhà hàng (quản lý nguyên liệu, chi phí, nhân sự, khẩu vị khách, marketing F&B). Một đêm kiệt sức giữa ca, anh gục xuống — và tỉnh lại trong thân xác chính mình năm 2010, vừa về Việt Nam, trong túi còn chút vốn liếng.

Golden finger của Khang KHÔNG phải hệ thống huyền bí: đó là chính tay nghề đã luyện thành bản năng cộng ký ức về tương lai (biết trước trend nào sẽ bùng, nguyên liệu nào sẽ khan, cách bản địa hóa món Nhật cho khẩu vị Việt). Anh mở quán Aniki — một izakaya kiêm quán cơm nhỏ tại 112 Trần Khắc Chân, Phường Tân Định, Quận 1 (địa chỉ CÓ THẬT). Quán bán cơm cá hồi, udon, ramen, đồ nướng kiểu izakaya, đồ nhậu.

Vòng lặp thế giới (do-thi, hiện thực, NON_COMBAT): cơ hội hoặc khẩu vị thị trường → Khang ra món hoặc quyết định kinh doanh → payoff đo được (doanh thu, khách quay lại, đơn đặt tiệc, hợp đồng nguồn hàng, review hoặc uy tín) → mở cơ hội lớn hơn. Đối thủ là competitor (quán khác, chuỗi lớn) phản ứng QUA thị trường — cạnh tranh giá, tranh nguồn hàng, PR, pháp lý — KHÔNG bao giờ bằng bạo lực hay hắc bang.

Tiến trình: quán đơn 112 Trần Khắc Chân → quán đông khách → chi nhánh 2 → chuỗi Aniki → thương hiệu F&B Nhật hàng đầu Việt Nam → (xa) vươn khu vực. Mỗi arc gắn một cột mốc có con số cụ thể.`,
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
    console.log(`Slug "${SEED.slug}" already exists — skip. novel=${existing.id}`);
    const { data: proj } = await s.from('ai_story_projects').select('id').eq('novel_id', existing.id).maybeSingle();
    if (proj) console.log(`Project ID: ${proj.id}\nNovel ID:   ${existing.id}`);
    return;
  }

  if (!apply) {
    console.log('Title:           ', SEED.title);
    console.log('Slug:            ', SEED.slug);
    console.log('Genre:           ', SEED.genre);
    console.log('Topic:           ', SEED.topic_id);
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
    topic_id: SEED.topic_id,
    main_character: SEED.main_character,
    world_description: SEED.world_description,
    total_planned_chapters: SEED.total_planned_chapters,
    current_chapter: 0,
    status: 'paused',
    pause_reason: 'aniki_flagship_setup_pending',
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    temperature: 0.75,
    target_chapter_length: 2800,
    ai_model: 'deepseek-v4-pro',
    style_directives: { disable_chapter_split: true, topic_id: SEED.topic_id },
  }).select('id').single();
  if (projErr || !project) throw new Error(`project: ${projErr?.message}`);
  console.log(`✓ project ${project.id}`);
  console.log(`\nNext: craft blueprints/${project.id}/setup/* then cc-apply-setup.`);
  console.log(`Project ID: ${project.id}`);
  console.log(`Novel ID:   ${novel.id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
