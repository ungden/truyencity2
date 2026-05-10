/**
 * Mat-the (post-apocalypse) "doomsday-hoarder" master template — 1000-chapter skeleton.
 *
 * Archetype: MC trọng sinh từ tương lai (post-apocalypse) về 7 ngày
 * trước doomsday event ({{DOOMSDAY_DATE}}). Biết hết: zombie outbreak
 * timing, safe zones, hidden caches, future enemies. Hoarding tài
 * nguyên + xây căn cứ + cứu gia đình + thành lập community → bá chủ
 * hậu tận thế.
 *
 * Cảnh giới (rank survivor):
 *   Arc 1 (1-50):    7 days warning → outbreak day 1-30 (lone wolf → tiny group)
 *   Arc 2 (51-150):  Day 30-day 180 (group → community 100)
 *   Arc 3 (151-300): Day 180-day 365 (community → settlement 1000)
 *   Arc 4 (301-500): Year 1-year 3 (settlement → mini-city, zombie evolution)
 *   Arc 5 (501-700): Year 3-year 5 (mini-city → city, alien reveal)
 *   Arc 6 (701-900): Year 5-year 10 (city → đại lục, cosmic threat)
 *   Arc 7 (901-1000): Year 10+ → {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_FAMILY}}, {{HOMETOWN}}
 *   {{DOOMSDAY_DATE}} — Vd "20 tháng 6 năm 2025"
 *   {{SAFE_ZONE_NAME}} — Tên căn cứ, vd "Vô Cực Cứ Điểm"
 *   {{ANTAGONIST_FACTION}} — Faction đối thủ, vd "Hắc Long Hội"
 *   {{COSMIC_THREAT}} — Cosmic threat, vd "Cổ Ma Tinh Tộc"
 *   {{COMPANION_NAME}} — Bạn co-survivor, vd "Tô Linh"
 *   {{CITY_NAME}} — Thành phố, vd "Sài Gòn"
 *   {{ENDING_GOAL}} — Vd "Cosmic Guardian + nhân loại reborn"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const MAT_THE_HOARDER_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: '7 days warning → outbreak day 1-30',
    corePayoff: 'MC hoard đủ supplies cho 1 năm, cứu gia đình + 5 sống sót, build first safe zone',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — tỉnh dậy 7 days before, hoard supply', payoff: 'food + gun + meds tích lũy, family alerted ngầm' },
      { number: 2, range: [6, 10], theme: 'Day 6 - last hoard run', payoff: 'final supply, weapon cache hidden' },
      { number: 3, range: [11, 15], theme: 'Day 1 outbreak — chaos', payoff: 'family safe, neighborhood zombies xử' },
      { number: 4, range: [16, 20], theme: 'Day 5 — gather first survivors', payoff: '5 survivor recruited, group of 8' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: thắng zombie horde đầu', payoff: 'mass kill 100 zombies, area cleared' },
      { number: 6, range: [26, 30], theme: 'Build safe zone first iteration', payoff: '{{SAFE_ZONE_NAME}} cấp 1, walls + sentries' },
      { number: 7, range: [31, 35], theme: 'Bandit faction first contact', payoff: 'face-slap qua firepower, bandit nhỏ xử' },
      { number: 8, range: [36, 40], theme: 'Day 25 — mutant zombie xuất hiện', payoff: 'first mutant kill, manh mối evolution' },
      { number: 9, range: [41, 45], theme: 'Plant manh mối {{COSMIC_THREAT}}', payoff: 'plot thread arc 5 plant' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: Day 30 — group of 20 ổn định', payoff: 'safe zone cấp 1 stable, sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Day 30-180 — community 100',
    corePayoff: '{{SAFE_ZONE_NAME}} cộng đồng 100, đè bẹp bandit khu vực, recruit specialist (doctor / engineer / soldier)',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Mở rộng safe zone — recruit 20 more', payoff: 'community 50' },
      { number: 2, range: [61, 70], theme: '{{COMPANION_NAME}} kết bạn (specialist)', payoff: 'doctor / engineer ally' },
      { number: 3, range: [71, 80], theme: 'Bandit khu vực mass attack', payoff: 'phòng thủ thành công' },
      { number: 4, range: [81, 90], theme: 'Build infrastructure — farm + water', payoff: 'self-sustained' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: chiếm bandit fortress', payoff: 'community 100, lãnh thổ +50%' },
      { number: 6, range: [101, 110], theme: '{{ANTAGONIST_FACTION}} first contact', payoff: 'faction lớn xuất hiện' },
      { number: 7, range: [111, 120], theme: 'Mutant zombie wave 2', payoff: 'mass kill mutants' },
      { number: 8, range: [121, 130], theme: 'Build research lab', payoff: 'mutant research start' },
      { number: 9, range: [131, 140], theme: '{{ANTAGONIST_FACTION}} mass invasion', payoff: 'phòng thủ + counter-attack' },
      { number: 10, range: [141, 150], theme: 'CLIMAX: community 200 + tech tier 2', payoff: 'sẵn sàng settlement arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Day 180-365 — settlement 1000',
    corePayoff: 'Settlement 1000 dân, đè bẹp {{ANTAGONIST_FACTION}} cấp khu vực, mutant evolution research breakthrough',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Mở rộng settlement', payoff: 'dân số 500' },
      { number: 2, range: [166, 180], theme: 'Tech tier 2 — electric + ham radio', payoff: 'communication network' },
      { number: 3, range: [181, 200], theme: '{{ANTAGONIST_FACTION}} cấp khu vực attack', payoff: 'face-slap qua tech' },
      { number: 4, range: [201, 220], theme: 'Mutant research breakthrough', payoff: 'mutant weakness identified' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: dân số 1000 + lãnh thổ x3', payoff: 'mass settlement công nhận khu vực' },
      { number: 6, range: [241, 260], theme: 'Liên minh settlement khu vực', payoff: '5 settlement liên minh dưới MC' },
      { number: 7, range: [261, 280], theme: 'Mutant horde mass — evolved tier 2', payoff: 'mass kill mutant tier 2' },
      { number: 8, range: [281, 295], theme: 'Trận chiến cuối khu vực', payoff: '{{ANTAGONIST_FACTION}} khu vực bại' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: settlement 1000 + tech 2', payoff: 'sẵn sàng arc 4 mini-city' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Year 1-3 — mini-city, zombie evolution',
    corePayoff: 'Mini-city 5000, đè bẹp {{ANTAGONIST_FACTION}} cấp đại, mutant tier 3 (cosmic-aware), reveal {{COSMIC_THREAT}}',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Mini-city build', payoff: 'city tier 1, dân số 3000' },
      { number: 2, range: [321, 340], theme: 'Tech tier 3 — bio-weapon', payoff: 'anti-mutant bio-weapon' },
      { number: 3, range: [341, 360], theme: '{{ANTAGONIST_FACTION}} mass war', payoff: 'phòng thủ + counter' },
      { number: 4, range: [361, 380], theme: 'Mutant tier 3 - cosmic-aware', payoff: 'first cosmic-aware mutant kill' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: chiếm {{ANTAGONIST_FACTION}} HQ', payoff: 'faction bại, lãnh thổ x2' },
      { number: 6, range: [401, 420], theme: 'Reveal: {{COSMIC_THREAT}} là cause của zombie', payoff: 'plot thread arc 5 advance' },
      { number: 7, range: [421, 440], theme: 'Build cosmic-tier defense', payoff: 'magic shield + bio-tech' },
      { number: 8, range: [441, 460], theme: 'First {{COSMIC_THREAT}} scout', payoff: 'face-slap scout' },
      { number: 9, range: [461, 480], theme: 'Mass mutant tier 3 invasion', payoff: 'mass defense success' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: mini-city + tech 3 + reveal cosmic', payoff: 'sẵn sàng city arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Year 3-5 — city, alien reveal',
    corePayoff: 'City 50K, alien {{COSMIC_THREAT}} reveal, MC liên minh global survivors, tech tier 4',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'City expansion — 10K dân', payoff: 'city tier 2' },
      { number: 2, range: [521, 540], theme: '{{COSMIC_THREAT}} mothership reveal', payoff: 'first contact alien' },
      { number: 3, range: [541, 560], theme: 'Tech tier 4 - alien tech reverse engineer', payoff: 'alien tech tier 1' },
      { number: 4, range: [561, 580], theme: 'Liên minh global survivors', payoff: '20 cities liên minh dưới MC' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: thắng alien scout legion', payoff: 'face-slap alien scout, danh tiếng global' },
      { number: 6, range: [601, 620], theme: '{{COMPANION_NAME}} ascend specialist peak', payoff: 'pháp lữ peak' },
      { number: 7, range: [621, 640], theme: 'Build cosmic-tier defense - alien tech fusion', payoff: 'tech tier 4 peak' },
      { number: 8, range: [641, 660], theme: 'Alien legion mass invasion', payoff: 'phòng thủ + counter' },
      { number: 9, range: [661, 680], theme: 'Alien legion bại', payoff: 'alien lui retreat' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: city 50K + global liên minh', payoff: 'sẵn sàng arc 6 đại lục' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Year 5-10 — đại lục, cosmic threat',
    corePayoff: 'Đại lục liên minh, cosmic threat reveal, alien mothership confront, MC cosmic-aware',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Đại lục chuyến hành quân', payoff: '50 cities liên minh' },
      { number: 2, range: [721, 740], theme: 'Investigate cosmic origin', payoff: 'manh mối origin' },
      { number: 3, range: [741, 760], theme: 'Reveal: trái đất là alien farm', payoff: 'lore reveal' },
      { number: 4, range: [761, 780], theme: 'Trận chiến cosmic minor', payoff: 'face-slap cosmic minor' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: hack alien mothership', payoff: 'reality manipulation' },
      { number: 6, range: [801, 820], theme: 'Reveal: MC trọng sinh là cosmic experiment', payoff: 'lore expand' },
      { number: 7, range: [821, 840], theme: 'Lập đạo thống multi-realm', payoff: 'đạo thống' },
      { number: 8, range: [841, 860], theme: '{{COMPANION_NAME}} cosmic-aware', payoff: 'pháp lữ peak' },
      { number: 9, range: [861, 880], theme: 'Cosmic admin body chính lộ', payoff: 'final boss' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: đại lục liên minh + cosmic-tier', payoff: 'sẵn sàng final battle' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, nhân loại reborn, ending warm',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last cosmic protocol', payoff: 'phát hiện protocol' },
      { number: 2, range: [921, 940], theme: 'Build cosmic-tier solution', payoff: 'plan ready' },
      { number: 3, range: [941, 960], theme: 'Final battle cosmic admin', payoff: 'admin thua' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt', payoff: 'cosmic-tier achievement' },
      { number: 5, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'MC + companions retire, nhân loại reborn, ending warm' },
    ],
  },
];
