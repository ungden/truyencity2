/**
 * Lich-su "tướng quân chinh chiến" — cluster-dopamine warlord.
 * MC xuyên thành quân nhân cổ đại, focus chinh chiến biên cương + chinh phục.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const LICH_SU_TUONG_QUAN_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Xuyên thành tiểu binh — leo đại đội trưởng',
    corePayoff: 'MC từ tiểu binh thành đại đội trưởng, first battle wins, gặp {{LOYAL_OFFICER}}',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Xuyên thành tiểu binh tuyến biên', payoff: 'identity stable, kiến thức hiện đại quân sự active' },
      { number: 2, range: [8, 14], theme: 'First small battle — face-slap small commander', payoff: 'thưởng nhỏ + đại đội trưởng' },
      { number: 3, range: [15, 21], theme: '{{LOYAL_OFFICER}} kết bạn nghĩa kết', payoff: 'huynh đệ trung thành' },
      { number: 4, range: [22, 28], theme: 'Mass small skirmish wins', payoff: 'đại đội trưởng full + danh tiếng' },
      { number: 5, range: [29, 35], theme: 'Reveal modern tactics — face-slap general', payoff: 'general ngạc nhiên + thăng tướng quân hậu bị' },
      { number: 6, range: [36, 42], theme: 'First sortie biên cương', payoff: 'biên cương ổn' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: tướng quân hậu bị + biên cương ổn', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Tướng quân biên cương — đẩy lùi nhỏ {{FOREIGN_ENEMY}}',
    corePayoff: 'MC tướng quân chính, đẩy lùi {{FOREIGN_ENEMY}} đợt 1, mass kingdom ý muốn',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Tướng quân nhậm chức biên cương', payoff: 'tướng quân + 5K binh' },
      { number: 2, range: [66, 80], theme: '{{FOREIGN_ENEMY}} đợt 1 invasion', payoff: 'đẩy lùi thành công' },
      { number: 3, range: [81, 95], theme: 'Mass training — quân tinh nhuệ', payoff: 'quân tinh nhuệ' },
      { number: 4, range: [96, 110], theme: 'Tấn công {{FOREIGN_ENEMY}} biên ải', payoff: 'biên ải lấy được' },
      { number: 5, range: [111, 125], theme: 'Hoàng đế chú ý + thưởng', payoff: 'phong tướng quân chính' },
      { number: 6, range: [126, 140], theme: '{{ANTAGONIST_FAMILY}} triều ngăn cản', payoff: 'face-slap qua quân công' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: chiếm 3 châu + tướng quân chính', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Đại tướng quân — chinh chiến nội bộ + ngoại bộ',
    corePayoff: 'Đại tướng quân, chiến tranh trung tâm, đẩy lùi mass {{FOREIGN_ENEMY}}',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Đại tướng quân + nắm 50K quân', payoff: 'tổ chức quân lớn' },
      { number: 2, range: [171, 190], theme: 'Mass {{FOREIGN_ENEMY}} invasion mạnh', payoff: 'phòng thủ thành công' },
      { number: 3, range: [191, 210], theme: 'Counter-attack lấn vào lãnh thổ {{FOREIGN_ENEMY}}', payoff: 'lãnh thổ + 30%' },
      { number: 4, range: [211, 230], theme: '{{ANTAGONIST_FAMILY}} hậu cung âm mưu', payoff: 'âm mưu bóc trần' },
      { number: 5, range: [231, 250], theme: 'Trận quyết định — {{FOREIGN_ENEMY}} chính tướng bại', payoff: 'face-slap mass' },
      { number: 6, range: [251, 270], theme: 'Mass kingdom thuần phục', payoff: 'kingdom triều cống' },
      { number: 7, range: [271, 290], theme: '{{LOYAL_OFFICER}} thăng tướng quân lớn', payoff: 'subordinate peak' },
      { number: 8, range: [291, 300], theme: 'CLIMAX arc 3: đại tướng quân + 5 châu mới', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Vương phong + chinh phục',
    corePayoff: 'MC phong vương, chinh phục multi-kingdom, mass triều cống',
    subArcs: [
      { number: 1, range: [301, 325], theme: 'Phong vương — đăng quang', payoff: 'vương vị + 100K quân' },
      { number: 2, range: [326, 350], theme: 'Mass conquest 5 kingdoms', payoff: 'kingdom thuần phục' },
      { number: 3, range: [351, 375], theme: 'Liên minh chính phái phương đông', payoff: '5 kingdom liên minh' },
      { number: 4, range: [376, 400], theme: 'Mass {{FOREIGN_ENEMY}} cuối cùng bại', payoff: '{{FOREIGN_ENEMY}} fold' },
      { number: 5, range: [401, 425], theme: 'Cosmic threat first — Mongol-style invasion', payoff: 'first cosmic-tier invasion' },
      { number: 6, range: [426, 450], theme: 'Mass cosmic counter', payoff: 'cosmic invasion bại' },
      { number: 7, range: [451, 475], theme: 'Mass triều cống global', payoff: 'mass tributes' },
      { number: 8, range: [476, 500], theme: 'CLIMAX arc 4: vương + cosmic threat weakened', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Hoàng đế phong + đại lục bá chủ',
    corePayoff: 'MC hoàng đế, đại lục thống nhất',
    subArcs: [
      { number: 1, range: [501, 528], theme: 'Phong hoàng đế', payoff: 'hoàng đế + đế đô' },
      { number: 2, range: [529, 556], theme: 'Mass conquest cosmic-tier kingdoms', payoff: 'kingdoms cosmic dưới MC' },
      { number: 3, range: [557, 584], theme: 'Cosmic admin reveal', payoff: 'kẻ địch cosmic' },
      { number: 4, range: [585, 612], theme: 'Mass cosmic admin scout face-slap', payoff: 'cosmic scout bại' },
      { number: 5, range: [613, 640], theme: 'Đại lục unification', payoff: 'đại lục thống nhất' },
      { number: 6, range: [641, 668], theme: 'Cosmic admin major confront', payoff: 'cosmic admin major bại' },
      { number: 7, range: [669, 700], theme: 'CLIMAX arc 5: bá chủ + cosmic admin weakened', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic admin showdown — final prep',
    corePayoff: 'MC cosmic-tier ruler, admin face-slap final',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Cosmic admin invasion peak', payoff: 'admin protocol attack' },
      { number: 2, range: [731, 760], theme: 'Mass cosmic tactics', payoff: 'modern tactics applied cosmic' },
      { number: 3, range: [761, 790], theme: 'Cosmic admin major bại', payoff: 'admin retreat' },
      { number: 4, range: [791, 820], theme: 'Mass cosmic alliance', payoff: 'multi-realm liên minh' },
      { number: 5, range: [821, 850], theme: 'Final plan ready', payoff: 'plan ready' },
      { number: 6, range: [851, 880], theme: 'Cosmic admin final form', payoff: 'admin final form' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: admin weakened, final prep', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm',
    subArcs: [
      { number: 1, range: [901, 925], theme: 'Final cosmic threat', payoff: 'phát hiện protocol' },
      { number: 2, range: [926, 950], theme: 'Mass final battle', payoff: 'admin thua' },
      { number: 3, range: [951, 975], theme: '{{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 4, range: [976, 1000], theme: 'ENDING: warm closure', payoff: 'thái tử lên ngôi, MC + family retire' },
    ],
  },
];
