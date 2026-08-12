/**
 * Reset cf63c678 (Văn Đạo Phong Thần) → V2 concept hoàn toàn mới.
 *
 * User feedback: bộ Văn Đạo cũ "không thực sự là sảng văn" — thiếu cosmic scale,
 * thiếu beast tide threat, thiếu global Thiên Đạo Thư Viện broadcast. MC chỉ
 * viết sách trong "Thanh Vân Thư Quán" cho người đến mua đọc — quá nhỏ bé.
 *
 * V2 concept (đúng sảng văn TQ 2024-2025, mô típ 《儒道至圣》 + 《诸天大文豪》):
 * - Thế giới bị Đại Biến 50 năm trước, hung thú từ "Hư Cảnh" tràn vào,
 *   beast tide (Thú Triều) mỗi 10 năm lớn dần, võ giả thiếu công pháp mới.
 * - MC nhà văn web VN trọng sinh, có Thiên Đạo Thư Viện — upload mọi nội dung
 *   trong đầu (Kim Dung, Naruto, One Piece, LotR, Harry Potter, Tam Quốc, Tây Du)
 *   lên cosmic library, mọi võ giả trên đại lục đọc qua "Ngọc Thư Sách".
 * - Đọc càng đắm chìm → lĩnh ngộ chiêu thức / công pháp / thần thông từ story.
 * - Mỗi reader lĩnh ngộ → MC nhận điểm Văn Khí → tu vi tăng + unlock chương mới.
 * - Sảng văn loop: MC publish chương → 100K võ giả đọc → 10K lĩnh ngộ →
 *   beast tide đẩy lui → MC nhận khí vận toàn lục địa.
 *
 * Run dry: `npx tsx scripts/reset-van-dao-v2.ts`
 * Apply:   `npx tsx scripts/reset-van-dao-v2.ts --apply`
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

const PROJECT_ID = 'cf63c678-a0b5-4df2-ae1c-6cb20210f589';
const NOVEL_ID = '08c72bc6-982f-418e-b754-7f1fe0466112';

const VN_DATE = (() => {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 3600 * 1000);
  return vn.toISOString().slice(0, 10);
})();

const SEED = {
  title: 'Thiên Đạo Thư Viện: Ta Viết Tiểu Thuyết, Cả Dị Giới Đọc Lĩnh Ngộ Thần Thông',
  slug: 'thien-dao-thu-vien-ta-viet-tieu-thuyet-ca-di-gioi-doc-linh-ngo-than-thong',
  genre: 'huyen-huyen' as const,
  main_character: 'Lý Trọng Lâm',
  description:
    'Nhà văn web Việt 28 tuổi Lý Trọng Lâm đột tử vì tai nạn xe lúc vừa nhấn nút đăng chương cuối "Tiếu Ngạo Giang Hồ Tân Truyện" — mở mắt trong thân xác tú tài nghèo cùng tên tại đại lục Thiên Vũ. 50 năm trước "Thiên Mệnh Khe" nứt vỡ, hung thú từ Hư Cảnh tràn vào, mỗi mười năm một trận Thú Triều cuốn phăng cả thành trì. Võ giả đại lục bế tắc — công pháp cổ ngày càng ít người lĩnh ngộ, mới thì không ai sáng tác được. Trong đầu Trọng Lâm xuất hiện hệ thống "Thiên Đạo Thư Viện" — bất kỳ nội dung văn học, phim ảnh, manga, game Trái Đất hắn từng đọc trong kiếp trước đều có thể "tải lên" Thư Viện cosmic. Mọi võ giả đại lục cầm Ngọc Thư Sách đều đọc được, càng đắm chìm vào câu chuyện càng lĩnh ngộ công pháp / chiêu thức / thần thông cụ thể từ story. Từ Cửu Âm Chân Kinh, Hàng Long Thập Bát Chưởng đến Hỏa Độn Naruto, Avada Kedavra Harry Potter — Trọng Lâm dùng kho tàng văn học Trái Đất nâng cấp cả một thế hệ võ giả Thiên Vũ, đẩy lui Thú Triều, kéo cả đại lục từ bờ diệt vong lên thời thịnh thế Văn Đạo.',
  world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC từ một tú tài nghèo vô danh tại đại lục đang bên bờ diệt vong, mỗi chương sách hắn viết upload lên Thiên Đạo Thư Viện đều khiến hàng vạn võ giả lĩnh ngộ công pháp / chiêu thức mới, đẩy lui Thú Triều, biến cả lục địa từ tuyệt vọng thành tôn sùng hắn như Văn Đạo Tổ Sư.
- Protagonist Engine: Lý Trọng Lâm thắng bằng kho tàng văn học - phim ảnh - manga - game Trái Đất kiếp trước (Kim Dung wuxia, Tiên Hiệp Đường Gia Tam Thiếu, Naruto, One Piece, Tây Du Ký, Tam Quốc, Harry Potter, Lord of the Rings) — combine với khả năng "Tải lên Thiên Đạo Thư Viện" cho phép broadcast story đến mọi võ giả đại lục. Hắn là showrunner thay vì warrior — chiến trường của hắn là tâm trí độc giả + lĩnh ngộ tập thể.
- Pleasure Loop: Trọng Lâm publish 1 chương mới (vd: Độc Cô Cửu Kiếm phá kiếm thức) → upload lên Thiên Đạo Thư Viện → hàng vạn võ giả đọc qua Ngọc Thư Sách → 10-30% đắm chìm + lĩnh ngộ chiêu thức cụ thể → võ giả đó dùng chiêu mới diệt hung thú hoặc face-slap kẻ ác → tin tức truyền về Trọng Lâm + điểm Văn Khí đổ vào hắn → tu vi MC tăng + mở khóa thêm Earth source.
- System Mechanic: Thiên Đạo Thư Viện (Cosmic Library Upload). Input: nội dung văn học / phim ảnh / manga / game Trái Đất trong tâm trí MC + 1 điểm Văn Khí mỗi 1000 chữ upload. Output: chương được "khắc" lên Thư Viện cosmic, mọi võ giả đại lục cầm Ngọc Thư Sách (vật tu giả phổ thông từ Thiên Đạo) đều đọc được. Limit: ban đầu 1000 chữ/ngày, level up nâng lên; mỗi chương đăng tải tốn Văn Khí tương ứng độ phức tạp công pháp. Reward: mỗi reader đắm chìm lĩnh ngộ thành công tặng MC 1-10 điểm Văn Khí; nội dung gốc Earth literature tặng nhiều hơn nội dung MC tự bịa.
- Phase 1 Playground: Quận Thanh Phong dưới chân Long Vĩ Sơn, thư phòng tú tài Lý gia, đại sảnh Văn Học Viện huyện Đông Lâm, biên giới Tử Vong Sa Mạc cách quận 200 dặm — nơi Thú Triều đầu tiên Phase 1 sẽ xảy ra. Trọng Lâm vận hành Earth literature → Văn Khí → tu vi + thiên hạ ghi nhận.
- Social Reactor: Mẹ Lý Khang Nhi (người duy nhất tin Trọng Lâm sớm), thư đồng Trương Tiểu Nhị (đầu tiên lĩnh ngộ chiêu thức từ "Cửu Âm Chân Kinh sơ chương" của MC), cô gái kiếm khách trẻ Diệp Thiến Tâm (đầu tiên lĩnh ngộ Độc Cô Cửu Kiếm → trở thành phó tướng MC), lão sư phụ Văn Học Viện Tôn Bá Du (công nhận MC là Văn Thiên Tử), Đường Môn trưởng tử Đường Tiêu Bằng (lĩnh ngộ ám khí từ "Tiên Hiệp Đường Gia"), Hắc Thiên Vương vùng biên giới (đọc Tam Quốc → đại bại Hung Thú Lữ).
- Novelty Ladder: Ch.1-30 (Kim Dung wuxia — Tiếu Ngạo Giang Hồ, Cửu Âm Chân Kinh; reader lĩnh ngộ kiếm pháp + nội công sơ cấp). Ch.30-80 (Tiên Hiệp Đường Gia + Đấu La Đại Lục; reader lĩnh ngộ hồn lực + ám khí). Ch.80-150 (Naruto + Bleach; reader lĩnh ngộ chakra + Hỏa Độn + Lôi Thần). Ch.150-300 (One Piece + Harry Potter; reader lĩnh ngộ Haki + ma pháp). Ch.300+ (Tây Du Ký + Tam Quốc; cosmic-scale world expansion).
- Control Rules: Payoff đăng chương mỗi 2-3 chương truyện (một chiêu thức mới được lĩnh ngộ bởi reader, một beast tide bị đẩy lui); payoff xã hội mỗi arc 15-20 chương (toàn đại lục công nhận MC). Attention Gradient: quận Thanh Phong → huyện Đông Lâm → phủ Long Vũ → kinh đô Thiên Đô → toàn đại lục → cosmic.

### BỐI CẢNH
Đại lục Thiên Vũ rộng lớn, văn minh tu vi võ giả tồn tại 5000 năm, trước đây hệ Thiên Đạo (Đạo Trời) duy trì cân bằng giữa nhân loại và Hư Cảnh (Void Dimension). Vào năm 5050 Thiên Vũ Lịch (50 năm trước câu chuyện), "Thiên Mệnh Khe" — vết nứt giữa Thiên Vũ và Hư Cảnh — đột nhiên mở rộng do một trận Thiên Đạo dao động không rõ nguyên nhân. Hung thú (savage beast) từ Hư Cảnh tràn vào, mỗi 10 năm một trận "Thú Triều" (Beast Tide) lớn cuốn phá 10-30% thành trì.

Hệ thống tu vi võ giả: Phàm Cảnh → Sơ Cảnh → Trung Cảnh → Cao Cảnh → Hậu Thiên → Tiên Thiên → Tông Sư → Đại Tông Sư → Võ Thánh → Võ Đạo Tổ Sư. Trước Đại Biến, đại lục có 8 vị Võ Đạo Tổ Sư trấn 8 phương, 5000 vị Võ Thánh; hiện chỉ còn 1 vị Tổ Sư (Bắc Phương Bằng Hà Tổ Sư đang ẩn cư), 500 vị Võ Thánh. Lý do: công pháp cổ ngày càng ít người lĩnh ngộ thành công, mới thì không tác giả nào đủ tài sáng tác — Văn Đạo (cách viết công pháp thành sách cho người khác đọc lĩnh ngộ) gần như tuyệt diệt.

Cứ mỗi võ giả tu vi cao đều có một "Ngọc Thư Sách" — vật phẩm cosmic do Thiên Đạo ban tặng từ lúc bước vào Sơ Cảnh, cho phép kết nối với Thiên Đạo Thư Viện đọc các sách công pháp đã được Thiên Đạo công nhận. Trước Đại Biến, Thư Viện có 10000+ tác phẩm; hiện chỉ còn 800 tác phẩm cũ, đa số đã lỗi thời, không thiết kế cho cuộc chiến hung thú hiện đại. Đó là lý do võ giả ngày càng yếu — không có công pháp mới.

Quận Thanh Phong nằm dưới chân Long Vĩ Sơn, cách kinh đô Thiên Đô 3000 dặm về phía Tây, dân số 5 vạn người, có 1 Văn Học Viện cấp huyện đào tạo tú tài. Cách 200 dặm phía Bắc là Tử Vong Sa Mạc — biên giới Hư Cảnh, nơi Thú Triều đầu tiên Phase 1 sẽ tràn xuống ch.85.

### NHÂN VẬT CHÍNH
- Tên: Lý Trọng Lâm
- Tuổi: 22 tuổi (kiếp trước 28 tuổi, nhà văn web Việt Nam, đã viết 8 bộ tiểu thuyết kiếm hiệp + tiên hiệp + ngôn tình online, chết do tai nạn xe trên đường về quê đón Tết lúc vừa publish chương cuối "Tiếu Ngạo Giang Hồ Tân Truyện")
- Nghề/Trạng thái: Tú tài nghèo Lý gia tại quận Thanh Phong, đang chuẩn bị thi Cử nhân Văn Học Viện. Thân xác cũ Lý Trọng Lâm vừa chết vì ốm sốt nặng, ý thức nhà văn VN nhập vào.
- Tài sản hiện tại: Một thư phòng nhỏ 9m² trong nhà mẹ goá, một xấp giấy Tuyên Thành cũ, mực bút Văn Phòng Tứ Bảo cấp Hạ, một thẻ tú tài huyện Đông Lâm. Ngọc Thư Sách (mọi võ giả Sơ Cảnh trở lên đều có) Trọng Lâm chưa có vì còn là Phàm Cảnh.
- Tính cách: Trầm tĩnh + thông minh + nhà văn chuyên nghiệp (kiếp trước 8 năm viết online — biết nhịp chương, biết showmanship, biết cách design chiêu thức gắn vào nhân vật cho reader đắm chìm), bảo vệ mẹ và thư đồng tuyệt đối, không tin người ngoài dễ dàng. Hành động bằng kế hoạch dài hạn — release content theo lịch để max-payoff.
- Điểm yếu: Thân thể Phàm Cảnh không thể chiến đấu trực tiếp với hung thú; phải dựa hoàn toàn vào đệ tử + reader lĩnh ngộ. Mỗi lần upload tốn Văn Khí — nếu cạn → 24 giờ recharge.

### GOLDEN FINGER
- Tên hệ thống: Thiên Đạo Thư Viện (Cosmic Wen Dao Library).
- Cơ chế hoạt động: Trong tâm trí Trọng Lâm có giao diện UI hiện ra như app điện thoại — danh sách "Earth Source Available" (tất cả nội dung văn học / phim ảnh / manga / game hắn từng đọc kiếp trước, có metadata: thể loại, độ dài, công pháp / chiêu thức / thần thông có thể được lĩnh ngộ). Khi MC viết / nhớ / "đắm chìm" vào 1 cảnh từ Earth source, app tự convert thành định dạng chữ tu vi đại lục Thiên Vũ → upload lên Thiên Đạo Thư Viện cosmic. Mỗi võ giả Sơ Cảnh trở lên đọc qua Ngọc Thư Sách, càng đắm chìm vào câu chuyện càng lĩnh ngộ công pháp/chiêu thức cụ thể đã được Thiên Đạo "khắc" vào.
- Trigger kích hoạt: MC khởi đầu lượng Văn Khí 100 điểm (đủ upload 1000 chữ). Mỗi reader lĩnh ngộ thành công tặng 1-10 điểm Văn Khí (tùy độ phức tạp công pháp). Mỗi 100 điểm Văn Khí cho phép upload thêm 1000 chữ + level up tu vi MC theo bậc Văn Sĩ → Văn Sỹ Cao → Văn Hào → Văn Thánh → Đại Văn Hào → Văn Đạo Tông Sư → Văn Đạo Tổ Sư.
- Đường tăng trưởng cấp Văn Đạo:
  • L1 Văn Sĩ (ch.1-30): upload 1000 chữ/ngày, reader lĩnh ngộ Sơ-Trung Cảnh
  • L2 Văn Sỹ Cao (ch.30-80): 5000 chữ/ngày, reader Cao Cảnh - Hậu Thiên
  • L3 Văn Hào (ch.80-150): 1 vạn chữ/ngày + design chiêu thức cụ thể, reader Tiên Thiên - Tông Sư
  • L4 Văn Thánh (ch.150-300): tạo Văn Bảo từ story (Khúc Trúc Khí Tiêu Phong, gậy phép Harry, kunai Naruto)
  • L5 Đại Văn Hào (ch.300-500): write entire universe (Tây Du Ký world phụ), các Đại Năng nhập vào tu hành
  • L6 Văn Đạo Tông Sư (ch.500-750): MC nhập vào story → trở thành character nguyên cấp (Tôn Ngộ Không / Kiều Phong / Lý Tiêu Lý)
  • L7 Văn Đạo Tổ Sư (ch.750-1000): MC hợp nhất Thiên Đạo, trở thành Văn Đạo phần Thiên Đạo cosmic
- Điểm yếu: Mỗi level up cần MC giúp ≥1 reader lĩnh ngộ thành công công pháp cấp đó. Nếu MC giấu Earth source (ích kỷ) → khoá cấp. Mỗi chương upload nhưng không reader nào lĩnh ngộ → mất hết Văn Khí của chương đó + 1 day cooldown.
- Bí mật MC: Thiên Đạo Thư Viện thực ra là một mảnh nhỏ của "Văn Đạo phần Thiên Đạo" cosmic — Trọng Lâm là sứ giả thử nghiệm "Văn Đạo phục hưng" sau Đại Biến. 50 năm trước Thiên Đạo dao động chính là do "Văn Đạo phần" suy yếu cần người tiếp nối. Tiết lộ trong Phase 4.

### CAST CHÍNH
- Lý Khang Nhi — mẹ MC (40t), goá phụ nuôi MC ăn học, là người DUY NHẤT trong nhà tin Trọng Lâm sau khi hắn tỉnh dậy — Cảm xúc trung tâm — Sẽ là Văn Phu Nhân khi MC lên ngôi Văn Hào.
- Trương Tiểu Nhị — thư đồng (17t), gốc mồ côi MC nhận về, là người ĐẦU TIÊN lĩnh ngộ "Cửu Âm Chân Kinh sơ chương" của MC ch.5 — Cánh tay phải — Sau này trở thành Tông Sư đầu tiên thuộc Văn Đạo Tông MC sáng lập.
- Diệp Thiến Tâm — cô gái kiếm khách trẻ (19t), gốc Diệp gia, là người đầu tiên lĩnh ngộ Độc Cô Cửu Kiếm (Tiếu Ngạo Giang Hồ chương 20 của MC) — Phó tướng quân sự + love interest chính — Sau này trở thành Võ Thánh Kiếm Đạo.
- Tôn Bá Du — lão sư phụ Văn Học Viện huyện Đông Lâm (60t), từng là Văn Hào cấp 3 trước Đại Biến, hiện chỉ còn Văn Sĩ cao do mất Văn Khí — Người chứng nhận MC là Văn Thiên Tử cho cả Văn Học Viện ch.20 — Đồng minh chính trị địa phương.
- Đường Tiêu Bằng — trưởng tử Đường Môn (Hậu Thiên cao thủ 25t), gốc Đường gia chuyên ám khí — Đối tác chiến lược + đệ tử Văn Đạo — Lĩnh ngộ "Tiên Hiệp Đường Gia Tam Thiếu" của MC ch.50 → Đường Môn trở thành lực lượng ám khí hàng đầu chống Thú Triều.
- Hắc Thiên Vương Tống Vũ — tướng quân vùng biên Tử Vong Sa Mạc (Tiên Thiên cao thủ 40t), dũng mãnh nhưng thiếu mưu kế — Đối tác quân sự Phase 1-2 — Lĩnh ngộ "Tam Quốc Diễn Nghĩa - 36 kế Chu Du" của MC ch.80 → đại bại Hung Thú Lữ trong trận Thú Triều ch.85.

### ANTAGONISTS
- Văn Sĩ giả Triệu Ngạo Văn — tại huyện Đông Lâm, đã từng ăn cắp 1 đoạn "Cửu Âm" của MC đăng tên mình lên Thư Viện — Đối thủ Văn Đạo Phase 1 — Bị MC phơi bày bằng cách đăng chương kế tiếp gắn tên thật của hắn (ch.40 face-slap lớn).
- Hung Thú Tôn Chủ (Tiên Thiên hạ cấp hung thú) — chỉ huy quân đoàn hung thú vùng biên giới — Đối thủ quân sự Phase 1 — Bị Hắc Thiên Vương + đệ tử MC dùng "36 kế Chu Du" đại bại ch.85.
- Hắc Văn Hội — tổ chức tác giả viết "ác văn" (dark literature) khiến reader đắm chìm vào bóng tối + suy thoái tu vi — Đối thủ Văn Đạo Phase 2 (ch.100-250) — Bị MC dùng Earth source "Lord of the Rings" + "Harry Potter" (light vs dark eternal conflict) bóc trần.
- Văn Đạo cũ Thiên Đạo "Tịch Mặc Thiên Tôn" — entity cosmic hỗ trợ Văn Đạo trước Đại Biến, hiện suy yếu + bất đồng với MC về roadmap phục hưng — Đối thủ Phase 3-4 (ch.400+) — Phase 4 climax MC thay thế trở thành Văn Đạo phần Thiên Đạo mới.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Quận Thanh Phong + huyện Đông Lâm + biên Tử Vong Sa Mạc: Goal — MC upload 1000-5000 chữ/ngày (Tiếu Ngạo Giang Hồ + Cửu Âm Chân Kinh), 100K võ giả đại lục đọc, 10K lĩnh ngộ, đại bại Hung Thú Tôn Chủ trong trận Thú Triều ch.85. Milestone — Toàn đại lục công nhận MC là Văn Thiên Tử (ch.95). Stakes — Nếu Phase 1 fail Thú Triều → quận Thanh Phong bị xóa sổ, mẹ MC chết.
- PHASE 2 (Ch.100-300) — Phủ Long Vũ + kinh đô Thiên Đô + đại tỷ Văn Đạo phục hưng: Goal — MC upload Naruto + One Piece + Đấu La Đại Lục + Harry Potter, mở 10 đại Văn Phái khắp đại lục (Hỏa Độn phái, Haki phái, Hồn Lực phái, Ma Pháp phái), face-slap Hắc Văn Hội. Milestone — MC lên ngôi Văn Hào chính thức + sáng lập Văn Đạo Tông ch.250. Stakes — Hắc Văn Hội đầu độc reader đại lục, có thể suy thoái cả thế hệ.
- PHASE 3 (Ch.300-600) — Cosmic-scale Văn Đạo expansion: Goal — MC upload Tây Du Ký + Lord of the Rings (full universe), tạo các thế giới phụ song song nơi võ giả nhập vào tu hành thực tế. Milestone — MC lên ngôi Văn Thánh + thống nhất 10 Văn Phái thành Văn Đạo Liên Minh ch.450. Stakes — Văn Đạo cũ Tịch Mặc Thiên Tôn bắt đầu ngăn cản MC.
- PHASE 4 (Ch.600-1000) — Cosmic ascension + thay thế Văn Đạo Thiên Đạo: Goal — MC hợp nhất với Thiên Đạo Thư Viện, trở thành Văn Đạo phần Thiên Đạo cosmic mới. Endgame: MC có thể quay về Việt Nam kiếp trước cứu vợ chưa cưới, hoặc ở lại Thiên Vũ làm Văn Đạo Tổ Sư cho cả vũ trụ. Milestone — Thiên Đạo Thư Viện tỏa sáng cả vũ trụ ch.900. Stakes — Tịch Mặc Thiên Tôn trying to absorb MC.

### OPENING SCENE
- Location: Thư phòng nhỏ 9m² trong căn nhà gỗ cũ Lý gia tại quận Thanh Phong, 5 giờ sáng đầu đông năm 5100 Thiên Vũ Lịch (50 năm sau Đại Biến), gió rít qua khe cửa, ngọn nến sáp ong leo lét.
- MC hành động: Lý Trọng Lâm bừng tỉnh trong thân xác lạnh ngắt, đầu óc đột nhiên ngồn ngộn ký ức kiếp trước Việt Nam — 28 năm làm nhà văn web, 8 bộ tiểu thuyết online, thư viện ký ức đầy ắp Kim Dung, Cổ Long, Đường Gia Tam Thiếu, Naruto, One Piece, Harry Potter, Lord of the Rings, Tam Quốc, Tây Du Ký, Đấu La Đại Lục, Bleach, Hokage, Avengers... Cùng lúc đó, trong tâm trí MC bật lên giao diện UI ánh xanh: "Thiên Đạo Thư Viện - Tải Lên Văn Đạo. Văn Khí khởi đầu: 100 điểm. Earth Source Available: 8,742 tác phẩm. Sẵn sàng upload?"
- Hook event: Bên ngoài thư phòng, mẹ MC Lý Khang Nhi đang khóc thầm — tiền hốt thuốc cho con trai cuối cùng đã hết, lương cuối tháng cho thư đồng Trương Tiểu Nhị cũng không có. Trọng Lâm lặng lẽ mở giao diện, chọn "Tiếu Ngạo Giang Hồ - Chương 1: Diệt Môn", tải lên 1000 chữ đầu. Trong cùng khoảnh khắc đó, cách quận Thanh Phong 500 dặm tại Văn Học Viện kinh đô Thiên Đô, một tú tài cao cấp đang cầm Ngọc Thư Sách đọc — bỗng cảm thấy luồng văn khí ấm áp tràn về, lĩnh ngộ một chiêu kiếm chưa từng thấy. Báo cáo lên triều đình ngay sáng đó: "Một tác giả mới xuất hiện trên Thư Viện - cấp Văn Sĩ, nội dung mới hoàn toàn".
- Câu mở đầu: "Ở đại lục Thiên Vũ này, hung thú có thể ăn thịt người, nhưng một chương sách hay có thể nuôi sống cả thế hệ võ giả — và trong đầu ta có cả thư viện Trái Đất 5000 năm văn minh."

### WORLD RULES
- Thiên Đạo Thư Viện là bí mật của MC — không ai biết hắn upload Earth literature, chỉ thấy "một Văn Sĩ mới xuất hiện trên Thư Viện cosmic với content chưa từng thấy".
- Ngọc Thư Sách là vật cosmic mọi võ giả Sơ Cảnh trở lên có. Đọc cần đắm chìm — càng tập trung, càng lĩnh ngộ; đọc qua loa thì chỉ giải trí.
- Hệ tu vi võ giả 10 cấp đã định nghĩa rõ — MC từ Phàm Cảnh, mất ~30 chương đầu mới đạt Sơ Cảnh (lĩnh ngộ chiêu thức từ chính content của mình).
- Thú Triều (Beast Tide) là mối đe dọa toàn lục địa — mỗi 10 năm một trận lớn, hiện đại 8 lần đã diệt 50% thành trì. Chu kỳ tiếp theo dự kiến trong ch.85 (Phase 1 climax) tại Tử Vong Sa Mạc.
- Earth source MC tận dụng có 4 nhóm: (1) Wuxia/Tiên Hiệp Trung — Kim Dung, Cổ Long, Đường Gia, Đấu La; (2) Manga/Anime Nhật — Naruto, One Piece, Bleach, Dragon Ball; (3) Western Fantasy — Harry Potter, Lord of the Rings, Game of Thrones; (4) Cổ Trung Hoa — Tam Quốc, Tây Du Ký, Hồng Lâu Mộng, Thủy Hử. Mỗi nhóm thiết kế cho 1 "Văn Phái" tu vi khác nhau.

### TONE & ANTI-PATTERNS
- TONE: Showman tự tin 40% + ấm áp gia đình + đệ tử 30% + face-slap địch máu lạnh 20% + cosmic philosophy 10%. Pacing nhanh — mỗi 2-3 chương có 1 dopamine peak (reader lĩnh ngộ + face-slap). Tham khảo nhịp 《诸天大文豪》 + 《儒道至圣》.
- NEGATIVE SPACE:
  • KHÔNG là "viết sách trong tiệm cho người mua đọc" như Văn Đạo cũ — đây là COSMIC BROADCAST scale.
  • KHÔNG có Thanh Vân Thư Quán style — content phải reach 100K+ độc giả mỗi chương.
  • KHÔNG hậu cung sa đà — chỉ Diệp Thiến Tâm (kiếm khách) + 1-2 nữ phụ khác.
  • KHÔNG ngược MC — Trọng Lâm là showman, tự tin, biết max-payoff. Không tự ti.
  • KHÔNG dùng Earth source 1 cách thô lỗ "copy paste" — MC adapt vào setting Thiên Vũ (đổi tên nhân vật, thêm chi tiết phù hợp đại lục).
  • KHÔNG combat MC trực tiếp Phase 1 — MC dựa vào đệ tử lĩnh ngộ + đại quân võ giả.
  • KHÔNG tu tiên kiểu cũ (ngồi thiền 100 chương) — Trọng Lâm "đột phá" bằng cách upload chương mới hấp dẫn hơn → nhiều reader lĩnh ngộ hơn → Văn Khí đổ về.
`,
  total_planned_chapters: 1000,
};

async function resetChildTables(novelId: string, projectId: string) {
  const tables = [
    { table: 'chapters', col: 'novel_id', val: novelId },
    { table: 'chapter_summaries', col: 'project_id', val: projectId },
    { table: 'character_states', col: 'project_id', val: projectId },
    { table: 'arc_plans', col: 'project_id', val: projectId },
    { table: 'story_memory_chunks', col: 'project_id', val: projectId },
    { table: 'plot_threads', col: 'project_id', val: projectId },
    { table: 'world_rules_index', col: 'project_id', val: projectId },
    { table: 'beat_usage', col: 'project_id', val: projectId },
    { table: 'character_arcs', col: 'project_id', val: projectId },
    { table: 'voice_fingerprints', col: 'project_id', val: projectId },
    { table: 'mc_power_states', col: 'project_id', val: projectId },
    { table: 'world_locations', col: 'project_id', val: projectId },
    { table: 'location_bibles', col: 'project_id', val: projectId },
    { table: 'project_daily_quotas', col: 'project_id', val: projectId },
    { table: 'story_synopsis', col: 'project_id', val: projectId },
    { table: 'cost_tracking', col: 'project_id', val: projectId },
  ];
  for (const t of tables) {
    await s.from(t.table).delete().eq(t.col, t.val);
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Reset Văn Đạo → V2 (Thiên Đạo Thư Viện)  ${apply ? '[APPLY]' : '[DRY RUN]'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Novel:   ${NOVEL_ID}`);
  console.log(`New title: ${SEED.title}`);
  console.log(`New slug:  ${SEED.slug}`);
  console.log(`Genre:     ${SEED.genre}`);
  console.log(`MC:        ${SEED.main_character}`);
  console.log(`Desc len:  ${SEED.description.length} chars`);
  console.log(`World len: ${SEED.world_description.length} chars`);

  if (!apply) {
    console.log('\nDRY RUN. Pass --apply to execute.\n');
    return;
  }

  console.log('\n[1/3] Clearing child tables...');
  await resetChildTables(NOVEL_ID, PROJECT_ID);

  console.log('[2/3] Updating novels row...');
  const { error: nerr } = await s.from('novels').update({
    title: SEED.title,
    slug: SEED.slug,
    description: SEED.description,
    genres: [SEED.genre],
    status: 'Đang ra',
    chapter_count: 0,
    total_chapters: 1000,
  }).eq('id', NOVEL_ID);
  if (nerr) throw new Error(`novels update: ${nerr.message}`);

  console.log('[3/3] Updating ai_story_projects row...');
  const { error: perr } = await s.from('ai_story_projects').update({
    genre: SEED.genre,
    main_character: SEED.main_character,
    world_description: SEED.world_description,
    total_planned_chapters: SEED.total_planned_chapters,
    current_chapter: 0,
    status: 'active',
    pause_reason: null,
    paused_at: null,
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    setup_stage_error: null,
    story_outline: null,
    master_outline: null,
    story_bible: null,
    temperature: 1.0,
    target_chapter_length: 2800,
    ai_model: 'gemini-3.1-flash-lite',
    style_directives: {
      disable_chapter_split: true,
      production_enabled: true,
      production_daily_chapter_quota: 50,
      require_full_chapter_blueprint: false,
      van_dao_cosmic_broadcast: true,
      architect_concept_hint:
        'Sảng văn TRUE: MC nhà văn upload Earth literature (Kim Dung, Naruto, Harry Potter, Tây Du, etc.) lên Thiên Đạo Thư Viện cosmic, mọi võ giả đại lục đọc qua Ngọc Thư Sách, đắm chìm vào câu chuyện càng lĩnh ngộ công pháp/chiêu thức cụ thể. Mỗi reader lĩnh ngộ → MC nhận Văn Khí → tu vi tăng + unlock more Earth source. Dopamine loop: publish chương → 100K reader → 10K lĩnh ngộ → beast tide đẩy lui → MC nhận khí vận toàn lục địa. KHÔNG phải "viết sách trong tiệm" — đây là COSMIC SCALE broadcast.',
    },
    updated_at: new Date().toISOString(),
  }).eq('id', PROJECT_ID);
  if (perr) throw new Error(`project update: ${perr.message}`);

  console.log('\n[4/4] Seeding daily quota...');
  await s.from('project_daily_quotas').insert({
    project_id: PROJECT_ID,
    vn_date: VN_DATE,
    target_chapters: 50,
    written_chapters: 0,
    status: 'active',
  });

  console.log(`\n✓ Reset complete. Project ${PROJECT_ID} now at setup_stage='idea' với concept V2.`);
  console.log('Cron tick kế sẽ chạy idea → world → ... → writing.');
  console.log('Admin: /admin/production-toggle');
}

main().catch((e) => { console.error(e); process.exit(1); });
