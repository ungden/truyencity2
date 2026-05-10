/**
 * Tien-hiep returning-expert master template — 1000-chapter arc skeleton.
 *
 * Archetype: MC là cường giả tu tiên kiếp trước (Hợp Thể / Đại Thừa),
 * trọng sinh / xuyên hồn vào thân thể yếu của thiếu niên 14-16t bị
 * khinh thường, mang theo kinh nghiệm + tâm cảnh + đan phương + công
 * pháp đỉnh từ kiếp trước. Mode lão lục — giấu cảnh giới thật, public
 * face thiếu niên may mắn.
 *
 * Cảnh giới progression (placeholder cho sect/world flavor):
 *   Arc 1 (1-50):    Luyện Khí 3 → Luyện Khí 9 đỉnh (visible)
 *                    Thực: Trúc Cơ 1 (giấu)
 *   Arc 2 (51-150):  Trúc Cơ 1 visible → Trúc Cơ 9 đỉnh visible
 *                    Thực: Kim Đan 3 (giấu)
 *   Arc 3 (151-300): Kim Đan 1 visible → Kim Đan 9 đỉnh visible
 *                    Thực: Nguyên Anh 3 (giấu)
 *   Arc 4 (301-500): Nguyên Anh visible → Hóa Thần (cứu sư phụ kiếp trước)
 *   Arc 5 (501-700): Hóa Thần → Luyện Hư
 *   Arc 6 (701-900): Luyện Hư → Hợp Thể (thượng cổ ruins, chân tướng kiếp trước)
 *   Arc 7 (901-1000): Hợp Thể → Đại Thừa (chân tiên / phi thăng / bá chủ)
 *
 * Beat pattern: 5-cluster (setup / breathing / confront / big_wow / resolution).
 * 200 clusters = 200 BIG WOW events trải đều 1000 chương.
 *
 * Placeholder tokens (xem requiredVars trong index.ts):
 *   {{MC_NAME}}             — Tên MC, vd "Lý Trường Sinh"
 *   {{MC_FAMILY}}           — Họ MC, vd "Lý"
 *   {{MC_PAST_NAME}}        — Tên kiếp trước (nếu khác), vd "Lý Vô Cực"
 *   {{HOMETOWN}}            — Thị trấn / thôn quê, vd "Vân Châu Thành"
 *   {{SECT_NAME}}           — Tông môn ban đầu, vd "Thanh Vân Tông"
 *   {{SECT_REGION}}         — Khu vực tông môn, vd "Tây Nam đại lục"
 *   {{ANTAGONIST_FAMILY}}   — Họ đối thủ early, vd "Vương"
 *   {{SIGNATURE_PILL}}      — Đan dược MC luyện sớm, vd "Thanh Linh Đan"
 *   {{SIGNATURE_TECHNIQUE}} — Công pháp tổ phụ, vd "Tử Tiêu Lôi Quyết"
 *   {{HIDDEN_REALM}}        — Bí cảnh kiếp trước, vd "Thái Hư Cổ Vực"
 *   {{ANCIENT_ENEMY}}       — Tên kẻ giết kiếp trước, vd "Thiên Ma Tổ"
 *   {{WORLD_NAME}}          — Đại lục, vd "Cửu Châu Đại Lục"
 *   {{DAOIST_COMPANION}}    — Bạn đạo / nữ chính, vd "Tô Vân Linh"
 *   {{ENDING_GOAL}}         — Phi thăng / chân tiên / bá chủ, vd "phi thăng tiên giới"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const TIEN_HIEP_RETURNING_EXPERT_ARC_SKELETON: ArcSkeleton[] = [
  // ─── ARC 1 (1-50): Trùng sinh + ngoại môn đệ tử ────────────────────────
  {
    arcNumber: 1,
    range: [1, 50],
    theme: 'Trùng sinh thiếu niên — vào tông môn lại từ đầu (mode lão lục)',
    corePayoff:
      '{{MC_NAME}} từ phế tài thành ngoại môn đỉnh, đoạt suất nội môn, public Luyện Khí 9 đỉnh (thực Trúc Cơ 1 giấu), face-slap đệ tử {{ANTAGONIST_FAMILY}} thị, manh mối {{SIGNATURE_TECHNIQUE}} kiếp trước',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline + kí ức kiếp trước thức tỉnh', payoff: 'MC tỉnh dậy thân thể thiếu niên, kinh nghiệm kiếp trước active, đan phương Thanh Linh Đan' },
      { number: 2, range: [6, 10], theme: 'Đăng ký ngoại môn {{SECT_NAME}} + thí luyện cơ bản', payoff: 'public Luyện Khí 4 (giấu Luyện Khí 7 thực), nhận đệ tử bài' },
      { number: 3, range: [11, 15], theme: 'Đệ tử {{ANTAGONIST_FAMILY}} thị khinh thường — first face-slap', payoff: 'thắng đấu pháp ngoại môn, đệ tử {{ANTAGONIST_FAMILY}} mất mặt' },
      { number: 4, range: [16, 20], theme: 'Linh điền nhiệm vụ — luyện {{SIGNATURE_PILL}} bí mật', payoff: 'thành phẩm thượng phẩm, bán đan kiếm linh thạch' },
      { number: 5, range: [21, 25], theme: 'Tỷ thí ngoại môn quý — BIG WOW first mass face-slap', payoff: 'MC top 10, ngoại môn chấp sự ghi nhận, public Luyện Khí 6' },
      { number: 6, range: [26, 30], theme: 'Mật cảnh ngoại môn — gặp di vật kiếp trước', payoff: 'manh mối {{SIGNATURE_TECHNIQUE}}, thu hoạch linh thảo cấp 3' },
      { number: 7, range: [31, 35], theme: '{{ANTAGONIST_FAMILY}} thị tổ chức ám sát', payoff: 'MC face-slap public, {{ANTAGONIST_FAMILY}} mất chấp sự nâng đỡ' },
      { number: 8, range: [36, 40], theme: 'Ngoại môn đỉnh thí — vé vào nội môn', payoff: 'MC public Luyện Khí 9, thắng đối thủ {{ANTAGONIST_FAMILY}}, suất nội môn' },
      { number: 9, range: [41, 45], theme: 'Trưởng lão chú ý — mời thu nhận đệ tử', payoff: 'MC khéo từ chối — chọn tự do, nhận thân phận đệ tử ký danh' },
      { number: 10, range: [46, 50], theme: 'CLIMAX arc 1: nội môn thí luyện đại điển — MC top 3', payoff: 'public Luyện Khí 9 đỉnh, vào nội môn, manh mối {{HIDDEN_REALM}} kiếp trước' },
    ],
  },
  // ─── ARC 2 (51-150): Nội môn — Trúc Cơ public ──────────────────────────
  {
    arcNumber: 2,
    range: [51, 150],
    theme: 'Nội môn đệ tử — leo lên top 10 nội môn (Trúc Cơ public, Kim Đan giấu)',
    corePayoff:
      'MC public Trúc Cơ 9 đỉnh, top 3 nội môn, sở hữu động phủ riêng + linh điền cấp 4, đoạt {{SIGNATURE_TECHNIQUE}} từ tàng kinh các, kết bạn {{DAOIST_COMPANION}}',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Nội môn nhập học + phân động phủ', payoff: 'động phủ + linh điền + kim ngạch nguyệt độ' },
      { number: 2, range: [61, 70], theme: 'Đột phá Trúc Cơ visible — face-slap thầy đánh giá thấp', payoff: 'public Trúc Cơ 1, thầy ngạc nhiên' },
      { number: 3, range: [71, 80], theme: 'Tàng kinh các — tìm {{SIGNATURE_TECHNIQUE}}', payoff: 'tìm thấy mảnh công pháp, ghép với kinh nghiệm kiếp trước' },
      { number: 4, range: [81, 90], theme: 'Nhiệm vụ tông môn ngoại vực — face-slap đệ tử nội môn cấp cao', payoff: 'thắng nhiệm vụ A, danh tiếng nội môn' },
      { number: 5, range: [91, 100], theme: 'BIG WOW nội môn đại điển — top 10', payoff: 'public Trúc Cơ 5, đứng top 10 nội môn, trưởng lão tranh thu' },
      { number: 6, range: [101, 110], theme: 'Bạn đạo {{DAOIST_COMPANION}} xuất hiện', payoff: 'kết bạn nữ tu, tin tưởng dần' },
      { number: 7, range: [111, 120], theme: 'Đối thủ nội môn cấp cao - thí luyện song nguyệt', payoff: 'MC thắng nhưng giấu thực lực, kẻ địch tâm phục' },
      { number: 8, range: [121, 130], theme: 'Mật cảnh tông môn — thu hoạch cấp Trúc Cơ', payoff: 'linh thảo Kim Đan tiền cấp, đan dược cấp 4' },
      { number: 9, range: [131, 140], theme: '{{ANTAGONIST_FAMILY}} thị bố trí lão hành ám hại', payoff: 'MC dùng mode lão lục, lão hành Kim Đan thua nhục' },
      { number: 10, range: [141, 150], theme: 'CLIMAX arc 2: nội môn đại tỷ thí — top 3', payoff: 'public Trúc Cơ 9 đỉnh, top 3 nội môn, suất chân truyền điểm danh' },
    ],
  },
  // ─── ARC 3 (151-300): Chân truyền — Kim Đan public ─────────────────────
  {
    arcNumber: 3,
    range: [151, 300],
    theme: 'Chân truyền đệ tử — tranh đoạt thiên kiêu top trong tông môn',
    corePayoff:
      'MC chân truyền top 1 {{SECT_NAME}}, public Kim Đan 9 đỉnh (thực Nguyên Anh 3 giấu), lập phái nhỏ, {{ANTAGONIST_FAMILY}} thị Kim Đan trưởng lão bại danh, manh mối {{ANCIENT_ENEMY}}',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Chân truyền nhập học + sư phụ chính thức', payoff: 'sư phụ Kim Đan đỉnh nhận, tài nguyên cao' },
      { number: 2, range: [166, 180], theme: 'Đột phá Kim Đan public — thị uy first time', payoff: 'public Kim Đan 1, đại điển sư phụ tự hào' },
      { number: 3, range: [181, 200], theme: 'Tham gia liên minh tông môn — face-slap chân truyền tông khác', payoff: 'thắng giải đấu liên minh tông, danh tiếng khu vực' },
      { number: 4, range: [201, 220], theme: 'Mật cảnh Kim Đan — thu hoạch dược nguyên cấp', payoff: 'linh dược Nguyên Anh tiền cấp, đan dược cấp 5' },
      { number: 5, range: [221, 240], theme: 'BIG WOW chân truyền đại điển — đứng đầu', payoff: 'public Kim Đan 5, top 1 chân truyền, đại trưởng lão chính thức gọi tên' },
      { number: 6, range: [241, 260], theme: '{{ANTAGONIST_FAMILY}} thị Kim Đan trưởng lão phục thù', payoff: 'MC dùng kỹ kiếp trước, lão Kim Đan đỉnh thua, mất uy tín' },
      { number: 7, range: [261, 280], theme: 'Lập tiểu phái thân tín — đệ tử trẻ theo MC', payoff: 'phái nhỏ 30 đệ tử, tài nguyên độc lập' },
      { number: 8, range: [281, 295], theme: 'Reveal: {{ANCIENT_ENEMY}} dấu vết kiếp trước', payoff: 'plot thread kiếp trước revive, MC tâm cảnh động' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: MC public Kim Đan 9 đỉnh + lập phái', payoff: 'top 1 chân truyền, suất tham gia đại hội đại lục' },
    ],
  },
  // ─── ARC 4 (301-500): Đại lục — Nguyên Anh public, cứu sư phụ kiếp trước
  {
    arcNumber: 4,
    range: [301, 500],
    theme: '{{WORLD_NAME}} đại hội — cứu sư phụ kiếp trước',
    corePayoff:
      'MC public Nguyên Anh 9 đỉnh (thực Hóa Thần), thắng đại hội đại lục, cứu sư phụ kiếp trước bị phong ấn, diệt tổ chức tay sai {{ANCIENT_ENEMY}}',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Đại hội đại lục — gặp thiên kiêu các tông môn', payoff: 'top 10 đại hội, danh tiếng đại lục' },
      { number: 2, range: [321, 340], theme: 'Đột phá Nguyên Anh public — first reveal sốc đại lục', payoff: 'public Nguyên Anh 1, các tông môn shock' },
      { number: 3, range: [341, 360], theme: 'Tay sai {{ANCIENT_ENEMY}} xuất hiện — first contact', payoff: 'face-slap tay sai, manh mối sư phụ kiếp trước' },
      { number: 4, range: [361, 380], theme: 'Reveal: sư phụ kiếp trước bị phong ấn ở {{HIDDEN_REALM}}', payoff: 'plot thread cứu sư phụ start, MC chuẩn bị' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: tấn công căn cứ tay sai {{ANCIENT_ENEMY}}', payoff: 'diệt căn cứ, manh mối phong ấn, public Nguyên Anh 5' },
      { number: 6, range: [401, 420], theme: 'Liên minh các tông môn chính phái', payoff: '5 tông môn chính phái lập liên minh chống {{ANCIENT_ENEMY}}' },
      { number: 7, range: [421, 440], theme: 'Vào {{HIDDEN_REALM}} — tìm sư phụ', payoff: 'manh mối sâu, gặp di vật kiếp trước' },
      { number: 8, range: [441, 460], theme: 'Trận chiến phong ấn sư phụ', payoff: 'phong ấn lung lay, sư phụ tỉnh một phần' },
      { number: 9, range: [461, 480], theme: 'Reveal: {{ANCIENT_ENEMY}} chưa chết, đang phục hồi', payoff: 'plot twist, kẻ địch chính tái xuất' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: cứu sư phụ + diệt tay sai cao + MC Hóa Thần', payoff: 'sư phụ tự do, public Nguyên Anh 9 đỉnh, đại lục công nhận MC top 1' },
    ],
  },
  // ─── ARC 5 (501-700): Liên hợp đại lục đối đầu {{ANCIENT_ENEMY}} ──────
  {
    arcNumber: 5,
    range: [501, 700],
    theme: 'Liên hợp đại lục — đối đầu {{ANCIENT_ENEMY}} phục hồi',
    corePayoff:
      'MC public Hóa Thần 9 đỉnh, thắng {{ANCIENT_ENEMY}} (giấu Luyện Hư thực), {{DAOIST_COMPANION}} đột phá Nguyên Anh, sư phụ kiếp trước hồi phục Hợp Thể',
    subArcs: [
      { number: 1, range: [501, 520], theme: '{{ANCIENT_ENEMY}} tổ chức tấn công đại lục', payoff: 'phòng thủ thành công đợt 1, liên minh tăng cường' },
      { number: 2, range: [521, 540], theme: 'MC đột phá Hóa Thần public', payoff: 'public Hóa Thần 1, sư phụ + {{DAOIST_COMPANION}} ngạc nhiên' },
      { number: 3, range: [541, 560], theme: '{{ANCIENT_ENEMY}} dùng pháp bảo cấm thuật', payoff: 'first encounter pháp bảo cổ, MC đối phó' },
      { number: 4, range: [561, 580], theme: 'MC bắt được pháp bảo {{ANCIENT_ENEMY}} thua', payoff: 'pháp bảo cổ, manh mối chủ mưu' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: thắng tay phải {{ANCIENT_ENEMY}}', payoff: 'face-slap đại lục, public Hóa Thần 5' },
      { number: 6, range: [601, 620], theme: 'Sư phụ kiếp trước hồi phục Hợp Thể', payoff: 'sư phụ trở lại, MC + sư phụ liên thủ' },
      { number: 7, range: [621, 640], theme: '{{DAOIST_COMPANION}} đột phá Nguyên Anh', payoff: 'bạn đạo Nguyên Anh, song tu pháp lữ' },
      { number: 8, range: [641, 660], theme: 'Đại lục lễ phong vương — MC từ chối', payoff: 'public Hóa Thần 9, không nhận chức, mode lão lục giữ nguyên' },
      { number: 9, range: [661, 680], theme: 'Trận chiến trung tâm — {{ANCIENT_ENEMY}} tự thân ra trận', payoff: '{{ANCIENT_ENEMY}} thua, lui về dưỡng thương' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: MC public Hóa Thần đỉnh + sư phụ Hợp Thể', payoff: 'đại lục thái bình tạm thời, MC sang dimension cao hơn' },
    ],
  },
  // ─── ARC 6 (701-900): Thượng cổ ruins — Hợp Thể chân tướng ─────────────
  {
    arcNumber: 6,
    range: [701, 900],
    theme: 'Thượng cổ ruins — chân tướng kiếp trước + bí mật {{ANCIENT_ENEMY}}',
    corePayoff:
      'MC public Luyện Hư đỉnh (thực Hợp Thể 3), giải mã chân tướng kiếp trước MC bị {{ANCIENT_ENEMY}} hãm hại, lấy lại pháp bảo bản mệnh, lập đạo thống mới',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Thượng cổ ruins thức tỉnh — đại lục thay đổi', payoff: 'first contact thượng cổ space' },
      { number: 2, range: [721, 740], theme: 'MC investigate ruins — tìm pháp bảo bản mệnh', payoff: 'manh mối pháp bảo, đột phá Luyện Hư' },
      { number: 3, range: [741, 760], theme: 'Reveal: {{ANCIENT_ENEMY}} setup hãm hại MC kiếp trước', payoff: 'chân tướng phơi bày, sư phụ + bạn đạo biết' },
      { number: 4, range: [761, 780], theme: 'Trận chiến ruins — đối thủ thượng cổ tỉnh', payoff: 'face-slap thượng cổ pháp bảo' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: lấy lại pháp bảo bản mệnh kiếp trước', payoff: 'pháp bảo bản mệnh trở về, đại lục choáng' },
      { number: 6, range: [801, 820], theme: 'Reveal: thượng cổ là chiến trường giữa hai phe', payoff: 'lore expand, MC + sư phụ phe Đạo' },
      { number: 7, range: [821, 840], theme: '{{DAOIST_COMPANION}} đột phá Hóa Thần', payoff: 'bạn đạo Hóa Thần, pháp lữ song tu cao' },
      { number: 8, range: [841, 860], theme: 'MC lập đạo thống mới — kế thừa kiếp trước', payoff: 'đạo thống MC, đệ tử thân tín, tài nguyên' },
      { number: 9, range: [861, 880], theme: 'Trận chiến cuối ruins — {{ANCIENT_ENEMY}} hiện thân thật', payoff: '{{ANCIENT_ENEMY}} body thật xuất hiện, MC chuẩn bị' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: MC Hợp Thể + đạo thống lập', payoff: 'MC tu vi top đại lục, sẵn sàng đối thủ cuối' },
    ],
  },
  // ─── ARC 7 (901-1000): Đại Thừa + ENDING ──────────────────────────────
  {
    arcNumber: 7,
    range: [901, 1000],
    theme: 'Đại Thừa + {{ENDING_GOAL}}',
    corePayoff:
      'MC Đại Thừa, thắng {{ANCIENT_ENEMY}} hoàn toàn, hoàn thành {{ENDING_GOAL}}, ending warm với {{DAOIST_COMPANION}} + sư phụ + đạo thống',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Quái lực thiên đạo bias — last antagonist hidden', payoff: 'phát hiện thiên đạo cản trở MC' },
      { number: 2, range: [921, 940], theme: 'MC đột phá Đại Thừa — final realm', payoff: 'public Đại Thừa, đại lục lễ' },
      { number: 3, range: [941, 960], theme: '{{ANCIENT_ENEMY}} final battle setup', payoff: 'liên minh đại lục + sư phụ + {{DAOIST_COMPANION}} sẵn sàng' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: trận chiến cuối {{ANCIENT_ENEMY}}', payoff: '{{ANCIENT_ENEMY}} thua hoàn toàn, đại lục thái bình' },
      { number: 5, range: [981, 1000], theme: 'ENDING: {{ENDING_GOAL}} + warm closure', payoff: 'MC chọn {{ENDING_GOAL}}, {{DAOIST_COMPANION}} đồng hành, sư phụ + đạo thống tiễn, ending warm' },
    ],
  },
];
