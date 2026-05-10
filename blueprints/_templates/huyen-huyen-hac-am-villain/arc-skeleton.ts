/**
 * Huyen-huyen "hắc ám villain" — villain-shadow pattern.
 *
 * MC = phản phái — không cứu thế giới, cướp đoạt resources by force.
 * Personality lock: ác có chiến lược, không hối hận. Tone dark.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const HUYEN_HUYEN_HAC_AM_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'MC ác đạo nhập tà phái',
    corePayoff: 'MC từ thanh niên đen tối thành tà phái đệ tử ngoại môn cấp tiệu, cướp tài nguyên đầu',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'MC bộc lộ ác đạo qua action đầu', payoff: 'MC giết chỉ điểm + cướp resources' },
      { number: 2, range: [8, 14], theme: 'Tà phái nhận MC', payoff: 'tà phái đệ tử bài cấp F' },
      { number: 3, range: [15, 21], theme: 'Đệ tử khác công kích', payoff: 'mass face-slap (giết / bị thương)' },
      { number: 4, range: [22, 28], theme: 'Đoạt tài nguyên đệ tử khác', payoff: 'tài nguyên cấp E mass' },
      { number: 5, range: [29, 35], theme: 'Mật cảnh — giết đối thủ tu sĩ chính phái', payoff: 'pháp khí đệ tử chính phái' },
      { number: 6, range: [36, 42], theme: 'Đệ tử tinh nhuệ tà phái thí', payoff: 'top tà phái ngoại môn' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: leo nội môn tà phái', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Nội môn tà phái — đoạt thiên kiêu',
    corePayoff: 'MC top 3 nội môn, đoạt cosmic resources từ nguyên chính phái thiên kiêu',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Nội môn tà phái nhập', payoff: 'nội môn đệ tử' },
      { number: 2, range: [66, 80], theme: 'Mass kill chính phái thiên kiêu', payoff: 'pháp khí mass + experience' },
      { number: 3, range: [81, 95], theme: 'Tà phái cosmic-tier sư phụ chú ý', payoff: 'sư phụ tà phái chính thức nhận' },
      { number: 4, range: [96, 110], theme: 'Đoạt cosmic resources từ chính phái', payoff: 'mass tài nguyên cấp B' },
      { number: 5, range: [111, 125], theme: 'Tà phái cosmic-tier tỷ võ', payoff: 'top 5 tà phái' },
      { number: 6, range: [126, 140], theme: 'Mass kill chính phái Kim Đan', payoff: 'kim đan từ corpses' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: top 3 + Kim Đan', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Đại lục Kim Đan đối phó MC',
    corePayoff: 'MC Nguyên Anh, đại lục công nhận MC tà đạo top, đoạt cosmic-tier pháp bảo',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Đột phá Kim Đan đỉnh tà đạo', payoff: 'Kim Đan tà đạo đỉnh' },
      { number: 2, range: [171, 190], theme: 'Đại lục liên minh chống MC', payoff: 'phòng thủ + counter face-slap' },
      { number: 3, range: [191, 210], theme: 'Mass tà phái sư huynh / đệ liên thủ', payoff: 'tà phái faction MC mạnh' },
      { number: 4, range: [211, 230], theme: 'Đoạt cosmic-tier pháp bảo từ chính phái', payoff: 'pháp bảo cấp A peak' },
      { number: 5, range: [231, 250], theme: 'Đột phá Nguyên Anh tà đạo', payoff: 'Nguyên Anh tà đạo' },
      { number: 6, range: [251, 270], theme: 'Đại lục công nhận MC top tà đạo', payoff: 'đại lục tà đạo top tier' },
      { number: 7, range: [271, 290], theme: 'Cosmic-tier antagonist xuất hiện', payoff: 'plot thread arc 4' },
      { number: 8, range: [291, 300], theme: 'CLIMAX arc 3: Nguyên Anh + tà đạo top', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Cosmic-tier tà đạo - đoạt thượng cổ ruins',
    corePayoff: 'MC Hoá Thần tà đạo, đoạt thượng cổ pháp bảo, đại lục bá chủ tà phái',
    subArcs: [
      { number: 1, range: [301, 325], theme: 'Đột phá Hoá Thần tà đạo', payoff: 'Hoá Thần tà đạo đỉnh' },
      { number: 2, range: [326, 350], theme: 'Thượng cổ ruins đào tà đạo', payoff: 'manh mối cosmic peak' },
      { number: 3, range: [351, 375], theme: 'Mass kill cosmic-tier antagonist', payoff: 'cosmic-tier ruins occupied' },
      { number: 4, range: [376, 400], theme: 'Đoạt thượng cổ pháp bảo cosmic-tier', payoff: 'pháp bảo cosmic peak' },
      { number: 5, range: [401, 425], theme: 'Đại lục bá chủ tà phái', payoff: 'đại lục tà phái dominant' },
      { number: 6, range: [426, 450], theme: 'Cosmic-tier ally network — tà đạo cosmic', payoff: 'cosmic ally tà đạo' },
      { number: 7, range: [451, 475], theme: 'Cosmic admin first reveal', payoff: 'plot thread arc 5' },
      { number: 8, range: [476, 500], theme: 'CLIMAX arc 4: Hoá Thần + cosmic-tier pháp bảo', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Cosmic war — tà đạo vs chính đạo cosmic',
    corePayoff: 'MC dẫn dắt tà đạo cosmic war, face-slap chính đạo cosmic, đoạt vạn giới ruins',
    subArcs: [
      { number: 1, range: [501, 528], theme: 'Cosmic chính đạo invasion', payoff: 'cosmic confrontation' },
      { number: 2, range: [529, 556], theme: 'Mass kill cosmic chính đạo', payoff: 'face-slap cosmic mass' },
      { number: 3, range: [557, 584], theme: 'Đột phá Hợp Thể tà đạo', payoff: 'Hợp Thể tà đạo' },
      { number: 4, range: [585, 612], theme: 'Vạn giới ruins khám phá', payoff: 'multi-realm power' },
      { number: 5, range: [613, 640], theme: 'Cosmic admin reveal', payoff: 'kẻ địch cosmic' },
      { number: 6, range: [641, 668], theme: 'Tà đạo bá chủ cosmic', payoff: 'cosmic tà đạo dominant' },
      { number: 7, range: [669, 700], theme: 'CLIMAX arc 5: Hợp Thể + cosmic bá chủ', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic admin showdown',
    corePayoff: 'MC cosmic-tier ultimate, cosmic admin face-slap final',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Cosmic admin invasion peak', payoff: 'admin protocol attack' },
      { number: 2, range: [731, 760], theme: 'Cosmic puppet master reveal', payoff: 'lore peak' },
      { number: 3, range: [761, 790], theme: 'MC cosmic-tier ultimate prep', payoff: 'pháp bảo cosmic peak' },
      { number: 4, range: [791, 820], theme: 'Mass cosmic admin face-slap', payoff: 'admin retreat' },
      { number: 5, range: [821, 850], theme: 'Tà đạo cosmic-tier minh ước', payoff: 'cosmic ally peak' },
      { number: 6, range: [851, 880], theme: 'Final cosmic admin form', payoff: 'admin final form' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: cosmic admin weakened', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}} — tà đạo cosmic peak, ending dark-warm',
    subArcs: [
      { number: 1, range: [901, 925], theme: 'Cosmic admin protocol', payoff: 'protocol active' },
      { number: 2, range: [926, 950], theme: 'Final battle admin', payoff: 'admin thua' },
      { number: 3, range: [951, 975], theme: '{{ENDING_GOAL}} đạt', payoff: 'tà đạo cosmic peak achieve' },
      { number: 4, range: [976, 1000], theme: 'ENDING: tà đạo dominate cosmic + ending', payoff: 'tà đạo cosmic peace' },
    ],
  },
];
