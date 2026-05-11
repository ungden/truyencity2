/**
 * Faloo-style "综漫曝光名场面" — cross-canon reaction.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { FALOO_TONG_MAN_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(FALOO_TONG_MAN_ARC_SKELETON, {
  pattern: 'phó-bản',
  toneDirective: '{{MC_NAME}} tone: meta-aware fanboy + cool. Faloo DNA: title encodes mechanic, mỗi chương 1-2 reveals + reactions, cliffhanger dày.',
  bansAlways: [
    'CẤM canon characters break OOC khi react — phải in-character',
    'CẤM reveal spoiler không có lý do (system trigger / character earned)',
    'CẤM canon reveal trắng trợn không có audience react',
    'CẤM mass-reveal cosmic-tier sớm trước arc 4',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', 'system AI', 'audience canon characters'];
    if (arc === 1) base.push('Naruto cast');
    if (arc === 2) base.push('One Piece cast');
    if (arc === 3) base.push('Bleach + DBZ + Demon Slayer casts');
    if (arc >= 4) base.push('author OC antagonist');
    if (arc >= 5) base.push('cosmic ally network');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? 'Naruto canon world'
      : arc === 2 ? 'One Piece canon world'
      : arc === 3 ? 'Multi-canon (Bleach/DBZ/Demon Slayer)'
      : arc === 4 ? 'Meta-canon author domain'
      : 'Cosmic author hierarchy',
  threadsForArc: (arc) => {
    if (arc === 1) return ['Naruto canon complete', 'Akatsuki react'];
    if (arc === 2) return ['One Piece complete', 'multi-canon teleport'];
    if (arc === 3) return ['multi-canon hub', 'meta-canon hint'];
    if (arc === 4) return ['author meta reveal', 'OC antagonist xuất hiện'];
    if (arc === 5) return ['OC weakened', 'multi-canon allies'];
    if (arc === 6) return ['MC author tier', 'cosmic hierarchy'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'mass canon character reactions / cosmic reveal / hierarchy ascension',
  confrontFlavor: 'canon villain react / author OC scout / meta paradox',
  breathingFlavor: 'reveal preparation / dialog với system / canon character bonding',
});

export const FALOO_TONG_MAN_TEMPLATE: TemplateBlueprint = {
  templateId: 'faloo-tong-man-reaction',
  description: 'Faloo-style 综漫曝光名场面 — MC reveal canon backstories trigger character reactions. Multi-canon traveler.',
  genre: 'dong-nhan',
  totalChapters: 1000,
  arcs: FALOO_TONG_MAN_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: { SYSTEM_NAME: 'Tổng Mạn Phơi Bày Hệ Thống' },
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Diệp Phong"',
    COMPANION_NAME: 'Companion — vd "Tô Linh"',
    ENDING_GOAL: 'Đích cuối — vd "cosmic author tier + multi-canon peace"',
    SYSTEM_NAME: 'Hệ thống name',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: meta-aware fanboy + cool.',
    'Faloo DNA: title encodes mechanic + mỗi chương có reaction beats.',
  ],
  extraBannedPatterns: ['CẤM canon OOC react', 'CẤM spoiler không lý do'],
  cosmicArcStartChapter: 401,
  mood: ['sang-khoai', 'hai-huoc'],
  tempo: 'fast-paced',
  spiceLevel: 1,
};
