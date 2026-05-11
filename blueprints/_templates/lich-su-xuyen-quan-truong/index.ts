/**
 * Lich-su (historical) "xuyen-quan-truong" master template.
 *
 * Archetype: MC hiện đại xuyên về cổ đại, leo từ thư sinh → hoàng đế qua
 * 7 arcs (khoa cử → quan trường → tể tướng → vương → đế → bá chủ).
 * Conflict qua quan trường (gian thần / đảng phái / hậu cung) + chiến
 * tranh biên cương. NON_COMBAT-mostly (battle ở cấp tướng, không MC tay đôi).
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { LICH_SU_QUAN_TRUONG_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(LICH_SU_QUAN_TRUONG_ARC_SKELETON, {
  toneDirective: '{{MC_NAME}} tone: thâm trầm + tính toán dài hạn. Public face thư sinh khiêm tốn.',
  bansAlways: [
    'CẤM tài nguyên không nguồn (vàng / bằng chứng / tin tức ngẫu nhiên)',
    'CẤM reveal MC xuyên không hiện đại — chỉ {{CONSORT_NAME}} biết sau arc 4',
    'CẤM kiến thức hiện đại trắng trợn (nói thẳng tên kỹ thuật) — phải gián tiếp gọi cổ ngữ',
  ],
  bansForArc: (arc) => (arc <= 3 ? ['CẤM {{ANTAGONIST_FAMILY}} thị xuất hiện liên tục — ngắt quãng ≥3 chương'] : []),
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}'];
    if (arc === 1) base.push('{{ANTAGONIST_FAMILY}} thị đệ tử', 'tri huyện');
    if (arc >= 2) base.push('{{CONSORT_NAME}}');
    if (arc >= 3) base.push('hoàng đế', 'gian thần triều');
    if (arc >= 4) base.push('{{LOYAL_GENERAL}}', '{{FOREIGN_ENEMY}} sứ');
    if (arc >= 6) base.push('thái tử / công chúa');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1
      ? '{{HOMETOWN}} — gia đình + huyện thi'
      : arc === 2
        ? '{{CAPITAL_CITY}} — triều thi + tri huyện'
        : arc === 3
          ? '{{CAPITAL_CITY}} triều đình + 6 bộ'
          : arc === 4
            ? 'Biên cương + 5 quân khu'
            : arc === 5
              ? '{{CAPITAL_CITY}} — nhiếp chính + cải cách'
              : arc === 6
                ? '{{DYNASTY_NAME}} — triều mới + đế quốc'
                : 'Endgame thiên hạ',
  threadsForArc: (arc) => {
    if (arc === 1) return ['đậu khoa cử', `face-slap {{ANTAGONIST_FAMILY}} thị`];
    if (arc === 2) return ['đỗ tiến sĩ', 'cải cách thuế / nông nghiệp'];
    if (arc === 3) return ['thượng thư', '{{FOREIGN_ENEMY}} chuẩn bị xâm'];
    if (arc === 4) return [`đẩy lùi {{FOREIGN_ENEMY}}`, 'mở rộng biên cương'];
    if (arc === 5) return ['{{REFORM_BANNER}}', 'đảng phái cũ tan'];
    if (arc === 6) return ['hoàng đế {{DYNASTY_NAME}}', 'liên minh quốc tế'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'cải cách thắng lợi / quân thắng / hoàng đế phong / thiên hạ công nhận',
  confrontFlavor: 'tranh luận triều / đối phó gian thần / thương lượng ngoại giao',
  breathingFlavor: 'đọc sử / luyện thư pháp / dialog hậu cung',
});

export const LICH_SU_QUAN_TRUONG_TEMPLATE: TemplateBlueprint = {
  templateId: 'lich-su-xuyen-quan-truong',
  description:
    'Historical xuyên-không quan trường archetype — MC hiện đại xuyên về cổ đại, leo thư sinh → hoàng đế qua khoa cử + quan trường + chiến tranh + cải cách. 7 arcs.',
  genre: 'lich-su',
  totalChapters: 1000,
  arcs: LICH_SU_QUAN_TRUONG_ARC_SKELETON.map((arc, i) => ({
    arc,
    briefs: briefsByArc[i],
  })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'MC_PAST_NAME', 'HOMETOWN',
    'DYNASTY_NAME', 'CAPITAL_CITY', 'ANTAGONIST_FAMILY', 'FOREIGN_ENEMY',
    'CONSORT_NAME', 'REFORM_BANNER', 'LOYAL_GENERAL', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên cổ đại Hán Việt — vd "Triệu Tử Long", "Lý Trường An"',
    MC_FAMILY: 'Họ cổ đại — vd "Triệu", "Lý", "Trần"',
    MC_PAST_NAME: 'Tên hiện đại trước xuyên — vd "Lý Văn Minh"',
    HOMETOWN: 'Quê quán cổ đại — vd "Lâm An phủ", "Thăng Long phía bắc"',
    DYNASTY_NAME: 'Triều đại — vd "Đại Tống", "Đại Đường", "Đại Việt"',
    CAPITAL_CITY: 'Kinh đô — vd "Biện Kinh", "Thăng Long", "Trường An"',
    ANTAGONIST_FAMILY: 'Họ gian thần — vd "Tần", "Hoàng", "Khâm"',
    FOREIGN_ENEMY: 'Ngoại địch — vd "Kim quốc", "Mông Cổ", "Đại Liêu"',
    CONSORT_NAME: 'Hậu / phi / vợ chính — vd "Vân Linh công chúa", "Lưu thị"',
    REFORM_BANNER: 'Khẩu hiệu cải cách — vd "Tân Pháp Phú Quốc", "Thái Bình Tân Chính"',
    LOYAL_GENERAL: 'Tướng trung thành — vd "Trần Khánh Dư", "Lý Tự Thành"',
    ENDING_GOAL: 'Đích cuối — vd "thống nhất thiên hạ", "Thái Bình thịnh thế Đại Việt"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: thâm trầm + tính toán dài hạn. Public face thư sinh khiêm tốn.',
    'Mode lão lục: kiến thức hiện đại dùng kín đáo qua "tổ tiên truyền lại" hoặc "sách cổ ghi".',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter, BIG WOW mỗi 5 chương.',
    'Đối thủ ngắt quãng: gian thần triều xuất hiện không liên tục.',
  ],
  extraBannedPatterns: [
    'CẤM kiến thức hiện đại trắng trợn — phải dùng cổ ngữ / điển tích / "tổ tiên truyền"',
    'CẤM reveal MC xuyên không cho người không phải tâm phúc',
    'CẤM MC tay đôi đánh đấm — battle ở cấp tướng / quân, MC chỉ huy',
  ],
  cosmicArcStartChapter: 701,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'medium',
  spiceLevel: 1,
};
