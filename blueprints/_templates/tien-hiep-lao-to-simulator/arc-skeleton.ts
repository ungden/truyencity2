/**
 * Tien-hiep "lão tổ simulator" — time-skip-macro pattern.
 *
 * MC = lão tổ Hoá Thần / Hợp Thể đỉnh, ngồi 1 chỗ ngàn năm. Đệ tử
 * nhiều thế hệ làm chủ chương. MC chỉ xuất hiện khi cần. Time-skip
 * giữa generations là core mechanic.
 *
 * Cảnh giới (already at peak, focus sect-building):
 *   Arc 1 (1-50):    Lão tổ tỉnh dậy → lập tông môn nhỏ
 *   Arc 2 (51-150):  Thế hệ đầu đệ tử → tông môn trung
 *   Arc 3 (151-300): Thế hệ 2-3 đệ tử → tông môn lớn
 *   Arc 4 (301-500): Thế hệ 4-5 → đại lục công nhận
 *   Arc 5 (501-700): Thế hệ 6-7 → cosmic minh ước
 *   Arc 6 (701-900): Thế hệ 8-9 → cosmic threats
 *   Arc 7 (901-1000): Thế hệ 10 + endgame
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_TITLE}} (vd "Vạn Cổ Tổ"), {{SECT_NAME}}
 *   {{FIRST_DISCIPLE_NAME}}, {{FAVORITE_GENERATION}}
 *   {{ANCIENT_ENEMY}}, {{COMPANION_NAME}} (vd dao bạn), {{ENDING_GOAL}}
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const TIEN_HIEP_LAO_TO_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Lão tổ tỉnh dậy → lập {{SECT_NAME}}',
    corePayoff: 'MC tỉnh dậy sau ngàn năm bế quan, lập tông môn, nhận {{FIRST_DISCIPLE_NAME}} — gen 1',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Tỉnh dậy bế quan — đại lục đã đổi', payoff: 'MC nhận thực tại đã 1000 năm, đại lục mới' },
      { number: 2, range: [8, 14], theme: 'Khám phá thay đổi đại lục', payoff: 'biết tu sĩ thế hệ mới yếu, tài nguyên loãng' },
      { number: 3, range: [15, 21], theme: 'Lập tông môn cốt lõi', payoff: '{{SECT_NAME}} thành lập, động phủ riêng' },
      { number: 4, range: [22, 28], theme: 'Tuyển đệ tử thế hệ đầu', payoff: '10 đệ tử cốt lõi, gen 1 kicked off' },
      { number: 5, range: [29, 35], theme: '{{FIRST_DISCIPLE_NAME}} nổi bật — talent rare', payoff: 'first disciple stand out, MC chú ý' },
      { number: 6, range: [36, 42], theme: 'Time-skip 50 năm — gen 1 đột phá', payoff: '{{FIRST_DISCIPLE_NAME}} Trúc Cơ đỉnh' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: tông môn ổn định, gen 1 strong', payoff: 'tông môn nhỏ — sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Gen 2-3 đệ tử — tông môn trung (300 năm)',
    corePayoff: '{{SECT_NAME}} trung tông trên đại lục, gen 3 đỉnh đã đông',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Time-skip 100 năm — gen 1 thành trưởng lão', payoff: 'gen 1 = trưởng lão, gen 2 vào' },
      { number: 2, range: [66, 80], theme: 'MC dạy gen 2 cốt lõi', payoff: 'gen 2 talent rises' },
      { number: 3, range: [81, 95], theme: 'External tông môn xâm phạm', payoff: 'gen 1 trưởng lão face-slap external' },
      { number: 4, range: [96, 110], theme: 'Time-skip 100 năm — gen 3', payoff: 'gen 3 nhập, tông môn 1000+ đệ tử' },
      { number: 5, range: [111, 125], theme: 'MC bế quan ngắn — pháp bảo upgrade', payoff: 'pháp bảo MC peak, đệ tử kế thừa' },
      { number: 6, range: [126, 140], theme: 'Liên minh tông môn trung tier', payoff: '5 tông môn liên minh dưới {{SECT_NAME}}' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: trung tông + gen 3 peak', payoff: 'sẵn sàng đại tông arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Gen 4-5 — đại tông trên đại lục',
    corePayoff: '{{SECT_NAME}} đại tông top 10 đại lục, gen 5 có Nguyên Anh',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Time-skip 200 năm — gen 4 dominant', payoff: 'gen 4 Kim Đan đỉnh' },
      { number: 2, range: [171, 190], theme: 'Gen 4 đối phó đại lục đối thủ', payoff: 'tông môn defensive successful' },
      { number: 3, range: [191, 210], theme: 'MC xuất hiện confront Hoá Thần đại lục', payoff: 'MC tỉ thí face-slap đại lục Hoá Thần' },
      { number: 4, range: [211, 230], theme: 'Đại lục công nhận MC = top tier', payoff: 'tông môn rank top 10 đại lục' },
      { number: 5, range: [231, 250], theme: 'Time-skip 100 năm — gen 5 vào', payoff: 'gen 5 first Nguyên Anh' },
      { number: 6, range: [251, 270], theme: 'Gen 5 face-slap đại lục thiên kiêu', payoff: 'gen 5 thiên kiêu đại lục' },
      { number: 7, range: [271, 290], theme: 'Manh mối {{ANCIENT_ENEMY}} hiện', payoff: 'plot thread arc 6 plant' },
      { number: 8, range: [291, 300], theme: 'CLIMAX arc 3: đại tông top 10 + gen 5 đỉnh', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Gen 6-7 — cosmic minh ước',
    corePayoff: '{{SECT_NAME}} cosmic-tier ally, gen 7 Hoá Thần',
    subArcs: [
      { number: 1, range: [301, 325], theme: 'Time-skip 200 năm — gen 6 vào', payoff: 'gen 6 Trúc Cơ đỉnh' },
      { number: 2, range: [326, 350], theme: 'Gen 6 đối đầu đại lục liên hợp', payoff: 'gen 6 face-slap mass' },
      { number: 3, range: [351, 375], theme: 'MC bế quan upgrade pháp bảo cosmic', payoff: 'pháp bảo cosmic-tier peak' },
      { number: 4, range: [376, 400], theme: 'Time-skip 100 năm — gen 7 vào', payoff: 'gen 7 first Hoá Thần' },
      { number: 5, range: [401, 425], theme: 'Cosmic minh ước với thượng cổ thần thú', payoff: 'minh ước hoàn thành' },
      { number: 6, range: [426, 450], theme: 'Tông môn cosmic-tier defensive', payoff: '{{SECT_NAME}} cosmic-tier ally' },
      { number: 7, range: [451, 475], theme: 'Gen 7 face-slap cosmic threats nhỏ', payoff: 'gen 7 visible cosmic-tier' },
      { number: 8, range: [476, 500], theme: 'CLIMAX arc 4: cosmic-tier ally + gen 7 đỉnh', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Gen 8-9 — đại lục bá chủ',
    corePayoff: '{{SECT_NAME}} bá chủ đại lục, gen 9 Hợp Thể',
    subArcs: [
      { number: 1, range: [501, 528], theme: 'Time-skip 300 năm — gen 8 vào', payoff: 'gen 8 Kim Đan đỉnh' },
      { number: 2, range: [529, 556], theme: 'Đại lục thống nhất dưới {{SECT_NAME}}', payoff: 'đại lục thuần phục, gen 8 tướng' },
      { number: 3, range: [557, 584], theme: 'MC bế quan dài — pháp bảo cosmic ultimate', payoff: 'pháp bảo cosmic peak ultimate' },
      { number: 4, range: [585, 612], theme: 'Time-skip 200 năm — gen 9 vào', payoff: 'gen 9 first Hợp Thể' },
      { number: 5, range: [613, 640], theme: 'Cosmic threat first — ngoại địch', payoff: 'tông môn defensive cosmic' },
      { number: 6, range: [641, 668], theme: 'Gen 9 face-slap cosmic minor', payoff: 'gen 9 Hợp Thể peak' },
      { number: 7, range: [669, 700], theme: 'CLIMAX arc 5: bá chủ + gen 9 Hợp Thể', payoff: 'sẵn sàng arc 6 cosmic threats' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Gen 10 — cosmic threats peak',
    corePayoff: '{{SECT_NAME}} cosmic peak, {{ANCIENT_ENEMY}} body lộ, MC + đệ tử + companion liên thủ',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Time-skip 200 năm — gen 10 vào', payoff: 'gen 10 Hoá Thần đỉnh' },
      { number: 2, range: [731, 760], theme: '{{ANCIENT_ENEMY}} thức tỉnh', payoff: 'cosmic threat global' },
      { number: 3, range: [761, 790], theme: 'MC + companion liên thủ', payoff: 'pháp bảo cosmic combine' },
      { number: 4, range: [791, 820], theme: 'Đại lục liên minh chống {{ANCIENT_ENEMY}}', payoff: 'all factions ally MC' },
      { number: 5, range: [821, 850], theme: 'Gen 10 face-slap cosmic legion', payoff: 'cosmic legion bại đợt 1' },
      { number: 6, range: [851, 880], theme: 'Reveal: {{ANCIENT_ENEMY}} chân tướng', payoff: 'lore peak' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: cosmic-tier confrontation', payoff: 'sẵn sàng final battle' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — endgame',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm cùng đệ tử + companion',
    subArcs: [
      { number: 1, range: [901, 925], theme: 'Last cosmic protocol', payoff: 'phát hiện protocol cuối' },
      { number: 2, range: [926, 950], theme: 'MC chế tạo cosmic-tier solution', payoff: 'plan ready' },
      { number: 3, range: [951, 975], theme: 'Final battle {{ANCIENT_ENEMY}}', payoff: 'BBEG thua' },
      { number: 4, range: [976, 1000], theme: 'ENDING: {{ENDING_GOAL}} + warm closure', payoff: 'thế hệ 11 lên, MC + companion retire' },
    ],
  },
];
