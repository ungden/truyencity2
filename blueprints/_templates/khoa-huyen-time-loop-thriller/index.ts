/**
 * Khoa-huyen "time-loop thriller" — 天才俱乐部 archetype.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { KHOA_HUYEN_TIME_LOOP_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(KHOA_HUYEN_TIME_LOOP_ARC_SKELETON, {
  pattern: 'simulator-loop',
  toneDirective: '{{MC_NAME}} tone: detective + paranoid + intellectual. Loop: live event → die / reset → analyze → real-execute. High-concept thriller.',
  bansAlways: [
    'CẤM loop rules đơn giản — phải có constraints + costs',
    'CẤM identity reveal trắng trợn arc 1-4',
    'CẤM adversary cosmic-tier sớm trước arc 4',
    'CẤM solving puzzle dễ dàng — phải multi-loop investigation',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}'];
    if (arc >= 1) base.push(`{{ORGANIZATION_NAME}} members`, '{{COMPANION_NAME}}');
    if (arc >= 3) base.push('{{ADVERSARY_NAME}}');
    if (arc >= 4) base.push('cosmic adversaries');
    if (arc >= 5) base.push('multi-realm allies');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{CITY_NAME}} — first loops + {{ORGANIZATION_NAME}} HQ'
      : arc === 2 ? 'Multi-region historical sites'
      : arc === 3 ? 'Continental + adversary territories'
      : arc === 4 ? 'Multi-realm cosmic-tier'
      : 'Origin universe + loop core',
  threadsForArc: (arc) => {
    if (arc === 1) return ['loop awareness', 'first puzzles'];
    if (arc === 2) return ['organization rank', 'medium mysteries'];
    if (arc === 3) return ['{{ADVERSARY_NAME}} identified', 'big mysteries'];
    if (arc === 4) return ['adversary major bại', 'cosmic-tier'];
    if (arc === 5) return ['identity reveal', 'origin lore'];
    if (arc === 6) return ['adversary final form', 'loop core'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'puzzle solved + reset / adversary scheme dismantled / identity reveal moment',
  confrontFlavor: 'adversary confrontation / loop danger / cosmic mystery',
  breathingFlavor: 'analysis between loops / dialog với {{COMPANION_NAME}} / strategy planning',
});

export const KHOA_HUYEN_TIME_LOOP_TEMPLATE: TemplateBlueprint = {
  templateId: 'khoa-huyen-time-loop-thriller',
  description: 'Time-loop thriller archetype — MC trong vòng lặp thời gian, mỗi loop = 1 puzzle / mystery. Simulator-loop pattern + high-concept sci-fi thriller.',
  genre: 'khoa-huyen',
  totalChapters: 1000,
  arcs: KHOA_HUYEN_TIME_LOOP_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'CITY_NAME', 'ORGANIZATION_NAME',
    'ADVERSARY_NAME', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Lý Vinh"',
    MC_FAMILY: 'Họ — vd "Lý"',
    CITY_NAME: 'Thành phố action — vd "Bắc Kinh"',
    ORGANIZATION_NAME: 'Org loop-aware members — vd "Thiên Tài Câu Lạc Bộ"',
    ADVERSARY_NAME: 'Adversary cuối — vd "Tổ Thời Gian Đế"',
    COMPANION_NAME: 'Companion — vd "Tô Linh"',
    ENDING_GOAL: 'Đích cuối — vd "Loop closed + multi-realm peace"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: detective + paranoid + intellectual.',
    'Simulator-loop: live → reset → analyze → execute.',
  ],
  extraBannedPatterns: ['CẤM loop rule đơn giản', 'CẤM identity reveal sớm'],
  cosmicArcStartChapter: 401,
  mood: ['kich-tinh', 'bi-an'],
  tempo: 'medium',
  spiceLevel: 1,
};
