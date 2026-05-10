/**
 * Huyen-huyen "mô phỏng gacha" — simulator-loop pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { HUYEN_HUYEN_MO_PHONG_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(HUYEN_HUYEN_MO_PHONG_ARC_SKELETON, {
  pattern: 'simulator-loop',
  toneDirective: '{{MC_NAME}} tone: rational + tính toán dữ liệu. Loop: sim → optimal path → real-execute → result.',
  bansAlways: [
    'CẤM sim không có rule fixed — phải có cost (linh thạch / time / luck)',
    'CẤM real-execute deviation từ sim quá xa — phải tracking',
    'CẤM reveal {{SIMULATOR_NAME}} cho người ngoài tâm phúc',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{COMPANION_NAME}}'];
    if (arc <= 2) base.push('đệ tử ngoại môn rivals');
    if (arc >= 3) base.push('đại lục đại biểu');
    if (arc >= 4) base.push('cosmic-tier antagonist');
    if (arc >= 5) base.push('vạn giới spirits');
    if (arc >= 6) base.push('cosmic admin');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{SECT_NAME}} ngoại môn'
      : arc === 2 ? '{{SECT_NAME}} nội môn + bí cảnh'
      : arc === 3 ? 'Đại lục Kim Đan + Nguyên Anh'
      : arc === 4 ? 'Cosmic-tier sites'
      : arc === 5 ? 'Vạn giới ruins'
      : 'Cosmic battlefield',
  threadsForArc: (arc) => {
    if (arc === 1) return ['top 10 ngoại môn', 'sim active'];
    if (arc === 2) return ['Trúc Cơ', 'hidden treasures'];
    if (arc === 3) return ['Nguyên Anh', 'cosmic preview'];
    if (arc === 4) return ['Hoá Thần', 'cosmic ally'];
    if (arc === 5) return ['Hợp Thể', 'admin first weak'];
    if (arc === 6) return ['ultimate weapon', 'admin major bại'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'optimal sim path real-execute / cosmic ally arrive / face-slap perfectly timed',
  confrontFlavor: 'sim warning → real opponent / pivot strategy',
  breathingFlavor: 'sim multi-life / observe data / refine plan',
});

export const HUYEN_HUYEN_MO_PHONG_TEMPLATE: TemplateBlueprint = {
  templateId: 'huyen-huyen-mo-phong-gacha',
  description: 'Mô Phỏng Gacha archetype — MC có simulator chơi multi-life trong sim → real-execute optimal. Strategy + data-driven.',
  genre: 'huyen-huyen',
  totalChapters: 1000,
  arcs: HUYEN_HUYEN_MO_PHONG_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'SIMULATOR_NAME', 'SECT_NAME',
    'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: { CONTINENT_NAME: 'Hỗn Nguyên Đại Lục' },
  varGuidance: {
    MC_NAME: 'Tên MC strategist — vd "Lý Toán Tử"',
    MC_FAMILY: 'Họ — vd "Lý"',
    SIMULATOR_NAME: 'Tên simulator — vd "Vạn Đạo Mô Phỏng Bàn", "Thiên Đạo Suy Diễn Quyết"',
    SECT_NAME: 'Tông môn — vd "Cổ Đạo Tông"',
    COMPANION_NAME: 'Bạn đồng hành — vd "Lăng Sương"',
    ENDING_GOAL: 'Đích cuối — vd "vạn giới Đại Đạo Tổ"',
    CONTINENT_NAME: 'Đại lục',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: rational + tính toán dữ liệu.',
    'Simulator-loop: sim → optimal path → real-execute → result.',
  ],
  extraBannedPatterns: ['CẤM sim không có cost', 'CẤM reveal simulator'],
  cosmicArcStartChapter: 401,
};
