/**
 * Huyen-huyen "hắc ám villain" — villain-shadow pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { HUYEN_HUYEN_HAC_AM_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(HUYEN_HUYEN_HAC_AM_ARC_SKELETON, {
  pattern: 'villain-shadow',
  toneDirective: '{{MC_NAME}} tone: ác có chiến lược, không hối hận. Personality lock — không thay đổi sang chính phái.',
  bansAlways: [
    'CẤM MC hối hận / chuyển sang chính phái — personality lock cứng',
    'CẤM thánh mẫu moments',
    'CẤM warm baseline arc 1 — đen tối từ đầu',
    'CẤM resource random — phải đoạt từ kill / cướp',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}'];
    if (arc <= 2) base.push('{{TA_PHAI_NAME}} đệ tử + chính phái thiên kiêu (victims)');
    if (arc >= 2) base.push('tà phái sư phụ');
    if (arc >= 3) base.push('đại lục chính phái Kim Đan/Nguyên Anh');
    if (arc >= 4) base.push('cosmic-tier antagonist', 'thượng cổ pháp bảo');
    if (arc >= 5) base.push('cosmic chính đạo', 'cosmic admin');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{TA_PHAI_NAME}} ngoại môn'
      : arc === 2 ? '{{TA_PHAI_NAME}} nội môn + đại lục Kim Đan'
      : arc === 3 ? 'Đại lục Nguyên Anh + cosmic-tier sites'
      : arc === 4 ? 'Thượng cổ ruins'
      : arc === 5 ? 'Cosmic vạn giới ruins'
      : 'Cosmic battlefield',
  threadsForArc: (arc) => {
    if (arc === 1) return ['nội môn tà phái', 'first kills'];
    if (arc === 2) return ['top tà phái', 'cosmic resources'];
    if (arc === 3) return ['Nguyên Anh tà đạo', 'đại lục top'];
    if (arc === 4) return ['Hoá Thần', 'thượng cổ pháp bảo'];
    if (arc === 5) return ['Hợp Thể cosmic', 'vạn giới ruins'];
    if (arc === 6) return ['cosmic admin face-slap', 'final form'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'mass kill chính phái / đoạt cosmic resources / dark ascension',
  confrontFlavor: 'tà phái rivalry / chính phái invasion / cosmic admin',
  breathingFlavor: 'plan dark scheme / hidden study / harvest dark resources',
});

export const HUYEN_HUYEN_HAC_AM_TEMPLATE: TemplateBlueprint = {
  templateId: 'huyen-huyen-hac-am-villain',
  description: 'Hắc Ám Villain archetype — MC ác đạo personality lock cứng, đoạt resources by force, leo từ tà phái đệ tử → cosmic peak qua villain-shadow pattern.',
  genre: 'huyen-huyen',
  totalChapters: 1000,
  arcs: HUYEN_HUYEN_HAC_AM_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'TA_PHAI_NAME', 'COMPANION_NAME',
    'ENDING_GOAL',
  ],
  optionalVars: { CONTINENT_NAME: 'Hỗn Nguyên Đại Lục' },
  varGuidance: {
    MC_NAME: 'Tên MC tà đạo — vd "Mặc Hắc Ảnh"',
    MC_FAMILY: 'Họ — vd "Mặc"',
    TA_PHAI_NAME: 'Tên tà phái — vd "Hắc Liên giáo", "Vạn Cổ Ma Tông"',
    COMPANION_NAME: 'Tà đạo companion (rare) — vd "Cô Cô Hắc Sương" (cô độc cùng phe)',
    ENDING_GOAL: 'Đích cuối — vd "Tà Đạo Đại Đế cosmic peak"',
    CONTINENT_NAME: 'Đại lục',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: ác có chiến lược, không hối hận, không thánh mẫu.',
    'Villain-shadow: no warm baseline, dark deeds steady.',
    'Personality lock cứng: MC không chuyển sang chính phái.',
  ],
  extraBannedPatterns: [
    'CẤM MC hối hận chuyển chính phái',
    'CẤM warm baseline arc 1',
    'CẤM thánh mẫu moments',
  ],
  cosmicArcStartChapter: 401,
  mood: ['sang-khoai', 'u-am'],
  tempo: 'medium',
  spiceLevel: 2,
};
