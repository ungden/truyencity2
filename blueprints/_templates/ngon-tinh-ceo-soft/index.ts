/**
 * Ngon-tinh "ceo-soft" master template — modern romance CEO bá đạo soft.
 * NON_COMBAT — conflict qua misunderstanding / family / career rivalry.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { NGON_TINH_CEO_SOFT_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(NGON_TINH_CEO_SOFT_ARC_SKELETON, {
  toneDirective: '{{FEMALE_MC}} tone: kiên cường + dịu dàng. {{MALE_MC}} tone: bá đạo bên ngoài + soft với {{FEMALE_MC}}.',
  bansAlways: [
    'CẤM bạo lực vật lý / huyết chiến / gangster — đây là NON_COMBAT genre',
    'CẤM forced romance / dub-con — relationship phải based on mutual consent',
    'CẤM rival lover hành xử cực đoan (giết / bắt cóc) — phải nhân văn realistic',
    'CẤM resources không có ledger (tiền / contact / job offer ngẫu nhiên)',
  ],
  bansForArc: (arc) => (arc <= 4 ? ['CẤM {{INTERFERING_FAMILY}} + {{RIVAL_LOVER}} cùng xuất hiện chương breathing'] : []),
  castForArc: (arc) => {
    const base = ['{{FEMALE_MC}}', '{{MALE_MC}}'];
    if (arc >= 1) base.push('{{RIVAL_LOVER}}', '{{INTERFERING_FAMILY}} đại biểu');
    if (arc >= 5) base.push('children');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{COMPANY_NAME}} HQ + {{CITY_NAME}} dating spots'
      : arc === 2 ? `{{COMPANY_NAME}} HQ + Live-in apartment`
      : arc === 3 ? 'Wedding venue + separation parallel offices'
      : arc === 4 ? 'Joint corp HQ + reunion spots'
      : arc === 5 ? 'Wedding + maternity + family home'
      : arc === 6 ? 'Global empire offices + Davos'
      : 'Endgame closure',
  threadsForArc: (arc) => {
    if (arc === 1) return ['first kiss', `{{INTERFERING_FAMILY}} đe dọa relationship`];
    if (arc === 2) return ['confess yêu', `{{RIVAL_LOVER}} face-slap`];
    if (arc === 3) return ['{{PAST_TRAUMA}} reveal', 'break up'];
    if (arc === 4) return ['reunion', 'business empire'];
    if (arc === 5) return ['wedding', 'first child'];
    if (arc === 6) return ['empire global', 'thế hệ 2'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'public confess / wedding / business top / family reconcile',
  confrontFlavor: 'misunderstanding / family interference / rival lover',
  breathingFlavor: 'sweet moments / dating / family dinner / quiet talks',
});

export const NGON_TINH_CEO_SOFT_TEMPLATE: TemplateBlueprint = {
  templateId: 'ngon-tinh-ceo-soft',
  description: 'Modern romance CEO archetype — bá đạo CEO + dịu dàng nữ chính, misunderstanding → confess → break up → reunion → wedding → empire. 7 arcs. NON_COMBAT.',
  genre: 'ngon-tinh',
  totalChapters: 1000,
  arcs: NGON_TINH_CEO_SOFT_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'FEMALE_MC', 'FEMALE_MC_FAMILY', 'MALE_MC', 'MALE_MC_FAMILY',
    'COMPANY_NAME', 'HOMETOWN', 'CITY_NAME', 'RIVAL_LOVER',
    'INTERFERING_FAMILY', 'PAST_TRAUMA', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    FEMALE_MC: 'Tên nữ chính — vd "Lin Wan", "Tô Tử Linh"',
    FEMALE_MC_FAMILY: 'Họ nữ chính — vd "Lin", "Tô"',
    MALE_MC: 'Tên nam chính (CEO) — vd "Trần Mộ Dao"',
    MALE_MC_FAMILY: 'Họ nam chính — vd "Trần"',
    COMPANY_NAME: 'Công ty CEO — vd "Mộ Dao Tập Đoàn"',
    HOMETOWN: 'Quê — vd "Hà Nội"',
    CITY_NAME: 'Thành phố action — vd "Sài Gòn"',
    RIVAL_LOVER: 'Đối thủ tình — vd "Lý Vy" (cũ female / male)',
    INTERFERING_FAMILY: 'Gia đình cản — vd "Lý gia"',
    PAST_TRAUMA: 'Trauma từ kiếp trước — vd "MC bị fiancé phản bội năm 18"',
    ENDING_GOAL: 'Đích cuối — vd "vợ chồng bá đạo + family empire stable"',
  },
  toneDirectives: [
    '{{FEMALE_MC}} tone: kiên cường + dịu dàng.',
    '{{MALE_MC}} tone: bá đạo bên ngoài + soft với {{FEMALE_MC}} bên trong.',
    'NON_COMBAT genre: tuyệt đối không bạo lực vật lý.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter (sweet moments + face-slap rival/family).',
  ],
  extraBannedPatterns: [
    'CẤM bạo lực vật lý',
    'CẤM forced romance / dub-con',
    'CẤM rival hành xử cực đoan (giết / bắt cóc)',
  ],
  cosmicArcStartChapter: 901,
};
