/**
 * Mat-the "thiên tai trồng cấy" — domain-shop pattern.
 * MC trong setting thiên tai (no zombies), focus build farm/community.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const MAT_THE_THIEN_TAI_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Pre-disaster + first thiên tai (extreme weather)',
    corePayoff: 'MC build small farm + safe space, family stable through first đợt',
    subArcs: [
      { number: 1, range: [1, 10], theme: 'Trọng sinh + warning từ tương lai', payoff: 'memories + space active' },
      { number: 2, range: [11, 20], theme: 'Hoard supplies + build farm prep', payoff: 'farm setup + basics' },
      { number: 3, range: [21, 30], theme: 'First disaster — extreme cold/heat', payoff: 'family survive' },
      { number: 4, range: [31, 40], theme: 'Recover + expand farm', payoff: 'farm productive' },
      { number: 5, range: [41, 50], theme: 'CLIMAX arc 1: stable farm + survivors join', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Long disaster phase — community 100',
    corePayoff: 'Community 100 stable, farm produce shared, mass thiên tai survived',
    subArcs: [
      { number: 1, range: [51, 70], theme: 'Mass disaster — đại hồng thuỷ', payoff: 'farm protected via space' },
      { number: 2, range: [71, 90], theme: 'Community grows 50 survivors', payoff: 'community established' },
      { number: 3, range: [91, 110], theme: '{{ANTAGONIST_FACTION}} bandit attack', payoff: 'face-slap bandit' },
      { number: 4, range: [111, 130], theme: 'Mass farm expand — multi-crops', payoff: 'self-sustained' },
      { number: 5, range: [131, 150], theme: 'CLIMAX arc 2: community 100 stable', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Settlement 1000 — mutated crops + {{ANTAGONIST_FACTION}} confront',
    corePayoff: 'Settlement 1000, mutated crops grown, {{ANTAGONIST_FACTION}} bại',
    subArcs: [
      { number: 1, range: [151, 175], theme: 'Mass thiên tai - đại lạnh + mutated soil', payoff: 'mutated crops phát hiện' },
      { number: 2, range: [176, 200], theme: 'Settlement grow 500', payoff: 'settlement established' },
      { number: 3, range: [201, 225], theme: '{{ANTAGONIST_FACTION}} mass attack', payoff: 'face-slap mass + counter' },
      { number: 4, range: [226, 250], theme: 'Mutated crop varieties — tech tier 2', payoff: 'crop empire' },
      { number: 5, range: [251, 275], theme: 'Liên minh settlements khu vực', payoff: '5 settlements liên minh' },
      { number: 6, range: [276, 300], theme: 'CLIMAX arc 3: settlement 1000 + tech 2', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Mini-city 5000 + tech tier 3',
    corePayoff: 'Mini-city 5000, mass alliance global, tech tier 3 bio-engineering',
    subArcs: [
      { number: 1, range: [301, 330], theme: 'Mini-city build', payoff: 'city tier 1' },
      { number: 2, range: [331, 360], theme: 'Mass disaster — global pole shift', payoff: 'global cooperation' },
      { number: 3, range: [361, 390], theme: 'Tech tier 3 — bio-engineering crops', payoff: 'crops mutated peak' },
      { number: 4, range: [391, 420], theme: '{{ANTAGONIST_FACTION}} cosmic-tier reveal', payoff: 'first cosmic-tier' },
      { number: 5, range: [421, 450], theme: 'Mass cosmic-tier counter', payoff: 'cosmic-tier bại đợt 1' },
      { number: 6, range: [451, 480], theme: 'Mini-city peak — population 10K', payoff: 'city tier 2' },
      { number: 7, range: [481, 500], theme: 'CLIMAX arc 4: mini-city + cosmic preview', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'City 50K + cosmic threat origin',
    corePayoff: 'City 50K, cosmic threat origin reveal',
    subArcs: [
      { number: 1, range: [501, 530], theme: 'City expand 30K', payoff: 'city tier 2' },
      { number: 2, range: [531, 560], theme: 'Cosmic threat investigation', payoff: 'lore reveal' },
      { number: 3, range: [561, 590], theme: 'Tech tier 4 — alien tech reverse engineer', payoff: 'tech 4' },
      { number: 4, range: [591, 620], theme: 'Mass cosmic invasion', payoff: 'cosmic invasion bại' },
      { number: 5, range: [621, 650], theme: 'Multi-city alliance', payoff: '20 cities allied' },
      { number: 6, range: [651, 680], theme: 'Cosmic origin — alien farm reveal', payoff: 'lore peak' },
      { number: 7, range: [681, 700], theme: 'CLIMAX arc 5: city 50K + cosmic origin', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Đại lục liên minh + cosmic admin',
    corePayoff: 'Đại lục liên minh, cosmic admin lộ',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Đại lục liên minh', payoff: '50+ cities allied' },
      { number: 2, range: [731, 760], theme: 'Cosmic admin reveal', payoff: 'admin lộ' },
      { number: 3, range: [761, 790], theme: 'Mass cosmic admin face-slap', payoff: 'admin bại đợt 1' },
      { number: 4, range: [791, 820], theme: 'Cosmic ally network', payoff: 'cosmic ally peak' },
      { number: 5, range: [821, 850], theme: 'Reveal: trái đất là alien farm', payoff: 'lore ultimate' },
      { number: 6, range: [851, 880], theme: 'Final plan ready', payoff: 'plan ready' },
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
      { number: 4, range: [976, 1000], theme: 'ENDING: warm closure', payoff: 'nhân loại reborn, MC retire' },
    ],
  },
];
