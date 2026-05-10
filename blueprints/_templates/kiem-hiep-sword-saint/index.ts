/**
 * Kiem-hiep "sword-saint" master template — wuxia kiếm thánh archetype.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { KIEM_HIEP_SWORD_SAINT_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(KIEM_HIEP_SWORD_SAINT_ARC_SKELETON, {
  toneDirective: '{{MC_NAME}} tone: kiếm khách trượng nghĩa + lạnh đạm. Wuxia cổ điển — trọng nghĩa khí + bằng hữu.',
  bansAlways: [
    'CẤM võ học / nội công ngẫu nhiên không nguồn — phải có sách bí truyền / tổ tiên / mật cảnh',
    'CẤM lộ tầng {{SIGNATURE_SWORD}} cao hơn 1 tầng so với public visible',
    'CẤM kẻ thù cosmic-tier xuất hiện trước arc 6 — wuxia phải giữ giang hồ scale arc 1-5',
  ],
  bansForArc: (arc) => (arc <= 4 ? ['CẤM {{ANTAGONIST_SECT}} xuất hiện liên tục — ngắt quãng ≥3 chương breathing'] : []),
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}'];
    if (arc >= 1) base.push('{{LOYAL_FRIEND}}', '{{ANTAGONIST_SECT}} đệ tử');
    if (arc >= 2) base.push('{{LIFE_PARTNER}}');
    if (arc >= 3) base.push('tứ đại danh môn lão');
    if (arc >= 4) base.push('{{ANTAGONIST_SECT}} chưởng môn');
    if (arc >= 6) base.push('kiếm thánh tổ di niệm');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} + {{SECT_NAME}} ngoại môn'
      : arc === 2 ? `{{JIANGHU_REGION}} giang hồ`
      : arc === 3 ? 'Tứ đại danh môn + đại hội'
      : arc === 4 ? `{{ANTAGONIST_SECT}} HQ + báo thù`
      : arc === 5 ? 'Võ lâm minh chủ + đại lục'
      : arc === 6 ? 'Cosmic ruins ngàn năm'
      : 'Endgame multi-realm',
  threadsForArc: (arc) => {
    if (arc === 1) return ['vào nội đệ tử', `manh mối {{ANTAGONIST_SECT}}`];
    if (arc === 2) return ['nhị lưu', '{{LIFE_PARTNER}} pháp lữ'];
    if (arc === 3) return ['nhất lưu + thiếu niên minh chủ', '{{ANTAGONIST_SECT}} cấp tổ'];
    if (arc === 4) return [`diệt {{ANTAGONIST_SECT}}`, 'báo thù gia đình'];
    if (arc === 5) return ['võ lâm minh chủ', `manh mối {{ANCIENT_DEMON}}`];
    if (arc === 6) return ['kiếm thánh + cosmic ruins', 'pháp bảo kiếm thánh tổ'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'tỷ võ thắng / mass face-slap / kiếm tầng đột phá visible',
  confrontFlavor: 'tỷ võ 1v1 / sect war / nghĩa khí đối đầu',
  breathingFlavor: 'luyện kiếm / dialog với {{LOYAL_FRIEND}} / mật cảnh dược',
});

export const KIEM_HIEP_SWORD_SAINT_TEMPLATE: TemplateBlueprint = {
  templateId: 'kiem-hiep-sword-saint',
  description: 'Wuxia sword-saint archetype — MC kiếm khách thiếu niên, gia đình diệt môn, leo từ tam lưu → kiếm thánh + võ lâm minh chủ. 7 arcs.',
  genre: 'kiem-hiep',
  totalChapters: 1000,
  arcs: KIEM_HIEP_SWORD_SAINT_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'SECT_NAME', 'SIGNATURE_SWORD',
    'ANTAGONIST_SECT', 'ANCIENT_DEMON', 'LIFE_PARTNER',
    'LOYAL_FRIEND', 'JIANGHU_REGION', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC kiếm khách Hán Việt — vd "Lý Tiêu Dao", "Trần Vô Cực"',
    MC_FAMILY: 'Họ — vd "Lý", "Trần", "Tiêu"',
    HOMETOWN: 'Quê quán — vd "Lâm An phủ"',
    SECT_NAME: 'Môn phái MC — vd "Thanh Vân Phái", "Thiên Kiếm Sơn"',
    SIGNATURE_SWORD: 'Kiếm pháp / nội công signature — vd "Cửu Kiếm Quyết", "Thái Cực Kiếm Pháp"',
    ANTAGONIST_SECT: 'Môn phái ác — vd "Hắc Long Bang", "Ma Đạo giáo"',
    ANCIENT_DEMON: 'Cosmic ma đạo cuối — vd "Vạn Cổ Ma Tổ"',
    LIFE_PARTNER: 'Pháp lữ nữ — vd "Tô Linh", "Mộ Dung Tuyết"',
    LOYAL_FRIEND: 'Bạn nghĩa kết — vd "Trương Khải"',
    JIANGHU_REGION: 'Khu vực giang hồ — vd "Trung Nguyên", "Giang Nam"',
    ENDING_GOAL: 'Đích cuối — vd "Kiếm thánh đỉnh + võ lâm minh chủ"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: kiếm khách trượng nghĩa + lạnh đạm.',
    'Wuxia cổ điển — trọng nghĩa khí + bằng hữu, không sảng văn báo thù tàn nhẫn.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter (kiếm tầng đột phá / face-slap).',
  ],
  extraBannedPatterns: [
    'CẤM võ học không có nguồn (sách bí truyền / tổ tiên)',
    'CẤM cosmic threat trước arc 6',
  ],
  cosmicArcStartChapter: 701,
};
