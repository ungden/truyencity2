/**
 * Dong-nhan "Naruto system" — cluster-dopamine canon hooks.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { DONG_NHAN_NARUTO_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(DONG_NHAN_NARUTO_ARC_SKELETON, {
  pattern: 'cluster-dopamine',
  toneDirective: '{{MC_NAME}} tone: meta-aware ninja + tự tin. Public face thiếu niên may mắn, kiến thức canon kín đáo.',
  bansAlways: [
    'CẤM canon characters break OOC',
    'CẤM reveal canon spoiler trắng trợn cho non-tâm phúc',
    'CẤM jutsu ngẫu nhiên không có system source',
    'CẤM hub space cấp 6+ trước arc 6',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{MC_NAME}}', '{{CANON_MENTOR}}'];
    if (arc >= 1) base.push('{{FAVORITE_CHARACTER}}', '{{COMPANION_NAME}}');
    if (arc >= 3) base.push('Akatsuki members');
    if (arc >= 4) base.push('Otsutsuki scouts');
    if (arc >= 6) base.push('multi-canon allies');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{VILLAGE_NAME}} — academy + early genin'
      : arc === 2 ? '{{VILLAGE_NAME}} — Chunin / Jonin promotion zones'
      : arc === 3 ? 'Ninja war zones + Akatsuki territories'
      : arc === 4 ? 'Cosmic-tier ruins + Otsutsuki preview'
      : arc === 5 ? 'Otsutsuki dimension'
      : arc === 6 ? 'Multi-canon Hub Space'
      : 'Cosmic battlefield',
  threadsForArc: (arc) => {
    if (arc === 1) return ['top genin', 'system jutsu E-D'];
    if (arc === 2) return ['Jonin promotion', 'canon engagement'];
    if (arc === 3) return [`save {{FAVORITE_CHARACTER}}`, 'face-slap Akatsuki'];
    if (arc === 4) return ['Otsutsuki preview', 'cosmic ally'];
    if (arc === 5) return ['Otsutsuki major bại'];
    if (arc === 6) return ['multi-canon expansion', 'cosmic puppet master'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'face-slap canon villain / system jutsu reveal / cosmic ally arrive',
  confrontFlavor: 'canon ninja confrontation / Akatsuki member / Otsutsuki scout',
  breathingFlavor: 'training jutsu / canon character bonding / Hub Space dive',
});

export const DONG_NHAN_NARUTO_TEMPLATE: TemplateBlueprint = {
  templateId: 'dong-nhan-naruto-system',
  description: 'Naruto System archetype — MC OC ninja với hệ thống grant jutsu, follow canon arcs (Chunin → war → Akatsuki → Otsutsuki) → multi-canon expansion. Save key character + meta knowledge advantage.',
  genre: 'dong-nhan',
  totalChapters: 1000,
  arcs: DONG_NHAN_NARUTO_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'VILLAGE_NAME', 'CANON_MENTOR', 'FAVORITE_CHARACTER',
    'COMPANION_NAME', 'ENDING_GOAL',
  ],
  optionalVars: { CLAN_NAME: 'Senju' },
  varGuidance: {
    MC_NAME: 'Tên MC ninja Hán Việt — vd "Trục Vũ", "Diệp Phong"',
    VILLAGE_NAME: 'Làng — vd "Konoha", "Suna"',
    CANON_MENTOR: 'Mentor canon — vd "Hatake Kakashi", "Uzumaki Naruto"',
    FAVORITE_CHARACTER: 'Canon character cứu — vd "Uchiha Itachi", "Senju Tobirama"',
    COMPANION_NAME: 'Companion OC — vd "Hayate Tsuki"',
    ENDING_GOAL: 'Đích cuối — vd "multi-canon shinobi cosmic peace"',
    CLAN_NAME: 'Clan MC — vd "Senju", "Hyuga"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: meta-aware ninja + tự tin.',
    'Cluster-dopamine: ≥1 face-slap / 5 chương + canon engagement.',
  ],
  extraBannedPatterns: ['CẤM canon OOC', 'CẤM reveal spoiler trắng trợn'],
  cosmicArcStartChapter: 401,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'fast-paced',
  spiceLevel: 1,
};
