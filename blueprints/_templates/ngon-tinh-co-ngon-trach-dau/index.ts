/**
 * Ngon-tinh "cổ ngôn trạch đấu" — cung đấu + cổ đại revenge.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { NGON_TINH_CO_NGON_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(NGON_TINH_CO_NGON_ARC_SKELETON, {
  pattern: 'cluster-dopamine',
  toneDirective: '{{FEMALE_MC}} tone: thâm trầm + tính toán + dịu dàng với {{MALE_LEAD}}. Cổ phong + trạch đấu intricate.',
  bansAlways: [
    'CẤM bạo lực vật lý — trạch đấu qua maneuvering, poison, evidence, gossip',
    'CẤM reveal trọng sinh trắng trợn',
    'CẤM rival cố tình ác extreme (cooperative tone với female frequency)',
    'CẤM modern slang trong cổ phong dialogue',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{FEMALE_MC}}', '{{MALE_LEAD}}'];
    if (arc === 1) base.push('chính thê / mẹ kế');
    if (arc >= 2) base.push('gia tộc trưởng', 'rival sisters');
    if (arc >= 3) base.push('hoàng đế', 'sủng phi rivals');
    if (arc >= 4) base.push('triều đình conspirators');
    if (arc >= 5) base.push('ngoại bang sứ');
    if (arc >= 6) base.push('thái tử');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? `{{FAMILY_NAME}} phủ — trạch đấu gia tộc`
      : arc === 2 ? `{{FAMILY_NAME}} phủ + {{MALE_LEAD}} courtship`
      : arc === 3 ? 'Vương phủ / cung đình — hôn lễ + cung đấu'
      : arc === 4 ? 'Triều đình + hậu cung'
      : arc === 5 ? `Thiên hạ — đế đô + đại lục`
      : 'Thái thượng + retirement palace',
  threadsForArc: (arc) => {
    if (arc === 1) return ['chính thê bại', 'first skill reveal'];
    if (arc === 2) return ['gia tộc politics', 'đính hôn'];
    if (arc === 3) return ['hôn lễ', 'cung đấu start'];
    if (arc === 4) return ['hoàng hậu', 'triều đình conspiracy'];
    if (arc === 5) return ['đại đế', 'đại lục stable'];
    if (arc === 6) return ['thái tử kế thừa', 'last conspiracy'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'phong hoàng hậu / face-slap rivals via reveal / đại đế ascension',
  confrontFlavor: 'trạch đấu maneuvering / triều đình intrigue / poison plot',
  breathingFlavor: 'sweet moments với {{MALE_LEAD}} / điền văn cosy / dialog thân tín',
});

export const NGON_TINH_CO_NGON_TEMPLATE: TemplateBlueprint = {
  templateId: 'ngon-tinh-co-ngon-trach-dau',
  description: 'Cổ ngôn trạch đấu archetype — Female MC trọng sinh cổ đại, đè bẹp gia tộc rivals → cung đấu → hoàng hậu → đại lục. Cluster-dopamine + cổ phong intricate.',
  genre: 'ngon-tinh',
  totalChapters: 1000,
  arcs: NGON_TINH_CO_NGON_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'FEMALE_MC', 'FEMALE_MC_FAMILY', 'FAMILY_NAME', 'DYNASTY_NAME',
    'MALE_LEAD', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    FEMALE_MC: 'Tên female MC — vd "Tô Nhược"',
    FEMALE_MC_FAMILY: 'Họ — vd "Tô"',
    FAMILY_NAME: 'Gia tộc — vd "Tô gia"',
    DYNASTY_NAME: 'Triều đại — vd "Đại Đường"',
    MALE_LEAD: 'Male lead (vương / công tử) — vd "Lý Mộ Bạch (Tần Vương)"',
    ENDING_GOAL: 'Đích cuối — vd "Hoàng hậu + thái tử kế thừa + thiên hạ thái bình"',
  },
  toneDirectives: [
    '{{FEMALE_MC}} tone: thâm trầm + tính toán + dịu dàng với {{MALE_LEAD}}.',
    'Cổ phong + trạch đấu intricate.',
    'NON_COMBAT — trạch đấu qua maneuvering / poison / evidence.',
  ],
  extraBannedPatterns: [
    'CẤM bạo lực vật lý',
    'CẤM modern slang',
    'CẤM reveal trọng sinh trắng trợn',
  ],
  cosmicArcStartChapter: 601,
  mood: ['lang-man', 'kich-tinh'],
  tempo: 'medium',
  spiceLevel: 1,
};
