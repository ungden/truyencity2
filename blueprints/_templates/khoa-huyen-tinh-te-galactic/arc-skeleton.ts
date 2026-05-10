/**
 * Khoa-huyen "tinh tế galactic" — time-skip-macro space opera.
 * MC build galactic empire qua warlord conquest + tech expansion.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const KHOA_HUYEN_TINH_TE_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'MC pilot mech — first sector skirmish',
    corePayoff: 'MC pilot top sector, gặp {{COMPANION_NAME}} engineer, first hidden tech',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Pilot mech academy graduation', payoff: 'pilot rank cấp F + first mech' },
      { number: 2, range: [8, 14], theme: 'First sector patrol', payoff: 'first kill space pirate' },
      { number: 3, range: [15, 21], theme: '{{COMPANION_NAME}} engineer kết bạn', payoff: 'partner upgrade mech' },
      { number: 4, range: [22, 28], theme: '{{LOW_RIVAL}} pilot hostile', payoff: 'face-slap rival pilot' },
      { number: 5, range: [29, 35], theme: 'Mass sector skirmish — top 10', payoff: 'rank cấp E' },
      { number: 6, range: [36, 42], theme: 'First hidden tech ruins', payoff: 'ancient tech lvl 1' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: top sector + ancient tech', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Multi-sector domination — empire build start',
    corePayoff: 'MC chiếm 5 sectors, build empire small, mass M&A',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Time-skip 5 năm — sector dominance', payoff: 'sector control lock' },
      { number: 2, range: [66, 80], theme: 'M&A space corp 1', payoff: 'corp 1 absorbed' },
      { number: 3, range: [81, 95], theme: '{{ANTAGONIST_CORP}} cosmic-tier scout', payoff: 'first major corp confront' },
      { number: 4, range: [96, 110], theme: 'Mass conquest 5 sectors', payoff: '5 sectors controlled' },
      { number: 5, range: [111, 125], theme: 'Time-skip 5 năm — empire infrastructure', payoff: 'empire tech 2' },
      { number: 6, range: [126, 140], theme: 'Mass {{ANTAGONIST_CORP}} attack', payoff: 'face-slap corp mass' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: 5-sector empire', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Quadrant domination — galactic top 10',
    corePayoff: 'Empire top 10 quadrant, mass corp absorbed, ancient civ first contact',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Time-skip 10 năm — quadrant infrastructure', payoff: 'quadrant tech 3' },
      { number: 2, range: [171, 190], theme: 'Mass M&A corps 5', payoff: 'corps absorbed' },
      { number: 3, range: [191, 210], theme: 'Ancient civ first contact', payoff: 'lore reveal' },
      { number: 4, range: [211, 230], theme: 'Mass conquest 20 sectors', payoff: '20 sectors controlled' },
      { number: 5, range: [231, 250], theme: 'Time-skip 5 năm — quadrant peak', payoff: 'quadrant top 10' },
      { number: 6, range: [251, 270], theme: 'Cosmic threat first scout', payoff: 'cosmic threat preview' },
      { number: 7, range: [271, 290], theme: 'Multi-corp liên minh', payoff: 'cosmic ally network' },
      { number: 8, range: [291, 300], theme: 'CLIMAX arc 3: top 10 quadrant + cosmic preview', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Galactic top 3 + cosmic war',
    corePayoff: 'Top 3 galactic empire, cosmic war defensive successful',
    subArcs: [
      { number: 1, range: [301, 325], theme: 'Time-skip 10 năm — galactic infrastructure', payoff: 'galactic tech 4' },
      { number: 2, range: [326, 350], theme: 'Cosmic war first invasion', payoff: 'phòng thủ thành công' },
      { number: 3, range: [351, 375], theme: 'Mass cosmic counter-attack', payoff: 'cosmic mass face-slap' },
      { number: 4, range: [376, 400], theme: 'Top 3 galactic confirmed', payoff: 'top 3 confirmed' },
      { number: 5, range: [401, 425], theme: 'Time-skip 5 năm — peak infrastructure', payoff: 'galactic peak' },
      { number: 6, range: [426, 450], theme: 'Cosmic admin reveal', payoff: 'admin reveal lore' },
      { number: 7, range: [451, 475], theme: 'Cosmic ally network peak', payoff: 'allies cosmic peak' },
      { number: 8, range: [476, 500], theme: 'CLIMAX arc 4: top 3 + admin lore', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Multi-galaxy war — top 1 universe',
    corePayoff: 'MC top 1 galactic empire, mass cosmic admin face-slap',
    subArcs: [
      { number: 1, range: [501, 528], theme: 'Cosmic war peak', payoff: 'cosmic invasion peak' },
      { number: 2, range: [529, 556], theme: 'Time-skip 10 năm — multi-galaxy infrastructure', payoff: 'multi-galaxy tech 5' },
      { number: 3, range: [557, 584], theme: 'Mass cosmic admin face-slap major', payoff: 'admin major bại' },
      { number: 4, range: [585, 612], theme: 'Top 1 galactic + multi-galaxy presence', payoff: 'top 1 confirmed' },
      { number: 5, range: [613, 640], theme: 'Cosmic admin protocol reveal', payoff: 'admin lore peak' },
      { number: 6, range: [641, 668], theme: 'Cosmic ally network ultimate', payoff: 'cosmic peak ally' },
      { number: 7, range: [669, 700], theme: 'CLIMAX arc 5: top 1 + admin major weakened', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic admin final showdown',
    corePayoff: 'MC + cosmic ally face-slap admin final form',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Cosmic admin invasion peak', payoff: 'admin protocol attack' },
      { number: 2, range: [731, 760], theme: 'Cosmic ally peak', payoff: 'allies peak' },
      { number: 3, range: [761, 790], theme: 'Time-skip 5 năm — ultimate prep', payoff: 'ultimate weapon ready' },
      { number: 4, range: [791, 820], theme: 'Mass cosmic admin face-slap', payoff: 'admin retreat' },
      { number: 5, range: [821, 850], theme: 'Reveal: admin = ancient civ ruler', payoff: 'lore peak' },
      { number: 6, range: [851, 880], theme: 'Final cosmic plan', payoff: 'plan ready' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: admin weakened', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm',
    subArcs: [
      { number: 1, range: [901, 925], theme: 'Final cosmic threat', payoff: 'protocol active' },
      { number: 2, range: [926, 950], theme: 'Final battle', payoff: 'admin thua' },
      { number: 3, range: [951, 975], theme: '{{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 4, range: [976, 1000], theme: 'ENDING: warm closure', payoff: 'multi-galaxy peace, MC retire' },
    ],
  },
];
