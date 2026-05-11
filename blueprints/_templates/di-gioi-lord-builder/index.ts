/**
 * Di-gioi "lord-builder" master template — sandbox lord-building isekai.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { DI_GIOI_LORD_BUILDER_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(DI_GIOI_LORD_BUILDER_ARC_SKELETON, {
  toneDirective: '{{MC_NAME}} tone: pragmatic lord + strategic. Sandbox creator style với time-skip macro.',
  bansAlways: [
    'CẤM tài nguyên (gold/iron/food) không có ledger source — phải có farm/mine/trade',
    'CẤM hero unit recruit không lý do — phải có quest / event / system gacha',
    'CẤM time-skip macro phá continuity — phải resolve threads trước skip',
  ],
  bansForArc: (arc) => (arc <= 4 ? ['CẤM {{ANTAGONIST_KINGDOM}} xuất hiện liên tục — ngắt quãng ≥3 chương'] : []),
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{HERO_RECRUIT}}'];
    if (arc >= 1) base.push('{{COMPANION_NAME}}');
    if (arc >= 3) base.push('{{ANTAGONIST_KINGDOM}} king');
    if (arc >= 4) base.push('demon scouts');
    if (arc >= 6) base.push('{{ANCIENT_DEMON}} legion');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{TERRITORY_NAME}} 1-5 làng'
      : arc === 2 ? '{{TERRITORY_NAME}} 10 thị trấn'
      : arc === 3 ? '{{TERRITORY_NAME}} 50 thị trấn 5 thành'
      : arc === 4 ? 'Vương quốc {{TERRITORY_NAME}} + biên giới'
      : arc === 5 ? 'Đế quốc {{CONTINENT_NAME}}'
      : arc === 6 ? '{{CONTINENT_NAME}} cosmic battlefield'
      : 'Endgame multi-realm',
  threadsForArc: (arc) => {
    if (arc === 1) return ['1-5 làng', 'recruit hero đầu'];
    if (arc === 2) return ['10 thị trấn', 'lord khu vực'];
    if (arc === 3) return ['đại công quốc', `{{ANTAGONIST_KINGDOM}} đối đầu`];
    if (arc === 4) return ['vương quốc', `{{ANCIENT_DEMON}} sắp tỉnh`];
    if (arc === 5) return ['đế quốc đại lục', 'demon scout'];
    if (arc === 6) return [`{{ANCIENT_DEMON}} body lộ`, 'cosmic battlefield reveal'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'chiếm city / hero recruit / mass demon kill / lãnh thổ expand visible',
  confrontFlavor: 'kingdom war / lord skirmish / demon scout',
  breathingFlavor: 'build infrastructure / time-skip macro / dialog với heroes',
});

export const DI_GIOI_LORD_BUILDER_TEMPLATE: TemplateBlueprint = {
  templateId: 'di-gioi-lord-builder',
  description: 'Lord-building isekai — MC xuyên dị giới với system, build từ 1 làng → đế quốc → cosmic-tier. 7 arcs. Sandbox creator style với time-skip macro.',
  genre: 'di-gioi',
  totalChapters: 1000,
  arcs: DI_GIOI_LORD_BUILDER_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'TERRITORY_NAME', 'SYSTEM_NAME',
    'ANTAGONIST_KINGDOM', 'ANCIENT_DEMON', 'HERO_RECRUIT',
    'COMPANION_NAME', 'CONTINENT_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Lý Phong"',
    MC_FAMILY: 'Họ — vd "Lý"',
    HOMETOWN: 'Quê hiện đại — vd "Hà Nội"',
    TERRITORY_NAME: 'Tên lãnh thổ — vd "Vô Cực Lãnh"',
    SYSTEM_NAME: 'Tên system — vd "Lãnh Chúa Vô Hạn System"',
    ANTAGONIST_KINGDOM: 'Vương quốc đối thủ — vd "Hắc Long Quốc"',
    ANCIENT_DEMON: 'Cosmic demon — vd "Cổ Ma Vương"',
    HERO_RECRUIT: 'Hero unit chính — vd "Thánh Kỵ Sĩ Arthur"',
    COMPANION_NAME: 'Bạn co-lord — vd "Elaine"',
    CONTINENT_NAME: 'Đại lục — vd "Aetheria"',
    ENDING_GOAL: 'Đích cuối — vd "Cosmic Lord overlord"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: pragmatic lord + strategic.',
    'Sandbox creator style — time-skip macro cho phép, nhưng phải resolve threads trước.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter.',
  ],
  extraBannedPatterns: [
    'CẤM tài nguyên không có ledger',
    'CẤM hero recruit không lý do (quest / event / gacha)',
  ],
  cosmicArcStartChapter: 701,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'medium',
  spiceLevel: 1,
};
