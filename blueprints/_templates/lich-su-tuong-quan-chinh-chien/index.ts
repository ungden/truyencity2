/**
 * Lich-su "tướng quân chinh chiến" — cluster-dopamine warlord pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { LICH_SU_TUONG_QUAN_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(LICH_SU_TUONG_QUAN_ARC_SKELETON, {
  pattern: 'cluster-dopamine',
  toneDirective: '{{MC_NAME}} tone: chiến lược + tactical. Public face thanh niên may mắn, kiến thức quân sự hiện đại kín đáo.',
  bansAlways: [
    'CẤM bạo lực vô cớ — battle phải có tactical reason',
    'CẤM kiến thức hiện đại trắng trợn — phải gián tiếp',
    'CẤM reveal MC xuyên không',
    'CẤM tướng quân không có quân — luôn có military backing',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{LOYAL_OFFICER}}'];
    if (arc >= 2) base.push('hoàng đế', '{{ANTAGONIST_FAMILY}} triều');
    if (arc >= 3) base.push('{{FOREIGN_ENEMY}} chính tướng');
    if (arc >= 5) base.push('cosmic admin scouts');
    if (arc >= 6) base.push('multi-realm cosmic enemies');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? 'Biên cương + tiểu binh trại'
      : arc === 2 ? 'Biên cương — quân tinh nhuệ + 5K binh'
      : arc === 3 ? 'Trận trung tâm + lãnh thổ {{FOREIGN_ENEMY}}'
      : arc === 4 ? '{{DYNASTY_NAME}} đế đô + 5 kingdoms conquered'
      : arc === 5 ? 'Đại lục bá chủ — đế quốc'
      : 'Cosmic battlefield',
  threadsForArc: (arc) => {
    if (arc === 1) return ['tướng quân hậu bị', 'biên cương ổn'];
    if (arc === 2) return ['tướng quân chính', `{{FOREIGN_ENEMY}} đẩy lùi`];
    if (arc === 3) return ['đại tướng quân', `mass triều cống`];
    if (arc === 4) return ['vương phong', 'cosmic threat'];
    if (arc === 5) return ['hoàng đế', 'đại lục thống nhất'];
    if (arc === 6) return ['cosmic admin major bại', 'multi-realm peace'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'mass battle wins / kingdom thuần phục / hoàng đế phong',
  confrontFlavor: 'biên cương invasion / triều đảng tranh / cosmic admin scout',
  breathingFlavor: 'training quân / tactical planning / family time',
});

export const LICH_SU_TUONG_QUAN_TEMPLATE: TemplateBlueprint = {
  templateId: 'lich-su-tuong-quan-chinh-chien',
  description: 'Tướng Quân Chinh Chiến archetype — MC quân nhân xuyên cổ đại, focus chinh chiến biên cương + chinh phục → hoàng đế. Khác quan trường: military focus.',
  genre: 'lich-su',
  totalChapters: 1000,
  arcs: LICH_SU_TUONG_QUAN_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'DYNASTY_NAME', 'CAPITAL_CITY',
    'ANTAGONIST_FAMILY', 'FOREIGN_ENEMY', 'LOYAL_OFFICER', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC tướng quân — vd "Triệu Tử Long"',
    MC_FAMILY: 'Họ — vd "Triệu"',
    DYNASTY_NAME: 'Triều đại — vd "Đại Đường"',
    CAPITAL_CITY: 'Đế đô — vd "Trường An"',
    ANTAGONIST_FAMILY: 'Họ gian thần — vd "Tần"',
    FOREIGN_ENEMY: 'Ngoại địch — vd "Đột Quyết"',
    LOYAL_OFFICER: 'Tướng trung thành — vd "Trần Khánh Dư"',
    ENDING_GOAL: 'Đích cuối — vd "đại đế thống nhất thiên hạ"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: chiến lược + tactical.',
    'Cluster-dopamine: ≥1 battle win / 5 chương.',
  ],
  extraBannedPatterns: ['CẤM bạo lực vô cớ', 'CẤM reveal xuyên không'],
  cosmicArcStartChapter: 401,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'medium',
  spiceLevel: 1,
};
