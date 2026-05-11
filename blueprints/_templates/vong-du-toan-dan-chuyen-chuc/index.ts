/**
 * Vong-du "toàn dân chuyển chức" — cluster-dopamine + class-evolution.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { VONG_DU_TOAN_DAN_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(VONG_DU_TOAN_DAN_ARC_SKELETON, {
  pattern: 'cluster-dopamine',
  toneDirective: '{{MC_NAME}} tone: cool gamer + meta-aware. Public face thanh niên may mắn với hidden class.',
  bansAlways: [
    'CẤM gear/skill drop ngẫu nhiên — phải có dungeon / quest / craft source',
    'CẤM reveal {{HIDDEN_CLASS}} sớm cho non-tâm phúc',
    'CẤM class evolve quá nhanh — phải có level requirement + quest',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{COMPANION_NAME}}'];
    if (arc <= 2) base.push('local rivals');
    if (arc >= 2) base.push('{{NATIONAL_RIVAL}}');
    if (arc >= 3) base.push('world top players');
    if (arc >= 4) base.push('cosmic invasion entities');
    if (arc >= 5) base.push('multi-realm allies', 'ancient civ');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} — local zones'
      : arc === 2 ? '{{COUNTRY_NAME}} — national tournament'
      : arc === 3 ? 'World tournament arena + cosmic dungeon'
      : arc === 4 ? 'Global defense + cosmic dungeons'
      : arc === 5 ? 'Multi-realm portals'
      : 'Cosmic battlefield',
  threadsForArc: (arc) => {
    if (arc === 1) return ['top thành phố', '{{HIDDEN_CLASS}} active'];
    if (arc === 2) return ['top quốc gia', 'class evolve'];
    if (arc === 3) return ['top 10 world', 'cosmic dungeon'];
    if (arc === 4) return ['top 1 world', 'cosmic invasion bại'];
    if (arc === 5) return ['divine class', 'multi-realm'];
    if (arc === 6) return ['admin major bại', 'lore peak'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'class evolution / dungeon clear / world tournament win / cosmic invasion bại',
  confrontFlavor: 'PvP / dungeon boss / cosmic admin scout',
  breathingFlavor: 'farming / gear craft / strat planning / dialog với {{COMPANION_NAME}}',
});

export const VONG_DU_TOAN_DAN_TEMPLATE: TemplateBlueprint = {
  templateId: 'vong-du-toan-dan-chuyen-chuc',
  description: 'Toàn Dân Chuyển Chức archetype — toàn nhân loại nhận class. MC nhận hidden class, leo từ thành phố → world → cosmic-tier qua tournament + dungeon.',
  genre: 'vong-du',
  totalChapters: 1000,
  arcs: VONG_DU_TOAN_DAN_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'COUNTRY_NAME', 'HIDDEN_CLASS',
    'NATIONAL_RIVAL', 'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Lý Phong"',
    MC_FAMILY: 'Họ — vd "Lý"',
    HOMETOWN: 'Quê — vd "Hà Nội"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam"',
    HIDDEN_CLASS: 'Hidden class MC nhận — vd "Vô Hạn Sword Saint", "Dragon Tamer SS-tier"',
    NATIONAL_RIVAL: 'Đối thủ quốc gia — vd "Hắc Vũ"',
    COMPANION_NAME: 'Companion — vd "Tô Linh"',
    ENDING_GOAL: 'Đích cuối — vd "cosmic-tier divine class + multi-realm peace"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: cool gamer + meta-aware.',
    'Cluster-dopamine: ≥1 face-slap / 5 chương + class evolution beats.',
  ],
  extraBannedPatterns: ['CẤM gear random', 'CẤM reveal hidden class sớm'],
  cosmicArcStartChapter: 401,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'fast-paced',
  spiceLevel: 1,
};
