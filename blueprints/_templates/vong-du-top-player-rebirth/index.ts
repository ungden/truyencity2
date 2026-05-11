/**
 * Vong-du "top-player-rebirth" master template — game pro trọng sinh.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { buildTemplateBriefs } from '../_shared/build-briefs';
import { VONG_DU_TOP_PLAYER_ARC_SKELETON } from './arc-skeleton';

const briefsByArc = buildTemplateBriefs(VONG_DU_TOP_PLAYER_ARC_SKELETON, {
  toneDirective: '{{MC_NAME}} tone: cool pro player + meta-aware. Chat in-game ngắn gọn, không khoe khoang.',
  bansAlways: [
    'CẤM gear / item drop ngẫu nhiên không ledger — phải có boss kill / quest / craft source',
    'CẤM reveal MC trọng sinh từ tương lai cho người ngoài tâm phúc ({{COMPANION_NAME}})',
    'CẤM pro player canon đối thủ break game design (vd dùng exploit không nerf)',
  ],
  bansForArc: (arc) => (arc <= 3 ? ['CẤM {{RIVAL_GUILD}} + {{ANTAGONIST_PRO}} cùng xuất hiện chương breathing'] : []),
  castForArc: (arc) => {
    const base = ['{{MC_NAME}} ({{MC_GAME_NAME}})'];
    if (arc >= 1) base.push('{{COMPANION_NAME}}');
    if (arc >= 2) base.push('{{RIVAL_GUILD}} leader');
    if (arc >= 3) base.push('{{ANTAGONIST_PRO}}');
    if (arc >= 4) base.push('pro circuit players');
    if (arc >= 6) base.push('game admin');
    return base;
  },
  locationForArc: (arc) =>
    arc === 1 ? '{{GAME_NAME}} solo zones'
      : arc === 2 ? '{{GAME_NAME}} guild HQ + raid 1'
      : arc === 3 ? '{{GAME_NAME}} server top zones'
      : arc === 4 ? 'Esports tournament arenas'
      : arc === 5 ? 'World tournament + esports company HQ'
      : arc === 6 ? 'Game admin layer + cosmic ruins in-game'
      : 'Endgame cosmic',
  threadsForArc: (arc) => {
    if (arc === 1) return ['solo top 10', `face-slap newbie pro`];
    if (arc === 2) return ['guild top 3', `{{RIVAL_GUILD}} GvG`];
    if (arc === 3) return ['top 1 server', `{{ANTAGONIST_PRO}} đối đầu`];
    if (arc === 4) return ['esports champion', 'world top 10'];
    if (arc === 5) return ['world champion', 'esports empire'];
    if (arc === 6) return ['game lore reveal', `{{ANCIENT_LORE_NAME}}`];
    return ['{{ENDING_GOAL}}'];
  },
  bigWowFlavor: 'world boss kill / tournament win / server first / face-slap pro mass',
  confrontFlavor: 'GvG / PvP arena / esports match',
  breathingFlavor: 'farming / gear craft / strat planning / dialog với {{COMPANION_NAME}}',
});

export const VONG_DU_TOP_PLAYER_TEMPLATE: TemplateBlueprint = {
  templateId: 'vong-du-top-player-rebirth',
  description: 'Game pro top player trọng sinh — biết hết meta, leo từ rookie → world champion → game admin reveal. 7 arcs.',
  genre: 'vong-du',
  totalChapters: 1000,
  arcs: VONG_DU_TOP_PLAYER_ARC_SKELETON.map((arc, i) => ({ arc, briefs: briefsByArc[i] })),
  requiredVars: [
    'MC_NAME', 'MC_FAMILY', 'HOMETOWN', 'GAME_NAME', 'MC_GAME_CLASS',
    'MC_GAME_NAME', 'REBIRTH_YEAR', 'GUILD_NAME', 'RIVAL_GUILD',
    'ANTAGONIST_PRO', 'COMPANION_NAME', 'ANCIENT_LORE_NAME', 'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Tên MC đời thực — vd "Lý Phong"',
    MC_FAMILY: 'Họ — vd "Lý"',
    HOMETOWN: 'Quê — vd "Hà Nội"',
    GAME_NAME: 'Tên game in-fiction — vd "Cửu Châu Online"',
    MC_GAME_CLASS: 'Class — vd "Kiếm sĩ", "Mage", "Đấu sĩ"',
    MC_GAME_NAME: 'Nick game — vd "Vô Cực Kiếm"',
    REBIRTH_YEAR: 'Năm trọng sinh (game launch) — vd "2025"',
    GUILD_NAME: 'Guild MC lập — vd "Vô Cực Hội"',
    RIVAL_GUILD: 'Guild đối thủ — vd "Hắc Long Hội"',
    ANTAGONIST_PRO: 'Pro player đối thủ — vd "Hắc Long"',
    COMPANION_NAME: 'Co-pilot guild — vd "Tô Linh"',
    ANCIENT_LORE_NAME: 'Lore reveal cosmic — vd "Cửu Châu Tổ Tiên"',
    ENDING_GOAL: 'Đích cuối — vd "World champion + cosmic admin lord"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: cool pro player + meta-aware.',
    'Mode lão lục: meta knowledge dùng kín đáo, không spoil future patches.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter (boss kill, PvP win, gear unlock).',
  ],
  extraBannedPatterns: [
    'CẤM gear/item drop không ledger',
    'CẤM reveal MC trọng sinh trắng trợn',
  ],
  cosmicArcStartChapter: 701,
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'fast-paced',
  spiceLevel: 1,
};
