/**
 * Lich-su "coroner mystery" — Đại Phụng Đả Canh Nhân archetype.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { LICH_SU_CORONER_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(LICH_SU_CORONER_ARC_SKELETON, {
  pattern: 'phó-bản',
  toneDirective: '{{MC_NAME}} tone: detective + cool + sarcastic. Mỗi sub-arc = 1 case (phó-bản). Kết hợp phá án + triều đình + huyền năng.',
  bansAlways: [
    'CẤM case không có logical solve — phải có evidence trail',
    'CẤM power tier ascension dễ dàng — phải có ritual',
    'CẤM canon-knowledge spoiler trắng trợn (MC là hiện đại cảnh sát, biết science nhưng phải gián tiếp)',
    'CẤM cosmic-tier cases sớm arc 1-2',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{COMPANION_NAME}}'];
    if (arc >= 1) base.push(`{{INSTITUTION_NAME}} thượng cấp`);
    if (arc >= 2) base.push('triều đình quan', `{{ANTAGONIST_FAMILY}}`);
    if (arc >= 3) base.push('Nho/Đạo/Phật phái master');
    if (arc >= 4) base.push('cosmic visitors');
    if (arc >= 5) base.push('ancient god incarnations');
    if (arc >= 6) base.push('original god');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? `{{CAPITAL_CITY}} — {{INSTITUTION_NAME}} HQ`
      : arc === 2 ? `{{CAPITAL_CITY}} multi-district + cấp châu`
      : arc === 3 ? 'Triều đường + multi-sect'
      : arc === 4 ? 'Quốc gia + cosmic-tier sites'
      : arc === 5 ? 'Multi-realm + ancient ruins'
      : arc === 6 ? 'Original god domain'
      : 'Final battle realm',
  threadsForArc: (arc) => {
    if (arc === 1) return ['Ngân tỳ tier', '3 cases'];
    if (arc === 2) return ['Hoàng kim tỳ tier', 'multi-sect cases'];
    if (arc === 3) return ['Đồng đẳng phẩm tỳ', 'triều đình'];
    if (arc === 4) return ['Nhất phẩm tỳ', 'cosmic-tier cases'];
    if (arc === 5) return ['Siêu phẩm tỳ', 'ancient gods'];
    if (arc === 6) return ['Tổ tỳ tier', 'original god'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'case solved mass / power tier ascension / cosmic case reveal',
  confrontFlavor: 'culprit cornered / yêu quái encounter / cosmic mystery',
  breathingFlavor: 'evidence investigation / ritual study / triều đình politicking',
});

export const LICH_SU_CORONER_TEMPLATE: TemplateBlueprint = {
  templateId: 'lich-su-coroner-mystery',
  description: 'Coroner mystery archetype — MC cảnh sát hiện đại xuyên cổ đại, gia nhập điều tra cơ quan, mỗi sub-arc = 1 case + power tier ascension. Phá án + triều đình + huyền năng.',
  genre: 'lich-su',
  totalChapters: 1000,
  arcs: LICH_SU_CORONER_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'CAPITAL_CITY', 'DYNASTY_NAME',
    'INSTITUTION_NAME', 'ANTAGONIST_FAMILY', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Hứa Thất An"',
    MC_FAMILY: 'Họ — vd "Hứa"',
    CAPITAL_CITY: 'Kinh đô — vd "Đại Phụng"',
    DYNASTY_NAME: 'Triều đại — vd "Đại Phụng"',
    INSTITUTION_NAME: 'Cơ quan MC join — vd "Đả Canh Tự", "Phá Án Đoàn"',
    ANTAGONIST_FAMILY: 'Họ gian thần — vd "Nguỵ"',
    COMPANION_NAME: 'Companion — vd "Trần Hữu"',
    ENDING_GOAL: 'Đích cuối — vd "Tổ tỳ + triều đường an"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: detective + cool + sarcastic.',
    'Phó-bản: 1 sub-arc = 1 case + 1 power tier ascension.',
  ],
  extraBannedPatterns: [
    'CẤM case không có evidence',
    'CẤM science spoiler trắng trợn',
  ],
  cosmicArcStartChapter: 401,
  mood: ['bi-an', 'kich-tinh', 'sang-khoai'],
  tempo: 'medium',
  spiceLevel: 1,
};
