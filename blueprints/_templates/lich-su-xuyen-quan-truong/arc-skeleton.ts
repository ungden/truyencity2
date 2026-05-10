/**
 * Lich-su (historical) "xuyen-quan-truong" master template — 1000-chapter skeleton.
 *
 * Archetype: MC thanh niên hiện đại xuyên về cổ đại Trung Hoa /
 * Việt Nam (vd thời Tống / Đường / Lý / Trần), mang theo kiến thức
 * hiện đại (kinh tế, kỹ thuật, văn hoá, quân sự), leo từ thư sinh /
 * dân thường → tể tướng / vương / hoàng đế. Conflict thông qua quan
 * trường (gian thần, hậu cung, đảng phái), cải cách triều chính,
 * chiến tranh biên cương.
 *
 * Cảnh giới quan trường:
 *   Arc 1 (1-50):    Thư sinh → tú tài / cử nhân (đậu khoa cử)
 *   Arc 2 (51-150):  Tú tài → tri huyện / tri phủ (cấp huyện)
 *   Arc 3 (151-300): Tri phủ → thượng thư / thị lang (cấp triều)
 *   Arc 4 (301-500): Thượng thư → tể tướng / đại tướng (cấp quốc)
 *   Arc 5 (501-700): Tể tướng → vương gia / nhiếp chính (cấp đế)
 *   Arc 6 (701-900): Vương gia → hoàng đế (đoạt ngôi / cứu nước)
 *   Arc 7 (901-1000): Hoàng đế → {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{MC_NAME}}              — Tên MC, vd "Triệu Tử Long"
 *   {{MC_FAMILY}}            — Họ MC, vd "Triệu"
 *   {{MC_PAST_NAME}}         — Tên hiện đại, vd "Lý Văn Minh"
 *   {{HOMETOWN}}             — Quê quán cổ đại, vd "Lâm An phủ"
 *   {{DYNASTY_NAME}}         — Triều đại, vd "Đại Tống", "Đại Lý", "Đại Việt"
 *   {{CAPITAL_CITY}}         — Kinh đô, vd "Biện Kinh", "Thăng Long"
 *   {{ANTAGONIST_FAMILY}}    — Họ gian thần, vd "Tần", "Hoàng"
 *   {{FOREIGN_ENEMY}}        — Ngoại xâm, vd "Kim quốc", "Mông Cổ"
 *   {{CONSORT_NAME}}         — Hậu / phi / vợ chính, vd "Vân Linh công chúa"
 *   {{REFORM_BANNER}}        — Khẩu hiệu cải cách, vd "Tân Pháp Phú Quốc"
 *   {{LOYAL_GENERAL}}        — Tướng trung thành, vd "Trần Khánh Dư"
 *   {{ENDING_GOAL}}          — Đích cuối, vd "thống nhất thiên hạ", "Thái Bình thịnh thế"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const LICH_SU_QUAN_TRUONG_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1,
    range: [1, 50],
    theme: 'Xuyên về {{DYNASTY_NAME}} — thư sinh {{HOMETOWN}}',
    corePayoff: '{{MC_NAME}} từ thư sinh nghèo thành cử nhân, đoạt khoa cử huyện, gia đình ổn định, manh mối {{ANTAGONIST_FAMILY}} thị tham nhũng',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — xuyên hồn vào thân thư sinh, gia đình ấm', payoff: 'kiến thức hiện đại active, gia đình thoát nợ' },
      { number: 2, range: [6, 10], theme: 'Học thi cổ đại + viết thơ Đường nhớ từ tương lai', payoff: 'thơ hay, tú tài địa phương khen' },
      { number: 3, range: [11, 15], theme: 'Đệ tử {{ANTAGONIST_FAMILY}} thị khinh thường', payoff: 'face-slap qua thơ + lý luận, đệ tử đối thủ bại' },
      { number: 4, range: [16, 20], theme: 'Khai khoa huyện — đoạt giải nhất', payoff: 'tú tài, danh tiếng huyện, được tri huyện chú ý' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: hội thí phủ — top 3', payoff: 'cử nhân, mời lên kinh thành ứng thí' },
      { number: 6, range: [26, 30], theme: 'Manh mối {{ANTAGONIST_FAMILY}} biển thủ thuế', payoff: 'bằng chứng tham nhũng, plot thread arc dài' },
      { number: 7, range: [31, 35], theme: '{{ANTAGONIST_FAMILY}} ám hại MC', payoff: 'MC phòng thủ thành công, tri huyện bảo vệ' },
      { number: 8, range: [36, 40], theme: 'Cải tiến nông nghiệp tại huyện — kiến thức hiện đại', payoff: 'năng suất tăng 30%, dân chúng tôn vinh' },
      { number: 9, range: [41, 45], theme: 'Tri phủ chú ý + mời nhập triều', payoff: 'tri phủ ủng hộ, đề cử lên kinh' },
      { number: 10, range: [46, 50], theme: 'CLIMAX arc 1: lên kinh thành ứng thí', payoff: 'cử nhân top huyện, sẵn sàng triều thi' },
    ],
  },
  {
    arcNumber: 2,
    range: [51, 150],
    theme: 'Triều thi {{CAPITAL_CITY}} — vào quan trường',
    corePayoff: '{{MC_NAME}} đậu tiến sĩ top, nhậm chức tri huyện, cải cách thuế / nông nghiệp / giáo dục, gặp {{CONSORT_NAME}}',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Lên {{CAPITAL_CITY}} — gặp tiến sĩ + sĩ tử', payoff: 'network sĩ tử, tin tức triều' },
      { number: 2, range: [61, 70], theme: 'Triều thi — đoạt giải nhất', payoff: 'tiến sĩ Trạng Nguyên, hoàng đế tiếp kiến' },
      { number: 3, range: [71, 80], theme: '{{CONSORT_NAME}} xuất hiện — quý tộc / công chúa', payoff: 'quan hệ chiến lược + nhẹ nhàng' },
      { number: 4, range: [81, 90], theme: 'Nhậm chức tri huyện cấp cao', payoff: 'huyện lớn, ngân sách + 100 thuộc hạ' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: cải cách nông nghiệp huyện', payoff: 'năng suất gấp đôi, hoàng đế khen' },
      { number: 6, range: [101, 110], theme: '{{ANTAGONIST_FAMILY}} thị triều ngăn cản', payoff: 'MC dùng bằng chứng, đối thủ thoái lui' },
      { number: 7, range: [111, 120], theme: 'Cải cách thuế khoá — bài trừ tham nhũng', payoff: 'thuế thu tăng 50%, thanh quan' },
      { number: 8, range: [121, 130], theme: 'Khoa cử cải tiến — chiêu mộ nhân tài', payoff: '20 nhân tài, network mở rộng' },
      { number: 9, range: [131, 140], theme: '{{ANTAGONIST_FAMILY}} liên thủ tấn công', payoff: 'MC thắng đợt 1, gian thần tổn thương' },
      { number: 10, range: [141, 150], theme: 'CLIMAX arc 2: thăng tri phủ + đính hôn {{CONSORT_NAME}}', payoff: 'tri phủ cấp châu, gia đình mở rộng' },
    ],
  },
  {
    arcNumber: 3,
    range: [151, 300],
    theme: 'Triều đình — thượng thư / thị lang',
    corePayoff: '{{MC_NAME}} thượng thư bộ Hộ / Lễ, đảng phái MC mạnh, đối đầu gian thần triều, manh mối {{FOREIGN_ENEMY}} chuẩn bị xâm lược',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Vào triều — gặp các đảng phái', payoff: 'MC nhận diện 5 đảng phái' },
      { number: 2, range: [166, 180], theme: 'Thăng thị lang — bộ Hộ', payoff: 'kiểm soát tài chính quốc gia' },
      { number: 3, range: [181, 200], theme: '{{ANTAGONIST_FAMILY}} thị triều liên thủ chống', payoff: 'face-slap qua bằng chứng, đối thủ giảm uy' },
      { number: 4, range: [201, 220], theme: 'Cải cách quân đội — kiến thức quân sự hiện đại', payoff: 'quân đội tinh nhuệ + 10K binh sĩ' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: hoàng đế phong thượng thư', payoff: 'thượng thư, lương 10K vàng/năm' },
      { number: 6, range: [241, 260], theme: '{{FOREIGN_ENEMY}} biên cương khiêu khích', payoff: 'first contact ngoại xâm, MC chuẩn bị quốc phòng' },
      { number: 7, range: [261, 280], theme: 'Lập đảng MC trong triều', payoff: 'đảng MC 50 quan, kiểm soát 3 bộ' },
      { number: 8, range: [281, 295], theme: 'Trận chiến gian thần đầu tiên', payoff: 'gian thần lớn bị giáng chức' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: MC tể tướng phó + đảng MC mạnh', payoff: 'kiểm soát triều, sẵn sàng đối phó {{FOREIGN_ENEMY}}' },
    ],
  },
  {
    arcNumber: 4,
    range: [301, 500],
    theme: '{{FOREIGN_ENEMY}} xâm lược — chiến tranh biên cương',
    corePayoff: '{{MC_NAME}} tể tướng + đại tướng, đẩy lùi {{FOREIGN_ENEMY}}, mở rộng biên cương, {{LOYAL_GENERAL}} thành đại tướng quân',
    subArcs: [
      { number: 1, range: [301, 320], theme: '{{FOREIGN_ENEMY}} xâm lược biên cương', payoff: 'biên ải mất, MC dẫn quân ra biên' },
      { number: 2, range: [321, 340], theme: 'Phòng thủ + huấn luyện quân tinh nhuệ', payoff: '5 quân khu được tổ chức lại' },
      { number: 3, range: [341, 360], theme: 'First major battle — thắng nhỏ', payoff: 'biên ải lấy lại, danh tiếng quân' },
      { number: 4, range: [361, 380], theme: '{{LOYAL_GENERAL}} thăng đại tướng quân', payoff: 'tướng trung thành kiểm soát quân' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: trận quyết định {{FOREIGN_ENEMY}} bại', payoff: '{{FOREIGN_ENEMY}} đại bại, biên cương an toàn' },
      { number: 6, range: [401, 420], theme: 'Mở rộng biên cương — chiếm 3 châu mới', payoff: 'lãnh thổ tăng 20%' },
      { number: 7, range: [421, 440], theme: '{{ANTAGONIST_FAMILY}} thị âm mưu hậu cung', payoff: 'MC + {{CONSORT_NAME}} bóc trần âm mưu' },
      { number: 8, range: [441, 460], theme: 'Trận chiến trung tâm quân — thống nhất binh quyền', payoff: 'quân quốc thống nhất dưới MC' },
      { number: 9, range: [461, 480], theme: '{{FOREIGN_ENEMY}} cuối cùng đầu hàng', payoff: 'hoà ước có lợi {{DYNASTY_NAME}}' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: tể tướng + đại tướng + biên cương an + MC vương phong', payoff: 'phong vương, quyền lực đỉnh' },
    ],
  },
  {
    arcNumber: 5,
    range: [501, 700],
    theme: 'Vương gia — nhiếp chính cải cách quốc gia',
    corePayoff: '{{MC_NAME}} nhiếp chính vương, cải cách toàn diện ({{REFORM_BANNER}}), đối đầu hoàng đế suy yếu, đảng phái cũ tan rã',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'Hoàng đế bệnh + nhiếp chính', payoff: 'nhiếp chính vị, kiểm soát triều' },
      { number: 2, range: [521, 540], theme: '{{REFORM_BANNER}} ban hành', payoff: 'cải cách thuế / quan / quân triển khai' },
      { number: 3, range: [541, 560], theme: 'Đảng phái cũ phản kháng', payoff: 'MC face-slap, đảng cũ tan' },
      { number: 4, range: [561, 580], theme: 'Cải cách giáo dục + công nghệ', payoff: 'trường công lập + máy in, văn hoá nâng' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: thái bình thịnh thế đầu tiên', payoff: 'dân tin yêu, nhân tài nức nở' },
      { number: 6, range: [601, 620], theme: 'Hoàng đế hồi phục, lo MC quyền cao', payoff: 'first conflict hoàng đế-nhiếp chính' },
      { number: 7, range: [621, 640], theme: '{{ANTAGONIST_FAMILY}} hậu cung âm mưu cuối', payoff: 'âm mưu bóc trần, gian thần xử' },
      { number: 8, range: [641, 660], theme: 'Cải cách quân đội triệt để', payoff: 'quân đội hiện đại, vũ khí cải tiến' },
      { number: 9, range: [661, 680], theme: 'Liên thủ chư hầu chống MC', payoff: 'MC dẹp loạn, chư hầu thuần phục' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: nhiếp chính + cải cách triệt để + hoàng đế giao quyền', payoff: 'MC chuẩn bị đoạt ngôi / cứu nước' },
    ],
  },
  {
    arcNumber: 6,
    range: [701, 900],
    theme: 'Đoạt ngôi / được tôn lên — hoàng đế',
    corePayoff: '{{MC_NAME}} hoàng đế {{DYNASTY_NAME}}, thống nhất đảng phái, mở rộng đế quốc, đối đầu cosmic-tier ngoại địch (Mông Cổ / liên minh quốc tế)',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Hoàng đế thoái vị + MC tôn lên', payoff: 'MC hoàng đế, niên hiệu mới' },
      { number: 2, range: [721, 740], theme: 'Tổ chức hoàng triều — phân quyền hợp lý', payoff: 'triều đình ổn định' },
      { number: 3, range: [741, 760], theme: 'Mở rộng đế quốc — chiếm thêm 5 châu', payoff: 'lãnh thổ tăng 50%' },
      { number: 4, range: [761, 780], theme: 'Liên minh quốc tế chống MC', payoff: 'first cosmic-tier threat' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: trận chiến quốc tế đầu tiên thắng', payoff: 'face-slap liên minh quốc tế' },
      { number: 6, range: [801, 820], theme: 'Reveal: gian thần lưu vong liên kết ngoại địch', payoff: 'plot twist, kẻ địch chính' },
      { number: 7, range: [821, 840], theme: 'Cải cách hành chính + công nghệ in', payoff: 'kinh tế bùng nổ, dân số tăng' },
      { number: 8, range: [841, 860], theme: '{{CONSORT_NAME}} hoàng hậu — kế thừa thế hệ 2', payoff: 'thái tử / công chúa, ổn định' },
      { number: 9, range: [861, 880], theme: 'Trận chiến cuối liên minh quốc tế', payoff: 'liên minh tan, đế quốc bá chủ' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: bá chủ thiên hạ — chuẩn bị endgame', payoff: 'thiên hạ thái bình, sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7,
    range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: '{{MC_NAME}} đạt {{ENDING_GOAL}}, kế thừa thế hệ 2, ending warm với {{CONSORT_NAME}} + {{LOYAL_GENERAL}}',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last threat — gian thần lưu vong tái xuất', payoff: 'phát hiện âm mưu cuối' },
      { number: 2, range: [921, 940], theme: 'Chuẩn bị {{ENDING_GOAL}}', payoff: 'lực lượng chuẩn bị' },
      { number: 3, range: [941, 960], theme: 'Trận chiến cuối — gian thần + ngoại địch', payoff: 'kẻ địch cuối thua' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt được', payoff: 'thiên hạ thống nhất / thịnh thế' },
      { number: 5, range: [981, 1000], theme: 'ENDING: kế thừa thế hệ 2 + warm closure', payoff: 'thái tử lên ngôi, MC + {{CONSORT_NAME}} retire, ending warm' },
    ],
  },
];
