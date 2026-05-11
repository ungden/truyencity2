/**
 * Ngon-tinh "cổ ngôn trạch đấu" — cung đấu / điền văn / cổ đại revenge.
 *
 * Female MC trong cổ đại Trung Hoa, trạch đấu trong gia tộc / cung đình.
 * Trọng sinh báo thù phổ biến + điền văn slice-of-life cosy.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const NGON_TINH_CO_NGON_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Trọng sinh + first trạch đấu',
    corePayoff: 'Female MC trọng sinh thiếu nữ, đè bẹp chính thê / mẹ kế',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Trọng sinh + memory active', payoff: 'identity setup' },
      { number: 2, range: [8, 14], theme: 'First trạch đấu — chính thê hostile', payoff: 'chính thê escalate' },
      { number: 3, range: [15, 21], theme: 'MC reveal skill — y / thi / nghệ', payoff: 'first skill reveal' },
      { number: 4, range: [22, 28], theme: 'Face-slap chính thê via reveal skill', payoff: 'face-slap small' },
      { number: 5, range: [29, 35], theme: '{{MALE_LEAD}} (vương gia / công tử) interest', payoff: 'love interest meet' },
      { number: 6, range: [36, 42], theme: 'Mass face-slap mẹ kế camp', payoff: 'mẹ kế cornered' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: chính thê / mẹ kế bại', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Gia tộc trạch đấu + hôn ước',
    corePayoff: 'MC đè bẹp gia tộc faction, đính hôn {{MALE_LEAD}}',
    subArcs: [
      { number: 1, range: [51, 70], theme: 'Gia tộc faction trạch đấu', payoff: 'gia tộc politicking' },
      { number: 2, range: [71, 90], theme: 'MC skill expand — kinh doanh / điền văn', payoff: 'skill empire' },
      { number: 3, range: [91, 110], theme: '{{MALE_LEAD}} courtship — gia tộc disapprove', payoff: 'courtship hardships' },
      { number: 4, range: [111, 130], theme: 'Mass face-slap gia tộc rivals', payoff: 'rivals bại' },
      { number: 5, range: [131, 150], theme: 'CLIMAX arc 2: đính hôn {{MALE_LEAD}}', payoff: 'engagement official' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Cung đình entrance + hôn lễ',
    corePayoff: 'MC vào cung / vương phủ, kết hôn, hậu cung trạch đấu start',
    subArcs: [
      { number: 1, range: [151, 175], theme: 'Hôn lễ lavish', payoff: 'wedding event' },
      { number: 2, range: [176, 200], theme: 'Hậu cung / vương phủ politics intro', payoff: 'cung politicking' },
      { number: 3, range: [201, 225], theme: 'First cung đấu — sủng phi rival', payoff: 'sủng phi confront' },
      { number: 4, range: [226, 250], theme: 'MC reveal cosmic-tier skill', payoff: 'cosmic skill plant' },
      { number: 5, range: [251, 275], theme: 'Mass face-slap cung đình rivals', payoff: 'rivals bại' },
      { number: 6, range: [276, 300], theme: 'CLIMAX arc 3: cung địa vị stable + thai mang', payoff: 'thai mang' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Mass triều đình intrigue + thái tử',
    corePayoff: 'MC sinh thái tử, đè bẹp triều đình conspiracy',
    subArcs: [
      { number: 1, range: [301, 335], theme: 'Sinh thái tử lavish', payoff: 'thái tử born' },
      { number: 2, range: [336, 370], theme: 'Triều đình conspiracy', payoff: 'conspiracy reveal' },
      { number: 3, range: [371, 405], theme: 'MC counter-conspiracy', payoff: 'counter success' },
      { number: 4, range: [406, 440], theme: 'Mass face-slap conspirators', payoff: 'conspirators bại' },
      { number: 5, range: [441, 475], theme: 'Hoàng hậu position approach', payoff: 'hoàng hậu candidate' },
      { number: 6, range: [476, 500], theme: 'CLIMAX arc 4: phong hoàng hậu', payoff: 'hoàng hậu confirmed' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Hoàng hậu vị + đại đế ascend',
    corePayoff: 'MC hoàng hậu, hỗ trợ {{MALE_LEAD}} làm đại đế',
    subArcs: [
      { number: 1, range: [501, 535], theme: 'Triều chính co-rule', payoff: 'co-rule active' },
      { number: 2, range: [536, 570], theme: '{{MALE_LEAD}} đại đế ascend', payoff: 'đại đế confirmed' },
      { number: 3, range: [571, 605], theme: 'Mass đại lục thuần phục', payoff: 'thuần phục mass' },
      { number: 4, range: [606, 640], theme: 'Ngoại bang invasion attempt', payoff: 'invasion defended' },
      { number: 5, range: [641, 700], theme: 'CLIMAX arc 5: đại đế + đại lục stable', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Thiên hạ thái bình + thái tử kế thừa',
    corePayoff: 'Thái tử growing, gia đình ổn định, last conspiracy',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'Thái tử education', payoff: 'thái tử grow' },
      { number: 2, range: [741, 780], theme: 'Last conspiracy emerging', payoff: 'final conspiracy hint' },
      { number: 3, range: [781, 820], theme: 'Conspiracy confronted', payoff: 'conspiracy bại' },
      { number: 4, range: [821, 860], theme: 'Thái tử ascend prep', payoff: 'thái tử ready' },
      { number: 5, range: [861, 900], theme: 'CLIMAX arc 6: thái tử thái thượng + plan ready', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — final closure',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, kế thừa thế hệ 2, ending warm',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Final conspiracy resolved', payoff: 'all conspiracies done' },
      { number: 2, range: [941, 970], theme: 'Thái tử lên ngôi', payoff: 'thái tử thái thượng' },
      { number: 3, range: [971, 1000], theme: 'ENDING: warm closure', payoff: 'MC + {{MALE_LEAD}} retire, thiên hạ thái bình' },
    ],
  },
];
