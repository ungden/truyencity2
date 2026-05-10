/**
 * Di-gioi (otherworld) "lord-builder" master template — 1000-chapter skeleton.
 *
 * Archetype: MC hiện đại được hệ thống chọn, xuyên không vào dị giới
 * như lãnh chúa nhỏ với system "Lord Building" — build territory từ
 * 1 làng → đế quốc, recruit hero / monster / kingdom. Sandbox creator
 * style với time-skip macro.
 *
 * Cảnh giới (lord tiers):
 *   Arc 1 (1-50):    Lãnh chúa thôn → tiểu lãnh chúa (1 làng → 5 làng)
 *   Arc 2 (51-150):  Tiểu lãnh chúa → lãnh chúa châu (10 thị trấn)
 *   Arc 3 (151-300): Châu chúa → đại công quốc (50 thị trấn, 1 thành lớn)
 *   Arc 4 (301-500): Đại công quốc → vương quốc (5 thành, biên giới rộng)
 *   Arc 5 (501-700): Vương quốc → đế quốc (đại lục)
 *   Arc 6 (701-900): Đế quốc → bá chủ đại lục (đối đầu cosmic threat)
 *   Arc 7 (901-1000): Bá chủ → {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_FAMILY}}, {{HOMETOWN}}
 *   {{TERRITORY_NAME}} — Tên lãnh thổ, vd "Vô Cực Lãnh"
 *   {{SYSTEM_NAME}} — System name, vd "Lãnh Chúa Vô Hạn System"
 *   {{ANTAGONIST_KINGDOM}} — Vương quốc đối thủ, vd "Hắc Long Quốc"
 *   {{ANCIENT_DEMON}} — Cosmic demon, vd "Cổ Ma Vương"
 *   {{HERO_RECRUIT}} — Hero unit, vd "Thánh Kỵ Sĩ Arthur"
 *   {{COMPANION_NAME}} — Bạn co-lord, vd "Elaine"
 *   {{CONTINENT_NAME}} — Đại lục, vd "Aetheria"
 *   {{ENDING_GOAL}} — vd "Cosmic Lord overlord"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const DI_GIOI_LORD_BUILDER_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Lãnh chúa thôn — system unlock + first 5 villages',
    corePayoff: '{{TERRITORY_NAME}} mở rộng 5 làng, recruit first hero, build defense vs ngoại địch nhỏ',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — xuyên + system active + làng ổn', payoff: '{{SYSTEM_NAME}} active, làng đầu 100 dân ổn' },
      { number: 2, range: [6, 10], theme: 'Build economy — farm + mine', payoff: 'food + iron, tài chính dương' },
      { number: 3, range: [11, 15], theme: 'First raid — bandit nhỏ', payoff: 'face-slap, bandit fold thành dân' },
      { number: 4, range: [16, 20], theme: 'Recruit first hero unit', payoff: '{{HERO_RECRUIT}} join, sức mạnh tăng' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: chiếm làng kế bên', payoff: '5 làng, dân số 1000' },
      { number: 6, range: [26, 30], theme: 'Build first town center', payoff: 'town tier 1' },
      { number: 7, range: [31, 35], theme: 'Bandit lord lớn tấn công', payoff: 'face-slap, bandit lord xử' },
      { number: 8, range: [36, 40], theme: 'Trade route mở', payoff: 'trade income +50%' },
      { number: 9, range: [41, 45], theme: 'Plant manh mối {{ANCIENT_DEMON}}', payoff: 'plot thread arc 4' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: tiểu lãnh chúa công nhận', payoff: 'tiểu lãnh chúa, sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Châu chúa — 10 thị trấn',
    corePayoff: '{{TERRITORY_NAME}} 10 thị trấn, 1 thành phố, recruit second hero, đối đầu lord khu vực',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Mở rộng 10 thị trấn', payoff: '10 thị trấn, dân số 10K' },
      { number: 2, range: [61, 70], theme: '{{COMPANION_NAME}} kết bạn lord', payoff: 'lord ally + hôn ước' },
      { number: 3, range: [71, 80], theme: 'Lord khu vực ngăn cản', payoff: 'face-slap qua kinh tế warfare' },
      { number: 4, range: [81, 90], theme: 'Build first city + trade hub', payoff: 'city tier 1 + trade hub' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: chiếm city lord khu vực', payoff: '1 city + 10 thị trấn, châu chúa' },
      { number: 6, range: [101, 110], theme: 'Recruit hero archer / mage', payoff: 'hero portfolio 3' },
      { number: 7, range: [111, 120], theme: 'Time-skip 5 năm — economy boom', payoff: 'GDP gấp đôi, dân số 50K' },
      { number: 8, range: [121, 130], theme: 'Liên minh lord khu vực', payoff: 'liên minh 5 lord' },
      { number: 9, range: [131, 140], theme: 'Trận chiến cuối khu vực', payoff: 'all lord khu vực thuần phục' },
      { number: 10, range: [141, 150], theme: 'CLIMAX: châu chúa cấp cao + 50K dân', payoff: 'sẵn sàng arc 3 đại công quốc' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Đại công quốc — 50 thị trấn',
    corePayoff: '{{TERRITORY_NAME}} đại công quốc 50 thị trấn 5 thành, recruit cosmic-tier hero, đối đầu {{ANTAGONIST_KINGDOM}}',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Mở rộng 50 thị trấn + 3 thành', payoff: 'lãnh thổ x5' },
      { number: 2, range: [166, 180], theme: 'Time-skip 5 năm — tech upgrade', payoff: 'tech tier 2, military upgrade' },
      { number: 3, range: [181, 200], theme: '{{ANTAGONIST_KINGDOM}} first contact', payoff: 'face-slap diplomatic' },
      { number: 4, range: [201, 220], theme: 'Recruit cosmic-tier hero', payoff: 'cosmic hero, peak military' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: thắng {{ANTAGONIST_KINGDOM}} skirmish', payoff: 'face-slap kingdom, lãnh thổ +20%' },
      { number: 6, range: [241, 260], theme: 'Build capital city tier 2', payoff: 'capital tier 2, 100K dân' },
      { number: 7, range: [261, 280], theme: 'Liên minh chính phái dị giới', payoff: '5 chính phái ally' },
      { number: 8, range: [281, 295], theme: 'Trận chiến cuối khu vực', payoff: 'đại công quốc công nhận' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: đại công quốc + 200K dân', payoff: 'sẵn sàng arc 4 vương quốc' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Vương quốc — đối đầu {{ANTAGONIST_KINGDOM}}',
    corePayoff: '{{TERRITORY_NAME}} vương quốc, đè bẹp {{ANTAGONIST_KINGDOM}}, manh mối {{ANCIENT_DEMON}}',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Phong vương — đăng quang', payoff: 'vương vị, vương quốc công nhận' },
      { number: 2, range: [321, 340], theme: 'Build royal infrastructure', payoff: 'royal palace + military academy' },
      { number: 3, range: [341, 360], theme: '{{ANTAGONIST_KINGDOM}} mass invasion', payoff: 'phòng thủ thành công' },
      { number: 4, range: [361, 380], theme: 'Counter-attack — chiếm 3 city kingdom', payoff: 'lãnh thổ +30%' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: kingdom capital fall', payoff: '{{ANTAGONIST_KINGDOM}} capital fall' },
      { number: 6, range: [401, 420], theme: 'Time-skip 10 năm — empire prep', payoff: 'lãnh thổ ổn, military peak' },
      { number: 7, range: [421, 440], theme: 'Reveal: {{ANCIENT_DEMON}} sắp tỉnh', payoff: 'plot thread arc 6 plant' },
      { number: 8, range: [441, 460], theme: 'Build defense cosmic-tier', payoff: 'magic shield, ancient artifact' },
      { number: 9, range: [461, 480], theme: 'Tay sai {{ANCIENT_DEMON}} first contact', payoff: 'face-slap demon scout' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: vương quốc + sẵn sàng đế quốc', payoff: '{{ANTAGONIST_KINGDOM}} merge, lãnh thổ x3' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Đế quốc — đại lục thống nhất',
    corePayoff: '{{TERRITORY_NAME}} đế quốc {{CONTINENT_NAME}}, đè bẹp 3 vương quốc còn lại, {{ANCIENT_DEMON}} demon scout bại',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'Phong đế — đăng quang', payoff: 'đế vị, đế quốc' },
      { number: 2, range: [521, 540], theme: 'Mass war 3 vương quốc', payoff: 'first kingdom thuần phục' },
      { number: 3, range: [541, 560], theme: 'Tech revolution - magitech fusion', payoff: 'magitech tier 3' },
      { number: 4, range: [561, 580], theme: 'Recruit demigod hero', payoff: 'demigod hero unit' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: 2 vương quốc thuần phục', payoff: '{{CONTINENT_NAME}} 70% controlled' },
      { number: 6, range: [601, 620], theme: 'Time-skip 10 năm', payoff: 'empire stable, dân số 10M' },
      { number: 7, range: [621, 640], theme: '{{COMPANION_NAME}} hoàng hậu', payoff: 'hoàng triều ổn' },
      { number: 8, range: [641, 660], theme: 'Last vương quốc bại', payoff: '{{CONTINENT_NAME}} 100% MC' },
      { number: 9, range: [661, 680], theme: '{{ANCIENT_DEMON}} demon legion lộ', payoff: 'first major demon battle' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: đế quốc đại lục + sẵn sàng cosmic', payoff: 'sẵn sàng arc 6 cosmic threat' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic threat — {{ANCIENT_DEMON}} tỉnh',
    corePayoff: '{{ANCIENT_DEMON}} tỉnh, MC + đế quốc + heroes liên thủ, hero ascend god, demon body chính lộ',
    subArcs: [
      { number: 1, range: [701, 720], theme: '{{ANCIENT_DEMON}} tỉnh', payoff: 'cosmic threat global' },
      { number: 2, range: [721, 740], theme: 'Investigate ancient ruins', payoff: 'manh mối cosmic origin' },
      { number: 3, range: [741, 760], theme: 'Reveal: dị giới là cosmic battlefield', payoff: 'lore reveal' },
      { number: 4, range: [761, 780], theme: 'Hero ascend god tier', payoff: '{{HERO_RECRUIT}} god' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: liên minh đại lục unite', payoff: 'all factions unite under MC' },
      { number: 6, range: [801, 820], theme: 'Reveal: {{SYSTEM_NAME}} là cosmic admin tool', payoff: 'lore expand, MC root access' },
      { number: 7, range: [821, 840], theme: 'Lập đạo thống multi-realm', payoff: 'đạo thống MC' },
      { number: 8, range: [841, 860], theme: '{{COMPANION_NAME}} ascend cosmic-tier', payoff: 'pháp lữ peak' },
      { number: 9, range: [861, 880], theme: '{{ANCIENT_DEMON}} body chính lộ', payoff: 'final boss xuất hiện' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: cosmic-tier confrontation', payoff: 'sẵn sàng final battle' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, dị giới ổn định, ending warm với {{COMPANION_NAME}} + heroes',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last cosmic threat - hidden admin', payoff: 'phát hiện admin protocol' },
      { number: 2, range: [921, 940], theme: 'Build cosmic-tier solution', payoff: 'plan ready' },
      { number: 3, range: [941, 960], theme: 'Final battle {{ANCIENT_DEMON}} + admin', payoff: 'demon + admin thua' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt', payoff: 'cosmic-tier achievement' },
      { number: 5, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'MC + companions retire, dị giới ổn định, ending warm' },
    ],
  },
];
