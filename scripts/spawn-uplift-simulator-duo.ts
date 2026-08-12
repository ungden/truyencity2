/**
 * Spawn 2 sảng văn novels:
 *
 * 1) Dị Giới Công Nghiệp Hoá: MC kỹ sư hoá VN xuyên qua dị giới Phong Linh
 *    nơi civilians có innate superpowers (Hoả/Thủy/Mộc/Kim/Thổ/Lôi/Quang)
 *    NHƯNG sản xuất cực thấp (vẫn đồ sắt sơ khai). MC kết hợp năng lực tộc
 *    nhân với khoa học Trái Đất (Solvay salt, Bessemer steel, GMO crop,
 *    LED fishing) — 1 tộc nhân Hoả Cấp luyện 50kg sắt/ngày = 1 xưởng xưởng
 *    nhỏ Earth, 1 Thủy Cấp chiết muối = 1000 nông dân truyền thống. Sảng
 *    văn industrial revolution + superpower combo. Reference TQ trope
 *    "异界超能力 + 工业革命" combination (niche but exists).
 *
 * 2) Dị Giới Mô Phỏng Khí: MC golden finger "Mô Phỏng Tử" — input scenario,
 *    simulate 100-1M lần, output optimal path + step-by-step. Tu sĩ nghèo
 *    đỉnh dùng simulator trở thành huyền thoại. Reference: 《我可以模拟亿
 *    万次》《永生从模拟开始》《模拟修仙：从筑基开始》— mô-phỏng-lưu HOT
 *    2024-2025 TQ webnovel scene.
 *
 * Cron pickup tự động via `production_enabled=true`.
 *
 * Run dry: `npx tsx scripts/spawn-uplift-simulator-duo.ts`
 * Apply:   `npx tsx scripts/spawn-uplift-simulator-duo.ts --apply`
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
  // ── 1. DỊ GIỚI CÔNG NGHIỆP HOÁ ──────────────────────────────────────
  {
    title: 'Dị Giới Công Nghiệp Hoá: Ta Kết Hợp Năng Lực Siêu Nhiên Với Khoa Học',
    slug: 'di-gioi-cong-nghiep-hoa-ta-ket-hop-nang-luc-sieu-nhien-voi-khoa-hoc',
    genre: 'di-gioi' as const,
    main_character: 'Lê Quốc Bảo',
    description:
      'Kỹ sư hoá VinFast 30 tuổi Lê Quốc Bảo (PhD Chemistry ETH Zurich, 8 năm chuỗi cung ứng EV battery) chết do tai nạn xưởng — tỉnh dậy thân phận con trai cả tộc trưởng tộc Ngân Trảo 22 tuổi tại đại lục Phong Linh dị giới. Đại lục Phong Linh có 1 đặc điểm cực kỳ thú vị: civilians sinh ra với "Thể Năng" — siêu năng lực tự nhiên gồm Hoả/Thủy/Mộc/Kim/Thổ/Phong/Lôi/Quang/Ám/Lực/Tốc/Trí. 80% dân Sơ-Trung Cấp (đốt lửa nhỏ, di chuyển vật 100kg, làm cây lớn 1m/giờ), 15% Cao Cấp (đốt nhà, lật xe, làm cây cao 10m/giờ), 5% Thiên Cấp (thiên tai). NHƯNG dị giới này vẫn đang ở thời đại đồ sắt sơ khai — không ai kết hợp Thể Năng với industry. Hỏa Cấp đốt củi cho ấm chứ không luyện thép. Thủy Cấp tưới ruộng chứ không chiết muối quy mô. Mộc Cấp làm thuốc bắc chứ không GMO crop. Tộc Ngân Trảo 200 người (10 cao thủ Trung Cấp + 50 Sơ Cấp + 140 Phàm) sống nghèo nàn ở thung lũng Phong Linh. Bảo kết hợp PhD Chemistry kiếp trước với Thể Năng tộc nhân: 1 Thủy Sơ Cấp bơm nước biển + 1 Hoả Sơ Cấp bay hơi = 50kg muối tinh/ngày (bằng 1000 nông dân truyền thống). 1 Hoả Trung Cấp + Solvay process = 200kg sắt thép/ngày (1 xưởng Bessemer mini). Tộc Ngân Trảo 200 người trong 1 năm phát triển thành Liên Minh Công Nghiệp 50K dân, đại bại các bộ tộc cao thủ Thiên Cấp truyền thống bằng chuỗi cung ứng + vũ khí kỹ thuật.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC kỹ sư VN PhD Chemistry xuyên thành con trai tộc trưởng nghèo, kết hợp Thể Năng siêu nhiên tộc nhân (Hoả/Thủy/Mộc/Kim/Lực/Tốc) với khoa học Trái Đất (Solvay salt, Bessemer steel, GMO crop, LED fishing) — biến 200 người nghèo nàn thành Liên Minh Công Nghiệp 50K dân, sản xuất gấp 1000 lần truyền thống, vũ khí + chuỗi cung ứng đè bẹp các bộ tộc cao thủ Thiên Cấp.
- Protagonist Engine: Lê Quốc Bảo thắng bằng kiến thức kỹ sư hiện đại VN (PhD Chemistry ETH Zurich + 8 năm VinFast chuỗi cung ứng EV battery, tinh thông Solvay/Bessemer/Haber-Bosch/GMO/automation/QA). Hắn không có Thể Năng cá nhân (Phàm Cấp) — hắn là chief engineer biến mỗi Thể Năng tộc nhân thành 1 đơn vị production line. Một Thủy Sơ Cấp + bay hơi pan = 50kg muối/ngày. Một Hoả Trung Cấp + Bessemer = 200kg thép/ngày. Output exponential lên dị giới truyền thống.
- Pleasure Loop: MC discover 1 Thể Năng mới trong tộc → design production line (Earth process + Thể Năng input) → 1 tộc nhân thực thi → output gấp 100x truyền thống → tộc nhân ngạc nhiên "Một mình tao bằng cả ngàn nông dân???" → tin tưởng MC tuyệt đối → mở rộng production → đại tộc + thương đoàn quanh vùng đến xem + đặt hàng → MC kiếm tài sản exponential + tộc Ngân Trảo trở thành cosmic-tier industrial empire.
- System Mechanic: Hệ Thống Phong Linh Tri Thức (Cosmic Engineering Memory Library). Input: tâm trí MC focus vào 1 Earth engineering process + 1 điểm Công Nghệ Khí (CNK). Output: UI hiện đầy đủ trong tâm trí MC — Solvay process (NH3 + NaCl → Na2CO3 + NH4Cl), Bessemer process (decarburize iron with air blast), Haber-Bosch (N2 + 3H2 → 2NH3 for fertilizer), GMO selective breeding (5-year improvement cycles), LED night fishing (fish attraction wavelength 530nm), wood gasification (charcoal → syngas → methanol). Đầy đủ: chemistry equations, equipment design, safety protocols, scaling formulas. MC adapt cho Thể Năng substitution (vd: Bessemer cần lò nung 1500°C → Hoả Trung Cấp tạo lửa 1700°C nhanh hơn coal). Limit: ban đầu 1 truy xuất/ngày, level up +1; mỗi production line operate stable + scale tặng 10-100 CNK.
- Phase 1 Playground: Tộc Ngân Trảo thung lũng Phong Linh, 200 dân, gần biển Bạc 5 dặm + rừng Linh Mộc 10 dặm + mỏ sắt nhỏ 15 dặm. MC vận hành Thể Năng + Earth process → production line → output gấp 100x → tộc giàu lên.
- Social Reactor: Lê Quốc Bảo cha (tộc trưởng Ngân Trảo 45t, Trung Cấp Lôi, ban đầu hoài nghi sau ủng hộ con), em gái Lê Tuyết Mai (18t, Trung Cấp Thủy, là first Production Manager Phase 1 với chiết muối line), Trương Hoả Đại (Trung Cấp Hoả 35t, lò luyện kim đầu tiên), Phạm Mộc Lan (Cao Cấp Mộc 28t, GMO farm), Lý Phong Hành (Cao Cấp Tốc 25t, logistics + delivery), giáo sư cũ ETH Zurich Hans Müller (memory cố vấn).
- Novelty Ladder: Ch.1-30 (Chiết muối Solvay + Hoả luyện thép Bessemer — tộc Ngân Trảo no đủ, kho 100 tấn muối). Ch.30-80 (GMO crop với Mộc Cấp + ammonia Haber-Bosch — sản xuất nông nghiệp 100x). Ch.80-150 (Vũ khí công nghệ: súng hỏa mai + thuốc súng đen + tổ chức quân đội kiểu modern → đại bại bộ tộc Thiên Cấp truyền thống). Ch.150-300 (Liên Minh Công Nghiệp 50K dân: nhà máy chuỗi, đường sắt hơi nước, điện thoại telegraph). Ch.300+ (Cosmic: discover dị giới có 12 vương quốc cosmic-tier, MC build cosmic-industrial-empire).
- Control Rules: Payoff production line mỗi 5-10 chương (1 line mới opening); payoff tộc tăng dân số + thương đoàn mỗi 15-30 chương. Attention Gradient: tộc Ngân Trảo → 5 tộc lân bang Phong Linh → quận Phong Linh → vương quốc Tử Vũ → đại lục → cosmic.

### BỐI CẢNH
Đại lục Phong Linh — đại lục dị giới hư cấu hoàn toàn (KHÔNG dính Việt Nam, KHÔNG dính lịch sử Earth nào), năm Phong Linh Lịch 7842, civilization tier đồ sắt sơ khai. Civilians sinh ra với "Thể Năng" — siêu năng lực tự nhiên truyền theo dòng máu, gồm 12 loại chính:
- Tứ Nguyên Tố: Hoả / Thủy / Mộc / Kim
- Phụ Nguyên Tố: Thổ / Phong / Lôi / Quang / Ám
- Enhancement: Lực (sức mạnh) / Tốc (tốc độ) / Trí (trí lực hỗ trợ)

Cấp độ: Phàm (no power) → Sơ Cấp (đốt lửa cây củi, di chuyển 1kg) → Trung Cấp (đốt lửa nhà, di chuyển 100kg) → Cao Cấp (đốt cả ngôi nhà, di chuyển 10 tấn) → Thiên Cấp (thiên tai). Dân số đại lục: 80% Phàm + Sơ Cấp, 15% Trung Cấp, 4.5% Cao Cấp, 0.5% Thiên Cấp. Thiên Cấp được tôn kính như vua chúa truyền thống.

Văn minh: thời đại đồ sắt sơ khai — chưa có thuốc súng, chưa có cơ khí phức tạp, chưa có công xưởng quy mô. Sản xuất chủ yếu là nông nghiệp truyền thống + thợ thủ công + săn bắn (Hoả Cấp dùng nướng thịt thôi, Thủy Cấp tưới ruộng, không ai industrialize). Lý do: dị giới không có 1 ai có kiến thức "kết hợp Thể Năng với quy trình sản xuất hệ thống". Mỗi Thể Năng được dùng tự nhiên, không có engineering mindset.

Tộc Ngân Trảo 200 người sống tại thung lũng Phong Linh (cách quận Phong Linh 50 dặm Tây Bắc), gần biển Bạc 5 dặm + rừng Linh Mộc 10 dặm + mỏ sắt nhỏ 15 dặm. Đói nghèo vì: tộc trưởng cha MC vừa thua 1 trận tranh giành lãnh thổ với tộc Hỏa Long lân bang (mất 30% đất canh tác). Tộc có 10 Trung Cấp (đa số Hoả + Thủy + Lực) + 50 Sơ Cấp + 140 Phàm Cấp. Hiện tại đói triền miên 2 tháng.

### NHÂN VẬT CHÍNH
- Tên: Lê Quốc Bảo
- Tuổi: 22 tuổi dị giới (kiếp trước 30t, kỹ sư hoá VinFast EV Battery, PhD Chemistry ETH Zurich Thụy Sĩ, 8 năm chuyên Solvay/Bessemer/Haber-Bosch/EV chuỗi cung ứng, chết do tai nạn xưởng đang test prototype solid-state battery)
- Nghề/Trạng thái: Con trai cả tộc trưởng Ngân Trảo, Phàm Cấp (KHÔNG có Thể Năng nào — bị tộc nhân coi thường vì là "Phàm tử" của tộc trưởng có Trung Cấp Lôi). Trước đây học việc lò rèn cùng chú Trương Hoả Đại.
- Tài sản hiện tại: Một thanh kiếm sắt cấp Hạ phẩm (do bố MC truyền), một bộ áo da, một mảnh ruộng 2 mẫu tộc giao MC trồng khoai. Cha Lê Quốc Tài (45t, Trung Cấp Lôi, tộc trưởng), mẹ Lê Thị Hương (43t, Sơ Cấp Mộc, lo bếp tộc), em gái Lê Tuyết Mai 18t (Trung Cấp Thủy, niềm tự hào nhất tộc).
- Tính cách: Trầm tĩnh + sharp như chief engineer (combo 8 năm VinFast + tính kỹ sư), bảo vệ tộc tuyệt đối, không ghen tị Thể Năng người khác (kiếp trước Earth không ai có siêu năng lực — MC biết kiến thức + chuỗi cung ứng quan trọng hơn). Hành động bằng kế hoạch dài hạn — design 50-năm roadmap industrialize tộc.
- Điểm yếu: Phàm Cấp (KHÔNG có Thể Năng) — không thể chiến đấu trực tiếp với bất cứ ai. Tộc nhân ban đầu khinh "thằng con tộc trưởng đần độn". Phụ thuộc HOÀN TOÀN vào tộc nhân + Thể Năng họ + niềm tin của họ vào kế hoạch của MC.

### GOLDEN FINGER
- Tên hệ thống: Hệ Thống Phong Linh Tri Thức (Cosmic Engineering Memory Library).
- Cơ chế hoạt động: Trong tâm trí MC có UI ánh xanh-bạc — kho memory đầy đủ kiếp trước (PhD Chemistry ETH Zurich + 8 năm VinFast). Khi MC focus 1 Earth engineering process + tốn 1 CNK, UI hiện full information: chemical equations + reaction conditions + equipment design (drawings) + safety protocols + scaling formulas + adaptation guide cho Thể Năng substitution. Vd: Solvay process input "ammonia + brine + limestone", output "soda ash"; UI gợi ý "Thủy Sơ Cấp tạo brine 10kg/giờ, Hoả Trung Cấp duy trì 80°C reaction temp, Mộc Sơ Cấp grow limestone-rich vine." MC adapt cho từng tộc nhân.
- Trigger kích hoạt: Mỗi truy xuất tốn 1 điểm Công Nghệ Khí (CNK). MC khởi đầu 50 CNK; hồi 5 CNK/ngày. Mỗi production line operate stable + sản xuất 1 tuần tặng 10-100 CNK. Cosmic-level achievements (đại bại Thiên Cấp đối thủ bằng kỹ thuật) tặng 1000+ CNK.
- Đường tăng trưởng cấp:
  • L1 (ch.1-30): 1 truy xuất/ngày. 3 production line (Solvay salt + Bessemer steel + LED fishing).
  • L2 (ch.30-80): 3 truy xuất/ngày. +Haber-Bosch ammonia + GMO crop + wood gasification.
  • L3 (ch.80-150): 10 truy xuất/ngày. +Súng hỏa mai + thuốc súng + organized army (modern military tactics).
  • L4 (ch.150-300): 30 truy xuất/ngày. +Đường sắt hơi nước + telegraph + nhà máy chain.
  • L5 (ch.300-500): Cosmic-tier engineering — electricity grid, semiconductor fabrication, jet engine.
  • L6 (ch.500-750): Aerospace + cosmic chemistry + quantum mechanics.
  • L7 (ch.750-1000): Hợp nhất với "Engineering phần Thiên Đạo".
- Điểm yếu: Memory CHỈ là kiến thức kiếp trước — MC phải work với tộc nhân + Thể Năng của họ để execute. KHÔNG TỰ tạo factory bằng thần lực. Plus tộc nhân ban đầu không tin "thằng Phàm tử" — MC phải convince + chứng minh bằng kết quả cụ thể.

### CAST CHÍNH
- Lê Quốc Tài — cha MC (45t, Trung Cấp Lôi, tộc trưởng Ngân Trảo) — Ban đầu hoài nghi MC "Phàm tử đần độn", sau 30 chương khi MC chứng tỏ với chiết muối + Bessemer steel, công nhận MC là Phó Tộc Trưởng — Đối tác chính trị + cosmic ally.
- Lê Tuyết Mai — em gái MC (18t, Trung Cấp Thủy, niềm tự hào nhất tộc) — Người đầu tiên tin MC tuyệt đối, là Production Manager đầu tiên với line chiết muối ch.5 — Cánh tay phải + co-leader của tộc.
- Trương Hoả Đại — chú họ MC (35t, Trung Cấp Hoả, thợ rèn tộc) — Operator đầu tiên Bessemer steel line ch.10, sau Phase 1 trở thành Trưởng Bộ Phận Kim Loại — Đối tác kỹ thuật chính.
- Phạm Mộc Lan — chị em họ MC (28t, Cao Cấp Mộc, nông dân tộc) — GMO crop farm Phase 1, Phase 2 trở thành Trưởng Nông Nghiệp Liên Minh Công Nghiệp — Đối tác food chain.
- Lý Phong Hành — bạn thân MC từ nhỏ (25t, Cao Cấp Tốc) — Logistics + delivery Phase 1-2, Phase 3 trở thành Tổng Chỉ Huy Vận Tải đường sắt — Đối tác supply chain.
- Tô Thiên Tuyết — tiểu thư tộc Hoả Long lân bang (19t, Thiên Cấp Lực, đại tiểu thư), Phase 2 hôn nhân chính trị với MC — Love interest + đối tác cosmic Phase 3.

### ANTAGONISTS
- Tô Hoả Hùng — tộc trưởng Hoả Long lân bang (50t, Cao Cấp Hoả) — Đối thủ Phase 1 — Tham nuốt thung lũng Phong Linh; bị MC dùng súng hỏa mai đại bại trong cuộc tấn công ch.85.
- Vương Tử Phong — đại tướng quân Tử Vũ Vương Quốc (60t, Thiên Cấp Phong) — Đối thủ Phase 2 — Lo lắng về Liên Minh Công Nghiệp threat traditional order; bị MC face-slap khi đại quân Vương Quốc bị đường sắt + súng hỏa mai đánh bại.
- "Năng Lực Đạo Hội" — tổ chức Thiên Cấp truyền thống bảo vệ "natural order" — Đối thủ Phase 3 — Cosmic enemy chống industrial revolution.
- Cosmic Entity "Phong Linh Thần Vương" — entity cosmic Phase 4 — Sau khi MC reach cosmic-engineering tier, entity reveal MC là sứ giả "Industrial phần Thiên Đạo".

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Tộc Ngân Trảo + 3 production line đầu: Goal — Chiết muối Solvay (100 tấn/tháng) + Bessemer steel (50 tấn/tháng) + LED fishing (1000kg cá/ngày). Tộc 200 người no đủ + giàu lên. Đánh bại Hoả Long tộc lân bang. Milestone — Liên Minh 5 tộc lân bang (1000 dân tổng) ch.85. Stakes — Tộc tuyệt diệt nếu MC fail convince.
- PHASE 2 (Ch.100-300) — Liên Minh Công Nghiệp 50K dân + Tử Vũ Vương Quốc đối đầu: Goal — Quận Phong Linh 50K dân hợp nhất dưới MC, sản xuất công nghiệp chính thức, đường sắt hơi nước đầu tiên dị giới. Milestone — Đánh bại đại quân Tử Vũ tại trận Sông Phong (ch.250). Stakes — Năng Lực Đạo Hội huy động Thiên Cấp.
- PHASE 3 (Ch.300-600) — Đại Lục cấp Industrial Empire: Goal — MC liên minh + chinh phục 5/12 vương quốc dị giới, electricity + semiconductor + jet engine. Milestone — IPO "Phong Linh Industrial Corp" cosmic-tier (ch.450). Stakes — Năng Lực Đạo Hội + cosmic Phong Linh Thần Vương interfere.
- PHASE 4 (Ch.600-1000) — Cosmic Engineering Empire: Goal — Hợp nhất với "Engineering phần Thiên Đạo", trở thành cosmic-industrial architect cho dị giới. Endgame: MC chọn giữa cosmic life + về VN 2026 cứu vợ con đã chết tai nạn. Milestone — Cosmic reveal ch.900. Stakes — Thiên Đạo cũ muốn absorb.

### OPENING SCENE
- Location: Lò rèn cũ tộc Ngân Trảo tại thung lũng Phong Linh, 5 giờ sáng đầu xuân năm Phong Linh Lịch 7842, gió lạnh đầu hè + sương mù.
- MC hành động: Lê Quốc Bảo bừng tỉnh trên ghế gập trong lò rèn (đêm qua MC ngủ lại vì đang fix dụng cụ cho chú Trương Hoả Đại), đầu óc đột nhiên ngồn ngộn ký ức kiếp trước Việt Nam — 30 năm Lê Quốc Bảo, PhD Chemistry ETH Zurich, 8 năm VinFast EV Battery chief engineer, chết do tai nạn xưởng test solid-state battery. Bên ngoài lò rèn, em gái Lê Tuyết Mai (Trung Cấp Thủy) đang khóc: "Anh Bảo, bố vừa quay về từ tranh chấp với Hoả Long, mất thêm 5 mẫu ruộng. Tộc đói tới Tết!" Đột nhiên trong tâm trí Bảo bật lên giao diện UI ánh xanh-bạc: "Bind Hệ Thống Phong Linh Tri Thức thành công. Công Nghệ Khí: 50/50. Memory Library available: PhD Chemistry + VinFast supply chain. Sẵn sàng truy xuất?" Bảo focus đầu tiên: "Solvay process for sodium carbonate production from seawater."
- Hook event: UI hiện đầy đủ: NH3 catalyst + NaCl brine + CaCO3 → Na2CO3 + NH4Cl + CaCl2. Adaptation cho dị giới: "Thủy Sơ Cấp tạo brine 10kg/giờ, Hoả Trung Cấp duy trì 80°C reaction temp, Mộc Sơ Cấp grow limestone-rich vine, Kim Sơ Cấp shape reaction vessel." MC focus thêm: "Adapt for tộc Ngân Trảo current Thể Năng inventory." UI: "Em gái Mai (Trung Cấp Thủy) + chú Trương Hoả Đại (Trung Cấp Hoả) + dì Phạm Mộc Lan (Cao Cấp Mộc) — đủ để chiết 50kg muối tinh khiết/ngày, gấp 1000 lần dân chèo thuyền truyền thống." Bảo đứng dậy, vỗ vai em Mai: "Mai, anh có cách cứu tộc. Đi gọi chú Hoả Đại + dì Mộc Lan + bố tới đây."
- Câu mở đầu: "Trên Đại Lục Phong Linh này, mọi người sinh ra với siêu năng lực — nhưng không ai biết kết hợp năng lực với khoa học. Còn ta? Phàm Cấp với PhD Chemistry ETH Zurich + 8 năm VinFast EV Battery."

### WORLD RULES
- Hệ Thống Phong Linh Tri Thức là bí mật MC — chỉ em Mai + cha Tài + Tô Thiên Tuyết (Phase 2) biết.
- MC Phàm Cấp tuyệt đối — KHÔNG tu luyện Thể Năng cá nhân được. MC mạnh lên qua tộc nhân + production line.
- Mỗi production line cần đúng combination Thể Năng (Hoả + Thủy + Mộc + Kim) — không phải mỗi line đủ chỉ Hoả.
- Năng Lực Đạo Hội + cosmic entity Phong Linh Thần Vương coi industrial revolution là threat to natural order (Thể Năng).
- Cosmic reveal Phase 4: Memory Library MC là 1 mảnh "Engineering phần Thiên Đạo".

### TONE & ANTI-PATTERNS
- TONE: Engineer pragmatic 50% + ấm áp tộc nhân + community 25% + face-slap Thiên Cấp truyền thống 20% + cosmic Phase 4 5%. Pacing chậm chậm Phase 1 (build production lines) + nhanh trong combat (vũ khí công nghệ vs Thể Năng siêu). Tham khảo nhịp "Xuyên Việt Lãnh Chúa: Khai Cục Mở Mỏ Muối" (cùng category, đã tồn tại Phase Q).
- NEGATIVE SPACE:
  • KHÔNG là MC tu vi mạnh — MC Phàm Cấp, thắng bằng knowledge + tộc nhân.
  • KHÔNG hậu cung sa đà — Tô Thiên Tuyết vợ chính, 1-2 nữ phụ.
  • KHÔNG copy "Xuyên Việt Lãnh Chúa" lazy — DIFFERENCE là dị giới có superpower (Thể Năng) thay vì medieval Europe.
  • KHÔNG dùng knowledge lazy — mỗi production line cần execution thực, tốn time + materials + labor.
  • KHÔNG tu tiên kiểu cũ — MC "đột phá" bằng production line + Công Nghệ Khí harvest.
  • KHÔNG drama gia đình quá nhiều — focus vào build civilization + industrial revolution.
`,
    total_planned_chapters: 1000,
  },

  // ── 2. DỊ GIỚI MÔ PHỎNG KHÍ ──────────────────────────────────────────
  {
    title: 'Dị Giới Mô Phỏng Khí: Ta Có Thể Thử Trước Mọi Lựa Chọn',
    slug: 'di-gioi-mo-phong-khi-ta-co-the-thu-truoc-moi-lua-chon',
    genre: 'tien-hiep' as const,
    main_character: 'Tô Vân Phong',
    description:
      'Sinh viên kinh tế VN 24 tuổi Tô Vân Phong đột tử tại library Đại học Kinh Tế Hà Nội khi đang đọc paper "Reinforcement Learning Through Simulation" — tỉnh dậy thân phận đệ tử ngoại môn Vô Linh Tông 16 tuổi tại Đại Lục Vô Trần, dị giới tu tiên cổ điển. Vô Linh Tông là tiểu môn phái cấp huyện, Tô Vân Phong là thiên phú phế (tu vi Sơ Cảnh Sơ năm 16t = bình thường), bố mẹ đã mất, sống nương tựa môn phái. Trong tâm trí Phong đột nhiên bật lên UI: "Bind Hệ Thống Mô Phỏng Tử thành công. Input scenario, simulate 100-1,000,000 lần, output optimal path + step-by-step." Một trận giao đấu sắp tới với đệ tử Triệu Hoành (Sơ Cảnh Cao, hơn MC 2 cấp), thay vì panic, Phong focus vào UI: "Simulate combat với Triệu Hoành 100 lần. Output: optimal stance + counter-moves." 30 giây sau, UI return: "Run 100 simulations. Best win rate 73% với strategy A1: feint left, counter right-cross at second 2.4, then sweep low. Detailed step-by-step inside." Tô Vân Phong thắng trận đầu, sửng sốt cả phái. Mỗi cultivation breakthrough, mỗi đấu, mỗi negotiate đều simulate trước — từ đệ tử ngoại môn phế thành Vô Trần Thiên Tử trong 1000 chương, cuối cùng cosmic entity "Mô Phỏng Tổ" reveal MC là sứ giả thử nghiệm cosmic.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC đệ tử ngoại môn phế tỉnh dậy với golden finger "Mô Phỏng Tử" — input bất kỳ scenario (combat, cultivation breakthrough, đàm phán, đầu tư, mỹ nhân tâm), simulate 100-1M lần trong tâm trí (chỉ tốn vài giây real-time), output optimal path + step-by-step — Phong từ phế từ thắng đối thủ cao cấp, đột phá tu vi siêu nhanh, đàm phán + chính trị + chinh phục mỹ nhân — không một bước sai, vì mỗi quyết định đều đã simulate hàng triệu lần.
- Protagonist Engine: Tô Vân Phong thắng bằng nền tảng tư duy kinh tế + machine learning Việt Nam (sinh viên năm 3 Đại học Kinh Tế Hà Nội, nghiên cứu Reinforcement Learning + Monte Carlo simulation) + Hệ Thống Mô Phỏng Tử cosmic. Hắn không phải thiên tài tu vi — hắn là "Monte Carlo player": mỗi quyết định lớn input vào simulator, run 100K-1M scenarios, pick optimal. Trí tuệ và kiên nhẫn của MC > thiên phú tu vi.
- Pleasure Loop: MC face quyết định quan trọng (combat / breakthrough / negotiate) → focus simulator + tốn Mô Phỏng Khí (MPK) → simulate 100-1M lần trong 5-30s real-time → UI output optimal path với detailed step-by-step → MC execute chính xác → đối thủ ngạc nhiên + bystander sửng sốt + tu vi tăng / deal closed / mỹ nhân động lòng → MC face-slap đối thủ traditional thiên tài + simulator reveal MC là "Monte Carlo player" cosmic.
- System Mechanic: Hệ Thống Mô Phỏng Tử (Cosmic Monte Carlo Simulator). Input: MC mô tả scenario chi tiết trong tâm trí (vd: "Đấu với Triệu Hoành, hắn Sơ Cảnh Cao Kim hệ kiếm pháp, tôi Sơ Cảnh Sơ Thủy hệ tay không, sân đấu 30m² đất bằng phẳng, không có đạo cụ"). System hấp thụ 5-50 MPK tùy độ phức tạp + simulate 100-1,000,000 lần. Output trong tâm trí MC: optimal strategy + step-by-step actions + expected outcome + win probability. Simulation KHÔNG cho MC thực sự skills mới — chỉ knowledge về best path. MC vẫn phải execute chính xác (giới hạn skill cá nhân).
- Phase 1 Playground: Vô Linh Tông tại huyện Vô Trần (Đại Lục Vô Trần), 200 đệ tử, 5 vị Trúc Cơ trưởng lão. Khu sân đấu + thư phòng tu luyện + dược viên. MC vận hành simulator → 1 scenario/ngày → win + breakthrough + relationship build.
- Social Reactor: Sư phụ Lưu Bách Niên (Trúc Cơ Cao 80t, mentor MC, đầu tiên ngạc nhiên khi MC thắng Triệu Hoành ch.5), tiểu sư muội Lý Tuyết Linh (15t, Sơ Cảnh Sơ Mộc hệ — như MC nhưng tài năng cao hơn, là người đầu tiên tin MC), đại sư huynh Hoàng Vân Đoan (Trúc Cơ Sơ 25t, tài năng đỉnh nhất Vô Linh Tông, sau khi MC win battle ch.20 trở thành ally + đối tác chính trị), tông chủ Triệu Đại Lâm (Trúc Cơ Đại Viên 100t, công nhận MC là thiên tài thật ch.50), tiểu thư Diệp Băng Nhi (18t Trúc Cơ Sơ Thủy hệ tài năng S, mỹ nhân số 1 quận Vô Trần — sau Phase 2 hôn nhân chính trị với MC).
- Novelty Ladder: Ch.1-30 (Vô Linh Tông + Triệu Hoành combat + đột phá Sơ Cảnh Cao). Ch.30-80 (Quận Vô Trần đại hội + Trúc Cơ breakthrough + đệ tử nội môn). Ch.80-150 (Phủ Vô Trần + Kim Đan breakthrough + thành lập chi phái độc lập). Ch.150-300 (Châu Vô Trần + Nguyên Anh + đối đầu đại tông phái). Ch.300+ (Cosmic-tier simulator unlock thần thoại level).
- Control Rules: Payoff simulator success mỗi 2-3 chương (1 quyết định lớn execute optimal); payoff tu vi breakthrough mỗi 10-15 chương. Attention Gradient: Vô Linh Tông → huyện Vô Trần → quận → châu → đại lục → cosmic.

### BỐI CẢNH
Đại Lục Vô Trần — đại lục tu tiên cổ điển dị giới, văn minh 8000 năm. Hệ tu vi: Phàm Cảnh → Sơ Cảnh (Sơ-Trung-Hậu-Đại Viên) → Trung Cảnh → Hậu Thiên → Tiên Thiên → Trúc Cơ → Kim Đan → Nguyên Anh → Hoá Thần → Luyện Hư → Hợp Thể → Đại Thừa → Phi Thăng. Toàn châu có 8 đại tông phái (Vạn Pháp Tông, Thiên Linh Tông, Tử Vận Tông...) + 100+ tiểu môn phái + gia tộc.

Vô Linh Tông là tiểu môn phái cấp huyện, 200 đệ tử + 5 vị Trúc Cơ trưởng lão + tông chủ Triệu Đại Lâm (Trúc Cơ Đại Viên), tài sản: 1 ruộng linh hạng B (10 mẫu) + 1 hang động Vô Linh Sơn cấp Trung. Đệ tử chia ngoại môn (180 — Sơ Cảnh đa số) + nội môn (20 — Hậu Thiên trở lên).

MC Tô Vân Phong (kiếp này) là đệ tử ngoại môn tài năng phế — thiên phú tu vi cấp D (16t Sơ Cảnh Sơ là average), bố mẹ chết khi MC 5t, sống nương tựa Vô Linh Tông. Tu vi Thủy hệ tay không (không có ngự kiếm năng). Lý do MC chưa bị thải khỏi tông: sư phụ Lưu Bách Niên thấy MC hiền + kiên nhẫn, dù phế tu vi vẫn để học việc thư phòng.

MC kiếp trước Tô Vân Phong 24t là sinh viên năm 3 Đại học Kinh Tế Hà Nội, specialization Quantitative Finance + Machine Learning. Đang nghiên cứu paper "Reinforcement Learning through Monte Carlo Simulation in Trading" tại library — đột nhiên ngất xỉu cosmic + tỉnh dậy trong dị giới.

### NHÂN VẬT CHÍNH
- Tên: Tô Vân Phong
- Tuổi: 16 tuổi dị giới (kiếp trước 24t, sinh viên năm 3 Đại học Kinh Tế Hà Nội, Quantitative Finance + ML major, đột tử trong library khi đang đọc paper RL+MC simulation)
- Nghề/Trạng thái: Đệ tử ngoại môn Vô Linh Tông học việc thư phòng. Tu vi: Sơ Cảnh Sơ Thủy hệ tay không (average for 16t). Tài năng tu vi: cấp D (phế trong tông).
- Tài sản hiện tại: Một bộ áo đệ tử Vô Linh Tông cũ, một thanh kiếm sắt cấp Hạ phẩm (mượn từ thư phòng), 5 linh thạch cá nhân (chi phí ăn ở 1 tháng), 1 cuốn "Vô Linh Tâm Quyết" cấp Hoàng phẩm (công pháp căn bản Vô Linh Tông).
- Tính cách: Trầm tĩnh + lý trí cực độ (combo 4 năm Đại học Kinh Tế + ML mindset), kiên nhẫn (kiếp trước rèn luyện qua academic deadlines), không phô trương. Sau khi nhận golden finger, càng kín tiếng — biết sức mạnh simulator + KHÔNG để lộ. Hành động bằng kế hoạch dài hạn: 100K simulations trước mỗi quyết định lớn.
- Điểm yếu: Tu vi Sơ Cảnh Sơ — yếu nhất tông. Skill thực thi cá nhân chỉ ở mức 16t đệ tử ngoại môn (mặc dù simulator gợi optimal strategy, MC phải đủ skill để execute — vd: simulator nói "feint left tốc độ 5m/s rồi counter right-cross", nhưng nếu MC chỉ chạy được 3m/s thì không execute được). Phase 1 phải training body + skill để theo kịp simulator output.

### GOLDEN FINGER
- Tên hệ thống: Hệ Thống Mô Phỏng Tử (Cosmic Monte Carlo Simulator).
- Cơ chế hoạt động: Trong tâm trí MC có UI ánh xanh nhạt — Monte Carlo Engine. MC mô tả scenario chi tiết: actors (tu vi, hệ, sở trường), environment (không gian, tools, weather), constraints (time limit, items available), MC's goal (win combat / closed deal / breakthrough). System input + tốn 5-50 Mô Phỏng Khí (MPK) tùy độ phức tạp + simulate 100-1,000,000 lần trong 5-30 giây real-time. UI output: optimal strategy summary + step-by-step actions (timing, movement, dialogue), expected outcome, win probability, alternative strategies. Simulation KHÔNG cho MC skills mới — chỉ knowledge về best path.
- Trigger kích hoạt: MC khởi đầu 100 MPK. Mỗi simulation tốn 5-50 MPK; recharge 10 MPK/ngày. Mỗi quyết định execute optimal thành công tặng 10-100 MPK + tu vi/skill tăng nhẹ.
- Đường tăng trưởng cấp Mô Phỏng Khí (MPK):
  • L1 (ch.1-30): 100 MPK pool, simulate 100-1000 lần/scenario.
  • L2 (ch.30-80): 1000 MPK, simulate 10K-100K lần.
  • L3 (ch.80-150): 10K MPK, simulate 1M lần. Predict 1-week future.
  • L4 (ch.150-300): 100K MPK, simulate 100M lần. Predict 1-month future.
  • L5 (ch.300-500): 1M MPK, simulate cosmic-scale. Predict cosmic events.
  • L6 (ch.500-750): 10M MPK, simulate cross-universe.
  • L7 (ch.750-1000): Cosmic — hợp nhất với "Simulation phần Thiên Đạo".
- Điểm yếu: Simulator GIỚI HẠN BỞI MC's INPUT — nếu MC không biết thông tin về đối thủ (vd: hidden skill), simulator dùng default assumption → optimal có thể sai. Plus simulator dùng MPK cao — nếu cạn MPK trong combat → no advantage. MC cần training body + skill để execute (simulator gợi ý nhưng MC phải đủ ability thực thi).

### CAST CHÍNH
- Sư phụ Lưu Bách Niên — mentor MC (80t, Trúc Cơ Cao Vô Linh Tông) — Đầu tiên ngạc nhiên khi MC thắng Triệu Hoành ch.5, sau đó công nhận MC tiềm năng + chăm sóc — Mentor + chính trị ally.
- Lý Tuyết Linh — tiểu sư muội MC (15t, Sơ Cảnh Sơ Mộc hệ, Tài năng B+ cao hơn MC) — Đầu tiên tin MC + làm bạn — Cánh tay phải đầu tiên.
- Hoàng Vân Đoan — đại sư huynh MC (25t, Trúc Cơ Sơ, Tài năng A đỉnh Vô Linh Tông) — Sau khi MC win Triệu Hoành ch.5 + show talent ch.20, trở thành ally + đối tác chính trị — Đối tác chiến lược.
- Tông chủ Triệu Đại Lâm — Vô Linh Tông leader (100t, Trúc Cơ Đại Viên) — Sau khi MC win quận đại hội ch.50, công nhận MC là Phó Tông Chủ candidate — Cosmic mentor.
- Diệp Băng Nhi — tiểu thư đại tộc Diệp gia quận Vô Trần (18t, Trúc Cơ Sơ Thủy hệ, Tài năng S, mỹ nhân số 1 quận) — Phase 2 hôn nhân chính trị với MC (sau khi MC simulator-guided cứu mạng nàng ch.180) — Love interest chính + đối tác cosmic.
- Trương Tử Hằng — đối thủ trẻ thiên tài Vô Linh Tông (17t, Sơ Cảnh Cao Kim hệ kiếm pháp, Tài năng A đỉnh) — Sau khi bị MC win 3 lần Phase 1, trở thành ally + đệ tử của MC ch.80 — Đối tác võ lực.

### ANTAGONISTS
- Triệu Hoành — đệ tử ngoại môn cấp cao Vô Linh Tông (18t, Sơ Cảnh Cao Kim hệ kiếm pháp) — Đối thủ Phase 1 ch.5 — Bị MC simulator-guided counter-attack đại bại, mất uy tín ngoại môn.
- Cao Hồng Mai — đệ tử nội môn ác Vô Linh Tông (22t, Trúc Cơ Sơ Hoả hệ) — Đối thủ Phase 1-2 — Tham vọng kế thừa Phó Tông Chủ; bị MC simulator-guided lộ tội âm mưu sát hại đệ tử trẻ ch.65.
- Bạch Diệp Tiên — đại trưởng lão Tử Vận Tông (đại tông phái cấp châu, 200t, Hoá Thần Trung) — Đối thủ Phase 2-3 — Phát hiện MC có cosmic-tier potential, gửi assassin truy sát. Bị MC simulator-guided cosmic-counter Phase 3.
- "Mô Phỏng Tổ" — entity cosmic Phase 4 — Sau khi MC reach cosmic-tier simulator, entity reveal MC là experiment của "Simulation phần Thiên Đạo". Đối thủ cuối Phase 4.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Vô Linh Tông + huyện Vô Trần đại hội: Goal — MC thắng Triệu Hoành + Cao Hồng Mai, đột phá Sơ Cảnh Đại Viên, win đệ tử ngoại môn championship, trở thành đệ tử nội môn ch.50. Milestone — Quận Vô Trần đại hội đại bại 5 đệ tử Trúc Cơ Sơ (ch.85) — Vô Trần huyện champion. Stakes — Phế tu vi → có thể bị thải khỏi tông + lưu lạc.
- PHASE 2 (Ch.100-300) — Phủ Vô Trần + Trúc Cơ breakthrough + đối đầu Tử Vận Tông: Goal — MC Trúc Cơ Đại Viên + Kim Đan, kết hôn Diệp Băng Nhi, thành lập chi phái độc lập "Vô Linh Tử" tại Phủ Vô Trần. Milestone — Đại bại Bạch Diệp Tiên assassin team (ch.230). Stakes — Tử Vận Tông tổ chức tuần lễ tu sát.
- PHASE 3 (Ch.300-600) — Châu Vô Trần + Nguyên Anh + đại tông phái challenge: Goal — MC Nguyên Anh + Hoá Thần, chi phái Vô Linh Tử mở rộng 10 quận, đại bại Tử Vận Tông Bạch Diệp Tiên trong cosmic-tier duel. Milestone — "Vô Linh Tử" trở thành 1 trong 8 đại tông phái cấp châu (ch.450). Stakes — Cosmic entity Mô Phỏng Tổ start tracking MC.
- PHASE 4 (Ch.600-1000) — Cosmic Simulator Mastery + Thiên Đạo confrontation: Goal — MC hợp nhất với "Simulation phần Thiên Đạo", trở thành Cosmic Monte Carlo Architect. Endgame: MC chọn giữa cosmic life + về VN 2026 cứu vợ con đã chết tai nạn. Milestone — Cosmic reveal ch.900. Stakes — Mô Phỏng Tổ muốn absorb MC.

### OPENING SCENE
- Location: Thư phòng Vô Linh Tông cũ (8m² nhỏ), 5 giờ sáng đầu xuân năm Vô Trần Lịch 8642, ánh đèn dầu yếu trong căn buồng tối, mưa phùn đầu hè ngoài.
- MC hành động: Tô Vân Phong bừng tỉnh trên ghế gập (đêm qua MC ngủ lại thư phòng sau khi đọc sách binh pháp), đầu óc đột nhiên ngồn ngộn ký ức kiếp trước Việt Nam — 24 năm Tô Vân Phong, sinh viên năm 3 Đại học Kinh Tế Hà Nội, paper "Reinforcement Learning through Monte Carlo Simulation in Trading", đột tử cosmic trong library. Bên ngoài thư phòng, tiểu sư muội Lý Tuyết Linh đang lo lắng: "Sư huynh, lát nữa 10h là đấu với Triệu Hoành cấp Sơ Cảnh Cao Kim hệ kiếm pháp. Anh chỉ Sơ Cảnh Sơ Thủy hệ tay không, làm sao thắng???" Đột nhiên trong tâm trí Phong bật lên giao diện UI ánh xanh nhạt: "Bind Hệ Thống Mô Phỏng Tử thành công. Mô Phỏng Khí: 100/100. Sẵn sàng simulate scenario?"
- Hook event: Phong focus: "Simulate combat: Tôi Tô Vân Phong, Sơ Cảnh Sơ Thủy hệ tay không, vs Triệu Hoành Sơ Cảnh Cao Kim hệ kiếm pháp. Sân đấu Vô Linh Tông 30m² đất bằng phẳng, không tools, no time limit. Goal: tôi thắng." UI consume 30 MPK. Trong 30 giây real-time, UI run 100 simulations. Output: "Best strategy A1 (win rate 73%): feint left tốc độ 5m/s trong second 0-2, đối thủ counter right kiếm. Then sweep low với chân phải trong second 2.0-2.4. Đối thủ ngã. Counter water-shield + grapple. Win at second 4.5. Step-by-step inside." Phong sửng sốt 10 giây, sau đó mỉm cười: "Tuyết Linh, em không cần lo. Đi tới sân đấu." 10 giờ sáng, trên sân đấu Vô Linh Tông, trước mặt 50 đệ tử ngoại môn + 5 trưởng lão + sư phụ Lưu Bách Niên, Tô Vân Phong execute exactly theo Strategy A1. 4.5 giây sau, Triệu Hoành ngã xuống đất, kiếm đứt làm hai. Cả tông phái sửng sốt.
- Câu mở đầu: "Trên Đại Lục Vô Trần này, mọi người tu luyện 10 năm để đột phá 1 cảnh — và ta simulate 1 triệu scenario trong 30 giây."

### WORLD RULES
- Hệ Thống Mô Phỏng Tử là bí mật MC — chỉ Lý Tuyết Linh + Diệp Băng Nhi (Phase 2) + sư phụ Lưu Bách Niên (Phase 3) biết.
- Simulator GIỚI HẠN BỞI MC INPUT — không biết info về đối thủ → optimal có thể sai (hidden skills, ambush).
- MC PHẢI training body + skill để execute theo simulator output. Simulator gợi ý nhưng MC vẫn cần ability.
- Mỗi simulation tốn MPK — không thể infinite use. Combat dài → cạn MPK → no advantage.
- Cosmic reveal Phase 4: Mô Phỏng Khí là 1 mảnh "Simulation phần Thiên Đạo".

### TONE & ANTI-PATTERNS
- TONE: Lý trí + chiến lược 50% + tu tiên slice-of-life 25% + face-slap thiên tài truyền thống 20% + cosmic Phase 4 5%. Pacing slow + careful (mỗi quyết định lớn MC simulate trước). Tham khảo nhịp 《我可以模拟亿万次》《永生从模拟开始》《模拟修仙：从筑基开始》.
- NEGATIVE SPACE:
  • KHÔNG là MC tu vi mạnh — MC tu vi yếu nhất, thắng bằng simulator + execution.
  • KHÔNG hậu cung sa đà — Diệp Băng Nhi vợ chính, 1-2 nữ phụ.
  • KHÔNG dùng simulator lazy — mỗi simulation cần input chi tiết + MPK cost + MC vẫn phải execute.
  • KHÔNG bypass training — MC cần body training + skill practice để theo kịp simulator gợi ý.
  • KHÔNG drama tu vi cố ý — MC đột phá vì simulator-guided optimal training, KHÔNG vì plot armor.
  • KHÔNG cosmic reveal sớm — Mô Phỏng Tổ chỉ xuất hiện Phase 4.
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
  console.log(`  Uplift + Simulator duo spawn  ${apply ? '[APPLY]' : '[DRY RUN]'}`);
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
