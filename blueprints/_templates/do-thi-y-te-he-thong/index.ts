/**
 * Do-thi "y tế hệ thống" — medical system archetype.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { DO_THI_Y_TE_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(DO_THI_Y_TE_ARC_SKELETON, {
  pattern: 'phó-bản',
  toneDirective: '{{MC_NAME}} tone: nhân văn + chính xác + tự tin. Hệ thống = AI assistant + future tech. Mỗi sub-arc = procedural medical case + tier ascension.',
  bansAlways: [
    'CẤM medical procedure không có science basis (có thể fantasy nhưng phải có logic)',
    'CẤM bạo lực vật lý — NON_COMBAT genre',
    'CẤM patient death without consequence — luôn có cost / reflection',
    'CẤM AI ethics debate trắng trợn (phải gián tiếp)',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{COMPANION_NAME}} (nurse/colleague)', 'system AI'];
    if (arc >= 1) base.push('senior doctor mentor', 'rival residents');
    if (arc >= 2) base.push('hospital director');
    if (arc >= 3) base.push('national medical board');
    if (arc >= 4) base.push('reform opposition');
    if (arc >= 5) base.push('international doctors');
    if (arc >= 6) base.push('AI ethics critics');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOSPITAL_NAME}} — emergency + first cases'
      : arc === 2 ? `{{HOSPITAL_NAME}} đại bệnh viện + multi-department`
      : arc === 3 ? 'Hospital admin + research lab'
      : arc === 4 ? 'National medical board + international conference'
      : arc === 5 ? 'Global medical empire'
      : 'Cosmic AI ethics arena',
  threadsForArc: (arc) => {
    if (arc === 1) return ['attending tier 1', '3 cases solved'];
    if (arc === 2) return ['top doctor đại bệnh viện', 'innovations'];
    if (arc === 3) return ['director tier', 'national recognition'];
    if (arc === 4) return ['reform passed', 'Nobel candidate'];
    if (arc === 5) return ['global medical pioneer', 'Nobel won'];
    if (arc === 6) return ['cosmic AI ethics', 'origin reveal'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'impossible case saved / tier ascension / Nobel award',
  confrontFlavor: 'rival doctor / admin politics / reform opposition',
  breathingFlavor: 'patient care / research / dialog với {{COMPANION_NAME}}',
});

export const DO_THI_Y_TE_TEMPLATE: TemplateBlueprint = {
  templateId: 'do-thi-y-te-he-thong',
  description: 'Y tế hệ thống archetype — MC bác sĩ + AI/future-tech system, procedural medical drama + sảng văn. Mỗi sub-arc = 1 case + tier ascension.',
  genre: 'do-thi',
  totalChapters: 1000,
  arcs: DO_THI_Y_TE_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOSPITAL_NAME', 'COUNTRY_NAME',
    'COMPANION_NAME', 'LIFE_PARTNER', 'ENDING_GOAL',
  ],
  optionalVars: { SYSTEM_NAME: 'Vạn Năng Y Đạo Hệ Thống' },
  varGuidance: {
    MC_NAME: 'Tên MC bác sĩ — vd "Lý Tinh Vũ"',
    MC_FAMILY: 'Họ — vd "Lý"',
    HOSPITAL_NAME: 'Bệnh viện — vd "Bệnh viện 108 Hà Nội"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam"',
    COMPANION_NAME: 'Đồng nghiệp / partner — vd "Tô Linh"',
    LIFE_PARTNER: 'Bạn đời (nếu có) — vd "Phạm Lan"',
    ENDING_GOAL: 'Đích cuối — vd "Nobel + cosmic medical pioneer + retire to teach"',
    SYSTEM_NAME: 'Hệ thống name',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: nhân văn + chính xác + tự tin.',
    'Phó-bản: 1 sub-arc = 1 case + tier ascension.',
    'NON_COMBAT — KHÔNG bạo lực vật lý.',
  ],
  extraBannedPatterns: [
    'CẤM medical procedure không có logic',
    'CẤM patient death without consequence',
  ],
  cosmicArcStartChapter: 601,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'medium',
  spiceLevel: 1,
};
