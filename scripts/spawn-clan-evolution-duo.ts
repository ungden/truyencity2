/**
 * Spawn 2 novels theo công thức:
 *
 * 1) Gia Tộc Tu Tiên (家族流): MC xuyên qua thành tộc trưởng trẻ của tiểu
 *    gia tộc tu tiên suy tàn, có golden finger "Khí Vận Anh Hùng Bảng"
 *    nhìn thấu tiềm năng tài năng + tu vi max + sở trường của bất kỳ ai —
 *    bồi dưỡng đúng người, kéo gia tộc từ tiểu phẩm nhỏ → đại tông môn
 *    → tiên giới đại tộc. Reference: 《家族修仙：从灵植夫开始》《天生仙种》.
 *
 * 2) Ngự Thú Tiến Hóa Sư (御兽进化师): theo trope《全球御兽：我能看见进化路线》.
 *    Thế giới ngự thú phổ cập, MC nhìn thấu "lộ tuyến tiến hóa ẩn" của
 *    mọi thú — biến thú F-cấp tầm thường thành đế cấp qua tuyến rare,
 *    đối đầu yêu thú trào, lên top học viện, tham gia đại hội Châu Lục.
 *
 * Cron pickup tự động via `production_enabled=true`.
 *
 * Run dry: `npx tsx scripts/spawn-clan-evolution-duo.ts`
 * Apply:   `npx tsx scripts/spawn-clan-evolution-duo.ts --apply`
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

const SEEDS = [
  // ── 1. GIA TỘC TU TIÊN ──────────────────────────────────────────────
  {
    title: 'Gia Tộc Tu Tiên: Ta Có Bảng Nhìn Thấu Tiềm Năng Con Cháu',
    slug: 'gia-toc-tu-tien-ta-co-bang-nhin-thau-tiem-nang-con-chau',
    genre: 'tien-hiep' as const,
    main_character: 'Lý Trác Phong',
    description:
      'Giám đốc nhân sự Việt 32 tuổi Lý Trác Phong đột tử vì đột quỵ lúc đang phỏng vấn ứng viên — tỉnh dậy thân phận Lý Trác Phong 22 tuổi, tộc trưởng đời thứ tư của Lý gia tại Thanh Vân Thành, đại lục Đông Hoa. Lý gia ba mươi tu sĩ, ruộng linh ba mẫu cằn cỗi, ba đời tộc trưởng cũ qua đời sớm, sắp bị Triệu gia thôn tính. Trong mắt Trác Phong xuất hiện "Khí Vận Anh Hùng Bảng" — nhìn bất kỳ ai sẽ thấy bảng UI: Tài năng (S/A/B/C/D), Tu vi tối đa, Khí vận điểm, Sở trường (kiếm / đan / trận / ngự thú / phù lục / luyện khí). Mười sáu năm làm HR Việt rèn cho Phong kỹ năng nhận diện người tài tuyệt đỉnh — kết hợp với bảng giúp chọn đúng đệ tử, định đúng lộ tuyến tu luyện cho từng người, sai đúng phận sự cho từng nhánh gia tộc. Ba mươi người Lý gia ban đầu tầm thường, mười năm sau hai vị Trúc Cơ, hai mươi năm sau một vị Kim Đan, năm mươi năm sau cả tông môn ngàn người, một trăm năm sau đại tộc cosmic tiên giới.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC giám đốc nhân sự kiếp trước, xuyên thành tộc trưởng tiểu gia tộc tu tiên đang suy tàn, mỗi chương đều dùng bảng nhìn thấu tiềm năng đệ tử để chọn lọc + bồi dưỡng đúng người, biến ba mươi tu sĩ tầm thường thành đại tông môn ngàn đệ tử + cuối cùng đại tộc cosmic tiên giới.
- Protagonist Engine: Lý Trác Phong thắng bằng kỹ năng HR mười sáu năm kiếp trước (đánh giá ứng viên + design career path + xây dựng team) cộng với Khí Vận Anh Hùng Bảng (xem stat tài năng + tu vi max + sở trường mọi đệ tử). Anh không phải tu vi cao nhất gia tộc — anh là kiến trúc sư hệ thống biến mỗi đệ tử thành mảnh ghép tối ưu.
- Pleasure Loop: Phong nhìn 1 đệ tử mới → bảng hiện stat (vd: Tài năng S, Tu vi max Đại Thừa, Sở trường Kiếm + Đan kép) → chọn lộ tuyến tu luyện chuyên biệt cho người đó (vd: gửi học kiếm phái phụ + lấy đan tài làm side career) → mười năm sau đệ tử đó Trúc Cơ thành công → cả gia tộc nhận khí vận từ đệ tử nổi danh → Phong ranks up bảng.
- System Mechanic: Khí Vận Anh Hùng Bảng. Input: ánh mắt MC nhìn thẳng đối tượng + 1 điểm Tu Vi Khí. Output: bảng UI hiện 5 chỉ số trong tâm trí MC — Tài năng (S/A/B/C/D), Tu vi tối đa đạt được, Điểm khí vận hiện tại, Sở trường chính + phụ, Khuyết điểm fatal. Limit: ban đầu nhìn 10 người/ngày, level up + 5 người. Reward: mỗi đệ tử Phong bồi dưỡng thành công lên 1 cảnh giới mới tặng MC 10-100 điểm Khí Vận.
- Phase 1 Playground: Thanh Vân Thành, Lý gia trang viên (3 mẫu ruộng linh + 1 căn nhà gỗ chính + 5 thư phòng nhỏ), núi Thanh Phong cạnh trang viên (hang động + sông tu luyện), chợ Đan Dược Thanh Vân Thành. Phong nhìn đệ tử → định lộ tuyến → bồi dưỡng → đệ tử mạnh → gia tộc thịnh.
- Social Reactor: Lý Trác Lan (em gái MC, Tài năng S Đan dược), Lý Trí Dương (em họ thẳng tay nhưng Tài năng A Kiếm), bà nội Lý Tử Tế (Tu vi Trúc Cơ cao đỉnh, người đỡ Phong khi nhận chức), lão Hộ Pháp Trần Đại Hổ (cùng kết nghĩa anh em với cụ tổ MC), Diệp Sương Nhi (tiểu thư Diệp gia kế hôn — Tài năng S Trận pháp), Trương Bách Quân (đại đệ tử ngoại tộc nhập Lý gia chương 30).
- Novelty Ladder: Ch.1-30 (Nhận biết đệ tử + định lộ tuyến + bồi dưỡng cấp Phàm → Sơ Cảnh). Ch.30-80 (3 đệ tử lên Trúc Cơ + Lý gia trở thành tiểu môn phái). Ch.80-150 (Đoạt linh mạch + xây sơn môn riêng). Ch.150-300 (Liên minh 5 gia tộc + thi Tinh Anh tông môn). Ch.300+ (Đại tộc → Tiên giới đại tộc cosmic).
- Control Rules: Payoff cá nhân mỗi 2-3 chương (1 đệ tử cải thiện, 1 ứng dụng bảng); payoff tập thể mỗi arc 15-20 chương (Lý gia thăng cấp hoặc đối thủ bị đánh bại). Attention Gradient: trong gia tộc → Thanh Vân Thành → quận Thanh Phong → châu Đông Hoa → cosmic tiên giới.

### BỐI CẢNH
Đại lục Đông Hoa — văn minh tu tiên đỉnh cao 10.000 năm, hệ tu vi tiên đạo cổ điển: Luyện Khí (Tầng 1-9) → Trúc Cơ (Sơ - Trung - Hậu - Đại Viên) → Kim Đan (Sơ - Trung - Hậu - Đại Viên) → Nguyên Anh → Hoá Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp → Tiên Giới phi thăng. Toàn châu có 8 đại đỉnh phái (Thiên Linh Tông, Vạn Pháp Tông, Tử Vận Tông...), hàng nghìn tiểu môn phái + gia tộc trung lưu.

Mỗi tiểu gia tộc cần 1 vị Kim Đan trở lên để duy trì độc lập; dưới Trúc Cơ thì phải phụ thuộc đại tông môn. Linh mạch (đất có khí tu luyện), linh điền (ruộng trồng linh thảo), linh thạch (đơn vị tiền tệ + nhiên liệu trận pháp) là 3 tài sản chính. Một nhánh linh mạch cấp ba đủ nuôi gia tộc 30 người tu luyện liền 100 năm.

Thanh Vân Thành là thành phố cấp Quận thuộc châu Đông Hoa, 50 vạn dân + 5000 tu sĩ, có 4 tiểu gia tộc đỉnh điểm (Lý, Triệu, Vương, Tống) + 12 tiểu gia tộc trung. Lý gia ở phía Tây thành, chỉ còn 30 tu sĩ (chủ yếu Luyện Khí + 5 vị Trúc Cơ trung niên), tài sản: 1 ruộng linh 3 mẫu hạng C + 1 hang động nhỏ Long Vĩ Sơn cấp Hạ. Triệu gia phía Đông (đỉnh điểm thành phố, có 1 Kim Đan + 20 Trúc Cơ) đang muốn nuốt Lý gia trong 5 năm tới.

### NHÂN VẬT CHÍNH
- Tên: Lý Trác Phong
- Tuổi: 22 tuổi (kiếp trước 32 tuổi, Giám đốc nhân sự FPT Việt Nam, làm việc 10 năm chuyên đánh giá ứng viên cấp cao + thiết kế career path cho 500+ nhân viên, đột quỵ chết lúc đang phỏng vấn)
- Nghề/Trạng thái: Tộc trưởng đời thứ tư của Lý gia tại Thanh Vân Thành. Tu vi: Luyện Khí Tầng 3 (yếu nhất trong các tộc trưởng cùng cấp). Vừa nhận chức 6 tháng trước, chưa quen công việc.
- Tài sản hiện tại: Một ngọc bài tộc trưởng, một thanh kiếm sắt cấp Hạ Phẩm, 500 linh thạch tiết kiệm cá nhân, một cuốn công pháp Hỏa Long Quyết cấp Hoàng (do tộc tự sáng tác, kém). Gia tộc tài sản: 30 tu sĩ + 3 mẫu ruộng linh + hang động Long Vĩ Sơn.
- Tính cách: Trầm tĩnh + lý trí cực độ (combo 16 năm HR rèn ra + tính cách tu sĩ trẻ), bảo vệ gia tộc kịch liệt, biết cách dùng người. Hành động bằng kế hoạch dài hạn — chọn từng cây con trong 30 đệ tử, design career path 50 năm.
- Điểm yếu: Tu vi Phong cá nhân thấp (chỉ Luyện Khí 3); không thể chiến đấu trực tiếp với đối thủ Trúc Cơ trở lên trong 50 chương đầu. Phải dựa hoàn toàn vào đệ tử + bảng + chiến lược dài hạn.

### GOLDEN FINGER
- Tên hệ thống: Khí Vận Anh Hùng Bảng (Cosmic HR Talent Board).
- Cơ chế hoạt động: Khi Phong nhìn thẳng vào bất kỳ ai (người, tu sĩ, đệ tử, đối thủ) trong tầm 30 mét, trong tâm trí xuất hiện UI bảng thông tin 5 trường:
  • Tài năng tu luyện: S (xuất sắc, 1/vạn người) / A (cao, 1/1000) / B (khá, 1/100) / C (bình thường, 1/10) / D (kém)
  • Tu vi tối đa có thể đạt: Sơ Cảnh / Trung Cảnh / Trúc Cơ / Kim Đan / Nguyên Anh / Hoá Thần / Luyện Hư / Hợp Thể / Đại Thừa / Tiên giới
  • Khí vận điểm hiện tại: 0-1000 (ảnh hưởng cơ hội đột phá)
  • Sở trường chính + sở trường phụ: Kiếm / Đan / Trận / Phù / Ngự thú / Luyện khí / Thân pháp / Trị thương / Mệnh lý
  • Khuyết điểm fatal: vd "Tính tình nóng — không hợp Đan đạo", "Tâm tà — sẽ phản tộc trong 10 năm"
- Trigger kích hoạt: Mỗi cái nhìn tốn 1 điểm Tu Vi Khí (MC khởi đầu 100, hồi 10/ngày). Phase 1 nhìn 10 người/ngày, level up + 5 người.
- Đường tăng trưởng cấp Khí Vận:
  • L1 (ch.1-30): Nhìn 1 người, bảng hiện 5 trường cơ bản
  • L2 (ch.30-80): Nhìn cả gia tộc 30 người 1 lượt
  • L3 (ch.80-150): Thấy cả lộ trình tu luyện 100 năm tới của 1 người
  • L4 (ch.150-300): Thấy "tương khắc tu luyện" giữa 2 người (hôn nhân + sư đồ matching)
  • L5 (ch.300-500): Predict đại sự đệ tử (chết / phản / lên thần)
  • L6 (ch.500-750): Nhìn cả tông môn 10000 đệ tử trong 1 ngày
  • L7 (ch.750-1000): Cosmic — thấy "Khí Vận" toàn châu, biết Tiên Giới tướng quân ẩn cư
- Điểm yếu: Bảng chỉ cho biết tiềm năng — KHÔNG đảm bảo đệ tử sẽ đạt. MC phải design path + ép họ luyện. Nhìn nhiều cùng lúc tốn nhiều Tu Vi Khí; cạn → 24h recharge.

### CAST CHÍNH
- Lý Tử Tế — bà nội MC (62t, Trúc Cơ Đại Viên), Tài năng A Đan + Trận, đang lo Lý gia mất dòng dõi — Đồng minh cốt lõi + cố vấn — Hỗ trợ Phong từ chương 1 khi bà thấy thằng cháu đột nhiên tỉnh táo.
- Lý Trác Lan — em gái MC (18t, Luyện Khí 5), Tài năng S Đan dược (Sở trường chính), Tu vi max Hoá Thần — Đệ tử số 1 — Phong gửi học Đan Dược Hội Thanh Vân Thành, 30 chương sau lên Trúc Cơ thành công.
- Lý Trí Dương — em họ MC (20t, Luyện Khí 7), Tài năng A Kiếm (Sở trường chính), Tu vi max Đại Thừa — Cánh tay phải võ lực — Phong gửi học kiếm phái Vô Ảnh, 40 chương sau Trúc Cơ.
- Diệp Sương Nhi — tiểu thư Diệp gia (19t, Luyện Khí 6), Tài năng S Trận pháp, Tu vi max Hợp Thể — Vợ tương lai của Phong (kế hôn từ chương 25) — Cùng Phong design tu luyện cho Lý gia + Diệp gia liên minh.
- Trần Đại Hổ — lão Hộ Pháp Lý gia (75t, Trúc Cơ Hậu Cao đỉnh), từng kết nghĩa anh em với cụ tổ Phong — Lực lượng quân sự chính + người bảo vệ MC — Sẵn sàng hy sinh vì Lý gia.
- Trương Bách Quân — đệ tử ngoại tộc Phong nhận từ chương 30 (16t lúc nhập, mồ côi, Luyện Khí 1), Tài năng S Toàn diện (mọi sở trường A trở lên) — Đại đệ tử của MC — Sau này sẽ là tộc trưởng đời tiếp theo của Lý gia.

### ANTAGONISTS
- Triệu Bá Tuyết — tộc trưởng Triệu gia (45t, Kim Đan Sơ), tham vọng nuốt Lý gia trong 5 năm — Đối thủ chính Phase 1 — Bị Phong dùng bảng + liên minh Diệp gia đánh bại trong cuộc đấu tông môn ch.85.
- Lý Trác Sơn — chú út MC (40t, Trúc Cơ Trung), tham + có tâm tà (bảng hiện "Tâm tà — phản tộc trong 10 năm") — Đối thủ nội bộ — Bị Phong cô lập kinh tế + sau đó lưu đày khỏi Lý gia ch.50.
- Vương Hổ — đệ tử Triệu gia (Trúc Cơ Sơ Cao 25t), hung dữ + chuyên bắt nạt đệ tử nhỏ Lý gia — Đối thủ cá nhân Phase 1 — Bị Trí Dương đánh bại trận đầu ch.40.
- Tử Vận Tông Thái Thượng Trưởng Lão — đại nhân vật phái lớn (Hoá Thần đỉnh) đang muốn nuốt cả châu Đông Hoa — Đối thủ cosmic Phase 3-4 — Climax cuối truyện.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Lý gia + Thanh Vân Thành, giữ vững địa vị: Goal — Sau khi Phong nhận chức, mỗi đệ tử Lý gia phải có bảng được nhìn + design path. Cuối Phase: 3 đệ tử Trúc Cơ thành công, đánh bại Triệu gia trong đấu Tông môn. Milestone — Liên minh Lý + Diệp gia chính thức (ch.85). Stakes — Triệu gia thôn tính nếu Phong fail.
- PHASE 2 (Ch.100-300) — Thanh Vân Thành + quận Thanh Phong, mở rộng: Goal — Lý gia + Diệp gia trở thành Lý-Diệp tông môn 200 đệ tử, đoạt linh mạch cấp B, xây sơn môn riêng tại núi Long Vĩ. Milestone — Phong cá nhân lên Kim Đan ch.230. Stakes — 8 đại đỉnh phái chú ý + có thể cử cử người chống lưng.
- PHASE 3 (Ch.300-600) — Châu Đông Hoa: Goal — Lý-Diệp tông trở thành 1 trong 12 đại đỉnh phái châu, đại đệ tử Trương Bách Quân Hoá Thần. Milestone — Phong Nguyên Anh ch.480. Stakes — Tử Vận Tông Thái Thượng bắt đầu chú ý.
- PHASE 4 (Ch.600-1000) — Cosmic + Tiên giới: Goal — Phong Đại Thừa + lên Tiên giới, Lý-Diệp tông trở thành đại tộc cosmic. Milestone — Phong phi thăng ch.900. Stakes — Kẻ thù truyền kiếp Tiên Giới Trác Mệnh Tiên Tôn xuất hiện.

### OPENING SCENE
- Location: Đại sảnh tổ tiên Lý gia tại Thanh Vân Thành, 5 giờ sáng đầu xuân, ánh đèn cầu vàng nhạt, gió lạnh đầu năm thổi qua hiên gỗ cũ.
- MC hành động: Lý Trác Phong bừng tỉnh, đầu óc ngồn ngộn ký ức kiếp trước — 32 năm Việt Nam, 10 năm làm HR cấp cao, phỏng vấn hàng ngàn ứng viên. Bên ngoài đại sảnh, em họ Trí Dương đang lớn tiếng với chú Trác Sơn: "Lão Triệu Bá Tuyết tuyên bố tháng sau sẽ tổ chức đấu Tông Môn quyết định ai nuốt ai. Anh tộc trưởng nhút nhát của chúng ta định làm gì?" Đột nhiên trong mắt Phong loé lên giao diện UI xanh nhạt — và khi anh ngẩng đầu nhìn Trí Dương, bảng hiện rõ trong tâm trí: "Lý Trí Dương — Tài năng A Kiếm chính + B Thân pháp phụ — Tu vi max: Đại Thừa — Khí vận: 720/1000 — Sở trường: Kiếm Đạo + Thân Pháp — Khuyết điểm fatal: Tính nóng (có thể đột phá thất bại Trúc Cơ nếu không có thuốc trấn tâm)". Phong sửng sốt — em họ này thực ra có tài năng A, chỉ vì không ai biết cách bồi dưỡng đúng kiếm phái.
- Hook event: Phong gọi chú Trác Sơn vào sảnh riêng, nhìn ông — bảng hiện: "Lý Trác Sơn — Tài năng C Đa năng — Tu vi max: Trúc Cơ Trung — Khí vận: 80/1000 — Sở trường: Quản lý gia tộc — Khuyết điểm fatal: TÂM TÀ, sẽ phản tộc trong 10 năm". Phong điềm nhiên không hé một lời, chỉ ra quyết định: chuyển Trí Dương qua học kiếm phái Vô Ảnh + đặt chú út giám sát hai mẫu ruộng linh xa nhất (cô lập kinh tế). Bà nội Lý Tử Tế đứng cửa, nhìn anh — bảng hiện S Đan + S Trận, Tu vi max Hoá Thần. Bà gật đầu nhẹ: "Phong, từ đêm qua bà mơ thấy tổ tiên. Bà tin con."
- Câu mở đầu: "Mười sáu năm phỏng vấn ngàn ứng viên Trái Đất dạy ta một điều: tài năng không quan trọng bằng đúng người ở đúng vị trí — và bây giờ ta có cái bảng nhìn thấu mọi tu sĩ Đông Hoa."

### WORLD RULES
- Khí Vận Anh Hùng Bảng là bí mật tuyệt đối — Phong chỉ tiết lộ cho bà nội Lý Tử Tế + Diệp Sương Nhi (Phase 2) + Trương Bách Quân (Phase 3).
- Đại lục có 10 cảnh giới rõ ràng, mỗi cảnh giới mất 5-50 năm tu luyện trung bình.
- Đại tông môn không can thiệp xung đột tiểu gia tộc trừ khi có liên quan đến đại đỉnh phái.
- Linh mạch + linh điền + linh thạch là 3 trụ kinh tế tu tiên.
- Cosmic reveal Phase 4: Khí Vận Anh Hùng Bảng là một mảnh "Định Mệnh Sổ" của Trác Mệnh Tiên Tôn (kẻ thù truyền kiếp của Lý gia Tiên giới xa xưa).

### TONE & ANTI-PATTERNS
- TONE: Lý trí HR 50% + ấm áp gia tộc 30% + máu lạnh đối thủ 20%. Pacing chậm rãi — Phong chọn từng cây con, mỗi đệ tử có riêng career arc. Tham khảo nhịp 《天生仙种》.
- NEGATIVE SPACE:
  • KHÔNG là MC tu vi siêu mạnh đánh bại đối thủ — Phong tu vi yếu, anh thắng bằng bố trí đệ tử.
  • KHÔNG hậu cung sa đà — chỉ Diệp Sương Nhi + 1-2 nữ phụ ý nghĩa câu chuyện.
  • KHÔNG ngược đệ tử — đệ tử Lý gia có tài năng C/D cũng có chỗ riêng, Phong tận dụng tất cả.
  • KHÔNG đột phá ngẫu nhiên — mọi đột phá đệ tử + MC đều dựa trên bảng + design path cụ thể.
  • KHÔNG tu tiên thiền 100 chương — Phong "đột phá" bằng cách bồi dưỡng đệ tử lên cảnh giới mới → nhận Khí Vận → MC ranks up.
`,
    total_planned_chapters: 1000,
  },

  // ── 2. NGỰ THÚ TIẾN HÓA SƯ ──────────────────────────────────────────
  {
    title: 'Ngự Thú Tiến Hóa: Lộ Tuyến Ẩn Của Ta Là Vô Hạn',
    slug: 'ngu-thu-tien-hoa-lo-tuyen-an-cua-ta-la-vo-han',
    genre: 'ngu-thu-tien-hoa' as const,
    main_character: 'Nguyễn Thái Lâm',
    description:
      'Lập trình viên game Việt 26 tuổi Nguyễn Thái Lâm chết do làm việc quá sức lúc đang code engine cho game ngự thú phong cách Pokemon — tỉnh dậy thân phận học sinh năm cuối 18 tuổi Nguyễn Thái Lâm tại Học Viện Ngự Thú Thanh Vân, đại lục Tinh Vũ, thế giới ngự thú phổ cập. Gia đình Lâm nghèo, hắn chỉ có 1 thú đồng hành F-cấp duy nhất — Tiểu Hỏa Long Thằn Lằn, loại thú trang trí mà ai cũng cười. Còn 30 ngày tới đại khảo Châu Lục, nếu không có thú B-cấp trở lên Lâm sẽ bị thải khỏi học viện. Trong mắt Lâm đột nhiên xuất hiện "Tiến Hóa Tuyến Nhãn" — nhìn bất kỳ thú nào đều thấy MỌI lộ tuyến tiến hóa ẩn, bao gồm các tuyến rare nhất mà ngay cả Tiến Hóa Sư cấp Đế cũng không biết. Tiểu Hỏa Long Thằn Lằn F-cấp tầm thường có một tuyến ẩn "Long Đế" — qua 7 cấp tiến hóa rare sẽ trở thành Hoàng Long Đế (vương cấp tối thượng). Lâm dùng kiến thức game design kiếp trước + Tiến Hóa Tuyến Nhãn nâng cấp một con thú F-cấp lên đỉnh đại lục, đánh bại con cháu đại tộc, đại bại yêu thú trào, lên ngôi Tiến Hóa Đế Sư.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC nghèo + chỉ có thú F-cấp "trang trí" bị cả lớp cười cợt, mỗi chương đều dùng Tiến Hóa Tuyến Nhãn nhìn thấy lộ tuyến tiến hóa ẩn của thú mình + thú đối thủ, dần biến thú F-cấp thành Hoàng Long Đế vương cấp, đánh bại con cháu đại tộc + chuyên gia Tiến Hóa Sư cao cấp.
- Protagonist Engine: Nguyễn Thái Lâm thắng bằng kiến thức game design kiếp trước (8 năm code Pokemon-clone, hiểu rõ stat scaling + ability synergy + evolution tree mechanics) cộng với Tiến Hóa Tuyến Nhãn (xem tất cả tuyến tiến hóa ẩn). Hắn là game designer thay vì traditional Tiến Hóa Sư — biết exactly which evolution gives which ability + when to evolve.
- Pleasure Loop: Lâm gặp thú mới (đồng hành mình hoặc đối thủ) → mở Tuyến Nhãn → thấy 5-10 lộ tuyến tiến hóa ẩn (1-2 tuyến mainstream + 3-8 tuyến rare) → chọn tuyến rare nhất có potential → thu thập materials đặc biệt từ yêu thú trào + ruột yêu thú + linh thảo → thú tiến hóa thành công lên 1 cấp → trận đấu kế Lâm thắng dễ → đại tộc + chuyên gia ngu ngơ "Sao thú F-cấp đánh bại con A-cấp???".
- System Mechanic: Tiến Hóa Tuyến Nhãn (Hidden Evolution Path Eye). Input: ánh mắt Lâm nhìn thẳng vào thú trong tầm 20 mét + 1 điểm Tiến Hóa Lực (MC khởi đầu 50 điểm, hồi 5/ngày). Output: bảng UI trong tâm trí Lâm hiện toàn bộ tuyến tiến hóa của thú đó — gồm các tuyến công khai (mainstream, ai cũng biết) + tuyến ẩn (rare, ngay cả Tiến Hóa Sư cấp Vương cũng không biết). Mỗi tuyến hiện đầy đủ: cấp tiến hóa, kỹ năng unlock, materials cần thiết, độ rare (Common/Rare/Epic/Legendary/Mythic). Limit: nhìn 1 thú tốn 1 điểm; mỗi level up + 10 điểm pool. Reward: mỗi thú tiến hóa thành công lên 1 cấp tặng MC 5-50 điểm Tiến Hóa Lực + unlock tuyến mới.
- Phase 1 Playground: Học Viện Ngự Thú Thanh Vân (campus 100 mẫu, 5000 học sinh), rừng Tử Vong cạnh học viện (yêu thú F-D cấp lang thang), chợ Materials Thanh Vân Thành. Lâm vận hành Tuyến Nhãn → chọn lộ tuyến → thu thập materials → tiến hóa → thắng trận.
- Social Reactor: Trương Quân (bạn cùng phòng nghèo, có thú E-cấp Bushwood Treeling — tuyến ẩn "Thần Mộc"), giáo sư Tiến Hóa Sư Trần Đại Bá (chứng nhận Lâm là thiên tài ch.15), thiếu nữ Diệp Tuyết (con gái Tiến Hóa Sư cấp Vương — đối tác bí mật giúp Lâm), Lưu Hổ (bạn thân + đệ tử của Lâm sau khi thua trận đầu), Vương Tử Lan (con gái Vương gia đại tộc — đại diện cho cả đại tộc xung quanh Lâm).
- Novelty Ladder: Ch.1-30 (Lâm tiến hóa Tiểu Hỏa Long F → E → D cấp + tuyến rare lộ ra). Ch.30-80 (Đại khảo Châu Lục + đại bại đại tộc xung quanh). Ch.80-150 (Yêu thú trào đầu tiên + Lâm cứu thành phố + tuyến Long Đế lộ ra). Ch.150-300 (Đại hội Châu Lục — Lâm vô địch + nhận đệ tử). Ch.300+ (Cosmic Tiến Hóa Đế Sư + thống nhất đại lục).
- Control Rules: Payoff thú tiến hóa mỗi 2-3 chương (1 cấp mới hoặc 1 unlock ability); payoff trận thắng/face-slap đại tộc mỗi arc 15-20 chương. Attention Gradient: lớp học Lâm → cả Học Viện → quận Thanh Phong → Châu Lục → đại lục → cosmic.

### BỐI CẢNH
Đại lục Tinh Vũ — văn minh ngự thú phổ cập 1000 năm, 80% dân là Tiến Hóa Sư (tu giả chuyên ngự thú), 20% còn lại là võ giả + ma pháp sư + vu sư. Hệ thống cấp thú: F (trang trí) → E (sơ học) → D (sơ chiến) → C (trung) → B (cao) → A (tinh anh) → S (đại sư) → SS (vương) → SSS (đế) → 神 (thần). Mỗi cấp tiến hóa cần materials đặc biệt: ruột yêu thú đồng cấp, linh thảo, đan dược, không gian dao động đặc biệt (vd: rừng Tử Vong khi trăng tròn cho phép Light-tree pets tiến hóa).

Mỗi thú có 1-3 tuyến tiến hóa mainstream được ghi vào Tiến Hóa Sách (Encyclopedia chính thức). Tuyến ẩn (rare paths) chỉ Tiến Hóa Sư Vương cấp trở lên mới phát hiện được sau hàng ngàn thí nghiệm. Đa số người chơi chỉ biết tuyến mainstream. MC's Tuyến Nhãn cho phép thấy MỌI tuyến — bao gồm Mythic-level paths chưa ai từng thấy.

Mỗi 50 năm có 1 trận "Yêu Thú Trào" (Beast Tide) khi yêu thú từ Đại Sa Mạc Phía Bắc lao xuống thành phố. Chu kỳ tiếp theo dự kiến trong vòng 2 năm tới — Phase 1 climax ch.85 là trận trào đầu MC sẽ tham gia chống đỡ.

Học Viện Ngự Thú Thanh Vân là tier 2 college trong Châu Đông Lâm, 5000 học sinh, 100 giáo sư Tiến Hóa Sư (5 vị cấp Đại Sư + 30 vị cấp Tinh Anh). Học sinh năm cuối thi đại khảo Châu Lục (top 100 toàn châu) — top 10 vào thẳng Tinh Vũ Đại Học (tier 1).

### NHÂN VẬT CHÍNH
- Tên: Nguyễn Thái Lâm
- Tuổi: 18 tuổi (kiếp trước 26 tuổi, lập trình viên game Việt Nam, 8 năm code Pokemon-clone + Monster Hunter mobile, am hiểu game mechanics tuyệt đỉnh, chết do tăng ca code lúc nửa đêm)
- Nghề/Trạng thái: Học sinh năm cuối Học Viện Ngự Thú Thanh Vân (lớp Thường — không phải lớp Tinh Anh). Cấp Tiến Hóa Sư hiện tại: F-cấp (sinh viên). Còn 30 ngày tới đại khảo Châu Lục, hiện tại điểm số 95/200 (đại tộc thường có 180/200).
- Tài sản hiện tại: Một bộ đồng phục học viện cũ, một thẻ sinh viên, 50 đồng linh thạch tiết kiệm, một Tiểu Hỏa Long Thằn Lằn F-cấp (cùng từ năm 12 tuổi, được nhặt trong rừng). Gia đình nghèo, mẹ goá làm việc tại nhà máy linh thạch, em gái 12 tuổi tật bẩm sinh ở nhà.
- Tính cách: Tỉ mỉ + lý trí + game designer thinking (combo 8 năm code game + tính cách kỹ thuật), bảo vệ thú đồng hành như con đẻ, không thân thiết người khác dễ dàng. Hành động bằng kế hoạch dài hạn — design evolution path 30 ngày, 100 ngày, 1 năm cho từng thú.
- Điểm yếu: Cấp Tiến Hóa Sư F (thấp nhất); không có background gia tộc lớn; phải tự lo cả mẹ + em gái. Tu vi Tiến Hóa Lực ban đầu chỉ 50 điểm — phải tiết kiệm + dùng đúng lúc.

### GOLDEN FINGER
- Tên hệ thống: Tiến Hóa Tuyến Nhãn (Hidden Evolution Path Eye).
- Cơ chế hoạt động: Khi Lâm nhìn thẳng vào thú bất kỳ trong tầm 20m, hắn thấy giao diện UI hiện trong mắt — sơ đồ cây tiến hóa đầy đủ của thú đó. Mỗi node trên cây hiển thị: tên cấp mới (vd: Tiểu Hỏa Long → Hỏa Long Quân), kỹ năng unlock (vd: Hỏa Hô Cầu cấp Trung), materials cần (vd: 1 ruột Hỏa Lang B-cấp + 5 linh thảo Hỏa Tinh + giờ Tý), điểm rare (Common / Rare / Epic / Legendary / Mythic), thời gian tiến hóa (3 ngày tới 3 tháng).
- Trigger kích hoạt: Mỗi cái nhìn tốn 1 điểm Tiến Hóa Lực; MC khởi đầu 50 điểm, hồi 5/ngày. Mỗi level up Tiến Hóa Sư + 50 điểm pool + 5 đ/ngày.
- Đường tăng trưởng cấp Tiến Hóa Sư:
  • L1 F-cấp (ch.1-20): nhìn 1 thú/ngày, thấy tuyến mainstream + 2-3 tuyến rare
  • L2 E-cấp (ch.20-50): nhìn 3 thú/ngày, thấy thêm tuyến Epic
  • L3 D-cấp (ch.50-100): tự design biến thể tuyến (merge 2 tuyến rare thành 1 tuyến mới)
  • L4 C-cấp (ch.100-200): nhìn cả bầy 100 thú trong 1 lượt
  • L5 B-cấp (ch.200-400): predict yêu thú trào + chu kỳ tiến hóa toàn cõi
  • L6 A-cấp (ch.400-700): tạo "Tuyến tiến hóa mới" hoàn toàn từ scratch
  • L7 S+-cấp (ch.700-1000): Cosmic — Lâm trở thành Tiến Hóa Đế Sư, dạy lại Thiên Đạo
- Điểm yếu: Tuyến rare cần materials đặc biệt rất khó tìm + đúng thời điểm + đúng môi trường. MC phải kết hợp Tuyến Nhãn + game knowledge + nỗ lực thu thập + đôi khi may mắn.

### CAST CHÍNH
- Tiểu Hỏa Long Thằn Lằn (thú đồng hành chính, từ ch.1) — F-cấp ban đầu, tuyến ẩn "Long Đế" 7 cấp tiến hóa rare đến Hoàng Long Đế (SS vương cấp), pet personality: trung thành tuyệt đối, chỉ nghe Lâm — Sẽ là partner xuyên suốt 1000 chương.
- Trương Quân — bạn cùng phòng (18t, gốc nghèo), có thú E-cấp Bushwood Treeling — tuyến ẩn "Thần Mộc" Mythic — Đệ tử số 1 của Lâm — Sau này trở thành Tiến Hóa Sư A-cấp dưới Lâm.
- Giáo sư Trần Đại Bá — Tiến Hóa Sư Đại Sư cấp tại Thanh Vân Học Viện (50t), chuyên Long tộc + Hỏa hệ — Mentor + chứng nhận Lâm là thiên tài — Cung cấp materials cấp cao cho Lâm Phase 1.
- Diệp Tuyết — con gái Tiến Hóa Sư Vương cấp Diệp Hằng (19t, lớp Tinh Anh), có thú A-cấp Tuyết Lang — Tài năng S Toàn diện, là người ĐẦU TIÊN nhận ra Lâm có golden finger ch.20 — Love interest chính + đối tác research.
- Lưu Hổ — bạn thân (17t, lớp Thường), có thú C-cấp Đại Lực Hùng — Sau ch.10 bị Lâm đánh bại trong trận tập, trở thành đệ tử + bạn thân nhất.
- Vương Tử Lan — con gái Vương gia đại tộc (18t, lớp Tinh Anh), có thú A-cấp Tử Linh Thằn Lằn — Đối thủ chính Phase 1 → đồng minh Phase 2 sau khi Lâm cứu trong yêu thú trào.

### ANTAGONISTS
- Triệu Quân — đệ tử lớp Tinh Anh (18t), kiêu ngạo + bắt nạt học sinh nghèo, có thú B-cấp Hỏa Hổ Lang — Đối thủ chương 1-30 — Bị Lâm đánh bại đại khảo Châu Lục ch.45.
- Phụ huynh Trương Đại Phúc — đại nhân Tiến Hóa Sư Vương cấp tại Thanh Vân Thành (50t), bố Triệu Quân, gia tộc đang muốn ép Tiến Hóa Sư trẻ phục vụ tộc mình — Đối thủ chính trị Phase 1-2 — Bị Lâm phơi bày tội tham nhũng materials học viện ch.120.
- Tiến Hóa Đại Sư xám Hắc Vũ — chuyên dạy tà tuyến (đen ám) tiến hóa, biến thú thành quái thú không kiểm soát — Đối thủ tà phái Phase 2 — Hắn đại diện cho "evolution shortcut" mà MC reject.
- Yêu Thú Đế Quân Hắc Lang — kẻ thống trị đại sa mạc phía Bắc, dẫn dắt yêu thú trào — Đối thủ cosmic Phase 3-4.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Học Viện Thanh Vân + đại khảo Châu Lục + yêu thú trào nhỏ: Goal — Lâm đại bại đại khảo Châu Lục (top 10 toàn châu), Tiểu Hỏa Long tiến hóa lên Hỏa Long Quân (C-cấp), Lâm chứng tỏ vô địch lớp Thường. Milestone — Yêu thú trào nhỏ Phase 1 cứu Thanh Vân Thành ch.85. Stakes — Bị thải khỏi học viện nếu fail.
- PHASE 2 (Ch.100-300) — Tinh Vũ Đại Học + đại hội Châu Lục: Goal — Lâm vào Tinh Vũ Đại Học (tier 1), nhận 10 đệ tử đầu tiên, mở Trường Tiến Hóa Tư Nhân, đại hội Châu Lục đại bại Phụ huynh Trương Đại Phúc. Milestone — Lâm lên B-cấp Tiến Hóa Sư ch.250. Stakes — Đại tộc Trương + Vương liên minh chống Lâm.
- PHASE 3 (Ch.300-600) — Cosmic Châu Lục + yêu thú trào lớn: Goal — Lâm vô địch toàn đại lục, đánh bại Yêu Thú Đế Quân Hắc Lang, kiến lập Tiến Hóa Liên Minh 8 đại Trường. Milestone — Lâm lên A-cấp ch.450 + Tiểu Hỏa Long lên Hoàng Long Đế ch.500. Stakes — Cosmic threat từ Yêu Thú Đế Quân.
- PHASE 4 (Ch.600-1000) — Cosmic ascension: Goal — Lâm trở thành Tiến Hóa Đế Sư (S+ cấp), dạy lại Thiên Đạo về tiến hóa, mở khóa cosmic-level evolutions. Endgame: Lâm chọn giữa cosmic life vs về Việt Nam kiếp trước cứu mẹ + em gái. Milestone — Cosmic reveal về Tiến Hóa Tuyến Nhãn ch.900. Stakes — Thiên Đạo cũ muốn absorb Lâm.

### OPENING SCENE
- Location: Phòng ngủ ký túc xá B4 Học Viện Ngự Thú Thanh Vân, 5 giờ sáng đầu xuân, ánh đèn LED yếu của bàn học chật chội 6m², chiếc lồng nhỏ chứa Tiểu Hỏa Long Thằn Lằn đặt cạnh giường.
- MC hành động: Nguyễn Thái Lâm bừng tỉnh trong cơn đau đầu kinh khủng, ngồn ngộn ký ức kiếp trước Việt Nam — 26 năm, 8 năm code game Pokemon-clone + Monster Hunter, ngàn evolution trees đã thiết kế. Tiểu Hỏa Long thằn lằn trong lồng kêu yếu ớt — F-cấp, sắp không qua được mùa đông. Cùng lúc đó, trong mắt Lâm hiện ra giao diện UI ánh xanh nhạt: "Tiến Hóa Tuyến Nhãn — Active. Tiến Hóa Lực: 50/50. Hãy nhìn vào 1 con thú." Lâm phản xạ nhìn vào Tiểu Hỏa Long — sơ đồ cây tiến hóa hiện ra, đầy đủ 12 nhánh, bao gồm 8 tuyến rare chưa ai từng thấy, có 1 tuyến Mythic ánh vàng rực: "Long Đế — 7 cấp tiến hóa rare đến Hoàng Long Đế SS vương cấp".
- Hook event: Lâm sửng sốt, mở tủ lấy sách đại khảo Châu Lục: 30 ngày nữa thi, top 100 toàn châu, nếu fail sẽ bị thải khỏi học viện + về quê làm công nhân linh thạch giúp mẹ. Lúc đó Trương Quân bạn cùng phòng nửa tỉnh nửa say từ ký túc đêm về: "Lâm này, cuối tuần mình thi đánh nhóm với Triệu Quân lớp Tinh Anh — hắn vừa nhận thú B-cấp Hỏa Hổ Lang mới." Lâm nhìn ra cửa sổ — chân trời đỏ nhạt buổi đầu xuân — hắn lặng lẽ cầm cây bút trên bàn, mở quyển sổ trắng, bắt đầu thiết kế "Roadmap 30 ngày: Tiểu Hỏa Long F → D cấp, unlock Hỏa Hô Cầu kỹ năng".
- Câu mở đầu: "Tám năm code game, ta thiết kế ngàn evolution trees — bây giờ ta xuyên qua thế giới ngự thú với cái mắt nhìn thấu mọi lộ tuyến tiến hóa ẩn, và bạn đồng hành ta là một con thằn lằn F-cấp có tuyến Long Đế."

### WORLD RULES
- Tiến Hóa Tuyến Nhãn là bí mật của MC — Lâm giả vờ "có duyên đoán đúng tuyến tiến hóa từ kinh nghiệm chăm thú nhỏ".
- Cấp Tiến Hóa Sư có 10 tầng — Lâm khởi đầu F (sinh viên), mỗi cấp lên cần điểm tiến hóa thành công của thú + thi qua đại học hoặc nhận chứng chỉ.
- Mỗi thú có 3 tuyến mainstream + 2-10 tuyến rare ẩn — đa số người chỉ biết mainstream. Tuyến rare cần materials đúng + đúng thời điểm + đúng môi trường.
- Yêu thú trào (Beast Tide) là mối đe dọa periodic — hiện đại đã đến giai đoạn đầu của trận trào cosmic-level.
- Cosmic reveal Phase 4: Tiến Hóa Tuyến Nhãn là 1 mảnh "Tiến Hóa phần Thiên Đạo" — Lâm là sứ giả phục hưng Tiến Hóa Đạo cho cosmic vũ trụ.

### TONE & ANTI-PATTERNS
- TONE: Game designer thinking 40% + ấm áp pet bonding 30% + face-slap đại tộc 20% + cosmic Phase 4 10%. Pacing nhanh — mỗi 2-3 chương có 1 evolution milestone hoặc trận thắng. Tham khảo nhịp 《全球御兽：我能看见进化路线》.
- NEGATIVE SPACE:
  • KHÔNG là Pokemon copy thô — adapt vào setting tu vi Tinh Vũ với cosmic stakes.
  • KHÔNG hậu cung sa đà — chỉ Diệp Tuyết + 1-2 nữ phụ.
  • KHÔNG ngược pet — Tiểu Hỏa Long luôn là partner thân thiết, không phải tool.
  • KHÔNG tu tiên thiền — Lâm "đột phá" bằng cách tiến hóa thú + thi đại khảo + cứu thành phố.
  • KHÔNG dùng tuyến rare 1 cách lazy — mỗi tuyến cần materials thực + plan thực + đôi khi may mắn.
  • KHÔNG là main solo — Lâm có team đệ tử + Diệp Tuyết, mỗi người 1 thú khác nhau.
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
  if (exist.data) {
    console.log(`  ⚠ Slug ${seed.slug} exists — skip`);
    return null;
  }
  const novel = await s.from('novels').insert({
    title: seed.title,
    slug: seed.slug,
    author: 'Truyện City',
    description: seed.description,
    genres: [seed.genre],
    status: 'Đang ra',
  }).select('id').single();
  if (novel.error || !novel.data) throw new Error(`novel: ${novel.error?.message}`);

  const project = await s.from('ai_story_projects').insert({
    novel_id: novel.data.id,
    user_id: ownerId,
    genre: seed.genre,
    main_character: seed.main_character,
    world_description: seed.world_description,
    total_planned_chapters: seed.total_planned_chapters,
    current_chapter: 0,
    status: 'active',
    pause_reason: null,
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    temperature: 1.0,
    target_chapter_length: 2800,
    ai_model: 'gemini-3.1-flash-lite',
    style_directives: {
      disable_chapter_split: true,
      production_enabled: true,
      production_daily_chapter_quota: 50,
      require_full_chapter_blueprint: false,
    },
  }).select('id').single();
  if (project.error || !project.data) throw new Error(`project: ${project.error?.message}`);
  console.log(`  ✓ ${project.data.id} | ${seed.title.slice(0, 60)}`);
  return project.data.id;
}

async function seedQuota(projectId: string) {
  const existing = await s.from('project_daily_quotas').select('vn_date').eq('project_id', projectId).eq('vn_date', VN_DATE).maybeSingle();
  if (existing.data) return;
  await s.from('project_daily_quotas').insert({
    project_id: projectId,
    vn_date: VN_DATE,
    target_chapters: 50,
    written_chapters: 0,
    status: 'active',
  });
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Clan + Evolution duo spawn  ${apply ? '[APPLY]' : '[DRY RUN]'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (const seed of SEEDS) {
    console.log(`[SPAWN] ${seed.title}`);
    console.log(`  slug: ${seed.slug}`);
    console.log(`  genre: ${seed.genre} | MC: ${seed.main_character}`);
    console.log(`  desc: ${seed.description.length} chars | world: ${seed.world_description.length} chars`);
  }

  if (!apply) {
    console.log('\nDRY RUN. Pass --apply to execute.\n');
    return;
  }

  const ownerId = await getOwnerId();
  const ids: string[] = [];
  for (const seed of SEEDS) {
    const id = await applySpawn(seed, ownerId);
    if (id) {
      await seedQuota(id);
      ids.push(id);
    }
  }

  console.log(`\n✓ ${ids.length} project(s) active + production_enabled. Quota seeded for ${VN_DATE}.`);
  console.log('Project IDs:');
  for (const id of ids) console.log(`  ${id}`);
  console.log('\nCron sẽ pickup tick sau (mỗi 5 min). Admin: /admin/production-toggle');
}

main().catch((e) => { console.error(e); process.exit(1); });
