// Spawn novel "Vạn Linh Phổ: Phế Thú Tiến Hóa, Phục Hưng Gia Tộc"
// Focus preset: van-linh-pho-gia-toc (ngu-thu-tien-hoa)
//
// Inserts novels + ai_story_projects rows with full pre-designed kernel.
// After spawn, project status='active' setup_stage='ready_to_write' so
// flash-cheap-routine can be triggered for ch.1 immediately via tsx.

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing Supabase env');

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const TITLE = 'Vạn Linh Phổ: Phế Thú Tiến Hóa, Phục Hưng Gia Tộc';
const SLUG = 'van-linh-pho-phe-thu-phuc-hung-gia-toc';
const TOTAL_CHAPTERS = 1000;

const masterOutline = {
  title: TITLE,
  targetChapters: TOTAL_CHAPTERS,
  majorArcs: [
    {
      name: 'Phục hưng nội tộc — đoạt lại quyền thừa kế',
      startChapter: 1,
      endChapter: 50,
      corePayoff: 'Cố Diệp lấy lại quyền thừa kế từ chú Cố Trường Khải, đẩy lùi đám trưởng lão biển thủ, gia tộc Cố từ phế tộc thành tiểu tộc lại; 3 signature pet (Tro Bụi/Cơ Niệm/Lục Vũ) evolve 2 stage trong bí mật.',
    },
    {
      name: 'Tranh đoạt tiểu tộc Linh Châu',
      startChapter: 51,
      endChapter: 150,
      corePayoff: 'Cố tộc đè bẹp Vương thị + Lý thị, leo lên trung tộc Linh Châu Thành, mở chuỗi cửa hàng pet thuần hoá; em họ Cố Vân Kiếm redemption.',
    },
    {
      name: 'Liên minh trung tộc Linh Châu',
      startChapter: 151,
      endChapter: 300,
      corePayoff: 'Cố tộc thành đại tộc thành Linh Châu, mở học viện ngự thú riêng; em gái Cố Tiểu Đào lộ talent thông giao tâm linh.',
    },
    {
      name: 'Đại tộc Bắc Châu — trả thù bố mẹ',
      startChapter: 301,
      endChapter: 500,
      corePayoff: 'Cứu bố Cố Hành mẹ Lưu Tiêm Nhi khỏi Bắc Vực, diệt đại tộc Bắc Châu kẻ gài bẫy; pet Tro Bụi evolve thành Hỏa Phụng Tế cấp A.',
    },
    {
      name: 'Liên hợp đại lục clan ép Cố tộc',
      startChapter: 501,
      endChapter: 700,
      corePayoff: 'Cố tộc thành bá tộc đại lục, MC tiến vào Đại Sư cảnh; pet portfolio expand 6+; phát hiện thân phận xuyên hồn của tổ phụ.',
    },
    {
      name: 'Hệ tộc thượng cổ thần thú trở lại',
      startChapter: 701,
      endChapter: 900,
      corePayoff: 'Pet Tro Bụi evolve Vạn Lửa Thiên Phụng cấp S; thần thú lập minh ước với Cố tộc; giải mã liên kết Vạn Linh Phổ với Trái Đất.',
    },
    {
      name: 'Thiên Đạo bá chủ Vạn Linh',
      startChapter: 901,
      endChapter: 1000,
      corePayoff: 'Cố Diệp trở thành bá chủ Vạn Linh Đại Lục, pet Tro Bụi Hồng Hoang Phụng Tổ cấp SS, MC chọn ở lại đại lục thay vì về Trái Đất.',
    },
  ],
};

const storyOutline = {
  id: 'van-linh-pho-outline',
  genre: 'ngu-thu-tien-hoa',
  title: TITLE,
  themes: [
    'Phục hưng gia tộc bằng tri thức ẩn',
    'Mode lão lục: kiểm soát thông tin tuyệt đối',
    'Pet evolution = tu dưỡng + kiến thức + công thức BOM',
    'Gia đình ấm áp xen kịch tính nội tộc',
  ],
  ledgers: [
    'pet portfolio (cấp ẩn vs cấp public hiển thị)',
    'feed sequence + risk per evolution path',
    'gia tộc nội bộ uy tín ledger (trưởng lão / đệ tử nghiêng phe nào)',
    'Vạn Linh Phổ database (pet đã observe + tuyến tiến hóa khả thi)',
    'gia tộc Cố thanh thế (phế / tiểu / trung / đại / bá)',
  ],
  premise: 'Cố Diệp 18 tuổi sinh viên Học Viện Ngự Thú Trái Đất 2126 viết luận văn về Tuyến Tiến Hóa Ẩn của yêu thú dùng pattern matching. Tai nạn lab nổ → xuyên hồn vào thân Cố Diệp 16 tuổi đại lục Thiên Linh, là đứa con trưởng họ Cố ở Linh Châu Thành — gia tộc đang sa sút với chú Cố Trường Khải nắm quyền ép MC ký từ bỏ thừa kế. MC dùng Vạn Linh Phổ (di sản tổ phụ chỉ MC dùng được vì xuyên hồn synergy) để tiến hóa pet phế vật trong bí mật, lặng lẽ phục hưng gia tộc Cố từ phế tộc đến bá tộc đại lục theo mode lão lục — tuyệt đối giấu thực lực, đối thủ chỉ làm nền cho MC ăn thưởng + face-slap.',
  canonRules: [
    'MC tuyệt đối GIẤU Vạn Linh Phổ. Không ai được biết, kể cả em gái, quản gia, đệ tử.',
    'Pet evolution PHẢI làm trong bí mật (kho riêng, hậu sơn, phòng kín). KHÔNG có ai chứng kiến quá trình.',
    'Pet đã evolve được giấu cấp thật. Public chỉ ở mức kìm chế thấp hơn cấp thật 1-2 tier.',
    'MC chỉ TIẾT LỘ pet evolved khi đã invincible trong context đó (đối thủ không thể phản kích trong window ngắn).',
    'Cultivation tiến nhanh = lý giải "thiên phú" / "cơ duyên" / "di sản tổ phụ truyền lại". KHÔNG để bị nghi xuyên hồn / golden finger / hệ thống.',
    'CẤM cliffhanger "kẻ lạ biết bí mật MC" / "tin nhắn từ Trái Đất" / "thế lực ngoài đột nhiên đến tìm MC" trừ khi master_outline đã ghi rõ (chỉ ch.701+ khi giải mã liên kết Vạn Linh Phổ với Trái Đất).',
    'CẤM NPC thường (đệ tử, customer, đồng môn, đối thủ peer-level) khám phá bí mật MC ngẫu nhiên.',
    'Đối thủ KHÔNG xuất hiện liên tục. Mỗi 3-5 chương 1 đợt confront ngắn (1-2 chương) → MC đè bẹp ngay → 2-3 chương breathing.',
    'Đối thủ định nghĩa LÀM NỀN — tồn tại để MC ăn thưởng + được public reaction. KHÔNG chiếm sân khấu lâu hơn MC.',
    'Dopamine source PHẢI ưu tiên: (a) bystander shock thầm trước pet phế đột nhiên thắng pet quý, (b) đối thủ kinh ngạc câm họng, (c) NPC cấp cao bí mật khen MC, (d) giá trị pet tăng phi mã, (e) gia tộc nội bộ ngầm phục MC. KHÔNG MC tự khoe.',
    'MC tone phải lạnh đạm, ít lời, internal monologue tính toán. Public face = "thiếu niên 16 tuổi bình thường, may mắn".',
    'KHÔNG kéo MC khổ liên tục. Max 1-2 chương ngược trước face-slap + payoff.',
    'KHÔNG để pet được buff vô lý không có công thức tiến hóa rõ. Mọi evolution phải có feed sequence concrete + risk + final tier.',
    'KHÔNG để pet biến mất / bị nâng cấp không qua công thức.',
    'MC TUYỆT ĐỐI KHÔNG đánh nhau trực tiếp. Combat phải qua pet (pet vs pet).',
  ],
  protagonist: {
    name: 'Cố Diệp',
    age: 16,
    startingState: 'Ngự Thú Đồ Tể tầng 3, talent thường, không có pet bậc cao. Vừa tỉnh dậy sau khi xuyên hồn — kiếp trước là sinh viên năm cuối Học Viện Ngự Thú Trái Đất 2126 đang viết luận văn Tuyến Tiến Hóa Ẩn. Mang theo kiến thức bio-genome + pattern matching từ Trái Đất, được Vạn Linh Phổ di sản tổ phụ activate khi xuyên hồn. Lạnh đạm, ít lời, tính toán kỹ.',
    endGoal: 'Trở thành bá chủ Vạn Linh Đại Lục, phục hưng gia tộc Cố thành dòng chính của đại lục, pet Tro Bụi đạt cấp Hồng Hoang Phụng Tổ SS.',
    characterArc: 'Từ thiếu niên bị chú ép thừa kế thành tộc trưởng kín tiếng đại lục → bá chủ. Mode lão lục xuyên suốt — không phơi bày dù mạnh đến đâu. Nội tâm dần ấm lên với em gái + người trung thành nhưng giữ vỏ lạnh đạm với người ngoài.',
  },
  setupKernel: {
    mcSecret: {
      secret: 'Cố Diệp xuyên hồn từ Trái Đất 2126, mang kiến thức bio-genome + pattern matching. Vạn Linh Phổ là HUD ẩn cho phép MC nhìn pet thấy: cấp + thuộc tính + 3-5 tuyến tiến hóa khả thi + sequence feed concrete + risk + final tier + cảnh báo nếu feed sai.',
      revealRule: 'Tuyệt đối không công khai trong 700 chương đầu. Không tiết lộ cho em gái, quản gia, đệ tử. Pet evolution chỉ làm trong kho riêng/phòng kín hậu sơn. Cultivation lý giải bằng "di sản tổ phụ" / "thiên phú" / "cơ duyên".',
      outsideWorldKnowledge: 'Người ngoài chỉ biết Cố Diệp là đứa con trưởng họ Cố vừa tỉnh sau suy nhược thần kinh, có thiên phú tổng kê kho và may mắn nhặt được pet phế cũ trong kho. Không ai biết Vạn Linh Phổ, xuyên hồn, hay khả năng nhìn tuyến tiến hóa.',
    },
    benefitLoop: {
      goal: 'Phục hưng gia tộc Cố từ phế tộc đến bá tộc đại lục qua 7 arc, mỗi arc compound từ pet evolution bí mật + thắng đối thủ làm nền + ăn thưởng tài nguyên/uy tín.',
      action: 'Quan sát pet phế trong kho gia tộc + đường phố → Vạn Linh Phổ scan tuyến tiến hóa ẩn → bí mật feed sequence + thời gian → pet evolve trong phòng kín → mang ra public ở mức kìm chế thấp hơn cấp thật 1-2 tier → thắng đối thủ làm nền → bystander shock thầm + đối thủ kinh ngạc + NPC cấp cao khen lén → MC ăn thưởng (tài nguyên / thông tin / uy tín nội tộc / setup-payoff cho pet tiếp theo).',
      benefit: 'Mỗi chương ≥1 dopamine peak. Mỗi 3-5 chương ≥1 big wow (pet evolve / face-slap mass / milestone gia tộc). Compounding: tài nguyên → feed pet tốt hơn → pet mạnh hơn → thắng đối thủ lớn hơn → tài nguyên nhiều hơn.',
      cadence: 'Pet evolution stage mỗi 5-10 chương cho signature pet. Big face-slap mỗi 3-5 chương. Milestone gia tộc (tăng rank phế → tiểu → trung → đại → bá) mỗi arc 100-200 chương. Adversity:dopamine = 10:90.',
    },
    controlRules: {
      payoffCadence: 'Mỗi chương payoff hữu hình + ≥1 đoạn reaction xã hội sảng. Trở ngại xử lý trong cùng chương hoặc tối đa 1-2 chương kèm thưởng. Mỗi 3-5 chương 1 cluster face-slap. Mỗi 5-10 chương pet evolve stage. Mỗi 20-50 chương milestone uy tín nội tộc.',
      antagonistCadence: 'Đối thủ ngắt quãng 3-5 chương 1 đợt confront 1-2 chương. KHÔNG truy đuổi liên tục. Đợt confront xong → 2-3 chương breathing (em gái scene, quản gia kể chuyện, observe pet mới, feed bí mật).',
      dopamineSourcing: '80% dopamine qua phản ứng xã hội (bystander shock / đối thủ kinh ngạc / NPC khen lén / giá pet tăng / nội tộc ngầm phục). 20% qua MC internal monologue tính toán. KHÔNG MC tự khoe / MC tuyên bố / MC đắc ý.',
      secretControl: 'MC mỗi scene tương tác người ngoài: kiểm soát thông tin (lựa lời, deflect câu hỏi, chỉ tiết lộ cần thiết). MC public face = "thiếu niên 16 tuổi bình thường, may mắn".',
      petTierMasking: 'Pet đã evolve cấp X public chỉ ở cấp X-1 hoặc X-2 (tier trên). MC bảo pet kìm chế. Reveal cấp thật chỉ khi đã invincible trong context đó.',
    },
    castRoster: {
      coClanCore: [
        { name: 'Cố Diệp', role: 'MC', age: 16, realm: 'Ngự Thú Đồ Tể tầng 3', secret: 'Vạn Linh Phổ + xuyên hồn' },
        { name: 'Cố Lập Khải', role: 'tổ phụ MC (mất 5 năm trước, biểu tượng)', realm: 'Đại Sư', secret: 'thiết kế Vạn Linh Phổ chỉ MC dùng được' },
        { name: 'Cố Hành', role: 'bố MC (mất tích Bắc Vực 1 năm trước, reveal arc 4)', realm: 'Trung Cấp peak', secret: 'bị gài bẫy bởi đại tộc Bắc Châu' },
        { name: 'Lưu Tiêm Nhi', role: 'mẹ MC (mất tích cùng bố)', realm: 'Sơ Cấp', secret: 'đại sư phụ chế thuốc, biết bí mật gia phả' },
        { name: 'Cố Tiểu Đào', role: 'em gái MC (12 tuổi, MC bảo vệ tuyệt đối)', realm: 'chưa khế ước pet', secret: 'lộ talent thông giao tâm linh ở arc 3' },
      ],
      coClanInternal: [
        { name: 'Cố Trường Khải', role: 'chú MC (antagonist nội tộc arc 1)', realm: 'Sơ Cấp', motive: 'ép MC ký từ bỏ thừa kế, biển thủ kho gia tộc' },
        { name: 'Cố Vân Kiếm', role: 'em họ (cháu của Trường Khải, rival nội tộc)', realm: 'Ngự Thú Đồ Tể đỉnh', motive: 'kiêu ngạo coi thường MC, redemption arc 2' },
        { name: 'Hà Thúc', role: 'quản gia (60 tuổi, trung thành tuyệt đối)', realm: 'Sơ Cấp tầng thấp', secret: 'biết gia phả + bí mật của tổ phụ, không biết Vạn Linh Phổ' },
        { name: 'Cố Già Tâm', role: 'trưởng lão (78 tuổi, trung lập ban đầu)', realm: 'Trung Cấp', motive: 'dần ủng hộ MC sau face-slap đầu tiên' },
      ],
    },
    petSystem: {
      tierLadder: ['F (rác đường phố — slime / sparrow / mouse)', 'E (common forest — wolf / hawk / snake)', 'D (skilled hunter — leopard / bear)', 'C (rare forest deep — tiger / eagle giant)', 'B (legendary — dragon hatchling / phoenix sub-species)', 'A (ancestral — original dragon / suzaku)', 'S (godbeast — qilin / baihu / xuanwu / qinglong / zhuque)', 'SS (mythical primordial)', 'SSS (creator-tier)'],
      tamerLadder: ['Ngự Thú Đồ Tể (1-9 sub)', 'Sơ Cấp (1-9)', 'Trung Cấp (1-9)', 'Cao Cấp (1-9)', 'Đại Sư (1-9)', 'Truyền Thuyết (1-3)', 'Thần Thoại (1-3)'],
      signaturePets: [
        { name: 'Tro Bụi', initialTier: 'F', initialForm: 'slime kho lưu trữ chỉ ăn bụi', publicView: 'phế vật cleaning slime', vanLinhPhoPath: 'Slime Tro (F) → Lửa Tro (E) → Phượng Linh (C) → Hỏa Phụng Tế (A) → Vạn Lửa Thiên Phụng (S) → Hồng Hoang Phụng Tổ (SS)', endgameRole: 'flagship pet 1000 chương' },
        { name: 'Cơ Niệm', initialTier: 'E', initialForm: 'mech bug đường phố giá rẻ', publicView: 'côn trùng cơ giới rẻ tiền', vanLinhPhoPath: 'mech bug (E) → Cơ Khí Vũ Sĩ (D) → Thần Thuật Cơ Sư (B) → Cơ Giới Thần Sứ (S)', endgameRole: 'second pet acquired arc 2' },
        { name: 'Lục Vũ', initialTier: 'F', initialForm: 'sparrow vườn nhà', publicView: 'chim sẻ thường', vanLinhPhoPath: 'sparrow (F) → Phong Yến (E) → Phong Linh (C) → Phong Linh Vương (B) → Bão Phong Đại Đế (S) → Cuồng Phong Tổ Thần (SS)', endgameRole: 'third pet acquired arc 1 ch.40+' },
      ],
    },
    worldMap: {
      tier1: 'Linh Châu Thành (đầu game arc 1-3, ch.1-300) — thành lớn Trung Châu, có gia tộc Cố ở khu Tây nam',
      tier2: 'Bắc Vực (arc 4 ch.301-500) — vùng đông lạnh, beast preserve, nơi bố mẹ MC mất tích',
      tier3: 'Trung Châu (arc 5 ch.501-700) — thủ phủ đại lục, có cung đình + đại tộc thượng lưu',
      tier4: 'Vạn Thú Lĩnh (arc 6-7 ch.701-1000) — núi thiêng cấm địa, nơi thần thú thượng cổ ngủ yên',
    },
  },
  uniqueHooks: [
    'Vạn Linh Phổ HUD — chỉ MC thấy được tuyến tiến hóa ẩn của mọi pet, công thức BOM cụ thể',
    'Mode lão lục tuyệt đối — MC không phơi bày dù mạnh đến đâu, public face thiếu niên may mắn',
    'Đối thủ làm nền — pop up ngắt quãng 3-5 chương, ăn thưởng + đè bẹp, không truy đuổi liên tục',
    'Pet evolution như BOM — feed sequence concrete + thời gian + risk, công thức rõ ràng',
    'Gia đình ấm áp xen kịch tính — em gái Cố Tiểu Đào + quản gia Hà Thúc + trưởng lão Cố Già Tâm = anchor cảm xúc',
  ],
  endingVision: 'Cố Diệp arc 7 thắng thiên đạo bias, pet Tro Bụi cấp Hồng Hoang Phụng Tổ SS, MC chọn ở lại đại lục thay vì về Trái Đất. Em gái Cố Tiểu Đào trở thành Đại Sư thông giao tâm linh. Gia tộc Cố thành dòng chính đại lục. MC vẫn giữ mode lão lục — bá chủ kín tiếng.',
  mainConflict: 'Mode lão lục vs công khai cám dỗ. MC luôn có thể flex full power để giải quyết nhanh, nhưng làm vậy sẽ thu hút thế lực lớn hơn và nguy hiểm gia tộc. Mỗi arc MC phải cân nhắc reveal bao nhiêu để ăn thưởng đủ mà không tự rước họa.',
  majorPlotPoints: [
    'Ch.1: MC tỉnh dậy, diagnose gia tộc nát, plant first seed bí mật ở kho riêng',
    'Ch.2-3: Feed Tro Bụi bí mật → Lửa Tro cấp E, MC kìm chế ở public, thắng giải đấu nội tộc vòng 1',
    'Ch.10: Trưởng lão Cố Già Tâm cho MC vào kho di sản tổ phụ, MC nhận sách công thức tiến hóa cổ',
    'Ch.30: MC acquire Lục Vũ (sparrow), evolve sang Phong Yến E trong bí mật',
    'Ch.50: Đoạt lại quyền thừa kế từ chú Cố Trường Khải, gia tộc thành tiểu tộc lại',
    'Ch.100: MC mở chuỗi cửa hàng pet thuần hoá ngầm, dùng front Hà Thúc',
    'Ch.150: Tro Bụi → Phượng Linh cấp C, MC thành tâm điểm Linh Châu Thành',
    'Ch.300: Cố tộc thành đại tộc Linh Châu, em gái Cố Tiểu Đào lộ talent thông giao tâm linh',
    'Ch.400: MC discover bố Cố Hành ở Bắc Vực vẫn sống, bị đại tộc Bắc Châu giam',
    'Ch.500: Cứu bố mẹ + diệt đại tộc Bắc Châu, Tro Bụi → Hỏa Phụng Tế cấp A',
    'Ch.700: Cố tộc thành bá tộc đại lục, MC tiến vào Đại Sư cảnh',
    'Ch.800: Tro Bụi → Vạn Lửa Thiên Phụng cấp S, thần thú lập minh ước',
    'Ch.1000: MC bá chủ Vạn Linh, Tro Bụi Hồng Hoang Phụng Tổ SS',
  ],
};

const styleDirectives = {
  ai_model: 'deepseek-v4-flash',
  provider: 'deepseek_flash_cheap_routine',
  focus_key: 'van-linh-pho-gia-toc',
  codex_director_only: true,
  flash_writer_enabled: true,
  flash_bulk_cheap_mode: true,
  flash_bulk_min_words: 2600,
  flash_bulk_context_max_chars: 32000,
  flash_routine_soft_gate: true,
  flash_routine_max_retries: 1,
  flash_routine_max_extensions: 2,
  disable_chapter_split: true,
  deepseek_thinking_enabled: true,
  deepseek_thinking_tasks: ['writer'],
  production_daily_chapter_quota: 50,
  target_chapter_length_override: 3000,
};

async function main() {
  // Find or create system author
  const { data: existingAuthor } = await db.from('ai_authors').select('id').eq('name', 'Truyện City').maybeSingle();
  let aiAuthorId = existingAuthor?.id ?? null;

  // Find or create system user (owner)
  const { data: profile } = await db.from('profiles').select('id').limit(1).maybeSingle();
  if (!profile?.id) throw new Error('No profile found for owner');
  const ownerId = profile.id;

  const novelId = randomUUID();
  const projectId = randomUUID();
  const now = new Date().toISOString();

  const novelRow = {
    id: novelId,
    title: TITLE,
    author: 'Truyện City',
    cover_url: null,
    cover_prompt: null,
    description: 'Cố Diệp 18 tuổi sinh viên Học Viện Ngự Thú Trái Đất 2126 viết luận văn về Tuyến Tiến Hóa Ẩn của yêu thú. Tai nạn lab nổ → xuyên hồn vào thân con trưởng họ Cố ở đại lục Thiên Linh, gia tộc đang sa sút, chú nắm quyền ép từ bỏ thừa kế. Bằng Vạn Linh Phổ di sản tổ phụ — bàn tay vàng cho thấy tuyến tiến hóa ẩn của vạn vật — Cố Diệp lặng lẽ tiến hóa pet phế vật trong bí mật, đè bẹp đối thủ làm nền, phục hưng gia tộc Cố từ phế tộc đến bá tộc đại lục theo mode lão lục — không bao giờ phơi bày thực lực.',
    status: 'Đang ra',
    genres: ['ngu-thu-tien-hoa', 'ngu-thu-gia-toc', 'lao-luc-mode', 'pet-evolution-bom'],
    slug: SLUG,
    ai_author_id: aiAuthorId,
    owner_id: ownerId,
    chapter_count: 0,
    total_chapters: TOTAL_CHAPTERS,
    created_at: now,
    updated_at: now,
  };

  const projectRow = {
    id: projectId,
    user_id: ownerId,
    novel_id: novelId,
    genre: 'ngu-thu-tien-hoa',
    main_character: 'Cố Diệp',
    world_description: [
      'Thiên Linh Đại Lục là đại lục cổ trang nơi ngự thú sư là tầng lớp chủ đạo. Civilization được xây quanh khả năng khế ước + nuôi dưỡng + tiến hóa pet. Rank ngự thú sư = social rank, gia tộc rank by pet portfolio + tournament + territory.',
      'Power system Ngự Thú Sư có 7 tier: Ngự Thú Đồ Tể (1-9 sub) → Sơ Cấp (1-9) → Trung Cấp (1-9) → Cao Cấp (1-9) → Đại Sư (1-9 — tiến hóa ẩn) → Truyền Thuyết (1-3) → Thần Thoại (1-3). MC start: Đồ Tể tầng 3.',
      'Beast tier system: F (rác đường phố) → E → D → C → B → A → S (godbeast) → SS (primordial) → SSS (creator). MC bí mật giấu cấp thật của pet, public chỉ ở mức cấp thấp hơn 1-2 tier.',
      'Map mở rộng theo arc: Linh Châu Thành (arc 1-3, gia tộc Cố ở Tây nam thành) → Bắc Vực (arc 4, beast preserve, nơi bố mẹ MC mất tích) → Trung Châu (arc 5, thủ phủ đại lục) → Vạn Thú Lĩnh (arc 6-7, núi thiêng cấm địa thần thú thượng cổ).',
      'Currency: Ngự thú tệ (1) — tiền mặt; Điểm cống hiến (1000) — mua tài nguyên hiếm. Resources: vật liệu tiến hóa, lõi năng lượng, mảnh vỡ tinh thạch.',
      'Bàn tay vàng Vạn Linh Phổ là di sản tổ phụ Cố Lập Khải Đại Sư mất 5 năm trước. Chỉ MC dùng được vì xuyên hồn synergy. Khi MC nhìn pet → HUD ẩn hiện cấp + thuộc tính + 3-5 tuyến tiến hóa khả thi (mỗi tuyến có sequence feed concrete + thời gian + risk + final tier) + cảnh báo nếu feed sai sequence sẽ mutate sai/downgrade. Vạn Linh Phổ tự cập nhật khi MC observe pet mới. Cap: chỉ MC thấy, không transfer.',
      'Gia tộc Cố từng là đại tộc Linh Châu Thành, sa sút sau khi tổ phụ mất 5 năm trước + bố mẹ mất tích 1 năm trước trong Bắc Vực. Hiện chỉ còn ~30 người, kho pet bị các trưởng lão biển thủ. Chú Cố Trường Khải nắm quyền ép MC ký từ bỏ thừa kế.',
    ].join('\n'),
    writing_style: 'webnovel_chinese',
    target_chapter_length: 3000,
    ai_model: 'deepseek-v4-flash',
    temperature: 1.0,
    current_chapter: 0,
    total_planned_chapters: TOTAL_CHAPTERS,
    status: 'active',
    setup_stage: 'ready_to_write',
    setup_stage_attempts: 0,
    sub_genres: ['ngu-thu-gia-toc', 'lao-luc-mode', 'pet-evolution-bom'],
    mc_archetype: 'sleeper transmigrator beast-evolution master reviving fallen clan',
    anti_tropes: [
      'no_miserable_start',
      'no_mc_combat',
      'no_pet_unsourced_powerup',
      'no_publicly_revealed_advantage',
      'no_continuous_antagonist_pressure',
      'no_secret_leak_to_outsiders',
      'no_mc_meddling_for_strangers',
      'no_random_outside_force_knows_mc',
    ],
    master_outline: masterOutline,
    story_outline: storyOutline,
    style_directives: styleDirectives,
    updated_at: now,
  };

  console.log(`Inserting novel "${TITLE}"`);
  console.log(`  novel_id:   ${novelId}`);
  console.log(`  project_id: ${projectId}`);

  const { error: novelErr } = await db.from('novels').insert(novelRow);
  if (novelErr) {
    console.error('NOVEL INSERT FAILED:', novelErr);
    process.exit(1);
  }
  const { error: projectErr } = await db.from('ai_story_projects').insert(projectRow);
  if (projectErr) {
    await db.from('novels').delete().eq('id', novelId);
    console.error('PROJECT INSERT FAILED:', projectErr);
    process.exit(1);
  }

  // Today's quota row so cron picks immediately
  const todayVN = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const quotaRow = {
    project_id: projectId,
    vn_date: todayVN,
    target_chapters: 50,
    written_chapters: 0,
    status: 'active',
    next_due_at: now,
    retry_count: 0,
    last_error: null,
    updated_at: now,
  };
  const { error: quotaErr } = await db.from('project_daily_quotas').insert(quotaRow);
  if (quotaErr) {
    console.warn('QUOTA INSERT WARNING:', quotaErr.message);
  } else {
    console.log(`  quota row inserted for ${todayVN}`);
  }

  console.log(`\nSpawn complete. Project status=active setup_stage=ready_to_write.`);
  console.log(`To trigger ch.1 manually:`);
  console.log(`  PROJECT_ID=${projectId} npx tsx scripts/write-chapter-flash.ts`);
  console.log(`To verify:`);
  console.log(`  novel_id=${novelId}`);
  console.log(`  project_id=${projectId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
