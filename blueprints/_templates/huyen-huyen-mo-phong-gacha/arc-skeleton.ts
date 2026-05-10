/**
 * Huyen-huyen "mô phỏng gacha" — simulator-loop pattern.
 * MC có simulator: chơi multi-life trong sim → real-execute optimal.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const HUYEN_HUYEN_MO_PHONG_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: '{{SIMULATOR_NAME}} active — first sim cycles',
    corePayoff: 'MC sim 100 lives, optimal path executed, leo từ phế vật ngoại môn → top 10',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'First sim — phế vật MC', payoff: 'sim 1 cycle, learn rules' },
      { number: 2, range: [8, 14], theme: 'Sim phase 1 — rút meta', payoff: 'optimal moves identified' },
      { number: 3, range: [15, 21], theme: 'Real execute — face-slap đệ tử', payoff: 'rapid leo cấp F → D' },
      { number: 4, range: [22, 28], theme: 'Sim phase 2 — tỷ thí prep', payoff: 'tỷ thí win path determined' },
      { number: 5, range: [29, 35], theme: 'Real tỷ thí — top 10 ngoại môn', payoff: 'top 10 visible' },
      { number: 6, range: [36, 42], theme: 'Sim phase 3 — tài nguyên grab', payoff: 'optimal resources path' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: nội môn + first sim mass results', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Sim cycles thâm sâu — Trúc Cơ',
    corePayoff: 'MC Trúc Cơ qua optimal sim path, reveals hidden treasures',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Sim Trúc Cơ path', payoff: 'optimal đột phá path' },
      { number: 2, range: [66, 80], theme: 'Real Trúc Cơ thành công', payoff: 'Trúc Cơ 1' },
      { number: 3, range: [81, 95], theme: 'Sim hidden treasure', payoff: 'treasure location revealed' },
      { number: 4, range: [96, 110], theme: 'Real grab treasure', payoff: 'pháp khí cấp B' },
      { number: 5, range: [111, 125], theme: 'Sim antagonist face-slap', payoff: 'face-slap path' },
      { number: 6, range: [126, 140], theme: 'Real face-slap mass', payoff: 'top tà phái mass face-slap' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: Trúc Cơ đỉnh + treasures', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Multi-life sim — Kim Đan + Nguyên Anh',
    corePayoff: 'MC Nguyên Anh qua optimal multi-life paths',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Sim Kim Đan multi-life', payoff: 'optimal Kim Đan path' },
      { number: 2, range: [171, 190], theme: 'Real Kim Đan', payoff: 'Kim Đan 1' },
      { number: 3, range: [191, 210], theme: 'Sim đại lục politic', payoff: 'mạng lưới optimal' },
      { number: 4, range: [211, 230], theme: 'Real đại lục politics', payoff: 'liên minh thiết lập' },
      { number: 5, range: [231, 250], theme: 'Sim Nguyên Anh path', payoff: 'optimal đột phá' },
      { number: 6, range: [251, 270], theme: 'Real Nguyên Anh', payoff: 'Nguyên Anh đỉnh' },
      { number: 7, range: [271, 290], theme: 'Sim cosmic threats first', payoff: 'cosmic threat preview' },
      { number: 8, range: [291, 300], theme: 'CLIMAX arc 3: Nguyên Anh + cosmic preview', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Cosmic-tier sim — Hoá Thần',
    corePayoff: 'MC Hoá Thần qua cosmic-tier optimal sim',
    subArcs: [
      { number: 1, range: [301, 325], theme: 'Sim cosmic threats', payoff: 'cosmic optimal path' },
      { number: 2, range: [326, 350], theme: 'Real Hoá Thần đột phá', payoff: 'Hoá Thần 1' },
      { number: 3, range: [351, 375], theme: 'Cosmic ally network sim', payoff: 'cosmic ally optimal' },
      { number: 4, range: [376, 400], theme: 'Real cosmic ally form', payoff: 'cosmic ally network' },
      { number: 5, range: [401, 425], theme: 'Sim cosmic enemy reveal', payoff: 'kẻ địch cosmic identified' },
      { number: 6, range: [426, 450], theme: 'Real cosmic enemy face-slap', payoff: 'cosmic enemy bại' },
      { number: 7, range: [451, 475], theme: 'Sim đại lục bá chủ path', payoff: 'optimal đại lục bá chủ' },
      { number: 8, range: [476, 500], theme: 'CLIMAX arc 4: Hoá Thần + đại lục bá chủ', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Vạn giới sim — Hợp Thể',
    corePayoff: 'MC Hợp Thể, vạn giới ruins explored qua optimal sim',
    subArcs: [
      { number: 1, range: [501, 528], theme: 'Sim vạn giới ruins', payoff: 'multi-realm path optimal' },
      { number: 2, range: [529, 556], theme: 'Real vạn giới explore', payoff: 'multi-realm power' },
      { number: 3, range: [557, 584], theme: 'Sim Hợp Thể path', payoff: 'optimal Hợp Thể đột phá' },
      { number: 4, range: [585, 612], theme: 'Real Hợp Thể', payoff: 'Hợp Thể 1' },
      { number: 5, range: [613, 640], theme: 'Sim cosmic admin reveal', payoff: 'admin location identified' },
      { number: 6, range: [641, 668], theme: 'Real cosmic admin first confront', payoff: 'admin first face-slap' },
      { number: 7, range: [669, 700], theme: 'CLIMAX arc 5: Hợp Thể + admin weakened', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic admin sim — final showdown prep',
    corePayoff: 'MC cosmic-tier ultimate, admin face-slap prep optimal',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Sim admin protocol', payoff: 'protocol path optimal' },
      { number: 2, range: [731, 760], theme: 'Real admin protocol counter', payoff: 'admin protocol disrupted' },
      { number: 3, range: [761, 790], theme: 'Sim final battle', payoff: 'optimal final battle path' },
      { number: 4, range: [791, 820], theme: 'Real cosmic admin major', payoff: 'admin major bại' },
      { number: 5, range: [821, 850], theme: 'Sim ultimate weapon', payoff: 'optimal weapon path' },
      { number: 6, range: [851, 880], theme: 'Real ultimate weapon ready', payoff: 'weapon ready' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: ultimate weapon + admin weakened', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — final battle',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm với companion + đại lục',
    subArcs: [
      { number: 1, range: [901, 925], theme: 'Sim final', payoff: 'final battle optimal path' },
      { number: 2, range: [926, 950], theme: 'Real final battle', payoff: 'admin thua' },
      { number: 3, range: [951, 975], theme: '{{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 4, range: [976, 1000], theme: 'ENDING: warm closure', payoff: 'multi-realm peace, MC retire' },
    ],
  },
];
