/**
 * Ngon-tinh "trọng sinh phục thù" — cluster-dopamine female revenge.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { NGON_TINH_PHUC_THU_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(NGON_TINH_PHUC_THU_ARC_SKELETON, {
  pattern: 'cluster-dopamine',
  toneDirective: '{{FEMALE_MC}} tone: lạnh đạm + tính toán + dark-edged. Public face female may mắn, bên trong revenge-driven.',
  bansAlways: [
    'CẤM bạo lực vật lý — face-slap qua market / lawsuit / public exposure',
    'CẤM revenge cực đoan (giết / poison) — phải qua channels chính thống',
    'CẤM forgive traitors mềm — báo thù phải thoả mãn',
    'CẤM forced romance — relationship phải based on consent',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{FEMALE_MC}}', '{{TRUE_LOVE}}'];
    if (arc === 1) base.push('{{TRAITOR_FEMALE}} (chính thê / mẹ kế kiếp trước)');
    if (arc === 2) base.push('{{TRAITOR_HUSBAND}} (chồng cũ kiếp trước)');
    if (arc === 3) base.push('{{TRAITOR_FAMILY}} (gia đình thâm độc)');
    if (arc >= 4) base.push('children');
    if (arc >= 5) base.push('cosmic puppet master');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} — early career'
      : arc === 2 ? '{{HOMETOWN}} — mid-career + business'
      : arc === 3 ? '{{COUNTRY_NAME}} — IPO + wedding'
      : arc === 4 ? 'Global — empire + family'
      : 'Cosmic conspiracy realms',
  threadsForArc: (arc) => {
    if (arc === 1) return ['{{TRAITOR_FEMALE}} face-slap', 'true love spark'];
    if (arc === 2) return ['{{TRAITOR_HUSBAND}} face-slap', 'business empire'];
    if (arc === 3) return ['{{TRAITOR_FAMILY}} face-slap', 'kết hôn'];
    if (arc === 4) return ['family stable', 'global empire'];
    if (arc === 5) return ['cosmic conspiracy reveal', 'multi-realm allies'];
    if (arc === 6) return ['puppet weakened', 'lore peak'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'face-slap traitor mass / IPO milestone / wedding / face-slap puppet',
  confrontFlavor: 'traitor backstab / lawsuit / cosmic conspiracy',
  breathingFlavor: 'plan revenge / build career / family time',
});

export const NGON_TINH_PHUC_THU_TEMPLATE: TemplateBlueprint = {
  templateId: 'ngon-tinh-trong-sinh-phuc-thu',
  description: 'Female trọng sinh phục thù archetype — Female MC kiếp trước bị phản bội (vợ chồng + gia đình + cosmic conspiracy), trọng sinh báo thù qua cluster-dopamine.',
  genre: 'ngon-tinh',
  totalChapters: 1000,
  arcs: NGON_TINH_PHUC_THU_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'FEMALE_MC', 'FEMALE_MC_FAMILY', 'HOMETOWN', 'COUNTRY_NAME',
    'TRAITOR_FEMALE', 'TRAITOR_HUSBAND', 'TRAITOR_FAMILY',
    'TRUE_LOVE', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    FEMALE_MC: 'Tên female MC — vd "Tô Tử Linh"',
    FEMALE_MC_FAMILY: 'Họ — vd "Tô"',
    HOMETOWN: 'Quê — vd "Hà Nội"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam"',
    TRAITOR_FEMALE: 'Female traitor (chính thê / mẹ kế / em vợ kiếp trước) — vd "Lý Vy"',
    TRAITOR_HUSBAND: 'Male traitor (chồng cũ kiếp trước) — vd "Trần Hắc"',
    TRAITOR_FAMILY: 'Gia đình thâm độc — vd "Lý gia"',
    TRUE_LOVE: 'True love mới — vd "Nguyễn Minh"',
    ENDING_GOAL: 'Đích cuối — vd "vợ chồng bá đạo + family empire stable + cosmic peace"',
  },
  toneDirectives: [
    '{{FEMALE_MC}} tone: lạnh đạm + tính toán + dark-edged.',
    'Cluster-dopamine: ≥1 face-slap traitor / 5 chương + romance arcs.',
    'NON_COMBAT — face-slap qua market + lawsuit + public exposure.',
  ],
  extraBannedPatterns: ['CẤM bạo lực', 'CẤM forced romance', 'CẤM forgive mềm'],
  cosmicArcStartChapter: 401,
};
