/**
 * Spawn 4 novels target nữ độc giả thích bá đạo tổng tài + trọng sinh revenge:
 *
 * 1) Corporate revenge — MC tổng tài $5B kiếp trước bị vợ + tình nhân hãm tù
 *    12 năm, trọng sinh về 5 năm trước cưới vợ. Báo thù exact theo memory.
 * 2) Wedding day broken bạch nguyệt quang — Fiancée bỏ MC theo cũ tình đầu
 *    Trần Hoàng Việt (MIT graduate). MC awakening = trọng sinh từ kiếp
 *    trước Andrew Trần $1B Silicon Valley. Phase 1 face-slap epic.
 * 3) Trọng sinh hủy hôn ngày trước — MC nhớ exact mỗi proof ngoại tình của
 *    vợ tương lai, hủy hôn công khai trước hôn lễ + xây empire phá Phạm gia.
 * 4) Showbiz VN trọng sinh — MC + người yêu Phạm Vy Anh đều muốn showbiz,
 *    Vy Anh bỏ MC theo nhà sản xuất Đặng Quốc Tài. MC awakening = trọng
 *    sinh từ kiếp trước Lê Quốc Anh nhạc sĩ showbiz VN 50t, biết toàn bộ
 *    lịch sử ngành 2000-2026: top 200 hit songs + 100 phim + casting + biz.
 *    Viết nhạc + ký ca sĩ + ký nhạc sĩ + làm phim + mua phim ngoại quốc
 *    → thống trị ngành. Tên ca sĩ/phim/công ty đều HƯ CẤU (không Mỹ Tâm
 *    Sơn Tùng Yeah1 thật).
 *
 * Reference TQ: 重生总裁前妻虐渣 + 婚礼当天被悔婚 + 重生娱乐圈大佬.
 *
 * Run dry: `npx tsx scripts/spawn-female-target-quad.ts`
 * Apply:   `npx tsx scripts/spawn-female-target-quad.ts --apply`
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

const VN_DATE = (() => {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 3600 * 1000);
  return vn.toISOString().slice(0, 10);
})();

const FEMALE_TARGET_STYLE_HINT = 'Target nữ độc giả thích bá đạo tổng tài. Tone: nam chính lạnh lùng + mạnh mẽ + trọng tình yêu + bảo vệ phụ nữ tuyệt đối + máu lửa face-slap. Female lead intelligent + beautiful + capable. Mỗi chương ≥1 face-slap moment visible to ex/villain. Material wealth display: biệt thự + xe Lamborghini/Bentley/Rolls-Royce + suit Tom Ford + đồng hồ Patek Philippe. Setup pacing 30% setup + 70% face-slap/dopamine. Tham khảo nhịp 《重生之绝代盛宠》《偏执男主白月光我不当了》.';

const SEEDS = [
  // ── 1. CORPORATE REVENGE: PRISON → REBIRTH ────────────────────────────
  {
    title: 'Trọng Sinh Tổng Tài: Vợ Cũ Hãm Ta Vào Tù, Kiếp Này Ta Báo Thù Tận Số',
    slug: 'trong-sinh-tong-tai-vo-cu-ham-ta-vao-tu-kiep-nay-ta-bao-thu-tan-so',
    genre: 'do-thi' as const,
    main_character: 'Lý Hạo Vũ',
    description:
      'CEO tập đoàn Vĩnh Phát Đông Hà 45 tuổi Lý Hạo Vũ chết trong tù vì cơn đau tim — sau 12 năm bị vợ Phan Mỹ Linh + thư ký kiêm tình nhân Đào Tử Thanh hãm vào tội rửa tiền + lừa đảo cổ đông + tham nhũng. Tài sản $5 tỷ USD chuyển sạch cho Mỹ Linh + Tử Thanh trong 6 tháng cuối, tù 12 năm, mẹ già qua đời vì stress trước khi MC ra tù. Đột nhiên MC tỉnh dậy trên giường biệt thự tại Phương Nam VN, năm 2021 — 28 tuổi, đúng 5 năm trước khi cưới Phan Mỹ Linh. Cả kế hoạch kinh doanh + nội tình các deal + danh sách kẻ phản bội đều hiện trong tâm trí MC như memory ROM full. Hạo Vũ lập tức call thư ký mới Lưu Hằng Anh (kiếp này chưa gặp): "Em ơi, anh có dự án mới. Anh cần em đặt lịch khẩn với CEO Phan gia BĐS trong 48 giờ — anh muốn mua 30% cổ phần Phan gia trước khi họ IPO. Và call luật sư cá nhân — anh muốn ký prenuptial agreement strictest level cho mọi quan hệ tương lai." Năm năm tới: MC build empire $10B (2x kiếp trước), cô lập Phan gia, vợ cũ Mỹ Linh phá sản + cầu xin, tình nhân Tử Thanh ngồi tù, mẹ già sống thọ thêm 20 năm, cô vợ mới Lưu Hằng Anh đẹp gấp 100 lần + trung thành tuyệt đối.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc nữ trải nghiệm cảm giác MC tổng tài bá đạo $5B trọng sinh từ tù 12 năm + cái chết, mỗi chương đều dùng kế hoạch business + memory kẻ phản bội để outplay vợ cũ Mỹ Linh + tình nhân Tử Thanh, build empire $10B trong 5 năm + face-slap cả Phan gia phá sản + ôm cô vợ mới Lưu Hằng Anh xinh đẹp tuyệt đối + thiên kiến nhân từ.
- Protagonist Engine: Lý Hạo Vũ thắng bằng 20 năm CEO empire kinh nghiệm kiếp trước (M&A + IPO + Capital Markets + Real Estate + Tech) + memory exact mỗi business deal sẽ thắng 5 năm tới + danh sách kẻ phản bội. Hắn là bá đạo tổng tài lạnh lùng outside, máu lửa inside, bảo vệ mẹ + Hằng Anh tuyệt đối.
- Pleasure Loop: MC nhớ memory kẻ phản bội → execute deal/cô lập → kẻ phản bội ngạc nhiên + bystander witness → face-slap visible → MC ôm Hằng Anh + chăm sóc mẹ → next memory kẻ phản bội tiếp theo.
- System Mechanic: Memory ROM kiếp trước (không có hệ thống cosmic) — MC nhớ exact tất cả business deals, M&A timing, stock prices, real estate valuations, kẻ phản bội identities + motivations + weaknesses 2021-2033. Mỗi memory chỉ 1 chiều — MC biết trước nhưng cần action thực thi.
- Phase 1 Playground: Phương Nam VN 2021 (hư cấu, không Sài Gòn cụ thể), Vĩnh Phát Đông Hà tập đoàn headquarter, Phan gia mansion + công ty BĐS, biệt thự mẹ MC tại Quận Lá Phong.
- Social Reactor: Mẹ MC Phạm Thị Thanh (60t, kiếp trước chết 12 năm sau vì stress, kiếp này MC bảo vệ), Lưu Hằng Anh (25t, thư ký mới + future wife, CEO Hằng Anh Group), em gái MC Lý Quỳnh Anh (20t, sinh viên Y khoa), bạn thân CEO Trương Vĩnh Hùng (đầu tư Phase 1), luật sư cá nhân Đặng Quang Lộc (50t, trung thành).
- Novelty Ladder: Ch.1-30 (MC trọng sinh + setup prenup + acquire 30% Phan gia trước IPO). Ch.30-80 (Phan gia tài chính lung lay, Mỹ Linh + Tử Thanh hoảng loạn). Ch.80-150 (Empire $1B + media truyền thông MC). Ch.150-300 (Empire $5B + chứng minh Mỹ Linh + Tử Thanh tham nhũng → tù). Ch.300+ (Cosmic empire $10B + Hằng Anh wedding + endgame).
- Control Rules: Payoff business + revenge mỗi 2-3 chương; payoff Hằng Anh love arc mỗi 5-10 chương; payoff Phan gia phá sản mỗi 20 chương. Attention Gradient: gia đình → Vĩnh Phát Đông Hà → Phương Nam business circle → toàn quốc → cosmic.

### BỐI CẢNH
${FEMALE_TARGET_STYLE_HINT}

Phương Nam Việt Nam 2021 hư cấu (tone hiện đại nhưng KHÔNG gắn Sài Gòn / Hà Nội / địa danh chính trị thực). Vĩnh Phát Đông Hà tập đoàn — fortune-500 tier Việt Nam, mảng BĐS + công nghệ + truyền thông, founded 1995 bởi bố MC Lý Quang Thành (đã mất 5 năm trước, MC kế thừa năm 23t). Hiện 2021 tập đoàn $500M revenue, $2B asset. Kiếp trước MC scale lên $5B trước khi bị vợ + tình nhân hãm hại 2033.

Phan gia BĐS — đại tộc Phương Nam, founded by Phan Đại Hữu (kiếp trước cha vợ MC, sau cái chết Mỹ Linh thừa kế). 2021 Phan gia chuẩn bị IPO trên HOSE (hư cấu thị trường), valuation $300M. Kiếp trước MC mua 5% cổ phần khi cưới Mỹ Linh (như hồi môn), sau 12 năm Mỹ Linh + Tử Thanh dùng cổ phần đó leverage để control Vĩnh Phát.

### NHÂN VẬT CHÍNH
- Tên: Lý Hạo Vũ
- Tuổi: 28 tuổi kiếp này (kiếp trước 45t khi chết trong tù 2033, trọng sinh về 2021)
- Nghề/Trạng thái: CEO Vĩnh Phát Đông Hà tập đoàn (kế thừa từ bố 5 năm trước). Tài sản cá nhân $200M kiếp này. Chưa kết hôn, đang dating Phan Mỹ Linh được 6 tháng (chưa engagement).
- Tài sản: Biệt thự 800m² Quận Lá Phong, 5 xe (Rolls-Royce Ghost + Lamborghini Aventador + Bentley Continental + Range Rover SVR + Toyota Lexus), CEO suit + Patek Philippe Nautilus đồng hồ.
- Tính cách: Bá đạo lạnh lùng outside (giọng nói thấp, ánh mắt sắc), máu lửa inside (đầu óc business hyper-active), bảo vệ mẹ + em gái + Hằng Anh tuyệt đối, máu lạnh với kẻ phản bội.
- Điểm yếu: Tin Mỹ Linh quá ngây thơ kiếp trước → kiếp này cần kế hoạch tinh tế để Mỹ Linh không nghi MC đã trọng sinh.

### GOLDEN FINGER
Memory ROM kiếp trước 12 năm 2021-2033 — exact mỗi business deal, stock price, M&A timing, kẻ phản bội identity. Không có hệ thống cosmic.

### CAST CHÍNH
- Phạm Thị Thanh (mẹ MC 60t, người MC bảo vệ tuyệt đối)
- Lưu Hằng Anh (25t, thư ký mới Phase 1 → CEO Hằng Anh Group Phase 2 → wife Phase 3)
- Lý Quỳnh Anh (em gái 20t sinh viên Y)
- CEO Trương Vĩnh Hùng (bạn thân, đầu tư đối tác)
- Đặng Quang Lộc (luật sư cá nhân, 50t)

### ANTAGONISTS
- Phan Mỹ Linh (vợ cũ kiếp trước, 27t năm 2021, thiên kim Phan gia)
- Đào Tử Thanh (thư ký cũ kiếp trước + tình nhân Mỹ Linh, 30t, MBA Harvard, ambition)
- Phan Đại Hữu (cha Mỹ Linh, CEO Phan gia BĐS, kiếp trước assist con gái)
- Cosmic enemy Phase 4: Tập đoàn quốc tế Mỹ ABC Corp muốn nuốt Vĩnh Phát.

### PHASE ROADMAP
- Phase 1 (1-100): Setup prenup, acquire 30% Phan gia trước IPO, build Hằng Anh team
- Phase 2 (100-300): Empire $1-3B, Mỹ Linh hoảng loạn try to seduce MC
- Phase 3 (300-600): Empire $5B, chứng minh Mỹ Linh + Tử Thanh tham nhũng → tù
- Phase 4 (600-1000): Cosmic $10B, Hằng Anh wedding, endgame ABC Corp threat

### OPENING SCENE
Location: Biệt thự MC Quận Lá Phong, 5 giờ sáng ngày 15/3/2021, sau cơn ác mộng 12 năm tù.

MC bừng tỉnh, đầu ngồn ngộn memory tù + cái chết. Nhìn biệt thự cũ kiếp trước Mỹ Linh + Tử Thanh đã chiếm — kiếp này MC sẽ giữ. MC call thư ký mới Lưu Hằng Anh, đặt lịch khẩn CEO Phan gia 48h.

Câu mở đầu: "Mười hai năm tù cho ta hiểu một điều: tin sai người là tội lỗi đắt nhất. Kiếp này, ta sẽ không lặp lại."

### WORLD RULES
- Memory MC tuyệt đối bí mật. Tiết lộ trọng sinh = mất lợi thế.
- Tất cả tên Việt Nam hư cấu, KHÔNG gắn nhân vật / công ty / địa danh thực tế.

### TONE & ANTI-PATTERNS
TONE: Bá đạo cool 50% + ấm áp với Hằng Anh + mẹ 25% + face-slap đối thủ 25%. Pacing nhanh, dày dopamine.
KHÔNG: hậu cung sa đà, drama gia đình kéo dài, sex scene chi tiết, anachronism (2021 = pre-COVID, không nhắc COVID).
`,
    total_planned_chapters: 1000,
  },

  // ── 2. WEDDING DAY BROKEN BY BACH NGUYET QUANG ──────────────────────
  {
    title: 'Ngày Cưới Cô Đi Với Bạch Nguyệt Quang, Ta Thức Tỉnh Trọng Sinh Trở Thành Đại Lão',
    slug: 'ngay-cuoi-co-di-voi-bach-nguyet-quang-ta-thuc-tinh-trong-sinh-tro-thanh-dai-lao',
    genre: 'do-thi' as const,
    main_character: 'Trần Quang Anh',
    description:
      'Trần Quang Anh 22 tuổi, sinh viên năm cuối Đại học Kinh Tế Phương Nam, đính hôn 3 năm với Lê Tịnh Nhi (thiên kim Lê gia tập đoàn $200M). Ngày 30/12 hôn lễ tại Khách Sạn Continental 5-sao Phương Nam, 800 khách đại tộc tham dự. Đúng lúc trao nhẫn, Lê Tịnh Nhi đột nhiên rớt nhẫn xuống đất, gọi tên "Trần Hoàng Việt" — bạch nguyệt quang cũ tình đầu lớp 10 Việt vừa về từ MIT Boston sau 7 năm du học. Hoàng Việt bước lên sân khấu, ôm Tịnh Nhi: "Anh xin lỗi anh đến muộn. Bố anh — CEO Trần Đại Nguyên tập đoàn Trần Việt $5B — vừa cho phép anh chính thức mỗi cưới em. Tịnh Nhi, theo anh." Trần Quang Anh đứng đông cứng giữa lễ đường, 800 khách sửng sốt, mẹ Lê Tịnh Nhi (CEO Lê gia) thì thầm: "Quang Anh, gia tộc anh chỉ là tiệm hàng tạp hóa nhỏ, làm sao xứng với Trần Việt? Em xin lỗi." Quang Anh ngất xỉu trên sân khấu — thức tỉnh trong tâm trí với ký ức kiếp trước: hắn là Andrew Trần, tỷ phú USD Silicon Valley 47t, chết tai nạn xe 5 năm trước (2021), soul reborn vào Trần Quang Anh kiếp này. 25 năm business experience + memory of every successful tech IPO 2010-2026 + network 1000+ Silicon Valley executives — tất cả hiện ra. Khi Quang Anh mở mắt, hắn không còn là sinh viên nghèo — hắn là Andrew Trần. 60 ngày sau ngày bị bỏ rơi, Quang Anh ra mắt startup AI cosmic-tier nhận $50M angel funding, lên cover Forbes Vietnam. Lê Tịnh Nhi + Trần Hoàng Việt sửng sốt.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc nữ trải nghiệm cảm giác MC trẻ bị fiancée bỏ ngày cưới theo bạch nguyệt quang đại tộc thắng ta, đột nhiên thức tỉnh trọng sinh từ kiếp trước Andrew Trần tỷ phú Silicon Valley 47t — 60 ngày sau ra mắt startup AI $50M angel funding lên cover Forbes, Lê Tịnh Nhi + Trần Hoàng Việt sửng sốt cầu xin MC quay lại, MC từ chối + ôm cô vợ mới Tô Hỷ Lan đẹp gấp 100 lần.
- Protagonist Engine: Trần Quang Anh thắng bằng kiếp trước 25 năm Silicon Valley CEO (3 IPO thành công + network 1000+ executives + memory exact mỗi tech trend 2010-2026 từ AI/Crypto/Quantum) + cosmic awakening sau cú sốc bị bỏ rơi.
- Pleasure Loop: MC nhớ memory tech IPO → execute startup → angel + Series A funding nhanh → media bão → Lê Tịnh Nhi + Trần Hoàng Việt sửng sốt → MC ôm Tô Hỷ Lan + next milestone.
- Phase 1 Playground: Phương Nam VN 2026 hư cấu, Quang Anh startup garage chuyển thành cosmic AI lab, Trần Việt tập đoàn HQ, Lê gia thiên kim mansion.
- Social Reactor: Mẹ MC Trần Lệ Hằng (45t, goá phụ, bán tiệm tạp hóa nuôi MC ăn học), Tô Hỷ Lan (CEO Hỷ Lan Tech 28t, Forbes 30 under 30, gặp MC ch.20 sau khi MC startup viral), bạn thân Phạm Quốc Cường (đầu tư Phase 1), em gái MC Trần Quỳnh Anh (16t sinh viên).
- Novelty Ladder: Ch.1-15 (Wedding broken + awakening trọng sinh + 60 ngày startup setup). Ch.15-50 ($50M angel + cover Forbes + Tịnh Nhi sửng sốt). Ch.50-100 (Series A $200M + Hỷ Lan partnership). Ch.100-300 (IPO $5B + Trần Việt tập đoàn outcompete). Ch.300+ (Cosmic global tech empire).

### BỐI CẢNH
${FEMALE_TARGET_STYLE_HINT}

Phương Nam VN 2026 hư cấu. Tech industry boom sau 2020s — VinAI, FPT, VNG, Tiki tier startups. Trần Quang Anh 22t kiếp này, gia đình nghèo (mẹ Trần Lệ Hằng goá phụ tiệm tạp hóa 30m², bố mất từ MC 5t), MC scholarship Đại học Kinh Tế. Đính hôn Lê Tịnh Nhi 3 năm trước qua family connection — Lê gia BĐS $200M, Lê mama coi MC như "scholarship boy bám đỉnh giàu". Hôn lễ ngày 30/12/2026 tại Continental 5-sao Phương Nam.

Trần Hoàng Việt 27t, cũ tình đầu Tịnh Nhi từ lớp 10 trước khi Việt du học MIT Boston 7 năm. Hoàng Việt nay là Phó CTO Trần Việt tập đoàn $5B, cha Trần Đại Nguyên CEO tập đoàn tier-1 Phương Nam.

### NHÂN VẬT CHÍNH
- Trần Quang Anh, 22t (kiếp trước Andrew Trần 47t, Silicon Valley tỷ phú $1B, chết tai nạn xe 2021, soul trans 2026)
- Sinh viên năm cuối Đại học Kinh Tế Phương Nam, GPA 3.8, scholarship full
- Tài sản: 1 xe máy Honda Wave, $500 tiết kiệm, MacBook M1 vay (chưa trả)
- Tính cách: Hiền lành kiếp này, sau awakening cool + bá đạo lạnh lùng

### GOLDEN FINGER
Cosmic awakening — toàn bộ memory + experience kiếp trước Andrew Trần Silicon Valley: 3 IPO ($50M-$2B), network 1000+ executives (Sundar Pichai, Sam Altman, Marc Benioff style — VN hư cấu names), memory exact mỗi tech trend 2010-2026.

### CAST CHÍNH
- Mẹ Trần Lệ Hằng (45t, người MC bảo vệ)
- Tô Hỷ Lan (28t CEO Hỷ Lan Tech, Forbes 30 under 30, future wife)
- Phạm Quốc Cường (bạn thân, đầu tư Phase 1)
- Em gái Trần Quỳnh Anh (16t)

### ANTAGONISTS
- Lê Tịnh Nhi (23t, fiancée bỏ MC, thiên kim Lê gia)
- Trần Hoàng Việt (27t, bạch nguyệt quang MIT, Phó CTO Trần Việt tập đoàn)
- Trần Đại Nguyên (cha Hoàng Việt, CEO Trần Việt tập đoàn $5B)
- Lê mama (CEO Lê gia)

### PHASE ROADMAP
- Phase 1 (1-100): Wedding broken → awakening → 60 ngày startup AI ($50M angel + cover Forbes) → Hỷ Lan partnership
- Phase 2 (100-300): Series A $200M + Trần Việt tập đoàn outcompete
- Phase 3 (300-600): IPO $5B + global expansion
- Phase 4 (600-1000): Cosmic tech empire $50B + Trần Đại Nguyên cầu xin partnership

### OPENING SCENE
Location: Continental 5-sao Phương Nam, 11h sáng 30/12/2026, lễ đường hoa hồng trắng + 800 khách.

Trần Quang Anh trao nhẫn cho Lê Tịnh Nhi — nàng rớt nhẫn, gọi "Trần Hoàng Việt". Việt bước lên ôm Tịnh Nhi: "Anh xin lỗi anh đến muộn." Quang Anh ngất xỉu, awakening trong tâm trí: Andrew Trần Silicon Valley 47t tỷ phú, chết tai nạn xe 2021. 25 năm business experience + 3 IPO memory + 1000+ executive network hiện ra.

Câu mở đầu: "Cô ấy gọi tên bạch nguyệt quang của mình trên sân khấu — và ta nhận ra ta không còn là sinh viên nghèo. Ta là Andrew Trần."

### WORLD RULES
- Trọng sinh tuyệt đối bí mật, KHÔNG ai biết MC là Andrew Trần.
- Tất cả tên VN hư cấu (Trần Việt tập đoàn, Lê gia, Hỷ Lan Tech, Forbes Vietnam đều fake).

### TONE & ANTI-PATTERNS
TONE: Cool revenge 40% + ấm áp Hỷ Lan + mẹ 30% + face-slap Tịnh Nhi + Hoàng Việt + Trần Đại Nguyên 30%. Pacing rất nhanh.
KHÔNG: hậu cung, MC dao động về Tịnh Nhi, drama mẹ kéo dài, sex scene.
`,
    total_planned_chapters: 1000,
  },

  // ── 3. CANCEL ENGAGEMENT NIGHT BEFORE WEDDING ─────────────────────
  {
    title: 'Trọng Sinh Đêm Trước Hôn Lễ: Ngày Mai Cưới Cô Ngoại Tình, Kiếp Này Ta Hủy Hôn',
    slug: 'trong-sinh-dem-truoc-hon-le-ngay-mai-cuoi-co-ngoai-tinh-kiep-nay-ta-huy-hon',
    genre: 'do-thi' as const,
    main_character: 'Hoàng Trí Dũng',
    description:
      'Hoàng Trí Dũng 30 tuổi, CEO Hoàng Long tập đoàn xây dựng $800M Phương Nam. Đêm 29/11/2026 trước đám cưới với Phạm Tịnh Hằng (thiên kim Phạm gia $1.5B tài chính) ngày mai, MC trọng sinh từ kiếp trước — kiếp trước MC cưới Phạm Tịnh Hằng năm 30t, sống 6 năm sau đó phát hiện Hằng ngoại tình với bạn thân MC từ trước cưới + đã có con riêng (giấu MC), MC ly hôn mất 60% tài sản trong civil court, tự sát năm 38t. Trọng sinh exactly đêm 29/11 — MC nhớ exact mỗi proof của Hằng ngoại tình: messages with bạn Quốc Việt (10 năm friendship), bills khách sạn, paternity test (1 tuần trước cưới). Sáng 30/11, thay vì lễ đường, MC mời Phạm Tịnh Hằng + Quốc Việt + cả nhà 2 bên đến văn phòng Hoàng Long, công khai mọi proof. Cô lập Phạm gia tài chính trong 30 ngày + đoạt control. Cuối Phase 1, Phạm gia phá sản, Hằng + Quốc Việt cầu xin tha thứ, MC cưới cô vợ mới Đặng Linh Chi (CEO Linh Chi Capital, từng từ chối MC cầu hôn kiếp trước vì MC chọn Hằng). Cuộc đời thực sự bắt đầu khi MC dám nhìn thẳng vào sự thật.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: MC tổng tài 30t bị vợ tương lai ngoại tình với bạn thân + có con riêng, trọng sinh exactly đêm trước hôn lễ với toàn bộ proof memory — sáng hôm sau hủy hôn công khai, cô lập Phạm gia, vợ + tình nhân cầu xin, MC cưới Linh Chi (cô bị từ chối kiếp trước, kiếp này MC sửa).
- Protagonist Engine: Hoàng Trí Dũng thắng bằng 8 năm CEO empire + memory exact proof ngoại tình + danh sách kẻ phản bội (Quốc Việt + 5 corrupt employees).
- Pleasure Loop: Public unveiling proof → Hằng + Quốc Việt + cả nhà sửng sốt → cô lập Phạm gia → Linh Chi xuất hiện → MC ôm Linh Chi.
- Phase 1 Playground: Phương Nam VN 2026 hư cấu, Hoàng Long tập đoàn HQ, Phạm gia mansion, Continental hotel (cancelled wedding venue).
- Novelty Ladder: Ch.1-10 (Hủy hôn công khai + family scandal). Ch.10-50 (Cô lập Phạm gia tài chính). Ch.50-100 (Linh Chi return + new love). Ch.100-300 (Hoàng Long empire $2-5B). Ch.300+ (Cosmic global).

### BỐI CẢNH
${FEMALE_TARGET_STYLE_HINT}

Phương Nam VN 2026 hư cấu. Hoàng Long tập đoàn — top 5 construction Phương Nam. Phạm gia tài chính tier-1, Phạm Đại Tài CEO. Đám cưới ngày 30/11/2026 Continental Hotel.

### NHÂN VẬT CHÍNH
- Hoàng Trí Dũng, 30t (kiếp trước 38t tự sát sau ly hôn, trọng sinh đêm trước cưới 8 năm hồi)
- CEO Hoàng Long tập đoàn $800M xây dựng
- Biệt thự Quận Hồ Tây, Rolls-Royce Ghost + Aston Martin DB12

### GOLDEN FINGER
Memory exact proof ngoại tình + kẻ phản bội 2026-2034. Plus 8 năm CEO empire kinh nghiệm.

### CAST CHÍNH
- Mẹ Hoàng Trí Dũng — Phạm Hoài Anh (55t, không ưa Hằng)
- Đặng Linh Chi (28t CEO Linh Chi Capital, kiếp trước bị MC từ chối)
- Em trai Hoàng Trí Nam (25t Phó CEO Hoàng Long)
- Luật sư Đặng Tấn Lộc (50t)

### ANTAGONISTS
- Phạm Tịnh Hằng (28t fiancée ngoại tình)
- Quốc Việt (30t bạn thân MC 10 năm + tình nhân của Hằng + cha của đứa con bí mật)
- Phạm Đại Tài (CEO Phạm gia, biết về ngoại tình nhưng giấu MC để đám cưới thành công)
- Cosmic enemy Phase 4: ABC Construction Group quốc tế

### PHASE ROADMAP
- Phase 1 (1-100): Hủy hôn công khai + cô lập Phạm gia + Linh Chi return
- Phase 2 (100-300): Phạm gia phá sản + Linh Chi wedding
- Phase 3 (300-600): Hoàng Long empire $2-5B + global
- Phase 4 (600-1000): Cosmic $10B + ABC Construction threat

### OPENING SCENE
Location: Biệt thự MC Quận Hồ Tây Phương Nam, 23h59 đêm 29/11/2026, 1 ngày trước cưới.

MC tỉnh dậy từ giấc mơ 8 năm sau — chính kiếp trước. Memory hoàn chỉnh: Hằng ngoại tình với Quốc Việt từ 2 năm trước cưới, có đứa con 1 tuổi giấu kín. Civil court mất 60% tài sản. Tự sát 2034.

MC ngồi dậy, mở laptop, lên kế hoạch 12 giờ tới: 8 giờ sáng triệu tập gia đình 2 bên + Quốc Việt đến HQ Hoàng Long, present proof, hủy hôn công khai.

Câu mở đầu: "Tám năm sau ta nhảy từ tầng 30 — kiếp này ta sẽ không để cô ấy bước vào lễ đường của ta."

### WORLD RULES
- Trọng sinh tuyệt đối bí mật.
- Tên VN hư cấu hoàn toàn.

### TONE & ANTI-PATTERNS
TONE: Lạnh lùng máu lửa 60% + ấm áp Linh Chi + mẹ 20% + face-slap Hằng + Quốc Việt 20%. Pacing siêu nhanh Phase 1.
KHÔNG: dao động về Hằng, drama gia đình kéo dài, sex scene.
`,
    total_planned_chapters: 1000,
  },

  // ── 4. SHOWBIZ VN REBIRTH ─────────────────────────────────────────
  {
    title: 'Trọng Sinh Showbiz Việt: Ta Có Cả Lịch Sử Giải Trí Từ 2000 Đến 2026',
    slug: 'trong-sinh-showbiz-viet-ta-co-ca-lich-su-giai-tri-tu-2000-den-2026',
    genre: 'do-thi' as const,
    main_character: 'Lê Quốc Anh',
    description:
      'Lê Quốc Anh 23 tuổi, sinh viên năm cuối Nhạc Viện Phương Nam, đam mê âm nhạc từ nhỏ — đang đính ước với người yêu 4 năm Phạm Vy Anh (24t, sinh viên Trường Sân Khấu Điện Ảnh, mơ làm diễn viên hàng đầu). Cả 2 cùng dream "vào showbiz top together". Năm 2005, Vy Anh đột ngột chia tay MC sau khi gặp Đặng Quốc Tài — nhà sản xuất phim trẻ 32t (con trai CEO Đặng Truyền Thông tập đoàn $50M, tier-1 showbiz Phương Nam). Đặng Tài hứa cast Vy Anh vào vai chính phim "Cô Gái Phương Nam 2005" — cơ hội breakout. Vy Anh chọn Đặng Tài: "Anh Quốc Anh, em xin lỗi. Showbiz cần connection. Anh chỉ là sinh viên nhạc viện." Lê Quốc Anh ngất xỉu trong phòng ký túc xá — thức tỉnh memory kiếp trước. Hắn là Lê Quốc Anh 50 tuổi, nhạc sĩ + producer hàng đầu showbiz VN 2000-2026, sống chứng kiến toàn bộ ngành: top 200 bài hit songs, top 100 phim, casting decisions, ngôi sao rise + fall, công ty M&A. Hiện 2005, ngành showbiz VN đang chuyển từ CD/cassette sang MP3 + internet — Quốc Anh có 5 năm lead trước smartphone era + 10 năm trước TikTok. Ngày kế Quốc Anh viết bài "Anh Còn Nợ Em" cho ca sĩ trẻ Bích Phương Mai — bài hit số 1 Phương Nam 6 tháng sau, kick start career producer của MC. Trong 10 năm tới: ký hợp đồng với 20 ca sĩ + nhạc sĩ trẻ tài năng, founded "Quốc Anh Music" tier-1, viết 50 bài hit, làm 10 phim hot, mua quyền phim nước ngoài → thống trị ngành. Phạm Vy Anh + Đặng Tài sẽ thấy chàng trai "chỉ là sinh viên nhạc viện" trở thành đại lão showbiz $500M.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: MC sinh viên nhạc viện nghèo bị người yêu bỏ theo nhà sản xuất giàu showbiz, thức tỉnh memory kiếp trước nhạc sĩ + producer hàng đầu showbiz VN 2000-2026 — biết exactly mỗi bài hit + casting + công ty M&A 21 năm tới — ký 20 ca sĩ tài năng + làm 50 bài hit + 10 phim, founded Quốc Anh Music $500M, thống trị showbiz VN, face-slap Phạm Vy Anh + Đặng Tài.
- Protagonist Engine: Lê Quốc Anh thắng bằng 30 năm experience nhạc sĩ + producer kiếp trước (1995-2025) + memory exact mỗi hit song lyric/melody + casting opportunity + business deal showbiz VN 2000-2026.
- Pleasure Loop: MC nhớ 1 hit song chưa ra mắt → ký với ca sĩ trẻ tài năng (chưa nổi) → produce + release → song viral → ca sĩ thành sao → MC's company grow → next hit + next star.
- Phase 1 Playground: Phương Nam VN 2005, ký túc xá Nhạc Viện, studio Quốc Anh setup trong nhà mẹ Quận Lá Phong, Đặng Truyền Thông tập đoàn HQ.
- Social Reactor: Mẹ Lê Hoàng Anh (50t, goá phụ giúp MC theo dõi tiệm tạp hóa nhỏ), Bích Phương Mai (19t ca sĩ trẻ vô danh, đầu tiên được MC ký, sau thành super star), nhạc sĩ trẻ Trần Minh Khôi (22t, songwriter tài năng), Trương Quốc Hùng (40t đại lão showbiz già nhận MC là protégé), Lưu Hằng Lan (CEO Hằng Lan Films, 35t, đầu tư phim đầu của MC), Đào Tử Nguyên (22t diễn viên trẻ tài năng, sau thành minh tinh).
- Novelty Ladder: Ch.1-30 (Awakening + ký Bích Phương Mai + "Anh Còn Nợ Em" hit #1). Ch.30-80 (Founded Quốc Anh Music + 5 ca sĩ ký + 3 hit). Ch.80-150 (Làm phim đầu tiên + Đặng Tài rival). Ch.150-300 (Quốc Anh Music $100M + thống trị music industry). Ch.300+ (Showbiz empire $500M-$1B + global expansion + mua phim nước ngoài).

### BỐI CẢNH
${FEMALE_TARGET_STYLE_HINT}

Phương Nam Việt Nam 2005 hư cấu. Ngành showbiz VN đang chuyển CD/cassette → MP3/iTunes/online, smartphone era chưa đến (2010+). Đại tộc showbiz: Đặng Truyền Thông tập đoàn (tier-1, Đặng Truyền Trí CEO, son Đặng Quốc Tài rising), Hằng Lan Films, Quốc Hùng Music, Sài Đô Records.

QUAN TRỌNG: tất cả tên ca sĩ, bài hát, phim, công ty đều HƯ CẤU. KHÔNG dùng tên thật Mỹ Tâm / Sơn Tùng / Hồ Ngọc Hà / Đen Vâu / Yeah1 / Sài Gòn Sao. KHÔNG nhắc Truyền Hình thực tế.

### NHÂN VẬT CHÍNH
- Lê Quốc Anh, 23t (kiếp trước 50t nhạc sĩ + producer hàng đầu showbiz VN 1995-2025, đột tử cơn đau tim 2025 trong studio)
- Sinh viên năm cuối Nhạc Viện Phương Nam, major Composition + Music Production
- Tài sản: $500, một Yamaha keyboard cũ, một MacBook M1 vay (chưa trả), Honda Wave Alpha cũ
- Tính cách: Hiền lành kiếp này, sau awakening cool + showman + nhạy bén showbiz

### GOLDEN FINGER
Memory hoàn chỉnh kiếp trước 30 năm:
- 200+ hit songs 2000-2026 (lyric + melody + arrangement + production tips)
- 100+ phim Việt + market data + casting decisions + box office
- 50+ M&A deals + IPO + công ty M&A
- 1000+ talent identifications (ai sẽ thành sao, ai sẽ rise + fall)
- Memory về Đặng Quốc Tài kiếp trước (corrupt, scandal năm 2015, mất sự nghiệp)

### CAST CHÍNH
- Mẹ Lê Hoàng Anh (50t goá phụ)
- Bích Phương Mai (19t ca sĩ trẻ, future super star, female partner candidate)
- Trần Minh Khôi (22t songwriter trẻ tài năng)
- Trương Quốc Hùng (40t đại lão showbiz già, mentor)
- Lưu Hằng Lan (CEO Hằng Lan Films 35t, đầu tư phim đầu MC)
- Đào Tử Nguyên (22t diễn viên trẻ future minh tinh)

### ANTAGONISTS
- Phạm Vy Anh (24t ex người yêu, chọn Đặng Tài để leo showbiz)
- Đặng Quốc Tài (32t nhà sản xuất phim, con CEO Đặng Truyền Thông)
- Đặng Truyền Trí (60t CEO Đặng Truyền Thông tập đoàn $50M)
- Cosmic enemy Phase 4: ABC Entertainment Hollywood acquisition group

### PHASE ROADMAP
- Phase 1 (1-100): Awakening 2005 + ký Bích Phương Mai + hit "Anh Còn Nợ Em" + Đặng Tài rival start
- Phase 2 (100-300): Quốc Anh Music founded $5M-$50M + 10 ca sĩ stars + 5 hit albums + first film
- Phase 3 (300-600): Quốc Anh Music $200M + thống trị music + 10 phim hot + mua phim nước ngoài quyền chiếu VN
- Phase 4 (600-1000): Cosmic showbiz empire $1B + global expansion (Hollywood + K-pop partnership) + Đặng Truyền Thông tập đoàn nuốt được

### OPENING SCENE
Location: Ký túc xá Nhạc Viện Phương Nam, 23h ngày 15/3/2005, sau khi Phạm Vy Anh vừa rời đi với Đặng Tài.

Lê Quốc Anh ngồi sấp trên giường, cuốn cassette demo "Anh Còn Nợ Em" mà 2 đứa cùng viết trên tay. 4 năm tình cảm tan vỡ chỉ vì hắn không có connection showbiz. Hắn ngất xỉu, awakening trong tâm trí — Lê Quốc Anh 50t nhạc sĩ + producer hàng đầu VN 1995-2025, đột tử cơn đau tim 2025 trong studio cuối ngày làm việc 50 năm liền. 30 năm memory hiện ra: 200 bài hit, 100 phim, 1000 talent identifications, M&A showbiz VN.

Quốc Anh mở mắt, cầm cassette demo + Yamaha keyboard. Hắn còn nhớ "Anh Còn Nợ Em" version 2007 do ca sĩ Bích Phương Mai hát sẽ là hit #1 VN 6 tháng. 2005 hiện tại, Bích Phương Mai mới 19t vô danh, đang hát ở quán cafe Quận 3 (hư cấu). MC kế hoạch: 7h sáng mai đi tìm Phương Mai, offer cô ấy ký hợp đồng + record "Anh Còn Nợ Em" version 2005 với arrangement của MC (improved từ 2007 version).

Câu mở đầu: "Phạm Vy Anh chọn Đặng Tài vì hắn có connection showbiz — kiếp này ta sẽ trở thành connection mà cô ấy không dám mơ tới."

### WORLD RULES
- Memory trọng sinh tuyệt đối bí mật. MC giả vờ "thiên tài đột phá inspiration".
- Tất cả tên ca sĩ + bài hát + phim + công ty đều HƯ CẤU.
- KHÔNG đề cập real-world VN showbiz figures (Mỹ Tâm, Sơn Tùng, Đen Vâu, etc.).
- KHÔNG đề cập real công ty (Yeah1, VNG Music, Saigon Stars, etc.).

### TONE & ANTI-PATTERNS
TONE: Showman cool 40% + ấm áp Bích Phương Mai + mẹ + đối tác 30% + face-slap Vy Anh + Đặng Tài 30%. Pacing dày dopamine (mỗi 3-5 chương 1 hit/star/deal).
KHÔNG: hậu cung sa đà (Bích Phương Mai + 1-2 nữ phụ), drama Vy Anh dao động (MC tuyệt đối từ chối), sex scene, real names VN showbiz.
`,
    total_planned_chapters: 1000,
  },
];

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function applySpawn(seed: typeof SEEDS[0], ownerId: string): Promise<string | null> {
  const exist = await s.from('novels').select('id').eq('slug', seed.slug).maybeSingle();
  if (exist.data) { console.log(`  ⚠ skip ${seed.slug}`); return null; }
  const novel = await s.from('novels').insert({
    title: seed.title, slug: seed.slug, author: 'Truyện City',
    description: seed.description, genres: [seed.genre], status: 'Đang ra',
  }).select('id').single();
  if (novel.error || !novel.data) throw new Error(`novel: ${novel.error?.message}`);

  const project = await s.from('ai_story_projects').insert({
    novel_id: novel.data.id, user_id: ownerId, genre: seed.genre,
    main_character: seed.main_character, world_description: seed.world_description,
    total_planned_chapters: seed.total_planned_chapters,
    current_chapter: 0, status: 'active', pause_reason: null,
    setup_stage: 'idea', setup_stage_attempts: 0,
    temperature: 1.0, target_chapter_length: 2800, ai_model: 'gemini-3.1-flash-lite',
    style_directives: {
      disable_chapter_split: true, production_enabled: true,
      production_daily_chapter_quota: 50, require_full_chapter_blueprint: false,
      female_target_audience: true,
    },
  }).select('id').single();
  if (project.error || !project.data) throw new Error(`project: ${project.error?.message}`);
  console.log(`  ✓ ${project.data.id} | ${seed.title.slice(0, 60)}`);
  return project.data.id;
}

async function seedQuota(projectId: string) {
  const existing = await s.from('project_daily_quotas').select('vn_date').eq('project_id', projectId).eq('vn_date', VN_DATE).maybeSingle();
  if (existing.data) return;
  await s.from('project_daily_quotas').insert({ project_id: projectId, vn_date: VN_DATE, target_chapters: 50, written_chapters: 0, status: 'active' });
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(`\n━━━ Female-target quad spawn ${apply ? '[APPLY]' : '[DRY RUN]'} ━━━\n`);
  for (const seed of SEEDS) {
    console.log(`[SPAWN] ${seed.title}`);
    console.log(`  slug: ${seed.slug} | genre: ${seed.genre} | MC: ${seed.main_character}`);
    console.log(`  desc: ${seed.description.length} chars | world: ${seed.world_description.length} chars`);
  }
  if (!apply) { console.log('\nDRY RUN. Pass --apply.\n'); return; }
  const ownerId = await getOwnerId();
  const ids: string[] = [];
  for (const seed of SEEDS) {
    const id = await applySpawn(seed, ownerId);
    if (id) { await seedQuota(id); ids.push(id); }
  }
  console.log(`\n✓ ${ids.length} project(s) active.`);
  for (const id of ids) console.log(`  ${id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
