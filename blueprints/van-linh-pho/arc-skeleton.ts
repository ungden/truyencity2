/**
 * Vạn Linh Phổ — 1000-chapter blueprint skeleton.
 *
 * Beat pattern (5-chapter cluster):
 *   ch.X+0: setup
 *   ch.X+1: breathing
 *   ch.X+2: confront
 *   ch.X+3: big_wow (mass face-slap, milestone, evolve visible)
 *   ch.X+4: resolution + breathing nhẹ
 *
 * 1000 ch / 5 = 200 clusters → 200 big_wow events.
 *
 * Per chapter brief:
 *   { n, beat, brief (1 line), scenes (4-6), mcBenefit (concrete), threadsAdvance, threadsResolve, newThreads, risks (ban list) }
 *
 * MC arc (cảnh giới Ngự Thú Sư) progression:
 *   Arc 1 (ch.1-50):    Đồ Tể tầng 3 → Sơ Cấp tầng 1
 *   Arc 2 (ch.51-150):  Sơ Cấp tầng 1 → Sơ Cấp tầng 9 đỉnh
 *   Arc 3 (ch.151-300): Sơ Cấp đỉnh → Trung Cấp tầng 5
 *   Arc 4 (ch.301-500): Trung Cấp tầng 5 → Cao Cấp tầng 1 (cứu bố mẹ payoff)
 *   Arc 5 (ch.501-700): Cao Cấp tầng 1 → Đại Sư tầng 1
 *   Arc 6 (ch.701-900): Đại Sư → Truyền Thuyết tầng 1
 *   Arc 7 (ch.901-1000): Truyền Thuyết → Thần Thoại tầng 1 (bá chủ)
 *
 * Pet portfolio expand timeline:
 *   Arc 1: Tro Bụi → Lửa Tro E (ch.4-5) → Phượng Linh C (ch.45-50 climax). Cơ Niệm acquired ch.20+. Lục Vũ activated ch.40+ → Phong Yến E.
 *   Arc 2: Tro Bụi Phượng Linh C → Hỏa Phụng Tế A peak. Cơ Niệm Cơ Khí Vũ Sĩ D → Thần Thuật Cơ Sư B. Lục Vũ Phong Linh C.
 *   Arc 3: Tro Bụi Hỏa Phụng Tế A. Cơ Niệm Thần Thuật Cơ Sư B. Lục Vũ Phong Linh Vương B. Acquire pet thứ 4 (Mộc Linh) ch.200+.
 *   Arc 4: Pet thứ 5 (Thuỷ Quân) acquired Bắc Vực. Tro Bụi → Hỏa Phụng Tế A peak.
 *   Arc 5: Tro Bụi → Vạn Lửa Thiên Phụng S. Pet portfolio 6 con.
 *   Arc 6: Tro Bụi → Hồng Hoang Phụng Tổ SS path start.
 *   Arc 7: Pet portfolio peak. Tro Bụi → Hồng Hoang Phụng Tổ SS final. MC chế tạo Vạn Linh Phổ V2.
 *
 * Family tree milestones (resolve points):
 *   Bố Cố Hành + mẹ Lưu Tiêm Nhi: revealed mid arc 4 (ch.350-400), rescued ch.480-500.
 *   Em gái Cố Tiểu Đào: lộ talent thông giao tâm linh ch.180-220 (arc 3). Trở thành Đại Sư thông giao ch.700+.
 *   Vạn Linh Phổ origin: revealed arc 6 (ch.750-800) — tổ phụ Cố Lập Khải xuyên hồn từ Trái Đất ngàn năm trước.
 */

// Re-export shared types so existing arc-1-detail import keeps working.
export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton as ArcSkeletonType } from '../../src/services/story-engine/blueprint/types';

export const VAN_LINH_PHO_ARC_SKELETON: ArcSkeletonType[] = [
  // ─── ARC 1 (ch.1-50): Phục hưng nội tộc ─────────────────────────────────
  {
    arcNumber: 1,
    range: [1, 50],
    theme: 'Phục hưng nội tộc — đoạt lại quyền thừa kế',
    corePayoff: 'Cố Diệp đoạt trưởng tộc danh phận từ chú Cố Trường Khải, gia tộc Cố từ phế tộc thành tiểu tộc lại, vào kho di sản tổ phụ, manh mối bố mẹ Bắc Vực',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline + Vạn Linh Phổ activate', payoff: 'Tro Bụi acquired + evolve Lửa Tro E (ch.4)' },
      { number: 2, range: [6, 10], theme: 'Cố Già Tâm mentor + đệ tử trẻ network', payoff: 'kho di sản tạm thời mở (sách tiến hóa cổ)' },
      { number: 3, range: [11, 15], theme: 'Giải đấu Vân Kiếm — first BIG WOW mass face-slap', payoff: 'Tro Bụi kìm chế F+ thắng Bạch Ngân Lang D, 30 đệ tử shock' },
      { number: 4, range: [16, 20], theme: 'Bằng chứng Cố Trường Lệ biển thủ', payoff: 'Trường Lệ rút hội đồng + bồi hoàn 3 pet quý' },
      { number: 5, range: [21, 25], theme: 'Acquire Cơ Niệm + face-slap Cố Khiếu', payoff: 'Pet thứ 2, Khiếu bị hội đồng cảnh cáo' },
      { number: 6, range: [26, 30], theme: 'Activate Lục Vũ + Tro Bụi → Phượng Linh C path', payoff: 'pet thứ 3 đầu chuỗi tiến hóa, Tro Bụi tiến độ 50%' },
      { number: 7, range: [31, 35], theme: 'Cố Trường Khải tung Vương thị tiểu tộc', payoff: 'first external antagonist ngắt quãng, MC face-slap Vương thị đại biểu' },
      { number: 8, range: [36, 40], theme: 'Bằng chứng cuối cùng + cuộc họp đại trưởng lão', payoff: '4 trưởng lão biển thủ bị loại hết' },
      { number: 9, range: [41, 45], theme: 'Trường Khải bắt cóc Cố Tiểu Đào — climax setup', payoff: 'em gái bị bắt, MC chuẩn bị final battle' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: MC trận chiến cuối + đoạt trưởng tộc + vào kho di sản', payoff: 'Cố tộc tiểu tộc, Tro Bụi → Phượng Linh C visible, manh mối bố mẹ' },
    ],
  },
  // ─── ARC 2 (ch.51-150): Tranh đoạt tiểu tộc Linh Châu ───────────────────
  {
    arcNumber: 2,
    range: [51, 150],
    theme: 'Tranh đoạt tiểu tộc Linh Châu — Vương thị + Lý thị',
    corePayoff: 'Cố tộc đè bẹp Vương thị + Lý thị, leo trung tộc Linh Châu Thành, mở chuỗi cửa hàng pet thuần hoá ngầm, Cố Vân Kiếm redemption, Tro Bụi → Hỏa Phụng Tế A peak',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Cố Diệp tổ chức nội tộc', payoff: 'tài chính ổn, 5 đệ tử nhánh lập' },
      { number: 2, range: [61, 70], theme: 'Cố Vân Kiếm redemption arc start', payoff: 'Vân Kiếm chuyển hướng, theo MC' },
      { number: 3, range: [71, 80], theme: 'Vương thị tổ chức tấn công', payoff: 'Vương thị đại biểu thua' },
      { number: 4, range: [81, 90], theme: 'Tro Bụi → Phượng Linh giai đoạn cuối', payoff: 'Phượng Linh visible với 5 cấp ẩn tier' },
      { number: 5, range: [91, 100], theme: 'BIG WOW giải đấu trung tộc Linh Châu', payoff: 'Cố tộc xếp top 3 Linh Châu' },
      { number: 6, range: [101, 110], theme: 'Lý thị mua chuộc + ám sát thất bại', payoff: 'Lý thị lộ âm mưu, mất uy tín' },
      { number: 7, range: [111, 120], theme: 'Tro Bụi → Hỏa Phụng Tế A path activate', payoff: 'Tro Bụi cấp B, Cơ Niệm cấp B, Lục Vũ cấp C' },
      { number: 8, range: [121, 130], theme: 'Mở chuỗi cửa hàng pet thuần hoá ngầm', payoff: 'doanh thu, network thương nhân Linh Châu' },
      { number: 9, range: [131, 140], theme: 'Vương thị + Lý thị liên thủ tấn công cuối', payoff: 'cả 2 tiểu tộc bại, Cố tộc trung tộc' },
      { number: 10, range: [141, 150], theme: 'CLIMAX arc 2: Tro Bụi Hỏa Phụng Tế A peak visible, MC Trung Cấp', payoff: 'Cố tộc trung tộc Linh Châu thành công nhận' },
    ],
  },
  // ─── ARC 3 (ch.151-300): Liên minh trung tộc ─────────────────────────────
  {
    arcNumber: 3,
    range: [151, 300],
    theme: 'Liên minh trung tộc Linh Châu — 4 trung tộc liên thủ',
    corePayoff: 'Cố tộc đại tộc thành Linh Châu, mở học viện ngự thú riêng, Cố Tiểu Đào lộ talent thông giao tâm linh, acquire pet thứ 4 Mộc Linh',
    subArcs: [
      { number: 1, range: [151, 160], theme: 'Liên minh trung tộc giả lập', payoff: '4 trung tộc đe doạ, MC dò ý' },
      { number: 2, range: [161, 175], theme: 'Cố Tiểu Đào lộ talent thông giao', payoff: 'em gái trở thành ngự thú sư, MC bảo vệ tinh thần' },
      { number: 3, range: [176, 195], theme: 'Acquire Mộc Linh pet thứ 4', payoff: 'pet portfolio 4 con, web pet phối hợp' },
      { number: 4, range: [196, 215], theme: 'Liên minh trung tộc tấn công đầu tiên', payoff: 'Cố tộc thắng đợt 1, Trung tộc Hoàng thị bại' },
      { number: 5, range: [216, 235], theme: 'BIG WOW giải đấu liên trung tộc Linh Châu', payoff: 'Cố tộc đại biểu thắng 4/5 trận' },
      { number: 6, range: [236, 255], theme: 'Trung tộc Trầm thị + Lý thị tổ chức ám sát', payoff: 'ám sát fail, Cố tộc khôi phục' },
      { number: 7, range: [256, 275], theme: 'Mở học viện ngự thú riêng Cố tộc', payoff: 'tuyển 50 đệ tử, thành lập system tu luyện' },
      { number: 8, range: [276, 290], theme: 'Trận chiến cuối liên minh trung tộc', payoff: 'cả 4 trung tộc bại, Cố tộc đại tộc' },
      { number: 9, range: [291, 300], theme: 'CLIMAX arc 3: MC Trung Cấp tầng 5, Cố tộc đại tộc Linh Châu', payoff: 'Cố tộc xếp #1 Linh Châu, kế hoạch Bắc Vực' },
    ],
  },
  // ─── ARC 4 (ch.301-500): Bắc Vực — cứu bố mẹ ─────────────────────────────
  {
    arcNumber: 4,
    range: [301, 500],
    theme: 'Bắc Vực — đại tộc Bắc Châu kẻ gài bẫy bố mẹ',
    corePayoff: 'Cứu bố Cố Hành + mẹ Lưu Tiêm Nhi từ giam cầm Bắc Châu, diệt đại tộc Bắc Châu, Tro Bụi Hỏa Phụng Tế A peak, MC Cao Cấp',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Cố tộc xuất phát Bắc Vực — beast preserve', payoff: 'pet thứ 5 Thuỷ Quân acquired, manh mối bố mẹ' },
      { number: 2, range: [321, 340], theme: 'Khám phá Bắc Vực ngoại vi', payoff: 'tài nguyên hiếm, công thức tiến hóa cổ' },
      { number: 3, range: [341, 360], theme: 'Đại tộc Bắc Châu xuất hiện — first contact', payoff: 'face-slap đại biểu Bắc Châu nhỏ' },
      { number: 4, range: [361, 380], theme: 'Reveal: Bắc Châu giam bố mẹ + manh mối location', payoff: 'plot thread bố mẹ resolve start' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: tấn công căn cứ Bắc Châu phụ', payoff: 'Cố tộc thắng + giải cứu vài tù binh, manh mối thêm' },
      { number: 6, range: [401, 420], theme: 'Bắc Châu phản công Cố tộc tại Linh Châu', payoff: 'Cố tộc giữ vững, Vân Kiếm thành tướng cao' },
      { number: 7, range: [421, 440], theme: 'Cố Diệp dẫn quân tinh anh vào Bắc Châu lõi', payoff: 'tuyến tiến hóa Tro Bụi → Hỏa Phụng Tế A complete' },
      { number: 8, range: [441, 460], theme: 'Trận chiến trung tâm Bắc Châu', payoff: 'tướng lĩnh Bắc Châu bại' },
      { number: 9, range: [461, 480], theme: 'Reveal cuối: tổ phụ Cố Lập Khải có liên kết với Bắc Châu', payoff: 'plot thread tổ phụ origin start' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: cứu bố mẹ + diệt đại tộc Bắc Châu + MC Cao Cấp', payoff: 'gia đình đoàn tụ, Cố tộc bá tộc khu vực Bắc Vực' },
    ],
  },
  // ─── ARC 5 (ch.501-700): Liên hợp đại lục clan ──────────────────────────
  {
    arcNumber: 5,
    range: [501, 700],
    theme: 'Liên hợp đại lục clan — Cố tộc thành mục tiêu',
    corePayoff: 'Cố tộc thành bá tộc đại lục, MC tiến vào Đại Sư cảnh, Tro Bụi Vạn Lửa Thiên Phụng S, phát hiện thân phận xuyên hồn của tổ phụ',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'Liên hợp đại lục clan tập trung tấn công Cố tộc', payoff: 'Cố tộc phòng thủ thành công đợt 1' },
      { number: 2, range: [521, 540], theme: 'Bố Cố Hành dạy MC kỹ năng Cao Cấp', payoff: 'MC kỹ năng kết hợp pet vs faction' },
      { number: 3, range: [541, 560], theme: 'Liên hợp clan dùng pet S khủng', payoff: 'first encounter pet S, MC bí mật prepare' },
      { number: 4, range: [561, 580], theme: 'Tro Bụi → Vạn Lửa Thiên Phụng S path activate', payoff: 'pet portfolio cấp S đầu tiên' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: Cố tộc thắng đại tộc Hoàng Châu', payoff: 'face-slap đại lục clan, danh vọng' },
      { number: 6, range: [601, 620], theme: 'Tổ phụ Cố Lập Khải secret reveal start', payoff: 'plot thread tổ phụ origin advance — possibly xuyên hồn?' },
      { number: 7, range: [621, 640], theme: 'Liên minh clan tuyến phía nam tấn công', payoff: 'Cố tộc liên minh với 2 đại tộc đối lập' },
      { number: 8, range: [641, 660], theme: 'Tro Bụi → Vạn Lửa Thiên Phụng S complete + reveal', payoff: 'public reveal pet S, đại lục choáng' },
      { number: 9, range: [661, 680], theme: 'Trận chiến trung tâm đại lục', payoff: 'liên hợp clan tan rã, Cố tộc bá tộc' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: MC Đại Sư + Cố tộc bá tộc + reveal tổ phụ xuyên hồn', payoff: 'MC tiến lên dimension cao hơn' },
    ],
  },
  // ─── ARC 6 (ch.701-900): Hệ tộc thượng cổ thần thú ──────────────────────
  {
    arcNumber: 6,
    range: [701, 900],
    theme: 'Hệ tộc thượng cổ thần thú trở lại — Vạn Thú Lĩnh',
    corePayoff: 'Tro Bụi → Hồng Hoang Phụng Tổ SS path activate, thần thú thượng cổ lập minh ước với Cố tộc, giải mã liên kết Vạn Linh Phổ với Trái Đất',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Vạn Thú Lĩnh thức tỉnh — thần thú thượng cổ', payoff: 'first contact Phượng Tổ ancient' },
      { number: 2, range: [721, 740], theme: 'Cố Diệp investigate Vạn Linh Phổ origin', payoff: 'manh mối Trái Đất từ ghi chép tổ phụ' },
      { number: 3, range: [741, 760], theme: 'Hệ tộc thần thú đề nghị thử thách Cố tộc', payoff: 'thử thách arc start, prize = minh ước' },
      { number: 4, range: [761, 780], theme: 'Tro Bụi → Hồng Hoang Phụng Tổ SS giai đoạn đầu', payoff: 'pet đầu tiên cấp SS chuẩn bị' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: Cố Diệp vượt thử thách thần thú', payoff: 'minh ước thiết lập, đại lục choáng' },
      { number: 6, range: [801, 820], theme: 'Reveal Vạn Linh Phổ origin = Trái Đất research network', payoff: 'plot thread Vạn Linh Phổ origin gần resolve' },
      { number: 7, range: [821, 840], theme: 'Em gái Cố Tiểu Đào trở thành Đại Sư thông giao tâm linh', payoff: 'em gái peak power, độc lập' },
      { number: 8, range: [841, 860], theme: 'Liên kết Trái Đất + đại lục — choice point', payoff: 'MC chọn ở lại đại lục' },
      { number: 9, range: [861, 880], theme: 'Tro Bụi → Hồng Hoang Phụng Tổ SS path complete', payoff: 'pet đầu tiên cấp SS visible' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: thần thú thượng cổ confirm minh ước, Cố tộc và thần thú', payoff: 'MC Truyền Thuyết tầng 1' },
    ],
  },
  // ─── ARC 7 (ch.901-1000): Thiên Đạo bá chủ ──────────────────────────────
  {
    arcNumber: 7,
    range: [901, 1000],
    theme: 'Thiên Đạo bá chủ Vạn Linh',
    corePayoff: 'MC Thần Thoại tầng 1, bá chủ Vạn Linh Đại Lục, Tro Bụi Hồng Hoang Phụng Tổ SS final, Vạn Linh Phổ V2 chế tạo, ending gia đình + đại lục',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Quái lực thiên đạo bias — last antagonist', payoff: 'phát hiện thiên đạo cản trở MC' },
      { number: 2, range: [921, 940], theme: 'Cố Diệp chế tạo Vạn Linh Phổ V2', payoff: 'tool transferable cho gia tộc' },
      { number: 3, range: [941, 960], theme: 'Trận chiến cuối thiên đạo bias', payoff: 'face-slap thiên đạo, MC Thần Thoại' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: Tro Bụi Hồng Hoang Phụng Tổ SS final form', payoff: 'pet đại lục mạnh nhất, đại lục công nhận' },
      { number: 5, range: [981, 1000], theme: 'ENDING: bá chủ Vạn Linh, gia đình đoàn tụ, em gái độc lập', payoff: 'MC chọn tu vi cao + ở lại đại lục, ending warm' },
    ],
  },
];

// UNIVERSAL_BANNED_PATTERNS moved to src/services/story-engine/blueprint/universal-bans.ts.
// Per-novel extras live in blueprints/van-linh-pho/index.ts under extraBannedPatterns.
