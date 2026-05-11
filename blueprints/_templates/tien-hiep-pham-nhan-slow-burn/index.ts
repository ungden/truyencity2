/**
 * Tien-hiep "phàm nhân slow burn" — linear-grind narrative pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { TIEN_HIEP_PHAM_NHAN_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(TIEN_HIEP_PHAM_NHAN_ARC_SKELETON, {
  pattern: 'linear-grind',
  toneDirective: '{{MC_NAME}} tone: kiên định + cẩn thận + bủn xỉn tích luỹ. Không có golden finger lớn — mọi tiến bộ đều mất nhiều năm.',
  bansAlways: [
    'CẤM tài nguyên không nguồn — phải tu luyện / nhiệm vụ / mua / nhặt được',
    'CẤM đột phá realm nhanh — mỗi tầng cảnh giới mất nhiều năm',
    'CẤM MC OP từ đầu — mọi sức mạnh đều phải kiếm được',
    'CẤM big_wow theo nhịp 5-cluster — đây là linear-grind, BIG WOW chỉ ở climax',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{COMPANION_NAME}}'];
    if (arc <= 2) base.push('{{LOW_RIVAL_NAME}}');
    if (arc >= 2 && arc <= 4) base.push('{{MID_RIVAL_NAME}}');
    if (arc >= 3) base.push('lão hành Trúc Cơ', '{{SECT_NAME}} trưởng lão');
    if (arc >= 4) base.push('{{HIGH_RIVAL_NAME}}');
    if (arc >= 6) base.push('Hoá Thần đại năng', 'thượng cổ pháp bảo');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} → {{SECT_NAME}} ngoại môn'
      : arc === 2 ? '{{SECT_NAME}} nội môn + tàng kinh các'
      : arc === 3 ? '{{SECT_NAME}} chân truyền + động phủ riêng'
      : arc === 4 ? 'Đại lục Kim Đan — độc lập tu luyện'
      : arc === 5 ? 'Đại lục Nguyên Anh + cổ địa'
      : arc === 6 ? 'Thượng cổ ruins + cosmic-tier sites'
      : 'Phi thăng path',
  threadsForArc: (arc) => {
    if (arc === 1) return ['Luyện Khí 5', 'tích luỹ tài nguyên'];
    if (arc === 2) return ['Luyện Khí 12 đỉnh', '{{SIGNATURE_TECHNIQUE}}'];
    if (arc === 3) return ['Trúc Cơ', '{{HIDDEN_TREASURE}}'];
    if (arc === 4) return ['Kim Đan', `{{HIGH_RIVAL_NAME}} đối đầu`];
    if (arc === 5) return ['Nguyên Anh', 'đại lục công nhận'];
    if (arc === 6) return ['Hoá Thần', 'phi thăng path'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'realm breakthrough lớn / pháp bảo cấp cao / đại kiếp vượt qua',
  confrontFlavor: 'small obstacle / minor antagonist tỉ thí',
  breathingFlavor: 'tu luyện linear / luyện đan / dialog tâm cảnh',
});

export const TIEN_HIEP_PHAM_NHAN_TEMPLATE: TemplateBlueprint = {
  templateId: 'tien-hiep-pham-nhan-slow-burn',
  description: 'Phàm Nhân Tu Tiên archetype — MC tài chất bình thường, không golden finger lớn, tu luyện linear-grind 100+ năm từ Luyện Khí → Hoá Thần. Khác returning-expert: realistic + slow burn.',
  genre: 'tien-hiep',
  totalChapters: 1000,
  arcs: TIEN_HIEP_PHAM_NHAN_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'SECT_NAME', 'SECT_REGION',
    'LOW_RIVAL_NAME', 'MID_RIVAL_NAME', 'HIGH_RIVAL_NAME',
    'SIGNATURE_TECHNIQUE', 'HIDDEN_TREASURE', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC bình thường — vd "Hàn Lập" (Phàm Nhân classic)',
    MC_FAMILY: 'Họ — vd "Hàn", "Lý", "Trần"',
    HOMETOWN: 'Quê quê thường — vd "Bảy Tinh Trấn"',
    SECT_NAME: 'Tông môn nhỏ — vd "Hoàng Phong Cốc", "Mặc Đại Phái"',
    SECT_REGION: 'Khu vực tông — vd "Đông Nhạc"',
    LOW_RIVAL_NAME: 'Đối thủ ngoại môn arc 1-2 — vd "Mặc Đại Vũ"',
    MID_RIVAL_NAME: 'Đối thủ nội môn / Trúc Cơ — vd "Vương Hư"',
    HIGH_RIVAL_NAME: 'Đối thủ Kim Đan / Nguyên Anh — vd "Hắc Sơn Lão Tổ"',
    SIGNATURE_TECHNIQUE: 'Công pháp signature — vd "Đại Diễn Quyết"',
    HIDDEN_TREASURE: 'Pháp bảo cốt lõi MC — vd "Kim Sí Bích Linh", "Hồ Lô Tổ Tiên"',
    COMPANION_NAME: 'Bạn đồng hành — vd "Mặc Lan Sương"',
    ENDING_GOAL: 'Đích cuối — vd "phi thăng tiên giới + trường sinh"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: kiên định + cẩn thận + bủn xỉn tích luỹ.',
    'Linear-grind: tu luyện chậm, mỗi realm mất nhiều năm.',
    'Anti-sảng-văn: KHÔNG có dopamine peak mỗi chương — slow burn.',
  ],
  extraBannedPatterns: [
    'CẤM golden finger lớn',
    'CẤM đột phá nhanh',
    'CẤM MC OP từ đầu',
  ],
  cosmicArcStartChapter: 701,
  mood: ['kich-tinh'],
  tempo: 'slow-burn',
  spiceLevel: 1,
};
