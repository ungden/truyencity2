/**
 * Khoa-huyen "tech-fusion-cultivator" master template — 1000-chapter skeleton.
 *
 * Archetype: MC kỹ sư hiện đại (AI/quantum/bio) xuyên vào tu tiên thế giới
 * mang theo công nghệ + lab tools, hoặc ngược lại MC tu sĩ tỉnh dậy ở thế
 * giới hi-tech. Fusion: tu luyện + công nghệ. Đặc trưng: build linh khí
 * generator, AI auxiliary spirit, mech tu chân, biotech alchemy.
 *
 * Cảnh giới fusion (custom):
 *   Arc 1 (1-50): Tech-Apprentice → Tech-Adept (lab established)
 *   Arc 2 (51-150): Tech-Adept → Tech-Master (AI familiar online)
 *   Arc 3 (151-300): Tech-Master → Mech-Lord (tu chân mech v1)
 *   Arc 4 (301-500): Mech-Lord → Quantum-Sage (cứu sư phụ kiếp trước)
 *   Arc 5 (501-700): Quantum-Sage → Reality-Engineer (đại lục tech revolution)
 *   Arc 6 (701-900): Reality-Engineer → Cosmic-Architect (vũ trụ ruins reveal)
 *   Arc 7 (901-1000): Cosmic-Architect → {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_FAMILY}}, {{HOMETOWN}}
 *   {{LAB_NAME}} — Lab/workshop, vd "Tinh Vũ Lab"
 *   {{AI_FAMILIAR}} — AI auxiliary spirit, vd "Linh Tâm AI"
 *   {{ANTAGONIST_CORP}} — Đối thủ corp / tông môn, vd "Hắc Tinh Corp"
 *   {{ANCIENT_ENEMY}} — Cosmic antagonist, vd "Hỗn Độn Cổ Trí"
 *   {{SIGNATURE_DEVICE}} — Gimmick device, vd "Linh Khí Quantum Generator"
 *   {{ACADEMY_NAME}} — Học viện tech-cultivation, vd "Tinh Hà Học Viện"
 *   {{COMPANION_NAME}} — Bạn đồng hành, vd "Tô Linh"
 *   {{WORLD_NAME}} — Đại lục, vd "Tinh Hà Liên Bang"
 *   {{ENDING_GOAL}} — Đích cuối, vd "Cosmic Architect đỉnh"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const KHOA_HUYEN_TECH_FUSION_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Lab {{LAB_NAME}} — tech-cultivation đầu tiên',
    corePayoff: '{{MC_NAME}} lập {{LAB_NAME}}, online {{AI_FAMILIAR}}, top ngoại môn {{ACADEMY_NAME}}, face-slap {{ANTAGONIST_CORP}} đệ tử',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — lab đã setup, AI familiar online', payoff: '{{AI_FAMILIAR}} active, prototype linh khí generator v1' },
      { number: 2, range: [6, 10], theme: 'Đăng ký {{ACADEMY_NAME}} ngoại môn', payoff: 'đệ tử bài + tài nguyên cấp 1' },
      { number: 3, range: [11, 15], theme: 'Đệ tử {{ANTAGONIST_CORP}} khinh thường', payoff: 'face-slap qua tech demo, đối thủ thua nhục' },
      { number: 4, range: [16, 20], theme: 'Build {{SIGNATURE_DEVICE}} v1', payoff: 'device chuẩn bị, hiệu suất tu luyện 2×' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: ngoại môn tỷ thí - top 5', payoff: 'tài nguyên cấp 2, được trưởng lão chú ý' },
      { number: 6, range: [26, 30], theme: 'Mật cảnh tech ruins — manh mối kiếp trước', payoff: 'ancient blueprint, plot thread' },
      { number: 7, range: [31, 35], theme: '{{ANTAGONIST_CORP}} âm mưu sabotage lab', payoff: 'AI familiar phát hiện, MC face-slap' },
      { number: 8, range: [36, 40], theme: '{{SIGNATURE_DEVICE}} v2 + tích hợp AI', payoff: 'device hoạt động, lab tự động hoá' },
      { number: 9, range: [41, 45], theme: 'Suất nội môn tỷ thí', payoff: 'top 3 ngoại môn' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: vào nội môn + lab cấp 2', payoff: 'nội môn, lab mở rộng, manh mối {{ANCIENT_ENEMY}}' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Nội môn — AI familiar evolve + Mech v1',
    corePayoff: 'Top 3 nội môn, AI familiar Tech-Master, Mech v1 ra mắt, gặp {{COMPANION_NAME}}',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Lab nội môn cấp 2 + tài nguyên', payoff: 'lab mở rộng, R&D stack' },
      { number: 2, range: [61, 70], theme: '{{COMPANION_NAME}} kết bạn (engineer)', payoff: 'co-founder + đối tác lab' },
      { number: 3, range: [71, 80], theme: 'AI familiar evolve — Tech-Master tier', payoff: 'AI mạnh hơn, tự ra quyết định' },
      { number: 4, range: [81, 90], theme: 'Mech v1 prototype - first run', payoff: 'mech hoạt động, sức mạnh thí nghiệm' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: tỷ thí nội môn — Mech demo', payoff: 'top 10 nội môn, tông môn shock' },
      { number: 6, range: [101, 110], theme: '{{ANTAGONIST_CORP}} nội môn liên thủ', payoff: 'face-slap qua AI strategy' },
      { number: 7, range: [111, 120], theme: 'Mật cảnh - thu hoạch quantum crystal', payoff: 'crystal cấp 3, tài nguyên Mech v2' },
      { number: 8, range: [121, 130], theme: 'Build Mech v2 + AI integration', payoff: 'Mech v2 mạnh hơn, network engineering team' },
      { number: 9, range: [131, 140], theme: 'Trận chiến cuối nội môn', payoff: 'top 3 nội môn, suất chân truyền' },
      { number: 10, range: [141, 150], theme: 'CLIMAX: chân truyền + Mech v2', payoff: 'chân truyền, lab cấp 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Chân truyền — Quantum breakthrough',
    corePayoff: 'Top 1 chân truyền, Quantum Generator v1, manh mối {{ANCIENT_ENEMY}}, lập tech faction',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Chân truyền - sư phụ tech master', payoff: 'sư phụ Tech-Master, tài nguyên đỉnh' },
      { number: 2, range: [166, 180], theme: 'Quantum Generator v1', payoff: 'tu luyện 5×, đại điển ngạc nhiên' },
      { number: 3, range: [181, 200], theme: 'Liên minh học viện - face-slap chân truyền tông khác', payoff: 'thắng giải đấu liên minh' },
      { number: 4, range: [201, 220], theme: 'Mech v3 + AI swarm', payoff: 'mech swarm 10 con, sức mạnh nhảy vọt' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: chân truyền đại điển', payoff: 'top 1, đại trưởng lão gọi tên' },
      { number: 6, range: [241, 260], theme: '{{ANTAGONIST_CORP}} CEO ra mặt', payoff: 'first contact CEO, MC giấu thực lực' },
      { number: 7, range: [261, 280], theme: 'Lập tech faction trong tông môn', payoff: 'faction 30 đệ tử, R&D thread' },
      { number: 8, range: [281, 295], theme: 'Reveal: {{ANCIENT_ENEMY}} dấu vết kiếp trước', payoff: 'plot thread arc 4 plant' },
      { number: 9, range: [296, 300], theme: 'CLIMAX: top 1 chân truyền + tech faction', payoff: 'sẵn sàng tham gia đại hội đại lục' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Đại lục - Reality engineering',
    corePayoff: 'Quantum-Sage, đại hội đại lục top 1, cứu sư phụ kiếp trước, diệt tay sai {{ANCIENT_ENEMY}}',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Đại hội {{WORLD_NAME}} — tech showcase', payoff: 'top 10 đại hội, danh tiếng đại lục' },
      { number: 2, range: [321, 340], theme: 'Quantum-Sage breakthrough', payoff: 'realm mới, sức mạnh nhảy vọt' },
      { number: 3, range: [341, 360], theme: 'Tay sai {{ANCIENT_ENEMY}} xuất hiện', payoff: 'face-slap, manh mối sư phụ kiếp trước' },
      { number: 4, range: [361, 380], theme: 'Reveal: sư phụ phong ấn ở quantum realm', payoff: 'plot thread cứu sư phụ start' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: tấn công căn cứ {{ANCIENT_ENEMY}}', payoff: 'diệt căn cứ, manh mối phong ấn' },
      { number: 6, range: [401, 420], theme: 'Liên minh học viện chính phái', payoff: '5 học viện liên minh dưới MC' },
      { number: 7, range: [421, 440], theme: 'Vào quantum realm — tìm sư phụ', payoff: 'manh mối sâu, di vật kiếp trước' },
      { number: 8, range: [441, 460], theme: 'Trận chiến phong ấn sư phụ', payoff: 'phong ấn lung lay, sư phụ tỉnh' },
      { number: 9, range: [461, 480], theme: 'Reveal: {{ANCIENT_ENEMY}} trí tuệ cosmic', payoff: 'plot twist, cosmic intelligence' },
      { number: 10, range: [481, 500], theme: 'CLIMAX: cứu sư phụ + Reality-Engineer realm', payoff: 'sư phụ tự do, MC top 1 đại lục' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Tech revolution đại lục',
    corePayoff: 'Reality-Engineer, MC dẫn dắt cách mạng tech, {{COMPANION_NAME}} Quantum-Sage, đè bẹp {{ANTAGONIST_CORP}}',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'Tech revolution launch — đại lục đổi', payoff: 'public release, đại lục tu sĩ + tech fusion' },
      { number: 2, range: [521, 540], theme: '{{ANTAGONIST_CORP}} resurrected', payoff: 'first contact đối thủ resurrected' },
      { number: 3, range: [541, 560], theme: 'Mở rộng ngành lân cận - biotech', payoff: 'biotech alchemy fusion' },
      { number: 4, range: [561, 580], theme: 'BIG WOW: đại lục tôn MC tech genius', payoff: 'global recognition, ngành mới được công nhận' },
      { number: 5, range: [581, 600], theme: '{{ANTAGONIST_CORP}} liên thủ corp khác', payoff: 'face-slap qua quantum strategy' },
      { number: 6, range: [601, 620], theme: 'Lab cosmic-tier mở', payoff: 'lab quy mô đại lục' },
      { number: 7, range: [621, 640], theme: '{{COMPANION_NAME}} Quantum-Sage', payoff: 'companion peak power' },
      { number: 8, range: [641, 660], theme: '{{ANTAGONIST_CORP}} bại - M&A', payoff: 'M&A vào tech faction MC' },
      { number: 9, range: [661, 680], theme: 'Mở rộng cosmic - 30 sectors', payoff: 'multi-sector operation' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: top 1 đại lục + revolution', payoff: 'sẵn sàng cosmic ruins arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic ruins — chân tướng vũ trụ',
    corePayoff: 'Cosmic-Architect, cosmic ruins reveal, {{ANCIENT_ENEMY}} body chính lộ, lập đạo thống tech',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Cosmic ruins thức tỉnh', payoff: 'first contact cosmic space' },
      { number: 2, range: [721, 740], theme: 'Investigate ruins - quantum entanglement', payoff: 'manh mối cosmic origin' },
      { number: 3, range: [741, 760], theme: 'Reveal: vũ trụ là simulation, {{ANCIENT_ENEMY}} là admin', payoff: 'lore reveal, MC root access' },
      { number: 4, range: [761, 780], theme: 'Trận chiến cosmic — pháp bảo tech', payoff: 'face-slap admin tay sai' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: hack quantum reality', payoff: 'reality manipulation, đại lục choáng' },
      { number: 6, range: [801, 820], theme: 'Reveal: huyết mạch tech là tổ tiên programmer', payoff: 'lore expand, MC kế thừa code' },
      { number: 7, range: [821, 840], theme: 'Lập đạo thống tech-fusion', payoff: 'đạo thống MC, đệ tử kế thừa' },
      { number: 8, range: [841, 860], theme: '{{COMPANION_NAME}} Cosmic-Architect', payoff: 'pháp lữ peak' },
      { number: 9, range: [861, 880], theme: '{{ANCIENT_ENEMY}} body chính lộ', payoff: 'kẻ địch chính xuất hiện' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: Cosmic-Architect + đạo thống lập', payoff: 'sẵn sàng final battle' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: '{{MC_NAME}} đạt {{ENDING_GOAL}}, simulation reborn, ending warm',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last admin protocol - cosmic threat', payoff: 'phát hiện reality protocol' },
      { number: 2, range: [921, 940], theme: 'Build final device', payoff: 'device cosmic-tier ready' },
      { number: 3, range: [941, 960], theme: 'Final battle {{ANCIENT_ENEMY}}', payoff: 'admin thua, simulation freed' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt', payoff: 'cosmic-tier achievement' },
      { number: 5, range: [981, 1000], theme: 'ENDING: kế thừa + warm closure', payoff: 'thế hệ 2 kế thừa, MC + {{COMPANION_NAME}} retire, ending warm' },
    ],
  },
];
