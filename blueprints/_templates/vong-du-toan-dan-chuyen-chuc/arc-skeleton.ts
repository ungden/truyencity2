/**
 * Vong-du "toàn dân chuyển chức" — cluster-dopamine + class-evolution.
 * Tất cả nhân loại được system grant một class. MC nhận hidden class.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const VONG_DU_TOAN_DAN_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Class system active — MC unique class reveal',
    corePayoff: 'MC nhận hidden class, leo top thành phố level 30',
    subArcs: [
      { number: 1, range: [1, 10], theme: 'Toàn dân class grant — MC hidden {{HIDDEN_CLASS}}', payoff: 'unique class active' },
      { number: 2, range: [11, 20], theme: 'First level-up + skill discovery', payoff: 'level 5 + first skills' },
      { number: 3, range: [21, 30], theme: 'Local face-slap rivals', payoff: 'top 100 thành phố' },
      { number: 4, range: [31, 40], theme: 'Mass dungeon clear local', payoff: 'level 20 + gear tier 1' },
      { number: 5, range: [41, 50], theme: 'CLIMAX arc 1: top thành phố level 30', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Top quốc gia — class evolution',
    corePayoff: 'MC top 1 quốc gia, class evolution lvl 60',
    subArcs: [
      { number: 1, range: [51, 70], theme: 'National tournament', payoff: 'national rank top 100' },
      { number: 2, range: [71, 90], theme: 'Class evolution lvl 30', payoff: 'class advanced' },
      { number: 3, range: [91, 110], theme: 'Mass dungeon clear national', payoff: 'gear tier 2 + level 50' },
      { number: 4, range: [111, 130], theme: '{{NATIONAL_RIVAL}} confront', payoff: 'face-slap national rival' },
      { number: 5, range: [131, 150], theme: 'CLIMAX arc 2: top 1 quốc gia + level 60', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'World tournament + global top 10',
    corePayoff: 'MC top 10 world, class peak human, mass dungeon cosmic-tier',
    subArcs: [
      { number: 1, range: [151, 175], theme: 'World tournament qualifier', payoff: 'qualified' },
      { number: 2, range: [176, 200], theme: 'World tournament rounds', payoff: 'top 100 world' },
      { number: 3, range: [201, 225], theme: 'Class evolution lvl 60 — peak human', payoff: 'class peak' },
      { number: 4, range: [226, 250], theme: 'Cosmic-tier dungeon access', payoff: 'cosmic items' },
      { number: 5, range: [251, 275], theme: 'World tournament finals', payoff: 'top 10 world' },
      { number: 6, range: [276, 300], theme: 'CLIMAX arc 3: top 10 + cosmic-tier dungeon', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Cosmic invasion + global defense',
    corePayoff: 'MC top 1 world, cosmic invasion defended, class transcend human',
    subArcs: [
      { number: 1, range: [301, 330], theme: 'Cosmic invasion announcement', payoff: 'invasion preview' },
      { number: 2, range: [331, 360], theme: 'Mass class evolution to lvl 80+', payoff: 'class transcend' },
      { number: 3, range: [361, 390], theme: 'Cosmic invasion first wave', payoff: 'wave bại' },
      { number: 4, range: [391, 420], theme: 'Mass cosmic dungeon clear', payoff: 'cosmic gear' },
      { number: 5, range: [421, 450], theme: 'Cosmic invasion second wave', payoff: 'wave 2 bại' },
      { number: 6, range: [451, 480], theme: 'Top 1 world confirmed', payoff: 'top 1 world' },
      { number: 7, range: [481, 500], theme: 'CLIMAX arc 4: cosmic invasion ổn + top 1 world', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Multi-realm exploration + class divine',
    corePayoff: 'MC class divine, multi-realm explored, ancient civ contact',
    subArcs: [
      { number: 1, range: [501, 530], theme: 'Multi-realm portal active', payoff: 'multi-realm access' },
      { number: 2, range: [531, 560], theme: 'Class evolve divine', payoff: 'class divine tier' },
      { number: 3, range: [561, 590], theme: 'Ancient civ contact', payoff: 'lore expand' },
      { number: 4, range: [591, 620], theme: 'Mass cosmic dungeon clear divine', payoff: 'divine gear' },
      { number: 5, range: [621, 650], theme: 'Multi-realm faction politics', payoff: 'multi-realm allies' },
      { number: 6, range: [651, 680], theme: 'Cosmic admin reveal', payoff: 'admin lore' },
      { number: 7, range: [681, 700], theme: 'CLIMAX arc 5: divine class + admin first weak', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic admin major confrontation',
    corePayoff: 'MC + multi-realm allies face-slap admin major',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Cosmic admin invasion peak', payoff: 'invasion peak' },
      { number: 2, range: [731, 760], theme: 'Class transcend divine — cosmic class', payoff: 'cosmic class tier' },
      { number: 3, range: [761, 790], theme: 'Mass admin face-slap', payoff: 'admin major bại' },
      { number: 4, range: [791, 820], theme: 'Multi-realm liên minh peak', payoff: 'allies peak' },
      { number: 5, range: [821, 850], theme: 'Reveal admin = ancient civ ruler', payoff: 'lore peak' },
      { number: 6, range: [851, 880], theme: 'Final plan cosmic ready', payoff: 'plan ready' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: admin weakened, final prep', payoff: 'sẵn sàng arc 7' },
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
      { number: 4, range: [976, 1000], theme: 'ENDING: warm closure', payoff: 'multi-realm peace, MC retire' },
    ],
  },
];
