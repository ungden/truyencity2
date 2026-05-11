/**
 * Cozy Sci-fi space-bakery — anti-sảng-văn cozy in space opera.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { COZY_SCIFI_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(COZY_SCIFI_ARC_SKELETON, {
  pattern: 'domain-shop',
  toneDirective: '{{MC_NAME}} tone: warm + gentle + interstellar-aware. Anti-sảng-văn: focus relationships + healing trong vũ trụ.',
  bansAlways: [
    'CẤM major antagonist mass war — gentle conflict only',
    'CẤM galactic empire conquest — keep stakes local-station',
    'CẤM dark themes without warm resolution',
    'CẤM cosmic-tier showdown',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', 'station regulars', 'AI companion'];
    if (arc >= 1) base.push('alien customers (gentle)');
    if (arc >= 3) base.push('star pilot crews');
    if (arc >= 4) base.push('fleet captain incognito');
    if (arc >= 5) base.push('ancient civ NPCs');
    if (arc >= 6) base.push('multi-galaxy refugees');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? `{{SHOP_NAME}} trên trạm {{STATION_NAME}}`
      : arc === 2 ? `Sector multi-station tour`
      : arc === 3 ? 'Adventurer crew hub + second branch'
      : arc === 4 ? 'Fleet patronage + shop chain'
      : arc === 5 ? 'Ancient civ ruins (gentle)'
      : arc === 6 ? 'Multi-galaxy tour'
      : 'Home station retirement',
  threadsForArc: (arc) => {
    if (arc === 1) return ['station adopts MC', '5 regulars'];
    if (arc === 2) return ['AI companion deepens', 'multi-species regulars'];
    if (arc === 3) return ['second branch', 'pilot mentor'];
    if (arc === 4) return ['fleet patronage', 'shop chain'];
    if (arc === 5) return ['ancient civ mystery resolved'];
    if (arc === 6) return ['multi-galaxy support', 'home return'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'station festival / fleet patronage / ancient heritage embraced',
  confrontFlavor: 'difficult alien customer / gentle conflict / mystery clue',
  breathingFlavor: 'recipe development / shop maintenance / dialog với AI companion',
});

export const COZY_SCIFI_TEMPLATE: TemplateBlueprint = {
  templateId: 'cozy-sci-fi-space-bakery',
  description: 'Cozy Sci-fi space-bakery — MC mở shop trên trạm vũ trụ, slow-burn + healing + alien community. Anti-sảng-văn space opera.',
  genre: 'khoa-huyen',
  totalChapters: 1000,
  arcs: COZY_SCIFI_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'SHOP_NAME', 'STATION_NAME', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: { GALAXY_NAME: 'Tinh Hà Liên Bang' },
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Lin"',
    SHOP_NAME: 'Tên shop — vd "Space Bakery Ánh Sao", "Cosmic Tea House"',
    STATION_NAME: 'Tên trạm vũ trụ — vd "Trạm Vũ Trụ Aurora"',
    COMPANION_NAME: 'AI companion / cyborg — vd "AURA-7 AI"',
    ENDING_GOAL: 'Đích cuối — vd "Multi-galaxy shop legacy + peaceful retirement"',
    GALAXY_NAME: 'Galactic union name',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: warm + gentle + interstellar-aware.',
    'Anti-sảng-văn: focus relationships + healing in space.',
  ],
  extraBannedPatterns: [
    'CẤM major antagonist',
    'CẤM galactic conquest',
  ],
  cosmicArcStartChapter: 901,
  mood: ['chua-lanh', 'ky-la'],
  tempo: 'slow-burn',
  spiceLevel: 0,
};
