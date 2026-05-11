/**
 * Khoa-huyen "tinh tế galactic" — time-skip-macro space opera.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { KHOA_HUYEN_TINH_TE_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(KHOA_HUYEN_TINH_TE_ARC_SKELETON, {
  pattern: 'time-skip-macro',
  toneDirective: '{{MC_NAME}} tone: emperor strategic + ambitious. Time-skip macro — sectors → quadrants → galactic.',
  bansAlways: [
    'CẤM tech ngẫu nhiên — phải có ancient ruins / R&D source',
    'CẤM time-skip phá continuity',
    'CẤM cosmic admin reveal sớm trước arc 4',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{COMPANION_NAME}}'];
    if (arc <= 2) base.push('{{LOW_RIVAL}} pilot', 'space pirates');
    if (arc >= 2) base.push('{{ANTAGONIST_CORP}} CEO');
    if (arc >= 3) base.push('ancient civ scouts');
    if (arc >= 4) base.push('cosmic admin');
    if (arc >= 5) base.push('multi-galaxy allies');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? 'Sector academy + first patrol'
      : arc === 2 ? '5-sector empire'
      : arc === 3 ? 'Quadrant top 10'
      : arc === 4 ? 'Galactic top 3'
      : arc === 5 ? 'Multi-galaxy presence'
      : 'Cosmic battlefield',
  threadsForArc: (arc) => {
    if (arc === 1) return ['top sector', 'ancient tech 1'];
    if (arc === 2) return ['5-sector empire', `{{ANTAGONIST_CORP}} confront`];
    if (arc === 3) return ['quadrant top 10', 'ancient civ contact'];
    if (arc === 4) return ['galactic top 3', 'cosmic admin reveal'];
    if (arc === 5) return ['top 1 galactic', 'admin major bại'];
    if (arc === 6) return ['admin final form', 'lore peak'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'mass conquest / mech upgrade / quadrant unification',
  confrontFlavor: 'space battle / corp confront / cosmic admin scout',
  breathingFlavor: 'time-skip infrastructure / R&D / dialog với {{COMPANION_NAME}}',
});

export const KHOA_HUYEN_TINH_TE_TEMPLATE: TemplateBlueprint = {
  templateId: 'khoa-huyen-tinh-te-galactic',
  description: 'Tinh Tế Galactic archetype — MC pilot mech build galactic empire qua warlord conquest + tech expansion + time-skip macro.',
  genre: 'khoa-huyen',
  totalChapters: 1000,
  arcs: KHOA_HUYEN_TINH_TE_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'COMPANION_NAME', 'LOW_RIVAL',
    'ANTAGONIST_CORP', 'ENDING_GOAL',
  ],
  optionalVars: { GALAXY_NAME: 'Tinh Hà Liên Bang' },
  varGuidance: {
    MC_NAME: 'Tên MC pilot — vd "Lý Tinh Vũ"',
    MC_FAMILY: 'Họ — vd "Lý"',
    COMPANION_NAME: 'Engineer companion — vd "Tô Linh"',
    LOW_RIVAL: 'Pilot rival arc 1 — vd "Hắc Vũ"',
    ANTAGONIST_CORP: 'Corp đối thủ — vd "Hắc Tinh Corp"',
    ENDING_GOAL: 'Đích cuối — vd "multi-galaxy emperor + cosmic peace"',
    GALAXY_NAME: 'Tên galactic union',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: emperor strategic.',
    'Time-skip macro — empire builds across decades.',
  ],
  extraBannedPatterns: ['CẤM tech random', 'CẤM time-skip phá continuity'],
  cosmicArcStartChapter: 401,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'medium',
  spiceLevel: 1,
};
