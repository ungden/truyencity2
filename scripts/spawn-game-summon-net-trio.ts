/**
 * Spawn 3 sảng văn novels:
 *
 * 1) Game Ánh Vào Hiện Thực: MC trọng sinh 10 năm sau D-day game-merge,
 *    biết exactly mọi exploit + boss spawn + rare item. Trước D-day 30 ngày,
 *    MC táng gia bại sản nạp vào game "Vô Hạn Chi Cõi" — sau merge thành
 *    top-1 player thống trị thực tế. Reference: 《游戏入侵》猫不秃 (~5M
 *    concurrent readers Tomato Novel). Setting: dị giới Hoa Hạ song song,
 *    KHÔNG dính Việt Nam.
 *
 * 2) Đại Việt Hùng Anh Triệu Hoán: MC sử gia VN xuyên qua dị giới, bind hệ
 *    thống "Đại Việt Anh Hùng Triệu Hoán" — triệu được Trần Hưng Đạo, Lý
 *    Thường Kiệt, Lê Lợi, Quang Trung, Ngô Quyền, Nguyễn Trãi + đội quân
 *    Sát Thát / Lam Sơn / Tây Sơn — xưng bá dị giới. Phase 4 unlock thần
 *    thoại Việt (Lạc Long Quân, Âu Cơ, Thánh Gióng). Reference: 《中华武将
 *    召唤系统》《异界华夏之召唤名将》Vietnamese adaptation.
 *
 * 3) Dị Giới Quán Net: MC mang modern computers + 100+ games từ Earth vào
 *    dị giới tu tiên, mở quán net. Tu sĩ + võ giả chơi LoL/PUBG/Minecraft
 *    đắm chìm → lĩnh ngộ chiêu thức + tu vi tăng. Reference: 《不是吧？你
 *    让我在异界开网吧？》键盘鬼.
 *
 * Run dry: `npx tsx scripts/spawn-game-summon-net-trio.ts`
 * Apply:   `npx tsx scripts/spawn-game-summon-net-trio.ts --apply`
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
  // ── 1. GAME ÁNH VÀO HIỆN THỰC ──────────────────────────────────────
  {
    title: 'Trọng Sinh Toàn Dân Game Hóa: Ta Táng Gia Bại Sản Nạp Sẵn 30 Ngày',
    slug: 'trong-sinh-toan-dan-game-hoa-ta-tang-gia-bai-san-nap-san-30-ngay',
    genre: 'do-thi' as const,
    main_character: 'Lăng Tiêu Phong',
    description:
      'Đại lục Hoa Hạ Lịch năm 2042 — Lăng Tiêu Phong 18 tuổi trọng sinh, mang theo ký ức 10 năm tương lai sau D-day "Toàn Dân Game Hóa". Mười năm trước (đối với hắn), một ngày bình thường, toàn cầu hơn 8 tỷ người đột nhiên thấy giao diện "Vô Hạn Chi Cõi" hiện trong tâm trí — game online ảo hóa thành thực tế. Mọi monster, dungeon, boss trong game ánh xuống lục địa, players cấp 1 sinh tồn không nổi, cấp 10+ thống trị thành phố. Cũ Lăng Tiêu Phong là vô danh tiểu tốt, vợ chết tay quái cấp 30 trong tháng đầu, bố mẹ kẹt dungeon "Tử Vong Sa Mạc" — hắn 10 năm sau đó lê lết lên cấp 70 nhưng đã muộn. Bây giờ hắn 18 tuổi, còn đúng 30 ngày trước D-day. Trong đầu hắn ngồn ngộn ký ức 10 năm sau: vị trí exact của 100+ hidden quest pre-invasion, 50+ rare item glitch trong shop game đang giảm giá, 30+ boss spawn coordinate đầu tiên Phase 1 sau merge, 20+ skill book ẩn trong dungeon mới mở. Lăng Tiêu Phong bán nhà bố mẹ, vay cả họ hàng, lock toàn bộ $5 triệu vào "Vô Hạn Chi Cõi" trong 30 ngày — cấp grind, item farm, skill book buy. D-day đến, hắn cấp 80 sẵn sàng, trong khi 8 tỷ người vừa thức dậy hoang mang ở cấp 1. Lần này, vợ con bố mẹ sống. Lần này, hắn là vua.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC 18 tuổi trọng sinh từ 10 năm sau D-day "Toàn Dân Game Hóa", biết exactly mọi exploit + rare item drop + boss spawn coordinate, có 30 ngày trước merge để táng gia bại sản nạp vào "Vô Hạn Chi Cõi" — D-day đến hắn cấp 80 trong khi 8 tỷ người vừa thức dậy cấp 1, hắn cứu vợ chết kiếp trước + thống trị toàn cầu.
- Protagonist Engine: Lăng Tiêu Phong thắng bằng kho tàng 10 năm ký ức kiếp trước (toàn bộ meta game, hidden quests, rare drops, boss timeline) + tài chính táng gia bại sản $5 triệu pre-invasion. Hắn không phải thiên tài game — hắn là speedrunner đã hoàn thành toàn bộ game post-invasion, bây giờ rewind về beta phase với knowledge cheat tối thượng.
- Pleasure Loop: MC truy xuất 1 hidden quest/glitch từ ký ức 10 năm sau → execute trong 30 ngày pre-invasion → loot rare item / level up / skill book → preparation tăng exponential → D-day MC cấp 80 cứu được vợ con đã chết kiếp trước → mỗi face-slap dân nghèo từng coi thường MC nay nhìn hắn đỉnh top-1 player toàn cầu.
- System Mechanic: Hệ Thống Trọng Sinh Toàn Dân (Rebirth Total Knowledge). Input: ký ức 10 năm kiếp trước về "Vô Hạn Chi Cõi" post-invasion meta. Output: MC nhớ exact details (coordinate, item drop rate, boss spawn time, glitch in shop, hidden questline NPC location, skill book sell price). Limit: ký ức chỉ về meta game đã chơi kiếp trước; nội dung MỚI sau merge MC không biết. Reward: mỗi exploit pre-D-day execute thành công tăng buffer time/level cho post-D-day battle.
- Phase 1 Playground: Phượng Đô (hư cấu) thành phố lớn đại lục Hoa Hạ, gia đình Lăng (bố mẹ + em gái 12 tuổi + vợ tương lai Tô Tịnh Nhi 18 tuổi), trường Đại học Phượng Đô (sinh viên năm 2), shop pre-invasion 30 ngày, dungeon test server hidden quests. MC vận hành ký ức → 1 exploit/ngày → cấp + items.
- Social Reactor: Tô Tịnh Nhi (vợ tương lai MC, 18t, kiếp trước chết tháng đầu post-invasion vì MC yếu — kiếp này MC bảo vệ), bố mẹ Lăng Hoành + mẹ Tô Hỷ Lan (kiếp trước kẹt dungeon Tử Vong Sa Mạc — kiếp này MC sửa), em gái Lăng Tiểu Phong (12t, kiếp trước bị bắt slavery — kiếp này MC bảo vệ), bạn cùng phòng Trương Trí Hổ (kiếp trước phản MC — kiếp này MC liên minh + tận dụng), thầy GS Trần Đại Lộc (Đại học Phượng Đô, mentor về kinh tế, ban đầu hoài nghi MC bán nhà nhưng sau D-day công nhận MC thiên tài).
- Novelty Ladder: Ch.1-15 (Trọng sinh + táng gia bại sản nạp game, family + Tô Tịnh Nhi nghi ngờ MC điên). Ch.15-30 (D-day đến, MC cấp 80 cứu cả Phượng Đô, family + vợ sống). Ch.30-80 (Phase 1 post-invasion — MC lead Phượng Đô survivor faction). Ch.80-150 (Phase 2 — Đại Lục Hoa Hạ tan vỡ thành 100 city-states, MC thống nhất Đông Hoa Hạ). Ch.150-300 (Phase 3 — Toàn cầu MC top-3 player, đối đầu USA + Châu Âu top players). Ch.300+ (Cosmic — MC discover game origin, hợp nhất với "Gaming phần Thiên Đạo").
- Control Rules: Payoff exploit mỗi 2-3 chương; payoff family ấm áp + face-slap mỗi 5-10 chương; payoff thống trị mỗi 30 chương. Attention Gradient: gia đình → Phượng Đô → Đại Lục Hoa Hạ → toàn cầu → cosmic.

### BỐI CẢNH
Đại lục Hoa Hạ — đại lục Trung Hoa hư cấu song song (KHÔNG dính lịch sử Việt Nam, KHÔNG dính lịch sử Trung Quốc thực), năm 2042 Hoa Hạ Lịch, civilization tier modern (smartphone phổ biến, AI GPT-7 tier, VR full immersion $200, 6G + neural interface beta). Kinh tế stable, dân số 1.5 tỷ. Game "Vô Hạn Chi Cõi" là MMORPG cosmic-tier do studio Vô Hạn Studios phát hành 5 năm trước, 800 triệu active players toàn đại lục — 1 trong top 3 games phổ biến nhất.

D-day "Toàn Dân Game Hóa" sẽ xảy ra trong 30 ngày: vào 12:00 trưa ngày 15 tháng 5 năm 2042 Hoa Hạ Lịch, đột nhiên 8 tỷ người toàn cầu thấy UI "Vô Hạn Chi Cõi" hiện trong tâm trí. Tất cả monsters/dungeons/bosses/items/skills trong game đột ngột vật chất hóa và spawn khắp đại lục. Player cấp 1 (chưa chơi game) đối đầu Tier 1 monster (sói cấp 5) tỷ lệ chết 60%. Cấp 10 (chơi game 1 năm) survival rate 95%. Cấp 50+ (chơi game heavy 3+ năm) trở thành city-tier protector.

Kiếp trước MC (Lăng Tiêu Phong v1): 18t lúc D-day, mới chơi game 6 tháng cấp 5, vợ Tô Tịnh Nhi cấp 1 chết trong tháng đầu vì wolf-pack Tier 2, bố mẹ + em gái kẹt dungeon Tử Vong Sa Mạc tháng thứ 2 (MC không đủ cấp giải cứu). 10 năm sau MC lên cấp 70 nhưng family + vợ đã chết. Năm thứ 11 MC kết liễu chính mình trong dungeon endgame "Cosmic Anomaly" — bất ngờ một cosmic entity ban tặng cơ hội trọng sinh.

Bây giờ Lăng Tiêu Phong 18 tuổi, sinh viên năm 2 Đại học Phượng Đô major Kinh Tế. Còn 30 ngày trước D-day. Tài sản gia đình: căn nhà 80m² $400K + 2 chiếc xe + tiết kiệm $200K. Vay được từ họ hàng + cầm bằng đỏ + mortgage gia đình = thêm $3.4M. Tổng $5M để nạp vào game pre-invasion.

### NHÂN VẬT CHÍNH
- Tên: Lăng Tiêu Phong
- Tuổi: 18 tuổi (kiếp này, không xuyên qua — trọng sinh từ 10 năm sau D-day v1 trong cùng đại lục Hoa Hạ)
- Nghề/Trạng thái: Sinh viên năm 2 Đại học Phượng Đô major Kinh Tế. GPA: 3.2. Đang chuẩn bị final năm 2 trong 30 ngày tới.
- Tài sản hiện tại (gia đình): Nhà 80m² Phượng Đô khu Tử Linh, 2 xe (1 Toyota + 1 Honda), $200K tiết kiệm, MC personal $5K trong card sinh viên. Bố Lăng Hoành (45t, kỹ sư cơ khí Phượng Đô Engineering), mẹ Tô Hỷ Lan (43t, kế toán trưởng Phượng Đô Bank), em gái Lăng Tiểu Phong 12t (lớp 6 trường Phượng Đô Primary).
- Tính cách: Trầm tĩnh + tính toán cực kỳ chặt chẽ (combo 10 năm post-invasion grind hardcore), bảo vệ family tuyệt đối (kiếp trước mất họ là pain to mất chính mình), không tin người ngoài (kiếp trước bị bạn cùng phòng Trương Trí Hổ phản, vợ chết vì hàng xóm không help). Hành động bằng kế hoạch dài hạn — 30 ngày pre-invasion là speedrun cycle.
- Điểm yếu: Tuổi 18 + sinh viên nghèo — KHÔNG ai tin MC bán nhà nạp game đầu Phase 1. Bố mẹ + Tô Tịnh Nhi nghĩ MC điên. Phải convince trong 7 ngày đầu trước khi quá muộn.

### GOLDEN FINGER
- Tên hệ thống: Hệ Thống Trọng Sinh Toàn Dân (Total Rebirth Knowledge System).
- Cơ chế hoạt động: Trong tâm trí MC có "Memory Library" — kho ký ức 10 năm kiếp trước post-D-day. MC có thể truy xuất bất cứ memory cụ thể nào: vị trí exact của 100+ hidden quests pre-invasion (mỗi quest tặng skill book / rare item / level boost), 50+ rare items đang giảm giá 90% trong shop pre-D-day (game studio dọn kho trước launch big update), 30+ boss spawn coordinate Phase 1 post-merge, 20+ skill book locations trong dungeon mới mở. Tất cả memory ACCURATE 100% — kiếp trước MC đã verify từng cái.
- Trigger kích hoạt: Tâm trí MC focus vào 1 question cụ thể ("hidden quest tại Phượng Đô Forest đang reset đến đâu?" / "Rare item Drop tại Tử Linh Dungeon ngày D-29 là gì?"). Memory hiện trong vòng 5-30 giây.
- Đường tăng trưởng cấp Player Lăng Tiêu Phong:
  • Pre-D-day (ch.1-30): Cấp 5 → cấp 80 trong 30 ngày qua exploit. Vũ trang Mythic tier set.
  • Post-D-day Phase 1 (ch.30-100): Cấp 80 → 120, conquer Phượng Đô + Đông Hoa Hạ.
  • Post-D-day Phase 2 (ch.100-300): Cấp 120 → 200, top-3 player Đại Lục Hoa Hạ.
  • Post-D-day Phase 3 (ch.300-600): Cấp 200 → 300, top-3 player toàn cầu.
  • Post-D-day Phase 4 (ch.600-1000): Cấp 300 → Cosmic-tier, hợp nhất với cosmic entity.
- Điểm yếu: Memory CHỈ về meta đã có 10 năm post-D-day. Bất cứ nội dung MỚI (player choice, world event triggered by MC's pre-invasion exploit) — MC KHÔNG biết. Plus MC phải convince family trong 7 ngày đầu — nếu fail, không có $5M để nạp.

### CAST CHÍNH
- Tô Tịnh Nhi — vợ tương lai MC (18t, sinh viên năm 2 Đại học Phượng Đô major Tâm Lý, cùng lớp với MC) — Đang dating MC pre-D-day, kiếp trước chết tháng đầu post-invasion — Cảm xúc trung tâm, MC cứu nàng là động lực chính.
- Lăng Hoành — bố MC (45t, kỹ sư Phượng Đô Engineering) — Ban đầu phản đối MC bán nhà; sau khi D-day đến + MC cứu cả gia đình, công nhận MC trưởng thành — Cảnh báo + ủng hộ sau Phase 1.
- Tô Hỷ Lan — mẹ MC (43t, kế toán trưởng Phượng Đô Bank) — Đầu tiên tin MC sau khi MC nói rõ một số chi tiết bí mật chỉ trong gia đình biết (thuyết phục bằng "trọng sinh" indirect proof) — Tham gia tài chính kế hoạch nạp $5M.
- Lăng Tiểu Phong — em gái MC (12t, lớp 6 Phượng Đô Primary) — Người tin MC nhanh nhất; MC cứu em khỏi slavery Phase 2 kiếp trước — Người ấm áp gia đình.
- Trương Trí Hổ — bạn cùng phòng MC (18t, sinh viên kinh tế) — Kiếp trước phản MC chương 80 post-invasion; kiếp này MC liên minh khôn ngoan trước khi hắn show true color, tận dụng + cô lập.
- GS Trần Đại Lộc — mentor Kinh Tế Đại học Phượng Đô (55t) — Đầu tiên skeptical MC bán nhà nạp game, sau Phase 1 công nhận MC thiên tài — Mentor chính trị + kinh tế Phase 2+.

### ANTAGONISTS
- Trương Đại Tướng — chú út Trương Trí Hổ + business mogul Phượng Đô (50t, $50M net worth) — Đối thủ tài chính Phase 1 — Tham gia mua cổ phần "Vô Hạn Chi Cõi" tham lam, đánh giá thấp MC, kiếp trước phản đối khi MC mượn tiền. Bị MC face-slap sau D-day khi MC top-1 player.
- Vương Tử Hào — đối thủ cùng lớp MC (18t, gia đình giàu, kiếp trước trở thành top-50 player post-invasion) — Đối thủ trẻ Phase 1 — Hiện tại khinh MC nghèo + nói MC điên; bị MC outrace trong cấp pre-D-day.
- Hắc Vũ Hội — tổ chức bí mật pre-D-day biết về "Toàn Dân Game Hóa" trước (insider game studio leak) — Đối thủ Phase 1-2 — Cũng đang nạp tiền pre-invasion + try to control resources; MC cạnh tranh + đánh bại Phase 2.
- Cosmic Game Entity "Vô Hạn Chi Tổ" — entity cosmic mà MC verify kiếp trước trong endgame dungeon — Đối thủ cuối Phase 4 — Sau khi MC reach cấp 300, entity reveal MC là thử nghiệm cosmic.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Pre-D-day 30 ngày + D-day + Phượng Đô conquer: Goal — MC convince family + Tô Tịnh Nhi (ch.1-7), bán nhà + vay tiền $5M (ch.7-15), nạp game 80 cấp (ch.15-30), D-day arrive (ch.30) + MC lead Phượng Đô survival, cuối Phase MC control 5 quận Phượng Đô. Milestone — Wedding với Tô Tịnh Nhi (ch.75). Stakes — Family chết kiếp trước nếu MC fail convince.
- PHASE 2 (Ch.100-300) — Đại Lục Hoa Hạ Đông + 100 city-states fragmentation: Goal — MC merge 10 city-states thành "Đông Hoa Hạ Liên Minh", cấp 200, đối đầu Hắc Vũ Hội. Milestone — Đánh bại Hắc Vũ Hội ch.250. Stakes — Đại Lục fragmentation, mỗi city-state war lẫn nhau.
- PHASE 3 (Ch.300-600) — Toàn cầu top-3 player: Goal — MC trở thành top-3 player toàn cầu, đối đầu USA + Châu Âu top players (Erik Karlsson + Wang Mei Ling). Milestone — World Player Tournament Mexico City ch.480. Stakes — USA + Châu Âu top players liên minh chống MC.
- PHASE 4 (Ch.600-1000) — Cosmic discovery + Game origin reveal: Goal — MC discover "Vô Hạn Chi Tổ" entity cosmic, fight + hợp nhất, trở thành Cosmic Game Architect. Endgame: MC chọn giữa cosmic life + family ấm áp Phượng Đô normal life. Milestone — Cosmic reveal ch.900. Stakes — "Vô Hạn Chi Tổ" muốn absorb MC.

### OPENING SCENE
- Location: Ký túc xá Đại học Phượng Đô phòng 412 toà B7, 5 giờ sáng ngày 15 tháng 4 năm 2042 Hoa Hạ Lịch (30 ngày trước D-day), Tô Tịnh Nhi ngủ cạnh MC sau buổi học muộn, gió lạnh đầu hè qua cửa sổ.
- MC hành động: Lăng Tiêu Phong bừng tỉnh trên giường ký túc xá, đầu óc đột nhiên ngồn ngộn 10 năm ký ức kiếp trước post-D-day — wedding của Tô Tịnh Nhi bị wolf-pack Tier 2 hủy hoại tại quận Tử Linh, bố mẹ kẹt Tử Vong Sa Mạc tháng thứ 2 (MC năm đó cấp 12), em gái Tiểu Phong bị bắt slavery vì MC fail to save (cấp 25 lúc bắt), 10 năm sau MC cấp 70 đứng trên đỉnh cosmic dungeon endgame nhìn 8 tỷ người chết... Sau đó cosmic entity Vô Hạn Chi Tổ hiện ra: "Lăng Tiêu Phong, mày có 1 cơ hội. Tao cho mày 30 ngày pre-invasion với memory đầy đủ." MC bừng tỉnh — vợ Tô Tịnh Nhi đang ngủ cạnh, em gái Tiểu Phong text WhatsApp "anh hai chiều nay đón em ở trường nhé". Mọi thứ còn sống. MC còn 30 ngày để cứu họ.
- Hook event: MC ngồi dậy lặng lẽ, mở laptop, login vào platform "Vô Hạn Chi Cõi" — UI familiar từ 10 năm sau. Hắn check shop pre-launch event: rare item "Cosmic Sword Fragment" cấp Mythic — kiếp trước MC kiếp trước đã farmer 8 tháng + $2M để có. Bây giờ shop đang sale 95% giá $50K. Đầu hắn run nhẹ — 30 ngày đủ để hắn nạp $5M nếu thuyết phục được bố mẹ + cầm bằng đỏ + vay họ hàng. Lúc đó Tô Tịnh Nhi tỉnh dậy, ôm hắn từ phía sau hỏi: "Anh sao thức sớm vậy? Bài thi Kinh Tế Vĩ Mô ngày mai..." MC quay lại, nhìn cô vợ tương lai đã từng chết trong tay hắn 10 năm trước, mỉm cười: "Tịnh Nhi, hôm nay anh phải bán cái nhà của bố mẹ. Và anh cần em tin anh."
- Câu mở đầu: "Mười năm trước trong tương lai, 8 tỷ người đột nhiên thức dậy thấy UI 'Vô Hạn Chi Cõi' trong tâm trí. Bây giờ ta có 30 ngày trước D-day, và ta sẽ táng gia bại sản để cứu cả gia đình."

### WORLD RULES
- Trọng sinh là bí mật của MC — chỉ Tô Tịnh Nhi + bố mẹ + em gái biết sau khi MC chứng minh bằng knowledge cụ thể.
- D-day 12:00 trưa ngày 15/5/2042 — toàn cầu không tránh khỏi, mọi monster/dungeon/boss vật chất hóa.
- Memory MC CHỈ về meta 10 năm post-D-day kiếp trước. Nội dung MỚI tạo ra bởi MC's pre-invasion actions là unknown.
- Players cần ngủ 6h/ngày, ăn uống bình thường — game không "fake reality", chỉ overlay UI + level/skill mechanics.
- Cosmic reveal Phase 4: "Vô Hạn Chi Tổ" là entity cosmic tạo ra "Toàn Dân Game Hóa" như experiment.

### TONE & ANTI-PATTERNS
- TONE: Thực dụng cool 50% + ấm áp gia đình + vợ 25% + face-slap đối thủ 25%. Pacing nhanh — 30 ngày pre-D-day = 30 chương cô đặc, mỗi chương 1 exploit. Tham khảo nhịp 《游戏入侵》猫不秃.
- NEGATIVE SPACE:
  • KHÔNG là MC siêu sao bẩm sinh — MC cần memory 10 năm post + tài chính $5M.
  • KHÔNG hậu cung sa đà — Tô Tịnh Nhi vợ chính, 1-2 nữ phụ team.
  • KHÔNG ngược family — bố mẹ + em gái + vợ tin MC sau 7 chương.
  • KHÔNG drama Việt Nam — bối cảnh dị giới Hoa Hạ hư cấu hoàn toàn.
  • KHÔNG dùng memory lazy — mỗi exploit cần action cụ thể, không "auto win".
  • KHÔNG tu tiên kiểu cũ — MC "đột phá" bằng cấp/skill/item game milestone.
`,
    total_planned_chapters: 1000,
  },

  // ── 2. ĐẠI VIỆT HÙNG ANH TRIỆU HOÁN ─────────────────────────────────
  {
    title: 'Đại Việt Hùng Anh: Ta Triệu Hoán Trần Hưng Đạo Tại Dị Giới Xưng Bá',
    slug: 'dai-viet-hung-anh-ta-trieu-hoan-tran-hung-dao-tai-di-gioi-xung-ba',
    genre: 'huyen-huyen' as const,
    main_character: 'Phạm Vĩnh Lâm',
    description:
      'Sử gia Việt Nam 32 tuổi Phạm Vĩnh Lâm đang nghiên cứu sử liệu thời Trần tại Viện Sử Học Hà Nội — đột nhiên cánh cửa kho lưu trữ phát sáng, hắn ngất xỉu rồi tỉnh dậy thân phận tử tước Phạm Vĩnh Lâm 22t tại Phong Thiên Đại Lục — đại lục võ giả tu vi xa lạ, gia tộc đang bị tông môn Hắc Hoả thôn tính. Trong đầu Phạm Vĩnh Lâm vang lên giọng nói cosmic: "Bind Hệ Thống Đại Việt Anh Hùng Triệu Hoán thành công. Triệu hoán 1 anh hùng VN/lần, vĩnh viễn trung thành với MC." UI hiện danh sách 100+ võ tướng + văn thần + nữ tướng + anh hùng dân tộc Việt Nam lịch sử: Trần Hưng Đạo (đại tướng kháng Mông Cổ), Lý Thường Kiệt (đại tướng kháng Tống), Lê Lợi (Lam Sơn vương), Nguyễn Huệ Quang Trung (đại bại 290.000 quân Thanh thần tốc), Ngô Quyền (chiến thắng Bạch Đằng), Nguyễn Trãi (Bình Ngô đại cáo), Hai Bà Trưng (chống Đông Hán), Bà Triệu, Trần Quốc Tuấn, Phạm Ngũ Lão, Yết Kiêu, Dã Tượng, Trần Bình Trọng... Lâm khởi đầu chỉ triệu được 1 anh hùng cấp Hậu Thiên (vd: Phạm Ngũ Lão); mỗi lần level up Đại Việt Khí mở khóa anh hùng cấp cao hơn + triệu thêm đội quân tinh nhuệ Sát Thát / Lam Sơn / Tây Sơn. Phase 4 unlock thần thoại Việt (Lạc Long Quân, Âu Cơ, Thánh Gióng, Sơn Tinh) — xưng bá toàn dị giới + xây dựng "Tân Đại Việt" cosmic empire.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC sử gia VN xuyên qua dị giới Phong Thiên, mỗi level up triệu thêm 1 anh hùng VN huyền thoại (Trần Hưng Đạo, Lý Thường Kiệt, Lê Lợi, Quang Trung, Hai Bà Trưng...) + đội quân tinh nhuệ Sát Thát / Lam Sơn / Tây Sơn, dùng kế sách + dũng tướng VN đại bại các tông môn dị giới + xưng bá toàn lục địa, cuối truyện kiến lập "Tân Đại Việt" cosmic empire + unlock thần thoại Việt (Lạc Long Quân, Âu Cơ, Thánh Gióng).
- Protagonist Engine: Phạm Vĩnh Lâm thắng bằng kiến thức sử Việt Nam đỉnh cao (PhD Sử Học Đại học Quốc Gia Hà Nội, 10 năm research) + Hệ Thống Triệu Hoán cosmic. Hắn không phải võ giả mạnh — hắn là chỉ huy tổng tài + chiến lược gia, dùng anh hùng VN làm pawn execute chiến thuật Việt Nam lịch sử trong dị giới (kế Bạch Đằng cọc nhọn, kế Tây Sơn hành quân thần tốc, kế Lam Sơn rút lui chiến lược, kế Đông Sơn khởi nghĩa nhân dân).
- Pleasure Loop: MC face một thử thách dị giới (tông môn tấn công, kẻ địch cấp cao, dungeon mới) → mở UI Triệu Hoán, chọn anh hùng VN phù hợp (vd: cần đối đầu kỵ binh nặng → Trần Hưng Đạo + cọc Bạch Đằng) → execute chiến thuật lịch sử trong dị giới → đối thủ sửng sốt "Tướng quân nào kế sách kỳ lạ vậy???" → MC face-slap + tăng Đại Việt Khí → unlock anh hùng + đội quân mới.
- System Mechanic: Hệ Thống Đại Việt Anh Hùng Triệu Hoán. Input: 1 lần triệu hoán/tuần ban đầu + Đại Việt Khí tương ứng cấp anh hùng (cấp Hậu Thiên: 100 ĐVK; cấp Tiên Thiên: 500 ĐVK; cấp Tông Sư: 2000 ĐVK; cấp Võ Thánh: 10000 ĐVK; thần thoại tier: 50000 ĐVK). Output: anh hùng đó hiện ra ngay vị trí MC, đầy đủ tu vi tương ứng lịch sử, ký ức + tính cách hoàn chỉnh, vĩnh viễn trung thành với MC như chủ tướng. Limit: anh hùng đã chết → không triệu lại. Mỗi anh hùng + 1 đội quân tinh nhuệ tương ứng (Trần Hưng Đạo + 1000 lính Sát Thát; Lê Lợi + 1000 lính Lam Sơn). Reward: mỗi chiến thắng lớn sử dụng anh hùng VN tặng 100-10000 Đại Việt Khí.
- Phase 1 Playground: Phạm gia trang viên tại huyện Bạch Vân Phong Thiên Đại Lục, núi Phong Thiên Sơn cạnh trang viên, thành cấp Quận Thiên Vũ. MC vận hành triệu hoán → 1-2 anh hùng/Phase 1 → chiến thuật VN → thắng → tăng Đại Việt Khí.
- Social Reactor: Phạm Vĩnh Anh (em gái MC 17t dị giới, tài năng A Kiếm, là người đầu tiên tin MC sau khi thấy Phạm Ngũ Lão triệu hoán ch.5), Phạm Bá Tâm (chú út MC, ban đầu tham quyền sau ủng hộ MC), Trương Bách Quân (đại tướng cũ Phạm gia, ngạc nhiên + tận tâm khi thấy MC có Trần Hưng Đạo cấp Tông Sư), Lý Thiên Tử (Đế Vương Phong Thiên Đế Quốc, sau khi nghe danh MC + Quang Trung Tây Sơn đại bại, mời MC vào triều), Diệp Thiên Lam (công chúa Phong Thiên 19t, sau Phase 2 hôn nhân chính trị với MC).
- Novelty Ladder: Ch.1-30 (Phạm Ngũ Lão + 100 quân Sát Thát — defend Phạm gia khỏi Hắc Hoả tông). Ch.30-80 (Trần Hưng Đạo + 1000 quân Sát Thát — kế Bạch Đằng đại bại đại quân Phong Thiên ác bá). Ch.80-150 (Lê Lợi + Lam Sơn quân — khởi nghĩa thống nhất 5 quận Đông Phong Thiên). Ch.150-300 (Nguyễn Huệ + Tây Sơn hành quân thần tốc — đại bại Bắc Phong Thiên Đế Quốc). Ch.300-600 (Hai Bà Trưng + Nữ tướng đoàn, Nguyễn Trãi văn thần xây Tân Đại Việt). Ch.600+ (Thần thoại tier — Lạc Long Quân + Âu Cơ + Thánh Gióng — cosmic empire).
- Control Rules: Payoff triệu hoán mỗi 10-15 chương (1 anh hùng mới); payoff chiến thắng lớn mỗi arc 20-30 chương (1 đối thủ dị giới bị đại bại). Attention Gradient: Phạm gia → huyện Bạch Vân → quận Thiên Vũ → Phong Thiên Đế Quốc → toàn dị giới → cosmic.

### BỐI CẢNH
Phong Thiên Đại Lục — đại lục dị giới hư cấu, KHÔNG dính lịch sử Earth nào (không phải VN, không phải TQ, không phải fantasy Western). Văn minh tu tiên + võ giả truyền thống, 1 vương triều thống nhất "Phong Thiên Đế Quốc" với Đế Vương Lý Thiên Tử (Hoá Thần đỉnh), 8 đại tông môn chia 8 phương lục địa (Hắc Hoả Tông + Vạn Pháp Tông + Tử Vận Tông...), 100+ tiểu môn phái + gia tộc. Hệ tu vi: Phàm Cảnh → Sơ Cảnh → Trung Cảnh → Hậu Thiên → Tiên Thiên → Tông Sư → Đại Tông Sư → Võ Thánh → Hoá Thần → Thần Vương.

Phạm gia là 1 trong 12 tiểu gia tộc tại huyện Bạch Vân (quận Thiên Vũ), 80 tu sĩ, có 2 vị Tiên Thiên (bố MC vừa mất + chú út Phạm Bá Tâm) + 20 vị Trung Cảnh. Tài sản: 5 mẫu ruộng linh hạng C + 1 hang động Phong Thiên Sơn cấp Hạ. Hắc Hoả Tông (tông môn lớn nhất huyện, có 5 vị Tông Sư + 500 tu sĩ) đang ép Phạm gia "merger" — thực ra là thôn tính tài sản + thanh thải dòng máu Phạm gia.

MC kiếp trước Phạm Vĩnh Lâm 32t là sử gia tại Viện Sử Học Hà Nội VN, PhD Sử Học Đại học Quốc Gia Hà Nội, chuyên ngành "Quân sự Trung Đại Việt Nam" — tinh thông kế sách Bạch Đằng, Lam Sơn, Tây Sơn, Nguyên Mông kháng chiến, Bình Ngô. Hắn nghiên cứu kho sử liệu cổ tại Viện 5 ngày liền không ngủ, đột nhiên cánh cửa kho phát sáng cosmic, hắn ngất rồi tỉnh trong thân xác Phạm Vĩnh Lâm 22t tại dị giới Phong Thiên Đại Lục.

### NHÂN VẬT CHÍNH
- Tên: Phạm Vĩnh Lâm
- Tuổi: 22 tuổi (kiếp trước 32t, sử gia Việt Nam tại Viện Sử Học Hà Nội, PhD Sử Học chuyên Quân Sự Trung Đại VN — tinh thông Bạch Đằng / Lam Sơn / Tây Sơn / Đông Sơn khởi nghĩa)
- Nghề/Trạng thái: Đại tôn Phạm gia tại huyện Bạch Vân Phong Thiên. Tu vi hiện tại: Sơ Cảnh Trung (yếu nhất trong các tộc trưởng cùng cấp huyện). Bố vừa mất 6 tháng trước, chú út Phạm Bá Tâm muốn nuốt chức tộc trưởng.
- Tài sản hiện tại: Một ngọc bài tộc trưởng Phạm gia, 200 linh thạch cá nhân, một thanh kiếm sắt cấp Hạ Phẩm (di sản bố), 1 cuốn Phong Thiên Cơ Bản Quyết cấp Hoàng phẩm (công pháp tổ truyền, kém). Gia tộc tài sản: 80 tu sĩ + 5 mẫu ruộng linh + hang động Phong Thiên Sơn.
- Tính cách: Trầm tĩnh + lý trí + chiến lược gia (combo 10 năm sử gia + tính cách tộc trưởng trẻ), bảo vệ gia tộc tuyệt đối. Khi cần tàn nhẫn — kiếp trước nghiên cứu chiến tranh không phải fluff, MC biết kế "khổ nhục", "rút ruột", "phá đê", "lấy độc trị độc".
- Điểm yếu: Tu vi cá nhân Sơ Cảnh — KHÔNG thể chiến đấu đơn lẻ với Trung Cảnh trở lên. Phụ thuộc HOÀN TOÀN vào anh hùng triệu hoán + đội quân tinh nhuệ + chiến lược. Phase 1 chỉ triệu được 1 anh hùng cấp Hậu Thiên (Phạm Ngũ Lão).

### GOLDEN FINGER
- Tên hệ thống: Hệ Thống Đại Việt Anh Hùng Triệu Hoán (Vietnamese Heroes Summoning System).
- Cơ chế hoạt động: Trong tâm trí MC có UI ánh đỏ-vàng (màu cờ Đại Việt) — danh sách 150+ anh hùng VN lịch sử + thần thoại. Mỗi anh hùng có metadata: tu vi tương ứng lịch sử (Trần Hưng Đạo = Tông Sư cấp; Lý Thường Kiệt = Tông Sư; Quang Trung = Đại Tông Sư; Hai Bà Trưng = Tiên Thiên đôi; Lê Lợi = Tông Sư; Nguyễn Trãi = Văn thần Tông Sư cấp), sở trường (Bạch Đằng cọc nhọn / Tây Sơn thần tốc / Lam Sơn du kích / Đông Sơn nhân dân khởi nghĩa), đội quân kèm theo (1000 lính Sát Thát / Lam Sơn / Tây Sơn / Đông Sơn / Trần Quốc Tuấn cảnh vệ). Triệu hoán tốn Đại Việt Khí + 24h hồi recharge. Anh hùng triệu hoán tồn tại MÃI MÃI trừ khi MC dismiss; trung thành cosmic-level với MC như chủ tướng kiếp.
- Trigger kích hoạt: 1 triệu hoán/tuần Phase 1; tăng lên 1/ngày Phase 4. Mỗi triệu hoán tốn Đại Việt Khí (ĐVK) tương ứng tu vi. MC khởi đầu 500 ĐVK; mỗi chiến thắng dùng anh hùng tặng 100-10000 ĐVK.
- Đường tăng trưởng cấp Đại Việt Khí (ĐVK):
  • L1 (ch.1-30): 500 ĐVK pool. Triệu 1 anh hùng Hậu Thiên (Phạm Ngũ Lão).
  • L2 (ch.30-80): 2000 ĐVK. +1 Tông Sư (Trần Hưng Đạo) + 1000 lính Sát Thát.
  • L3 (ch.80-150): 8000 ĐVK. +Lê Lợi + Lam Sơn 1000 lính.
  • L4 (ch.150-300): 25000 ĐVK. +Quang Trung + Tây Sơn 1500 lính.
  • L5 (ch.300-500): 100000 ĐVK. +Hai Bà Trưng + Nữ tướng đoàn 500 nữ binh + Nguyễn Trãi văn thần.
  • L6 (ch.500-750): 500000 ĐVK. +Ngô Quyền Bạch Đằng + Lý Thường Kiệt + đội thuỷ quân.
  • L7 (ch.750-1000): Cosmic. Thần thoại tier — Lạc Long Quân + Âu Cơ + Thánh Gióng + Sơn Tinh + Thủy Tinh. Mỗi vị cosmic-level entity.
- Điểm yếu: Anh hùng đã chết trên Earth (Trần Hưng Đạo, Lê Lợi etc.) — chỉ là replica cosmic, không phải thực sự đó là họ. Nếu MC abuse (dùng anh hùng để làm điều phản đạo lý dân tộc) → cosmic penalty + lose Đại Việt Khí. MC phải honor lịch sử Việt Nam.

### CAST CHÍNH
- Phạm Vĩnh Anh — em gái MC (17t dị giới, Sơ Cảnh Cao), Tài năng A Kiếm — Đầu tiên tin MC sau khi thấy Phạm Ngũ Lão triệu hoán ch.5 — Cánh tay phải gia tộc.
- Phạm Bá Tâm — chú út MC (40t dị giới, Tiên Thiên Sơ), ban đầu tham quyền — Sau khi MC chứng tỏ với Trần Hưng Đạo, ủng hộ MC + trở thành Tổng Quản Phạm gia Phase 2.
- Trương Bách Quân — đại tướng cũ Phạm gia (60t, Tiên Thiên Cao), trung thành với bố MC — Đầu tiên skeptical MC, sau khi nghe Trần Hưng Đạo phân tích kế sách Bạch Đằng, công nhận MC.
- Lý Thiên Tử — Đế Vương Phong Thiên (200t, Hoá Thần đỉnh) — Sau Phase 2 mời MC vào triều khi MC + Quang Trung đại bại Bắc Phong Thiên — Đối tác chính trị.
- Diệp Thiên Lam — công chúa Phong Thiên (19t, Tiên Thiên Trung, Tài năng S Phù pháp) — Phase 2 hôn nhân chính trị với MC — Vợ chính + đối tác cosmic.
- Trần Hưng Đạo (anh hùng triệu hoán Phase 1) — Tông Sư cấp, 50t tướng quân lịch sử VN — Chỉ huy 1000 lính Sát Thát + tư vấn chiến lược cho MC.
- Quang Trung Nguyễn Huệ (Phase 4) — Đại Tông Sư cấp, hành quân thần tốc 35 ngày kiến lập — Cho chiến tranh chính trên dị giới Phase 4.

### ANTAGONISTS
- Hắc Hoả Tông trưởng lão Liễu Tử Vạn — Tông Sư Hậu Cao (60t) — Đối thủ Phase 1 — Tham nuốt Phạm gia; bị Trần Hưng Đạo + kế Bạch Đằng dị giới đại bại ch.85.
- Bắc Phong Thiên Đế Vương Lý Hùng Long — Đại Tông Sư cấp (180t, đối thủ Lý Thiên Tử của MC) — Đối thủ Phase 2-3 — Liên minh Hắc tà tông; bị MC + Quang Trung thần tốc đại bại Phase 3.
- Cosmic Entity "Đại Việt Thần Vương" — entity cosmic Phase 4 mà MC discover — Đối thủ cuối Phase 4 — Sau khi MC unlock thần thoại tier, entity reveal MC là sứ giả của "Đại Việt phần Thiên Đạo".

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Phạm gia + huyện Bạch Vân + Hắc Hoả Tông: Goal — MC triệu Phạm Ngũ Lão + Trần Hưng Đạo + 1000 lính Sát Thát, đại bại Hắc Hoả Tông trong cuộc đấu tông môn. Milestone — Trận Bạch Đằng dị giới (sông Phong Thiên 100 dặm Tây huyện) đại bại 5000 quân Hắc Hoả (ch.85). Stakes — Phạm gia tuyệt diệt nếu MC fail.
- PHASE 2 (Ch.100-300) — Quận Thiên Vũ + Lam Sơn khởi nghĩa + 5 quận Đông Phong Thiên: Goal — MC triệu Lê Lợi + Lam Sơn quân, khởi nghĩa thống nhất 5 quận Đông Phong Thiên thành "Tân Đại Việt Đông". Milestone — Phong Đế quyết định công nhận MC là tử tước (ch.250). Stakes — Bắc Phong Thiên + Hắc tà tông liên minh.
- PHASE 3 (Ch.300-600) — Bắc Phong Thiên đại chiến + Quang Trung hành quân thần tốc: Goal — MC triệu Nguyễn Huệ Quang Trung + Tây Sơn 1500 lính, hành quân thần tốc đại bại đại quân 50.000 Bắc Phong Thiên trong 35 ngày. Milestone — "Tân Đại Việt" thống nhất 10 quận, MC trở thành Vương (ch.480). Stakes — Cosmic threat từ "Đại Việt Thần Vương".
- PHASE 4 (Ch.600-1000) — Cosmic ascension + Thần thoại Việt: Goal — MC unlock Hai Bà Trưng + Nguyễn Trãi + Ngô Quyền + Lý Thường Kiệt; sau đó cosmic-tier Lạc Long Quân + Âu Cơ + Thánh Gióng. Kiến lập "Đại Việt Cosmic Empire" cross-universe. Endgame: MC chọn giữa cosmic life + về VN 2026 cứu vợ con đã chết tai nạn. Milestone — Cosmic reveal về "Đại Việt phần Thiên Đạo" ch.900. Stakes — Thiên Đạo cũ muốn absorb MC.

### OPENING SCENE
- Location: Buồng phòng đại tôn Phạm gia tại huyện Bạch Vân Phong Thiên Đại Lục, 5 giờ sáng đầu xuân năm Phong Thiên Lịch 5052, ánh đèn dầu leo lét, mưa phùn đầu mùa.
- MC hành động: Phạm Vĩnh Lâm bừng tỉnh, đầu óc đột nhiên ngồn ngộn ký ức kiếp trước Việt Nam — 32 năm Phạm Vĩnh Lâm, 10 năm sử gia tại Viện Sử Học Hà Nội, PhD chuyên Quân Sự Trung Đại VN. Hắn nhớ rõ cuối cùng — kho lưu trữ Viện phát sáng cosmic, hắn ngất xỉu... Bên ngoài đại sảnh, em gái Phạm Vĩnh Anh đang khóc: "Anh hai, chú út vừa ép em ký giấy nhường tài sản Phạm gia cho Hắc Hoả Tông!" Đột nhiên trong tâm trí Lâm bật lên giao diện UI ánh đỏ-vàng: "Bind Hệ Thống Đại Việt Anh Hùng Triệu Hoán thành công. Đại Việt Khí: 500/500. Anh hùng available: Phạm Ngũ Lão (Hậu Thiên Cao, Sát Thát đội). Sẵn sàng triệu?"
- Hook event: Lâm sửng sốt, lẩm bẩm "Phạm Ngũ Lão... thật à?" — chọn triệu hoán. UI consume 100 ĐVK. Một cột khí đỏ vàng nổi lên giữa phòng — Phạm Ngũ Lão đứng trước mặt MC, áo giáp Trần triều, kiếm dài, tu vi Hậu Thiên Cao rõ ràng. Phạm Ngũ Lão quỳ xuống: "Phạm Ngũ Lão, thuộc hạ của chủ tướng. Xin lệnh." Phạm Vĩnh Anh sửng sốt 5 giây, sau đó òa khóc ôm anh hai: "Đây... đây thật là Phạm Ngũ Lão tướng quân Trần triều???" Lâm gật đầu, mỉm cười: "Tịnh Anh, từ giờ Phạm gia không sợ ai. Đi gặp chú út." Hai anh em + Phạm Ngũ Lão bước ra đại sảnh — chú út Phạm Bá Tâm đang ngồi với 3 sứ giả Hắc Hoả Tông; nhìn thấy Phạm Ngũ Lão (tu vi Hậu Thiên Cao, cao hơn chú út Tiên Thiên Sơ), toàn bộ ngừng thở. Lâm điềm nhiên: "Phạm gia không nhường gì cho Hắc Hoả. Sứ giả về đi."
- Câu mở đầu: "Trên Phong Thiên Đại Lục này, không ai biết Trần Hưng Đạo + 1000 cọc nhọn Bạch Đằng — và ta sẽ dạy cho cả lục địa lịch sử Việt Nam là kế sách quân sự đỉnh nhất loài người."

### WORLD RULES
- Hệ Thống Đại Việt Anh Hùng là bí mật MC — chỉ Phạm Vĩnh Anh + bà nội Phạm gia + Diệp Thiên Lam (Phase 2) biết.
- Anh hùng triệu hoán là replica cosmic, KHÔNG phải Trần Hưng Đạo / Lê Lợi / etc. thực — họ có ký ức + tu vi lịch sử nhưng tồn tại cosmic-mirror.
- MC PHẢI honor lịch sử Việt Nam — nếu dùng anh hùng cho điều phản đạo lý dân tộc (xâm lược dân lành không cần thiết, phản bội đồng minh không lý do), cosmic penalty.
- Đội quân tinh nhuệ kèm anh hùng — Trần Hưng Đạo + 1000 Sát Thát, Lê Lợi + 1000 Lam Sơn, Quang Trung + 1500 Tây Sơn — mỗi đội có tu vi tương ứng (Hậu Thiên đến Trung Cảnh tùy đội).
- Cosmic reveal Phase 4: "Đại Việt phần Thiên Đạo" — MC là sứ giả cosmic mang lịch sử Việt Nam vào cosmic vũ trụ.

### TONE & ANTI-PATTERNS
- TONE: Chiến lược gia oai phong 40% + ấm áp Việt Nam culture + lịch sử 30% + face-slap dị giới ác bá 20% + cosmic Phase 4 10%. Pacing chậm rãi đầu (sử gia + xây dựng) + nhanh trong trận lớn (Bạch Đằng / Lam Sơn / Tây Sơn các trận). Tham khảo nhịp 《中华武将召唤系统》Vietnamese adaptation.
- NEGATIVE SPACE:
  • KHÔNG là MC tu vi siêu mạnh — MC tu vi Sơ Cảnh, thắng bằng anh hùng triệu hoán + chiến thuật VN.
  • KHÔNG hậu cung sa đà — Diệp Thiên Lam vợ chính, 1-2 nữ phụ.
  • KHÔNG bóp méo lịch sử Việt Nam — Trần Hưng Đạo / Lê Lợi / etc. character + tính cách + chiến thuật theo lịch sử thực.
  • KHÔNG anachronism — không có "công nghệ hiện đại" Earth trong dị giới (MC không mang tech).
  • KHÔNG dùng anh hùng lazy — mỗi trận cần đúng anh hùng + đúng chiến thuật, không "auto win".
  • KHÔNG tu tiên kiểu cũ — MC "đột phá" bằng chiến thắng quân sự + Đại Việt Khí harvest.
`,
    total_planned_chapters: 1000,
  },

  // ── 3. DỊ GIỚI QUÁN NET ──────────────────────────────────────────────
  {
    title: 'Dị Giới Quán Net: Tu Sĩ Đánh LoL Đắm Chìm Lĩnh Ngộ Kiếm Pháp',
    slug: 'di-gioi-quan-net-tu-si-danh-lol-dam-chim-linh-ngo-kiem-phap',
    genre: 'huyen-huyen' as const,
    main_character: 'Đỗ Quốc Anh',
    description:
      'Game streamer + chủ quán net Việt Nam 26 tuổi Đỗ Quốc Anh đột tử vì cơn đau tim trong lúc đang stream LoL — tỉnh dậy thân phận tử tước trẻ tuổi Vương Anh tại Đại Lục Vô Trần, thế giới tu sĩ + võ giả phổ cập, gia đình mới mất chỉ còn 200 linh thạch + căn nhà gỗ 3 gian + 1 cuốn võ kinh Phàm phẩm. Tu sĩ Trúc Cơ trở lên đầy đường, võ giả không bằng chó, MC ở Phàm Cảnh tu vi yếu nhất huyện. Đột nhiên trong tâm trí Vương Anh bật lên: "Bind Hệ Thống Quán Net Thần Cấp thành công. Vật chất hóa toàn bộ trang thiết bị quán net Earth + 100+ Steam games + LAN setup. Tu sĩ đến chơi → nạp linh thạch → game đắm chìm → lĩnh ngộ chiêu thức + tu vi tăng." Một đêm sau, một "Vô Trần Internet Bar" sang trọng hiện ra giữa thị trấn Thiên Vân Trấn — 30 máy tính cao cấp Earth, VR headsets, LAN cabling, 100 games từ Counter-Strike + League of Legends + PUBG + Minecraft + Dota 2 + Genshin Impact + Elden Ring + GTA V + Smite. Tu sĩ thị trấn đầu tiên hoài nghi, sau khi 1 tu sĩ Trúc Cơ chơi LoL Yasuo 6 giờ đắm chìm — lĩnh ngộ "Vô Phong Kiếm Pháp" (Hậu Thiên cấp) — cả thị trấn đột nhiên xếp hàng trước quán net của Vương Anh. Từ tử tước nghèo → ông trùm Quán Net dị giới đầu tiên → thầy tu vi gián tiếp của 100.000+ tu sĩ → đại tông sư Phase 4.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC streamer Việt xuyên qua dị giới tu tiên, mở quán net với 100+ game Earth (CS / LoL / PUBG / Minecraft / Elden Ring) — tu sĩ + võ giả dị giới chơi đắm chìm → lĩnh ngộ chiêu thức + tu vi tăng cực nhanh, MC từ tử tước nghèo trở thành ông trùm Quán Net + thầy gián tiếp của 100K+ tu sĩ + đại tông sư Phase 4 cosmic empire.
- Protagonist Engine: Đỗ Quốc Anh thắng bằng 8 năm kinh nghiệm chủ quán net + streamer Việt Nam (game knowledge sâu rộng + UX optimization + community management) + Hệ Thống Quán Net Thần Cấp (vật chất hóa máy tính Earth + Steam games). Hắn không phải tu vi mạnh — hắn là entertainment entrepreneur, biết exactly game nào cho audience nào, biết build community + monetize + scale.
- Pleasure Loop: 1 tu sĩ đến quán net → MC giới thiệu 1 game phù hợp tu vi/sở trường (kiếm khách → Yasuo LoL; cuồng chiến → Mortal Kombat; ngự thú sư → Genshin Impact) → tu sĩ chơi đắm chìm 3-6 giờ → lĩnh ngộ chiêu thức cụ thể từ game (Yasuo "Vô Phong Kiếm Quyết") → tu vi tăng 1 cấp → tu sĩ ngạc nhiên + bạn bè + tông môn nghe tin → cả huyện kéo đến quán → MC kiếm linh thạch + danh tiếng exponential.
- System Mechanic: Hệ Thống Quán Net Thần Cấp (Cosmic Internet Cafe System). Input: 1 lần activation = vật chất hóa 1 góc 100m² thành quán net hoàn chỉnh (30 máy + LAN + VR headsets + game library 100+). Cần: 1000 linh thạch / activation Phase 1. Output: tu sĩ + võ giả + dân thường có thể vào chơi game Earth bất cứ lúc nào; mỗi giờ chơi nạp 1 linh thạch (Earth tier 1 game) hoặc 5 linh thạch (high-tier game). MC nhận 80% revenue + 1 điểm Net Cafe Khí (NCK) cho mỗi lĩnh ngộ thành công.
- Phase 1 Playground: "Vô Trần Internet Bar" tại Thiên Vân Trấn (huyện Vô Trần Đại Lục), 100m² 30 máy + 5 VR + 1 LAN tournament room. Khách Phase 1: 5000 tu sĩ + võ giả Thiên Vân Trấn (chủ yếu Sơ-Hậu Cảnh, một số Trúc Cơ). MC vận hành quán → 1 lĩnh ngộ/ngày → tăng NCK + linh thạch.
- Social Reactor: Vương Tử Tâm (em họ MC dị giới 16t, đầu tiên giúp MC sau khi thấy tu sĩ chơi LoL ch.5), Tô Thanh Vũ (tu sĩ Trúc Cơ cao 25t, đầu tiên lĩnh ngộ "Vô Phong Kiếm Pháp" từ Yasuo LoL ch.8), giáo sư Tu Tiên Học Viện Trần Đại Phong (50t, công nhận MC là innovator ch.30), Hoàng Vân Hộ (gia chủ Hoàng gia đại tộc địa phương 45t, đặt VIP room cho con cháu chơi PUBG), Đường Thiếu Hằng (cao thủ võ giả Tiên Thiên 35t, sau khi chơi GTA V 100h trở thành đệ tử + bodyguard MC).
- Novelty Ladder: Ch.1-30 (Thiên Vân Trấn — LoL + CS + PUBG lan rộng, tu sĩ Sơ-Hậu Cảnh lĩnh ngộ). Ch.30-80 (Huyện Vô Trần đại tộc tới đặt VIP, esports tournament dị giới đầu tiên). Ch.80-150 (Quận Vô Trần — 10 chi nhánh quán net + 1 cosmic e-sports). Ch.150-300 (Đại Lục Vô Trần — 100 chi nhánh + esports league + đối đầu Hắc Vũ Tông). Ch.300+ (Cosmic — VR universe cosmic).
- Control Rules: Payoff lĩnh ngộ mỗi 2-3 chương (1 tu sĩ tăng cấp); payoff scale mỗi arc 15-20 chương (1 chi nhánh mới mở, 1 đại tộc partner). Attention Gradient: Thiên Vân Trấn → huyện Vô Trần → quận → đại lục → cosmic.

### BỐI CẢNH
Đại Lục Vô Trần — đại lục tu tiên dị giới hư cấu, văn minh tu sĩ + võ giả phổ cập 8000 năm. Hệ tu vi: Phàm Cảnh → Sơ Cảnh → Trung Cảnh → Hậu Thiên → Tiên Thiên → Tông Sư → Đại Tông Sư → Hoá Thần → Đại Thừa → Phi Thăng. Toàn lục địa có 12 đại tông phái + 1000+ tiểu môn phái + gia tộc trung lưu, dân số 500 triệu.

Quan trọng: dị giới này KHÔNG có công nghệ Earth — chưa có máy tính, chưa có internet, chưa có game (chỉ có cờ vây cờ tướng truyền thống). MC vật chất hóa quán net = đầu tiên đại lục có thiết bị này. Trở thành kỳ tích.

Thiên Vân Trấn là thị trấn cấp Huyện thuộc huyện Vô Trần (quận Vô Trần Đại Lục), 5 vạn dân + 2000 tu sĩ + 500 võ giả, có 1 Tu Tiên Học Viện cấp huyện (200 đệ tử) + 3 đại tông phái chi nhánh (Vô Trần Tông + Hắc Vũ Tông + Tử Vận Tông). MC ở Vương gia trang viên phía Tây thị trấn, dòng dõi suy tàn — Vương gia cũ 30 tu sĩ + 5 mẫu ruộng linh, hiện chỉ còn MC + 2 em họ + bà ngoại.

### NHÂN VẬT CHÍNH
- Tên: Đỗ Quốc Anh (đổi sang Vương Anh tại dị giới — họ Vương theo Vương gia)
- Tuổi: 22 tuổi dị giới (kiếp trước 26t Việt Nam, chủ quán net "Game Zone" Phương Nam + streamer LoL 500K followers, đột tử cơn đau tim lúc stream night-shift)
- Nghề/Trạng thái: Tử tước Vương gia tại Thiên Vân Trấn. Tu vi: Phàm Cảnh Cao (yếu nhất). Cha mất 6 tháng trước, mẹ ốm liệt giường, gia đình nợ Hoàng gia 5000 linh thạch.
- Tài sản hiện tại: 200 linh thạch cá nhân, một thanh kiếm sắt cấp Hạ Phẩm, 1 cuốn "Vô Trần Phong Cơ Bản Quyết" cấp Phàm phẩm (yếu nhất). Gia tộc: 30 tu sĩ + 5 mẫu ruộng linh + căn nhà gỗ 3 gian.
- Tính cách: Trầm tĩnh + sharp như streamer (combo 8 năm chủ quán net + community management VN), bảo vệ gia đình tuyệt đối, đam mê game + entertainment vô tận. Biết exact cách build community + create hype + monetize hard.
- Điểm yếu: Tu vi Phàm Cảnh — KHÔNG thể chiến đấu trực tiếp với bất cứ ai. Phụ thuộc hoàn toàn vào quán net + customers + system. Phase 1 vulnerable.

### GOLDEN FINGER
- Tên hệ thống: Hệ Thống Quán Net Thần Cấp (Cosmic Internet Cafe Materialization System).
- Cơ chế hoạt động: 1 lần activation đầu tiên (free for Phase 1 start) — vật chất hóa 1 quán net hoàn chỉnh 100m² tại vị trí MC chỉ định: 30 PC cao cấp Earth (Intel i9 + RTX 5090), 5 VR headsets, LAN gigabit, 100+ Steam games đã cài sẵn (LoL, CS2, PUBG, GTA V, Minecraft, Elden Ring, Genshin, Dota 2, Smite, Apex Legends, Valorant, Fortnite, etc.). Đầy đủ internet stable (cosmic-tier wifi). Mỗi expansion (mở thêm chi nhánh hoặc upgrade) tốn 1000 linh thạch / 100m².
- Trigger kích hoạt: Mỗi tu sĩ chơi 1 giờ nạp linh thạch (1-5 LT tùy game tier). Hệ thống tự động monetize. MC nhận 80% revenue + 1 NCK cho mỗi lĩnh ngộ thành công (tu sĩ tăng cấp tu vi từ game).
- Đường tăng trưởng cấp Quán Net Khí (NCK):
  • L1 (ch.1-30): 1 quán Thiên Vân Trấn. Activate free.
  • L2 (ch.30-80): 5 chi nhánh huyện Vô Trần. Activate 1000 LT/chi.
  • L3 (ch.80-150): 50 chi nhánh quận Vô Trần. Đại esports tournament đầu.
  • L4 (ch.150-300): 500 chi nhánh đại lục. Cosmic E-Sports League.
  • L5 (ch.300-500): Cosmic-tier VR universe quán net.
  • L6 (ch.500-750): God-level cosmic gaming network.
  • L7 (ch.750-1000): Hợp nhất với "Entertainment phần Thiên Đạo".
- Điểm yếu: Khách hàng phải tự lĩnh ngộ — MC chỉ provide platform. Một số tu sĩ không đắm chìm → KHÔNG lĩnh ngộ → không tăng tu vi → không pay back game time. Phase 1 chỉ 30 PC, scale chậm.

### CAST CHÍNH
- Vương Tử Tâm — em họ MC (16t dị giới, Sơ Cảnh Sơ), trẻ + nhanh nhẹn — Đầu tiên giúp MC operate quán net + sau này trở thành CEO chi nhánh — Cánh tay phải đầu tiên.
- Tô Thanh Vũ — tu sĩ Trúc Cơ Cao tại Tu Tiên Học Viện Thiên Vân (25t) — Đầu tiên chơi LoL Yasuo 6h đắm chìm + lĩnh ngộ "Vô Phong Kiếm Pháp" Hậu Thiên cấp ch.8 — Người mang lại reputation cho quán + đại đệ tử của MC sau này.
- Giáo sư Trần Đại Phong — mentor Tu Tiên Học Viện Thiên Vân (50t, Hoá Thần Sơ) — Đầu tiên skeptical, sau khi xem Tô Thanh Vũ + 10 đệ tử đột phá, công nhận MC là innovator — Cố vấn chính trị + cosmic ally.
- Hoàng Vân Hộ — gia chủ Hoàng gia đại tộc Thiên Vân (45t, Tiên Thiên Cao) — Đặt VIP room private cho con cháu chơi PUBG ch.30 — Đối tác tài chính + chính trị lớn nhất.
- Đường Thiếu Hằng — cao thủ võ giả Tiên Thiên (35t, mệnh danh "Đường gia kiếm khách"), gốc Đường gia tông môn — Sau khi chơi GTA V 100h + lĩnh ngộ "Vô Pháp Vô Thiên" Trục Lộc Tổng Tài kiếm pháp Tông Sư cấp ch.50, trở thành đệ tử + bodyguard MC.
- Diệp Tịnh Nhi — tiểu thư Diệp gia đại tộc 19t, Tiên Thiên Trung, Tài năng S Phù pháp — Phase 2 gặp khi đặt VR cabin chơi Genshin Impact + lĩnh ngộ "Thanh Khí Phù Pháp" cấp Tông Sư — Love interest chính + đối tác cosmic.

### ANTAGONISTS
- Hắc Vũ Tông trưởng lão Cao Tử Long — Tông Sư Đại (70t) — Đối thủ Phase 1 — Phát hiện MC's quán net dạy tu vi không cần qua tông phái, đe doạ shutdown; bị MC face-slap khi quán net được Đường Thiếu Hằng (Tiên Thiên Cao, hơn Cao Tử Long một bậc đệ tử) bảo vệ.
- Triệu Vũ Tử — đối thủ kinh doanh chủ chợ Thiên Vân (50t, đại thương nhân) — Phase 1 — Định nuốt vị trí 100m² của MC; bị MC outcompete bằng game traffic.
- Tử Vận Tông Phó Tông Chủ Lưu Hạo Nhiên — Đại Tông Sư (200t) — Phase 2-3 — Liên minh Hắc Vũ Tông chống MC khi mạng lưới Quán Net của MC đe doạ traditional tông môn revenue model.
- "Entertainment Cosmic Entity" — entity cosmic Phase 4 — Sau khi MC reach 500 chi nhánh cosmic-tier, entity reveal MC là Entertainment Sứ Giả phần Thiên Đạo.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Thiên Vân Trấn + quán net đầu tiên + Hắc Vũ Tông conflict: Goal — Quán net "Vô Trần Internet Bar" trở thành landmark Thiên Vân; 100+ tu sĩ lĩnh ngộ; Đường Thiếu Hằng + Tô Thanh Vũ + 5 cao thủ trở thành đệ tử MC. Milestone — Đại bại Hắc Vũ Tông trong cuộc đấu chợ Thiên Vân (ch.85). Stakes — Quán net bị shutdown nếu MC fail.
- PHASE 2 (Ch.100-300) — Huyện Vô Trần + 50 chi nhánh + Hoàng Vân Hộ liên minh: Goal — 50 chi nhánh quán net khắp huyện, đại esports tournament đầu tiên dị giới (giải LoL Liên Đấu), Hoàng gia + Diệp gia partner. Milestone — IPO "Vô Trần Internet Group" ch.250. Stakes — Hắc Vũ + Tử Vận liên minh.
- PHASE 3 (Ch.300-600) — Quận Vô Trần + 500 chi nhánh + Đại Lục E-Sports League: Goal — 500 chi nhánh khắp đại lục, E-Sports League với 12 đại tông phái participate. Milestone — Cosmic E-Sports World Cup ch.450. Stakes — Cosmic Entertainment Entity reveals.
- PHASE 4 (Ch.600-1000) — Cosmic VR universe + hợp nhất Thiên Đạo: Goal — MC tạo cosmic-tier VR universe nơi all-realms entities chơi, hợp nhất với Entertainment phần Thiên Đạo. Endgame: MC chọn giữa cosmic life + về Earth VN. Milestone — Cosmic reveal ch.900. Stakes — Thiên Đạo cũ muốn absorb.

### OPENING SCENE
- Location: Buồng phòng đại tôn Vương gia tại Thiên Vân Trấn Đại Lục Vô Trần, 5 giờ sáng đầu xuân, ánh đèn dầu yếu trong căn buồng cũ kỹ, mưa phùn ngoài.
- MC hành động: Đỗ Quốc Anh (Vương Anh) bừng tỉnh, đầu óc đột nhiên ngồn ngộn ký ức kiếp trước Việt Nam — 26 năm chủ quán net "Game Zone" Phương Nam, 500K followers streamer LoL, 8 năm xây community + monetization + đột tử cơn đau tim trong stream night-shift. Bên ngoài buồng, em họ Vương Tử Tâm gõ cửa: "Anh hai, Hoàng gia đại tộc vừa gửi sứ giả đòi nợ 5000 linh thạch, gia đình ta..." Đột nhiên trong tâm trí Anh bật lên giao diện UI ánh xanh-tím (LAN gaming colors): "Bind Hệ Thống Quán Net Thần Cấp thành công. Activation #1 — Free. Chọn vị trí materialize 100m² quán net hoàn chỉnh?" UI hiện danh sách 100+ Steam games đã cài sẵn — Anh đọc tên với cảm xúc khó tả: "League of Legends... Counter-Strike 2... PUBG... GTA V... Minecraft... Elden Ring... đầy đủ."
- Hook event: Vương Anh ngồi dậy, mỉm cười — kiếp trước hắn build quán net 8 năm Phương Nam mới có 30 PC, kiếp này được tặng 30 PC + 100 games trong 1 giây. Hắn ra ngoài, chỉ vào căn nhà gỗ phía Tây trang viên (rộng 120m², không sử dụng): "Materialize tại đây." UI flash, trong 30 giây, căn nhà gỗ cũ biến thành quán net cao cấp Earth-style — 30 PC RTX 5090 + 5 VR Oculus Quest Pro + LAN gigabit + game library 100+ hiển thị trên màn hình lớn. Vương Tử Tâm tròn mắt: "Anh hai... đây là gì???" Anh đứng giữa quán, mỉm cười: "Tử Tâm, gọi Tô Thanh Vũ ở Tu Tiên Học Viện đến. Anh muốn show cho ông ấy 1 thứ thú vị tên là 'League of Legends'." Hai giờ sau, Tô Thanh Vũ ngồi trước PC đầu tiên trong dị giới, headset on, login client LoL — chọn champion Yasuo "Vô Phong Kiếm Khách". Sau 6 giờ chơi đắm chìm liên tục, Tô Thanh Vũ đột phá lên Hậu Thiên Sơ — lĩnh ngộ "Vô Phong Kiếm Pháp" cấp Hậu Thiên từ moveset Yasuo. Cả Tu Tiên Học Viện sửng sốt.
- Câu mở đầu: "Trên Đại Lục Vô Trần này, tu sĩ chỉ biết ngồi thiền 100 năm để đột phá — và ta sẽ dạy họ cách đột phá bằng 6 giờ chơi League of Legends."

### WORLD RULES
- Hệ Thống Quán Net Thần Cấp là bí mật MC — chỉ Vương Tử Tâm + Tô Thanh Vũ (Phase 1) + Diệp Tịnh Nhi (Phase 2) biết.
- Game Earth materialize đầy đủ với internet stable (cosmic-tier wifi) — KHÔNG cần Earth real internet.
- Tu sĩ chơi đắm chìm 3-6 giờ → lĩnh ngộ chiêu thức từ game cụ thể. Chơi qua loa → không lĩnh ngộ.
- Mỗi tu sĩ chỉ lĩnh ngộ tu vi mới tối đa 1 cấp/tháng — game không bypass natural progression.
- Cosmic reveal Phase 4: Quán Net Khí là 1 mảnh "Entertainment phần Thiên Đạo".

### TONE & ANTI-PATTERNS
- TONE: Streamer + entrepreneur cool 40% + ấm áp staff + customers 25% + face-slap đối thủ kinh doanh 25% + cosmic Phase 4 10%. Pacing nhanh — mỗi 3 chương 1 lĩnh ngộ + 1 customer success story. Tham khảo nhịp 《不是吧？你让我在异界开网吧？》.
- NEGATIVE SPACE:
  • KHÔNG là MC tu vi mạnh — MC dựa hoàn toàn vào quán net + customers + bodyguards.
  • KHÔNG hậu cung sa đà — Diệp Tịnh Nhi vợ chính, 1-2 nữ phụ.
  • KHÔNG dùng game Earth lazy — mỗi game gắn với chiêu thức cụ thể có lý do (Yasuo→kiếm pháp, PUBG→thân pháp, Minecraft→công nghệ).
  • KHÔNG drama gia đình — focus vào quán net + community + esports.
  • KHÔNG tu tiên kiểu cũ cho MC — MC tu vi tăng qua "Quán Net Khí" + entertainment cosmic.
  • KHÔNG copy Văn Đạo V2 — Quán Net là on-premise location-bound, không cosmic broadcast.
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
  console.log(`  Game + Summon + Net trio spawn  ${apply ? '[APPLY]' : '[DRY RUN]'}`);
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
