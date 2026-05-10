/**
 * Do-thi "thần hào hệ thống" — simulator-loop pattern.
 *
 * MC nhận hệ thống "tiêu tiền return × N". Mỗi 1 yuan tiêu = 100x (or
 * higher) trả về. MC bắt buộc tiêu xa xỉ. Vòng lặp setup → spend →
 * reveal × N → real-world impact.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const DO_THI_THAN_HAO_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Hệ thống active — first spending loops',
    corePayoff: 'MC từ thanh niên thường thành millionaire local thông qua loops',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Hệ thống active — small spending', payoff: 'first 100 yuan → 10K return' },
      { number: 2, range: [8, 14], theme: 'Loop 2 — spend 1K → 100K return', payoff: 'tài sản tăng visible' },
      { number: 3, range: [15, 21], theme: 'Family / friends ngạc nhiên', payoff: 'social tin tưởng MC giàu' },
      { number: 4, range: [22, 28], theme: 'Spend 10K → 1M return', payoff: 'millionaire local' },
      { number: 5, range: [29, 35], theme: '{{LIFE_PARTNER}} kết bạn', payoff: 'partner stable' },
      { number: 6, range: [36, 42], theme: 'First "luxury" buy — luxury car / watch', payoff: 'lifestyle upgrade visible' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: millionaire + lifestyle', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Spending loops scale — billionaire local',
    corePayoff: 'MC tỷ phú VND thông qua massive spending → return loops',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Spending 100K loops', payoff: '10M loop return' },
      { number: 2, range: [66, 80], theme: 'Buy luxury house / yacht', payoff: 'lifestyle peak local' },
      { number: 3, range: [81, 95], theme: '{{ANTAGONIST_FAMILY}} family ngạc nhiên + đối đầu', payoff: 'face-slap qua spending' },
      { number: 4, range: [96, 110], theme: 'Spending 1M loops', payoff: '100M return' },
      { number: 5, range: [111, 125], theme: 'Charity foundation 100M', payoff: 'foundation lập, public respect' },
      { number: 6, range: [126, 140], theme: 'Spending billion loops', payoff: 'tỷ phú VND' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: tỷ phú + foundation', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Spending USD scale — billionaire USD',
    corePayoff: 'MC tỷ phú USD, mass spending impacts global',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Spending USD level — 10M USD spend', payoff: '1B USD return' },
      { number: 2, range: [171, 190], theme: 'Mass M&A global', payoff: 'company portfolio expand' },
      { number: 3, range: [191, 210], theme: '{{ANTAGONIST_FAMILY}} cosmic-tier antagonist xuất hiện', payoff: 'first cosmic-tier confront' },
      { number: 4, range: [211, 230], theme: 'Spending 100M USD loops', payoff: '10B return' },
      { number: 5, range: [231, 250], theme: 'Forbes 100', payoff: 'global recognition' },
      { number: 6, range: [251, 270], theme: 'Mafia kinh tế tấn công', payoff: 'face-slap mafia' },
      { number: 7, range: [271, 290], theme: 'Spending 1B USD', payoff: '100B return' },
      { number: 8, range: [291, 300], theme: 'CLIMAX arc 3: top 10 tỷ phú global', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Cosmic-tier spending — multi-realm impact',
    corePayoff: 'MC top 1 tỷ phú, hệ thống reveal cosmic-tier origin',
    subArcs: [
      { number: 1, range: [301, 325], theme: 'Spending 10B USD loop', payoff: '1T USD return' },
      { number: 2, range: [326, 350], theme: 'Foundation 100B USD charity', payoff: 'global hero' },
      { number: 3, range: [351, 375], theme: 'Hệ thống reveal cosmic-tier', payoff: 'lore expand' },
      { number: 4, range: [376, 400], theme: 'Cosmic spending — currency multi-realm', payoff: 'multi-realm wealth' },
      { number: 5, range: [401, 425], theme: 'Mass cosmic mafia confront', payoff: 'face-slap cosmic mafia' },
      { number: 6, range: [426, 450], theme: 'Top 1 tỷ phú global', payoff: 'top 1 confirmed' },
      { number: 7, range: [451, 475], theme: '{{LIFE_PARTNER}} kết hôn + có con', payoff: 'thế hệ 2' },
      { number: 8, range: [476, 500], theme: 'CLIMAX arc 4: top 1 + cosmic origin reveal', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Multi-realm cosmic-tier wealth',
    corePayoff: 'MC điều khiển multi-realm economy, cosmic-tier antagonist confront',
    subArcs: [
      { number: 1, range: [501, 528], theme: 'Multi-realm trading', payoff: 'cosmic wealth flow' },
      { number: 2, range: [529, 556], theme: 'Cosmic mafia second wave', payoff: 'liên minh cosmic giúp MC' },
      { number: 3, range: [557, 584], theme: 'Spending peak — single transaction 1T USD', payoff: 'wealth ultimate' },
      { number: 4, range: [585, 612], theme: 'Cosmic admin reveal', payoff: 'kẻ địch cosmic' },
      { number: 5, range: [613, 640], theme: 'Charity multi-realm', payoff: 'cosmic philanthropist' },
      { number: 6, range: [641, 668], theme: 'Mass cosmic alliance', payoff: 'multi-realm liên minh' },
      { number: 7, range: [669, 700], theme: 'CLIMAX arc 5: multi-realm wealth + cosmic ally', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic admin showdown',
    corePayoff: 'Cosmic admin lộ, MC + companions chống admin',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Cosmic admin invasion', payoff: 'cosmic admin xuất hiện' },
      { number: 2, range: [731, 760], theme: 'Investigate origin hệ thống', payoff: 'lore peak' },
      { number: 3, range: [761, 790], theme: 'MC + companions liên thủ', payoff: 'companion peak' },
      { number: 4, range: [791, 820], theme: 'Mass cosmic admin face-slap', payoff: 'admin lui' },
      { number: 5, range: [821, 850], theme: 'Reveal: hệ thống là tool from cosmic war', payoff: 'lore ultimate' },
      { number: 6, range: [851, 880], theme: 'Final cosmic plan ready', payoff: 'plan ready' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: cosmic confrontation', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm',
    subArcs: [
      { number: 1, range: [901, 925], theme: 'Final cosmic admin', payoff: 'admin protocol confront' },
      { number: 2, range: [926, 950], theme: 'Final battle', payoff: 'admin thua' },
      { number: 3, range: [951, 975], theme: '{{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 4, range: [976, 1000], theme: 'ENDING: warm closure + retire', payoff: 'thế hệ 2 take over, MC retire' },
    ],
  },
];
