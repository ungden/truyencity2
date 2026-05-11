/**
 * Faloo-style "quốc vận + prompt" — hook-in-title + cliffhanger dày.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { FALOO_QUOC_VAN_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(FALOO_QUOC_VAN_ARC_SKELETON, {
  pattern: 'phó-bản',
  toneDirective: '{{MC_NAME}} tone: cool meta-aware + tính toán theo prompt. Faloo DNA: ≥2-3 mini-cliffhanger per chapter, hook trong title.',
  bansAlways: [
    'CẤM prompt grant random tài nguyên — phải có rule (event tournament / quốc vận trigger)',
    'CẤM chapter không có ≥1 cliffhanger ending',
    'CẤM MC ignore prompt — luôn follow để giữ DNA',
    'CẤM reveal cosmic system origin trước arc 4',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', 'system prompt AI'];
    if (arc >= 1) base.push('national rivals', '{{ANTAGONIST_NPC}}');
    if (arc >= 3) base.push('global competitors');
    if (arc >= 4) base.push('cosmic allies', 'cosmic rivals');
    if (arc >= 5) base.push('admin scouts');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? `{{HOMETOWN}} — local events + national qualifier`
      : arc === 2 ? 'National finals + continental qualifier'
      : arc === 3 ? 'Continental + global rounds'
      : arc === 4 ? 'Global finals + cosmic ally network'
      : arc === 5 ? 'Cosmic tournament tier'
      : arc === 6 ? 'Multi-realm + admin domain'
      : 'Final battle realm',
  threadsForArc: (arc) => {
    if (arc === 1) return ['system tier 1', 'top 10 national'];
    if (arc === 2) return ['top 100 continental', `{{ANTAGONIST_NPC}} reveal`];
    if (arc === 3) return ['top 100 global', 'cosmic preview'];
    if (arc === 4) return ['global champion', 'cosmic origin'];
    if (arc === 5) return ['top 1 cosmic', 'admin scout'];
    if (arc === 6) return ['admin weakened', 'lore peak'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'prompt-guided face-slap / tournament win / cosmic reveal',
  confrontFlavor: 'rival skirmish / event trial / admin scout',
  breathingFlavor: 'prompt analysis / strategy planning / dialog với companion',
});

export const FALOO_QUOC_VAN_TEMPLATE: TemplateBlueprint = {
  templateId: 'faloo-quoc-van-prompt',
  description: 'Faloo-style quốc vận + system prompt — MC dùng prompt hint từ AI để leo top national → global → cosmic. Hook-in-title, cliffhanger dày, phó-bản pattern.',
  genre: 'do-thi', // Anchor genre; really cross-genre Faloo formula
  totalChapters: 1000,
  arcs: FALOO_QUOC_VAN_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'COUNTRY_NAME',
    'ANTAGONIST_NPC', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Lý Phong"',
    MC_FAMILY: 'Họ — vd "Lý"',
    HOMETOWN: 'Quê — vd "Sài Gòn"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam"',
    ANTAGONIST_NPC: 'Đối thủ chính (rival NPC) — vd "Hắc Vũ"',
    COMPANION_NAME: 'Companion — vd "Tô Linh"',
    ENDING_GOAL: 'Đích cuối — vd "cosmic-tier prompt master + multi-realm peace"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: cool meta-aware + tính toán prompt-driven.',
    'Faloo DNA: ≥2-3 mini-cliffhanger per chapter, hook-in-title mandatory.',
    'Phó-bản: 1 sub-arc = 1 event / tournament tier.',
  ],
  extraBannedPatterns: [
    'CẤM chapter không có cliffhanger',
    'CẤM prompt random không rule',
  ],
  cosmicArcStartChapter: 401,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'fast-paced',
  spiceLevel: 1,
};
