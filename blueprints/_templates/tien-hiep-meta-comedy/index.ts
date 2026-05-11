/**
 * Tien-hiep "meta comedy" — hài-meta + misunderstanding chain.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { TIEN_HIEP_META_COMEDY_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(TIEN_HIEP_META_COMEDY_ARC_SKELETON, {
  pattern: 'cluster-dopamine',
  toneDirective: '{{MC_NAME}} tone: clueless + comedic + 4th wall-aware. Hài đến từ misunderstanding chain — MC nghĩ một đằng, thế giới hiểu một nẻo. Phản-sáo-lộ.',
  bansAlways: [
    'CẤM MC realize sớm — phải clueless suốt arc 1-5',
    'CẤM hiểu lầm break (resolve) — phải escalate qua arcs',
    'CẤM tone serious quá — luôn có comedy beats',
    'CẤM cosmic-tier reveal trắng trợn arc 1-3',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{FIRST_FOLLOWER_NAME}} (clueless follower)'];
    if (arc >= 1) base.push(`{{FAKE_ORG_NAME}} members`);
    if (arc >= 2) base.push('rival sect leaders');
    if (arc >= 3) base.push('cosmic-tier visitors');
    if (arc >= 4) base.push('cosmic allies');
    if (arc >= 5) base.push('cosmic admin');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} — MC live + bịa org'
      : arc === 2 ? `{{FAKE_ORG_NAME}} HQ + tỉnh sect`
      : arc === 3 ? 'Đại lục tournament + sect engagement'
      : arc === 4 ? 'Cosmic-tier visitors + faction war'
      : arc === 5 ? 'Cosmic admin engagement'
      : arc === 6 ? 'Final realization domain'
      : 'Final battle realm',
  threadsForArc: (arc) => {
    if (arc === 1) return [`{{FAKE_ORG_NAME}} formed`, 'first follower'];
    if (arc === 2) return ['quốc gia recognition', 'Trúc Cơ peak'];
    if (arc === 3) return ['đại lục top', 'Kim Đan'];
    if (arc === 4) return ['Nguyên Anh', 'cosmic visitors'];
    if (arc === 5) return ['Hoá Thần', 'admin retreat'];
    if (arc === 6) return ['admin weakened', 'MC realization'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'mass misunderstanding face-slap / cosmic tier reveal / realization moment',
  confrontFlavor: 'rival challenge / hiểu lầm escalation / cosmic visitor',
  breathingFlavor: 'MC daily life / dialog với follower / random tu luyện',
});

export const TIEN_HIEP_META_COMEDY_TEMPLATE: TemplateBlueprint = {
  templateId: 'tien-hiep-meta-comedy',
  description: 'Hài-meta tu tiên — MC bịa ra secret org → hoá ra thật. Misunderstanding chain + MC clueless suốt 5 arc. Comedic tone, phản-sáo-lộ.',
  genre: 'tien-hiep',
  totalChapters: 1000,
  arcs: TIEN_HIEP_META_COMEDY_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'FAKE_ORG_NAME',
    'FIRST_FOLLOWER_NAME', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC clueless — vd "Lý Phong"',
    MC_FAMILY: 'Họ — vd "Lý"',
    HOMETOWN: 'Quê — vd "Lâm An phủ"',
    FAKE_ORG_NAME: 'Org MC bịa — vd "Vạn Cổ Thiên Đạo Tông", "Hỗn Nguyên Đạo Trú Tổ Sư Môn"',
    FIRST_FOLLOWER_NAME: 'First follower clueless — vd "Tiểu Lý"',
    COMPANION_NAME: 'Companion — vd "Tô Linh"',
    ENDING_GOAL: 'Đích cuối — vd "cosmic comedic peak + multi-realm tu tiên peace"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: clueless + comedic + 4th wall-aware.',
    'Misunderstanding chain — MC nghĩ một đằng, thế giới hiểu nẻo.',
    'Phản-sáo-lộ tu tiên.',
  ],
  extraBannedPatterns: [
    'CẤM MC realize sớm',
    'CẤM hiểu lầm resolve',
    'CẤM tone serious',
  ],
  cosmicArcStartChapter: 301,
  mood: ['hai-huoc', 'sang-khoai'],
  tempo: 'fast-paced',
  spiceLevel: 0,
};
