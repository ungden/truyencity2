/**
 * Dong-nhan "author-rewrite" master template — fanfic-into-canon archetype.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { DONG_NHAN_REWRITE_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(DONG_NHAN_REWRITE_ARC_SKELETON, {
  toneDirective: '{{MC_NAME}} tone: meta-aware độc giả + tinh tế tránh canon spoiler. Public face người mới-canon may mắn.',
  bansAlways: [
    'CẤM MC reveal canon spoiler trắng trợn cho canon characters',
    'CẤM hub space tài nguyên không-canon xuất hiện không có lý do',
    'CẤM canon characters break OOC (out of character) — phải giữ tone canon original',
  ],
  bansForArc: (arc) => (arc <= 3 ? ['CẤM canon BBEG xuất hiện liên tục — ngắt quãng ≥3 chương'] : []),
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{ORIGINAL_PROTAGONIST}}'];
    if (arc >= 1) base.push('{{FAVORITE_CHARACTER}}');
    if (arc >= 2) base.push('{{COMPANION_NAME}}');
    if (arc >= 3) base.push('{{ANTAGONIST_CANON}}');
    if (arc >= 5) base.push('{{SECONDARY_NOVEL}} characters');
    if (arc >= 6) base.push('Author OC');
    return base;
  },
  locationForArc: (arc) =>
    arc <= 3 ? '{{SOURCE_NOVEL}} canon world'
      : arc === 4 ? 'Beyond-canon world (MC viết tiếp)'
      : arc === 5 ? '{{SECONDARY_NOVEL}} crossover'
      : arc === 6 ? 'Author\'s room meta-layer'
      : 'Endgame multi-world',
  threadsForArc: (arc) => {
    if (arc === 1) return ['cứu {{FAVORITE_CHARACTER}}', 'set up identity canon'];
    if (arc === 2) return ['diverge canon arc 1', '{{ANTAGONIST_CANON}} kế hoạch'];
    if (arc === 3) return [`{{ANTAGONIST_CANON}} bại`, '{{ORIGINAL_PROTAGONIST}} arc complete'];
    if (arc === 4) return ['MC trở thành lead', 'cosmic threat'];
    if (arc === 5) return ['{{SECONDARY_NOVEL}} crossover', 'multi-world unite'];
    if (arc === 6) return ['author room reveal', 'MC trở thành author'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'meta knowledge play / canon character peak / hub space unlock visible',
  confrontFlavor: 'canon villain / meta-aware antagonist',
  breathingFlavor: 'character bond build / canon lore explore / hub space dive',
});

export const DONG_NHAN_REWRITE_TEMPLATE: TemplateBlueprint = {
  templateId: 'dong-nhan-author-rewrite',
  description: 'Fanfic author-rewrite archetype — MC độc giả xuyên vào {{SOURCE_NOVEL}}, biết hết plot, save {{FAVORITE_CHARACTER}}, viết arc mới sau canon endpoint, cuối cùng vào author\'s room. 7 arcs.',
  genre: 'dong-nhan',
  totalChapters: 1000,
  arcs: DONG_NHAN_REWRITE_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_PAST_NAME', 'SOURCE_NOVEL', 'ORIGINAL_PROTAGONIST',
    'FAVORITE_CHARACTER', 'ANTAGONIST_CANON', 'POWER_SYSTEM',
    'HUB_SPACE_NAME', 'SECONDARY_NOVEL', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên trong canon, kiểu Hán Việt — vd "Diệp Phong"',
    MC_PAST_NAME: 'Tên hiện đại — vd "Lý Khang"',
    SOURCE_NOVEL: 'Tên LN gốc — vd "Vạn Cổ Thần Vương"',
    ORIGINAL_PROTAGONIST: 'MC nguyên tác — vd "Diệp Phàm"',
    FAVORITE_CHARACTER: 'Nhân vật cứu — vd "Tô Lăng"',
    ANTAGONIST_CANON: 'BBEG canon — vd "Hắc Đế"',
    POWER_SYSTEM: 'Hệ thống power — vd "Võ đạo cửu tầng"',
    HUB_SPACE_NAME: 'Hub space — vd "Vô Hạn Thư Viện"',
    SECONDARY_NOVEL: 'LN crossover — vd "Linh Vực Đại Đế"',
    COMPANION_NAME: 'Bạn đồng hành (fanon OC) — vd "Tô Linh"',
    ENDING_GOAL: 'Đích cuối — vd "multi-world author đỉnh"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: meta-aware độc giả + cẩn trọng giữ canon characters in-character.',
    'Mode lão lục: meta knowledge dùng kín đáo, không reveal canon spoiler.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter (face-slap qua biết weakness canon).',
  ],
  extraBannedPatterns: [
    'CẤM canon characters break OOC',
    'CẤM hub space tài nguyên không-canon xuất hiện không lý do',
    'CẤM MC reveal canon spoiler trắng trợn',
  ],
  cosmicArcStartChapter: 701,
  mood: ['sang-khoai', 'hai-huoc'],
  tempo: 'medium',
  spiceLevel: 1,
};
