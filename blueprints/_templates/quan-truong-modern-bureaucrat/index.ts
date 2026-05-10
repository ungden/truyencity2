/**
 * Quan-truong "modern-bureaucrat" master template — modern officialdom rise.
 * NON_COMBAT — conflict qua chính trị + chống tham nhũng + cải cách.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { QUAN_TRUONG_BUREAUCRAT_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(QUAN_TRUONG_BUREAUCRAT_ARC_SKELETON, {
  toneDirective: '{{MC_NAME}} tone: thâm trầm + tính toán + thanh liêm. Public face cán bộ trẻ chăm chỉ, không tham nhũng.',
  bansAlways: [
    'CẤM bạo lực vật lý / huyết chiến / gangster — đây là NON_COMBAT genre',
    'CẤM tài nguyên ngẫu nhiên (tiền / quyền / contact) không có ledger',
    'CẤM MC trắng trợn hôm trước thanh liêm hôm sau tham nhũng — character cần consistent',
    'CẤM scandal politic vô lý (vd MC bị giết bằng poison) — phải realistic Việt Nam',
  ],
  bansForArc: (arc) => (arc <= 4 ? ['CẤM {{ANTAGONIST_FAMILY}} + {{CORRUPT_OFFICIAL}} cùng xuất hiện chương breathing'] : []),
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{LOYAL_FRIEND}}'];
    if (arc >= 1) base.push('{{ANTAGONIST_FAMILY}} đại biểu', '{{LIFE_PARTNER}}');
    if (arc >= 3) base.push('{{CORRUPT_OFFICIAL}}');
    if (arc >= 4) base.push('thủ tướng đương nhiệm');
    if (arc >= 5) base.push('mafia kinh tế quốc tế');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? `{{HOMETOWN}} xã + huyện`
      : arc === 2 ? `Huyện UB + đảng ủy`
      : arc === 3 ? `{{PROVINCE_NAME}} tỉnh ủy`
      : arc === 4 ? `{{CAPITAL_CITY}} bộ`
      : arc === 5 ? `{{CAPITAL_CITY}} chính phủ`
      : arc === 6 ? `{{CAPITAL_CITY}} thủ tướng`
      : 'Endgame quốc gia',
  threadsForArc: (arc) => {
    if (arc === 1) return ['phó bí thư xã', `face-slap {{ANTAGONIST_FAMILY}}`];
    if (arc === 2) return ['bí thư huyện', `manh mối {{CORRUPT_OFFICIAL}}`];
    if (arc === 3) return ['bí thư tỉnh', `{{CORRUPT_OFFICIAL}} cấp tỉnh bại`];
    if (arc === 4) return ['bộ trưởng', `{{REFORM_BANNER}} ban hành`];
    if (arc === 5) return ['phó thủ tướng', 'mafia kinh tế quốc tế'];
    if (arc === 6) return ['thủ tướng', 'global crisis'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'bầu thăng cấp / cải cách thành công / tham nhũng bị xử / mass face-slap',
  confrontFlavor: 'tranh luận đảng / đấu đá nội bộ / chất vấn quốc hội',
  breathingFlavor: 'họp đảng / đọc tài liệu / dialog với {{LIFE_PARTNER}}',
});

export const QUAN_TRUONG_BUREAUCRAT_TEMPLATE: TemplateBlueprint = {
  templateId: 'quan-truong-modern-bureaucrat',
  description: 'Modern bureaucrat archetype — MC cán bộ trẻ leo từ xã → thủ tướng qua đấu đá nội bộ + chống tham nhũng + cải cách. 7 arcs. NON_COMBAT.',
  genre: 'quan-truong',
  totalChapters: 1000,
  arcs: QUAN_TRUONG_BUREAUCRAT_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'PROVINCE_NAME', 'CAPITAL_CITY',
    'ANTAGONIST_FAMILY', 'CORRUPT_OFFICIAL', 'LIFE_PARTNER',
    'REFORM_BANNER', 'LOYAL_FRIEND', 'COUNTRY_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC cán bộ — vd "Trần Văn Minh"',
    MC_FAMILY: 'Họ — vd "Trần"',
    HOMETOWN: 'Quê + xã — vd "Hà Tĩnh — xã Vĩnh Lộc"',
    PROVINCE_NAME: 'Tỉnh — vd "Hà Tĩnh"',
    CAPITAL_CITY: 'Thủ đô — vd "Hà Nội"',
    ANTAGONIST_FAMILY: 'Họ phái đối thủ — vd "Lý phái"',
    CORRUPT_OFFICIAL: 'Cán bộ tham nhũng cấp cao — vd "Hoàng X"',
    LIFE_PARTNER: 'Bạn đời — vd "Phạm Lan"',
    REFORM_BANNER: 'Khẩu hiệu cải cách — vd "Thanh Liêm Tân Chính"',
    LOYAL_FRIEND: 'Đồng đội cán bộ — vd "Trương Đại"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam"',
    ENDING_GOAL: 'Đích cuối — vd "Tổng bí thư + cải cách quốc gia thành công"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: thâm trầm + tính toán + thanh liêm.',
    'NON_COMBAT genre: tuyệt đối không bạo lực vật lý.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter (cải cách thành công, face-slap đối thủ).',
    'Realistic Việt Nam politics — không scandal vô lý.',
  ],
  extraBannedPatterns: [
    'CẤM bạo lực vật lý',
    'CẤM tài nguyên ngẫu nhiên không ledger',
    'CẤM scandal politic vô lý',
  ],
  cosmicArcStartChapter: 901,
};
