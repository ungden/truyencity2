/**
 * Ngon-tinh "khoái xuyên" — phó-bản pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { NGON_TINH_KHOAI_XUYEN_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(NGON_TINH_KHOAI_XUYEN_ARC_SKELETON, {
  pattern: 'phó-bản',
  toneDirective: '{{FEMALE_MC}} tone: cool nhân viên system + meta-aware. Mỗi world: pháo hôi save nguyên chủ + romance với male lead canon.',
  bansAlways: [
    'CẤM cross-world memory transfer trắng trợn — chỉ MC nhớ hết',
    'CẤM kill nguyên chủ — must save',
    'CẤM romance với male lead break canon OOC',
    'CẤM admin reveal trắng trợn sớm',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{FEMALE_MC}}', 'system AI'];
    if (arc >= 1) base.push('nguyên chủ canon (saved)', 'male lead canon (romance)');
    if (arc >= 4) base.push('system administrator');
    if (arc >= 6) base.push('multi-world allies');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? 'World 1 — tổng tài văn'
      : arc === 2 ? 'Worlds 2-4 — cổ đại / showbiz / tu tiên'
      : arc === 3 ? 'Worlds 5-8 — mạt thế / lich-su / dị giới / horror'
      : arc === 4 ? 'Worlds 9-12 — cosmic-tier'
      : arc === 5 ? 'Worlds 13-15 + system origin'
      : arc === 6 ? 'System rebellion + admin domain'
      : 'Final escape + chosen world',
  threadsForArc: (arc) => {
    if (arc === 1) return ['world 1 complete', 'pháo hôi → save nguyên chủ'];
    if (arc === 2) return ['worlds 2-4 complete', 'multi-world tài nguyên'];
    if (arc === 3) return ['worlds 5-8 complete', 'multi-canon access'];
    if (arc === 4) return ['cosmic worlds', 'system enemy reveal'];
    if (arc === 5) return ['system origin', 'admin first weak'];
    if (arc === 6) return ['admin major bại', 'lore peak'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'world clear / face-slap canon villains / nguyên chủ saved / admin face-slap',
  confrontFlavor: 'canon villain / pháo hôi obstacles / admin scout',
  breathingFlavor: 'identity setup / canon character bonding / system reward review',
});

export const NGON_TINH_KHOAI_XUYEN_TEMPLATE: TemplateBlueprint = {
  templateId: 'ngon-tinh-khoai-xuyen',
  description: 'Khoái Xuyên archetype — Female MC nhân viên system, mỗi 30-50 chương xuyên thân phận pháo hôi cứu nguyên chủ. Phó-bản: 1 sub-arc = 1 world.',
  genre: 'ngon-tinh',
  totalChapters: 1000,
  arcs: NGON_TINH_KHOAI_XUYEN_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'FEMALE_MC', 'FEMALE_MC_FAMILY', 'ENDING_GOAL',
  ],
  optionalVars: { SYSTEM_NAME: 'Vô Hạn Pháo Hôi System' },
  varGuidance: {
    FEMALE_MC: 'Tên female MC employee — vd "Tô Linh"',
    FEMALE_MC_FAMILY: 'Họ — vd "Tô"',
    ENDING_GOAL: 'Đích cuối — vd "system escape + chọn world favorite to retire với male lead"',
    SYSTEM_NAME: 'Tên system',
  },
  toneDirectives: [
    '{{FEMALE_MC}} tone: cool nhân viên + meta-aware.',
    'Phó-bản: 1 sub-arc = 1 world với pháo hôi → save nguyên chủ.',
  ],
  extraBannedPatterns: ['CẤM cross-world memory leak', 'CẤM kill nguyên chủ'],
  cosmicArcStartChapter: 401,
};
