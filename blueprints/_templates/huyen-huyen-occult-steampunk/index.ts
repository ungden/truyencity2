/**
 * Huyen-huyen "occult steampunk" — Lord of Mysteries archetype.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { HUYEN_HUYEN_OCCULT_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(HUYEN_HUYEN_OCCULT_ARC_SKELETON, {
  pattern: 'villain-shadow',
  toneDirective: '{{MC_NAME}} tone: cautious, paranoid, scholar. Tone u ám + bí ẩn, secret history. KHÔNG power-leveling thuần — mỗi Sequence ascension là ritual nguy hiểm.',
  bansAlways: [
    'CẤM Sequence ascension dễ dàng — phải có ritual + materials + risk',
    'CẤM lore reveal đầy đủ một lúc — phải tầng tầng qua investigation',
    'CẤM ancient gods xuất hiện sớm trước arc 3',
    'CẤM MC không sợ — luôn cautious, không khoe khoang',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}'];
    if (arc >= 1) base.push(`{{ORDER_NAME}} members`, '{{ANTAGONIST_NPC}} dark cult');
    if (arc >= 2) base.push('Sequence 7-8 peers');
    if (arc >= 3) base.push('ancient god #1 cult');
    if (arc >= 4) base.push('god incarnations', 'cosmic allies');
    if (arc >= 6) base.push('original creator');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? `{{CITY_NAME}} steampunk + {{ORDER_NAME}} base`
      : arc === 2 ? `{{CITY_NAME}} multi-district + ritual sites`
      : arc === 3 ? 'Steampunk multi-city + ancient ruins'
      : arc === 4 ? 'Cross-continent + god domains'
      : arc === 5 ? 'Multi-realm + cosmic ruins'
      : 'Divine realm + creator domain',
  threadsForArc: (arc) => {
    if (arc === 1) return ['Sequence 8', `{{ANTAGONIST_NPC}} cult`];
    if (arc === 2) return ['Sequence 7', 'dark cult network'];
    if (arc === 3) return ['Sequence 5', 'ancient god #1'];
    if (arc === 4) return ['Sequence 3', 'god #1 neutralized'];
    if (arc === 5) return ['Sequence 2', 'multi-god confrontation'];
    if (arc === 6) return ['Sequence 1', 'creator lore'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'Sequence ascension visible / god incarnation defeated / cosmic ritual completed',
  confrontFlavor: 'dark cult investigation / god incarnation / forbidden ritual',
  breathingFlavor: 'study ancient texts / ritual research / dialog với {{ORDER_NAME}}',
});

export const HUYEN_HUYEN_OCCULT_TEMPLATE: TemplateBlueprint = {
  templateId: 'huyen-huyen-occult-steampunk',
  description: 'Lord of Mysteries-style occult steampunk — MC xuyên world steampunk + cosmic horror. Path-based cultivation (Sequences 9→0). U ám, secret history, ancient gods. Anti-power-fantasy tone.',
  genre: 'huyen-huyen',
  totalChapters: 1000,
  arcs: HUYEN_HUYEN_OCCULT_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'CITY_NAME', 'ORDER_NAME',
    'ANTAGONIST_NPC', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: { PATHWAY_NAME: 'Người Chiêm Bốc' },
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Chu Minh Thụy"',
    MC_FAMILY: 'Họ — vd "Chu"',
    CITY_NAME: 'Thành phố steampunk — vd "Bắc Ngạn (Backlund)"',
    ORDER_NAME: 'Tổ chức MC join — vd "Đêm Thánh Đoàn", "Bí Phái Số Mệnh"',
    ANTAGONIST_NPC: 'Dark cult leader — vd "Aurora Order leader"',
    COMPANION_NAME: 'Companion — vd "Audrey"',
    ENDING_GOAL: 'Đích cuối — vd "Sequence 0 Divinity guardian"',
    PATHWAY_NAME: 'Pathway của MC — vd "Người Chiêm Bốc / Seer"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: cautious, paranoid, scholar.',
    'U ám + bí ẩn + cosmic horror tone — secret history, ritual cost, tầng tầng bí mật.',
    'Anti-power-fantasy: mỗi Sequence ascension là ritual nguy hiểm.',
  ],
  extraBannedPatterns: [
    'CẤM Sequence dễ dàng',
    'CẤM lore reveal đầy đủ',
    'CẤM ancient gods xuất hiện sớm',
  ],
  cosmicArcStartChapter: 301,
  mood: ['u-am', 'bi-an', 'ky-la'],
  tempo: 'medium',
  spiceLevel: 2,
};
