/**
 * Dong-nhan "Naruto system" — cluster-dopamine với canon hooks.
 * MC xuyên Naruto canon thành OC ninja với hệ thống granting jutsu.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const DONG_NHAN_NARUTO_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'MC xuyên ninja gia tộc + system grant',
    corePayoff: 'MC genin top {{VILLAGE_NAME}}, nhận {{CANON_MENTOR}} chú ý, system jutsu cấp E grant',
    subArcs: [
      { number: 1, range: [1, 10], theme: 'Xuyên thành thiếu niên ninja gia tộc', payoff: 'identity + system active, kekkei genkai unlock' },
      { number: 2, range: [11, 20], theme: 'Academy training — face-slap rivals', payoff: 'top genin academy' },
      { number: 3, range: [21, 30], theme: 'Genin team formation + first mission', payoff: 'team + first C-mission' },
      { number: 4, range: [31, 40], theme: '{{CANON_MENTOR}} chú ý + private training', payoff: 'private jutsu E-tier' },
      { number: 5, range: [41, 50], theme: 'CLIMAX arc 1: Chunin exam start + system jutsu D', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Chunin exam → Jonin promotion',
    corePayoff: 'MC promoted Jonin, mass canon characters interact, kekkei genkai bloom',
    subArcs: [
      { number: 1, range: [51, 70], theme: 'Chunin exam phases — face-slap canon thiên kiêu', payoff: 'Chunin promotion' },
      { number: 2, range: [71, 90], theme: 'Mass canon mission overlap', payoff: 'canon participation visible' },
      { number: 3, range: [91, 110], theme: 'Mass system jutsu C-tier grant', payoff: 'jutsu portfolio expand' },
      { number: 4, range: [111, 130], theme: 'Jonin promotion + canon arc engagement', payoff: 'Jonin rank + canon ninja war prep' },
      { number: 5, range: [131, 150], theme: 'CLIMAX arc 2: Jonin + ninja war preview', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Ninja war + Akatsuki engagement',
    corePayoff: 'MC face-slap Akatsuki member, canon save key character ({{FAVORITE_CHARACTER}}), system jutsu A-tier',
    subArcs: [
      { number: 1, range: [151, 175], theme: 'Ninja war start', payoff: 'war activated' },
      { number: 2, range: [176, 200], theme: '{{FAVORITE_CHARACTER}} life-threatening event — MC save', payoff: 'character preserved (canon đổi)' },
      { number: 3, range: [201, 225], theme: 'Akatsuki member confront', payoff: 'face-slap Akatsuki minor' },
      { number: 4, range: [226, 250], theme: 'Mass system jutsu B-tier', payoff: 'jutsu portfolio peak' },
      { number: 5, range: [251, 275], theme: 'Akatsuki major confront — Pain / Madara minor', payoff: 'face-slap Akatsuki major' },
      { number: 6, range: [276, 300], theme: 'CLIMAX arc 3: ninja war turning point', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Akatsuki dissolution + Otsutsuki preview',
    corePayoff: 'MC defeat Akatsuki, Otsutsuki cosmic threat preview, system jutsu S-tier',
    subArcs: [
      { number: 1, range: [301, 330], theme: 'Akatsuki final confrontation', payoff: 'Akatsuki dissolved' },
      { number: 2, range: [331, 360], theme: 'Mass village reconstruction', payoff: 'village stable' },
      { number: 3, range: [361, 390], theme: 'Otsutsuki scout reveal', payoff: 'cosmic threat preview' },
      { number: 4, range: [391, 420], theme: 'System jutsu S-tier grant', payoff: 'jutsu cosmic-tier' },
      { number: 5, range: [421, 450], theme: 'Cosmic ally network form', payoff: 'cosmic ninja allies' },
      { number: 6, range: [451, 480], theme: 'Otsutsuki major confrontation', payoff: 'cosmic threat first bại' },
      { number: 7, range: [481, 500], theme: 'CLIMAX arc 4: Otsutsuki preview + cosmic ally', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Otsutsuki main confrontation',
    corePayoff: 'MC + canon allies face-slap Otsutsuki main',
    subArcs: [
      { number: 1, range: [501, 530], theme: 'Otsutsuki invasion scale up', payoff: 'cosmic invasion peak' },
      { number: 2, range: [531, 560], theme: 'Mass jutsu cosmic deployment', payoff: 'cosmic jutsu deployed' },
      { number: 3, range: [561, 590], theme: 'Reveal: Kaguya backstory peak', payoff: 'lore expand' },
      { number: 4, range: [591, 620], theme: 'Mass Otsutsuki face-slap', payoff: 'Otsutsuki bại major' },
      { number: 5, range: [621, 650], theme: 'Cosmic plan ready', payoff: 'plan ready' },
      { number: 6, range: [651, 680], theme: 'Final Otsutsuki confrontation', payoff: 'Otsutsuki retreat' },
      { number: 7, range: [681, 700], theme: 'CLIMAX arc 5: Otsutsuki weakened, cosmic peace approach', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Multi-canon expansion (HP / DC / OP) + cosmic origin',
    corePayoff: 'MC du hành multi-canon, Hub Space connect cosmic origin lore',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Hub Space activate — multi-canon access', payoff: 'multi-canon hub' },
      { number: 2, range: [731, 760], theme: 'First HP / DC canon visit', payoff: 'cross-canon rewards' },
      { number: 3, range: [761, 790], theme: 'Cosmic origin investigate', payoff: 'lore peak' },
      { number: 4, range: [791, 820], theme: 'Mass cross-canon allies', payoff: 'multi-canon network' },
      { number: 5, range: [821, 850], theme: 'Reveal: cosmic puppet master', payoff: 'final villain reveal' },
      { number: 6, range: [851, 880], theme: 'Final cosmic plan ready', payoff: 'plan ready' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: cosmic puppet first weakened', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm với canon characters + multi-canon allies',
    subArcs: [
      { number: 1, range: [901, 930], theme: 'Final cosmic confrontation', payoff: 'cosmic puppet master engaged' },
      { number: 2, range: [931, 960], theme: 'Mass cosmic jutsu deployment', payoff: 'puppet bại' },
      { number: 3, range: [961, 985], theme: '{{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 4, range: [986, 1000], theme: 'ENDING: warm closure', payoff: 'multi-canon peace, MC retire / continue protecting' },
    ],
  },
];
