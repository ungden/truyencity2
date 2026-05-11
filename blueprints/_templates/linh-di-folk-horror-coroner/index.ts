/**
 * Linh-di "folk-horror-coroner" master template — paranormal procedural.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { LINH_DI_CORONER_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(LINH_DI_CORONER_ARC_SKELETON, {
  toneDirective: '{{MC_NAME}} tone: lạnh đạm + nhân văn. Folk-horror procedural — quy tắc + ngỗ tác.',
  bansAlways: [
    'CẤM bùa chú / pháp khí xuất hiện không ledger — phải có {{LINEAGE_NAME}} sách / tổ tiên truyền',
    'CẤM ma quỷ random — mọi quái sự phải có nguyên nhân + quy tắc rõ ràng (folk-horror style)',
    'CẤM MC dùng kỹ thuật chưa unlock cấp đó — progression linear theo dòng pháp',
  ],
  bansForArc: (arc) => (arc <= 3 ? ['CẤM {{ANTAGONIST_LINEAGE}} xuất hiện liên tục — ngắt quãng ≥3 chương'] : []),
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}'];
    if (arc >= 1) base.push('{{ANTAGONIST_LINEAGE}} đệ tử');
    if (arc >= 2) base.push('{{COMPANION_NAME}}');
    if (arc >= 3) base.push('hoàng đế / quan triều');
    if (arc >= 4) base.push('{{ANCIENT_EVIL}} tay sai');
    if (arc >= 6) base.push('tổ tiên di niệm');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} làng + huyện'
      : arc === 2 ? `{{CITY_NAME}} phủ`
      : arc === 3 ? 'Kinh thành + tông phái'
      : arc === 4 ? 'Đại lục đa địa danh'
      : arc === 5 ? 'Cosmic ruins + battlefield'
      : arc === 6 ? 'Cosmic-tier multi-realm'
      : 'Endgame multi-realm',
  threadsForArc: (arc) => {
    if (arc === 1) return ['ngỗ tác cấp 3', `face-slap {{ANTAGONIST_LINEAGE}}`];
    if (arc === 2) return ['cấp 5', `manh mối {{ANCIENT_EVIL}}`];
    if (arc === 3) return ['đại sư + tông phái', `{{ANTAGONIST_LINEAGE}} cấp tông`];
    if (arc === 4) return ['tông sư', `{{ANCIENT_EVIL}} tỉnh`];
    if (arc === 5) return ['cao thủ', `{{ANCIENT_EVIL}} body chính`];
    if (arc === 6) return ['thiên sư', 'cosmic origin reveal'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'phá đại quái sự / tà thần battle / mass face-slap',
  confrontFlavor: 'pháp đấu / tà ma confront / quy tắc thử thách',
  breathingFlavor: 'nghiên cứu sách cổ / dialog tổ tiên di niệm / coroner procedural',
});

export const LINH_DI_CORONER_TEMPLATE: TemplateBlueprint = {
  templateId: 'linh-di-folk-horror-coroner',
  description: 'Folk-horror coroner archetype — MC ngỗ tác / thợ pháp giải quái sự, leo từ làng → đại lục → cosmic-tier tà thần. 7 arcs.',
  genre: 'linh-di',
  totalChapters: 1000,
  arcs: LINH_DI_CORONER_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'ANCESTOR_NAME', 'LINEAGE_NAME',
    'SIGNATURE_TOOL', 'ANTAGONIST_LINEAGE', 'ANCIENT_EVIL',
    'COMPANION_NAME', 'CITY_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC — vd "Cố Diệp"',
    MC_FAMILY: 'Họ — vd "Cố"',
    HOMETOWN: 'Làng quê — vd "Cố thị làng"',
    ANCESTOR_NAME: 'Tổ tiên thợ pháp — vd "Cố Tổ"',
    LINEAGE_NAME: 'Dòng pháp — vd "Cố thị Âm Dương"',
    SIGNATURE_TOOL: 'Vật bí truyền — vd "Tử La Bàn"',
    ANTAGONIST_LINEAGE: 'Dòng pháp đối thủ — vd "Hắc Liên giáo"',
    ANCIENT_EVIL: 'Cosmic tà thần — vd "Cửu U Tà Đế"',
    COMPANION_NAME: 'Đệ tử / partner — vd "Tô Linh"',
    CITY_NAME: 'Phủ thành — vd "Lâm An phủ"',
    ENDING_GOAL: 'Đích cuối — vd "Thiên sư cosmic guardian"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: lạnh đạm + nhân văn.',
    'Folk-horror procedural: mọi quái sự phải có quy tắc + nguyên nhân rõ ràng.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter.',
  ],
  extraBannedPatterns: [
    'CẤM ma quỷ random không quy tắc',
    'CẤM bùa chú không ledger từ tổ tiên',
  ],
  cosmicArcStartChapter: 701,
  mood: ['bi-an', 'u-am', 'ky-la'],
  tempo: 'medium',
  spiceLevel: 2,
};
