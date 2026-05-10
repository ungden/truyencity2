/**
 * Dong-nhan (fanfic) "author-rewrite" master template — 1000-chapter skeleton.
 *
 * Archetype: MC độc giả light novel hiện đại xuyên vào tác phẩm gốc
 * ({{SOURCE_NOVEL}}), mang theo metadata kiến thức nguyên tác, biết hết
 * plot + nhân vật + power-ups. Thay đổi định mệnh nguyên tác để nhân vật
 * ưa thích sống / không bị NTR / cứu world. Hub Space giúp MC vượt giới
 * hạn nguyên tác.
 *
 * Cảnh giới fanfic (custom):
 *   Arc 1 (1-50): Xuyên vào canon, set up identity, save first key event
 *   Arc 2 (51-150): Diverge canon arc 1, mới meta knowledge prove valuable
 *   Arc 3 (151-300): Major canon arc — change BBEG outcome
 *   Arc 4 (301-500): Past canon endpoint — original story finished, MC writing new
 *   Arc 5 (501-700): Multi-world — cross-over với {{SECONDARY_NOVEL}}
 *   Arc 6 (701-900): Author's room reveal — meta-fictional cosmic
 *   Arc 7 (901-1000): {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_PAST_NAME}} (real-world name)
 *   {{SOURCE_NOVEL}} — Tên nguyên tác, vd "Vạn Cổ Thần Vương"
 *   {{ORIGINAL_PROTAGONIST}} — MC nguyên tác, vd "Diệp Phàm"
 *   {{FAVORITE_CHARACTER}} — Nhân vật MC muốn cứu, vd "Tô Lăng"
 *   {{ANTAGONIST_CANON}} — BBEG nguyên tác, vd "Hắc Đế"
 *   {{POWER_SYSTEM}} — Hệ thống power, vd "Võ đạo cửu tầng"
 *   {{HUB_SPACE_NAME}} — Hub space, vd "Vô Hạn Thư Viện"
 *   {{SECONDARY_NOVEL}} — Cross-over LN, vd "Linh Vực Đại Đế"
 *   {{COMPANION_NAME}}, {{ENDING_GOAL}}
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const DONG_NHAN_REWRITE_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Xuyên vào {{SOURCE_NOVEL}} — set up identity + first save',
    corePayoff: '{{MC_NAME}} xuyên vào canon, kết bạn {{ORIGINAL_PROTAGONIST}}, cứu {{FAVORITE_CHARACTER}} khỏi event đầu, hub space {{HUB_SPACE_NAME}} active',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline xuyên + meta knowledge active', payoff: 'identity setup, hub space active' },
      { number: 2, range: [6, 10], theme: 'Gặp {{ORIGINAL_PROTAGONIST}} canon style', payoff: 'kết bạn nguyên tác MC' },
      { number: 3, range: [11, 15], theme: 'First canon event — {{FAVORITE_CHARACTER}} bị nguy hiểm', payoff: 'cứu thành công, divergence từ canon' },
      { number: 4, range: [16, 20], theme: 'Hub space {{HUB_SPACE_NAME}} unlock tài nguyên', payoff: 'tài nguyên không-canon' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: tỷ thí canon, MC top', payoff: 'meta knowledge advantage visible' },
      { number: 6, range: [26, 30], theme: 'Plant manh mối {{ANTAGONIST_CANON}}', payoff: 'plot thread arc 3 plant' },
      { number: 7, range: [31, 35], theme: 'Canon villain side — first encounter', payoff: 'face-slap qua biết weakness' },
      { number: 8, range: [36, 40], theme: '{{POWER_SYSTEM}} đột phá đầu — meta tăng tốc', payoff: 'realm 2, ngang {{ORIGINAL_PROTAGONIST}}' },
      { number: 9, range: [41, 45], theme: 'Save second canon character', payoff: '{{FAVORITE_CHARACTER}} stable, character bond' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: divergence point lock-in', payoff: 'canon arc 1 đã lệch, MC dẫn dắt' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Diverge canon arc 1 — meta knowledge tested',
    corePayoff: 'MC + {{ORIGINAL_PROTAGONIST}} đoàn đội mạnh hơn canon, {{FAVORITE_CHARACTER}} tu luyện peak, {{ANTAGONIST_CANON}} kế hoạch lộ',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Lập đoàn đội — phá canon dynamic', payoff: 'team 5 chính, không single-MC' },
      { number: 2, range: [61, 70], theme: '{{COMPANION_NAME}} fanon character add', payoff: 'companion mới, không có canon' },
      { number: 3, range: [71, 80], theme: 'Canon arc 1 climax replay - lệch outcome', payoff: 'BBEG nhỏ thua sớm hơn canon' },
      { number: 4, range: [81, 90], theme: 'Hub space cấp 2 unlock', payoff: 'cross-world tài nguyên' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: đoàn đội face-slap canon đối thủ', payoff: 'mass face-slap, danh tiếng canon world' },
      { number: 6, range: [101, 110], theme: '{{ANTAGONIST_CANON}} kế hoạch lộ qua meta', payoff: 'plot thread advance' },
      { number: 7, range: [111, 120], theme: '{{FAVORITE_CHARACTER}} đột phá — không bị NTR canon', payoff: 'character arc save' },
      { number: 8, range: [121, 130], theme: 'Canon đại kiếp đầu — đoàn đội thắng', payoff: 'thiên hạ ổn, canon timeline đổi' },
      { number: 9, range: [131, 140], theme: 'Reveal: {{ANTAGONIST_CANON}} có meta awareness', payoff: 'plot twist — kẻ địch biết MC fanfic' },
      { number: 10, range: [141, 150], theme: 'CLIMAX: canon arc 2 lệch hoàn toàn', payoff: 'arc 2 không giống canon, MC chuẩn bị BBEG' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Canon major arc — đối phó {{ANTAGONIST_CANON}}',
    corePayoff: '{{ANTAGONIST_CANON}} bại sớm hơn canon, {{ORIGINAL_PROTAGONIST}} arc complete với {{FAVORITE_CHARACTER}}, MC team đỉnh',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Canon major arc opening', payoff: 'đoàn đội ready cho BBEG' },
      { number: 2, range: [166, 180], theme: '{{ANTAGONIST_CANON}} mass attack', payoff: 'phòng thủ thành công' },
      { number: 3, range: [181, 200], theme: 'Meta knowledge + hub space combo', payoff: 'face-slap BBEG generals' },
      { number: 4, range: [201, 220], theme: '{{FAVORITE_CHARACTER}} không chết - canon đổi', payoff: 'character preserved' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: trận chiến BBEG', payoff: '{{ANTAGONIST_CANON}} thua, canon outcome đổi' },
      { number: 6, range: [241, 260], theme: 'Canon arc 3 tiếp theo - chuẩn bị sớm', payoff: 'meta advantage' },
      { number: 7, range: [261, 280], theme: '{{ORIGINAL_PROTAGONIST}} đỉnh power canon', payoff: 'protagonist reaches canon peak sớm' },
      { number: 8, range: [281, 295], theme: 'Reveal: cosmic-tier antagonist beyond canon', payoff: 'plot thread arc 4 plant' },
      { number: 9, range: [296, 300], theme: 'CLIMAX: canon major arc closed sớm', payoff: 'world saved, MC rảnh viết tiếp' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Past canon endpoint — MC writes original arc',
    corePayoff: 'MC + team vượt canon ending, viết arc mới hoàn toàn, {{ORIGINAL_PROTAGONIST}} retire, MC trở thành lead',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Canon endpoint — MC tự viết tiếp', payoff: 'original arc start' },
      { number: 2, range: [321, 340], theme: 'World expand beyond canon', payoff: 'new continents revealed' },
      { number: 3, range: [341, 360], theme: 'Cosmic-tier first contact', payoff: 'first contact cosmic threat' },
      { number: 4, range: [361, 380], theme: '{{ORIGINAL_PROTAGONIST}} retire ending warm', payoff: 'protagonist arc complete' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: MC trở thành lead world', payoff: 'lead position, danh tiếng cosmic' },
      { number: 6, range: [401, 420], theme: 'Cosmic threat escalate', payoff: 'kế hoạch chống cosmic ready' },
      { number: 7, range: [421, 440], theme: 'Hub space cấp 3', payoff: 'cross-world tài nguyên peak' },
      { number: 8, range: [441, 460], theme: 'Trận chiến cosmic-tier nhỏ', payoff: 'face-slap cosmic minor' },
      { number: 9, range: [461, 480], theme: 'Reveal: {{SECONDARY_NOVEL}} crossover', payoff: 'cross-novel plot thread' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: MC cosmic-tier + crossover ready', payoff: 'sẵn sàng arc 5 multi-world' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Multi-world — crossover {{SECONDARY_NOVEL}}',
    corePayoff: 'MC team vào {{SECONDARY_NOVEL}}, save key characters, fusion power-ups, đại lục crossover',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'Vào {{SECONDARY_NOVEL}}', payoff: 'second canon entered' },
      { number: 2, range: [521, 540], theme: 'Save {{SECONDARY_NOVEL}} key character', payoff: 'character bond, divergence' },
      { number: 3, range: [541, 560], theme: 'Fusion power: combo {{POWER_SYSTEM}} + secondary', payoff: 'fusion realm, sức mạnh peak' },
      { number: 4, range: [561, 580], theme: 'Crossover BBEG appears', payoff: 'cosmic threat unite both worlds' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: cross-world team formed', payoff: '5 chính + 5 secondary, đại lục công nhận' },
      { number: 6, range: [601, 620], theme: 'Hub space link multi-worlds', payoff: 'multi-world Hub stable' },
      { number: 7, range: [621, 640], theme: '{{COMPANION_NAME}} cross-world peak', payoff: 'companion peak realm' },
      { number: 8, range: [641, 660], theme: 'Crossover BBEG arc finale', payoff: 'BBEG bại, multi-world peace' },
      { number: 9, range: [661, 680], theme: 'Reveal: meta-fictional layer above', payoff: 'plot thread arc 6 author room' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: multi-world thống nhất', payoff: 'sẵn sàng arc 6 author room' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Author\'s room — meta-fictional cosmic',
    corePayoff: 'MC vào author\'s room (real-world canon writer), reveal MC là độc giả original, cosmic showdown',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Author room reveal', payoff: 'reveal lore: ai viết canon' },
      { number: 2, range: [721, 740], theme: 'MC chân tướng độc giả ăn năn', payoff: 'self-awareness' },
      { number: 3, range: [741, 760], theme: 'Reveal: {{ANTAGONIST_CANON}} là OC author từ chối', payoff: 'meta lore' },
      { number: 4, range: [761, 780], theme: 'Cosmic battle với author OC', payoff: 'face-slap meta' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: hack canon code', payoff: 'reality manipulation' },
      { number: 6, range: [801, 820], theme: 'Reveal: MC có quyền viết canon', payoff: 'MC trở thành author' },
      { number: 7, range: [821, 840], theme: 'Lập đạo thống multi-world', payoff: 'đạo thống MC, đệ tử kế thừa' },
      { number: 8, range: [841, 860], theme: '{{COMPANION_NAME}} meta-aware', payoff: 'companion meta-aware' },
      { number: 9, range: [861, 880], theme: 'Author OC final body lộ', payoff: 'kẻ địch chính' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: MC author', payoff: 'sẵn sàng final battle' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, multi-world ổn định, ending warm với {{COMPANION_NAME}} + {{FAVORITE_CHARACTER}}',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last meta threat', payoff: 'phát hiện cosmic admin' },
      { number: 2, range: [921, 940], theme: 'Build cosmic-tier solution', payoff: 'plan ready' },
      { number: 3, range: [941, 960], theme: 'Final battle author OC', payoff: 'BBEG meta thua' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt', payoff: 'multi-world cosmic peace' },
      { number: 5, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'MC + companions retire, multi-world ổn, ending warm' },
    ],
  },
];
