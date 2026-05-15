/**
 * Story Engine — Benchmark cards (Phase S, 2026-05-15).
 *
 * Hard-coded library of top-performing Chinese webnovels 2024-2026 used
 * as REFERENCE benchmarks during the topic-positioning + idea stages of
 * setup pipeline v3. Each card distills a successful novel into its
 * structural DNA (kernel / opening / world / power system / differentiator)
 * so the engine can:
 *   1. Show AI "here's what a top performer looks like"
 *   2. Force differentiation contract — new novel must differ at ≥1 axis
 *   3. Catch "AI just regenerated benchmark with names swapped" failures
 *
 * Source: 起点中文网 月票榜 2024-2026, 阅文 王者 2025 selections.
 * Data is FACTUAL summary (genre / kernel structure / opening setup) —
 * no copyrightable prose reproduced. Plot summaries paraphrased from
 * public baidu baike / qidian product page descriptions.
 */

import type { GenreType } from '../types';

export interface BenchmarkCard {
  /** Slug ID for cross-reference */
  readonly id: string;
  /** Display title (Chinese original) */
  readonly title: string;
  /** Pinyin/Vietnamese rendering (optional, for VN admin) */
  readonly titleRomanized?: string;
  /** Author name */
  readonly author: string;
  /** Publishing platform */
  readonly platform: 'qidian' | 'fanqie' | 'jjwxc' | 'zongheng' | 'xxsy';
  /** Primary genre */
  readonly genre: GenreType;
  /** Sub-genre tags */
  readonly subGenres: string[];
  /** Peak performance year */
  readonly yearTop: number;
  /** Peak monthly votes (Qidian metric) — null if unknown */
  readonly monthlyVotesPeak: number | null;
  /** Total subscriptions / view count proxy if available */
  readonly subsScale?: string;
  /** Status: ongoing / completed */
  readonly status: 'ongoing' | 'completed';
  /** Kernel structure (4 fields matching engine's setupKernel) */
  readonly kernel: {
    /** What reader fantasy this novel satisfies */
    readonly readerFantasy: string;
    /** Core pleasure loop (3-5 beats reader rides per arc) */
    readonly pleasureLoop: string;
    /** Golden finger / system mechanic spec */
    readonly systemMechanic: string;
    /** MC's hidden setup that drives plot */
    readonly mcSecret: string;
  };
  /** Opening hook (chapter 1-3) — what MC starts doing */
  readonly openingHook: string;
  /** World structure summary (1-3 sentences) */
  readonly worldStructure: string;
  /** Power system tier list + cost mechanic */
  readonly powerSystem: string;
  /** Antagonist scale progression (Phase 1-4 in chapter chunks) */
  readonly antagonistLadder: string;
  /** What makes this 10× more interesting than competitors in same genre */
  readonly differentiator: string;
  /** Patterns AI should NOT blindly copy (legal + creative concerns) */
  readonly cautionPatterns: string[];
  /** Length in chapters (or word count if known) */
  readonly lengthScale: string;
}

// ── 15 benchmark cards across 12 genres ─────────────────────────────────────

export const BENCHMARK_CARDS: readonly BenchmarkCard[] = [
  // ── TIEN-HIEP / CULTIVATION ───────────────────────────────────────────────
  {
    id: 'gou-zai-chu-sheng-mo-men',
    title: '苟在初圣魔门当人材',
    titleRomanized: 'Cẩu Tại Sơ Thánh Ma Môn Đương Nhân Tài',
    author: '鹤守月满池',
    platform: 'qidian',
    genre: 'tien-hiep',
    subGenres: ['dark-cultivation', 'life-replay', 'evil-sect'],
    yearTop: 2025,
    monthlyVotesPeak: 320000,
    subsScale: '10M avg subs in 165 days',
    status: 'completed',
    kernel: {
      readerFantasy: 'Đệ tử tài chất bình thường ở môn phái ma đạo, dùng tri thức 100 kiếp để lật ngược trật tự "weak → consumed as resource"',
      pleasureLoop: 'chết + retain memory → reset → tận dụng kiếp trước → vượt bậc rất nhỏ → tránh được 1 cái chết cụ thể → kiếp sau leo cao hơn',
      systemMechanic: '百世书 (book of 100 lifetimes): die → restart at sect entry day → full memory retained → resources reset; cap 100 lifetimes total; mỗi kiếp MC có thêm hiểu biết về sect politics, traps, treasures',
      mcSecret: 'MC mang 百世书 (cosmic-tier artifact). Ngoài MC chỉ có 1-2 đại năng cấp đạo chủ biết. Phase 1-3 absolute no-leak — nếu sect biết sẽ ép MC làm tế phẩm',
    },
    openingHook: 'Lữ Dương (low-talent đệ tử mới vào sect) bị phân vào Hợp Hoan Điện (lowest hall, ma đạo expendable hall); sư tỷ Ngọc Tố Chân giao bài luyện cơ bản; MC dùng kiếp trước đã thuộc trap layout, biết tránh resource-consume ritual sect dùng để giết đệ tử yếu',
    worldStructure: '多界天 architecture: 星辰界天 (vào được qua tu vi), 玄灵界 (mid-realm), 七曜天 (top); 果位 system — chỉ một số "vị" (slot: 覆灯火 / 城头土 / 天上火) tồn tại, tu sĩ muốn lên cảnh giới mới phải đoạt vị từ người khác → mọi cuộc đột phá đều là 0-sum',
    powerSystem: '炼气 → 筑基 → 金丹 → 元婴 (道主); 果位 slot — limited, must be claimed; 功法《龙虎大乐赋》drains target qi+knowledge+turns target into puppet; cost: mỗi tier tốn tài nguyên 10× tier trước',
    antagonistLadder: 'Phase 1 (ch.1-50): peer đệ tử + lowest 殿主. Phase 2 (ch.50-200): rival 殿 + sect elder ambition; Phase 3 (200-500): inter-sect war + 道主 cấp. Phase 4 (500+): 界天 cosmic',
    differentiator: 'Ma đạo aesthetic (dark cultivation) + life-replay golden finger + 果位 0-sum scarcity → MC không thể "chỉ tu là tiến" — phải tính chính trị + cướp vị. Reader cảm 3 layers tension at once.',
    cautionPatterns: [
      'KHÔNG copy 百世书 verbatim — replay loop là concept chung, đa dạng hóa qua artifact riêng',
      'KHÔNG bê 果位 system y chang — VN có thể adapt thành "vị trí" hệ phái / chức danh khoa cử / kinh tế slot',
      'Ma đạo aesthetic dễ trượt sang too-dark — cần warm baseline ch.1 (MC có goal personal: cứu sư tỷ, không phải báo thù mass)',
    ],
    lengthScale: '1500+ chương, 4.5M+ chữ',
  },
  // Classic xianxia (for reference, broader market)
  {
    id: 'fan-ren-xiu-xian',
    title: '凡人修仙传',
    titleRomanized: 'Phàm Nhân Tu Tiên Truyện',
    author: '忘语',
    platform: 'qidian',
    genre: 'tien-hiep',
    subGenres: ['gritty-cultivation', 'no-system'],
    yearTop: 2008,
    monthlyVotesPeak: null,
    status: 'completed',
    kernel: {
      readerFantasy: 'Phàm phu xuất thân quê mùa, không thiên tài, bằng tính toán cẩn thận + cơ duyên nhỏ + cẩu đạo kiên trì leo tới tu tiên đỉnh cao',
      pleasureLoop: 'gặp tình huống nguy hiểm → âm thầm quan sát → tìm thủ đoạn không-chính-diện → thoát hiểm + đoạt cơ duyên nhỏ → tu vi cộng dồn',
      systemMechanic: 'không có golden finger lớn — chỉ 1-2 cơ duyên cụ thể (bình ngọc, công pháp tà đạo) MC giấu suốt cuộc đời',
      mcSecret: 'MC che giấu tu vi thật + che giấu artifact (bình ngọc) — đây là rule absolute, kiếp trước cũng giấu, kiếp sau cũng giấu',
    },
    openingHook: 'Hàn Lập (con trai nông dân Châu Lập Bộ) được dẫn vào tiểu tông Thất Huyền Môn; sau khảo thí được thu làm ngoại môn đệ tử; cẩn thận quan sát nội bộ, không lộ ý chí',
    worldStructure: 'Cổ điển tu chân (1 thế giới chính + Linh Giới + Tiên Giới ở cuối); tông môn lớn nhỏ + tán tu + ma đạo; tài nguyên linh thạch + linh thảo + đan dược',
    powerSystem: '炼气 → 筑基 → 金丹 → 元婴 → 化神 → 炼虚 → 合体 → 大乘 → 渡劫; mỗi tier tăng tuổi thọ + công pháp mới; cost: linh thạch + cơ duyên + đột phá khó dần',
    antagonistLadder: 'Phase 1: peer ngoại môn đệ tử ghen ăn tức ở. Phase 2: nội môn rivals + first tông môn cuộc chiến. Phase 3: tán tu / ma đạo / liên minh tông môn. Phase 4: cosmic 仙界 antagonists',
    differentiator: 'Cẩu đạo + paranoid MC + no-system + gritty realism — phản đề của "easy power-up" tu tiên thường gặp. Reader 12+ năm nay vẫn coi là chuẩn vàng.',
    cautionPatterns: [
      'Nhịp truyện chậm — modern reader 2024+ ít chấp nhận; cần điều chỉnh dopamine cadence',
      'MC paranoid quá độ → có thể fail reader test cho "ấm áp/sảng văn" target audience',
    ],
    lengthScale: '2400+ chương, 7M chữ',
  },

  // ── HUYEN-HUYEN / EASTERN FANTASY ─────────────────────────────────────────
  {
    id: 'pu-luo-zhi-zhu',
    title: '普罗之主',
    titleRomanized: 'Phổ La Chi Chủ',
    author: '沙拉古斯',
    platform: 'qidian',
    genre: 'huyen-huyen',
    subGenres: ['steampunk', 'horror-cultivation', 'rules-mystery'],
    yearTop: 2024,
    monthlyVotesPeak: 200000,
    subsScale: '10K+ avg subs Mar 2024',
    status: 'completed',
    kernel: {
      readerFantasy: 'Modernist (民国 + shipped science) đối mặt với hệ tu hành kỳ dị (旅修/宅修/食修/烟修) trong thế giới kín không-có-điện, mỗi cảnh quan phải đọc và sống theo "quy tắc"',
      pleasureLoop: 'phát hiện 1 quy tắc mới → vận dụng → thoát hiểm nhỏ → quy tắc cũ thay đổi/lật → tăng cấp 旅修 stage',
      systemMechanic: '普罗州 — region bị electromagnetic interference, súng không dùng được, chỉ có shipped steam engine + kỳ dị tu pháp; 旅修 progress qua việc đi qua các "ga tàu" 1160 — mỗi ga 1 quy tắc',
      mcSecret: 'MC nhập 普罗州 để cứu bạn (何家庆) đang昏迷; thân phận arrival hidden từ regional powers; gốc gác trại trẻ mồ côi + "tâm thần bất thường" (cosmic tag)',
    },
    openingHook: 'Lý Bạn Phong nhận tin bạn 何家庆 ngất, lên tàu hơi nước số 1160 đến 普罗州; tàu đọc 12 quy tắc cho hành khách; ngay lập tức 1 hành khách bị nuốt do vi phạm quy tắc',
    worldStructure: '民国-era setting + 普罗州 closed pocket realm (electromagnetic interference); 4-5 修行门派 (旅修 = travelers, 宅修 = train-trappers, 食修 = eat-stronger, 烟修 = tobacco-smoke); 没有现代电网, chỉ steam',
    powerSystem: '旅修 stages tiered by số ga tàu đi qua (mỗi ga = 1 cảnh quan + quy tắc); cost = phải tuân quy tắc, vi phạm = chết hoặc bị "đồng hóa"; alternate path qua 食修 (tăng sức mạnh qua đồ ăn cụ thể) / 烟修 (qua khói thuốc)',
    antagonistLadder: 'Phase 1: hành khách tàu cùng + station rule monsters. Phase 2: 普罗州 regional powers (旅修 đỉnh + 宅修 ancient). Phase 3: 普罗州 vs ngoại giới invasion. Phase 4: cosmic background entities',
    differentiator: 'Genre hybrid (民国 + horror + rules-mystery + cultivation) tạo aesthetic unique; "rules" mechanic làm reader phải đọc kỹ từng chương (high engagement); slow-burn worldbuilding nhưng mỗi chương vẫn có concrete payoff',
    cautionPatterns: [
      'Rules-mystery dễ dài dòng — cần discipline mỗi chương resolve ≥1 quy tắc',
      'Setting民国 cần research kỹ — VN adapt sang setting Đông Dương 1920-1940 (Sài Gòn / Hà Nội thuộc địa) sẽ có distinct flavor',
    ],
    lengthScale: '~1000 chương, 4.5M chữ',
  },

  // ── DO-THI / URBAN ────────────────────────────────────────────────────────
  {
    id: 'hua-shen-zui-zhong-boss',
    title: '我的化身正在成为最终BOSS',
    titleRomanized: 'Hóa Thân Của Ta Đang Trở Thành BOSS Cuối Cùng',
    author: '汐尺',
    platform: 'qidian',
    genre: 'do-thi',
    subGenres: ['behind-scenes', 'boss-flow', 'urban-supernatural'],
    yearTop: 2025,
    monthlyVotesPeak: 100000,
    status: 'completed',
    kernel: {
      readerFantasy: 'Nhìn thấy MC tạo ra "hóa thân" làm hero/villain trong xã hội superhero, mọi người tranh nhau analyze "BOSS thật là ai" nhưng MC chỉ là 1 nhân viên welfare house không ai để ý',
      pleasureLoop: 'tạo hóa thân với chiêu thức kỳ dị → công khai trên truyền thông → fan/agency suy luận tận tâm → MC âm thầm leo tier qua "danh tiếng" → hóa thân mới mạnh hơn',
      systemMechanic: '"无限分裂游戏" — limited-tier ability tạo "nhân vật game" trong reality, mỗi nhân vật có main quest + skill tree; tier strength scale theo MC reputation; MC bản thân vẫn yếu',
      mcSecret: 'MC = Cơ Minh Hoan, T0 limited-tier ability, ngoài tổ chức bí mật không ai biết; lifelong absolute no-leak vì T0 = bị săn đuổi global',
    },
    openingHook: 'Cơ Minh Hoan, fresh graduate, được tổ chức bí mật xác nhận "limited-tier" ability; MC quyết tâm dùng chiêu này để "sống bình thường" + kiếm tiền — tạo hóa thân Hero/Villain đầu tiên cho truyền thông',
    worldStructure: 'Đô thị Trung Quốc current-day + reveal có异能者 (T0-T5 tier system); 奇闻使 (paranormal investigator) + 驱魔人 (exorcist) như cảnh sát đặc nhiệm; superhero/villain dynamics public knowledge',
    powerSystem: 'Tier T5 (vô hại) → T4 → T3 → T2 → T1 → T0 (limited-tier); MC ở T0 nhưng power yếu vì base bản thân yếu; power qua hóa thân — mỗi hóa thân tier strength scale theo MC public reputation + media coverage',
    antagonistLadder: 'Phase 1: villain hóa thân vô tình truy lùng nhau. Phase 2: T2-T1 rivals + agency competition. Phase 3: T0 inter-conflict + cosmic governance. Phase 4: superhero universe vs MC',
    differentiator: 'BOSS-flow + 幕后 (behind-the-scenes) hybrid: MC là "BOSS cuối cùng" theo nghĩa danh tiếng, nhưng MC bản thân là pháo hôi yếu. Dramatic irony cực mạnh — reader biết identity, characters không',
    cautionPatterns: [
      'Multi-identity dễ confuse reader — cần discipline "1 hóa thân = 1 plotline"',
      'Mass-media meta dễ vô lý nếu không research kỹ Vietnamese social media landscape (TikTok / Facebook fanpage / báo điện tử)',
    ],
    lengthScale: '~600 chương, 1.79M chữ',
  },

  // ── LINH-DI / HORROR-MYSTERY ──────────────────────────────────────────────
  {
    id: 'lao-shi-ren',
    title: '捞尸人',
    titleRomanized: 'Lao Thi Nhân (Vớt Xác)',
    author: '纯洁滴小龙',
    platform: 'qidian',
    genre: 'linh-di',
    subGenres: ['folk-horror', 'urban-supernatural', 'corpse-fishing'],
    yearTop: 2024,
    monthlyVotesPeak: 346130,
    subsScale: 'Qidian record monthly-vote 2024',
    status: 'ongoing',
    kernel: {
      readerFantasy: 'MC trẻ con thiên tài bẩm sinh có thể trò chuyện âm dương, học nghề vớt xác cổ truyền + bí mật giáo phái; đi từ phụ giúp ông ngoại tới giải vô vàn án dị giới',
      pleasureLoop: 'phát hiện trường hợp dị giới (thi đứng, oan hồn truy hồn) → điều tra qua nghề vớt xác → suy luận manh mối siêu nhiên → đối đầu thực thể → đóng án + tăng nghề / artifact',
      systemMechanic: 'Hắc thư từ chủ miếu mộ — control 死倒 (xác di động); MC có 体质 đặc biệt (sense xác臭, sense "thứ dơ"); có thể vào âm giới, ý thức người khác, mộng',
      mcSecret: 'MC từ rất nhỏ đã "早慧" (cosmic awareness); thân phận thật là hậu duệ 1 dòng dõi vớt xác cổ truyền; Phase 1-2 giấu khả năng đặc biệt với tất cả không-thân-tín',
    },
    openingHook: 'Lý Truy Viễn (cậu bé sống nhờ ông ngoại Lý Duy Hán, bà ngoại Thôi Quế Anh, đã đổi họ Tôn); nhà nghèo + xảy ra sự kiện dị giới đầu tiên; ông ngoại bắt đầu dạy nghề vớt xác',
    worldStructure: 'Đô thị Trung Quốc hiện đại + folk superstition layer (âm dương 2 giới, 死倒, oan hồn) hợp thành setting; nghề vớt xác như 1 nghề cổ truyền + có hệ thống truyền thừa secret',
    powerSystem: 'Nghề vớt xác 体质 + công cụ + lễ nghi + truyền thừa + năng lực siêu nhiên; tier theo số案 đã giải + artifact owned + 体质 strength; cost = bệnh / yangki / lifespan',
    antagonistLadder: 'Phase 1: local oan hồn + folk dị giới case nhỏ. Phase 2: nhóm tà phái (mượn xác sống) + regional sect. Phase 3: dòng dõi vớt xác inter-conflict + truyền thừa lớn. Phase 4: cosmic order',
    differentiator: 'Nghề "vớt xác" là blue ocean — chưa novel nào focus vào nghề này; folk-horror authenticity (xác chìm sông, oan hồn cụ thể VN tradition cũng có); child MC + sense of family warmth dù setting horror',
    cautionPatterns: [
      'Folk horror dễ thành racist / superstition exploitation — cần tôn trọng tradition',
      'Child MC khó pacing — must age MC up theo arc',
    ],
    lengthScale: '~800+ chương ongoing',
  },

  // ── KIEM-HIEP / WUXIA ─────────────────────────────────────────────────────
  {
    id: 'shan-he-ji',
    title: '山河稷',
    titleRomanized: 'Sơn Hà Tắc',
    author: '会说话的肘子',
    platform: 'qidian',
    genre: 'kiem-hiep',
    subGenres: ['xianxia-wuxia-hybrid', 'family-clan', 'qi-cultivation'],
    yearTop: 2025,
    monthlyVotesPeak: 52457,
    status: 'ongoing',
    kernel: {
      readerFantasy: 'Truyền nhân gia tộc dầy thiên năm trong loạn thế tà đạo bao quanh, thiền tâm pháp gia truyền + kiếm pháp luyện thực chiến để bảo vệ dòng dõi',
      pleasureLoop: 'gia tộc gặp nguy → MC âm thầm tu luyện → đụng độ thực chiến → đột phá nhỏ + bảo vệ thành viên gia tộc → tăng uy danh trong giới',
      systemMechanic: 'Tâm pháp gia truyền 山河 + kiếm pháp 稷; không cheat-tier system; tăng cấp qua luyện + thực chiến + ngộ; cost = lao lực thật, không quick fix',
      mcSecret: 'MC giấu tâm pháp đỉnh + ý đồ "duy trì gia tộc qua loạn thế" với tất cả người ngoài; chỉ trưởng tộc biết',
    },
    openingHook: 'Trưởng tử gia tộc Hà địa nhận nhiệm vụ bảo vệ nhỏ; lần đầu va chạm với tà đạo địa phương; tâm pháp gia truyền lần đầu kích hoạt',
    worldStructure: 'Loạn thế 江湖 + 武林 thế giới (tà đạo + chính đạo) + 5-7 gia tộc lớn + 10+ tông phái nhỏ; setting gần triều Tống/Minh',
    powerSystem: '内功 tier (1-9 internal force levels) + 招式 (techniques) + 心法 (mental cultivation); MC dùng 心法 + 剑法 — cost = nội lực, ngộ tính, năm luyện',
    antagonistLadder: 'Phase 1: tà đạo địa phương + bandit. Phase 2: peer gia tộc + sect rival. Phase 3: 武林 inter-faction + 朝廷 power. Phase 4: dynasty-level / 妖魔 cosmic',
    differentiator: 'Family-clan focus + no-system + slow-burn cultivation + 江湖 hỗn loạn aesthetic; MC bảo vệ gia tộc (motivation cao hơn personal glory)',
    cautionPatterns: [
      'Family-clan structure khó nếu reader không quen — cần giới thiệu cast nhỏ trước',
      'No-system trend dù strong 2024+ nhưng cần modern cadence — không lặp lại nhịp Phàm Nhân Tu Tiên',
    ],
    lengthScale: '~600+ chương ongoing',
  },

  // ── MAT-THE / APOCALYPSE ──────────────────────────────────────────────────
  {
    id: 'mat-the-junban-flowstandard',
    title: '末世囤货流 (standard template)',
    titleRomanized: 'Mạt Thế Đôn Vật Tư (template)',
    author: 'multiple top authors',
    platform: 'qidian',
    genre: 'mat-the',
    subGenres: ['hoarding', 'system', 'shelter-base'],
    yearTop: 2024,
    monthlyVotesPeak: null,
    subsScale: 'Genre std',
    status: 'completed',
    kernel: {
      readerFantasy: 'Biết trước mạt thế đến trong N ngày → tích trữ vật tư + xây hầm trú ẩn + dẫn dắt người thân → trở thành leader region post-apocalypse',
      pleasureLoop: 'phát hiện info mạt thế → mua vật tư cụ thể (gạo / nước / vũ khí / thuốc) → giấu kín → mạt thế bùng phát → MC sẵn sàng trong khi mọi người panic → bảo vệ + dẫn dắt nhóm nhỏ',
      systemMechanic: 'Hầm trú ẩn vạn năng (space inventory + auto-expand) OR knowledge từ kiếp trước + cách tích trữ; cost = thời gian + money + risk người khác nghi',
      mcSecret: 'MC biết timeline cụ thể (vd 168 giờ trước mạt thế) — không thể tiết lộ vì sẽ bị cười / báo police',
    },
    openingHook: 'MC nhận trải nghiệm cảnh báo (giấc mơ / hiện vật / hệ thống); ngày đầu giấu kín đi mua hàng tích trữ; thân nhân/đồng nghiệp hoài nghi; MC âm thầm chuẩn bị',
    worldStructure: 'Đô thị hiện đại current-day → mạt thế trigger (zombie / radiation / acid rain / monster); post-apocalypse city ruins + survivor base + military remnants; MC thường có 1-2 base',
    powerSystem: 'Tích trữ vật tư (food / water / weapon / med / fuel); ability awakening tier (T5 vô hại → T0 god-tier) hoặc no-power gritty survival; tier = effective combat radius + resource control',
    antagonistLadder: 'Phase 1: zombies local + opportunist humans. Phase 2: survivor faction rival + raider boss. Phase 3: military / regional government + alien invasion. Phase 4: cosmic source',
    differentiator: 'Hoarding-flow + survival-cum-power-fantasy — reader yêu xem MC chuẩn bị kỹ rồi outsmart panic mob; mỗi vật tư cụ thể là Chekhov gun pay off later',
    cautionPatterns: [
      'Tích trữ scene dễ thành catalogue list — phải có character interaction + tension',
      'Mạt thế trigger phải plausible (không vô lý: zombie từ thiên hà ngoài, virus từ data leak vô lý)',
    ],
    lengthScale: 'Genre std 800-1500 chương',
  },

  // ── VONG-DU / GAME ────────────────────────────────────────────────────────
  {
    id: 'quan-dan-game-template',
    title: '全民游戏化 (genre template)',
    titleRomanized: 'Toàn Dân Game Hóa (template)',
    author: 'multiple top authors',
    platform: 'qidian',
    genre: 'vong-du',
    subGenres: ['everyone-isekai', 'rebirth-foreknow', 'tutorial-hack'],
    yearTop: 2024,
    monthlyVotesPeak: null,
    status: 'completed',
    kernel: {
      readerFantasy: 'Cả nhân loại bị transport vào game (hoặc reality biến thành game); MC biết trước 30 ngày tutorial / strategy → leo top 1 bằng efficiency optimization',
      pleasureLoop: 'phát hiện cơ chế ẩn → exploit → tier-up → đụng độ player rival → outsmart bằng cheese / strat → loot lớn → tier-up tiếp',
      systemMechanic: 'Game system universal (HUD, class, skill tree, dungeon, raid); MC có rebirth-foreknow hoặc tutorial-hack ability (vd "nạp sẵn 30 ngày") → kiếp trước biết exploit',
      mcSecret: 'MC = rebirth từ end-game → giấu thông tin về meta strategies + late-game patches; lifelong no-leak hoặc reveal qua arc plot',
    },
    openingHook: 'Game system kích hoạt toàn cầu, MC tỉnh dậy với kiếp trước memory; ngày đầu lén làm "tutorial nạp sẵn" để có advantage không-fair cho phase 1; gia đình hoang mang',
    worldStructure: 'Earth current-day + game system overlay (dungeon ở subway / nightmare ở school / boss raid ở stadium); 5-10 server region; player vs monster vs raid boss',
    powerSystem: 'Class system (warrior / mage / rogue / unique-class for MC) + level 1-1000 + skill tree + equipment tier (T0-T5); cost = exp + mana + cooldown + class-specific resource',
    antagonistLadder: 'Phase 1: local mob + low-tier dungeon boss. Phase 2: rival player faction + first big boss. Phase 3: global raid boss + cross-server PvP. Phase 4: cosmic system creator',
    differentiator: 'Gamification of reality + MC có "fair-unfair" rebirth knowledge giving them 1-2 month head start; gameplay-heavy chapters interleaved with personal arc',
    cautionPatterns: [
      'Game mechanics dễ thành stat-tracking spreadsheet — cần character interaction',
      'Rebirth advantage dễ bị reader thấy "không công bằng" — cần balance với rivals catching up',
    ],
    lengthScale: 'Genre std 800-1500 chương',
  },

  // ── DI-GIOI / TRANSMIGRATION ──────────────────────────────────────────────
  {
    id: 'quan-dan-lanh-chua-template',
    title: '全民领主 (genre template)',
    titleRomanized: 'Toàn Dân Lãnh Chúa (template)',
    author: 'multiple',
    platform: 'qidian',
    genre: 'di-gioi',
    subGenres: ['global-lord', 'territory-build', 'simulator-medieval'],
    yearTop: 2024,
    monthlyVotesPeak: null,
    status: 'completed',
    kernel: {
      readerFantasy: 'Mọi người được transport làm lãnh chúa medieval với lãnh thổ 100m²/start; tài nguyên + dân + tower defense + war; MC có chiến lược + builder optimization',
      pleasureLoop: 'phát hiện cơ hội xây dựng tier mới → invest tài nguyên → tier-up lãnh thổ → đụng độ neighbor lord → war + win → loot tài nguyên + đất',
      systemMechanic: 'Lord panel UI (territory map, resource counter, building tier, unit roster, tech tree); ability "summon" theo card random; MC có rare blueprint hoặc strategist class',
      mcSecret: 'MC có kiếp trước hoặc real-world knowledge (vd kỹ sư xây dựng / strategist) ngoài hệ thống — không thể tiết lộ qua chat global',
    },
    openingHook: 'System "Toàn dân lãnh chúa" kích hoạt, MC awake trong lãnh thổ 100m²; tài nguyên ban đầu 1 chai nước + 1 ổ bánh mì; phải dựng 1 ngôi nhà gỗ + thuê 1 nông dân trong 24h',
    worldStructure: 'Earth current-day + medieval-fantasy overlay (lãnh thổ map, monster, faction); MC location random; tài nguyên hạn chế; tradesman + war + tech tree',
    powerSystem: 'Lord tier (T1-T10) + lãnh thổ size + dân số + tech tier + army strength; cost = food + wood + stone + gold + soldier-life',
    antagonistLadder: 'Phase 1: monster local + bandit. Phase 2: neighbor lord rival + small kingdom. Phase 3: empire + faction alliance + invasion. Phase 4: cosmic order',
    differentiator: 'Strategy + economy + city-builder hybrid; reader yêu optimize tài nguyên + outsmart neighbor; mỗi chương có concrete numeric progress',
    cautionPatterns: [
      'Strategy-heavy dễ thành Excel sheet — cần dialogue + character moments',
      'Map / faction map có thể overwhelming — bắt đầu small scope, expand gradually',
    ],
    lengthScale: 'Genre std 600-1200 chương',
  },

  // ── NGON-TINH / ROMANCE ───────────────────────────────────────────────────
  {
    id: 'mo-fa-shao-nu-template',
    title: '从魔法少女开始独断万古',
    titleRomanized: 'Từ Ma Pháp Thiếu Nữ Bắt Đầu Độc Đoán Vạn Cổ',
    author: 'multiple',
    platform: 'qidian',
    genre: 'ngon-tinh',
    subGenres: ['dark-magical-girl', 'rebirth-revenge', 'fantasy-romance'],
    yearTop: 2025,
    monthlyVotesPeak: 80000,
    status: 'ongoing',
    kernel: {
      readerFantasy: 'Cô gái bình thường ký hợp đồng với sinh vật bí ẩn thành ma pháp thiếu nữ, sau bị phản bội + thoái triển, dùng tuyệt đối lực lượng lật đổ "rule of magical girl world"',
      pleasureLoop: 'phát hiện rule of fate game → exploit rule → ngược lại kẻ phản bội + cứu đồng minh cũ → tăng "lực lượng tuyệt đối" → đối đầu cosmic ruler',
      systemMechanic: 'Contract creature (Kyubey-like) ban ability theo wish; MC sau khi rebirth dùng wish + knowledge để phá rule; ability tier theo "absolute strength" instead of trade',
      mcSecret: 'MC nhớ kiếp trước; identity của contract creature thật sự là antagonist; phải giấu sự thật với đồng minh trong 30+ chương',
    },
    openingHook: 'Lâm Nguyệt (cô gái bình thường, family conflict) gặp sinh vật bí ẩn đề nghị ký hợp đồng; ký xong nhận memory kiếp trước + ability mạnh; ngay lập tức ngược lại kẻ phản bội đầu tiên',
    worldStructure: 'Đô thị hiện đại + magical girl secret network + cosmic ruler outside; 4-5 faction (good magical girl society, dark sect, neutral, witch hunters)',
    powerSystem: 'Ability tier (T10 → T0) qua wish + grief seed + soul gem (Kyubey mechanic); MC sau rebirth có path mới: absolute strength + rule-breaking; cost = soul gem corruption + lifespan',
    antagonistLadder: 'Phase 1: kẻ phản bội cũ + small witch. Phase 2: regional magical society + dark sect. Phase 3: cosmic ruler (Kyubey-like). Phase 4: dimension rulers',
    differentiator: 'Magical girl genre + dark twist + rebirth-revenge — reader yêu xem MC outsmart system; female-targeted but male-friendly',
    cautionPatterns: [
      'Magical girl genre Tây + Nhật — VN cần adapt sang Việt setting (idol culture / showbiz / school)',
      'Dark twist dễ trượt sang misery — phải có warm moments + ally relationships',
    ],
    lengthScale: '~700+ chương ongoing',
  },

  // ── QUAN-TRUONG / OFFICIALDOM ─────────────────────────────────────────────
  {
    id: 'quan-truong-template',
    title: '官场重生 (genre template)',
    titleRomanized: 'Quan Trường Trọng Sinh (template)',
    author: 'multiple top authors',
    platform: 'qidian',
    genre: 'quan-truong',
    subGenres: ['rebirth', 'political-strategy', 'low-rank-rise'],
    yearTop: 2024,
    monthlyVotesPeak: null,
    status: 'completed',
    kernel: {
      readerFantasy: 'Quan chức cấp thấp trọng sinh từ tương lai 30 năm sau, biết trước chính sách + political shift + ai sẽ thăng tiến + ai sẽ ngã; dùng knowledge để leo lên từ phó phòng → bộ trưởng',
      pleasureLoop: 'phát hiện cơ hội chính sách → đề xuất proposal khôn ngoan → được boss khen → đối đầu rival → outmaneuver → thăng tiến 1 bậc',
      systemMechanic: 'Trí nhớ 30 năm tương lai + political acumen + relationship map; không có cheat ability; cost = trade favor với người quyền lực + time investment',
      mcSecret: 'MC nhớ tương lai — không thể tiết lộ với ai (sẽ bị cho điên hoặc gián điệp); 30 năm absolute no-leak',
    },
    openingHook: 'MC tỉnh dậy ở văn phòng UBND huyện 30 năm trước, vẫn là phó phòng nông nghiệp; ngày đầu phát hiện 1 proposal lớn (chính sách phát triển miền núi) sẽ thắng đề bạt nếu ai nắm bắt',
    worldStructure: 'Việt Nam / Trung Quốc 199x-200x setting (rural → urban transition); cấp huyện → tỉnh → trung ương; faction chính trị + business interest + media',
    powerSystem: 'Political tier (phó phòng → trưởng phòng → phó chủ tịch → chủ tịch → bộ trưởng → ủy viên TW); resource = quyền + tiền + media + foreign relation; cost = political enemy + scandal risk',
    antagonistLadder: 'Phase 1: peer phó phòng + corrupt boss. Phase 2: rival faction + tỉnh-level political game. Phase 3: trung ương policy battle. Phase 4: cosmic governance reform',
    differentiator: 'Politics + foreknow + slow-game strategy; reader yêu watching MC outmaneuver corrupt officials qua mưu trí + chính sách hiểu biết',
    cautionPatterns: [
      'Politics quá nhạy cảm ở VN — adapt to fictional regional setting, KHÔNG reference real party',
      'Quan trường truyện dễ slow — cần balance với personal/family scenes',
    ],
    lengthScale: 'Genre std 1000-2000 chương',
  },

  // ── LICH-SU / HISTORICAL ──────────────────────────────────────────────────
  {
    id: 'qing-yu-nian',
    title: '庆余年',
    titleRomanized: 'Khánh Dư Niên',
    author: '猫腻',
    platform: 'qidian',
    genre: 'lich-su',
    subGenres: ['transmigration-historical', 'court-political', 'modern-mindset'],
    yearTop: 2010,
    monthlyVotesPeak: null,
    status: 'completed',
    kernel: {
      readerFantasy: 'Quan chức từ tương lai (knowledge of modern science + literature + politics) transmigrate vào triều đại cổ; quan-trường mưu trí + nội công + literature plagiarism',
      pleasureLoop: 'gặp tình huống cổ → dùng knowledge modern → outsmart → tăng position + uy tín → đối đầu hơn → reveal về cosmic identity nhỏ',
      systemMechanic: 'Modern memory + 内功 inheritance từ mẹ kiếp trước (cosmic-tier); cost = uy hiếp với foreigner + thiên hạ politics; mục tiêu cuối: change dynasty',
      mcSecret: 'MC = kiếp trước nghiên cứu sinh modern + mother là cosmic-tier figure; family cảm thông + 5-6 đệ tử của mother biết phần; rest of world không biết',
    },
    openingHook: 'Phạm Nhàn (transmigrated MC) như đứa con nhỏ trong tô châu, được dạy nội công + literature; gặp 1 sát thủ đầu tiên + reveal về danh tính mother + first court intrigue',
    worldStructure: 'Triều đại fictional (Khánh quốc + Bắc Tề + Đông Di); palace + bureaucracy + 江湖 + 神庙 cosmic; tradesman + foreign nation',
    powerSystem: '内功 cultivation tier (1-9 levels) + lighter mưu trí lacking system; cost = nội lực + lifespan; cosmic-tier có thể lay waste army',
    antagonistLadder: 'Phase 1: local 江湖 sát thủ + cha quân thần ghen. Phase 2: nội cung mưu kế + Bắc Tề ngoại giao. Phase 3: emperor inheritance war. Phase 4: 神庙 cosmic',
    differentiator: 'Hybrid genre (transmigration + 武林 + 朝廷 + cosmic) + smart-funny MC; literature pham nhan = comic relief; classic that sustained reader 15 năm',
    cautionPatterns: [
      'Modern-mindset MC dễ thành chauvinist (looking down on cổ) — must respect setting',
      'Literature plagiarism dễ thành cliché — chỉ dùng 1-2 lần lớn, không spam',
    ],
    lengthScale: '~750 chương, 3M chữ',
  },

  // ── KHOA-HUYEN / SCI-FI ───────────────────────────────────────────────────
  {
    id: 'gu-zhang-wutuo-bang',
    title: '故障乌托邦',
    titleRomanized: 'Gu Chướng Ô Thác Bang (Glitched Utopia)',
    author: 'multiple',
    platform: 'qidian',
    genre: 'khoa-huyen',
    subGenres: ['dystopia', 'glitch', 'awareness'],
    yearTop: 2024,
    monthlyVotesPeak: 100000,
    status: 'completed',
    kernel: {
      readerFantasy: 'MC phát hiện reality là Utopia simulation bị glitched; chỉ MC awareness về glitch + tận dụng để leo ra khỏi system',
      pleasureLoop: 'phát hiện glitch mới → exploit → outsmart simulator NPC → tăng tier awareness → đụng admin level',
      systemMechanic: 'Glitch awareness (cosmic ability) + simulation rules; tier theo số glitch exploited + admin warning level',
      mcSecret: 'MC là first awareness person — admin sẽ purge; lifelong no-leak; ngay cả gia đình "fake" cũng không thể tiết lộ',
    },
    openingHook: 'MC nhân viên bình thường gặp 1 glitch nhỏ (đồng hồ chạy ngược 1 giây); MC notice trong khi mọi người không; thử nghiệm thấy reality phản hồi như game patched',
    worldStructure: 'Đô thị "Utopia" 2050+ (mọi người happy, no crime) + glitch reality layer + admin/observer layer; tradesman + corp + NPC',
    powerSystem: 'Awareness tier (T0 unaware → T1 see glitch → T2 manipulate → T3 walk between worlds → T4 challenge admin); cost = admin attention + reality stability',
    antagonistLadder: 'Phase 1: NPC anomaly + admin warning. Phase 2: T1-T2 fellow awareness people + admin agent. Phase 3: T3 simulator team. Phase 4: meta-creator',
    differentiator: 'Glitch-aware sci-fi + Truman-show meta + dystopia thriller; mỗi chương 1 reveal về reality nature',
    cautionPatterns: [
      'Reveal pacing critical — không reveal hết sớm',
      'Philosophy heavy — cần personal stake cụ thể',
    ],
    lengthScale: '~600 chương ongoing 2024',
  },

  // ── DONG-NHAN / FANFICTION ────────────────────────────────────────────────
  {
    id: 'dong-nhan-eavesdrop-template',
    title: '同人偷听心声 (genre template)',
    titleRomanized: 'Đồng Nhân Đọc Tiếng Lòng (template)',
    author: 'multiple',
    platform: 'qidian',
    genre: 'dong-nhan',
    subGenres: ['fanfic-self-insert', 'mind-reading', 'foreknow'],
    yearTop: 2024,
    monthlyVotesPeak: null,
    status: 'completed',
    kernel: {
      readerFantasy: 'Transmigrate vào fictional world MC yêu thích (anime / novel / manga); có khả năng đọc tiếng lòng → biết true intentions of fictional cast → outmaneuver canon plot',
      pleasureLoop: 'gặp canon character → đọc tiếng lòng → reveal về scheme họ → MC outsmart → save someone canon đáng lẽ chết → fame in fictional world',
      systemMechanic: 'Mind-reading ability (range theo tier); MC có canon knowledge + mind-reading combo → predict + intercept',
      mcSecret: 'MC từ thế giới khác + có ability đọc tâm thần; canon characters không thể detect; lifelong no-leak',
    },
    openingHook: 'MC tỉnh dậy trong fictional world (vd Hogwarts / 海贼 / 火影); ngày đầu nhận ability đọc tiếng lòng + canon memory; gặp 1 canon character đang scheme + MC intercept → first save',
    worldStructure: 'Borrowed fictional world (parody mode — must avoid direct trademark) + meta layer of MC awareness; canon timeline + butterfly effect',
    powerSystem: 'Mind-reading tier (T5 1m → T0 city-wide) + canon ability MC may acquire; cost = mental fatigue + ability cooldown',
    antagonistLadder: 'Phase 1: canon villain scheming locally. Phase 2: canon main villain + butterfly twist. Phase 3: alternate timeline + MC vs canon protagonist. Phase 4: meta-author level',
    differentiator: 'Self-insert fanfic + mind-reading combo + canon knowledge; reader yêu xem MC outsmart famous characters',
    cautionPatterns: [
      'Fan fiction copyright risk — borrowed world phải fictional / loose parody, không direct IP',
      'Mind-reading dễ broken — cần limit (range / cooldown / category)',
    ],
    lengthScale: 'Genre std 500-1000 chương',
  },

  // ── QUY-TAC-QUAI-DAM / RULES HORROR ───────────────────────────────────────
  {
    id: 'quy-tac-template',
    title: '规则怪谈 (genre template)',
    titleRomanized: 'Quy Tắc Quái Đàm (template)',
    author: 'multiple',
    platform: 'qidian',
    genre: 'quy-tac-quai-dam',
    subGenres: ['rules-horror', 'pocket-dimension', 'survival'],
    yearTop: 2024,
    monthlyVotesPeak: null,
    status: 'completed',
    kernel: {
      readerFantasy: 'MC bị transport vào phó bản (văn phòng / tàu điện ngầm / siêu thị / chung cư / quán ăn đêm / trường học) biến dị; có quy tắc treo trên tường (1 số thật, 1 số bẫy); phải tuân quy tắc thật + phá quy tắc bẫy để sống sót',
      pleasureLoop: 'phát hiện quy tắc mới → suy luận thật/giả → tuân theo / phá → đối thủ vi phạm bị giết → MC sống sót + được item / point → tier-up qua phó bản',
      systemMechanic: 'Phó bản system: mỗi phó bản 1 set quy tắc (5-15 cái); MC sống sót → tier-up + được random item + được rule book; cost = vi phạm quy tắc = chết / mất ký ức',
      mcSecret: 'MC bị transport bí ẩn từ reality; identity thật là nhân viên văn phòng bình thường; phó bản characters không biết về reality',
    },
    openingHook: 'MC tỉnh dậy ở văn phòng / metro / siêu thị bất thường; gặp 1 NPC dị (smile too wide / không blink); thấy 12 quy tắc dán trên tường; MC phải decide quy tắc 1 thật hay bẫy trong 60 giây',
    worldStructure: 'Phó bản world (đời thường biến dị) + reality layer + cosmic horror background; mỗi phó bản 1 thiết kế NPC + rule + item rare',
    powerSystem: 'Phó bản tier (1-100); item rarity (T5 → T0); ability awakening qua sống sót lâu (vd "thấy NPC mặt thật" / "rewind 1 second" / "rule immunity"); cost = sanity + ký ức',
    antagonistLadder: 'Phase 1: phó bản NPC + local rule violator. Phase 2: phó bản admin / boss + raid team. Phase 3: meta-rule writer + alternate dimensions. Phase 4: cosmic creator',
    differentiator: 'Pure rules-horror = blue ocean genre 2024; mỗi chương 1 phó bản mới = unlimited fresh content; reader phải đọc kỹ rules (high engagement)',
    cautionPatterns: [
      'Rules formula dễ template — cần variety in NPC + setting',
      'Sanity mechanic dễ depressing — cần dopamine balance (item reward, ally rescue)',
    ],
    lengthScale: 'Genre std 800-1500 chương',
  },

  // ── NGU-THU-TIEN-HOA / BEAST EVOLUTION ────────────────────────────────────
  {
    id: 'ngu-thu-evolution-template',
    title: '御兽进化 (genre template — Pokemon-style)',
    titleRomanized: 'Ngự Thú Tiến Hoá (template)',
    author: 'multiple',
    platform: 'qidian',
    genre: 'ngu-thu-tien-hoa',
    subGenres: ['pokemon-style', 'hidden-evolution-line', 'student-trainer'],
    yearTop: 2024,
    monthlyVotesPeak: null,
    status: 'completed',
    kernel: {
      readerFantasy: 'MC ngự thú sư có Bàn Tay Vàng nhìn thấu "Tuyến Tiến Hoá Ẩn" của pet; mỗi pet pull common có thể tiến hoá thành cosmic-tier nếu MC biết đường route',
      pleasureLoop: 'pull common pet → MC see hidden evolution line → train theo route (food / combat / element) → tier-up qua hidden form → fight rival pet → win + uy tín tăng',
      systemMechanic: 'Hidden Evolution Line view (MC-only ability); shows 3-5 alternate evolution paths for any pet; cost = train resource + time + risk wrong path',
      mcSecret: 'MC có ability thấy tuyến ẩn — không thể tiết lộ; absolute no-leak; reveal sẽ bị săn đuổi bởi 10+ tổ chức + emperor',
    },
    openingHook: 'MC student ngự thú sư academy receives starter pet (common rabbit); MC see hidden evolution line "Inferno Hare → Hellfire Pyre Hare"; secretly train; first battle peer rival pet → win shocking',
    worldStructure: 'Đại lục academy-based ngự thú system + tradesman + monster wild + faction; pet rarity T5-T0; evolution stages T1-T10',
    powerSystem: 'Pet tier × MC tier (ngự thú sư grade); pet combat depends on pet form + skill + bond; cost = food + train time + evolution rare material',
    antagonistLadder: 'Phase 1: peer student + academy bully. Phase 2: rival faction + first regional tournament. Phase 3: kingdom-level competition + ancient sect. Phase 4: cosmic Pokemon master / dragon',
    differentiator: 'Pokemon-like + "knowing the evolution route" twist + academy structure + battle pet vs pet (MC không cần tay đôi); broad appeal target',
    cautionPatterns: [
      'Pokemon parody risk — must invent own pet names + types',
      'Pet battle dễ template (attack-defense) — cần creative element interaction',
    ],
    lengthScale: 'Genre std 600-1200 chương',
  },

  // ── KHOAI-XUYEN / QUICK TRANSMIGRATION ───────────────────────────────────
  {
    id: 'khoai-xuyen-template',
    title: '快穿系统 (genre template)',
    titleRomanized: 'Khoái Xuyên Hệ Thống (template)',
    author: 'multiple',
    platform: 'qidian',
    genre: 'khoai-xuyen',
    subGenres: ['modular-arc', 'transmigration-multi-world', 'save-side-character'],
    yearTop: 2024,
    monthlyVotesPeak: null,
    status: 'completed',
    kernel: {
      readerFantasy: 'MC nhân viên Hệ Thống Đa Vũ Trụ; mỗi 30-50 chương xuyên thân phận mới (pháo hôi / villain / nữ phụ) cứu nguyên chủ tiếc nuối; mục đích cuối: kiếm đủ điểm để về reality',
      pleasureLoop: 'enter world → quick assess situation → identify regret event → take action subtly → save someone canon đáng lẽ thiệt thòi → earn points → next world',
      systemMechanic: 'Hệ Thống Đa Vũ Trụ panel: world list + missions + reward + currency; MC switch identity per world; ability adapt theo world (vd nếu world cultivation thì MC có 内功 baseline)',
      mcSecret: 'MC = identity thật ngoài hệ thống; canon characters không biết about transmigration; mỗi world reset memory of canon',
    },
    openingHook: 'MC tỉnh dậy ở Hub Space gặp Hệ Thống; nhận mission đầu (vd cứu pháo hôi nữ phụ trong cổ điển ngon-tinh); enter world; gặp nguyên chủ + canon villain',
    worldStructure: 'Hub Space (between worlds) + 4-hồi modular structure (5+15+15+10 chương per world); worlds: cổ điển / hiện đại / scifi / xianxia tùy mission',
    powerSystem: 'Per-world ability adapt; baseline mind + system points; cost = system currency + risk of "wrong-route" (canon characters detect anomaly)',
    antagonistLadder: 'Per-world: Phase 1 local canon villain. Per-world Phase 2 canon big bad. Meta Phase: system anomaly / rebellion / cosmic creator',
    differentiator: 'Episodic structure + always-fresh setting per arc + variety reader yêu; mỗi 30-50 chương = 1 mini-novel; high engagement',
    cautionPatterns: [
      'Episodic risk: feel like "1 thay 30 stories" without overarching theme — cần meta plot',
      'Save pháo hôi dễ formulaic — cần variety in regret type + resolution',
    ],
    lengthScale: 'Genre std 800-1500 chương, ~20-30 worlds',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lookup benchmark cards relevant to a genre + optional sub-genre.
 * Returns 2-5 cards. Includes one always-relevant card from same genre.
 */
export function loadBenchmarksForGenre(
  genre: GenreType,
  subGenres: string[] = [],
  limit = 5,
): BenchmarkCard[] {
  const sameGenre = BENCHMARK_CARDS.filter(c => c.genre === genre);
  if (sameGenre.length <= limit) return sameGenre.slice();

  // Score: subgenre match boost
  const scored = sameGenre.map(c => {
    let score = 0;
    for (const sub of subGenres) {
      if (c.subGenres.some(s => s.toLowerCase().includes(sub.toLowerCase()))) score += 1;
    }
    // Recent + top performer boost
    if (c.yearTop >= 2024) score += 0.5;
    if (c.monthlyVotesPeak && c.monthlyVotesPeak > 100000) score += 0.5;
    return { card: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.card);
}

/**
 * Get a single benchmark card by id (used for cross-reference).
 */
export function getBenchmarkById(id: string): BenchmarkCard | undefined {
  return BENCHMARK_CARDS.find(c => c.id === id);
}

/**
 * Format benchmark cards into a markdown block for prompt injection.
 * Includes: kernel structure, opening hook, world, power system, differentiator.
 * Excludes caution patterns + length (those for engine, not for AI).
 */
export function formatBenchmarksForPrompt(cards: BenchmarkCard[]): string {
  if (cards.length === 0) return '(không có benchmark nào trong genre này)';
  const parts: string[] = [];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    parts.push(`### Benchmark ${i + 1}: 《${c.title}》 (${c.titleRomanized || c.title}) — ${c.author}, ${c.platform} ${c.yearTop}`);
    parts.push(`Genre: ${c.genre} | Sub: ${c.subGenres.join(', ')}`);
    if (c.monthlyVotesPeak) {
      parts.push(`Peak monthly votes: ${c.monthlyVotesPeak.toLocaleString()}`);
    }
    parts.push(``);
    parts.push(`**Kernel**:`);
    parts.push(`- Reader fantasy: ${c.kernel.readerFantasy}`);
    parts.push(`- Pleasure loop: ${c.kernel.pleasureLoop}`);
    parts.push(`- System mechanic: ${c.kernel.systemMechanic}`);
    parts.push(`- MC secret: ${c.kernel.mcSecret}`);
    parts.push(``);
    parts.push(`**Opening**: ${c.openingHook}`);
    parts.push(`**World**: ${c.worldStructure}`);
    parts.push(`**Power system**: ${c.powerSystem}`);
    parts.push(`**Antagonist ladder**: ${c.antagonistLadder}`);
    parts.push(`**🔑 Differentiator** (what makes it 10× better): ${c.differentiator}`);
    parts.push('');
  }
  return parts.join('\n');
}
