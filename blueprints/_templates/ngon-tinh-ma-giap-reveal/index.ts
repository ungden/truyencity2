/**
 * Ngon-tinh "mã giáp reveal" — 夫人你马甲又掉了 archetype.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { NGON_TINH_MA_GIAP_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(NGON_TINH_MA_GIAP_ARC_SKELETON, {
  pattern: 'cluster-dopamine',
  toneDirective: '{{FEMALE_MC}} tone: cool + low-key + mysterious. Reveal beats là core mechanic — mỗi lớp mã giáp = đảo vị thế.',
  bansAlways: [
    'CẤM reveal đầy đủ một lúc — mỗi mã giáp 1 sub-arc',
    'CẤM bạo lực vật lý — face-slap qua reveal + lawsuit + market',
    'CẤM forced romance — {{MALE_LEAD}} respect MC từ đầu',
    'CẤM family forgive instantly — cần time + reveal weight',
  ],
  bansForArc: () => [],
  castForArc: (arc) => {
    const base = ['{{FEMALE_MC}}', '{{MALE_LEAD}}'];
    if (arc >= 1) base.push('{{RIVAL_FEMALE}}', 'family unsupportive');
    if (arc >= 3) base.push('{{RIVAL_MALE}} (cyber rival)');
    if (arc >= 4) base.push('hào môn family');
    if (arc >= 5) base.push('noble family heads');
    if (arc >= 6) base.push('international figures', 'cosmic allies');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{HOMETOWN}} — học đường + gia đình'
      : arc === 2 ? 'Bệnh viện + showbiz crossover'
      : arc === 3 ? 'Cyber labs + tech corp'
      : arc === 4 ? 'Hào môn estates + corp HQ'
      : arc === 5 ? 'Noble family + international gala'
      : arc === 6 ? 'International + cosmic-tier sites'
      : 'Wedding venue + closure',
  threadsForArc: (arc) => {
    if (arc === 1) return ['mã giáp #1 (học vấn) revealed'];
    if (arc === 2) return ['mã giáp #2 (y học)'];
    if (arc === 3) return ['mã giáp #3 (hacker)'];
    if (arc === 4) return ['mã giáp #4 (hidden CEO)', 'engagement'];
    if (arc === 5) return ['mã giáp #5 (chân thiên kim)'];
    if (arc === 6) return ['mã giáp #6 (international/cosmic)'];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'mã giáp reveal mass / face-slap qua reveal / public board reaction',
  confrontFlavor: 'rival challenge / family politics / cyber crisis',
  breathingFlavor: 'sweet moments với {{MALE_LEAD}} / family time / reveal prep',
});

export const NGON_TINH_MA_GIAP_TEMPLATE: TemplateBlueprint = {
  templateId: 'ngon-tinh-ma-giap-reveal',
  description: 'Mã giáp reveal archetype — Female MC có nhiều lớp identity ẩn (học bá / doctor / hacker / hidden CEO / chân thiên kim / international). Mỗi sub-arc lộ 1 mã giáp.',
  genre: 'ngon-tinh',
  totalChapters: 1000,
  arcs: NGON_TINH_MA_GIAP_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'FEMALE_MC', 'FEMALE_MC_FAMILY', 'HOMETOWN', 'COUNTRY_NAME',
    'MALE_LEAD', 'RIVAL_FEMALE', 'RIVAL_MALE', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    FEMALE_MC: 'Tên female MC — vd "Tô Tô"',
    FEMALE_MC_FAMILY: 'Họ — vd "Tô"',
    HOMETOWN: 'Quê — vd "Hà Nội"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam"',
    MALE_LEAD: 'Male lead — vd "Trần Mộ Dao"',
    RIVAL_FEMALE: 'Female rival — vd "Lý Vy"',
    RIVAL_MALE: 'Male rival (cyber tier) — vd "Hắc Vũ"',
    ENDING_GOAL: 'Đích cuối — vd "cosmic-tier family empire + wedding + all mã giáp revealed warmly"',
  },
  toneDirectives: [
    '{{FEMALE_MC}} tone: cool + low-key + mysterious.',
    'Reveal beats là core — mỗi sub-arc 1 mã giáp.',
    'NON_COMBAT — KHÔNG bạo lực vật lý.',
  ],
  extraBannedPatterns: [
    'CẤM reveal đầy đủ một lúc',
    'CẤM forced romance',
  ],
  cosmicArcStartChapter: 601,
  mood: ['sang-khoai', 'lang-man'],
  tempo: 'medium',
  spiceLevel: 1,
};
