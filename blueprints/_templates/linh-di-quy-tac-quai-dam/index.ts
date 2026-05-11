/**
 * Linh-di "quy tắc quái đàm" — phó-bản pattern.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { LINH_DI_QUY_TAC_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(LINH_DI_QUY_TAC_ARC_SKELETON, {
  pattern: 'phó-bản',
  toneDirective: '{{MC_NAME}} tone: lý tính + tính toán + paranoid. Mỗi phó bản có rules giả + thật, MC phải nhận diện đúng.',
  bansAlways: [
    'CẤM rules được reveal đầy đủ ngay đầu — phải reveal qua trial and error',
    'CẤM MC violate rules thật mà không bị kill — rules quan trọng',
    'CẤM phó bản có rules ngẫu nhiên — phải có internal consistency',
    'CẤM MC OP từ đầu — survival via observation + deduction',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{COMPANION_NAME}}'];
    if (arc >= 2) base.push('{{ANTAGONIST_NPC}}');
    if (arc >= 3) base.push('peer competitors (other survivors)');
    if (arc >= 4) base.push('ancient horror entities');
    if (arc >= 5) base.push('cosmic horrors');
    if (arc >= 6) base.push('system architect / master');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? 'Apartment + office instances'
      : arc === 2 ? 'Multi-instance: metro / supermarket / school / hospital'
      : arc === 3 ? 'Difficult: hotel / night shift / funeral / wedding / temple'
      : arc === 4 ? 'Hard mode: museum / bunker / warship / spacecraft / origin'
      : arc === 5 ? 'Cosmic: horror dimension / multi-realm / ancient deity'
      : arc === 6 ? 'System architect / origin universe'
      : 'Final instance + escape',
  threadsForArc: (arc) => {
    if (arc === 1) return ['first instance survive', 'system rules basics'];
    if (arc === 2) return ['multi-instance veteran', `{{ANTAGONIST_NPC}} reveal`];
    if (arc === 3) return ['top 100 server', 'competitor face-slap'];
    if (arc === 4) return ['top 10 server', 'system origin lore'];
    if (arc === 5) return ['cosmic instances', 'multi-realm rules'];
    if (arc === 6) return ['system master confrontation', 'true rules reveal'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'phó bản clear / boss kill / rules mastery / cosmic entity face-slap',
  confrontFlavor: 'rules violation threat / monster encounter / puzzle',
  breathingFlavor: 'investigate clues / build team / rest area / dialog với {{COMPANION_NAME}}',
});

export const LINH_DI_QUY_TAC_TEMPLATE: TemplateBlueprint = {
  templateId: 'linh-di-quy-tac-quai-dam',
  description: 'Quy Tắc Quái Đàm archetype — MC vào không gian bị nguyền, survive bằng nhận diện rules. Phó-bản pattern: 1 sub-arc = 1 instance.',
  genre: 'linh-di',
  totalChapters: 1000,
  arcs: LINH_DI_QUY_TAC_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'COMPANION_NAME', 'ANTAGONIST_NPC',
    'ENDING_GOAL',
  ],
  optionalVars: { CITY_NAME: 'Sài Gòn' },
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Trần Vũ"',
    MC_FAMILY: 'Họ — vd "Trần"',
    COMPANION_NAME: 'Co-survivor — vd "Tô Linh"',
    ANTAGONIST_NPC: 'Recurring antagonist NPC — vd "Hắc Y NPC", "Master Architect"',
    ENDING_GOAL: 'Đích cuối — vd "system escape + true freedom"',
    CITY_NAME: 'Thành phố action',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: lý tính + paranoid + observe.',
    'Phó-bản: 1 sub-arc = 1 instance với rules + boss + clear.',
  ],
  extraBannedPatterns: ['CẤM rules reveal đầy đủ đầu', 'CẤM MC OP từ đầu'],
  cosmicArcStartChapter: 401,
  mood: ['bi-an', 'kich-tinh', 'u-am'],
  tempo: 'medium',
  spiceLevel: 2,
};
