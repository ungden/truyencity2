/**
 * Do-thi "thập niên 80/90" — decade-jumps pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { DO_THI_THAP_NIEN_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(DO_THI_THAP_NIEN_ARC_SKELETON, {
  pattern: 'decade-jumps',
  toneDirective: '{{MC_NAME}} tone: thâm trầm + tính toán dài hạn. Decade-jumps — mỗi arc = 1 decade industry phase.',
  bansAlways: [
    'CẤM bạo lực vật lý / huyết chiến — NON_COMBAT genre',
    'CẤM tài nguyên ngẫu nhiên — phải có business reasoning',
    'CẤM reveal trọng sinh trắng trợn',
    'CẤM industry / brand chưa ra mắt vẫn nhắc tên thẳng',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', 'gia đình MC'];
    if (arc >= 1) base.push('{{LIFE_PARTNER}}');
    if (arc >= 2) base.push('{{ANTAGONIST_FAMILY}} đại biểu');
    if (arc >= 3) base.push('{{COMPETITION_BRAND}} CEO');
    if (arc >= 4) base.push('VC quốc tế', 'MNC CEO');
    if (arc >= 5) base.push('Davos invitees', 'mafia kinh tế');
    if (arc >= 6) base.push('thế hệ 2 children');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} — gia đình + venture đầu'
      : arc === 2 ? '{{HOMETOWN}} — văn phòng + chi nhánh'
      : arc === 3 ? '{{COUNTRY_NAME}} — multi-city operation'
      : arc === 4 ? 'Mỹ + Singapore + Trung — quốc tế'
      : arc === 5 ? 'Lab + 30 sectors global'
      : arc === 6 ? 'Davos + chính phủ {{COUNTRY_NAME}}'
      : 'Endgame',
  threadsForArc: (arc) => {
    if (arc === 1) return ['gia đình thoát nghèo', 'first venture'];
    if (arc === 2) return ['top {{HOMETOWN}}', 'cấp tỉnh'];
    if (arc === 3) return ['top quốc gia', `{{COMPETITION_BRAND}} đối đầu`];
    if (arc === 4) return ['IPO Mỹ', 'Forbes 100'];
    if (arc === 5) return ['cách mạng công nghệ', 'top 3 global'];
    if (arc === 6) return ['top 1 global', 'ảnh hưởng chính sách'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'IPO / acquisition / market dominance / Forbes ranking',
  confrontFlavor: 'business war / lawsuit / negotiation / chaebol confront',
  breathingFlavor: 'build product / hire team / strategic planning / family time',
});

export const DO_THI_THAP_NIEN_TEMPLATE: TemplateBlueprint = {
  templateId: 'do-thi-thap-nien-80',
  description: 'Trọng Sinh Niên Đại 80/90/2000 archetype — MC về thập niên cũ, decade-jumps mỗi arc = 1 industry phase. Khác reborn-genius: focus về niên đại transitions + family rural-to-urban.',
  genre: 'do-thi',
  totalChapters: 1000,
  arcs: DO_THI_THAP_NIEN_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'REBIRTH_YEAR',
    'DECADE_2', 'DECADE_3', 'DECADE_4', 'DECADE_5', 'DECADE_6',
    'ANTAGONIST_FAMILY', 'COMPETITION_BRAND', 'LIFE_PARTNER',
    'COUNTRY_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC hiện đại — vd "Trần Đông Hải"',
    MC_FAMILY: 'Họ — vd "Trần"',
    HOMETOWN: 'Quê — vd "Hà Tĩnh", "Hải Phòng"',
    REBIRTH_YEAR: 'Năm trọng sinh — vd "1992", "2000", "2005"',
    DECADE_2: 'Decade 2 (5-10 năm sau rebirth) — vd "cuối 1990s"',
    DECADE_3: 'Decade 3 — vd "2005"',
    DECADE_4: 'Decade 4 — vd "2010"',
    DECADE_5: 'Decade 5 — vd "2015"',
    DECADE_6: 'Decade 6 — vd "2020"',
    ANTAGONIST_FAMILY: 'Họ chaebol đối thủ — vd "Lý phái"',
    COMPETITION_BRAND: 'Tập đoàn đối thủ — vd "Đại Phát"',
    LIFE_PARTNER: 'Bạn đời — vd "Phạm Lan"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam"',
    ENDING_GOAL: 'Đích cuối — vd "tài phiệt #1 thế giới"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: thâm trầm + tính toán dài hạn.',
    'Decade-jumps — mỗi arc = 1 decade industry phase.',
    'NON_COMBAT — KHÔNG bạo lực vật lý.',
  ],
  extraBannedPatterns: ['CẤM bạo lực', 'CẤM brand reveal sớm', 'CẤM family ngẫu nhiên giàu'],
  cosmicArcStartChapter: 901,
  mood: ['sang-khoai'],
  tempo: 'medium',
  spiceLevel: 1,
};
