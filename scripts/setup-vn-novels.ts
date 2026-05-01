/**
 * Setup script:
 * 1. Pause 17 of the 20 active projects (keep top 3)
 * 2. Create 2 new VN-themed novels with hand-crafted seeds
 * 3. Insert new projects as paused/setup_stage=idea
 * 4. Let the setup state machine generate canon/outline/arc plan
 *
 * Result: 3 original active projects + 2 paused projects waiting for setup
 *
 * Usage: ./node_modules/.bin/tsx scripts/setup-vn-novels.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateMasterOutline } from '@/services/story-engine/plan/master-outline';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import type { GeminiConfig, GenreType, StoryOutline } from '@/services/story-engine/types';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Top 3 to KEEP active
const KEEP_ACTIVE = [
  '651a58e3-b570-4a66-b3ed-fa60187ce0fe', // Phá Án Thần Thám
  'c6520286-da33-42e9-82a8-67ecc718768c', // Ta Ở Tông Môn Nuôi Cá
  '0cf943df-4ac6-42ec-a568-0d1be21d5e28', // Ngự Thú Thần Đế
];

// ── New Novel Seeds ──────────────────────────────────────────────────────────

interface NovelSeed {
  title: string;
  slug: string;
  genre: GenreType;
  main_character: string;
  description: string;
  world_description: string;
  total_planned_chapters: number;
}

const SEEDS: NovelSeed[] = [
  {
    title: 'Trở Về Năm 2000: Ta Có Ký Ức 25 Năm',
    slug: 'tro-ve-nam-2000-ta-co-ky-uc-25-nam',
    genre: 'do-thi',
    main_character: 'Trần Quốc Hùng',
    description:
      'Năm 1999, Đại Nam Quốc vừa Đổi Mới, internet ADSL mới về thủ đô. Một sinh viên năm hai Bách Khoa Hải Long Đô bỗng tỉnh giấc với ký ức 25 năm tương lai — biết tập đoàn nào sẽ phát đạt, mảnh đất nào sẽ lên giá nghìn lần, công nghệ nào sẽ thắng. Bắt đầu từ một quán net cỏn con với 5 ngàn xu vốn liếng, hắn dấn thân vào cuộc đua xây đế quốc kinh tế: từ outsourcing phần mềm → e-commerce → bất động sản → ngân hàng số → smartphone → vươn ra Phù Tang, Tây Âu — biến Lạc Hồng Tech thành đế chế công nghệ vượt mặt Đại Phong, đè bẹp Đại Hoa Tencent, đối đầu Tân Lục Microsoft.',
    world_description: `Bối cảnh: Đại Nam Quốc — quốc gia Đông Nam Á vừa Đổi Mới, năm 1999.

ĐỊA LÝ:
- Thủ đô Phượng Đô (miền Bắc, cổ kính, là trung tâm chính trị)
- Hải Long Đô (miền Nam, đặc khu kinh tế, sôi động, nơi MC sinh sống — phố Tây buổi tối, cafe vỉa hè, xích lô, máy nhắn tin Smart)
- Cố đô Trung Đô (miền Trung, di sản)
- Sông Cửu Long Hà chia đồng bằng phía Nam
- Dãy Trường Sơn Lĩnh chạy dọc đất nước

THỜI ĐẠI 1999-2000:
- Internet ADSL mới về thủ đô, dial-up vẫn phổ biến, Yahoo Messenger là vua
- Điện thoại Nokia 3310, Motorola, máy nhắn tin còn thời thượng
- Xe Yamaha Sirius, Honda Wave Alpha là biểu tượng
- Ngân hàng còn ghi sổ tay, ATM là xa xỉ
- Sàn chứng khoán mới mở 2000, cơ hội ngàn năm có một
- Bất động sản Quận 7 Hải Long Đô còn đồng ruộng, sẽ tăng 200x trong 25 năm

TIỀN TỆ: xu (đơn vị nhỏ), nguyên (1000 xu), lượng (vàng tham chiếu)
- Thu nhập bình quân sinh viên: 200-500 xu/tháng
- Cafe vỉa hè: 2 xu/cốc
- Bữa cơm bụi: 5 xu
- Đất Q7 1999: 1 nguyên/m² → 2024: 200 nguyên/m²

TẬP ĐOÀN HIỆN TẠI (1999):
- Đại Phong Group: tập đoàn công nghệ tiên phong, đang phát triển outsourcing (đối thủ chính, tương lai sẽ là FPT-analog)
- Vạn Thái Tập Đoàn: gia tộc bất động sản gốc Phượng Đô (đối thủ truyền thống)
- Mộc Hương Thực Phẩm: sữa, đồ uống quốc dân
- Hồng Lạc Bưu Điện: viễn thông nhà nước, độc quyền cố định
- Tân Phong Mobile: viễn thông quân đội mới ra mắt

ĐỐI THỦ NGOẠI:
- Đại Hoa Đế Quốc (phía Bắc): Tencent, Alibaba đang đổ tiền vào ĐN
- Tân Lục Hợp Chúng Quốc (phương Tây): Microsoft, Yahoo, IBM chiếm thị trường
- Phù Tang Đảo Quốc (phía Đông): Sony, Toshiba thống trị điện tử

NHÂN VẬT CHÍNH:
- Trần Quốc Hùng, 20 tuổi, sinh viên năm 2 Khoa Công Nghệ Thông Tin, Đại học Bách Khoa Hải Long Đô
- Gia đình: bố làm thợ kim hoàn nhỏ, mẹ bán hàng tạp hóa, em gái cấp 2
- Tính cách trước khi trọng sinh: ít nói, thông minh, hay tự ti
- Tính cách sau trọng sinh: quyết đoán, tinh ranh, biết khi nào cướp khi nào đầu tư
- Power: ký ức 25 năm tương lai (cố định, không thay đổi sự kiện vĩ mô; KHÔNG có hệ thống tu tiên — pure kinh doanh)

PATH (lộ trình kinh doanh):
- Phase 1 (ch.1-50): Quán net đầu tiên ở Hải Long Đô, cướp coder giỏi từ Bách Khoa
- Phase 2 (ch.50-150): Outsourcing cho Tân Lục, đội 50→500 dev
- Phase 3 (ch.150-300): Lạc Hồng Mall e-commerce, đè bẹp Đại Hoa lấn sân
- Phase 4 (ch.300-500): Gom đất Quận 7, xây khu đô thị mới
- Phase 5 (ch.500-700): Lạc Hồng Game (mua bản quyền Hàn), IPO sàn chứng khoán
- Phase 6 (ch.700-900): Lạc Hồng Bank — ngân hàng số đầu tiên Đại Nam
- Phase 7 (ch.900-1100): Lạc Hồng Phone — smartphone Đại Nam, chip riêng
- Phase 8 (ch.1100-1200): Vươn ra ngoài — mua công ty Phù Tang, Tây Âu — Lạc Hồng thành đế chế công nghệ tầm thế giới

CÁC TUYẾN PHỤ:
- Tình cảm: bạn học Linh Đan (kỹ sư hardware), Phượng Vũ (con gái Vạn Thái Group)
- Tình bằng hữu: nhóm "Bách Khoa Bát Quái" — 7 đồng đội khởi nghiệp ban đầu
- Gia đình: cứu mẹ khỏi bệnh (đã chết kiếp trước), nuôi em gái du học, đưa bố mở chuỗi kim hoàn

GHI CHÚ KHÔNG ĐƯỢC VI PHẠM:
- KHÔNG dùng tên Việt Nam, Hà Nội, Sài Gòn, FPT, Vingroup, Vinamilk, Viettel, VNG, Bitcoin, Mỹ, Trung Quốc, Nhật Bản
- DÙNG: Đại Nam, Phượng Đô, Hải Long Đô, Đại Phong, Vạn Thái, Lạc Hồng (MC), Đại Hoa, Tân Lục, Phù Tang
- KHÔNG có yếu tố tu tiên/siêu nhiên — pure đô thị kinh doanh
- Tone: tham vọng, khắc nghiệt thương trường, ngọt ngào tình cảm tuổi học sinh, hoài niệm`,
    total_planned_chapters: 1200,
  },
  {
    title: 'Vạn Quốc Triệu Hồi: Ta Có Cả Lạc Long Quân',
    slug: 'van-quoc-trieu-hoi-ta-co-ca-lac-long-quan',
    genre: 'huyen-huyen',
    main_character: 'Lý Quang Vinh',
    description:
      'Năm 2030, Cửa Linh mở ra trên toàn cầu. Mỗi quốc gia có thể triệu hồi anh hùng và thần thoại của lịch sử mình để chiến đấu. Hoa Hạ Đại Quốc triệu hồi Quan Vũ Đại Đế, Tôn Đại Thánh. Tân Lục Hợp Chúng Quốc triệu hồi siêu chiến binh. Đại Nam Liên Bang — bị mỉa mai là "tiểu quốc" — bất ngờ có một sinh viên kích hoạt được Hệ Thống Bách Việt: triệu hồi Trần Hưng Đạo, Hai Bà Trưng, Lê Lợi, Quang Trung, Phù Đổng Thiên Vương, Sơn Tinh, và đỉnh điểm là Lạc Long Quân — Tổ Long khai sáng. Một mình hắn dẫn dắt đất nước nhỏ bé đứng lên giữa cuộc chiến vạn quốc, viết lại lịch sử thế giới mới.',
    world_description: `Bối cảnh: Năm 2030, "Cửa Linh" mở khắp toàn cầu — mỗi quốc gia có thể triệu hồi anh hùng/thần thoại lịch sử của mình để bảo vệ lãnh thổ và bành trướng.

QUỐC GIA:
- Đại Nam Liên Bang (MC, ~VN-analog): bị xem là "tiểu quốc", dân số 100 triệu, đường bờ biển dài, có Long Khí cội nguồn
- Hoa Hạ Đại Quốc (~TQ-analog, kẻ thù chính): siêu cường phía Bắc, dân số 1.4 tỷ, triệu hồi Quan Vũ Đại Đế, Tôn Đại Thánh, Gia Cát Vũ Hầu, Tần Thủy Hoàng
- Tân Lục Hợp Chúng Quốc (~Mỹ-analog): siêu cường phương Tây, triệu hồi siêu chiến binh, Tự Do Nữ Thần
- Phù Tang Đảo Quốc (~Nhật-analog): triệu hồi Yamato Takeru, Oda Nobunaga, Mặt Trời Nữ Thần
- Tây Âu Liên Minh (~EU-analog): Hiệp Sĩ Bàn Tròn, Excalibur, Hoàng Đế Charles
- Bắc Cực Hùng Quốc (~Russia-analog): Hãn Đế Mông Cổ (mượn lịch sử), Sa Hoàng

ĐỊA LÝ ĐẠI NAM LIÊN BANG:
- Thủ đô: Phượng Hoàng Thành (miền Bắc)
- Hải Long Đô (đặc khu kinh tế phía Nam — nơi MC học)
- Trung Đô (cố đô)
- Sông Cửu Long Hà, dãy Trường Sơn Lĩnh
- Biển Đông (gọi là Đông Hải) — điểm nóng tranh chấp với Hoa Hạ

HỆ THỐNG BÁCH VIỆT (4 tier):

TIER PHÀM (ch.1-200, Linh khí cấp 1-30):
- Yết Đại Tướng (Yết Kiêu): chuyên thuỷ chiến, đục tàu địch
- Quốc Toản Thiếu Tướng (Trần Quốc Toản): thiếu niên dũng tướng, "Bóp Quả Cam"
- Ngũ Lão Trượng (Phạm Ngũ Lão): tướng nông dân, thương dài
- Bình Định Vương (Đinh Bộ Lĩnh khi thiếu thời): cờ lau tập trận

TIER THIÊN (ch.200-700, Linh khí cấp 30-70):
- Trần Đại Vương (Trần Hưng Đạo): thiên tài quân sự, Bình Thư Yếu Lược, Bạch Đằng đại trận
- Lý Thừa Tướng (Lý Thường Kiệt): "Sông núi nước Nam vua Nam ở", phá Tống
- Lam Sơn Vương (Lê Lợi): Thuận Thiên Kiếm, khởi nghĩa nông dân
- Tây Sơn Vũ Đế (Quang Trung): tốc độ thần tốc, Đống Đa đại thắng
- Phượng Hậu Nhị Vị (Hai Bà Trưng): song nữ tướng cưỡi voi trắng
- Bố Cái Đại Vương (Phùng Hưng): chế ngự hổ, dân quân

TIER THẦN THOẠI (ch.700-1100, Linh khí cấp 70-90):
- Phù Đổng Thiên Tướng (Thánh Gióng): trẻ em hoá khổng lồ, ngựa sắt, roi sắt
- Sơn Đại Thần (Sơn Tinh): điều khiển núi non, hộ dân khỏi lũ lụt
- Tản Viên Sơn Tổ (Tản Viên Sơn Thánh): trừ ma, hộ cõi
- Mẫu Liễu Đại Thánh (Mẫu Liễu Hạnh): thần linh hoàng tộc
- Chử Đồng Tử (Chử Đồng Tử): pháp bảo Thần Bút, vạn vật sinh hoá

TIER TỔ LINH (ch.1100-1500, Linh khí cấp 90+, ULTIMATE):
- Hùng Đại Đế (Hùng Vương): khai quốc tổ, biểu tượng dòng tộc
- Mẫu Tổ Âu Cơ (Âu Cơ): mẹ thiên hạ, sinh trăm trứng
- Long Tổ Lạc Vương (Lạc Long Quân): ULTIMATE — Long Khí khởi nguyên, biển sâu, có thể triệu hồi Long tộc cổ xưa, Bách thần phục mệnh

ANTAGONISTS — LỰC LƯỢNG TRIỆU HỒI HOA HẠ:
- Quan Vũ Đại Đế (Quan Công): Thanh Long Yển Nguyệt Đao
- Gia Cát Vũ Hầu (Khổng Minh): trí tuệ, mưu lược, bát trận đồ
- Tôn Đại Thánh (Tôn Ngộ Không): Như Ý Kim Cô Bổng, 72 phép biến hoá
- Tần Thủy Hoàng: vạn quân binh mã đất sét, Thanh Long Sơn cổ trận
- Vũ An Quân (Bạch Khởi): tàn nhẫn, đồ sát hàng vạn người

TIER LINH KHÍ:
- Cấp 1-30: Phàm Cấp (sĩ tốt phổ thông)
- Cấp 30-70: Thiên Cấp (vương tướng)
- Cấp 70-90: Thần Thoại Cấp
- Cấp 90+: Tổ Linh Cấp (ULTIMATE)

NHÂN VẬT CHÍNH:
- Lý Quang Vinh, 22 tuổi, sinh viên năm cuối Đại học Quốc Gia Đại Nam (Phượng Hoàng Thành)
- Họ Lý — hậu duệ trực hệ Lạc Hồng tộc, mang Long Khí thuần khiết nhất
- Cha mất khi nhỏ (sau này biết là tử trận trong sự kiện đầu tiên Cửa Linh hé mở), mẹ nông dân
- Bạn gái: Trần Tịnh Vy — hậu duệ Trần Đại Vương, sau cùng cũng được kích hoạt một phần Long Khí
- Power: Hệ Thống Bách Việt độc nhất, dần dần triệu hồi 4 tier anh hùng

CONFLICT SETUP:
- Năm 2025: Cửa Linh đầu tiên mở ra ở Tây Tạng (~Himalaya-analog), Hoa Hạ là quốc gia đầu tiên triệu hồi thành công Quan Vũ Đại Đế
- 2026-2029: các quốc gia chạy đua kích hoạt hệ thống
- 2030 (truyện bắt đầu): Hoa Hạ tấn công Đại Nam, MC bất ngờ kích hoạt hệ thống Bách Việt

5 ARC:
- Arc 1 (ch.1-100): Cửa Linh khai mở, kích hoạt hệ thống, triệu hồi Quốc Toản Thiếu Tướng — đụng độ Hoa Hạ đầu tiên ở biên giới Bắc
- Arc 2 (ch.100-300): Bảo vệ Hải Long Đô khỏi quân Hoa Hạ thuỷ chiến — triệu hồi Yết Đại Tướng + Trần Đại Vương — Bạch Đằng tái hiện
- Arc 3 (ch.300-700): Thế giới chia phe; Đại Nam vào liên minh chống Hoa Hạ; đại chiến cùng Phù Tang vs Yamato Takeru
- Arc 4 (ch.700-1100): Khám phá Long Khí cội nguồn, đánh thức Phù Đổng Thiên Tướng, đại chiến với Tôn Đại Thánh
- Arc 5 (ch.1100-1500): Long Tổ Lạc Vương quy hồi, Đại Nam thành cường quốc dẫn dắt thế giới mới

GHI CHÚ KHÔNG ĐƯỢC VI PHẠM:
- KHÔNG dùng tên: Việt Nam, Hà Nội, TP.HCM, Trung Quốc, Mỹ, Nhật, Nga, Pháp, Anh
- DÙNG: Đại Nam Liên Bang, Hoa Hạ Đại Quốc, Tân Lục Hợp Chúng Quốc, Phù Tang Đảo Quốc, Tây Âu Liên Minh, Bắc Cực Hùng Quốc
- DÙNG TÊN THẬT của các anh hùng/thần thoại Việt Nam (Lạc Long Quân, Trần Hưng Đạo, Hai Bà Trưng, Quang Trung, Thánh Gióng, Sơn Tinh, Tản Viên...)
- DÙNG TÊN THẬT của địa điểm/sự kiện lịch sử pre-1900 (Bạch Đằng, Đống Đa, Lam Sơn, Như Nguyệt)
- Tone: hùng tráng, hào khí dân tộc, military strategy, summon-system battle, magic + mythology
- Quy tắc summon: cần Linh thạch + máu hậu duệ + đáp ứng cấp độ Long Khí mới triệu hồi được; mỗi anh hùng chỉ triệu hồi được khi MC đạt cấp tương ứng`,
    total_planned_chapters: 1500,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function pauseProjects(): Promise<void> {
  // Pause all currently active projects EXCEPT the 3 we keep
  const { data: active } = await s.from('ai_story_projects')
    .select('id,novel_id,status')
    .eq('status', 'active');

  if (!active) throw new Error('Could not query active projects');

  const toPause = active.filter(p => !KEEP_ACTIVE.includes(p.id as string));
  console.log(`▶ Pausing ${toPause.length} projects (keeping ${KEEP_ACTIVE.length} active)`);

  if (toPause.length > 0) {
    const ids = toPause.map(p => p.id as string);
    const { error } = await s.from('ai_story_projects')
      .update({ status: 'paused' })
      .in('id', ids);
    if (error) throw new Error(`Pause failed: ${error.message}`);
  }
  console.log(`  ✓ Paused`);
}

async function generateStoryOutline(
  projectId: string,
  seed: NovelSeed,
): Promise<void> {
  const targetArcs = Math.ceil(seed.total_planned_chapters / 20);

  const prompt = `Tạo dàn ý tổng thể cho truyện:

TITLE: ${seed.title}
GENRE: ${seed.genre}
PROTAGONIST: ${seed.main_character}
PREMISE: ${seed.description}

WORLD CONTEXT (TUÂN THỦ NGHIÊM):
${seed.world_description.slice(0, 4000)}

TARGET: ${seed.total_planned_chapters} chương, ${targetArcs} arcs

Trả về JSON:
{
  "id": "story_${Date.now()}",
  "title": "${seed.title}",
  "genre": "${seed.genre}",
  "premise": "Premise 2-3 câu hấp dẫn (TUÂN THỦ tên fictional country/place; chỉ dùng tên thật cho anh hùng/thần thoại VN nếu là bộ Vạn Quốc Triệu Hồi)",
  "themes": ["theme1", "theme2", "theme3"],
  "mainConflict": "Xung đột chính xuyên suốt truyện",
  "targetChapters": ${seed.total_planned_chapters},
  "protagonist": {
    "name": "${seed.main_character}",
    "startingState": "Trạng thái MC đầu truyện",
    "endGoal": "Mục tiêu cuối cùng",
    "characterArc": "Hành trình phát triển character"
  },
  "majorPlotPoints": [
    {"chapter": 1, "event": "Khởi đầu — sự kiện inciting"},
    {"chapter": ${Math.ceil(seed.total_planned_chapters * 0.2)}, "event": "Rising Action 1"},
    {"chapter": ${Math.ceil(seed.total_planned_chapters / 2)}, "event": "Midpoint twist"},
    {"chapter": ${Math.ceil(seed.total_planned_chapters * 0.7)}, "event": "Rising Action 2"},
    {"chapter": ${seed.total_planned_chapters - 50}, "event": "Climax setup"},
    {"chapter": ${seed.total_planned_chapters}, "event": "Resolution"}
  ],
  "endingVision": "Kết thúc thoả mãn, tổng kết hành trình MC",
  "uniqueHooks": ["Hook 1", "Hook 2", "Hook 3"]
}`;

  const cfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: 'Bạn là STORY ARCHITECT — chuyên thiết kế webnovel Việt Nam. CHỈ trả về JSON, không thêm text.',
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
  console.log(`  ✓ story_outline saved (${res.content.length} chars)`);
}

async function createNovelAndProject(
  seed: NovelSeed,
  ownerId: string,
): Promise<{ projectId: string; novelId: string }> {
  // 1. Insert novel (status='Đang ra' VN canonical — homepage/browse filters exact-match this)
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

  // 2. Insert project — start as setup_stage=idea so the unified setup pipeline owns canon.
  const { data: project, error: projErr } = await s.from('ai_story_projects').insert({
    novel_id: novel.id,
    user_id: ownerId,
    genre: seed.genre,
    main_character: seed.main_character,
    world_description: seed.world_description,
    total_planned_chapters: seed.total_planned_chapters,
    current_chapter: 0,
    status: 'paused',
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    temperature: 0.75,
    target_chapter_length: 2800,
    ai_model: 'deepseek-v4-flash',
  }).select('id').single();

  if (projErr || !project) throw new Error(`project insert failed: ${projErr?.message}`);
  console.log(`  ✓ Project created: ${project.id} (paused)`);

  return { projectId: project.id, novelId: novel.id };
}

async function generateOutlines(projectId: string, seed: NovelSeed): Promise<void> {
  const cfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.7,
    maxTokens: 4096,
  };

  console.log(`  → Generating story_outline...`);
  await generateStoryOutline(projectId, seed);

  console.log(`  → Generating master_outline...`);
  const master = await generateMasterOutline(
    projectId,
    seed.title,
    seed.genre,
    seed.world_description,
    seed.total_planned_chapters,
    cfg,
  );
  if (!master) throw new Error('master_outline generation returned null');
  console.log(`  ✓ master_outline saved (${master.majorArcs.length} arcs)`);
}

async function activateProject(projectId: string): Promise<void> {
  const { error } = await s.from('ai_story_projects')
    .update({ status: 'active' })
    .eq('id', projectId);
  if (error) throw new Error(`activate failed: ${error.message}`);
  console.log(`  ✓ Activated`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  VN-Themed Novels Setup`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Step 1: Pause others
  await pauseProjects();

  // Step 2-4: For each seed, create novel + paused setup-stage project.
  const ownerId = await getOwnerId();
  console.log(`Owner: ${ownerId}\n`);

  const created: Array<{ seed: NovelSeed; projectId: string; novelId: string }> = [];

  for (const seed of SEEDS) {
    console.log(`▶ ${seed.title}`);
    const { projectId, novelId } = await createNovelAndProject(seed, ownerId);
    created.push({ seed, projectId, novelId });
    console.log();
  }

  // Step 5: Verify
  const { data: final } = await s.from('ai_story_projects')
    .select('id,status,setup_stage,ai_model,current_chapter,total_planned_chapters,novels!ai_story_projects_novel_id_fkey(title)')
    .in('id', created.map(c => c.projectId));

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  CREATED FOR SETUP PIPELINE: ${final?.length || 0} projects`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  for (const p of final || []) {
    const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    console.log(`  • ${novel?.title || 'unknown'} — ${p.status}/${p.setup_stage} — ${p.current_chapter}/${p.total_planned_chapters} (${p.ai_model})`);
  }

  console.log(`\n  ✓ Done. Setup pipeline must reach ready_to_write before cron writes chapter 1.\n`);
}

main().catch(e => {
  console.error('\n✗ Fatal:', e);
  process.exit(1);
});
