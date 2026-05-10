/**
 * Mat-the "thiên tai trồng cấy" — domain-shop pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { MAT_THE_THIEN_TAI_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(MAT_THE_THIEN_TAI_ARC_SKELETON, {
  pattern: 'domain-shop',
  toneDirective: '{{MC_NAME}} tone: pragmatic + cosy + tận tâm với community. Domain-shop: MC at farm/community, customers/survivors come.',
  bansAlways: [
    'CẤM zombie/supernatural mass — đây là thiên tai pure',
    'CẤM resource random — phải có farm / hoard / tech source',
    'CẤM reveal trọng sinh trắng trợn',
    'CẤM bạo lực bừa — focus survival + cooperation',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', 'gia đình MC', '{{COMPANION_NAME}}'];
    if (arc >= 1) base.push('survivors join community');
    if (arc >= 2) base.push('{{ANTAGONIST_FACTION}} bandit');
    if (arc >= 4) base.push('cosmic threat scouts');
    if (arc >= 6) base.push('cosmic admin');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} — small farm + safe space'
      : arc === 2 ? `Community 100 — expanded farm`
      : arc === 3 ? `Settlement 1000 + 5 allied`
      : arc === 4 ? 'Mini-city 5000-10K'
      : arc === 5 ? 'City 50K + global'
      : 'Đại lục cooperation + cosmic',
  threadsForArc: (arc) => {
    if (arc === 1) return ['family stable', 'farm productive'];
    if (arc === 2) return ['community 100', `bandit confront`];
    if (arc === 3) return ['settlement 1000', 'tech tier 2'];
    if (arc === 4) return ['mini-city', 'cosmic preview'];
    if (arc === 5) return ['city 50K', 'cosmic origin'];
    if (arc === 6) return ['đại lục liên minh', 'admin face-slap'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'survive thiên tai / community milestone / mutated harvest peak',
  confrontFlavor: 'bandit raid / disaster wave / cosmic invasion',
  breathingFlavor: 'farm work / community bonding / dialog với {{COMPANION_NAME}}',
});

export const MAT_THE_THIEN_TAI_TEMPLATE: TemplateBlueprint = {
  templateId: 'mat-the-thien-tai-trong-cay',
  description: 'Thiên Tai Trồng Cấy archetype — MC trong setting thiên tai pure (no zombies), focus build farm + community. Domain-shop pattern.',
  genre: 'mat-the',
  totalChapters: 1000,
  arcs: MAT_THE_THIEN_TAI_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'ANTAGONIST_FACTION',
    'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: { CITY_NAME: 'Sài Gòn' },
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Lý Hân"',
    MC_FAMILY: 'Họ — vd "Lý"',
    HOMETOWN: 'Quê — vd "Hà Tĩnh"',
    ANTAGONIST_FACTION: 'Faction đối thủ — vd "Hắc Long Hội"',
    COMPANION_NAME: 'Co-survivor — vd "Tô Linh"',
    ENDING_GOAL: 'Đích cuối — vd "đại lục cooperation peace + nhân loại reborn"',
    CITY_NAME: 'Thành phố action',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: pragmatic + cosy + tận tâm community.',
    'Domain-shop: MC at farm/community, không di chuyển nhiều.',
  ],
  extraBannedPatterns: ['CẤM zombie', 'CẤM bạo lực bừa'],
  cosmicArcStartChapter: 401,
};
