/**
 * Quan-truong "modern-bureaucrat" master template — 1000-chapter skeleton.
 *
 * Archetype: MC thanh niên trẻ vào cơ quan nhà nước cấp xã / huyện ({{HOMETOWN}}),
 * có hậu phương gia đình hoặc kiến thức hiện đại, leo từ cán bộ trẻ → bí
 * thư xã → bí thư huyện → bí thư tỉnh → cán bộ cấp cao trung ương →
 * lãnh đạo quốc gia. Conflict qua đấu đá nội bộ + chống tham nhũng + cải
 * cách hành chính.
 *
 * NON_COMBAT — conflict qua chính trị, không bạo lực vật lý.
 *
 * Cảnh giới (cấp bậc cán bộ):
 *   Arc 1 (1-50):    Cán bộ trẻ → phó bí thư xã (cấp xã)
 *   Arc 2 (51-150):  Phó bí thư xã → bí thư huyện (cấp huyện)
 *   Arc 3 (151-300): Bí thư huyện → bí thư tỉnh (cấp tỉnh)
 *   Arc 4 (301-500): Bí thư tỉnh → bộ trưởng (cấp trung ương)
 *   Arc 5 (501-700): Bộ trưởng → phó thủ tướng (cấp lãnh đạo)
 *   Arc 6 (701-900): Phó thủ tướng → thủ tướng (chính phủ)
 *   Arc 7 (901-1000): Thủ tướng → {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{MC_NAME}}, {{MC_FAMILY}}, {{HOMETOWN}}
 *   {{PROVINCE_NAME}} — Tỉnh, vd "Hà Tĩnh"
 *   {{CAPITAL_CITY}} — Thủ đô, vd "Hà Nội"
 *   {{ANTAGONIST_FAMILY}} — Họ phái đối thủ, vd "Lý phái"
 *   {{CORRUPT_OFFICIAL}} — Cán bộ tham nhũng cấp cao, vd "Hoàng X"
 *   {{LIFE_PARTNER}} — Bạn đời, vd "Phạm Lan"
 *   {{REFORM_BANNER}} — Khẩu hiệu cải cách, vd "Thanh Liêm Tân Chính"
 *   {{LOYAL_FRIEND}} — Đồng đội cán bộ, vd "Trương Đại"
 *   {{COUNTRY_NAME}} — Quốc gia, vd "Việt Nam"
 *   {{ENDING_GOAL}} — Vd "Tổng bí thư + cải cách quốc gia thành công"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const QUAN_TRUONG_BUREAUCRAT_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Cán bộ trẻ {{HOMETOWN}} — phó bí thư xã',
    corePayoff: 'MC từ cán bộ tốt nghiệp về xã, leo lên phó bí thư xã, cải cách nông nghiệp, manh mối {{ANTAGONIST_FAMILY}} tham nhũng',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — về xã làm cán bộ, gia đình ấm', payoff: 'cán bộ chính thức, mạng lưới gia đình' },
      { number: 2, range: [6, 10], theme: 'First project — cải cách nông nghiệp xã', payoff: 'năng suất tăng 30%, dân tin' },
      { number: 3, range: [11, 15], theme: '{{ANTAGONIST_FAMILY}} đệ tử khinh thường', payoff: 'face-slap qua kết quả công tác' },
      { number: 4, range: [16, 20], theme: 'Cải cách thuế xã', payoff: 'thu thuế tăng, dân ủng hộ' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: bầu phó bí thư xã', payoff: 'phó bí thư xã, danh tiếng huyện' },
      { number: 6, range: [26, 30], theme: '{{LIFE_PARTNER}} kết bạn (cùng cán bộ)', payoff: 'partner + chiến lược' },
      { number: 7, range: [31, 35], theme: '{{ANTAGONIST_FAMILY}} cấp xã ngăn cản', payoff: 'face-slap, đối thủ mất uy' },
      { number: 8, range: [36, 40], theme: 'Plant manh mối {{CORRUPT_OFFICIAL}}', payoff: 'plot thread arc 3 plant' },
      { number: 9, range: [41, 45], theme: 'Cải cách giáo dục xã', payoff: 'school upgrade, network giáo viên' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: lên huyện công tác', payoff: 'cấp huyện, sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Cấp huyện — bí thư huyện',
    corePayoff: 'MC bí thư huyện, đảng phái MC mạnh, đối đầu {{ANTAGONIST_FAMILY}} cấp huyện, manh mối {{CORRUPT_OFFICIAL}}',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Vào huyện — gặp các phái', payoff: 'mạng lưới huyện' },
      { number: 2, range: [61, 70], theme: 'Cải cách kinh tế huyện', payoff: 'kinh tế huyện tăng' },
      { number: 3, range: [71, 80], theme: '{{ANTAGONIST_FAMILY}} cấp huyện tấn công', payoff: 'face-slap qua kết quả' },
      { number: 4, range: [81, 90], theme: 'Lập đảng phái MC', payoff: 'đảng MC 30 cán bộ' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: bầu bí thư huyện', payoff: 'bí thư huyện' },
      { number: 6, range: [101, 110], theme: '{{CORRUPT_OFFICIAL}} cấp huyện first contact', payoff: 'first contact tham nhũng' },
      { number: 7, range: [111, 120], theme: 'Bằng chứng tham nhũng nhỏ', payoff: 'plot thread escalate' },
      { number: 8, range: [121, 130], theme: 'Cải cách hành chính huyện', payoff: 'huyện top tỉnh' },
      { number: 9, range: [131, 140], theme: 'Trận đối đầu cuối huyện - {{ANTAGONIST_FAMILY}} bại', payoff: '{{ANTAGONIST_FAMILY}} cấp huyện tan' },
      { number: 10, range: [141, 150], theme: 'CLIMAX arc 2: bí thư huyện + đảng MC mạnh', payoff: 'sẵn sàng arc 3 tỉnh' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Cấp tỉnh — bí thư tỉnh',
    corePayoff: 'Bí thư {{PROVINCE_NAME}}, đảng MC trên cấp tỉnh, {{CORRUPT_OFFICIAL}} cấp tỉnh bại',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Vào tỉnh - gặp các đảng phái', payoff: 'mạng lưới tỉnh' },
      { number: 2, range: [166, 180], theme: 'Cải cách kinh tế tỉnh', payoff: 'tỉnh GDP tăng' },
      { number: 3, range: [181, 200], theme: '{{ANTAGONIST_FAMILY}} cấp tỉnh tấn công', payoff: 'face-slap mass' },
      { number: 4, range: [201, 220], theme: 'Bằng chứng tham nhũng cấp tỉnh', payoff: 'plot thread peak' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: bầu bí thư tỉnh', payoff: 'bí thư tỉnh' },
      { number: 6, range: [241, 260], theme: '{{CORRUPT_OFFICIAL}} cấp tỉnh hợp lực phản công', payoff: 'phòng thủ thành công' },
      { number: 7, range: [261, 280], theme: 'Cải cách giáo dục cấp tỉnh', payoff: 'tỉnh top quốc gia' },
      { number: 8, range: [281, 295], theme: 'Trận đối đầu cuối - {{CORRUPT_OFFICIAL}} cấp tỉnh bại', payoff: 'corrupt official cấp tỉnh xử' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: bí thư tỉnh + đảng MC top', payoff: 'sẵn sàng arc 4 trung ương' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Cấp trung ương — bộ trưởng',
    corePayoff: 'Bộ trưởng cấp cao, đảng MC top quốc gia, {{REFORM_BANNER}} ban hành, {{CORRUPT_OFFICIAL}} trung ương first contact',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Lên trung ương - {{CAPITAL_CITY}}', payoff: 'mạng lưới trung ương' },
      { number: 2, range: [321, 340], theme: 'Bộ trưởng nhậm chức', payoff: 'bộ trưởng cấp cao' },
      { number: 3, range: [341, 360], theme: '{{REFORM_BANNER}} dự thảo', payoff: 'dự thảo cải cách quốc gia' },
      { number: 4, range: [361, 380], theme: 'Đảng phái cũ phản kháng', payoff: 'face-slap qua bằng chứng' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: {{REFORM_BANNER}} ban hành', payoff: 'cải cách quốc gia triển khai' },
      { number: 6, range: [401, 420], theme: '{{CORRUPT_OFFICIAL}} trung ương phản công', payoff: 'phòng thủ thành công' },
      { number: 7, range: [421, 440], theme: 'Bằng chứng tham nhũng cấp cao', payoff: 'plot thread escalate' },
      { number: 8, range: [441, 460], theme: 'Trận chiến phái cũ', payoff: 'phái cũ tan' },
      { number: 9, range: [461, 480], theme: 'Reveal: {{CORRUPT_OFFICIAL}} liên kết quốc tế', payoff: 'plot twist' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: bộ trưởng top + cải cách thành công', payoff: 'sẵn sàng arc 5 phó thủ tướng' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Phó thủ tướng — quốc gia level',
    corePayoff: 'Phó thủ tướng, đối phó mafia kinh tế quốc tế, cải cách triệt để, {{LIFE_PARTNER}} kết hôn',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'Phó thủ tướng nhậm chức', payoff: 'phó thủ tướng' },
      { number: 2, range: [521, 540], theme: 'Cải cách kinh tế quốc gia', payoff: 'GDP tăng 10%' },
      { number: 3, range: [541, 560], theme: 'Mafia kinh tế quốc tế first contact', payoff: 'face-slap mafia minor' },
      { number: 4, range: [561, 580], theme: '{{LIFE_PARTNER}} kết hôn', payoff: 'gia đình ổn định' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: thắng mafia kinh tế', payoff: 'mafia kinh tế lui' },
      { number: 6, range: [601, 620], theme: 'Cải cách cấp cao toàn quốc', payoff: 'cải cách triệt để' },
      { number: 7, range: [621, 640], theme: 'Liên minh quốc tế ủng hộ', payoff: 'partner quốc tế' },
      { number: 8, range: [641, 660], theme: 'Mafia cuối cùng bại', payoff: 'mafia kinh tế dập' },
      { number: 9, range: [661, 680], theme: 'Cải cách giáo dục triệt để', payoff: 'giáo dục top khu vực' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: phó thủ tướng + cải cách triệt để', payoff: 'sẵn sàng arc 6 thủ tướng' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Thủ tướng — chính phủ',
    corePayoff: 'Thủ tướng, đối phó cosmic-tier kinh tế threat (global crash), kế thừa thế hệ 2 prep',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Thủ tướng nhậm chức', payoff: 'thủ tướng' },
      { number: 2, range: [721, 740], theme: 'Cải cách triệt để cấp chính phủ', payoff: 'chính phủ stable' },
      { number: 3, range: [741, 760], theme: 'Global threat warning - black swan', payoff: 'phát hiện global crash' },
      { number: 4, range: [761, 780], theme: 'Build defense quốc gia', payoff: 'nền kinh tế strong' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: thắng global crisis', payoff: '{{COUNTRY_NAME}} không bị crisis' },
      { number: 6, range: [801, 820], theme: 'Reveal: mafia kinh tế quốc tế cosmic-tier', payoff: 'plot thread peak' },
      { number: 7, range: [821, 840], theme: 'Mass coup attempt nội bộ', payoff: 'phòng thủ + counter' },
      { number: 8, range: [841, 860], theme: 'Mafia kinh tế cosmic dập', payoff: 'global mafia bại' },
      { number: 9, range: [861, 880], theme: '{{LIFE_PARTNER}} có con — kế thừa', payoff: 'thế hệ 2' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: thủ tướng top + global respect', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, kế thừa thế hệ 2, ending warm',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last threat - global ngoại địch', payoff: 'phát hiện ngoại địch' },
      { number: 2, range: [921, 940], theme: 'Build cosmic-tier solution', payoff: 'plan ready' },
      { number: 3, range: [941, 960], theme: 'Final battle ngoại địch', payoff: 'BBEG thua' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt', payoff: 'achievement' },
      { number: 5, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'thế hệ 2 lên, MC + {{LIFE_PARTNER}} retire, ending warm' },
    ],
  },
];
