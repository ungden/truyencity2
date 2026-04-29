/**
 * Spawn 1 novel: "Aniki — Đàn Anh Gác Kiếm" — thương chiến trọng sinh
 * mở nhà hàng Nhật authentic ở Sài Gòn.
 *
 * User-supplied premise (concept hand-crafted, not AI-generated):
 *   - Tên nhà hàng: Aniki (兄貴 = "đàn anh" tiếng yakuza Nhật, = retired
 *     warrior gác kiếm pivot to chef)
 *   - Địa chỉ: 112 Trần Khắc Chân, P.Tân Định, Q.1, Sài Gòn (real
 *     street, real district)
 *   - MC: Nguyễn Hoàng Long, kiếp trước xuất khẩu lao động Nhật 2014,
 *     làm đầu bếp washoku Tokyo + kanbu yakuza Aizukotetsukai
 *     Shinjuku 9 năm trước khi bị thanh trừng nội bộ năm 2023, chết
 *     ở Kabukicho. Trọng sinh năm 2024 vừa về VN sau 5 năm thực tập
 *     sinh kỹ năng.
 *   - Golden finger: memory-only (knowledge edge 9 năm tương lai +
 *     skill đầu bếp Nhật authentic + yakuza network + tiếng Nhật
 *     N1). KHÔNG hệ thống, KHÔNG huyền bí.
 *   - Genre: do-thi + sub-genres rebirth-niche + kinh-doanh.
 *   - Conflict: thương chiến với chuỗi Sushi giả + BĐS group + yakuza
 *     past resurfacing. KHÔNG combat — Long gác kiếm.
 *
 * Apply 4-layer prevention from 2026-04-29 incident:
 *  - Canonical schema (premise/mainConflict/themes/majorPlotPoints/
 *    endingVision/uniqueHooks/protagonist.{startingState,endGoal,
 *    characterArc})
 *  - Validator at spawn time (utils/story-outline-validator.ts)
 *  - 3-attempt retry on master_outline majorArcs
 *  - status='Đang ra' VN canonical
 *  - VND currency rule active for do-thi (đồng, KHÔNG xu/nguyên)
 *
 * Usage: ./node_modules/.bin/tsx scripts/spawn-aniki.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateMasterOutline } from '@/services/story-engine/pipeline/master-outline';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import { validateStoryOutlineOrThrow } from '@/services/story-engine/utils/story-outline-validator';
import { generateNovelDescription } from '@/services/story-engine/utils/description-generator';
import type { GeminiConfig, GenreType, StoryOutline } from '@/services/story-engine/types';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const MAX_PLANNED_CHAPTERS = 600;

interface NovelSeed {
  title: string;
  slug: string;
  genre: GenreType;
  sub_genres?: string[];
  main_character: string;
  /** OPTIONAL — left for documentation. Real description is auto-generated
   *  from world_description via generateNovelDescription() to avoid jargon
   *  leak (post-2026-04-29 standard). Hand-typed value here is IGNORED. */
  description?: string;
  world_description: string;
  total_planned_chapters: number;
}

const SEED: NovelSeed = {
  title: 'Aniki - Đàn Anh Gác Kiếm: Đầu Bếp Yakuza Trọng Sinh Sài Gòn',
  slug: 'aniki-dau-bep-yakuza-trong-sinh-sai-gon',
  genre: 'do-thi',
  sub_genres: ['rebirth-niche', 'kinh-doanh'],
  main_character: 'Nguyễn Hoàng Long',
  description: 'Nguyễn Hoàng Long — 24 tuổi, vừa hoàn thành chương trình thực tập sinh kỹ năng 5 năm tại Tokyo, về Sài Gòn tháng 3/2024 với 250 triệu tiết kiệm + 30 triệu yen trong tài khoản JP Bank. Nhưng đây là KIẾP THỨ HAI — kiếp trước Long ở Nhật từ 2014-2023, làm đầu bếp washoku 1-sao Michelin "Hanamaru" Asakusa ban ngày + kanbu yakuza Aizukotetsukai Shinjuku ban đêm, chết ở Kabukicho năm 33 tuổi sau khi bị nội bộ thanh trừng. Kiếp này Long mang theo 9 năm ký ức + skill đầu bếp Nhật authentic + tiếng Nhật N1+ + network 50+ yakuza/supplier Nhật + knowledge trend ẩm thực 2024-2033. Mở nhà hàng "ANIKI" (兄貴 = đàn anh tiếng yakuza, "gác kiếm" pivot to chef) tại 112 Trần Khắc Chân, P.Tân Định, Q.1 Sài Gòn — concept omakase counter 8 ghế + tatami room 6 chỗ + izakaya 8 chỗ, aesthetic yakuza-elegant với katana decorative + kanji 兄貴 entrance + half-sleeve tattoo koi+rồng Long lộ ra khi xắn tay áo nấu. Nguyên liệu fly direct Tsukiji/Toyosu 3 lần/tuần. Khách hiểu Long là cựu yakuza từ Nhật về — Long không giấu, không khoe. Đối thủ: chuỗi Tokyo Express copy concept giá rẻ + Saigon Land Group ép rời mặt bằng + Hideo Sato của Aizukotetsukai mở business sang VN. KHÔNG combat (Long gác kiếm) — face-slap qua authentic + import direct + community goodwill.',
  world_description: `BỐI CẢNH CHÍNH: Nguyễn Hoàng Long, 24 tuổi, người Sài Gòn quê quận 4 (gia đình sống ngõ Tôn Đản, gần chợ cá Hàm Tử), vừa trở về Việt Nam ngày 15/3/2024 sau 5 năm chương trình "Thực Tập Sinh Kỹ Năng" của Bộ LĐ-TB-XH (2019-2024). Tài sản: 250 triệu VND tiết kiệm + 30 triệu yen (~5 tỷ VND) trong tài khoản JP Bank Nhật còn rút được. Đây là KIẾP THỨ HAI.

KIẾP TRƯỚC (2014-2023, 9 năm):
- 2014: Long đi xuất khẩu lao động qua "Thực Tập Sinh Kỹ Năng" — vào Hanamaru Restaurant ở Asakusa, Tokyo (washoku 1-sao Michelin, đầu bếp thế hệ thứ 4 chef Kenji Yamamoto).
- 2014-2017: học nghề từ thầy Kenji. Long có thiên phú — taste calibration tự nhiên, tay làm sushi edomae/kaiseki như đã làm 10 năm. Lên chức Misekata (sous chef) năm 2017.
- 2016 (key event): Long phát hiện đồng hương Việt bị mafia Trung Quốc ở Kabukicho bắt nạt + ép trả tiền bảo kê. Long phản kháng — đánh bại 3 yakuza lower-rank Trung Quốc → gây chú ý của Aniki Tanaka, đàn anh Aizukotetsukai (gia tộc yakuza Nhật) ở Shinjuku.
- 2017-2020: Long vừa làm bếp Hanamaru ban ngày + kanbu (lieutenant) Aizukotetsukai ban đêm. Quản lý 30 đồng hương Việt khu Shinjuku-Kabukicho. Lên chức Wakagashira (đàn anh hạng 2 trong organization).
- 2020-2023: Long mở 3 izakaya nhỏ ở Tokyo + Osaka phục vụ vừa người Nhật vừa khách Việt. Đứng đầu liên minh Việt-Nhật mafia khu Shinjuku. Tích lũy được 50 triệu yen + tattoo half-sleeve koi+rồng Japanese style.
- 2023 (death): nội bộ Aizukotetsukai chia rẽ, Hideo Sato (đối thủ phái Hideyuki) hạ độc Long trong izakaya của chính mình ở Kabukicho. Long chết 33 tuổi tại căn hộ thuê Kabukicho. Cảnh sát Tokyo điều tra nhưng tổ chức cover up.

TRỌNG SINH:
Sáng 15/3/2024 Long mở mắt — phát hiện y vừa hoàn thành 5 năm thực tập sinh (kiếp này khác kiếp trước, kiếp trước đi 2014, kiếp này đi 2019), vừa hạ cánh Tân Sơn Nhất, đầy đủ 9 năm ký ức tương lai về Nhật. Long 24 tuổi, sạch sẽ, chưa dính yakuza ở kiếp này — kiếp trước skill + network + memory đều có.

GOLDEN FINGER (memory-only, KHÔNG hệ thống):
1. Skill đầu bếp Nhật authentic: sushi edomae 12-piece omakase (cá tươi Tsukiji/Toyosu fly direct), washoku set kaiseki 12-course, izakaya à la carte (yakitori, gyukatsu, takoyaki, tonkatsu Hokkaido style), ramen tonkotsu/shoyu/miso. Tay nghề như chef 15 năm.
2. Tiếng Nhật N1+ (kanji + keigo + slang yakuza).
3. Network kiếp trước (knowledge): 50+ contact Nhật — đàn em Yamamoto Hiroshi (sous chef Hanamaru, sau theo Long), nhà cung cấp cá Toyosu Yokoyama-san, broker BĐS Tokyo, chủ izakaya khu Roppongi, oyabun Aizukotetsukai. Kiếp này contact chưa "biết" Long nhưng Long biết họ ở đâu.
4. Knowledge tương lai 2024-2033:
   - Trend ẩm thực: omakase boom Sài Gòn 2024-2026 (5x growth), kaiseki niche fine-dining 2027+, gyukatsu fad 2025, tonkotsu ramen mainstream 2026.
   - BĐS Sài Gòn: Q1+Q3 tăng 2x giai đoạn 2024-2030, Tân Định gentrification 2026-2028, Thảo Điền expat zone bão hòa 2025.
   - Tỷ giá: yen weak 2025-2027 (1JPY = 150-180 VND vs current 170) → cơ hội import Nhật rẻ.
   - Macro: F&B Việt Nam consolidation 2027-2030 (top 3 chuỗi nuốt 60% market share).
5. Survival skills giang hồ: đọc người, deal politic, defuse violence không cần đánh.

NHÀ HÀNG ANIKI (mở chương 5-15):
- TÊN: "Aniki" (兄貴 — kanji "huynh quý", phát âm Nhật "Aniki" = "đàn anh" trong tiếng yakuza, biểu tượng người tử tế gác kiếm).
- CONCEPT: "Đàn anh gác kiếm" — yakuza retired đến nấu ăn cho bạn. Authentic Japanese 100%, KHÔNG fusion Việt sến.
- ĐỊA CHỈ: 112 Trần Khắc Chân, P.Tân Định, Q.1, TP.HCM (street thật, gần chợ Tân Định, walking distance 8 phút Saigon Centre Q1, 1 lầu mặt tiền 5x20m, mặt bằng cũ thời Pháp). Bà Sáu chủ nhà 65 tuổi, cứng đầu — Long phải thuyết phục thuê 80 triệu/tháng.
- AESTHETIC YAKUZA-ELEGANT:
  - Entrance: noren rèm vải đen với kanji 兄貴 trắng đậm
  - Inside: đèn đỏ izakaya, washi paper sliding doors, kanji thư pháp lớn 兄貴 ở wall chính
  - Decorative katana giả treo wall (props, không sắc)
  - Tatami room: shoji + zabuton + bàn thấp gỗ keyaki
  - Bar omakase: counter hinoki cypress (1m x 4m), 8 ghế gỗ
  - Khói thuốc Mild Seven cho phép trong izakaya area (legal Q1 2024)
- LAYOUT: 8 chỗ omakase counter (Long handle 100%) + 1 phòng tatami 4-6 người + 2 bàn izakaya 4 người. Tổng 18 chỗ.
- MENU:
  - Omakase 12 course (1.500.000-2.500.000 đồng/người, dinner only, reservation 7 ngày trước)
  - Set lunch tonkatsu/teishoku (350.000-500.000 đồng/set, weekday lunch)
  - Izakaya à la carte (200.000-800.000 đồng/món, dinner only): yakitori 9 loại, sashimi platter, gyukatsu, takoyaki, edamame, agedashi tofu
  - Sake list: 30 loại junmai/ginjo/daiginjo từ Akita, Hyogo, Niigata
- NGUYÊN LIỆU: cá tươi fly direct Toyosu Tokyo 3 lần/tuần (qua đối tác cũ Yokoyama-san), gạo Akita Komachi import, nori Ariake, wasabi tươi Shizuoka.
- LONG personally: handle 100% omakase, tay áo xắn lộ tattoo half-sleeve koi+rồng Japanese style. Khách hiểu Long là cựu yakuza Nhật — Long không giấu (kiếp này Long chưa làm yakuza, nhưng tattoo từ kiếp trước carry over hoặc fake background được Long set up). Long không khoe, chỉ khi khách hỏi về "chú có ở Nhật à" mới đáp ngắn "5 năm Asakusa".
- STAFF: 2 người — Nam (sous chef, bạn thân kiếp này, cùng đi thực tập sinh đợt 2019) + Hương (server kiêm bartender, quê Đà Nẵng, biết tiếng Nhật cơ bản).

SÀI GÒN 2024 (real-world setting, NO fictional metropolis):
- Quận 1: Saigon Centre, Bitexco Financial Tower, chợ Bến Thành, đường Đồng Khởi, đường Lê Lợi, đường Nguyễn Huệ.
- Phường Tân Định Q.1: chợ Tân Định, đường Hai Bà Trưng, đường Trần Khắc Chân (street nhỏ, khu nhà cũ thời Pháp, xen kẽ quán cà phê + ăn uống local).
- Quận 4 Tôn Đản: gia đình Long sống — ngõ hẹp chung cư cũ, gần chợ cá Hàm Tử.
- Quận Thảo Điền (Q.2): expat zone, foreigners + nhà hàng cao cấp + cà phê specialty.
- Đường Phạm Ngọc Thạch Q.3: F&B mới, nhiều fine-dining hub.
- Khu Đô Thị Phú Mỹ Hưng Q.7: tập đoàn lớn HQ + finance.
- Currency: VND đồng (chương trước: 250.000.000 đồng = 250 triệu đồng tiết kiệm Long mang về). KHÔNG dùng "xu" / "nguyên" — đó là leak TQ. Đồng / nghìn đồng / triệu đồng / tỷ đồng.

CASTS (chương 1-50):
- Mẹ Lan: 50 tuổi, bán bún bò chợ Tân Định 25 năm. Thương Long, lo về VN không ổn. Motivation chính: Long muốn bà tự hào, đóng cửa quầy bún hưu trí.
- Bố Hùng: ex-shipper Grab, 53 tuổi, tự ti sau khi Long đi xa 5 năm. Khôi phục pride dần qua arc.
- Em gái Linh: 19 tuổi, học kinh tế ĐH Kinh Tế (UEH), điểm cao, ngầm thông minh. Sau thành CFO Aniki Group.
- Bạn thân Nam: 24, cùng đi Nhật 2019, về cùng đợt. Thiếu định hướng. Long đào tạo thành sous chef Aniki, sau thành đối tác mở chi nhánh.
- Hương: 23 tuổi, người Đà Nẵng, lao động tự do Sài Gòn 2 năm. Long tuyển làm server bartender. Biết tiếng Nhật cơ bản (học online), thông minh.
- Bà Sáu: chủ mặt bằng 112 Trần Khắc Chân, 65 tuổi, lúc đầu cứng đầu, sau nhận Long làm "cháu trai".
- Anh Tâm "Mini Mafia": môi giới mặt bằng + bảo kê khu Tân Định (small fry, không đáng sợ, có thể trở thành ally).
- Mai (love interest, slow-burn từ chương 80+): 26 tuổi, food blogger nổi tiếng Sài Gòn (250K follower Instagram + Tiktok), background Việt Kiều Pháp, ăn omakase Aniki ngày soft launch → review viral khiến Aniki bùng nổ. Chính trực, khẩu vị tinh tế.
- Yamamoto Hiroshi: 28 tuổi, đàn em Long từ Hanamaru Tokyo kiếp trước. Kiếp này chưa biết Long. Long chủ động liên lạc lại sau khi Aniki ổn định (chương 120+), Hiroshi qua Sài Gòn làm partnerships. Slow trust-building.

ANTAGONISTS (KHÔNG combat MC):
1. Đỗ Minh Khoa — CEO Tokyo Express (chuỗi 50+ chi nhánh Sài Gòn, sushi pseudo-Japanese giá rẻ với cơm chua + cá đông). Sau khi Aniki viral, Khoa copy concept omakase + đặt giá thấp 60% → Long face-slap qua authentic ingredient + import direct + community trust + food critic Mai exposé.
2. Saigon Land Group — môi giới BĐS muốn ép Long rời 112 Trần Khắc Chân để xây tòa nhà. Có quan hệ phòng địa chính. Long counter qua hợp đồng dài hạn + bà Sáu loyalty + lobby chính phủ.
3. Hideo Sato — Wakagashira Aizukotetsukai kiếp trước, kẻ giết Long. Kiếp này (2026+) Aizukotetsukai mở rộng business sang Sài Gòn. Long phải navigate qua intelligence kiếp trước — biết weakness của Hideo, có thể neutralize trước khi Hideo nhận ra Long là threat.
4. Chu Thanh Phương — quan chức UBND P.Tân Định, từ chối cấp phép kinh doanh Aniki vì "thẩm mỹ yakuza không phù hợp văn hóa". Long counter qua tax compliance + tạo việc làm cho dân địa phương + community PR.

PHẢN DIỆN CẤM:
- KHÔNG yakuza Nhật đến Sài Gòn đập Long bằng vũ lực. Mọi conflict resolved qua thương mại / political / informational warfare.
- KHÔNG MC reveal yakuza past public — Long khéo léo ẩn chi tiết Aizukotetsukai, chỉ leak "5 năm Asakusa làm bếp" + "có vài bạn cũ ở Tokyo".
- KHÔNG flashback yakuza fight scene 5 chapters đầu — focus rebirth + restaurant setup.
- KHÔNG harem (single love interest Mai slow-burn từ ch.80, kiss ch.150, cưới ch.300+).
- KHÔNG huyền bí (memory-only rebirth, không hệ thống/golden finger software).
- KHÔNG MC fight (Long gác kiếm — kiếp này KHÔNG đánh nhau, dùng intelligence + business).

PHASE ROADMAP (600 chương — auto-sync nếu master_outline khác):

PHASE 1 (1-50) — TRỌNG SINH + KHỞI NGHIỆP ANIKI:
- Ch.1-3: Long về Tân Sơn Nhất, đoàn tụ gia đình, taxi về Quận 4. Memory flashback nhẹ (1-2 đoạn) về Hanamaru/Aniki Tanaka. Plan: tích vốn + khôi phục yen account + tìm mặt bằng.
- Ch.4-12: Khám phá Sài Gòn 2024 (10 năm trước Long chưa biết gì), tìm mặt bằng, gặp bà Sáu 112 Trần Khắc Chân, thuyết phục thuê (negotiate giá 90 triệu → 80 triệu/tháng).
- Ch.13-25: Renovation Aniki theo aesthetic yakuza-elegant. Hire Nam (bạn thân), Hương (server). Test omakase với gia đình + bạn bè + bạn bè bố. Thiết lập supply chain với Yokoyama-san Tokyo (Long gọi qua kanji handwritten letter — Yokoyama-san không biết Long nhưng tin sự chân thành).
- Ch.26-40: Soft launch Aniki — 8 khách đầu là food blogger Mai + 7 expat Q1. Mai review viral. Booking full 1 tháng trước. Doanh thu tháng 1: 200 triệu, lãi 50 triệu.
- Ch.41-50: Tokyo Express copy concept rẻ. Long face-slap qua food critic Mai exposé "Sushi giả vs Sushi thật".

PHASE 2 (51-200) — VIRAL + COMPETITOR + EXPANSION:
- Aniki viral toàn quốc (Tiktok food review boom). Booking full 3 tháng trước.
- Mở chi nhánh 2: "Aniki Kaiseki" Q3 (fine dining, 4 triệu/người, 12 chỗ).
- Đỗ Minh Khoa (Tokyo Express) lobby quận xã ban đêm hose Aniki. Long counter qua tax compliance + community goodwill.
- Saigon Land Group ép rời mặt bằng. Long counter qua hợp đồng 10 năm + bà Sáu loyalty.
- Liên lạc lại Yamamoto Hiroshi Tokyo, Hiroshi qua Sài Gòn 2 tuần khảo sát.

PHASE 3 (201-400) — EMPIRE + PAST RESURFACING:
- Aniki Group: 5 chi nhánh Sài Gòn, mở Đà Nẵng + Hà Nội (2 chi nhánh).
- Hideo Sato của Aizukotetsukai mở "Tokyo Bistro" tại Sài Gòn 2026. Long nhận ra qua intelligence kiếp trước, phải neutralize trước khi Hideo nhận diện.
- Mai và Long tỏ tình ch.150, cưới ch.300.
- Long open up về yakuza past với Mai (chỉ Mai biết, family không).

PHASE 4 (401-600) — IPO + FULL CIRCLE:
- Aniki Group IPO trên HOSE.
- Mở Aniki Tokyo (chi nhánh Asakusa, Nhật) — full circle, return where Long died kiếp trước.
- Long meets Hanamaru Kenji Yamamoto kiếp này (chưa qua đời 2030), Hanamaru sắp sụp đổ tài chính, Long save qua Aniki Group acquisition. Long become stewart truyền thống Hanamaru.
- Climax ch.580: Long đối mặt Aniki Tanaka kiếp trước (giờ 75 tuổi retired, không biết Long), thắp hương tưởng nhớ.
- Final ch.600: Aniki Group là cầu nối ẩm thực Nhật-Việt #1 châu Á.

TONE: pragmatic + cinematic + cultural authenticity (Japanese cuisine + yakuza vibe + Vietnamese Saigon energy) + slow-burn growth. Không pretentious, không pander.

CHAPTER STRUCTURE: 30% MC nấu ăn / phục vụ / customer interaction + 25% business politics + 20% gia đình/Nam friendship + 15% past memory glimpse (qua dreams hoặc trigger reminders) + 10% Mai slow-burn romance.`,
  total_planned_chapters: 600,
};

// ── Helpers (canonical pattern) ──────────

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function generateStoryOutline(projectId: string, seed: NovelSeed): Promise<void> {
  const cfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.75, maxTokens: 8192 };
  const prompt = `Bạn là biên tập viên xuất bản truyện mạng TQ chuyên nghiệp. Thiết kế dàn ý chi tiết cho:

TIÊU ĐỀ: ${seed.title}
NHÂN VẬT CHÍNH: ${seed.main_character}
GENRE: ${seed.genre} (sub: ${seed.sub_genres?.join(', ')})
WORLD: ${seed.world_description.slice(0, 3000)}

Trả về JSON CANONICAL SCHEMA:
{
  "id": "string",
  "title": "${seed.title}",
  "genre": "${seed.genre}",
  "premise": "1-2 câu premise (trọng sinh memory-only + đầu bếp Nhật authentic + yakuza network past + mở Aniki 112 Trần Khắc Chân Sài Gòn)",
  "themes": ["thương chiến F&B", "trọng sinh memory edge", "ẩm thực Nhật authentic + Sài Gòn modern", "yakuza past gác kiếm pivot to chef", "gia đình + community"],
  "mainConflict": "Long vs chuỗi pseudo-Japanese (Tokyo Express CEO Đỗ Minh Khoa) + Saigon Land BĐS Group + Hideo Sato Aizukotetsukai resurfacing",
  "targetChapters": ${seed.total_planned_chapters},
  "protagonist": {
    "name": "${seed.main_character}",
    "startingState": "24 tuổi, vừa hoàn thành 5 năm thực tập sinh kỹ năng tại Tokyo, hạ cánh Tân Sơn Nhất 15/3/2024, có 250 triệu VND tiết kiệm + 30 triệu yen tài khoản JP Bank, mang theo 9 năm ký ức kiếp trước (đầu bếp Hanamaru + kanbu Aizukotetsukai), gia đình ở Q4 Tôn Đản, chưa có yakuza tattoo trên người kiếp này.",
    "endGoal": "Aniki Group IPO trên HOSE + chi nhánh Tokyo (Aniki Asakusa) + cầu nối ẩm thực Nhật-Việt #1 châu Á, Long full-circle về Asakusa save Hanamaru.",
    "characterArc": "NEET-vừa-về-VN → đầu bếp omakase 8 ghế → chuỗi 5 chi nhánh Sài Gòn → Aniki Group đa quốc gia → cha đẻ ngành omakase Việt + bridge Nhật-Việt qua 4 phase."
  },
  "majorPlotPoints": [
    {"chapter": 1, "event": "Long hạ cánh Tân Sơn Nhất, đoàn tụ gia đình ở Q.4 Tôn Đản, memory flashback nhẹ về Hanamaru/yakuza."},
    {"chapter": 15, "event": "Thuê được 112 Trần Khắc Chân từ bà Sáu, bắt đầu renovation Aniki concept yakuza-elegant."},
    {"chapter": 30, "event": "Aniki soft launch — Mai food blogger review viral, booking full 1 tháng."},
    {"chapter": 100, "event": "Tokyo Express copy concept, Long face-slap qua food critic Mai exposé Sushi giả vs Sushi thật."},
    {"chapter": 200, "event": "Aniki Kaiseki Q3 mở thành công, Yamamoto Hiroshi từ Tokyo qua Sài Gòn liên minh."},
    {"chapter": 350, "event": "Hideo Sato Aizukotetsukai mở Tokyo Bistro Sài Gòn 2026, Long phải neutralize qua intelligence kiếp trước."},
    {"chapter": 500, "event": "Aniki Group IPO HOSE, mở Aniki Asakusa Tokyo — Long full circle return."},
    {"chapter": 600, "event": "Long save Hanamaru sụp đổ tài chính, Aniki Group cầu nối Nhật-Việt #1 châu Á."}
  ],
  "endingVision": "Long ở 33 tuổi (cùng tuổi với khi chết kiếp trước nhưng kiếp này thành đại lão F&B), đứng trước Hanamaru Tokyo kiếp này, lập di chúc bảo tồn truyền thống washoku 4 thế hệ + truyền dạy đầu bếp trẻ Việt-Nhật. Aniki Group 50 chi nhánh, định hình ngành omakase Việt. Mai vợ + 2 con. Bố mẹ về Q.4 cũ retired hạnh phúc. Long thắp hương Aniki Tanaka (đã 75 tuổi retired) tưởng nhớ kiếp trước.",
  "uniqueHooks": ["concept Aniki = đàn anh gác kiếm (yakuza retired pivot to chef)", "112 Trần Khắc Chân real address Sài Gòn", "memory-only rebirth + 9 năm ký ức Tokyo + skill đầu bếp Nhật authentic", "tattoo half-sleeve koi+rồng nhìn thấy khi Long xắn tay áo nấu — silent yakuza branding", "Long open about 5 năm Tokyo nhưng kín chuyện Aizukotetsukai"]
}

YÊU CẦU CỨNG:
- protagonist.name PHẢI là "${seed.main_character}" (KHÔNG đổi).
- premise + mainConflict + majorPlotPoints PHẢI reflect đúng world_description (Aniki + 112 Trần Khắc Chân + Hanamaru + Aizukotetsukai + Tokyo Express + Saigon Land Group + Hideo Sato).
- KHÔNG combat / KHÔNG huyền bí / KHÔNG harem / KHÔNG hệ thống / KHÔNG xu hoặc nguyên (đồng thôi).
- majorPlotPoints PHẢI có ≥7 events theo phase roadmap.

Trả JSON thuần (không markdown).`;
  let parsed: StoryOutline | null = null;
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await callGemini(prompt, cfg);
      parsed = parseJSON<StoryOutline>(res.content);
      if (parsed) break;
      console.warn(`  ⚠ story_outline attempt ${i}/3 parseJSON null — retrying`);
    } catch (e) {
      console.warn(`  ⚠ story_outline attempt ${i}/3 error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (!parsed) throw new Error('story_outline failed after 3 attempts');
  // L1 validator (defense from 2026-04-29 incident)
  const outline = validateStoryOutlineOrThrow(parsed, `spawn-aniki[${seed.slug}]`);
  if (outline.protagonist) outline.protagonist.name = seed.main_character;
  const { error } = await s.from('ai_story_projects').update({ story_outline: outline }).eq('id', projectId);
  if (error) throw new Error(`save story_outline failed: ${error.message}`);
}

async function createNovelAndProject(seed: NovelSeed, ownerId: string): Promise<string> {
  // Generate reader-facing description via shared utility (post-2026-04-29 standard).
  // No more hand-typed seed.description with engineering jargon. Validator inside
  // generator throws if jargon leaks; auto-retries up to 3× with feedback.
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
    status: 'Đang ra',
  }).select('id').single();
  if (novelErr || !novel) throw new Error(`novel insert failed: ${novelErr?.message}`);
  console.log(`  ✓ Novel created: ${novel.id}`);

  const styleDirectives: Record<string, unknown> = {
    disable_chapter_split: true,
  };

  const { data: project, error: projErr } = await s.from('ai_story_projects').insert({
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
    sub_genres: seed.sub_genres,
  }).select('id').single();
  if (projErr || !project) throw new Error(`project insert failed: ${projErr?.message}`);
  console.log(`  ✓ Project created: ${project.id}`);
  return project.id;
}

async function generateOutlines(projectId: string, seed: NovelSeed): Promise<void> {
  const cfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.7, maxTokens: 4096 };
  console.log(`  → story_outline...`);
  await generateStoryOutline(projectId, seed);
  console.log(`  ✓ story_outline saved + validated`);
  console.log(`  → master_outline...`);
  const cappedTotal = Math.min(seed.total_planned_chapters, MAX_PLANNED_CHAPTERS);
  let master = null;
  for (let i = 1; i <= 3; i++) {
    master = await generateMasterOutline(projectId, seed.title, seed.genre, seed.world_description, cappedTotal, cfg);
    if (master?.majorArcs?.length) break;
    console.warn(`  ⚠ master_outline attempt ${i}/3 incomplete — retrying`);
  }
  if (!master?.majorArcs?.length) throw new Error('master_outline failed after 3 attempts');
  console.log(`  ✓ master_outline saved (${master.majorArcs.length} arcs)`);
  const lastArcEnd = Math.max(...master.majorArcs.map(a => a.endChapter || 0));
  if (lastArcEnd > 0 && Math.abs(lastArcEnd - cappedTotal) / cappedTotal > 0.1) {
    const newTotal = Math.round(lastArcEnd / 50) * 50 || lastArcEnd;
    await s.from('ai_story_projects').update({ total_planned_chapters: newTotal }).eq('id', projectId);
    console.log(`  ✓ total_planned auto-synced ${cappedTotal} → ${newTotal}`);
  }
}

async function activateAndQuota(projectId: string): Promise<void> {
  await s.from('ai_story_projects').update({ status: 'active' }).eq('id', projectId);
  console.log(`  ✓ Activated`);
  const vnDate = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: existing } = await s.from('project_daily_quotas').select('vn_date').eq('project_id', projectId).eq('vn_date', vnDate).maybeSingle();
  if (existing) {
    await s.from('project_daily_quotas').update({
      written_chapters: 0, status: 'active', next_due_at: new Date().toISOString(),
      retry_count: 0, last_error: null, updated_at: new Date().toISOString(),
    }).eq('project_id', projectId).eq('vn_date', vnDate);
    console.log(`  ✓ Quota for ${vnDate} reset`);
  } else {
    console.log(`  ℹ Cron will create quota row on next tick`);
  }
}

async function main(): Promise<void> {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  SPAWN: Aniki — Đàn Anh Gác Kiếm (thương chiến trọng sinh)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const { data: existing } = await s.from('novels').select('id').eq('slug', SEED.slug).maybeSingle();
  if (existing) {
    console.log(`✗ Novel "${SEED.slug}" exists (id=${existing.id}). Aborting.`);
    return;
  }

  const ownerId = await getOwnerId();
  console.log(`Owner: ${ownerId}`);
  console.log(`▶ ${SEED.title}\n`);

  try {
    const projectId = await createNovelAndProject(SEED, ownerId);
    await generateOutlines(projectId, SEED);
    await activateAndQuota(projectId);
    console.log(`\n✓ Done. Cron viết ch.1 ở */5 tick tiếp theo.`);
    console.log(`  URL: https://truyencity.com/truyen/${SEED.slug}`);
  } catch (e) {
    console.error(`✗ Failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

main().catch(console.error);
