/**
 * Di-gioi "mushoku slow growth" — Jobless Reincarnation archetype.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { DI_GIOI_MUSHOKU_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(DI_GIOI_MUSHOKU_ARC_SKELETON, {
  pattern: 'linear-grind',
  toneDirective: '{{MC_NAME}} tone: reflective + earnest + character-driven. Slow realistic growth — KHÔNG cluster-dopamine, KHÔNG sảng văn beats.',
  bansAlways: [
    'CẤM cluster big_wow per 5 chương — slow burn',
    'CẤM power-leveling rapid — mỗi arc = 5-10 năm growth',
    'CẤM character không có flaws — realistic character development',
    'CẤM reveal cosmic-tier sớm trước arc 5',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', 'gia đình tái sinh'];
    if (arc >= 1) base.push('mentor wizard');
    if (arc >= 2) base.push('{{COMPANION_NAME}}');
    if (arc >= 3) base.push('{{LIFE_PARTNER}}');
    if (arc >= 4) base.push('children');
    if (arc >= 5) base.push('apprentice network');
    if (arc >= 6) base.push('ancient enemy');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? `{{HOMETOWN}} village — childhood`
      : arc === 2 ? `Multi-region — adventurer apprentice`
      : arc === 3 ? 'Multi-region adventure'
      : arc === 4 ? 'Settling town + family home'
      : arc === 5 ? 'Mage academy + mastery'
      : arc === 6 ? 'Ancient enemy domains'
      : 'Home village + legacy',
  threadsForArc: (arc) => {
    if (arc === 1) return ['skill milestone', 'family bond'];
    if (arc === 2) return ['rank C', 'companion bond'];
    if (arc === 3) return ['rank B', 'romance'];
    if (arc === 4) return ['family + business stable'];
    if (arc === 5) return ['rank S', 'ancient enemy hint'];
    if (arc === 6) return ['enemy weakened', 'apprentice network'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'skill milestone reached / family milestone / ancient enemy weakened',
  confrontFlavor: 'adventure crisis / family disapproval / ancient enemy',
  breathingFlavor: 'study magic / family time / character reflection',
});

export const DI_GIOI_MUSHOKU_TEMPLATE: TemplateBlueprint = {
  templateId: 'di-gioi-mushoku-slow-growth',
  description: 'Mushoku Tensei archetype — MC tái sinh dị giới từ baby, growth 30+ năm slow realistic. Linear-grind + character-driven, KHÔNG sảng văn.',
  genre: 'di-gioi',
  totalChapters: 1000,
  arcs: DI_GIOI_MUSHOKU_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'COMPANION_NAME', 'LIFE_PARTNER',
    'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC trẻ — vd "Rudeus"',
    MC_FAMILY: 'Họ — vd "Greyrat"',
    HOMETOWN: 'Quê village — vd "Buena Village"',
    COMPANION_NAME: 'Childhood friend / adventurer companion — vd "Eris"',
    LIFE_PARTNER: 'Love interest — vd "Sylphiette"',
    ENDING_GOAL: 'Đích cuối — vd "Legacy + peaceful death + apprentice inheritance"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: reflective + earnest + character-driven.',
    'Linear-grind: slow burn, KHÔNG sảng văn beats.',
  ],
  extraBannedPatterns: [
    'CẤM cluster big_wow per 5 chương',
    'CẤM power-leveling rapid',
  ],
  cosmicArcStartChapter: 501,
  mood: ['chua-lanh', 'lang-man'],
  tempo: 'slow-burn',
  spiceLevel: 1,
};
