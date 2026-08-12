/**
 * Spawn 2 novels theo công thức Daily Divination (Mỗi Ngày Một Quẻ).
 *
 * Research base (TQ hot 2024-2025):
 *   - 《乱世荒年：我每日一卦粮肉满仓》 (cổ đại loạn thế + daily quẻ)
 *   - 《70年代：带着户口去下乡》 (TQ 70s nông thôn + system)
 *   - 《六零极品老太》 (TQ 60s + trọng sinh)
 *
 * Cốt lõi: MC nam, đại ca đại gia đình 3 đời 10-15 người, mỗi sáng tỉnh có
 * 1 dòng text trong đầu chỉ chỗ tìm thức ăn/tài nguyên/né nguy hiểm, nuôi
 * cả nhà từ đói khổ → ấm no → thế lực dần dần hình thành.
 *
 * Hai bộ user yêu cầu:
 *   1. Dị giới hoàn toàn (Đại Lục Hoa Hạ, mô phỏng TQ cổ phong, KHÔNG lịch sử thực)
 *   2. VN bao cấp 1978-1986 (Hà An hư cấu, KHÔNG tên thật cán bộ/địa danh chính trị)
 *
 * Cron pickup tự động via `production_enabled=true`.
 *
 * Run dry: `npx tsx scripts/spawn-daily-divination-duo.ts`
 * Apply:   `npx tsx scripts/spawn-daily-divination-duo.ts --apply`
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
  // ── 1. DỊ GIỚI HOA HẠ ───────────────────────────────────────────────
  {
    title: 'Đại Ca Xuyên Việt: Mỗi Ngày Một Quẻ Nuôi Đại Gia Đình',
    slug: 'dai-ca-xuyen-viet-moi-ngay-mot-que-nuoi-dai-gia-dinh',
    genre: 'dong-nhan' as const,
    main_character: 'Hà Vĩnh Phong',
    description:
      'Quản lý nhà hàng Việt 22 tuổi Hà Vĩnh Phong tử vong vì tai nạn xe lúc về quê đón Tết — mở mắt xuyên thành đại tôn Hà thị tại thôn Thanh Phong, đại lục Hoa Hạ. Hà thị mười hai miệng ăn đói lả, vụ mùa thất bát hai năm liền, sơn tặc Hắc Phong Trại lùng cướp gạo từng đêm, tham quan huyện Đông An siết thuế kiệt cùng. Mỗi sáng năm giờ, trong đầu Phong vang lên một dòng quẻ: hướng đi, vật phẩm, kết quả — Thiên Cơ Nhất Quẻ. Từ thỏ rừng cứu bữa cơm cháo, đến nội đan sói tăng khí huyết, từ mỏ vàng cũ giấu trong hang đá đến binh thư cổ trong mộ Sĩ tướng — Phong dùng quẻ nuôi cả nhà, kết nghĩa anh em, mở tiệm bói toán, dấy quân tự vệ. Bao chú út tham, cô út bòn rút, sơn tặc bao vây và tham quan vòi tiền cũng đều bị một đứa cháu trưởng lì lợm và một bộ quẻ thần kỳ đè bẹp.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC từ một cháu trưởng đói rách bị chú thím khinh rẻ, từng ngày dùng quẻ bói tìm được tài nguyên cụ thể (lương thực, vàng, đồ cổ, manh mối tham quan), nuôi cả đại gia đình ấm no và biến mười hai người Hà thị thành nền móng cho một thế lực địa phương ngày càng lớn.
- Protagonist Engine: Hà Vĩnh Phong thắng bằng kỷ luật theo quẻ + tư duy quản lý nhà hàng kiếp trước (lên kế hoạch chuỗi cung ứng, phân công công việc rõ ràng, đầu tư tái sản xuất). Anh không phải thiên tài võ đạo — anh là nhà tổ chức biến mỗi tài nguyên quẻ chỉ ra thành đòn bẩy kinh tế cho cả nhà.
- Pleasure Loop: Quẻ buổi sáng chỉ đường → Phong đi theo, tìm được tài nguyên cụ thể (thịt, vàng, đan dược, manh mối) → mang về nhà nấu một bữa cơm ấm cúng + một thành viên gia đình tin tưởng anh hơn → kẻ ác (chú út, sơn tặc, hàng xóm xấu) bị face-slap vì khinh thường → vòng lặp ngày kế lặp lại với tài nguyên lớn hơn.
- System Mechanic: Thiên Cơ Nhất Quẻ. Input: giấc ngủ đêm + tâm trí MC tỉnh táo lúc 5 giờ sáng. Output: một dòng text instruction Việt ngữ trong tâm trí ("Hôm nay Sửu thời đi Đông Nam 5 dặm, gặp cây sồi cổ, sẽ tìm thấy hang sói chết, lấy 2 đùi sói tươi và 1 viên nội đan tăng khí huyết"). Limit: 1 quẻ/ngày Phase 1, MISS nếu lệch giờ; mỗi level up + 1 quẻ. Reward: tài nguyên cụ thể (lương thực, vàng, đan dược, vật phẩm) + 1 điểm Khí Vận khi giúp được người khác.
- Phase 1 Playground: nhà gỗ ba gian Hà thị, ruộng cạn hai mẫu, rừng Tây Bắc thôn Thanh Phong, chợ huyện Đông An ba mươi dặm. Phong vận hành quẻ → tài nguyên → cơm cháo → tin tưởng gia đình → mở rộng dần.
- Social Reactor: Bà nội Lý thị (người duy nhất tin Phong sớm), mẹ Triệu Thị Mai (rơi nước mắt khi bữa cơm thứ ba có thịt), em trai Hà Vĩnh Hưng (theo Phong từng bước), thợ săn lão Phương (chứng nhận quẻ thật), trưởng thôn Lưu Bá (bắt đầu trọng dụng Phong), khách qua đường chợ Đông An (lan tin "thằng Phong nhà họ Hà có tài bói").
- Novelty Ladder: Ch.1-30 (Quẻ tìm lương thực + đan dược trong rừng, đại gia đình no đủ). Ch.30-80 (Quẻ tìm vàng + đồ cổ + manh mối tham quan, mở tiệm săn + tiệm bói nhỏ). Ch.80-150 (Quẻ về người + thời tiết, đánh bại Hắc Phong Trại). Ch.150-300 (Bói cho khách phương xa, kết nghĩa anh em, dấy quân tự vệ năm trăm người).
- Control Rules: Payoff vật chất mỗi 2-3 chương (một tài nguyên cụ thể từ quẻ); payoff xã hội mỗi arc 15-20 chương (một thành viên gia đình hoàn toàn tin Phong, hoặc một đối thủ bị đánh bại trước cộng đồng). Attention Gradient: bắt đầu trong gia đình mười hai người → thôn Thanh Phong → chợ huyện Đông An → phủ Vĩnh Châu → kinh đô.

### BỐI CẢNH
Đại lục Hoa Hạ — đại lục cổ phong mô phỏng Trung Hoa cổ đại nông thôn, hệ tu vi sơ khai (võ giả luyện khí huyết, ít người vượt cảnh giới Hậu Thiên), thuốc bắc + đan dược + nội đan thú rừng là chủ lưu. Triều đình Đại Nguyên đã suy yếu sau ba mươi năm chiến tranh Hắc Sơn Vương vs Bạch Thiên Triều, hiện do tiểu hoàng đế tám tuổi nhiếp chính bởi quyền thần. Mỗi tỉnh tự trị, tham quan hoành hành, sơn tặc ba phần đất, nạn đói lan đến vùng đồng bằng. Tiền tệ: đồng văn → quan bạc → quan vàng → đỉnh vàng. Một quan bạc đổi được hai gánh gạo. Một viên nội đan thú rừng cấp ba đổi được năm quan bạc — đủ nuôi gia đình mười người trong nửa tháng.

Thôn Thanh Phong nằm ven sông Vĩnh Bình, ba mươi dặm phía Đông Nam huyện Đông An, năm trăm dân, có ba họ chính (Hà, Lưu, Phương). Đất rừng phía Tây Bắc còn nhiều thú dữ, mỏ khoáng cổ chưa khai thác. Hắc Phong Trại — sơn trại ba mươi tay sát thủ cách thôn ba mươi km về phía Bắc — đêm nào cũng có thể đột kích cướp gạo. Tham tri huyện Đông An Vương Sách thu thuế gấp ba lệ thường, ai phản kháng thì bị quy tội mưu phản.

### NHÂN VẬT CHÍNH
- Tên: Hà Vĩnh Phong
- Tuổi: 22 tuổi (kiếp trước cũng 22 tuổi, quản lý nhà hàng phở Việt tại Hà Nội kiếp trước)
- Nghề/Trạng thái: Đại tôn Hà thị, con cả Hà Văn Trường — thân phận chính thức là người kế thừa gia đình, nhưng thực tế bị chú út lấn quyền vì Phong mới ốm sốt nặng vừa khỏi.
- Tài sản hiện tại: Năm đồng tiền cọc cuối nhà, một mảnh ruộng cạn hai mẫu, ngôi nhà gỗ ba gian dột nát, một cây cung gỗ tự đẽo, một con dao đi rừng cũ. Cả nhà mười hai người, gạo còn nửa thúng, đói triền miên hai tháng.
- Tính cách: Thực dụng + lạnh đầu, kỷ luật theo quẻ tuyệt đối, bảo vệ gia đình kịch liệt, không tin người ngoài dễ dàng. Kiếp trước rèn được tư duy quản lý chuỗi cung ứng nhà hàng — biết tổ chức và phân công công việc.
- Điểm yếu: Thể chất kiếp trước văn phòng, chưa biết võ — phải mất ba mươi chương đầu mới rèn được cánh tay cầm cung không run. Phụ thuộc hoàn toàn vào quẻ + bố trí mai phục + sự giúp đỡ của em trai và thợ săn lão Phương.

### GOLDEN FINGER
- Tên hệ thống: Thiên Cơ Nhất Quẻ.
- Cơ chế hoạt động: Mỗi sáng năm giờ (Sửu thời cuối — Dần thời đầu), MC bừng tỉnh và trong tâm trí xuất hiện một dòng text Việt ngữ kiểu instruction: hướng đi, khoảng cách, vật mốc, hành động, kết quả. Quẻ luôn chính xác về tài nguyên nhưng KHÔNG giải thích lý do — MC phải tự xác định cách tận dụng.
- Trigger kích hoạt: Quẻ tự refresh mỗi 5 giờ sáng. Một số quẻ có thời hạn cụ thể trong ngày (Tỵ thời, Mùi thời) — MISS nếu đến muộn.
- Đường tăng trưởng: Level 1 (1 quẻ/ngày, resource đơn giản) → Level 2 (2 quẻ/ngày + quẻ về người) → Level 3 (3 quẻ/ngày + quẻ thời tiết + chiến sự) → Level 4 (bói cho người khác, mở tiệm) → Level 5 (quẻ tuần) → Level 6 (quẻ tháng + tài chính chính trị) → Level 7 (quẻ vận quốc gia, cosmic reveal).
- Điểm yếu: Mỗi level up cần MC giúp được ≥1 người (gia đình hoặc dân thôn) hoàn thành lời quẻ trước đó. Nếu MC ích kỷ chỉ dùng quẻ cho mình → khoá cấp; mỗi quẻ MISS (lệch giờ) trừ 1 điểm Khí Vận, ba lần MISS liên tiếp → mất quẻ 1 ngày.
- Bí mật MC: Thiên Cơ Nhất Quẻ thực ra là một mảnh "Thiên Mệnh Sổ" của Nguyên Thuỷ Thiên Tôn ban tặng — Phong là "khí vận chi tử" cấp vũ trụ, được chọn để dẫn dắt một thời đại loạn lạc đi vào ổn định. Không tiết lộ trước Phase 4.

### CAST CHÍNH
- Hà Đại Sơn — ông nội MC (65t), từng là lính cũ thời chiến, già yếu nhưng còn nhớ võ căn — Người dẫn dắt — Sẽ là người chính thức trao quyền gia đình cho Phong khi thấy thằng cháu trưởng lì lợm này thật sự gánh được.
- Lý Thị — bà nội MC (62t), hiền lành, là người DUY NHẤT trong nhà tin Phong từ chương 1 vì bà mơ thấy giấc mơ tổ tiên trước khi Phong tỉnh dậy — Đồng minh cốt lõi — Lén tiếp tế MC vài đồng tiền giấu trong áo gối.
- Triệu Thị Mai — mẹ MC (40t), đảm đang, lo từng bát cháo cho mười hai người — Tin Phong từ chương 5 khi MC mang về hai con thỏ rừng — Cảm xúc trung tâm của truyện.
- Hà Vĩnh Hưng — em trai MC (18t), thông minh nhưng thể chất yếu, từng học chữ ba năm với thầy đồ làng — Cánh tay phải — Người ghi sổ chi tiêu + quản lý kho lương thực cho Phong.
- Phương Lão — thợ săn 50 tuổi cùng thôn, kỹ năng săn cao thủ — Cố vấn quân sự — Người dạy Phong cách bố trí bẫy + bắn cung + đọc dấu vết thú rừng. Chứng nhận quẻ Phong thật sau lần đầu đi tìm hang sói.
- Lưu Bá — trưởng thôn Thanh Phong (55t), trung tính, biết nhìn xa — Đối tác chính trị — Bắt đầu trọng dụng Phong khi anh giúp thôn đẩy lui sơn tặc.

### ANTAGONISTS
- Hà Văn Lương — chú út MC (35t), tham + ích kỷ, định bán Phong làm thuê khi thấy cháu ốm sốt nặng — Đối thủ trong nhà — Sẽ bị Phong dùng quẻ phơi bày tội lừa tiền tiết kiệm của ông bà chương 30, mất uy tín trong gia đình.
- Lưu Thị — vợ chú út (32t), miệng độc, ganh tị mẹ MC, hay xúi giục cô út về bòn rút — Đối thủ phụ — Bị Phong cô lập về kinh tế khi mẹ MC nắm quỹ gia đình lại.
- Trại chủ Hắc Phong Trại "Vương Bát Đao" (40t, võ giả Trung Cảnh) — Đối thủ ngoại — Đêm nào cũng có thể xuống cướp gạo, đến cuối Phase 1 bị Phong dùng quẻ chỉ điểm mai phục cùng dân thôn đánh bại.
- Tham tri huyện Đông An Vương Sách — Đối thủ chính trị Phase 2 — Thu thuế ba lần lệ thường, quy tội nông dân phản kháng, cuối cùng bị Phong dùng quẻ tìm được manh mối hối lộ + báo lên đốc phủ.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Thôn Thanh Phong, nuôi sống đại gia đình: Goal — Mười hai người Hà thị no đủ, không còn đói; Phong chính thức được ông nội trao quyền gia đình thay bố. Milestone — Đánh bại Hắc Phong Trại trong trận mai phục dân thôn (ch.85). Stakes — Cả gia đình mất ăn nếu Phong thất bại; chú út bán Phong làm thuê chương 1.
- PHASE 2 (Ch.100-300) — Huyện Đông An, dựng thế lực địa phương: Goal — Mở tiệm săn + tiệm bói + xưởng đồ sắt nhỏ, kết nghĩa anh em năm thanh niên thôn, đẩy lui tham tri huyện. Milestone — Mở tiệm bói chính thức tại chợ Đông An (ch.180), thu phí bằng vàng + lương thực + thông tin. Stakes — Tham tri ép thuế gấp ba; nếu mất tiệm, gia đình mất nguồn thu.
- PHASE 3 (Ch.300-600) — Phủ Vĩnh Châu, lên chính trường địa phương: Goal — Phong làm Lý chính thôn → Đình trưởng → Huyện uý, xây thương đội + quân tự vệ năm trăm người. Milestone — Đánh bại Hắc Sơn Vương sót lại tại trận Sông Vĩnh Bình (ch.480). Stakes — Triều đình nghi Phong mưu phản, có thể bắt cả họ.
- PHASE 4 (Ch.600-1000) — Cosmic reveal + thống nhất loạn thế: Goal — Thiên Mệnh Sổ kích hoạt full power, Phong dấy nghĩa quân thống nhất Đại Nguyên, lên ngôi Khai Quốc Hoàng Đế (hoặc Cộng Hoà Hoa Hạ). Milestone — Diệt quyền thần kinh đô (ch.850). Stakes — Phong cần chọn giữa ngôi vua + quay về Việt Nam kiếp trước cứu vợ chưa cưới Phạm Thu Hương.

### OPENING SCENE
- Location: Buồng phòng nhà gỗ ba gian Hà thị tại thôn Thanh Phong, năm giờ sáng, ánh đèn dầu leo lét trong căn buồng tối, mưa phùn đầu đông.
- MC hành động: Hà Vĩnh Phong bừng tỉnh, đầu óc còn quay cuồng vì ký ức kiếp trước Việt Nam vừa nhập với thân xác này. Bên ngoài cửa buồng, vợ chú út Lưu Thị đang lớn tiếng với bố Phong "Tên Phong nhà này đã ốm hai tháng, anh không nuôi nổi thì bán quách nó đi cho hộ Tống làm thuê ba năm lấy mười quan bạc". Đúng lúc đó, trong tâm trí Phong xuất hiện một dòng text Việt ngữ rõ ràng: "Hôm nay Mão thời (5-7h sáng) đi về hướng Đông Nam ba dặm, vượt sông Vĩnh Bình tại bến đá cũ, đến gốc cây sồi đôi, sẽ tìm thấy hai con thỏ rừng đang mắc bẫy cũ của thợ săn — thịt đủ một bữa cơm trưa cho mười hai người Hà thị".
- Hook event: Phong lặng lẽ tụt khỏi giường, mặc áo cũ rách, lấy con dao đi rừng và cây cung gỗ. Bà nội Lý Thị nhìn anh từ buồng kế, lén dúi vào tay anh nửa nắm xôi hôm qua bà giấu lại: "Phong ơi, cố lên, bà mơ thấy tổ tiên hôm qua". Phong nắm chặt nửa nắm xôi, đi ra mưa phùn lúc trời chưa sáng. Sáu tiếng sau, anh trở về với hai con thỏ rừng đầu tiên — bữa cơm trưa Hà thị có thịt sau hai tháng đói.
- Câu mở đầu: "Ở thời đại này, gạo còn quý hơn vàng, và quẻ của ta sẽ là cái cào sắt kéo cả mười hai miệng ăn nhà họ Hà ra khỏi vực đói."

### WORLD RULES
- Quẻ Thiên Cơ Nhất Quẻ là bí mật tuyệt đối — Phong giấu kín, chỉ giả vờ "có duyên với thợ săn lão Phương dạy cách tìm thú".
- Hệ tu vi sơ khai: võ giả luyện khí huyết (Hậu Thiên → Tiên Thiên → Trung Cảnh → Đại Cảnh → Tông Sư) — Phong Phase 1 chỉ là phàm nhân, cuối Phase 2 mới đạt Hậu Thiên.
- Nội đan thú rừng cấp ba trở lên có thể đổi tiền lớn ở chợ huyện — đây là chuỗi tiền chính của Phong giai đoạn đầu.
- Tham quan triều đình suy đồi: ba mươi phần trăm thu nhập của Phong phải đi cống cho cán bộ địa phương để tránh tội mưu phản.
- Cosmic reveal trong Phase 4: Đại Nguyên thực ra là một mảnh nhỏ của Thiên Cộng Đồng Văn Minh — Phong là sứ giả khai sáng được Nguyên Thuỷ Thiên Tôn chọn.

### TONE & ANTI-PATTERNS
- TONE: Ấm áp gia đình 60% + thực dụng quản lý 30% + máu lạnh face-slap 10%. Pacing chậm rãi, ít drama lớn, nhiều bữa cơm cảm động. Tham khảo nhịp 《乱世荒年：我每日一卦粮肉满仓》.
- NEGATIVE SPACE:
  • KHÔNG tu tiên theo lối cũ: Phong không ngồi thiền — anh trồng rau, săn thú, đi chợ, mở tiệm bói. Tu vi tăng từ quẻ Khí Vận tích luỹ.
  • KHÔNG hậu cung sa đà: Phong có thể có một bạn gái duy nhất (cô gái thợ săn Phương gia hoặc tiểu thư huyện uý), không quá ba người. Tình cảm phụ thuộc kinh tế gia đình.
  • KHÔNG ngược: cả nhà mười hai người đều phải có ít nhất một moment ấm cúng mỗi 10-15 chương; chú út tham nhưng KHÔNG đánh đập tàn bạo.
  • KHÔNG dùng quẻ giải mọi vấn đề: Phong phải tự đối phó với 50% tình huống bằng kinh nghiệm quản lý + sức người — quẻ chỉ là gợi ý không phải nút "auto win".
`,
    total_planned_chapters: 1000,
  },

  // ── 2. VN BAO CẤP (THẬN TRỌNG CHÍNH TRỊ) ─────────────────────────────
  {
    title: 'Đại Ca Bao Cấp: Mỗi Ngày Một Quẻ, Cả Nhà Đầy Cơm',
    slug: 'dai-ca-bao-cap-moi-ngay-mot-que-ca-nha-day-com',
    genre: 'do-thi' as const,
    main_character: 'Lê Quang Khôi',
    description:
      'Quản lý logistic cảng container Phương Nam 2026 Lê Minh Khôi đột quỵ chết khi tăng ca đêm — mở mắt thấy mình trẻ lại hai mươi lăm tuổi, năm 1978, thân phận Lê Quang Khôi, kỹ sư cơ khí mới ra trường ở thị xã Hà An vùng đồng bằng Bắc Bộ. Khu tập thể bốn tầng dồn mười hai miệng ăn Lê thị, gạo phải bốc thăm, thịt nửa lạng mỗi đầu người tem phiếu, chú út chạy chợ trời tham phần ăn của trẻ con. Mỗi sáng năm giờ, trong giấc mơ Khôi nghe vọng một dòng chữ chỉ rõ: chợ nào có món gì, ai bán tem dư, ông lão nào giấu vàng cũ trong đồng hồ hỏng — Mộng Mị Thiên Thư. Cộng với ký ức kiếp trước biết rõ Việt Nam sẽ giàu lên như thế nào sau đổi mới, Khôi từ kỹ sư trẻ con của tem phiếu trở thành ông trùm xưởng tư + đầu nậu vàng + tỷ phú đầu tiên thị xã, kéo cả đại gia đình Lê thị từ căn hộ bốn mươi lăm mét vuông lên biệt thự ba tầng.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC kỹ sư trẻ vô danh ở thời bao cấp đói khát, mỗi sáng nhận một dòng chỉ dẫn chính xác về chợ trời, hàng độc, vàng cũ, tem phiếu dư — biến mỗi mẩu thông tin thành tài sản cụ thể, kéo cả đại gia đình mười hai miệng ăn từ căn hộ bốn mươi lăm mét vuông đói triền miên lên biệt thự ba tầng giàu có, đồng thời face-slap chú út tham, hàng xóm xấu, cán bộ vòi tiền.
- Protagonist Engine: Lê Quang Khôi thắng bằng combo độc đáo: ký ức kiếp trước biết rõ Việt Nam giàu lên sau đổi mới (BĐS, ngoại thương, xưởng tư nhân) + Mộng Mị Thiên Thư chỉ điểm cụ thể từng món hàng. Anh là nhà quản lý chuỗi cung ứng đẳng cấp 2026, áp dụng tư duy logistic hiện đại vào kinh tế thị xã 1978.
- Pleasure Loop: Mộng đêm chỉ chợ + món + giá → Khôi đi mua đúng giờ, thường xuyên trúng vàng cũ + đồ cổ + tem phiếu dư → mang về nhà cải thiện bữa cơm + tích trữ vàng nhẫn → kẻ ác (chú út, hàng xóm xấu, cán bộ vòi tiền) bị làm bẽ mặt → tiền vàng tích nhiều hơn cho ngày kế.
- System Mechanic: Mộng Mị Thiên Thư. Input: giấc ngủ đêm + tâm trí Khôi rời khỏi công việc đêm khuya. Output: một dòng text Việt ngữ trong đầu lúc 5 giờ sáng ("Hôm nay 14h tại chợ Bích Hà, gian số 47 có ông lão bán đồng hồ Pôljốt hỏng, mua 5 đồng, mở nắp có 3 chỉ vàng 9999 dấu, chứng minh thư bên cạnh không quan trọng"). Limit: 1 quẻ/ngày Phase 1, MISS nếu lệch giờ; mỗi level up + 1 quẻ. Reward: thông tin hàng độc + định giá chính xác.
- Phase 1 Playground: Căn hộ tập thể bốn tầng phố Quan Đào (hư cấu) thị xã Hà An, Nhà máy Cơ khí Quang Trung (hư cấu) cách nhà 1 km, chợ trời chợ Bích Hà sáng nào cũng đông, lán xưởng cơ khí thuê góc kho cũ. Khôi vận hành quẻ → thông tin → mua hàng → vàng → tích trữ.
- Social Reactor: Mẹ Trần Thị Lan (người tin Khôi sớm nhất), em gái Lê Quỳnh Anh (thần tượng anh sau khi anh kéo cả nhà ra khỏi đói), thằng bạn cùng phòng kỹ sư Vũ Đăng Hùng (đồng minh kinh doanh), bà chợ trời Ngô Tâm (đối tác bí mật buôn vàng), tổ trưởng dân phố ông Lý Bá (chứng nhận Khôi không buôn lậu).
- Novelty Ladder: Ch.1-30 (Mua tem phiếu dư + tích trữ gạo thịt + lùng vàng nhẫn cũ chợ trời). Ch.30-80 (Mở lán xưởng cơ khí gia công đồ gia dụng, kết nghĩa anh em 3-5 doanh nhân trẻ). Ch.80-150 (Buôn đồ cổ + vàng quy mô lớn, đối đầu cán bộ vòi tiền). Ch.150-300 (Mở xưởng tư nhân chính thức sau đổi mới, vào Phương Nam (đô thị hư cấu phía Nam) mở chi nhánh đầu tiên).
- Control Rules: Payoff vật chất mỗi 2-3 chương (một món hàng cụ thể từ mộng); payoff xã hội mỗi arc 15-20 chương (một thành viên gia đình hoàn toàn tin Khôi, hoặc một đối thủ bị đánh bại trước cộng đồng). Attention Gradient: nội bộ căn hộ 45m² → khu tập thể → chợ Bích Hà → thị xã Hà An → vào Phương Nam và lên tầm quốc gia ngầm.

### BỐI CẢNH
Thời đại bao cấp Việt Nam hư cấu, năm 1978 sau cải cách hành chính ba năm, kinh tế khan hiếm cực độ. Tất cả địa danh trong truyện là HƯ CẤU HOÀN TOÀN — không tương ứng với bất kỳ thành phố, quận, phường, phố thực tế nào của Việt Nam. Bối cảnh chính: thị xã Hà An (hư cấu) thuộc tỉnh Hà Vũ (hư cấu) ở vùng đồng bằng Bắc Bộ chung. Thành phố Phương Nam (hư cấu) ở miền Nam. Cảng Vĩnh Hoà (hư cấu) ven biển Bắc Bộ.

Tem phiếu lương thực hàng tháng: 13 kg gạo + 0.5 kg thịt + 0.3 kg đường + 5 lít dầu hoả + 2 m vải / đầu người làm việc nhà nước. Trẻ con + người già nửa định mức. Mua thêm phải vào chợ đen với giá gấp 3-5 lần. Vàng nhẫn cũ + đồng hồ cũ + đồ cổ thanh lý nhà cũ là kênh tích trữ chính của dân thường. Cán bộ địa phương (chỉ dùng từ chung "tổ dân phố", "phường", "khu phố", "cán bộ địa bàn") đôi khi vòi tiền lót tay nhưng không quá khắc nghiệt nếu khéo léo.

Cả nhà Lê thị mười hai miệng ăn sống chen chúc trong căn hộ tập thể số 12B tầng 3 toà nhà B5 khu Đông Nam thị xã Hà An. Phòng khách + ba phòng ngủ + bếp chung tổng 45 m². Mỗi đêm trải chiếu xuống sàn — ba thế hệ: ông bà + bố mẹ + chú thím + năm con cháu.

### NHÂN VẬT CHÍNH
- Tên: Lê Quang Khôi
- Tuổi: 25 tuổi (kiếp trước Lê Minh Khôi 53 tuổi, quản lý logistic cảng container Phương Nam đột quỵ chết năm 2026)
- Nghề/Trạng thái: Kỹ sư cơ khí mới tốt nghiệp Đại học Bách Khoa (hư cấu — không gắn với trường thực tế), làm việc tại Nhà máy Cơ khí Quang Trung (hư cấu) thị xã Hà An, lương 60 đồng/tháng + 13 kg gạo tem phiếu.
- Tài sản hiện tại: Một xe đạp Phượng Hoàng cũ, một bộ đồ kỹ sư xanh, 15 đồng tiền tiết kiệm, một ngăn tủ con riêng trong phòng ngủ chung với em trai. Cả nhà mười hai người sống cảnh đói triền miên.
- Tính cách: Trầm tĩnh + thực dụng + lý trí cực độ (combo 28 năm tu luyện logistic kiếp trước + tâm lý kỹ sư trẻ), bảo vệ gia đình tuyệt đối, không kết bạn dễ dàng. Hành động bằng kế hoạch dài hạn, từng bước có tính toán.
- Điểm yếu: Thân thể 25 tuổi yếu (kiếp trước chết ốm vì tăng ca), chưa quen lao động chân tay; phải mất nhiều chương đầu mới rèn được sức bền đạp xe đi chợ trời. Vào năm 1978 chưa có công cụ tài chính hiện đại — Khôi phải giấu vàng nhẫn trong tường gạch.

### GOLDEN FINGER
- Tên hệ thống: Mộng Mị Thiên Thư.
- Cơ chế hoạt động: Mỗi sáng năm giờ Khôi tỉnh dậy từ giấc mơ với một dòng text Việt ngữ rõ ràng trong đầu — chỉ chính xác địa điểm (chợ nào, gian số mấy), người (ông lão, bà cụ, anh thanh niên), món hàng (đồng hồ Pôljốt, nhẫn vàng, vải kaki, vé số), giá (3-50 đồng), kết quả (mở ra có vàng / tem dư / vé trúng / đồ cổ giá trị). Quẻ KHÔNG giải thích lý do — Khôi phải tự suy luận cách tiếp cận khéo léo (không giật mình bán quá vội để tránh nghi ngờ).
- Trigger kích hoạt: Tự refresh mỗi 5 giờ sáng. Mỗi quẻ có thời hạn cụ thể trong ngày — MISS nếu đến muộn.
- Đường tăng trưởng: Level 1 (1 quẻ/ngày, hàng tiêu dùng nhỏ + tem phiếu dư) → Level 2 (2 quẻ/ngày + vàng nhẫn cũ + đồ cổ chợ trời) → Level 3 (quẻ về người - đoán động cơ + ý đồ) → Level 4 (3 quẻ/ngày + quẻ kinh doanh - đầu tư xưởng tư nhân sau đổi mới) → Level 5 (quẻ về thời sự lớn - cải cách giá lương, đổi tiền, đổi mới) → Level 6 (bói cho khách lớn - ngân hàng, doanh nhân) → Level 7 (cosmic - mệnh quốc gia, BĐS Phương Nam thập niên 2000).
- Điểm yếu: Mỗi level up cần Khôi giúp ≥1 người ngoài gia đình hoàn thành lời quẻ. Nếu Khôi chỉ ích kỷ → khoá cấp. Mỗi quẻ MISS trừ điểm Khí Vận, ba MISS liên tiếp mất quẻ một ngày.
- Bí mật MC: Kiếp trước Lê Minh Khôi quản lý cảng container Phương Nam 2010-2026, biết hết roadmap kinh tế Việt Nam sau 1986 — Combine với Mộng Mị Thiên Thư cho phép đầu tư siêu chính xác. Bí mật trọng sinh + biết tương lai là tuyệt đối; nếu lộ → mất uy tín + bị nghi ngờ là gián điệp.

### CAST CHÍNH
- Lê Đình Tài — ông nội (68t), cựu công nhân Nhà máy Cơ khí Quang Trung, có tiếng nói trong khu tập thể — Người chính thức trao quyền gia đình cho Khôi khi thấy MC chứng tỏ giá trị.
- Trần Thị Lan — mẹ Khôi (43t), công nhân Nhà máy Dệt Vinh Lạc (hư cấu), nhân hậu, là người TIN Khôi sớm nhất — Cảm xúc trung tâm, mỗi lần Khôi mang về gạo dư hoặc thịt thêm bà đều rơi nước mắt cảm động.
- Lê Quang Hiệp — em trai Khôi (20t), sinh viên Đại học Sư phạm (hư cấu) — Cánh tay phải lý thuyết — Sau này Khôi đầu tư cho Hiệp đi nước ngoài học MBA Phase 3.
- Lê Quỳnh Anh — em gái Khôi (17t), học sinh cuối cấp 3 — Thần tượng Khôi tuyệt đối — Sau này được Khôi tài trợ học kinh tế, thành phó tổng giám đốc tập đoàn Phase 4.
- Vũ Đăng Hùng — bạn cùng phòng kỹ sư Khôi tại Nhà máy Cơ khí Quang Trung (25t) — Đồng minh kinh doanh đầu tiên — Cùng Khôi mở lán xưởng tư nhân Phase 2.
- Ngô Tâm — bà chợ trời Bích Hà (50t), gốc Bắc Bộ, có mạng lưới thu mua vàng + đồ cổ — Đối tác bí mật — Cung cấp kênh tiêu thụ cho hàng độc Khôi tìm được từ mộng.

### ANTAGONISTS
- Lê Đình Tâm — chú út (38t), chạy chợ trời nhỏ, tham + lém — Đối thủ trong nhà — Thường xuyên vớ phần ăn của trẻ con, định ép Khôi đi vận chuyển hàng cấm cho mình. Bị Khôi cô lập kinh tế chương 30, mất uy tín chương 60.
- Nguyễn Thị Hiền — vợ chú út (35t), miệng độc + ganh tị — Đối thủ phụ — Hay xúi cô út về bòn rút mẹ Khôi.
- Đỗ Văn Tỵ — tổ trưởng khu phố tham (45t), thường vòi tiền lót tay khi cấp tem phiếu — Đối thủ cấp phường — Sẽ bị Khôi dùng mộng tìm được manh mối tham nhũng + báo lên cấp trên, chuyển công tác chương 120.
- Trần Văn Quân — ông trùm chợ đen Bích Hà (40t) — Đối thủ kinh doanh Phase 2 — Tranh giành nguồn vàng cũ + đồ cổ với Khôi, cuối Phase 2 bị Khôi đánh bại bằng kế "kéo cả mạng lưới nguồn cung".

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Hà An 1978-1979, nuôi sống gia đình: Goal — Mười hai miệng Lê thị no đủ, tem phiếu tích trữ dư, Khôi giấu được 50 chỉ vàng trong tường gạch. Milestone — Cô lập chú út + đỡ mẹ ngẩng cao đầu trước cô em chồng (ch.45). Stakes — Mất uy tín gia đình nếu Khôi không chứng tỏ giá trị.
- PHASE 2 (Ch.100-300) — Hà An 1979-1983, dựng xưởng tư nhân: Goal — Mở lán xưởng cơ khí tư nhân nhỏ gia công đồ gia dụng (xoong nồi, dao kéo, đồ nội thất rẻ tiền), buôn vàng + đồ cổ qua mạng lưới Ngô Tâm. Milestone — Đẩy lui ông trùm chợ đen Trần Văn Quân (ch.250). Stakes — Cán bộ vòi tiền nhiều hơn, có thể bị quy tội buôn lậu.
- PHASE 3 (Ch.300-600) — Sau đổi mới chung chung 1986-1990, lên công ty: Goal — Khôi mở Công ty TNHH Quang Hưng (hư cấu) XNK chính thức, xây nhà máy 200 công nhân, vào Phương Nam mở chi nhánh đầu tiên. Milestone — IPO không chính thức tại sàn vàng Phương Nam (ch.480). Stakes — Cạnh tranh thương trường + cán bộ tham hồi tố.
- PHASE 4 (Ch.600-1000) — 1990s-2010s, tỷ phú gia tộc: Goal — Khôi trở thành tỷ phú USD đầu tiên thị xã Hà An, gia tộc Lê thị 50+ người làm trong tập đoàn. Milestone — Cosmic reveal về lý do trọng sinh (ch.850). Stakes — Khôi cần chọn giữa ngôi vua doanh nhân + quay về kiếp trước cứu vợ con đã chết tai nạn 2025.

### OPENING SCENE
- Location: Phòng ngủ chung tầng 3 toà B5 khu Đông Nam thị xã Hà An, 5 giờ sáng đầu mùa đông 1978, ánh đèn dầu yếu trong căn phòng ngủ 12 m² chen chúc Khôi + em trai Hiệp + em họ Minh.
- MC hành động: Lê Quang Khôi bừng tỉnh, đầu óc đột nhiên ngồn ngộn ký ức kiếp trước Phương Nam 2026 — một đời 53 năm, ba bằng đại học, hai mươi tám năm quản lý cảng container. Bên ngoài bếp, mẹ Trần Thị Lan đang khóc thầm vì chú út Tâm vừa lén lấy hai cân gạo tem phiếu của trẻ con đi bán chợ đen. Đúng lúc đó, trong tâm trí Khôi vang lên một dòng text rõ ràng: "Hôm nay 8 giờ sáng tại chợ Bích Hà (cách nhà 800 m phía Tây), gian số 23 dãy đồng hồ cũ, ông lão tên Phan tóc bạc đeo kính dày, bán đồng hồ Pôljốt 21 chân kính hỏng giá 8 đồng, mở nắp dưới có 4 chỉ vàng 9999 dấu chôn trong gỗ. Mua xong đi thẳng, không trả giá quá lâu, không để người khác trông thấy mở nắp."
- Hook event: Khôi tụt khỏi giường, mặc áo kỹ sư xanh + đạp xe Phượng Hoàng đến chợ Bích Hà lúc 7h45. Gian số 23 đúng có ông lão Phan như mộng tả. Khôi trả 7 đồng (giảm chút để tránh nghi ngờ), về nhà mở nắp dưới — bốn chỉ vàng 9999 còn dấu cũ. Bà bán vàng chợ trời Ngô Tâm thẩm định, trả 240 đồng — bốn tháng lương kỹ sư của Khôi trong một buổi sáng. Bữa cơm trưa hôm đó cả mười hai người Lê thị có thịt heo kho + cơm trắng đầy bát — mẹ Khôi nhìn anh không nói gì, chỉ rơi nước mắt.
- Câu mở đầu: "Năm 1978 này, một cân gạo đắt hơn một chỉ vàng — và mỗi đêm ta nhận được một bản đồ kho báu trong đầu, đủ để kéo cả nhà mười hai người ra khỏi bóng tối của tem phiếu."

### WORLD RULES
- Tất cả tên người, địa danh, tổ chức, sự kiện trong truyện đều HƯ CẤU HOÀN TOÀN — không gắn với bất kỳ nhân vật, sự kiện chính trị, lãnh đạo, hay địa danh thực tế nào của Việt Nam.
- Tham nhũng cán bộ địa phương chỉ ở cấp phường / tổ — KHÔNG đề cập đến tên thật của tổ chức chính phủ, không phán xét hệ thống chính trị, chỉ kể chuyện kinh tế gia đình.
- Mộng Mị Thiên Thư là bí mật tuyệt đối — Khôi giả vờ "có duyên đi chợ trời, biết người biết hàng".
- Vàng nhẫn + đồ cổ + tem phiếu dư là tài sản chính giai đoạn 1978-1986. Sau 1986, kênh đầu tư mở rộng sang xưởng tư + BĐS + nhập khẩu.
- Cosmic reveal Phase 4: Mộng Mị Thiên Thư là một mảnh "Định Mệnh Sổ" của một thực thể vũ trụ — Khôi là sứ giả thử nghiệm "Việt Nam thịnh vượng" trong dòng thời gian này.

### TONE & ANTI-PATTERNS
- TONE: Ấm áp gia đình 50% + thực dụng kinh doanh 35% + face-slap cán bộ tham 15%. Pacing chậm rãi giai đoạn đầu, nhiều bữa cơm cảm động + chi tiết đời sống bao cấp realistic. Tham khảo nhịp 《70年代：带着户口去下乡》.
- NEGATIVE SPACE:
  • KHÔNG đề cập tên thật cán bộ chính trị / lãnh đạo / sự kiện chính trị cụ thể (đại hội nào, nghị quyết nào, năm cụ thể của cải cách).
  • KHÔNG phán xét chế độ — chỉ kể chuyện kinh tế gia đình + entrepreneur của MC.
  • KHÔNG dùng tên thật của địa danh nhạy cảm — Hà An / Phương Nam / Cảng Vĩnh Hoà đều hư cấu.
  • KHÔNG hậu cung sa đà: Khôi có thể có bạn gái duy nhất (cô bạn cùng lớp đại học hoặc tiểu thư ngân hàng).
  • KHÔNG ngược: cả nhà mười hai người đều có moment ấm cúng mỗi 10-15 chương; chú út tham nhưng KHÔNG đánh đập bạo lực.
  • KHÔNG tu tiên / kiếm hiệp / võ thuật siêu nhiên — đây là đô thị realism + nhẹ nhàng dị năng (chỉ Mộng Mị Thiên Thư).
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

  // Bộ B (VN bao cấp) thêm safe-mode hints vào style_directives
  const isVnBaoCap = seed.slug.includes('bao-cap');
  const styleDirectives: Record<string, unknown> = {
    disable_chapter_split: true,
    production_enabled: true,
    production_daily_chapter_quota: 50,
    require_full_chapter_blueprint: false,
  };
  if (isVnBaoCap) {
    styleDirectives.vn_bao_cap_safe_mode = true;
    styleDirectives.fictional_locations_only = true;
    styleDirectives.architect_safety_hint =
      'Setting VN bao cấp 1978-1986 — TUYỆT ĐỐI KHÔNG đề cập tên thật của lãnh đạo / cán bộ chính trị / sự kiện chính trị / địa danh nhạy cảm. Mọi tên người / tên địa danh (Hà An, Phương Nam, Cảng Vĩnh Hoà, chợ Bích Hà, phố Quan Đào) đều hư cấu hoàn toàn. Tone neutral về chế độ — chỉ kể chuyện kinh tế gia đình + entrepreneur của MC, không glorify / không criticize.';
  }

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
    style_directives: styleDirectives,
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
  console.log(`  Daily Divination duo spawn  ${apply ? '[APPLY]' : '[DRY RUN]'}`);
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
