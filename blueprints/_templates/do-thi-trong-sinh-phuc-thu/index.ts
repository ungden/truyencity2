/**
 * Do-thi "trọng sinh phục thù" — cluster-dopamine với revenge focus.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { DO_THI_PHUC_THU_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(DO_THI_PHUC_THU_ARC_SKELETON, {
  pattern: 'cluster-dopamine',
  toneDirective: '{{MC_NAME}} tone: lạnh đạm + tính toán + dark-edged. Public face thanh niên may mắn, bên trong revenge-driven.',
  bansAlways: [
    'CẤM bạo lực vật lý — face-slap qua market / lawsuit / public exposure',
    'CẤM revenge cực đoan (giết / bắt cóc) — phải thông qua channels chính thống',
    'CẤM reveal trọng sinh trắng trợn',
    'CẤM forgive traitors mềm — báo thù phải thoả mãn',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{LIFE_PARTNER_REAL}}'];
    if (arc === 1) base.push('{{TRAITOR_FRIEND}} (kiếp trước best friend)');
    if (arc === 2) base.push('{{TRAITOR_FIANCEE}} (kiếp trước fiancée)');
    if (arc === 3) base.push('{{TRAITOR_BOSS}} (kiếp trước mafia / father)');
    if (arc >= 4) base.push('cosmic puppet master');
    if (arc >= 5) base.push('cosmic ally network');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} — early career'
      : arc === 2 ? '{{HOMETOWN}} — mid-career + IPO local'
      : arc === 3 ? '{{COUNTRY_NAME}} — national-level'
      : arc === 4 ? 'Global — IPO NASDAQ + Forbes'
      : 'Cosmic-tier conspiracy',
  threadsForArc: (arc) => {
    if (arc === 1) return ['{{TRAITOR_FRIEND}} face-slap', 'first venture'];
    if (arc === 2) return ['{{TRAITOR_FIANCEE}} face-slap', 'IPO local'];
    if (arc === 3) return ['{{TRAITOR_BOSS}} face-slap', 'top quốc gia'];
    if (arc === 4) return ['Forbes 100', 'kết hôn {{LIFE_PARTNER_REAL}}'];
    if (arc === 5) return ['cosmic conspiracy reveal', 'cosmic ally'];
    if (arc === 6) return ['cosmic puppet master final', 'lore peak'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'face-slap traitor mass / IPO milestone / cosmic ally arrive',
  confrontFlavor: 'traitor backstab / lawsuit / business war',
  breathingFlavor: 'plan dark scheme / build foundation / dialog với {{LIFE_PARTNER_REAL}}',
});

export const DO_THI_PHUC_THU_TEMPLATE: TemplateBlueprint = {
  templateId: 'do-thi-trong-sinh-phuc-thu',
  description: 'Trọng Sinh Phục Thù archetype — MC kiếp trước bị phản bội, trọng sinh báo thù 3 traitors. Hỗ trợ 3 REVENGE_MODE: passive (Hối Hận Văn — MC rời đi, traitors hối hận) / active (mass face-slap) / extreme (ruthless takedown).',
  genre: 'do-thi',
  totalChapters: 1000,
  arcs: DO_THI_PHUC_THU_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'COUNTRY_NAME',
    'TRAITOR_FRIEND', 'TRAITOR_FIANCEE', 'TRAITOR_BOSS',
    'LIFE_PARTNER_REAL', 'REVENGE_MODE', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Trần Đông"',
    MC_FAMILY: 'Họ — vd "Trần"',
    HOMETOWN: 'Quê — vd "Hà Nội"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam"',
    TRAITOR_FRIEND: 'Best friend kiếp trước phản bội — vd "Lý Khang"',
    TRAITOR_FIANCEE: 'Fiancée kiếp trước phản bội — vd "Phạm Vi"',
    TRAITOR_BOSS: 'Mafia / step-father kiếp trước — vd "Hoàng Đại Lão"',
    LIFE_PARTNER_REAL: 'True love mới — vd "Nguyễn Lan Anh"',
    REVENGE_MODE: 'Loại revenge — "passive" (hối hận văn — MC rời đi, traitors hối hận từ xa) / "active" (mass face-slap chuẩn) / "extreme" (ruthless takedown dark)',
    ENDING_GOAL: 'Đích cuối — vd "tài phiệt #1 + cosmic philanthropist"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: lạnh đạm + tính toán + dark-edged.',
    'Cluster-dopamine: ≥1 face-slap traitor / 5 chương.',
    'NON_COMBAT — face-slap qua thị trường + lawsuit + public exposure.',
  ],
  extraBannedPatterns: ['CẤM bạo lực', 'CẤM forgive traitors mềm'],
  cosmicArcStartChapter: 501,
  mood: ['sang-khoai', 'u-am'],
  tempo: 'fast-paced',
  spiceLevel: 2,
};
