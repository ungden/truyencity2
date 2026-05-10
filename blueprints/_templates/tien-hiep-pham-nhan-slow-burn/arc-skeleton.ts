/**
 * Tien-hiep "phàm nhân slow burn" — Phàm Nhân Tu Tiên Truyện archetype.
 *
 * Khác returning-expert: MC tài chất bình thường, không có ký ức kiếp
 * trước, không golden finger lớn. Tu luyện qua tích luỹ tài nguyên +
 * công pháp + chiến đấu cực kì khắc nghiệt. Mỗi tầng cảnh giới mất
 * nhiều năm. Pacing: linear-grind — slow-burn 50-100 chương ở Luyện Khí,
 * không có BIG WOW theo nhịp 5-cluster.
 *
 * Cảnh giới (Phàm Nhân classic Wang Yu):
 *   Arc 1 (1-50):    Nhập tông môn → Luyện Khí 5 (5 năm)
 *   Arc 2 (51-150):  Luyện Khí 5 → Luyện Khí 12 (10 năm)
 *   Arc 3 (151-300): Luyện Khí 12 → Trúc Cơ (đột phá 1)
 *   Arc 4 (301-500): Trúc Cơ → Kim Đan (đột phá 2, 50 năm)
 *   Arc 5 (501-700): Kim Đan → Nguyên Anh (100 năm)
 *   Arc 6 (701-900): Nguyên Anh → Hoá Thần (200 năm)
 *   Arc 7 (901-1000): Hoá Thần → Trường Sinh ({{ENDING_GOAL}})
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_FAMILY}}, {{HOMETOWN}}
 *   {{SECT_NAME}}, {{SECT_REGION}}
 *   {{LOW_RIVAL_NAME}}, {{MID_RIVAL_NAME}}, {{HIGH_RIVAL_NAME}}
 *   {{SIGNATURE_TECHNIQUE}}, {{HIDDEN_TREASURE}}
 *   {{COMPANION_NAME}}, {{ENDING_GOAL}}
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const TIEN_HIEP_PHAM_NHAN_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Nhập {{SECT_NAME}} ngoại môn — Luyện Khí 1-5',
    corePayoff: '{{MC_NAME}} từ thanh niên thường thành ngoại môn đệ tử Luyện Khí 5, tích luỹ linh thạch + dược liệu đầu, gặp {{COMPANION_NAME}}',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Rời quê {{HOMETOWN}} → vào {{SECT_NAME}} thí luyện', payoff: 'đệ tử ngoại môn cấp F, phòng tu luyện cơ bản' },
      { number: 2, range: [8, 14], theme: 'Tu luyện chậm — Luyện Khí 1 (1 năm)', payoff: 'Luyện Khí 1, đan thuốc cấp F đầu' },
      { number: 3, range: [15, 21], theme: 'Nhiệm vụ ngoại môn — kiếm linh thạch', payoff: 'tài nguyên tích luỹ, nhiệm vụ B chấm dứt' },
      { number: 4, range: [22, 28], theme: '{{LOW_RIVAL_NAME}} khinh thường — small confront', payoff: 'face-slap nhỏ, không lộ thực lực' },
      { number: 5, range: [29, 35], theme: 'Luyện Khí 3 sau 2 năm tích luỹ', payoff: 'Luyện Khí 3, gear tier 1' },
      { number: 6, range: [36, 42], theme: 'Tỷ thí ngoại môn — top 50/200', payoff: 'tài nguyên thưởng, mainstream recognition' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: Luyện Khí 5 + {{COMPANION_NAME}} kết bạn', payoff: 'top 30, suất nhiệm vụ A, partner stable' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Ngoại môn → nội môn (Luyện Khí 5 → 12, 10 năm)',
    corePayoff: 'MC nội môn đệ tử Luyện Khí 12 đỉnh, học {{SIGNATURE_TECHNIQUE}}, manh mối {{HIDDEN_TREASURE}}',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Tu luyện kiên trì Luyện Khí 6-7', payoff: 'tích luỹ linh thạch + công pháp' },
      { number: 2, range: [66, 80], theme: 'Mật cảnh ngoại môn — first hidden', payoff: 'thu hoạch đan dược cấp E + manh mối' },
      { number: 3, range: [81, 95], theme: '{{MID_RIVAL_NAME}} nhân vật ngoại môn cao thủ', payoff: 'thử thách, MC giấu thực lực' },
      { number: 4, range: [96, 110], theme: 'Tu luyện Luyện Khí 9-10', payoff: 'gear tier 2, đan dược nhiều' },
      { number: 5, range: [111, 125], theme: 'Nội môn thí — leo lên', payoff: 'nội môn đệ tử, tài nguyên cao' },
      { number: 6, range: [126, 140], theme: 'Tàng kinh các — tìm {{SIGNATURE_TECHNIQUE}}', payoff: 'mảnh công pháp đầu tiên' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: Luyện Khí 12 đỉnh + {{SIGNATURE_TECHNIQUE}} tầng 1', payoff: 'top nội môn Luyện Khí, sẵn sàng Trúc Cơ' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Đột phá Trúc Cơ — chuyển hoá thân thể (15 năm)',
    corePayoff: 'MC Trúc Cơ 7 đỉnh, sở hữu động phủ + linh điền + {{HIDDEN_TREASURE}}',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Đột phá Trúc Cơ — đan dược + lão hành chỉ điểm', payoff: 'Trúc Cơ 1, một thoáng sốc đại điển' },
      { number: 2, range: [171, 190], theme: 'Tu luyện ổn định Trúc Cơ 1-3', payoff: 'tâm cảnh ổn, sức mạnh tích luỹ' },
      { number: 3, range: [191, 210], theme: 'Chiến tranh môn phái — small skirmishes', payoff: 'kinh nghiệm chiến đấu + chiến lợi' },
      { number: 4, range: [211, 230], theme: 'Mật cảnh Trúc Cơ — tài nguyên cấp D', payoff: 'pháp khí Trúc Cơ + dược cao cấp' },
      { number: 5, range: [231, 250], theme: '{{MID_RIVAL_NAME}} cùng cảnh giới đối đầu', payoff: 'tỷ thí, MC thắng nhỏ giấu pháp khí' },
      { number: 6, range: [251, 270], theme: 'Tìm {{HIDDEN_TREASURE}} — manh mối từ tàng kinh các', payoff: '{{HIDDEN_TREASURE}} nhập tay' },
      { number: 7, range: [271, 290], theme: 'Tu luyện sâu Trúc Cơ 5-7', payoff: 'tâm cảnh thâm sâu' },
      { number: 8, range: [291, 300], theme: 'CLIMAX arc 3: Trúc Cơ 7 đỉnh + động phủ riêng', payoff: 'sẵn sàng Kim Đan, độc lập từ tông môn' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Đột phá Kim Đan — đại kiếp (50 năm)',
    corePayoff: 'MC Kim Đan 9 đỉnh, thoát {{SECT_NAME}}, lập tu luyện độc lập, đối đầu {{HIGH_RIVAL_NAME}} cấp Kim Đan',
    subArcs: [
      { number: 1, range: [301, 325], theme: 'Đột phá Kim Đan — thiên kiếp đầu', payoff: 'Kim Đan 1 thành công, kim đan trong cơ thể' },
      { number: 2, range: [326, 350], theme: 'Học tu luyện Kim Đan tự lực', payoff: 'pháp khí Kim Đan + đan dược cấp C' },
      { number: 3, range: [351, 375], theme: '{{HIGH_RIVAL_NAME}} Kim Đan first contact', payoff: 'chạy trốn / tỉ thí nhỏ, biết weakness' },
      { number: 4, range: [376, 400], theme: 'Mật cảnh Kim Đan — đại bí cảnh', payoff: 'tài nguyên cấp B + pháp khí cao' },
      { number: 5, range: [401, 425], theme: 'Liên minh tu sĩ Kim Đan — thận trọng', payoff: 'mạng lưới Kim Đan trên đại lục' },
      { number: 6, range: [426, 450], theme: 'Chiến đấu cuộc đời — {{HIGH_RIVAL_NAME}} mục tiêu', payoff: '{{HIGH_RIVAL_NAME}} thua, MC tích luỹ' },
      { number: 7, range: [451, 475], theme: 'Tu luyện Kim Đan 7-9', payoff: 'tâm cảnh peak Kim Đan' },
      { number: 8, range: [476, 500], theme: 'CLIMAX arc 4: Kim Đan đỉnh + chuẩn bị Nguyên Anh', payoff: 'Kim Đan 9 đỉnh, độc lập hoàn toàn' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Đột phá Nguyên Anh — kiếp 100 năm',
    corePayoff: 'MC Nguyên Anh 9 đỉnh, sở hữu pháp bảo cấp B, đại lục công nhận',
    subArcs: [
      { number: 1, range: [501, 528], theme: 'Đột phá Nguyên Anh — kiếp 9 đoạn', payoff: 'Nguyên Anh 1 thành công' },
      { number: 2, range: [529, 556], theme: 'Tu luyện Nguyên Anh 2-4', payoff: 'pháp bảo Nguyên Anh + đan cấp B' },
      { number: 3, range: [557, 584], theme: 'Cổ địa hư cảnh — bí cảnh tổ tiên', payoff: 'di vật cổ + pháp khí cao' },
      { number: 4, range: [585, 612], theme: 'Đại lục công nhận MC Nguyên Anh', payoff: 'danh tiếng đại lục, các tông kính phục' },
      { number: 5, range: [613, 640], theme: 'Liên thủ Nguyên Anh khác cùng tu luyện', payoff: 'mạng lưới Nguyên Anh + tài nguyên' },
      { number: 6, range: [641, 668], theme: 'Tu luyện Nguyên Anh 6-8', payoff: 'tâm cảnh thâm sâu Nguyên Anh' },
      { number: 7, range: [669, 700], theme: 'CLIMAX arc 5: Nguyên Anh đỉnh + chuẩn bị Hóa Thần', payoff: 'Nguyên Anh 9 đỉnh, đại lục top tier' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Đột phá Hoá Thần — đỉnh đại lục (200 năm)',
    corePayoff: 'MC Hoá Thần đỉnh, biết về tiên giới, manh mối phi thăng',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Đột phá Hoá Thần — kiếp peak', payoff: 'Hoá Thần 1, không gian thần thức' },
      { number: 2, range: [731, 760], theme: 'Khám phá thượng cổ ruins', payoff: 'manh mối tiên giới + cổ pháp bảo' },
      { number: 3, range: [761, 790], theme: 'Reveal: tiên giới ở thiên ngoại', payoff: 'mục tiêu phi thăng' },
      { number: 4, range: [791, 820], theme: 'Liên minh Hoá Thần đại lục', payoff: 'phe cùng phi thăng + tài nguyên cao' },
      { number: 5, range: [821, 850], theme: 'Tu luyện Hoá Thần 5-7', payoff: 'pháp lực cosmic-tier' },
      { number: 6, range: [851, 880], theme: 'Chuẩn bị phi thăng — pháp bảo + đan dược cosmic', payoff: 'sẵn sàng phi thăng vương đạo' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: Hoá Thần đỉnh + biết phi thăng path', payoff: 'sẵn sàng arc 7 phi thăng' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — phi thăng / trường sinh',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, thoát đại lục, ending warm',
    subArcs: [
      { number: 1, range: [901, 925], theme: 'Tu luyện cuối — kiếp phi thăng', payoff: 'pháp lực peak Hoá Thần' },
      { number: 2, range: [926, 950], theme: 'Last threat — thiên đạo bias', payoff: 'phát hiện cản trở phi thăng' },
      { number: 3, range: [951, 975], theme: 'Final battle thiên đạo — phi thăng', payoff: 'phi thăng thành công, thoát kiếp' },
      { number: 4, range: [976, 1000], theme: 'ENDING: {{ENDING_GOAL}} + {{COMPANION_NAME}} đồng hành', payoff: 'đạt {{ENDING_GOAL}}, ending warm' },
    ],
  },
];
