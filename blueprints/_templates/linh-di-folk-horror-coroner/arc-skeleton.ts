/**
 * Linh-di "folk-horror-coroner" master template — 1000-chapter skeleton.
 *
 * Archetype: MC ngỗ tác (forensic examiner cổ đại) hoặc thợ pháp / âm
 * dương sư hiện đại, kế thừa nghề từ tổ tiên (sách quái sự / la bàn /
 * bùa chú), giải mã quái sự và đối phó tà ma từ làng → thành → đại lục.
 * Folk-horror tone với uncanny rules + ngỗ tác procedural.
 *
 * Cảnh giới (rank thợ pháp):
 *   Arc 1 (1-50):    Tập sự ngỗ tác → ngỗ tác cấp 3 (làng → huyện)
 *   Arc 2 (51-150):  Cấp 3 → cấp 5 (huyện → phủ)
 *   Arc 3 (151-300): Cấp 5 → đại sư (phủ → kinh thành)
 *   Arc 4 (301-500): Đại sư → tông sư (kinh thành → đại lục)
 *   Arc 5 (501-700): Tông sư → cao thủ (cosmic-tier quái sự)
 *   Arc 6 (701-900): Cao thủ → thiên sư (chân tướng tà thần)
 *   Arc 7 (901-1000): Thiên sư → {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_FAMILY}}, {{HOMETOWN}}
 *   {{ANCESTOR_NAME}} — Tổ tiên thợ pháp, vd "Cố Tổ"
 *   {{LINEAGE_NAME}} — Dòng pháp, vd "Cố thị Âm Dương"
 *   {{SIGNATURE_TOOL}} — Vật bí truyền, vd "Tử La Bàn"
 *   {{ANTAGONIST_LINEAGE}} — Dòng pháp đối thủ, vd "Hắc Liên giáo"
 *   {{ANCIENT_EVIL}} — Cosmic tà thần, vd "Cửu U Tà Đế"
 *   {{COMPANION_NAME}} — Đệ tử / partner, vd "Tô Linh"
 *   {{CITY_NAME}}, {{ENDING_GOAL}}
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const LINH_DI_CORONER_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Làng quê {{HOMETOWN}} — quái sự đầu tiên',
    corePayoff: '{{MC_NAME}} kế thừa {{LINEAGE_NAME}}, giải 5 quái sự huyện, đối phó {{ANTAGONIST_LINEAGE}} đệ tử nhỏ',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — tổ tiên truyền nghề + first quái sự nhỏ', payoff: '{{SIGNATURE_TOOL}} active, manh mối tổ tiên' },
      { number: 2, range: [6, 10], theme: 'Quái sự thứ 2 — ma làng', payoff: 'giải bằng nguyên tắc, dân làng tin tưởng' },
      { number: 3, range: [11, 15], theme: '{{ANTAGONIST_LINEAGE}} đệ tử ám hại', payoff: 'face-slap qua quy tắc dòng pháp' },
      { number: 4, range: [16, 20], theme: 'Quái sự thứ 3 — corpse coroner', payoff: 'ngỗ tác procedural, bằng chứng' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: phá đại quái sự huyện', payoff: 'huyện công nhận, đệ tử cấp 2' },
      { number: 6, range: [26, 30], theme: 'Plant manh mối {{ANCIENT_EVIL}}', payoff: 'plot thread arc 5 plant' },
      { number: 7, range: [31, 35], theme: 'Quái sự thứ 5 — vong hồn nội tộc', payoff: 'tổ tiên di niệm xuất hiện' },
      { number: 8, range: [36, 40], theme: 'Đệ tử cấp 3 — phủ chú ý', payoff: 'phủ mời, danh tiếng' },
      { number: 9, range: [41, 45], theme: '{{ANTAGONIST_LINEAGE}} chi nhánh tổ chức tấn công', payoff: 'face-slap, chi nhánh xử' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: cấp 3 + lên phủ', payoff: 'sẵn sàng arc 2 phủ' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Phủ {{CITY_NAME}} — quái sự cấp đại',
    corePayoff: 'Cấp 5, giải 10 quái sự cấp đại, gặp {{COMPANION_NAME}}, manh mối {{ANTAGONIST_LINEAGE}} cấp tổ',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Đến phủ — gặp các thợ pháp', payoff: 'network thợ pháp' },
      { number: 2, range: [61, 70], theme: '{{COMPANION_NAME}} kết bạn (đệ tử)', payoff: 'đệ tử + partner' },
      { number: 3, range: [71, 80], theme: 'Quái sự cấp đại đầu — chợ ma', payoff: 'face-slap qua quy tắc, khu chợ giải' },
      { number: 4, range: [81, 90], theme: 'Quái sự thứ 2 — đại tộc ma', payoff: 'gia tộc ma giải, tộc nhân giải thoát' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: phá đại quái sự phủ', payoff: 'cấp 4, phủ công nhận' },
      { number: 6, range: [101, 110], theme: '{{ANTAGONIST_LINEAGE}} cấp tổ first contact', payoff: 'first contact đối thủ cấp tổ' },
      { number: 7, range: [111, 120], theme: 'Quái sự cấp đại 4-5', payoff: 'face-slap, dân chúng tôn vinh' },
      { number: 8, range: [121, 130], theme: 'Manh mối {{ANCIENT_EVIL}} chuẩn bị tỉnh', payoff: 'plot thread advance' },
      { number: 9, range: [131, 140], theme: 'Trận chiến cuối phủ', payoff: '{{ANTAGONIST_LINEAGE}} chi nhánh phủ tan' },
      { number: 10, range: [141, 150], theme: 'CLIMAX: cấp 5 + lên kinh thành', payoff: 'sẵn sàng arc 3 kinh thành' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Kinh thành — quái sự đại lục',
    corePayoff: 'Đại sư, giải 15 quái sự đại lục, lập tông phái, đối đầu {{ANTAGONIST_LINEAGE}} cấp tông',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Đến kinh thành — gặp các tông phái', payoff: 'network kinh thành' },
      { number: 2, range: [166, 180], theme: 'Quái sự cấp tông đầu — hoàng cung ma', payoff: 'hoàng đế tin tưởng MC' },
      { number: 3, range: [181, 200], theme: '{{ANTAGONIST_LINEAGE}} tông phái tấn công', payoff: 'face-slap qua công khai' },
      { number: 4, range: [201, 220], theme: 'Lập tông phái — đệ tử ký danh', payoff: 'tông phái 30 đệ tử' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: đại tỷ thí kinh thành', payoff: 'cấp đại sư, top 3' },
      { number: 6, range: [241, 260], theme: '{{ANTAGONIST_LINEAGE}} âm mưu cosmic-tier', payoff: 'plot thread escalate' },
      { number: 7, range: [261, 280], theme: 'Quái sự cấp đại 10', payoff: 'mass face-slap' },
      { number: 8, range: [281, 295], theme: 'Trận chiến cuối kinh thành', payoff: '{{ANTAGONIST_LINEAGE}} cấp tông tan' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: đại sư + tông phái lập', payoff: 'sẵn sàng arc 4 đại lục' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Đại lục — đối phó {{ANCIENT_EVIL}} tỉnh',
    corePayoff: 'Tông sư, đại lục công nhận, {{ANCIENT_EVIL}} tỉnh, MC + tông phái + đại lục liên thủ',
    subArcs: [
      { number: 1, range: [301, 320], theme: '{{ANCIENT_EVIL}} tỉnh — đại lục biến', payoff: 'cosmic threat global' },
      { number: 2, range: [321, 340], theme: 'Tông sư breakthrough', payoff: 'realm mới, sức mạnh nhảy vọt' },
      { number: 3, range: [341, 360], theme: 'Liên minh đại lục thợ pháp', payoff: '5 tông phái liên minh dưới MC' },
      { number: 4, range: [361, 380], theme: 'Investigate {{ANCIENT_EVIL}} origin', payoff: 'manh mối origin, tổ tiên di niệm' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: đại lục mass face-slap demon', payoff: 'demon legion lui' },
      { number: 6, range: [401, 420], theme: 'Tay sai {{ANCIENT_EVIL}} mass attack', payoff: 'phòng thủ thành công' },
      { number: 7, range: [421, 440], theme: 'Reveal: tổ tiên đã từng đối phó {{ANCIENT_EVIL}}', payoff: 'lore expand' },
      { number: 8, range: [441, 460], theme: 'Trận chiến demon legion', payoff: 'demon legion bại đợt 1' },
      { number: 9, range: [461, 480], theme: 'Reveal: {{ANCIENT_EVIL}} body chính ở cosmic ruins', payoff: 'plot twist' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: tông sư đỉnh + đại lục thuần phục', payoff: 'sẵn sàng arc 5 cosmic' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Cosmic-tier quái sự — cao thủ',
    corePayoff: 'Cao thủ, đối đầu {{ANCIENT_EVIL}} body chính, {{COMPANION_NAME}} cosmic-tier, đại lục liên thủ',
    subArcs: [
      { number: 1, range: [501, 520], theme: '{{ANCIENT_EVIL}} body chính lộ', payoff: 'final body xuất hiện' },
      { number: 2, range: [521, 540], theme: 'Cao thủ breakthrough', payoff: 'realm mới' },
      { number: 3, range: [541, 560], theme: 'Cosmic ruins exploration', payoff: 'manh mối origin' },
      { number: 4, range: [561, 580], theme: 'Reveal: cosmic battlefield giữa 2 phe', payoff: 'lore reveal' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: thắng cosmic-tier minor', payoff: 'face-slap cosmic minor' },
      { number: 6, range: [601, 620], theme: '{{COMPANION_NAME}} cosmic-tier breakthrough', payoff: 'pháp lữ peak' },
      { number: 7, range: [621, 640], theme: 'Lập đạo thống cosmic', payoff: 'đạo thống peak' },
      { number: 8, range: [641, 660], theme: 'Trận chiến cosmic mass', payoff: 'cosmic legion bại đợt 1' },
      { number: 9, range: [661, 680], theme: 'Tổ tiên di niệm appear cosmic-tier', payoff: 'tổ tiên cosmic guidance' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: cao thủ đỉnh + cosmic-tier ready', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Thiên sư + chân tướng tà thần',
    corePayoff: 'Thiên sư, chân tướng {{ANCIENT_EVIL}} reveal (tổ tiên simulation experiment), final battle prep',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Thiên sư breakthrough', payoff: 'realm cuối, sức mạnh peak' },
      { number: 2, range: [721, 740], theme: 'Investigate cosmic origin sâu', payoff: 'manh mối tổ tiên simulation' },
      { number: 3, range: [741, 760], theme: 'Reveal: dị giới là tổ tiên simulation', payoff: 'lore peak' },
      { number: 4, range: [761, 780], theme: 'Trận chiến cosmic-tier major', payoff: 'face-slap cosmic major' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: hack {{ANCIENT_EVIL}} body', payoff: 'reality manipulation' },
      { number: 6, range: [801, 820], theme: 'Reveal: MC là tổ tiên reincarnation', payoff: 'lore expand' },
      { number: 7, range: [821, 840], theme: 'Lập multi-realm đạo thống', payoff: 'đạo thống multi-realm' },
      { number: 8, range: [841, 860], theme: '{{COMPANION_NAME}} thiên sư', payoff: 'pháp lữ peak' },
      { number: 9, range: [861, 880], theme: '{{ANCIENT_EVIL}} body chính phục hồi', payoff: 'kẻ địch chính peak' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: thiên sư đỉnh + final battle prep', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, dị giới ổn định, ending warm với {{COMPANION_NAME}} + tông phái',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last threat - {{ANCIENT_EVIL}} cosmic protocol', payoff: 'phát hiện protocol' },
      { number: 2, range: [921, 940], theme: 'Build cosmic-tier solution', payoff: 'plan ready' },
      { number: 3, range: [941, 960], theme: 'Final battle {{ANCIENT_EVIL}}', payoff: 'BBEG thua' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt', payoff: 'cosmic-tier achievement' },
      { number: 5, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'MC + companion retire, dị giới ổn, ending warm' },
    ],
  },
];
