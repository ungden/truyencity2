/**
 * Huyen-huyen "bloodline-continental-war" master template — 1000-chapter skeleton.
 *
 * Archetype: MC từ phế vật bị khinh thường, mang huyết mạch tổ tiên
 * {{BLOODLINE_NAME}} bị phong ấn (vd Phượng Hoàng / Hỗn Độn Long / Hỗn Nguyên).
 * Mở khoá huyết mạch dần qua chiến đấu, leo từ võ giả → võ thần / võ đế.
 * Khác tien-hiep: huyết mạch bloodline-driven, không tông môn cổ định, đại
 * lục sprawling với nhiều thế lực, conflict combat trực diện (giết / chém).
 *
 * Cảnh giới progression (võ đạo):
 *   Arc 1 (1-50):    Võ Đồ → Võ Giả 9 (mở khoá huyết mạch lần 1)
 *   Arc 2 (51-150):  Võ Giả → Võ Sư đỉnh (huyết mạch lần 2)
 *   Arc 3 (151-300): Võ Sư → Võ Vương (huyết mạch lần 3, gặp cổ tộc đối lập)
 *   Arc 4 (301-500): Võ Vương → Võ Tôn (cứu tộc nhân huyết mạch)
 *   Arc 5 (501-700): Võ Tôn → Võ Đế (đại lục thống nhất tạm thời)
 *   Arc 6 (701-900): Võ Đế → Võ Thánh (cổ ruins, chân tướng phong ấn)
 *   Arc 7 (901-1000): Võ Thánh → Võ Thần ({{ENDING_GOAL}})
 *
 * Beat pattern: 5-cluster (setup / breathing / confront / big_wow / resolution).
 *
 * Placeholder tokens:
 *   {{MC_NAME}}              — Tên MC, vd "Tiêu Diệp"
 *   {{MC_FAMILY}}            — Họ MC, vd "Tiêu"
 *   {{HOMETOWN}}             — Quê quán, vd "Tiêu Gia trấn"
 *   {{CONTINENT_NAME}}       — Đại lục, vd "Đẩu Khí Đại Lục"
 *   {{BLOODLINE_NAME}}       — Huyết mạch, vd "Phượng Hoàng huyết", "Hỗn Độn long"
 *   {{ANCESTOR_NAME}}        — Tổ tiên huyết mạch, vd "Phượng Tổ", "Long Tổ"
 *   {{ANTAGONIST_FAMILY}}    — Họ gia tộc đối thủ, vd "Vân Lan tông"
 *   {{ANCIENT_ENEMY}}        — Kẻ phong ấn tổ tiên, vd "Hắc Ám Cổ Đế"
 *   {{SIGNATURE_TECHNIQUE}}  — Công pháp signature, vd "Phần Quyết Cửu Tầng"
 *   {{ACADEMY_NAME}}         — Học viện / tông môn, vd "Cổ Hà Học Viện"
 *   {{COMPANION_NAME}}       — Bạn đồng hành, vd "Tiêu Huân"
 *   {{ENDING_GOAL}}          — Đích cuối, vd "Võ Thần đỉnh", "thống nhất đại lục", "siêu thoát luân hồi"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const HUYEN_HUYEN_BLOODLINE_ARC_SKELETON: ArcSkeleton[] = [
  // ─── ARC 1 (1-50): Phế vật + mở khoá huyết mạch lần 1 ──────────────────
  {
    arcNumber: 1,
    range: [1, 50],
    theme: 'Phế vật {{MC_FAMILY}} gia + mở khoá huyết mạch {{BLOODLINE_NAME}} lần 1',
    corePayoff:
      '{{MC_NAME}} từ phế vật Võ Đồ thành Võ Giả 9, huyết mạch {{BLOODLINE_NAME}} mở khoá tầng 1, đoạt vị trí trưởng tử {{MC_FAMILY}} gia, manh mối {{ACADEMY_NAME}}',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Phế vật bị khinh thường + huyết mạch lần đầu kích hoạt', payoff: 'huyết mạch tầng 1 mở (giấu), MC Võ Đồ → Võ Giả 1' },
      { number: 2, range: [6, 10], theme: 'Bí mật tu luyện {{SIGNATURE_TECHNIQUE}}', payoff: '{{SIGNATURE_TECHNIQUE}} tầng 1, MC Võ Giả 3' },
      { number: 3, range: [11, 15], theme: 'Tỷ võ gia tộc — first face-slap đệ tử {{ANTAGONIST_FAMILY}}', payoff: 'thắng đệ tử cao cấp gia tộc, danh tiếng nội tộc' },
      { number: 4, range: [16, 20], theme: 'Trưởng lão {{MC_FAMILY}} gia chú ý', payoff: 'tài nguyên tăng, MC nhập đại đường tu luyện' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: tỷ võ thị trấn — top 3', payoff: 'MC Võ Giả 6, danh tiếng thị trấn, manh mối {{ACADEMY_NAME}}' },
      { number: 6, range: [26, 30], theme: 'Mật cảnh tổ tiên — gặp di vật {{ANCESTOR_NAME}}', payoff: 'di vật tổ tiên, manh mối phong ấn {{ANCIENT_ENEMY}}' },
      { number: 7, range: [31, 35], theme: '{{ANTAGONIST_FAMILY}} tổ chức tấn công', payoff: 'MC face-slap public, gia tộc đối thủ mất uy' },
      { number: 8, range: [36, 40], theme: 'Đại tỷ võ — vé vào {{ACADEMY_NAME}}', payoff: 'MC Võ Giả 8, suất vào học viện cấp châu' },
      { number: 9, range: [41, 45], theme: 'Đoạt trưởng tử {{MC_FAMILY}} gia', payoff: 'trưởng tử công nhận, gia tộc xếp dưới MC' },
      { number: 10, range: [46, 50], theme: 'CLIMAX arc 1: rời {{HOMETOWN}} đến {{ACADEMY_NAME}}', payoff: 'MC Võ Giả 9, huyết mạch tầng 1 ổn định, sẵn sàng học viện' },
    ],
  },
  // ─── ARC 2 (51-150): {{ACADEMY_NAME}} — huyết mạch tầng 2 ──────────────
  {
    arcNumber: 2,
    range: [51, 150],
    theme: '{{ACADEMY_NAME}} — leo top học viện, huyết mạch tầng 2',
    corePayoff:
      '{{MC_NAME}} top 3 {{ACADEMY_NAME}}, Võ Sư đỉnh, huyết mạch tầng 2 mở, gặp {{COMPANION_NAME}}, manh mối tổ chức {{ANCIENT_ENEMY}}',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Nhập học {{ACADEMY_NAME}} + xếp lớp', payoff: 'MC vào lớp B, gặp các thiên tài đại lục' },
      { number: 2, range: [61, 70], theme: '{{COMPANION_NAME}} kết bạn', payoff: 'companion + đối tác chiến đấu' },
      { number: 3, range: [71, 80], theme: 'Tỷ võ học viện — face-slap đệ tử quý tộc', payoff: 'MC top 20 lớp, được trưởng lão chú ý' },
      { number: 4, range: [81, 90], theme: 'Mật cảnh học viện — thu hoạch huyết mạch nguyên', payoff: 'huyết mạch tầng 2 chuẩn bị, dược liệu cấp cao' },
      { number: 5, range: [91, 100], theme: 'BIG WOW giải tỷ võ học viện thường niên', payoff: 'top 5 toàn học viện, công nhận lớp A' },
      { number: 6, range: [101, 110], theme: 'Đột phá Võ Sư + huyết mạch tầng 2 mở', payoff: 'MC Võ Sư 1, huyết mạch tầng 2 visible' },
      { number: 7, range: [111, 120], theme: '{{ANTAGONIST_FAMILY}} đệ tử cao cấp tấn công', payoff: 'MC thắng dùng huyết mạch, đối thủ thua nhục' },
      { number: 8, range: [121, 130], theme: 'Manh mối tổ chức {{ANCIENT_ENEMY}} trong học viện', payoff: 'plot thread {{ANCIENT_ENEMY}} advance, gián điệp lộ' },
      { number: 9, range: [131, 140], theme: 'Trận chiến cuối học viện — đối thủ liên thủ', payoff: 'MC + {{COMPANION_NAME}} thắng, top 3 học viện' },
      { number: 10, range: [141, 150], theme: 'CLIMAX arc 2: tỷ võ liên học viện cấp châu — top 3', payoff: 'MC Võ Sư đỉnh, huyết mạch tầng 2 đỉnh, suất vào đế đô' },
    ],
  },
  // ─── ARC 3 (151-300): Đế đô — huyết mạch tầng 3, cổ tộc đối lập ──────
  {
    arcNumber: 3,
    range: [151, 300],
    theme: 'Đế đô {{CONTINENT_NAME}} — gặp cổ tộc đối lập, huyết mạch tầng 3',
    corePayoff:
      '{{MC_NAME}} Võ Vương 1, huyết mạch tầng 3, đoạt thế lực đế đô, gặp {{ANCESTOR_NAME}} di niệm, đối đầu cổ tộc đối lập first time',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Vào đế đô — gặp các thế lực', payoff: 'MC nhận diện 5 thế lực đế đô' },
      { number: 2, range: [166, 180], theme: 'Đột phá Võ Vương + huyết mạch tầng 3', payoff: 'MC Võ Vương 1, huyết mạch tầng 3 visible' },
      { number: 3, range: [181, 200], theme: 'Cổ tộc đối lập first contact', payoff: 'face-slap cổ tộc nhỏ, plot thread cổ tộc advance' },
      { number: 4, range: [201, 220], theme: '{{ANCESTOR_NAME}} di niệm xuất hiện', payoff: 'tổ tiên di niệm dạy MC, công pháp tổ tiên ban' },
      { number: 5, range: [221, 240], theme: 'BIG WOW giải tỷ võ đế đô — top 3', payoff: 'MC Võ Vương 5, danh tiếng đế đô' },
      { number: 6, range: [241, 260], theme: 'Cổ tộc liên thủ tấn công — first major battle', payoff: 'MC + {{COMPANION_NAME}} + tổ tiên di niệm thắng' },
      { number: 7, range: [261, 280], theme: 'Đoạt thế lực đế đô — lập phái', payoff: 'phái MC ở đế đô 100 đệ tử' },
      { number: 8, range: [281, 295], theme: 'Trận chiến cuối đế đô — liên minh chính phái thành lập', payoff: '5 phái chính liên minh dưới MC' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: MC Võ Vương đỉnh + huyết mạch tầng 3 đỉnh', payoff: 'liên minh chính phái, sẵn sàng arc 4 cứu tộc nhân' },
    ],
  },
  // ─── ARC 4 (301-500): Cứu tộc nhân huyết mạch ────────────────────────
  {
    arcNumber: 4,
    range: [301, 500],
    theme: 'Cứu tộc nhân huyết mạch {{BLOODLINE_NAME}} bị giam',
    corePayoff:
      '{{MC_NAME}} Võ Tôn 1, huyết mạch tầng 4, cứu tộc nhân từ giam {{ANCIENT_ENEMY}}, diệt cổ tộc đối lập đầu',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Manh mối tộc nhân — di niệm dẫn đường', payoff: 'biết vị trí giam tộc nhân, kế hoạch giải cứu' },
      { number: 2, range: [321, 340], theme: 'Vào cổ vực — battle với cổ thú', payoff: 'thu hoạch cổ thú huyết, huyết mạch tầng 4 chuẩn bị' },
      { number: 3, range: [341, 360], theme: 'First contact tổ chức {{ANCIENT_ENEMY}}', payoff: 'face-slap tay sai cao cấp, manh mối lõi' },
      { number: 4, range: [361, 380], theme: 'Reveal: tộc nhân bị giam ở {{HIDDEN_REALM}}', payoff: 'plot thread tộc nhân advance, MC chuẩn bị' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: tấn công căn cứ {{ANCIENT_ENEMY}} ngoại vi', payoff: 'diệt căn cứ, manh mối phong ấn' },
      { number: 6, range: [401, 420], theme: 'Đột phá Võ Tôn + huyết mạch tầng 4 mở', payoff: 'MC Võ Tôn 1, huyết mạch tầng 4 visible' },
      { number: 7, range: [421, 440], theme: 'Vào {{HIDDEN_REALM}} — gặp tộc nhân', payoff: 'tộc nhân giải cứu một phần, di tộc kế thừa' },
      { number: 8, range: [441, 460], theme: 'Trận chiến phong ấn tộc nhân', payoff: 'phong ấn lung lay, một số tộc nhân tự do' },
      { number: 9, range: [461, 480], theme: 'Reveal: {{ANCIENT_ENEMY}} chỉ là hình bóng, body chính ở thượng cổ ruins', payoff: 'plot twist, kẻ địch lõi tái xuất' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: cứu tộc nhân + diệt cổ tộc đối lập đầu + MC Võ Tôn đỉnh', payoff: 'tộc nhân tự do, MC top đại lục, sẵn sàng arc 5' },
    ],
  },
  // ─── ARC 5 (501-700): Đại lục thống nhất — Võ Đế ─────────────────────
  {
    arcNumber: 5,
    range: [501, 700],
    theme: 'Thống nhất đại lục {{CONTINENT_NAME}} — Võ Đế',
    corePayoff:
      '{{MC_NAME}} Võ Đế đỉnh, huyết mạch tầng 5, thống nhất {{CONTINENT_NAME}}, {{COMPANION_NAME}} Võ Tôn, manh mối thượng cổ ruins',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'Liên hợp các nước đại lục tấn công MC', payoff: 'phòng thủ thành công, liên minh chính phái mở rộng' },
      { number: 2, range: [521, 540], theme: 'Đột phá Võ Đế public', payoff: 'MC Võ Đế 1, đại lục choáng' },
      { number: 3, range: [541, 560], theme: 'Cổ tộc đối lập 2 xuất hiện', payoff: 'first contact cổ tộc cấp cao' },
      { number: 4, range: [561, 580], theme: 'Huyết mạch tầng 5 mở qua battle', payoff: 'MC huyết mạch tầng 5, sức mạnh tăng nhảy vọt' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: thắng cổ tộc cao cấp', payoff: 'face-slap cổ tộc, đại lục công nhận MC' },
      { number: 6, range: [601, 620], theme: '{{COMPANION_NAME}} Võ Tôn đỉnh', payoff: 'companion peak power' },
      { number: 7, range: [621, 640], theme: 'Trận chiến trung tâm — 3 cổ tộc liên thủ', payoff: 'MC + tộc nhân + {{COMPANION_NAME}} thắng' },
      { number: 8, range: [641, 660], theme: 'Manh mối thượng cổ ruins tỉnh', payoff: 'plot thread thượng cổ ruins advance' },
      { number: 9, range: [661, 680], theme: 'Trận chiến cuối liên hợp đại lục', payoff: 'tất cả nước đại lục thuần phục MC' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: MC Võ Đế đỉnh + thống nhất đại lục', payoff: '{{CONTINENT_NAME}} thống nhất, sẵn sàng arc 6 thượng cổ' },
    ],
  },
  // ─── ARC 6 (701-900): Thượng cổ ruins — chân tướng phong ấn ─────────
  {
    arcNumber: 6,
    range: [701, 900],
    theme: 'Thượng cổ ruins — chân tướng phong ấn + Võ Thánh',
    corePayoff:
      '{{MC_NAME}} Võ Thánh, huyết mạch tầng 6, giải mã chân tướng phong ấn {{ANCESTOR_NAME}}, {{ANCIENT_ENEMY}} body chính lộ',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Thượng cổ ruins thức tỉnh — đại lục biến', payoff: 'first contact thượng cổ space' },
      { number: 2, range: [721, 740], theme: 'MC investigate ruins — manh mối {{ANCESTOR_NAME}}', payoff: 'manh mối chân tướng, đột phá Võ Thánh' },
      { number: 3, range: [741, 760], theme: 'Reveal: {{ANCIENT_ENEMY}} setup phong ấn {{ANCESTOR_NAME}}', payoff: 'chân tướng phơi bày, tộc nhân + {{COMPANION_NAME}} biết' },
      { number: 4, range: [761, 780], theme: 'Trận chiến ruins — đối thủ thượng cổ', payoff: 'face-slap thượng cổ pháp bảo' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: lấy lại pháp bảo {{ANCESTOR_NAME}}', payoff: 'pháp bảo bản mệnh, đại lục công nhận' },
      { number: 6, range: [801, 820], theme: 'Reveal: huyết mạch {{BLOODLINE_NAME}} là kế hoạch tổ tiên', payoff: 'lore expand, MC kế thừa di nguyện' },
      { number: 7, range: [821, 840], theme: 'Huyết mạch tầng 6 mở — peak', payoff: 'huyết mạch tầng 6, MC Võ Thánh đỉnh' },
      { number: 8, range: [841, 860], theme: '{{ANCIENT_ENEMY}} body chính lộ', payoff: 'kẻ địch chính xuất hiện, MC chuẩn bị' },
      { number: 9, range: [861, 880], theme: 'Trận chiến cuối ruins — phong ấn vỡ', payoff: 'phong ấn vỡ, {{ANCESTOR_NAME}} hoàn toàn tự do' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: MC Võ Thánh đỉnh + tổ tiên di niệm hợp', payoff: 'MC + tổ tiên di niệm, sẵn sàng final battle' },
    ],
  },
  // ─── ARC 7 (901-1000): Võ Thần + ENDING ──────────────────────────────
  {
    arcNumber: 7,
    range: [901, 1000],
    theme: 'Võ Thần + {{ENDING_GOAL}}',
    corePayoff:
      '{{MC_NAME}} Võ Thần, huyết mạch tầng 7 (final), thắng {{ANCIENT_ENEMY}}, đạt {{ENDING_GOAL}}, ending warm với tộc nhân + {{COMPANION_NAME}}',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Quái lực thiên đạo bias — last threat hidden', payoff: 'phát hiện thiên đạo cản trở MC' },
      { number: 2, range: [921, 940], theme: 'Đột phá Võ Thần — final realm', payoff: 'MC Võ Thần, huyết mạch tầng 7 visible' },
      { number: 3, range: [941, 960], theme: '{{ANCIENT_ENEMY}} final battle setup', payoff: 'liên minh đại lục + tổ tiên + {{COMPANION_NAME}}' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: trận chiến cuối {{ANCIENT_ENEMY}}', payoff: '{{ANCIENT_ENEMY}} thua hoàn toàn, đại lục thái bình' },
      { number: 5, range: [981, 1000], theme: 'ENDING: {{ENDING_GOAL}} + warm closure', payoff: 'MC chọn {{ENDING_GOAL}}, tộc nhân + {{COMPANION_NAME}} đồng hành, ending warm' },
    ],
  },
];
