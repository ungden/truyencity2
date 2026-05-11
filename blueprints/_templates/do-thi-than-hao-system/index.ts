/**
 * Do-thi "thần hào hệ thống" — simulator-loop pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { DO_THI_THAN_HAO_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(DO_THI_THAN_HAO_ARC_SKELETON, {
  pattern: 'simulator-loop',
  toneDirective: '{{MC_NAME}} tone: comedic ngạc nhiên đầu, sau quen vung tay. Loop: spend → hệ thống reward × N → real-world impact.',
  bansAlways: [
    'CẤM bạo lực vật lý — NON_COMBAT',
    'CẤM hệ thống reward arbitrary — phải có rule fixed (vd × 100)',
    'CẤM MC tiêu tiền không có lý do (phải spend something specific)',
    'CẤM reveal hệ thống cho người ngoài tâm phúc',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{LIFE_PARTNER}}'];
    if (arc <= 3) base.push('{{ANTAGONIST_FAMILY}} family');
    if (arc >= 3) base.push('mafia kinh tế CEO');
    if (arc >= 4) base.push('cosmic admin scout');
    if (arc >= 5) base.push('cosmic ally');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} — local spending'
      : arc === 2 ? `{{HOMETOWN}} — luxury venues + foundation HQ`
      : arc === 3 ? `Global — Forbes circles`
      : arc === 4 ? 'Multi-realm cosmic-tier'
      : 'Endgame multi-realm',
  threadsForArc: (arc) => {
    if (arc === 1) return ['hệ thống loops', 'gia đình stable'];
    if (arc === 2) return ['tỷ phú VND', 'foundation lập'];
    if (arc === 3) return ['tỷ phú USD', 'mafia confront'];
    if (arc === 4) return ['top 1 global', 'cosmic origin reveal'];
    if (arc === 5) return ['multi-realm wealth', 'cosmic admin'];
    if (arc === 6) return ['cosmic confrontation', 'origin lore'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'big spending → mass return / lifestyle reveal / mass face-slap',
  confrontFlavor: 'mafia kinh tế / cosmic admin scout / family interference',
  breathingFlavor: 'spending exploration / hệ thống reveal / family time',
});

export const DO_THI_THAN_HAO_TEMPLATE: TemplateBlueprint = {
  templateId: 'do-thi-than-hao-system',
  description: 'Thần Hào Hệ Thống archetype — MC nhận hệ thống "spend × N return". Loop: setup → spend → reveal → real-world impact. Cosmic-tier origin reveal late.',
  genre: 'do-thi',
  totalChapters: 1000,
  arcs: DO_THI_THAN_HAO_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'COUNTRY_NAME',
    'ANTAGONIST_FAMILY', 'LIFE_PARTNER', 'ENDING_GOAL',
  ],
  optionalVars: { CITY_NAME: '{{HOMETOWN}}' },
  varGuidance: {
    MC_NAME: 'Tên MC modern — vd "Lý Phong"',
    MC_FAMILY: 'Họ — vd "Lý"',
    HOMETOWN: 'Quê — vd "Sài Gòn"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam"',
    ANTAGONIST_FAMILY: 'Họ family đối thủ — vd "Trần phái"',
    LIFE_PARTNER: 'Bạn đời — vd "Phạm Lan Anh"',
    ENDING_GOAL: 'Đích cuối — vd "cosmic-tier philanthropist"',
    CITY_NAME: 'Thành phố action chính',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: ngạc nhiên đầu rồi quen vung tay.',
    'Simulator-loop: spend → hệ thống reward × N → real impact.',
    'NON_COMBAT — KHÔNG bạo lực vật lý.',
  ],
  extraBannedPatterns: ['CẤM bạo lực', 'CẤM reveal hệ thống cosmic origin sớm'],
  cosmicArcStartChapter: 401,
  mood: ['sang-khoai', 'hai-huoc'],
  tempo: 'fast-paced',
  spiceLevel: 1,
};
