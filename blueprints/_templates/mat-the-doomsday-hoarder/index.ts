/**
 * Mat-the "doomsday-hoarder" master template — post-apocalypse trọng sinh.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { MAT_THE_HOARDER_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(MAT_THE_HOARDER_ARC_SKELETON, {
  toneDirective: '{{MC_NAME}} tone: lạnh đạm + tính toán hoarder. Public face survivor may mắn, không khoe knowledge.',
  bansAlways: [
    'CẤM tài nguyên (food / weapon / med) không có ledger nguồn — phải có hoard run / loot / craft',
    'CẤM reveal MC trọng sinh từ tương lai cho người không phải tâm phúc ({{COMPANION_NAME}})',
    'CẤM alien / cosmic threat xuất hiện trước arc 4 — phải plant trước, reveal đúng arc',
  ],
  bansForArc: (arc) => (arc <= 3 ? ['CẤM {{ANTAGONIST_FACTION}} xuất hiện liên tục — ngắt quãng ≥3 chương breathing'] : []),
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', 'gia đình MC'];
    if (arc >= 1) base.push('survivor recruits');
    if (arc >= 2) base.push('{{COMPANION_NAME}}', '{{ANTAGONIST_FACTION}} đại biểu');
    if (arc >= 4) base.push('mutant tier 3');
    if (arc >= 5) base.push('{{COSMIC_THREAT}} scout');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} — outbreak day 1-30'
      : arc === 2 ? `{{SAFE_ZONE_NAME}} community 100`
      : arc === 3 ? `{{SAFE_ZONE_NAME}} settlement 1000`
      : arc === 4 ? '{{CITY_NAME}} mini-city'
      : arc === 5 ? '{{CITY_NAME}} city + global'
      : arc === 6 ? 'Đại lục + cosmic battlefield'
      : 'Endgame multi-realm',
  threadsForArc: (arc) => {
    if (arc === 1) return ['hoard supplies', 'cứu gia đình + 5 sống sót'];
    if (arc === 2) return ['community 100', `{{ANTAGONIST_FACTION}} first contact`];
    if (arc === 3) return ['settlement 1000', 'mutant evolution'];
    if (arc === 4) return ['mini-city', `{{COSMIC_THREAT}} reveal`];
    if (arc === 5) return ['city + global liên minh', 'alien tech reverse'];
    if (arc === 6) return ['đại lục liên minh', 'cosmic origin'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'mass zombie kill / chiếm faction HQ / alien scout mass kill',
  confrontFlavor: 'bandit war / faction skirmish / mutant horde',
  breathingFlavor: 'hoard run / build infrastructure / dialog với {{COMPANION_NAME}}',
});

export const MAT_THE_HOARDER_TEMPLATE: TemplateBlueprint = {
  templateId: 'mat-the-doomsday-hoarder',
  description: 'Post-apocalypse hoarder archetype — MC trọng sinh 7 days trước doomsday, hoard supplies, build community → cosmic guardian. 7 arcs.',
  genre: 'mat-the',
  totalChapters: 1000,
  arcs: MAT_THE_HOARDER_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'DOOMSDAY_DATE', 'SAFE_ZONE_NAME',
    'ANTAGONIST_FACTION', 'COSMIC_THREAT', 'COMPANION_NAME',
    'CITY_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Trần Phong"',
    MC_FAMILY: 'Họ — vd "Trần"',
    HOMETOWN: 'Quê — vd "Hà Nội"',
    DOOMSDAY_DATE: 'Ngày tận thế — vd "20/6/2025"',
    SAFE_ZONE_NAME: 'Tên căn cứ — vd "Vô Cực Cứ Điểm"',
    ANTAGONIST_FACTION: 'Faction đối thủ — vd "Hắc Long Hội"',
    COSMIC_THREAT: 'Cosmic threat — vd "Cổ Ma Tinh Tộc"',
    COMPANION_NAME: 'Bạn co-survivor — vd "Tô Linh"',
    CITY_NAME: 'Thành phố — vd "Sài Gòn"',
    ENDING_GOAL: 'Đích cuối — vd "Cosmic Guardian + nhân loại reborn"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: lạnh đạm + tính toán hoarder.',
    'Mode lão lục: knowledge tương lai dùng kín đáo.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter (loot success, kill horde).',
  ],
  extraBannedPatterns: [
    'CẤM resources không có ledger',
    'CẤM cosmic threat xuất hiện sớm trước arc 4',
  ],
  cosmicArcStartChapter: 701,
};
