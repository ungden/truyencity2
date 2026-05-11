/**
 * Phase J — Spawn 40 novels covering 13 archetype templates mới (Phase H).
 *
 * Each novel:
 *  - Title CỐ Ý nhắm vào archetype routing keywords
 *  - status='paused', setup_stage='idea'
 *  - style_directives.disable_chapter_split = true
 *  - total_planned_chapters = 1000 (matches template skeleton)
 *
 * After spawn, run mass-instantiate-templates.ts để fill chapter_blueprints.
 * Then run codex bulk cover gen. Then activate.
 *
 * Usage: ./node_modules/.bin/tsx scripts/spawn-phase-h-archetypes.ts [--apply]
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface NovelSeed {
  title: string;
  slug: string;
  genre: string;
  targetTemplate: string; // expected template after routing
  main_character: string;
  description: string; // short reader-facing
  world_description: string; // for setup pipeline
  total_planned_chapters: number;
}

// 40 seeds — keyword-tuned cho 13 templates mới
const SEEDS: NovelSeed[] = [
  // ── FALOO quốc-vận prompt (4 novels) ──
  {
    title: 'Quốc Vận: Khai Cục Ta Có Hệ Thống Gợi Ý 999 Lần',
    slug: 'quoc-van-khai-cuc-he-thong-goi-y-999-lan',
    genre: 'do-thi', targetTemplate: 'faloo-quoc-van-prompt',
    main_character: 'Lý Phong',
    description: 'MC Lý Phong nhận hệ thống gợi ý (prompt) khi tham gia Quốc Vận Đại Hội — mỗi quyết định sẽ hiện hint cho biết outcome. Leo từ top 1000 thành phố → top 10 quốc gia → cosmic-tier.',
    world_description: 'Bối cảnh: Việt Nam năm 2026. Quốc Vận Đại Hội là event toàn cầu — mỗi nước cử champion tham gia, kết quả ảnh hưởng vận khí quốc gia thật sự (kinh tế, ngoại giao, thiên tai). MC Lý Phong (22t, sinh viên Bách Khoa Sài Gòn) bất ngờ nhận hệ thống prompt — mỗi quyết định trong event sẽ hiển thị 1-3 hint cosmic-tier về outcome. Hệ thống ban đầu chỉ trợ giúp event, sau mở rộng ra real-world. Đối thủ chính: Hắc Vũ (champion Trung Quốc, hệ thống tương đương nhưng mode ác). Cấu trúc 5 cấp tournament: city → national → continental → global → cosmic.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Quốc Vận Tournament: Mỗi Lượt Một Hint Cosmic',
    slug: 'quoc-van-tournament-moi-luot-mot-hint-cosmic',
    genre: 'do-thi', targetTemplate: 'faloo-quoc-van-prompt',
    main_character: 'Trần Minh',
    description: 'Trần Minh, sinh viên IT vô danh, bất ngờ được chọn vào Quốc Vận Tournament. Hệ thống prompt hé lộ outcome trước mỗi lượt — anh dùng cosmic hint từng bước đè bẹp thiên kiêu quốc gia.',
    world_description: 'Bối cảnh: Hải Long Đô 2026, tournament Quốc Vận tổ chức 5 năm 1 lần. Hệ thống prompt MC: mỗi tap "Hint" reveal 1 outcome khả thi với cost (giảm vận khí 1%). MC phải tính toán khi nào dùng hint. Đối thủ: Hắc Vũ (champion Đông Nam Á, system khác mode), Vạn Cổ Đế (cosmic-tier antagonist hidden). Cấu trúc tournament: regional → national → continental → global → cosmic finale.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Hint Hệ Thống: Quốc Vận Vô Địch Lưu',
    slug: 'hint-he-thong-quoc-van-vo-dich-luu',
    genre: 'do-thi', targetTemplate: 'faloo-quoc-van-prompt',
    main_character: 'Hoàng Trí',
    description: 'Hoàng Trí, công nhân nhà máy ngày Hải Long Đô, bất ngờ được hệ thống gợi ý chọn làm đại biểu Quốc Vận. Mỗi sự kiện trong event là phó bản đời thường biến dị.',
    world_description: 'Bối cảnh: Hải Long Đô 2026. Hệ thống Hint dùng 3 lần / phó bản — mỗi lần show possible outcome trong 24h sắp tới. MC dùng hint để tránh thiên tai / chốt deal / cứu người. Tổ chức Quốc Vận quan sát MC như candidate cosmic-tier. Cấu trúc: 7 phó bản (lửa / bão / dịch / kinh tế / chính trị / ngoại xâm / cosmic) → 200 chương / phó bản giai đoạn cuối.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Quốc Vận: Prompt Cosmic Cho Phép Ta Vô Địch',
    slug: 'quoc-van-prompt-cosmic-cho-phep-ta-vo-dich',
    genre: 'do-thi', targetTemplate: 'faloo-quoc-van-prompt',
    main_character: 'Nguyễn Đại Phong',
    description: 'Nguyễn Đại Phong nhận hệ thống prompt cosmic-tier — mỗi prompt là 1 oracle vision về tương lai 7 ngày. Quốc Vận Đại Hội biến anh thành cosmic guardian Việt Nam.',
    world_description: 'Bối cảnh: 2026 Việt Nam, Quốc Vận Đại Hội organize bởi UN Cosmic Council. Prompt MC: oracle vision 7-day future, mỗi dùng tốn 100 điểm vận khí. Ban đầu MC dè dặt, sau quen vung tay. Cosmic Council reveal arc 4 — admin scout. Cấu trúc 5-tier ascension.',
    total_planned_chapters: 1000,
  },

  // ── FALOO 综漫 reaction (4 novels) ──
  {
    title: 'Tổng Mạn: Phơi Bày Itachi Bí Mật, Konoha Phá Phòng',
    slug: 'tong-man-phoi-bay-itachi-bi-mat-konoha-pha-phong',
    genre: 'dong-nhan', targetTemplate: 'faloo-tong-man-reaction',
    main_character: 'Diệp Phong',
    description: 'Diệp Phong nhận hệ thống Tổng Mạn Phơi Bày — mỗi reveal canon backstory trigger reaction "phá phòng" từ nhân vật anime. Multi-canon: Naruto, OP, Bleach, Demon Slayer.',
    world_description: 'Bối cảnh: MC tỉnh dậy trong Hub Space tổng mạn. Hệ thống cho phép travel qua canons + reveal scene chưa từng được show. Mỗi reveal: scene paused → MC narrate backstory → all canon characters react. Đặc trưng: format dialogue/narrative kết hợp. Cấu trúc: 6 canons × 100-150 chương + cosmic author room arc cuối.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Tổng Mạn Reaction: Joy Boy Lai Lịch Khiến Marines Khủng Hoảng',
    slug: 'tong-man-reaction-joy-boy-lai-lich-khien-marines-khung-hoang',
    genre: 'dong-nhan', targetTemplate: 'faloo-tong-man-reaction',
    main_character: 'Lâm Vũ',
    description: 'Lâm Vũ xuyên qua One Piece nhưng có hệ thống Phơi Bày — mỗi tập reveal mảnh canon lore khiến Marines / Pirates / Government phá phòng. Sau đó multi-canon travel.',
    world_description: 'Bối cảnh: MC bắt đầu trong One Piece world. Hệ thống Phơi Bày mở khoá khi MC kích hoạt key event (Mary Geoise, Void Century, Joy Boy backstory, Im identity). Mỗi reveal đe doạ world order. Marines/Pirates/World Government react khác nhau. Sau OP complete, MC travel sang Naruto / Bleach / DBZ / Demon Slayer. Cosmic author room arc 6.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Phơi Bày Canon: Tổng Mạn Vạn Giới Reaction',
    slug: 'phoi-bay-canon-tong-man-van-gioi-reaction',
    genre: 'dong-nhan', targetTemplate: 'faloo-tong-man-reaction',
    main_character: 'Hứa Vĩnh',
    description: 'MC Hứa Vĩnh travel qua 10 anime canon, mỗi nơi phơi bày 1 secret. Hệ thống thu hoạch reaction points để upgrade abilities.',
    world_description: 'Bối cảnh: Hub Space + 10 canon worlds: Naruto / OP / Bleach / DBZ / Demon Slayer / AOT / OPM / HxH / FMA / Death Note. MC visit mỗi 100 chương, reveal 1-2 secrets, collect reaction points. Đặc biệt Death Note arc — MC reveal Light backstory trước death, comedic reaction. Cosmic author OC final arc.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Tổng Mạn Đại Phơi Bày: Nhân Vật Phản Diện Phá Phòng Tập Thể',
    slug: 'tong-man-dai-phoi-bay-nhan-vat-phan-dien-pha-phong-tap-the',
    genre: 'dong-nhan', targetTemplate: 'faloo-tong-man-reaction',
    main_character: 'Trác Phong',
    description: 'Trác Phong với hệ thống Phơi Bày specialized — reveal phản diện backstory. Madara, Doflamingo, Aizen, Muzan đều phá phòng khi quá khứ tăm tối được hé lộ.',
    world_description: 'MC focus reveal villain backstories across multi-canon. Mỗi villain react khác (Madara cười, Aizen lạnh, Doflamingo điên, Muzan nổi giận). Comedy + tension hybrid. Cosmic author OC = original villain template creator. Cấu trúc 5 canons × 150 ch + meta finale.',
    total_planned_chapters: 1000,
  },

  // ── HUYEN-HUYEN occult-steampunk (4 novels) ──
  {
    title: 'Quỷ Bí Chi Tử: Sequence 9 Đêm Thánh Đoàn',
    slug: 'quy-bi-chi-tu-sequence-9-dem-thanh-doan',
    genre: 'huyen-huyen', targetTemplate: 'huyen-huyen-occult-steampunk',
    main_character: 'Chu Minh Thụy',
    description: 'Chu Minh Thụy xuyên vào thế giới steampunk + cosmic horror, awaken Sequence 9 (Người Chiêm Bốc). Đêm Thánh Đoàn nhận anh làm thành viên, leo lên Sequence 0 Divinity.',
    world_description: 'Bối cảnh: Bắc Ngạn (Backlund), thành phố steampunk châu Âu fantasy + cosmic horror. Hệ thống cultivation Sequence 9→0 — mỗi tier là ritual với materials hiếm. MC awaken Sequence 9 "Người Chiêm Bốc" — pathway divination. Đêm Thánh Đoàn = tổ chức điều tra hiện tượng siêu nhiên. Dark cults gây nguy cơ ancient gods awakening. Tone u ám + bí ẩn + cautious progression. Sequence ascension chứa madness risk.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Vạn Cổ Chiêm Bốc Sư: Steampunk Bắc Ngạn',
    slug: 'van-co-chiem-boc-su-steampunk-bac-ngan',
    genre: 'huyen-huyen', targetTemplate: 'huyen-huyen-occult-steampunk',
    main_character: 'Lý Cổ',
    description: 'Lý Cổ awaken Sequence 9 Chiêm Bốc Sư trong thế giới steampunk Bắc Ngạn. Đối phó dark cults + ancient gods qua ritual + investigation.',
    world_description: 'Bối cảnh: Bắc Ngạn steampunk 1880s. MC Lý Cổ xuyên không, awaken Sequence 9 pathway "Người Chiêm Bốc" (divination). Gia nhập Đêm Thánh Đoàn — tổ chức 24 pathways, anti-cult investigators. Major dark cults: Aurora Order, Rose School, Sailor Group. Sequence ascension cost: 1 rare material + 24h ritual + sanity check. Final arc: Sequence 0 = guardian of city.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Lord of Mysteries: Đạo Đoàn Sequence 9',
    slug: 'lord-of-mysteries-dao-doan-sequence-9',
    genre: 'huyen-huyen', targetTemplate: 'huyen-huyen-occult-steampunk',
    main_character: 'Henry Smith',
    description: 'Henry Smith awaken Sequence 9 Đạo Đoàn của Loen Empire. Cosmic horror investigations + dark cults + ritual ascension đến Sequence 0.',
    world_description: 'Bối cảnh: Loen Empire steampunk 1850s. MC Henry Smith awaken Sequence 9 pathway "Đạo Đoàn / Investigator". Cosmic horror investigations: missing persons, ritual cults, ancient gods incarnations. Tone Lovecraftian. Sequence path-based cultivation. 24 pathways trong world. Final: become guardian of Loen.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ritual Đêm Thánh: Cosmic Horror Sequence Path',
    slug: 'ritual-dem-thanh-cosmic-horror-sequence-path',
    genre: 'huyen-huyen', targetTemplate: 'huyen-huyen-occult-steampunk',
    main_character: 'Tô Minh',
    description: 'Tô Minh xuyên vào Bắc Ngạn steampunk, awaken Sequence 9 ritual master. Multi-ritual ascension đến cosmic guardian tier.',
    world_description: 'MC Tô Minh - scholar xuyên không vào Bắc Ngạn 1880s. Awaken Sequence 9 ritual master pathway. Specialized trong ritual design - có thể tạo ritual mới (rare ability). Đêm Thánh Đoàn nhận làm member. Ancient gods awakening events arc 3-4. Sequence 0 final arc.',
    total_planned_chapters: 1000,
  },

  // ── NGON-TINH mã giáp reveal (4 novels) ──
  {
    title: 'Phu Nhân, Cô Lại Rớt Mã Giáp #5 Rồi!',
    slug: 'phu-nhan-co-lai-rot-ma-giap-5-roi',
    genre: 'ngon-tinh', targetTemplate: 'ngon-tinh-ma-giap-reveal',
    main_character: 'Tô Tô',
    description: 'Tô Tô bề ngoài là cô gái bình thường, nhưng có 6 mã giáp ẩn: học bá, doctor, hacker, hidden CEO, chân thiên kim, international figure. Mỗi reveal đè bẹp đối thủ.',
    world_description: 'Bối cảnh: Hà Nội 2026. Tô Tô (22t, sinh viên) ẩn 6 identity. Male lead Trần Mộ Dao (CEO 28t hào môn) tình cờ phát hiện mã giáp #1 (top quốc gia exam), rồi từng identity rộ ra qua các crisis events. Family Lý gia thâm độc + rival Lý Vy female + Hắc Vũ male cyber rival. Cấu trúc 6 arcs × 150 chương per mã giáp reveal.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Tô Tô Ẩn Thân Vạn Mã Giáp: Học Bá → Y Đạo → Hacker → CEO',
    slug: 'to-to-an-than-van-ma-giap-hoc-ba-y-dao-hacker-ceo',
    genre: 'ngon-tinh', targetTemplate: 'ngon-tinh-ma-giap-reveal',
    main_character: 'Tô Vy',
    description: 'Tô Vy có 5 mã giáp: top quốc gia exam, cardiologist, white-hat hacker, hidden CEO, chân thiên kim hào môn. Cộng đồng từ ngạc nhiên đến phá phòng tập thể.',
    world_description: 'Tô Vy (20t) ngoại hình ordinary, ẩn 5 mã giáp. Hào môn male lead Lý Phong (CEO 30t) crush MC từ first encounter. Mỗi crisis kéo mã giáp lộ. Cyber rival Hắc Vũ + female rival Phạm Vy. Cấu trúc 5 arcs reveal + 2 arcs cosmic-tier identity.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Mã Giáp Phu Nhân: Đại Lão Vô Hình Trong Hào Môn',
    slug: 'ma-giap-phu-nhan-dai-lao-vo-hinh-trong-hao-mon',
    genre: 'ngon-tinh', targetTemplate: 'ngon-tinh-ma-giap-reveal',
    main_character: 'Lâm Tử Linh',
    description: 'Lâm Tử Linh kết hôn hợp đồng với Trần Đại — Trần gia hào môn coi thường. Mỗi gia tộc crisis, một mã giáp của MC lộ ra: y đạo, kinh doanh, võ thuật, AI...',
    world_description: 'Bối cảnh: Sài Gòn 2026 hào môn. MC Lâm Tử Linh (24t) ký hợp đồng hôn nhân với Trần Đại (28t hào môn 3 đời) để cứu công ty gia đình. Trần gia + chính thê cũ Mai Mai coi thường MC. Mỗi crisis Trần gia (ban giám đốc đảo chính / scandal / cyber attack / political trouble) kéo 1 mã giáp MC lộ. 6 mã giáp totals.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Đại Tiểu Thư Rớt Mã Giáp: Thiên Tài Bí Mật',
    slug: 'dai-tieu-thu-rot-ma-giap-thien-tai-bi-mat',
    genre: 'ngon-tinh', targetTemplate: 'ngon-tinh-ma-giap-reveal',
    main_character: 'Diệp Linh',
    description: 'Diệp Linh là đại tiểu thư hào môn "vô dụng", thực ra ẩn 7 mã giáp top tier. Mỗi reveal đảo vị thế gia tộc + face-slap đám fake heiress.',
    world_description: 'MC Diệp Linh (22t) là đại tiểu thư Diệp gia hào môn 4 đời. Mọi người (kể cả gia đình) coi MC ordinary. Thực ra MC ẩn 7 mã giáp: học vấn, y đạo, hacker, CEO ẩn, kiếm thuật, international relations, cosmic-tier identity. Fake heiress Lý Vy giả thiên kim. Male lead Trần Mộ Dao crush. Reveal qua family + business + national crises.',
    total_planned_chapters: 1000,
  },

  // ── TIEN-HIEP meta-comedy (3 novels) ──
  {
    title: 'Ta Bịa Một Tông Môn Cứu Cánh, Sao Mọi Người Đến Bái Sư?',
    slug: 'ta-bia-mot-tong-mon-cuu-canh-sao-moi-nguoi-den-bai-su',
    genre: 'tien-hiep', targetTemplate: 'tien-hiep-meta-comedy',
    main_character: 'Lý Phong',
    description: 'Lý Phong xuyên không, vì buồn nên bịa ra "Vạn Cổ Thiên Đạo Tông" để dọa đối thủ. Ai ngờ tông môn thật sự hình thành, đệ tử tin sái cổ, đại lục tin MC là Tổ Sư.',
    world_description: 'MC Lý Phong (xuyên không hiện đại) trong dị thế tu tiên đại lục. Vì rảnh, bịa ra "Vạn Cổ Thiên Đạo Tông" với 7 cấm địa tu luyện vô lý. Tiểu Lý (đệ tử ngoại môn ngộ nhận) follow nghiêm túc. Hiểu lầm chain — sect lớn tin MC là Tổ Sư cosmic-tier. MC clueless suốt arcs 1-5, đến arc 6 mới bắt đầu nghi mình thật mạnh. Comedy + 4th wall awareness.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Đệ Tử Tin Sái Cổ Rằng Ta Là Đại Năng',
    slug: 'de-tu-tin-sai-co-rang-ta-la-dai-nang',
    genre: 'tien-hiep', targetTemplate: 'tien-hiep-meta-comedy',
    main_character: 'Trần Phong',
    description: 'Trần Phong tỉnh dậy trong tu tiên world, vô thức trở thành "Lão Tổ" của Hắc Liên Tông. Đệ tử tin mọi câu nói random của MC là cosmic-tier wisdom.',
    world_description: 'MC Trần Phong tỉnh dậy trong tu tiên đại lục như "Lão Tổ" Hắc Liên Tông — đệ tử ngàn người. Mọi người tin MC cosmic-tier. MC thực ra newbie không biết tu tiên. Mỗi câu nói random của MC được đệ tử interpret như Đạo lý thâm sâu. Comedy escalate qua arcs — đối thủ nghi MC cosmic-tier, các sect lớn đến xin chỉ giáo. Hiểu lầm chain tiếp tục đến arc 6.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Hiểu Lầm Tu Tiên: Bịa Cosmic, Ai Ngờ Thành Thật',
    slug: 'hieu-lam-tu-tien-bia-cosmic-ai-ngo-thanh-that',
    genre: 'tien-hiep', targetTemplate: 'tien-hiep-meta-comedy',
    main_character: 'Diệp Vũ',
    description: 'Diệp Vũ xuyên không, bịa ra "Hỗn Nguyên Đạo Trú Tổ Sư Môn" với techniques vô lý. Sect bịa hoá thật, MC trở thành cosmic guardian trong vô thức.',
    world_description: 'MC Diệp Vũ xuyên không vào tu tiên đại lục. Bịa "Hỗn Nguyên Đạo Trú Tổ Sư Môn" với 9 cấm địa + 7 cosmic techniques fake. Tiểu Linh (first follower) tin tuyệt đối. Sect form ra thật từ believers. Comedy meta — MC narrate 4th wall.',
    total_planned_chapters: 1000,
  },

  // ── LICH-SU coroner mystery (3 novels) ──
  {
    title: 'Đại Lý Đả Canh Nhân: Ngỗ Tác Triều Đường',
    slug: 'dai-ly-da-canh-nhan-ngo-tac-trieu-duong',
    genre: 'lich-su', targetTemplate: 'lich-su-coroner-mystery',
    main_character: 'Hứa Thất An',
    description: 'Hứa Thất An, cảnh sát hiện đại, xuyên về Đại Lý (cổ đại) gia nhập Đả Canh Tự. Mỗi sub-arc là 1 case + 1 power tier ascension. Phá án + triều đường + huyền năng.',
    world_description: 'Bối cảnh: Đại Lý quốc cổ đại (giả lập, dựa Đại Phụng). MC Hứa Thất An (28t cảnh sát hiện đại) xuyên hồn thành ngỗ tác trẻ Đả Canh Tự. Power tiers: Đồng tỳ → Ngân tỳ → Hoàng kim tỳ → Đồng đẳng phẩm → Nhất phẩm → Siêu phẩm → Tổ tỳ. Mỗi tier mở khả năng huyền năng (lửa, tâm linh, hình thân). Cases procedural: vụ giết người phố thị → triều đình vụ → quốc gia → cosmic. Tone detective + sarcastic.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Cẩm Y Vệ Phá Án: Mỗi Vụ Một Cấp Bậc',
    slug: 'cam-y-ve-pha-an-moi-vu-mot-cap-bac',
    genre: 'lich-su', targetTemplate: 'lich-su-coroner-mystery',
    main_character: 'Trần Tử Long',
    description: 'Trần Tử Long, cảnh sát hiện đại xuyên Đại Minh thành Cẩm Y Vệ. Mỗi vụ án giải xong leo 1 cấp. Phá án + triều đường + Cẩm Y Vệ võ học.',
    world_description: 'Bối cảnh: Đại Minh dynasty. MC Cẩm Y Vệ trẻ. Power tiers: Tiểu kỳ → Trung kỳ → Đại kỳ → Tổng kỳ → Chỉ huy → Đô đốc. Đặc trưng: Cẩm Y Vệ võ học + cổ pháp huyền năng. Cases: triều đình intrigue, hậu cung scandal, ngoại bang gián điệp, yêu thần khích biến. Cosmic-tier arc 4-6.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ngỗ Tác Đại Đường: Phá Án Triều Đường Cấp Tỳ',
    slug: 'ngo-tac-dai-duong-pha-an-trieu-duong-cap-ty',
    genre: 'lich-su', targetTemplate: 'lich-su-coroner-mystery',
    main_character: 'Lý Vĩnh',
    description: 'Lý Vĩnh forensics hiện đại xuyên Đại Đường thành ngỗ tác. Solve cases phá triều đình conspiracy đến cosmic-tier god cult.',
    world_description: 'Bối cảnh: Đại Đường giả lập. MC Lý Vĩnh (30t pháp y hiện đại) xuyên thành ngỗ tác chính tại Trường An. Power tiers tương tự Đại Phụng. Cases: phố thị giết người → corrupt quan → triều đình → quốc gia → cosmic god cult. Tone procedural + dark.',
    total_planned_chapters: 1000,
  },

  // ── KHOA-HUYEN time-loop thriller (3 novels) ──
  {
    title: 'Vòng Lặp Thiên Tài: Mỗi Lần Sống Lại Là Một Câu Đố',
    slug: 'vong-lap-thien-tai-moi-lan-song-lai-la-mot-cau-do',
    genre: 'khoa-huyen', targetTemplate: 'khoa-huyen-time-loop-thriller',
    main_character: 'Lý Vinh',
    description: 'Lý Vinh phát hiện mỗi khi chết là reset 24h. Tổ chức bí mật "Thiên Tài Câu Lạc Bộ" nhận MC làm member. Mỗi mystery 1 vòng lặp.',
    world_description: 'Bối cảnh: Bắc Kinh 2026. MC Lý Vinh phát hiện time-loop ability — chết = reset 24h. Tổ chức "Thiên Tài Câu Lạc Bộ" recruit MC. Mỗi mission là 1 mystery / event prevention requiring multi-loop investigation. Adversary: Tổ Thời Gian Đế (cosmic-tier admin). Cấu trúc: 7 cases tier 1-3 → cosmic admin major arcs 4-6.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Time Loop Thiên Tài Câu Lạc Bộ: Cứu Thế Giới Đa Tầng',
    slug: 'time-loop-thien-tai-cau-lac-bo-cuu-the-gioi-da-tang',
    genre: 'khoa-huyen', targetTemplate: 'khoa-huyen-time-loop-thriller',
    main_character: 'Trần Vũ',
    description: 'Trần Vũ join Thiên Tài Câu Lạc Bộ, mỗi loop là 1 cosmic mystery. Adversary là Cosmic Architect.',
    world_description: 'MC Trần Vũ (25t) trong Thượng Hải 2026. Time-loop trigger qua specific death conditions. Câu Lạc Bộ Thiên Tài = elite time-loopers. Adversary Cosmic Architect manipulate history qua time-streams. MC + companions solve 12 cosmic mysteries. Final showdown arc 7.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Vòng Lặp Mỗi Ngày: Tôi Mơ Thấy Tương Lai',
    slug: 'vong-lap-moi-ngay-toi-mo-thay-tuong-lai',
    genre: 'khoa-huyen', targetTemplate: 'khoa-huyen-time-loop-thriller',
    main_character: 'Hứa Vinh',
    description: 'Hứa Vinh mỗi đêm mơ thấy 24h tới — death sleeps becomes loop. Giải mã cosmic conspiracy qua iterative experiments.',
    world_description: 'MC Hứa Vinh (24t) mỗi đêm mơ thấy hôm sau. Mỗi event chết = re-mơ. Cosmic conspiracy: Time Stream Council manipulating major historical events. MC + Câu Lạc Bộ Thiên Tài investigate. 7 major mysteries → cosmic council final battle.',
    total_planned_chapters: 1000,
  },

  // ── NGON-TINH cổ ngôn trạch đấu (3 novels) ──
  {
    title: 'Trọng Sinh Cổ Đại: Đích Nữ Họa Mi Đè Bẹp Cả Hoàng Cung',
    slug: 'trong-sinh-co-dai-dich-nu-hoa-mi-de-bep-ca-hoang-cung',
    genre: 'ngon-tinh', targetTemplate: 'ngon-tinh-co-ngon-trach-dau',
    main_character: 'Tô Nhược',
    description: 'Tô Nhược kiếp trước bị chính thê Lý Vy đầu độc + bị Tần Vương phụ tâm, trọng sinh thiếu nữ. Báo thù qua trạch đấu gia tộc → cung đấu → hoàng hậu.',
    world_description: 'Bối cảnh: Đại Đường giả lập, MC Tô Nhược trọng sinh thành đích nữ Tô gia (16t). Kiếp trước MC kết hôn Tần Vương Lý Mộ Bạch, bị chính thê Lý Vy độc giết, bị Tần Vương phụ tâm. Trọng sinh báo thù: face-slap chính thê + mẹ kế + gia tộc rivals → đính hôn Lý Mộ Bạch lần 2 → cung đấu phi tử → hoàng hậu. Triều đường conspiracy arc 4-5. Cosmic-tier ngoại bang arc 6.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Cung Đấu: Hoàng Hậu Trở Lại Từ Cõi Chết',
    slug: 'cung-dau-hoang-hau-tro-lai-tu-coi-chet',
    genre: 'ngon-tinh', targetTemplate: 'ngon-tinh-co-ngon-trach-dau',
    main_character: 'Trầm Vân',
    description: 'Trầm Vân hoàng hậu bị sủng phi giết, trọng sinh thiếu nữ 16t trước khi vào cung. Cảnh báo lại quá khứ, đè bẹp tất cả rivals.',
    world_description: 'Bối cảnh: Đại Tống giả lập. MC Trầm Vân kiếp trước hoàng hậu cuối cùng (chết arc 30t). Trọng sinh 16t trước khi tiến cung. Memory active. Báo thù sủng phi Lý Linh + thái hậu mưu hại. Hôn nhân với Tống Đế Triệu Hằng (kiếp trước phối ngẫu). Cung đấu intrigue + triều đường conspiracy. Cosmic-tier arc 6 - god cult dynasty.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Điền Văn Cổ Đại: Nông Gia Tiểu Phú Quý Trọng Sinh',
    slug: 'dien-van-co-dai-nong-gia-tieu-phu-quy-trong-sinh',
    genre: 'ngon-tinh', targetTemplate: 'ngon-tinh-co-ngon-trach-dau',
    main_character: 'Phương Nhược',
    description: 'Phương Nhược trọng sinh thiếu nữ nông gia. Vừa lo gia đình, vừa kinh doanh điền văn, vừa kết hôn vương gia, vừa cung đấu nhẹ nhàng.',
    world_description: 'MC Phương Nhược (18t) trọng sinh nông gia cổ đại. Skills: y học, kinh doanh, nông nghiệp. Mass face-slap gia đình ác + làng xóm khinh. Tích lũy điền văn empire. Tình cờ gặp vương gia Lý Minh Bạch (ẩn danh). Kết hôn → vương phủ politics → hoàng hậu candidate (nhẹ). Cosmic ngoại bang arc 6.',
    total_planned_chapters: 1000,
  },

  // ── DO-THI y tế hệ thống (3 novels) ──
  {
    title: 'Hệ Thống Y Đạo: Mỗi Ca Một Cấp Nobel',
    slug: 'he-thong-y-dao-moi-ca-mot-cap-nobel',
    genre: 'do-thi', targetTemplate: 'do-thi-y-te-he-thong',
    main_character: 'Lý Tinh Vũ',
    description: 'Lý Tinh Vũ, residents bệnh viện 108 Hà Nội, nhận hệ thống Y Đạo. Mỗi ca cứu impossible patient = 1 tier ascension. Mục tiêu: Nobel + cosmic medical pioneer.',
    world_description: 'Bối cảnh: Hà Nội 2026, Bệnh viện 108. MC Lý Tinh Vũ (26t residents). Hệ thống Y Đạo grant procedural assistance: AI diagnosis, surgical guidance, drug formulation. Mỗi tier ascension qua case solved. Tier 1 attending → director → national → Nobel laureate. Cosmic-tier reveal arc 6 - hệ thống origin = ancient medical civilization.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Thần Y Hệ Thống: Bệnh Viện 108 Đến Cosmic Tier',
    slug: 'than-y-he-thong-benh-vien-108-den-cosmic-tier',
    genre: 'do-thi', targetTemplate: 'do-thi-y-te-he-thong',
    main_character: 'Trần Vũ',
    description: 'Trần Vũ, bác sĩ trẻ 108, nhận hệ thống Thần Y. Save 30+ impossible patients, leo từ residents → cosmic medical pioneer.',
    world_description: 'MC Trần Vũ (27t) bác sĩ tim mạch Bệnh viện 108. Hệ thống Thần Y có 7 modules: tim mạch, thần kinh, phẫu thuật, dược phẩm, y học cổ truyền, gene therapy, cosmic medicine. Mỗi module unlock qua case + Nobel papers. Cosmic origin reveal arc 6.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Bác Sĩ Hệ Thống: Mỗi Bệnh Nhân Một Phẫu Thuật Không Tưởng',
    slug: 'bac-si-he-thong-moi-benh-nhan-mot-phau-thuat-khong-tuong',
    genre: 'do-thi', targetTemplate: 'do-thi-y-te-he-thong',
    main_character: 'Hứa Nhân',
    description: 'Hứa Nhân, residents Bệnh viện Bạch Mai, nhận hệ thống Phẫu Thuật cosmic-tier. Procedural cases + tier ascension → global medical pioneer.',
    world_description: 'MC Hứa Nhân (28t) residents Bệnh viện Bạch Mai. Hệ thống Phẫu Thuật cosmic-tier: AI-assisted impossible surgeries. Cases: cardiac, neuro, oncology, trauma cosmic-tier. Tier 1-7 ascension. Cosmic origin reveal arc 6 - ancient medical god civilization.',
    total_planned_chapters: 1000,
  },

  // ── DI-GIOI mushoku slow growth (3 novels) ──
  {
    title: 'Tái Sinh Dị Giới: 30 Năm Trưởng Thành Từ Cậu Bé Phép Thuật',
    slug: 'tai-sinh-di-gioi-30-nam-truong-thanh-tu-cau-be-phep-thuat',
    genre: 'di-gioi', targetTemplate: 'di-gioi-mushoku-slow-growth',
    main_character: 'Rudeus Greyrat',
    description: 'Rudeus tái sinh dị giới từ baby, growth 30+ năm. Childhood → adventurer → family → mastery → ancient enemy showdown. Realistic character development.',
    world_description: 'Bối cảnh: dị giới fantasy with mage system. MC tái sinh baby trong gia đình Greyrat ở Buena Village. Childhood mage learning → adventurer rank progression → meet love interest Sylphiette → marriage → children → mage mastery → ancient enemy emergence → final showdown → peaceful death. Anti-sảng-văn, character-driven realism.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Jobless Reincarnation Style: Rudeus Phiên Bản Việt',
    slug: 'jobless-reincarnation-style-rudeus-phien-ban-viet',
    genre: 'di-gioi', targetTemplate: 'di-gioi-mushoku-slow-growth',
    main_character: 'Lương Vũ',
    description: 'Lương Vũ tái sinh dị giới từ baby. 30 năm growth realistic, từ childhood mage learning đến cosmic-tier mastery + family legacy.',
    world_description: 'MC Lương Vũ tái sinh baby dị giới Aetheria. Childhood mage training với mentor visiting wizard. Adventurer apprentice rank C → B. Meet companion + love interest. Marriage + children. Mage academy mentor. Ancient enemy emerging arc 5-6. Final battle + peaceful retirement. Slow burn realism.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Tái Sinh Slow Growth: Cậu Bé Phép Thuật Trở Thành Đại Hiền Giả',
    slug: 'tai-sinh-slow-growth-cau-be-phep-thuat-tro-thanh-dai-hien-gia',
    genre: 'di-gioi', targetTemplate: 'di-gioi-mushoku-slow-growth',
    main_character: 'Albus',
    description: 'Albus tái sinh từ baby dị giới. 30 năm slow growth từ childhood → adventurer → settle → mastery → cosmic confrontation.',
    world_description: 'MC Albus reincarnate baby dị giới fantasy. Childhood mage learning intense focus. Adventurer apprentice journey through multi-region. Settle với love interest, raise family, become mage academy chancellor. Final arc: ancient enemy threatens world, MC + family + apprentices unite.',
    total_planned_chapters: 1000,
  },

  // ── COZY fantasy slice-of-life (2 novels) ──
  {
    title: 'Tiệm Bánh Mì Ánh Sáng: Trong Làng Cây Trắc Bá',
    slug: 'tiem-banh-mi-anh-sang-trong-lang-cay-trac-ba',
    genre: 'di-gioi', targetTemplate: 'cozy-fantasy-slice-of-life',
    main_character: 'Lan',
    description: 'Lan mở tiệm bánh mì trong làng Cây Trắc Bá. Slow-burn slice-of-life, customers magical races, magical familiar spirit cat join.',
    world_description: 'Bối cảnh: Aetheria fantasy world, làng Cây Trắc Bá. MC Lan (25t baker, refugee từ vương quốc khác). Mở tiệm bánh nhỏ. Customers gentle: neighbor knight, lonely traveler elf, lost child halfling. Magical familiar Mèo Sương join. Slice-of-life arcs → kingdom recognition → multi-kingdom pilgrimage healing. Anti-sảng-văn, healing tone.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Quán Trà Sương Mai: Khách Lạ Mọi Vương Quốc',
    slug: 'quan-tra-suong-mai-khach-la-moi-vuong-quoc',
    genre: 'di-gioi', targetTemplate: 'cozy-fantasy-slice-of-life',
    main_character: 'Nguyệt Anh',
    description: 'Nguyệt Anh mở quán trà Sương Mai trong dị giới medieval. Multi-race customers + magical familiar + slice-of-life healing.',
    world_description: 'MC Nguyệt Anh mở quán trà nhỏ trong làng Mộc Lan của vương quốc Silver Pine. Customers gentle multi-race. Magical familiar — talking owl. Slice-of-life arcs → adventurer crews visit → royal incognito patronage → multi-kingdom healing tour. Healing tone, no major antagonist.',
    total_planned_chapters: 1000,
  },

  // ── COZY sci-fi space bakery (2 novels) ──
  {
    title: 'Space Bakery Ánh Sao: Trạm Vũ Trụ Aurora',
    slug: 'space-bakery-anh-sao-tram-vu-tru-aurora',
    genre: 'khoa-huyen', targetTemplate: 'cozy-sci-fi-space-bakery',
    main_character: 'Lin',
    description: 'Lin mở Space Bakery Ánh Sao trên trạm vũ trụ Aurora. Alien customers + AI companion + slice-of-life healing trong vũ trụ.',
    world_description: 'Bối cảnh: Galactic Federation 2200. Trạm vũ trụ Aurora ở sector 7. MC Lin (28t baker từ Earth refugee) mở space-bakery nhỏ. Customers alien gentle: lonely cyborg veteran, AI customer with consciousness, multi-species visitors. AI companion AURA-7. Slice-of-life arcs → sector recognition → fleet captain patronage → multi-galaxy healing tour. Anti-sảng-văn, healing tone in space.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Trạm Cosmic Tea House: AI-7 Và Người Lữ Khách',
    slug: 'tram-cosmic-tea-house-ai-7-va-nguoi-lu-khach',
    genre: 'khoa-huyen', targetTemplate: 'cozy-sci-fi-space-bakery',
    main_character: 'Mai',
    description: 'Mai mở Cosmic Tea House trên trạm trade hub. AI companion + alien travelers + slice-of-life space cozy.',
    world_description: 'MC Mai (30t) mở Cosmic Tea House trên trade hub trạm vũ trụ Nexus. AI companion AI-7. Customers: traders, refugees, pirates retired. Gentle community building. Sector recognition arcs → ancient civ artifact mystery (gentle) → multi-galaxy tour healing. Cozy space slice-of-life.',
    total_planned_chapters: 1000,
  },

  // ── ROMANTASY thriller hybrid (2 novels) ──
  {
    title: 'Aria Stormwind: Pháp Sư Điều Tra Của Vương Quốc Bạc',
    slug: 'aria-stormwind-phap-su-dieu-tra-cua-vuong-quoc-bac',
    genre: 'huyen-huyen', targetTemplate: 'romantasy-thriller-hybrid',
    main_character: 'Aria Stormwind',
    description: 'Aria Stormwind, pháp sư trẻ điều tra magical mysteries trong Vương Quốc Bạc Silverhold. Romance với Lord Castor + cosmic conspiracy.',
    world_description: 'Bối cảnh: Kingdom of Silverhold, fantasy medieval với magic system. MC Aria (24t pháp sư mới ra trường) điều tra magical mysteries. Đầu tiên gặp Lord Castor (love interest 28t magical investigator). Mỗi case multi-layer — phía sau là cosmic conspiracy (ancient cabal manipulate kingdom). Romance + mystery thriller song song. Final showdown cosmic conspiracy arc 6-7.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Lord Castor: Bí Mật Của Argentum',
    slug: 'lord-castor-bi-mat-cua-argentum',
    genre: 'huyen-huyen', targetTemplate: 'romantasy-thriller-hybrid',
    main_character: 'Elena',
    description: 'Elena pháp sư trẻ trong thành Argentum, điều tra series mysterious deaths. Gặp Lord Castor, romance + cosmic conspiracy investigation.',
    world_description: 'Bối cảnh: Argentum city trong Kingdom of Silverhold. MC Elena (25t pháp sư academy graduate) đến Argentum làm investigator. Series mysterious deaths shock thành phố. Lord Castor (30t magical detective) cùng MC điều tra. Romance escalate qua thriller — conspiracy ancient cosmic-tier reveal arc 4-6.',
    total_planned_chapters: 1000,
  },
];

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function createNovelAndProject(seed: NovelSeed, ownerId: string): Promise<string | null> {
  // Check if slug exists
  const { data: existing } = await s.from('novels').select('id').eq('slug', seed.slug).maybeSingle();
  if (existing) {
    console.log(`  ⚠ Slug ${seed.slug} already exists — skip`);
    return null;
  }

  const { data: novel, error: novelErr } = await s.from('novels').insert({
    title: seed.title,
    slug: seed.slug,
    author: 'Truyện City',
    description: seed.description,
    genres: [seed.genre],
    status: 'Đang ra',
  }).select('id').single();
  if (novelErr || !novel) throw new Error(`novel insert: ${novelErr?.message}`);

  const styleDirectives: Record<string, unknown> = {
    disable_chapter_split: true,
    expected_template: seed.targetTemplate,
  };

  const { data: project, error: projErr } = await s.from('ai_story_projects').insert({
    novel_id: novel.id,
    user_id: ownerId,
    genre: seed.genre,
    main_character: seed.main_character,
    world_description: seed.world_description,
    total_planned_chapters: seed.total_planned_chapters,
    current_chapter: 0,
    status: 'paused',
    pause_reason: 'phase_h_archetype_spawn_2026-05-11',
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    temperature: 0.75,
    target_chapter_length: 2800,
    ai_model: 'deepseek-v4-flash',
    style_directives: styleDirectives,
  }).select('id').single();
  if (projErr || !project) throw new Error(`project insert: ${projErr?.message}`);
  console.log(`  ✓ ${project.id} | ${seed.title.slice(0, 50)}`);
  return project.id;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Phase J: Spawn 13-archetype Coverage (${SEEDS.length} novels) ${apply ? '[APPLY]' : '[DRY RUN]'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Group by target template
  const byTemplate = new Map<string, number>();
  for (const seed of SEEDS) {
    byTemplate.set(seed.targetTemplate, (byTemplate.get(seed.targetTemplate) || 0) + 1);
  }
  console.log('Template coverage:');
  for (const [tpl, count] of [...byTemplate.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tpl.padEnd(40)} ${count}`);
  }
  console.log('');

  if (!apply) {
    console.log('DRY RUN — no DB writes. Pass --apply to execute.\n');
    return;
  }

  const ownerId = await getOwnerId();
  console.log(`Owner: ${ownerId}\n`);

  let success = 0;
  let failed = 0;
  for (const seed of SEEDS) {
    try {
      const projectId = await createNovelAndProject(seed, ownerId);
      if (projectId) success++;
    } catch (e) {
      console.error(`  ✗ ${seed.title}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  total:    ${SEEDS.length}`);
  console.log(`  success:  ${success}`);
  console.log(`  failed:   ${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
