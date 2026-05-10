/**
 * Do-thi (urban) "modern-reborn-genius" master template — 1000-chapter skeleton.
 *
 * Archetype: MC sống lại / xuyên hồn từ tương lai (vd: 2026 → 2000) vào
 * thân thể chính mình thanh niên 18-22t, mang theo kinh nghiệm thị trường,
 * công nghệ, sự kiện lớn của 20+ năm tới. Khởi nghiệp từ con số 0 → tài
 * phiệt top quốc gia / quốc tế. NON_COMBAT — conflict resolve qua M&A /
 * thị trường / lawsuit / PR / talent poaching, không bao giờ qua bạo lực
 * vật lý.
 *
 * Warm baseline (Phase 19D): ch.1 MC tỉnh dậy với venture {{STARTING_BUSINESS}}
 * ĐÃ OPERATIONAL (không phải starving / mất việc). Hook = OPPORTUNITY (khách
 * hàng đầu tiên / deal đầu tiên xuất hiện), không phải THREAT.
 *
 * Cảnh giới progression (placeholder cho business flavor):
 *   Arc 1 (1-50):    Cá nhân venture + gia đình ổn định
 *   Arc 2 (51-150):  Mở rộng venture toàn {{CITY_NAME}}
 *   Arc 3 (151-300): Đối đầu {{ANTAGONIST_FAMILY}} chaebol thành phố
 *   Arc 4 (301-500): Toàn quốc — đối đầu {{COMPETITION_BRAND}} cấp quốc gia
 *   Arc 5 (501-700): Quốc tế — IPO, M&A xuyên biên giới
 *   Arc 6 (701-900): Cách mạng công nghệ — MC dẫn dắt ngành
 *   Arc 7 (901-1000): Đỉnh tài phiệt + {{ENDING_GOAL}}
 *
 * Beat pattern: 5-cluster (setup / breathing / confront / big_wow / resolution).
 *
 * Placeholder tokens:
 *   {{MC_NAME}}              — Tên MC, vd "Trần Đông Hải"
 *   {{MC_FAMILY}}            — Họ MC, vd "Trần"
 *   {{HOMETOWN}}             — Quê quán, vd "Hà Nội", "Sài Gòn"
 *   {{CITY_NAME}}            — Thành phố action chính, vd "Sài Gòn"
 *   {{STARTING_BUSINESS}}    — Venture đầu, vd "quán net", "studio game", "shop e-commerce"
 *   {{SIGNATURE_VENTURE}}    — Sản phẩm signature, vd "phần mềm chat", "platform e-commerce"
 *   {{ANTAGONIST_FAMILY}}    — Họ chaebol đối thủ, vd "Lý"
 *   {{COMPETITION_BRAND}}    — Đối thủ tập đoàn lớn, vd "Đại Phát Tập Đoàn"
 *   {{LIFE_PARTNER}}         — Bạn đời / co-founder nữ, vd "Nguyễn Lan Anh"
 *   {{COUNTRY_NAME}}         — Quốc gia, vd "Việt Nam"
 *   {{REBIRTH_YEAR}}         — Năm trọng sinh, vd "năm 2000"
 *   {{REBIRTH_FROM_YEAR}}    — Năm tương lai về, vd "năm 2026"
 *   {{ENDING_GOAL}}          — Đích cuối, vd "tài phiệt #1 quốc tế", "thay đổi thời đại"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const DO_THI_REBORN_GENIUS_ARC_SKELETON: ArcSkeleton[] = [
  // ─── ARC 1 (1-50): Trở về — venture đầu + gia đình ─────────────────────
  {
    arcNumber: 1,
    range: [1, 50],
    theme: 'Trở về {{REBIRTH_YEAR}} — venture {{STARTING_BUSINESS}} ổn định + gia đình',
    corePayoff:
      '{{MC_NAME}} từ thanh niên ẩn dật thành ông chủ {{STARTING_BUSINESS}} hot nhất {{HOMETOWN}}, gia đình thoát khó, gặp {{LIFE_PARTNER}}, manh mối {{SIGNATURE_VENTURE}}',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — venture đã hoạt động, khách hàng đầu tiên', payoff: '{{STARTING_BUSINESS}} có doanh thu, gia đình thoát nợ ngắn hạn' },
      { number: 2, range: [6, 10], theme: 'Mở rộng venture — tuyển nhân viên + chốt khách', payoff: 'venture đông khách, biên lợi nhuận tốt, dòng tiền dương' },
      { number: 3, range: [11, 15], theme: 'Cạnh tranh nội đô — first competitor xuất hiện', payoff: 'MC dùng hiểu biết tương lai face-slap competitor, market share tăng' },
      { number: 4, range: [16, 20], theme: 'Gia đình mở rộng — bố mẹ đầu tư cùng', payoff: 'gia đình tin tưởng, cổ phần phân chia minh bạch' },
      { number: 5, range: [21, 25], theme: 'BIG WOW giải thi khởi nghiệp {{HOMETOWN}}', payoff: '{{MC_NAME}} top 3, được báo chí phỏng vấn, danh tiếng nội đô' },
      { number: 6, range: [26, 30], theme: '{{LIFE_PARTNER}} xuất hiện — co-founder / partner', payoff: 'đối tác chiến lược + cảm xúc nhẹ nhàng (sảng văn không drama)' },
      { number: 7, range: [31, 35], theme: '{{ANTAGONIST_FAMILY}} thị nhỏ chèn ép', payoff: 'face-slap thương lượng, MC dùng hợp đồng nắm thóp đối thủ' },
      { number: 8, range: [36, 40], theme: 'Manh mối {{SIGNATURE_VENTURE}} — kỹ thuật mới mang từ tương lai', payoff: 'prototype {{SIGNATURE_VENTURE}} ready, kế hoạch arc 2' },
      { number: 9, range: [41, 45], theme: 'Đầu tư mở rộng — chuỗi {{STARTING_BUSINESS}} 3 chi nhánh', payoff: '3 chi nhánh, khách hàng ổn định, manpower 30+' },
      { number: 10, range: [46, 50], theme: 'CLIMAX arc 1: đại lễ kỷ niệm 1 năm + ra mắt {{SIGNATURE_VENTURE}}', payoff: 'venture #1 {{HOMETOWN}}, gia đình ổn định, sẵn sàng arc 2 mở rộng' },
    ],
  },
  // ─── ARC 2 (51-150): Toàn {{CITY_NAME}} — chaebol nội đô ──────────────
  {
    arcNumber: 2,
    range: [51, 150],
    theme: 'Mở rộng toàn {{CITY_NAME}} — đối đầu chaebol nội đô',
    corePayoff:
      '{{MC_NAME}} thành ông chủ tập đoàn nhỏ tại {{CITY_NAME}}, {{SIGNATURE_VENTURE}} ra thị trường, đè bẹp 3 chaebol nội đô, gọi vốn vòng A thành công',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Lập tập đoàn — đăng ký pháp nhân, văn phòng HQ', payoff: 'tập đoàn chính thức, văn phòng + 50 nhân viên' },
      { number: 2, range: [61, 70], theme: '{{SIGNATURE_VENTURE}} ra mắt thị trường', payoff: 'launch event, 10K khách hàng đăng ký tuần đầu' },
      { number: 3, range: [71, 80], theme: '{{ANTAGONIST_FAMILY}} thị nội đô tổ chức boycott', payoff: 'MC face-slap qua PR + chất lượng sản phẩm, boycott fail' },
      { number: 4, range: [81, 90], theme: 'M&A nhỏ — mua lại 1 startup yếu', payoff: 'tích hợp công nghệ, đội ngũ engineering tăng' },
      { number: 5, range: [91, 100], theme: 'BIG WOW giải khởi nghiệp toàn {{CITY_NAME}}', payoff: '#1 toàn thành phố, truyền thông quốc gia phỏng vấn' },
      { number: 6, range: [101, 110], theme: 'Gọi vốn vòng A — VC quốc tế quan tâm', payoff: 'vòng A 5 triệu USD, định giá tăng 10×' },
      { number: 7, range: [111, 120], theme: 'Chaebol nội đô liên thủ — lawsuit + PR đen', payoff: 'MC thắng lawsuit, PR đen bị bóc trần' },
      { number: 8, range: [121, 130], theme: 'Mở rộng product line — {{SIGNATURE_VENTURE}} 2.0', payoff: 'sản phẩm 2 + chuỗi cung ứng riêng' },
      { number: 9, range: [131, 140], theme: 'Trận chiến cuối nội đô — chaebol bại', payoff: '3 chaebol nội đô mất market share lớn, MC #1' },
      { number: 10, range: [141, 150], theme: 'CLIMAX arc 2: tập đoàn IPO local + {{LIFE_PARTNER}} đối tác chính thức', payoff: 'tập đoàn niêm yết sàn local, MC thành tỷ phú VND' },
    ],
  },
  // ─── ARC 3 (151-300): Toàn quốc — chaebol cấp quốc gia ───────────────
  {
    arcNumber: 3,
    range: [151, 300],
    theme: 'Mở rộng toàn quốc {{COUNTRY_NAME}} — đối đầu {{COMPETITION_BRAND}}',
    corePayoff:
      '{{MC_NAME}} tập đoàn top 5 {{COUNTRY_NAME}}, ngành {{SIGNATURE_VENTURE}} dẫn đầu, M&A 3 startup quốc gia, đè bẹp {{COMPETITION_BRAND}}',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Mở chi nhánh ngoài {{CITY_NAME}}', payoff: '5 thành phố lớn có chi nhánh, khách hàng cả nước' },
      { number: 2, range: [166, 180], theme: '{{COMPETITION_BRAND}} tấn công thị phần', payoff: 'MC face-slap qua giá + chất lượng, market share tăng' },
      { number: 3, range: [181, 200], theme: 'M&A startup #1 — tích hợp công nghệ AI', payoff: 'AI module integrated, sản phẩm hot toàn quốc' },
      { number: 4, range: [201, 220], theme: 'Vòng B funding — VC top quốc tế', payoff: 'vòng B 50M USD, định giá unicorn approach' },
      { number: 5, range: [221, 240], theme: 'BIG WOW giải khởi nghiệp toàn quốc', payoff: '#1 toàn quốc, thủ tướng tiếp đãi (PR mass)' },
      { number: 6, range: [241, 260], theme: '{{COMPETITION_BRAND}} liên thủ chaebol khác', payoff: 'MC dùng tin tức tương lai dự đoán, phòng thủ' },
      { number: 7, range: [261, 280], theme: 'M&A startup #2 + #3 — domino effect', payoff: 'thị phần tăng 60%, ngành dẫn đầu' },
      { number: 8, range: [281, 295], theme: 'Trận chiến cuối toàn quốc — {{COMPETITION_BRAND}} bại', payoff: '{{COMPETITION_BRAND}} buộc M&A vào tập đoàn MC' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: top 5 toàn quốc + {{LIFE_PARTNER}} đính hôn', payoff: 'tập đoàn unicorn, MC #1 ngành, gia đình ổn định' },
    ],
  },
  // ─── ARC 4 (301-500): Quốc tế — MNCs, IPO Mỹ ─────────────────────────
  {
    arcNumber: 4,
    range: [301, 500],
    theme: 'Mở rộng quốc tế — IPO Mỹ + đối đầu MNCs (multinational corporations)',
    corePayoff:
      '{{MC_NAME}} tập đoàn niêm yết NASDAQ, top 10 ngành quốc tế, M&A MNC nhỏ, đối đầu MNCs Mỹ + Trung trong cùng ngành',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Mở văn phòng quốc tế — Mỹ, Singapore, Trung', payoff: '3 văn phòng quốc tế, đội ngũ đa quốc gia' },
      { number: 2, range: [321, 340], theme: 'IPO Mỹ chuẩn bị — roadshow + due diligence', payoff: 'roadshow thành công, định giá 5B USD' },
      { number: 3, range: [341, 360], theme: 'MNC Mỹ tấn công — patent lawsuit', payoff: 'MC thắng lawsuit nhờ kiến thức tương lai về luật' },
      { number: 4, range: [361, 380], theme: 'IPO NASDAQ — niêm yết thành công', payoff: 'IPO 8B USD, MC tỷ phú USD' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: Forbes 100 — MC trẻ nhất top', payoff: 'Forbes phong, truyền thông quốc tế' },
      { number: 6, range: [401, 420], theme: 'MNC Trung tấn công — copycat product', payoff: 'MC patent + chiến lược, copycat phải rút' },
      { number: 7, range: [421, 440], theme: 'M&A MNC nhỏ Mỹ — tích hợp công nghệ chip', payoff: 'chip technology owned, ngành dẫn đầu cấp toàn cầu' },
      { number: 8, range: [441, 460], theme: 'Liên minh MNCs Trung tấn công cuối', payoff: 'MC liên thủ MNC Mỹ + EU, MNCs Trung bại' },
      { number: 9, range: [461, 480], theme: 'Trận chiến trung tâm IPO Hong Kong', payoff: 'niêm yết HK, định giá 20B USD' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: top 10 ngành quốc tế + {{LIFE_PARTNER}} kết hôn', payoff: 'MC tỷ phú top global, gia đình hoàn chỉnh' },
    ],
  },
  // ─── ARC 5 (501-700): Tech revolution — MC dẫn dắt ngành ─────────────
  {
    arcNumber: 5,
    range: [501, 700],
    theme: 'Cách mạng công nghệ — MC dẫn dắt ngành, {{COMPETITION_BRAND}} hồi sinh',
    corePayoff:
      '{{MC_NAME}} dẫn dắt cách mạng {{SIGNATURE_VENTURE}} 3.0, đè bẹp {{COMPETITION_BRAND}} resurrected, mở rộng ra ngành lân cận, top 3 ngành global',
    subArcs: [
      { number: 1, range: [501, 520], theme: '{{SIGNATURE_VENTURE}} 3.0 — AI generation breakthrough', payoff: 'next-gen product launch, hype global' },
      { number: 2, range: [521, 540], theme: '{{COMPETITION_BRAND}} hồi sinh — tỷ phú mới đầu tư', payoff: 'first contact đối thủ resurrected' },
      { number: 3, range: [541, 560], theme: 'Mở rộng ngành lân cận — biotech / fintech', payoff: 'M&A startup biotech / fintech, đa ngành' },
      { number: 4, range: [561, 580], theme: 'BIG WOW: TIME 100 + Nobel Hòa bình nominee', payoff: 'global recognition mass, ngành tôn vinh' },
      { number: 5, range: [581, 600], theme: '{{COMPETITION_BRAND}} liên thủ tỷ phú khác', payoff: 'MC dùng kiến thức tương lai dự đoán, phòng thủ' },
      { number: 6, range: [601, 620], theme: 'Lab nghiên cứu cấp quốc gia mở', payoff: 'lab quy mô lớn, hợp tác chính phủ {{COUNTRY_NAME}}' },
      { number: 7, range: [621, 640], theme: 'M&A MNC top 50 - thâu tóm cạnh tranh', payoff: 'thâu tóm MNC top 50, ngành dẫn đầu' },
      { number: 8, range: [641, 660], theme: '{{COMPETITION_BRAND}} cuối cùng bại', payoff: '{{COMPETITION_BRAND}} ngừng cạnh tranh, M&A vào MC' },
      { number: 9, range: [661, 680], theme: 'Mở rộng đa quốc gia 30 quốc gia', payoff: '30 nước có operation, ảnh hưởng global' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: top 3 global + ngành revolution', payoff: 'MC dẫn dắt cách mạng công nghệ thế kỷ' },
    ],
  },
  // ─── ARC 6 (701-900): Đỉnh ngành + tham vọng quốc gia ────────────────
  {
    arcNumber: 6,
    range: [701, 900],
    theme: 'Đỉnh ngành + tham vọng cấp quốc gia — MC ảnh hưởng chính sách',
    corePayoff:
      '{{MC_NAME}} top 1 ngành global, ảnh hưởng chính sách quốc gia, lập quỹ từ thiện cấp tỷ USD, đối đầu chính trị mafia kinh tế quốc tế',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Top 1 ngành — IPO secondary tăng giá trị', payoff: 'tập đoàn top 1 global, định giá 200B USD' },
      { number: 2, range: [721, 740], theme: 'Ảnh hưởng chính sách {{COUNTRY_NAME}} — cố vấn cao cấp', payoff: 'cố vấn cao cấp chính phủ, ảnh hưởng chính sách' },
      { number: 3, range: [741, 760], theme: 'Lập quỹ từ thiện cấp tỷ USD', payoff: 'foundation 5B USD, ảnh hưởng xã hội' },
      { number: 4, range: [761, 780], theme: 'Mafia kinh tế quốc tế tấn công — short selling', payoff: 'MC face-slap qua kiến thức tương lai, mafia bại' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: Davos keynote speaker', payoff: 'World Economic Forum keynote, global respect' },
      { number: 6, range: [801, 820], theme: 'Liên minh tỷ phú toàn cầu — cùng MC', payoff: 'top tỷ phú liên minh chiến lược cùng MC' },
      { number: 7, range: [821, 840], theme: '{{LIFE_PARTNER}} có con — gia đình mở rộng', payoff: 'con đầu lòng, kế thừa thế hệ 2' },
      { number: 8, range: [841, 860], theme: 'Mafia kinh tế cuối cùng bại', payoff: 'mafia bại hoàn toàn, market clean' },
      { number: 9, range: [861, 880], theme: 'Mở rộng cấp toàn cầu - infrastructure', payoff: 'infrastructure global, ảnh hưởng economy' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: top tỷ phú global + ảnh hưởng economy', payoff: 'MC ảnh hưởng cấp G20, cool down chuẩn bị endgame' },
    ],
  },
  // ─── ARC 7 (901-1000): {{ENDING_GOAL}} + ENDING ──────────────────────
  {
    arcNumber: 7,
    range: [901, 1000],
    theme: '{{ENDING_GOAL}} + closure',
    corePayoff:
      '{{MC_NAME}} đạt {{ENDING_GOAL}}, kế thừa thế hệ 2, gia đình hoàn chỉnh, ending warm với {{LIFE_PARTNER}}',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last cosmic-tier challenge — economic black swan event', payoff: 'phát hiện sự kiện đen 2030 (kiến thức tương lai)' },
      { number: 2, range: [921, 940], theme: 'Chuẩn bị {{ENDING_GOAL}} — restructuring tập đoàn', payoff: 'tập đoàn restructured, ready for endgame' },
      { number: 3, range: [941, 960], theme: 'Black swan event hit — market crash', payoff: 'MC phòng thủ thành công, đối thủ bại' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt được', payoff: 'tài phiệt #1 / thay đổi thời đại / etc — đích cuối' },
      { number: 5, range: [981, 1000], theme: 'ENDING: kế thừa + warm closure', payoff: 'thế hệ 2 lên, MC + {{LIFE_PARTNER}} retire, ending warm' },
    ],
  },
];
