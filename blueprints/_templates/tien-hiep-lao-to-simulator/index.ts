/**
 * Tien-hiep "lão tổ simulator" — time-skip-macro pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { TIEN_HIEP_LAO_TO_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(TIEN_HIEP_LAO_TO_ARC_SKELETON, {
  pattern: 'time-skip-macro',
  toneDirective: '{{MC_NAME}} tone: lười biếng + uy nghiêm. Time-skip macro — đệ tử các thế hệ làm chủ chương, MC chỉ xuất hiện khi cần.',
  bansAlways: [
    'CẤM MC chiến đấu nhiều — đệ tử + companion là main combatants',
    'CẤM resource random — MC bế quan = upgrade pháp bảo through cultivation',
    'CẤM time-skip phá continuity — phải resolve threads trước skip',
    'CẤM gen sau yếu hơn gen trước — progression upward across generations',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}} ({{MC_TITLE}})'];
    if (arc === 1) base.push('{{FIRST_DISCIPLE_NAME}} (gen 1)');
    if (arc >= 2) base.push('{{COMPANION_NAME}}');
    if (arc === 2) base.push('gen 1 trưởng lão', 'gen 2-3 đệ tử');
    if (arc === 3) base.push('gen 4-5 đệ tử', 'đại lục Hoá Thần đại biểu');
    if (arc === 4) base.push('gen 6-7 đệ tử', 'thượng cổ thần thú');
    if (arc === 5) base.push('gen 8-9 đệ tử', 'cosmic threats');
    if (arc >= 6) base.push('gen 10', '{{ANCIENT_ENEMY}}');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{SECT_NAME}} mới lập + động phủ MC'
      : arc === 2 ? '{{SECT_NAME}} trung tông + tàng kinh các'
      : arc === 3 ? '{{SECT_NAME}} đại tông + đại lục'
      : arc === 4 ? '{{SECT_NAME}} cosmic-tier + thượng cổ space'
      : arc === 5 ? 'Đại lục bá chủ + cosmic'
      : arc === 6 ? 'Cosmic battlefield + multi-realm'
      : 'Endgame multi-realm',
  threadsForArc: (arc) => {
    if (arc === 1) return ['lập tông môn', 'gen 1 đột phá'];
    if (arc === 2) return ['trung tông', 'gen 2-3 talent'];
    if (arc === 3) return ['đại tông top 10', `manh mối {{ANCIENT_ENEMY}}`];
    if (arc === 4) return ['cosmic minh ước', 'gen 7 Hoá Thần'];
    if (arc === 5) return ['đại lục bá chủ', 'gen 9 Hợp Thể'];
    if (arc === 6) return [`{{ANCIENT_ENEMY}} confrontation`, 'cosmic peak'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'thế hệ milestone / pháp bảo cosmic upgrade / đệ tử đột phá visible',
  confrontFlavor: 'sự kiện thiên niên kỷ / cosmic threat / external invasion',
  breathingFlavor: 'time-skip / quan sát đệ tử / harvest tu vi',
});

export const TIEN_HIEP_LAO_TO_TEMPLATE: TemplateBlueprint = {
  templateId: 'tien-hiep-lao-to-simulator',
  description: 'Lão Tổ archetype — MC ở cảnh giới đỉnh, lập tông môn, đệ tử nhiều thế hệ làm chủ chương. Time-skip macro thiên niên kỷ. Khác returning-expert: MC = trump card, không phải MC chính trong từng arc.',
  genre: 'tien-hiep',
  totalChapters: 1000,
  arcs: TIEN_HIEP_LAO_TO_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_TITLE', 'SECT_NAME', 'FIRST_DISCIPLE_NAME', 'FAVORITE_GENERATION',
    'ANCIENT_ENEMY', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC lão tổ — vd "Lăng Hoàn Tổ", "Nguyên Nhật Tổ"',
    MC_TITLE: 'Danh hiệu lão tổ — vd "Vạn Cổ Tổ", "Nguyên Thuỷ Tổ Sư"',
    SECT_NAME: 'Tông môn MC lập — vd "Vạn Cổ Tông", "Nguyên Thuỷ Đạo Tông"',
    FIRST_DISCIPLE_NAME: 'Đệ tử gen 1 nổi bật — vd "Lăng Phong"',
    FAVORITE_GENERATION: 'Thế hệ MC ưa thích — vd "gen 7"',
    ANCIENT_ENEMY: 'Cosmic antagonist cuối — vd "Hắc Hoàn Đế Tổ"',
    COMPANION_NAME: 'Bạn đạo từ bế quan — vd "Sương Ngọc Tổ"',
    ENDING_GOAL: 'Đích cuối — vd "Vạn Cổ tổ peak + đại lục cosmic peace"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: lười biếng + uy nghiêm.',
    'Time-skip macro — đệ tử các thế hệ làm chủ chương.',
    'MC = trump card, intervene khi cần thiết.',
  ],
  extraBannedPatterns: [
    'CẤM MC chiến đấu nhiều — đệ tử + companion là main combatants',
    'CẤM time-skip phá continuity',
    'CẤM gen sau yếu hơn gen trước',
  ],
  cosmicArcStartChapter: 701,
  mood: ['sang-khoai', 'hai-huoc'],
  tempo: 'medium',
  spiceLevel: 1,
};
