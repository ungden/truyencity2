/**
 * Cozy Fantasy slice-of-life — anti-sảng-văn healing tone.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { COZY_FANTASY_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(COZY_FANTASY_ARC_SKELETON, {
  pattern: 'domain-shop',
  toneDirective: '{{MC_NAME}} tone: warm + gentle + caring. Anti-sảng-văn: no major antagonist, no power-leveling, focus relationships + community + healing.',
  bansAlways: [
    'CẤM major antagonist mass face-slap — gentle conflict only',
    'CẤM power-leveling — MC stays approximately same skill tier',
    'CẤM dark themes / death / trauma without warm resolution',
    'CẤM cosmic-tier showdown — keep stakes local',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', 'regular customers'];
    if (arc >= 2) base.push('magical familiar', 'multi-race regulars');
    if (arc >= 3) base.push('adventurer parties');
    if (arc >= 4) base.push('royal family incognito');
    if (arc >= 5) base.push('ancient mystery NPCs');
    if (arc >= 6) base.push('multi-kingdom communities');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? `{{SHOP_NAME}} ở {{VILLAGE_NAME}} village`
      : arc === 2 ? `{{VILLAGE_NAME}} town + visitors`
      : arc === 3 ? `Kingdom touring + adventurer hub`
      : arc === 4 ? `Royal patronage + multi-branch`
      : arc === 5 ? 'Ancient site + history research'
      : arc === 6 ? 'Multi-kingdom pilgrimage'
      : 'Home village retirement',
  threadsForArc: (arc) => {
    if (arc === 1) return ['village adopts MC', '5 regulars'];
    if (arc === 2) return ['magical familiar', 'town visibility'];
    if (arc === 3) return ['adventurer regulars', 'second branch'];
    if (arc === 4) return ['royal patronage', 'shop chain'];
    if (arc === 5) return ['ancient mystery resolved'];
    if (arc === 6) return ['multi-kingdom support', 'home return'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'community festival / royal patronage / healing milestone',
  confrontFlavor: 'difficult customer / gentle conflict / mystery clue',
  breathingFlavor: 'cooking / shop maintenance / dialog với customers',
});

export const COZY_FANTASY_TEMPLATE: TemplateBlueprint = {
  templateId: 'cozy-fantasy-slice-of-life',
  description: 'Cozy Fantasy archetype — MC mở quán nhỏ trong fantasy village, slow-burn + healing + community. Anti-sảng-văn, no major antagonist. Domain-shop pattern.',
  genre: 'di-gioi',
  totalChapters: 1000,
  arcs: COZY_FANTASY_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'SHOP_NAME', 'VILLAGE_NAME', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: { FAMILIAR_NAME: 'Nho Lửa' },
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Lan"',
    SHOP_NAME: 'Tên quán — vd "Bakery Ánh Sáng", "Trà Quán Sương Mai"',
    VILLAGE_NAME: 'Tên làng — vd "Cây Trắc Bá"',
    COMPANION_NAME: 'Companion — vd "Mèo Sương" (magical familiar)',
    ENDING_GOAL: 'Đích cuối — vd "Shop legacy + multi-kingdom community + peaceful retirement"',
    FAMILIAR_NAME: 'Magical familiar name',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: warm + gentle + caring.',
    'Anti-sảng-văn: no major antagonist, no power-leveling, focus community + healing.',
    'Domain-shop: MC at shop, customers come.',
  ],
  extraBannedPatterns: [
    'CẤM major antagonist',
    'CẤM power-leveling',
    'CẤM dark themes without warm resolution',
  ],
  cosmicArcStartChapter: 901,
  mood: ['chua-lanh'],
  tempo: 'slow-burn',
  spiceLevel: 0,
};
