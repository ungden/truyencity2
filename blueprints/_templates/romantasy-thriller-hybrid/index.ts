/**
 * Romantasy-Thriller hybrid — Romance + Magic + Mystery thriller.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { ROMANTASY_THRILLER_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(ROMANTASY_THRILLER_ARC_SKELETON, {
  pattern: 'cluster-dopamine',
  toneDirective: '{{FEMALE_MC}} tone: clever + brave + emotionally complex. Romance + thriller song song — investigation + relationship development parallel.',
  bansAlways: [
    'CẤM romance instant — slow build qua thriller plot',
    'CẤM mystery resolve dễ dàng — multi-layer conspiracy',
    'CẤM ignore magic system — phải có internal consistency',
    'CẤM love triangle drama (focus single OTP)',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{FEMALE_MC}}', '{{LOVE_INTEREST}}'];
    if (arc >= 1) base.push('investigation NPCs', 'mystery victims');
    if (arc >= 2) base.push('conspiracy suspects');
    if (arc >= 3) base.push('magic system mentors');
    if (arc >= 4) base.push('major villain');
    if (arc >= 5) base.push('cosmic ally network', 'ancient lore figures');
    if (arc >= 6) base.push('cosmic villain final');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? `{{CITY_NAME}} — first mystery scene + magical academy`
      : arc === 2 ? `{{CITY_NAME}} multi-district + romance development`
      : arc === 3 ? 'Magic system mastery sites + investigation'
      : arc === 4 ? 'Major villain confrontation arenas'
      : arc === 5 ? 'Multi-realm + ancient lore sites'
      : 'Cosmic battlefield + final showdown',
  threadsForArc: (arc) => {
    if (arc === 1) return ['first case resolved', 'first kiss'];
    if (arc === 2) return ['conspiracy plant', 'love confess'];
    if (arc === 3) return ['magic mastery', 'mid-reveal'];
    if (arc === 4) return ['villain ID', 'engagement'];
    if (arc === 5) return ['cosmic conspiracy', 'wedding'];
    if (arc === 6) return ['villain final form'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'mystery solved / villain identity reveal / wedding event',
  confrontFlavor: 'villain confrontation / suspect chase / magical duel',
  breathingFlavor: 'investigation analysis / romance moments / magic study',
});

export const ROMANTASY_THRILLER_TEMPLATE: TemplateBlueprint = {
  templateId: 'romantasy-thriller-hybrid',
  description: 'Romantasy-Thriller hybrid — Romance + Magic + Mystery thriller. Investigation + relationship parallel arcs, multi-layer conspiracy.',
  genre: 'huyen-huyen',
  totalChapters: 1000,
  arcs: ROMANTASY_THRILLER_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'FEMALE_MC', 'LOVE_INTEREST', 'CITY_NAME', 'KINGDOM_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    FEMALE_MC: 'Tên female MC — vd "Aria Stormwind"',
    LOVE_INTEREST: 'Love interest — vd "Lord Castor"',
    CITY_NAME: 'Thành phố action — vd "Argentum"',
    KINGDOM_NAME: 'Vương quốc — vd "Kingdom of Silverhold"',
    ENDING_GOAL: 'Đích cuối — vd "Kingdom peace + cosmic conspiracy defeated + happy ending với love"',
  },
  toneDirectives: [
    '{{FEMALE_MC}} tone: clever + brave + emotionally complex.',
    'Romance + thriller song song — không 1 lấn át 1.',
    'Multi-layer conspiracy.',
  ],
  extraBannedPatterns: [
    'CẤM romance instant',
    'CẤM mystery resolve dễ',
    'CẤM love triangle',
  ],
  cosmicArcStartChapter: 501,
  mood: ['lang-man', 'bi-an', 'kich-tinh'],
  tempo: 'medium',
  spiceLevel: 2,
};
