/**
 * Do-thi "thập niên 80/90" — decade-jumps pattern.
 *
 * MC trọng sinh về thập niên 70/80/90 với kiến thức tương lai. Mỗi
 * arc = 1 industry phase / 1 decade. Focus economic development +
 * family rural-to-urban transition + generational change.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const DO_THI_THAP_NIEN_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: '{{REBIRTH_YEAR}} — trọng sinh + cứu gia đình',
    corePayoff: 'MC ổn định gia đình, đầu tư đầu tiên, thoát nghèo',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Trọng sinh về {{HOMETOWN}} — gia đình nghèo', payoff: 'kiến thức tương lai active, gia đình stable' },
      { number: 2, range: [8, 14], theme: 'First đầu tư — hoạt động nhỏ', payoff: 'quán nhỏ / shop / venture đầu hoạt động' },
      { number: 3, range: [15, 21], theme: '{{ANTAGONIST_FAMILY}} thị nhỏ chèn ép', payoff: 'face-slap qua hợp đồng' },
      { number: 4, range: [22, 28], theme: 'Đầu tư đất / cổ phiếu sớm', payoff: 'tài sản tích luỹ visible' },
      { number: 5, range: [29, 35], theme: '{{LIFE_PARTNER}} kết bạn', payoff: 'partner + cảm xúc' },
      { number: 6, range: [36, 42], theme: 'Mở rộng kinh doanh nhỏ', payoff: '3 chi nhánh, dòng tiền dương' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: gia đình stable + first big win', payoff: 'gia đình thoát nghèo, danh tiếng nội đô' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: '{{DECADE_2}} — leo thành công ty {{HOMETOWN}}',
    corePayoff: 'MC công ty top {{HOMETOWN}}, ngành cải cách mở cửa, mass face-slap đối thủ',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Lập công ty chính thức', payoff: 'công ty + nhân viên đầu' },
      { number: 2, range: [66, 80], theme: 'Cạnh tranh thành phố', payoff: 'face-slap competitors' },
      { number: 3, range: [81, 95], theme: 'Đầu tư BĐS sớm — dự đoán giá', payoff: 'tài sản đất tăng vọt' },
      { number: 4, range: [96, 110], theme: '{{ANTAGONIST_FAMILY}} cấp thành phố tấn công', payoff: 'face-slap mass thông qua connections' },
      { number: 5, range: [111, 125], theme: 'Mở rộng product line', payoff: 'company top {{HOMETOWN}}' },
      { number: 6, range: [126, 140], theme: 'Đính hôn {{LIFE_PARTNER}}', payoff: 'gia đình mở rộng' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: top {{HOMETOWN}} + cấp tỉnh chú ý', payoff: 'sẵn sàng cấp tỉnh / quốc gia' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: '{{DECADE_3}} — toàn quốc + chống chaebol',
    corePayoff: 'Tập đoàn quốc gia, đè bẹp {{COMPETITION_BRAND}}, IPO local',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Mở chi nhánh các thành phố', payoff: '5 city presence' },
      { number: 2, range: [171, 190], theme: '{{COMPETITION_BRAND}} tấn công', payoff: 'face-slap qua giá + chất lượng' },
      { number: 3, range: [191, 210], theme: 'Đầu tư công nghệ — internet sớm', payoff: 'tech advantage' },
      { number: 4, range: [211, 230], theme: 'IPO local lần đầu', payoff: 'company niêm yết' },
      { number: 5, range: [231, 250], theme: '{{ANTAGONIST_FAMILY}} cấp quốc gia tấn công', payoff: 'face-slap qua bằng chứng tham nhũng' },
      { number: 6, range: [251, 270], theme: 'M&A startup nhỏ', payoff: 'thị phần tăng' },
      { number: 7, range: [271, 290], theme: 'Trận chiến cuối national — {{COMPETITION_BRAND}} bại', payoff: 'top 5 toàn quốc' },
      { number: 8, range: [291, 300], theme: 'CLIMAX arc 3: top 5 quốc gia + IPO local', payoff: 'sẵn sàng quốc tế' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: '{{DECADE_4}} — quốc tế + IPO Mỹ',
    corePayoff: 'IPO NASDAQ, tài phiệt USD, top 10 ngành global',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Mở văn phòng quốc tế', payoff: '3 văn phòng global' },
      { number: 2, range: [321, 340], theme: 'IPO NASDAQ chuẩn bị', payoff: 'roadshow thành công' },
      { number: 3, range: [341, 360], theme: 'IPO thành công', payoff: 'tài phiệt USD' },
      { number: 4, range: [361, 380], theme: 'MNC tấn công - patent lawsuit', payoff: 'thắng lawsuit' },
      { number: 5, range: [381, 400], theme: 'Forbes 100 — MC trẻ nhất', payoff: 'global recognition' },
      { number: 6, range: [401, 420], theme: 'Mass M&A MNC nhỏ', payoff: 'expand global' },
      { number: 7, range: [421, 440], theme: 'Liên minh MNC chống MC', payoff: 'face-slap mass MNC' },
      { number: 8, range: [441, 460], theme: 'IPO Hong Kong', payoff: 'niêm yết HK' },
      { number: 9, range: [461, 480], theme: 'Top 10 ngành global', payoff: 'top 10 confirmed' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: top 10 ngành + kết hôn {{LIFE_PARTNER}}', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: '{{DECADE_5}} — tech revolution + cách mạng ngành',
    corePayoff: 'Top 3 global, dẫn dắt cách mạng công nghệ, thâu tóm 1 MNC',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'AI / smartphone era launch', payoff: 'next-gen product' },
      { number: 2, range: [521, 540], theme: 'Mass M&A MNC top 50', payoff: 'thâu tóm thành công' },
      { number: 3, range: [541, 560], theme: 'TIME 100 + Nobel Hòa Bình nominee', payoff: 'global respect peak' },
      { number: 4, range: [561, 580], theme: 'Mở 30 sectors quốc gia', payoff: 'multi-sector global' },
      { number: 5, range: [581, 600], theme: 'Tech revolution mass face-slap', payoff: 'dẫn dắt ngành global' },
      { number: 6, range: [601, 620], theme: 'Mafia kinh tế intervention', payoff: 'mafia bại' },
      { number: 7, range: [621, 640], theme: '{{LIFE_PARTNER}} có con — kế thừa thế hệ 2', payoff: 'thế hệ 2 lên' },
      { number: 8, range: [641, 660], theme: 'Davos keynote', payoff: 'global respect' },
      { number: 9, range: [661, 680], theme: 'Top 3 global confirmed', payoff: 'top 3 global stable' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: top 3 + cách mạng', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: '{{DECADE_6}} — top 1 + chính sách quốc gia',
    corePayoff: 'Top 1 ngành global, ảnh hưởng chính sách, charity 5B USD',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Top 1 confirmed', payoff: 'tập đoàn 200B USD' },
      { number: 2, range: [721, 740], theme: 'Cố vấn chính phủ {{COUNTRY_NAME}}', payoff: 'ảnh hưởng chính sách' },
      { number: 3, range: [741, 760], theme: 'Charity foundation 5B USD', payoff: 'foundation lập' },
      { number: 4, range: [761, 780], theme: 'Mafia kinh tế cosmic-tier', payoff: 'face-slap mafia cosmic' },
      { number: 5, range: [781, 800], theme: 'Davos + global liên minh', payoff: 'tỷ phú liên minh' },
      { number: 6, range: [801, 820], theme: 'Mass mafia bại', payoff: 'global market clean' },
      { number: 7, range: [821, 840], theme: 'Mở rộng cosmic infrastructure', payoff: 'global infrastructure' },
      { number: 8, range: [841, 860], theme: 'Thế hệ 2 đại biểu', payoff: 'children take over partial' },
      { number: 9, range: [861, 880], theme: 'Top tỷ phú global #1', payoff: 'tỷ phú #1 stable' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: top global + chính sách', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — endgame',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm + retirement',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last threat - black swan', payoff: 'phát hiện black swan' },
      { number: 2, range: [921, 940], theme: 'Restructure for endgame', payoff: 'restructured ready' },
      { number: 3, range: [941, 960], theme: 'Black swan resolve', payoff: 'crisis past, MC stable' },
      { number: 4, range: [961, 980], theme: '{{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 5, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'thế hệ 2 take over, MC retire' },
    ],
  },
];
