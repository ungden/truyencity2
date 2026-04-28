/**
 * Phase 20A: Spawn 1 representative novel for each new genre / topic / sub-rule.
 *
 * Each novel is created with:
 *  - status='paused' initially
 *  - outlines (story_outline + master_outline) generated via DeepSeek
 *  - style_directives.disable_chapter_split = true (uncut original AI length)
 *  - then status='active' so cron picks up
 *
 * After spawn, cron writes up to DAILY_CHAPTER_QUOTA=20 ch/day per project.
 * Initial 20 chapters arrive within 1 day; then steady state continues.
 *
 * Usage: ./node_modules/.bin/tsx scripts/spawn-phase20-representatives.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });

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

// 10 representative seeds covering the highest-value new genres / topics / overlays
const SEEDS: NovelSeed[] = [
  // ── 3 NEW TOP-LEVEL GENRES ──
  {
    title: 'Văn Phòng 13: Quy Tắc Sinh Tồn Sau 6h Tối',
    slug: 'van-phong-13-quy-tac-sinh-ton-sau-6h-toi',
    genre: 'quy-tac-quai-dam',
    topic_id: 'quy-tac-van-phong',
    main_character: 'Nguyễn Hoàng',
    description: 'Nhân viên mới đi làm ngày đầu tại tập đoàn Saigon Future Tower, nhận sổ tay nội quy 12 điều. Sau 18h cổng ra đóng kín, tầng 13 không có trên thang máy, đồng nghiệp tăng ca có thêm 1 ngón tay. MC chỉ có Hệ Thống Nhắc Nhở (nhìn ra dòng chữ đỏ chỉ quy tắc giả) để sinh tồn.',
    world_description: 'Bối cảnh: Saigon Future Tower — toà nhà 30 tầng kiểu Future của tập đoàn công nghệ tại trung tâm Hải Long Đô, năm 2024. Ban ngày văn phòng hiện đại bình thường (máy pha cà phê, máy in, đèn neon, đồng nghiệp văn phòng trẻ). Sau 18h biến dị: tầng 13 không nút thang máy, máy in tự in giấy, đồng hồ luôn 3:15, đồng nghiệp gõ phím nhưng màn hình tắt. MC sinh tồn bằng quy tắc + IQ. NPC quái dị giả người (vest, thẻ nhân viên, ngồi máy tính) nhưng SAI 1 chi tiết (răng đều, không chớp mắt, có 6 ngón). Hệ thống MC: nhìn dòng chữ đỏ chỉ quy tắc giả. Cấu trúc: 8 phó bản đời thường, mỗi 20 chương theo 4 hồi chuẩn.',
    total_planned_chapters: 200,
  },
  {
    title: 'Slime Của Ta Nuốt Cả Rồng',
    slug: 'slime-cua-ta-nuot-ca-rong',
    genre: 'ngu-thu-tien-hoa',
    topic_id: 'ngu-thu-hoc-vien',
    main_character: 'Lâm Uyên',
    description: 'Sinh viên năm cuối Học Viện Ngự Thú Vạn Linh, bị xếp lớp đồng thấp nhất, nhận con slime "phế vật" miễn phí. Nhờ Bàn Tay Vàng nhìn thấu Tuyến Tiến Hóa Ẩn, MC đột biến slime thành Thôn Phệ Tinh Không Cự Thú — đè bẹp đám tiểu thư cưỡi rồng phượng trong các giải đấu liên trường.',
    world_description: 'Bối cảnh: Vạn Linh Đại Lục — đại lục ngự thú sư, nơi sức mạnh đến từ pet đột biến. Học Viện Vạn Linh phân lớp theo cấp pet: lớp đồng (F-D), bạc (C-B), vàng (A-S), kim cương ẩn (SSS). MC bị xếp lớp đồng vì pet "phế vật". Hệ thống đột biến BOM: mỗi pet có công thức tiến hóa cụ thể (3-5 nguyên liệu). 3 quy tắc đột biến skill: khuếch đại số/phạm vi, xoá cooldown, bẻ logic. Cấu trúc giải đấu: vòng loại → knock-out → chung kết. NPC reactions: tiểu thư gia tộc kiêu ngạo, đối thủ tài phiệt sụp đổ, thầy giáo lớp đồng nhìn ra MC giấu nghề.',
    total_planned_chapters: 1500,
  },
  {
    title: 'Hệ Thống Lại Phái Ta Đi Cứu Pháo Hôi',
    slug: 'he-thong-lai-phai-ta-di-cuu-phao-hoi',
    genre: 'khoai-xuyen',
    topic_id: 'khoai-xuyen-cuu-vot-phan-phai',
    main_character: 'Thẩm Yên',
    description: 'MC senior agent của Hệ Thống Đa Vũ Trụ, đã đi qua 50+ thế giới với KPI cứu vớt phản phái bị thiên mệnh hủy hoại. Mỗi 30-50 chương xuyên 1 thân phận mới (pháo hôi tổng tài / vương phi cung đấu / NPC quán net mạt thế / phù thủy dị giới). Vạch trần khí vận chi tử đạo đức giả. Hub Space giữa các thế giới với NPC hệ thống dở hơi.',
    world_description: 'Bối cảnh: Đa Vũ Trụ với Tổ Chức Khoái Xuyên ẩn danh. MC tên Thẩm Yên — kiếp gốc bị nam chính nguyên tác (kẻ đạo đức giả) hủy hoại sự nghiệp + gia đình, hệ thống cứu MC + giao task: ngăn các nguyên chủ khác chịu cảnh tương tự. Hub Space: không gian trắng + NPC hệ thống có cá tính dị, đôi khi thưởng vật phẩm vô dụng (lông gà, tăm xỉa răng). Cấu trúc thế giới chuẩn 4 hồi (5+15+15+10): đồng bộ kịch bản → lật ngược thiết lập → phá vỡ kịch bản → đăng xuất. Đa thể loại thế giới: đô thị, cổ đại, mạt thế, dị giới, ngôn tình, võng du.',
    total_planned_chapters: 1200,
  },

  // ── 4 KEY TOPICS (do-thi: doan-tuyet, giai-tri-luu, thanh-chu-luu, group-chat) ──
  {
    title: 'Đoạn Tuyệt: 5 Năm Sau Họ Quỳ Trước Văn Phòng',
    slug: 'doan-tuyet-5-nam-sau-ho-quy-truoc-van-phong',
    genre: 'do-thi',
    topic_id: 'do-thi-doan-tuyet-quan-he',
    main_character: 'Trần Thẩm Bình',
    description: 'MC con ruột bị thất lạc 18 năm mới được đón về gia đình tài phiệt họ Trần Phượng Đô, bị thiên vị con nuôi "trà xanh" Tiểu Mạch. 5 năm hi sinh thầm lặng vẫn bị đổ oan biển thủ. MC ký giấy đoạn tuyệt rời đi, dùng kiến thức tài chính + IQ xây quỹ đầu tư nghìn tỷ. Khi gia đình ruột phá sản đến quỳ xin về, MC: "Chúng ta là người dưng".',
    world_description: 'Bối cảnh: Phượng Đô — thủ đô Đại Nam Liên Bang, năm 2024. Gia tộc Trần Phượng Đô (tập đoàn BĐS + tài chính kế thừa 3 đời) là nhân vật phụ ruột MC: cha (gọi MC bằng tên, gọi con nuôi "con yêu"), mẹ (cấp tài sản chênh lệch rõ), 3 chị em gái (đối xử lạnh nhạt, tin con nuôi vô điều kiện). Con nuôi "Tiểu Mạch" — trà xanh tinh quái, biển thủ ngầm, ngoại tình thiếu gia tập đoàn đối thủ. MC âm thầm: từng hiến máu cứu chị cả, công thức M&A thành công của tập đoàn do MC ẩn danh nghĩ ra, từng quỳ xin tha thứ hộ cha bị đối tác lừa. Cấu trúc 4 giai đoạn: Tích tụ uất ức + Rời đi (1-30) → Tự lập + Cú tát đầu tiên (30-100) → Phản kích kinh tế + Phân hóa (100-300) → Sụp đổ hoàn toàn (300+).',
    total_planned_chapters: 800,
  },
  {
    title: 'Đế Chế Văn Hóa: Ta Mang Châu Kiệt Luân Sang Dị Giới',
    slug: 'de-che-van-hoa-ta-mang-chau-kiet-luan-sang-di-gioi',
    genre: 'do-thi',
    topic_id: 'do-thi-giai-tri-luu',
    main_character: 'Lý Trí Vĩ',
    description: 'MC xuyên không sang Tân Lục — quốc gia công nghệ cao ngang Trái Đất 2026 nhưng văn hóa giải trí cực kỳ nghèo nàn. Mang theo Thư Viện Trái Đất, MC ra mắt single của Châu Kiệt Luân, viral chớp nhoáng. Lập studio Lạc Hồng Music, lần lượt tung Tây Du Ký + GTA + Dark Souls đè bẹp các tập đoàn giải trí Tencent-analog. Lập platform riêng vượt mặt Netflix dị giới.',
    world_description: 'Bối cảnh: Tân Lục — thế giới song song có công nghệ ngang Trái Đất 2026 (VR/AR phát triển, internet tốc độ siêu cao) nhưng văn hóa giải trí nghèo nàn (tất cả là pay-to-win game / phim thần tượng nhảm / nhạc auto-tune sáo rỗng). 2 tập đoàn độc quyền: Tian Yu Group (Tencent-analog) và Star Light Media (Netflix-analog) thao túng thị trường. MC bị studio cũ chèn ép hợp đồng nô lệ. Mang Thư Viện Trái Đất (âm nhạc/phim/tiểu thuyết/game đầy đủ). Thu hoạch "Điểm cảm xúc" từ phản ứng người dùng (sợ hãi từ horror, ức chế từ Dark Souls, cảm động từ Forrest Gump). Cấu trúc 4 giai đoạn: Viral indie → Studio + định hình phong cách → Cuộc chiến nền tảng → Thống trị toàn cầu.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Group Chat Vạn Giới: Ta Là Admin Kiêm Cá Mập',
    slug: 'group-chat-van-gioi-ta-la-admin-kiem-ca-map',
    genre: 'do-thi',
    topic_id: 'do-thi-group-chat-vu-tru',
    main_character: 'Hứa Thiên',
    description: 'MC tỉnh dậy phát hiện điện thoại có app Group Chat đặc biệt: Tần Thủy Hoàng + Tony Stark + Tiêu Viêm + Voldemort + Khổng Tử cãi nhau về công dụng của xà phòng. MC là Admin có quyền cấm ngôn + thu thuế + đặt giá. Mua T-virus từ Resident Evil giá 100 điểm, dán nhãn "thuốc trường sinh" bán Tần Thủy Hoàng giá 10000.',
    world_description: 'Bối cảnh: Hải Long Đô năm 2024. MC là sinh viên IT bình thường. App "Group Chat Vạn Giới" hiện ra trên điện thoại với quyền Admin tuyệt đối. Thành viên ban đầu: Tần Thủy Hoàng (Hoa Hạ cổ đại), Nhạc Bất Quần (kiếm hiệp), Tiêu Viêm (Đấu Phá Thương Khung), Tony Stark (Marvel), Voldemort (Harry Potter), Khổng Tử (lịch sử). Hệ thống định giá: mỗi vật phẩm có "Điểm Giao Dịch" do hệ thống tính toán dựa trên giá trị xuyên thế giới. MC ăn 10% phế (tax) mỗi giao dịch. Bố cục văn bản: 60-70% dạng tin nhắn khung chat, 30% MC ngoài đời thường. Cấu trúc 4 giai đoạn: Group Chat tân thủ + hàng đổi hàng → Phát hành tiền tệ + mở rộng tệp khách → Đấu giá toàn cầu → Va chạm thứ nguyên.',
    total_planned_chapters: 1200,
  },
  {
    title: 'Trở Lại 1995: Đế Chế Bất Động Sản Hải Long Đô',
    slug: 'tro-lai-1995-de-che-bat-dong-san-hai-long-do',
    genre: 'do-thi',
    topic_id: 'do-thi-thanh-chu-luu',
    main_character: 'Nguyễn Đại Nam',
    description: 'MC trọng sinh về 1995 với ký ức 30 năm tương lai. Biết trước mọi chu kỳ kinh tế, biết bất động sản Quận 7 sẽ tăng 200x, biết tập đoàn nào sắp niêm yết. Bắt đầu chuỗi quán phở vỉa hè làm cash-cow → BĐS thương mại → quỹ đầu tư → đế chế tài chính. Logic value investing thực chiến, không combat.',
    world_description: 'Bối cảnh: Hải Long Đô năm 1995, Đại Nam Quốc vừa Đổi Mới 10 năm. Internet chưa phổ biến, Yahoo Messenger sắp ra. Chứng khoán mới mở 2000, BĐS Q7 còn đồng ruộng. MC sinh viên năm 3 Bách Khoa với 5 ngàn xu vốn liếng + ký ức 30 năm tương lai. Lợi thế: biết các đợt sụp đổ thị trường (2008 subprime, 2020 covid, 2022 BĐS), biết startup nào sẽ thành unicorn, biết mảnh đất nào lên giá. Logic kinh doanh: P&L thực chiến, OCF, Margin of Safety, Economic Moat. Cấu trúc 4 giai đoạn: Cash-cow F&B (1-50) → Bành trướng + chuỗi (50-150) → Cuộc chiến chứng khoán + quỹ (150-300) → Trùm tư bản hậu trường (300+).',
    total_planned_chapters: 1500,
  },

  // ── 3 KEY TOPICS in other genres ──
  {
    title: 'Bế Quan 1 Vạn Năm: Tù Trưởng Bộ Lạc Đã Hoá Cát Bụi',
    slug: 'be-quan-1-van-nam-tu-truong-bo-lac-da-hoa-cat-bui',
    genre: 'tien-hiep',
    topic_id: 'tien-hiep-cau-dao-truong-sinh',
    main_character: 'Trần Lão Tử',
    description: 'MC tu sĩ trường sinh, ẩn cư trong sơn cốc 1 vạn năm cày linh điền + thuốc trường sinh trong âm thầm. Kẻ thù kiếp trước già chết hết, tông môn hắc ám cũ tan rã. MC bước ra thăm mộ tưới rượu, đào lấy bảo vật. Mỗi 100 chương vào 1 Kỷ nguyên mới, NPC cũ hoá cát bụi.',
    world_description: 'Bối cảnh: Cửu Châu Đại Lục — đại lục tu tiên kéo dài hàng vạn năm. MC bị tông môn hắc ám săn đuổi từ trẻ, may mắn nhận được Bàn Tay Vàng "tuổi thọ vô hạn + càng trốn càng mạnh". Triết lý hành động Lean: mạnh hơn → trốn, ngang cơ → trốn, yếu hơn nhưng background lớn → trốn. Chỉ ra tay khi 100% chắc thắng + huỷ thi diệt tích. Engine Time-skip vĩ mô: mỗi 100-200 chương MC vào 1 Kỷ nguyên mới (NPC cũ hoá cát bụi, MC vẫn ở đó pha trà). Cấu trúc 4 giai đoạn lặp: Ẩn nhẫn + Tích lũy → Biến cố + Chạy trốn → Time-skip → Thu hoạch + Lặp.',
    total_planned_chapters: 2000,
  },
  {
    title: 'Lão Tổ Của Ta: Đệ Tử Mãng Phu Lại Kéo Aggro',
    slug: 'lao-to-cua-ta-de-tu-mang-phu-lai-keo-aggro',
    genre: 'tien-hiep',
    topic_id: 'tien-hiep-lao-to-luu',
    main_character: 'Vô Danh Lão Tổ',
    description: 'MC tỉnh dậy thành Lão Tổ tông môn nhỏ "Vạn Linh Tông", đang bế quan trong từ đường 1000 năm. Hệ thống điều phối đệ tử: cử đệ tử mãng phu xuống núi farm tài nguyên, đệ tử cẩu đạo cung cấp dòng tiền thụ động, đệ tử thiên mệnh chi tử kéo main quest. Idle RPG vận hành tự động.',
    world_description: 'Bối cảnh: Cửu Châu Đại Lục, Vạn Linh Tông là tông môn cấp trung suy tàn 500 năm. Lão Tổ (MC) ẩn trong từ đường 1000 năm, đệ tử cho rằng ông đã thành tiên. Hệ thống Idle RPG: vòng lặp Input (đệ tử farm điểm hương hỏa + tài nguyên) → Process (Lão Tổ tích điểm) → Output (Gacha vật phẩm/công pháp/đan dược ban thưởng). Đệ tử cá tính rõ: mãng phu (Sức 99 IQ 1, kéo aggro), cẩu đạo (cẩn thận, dòng tiền ổn định), thiên mệnh chi tử (huyết hải thâm thù, kéo main quest). Đám đệ tử tự "não bổ" hành động Lão Tổ — thực ra MC chỉ ngồi xem livestream chiến đấu. Cơ chế Gacha + Reveal Thiên Phú Ẩn.',
    total_planned_chapters: 1500,
  },
  {
    title: 'Ngỗ Tác Sông Hương: Mỗi Xác Một Ước Nguyện',
    slug: 'ngo-tac-song-huong-moi-xac-mot-uoc-nguyen',
    genre: 'linh-di',
    topic_id: 'linh-di-dan-tuc-ngo-tac',
    main_character: 'Nguyễn Khôi',
    description: 'MC ngỗ tác trẻ kế thừa nghề từ ông nội tại Cố Đô Trung Đô năm Dân Quốc thứ 15 (1936). Mỗi xác chết MC khám hé lộ 1 vụ án ẩn — hoàn thành tâm nguyện cuối của vong = thu kỹ năng + tuổi thọ. Sổ Sinh Tử + Đồ Giám Yêu Ma. Đối đầu giáo phái Sông Hương dùng minh hôn + tế thần.',
    world_description: 'Bối cảnh: Cố Đô Trung Đô (miền Trung Đại Nam Quốc) năm Dân Quốc thứ 15 (1936) — thời phong kiến suy tàn, mạt pháp tu tiên (linh khí cạn). Nghề "âm môn" còn thịnh: ngỗ tác (khám tử thi cho quan), đao phủ, thợ vót tre hàng mã, cản thi (dẫn xác về quê), thợ đóng quan tài. Yếu tố kinh dị dân gian: minh hôn (đám cưới ma), cổ độc, bùa chú, làng bị nguyền, tế thần Sông Hương, tộc thiểu số tà giáo. Hệ thống MC: Sổ Sinh Tử (chép tên người chết, hoàn thành tâm nguyện = thu skill) + Đồ Giám Yêu Ma (tiêu diệt tà ma in lên sách, ban năng lực đặc thù). Sức mạnh có chi phí âm khí ăn mòn cơ thể, cần chí dương cân bằng. Cấu trúc 4 giai đoạn: Nhà xác Cố Đô → Vụ án dân gian gia tộc giàu → Tà thần địa phương → Thượng giới Lovecraftian.',
    total_planned_chapters: 1200,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function generateStoryOutline(projectId: string, seed: NovelSeed): Promise<void> {
  const targetArcs = Math.ceil(seed.total_planned_chapters / 20);
  const prompt = `Tạo dàn ý tổng thể cho truyện:

TITLE: ${seed.title}
GENRE: ${seed.genre}
TOPIC: ${seed.topic_id || 'default'}
PROTAGONIST: ${seed.main_character}
PREMISE: ${seed.description}

WORLD CONTEXT:
${seed.world_description.slice(0, 4000)}

TARGET: ${seed.total_planned_chapters} chương, ${targetArcs} arcs

Trả về JSON đầy đủ các trường: id, title, genre, premise, themes (array 3+), mainConflict, targetChapters, protagonist (name, startingState, endGoal, characterArc), majorPlotPoints (array 6+ với chapter+event), endingVision, uniqueHooks (array 3+).`;

  const cfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: 'Bạn là STORY ARCHITECT chuyên thiết kế webnovel TQ-style. CHỈ trả về JSON, không thêm text.',
  };
  const res = await callGemini(prompt, cfg, {
    jsonMode: true,
    tracking: { projectId, task: 'story_outline' },
  });
  const outline = parseJSON<StoryOutline>(res.content);
  if (!outline) throw new Error('story_outline parse failed');
  await s.from('ai_story_projects')
    .update({ story_outline: outline as unknown as Record<string, unknown> })
    .eq('id', projectId);
  console.log(`  ✓ story_outline saved`);
}

async function createNovelAndProject(seed: NovelSeed, ownerId: string): Promise<string> {
  const { data: novel, error: novelErr } = await s.from('novels').insert({
    title: seed.title,
    slug: seed.slug,
    author: 'Truyện City',
    description: seed.description,
    genres: [seed.genre],
    status: 'ongoing',
  }).select('id').single();
  if (novelErr || !novel) throw new Error(`novel insert failed: ${novelErr?.message}`);
  console.log(`  ✓ Novel created: ${novel.id}`);

  const styleDirectives: Record<string, unknown> = {
    disable_chapter_split: true, // Phase 20A: keep AI output as 1 reader chapter (uncut)
  };
  if (seed.topic_id) styleDirectives.topic_id = seed.topic_id;

  const projectInsert: Record<string, unknown> = {
    novel_id: novel.id,
    user_id: ownerId,
    genre: seed.genre,
    main_character: seed.main_character,
    world_description: seed.world_description,
    total_planned_chapters: seed.total_planned_chapters,
    current_chapter: 0,
    status: 'paused',
    temperature: 0.75,
    target_chapter_length: 2800,
    ai_model: 'deepseek-v4-flash',
    style_directives: styleDirectives,
  };
  if (seed.topic_id) projectInsert.topic_id = seed.topic_id;
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
  const master = await generateMasterOutline(
    projectId,
    seed.title,
    seed.genre,
    seed.world_description,
    seed.total_planned_chapters,
    cfg,
  );
  if (!master) throw new Error('master_outline returned null');
  console.log(`  ✓ master_outline saved (${master.majorArcs.length} arcs)`);
}

async function activateProject(projectId: string): Promise<void> {
  const { error } = await s.from('ai_story_projects')
    .update({ status: 'active' })
    .eq('id', projectId);
  if (error) throw new Error(`activate failed: ${error.message}`);
  console.log(`  ✓ Activated`);
}

async function main(): Promise<void> {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Phase 20A: Spawn Representatives (${SEEDS.length} novels)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const ownerId = await getOwnerId();
  console.log(`Owner: ${ownerId}\n`);

  for (const seed of SEEDS) {
    console.log(`▶ [${seed.genre}${seed.topic_id ? ` / ${seed.topic_id}` : ''}] ${seed.title}`);
    try {
      const projectId = await createNovelAndProject(seed, ownerId);
      await generateOutlines(projectId, seed);
      await activateProject(projectId);
    } catch (e) {
      console.error(`  ✗ Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    console.log();
  }

  // Verify
  const { data: created } = await s.from('ai_story_projects')
    .select('id,status,genre,topic_id,style_directives,novels!ai_story_projects_novel_id_fkey(title)')
    .in('topic_id', SEEDS.map(s => s.topic_id).filter(Boolean) as string[])
    .eq('status', 'active');

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ACTIVATED: ${created?.length || 0} new representative novels`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  for (const p of created || []) {
    const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    console.log(`  • ${novel?.title || 'unknown'} [${p.genre}/${p.topic_id || '-'}]`);
  }
  console.log(`\nNext: cron sẽ ghi 20 ch/ngày/novel theo DAILY_CHAPTER_QUOTA. Disable_chapter_split=true → mỗi AI write = 1 reader chapter (~2800 từ uncut).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
