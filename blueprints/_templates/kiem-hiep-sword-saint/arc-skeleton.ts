/**
 * Kiem-hiep "sword-saint" master template — 1000-chapter skeleton.
 *
 * Archetype: MC thiếu niên kiếm khách võ lâm cổ trang Trung Hoa, gia đình
 * bị diệt môn bởi {{ANTAGONIST_SECT}}, học nội công bí truyền {{SIGNATURE_SWORD}},
 * leo từ vô danh tiểu tốt → kiếm thánh. Wuxia cổ điển với giang hồ, ma đạo,
 * môn phái, võ lâm minh chủ.
 *
 * Cảnh giới (cảnh giới võ học cổ điển):
 *   Arc 1 (1-50):    Thiếu niên → tam lưu cao thủ (môn phái nhỏ)
 *   Arc 2 (51-150):  Tam lưu → nhị lưu (môn phái lớn)
 *   Arc 3 (151-300): Nhị lưu → nhất lưu (võ lâm danh môn)
 *   Arc 4 (301-500): Nhất lưu → tuyệt đỉnh (đối phó {{ANTAGONIST_SECT}})
 *   Arc 5 (501-700): Tuyệt đỉnh → kiếm tông sư (võ lâm minh chủ)
 *   Arc 6 (701-900): Kiếm tông sư → kiếm thánh (cosmic ruins, ngàn năm trước)
 *   Arc 7 (901-1000): Kiếm thánh → {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_FAMILY}}, {{HOMETOWN}}
 *   {{SECT_NAME}} — Môn phái MC, vd "Thanh Vân Phái"
 *   {{SIGNATURE_SWORD}} — Kiếm pháp / nội công, vd "Cửu Kiếm Quyết"
 *   {{ANTAGONIST_SECT}} — Môn phái ác, vd "Hắc Long Bang"
 *   {{ANCIENT_DEMON}} — Cosmic ma đạo, vd "Vạn Cổ Ma Tổ"
 *   {{LIFE_PARTNER}} — Bạn đời / pháp lữ, vd "Tô Linh"
 *   {{LOYAL_FRIEND}} — Bạn nghĩa kết, vd "Trương Khải"
 *   {{JIANGHU_REGION}} — Khu vực giang hồ, vd "Trung Nguyên"
 *   {{ENDING_GOAL}} — vd "Kiếm thánh đỉnh + võ lâm minh chủ"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const KIEM_HIEP_SWORD_SAINT_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Diệt môn → vào {{SECT_NAME}}',
    corePayoff: 'MC tam lưu cao thủ, học {{SIGNATURE_SWORD}} 3 tầng, gặp {{LOYAL_FRIEND}}, manh mối {{ANTAGONIST_SECT}}',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — gia đình diệt môn, MC sống sót, sách bí truyền', payoff: 'sống sót + sách bí truyền tổ tiên' },
      { number: 2, range: [6, 10], theme: 'Tu luyện hidden — bí truyền tầng 1', payoff: '{{SIGNATURE_SWORD}} tầng 1' },
      { number: 3, range: [11, 15], theme: 'Đăng ký {{SECT_NAME}} ngoại đệ tử', payoff: 'đệ tử bài, tài nguyên cấp 1' },
      { number: 4, range: [16, 20], theme: '{{LOYAL_FRIEND}} kết bạn nghĩa kết', payoff: 'huynh đệ + đối tác' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: tỷ võ ngoại đệ tử', payoff: 'top 5 ngoại đệ tử, được trưởng lão chú ý' },
      { number: 6, range: [26, 30], theme: '{{ANTAGONIST_SECT}} đệ tử tấn công', payoff: 'face-slap, đối thủ thua nhục' },
      { number: 7, range: [31, 35], theme: 'Mật cảnh môn phái — thu hoạch dược', payoff: 'tài nguyên cấp 2' },
      { number: 8, range: [36, 40], theme: 'Tỷ võ vào nội đệ tử', payoff: 'nội đệ tử, suất tham gia giang hồ' },
      { number: 9, range: [41, 45], theme: 'Reveal: {{ANTAGONIST_SECT}} chính là kẻ diệt môn', payoff: 'plot thread arc 4 plant' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: tam lưu cao thủ + nội đệ tử', payoff: 'sẵn sàng arc 2 nhị lưu' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: '{{JIANGHU_REGION}} giang hồ — nhị lưu cao thủ',
    corePayoff: 'Nhị lưu, {{SIGNATURE_SWORD}} tầng 5, gặp {{LIFE_PARTNER}}, đối đầu {{ANTAGONIST_SECT}} cấp đại biểu',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Vào {{JIANGHU_REGION}} — gặp các môn phái', payoff: 'network giang hồ' },
      { number: 2, range: [61, 70], theme: '{{LIFE_PARTNER}} xuất hiện', payoff: 'pháp lữ + đối tác' },
      { number: 3, range: [71, 80], theme: '{{SIGNATURE_SWORD}} tầng 4 đột phá', payoff: 'sức mạnh nhảy vọt' },
      { number: 4, range: [81, 90], theme: 'Giải đấu giang hồ — top 10', payoff: 'danh tiếng giang hồ' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: thắng đại biểu {{ANTAGONIST_SECT}}', payoff: 'face-slap mass' },
      { number: 6, range: [101, 110], theme: 'Mật cảnh giang hồ - dược cao cấp', payoff: 'tài nguyên cấp 3' },
      { number: 7, range: [111, 120], theme: '{{SIGNATURE_SWORD}} tầng 5 đột phá', payoff: 'tầng 5 visible' },
      { number: 8, range: [121, 130], theme: 'Liên minh chính phái', payoff: '5 môn chính liên minh' },
      { number: 9, range: [131, 140], theme: 'Trận chiến cuối khu vực', payoff: '{{ANTAGONIST_SECT}} chi nhánh khu tan' },
      { number: 10, range: [141, 150], theme: 'CLIMAX: nhị lưu + pháp lữ', payoff: 'sẵn sàng arc 3 nhất lưu' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Võ lâm danh môn — nhất lưu',
    corePayoff: 'Nhất lưu, {{SIGNATURE_SWORD}} tầng 7, đoạt vị trí trong tứ đại danh môn, đối đầu {{ANTAGONIST_SECT}} cấp tổ',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Tham gia tứ đại danh môn đại hội', payoff: 'top 10 đại hội' },
      { number: 2, range: [166, 180], theme: '{{SIGNATURE_SWORD}} tầng 6 đột phá', payoff: 'sức mạnh peak nhị lưu' },
      { number: 3, range: [181, 200], theme: 'Tứ đại danh môn nội đấu', payoff: 'top 3 trong tứ đại' },
      { number: 4, range: [201, 220], theme: '{{ANTAGONIST_SECT}} cấp tổ first contact', payoff: 'face-slap qua wushu' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: võ lâm thiếu niên minh chủ', payoff: 'thiếu niên minh chủ' },
      { number: 6, range: [241, 260], theme: '{{SIGNATURE_SWORD}} tầng 7 đột phá', payoff: 'tầng 7 visible' },
      { number: 7, range: [261, 280], theme: 'Mật cảnh tứ đại danh môn — dược tuyệt đỉnh', payoff: 'tài nguyên peak nhất lưu' },
      { number: 8, range: [281, 295], theme: 'Trận chiến cuối tứ đại - thiếu niên minh chủ thực', payoff: 'thiếu niên minh chủ confirmed' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: nhất lưu + thiếu niên minh chủ', payoff: 'sẵn sàng arc 4 tuyệt đỉnh' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Tuyệt đỉnh — diệt {{ANTAGONIST_SECT}}',
    corePayoff: 'Tuyệt đỉnh, {{SIGNATURE_SWORD}} tầng 9, diệt {{ANTAGONIST_SECT}} hoàn toàn, báo thù gia đình',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Liên hợp võ lâm chính phái chống {{ANTAGONIST_SECT}}', payoff: '20 môn chính liên minh dưới MC' },
      { number: 2, range: [321, 340], theme: '{{SIGNATURE_SWORD}} tầng 8 đột phá', payoff: 'realm tuyệt đỉnh' },
      { number: 3, range: [341, 360], theme: 'Tấn công căn cứ {{ANTAGONIST_SECT}} ngoại vi', payoff: 'first căn cứ bại' },
      { number: 4, range: [361, 380], theme: '{{ANTAGONIST_SECT}} chưởng môn first contact', payoff: 'face-slap qua wushu peak' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: chiếm {{ANTAGONIST_SECT}} HQ', payoff: 'HQ bại, chưởng môn lui' },
      { number: 6, range: [401, 420], theme: '{{SIGNATURE_SWORD}} tầng 9 đột phá', payoff: 'tầng 9 visible' },
      { number: 7, range: [421, 440], theme: 'Reveal: {{ANCIENT_DEMON}} dấu vết kiếp trước', payoff: 'plot thread arc 6 plant' },
      { number: 8, range: [441, 460], theme: 'Trận chiến chưởng môn {{ANTAGONIST_SECT}}', payoff: 'chưởng môn xử' },
      { number: 9, range: [461, 480], theme: 'Báo thù gia đình hoàn thành', payoff: 'gia đình diệt môn được báo thù' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: tuyệt đỉnh + {{ANTAGONIST_SECT}} diệt', payoff: 'sẵn sàng arc 5 minh chủ' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Võ lâm minh chủ — kiếm tông sư',
    corePayoff: 'Kiếm tông sư, võ lâm minh chủ, {{LIFE_PARTNER}} pháp lữ peak, đại lục thái bình',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'Phong võ lâm minh chủ', payoff: 'minh chủ vị, đại lục công nhận' },
      { number: 2, range: [521, 540], theme: 'Tổ chức võ lâm minh chủ thống nhất', payoff: '50 môn phái thuần phục' },
      { number: 3, range: [541, 560], theme: 'Mã giáo phục hồi — first contact', payoff: 'plot thread escalate' },
      { number: 4, range: [561, 580], theme: 'Kiếm tông sư breakthrough', payoff: 'realm mới' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: thắng mã giáo cấp đại', payoff: 'mã giáo lui' },
      { number: 6, range: [601, 620], theme: '{{LIFE_PARTNER}} đột phá tuyệt đỉnh', payoff: 'pháp lữ peak' },
      { number: 7, range: [621, 640], theme: 'Đại hội võ lâm thái bình', payoff: 'võ lâm thống nhất' },
      { number: 8, range: [641, 660], theme: 'Manh mối ngàn năm trước - kiếm thánh tổ', payoff: 'plot thread arc 6 advance' },
      { number: 9, range: [661, 680], theme: 'Trận chiến cuối mã giáo', payoff: 'mã giáo bại' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: kiếm tông sư + minh chủ', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic ruins ngàn năm — kiếm thánh',
    corePayoff: 'Kiếm thánh, ruins ngàn năm reveal kiếm thánh tổ, {{ANCIENT_DEMON}} body lộ',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Cosmic ruins thức tỉnh', payoff: 'first contact ruins' },
      { number: 2, range: [721, 740], theme: 'Investigate ruins - kiếm thánh tổ', payoff: 'lore reveal kiếm thánh tổ' },
      { number: 3, range: [741, 760], theme: 'Reveal: {{ANCIENT_DEMON}} đã từng đối phó kiếm thánh tổ', payoff: 'lore expand' },
      { number: 4, range: [761, 780], theme: 'Trận chiến ruins demon', payoff: 'face-slap demon' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: lấy lại pháp bảo kiếm thánh tổ', payoff: 'pháp bảo bản mệnh' },
      { number: 6, range: [801, 820], theme: 'Reveal: MC là kiếm thánh tổ reincarnation', payoff: 'lore peak' },
      { number: 7, range: [821, 840], theme: 'Lập kiếm thánh đạo thống', payoff: 'đạo thống MC' },
      { number: 8, range: [841, 860], theme: '{{LIFE_PARTNER}} kiếm tông sư peak', payoff: 'pháp lữ peak' },
      { number: 9, range: [861, 880], theme: '{{ANCIENT_DEMON}} body chính lộ', payoff: 'final boss' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: kiếm thánh đỉnh', payoff: 'sẵn sàng final battle' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, võ lâm thái bình, ending warm với {{LIFE_PARTNER}} + {{LOYAL_FRIEND}}',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last threat - {{ANCIENT_DEMON}} cosmic protocol', payoff: 'phát hiện protocol' },
      { number: 2, range: [921, 940], theme: 'Build cosmic-tier solution', payoff: 'plan ready' },
      { number: 3, range: [941, 960], theme: 'Final battle {{ANCIENT_DEMON}}', payoff: 'BBEG thua' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt', payoff: 'cosmic-tier achievement' },
      { number: 5, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'MC + companions retire, võ lâm thái bình, ending warm' },
    ],
  },
];
