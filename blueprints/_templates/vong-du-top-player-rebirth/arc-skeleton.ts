/**
 * Vong-du "top-player-rebirth" master template — 1000-chapter skeleton.
 *
 * Archetype: MC tu thủ pro game {{GAME_NAME}} kiếp trước (top 1 server),
 * trọng sinh về {{REBIRTH_YEAR}} — ngày game launch. Biết hết meta,
 * boss strategy, hidden quest, future patch. Build từ rookie → guild
 * leader → server #1 → competitive scene god → world champion.
 *
 * Cảnh giới game (custom):
 *   Arc 1 (1-50):    Beta/launch day — solo grinding lvl 1-30
 *   Arc 2 (51-150):  Guild building — lvl 30-60, raid 1-tier
 *   Arc 3 (151-300): Server top — raid 2-tier, đối đầu rival guild
 *   Arc 4 (301-500): Quốc tế — competitive scene + esports
 *   Arc 5 (501-700): World champion — international tournament
 *   Arc 6 (701-900): Game lore reveal — game thực tế simulation
 *   Arc 7 (901-1000): {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_FAMILY}}, {{HOMETOWN}}
 *   {{GAME_NAME}} — Tên game, vd "Cửu Châu Online"
 *   {{MC_GAME_CLASS}} — Class MC, vd "Kiếm sĩ", "Đấu sĩ"
 *   {{MC_GAME_NAME}} — Nick game, vd "Vô Cực Kiếm"
 *   {{REBIRTH_YEAR}} — Năm trọng sinh, vd "2025"
 *   {{GUILD_NAME}} — Guild MC lập, vd "Vô Cực Hội"
 *   {{RIVAL_GUILD}} — Guild đối thủ, vd "Hắc Long Hội"
 *   {{ANTAGONIST_PRO}} — Pro player đối thủ, vd "Hắc Long"
 *   {{COMPANION_NAME}} — Bạn co-pilot guild, vd "Tô Linh"
 *   {{ANCIENT_LORE_NAME}} — Lore reveal, vd "Cửu Châu Tổ Tiên"
 *   {{ENDING_GOAL}} — vd "World champion + game lore complete"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const VONG_DU_TOP_PLAYER_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Trọng sinh về {{GAME_NAME}} launch — solo grinding',
    corePayoff: '{{MC_NAME}} top 10 server cấp 30, hidden quest đầu tiên, gặp {{COMPANION_NAME}}, manh mối {{RIVAL_GUILD}}',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — login day 1, meta knowledge active', payoff: 'lvl 5, hidden item đầu tiên' },
      { number: 2, range: [6, 10], theme: 'Speed-run early quest', payoff: 'lvl 15, gear tier 1' },
      { number: 3, range: [11, 15], theme: 'First face-slap — đối thủ pro newbie', payoff: 'PvP win, danh tiếng forum' },
      { number: 4, range: [16, 20], theme: 'Hidden quest unlock — gear unique', payoff: 'gear pre-meta, top 100 server' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: solo dungeon run đầu tiên', payoff: 'top 10 server, gear epic' },
      { number: 6, range: [26, 30], theme: 'Gặp {{COMPANION_NAME}} — co-pilot', payoff: 'partner raid + farm' },
      { number: 7, range: [31, 35], theme: '{{RIVAL_GUILD}} member khinh thường', payoff: 'face-slap PvP, rival guild lộ' },
      { number: 8, range: [36, 40], theme: 'Lvl 30 - mở dungeon 1-tier', payoff: 'first raid clear với companion' },
      { number: 9, range: [41, 45], theme: 'Plant manh mối {{ANCIENT_LORE_NAME}}', payoff: 'plot thread arc 6 plant' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: top 5 server cấp 30', payoff: 'sẵn sàng lập guild arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Lập {{GUILD_NAME}} — guild war',
    corePayoff: '{{GUILD_NAME}} top 3 server, raid 1-tier clear all, đè bẹp {{RIVAL_GUILD}}, cấp 60',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Lập guild + recruit core team', payoff: 'guild 30 thành viên' },
      { number: 2, range: [61, 70], theme: 'Speed-run cấp 30-50', payoff: 'lvl 50, gear tier 2' },
      { number: 3, range: [71, 80], theme: '{{RIVAL_GUILD}} tổ chức GvG đầu', payoff: 'first GvG win' },
      { number: 4, range: [81, 90], theme: 'Raid 1-tier clear with meta strat', payoff: 'gear tier 3, server first kill' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: World boss kill', payoff: 'world boss đầu tiên, server công nhận' },
      { number: 6, range: [101, 110], theme: '{{ANTAGONIST_PRO}} guild leader xuất hiện', payoff: 'first contact pro player' },
      { number: 7, range: [111, 120], theme: 'Hidden lore quest — manh mối {{ANCIENT_LORE_NAME}}', payoff: 'lore advance' },
      { number: 8, range: [121, 130], theme: 'Guild expand 100 thành viên', payoff: 'guild infrastructure' },
      { number: 9, range: [131, 140], theme: 'Trận GvG cuối server', payoff: '{{RIVAL_GUILD}} bại, top 3 server' },
      { number: 10, range: [141, 150], theme: 'CLIMAX: cấp 60 + top 3 server', payoff: 'sẵn sàng raid 2-tier' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Server top — raid 2-tier',
    corePayoff: '{{GUILD_NAME}} top 1 server, raid 2-tier clear, đối đầu {{ANTAGONIST_PRO}} top 1',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Raid 2-tier mở', payoff: 'first attempt' },
      { number: 2, range: [166, 180], theme: 'Speed-run gear tier 4', payoff: 'gear peak meta' },
      { number: 3, range: [181, 200], theme: '{{ANTAGONIST_PRO}} guild war', payoff: 'GvG vs top 1, MC win nhỏ' },
      { number: 4, range: [201, 220], theme: 'Hidden boss kill - server first', payoff: 'gear unique tier 5' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: top 1 server cấp 80', payoff: 'top 1 confirmed, danh tiếng quốc tế' },
      { number: 6, range: [241, 260], theme: '{{ANTAGONIST_PRO}} mass attack', payoff: 'face-slap qua meta strat' },
      { number: 7, range: [261, 280], theme: 'World event - server hợp tác', payoff: 'world event win, server-wide reward' },
      { number: 8, range: [281, 295], theme: 'Trận chiến cuối server top', payoff: '{{ANTAGONIST_PRO}} bại, M&A guild' },
      { number: 9, range: [296, 300], theme: 'CLIMAX: top 1 server tuyệt đối', payoff: 'sẵn sàng quốc tế arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Quốc tế — competitive esports',
    corePayoff: '{{MC_NAME}} esports champion, đại diện quốc gia, top 10 thế giới, đối đầu pro players quốc tế',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Tham gia esports tournament', payoff: 'qualified vòng quốc gia' },
      { number: 2, range: [321, 340], theme: 'Vòng quốc gia win - đại diện', payoff: 'quốc gia champion' },
      { number: 3, range: [341, 360], theme: 'Pro players quốc tế first contact', payoff: 'face-slap qua meta knowledge' },
      { number: 4, range: [361, 380], theme: 'Tournament regional win', payoff: 'top 10 thế giới' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: regional champion', payoff: 'regional champion, world top 10' },
      { number: 6, range: [401, 420], theme: 'Liên minh pro players ủng hộ MC', payoff: 'pro players network' },
      { number: 7, range: [421, 440], theme: 'Guild quốc tế multi-server', payoff: 'multi-server presence' },
      { number: 8, range: [441, 460], theme: 'Trận chiến quốc tế semi-final', payoff: 'top 4 thế giới' },
      { number: 9, range: [461, 480], theme: 'Reveal: game lore thật là cosmic experiment', payoff: 'plot thread arc 6' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: top 4 thế giới', payoff: 'sẵn sàng world champion' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'World champion + game-tech revolution',
    corePayoff: 'World champion, dẫn dắt cách mạng game-tech, {{COMPANION_NAME}} co-champion, đè bẹp pro circuit',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'World final tournament', payoff: 'World champion!' },
      { number: 2, range: [521, 540], theme: 'Pro circuit lead — meta dictate', payoff: 'meta của MC dẫn dắt' },
      { number: 3, range: [541, 560], theme: 'Gear hidden tier 6 - MC server first', payoff: 'gear cosmic-tier' },
      { number: 4, range: [561, 580], theme: 'Build esports company', payoff: 'company top 1 esports' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: 2-peat world champion', payoff: '2nd world title, immortal status' },
      { number: 6, range: [601, 620], theme: '{{COMPANION_NAME}} co-champion', payoff: 'pháp lữ peak' },
      { number: 7, range: [621, 640], theme: 'Game-tech revolution - VR2.0', payoff: 'VR2.0 launch dẫn dắt MC' },
      { number: 8, range: [641, 660], theme: 'Mass M&A esports companies', payoff: 'esports empire' },
      { number: 9, range: [661, 680], theme: 'World tour 30 nước', payoff: 'global recognition' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: world champion + esports empire', payoff: 'sẵn sàng game lore arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Game lore reveal — simulation theory',
    corePayoff: 'Reveal: {{GAME_NAME}} là cosmic simulation, {{ANCIENT_LORE_NAME}} thật, MC chân tướng cosmic-tier',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Game lore deep dive', payoff: 'first contact ancient lore' },
      { number: 2, range: [721, 740], theme: 'Investigate cosmic ruins in-game', payoff: 'manh mối cosmic origin' },
      { number: 3, range: [741, 760], theme: 'Reveal: game thực tế simulation', payoff: 'lore reveal' },
      { number: 4, range: [761, 780], theme: 'Trận chiến game admin', payoff: 'face-slap admin tay sai' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: hack game admin layer', payoff: 'reality manipulation' },
      { number: 6, range: [801, 820], theme: 'Reveal: pro players là cosmic candidates', payoff: 'lore expand' },
      { number: 7, range: [821, 840], theme: 'Lập đạo thống multi-server', payoff: 'guild multi-server peak' },
      { number: 8, range: [841, 860], theme: '{{COMPANION_NAME}} cosmic-aware', payoff: 'pháp lữ cosmic peak' },
      { number: 9, range: [861, 880], theme: 'Cosmic admin body lộ', payoff: 'kẻ địch chính' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: cosmic-tier confrontation', payoff: 'sẵn sàng final battle' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, simulation freed, ending warm với {{COMPANION_NAME}} + guild',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last admin protocol', payoff: 'phát hiện admin protocol' },
      { number: 2, range: [921, 940], theme: 'Build cosmic-tier solution', payoff: 'plan ready' },
      { number: 3, range: [941, 960], theme: 'Final battle cosmic admin', payoff: 'admin thua' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt', payoff: 'cosmic-tier achievement' },
      { number: 5, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'MC + companions retire, simulation freed, ending warm' },
    ],
  },
];
