/**
 * Faloo-style "quốc vận + prompt" — phó-bản pattern, hook-in-title.
 *
 * Archetype: MC nhận hệ thống prompt (hint) trong game/event quốc vận.
 * Mỗi quyết định = system hint cho biết outcome. MC dùng prompt để
 * leo top quốc gia → toàn cầu → cosmic. Chapter chuẩn 2800-3000 từ
 * NHƯNG cliffhanger dày (2-3 mini-reveal / chương), arc đầu 5-15
 * chương (compressed), title encodes mechanic.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const FALOO_QUOC_VAN_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Hệ thống prompt active — first national event',
    corePayoff: 'MC nhận prompt + top 100 quốc gia, đầu tiên reveal mechanic',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Quốc vận event triggered — system prompt active', payoff: 'prompt #1 follow → first success, top 1000' },
      { number: 2, range: [6, 10], theme: 'Event 2 prompt — face-slap doubters', payoff: 'top 500, danh tiếng nội đô' },
      { number: 3, range: [11, 15], theme: 'Event 3 — first cosmic-tier hint', payoff: 'top 100, cosmic clue plant' },
      { number: 4, range: [16, 25], theme: 'Event 4-5 — quốc gia tournament', payoff: 'qualify national finals' },
      { number: 5, range: [26, 35], theme: 'Event 6 — national finals', payoff: 'top 10 national' },
      { number: 6, range: [36, 45], theme: '{{ANTAGONIST_NPC}} nationally appears', payoff: 'face-slap mass national' },
      { number: 7, range: [46, 50], theme: 'CLIMAX arc 1: top 10 national + system tier 2', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'National top → continental top',
    corePayoff: 'MC top 3 quốc gia → top 100 continental, prompt tier 3',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'National event 2 — top 3', payoff: 'top 3 national' },
      { number: 2, range: [66, 80], theme: 'Continental qualifier', payoff: 'qualify continental' },
      { number: 3, range: [81, 95], theme: 'Continental top 1000', payoff: 'top 1000 continental' },
      { number: 4, range: [96, 110], theme: 'Continental top 100 push', payoff: 'top 100 continental' },
      { number: 5, range: [111, 125], theme: 'Mass face-slap continental rivals', payoff: 'continental face-slap dày' },
      { number: 6, range: [126, 140], theme: '{{ANTAGONIST_NPC}} continental tier reveal', payoff: 'kẻ địch chính lộ' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: top 100 continental + system tier 3', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Continental → global tournament',
    corePayoff: 'MC top 10 continental → top 100 global, prompt tier 4',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Continental finals', payoff: 'top 10 continental' },
      { number: 2, range: [171, 190], theme: 'Global qualifier', payoff: 'qualify global' },
      { number: 3, range: [191, 215], theme: 'Global rounds 1-2', payoff: 'top 1000 global' },
      { number: 4, range: [216, 235], theme: 'Global elite tier rounds', payoff: 'top 100 global' },
      { number: 5, range: [236, 260], theme: '{{ANTAGONIST_NPC}} global confrontation first', payoff: 'face-slap global rival' },
      { number: 6, range: [261, 285], theme: 'Cosmic-tier mechanic reveal', payoff: 'system tier 4 — cosmic origin hint' },
      { number: 7, range: [286, 300], theme: 'CLIMAX arc 3: top 100 global + cosmic preview', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Global champion + cosmic system reveal',
    corePayoff: 'MC top 10 global champion, system origin lộ cosmic-tier',
    subArcs: [
      { number: 1, range: [301, 325], theme: 'Global semi-finals', payoff: 'top 50 global' },
      { number: 2, range: [326, 350], theme: 'Global finals', payoff: 'top 10 global champion' },
      { number: 3, range: [351, 380], theme: 'Cosmic system reveal — origin investigation', payoff: 'lore reveal' },
      { number: 4, range: [381, 410], theme: 'Cosmic tier ally network', payoff: 'cosmic allies network' },
      { number: 5, range: [411, 440], theme: '{{ANTAGONIST_NPC}} cosmic confrontation', payoff: 'face-slap cosmic tier' },
      { number: 6, range: [441, 470], theme: 'Cosmic system tier 5', payoff: 'system tier 5' },
      { number: 7, range: [471, 500], theme: 'CLIMAX arc 4: global champion + cosmic ally', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Cosmic tournament + admin scout reveal',
    corePayoff: 'MC top 1 cosmic, admin scout first contact',
    subArcs: [
      { number: 1, range: [501, 525], theme: 'Cosmic tier event 1', payoff: 'cosmic tier 1 win' },
      { number: 2, range: [526, 555], theme: 'Cosmic tier event 2', payoff: 'cosmic tier 2' },
      { number: 3, range: [556, 585], theme: 'Mass cosmic face-slap', payoff: 'cosmic rivals mass face-slap' },
      { number: 4, range: [586, 615], theme: 'Cosmic finals approach', payoff: 'finalist confirmed' },
      { number: 5, range: [616, 645], theme: 'Cosmic finals', payoff: 'top 1 cosmic' },
      { number: 6, range: [646, 675], theme: 'Admin scout first contact', payoff: 'admin reveal start' },
      { number: 7, range: [676, 700], theme: 'CLIMAX arc 5: cosmic champion + admin scout', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Multi-realm system + admin showdown prep',
    corePayoff: 'MC multi-realm cosmic-tier, admin first weak',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Multi-realm tournament tier', payoff: 'multi-realm access' },
      { number: 2, range: [731, 760], theme: 'Mass admin scout face-slap', payoff: 'admin retreat đợt 1' },
      { number: 3, range: [761, 790], theme: 'Cosmic ally network peak', payoff: 'allies peak' },
      { number: 4, range: [791, 820], theme: 'Admin major confrontation', payoff: 'admin major weakened' },
      { number: 5, range: [821, 850], theme: 'Reveal: prompt system = admin tool', payoff: 'lore peak' },
      { number: 6, range: [851, 880], theme: 'Final cosmic plan ready', payoff: 'plan ready' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: admin weakened, final prep', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm',
    subArcs: [
      { number: 1, range: [901, 930], theme: 'Admin final invasion', payoff: 'invasion peak' },
      { number: 2, range: [931, 960], theme: 'Final cosmic battle', payoff: 'admin thua' },
      { number: 3, range: [961, 985], theme: '{{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 4, range: [986, 1000], theme: 'ENDING: warm closure', payoff: 'multi-realm peace, MC retire' },
    ],
  },
];
