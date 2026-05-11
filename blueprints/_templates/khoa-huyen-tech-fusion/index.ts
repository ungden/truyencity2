/**
 * Khoa-huyen "tech-fusion-cultivator" master template.
 *
 * Archetype: MC kỹ sư hiện đại fuse tech + tu tiên, build lab + AI familiar +
 * mech, leo Tech-Apprentice → Cosmic-Architect qua 7 arcs. Combat allowed
 * (mech + AI swarm); MC hands-off, mech làm work.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { KHOA_HUYEN_TECH_FUSION_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(KHOA_HUYEN_TECH_FUSION_ARC_SKELETON, {
  toneDirective: '{{MC_NAME}} tone: rational + cool + experimental. AI familiar tone hơi snarky.',
  bansAlways: [
    'CẤM tech device không có blueprint nguồn (R&D log / lab inventory)',
    'CẤM AI familiar tự ra quyết định lớn không qua MC permission',
    'CẤM reveal {{LAB_NAME}} cosmic-tier capabilities cho người ngoài tâm phúc',
  ],
  bansForArc: (arc) => (arc <= 3 ? ['CẤM {{ANTAGONIST_CORP}} xuất hiện liên tục — ngắt quãng ≥3 chương breathing'] : []),
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{AI_FAMILIAR}}'];
    if (arc === 1) base.push('{{ANTAGONIST_CORP}} đệ tử');
    if (arc >= 2) base.push('{{COMPANION_NAME}}');
    if (arc >= 3) base.push('{{ACADEMY_NAME}} sư phụ');
    if (arc >= 4) base.push('{{ANCIENT_ENEMY}} tay sai');
    if (arc >= 6) base.push('cosmic admin');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{LAB_NAME}} + {{ACADEMY_NAME}} ngoại môn'
      : arc === 2 ? '{{ACADEMY_NAME}} nội môn + lab cấp 2'
      : arc === 3 ? '{{ACADEMY_NAME}} chân truyền + tech faction'
      : arc === 4 ? '{{WORLD_NAME}} + quantum realm'
      : arc === 5 ? '{{WORLD_NAME}} 30 sectors'
      : arc === 6 ? 'Cosmic ruins + simulation layer'
      : 'Endgame cosmic',
  threadsForArc: (arc) => {
    if (arc === 1) return ['lab cấp 2', `face-slap {{ANTAGONIST_CORP}}`];
    if (arc === 2) return ['Mech v2', `tìm {{ANCIENT_ENEMY}} dấu vết`];
    if (arc === 3) return ['top 1 chân truyền', '{{ANCIENT_ENEMY}} kiếp trước'];
    if (arc === 4) return ['cứu sư phụ', `diệt tay sai {{ANCIENT_ENEMY}}`];
    if (arc === 5) return ['tech revolution', '{{ANTAGONIST_CORP}} bại'];
    if (arc === 6) return ['cosmic ruins reveal', `pháp bảo {{ANCIENT_ENEMY}}`];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'mech demo / AI swarm strike / quantum hack visible',
  confrontFlavor: 'lab sabotage / corp negotiation / tech showdown',
  breathingFlavor: 'R&D / build prototype / dialog với {{AI_FAMILIAR}}',
});

export const KHOA_HUYEN_TECH_FUSION_TEMPLATE: TemplateBlueprint = {
  templateId: 'khoa-huyen-tech-fusion',
  description: 'Tech-fusion cultivator archetype — MC kỹ sư hiện đại fuse tech + tu tiên, lab + AI familiar + mech, 7 arcs.',
  genre: 'khoa-huyen',
  totalChapters: 1000,
  arcs: KHOA_HUYEN_TECH_FUSION_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'LAB_NAME', 'AI_FAMILIAR',
    'ANTAGONIST_CORP', 'ANCIENT_ENEMY', 'SIGNATURE_DEVICE',
    'ACADEMY_NAME', 'COMPANION_NAME', 'WORLD_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC tu sĩ-engineer — vd "Lý Tinh Vũ"',
    MC_FAMILY: 'Họ MC — vd "Lý"',
    HOMETOWN: 'Quê cổ đại tu tiên — vd "Tinh Hà thành"',
    LAB_NAME: 'Lab/workshop — vd "Tinh Vũ Lab"',
    AI_FAMILIAR: 'AI auxiliary spirit — vd "Linh Tâm AI"',
    ANTAGONIST_CORP: 'Đối thủ corp — vd "Hắc Tinh Corp"',
    ANCIENT_ENEMY: 'Cosmic antagonist — vd "Hỗn Độn Cổ Trí"',
    SIGNATURE_DEVICE: 'Gimmick device — vd "Linh Khí Quantum Generator"',
    ACADEMY_NAME: 'Học viện — vd "Tinh Hà Học Viện"',
    COMPANION_NAME: 'Bạn đồng hành — vd "Tô Linh"',
    WORLD_NAME: 'Đại lục — vd "Tinh Hà Liên Bang"',
    ENDING_GOAL: 'Đích cuối — vd "Cosmic Architect đỉnh"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: rational + cool + experimental.',
    '{{AI_FAMILIAR}} tone: snarky AI assistant — đôi khi sass MC.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter.',
  ],
  extraBannedPatterns: [
    'CẤM tech ngẫu nhiên không nguồn — phải có lab R&D log',
    'CẤM AI familiar lộ cosmic capabilities cho người ngoài',
  ],
  cosmicArcStartChapter: 701,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'medium',
  spiceLevel: 1,
};
