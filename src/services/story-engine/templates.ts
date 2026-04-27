/**
 * Story Engine v2 — Genre Templates
 *
 * Migrated from story-writing-factory/templates.ts (Phase 7 cleanup).
 * Pure data — no business logic dependencies.
 */

import { GenreType, DopamineType, StyleBible, PowerSystem } from './types';

// ============================================================================
// DOPAMINE PATTERNS - Công thức tạo sảng khoái
// ============================================================================

export interface DopaminePattern {
  type: DopamineType;
  name: string;
  description: string;
  frequency: 'every_chapter' | 'every_3_chapters' | 'every_arc' | 'arc_end';
  intensity: 'medium' | 'high' | 'very_high' | 'extreme';
  setup: string;
  payoff: string;
}

export const DOPAMINE_PATTERNS: Record<DopamineType, DopaminePattern> = {
  face_slap: {
    type: 'face_slap',
    name: 'Tát mặt',
    description: 'Đối thủ kinh ngạc/thán phục/câm lặng trước thành tựu hoặc thực lực của MC',
    frequency: 'every_chapter',
    intensity: 'high',
    setup: 'OPTION A (PROACTIVE — ưu tiên): MC chủ động hành động (kinh doanh, thi triển tài năng, đạt thành tựu) → đối thủ quan sát từ ngoài. OPTION B: Villain coi thường/xúc phạm MC trước.',
    payoff: 'OPTION A (PROACTIVE — ưu tiên): Kết quả MC vượt xa kỳ vọng → đối thủ kinh ngạc thán phục, không thể phản kháng. OPTION B: MC đánh bại villain ngoạn mục.',
  },
  power_reveal: {
    type: 'power_reveal',
    name: 'Lộ sức mạnh',
    description: 'MC tiết lộ thực lực khiến mọi người sốc',
    frequency: 'every_3_chapters',
    intensity: 'very_high',
    setup: 'Mọi người đánh giá thấp MC',
    payoff: 'MC thể hiện sức mạnh vượt xa dự đoán',
  },
  treasure_gain: {
    type: 'treasure_gain',
    name: 'Nhặt kho báu',
    description: 'MC có được vật phẩm quý hiếm',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'Phát hiện địa điểm/cơ hội bí mật',
    payoff: 'Thu hoạch tài nguyên quý giá',
  },
  breakthrough: {
    type: 'breakthrough',
    name: 'Đột phá',
    description: 'MC lên cảnh giới mới',
    frequency: 'every_arc',
    intensity: 'very_high',
    setup: 'Tích lũy đủ, gặp khó khăn kích thích',
    payoff: 'Đột phá thành công, sức mạnh tăng vọt',
  },
  revenge: {
    type: 'revenge',
    name: 'Trả thù',
    description: 'MC đánh bại kẻ thù cũ',
    frequency: 'arc_end',
    intensity: 'extreme',
    setup: 'Nhớ lại mối hận cũ',
    payoff: 'Đánh bại kẻ thù thỏa mãn',
  },
  recognition: {
    type: 'recognition',
    name: 'Được công nhận',
    description: 'Người khác nhận ra giá trị của MC',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'MC bị hiểu lầm hoặc bỏ qua',
    payoff: 'Người quan trọng công nhận tài năng',
  },
  beauty_encounter: {
    type: 'beauty_encounter',
    name: 'Gặp mỹ nhân',
    description: 'MC gặp và gây ấn tượng với nữ nhân vật',
    frequency: 'every_arc',
    intensity: 'medium',
    setup: 'Hoàn cảnh bất ngờ gặp gỡ',
    payoff: 'Tạo ấn tượng tốt, hint romance',
  },
  secret_identity: {
    type: 'secret_identity',
    name: 'Thân phận bí ẩn',
    description: 'Lộ ra MC có background khủng',
    frequency: 'arc_end',
    intensity: 'extreme',
    setup: 'Manh mối về quá khứ MC',
    payoff: 'Tiết lộ thân phận choáng váng',
  },
  business_success: {
    type: 'business_success',
    name: 'Thành công kinh doanh',
    description: 'Chốt deal lớn, kiếm lợi nhuận bùng nổ',
    frequency: 'every_3_chapters',
    intensity: 'high',
    setup: 'Bị ép giá / gặp rào cản kinh doanh / đối thủ chèn ép, HOẶC nhìn ra cơ hội thị trường mới (không cần adversity)',
    payoff: 'Lật ngược thế cờ HOẶC chốt deal mượt mà, kiếm tiền sốc, thị trường kinh ngạc',
  },
  harvest: {
    type: 'harvest',
    name: 'Thu hoạch thành quả',
    description: 'Đạt được thành quả sau thời gian dài chăm sóc',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'Chăm sóc vất vả / nguy cơ thất thu, HOẶC chăm sóc đến mùa thu hoạch một cách yên bình',
    payoff: 'Thu hoạch đột biến, sản phẩm chất lượng cao hiếm có',
  },
  flex_wealth: {
    type: 'flex_wealth',
    name: 'Thể hiện tài phú/IQ',
    description: 'Giải quyết vấn đề bằng tiền hoặc trí tuệ áp đảo',
    frequency: 'every_chapter',
    intensity: 'high',
    setup: 'Bị coi thường / bị dồn vào góc, HOẶC chủ động dùng tài lực giải quyết (không cần ai khinh trước)',
    payoff: 'Dùng tiền hoặc IQ đập nát âm mưu HOẶC giải quyết mượt mà, đối phương câm nín hoặc kinh ngạc',
  },
  comfort: {
    type: 'comfort',
    name: 'Ấm áp/Chữa lành',
    description: 'Khoảnh khắc bình yên, thấu hiểu, đồ ăn ngon',
    frequency: 'every_chapter',
    intensity: 'medium',
    setup: 'Mệt mỏi/áp lực/vết thương cũ, HOẶC đơn thuần là khoảnh khắc ấm áp đời thường (không cần đau khổ trước)',
    payoff: 'Được quan tâm, ăn ngon, cảm thấy bình yên và thấu hiểu',
  },
  comedy_misunderstanding: {
    type: 'comedy_misunderstanding',
    name: 'Hiểu lầm hài hước',
    description: 'Hiểu lầm tạo ra tình huống dở khóc dở cười',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'Thông tin không đồng nhất, suy diễn sai lệch',
    payoff: 'Phát hiện sự thật đầy bất ngờ và hài hước',
  },
  steal_luck: {
    type: 'steal_luck',
    name: 'Cướp đoạt Khí vận',
    description: 'Phản phái MC cướp đoạt cơ duyên, bảo vật hoặc hồng nhan của Thiên Mệnh Chi Tử',
    frequency: 'every_3_chapters',
    intensity: 'high',
    setup: 'Thiên Mệnh Chi Tử chuẩn bị lấy được bảo vật/tình cảm',
    payoff: 'MC xen ngang cướp đoạt mượt mà, Thiên Mệnh Chi Tử tức hộc máu nhưng không làm gì được',
  },
  simulate_success: {
    type: 'simulate_success',
    name: 'Mô phỏng thành công',
    description: 'MC dùng hệ thống mô phỏng tìm ra đường sống trong chỗ chết',
    frequency: 'every_3_chapters',
    intensity: 'extreme',
    setup: 'Tình huống bế tắc, 99.9% là chết',
    payoff: 'MC dùng kết quả mô phỏng lật kèo hoàn hảo, bàng quan kinh hãi vì sự "tiên tri" của MC',
  },
  tears_of_regret: {
    type: 'tears_of_regret',
    name: 'Nước mắt hối hận',
    description: 'Sự thật về sự hy sinh thầm lặng của MC được phơi bày',
    frequency: 'arc_end',
    intensity: 'extreme',
    setup: 'MC bị hiểu lầm là kẻ ác, bị mọi người xỉ vả và phản bội',
    payoff: 'Ký ức/sự thật bộc quang, những kẻ từng phản bội ôm đầu khóc lóc hối hận tột cùng',
  },
  flex_power_casual: {
    type: 'flex_power_casual',
    name: 'Tiện tay nghiền nát',
    description: 'MC quá mạnh, tiện tay làm một việc nhỏ cũng gây chấn động',
    frequency: 'every_3_chapters',
    intensity: 'high',
    setup: 'Kẻ thù tự cao tự đại đem theo tuyệt chiêu mạnh nhất',
    payoff: 'MC chỉ hắt xì hoặc phẩy tay cũng khiến kẻ thù tan thành tro bụi, quần chúng hóa đá',
  },
  civilization_harvest: {
    type: 'civilization_harvest',
    name: 'Thu hoạch văn minh',
    description: 'Quan sát và thu hoạch thành quả từ nền văn minh do MC tạo ra',
    frequency: 'every_3_chapters',
    intensity: 'extreme',
    setup: 'MC gieo mầm sự sống, tua nhanh thời gian hàng vạn năm',
    payoff: 'Nền văn minh phát triển rực rỡ, hiến tế sức mạnh/tín ngưỡng cho MC, hoặc MC lấy trộm kỹ thuật của họ',
  },
  player_exploitation: {
    type: 'player_exploitation',
    name: 'Bóc lột người chơi',
    description: 'Bóc lột công sức của Đệ tứ thiên tai (game thủ)',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'Game thủ liều mạng đánh boss, nộp tiền nạp thẻ, cày cuốc ngày đêm',
    payoff: 'MC ngồi mát ăn bát vàng, thu hoạch toàn bộ lợi ích, game thủ vẫn khen "game quá hay"',
  },
  two_world_shock: {
    type: 'two_world_shock',
    name: 'Hai thế giới kinh hãi',
    description: 'Đem đồ hiện đại sang dị giới hoặc ngược lại gây sốc',
    frequency: 'every_chapter',
    intensity: 'high',
    setup: 'Dị giới đang thiếu thốn tài nguyên, khinh thường MC',
    payoff: 'MC móc ra bật lửa, mì gói hoặc súng AK khiến cao thủ dị giới quỳ rạp, đổi lấy kho báu vạn năm',
  },
  master_flex: {
    type: 'master_flex',
    name: 'Sư tôn vô địch',
    description: 'MC yếu nhưng dựa vào đồ đệ não bổ và buff hệ thống để dọa người',
    frequency: 'every_3_chapters',
    intensity: 'extreme',
    setup: 'Đồ đệ gặp nguy hiểm sinh tử, đối mặt đại năng cao hơn nhiều cảnh giới',
    payoff: 'MC xuất hiện với phong thái đạo mạo, dùng đạo cụ/hệ thống một chiêu dọa sợ hoặc miểu sát đại năng',
  },
  book_manifestation: {
    type: 'book_manifestation',
    name: 'Sách hiện thực',
    description: 'Độc giả lĩnh ngộ từ sách hoặc triệu hoán nhân vật trong sách',
    frequency: 'arc_end',
    intensity: 'extreme',
    setup: 'Mọi người khinh thường truyện của MC, hoặc MC gặp nguy hiểm không có người bảo vệ',
    payoff: 'Độc giả đột phá nhờ đọc sách quỳ lạy MC, hoặc MC triệu hoán Tôn Ngộ Không ra đập tan kẻ thù',
  },
  monster_evolution: {
    type: 'monster_evolution',
    name: 'Tiến hóa quái vật',
    description: 'Ăn nuốt hoặc hấp thụ gene để tiến hóa hình thái mới',
    frequency: 'every_3_chapters',
    intensity: 'high',
    setup: 'MC (dạng quái vật) gặp kẻ thù mạnh hơn, đánh bại và nuốt chửng',
    payoff: 'Hệ thống báo tiến hóa, mọc thêm cánh/chuyển dạng, chỉ số tăng vọt, đè bẹp kẻ thù tiếp theo',
  },
  // ── Anti-self-torture patterns: dopamine without requiring adversity setup ──
  smooth_opportunity: {
    type: 'smooth_opportunity',
    name: 'Chộp cơ hội',
    description: 'MC quan sát thấy cơ hội rồi hành động nhanh gọn, không cần ai chèn ép trước',
    frequency: 'every_chapter',
    intensity: 'medium',
    setup: 'MC quan sát thấy cơ hội (thị trường ngách, tài nguyên ẩn, quan hệ tốt, manh mối nhỏ)',
    payoff: 'MC chộp lấy nhanh gọn, kết quả vượt mong đợi — KHÔNG cần kẻ thù hay rào cản trước',
  },
  casual_competence: {
    type: 'casual_competence',
    name: 'Tự tin giải quyết',
    description: 'MC giải quyết vấn đề tự nhiên với kinh nghiệm/tài nguyên có sẵn',
    frequency: 'every_chapter',
    intensity: 'medium',
    setup: 'Vấn đề/yêu cầu xuất hiện, người thường thấy khó',
    payoff: 'MC giải quyết tự nhiên với kinh nghiệm/tài nguyên có sẵn, bystander kinh ngạc nhẹ — KHÔNG cần đau khổ trước',
  },
  peaceful_growth: {
    type: 'peaceful_growth',
    name: 'Phát triển yên bình',
    description: 'MC tiến bộ trong khoảng thời gian yên bình giữa các sự kiện lớn',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'Khoảng thời gian yên bình giữa các sự kiện lớn',
    payoff: 'MC tiến bộ qua training/quan hệ/khám phá nhỏ — không cần kẻ thù tạo áp lực',
  },
  // ── "Ngón tay vàng" patterns: MC win without combat (modern 2024-2026 standard) ──
  knowledge_leverage: {
    type: 'knowledge_leverage',
    name: 'Dùng Kiến Thức Thắng',
    description: 'MC leverage chuyên môn / kiến thức tương lai / training quá khứ để giải vấn đề',
    frequency: 'every_chapter',
    intensity: 'high',
    setup: 'Vấn đề xuất hiện, người khác bối rối / không biết hướng giải quyết',
    payoff: 'MC dùng kiến thức/chuyên môn (kỹ thuật, y học, kinh doanh, lịch sử) đưa giải pháp elegant — bystander kinh ngạc, đối thủ câm lặng. KHÔNG combat.',
  },
  network_payoff: {
    type: 'network_payoff',
    name: 'Quan Hệ Giải Quyết',
    description: 'MC dùng network/connection + đàm phán → win không cần đối đầu',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'Vấn đề thông thường cần "force" hoặc thời gian dài',
    payoff: 'MC gọi 1 cuộc điện thoại / nhờ 1 mối quan hệ / đàm phán mượt mà → vấn đề tan biến. Đối thủ ngạc nhiên vì MC có connection họ không ngờ.',
  },
  business_pivot: {
    type: 'business_pivot',
    name: 'Xoay Chiều Kinh Doanh',
    description: 'MC đọc thị trường, pivot strategy → grow mà không cần đối đầu trực tiếp',
    frequency: 'every_3_chapters',
    intensity: 'high',
    setup: 'Market signal (đối thủ ra mắt, customer feedback, trend mới)',
    payoff: 'MC adapt strategy mượt — beat competition bằng innovation/product/positioning, KHÔNG bằng confrontation hay thị phần war.',
  },
  quiet_competence: {
    type: 'quiet_competence',
    name: 'Lặng Lẽ Chuyên Nghiệp',
    description: 'MC làm việc lặng lẽ, không khoe — kết quả vượt expect khiến người xung quanh nhận ra',
    frequency: 'every_chapter',
    intensity: 'medium',
    setup: 'MC giao việc thông thường, không ai để ý',
    payoff: 'Kết quả của MC vượt xa standard — sếp/đồng nghiệp/khách hàng dần nhận ra MC thực lực. Recognition tự nhiên không cần MC self-promotion.',
  },
  insider_advantage: {
    type: 'insider_advantage',
    name: 'Lợi Thế Kẻ Biết Trước',
    description: 'MC dùng ký ức tương lai / kiến thức nội bộ → chộp deal trước khi người khác nhận ra',
    frequency: 'every_3_chapters',
    intensity: 'high',
    setup: 'Cơ hội/nguy cơ chỉ MC biết trước (dựa rebirth memory, insider info, expert knowledge)',
    payoff: 'MC ra quyết định trước — đầu tư đúng, tránh bẫy, ký deal đúng thời điểm. Sau đó người khác mới nhận ra MC "biết trước" như thế nào.',
  },
};

// ============================================================================
// GENRE STYLE CONFIGS
// ============================================================================

export const GENRE_STYLES: Record<GenreType, StyleBible> = {
  'tien-hiep': {
    authorVoice: 'Giọng văn thâm trầm, cổ kính, nhiều miêu tả tu luyện và chiến đấu',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['thâm trầm', 'huyền bí', 'bá đạo', 'ngạo thế'],
    avoidKeywords: ['cute', 'kawaii', 'hiện đại quá mức'],
    dialogueRatio: [30, 45],
    descriptionRatio: [30, 45],
    innerThoughtRatio: [15, 25],
    actionRatio: [10, 20],
    pacingStyle: 'fast',
    genreConventions: [
      // ── 2026 META: Anti-cliché tien-hiep ──
      'GHI CHÚ THỜI ĐẠI 2024-2026: Đọc giả TQ đã chán "phế vật → thiên tài" + "hệ thống cheat" + "vô địch từ chương 1" + "harem". Hits 2024 (《十日终焉》, 《玄鉴仙族》, 《谁让他修仙的！》) là anti-trope: intelligent MC, gia tộc multi-gen, hài phản set. VN reader lag 2-3 năm nhưng cũng đang chuyển — engine ưu tiên VARIATIONS, KHÔNG ép mọi truyện theo formula.',
      // ── Nhân vật mẫu (đa dạng, không cứng "phế vật") ──
      'MC archetype có thể là: (a) phế vật → thiên tài (cliché classic, dùng cho 30% project); (b) intelligent MC (như Qixia 《十日终焉》: thắng bằng tâm lý, mưu kế, không qua power-up); (c) gia tộc successor (huyền giám tiên tộc style: trách nhiệm gia tộc thay vì lone wolf); (d) coward smart MC (yếu nhưng cẩn thận, mưu trí); (e) tu tiên đời thường (thường dân giả tu, không bá đạo). Genre engine NÊN chọn ngẫu nhiên/theo seed, KHÔNG mặc định "phế vật".',
      'Villain KHÔNG cứ "thiếu gia kiêu ngạo" — có thể là rival cùng thế hệ phát triển song song, đại năng có lý tưởng đối lập (không evil), hệ phái kẻ thù tổ chức tốt, hoặc thiên đạo/quy luật vũ trụ (impersonal villain). CẤM mặc định "thiếu gia khinh thường MC".',
      'Nữ chính KHÔNG cứ "kiêu ngạo ban đầu khinh MC" — có thể là đồng môn cùng tu, sư phụ hoặc đệ tử của MC, đối tác đan dược, hoặc 无CP (không love interest, MC tu đạo độc lập).',
      // ── Tiến trình cốt truyện ──
      'Đột phá KHÔNG cứng nhắc "5-10 chương 1 tiểu cảnh giới" — tu luyện có thể kéo dài tự nhiên theo arc plan; có arc tập trung cơ duyên/khám phá thay vì power-up. CẤM tu tiên grind chapter machine.',
      'Sự kiện ngược KHÔNG ép "3 chương 1 trận chiến" — cho phép arc gia tộc/đời thường/khám phá không có chiến đấu. Sub-arc 5-10 chương resolve theo theme đa dạng (cơ duyên, mưu kế, quan hệ, gia tộc, đan đạo).',
      'Bí cảnh/phế tích KHÔNG cứ mỗi arc — có thể skip, hoặc thay bằng explore vùng đất mới, gặp gỡ tông phái mới, hoặc gia tộc affair.',
      // ── Hệ thống sức mạnh ──
      'Tu luyện không nhất thiết theo formula "tích lũy → gặp nguy → lĩnh ngộ → đột phá" — có thể là quan sát cảm ngộ qua đời sống, đan dược, trận pháp, hoặc gia tộc bí truyền. Đa dạng path.',
      'Golden finger TÙY CHỌN — KHÔNG ép mỗi project có hệ thống/lão gia trong nhẫn. Anti-trope project có thể explicit "không hệ thống" như 《十日终焉》 (winning marketing 2024).',
      // ── Leo thang xung đột (proactive options) ──
      'Conflict scale linear KHÔNG bắt buộc "thiếu gia → gia tộc → tông phái → thần giới". Có thể horizontal (đấu trí, ngoại giao, thương đạo trong giới tu) hoặc internal (đột phá tâm cảnh, ma chướng nội tâm) thay vì vertical power escalation.',
      'Tournament arc KHÔNG ép mỗi arc — chỉ dùng khi arc plan rõ ràng yêu cầu. Modern hits ưu tiên gia tộc affair, đan đạo, mưu kế hơn tournament cliché.',
      // ── Phụ tuyến ──
      'Harem KHÔNG mặc định — có thể single love interest, slow burn, hoặc 无CP. Nếu có harem cũng nên có chemistry rõ ràng từng người, KHÔNG "mỗi arc 1 girl".',
      'Thân phận bí ẩn cực khủng KHÔNG bắt buộc — không phải mọi MC phải là "con rơi gia tộc đỉnh". Có thể là ordinary cultivator với câu chuyện ordinary nhưng kể hay.',
      // ── Pattern còn giữ (hợp 2026) ──
      'Foreshadowing network: plant seeds sớm (chương 5), harvest muộn (chương 30+), tạo "aha moment". Đặc biệt cho project gia tộc multi-gen.',
      'Side character có diễn biến riêng — không chỉ phục vụ MC. 2024+ readers đặc biệt thích huynh đệ/bằng hữu phát triển song song với MC.',
      'Worldbuilding emerge từ ACTION + cảm xúc nhân vật — KHÔNG info-dump. Quy tắc thế giới khám phá qua thử thách thực, KHÔNG đoạn giảng giải dài.',
      'Multi-POV: rival cùng thế hệ cũng nỗ lực (POV rival), gia tộc affair (POV trưởng bối), bystander kinh ngạc — tạo chiều sâu thế giới.',
    ],
  },
  'huyen-huyen': {
    authorVoice: 'Giọng văn hoành tráng, miêu tả chiến đấu chi tiết, hot blood',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['huyền bí', 'hoành tráng', 'nhiệt huyết', 'bá khí'],
    avoidKeywords: ['hiện đại', 'khoa học'],
    dialogueRatio: [30, 40],
    descriptionRatio: [30, 40],
    innerThoughtRatio: [10, 20],
    actionRatio: [15, 25],
    pacingStyle: 'fast',
    genreConventions: [
      // ── 2026 META: Anti-cliché huyen-huyen ──
      'GHI CHÚ THỜI ĐẠI 2024-2026: Hits 2024 (《宿命之环》Cthulhu+Đạo gia, genre blending) là cross-cultural hybrid. Tournament arc / sect war / faction rivalry đã old-white. Engine ƯU TIÊN: hệ phái sức mạnh đa dạng (không cứ tu tiên TQ), worldbuilding cross-cultural, mưu kế thay tournament.',
      // ── Nhân vật mẫu (đa dạng archetype) ──
      'MC archetype có thể là: (a) thể chất đặc biệt/chuyển sinh (cliché classic, dùng cho 30% project); (b) intelligent MC thắng bằng kiến thức/mưu kế (modern hit pattern); (c) gia tộc successor; (d) anti-hero với động cơ phức tạp; (e) ordinary protagonist climbing slow. Engine NÊN chọn theo seed/anti-trope flag.',
      'Villain KHÔNG cứ "thiên tài cùng thế hệ + tà ma đạo cường giả" — có thể là rival có lý tưởng đối lập (không evil), thế lực impersonal (thiên đạo, quy luật), gia tộc đối thủ tổ chức tốt, hoặc internal demon (ma chướng tâm cảnh).',
      'Nữ chính KHÔNG cứ "thiên kiêu nữ background tông phái khủng" — đa dạng: đồng môn, đối tác, sư phụ-đệ tử, hoặc 无CP nếu MC focus tu đạo độc lập.',
      // ── Tiến trình cốt truyện ──
      'Hệ sức mạnh rõ ràng KHÔNG cứ TQ template (thể/pháp/kiếm/đan/trận/luyện khí) — có thể tự tạo system (ma pháp Tây, rune, blood magic, cosmology) hoặc cross-cultural blend.',
      'Tournament arc TÙY CHỌN — modern hits ưu tiên mưu kế / khám phá / family affair hơn. Chỉ dùng khi arc plan rõ ràng yêu cầu, KHÔNG mặc định "mỗi 15-25 chương 1 tournament".',
      'Boss battle cuối arc TÙY CHỌN — có thể thay bằng emotional/intellectual climax (revelation lớn, mưu kế thành công, quan hệ đột phá) thay vì combat.',
      // ── Hệ thống sức mạnh ──
      'Chiến đấu epic scale ĐƯỢC khuyến khích NHƯNG KHÔNG ép mỗi chương — có thể có chương không combat. Modern reader thích combat đậm + chương đời thường xen kẽ.',
      'Việt cấp chiến đấu CẦN lý do hợp lý (chiến thuật, địa hình, đạo cụ, đồng đội), KHÔNG phải "ngộ tính + cơ duyên" lười biếng.',
      // ── Leo thang xung đột ──
      'Conflict scale KHÔNG cứ "cá nhân → tông phái → vương triều → thần tộc" linear. Có thể horizontal (mưu kế đa thế lực), internal (tâm cảnh, ma chướng), hoặc family (multi-generation gia tộc).',
      'Bí mật thế giới hé lộ dần — pattern này GIỮ vì là core appeal của huyen-huyen, NHƯNG seed phải gieo từ chương sớm, KHÔNG bịa vào giữa truyện.',
      // ── Phụ tuyến (modern emphasis) ──
      'Huynh đệ kết nghĩa nên có background + động cơ riêng từ đầu — KHÔNG chỉ là "side kick phục vụ MC". Có thể trưởng thành thành rival hoặc đồng cường giả.',
      'Tài nguyên/bảo vật KHÔNG cần "mỗi 10 chương 1 loại mới" — quá tải cho reader. Chỉ giới thiệu khi plot cần, integrate vào worldbuilding tự nhiên.',
      'Prophecy/lời tiên tri TÙY CHỌN — modern reader thích MC chủ động hơn là "destined hero". Có thể bỏ hoặc subvert (prophecy được MC phá vỡ).',
      // ── Pattern còn giữ ──
      'Rival phát triển song song MC (POV rival nỗ lực) — modern reader đặc biệt thích.',
      'Foreshadowing network: plant seeds sớm, harvest muộn, "aha moment" — core craft, giữ.',
      'Side character có diễn biến riêng (phản bội, hy sinh, trưởng thành) — modern reader đòi hỏi.',
      'Worldbuilding emerge từ action + cảm xúc, KHÔNG info-dump.',
      'Multi-POV ưu tiên: rival, gia tộc/sư môn affair, bystander reaction.',
    ],
  },
  'do-thi': {
    authorVoice: 'Giọng văn hiện đại, nhanh gọn, nhiều hội thoại sắc bén',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['sảng văn', 'hiện đại', 'đô thị', 'phong lưu'],
    avoidKeywords: ['cổ trang', 'tu luyện'],
    dialogueRatio: [40, 50],
    descriptionRatio: [25, 35],
    innerThoughtRatio: [15, 25],
    actionRatio: [10, 15],
    pacingStyle: 'fast',
    genreConventions: [
      // ── PROACTIVE NARRATIVE (business-cycle-driven, KHÔNG villain-first) ──
      'CHU TRÌNH KINH DOANH (xương sống do-thi/thương chiến): MC nhận diện cơ hội → đầu tư hành động → đạt KẾT QUẢ THỰC (doanh thu/sản phẩm/khách hàng) → đối thủ/đồng nghiệp QUAN SÁT từ ngoài → kinh ngạc/thán phục/cố phản ứng → MC tiếp tục mở rộng. Đây là PATTERN GỐC — KHÔNG được thay bằng "villain xuất hiện dập MC trước rồi MC chống đỡ".',
      'CẤM TUYỆT ĐỐI villain-first: KHÔNG cho đối thủ/villain xuất hiện đe dọa/uy hiếp/dập MC khi MC chưa hành động kinh doanh gì. Đối thủ chỉ được REACT sau khi MC đã có kết quả/thành tựu cụ thể.',
      'Đối thủ trong do-thi là COMPETITOR (đối thủ kinh doanh có lý do hợp lý: thị phần, khách hàng, deal), KHÔNG phải ANTAGONIST (kẻ thù chủ động hãm hại). Competitor có thể trở thành đồng minh sau khi nể phục MC.',
      // ── Nhân vật mẫu ──
      'MC có background đặc biệt: trọng sinh, kinh nghiệm thị trường tương lai, hệ thống kinh doanh, hoặc thiên tài quan sát thị trường — KHÔNG nhất thiết "thân phận bí ẩn cực khủng"',
      'Nữ chính là đối tác/đồng nghiệp/khách hàng quan sát MC kinh doanh, dần thán phục — KHÔNG bắt buộc "tổng tài lạnh lùng" cliché',
      'Người thân/bạn bè ban đầu hoài nghi quyết định kinh doanh của MC, sau phải nể phục khi thấy kết quả — không phải khi "biết thân phận thật"',
      // ── Tiến trình cốt truyện (proactive milestones) ──
      'MC liên tục có MILESTONE kinh doanh cụ thể: cửa hàng đầu tiên → thương hiệu → chuỗi → tập đoàn → đa quốc gia. Mỗi arc 1-2 milestone rõ ràng (con số doanh thu, lượng khách, market share).',
      'Tài năng MC thể hiện qua HÀNH ĐỘNG kinh doanh: chọn ngách thị trường, định giá, đàm phán, tuyển nhân tài, marketing — KHÔNG chỉ qua "đánh mặt villain".',
      'Plot mở rộng theo SCALE DOANH NGHIỆP (thành phố → khu vực → quốc gia → quốc tế), KHÔNG phải theo "kẻ thù mạnh dần".',
      // ── Đối thủ leo thang (REACTIVE only) ──
      'Đối thủ kinh doanh xuất hiện ONLY KHI MC đã chiếm thị phần đủ lớn để gây áp lực lên họ. Họ phản ứng (ép giá, cướp khách, lobby chính trị) → MC dùng chiến lược tốt hơn → họ thua.',
      'CẤM "kẻ thù chủ động hãm hại MC vô cớ" — mọi đối thủ phải có lý do kinh doanh rõ ràng (mất deal, mất khách, bị chiếm thị phần).',
      // ── Sảng văn proactive ──
      'Sảng văn đến từ KẾT QUẢ KINH DOANH (chốt deal lớn, sản phẩm bán chạy, doanh thu vượt kỳ vọng, được công nhận trong ngành), không phải từ "đánh bại villain".',
      'Status flex mỗi 10 chương qua THÀNH TỰU thực (con số doanh thu, ký kết hợp đồng, được lên báo, đối tác quốc tế tìm đến) — KHÔNG qua "khoe siêu xe trước mặt kẻ khinh thường".',
      'Người thân/đối tác arc: từ hoài nghi → quan sát → kinh ngạc → nể phục → tự hào, theo từng milestone kinh doanh của MC.',
      // ── Đời sống xa hoa (giữ nhưng không villain-bait) ──
      'Đời sống nâng cấp dần theo doanh thu: căn hộ thuê → căn hộ riêng → biệt thự, miêu tả chi tiết để tạo dopamine "thu hoạch", KHÔNG để khoe trước villain.',
      // ── Exposition kinh doanh ──
      'Kiến thức kinh doanh, marketing, đầu tư phổ cập tự nhiên qua quyết định + hành động + đối thoại — KHÔNG giải thích dài kiểu sách giáo khoa.',
      // ── Multi-POV ưu tiên đồng minh/competitor quan sát ──
      'Đa góc nhìn ưu tiên: POV competitor quan sát MC từ xa và kinh ngạc, POV nhân viên thán phục lãnh đạo MC, POV khách hàng hài lòng. POV "villain bàn mưu hại MC" chỉ dùng KHI arc plan cần — KHÔNG mặc định.',
    ],
  },
  'kiem-hiep': {
    authorVoice: 'Giọng văn cổ điển, nhiều miêu tả võ công và giang hồ',
    narrativeStyle: 'third_person_omniscient',
    toneKeywords: ['hiệp nghĩa', 'giang hồ', 'ân oán', 'tình thù'],
    avoidKeywords: ['hiện đại', 'công nghệ'],
    dialogueRatio: [35, 45],
    descriptionRatio: [30, 40],
    innerThoughtRatio: [15, 20],
    actionRatio: [15, 25],
    pacingStyle: 'medium',
    genreConventions: [
      // Nhân vật mẫu
      'MC là hiệp khách trọng nghĩa khinh tài, hoặc thiếu niên mồ côi ôm mối hận lớn lên giữa giang hồ',
      'Villain là ma đầu/giáo chủ tà phái hoặc ngụy quân tử danh môn chính phái, mưu mô thâm hiểm',
      'Sư phụ truyền thụ tuyệt học rồi bị hại/biến mất, MC phải tự mình trưởng thành trong giang hồ',
      'Nữ chính là nữ hiệp hào sảng hoặc tiểu thư danh môn, tình cảm phát triển qua sinh tử cùng nhau',
      // Tiến trình cốt truyện
      'Ân oán phân minh: có ân phải báo, có thù phải trả, mỗi arc giải quyết một mối ân oán',
      'Bí kíp võ công thất truyền là macguffin chính: nhiều thế lực tranh đoạt, MC tình cờ có được',
      'Giang hồ đại hội mỗi 20-30 chương: võ lâm đại hội, anh hùng yến, so kiếm luận hiệp',
      // Hệ thống sức mạnh
      'Võ công miêu tả chi tiết bằng hình ảnh thơ mộng: kiếm như rồng bay phượng múa, chưởng mang khí tượng sơn hà',
      'MC lĩnh ngộ tuyệt học qua thiên nhiên, thư pháp, âm nhạc, kỳ nghệ - không chỉ đơn thuần luyện đao kiếm',
      // Leo thang xung đột
      'Xung đột từ cá nhân → bang phái → chính tà → triều đình → thiên hạ đại loạn',
      'Âm mưu nhiều tầng: kẻ thù bề ngoài chỉ là con tốt, kẻ giật dây thật sự ẩn giấu đến cuối arc',
      // Phụ tuyến & hook
      'Tình huynh đệ giang hồ: kết nghĩa, phản bội, hy sinh - tạo cảm xúc mạnh mẽ',
      'Tình yêu bi tráng: chính tà bất lưỡng lập, tình thù giao tranh, không thể bên nhau',
      'Bối cảnh lịch sử giao thoa: triều đình, gian thần, nghĩa quân tạo chiều sâu cho câu chuyện',
      'Giang hồ quy tắc bất thành văn: nghĩa khí, tửu, kiếm, thi thư tạo bầu không khí lãng mạn kiếm hiệp',
    ],
  },
  'lich-su': {
    authorVoice: 'Giọng văn trang trọng, nhiều chi tiết lịch sử',
    narrativeStyle: 'third_person_omniscient',
    toneKeywords: ['cổ trang', 'quyền mưu', 'triều đình'],
    avoidKeywords: ['hiện đại', 'công nghệ'],
    dialogueRatio: [35, 45],
    descriptionRatio: [35, 45],
    innerThoughtRatio: [15, 25],
    actionRatio: [5, 15],
    pacingStyle: 'medium',
    genreConventions: [
      // Nhân vật mẫu
      'MC xuyên không về thời cổ đại mang theo tri thức hiện đại, hoặc MC là hoàng tử/quan viên tầm thấp',
      'Villain là hoàng đế đa nghi, gian thần nắm triều chính, hoặc thế gia cổ có quyền lực nghìn năm',
      'Quân sư/mưu sĩ trung thành là cánh tay phải, bổ sung trí tuệ cho MC trong cung đình mưu kế',
      'Nữ chính là công chúa/quận chúa hoặc nữ gián điệp, hôn nhân chính trị gắn liền tình cảm',
      // Tiến trình cốt truyện
      'Chính trị triều đình phức tạp: phe phái, mưu kế, liên minh, phản bội xoay quanh ngai vàng',
      'MC sử dụng kiến thức hiện đại (nông nghiệp, quân sự, kinh tế) để thay đổi cục diện lịch sử',
      'Mỗi 15-20 chương giải quyết 1 cuộc khủng hoảng: phản loạn, ngoại xâm, thiên tai, nạn đói',
      // Hệ thống sức mạnh (quyền lực thay vì võ lực)
      'Sức mạnh đo bằng quyền lực, quân đội, tài chính, nhân tài - không phải tu luyện',
      'Mưu kế thông minh nhiều tầng: kế trung kế, phản gián kế, dương đông kích tây, tạo cảm giác IQ cao',
      // Leo thang xung đột
      'Xung đột từ địa phương → triều đình → chiến tranh biên giới → tranh đoạt thiên hạ → thống nhất',
      'Mỗi lần thắng lợi kéo theo hậu quả chính trị mới, phe địch phản công bằng mưu kế tinh vi hơn',
      // Phụ tuyến & hook
      'Cải cách kinh tế/quân sự gây xung đột với thế lực cũ, MC phải cân bằng đổi mới và sinh tồn',
      'Hậu cung chính trị: mỗi phi tử đại diện 1 thế lực, tình cảm gắn liền lợi ích quốc gia',
      'Chi tiết lịch sử chân thực xen kẽ hư cấu: triều đại, phong tục, quân sự, tạo cảm giác chân thực',
      'Kết chương bằng bước ngoặt chính trị: mưu kế bại lộ, đồng minh phản bội, chiếu chỉ bất ngờ',
      // Exposition thông minh
      'Kiến thức lịch sử, quân sự, kinh tế phổ cập qua hành động và đối thoại nhân vật — KHÔNG có đoạn giảng giải lịch sử dài',
      // Multi-POV
      'Đa góc nhìn thường xuyên hơn: scene gian thần mưu kế (POV villain), tướng biên cương nhận tin (POV ally), dân chúng chịu ảnh hưởng — tạo bức tranh toàn cảnh',
    ],
  },
  'khoa-huyen': {
    authorVoice: 'Giọng văn hiện đại, logic, nhiều chi tiết công nghệ',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['công nghệ', 'vũ trụ', 'tương lai'],
    avoidKeywords: ['phép thuật', 'tu luyện'],
    dialogueRatio: [30, 40],
    descriptionRatio: [35, 45],
    innerThoughtRatio: [15, 20],
    actionRatio: [10, 20],
    pacingStyle: 'medium',
    genreConventions: [
      // Nhân vật mẫu
      'MC là nhà khoa học thiên tài/kỹ sư/phi hành gia có tư duy logic vượt trội và sáng tạo phi thường',
      'Villain là AI bất kiểm soát, tập đoàn công nghệ tham lam, hoặc văn minh ngoại lai thù địch',
      'Đồng đội đa dạng chuyên môn: hacker, bác sĩ, kỹ sư, nhà sinh học - mỗi người có vai trò rõ ràng',
      'Nữ chính là đồng nghiệp/nhà khoa học, quan hệ phát triển qua hợp tác giải quyết khủng hoảng',
      // Tiến trình cốt truyện
      'Hard sci-fi logic: mỗi phát minh/công nghệ phải có cơ sở khoa học hợp lý, không phải phép thuật',
      'Mỗi 10-15 chương MC phát minh/khám phá 1 công nghệ mới thay đổi cục diện',
      'Khủng hoảng quy mô tăng dần: tai nạn cá nhân → thảm họa thành phố → khủng hoảng hành tinh → chiến tranh vũ trụ',
      // Hệ thống sức mạnh
      'Công nghệ thay thế phép thuật: vũ khí năng lượng, giáp cơ khí, tàu chiến vũ trụ, AI chiến đấu',
      'Sức mạnh đến từ tri thức và sáng tạo: MC giải quyết vấn đề bằng khoa học, không phải bạo lực thuần túy',
      // Leo thang xung đột
      'Xung đột từ cá nhân → tổ chức → quốc gia → hành tinh → liên minh vũ trụ → cấp văn minh',
      'Mỗi giải pháp công nghệ tạo ra hệ quả mới: phát minh vũ khí → chạy đua vũ trang → khủng hoảng đạo đức',
      // Phụ tuyến & hook
      'Tình thế nan giải đạo đức: AI có quyền sống không? Nhân bản có phải người? Hy sinh thiểu số cứu đa số?',
      'Khám phá vũ trụ mở rộng thế giới: mỗi hành tinh/nền văn minh có quy tắc và sinh thái riêng',
      'Bí mật công nghệ cổ đại: nền văn minh tiền sử để lại di tích công nghệ vượt xa hiện tại',
      'Countdown/deadline tạo tension: thiên thạch va chạm, dịch bệnh lan rộng, AI tiến hóa ngoài tầm kiểm soát',
      // Exposition thông minh
      'Giải thích công nghệ/khoa học qua hành động, thí nghiệm, đối thoại tranh luận — KHÔNG dùng đoạn văn giải thích như bài báo khoa học',
      // Multi-POV
      'Đa góc nhìn khi cần: scene AI/villain suy nghĩ (POV antagonist), đồng đội chuyên gia phân tích (POV ally), chính phủ phản ứng (POV authority)',
    ],
  },
  'vong-du': {
    authorVoice: 'Giọng văn gaming, nhiều thuật ngữ game',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['game', 'level up', 'boss', 'raid'],
    avoidKeywords: [],
    dialogueRatio: [30, 40],
    descriptionRatio: [30, 35],
    innerThoughtRatio: [15, 25],
    actionRatio: [15, 25],
    pacingStyle: 'fast',
    genreConventions: [
      // Nhân vật mẫu
      'MC là game thủ thiên tài hoặc bình thường nhưng có hệ thống/class ẩn đặc biệt mà người khác không biết',
      'Villain là PKer máu lạnh, guild master độc tài, hoặc GM/NPC boss có ý thức riêng',
      'Đồng đội đa dạng class (tank, healer, DPS, support), mỗi người có personality và playstyle riêng',
      'Nữ chính là top player/guild flower hoặc NPC có ý thức, ban đầu coi thường MC rồi dần nể phục',
      // Tiến trình cốt truyện
      'Hệ thống game rõ ràng: stats, level, skill tree, equipment grade, class system — PHẢI nhất quán',
      'Mỗi 5-10 chương có 1 dungeon/raid mới, quy mô tăng dần: solo → party → guild raid → server boss',
      'Tournament/PvP arena mỗi 15-20 chương: ranking match, guild war, cross-server battle',
      // Hệ thống sức mạnh
      'MC có hidden class/unique skill mà hệ thống chưa công bố, tạo bất ngờ khi sử dụng',
      'Equipment upgrade loop: tìm nguyên liệu hiếm → craft/enhance → test trong dungeon → loot tốt hơn',
      // Leo thang xung đột
      'Xung đột từ PK cá nhân → guild war → server battle → cross-server war → world boss event',
      'Mỗi lần MC thắng, lộ ra bí mật game lớn hơn: NPC có ý thức, thế giới game là thật, developer ẩn mưu',
      // Phụ tuyến & hook
      'Hidden quest/easter egg tạo sense of discovery: MC tìm được quest mà không ai biết, reward khủng',
      'IRL stakes: game ảnh hưởng đời thực (tiền, sức khỏe, mạng sống) để tăng tension',
      'Guild management: tuyển member, training, nội bộ drama, phản bội, tạo chiều sâu xã hội',
      'Loot addiction: miêu tả chi tiết khi drop rare item, stats comparison, đám đông ghen tỵ',
      // Exposition thông minh
      'Game mechanics giải thích qua trải nghiệm và thử nghiệm, KHÔNG info-dump bảng stats dài',
      // Multi-POV
      'Đa góc nhìn: scene đối thủ chuẩn bị chiến thuật (POV rival), guild member ngưỡng mộ MC (POV ally), NPC quan sát player (POV NPC)',
    ],
  },
  'dong-nhan': {
    authorVoice: 'Giọng văn tùy thuộc original, có twist',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['original callbacks', 'twist', 'butterfly effect'],
    avoidKeywords: [],
    dialogueRatio: [35, 45],
    descriptionRatio: [30, 40],
    innerThoughtRatio: [15, 25],
    actionRatio: [10, 20],
    pacingStyle: 'medium',
    genreConventions: [
      // Nhân vật mẫu
      'MC xuyên không/chuyển sinh vào thế giới anime/manga/game, mang theo kiến thức về plot gốc',
      'MC có hệ thống hoặc golden finger riêng, KHÔNG phải nhân vật gốc bị nerf',
      'Nhân vật gốc phải in-character: tính cách, cách nói, quyết định phải nhất quán với nguyên tác',
      'Villain có thể là phản diện nguyên tác hoặc kẻ xuyên không khác, tạo mind game',
      // Tiến trình cốt truyện
      'Butterfly effect rõ ràng: mỗi hành động của MC tạo ra hệ quả khác nguyên tác, plot divergence tăng dần',
      'Mỗi 5-10 chương giải quyết 1 event quan trọng của nguyên tác: MC can thiệp hoặc thay đổi kết quả',
      'Timeline awareness: MC phải nhớ và chuẩn bị cho event sắp tới, tạo tension "kịp hay không kịp"',
      // Hệ thống sức mạnh
      'MC cướp cơ duyên của protagonist gốc hoặc tìm cơ duyên bị bỏ sót, tạo power divergence',
      'Sức mạnh MC phát triển song song nhưng khác đường với protagonist gốc, so sánh tạo hứng thú',
      // Leo thang xung đột
      'Xung đột từ thay đổi nhỏ → butterfly effect lớn → timeline bất ổn → thế giới gốc biến dạng',
      'MC phải đối mặt hệ quả của việc thay đổi plot: cứu người này nhưng vô tình hại người khác',
      // Phụ tuyến & hook
      'Fan service callback: đề cập đến sự kiện, câu nói, meme nổi tiếng của nguyên tác một cách tự nhiên',
      'Protagonist gốc vẫn phát triển (có thể thành đồng minh hoặc đối thủ), tạo dynamic thú vị',
      'Meta knowledge tension: MC biết tương lai nhưng không phải lúc nào cũng đúng (thế giới có biến)',
      'Crossover hint: nếu multi-world, seed nhỏ cho thế giới tiếp theo từ sớm',
      // Exposition thông minh
      'Nguyên tác lore giới thiệu qua trải nghiệm MC và phản ứng so sánh, KHÔNG tóm tắt nguyên tác cho người đọc',
      // Multi-POV
      'Đa góc nhìn: scene protagonist gốc phản ứng khi plot thay đổi (POV original MC), villain nhận ra có biến (POV antagonist), side character thấy khác lạ (POV observer)',
    ],
  },
  'mat-the': {
    authorVoice: 'Giọng văn căng thẳng, survival horror',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['sinh tồn', 'zombie', 'tận thế', 'căng thẳng'],
    avoidKeywords: ['vui vẻ', 'nhẹ nhàng'],
    dialogueRatio: [25, 35],
    descriptionRatio: [35, 45],
    innerThoughtRatio: [15, 25],
    actionRatio: [15, 25],
    pacingStyle: 'fast',
    genreConventions: [
      // Nhân vật mẫu
      'MC là người bình thường bị ném vào mạt thế, hoặc chuyển sinh biết trước tận thế sắp đến',
      'MC phải có survival skills cụ thể: chiến đấu, y tế, xây dựng, lãnh đạo — KHÔNG phải siêu nhân từ đầu',
      'Villain là con người tàn ác hơn cả zombie: kẻ cướp, lãnh đạo độc tài căn cứ, mad scientist',
      'Đồng đội đa dạng: có người trung thành, có kẻ phản bội, có người hy sinh — KHÔNG AI an toàn tuyệt đối',
      // Tiến trình cốt truyện
      'Tài nguyên là trung tâm: mỗi 3-5 chương phải có xung đột liên quan thức ăn, nước, vũ khí, thuốc men',
      'Base building: MC xây dựng căn cứ từ nhỏ đến lớn, recruit người, phòng thủ, mở rộng lãnh thổ',
      'Mỗi 10-15 chương có 1 expedition/mission lớn: tìm tài nguyên, cứu người, khám phá vùng mới',
      // Hệ thống sức mạnh
      'Năng lực siêu nhiên đến từ đột biến/crystal: MC thức tỉnh dần, mỗi lần dùng có cost (thể lực, sanity)',
      'Zombie/quái vật tiến hóa: từ shambler → runner → mutant → boss, buộc MC phải liên tục thích nghi',
      // Leo thang xung đột
      'Xung đột từ sinh tồn cá nhân → nhóm nhỏ → base vs base → faction war → human vs mutant boss',
      'Mỗi arc mất mát tăng dần: mất đồ → mất base → mất đồng đội → gần mất tất cả',
      // Phụ tuyến & hook
      'Trust dilemma: mỗi 5-10 chương MC phải quyết định tin ai, nhận ai vào nhóm, kết quả không luôn tốt',
      'Bí mật nguồn gốc tận thế: manh mối từng chương về nguyên nhân thật sự (virus, thí nghiệm, ngoại lai)',
      'Dark moral choices: MC phải chọn giữa nhân đạo và sinh tồn, không có đáp án đúng 100%',
      'Mùa/thời tiết khắc nghiệt ảnh hưởng gameplay: mùa đông thiếu thức ăn, mùa mưa lũ lụt, mùa hè dịch bệnh',
      // Exposition thông minh
      'Kiến thức sinh tồn (y tế, xây dựng, chiến thuật) phổ cập qua hành động thực tế, KHÔNG dạy lý thuyết',
      // Multi-POV
      'Đa góc nhìn: scene kẻ cướp lên kế hoạch tấn công base (POV raider), đồng đội bí mật phản bội (POV traitor), zombie mutant tiến hóa (POV threat)',
    ],
  },
  'linh-di': {
    authorVoice: 'Giọng văn rùng rợn, mystery',
    narrativeStyle: 'first_person',
    toneKeywords: ['kinh dị', 'ma quỷ', 'huyền bí', 'rùng rợn'],
    avoidKeywords: ['vui vẻ', 'hài hước'],
    dialogueRatio: [30, 40],
    descriptionRatio: [35, 50],
    innerThoughtRatio: [20, 30],
    actionRatio: [5, 15],
    pacingStyle: 'slow',
    genreConventions: [
      // Nhân vật mẫu
      'MC là pháp sư/thiên sư kế thừa dòng tộc, hoặc người thường bị cuốn vào sự kiện tâm linh',
      'MC có năng lực đặc biệt (âm dương nhãn, thông linh, phong thủy) nhưng có giới hạn và cái giá phải trả',
      'Villain là oan hồn mạnh mẽ, tà sư thâm hiểm, hoặc thế lực hắc ám cổ xưa đang thức tỉnh',
      'Side character: đồng môn, cảnh sát/nhà báo hoài nghi, nạn nhân cần cứu — một số có thể chết bất ngờ',
      // Tiến trình cốt truyện
      'Mỗi 5-10 chương giải quyết 1 vụ án tâm linh: ma ám, lời nguyền, phong thủy xấu, quỷ dị',
      'Quy tắc quái đàm: mỗi vụ án có rules riêng mà MC phải tìm ra để sống sót và giải quyết',
      'Overarching mystery: tuyến chính xuyên suốt — kẻ đứng sau tất cả, bí mật cổ đại, lời tiên tri',
      // Hệ thống sức mạnh
      'Sức mạnh đến từ kiến thức (phong thủy, bùa chú, kinh văn), không phải bạo lực thuần — IQ chiến thắng',
      'Mỗi lần dùng pháp thuật có cost: tuổi thọ, tinh thần, nghiệp báo — KHÔNG free power',
      // Leo thang xung đột
      'Xung đột từ quỷ dị nhỏ → ma mạnh → tà sư → cổ đại tà linh → đại ma vương/thiên kiếp',
      'Mỗi vụ án hé lộ 1 mảnh ghép của bí mật lớn, đến cuối arc mới nhìn ra bức tranh toàn cảnh',
      // Phụ tuyến & hook
      'Atmospheric horror: xây dựng không khí rùng rợn qua 5 giác quan, im lặng đáng sợ hơn jump scare',
      'Phong thủy/bùa chú miêu tả chi tiết: trận pháp, nguyên liệu, quy trình — tạo cảm giác chân thực',
      'Moral ambiguity: không phải ma quỷ nào cũng ác, không phải pháp sư nào cũng thiện',
      'Lời nguyền/nghiệp báo ảnh hưởng MC: mỗi lần giải cứu, MC gánh thêm nghiệp, tạo internal conflict',
      // Exposition thông minh
      'Kiến thức tâm linh, phong thủy qua trải nghiệm trực tiếp và hồi ức sư phụ, KHÔNG giảng giải lý thuyết dài',
      // Multi-POV
      'Đa góc nhìn: scene nạn nhân bị ma ám (POV victim tạo kinh hoàng), oan hồn hồi ức quá khứ (POV ghost tạo đồng cảm), đồng đội bí mật che giấu (POV ally tạo nghi ngờ)',
    ],
  },
  'quan-truong': {
    authorVoice: 'Giọng văn chính trị, nhiều mưu kế',
    narrativeStyle: 'third_person_omniscient',
    toneKeywords: ['quyền mưu', 'chính trị', 'thăng tiến'],
    avoidKeywords: ['siêu nhiên', 'phép thuật'],
    dialogueRatio: [45, 55],
    descriptionRatio: [25, 35],
    innerThoughtRatio: [20, 30],
    actionRatio: [5, 10],
    pacingStyle: 'medium',
    genreConventions: [
      // Nhân vật mẫu
      'MC là cán bộ cấp thấp thông minh, có tầm nhìn xa và khả năng đọc người, dần leo lên quyền lực',
      'MC có lợi thế đặc biệt: chuyển sinh biết tương lai, hoặc tài năng thiên bẩm về chính trị/kinh tế',
      'Villain là quan chức tham nhũng, thế lực ngầm, hoặc đối thủ chính trị cùng phe đấu đá nội bộ',
      'Mentor/backer: MC cần quý nhân phù trợ (lãnh đạo cấp cao tin tưởng), nhưng backer cũng có agenda riêng',
      // Tiến trình cốt truyện
      'Mỗi 10-15 chương giải quyết 1 vụ việc chính trị: điều tra tham nhũng, dự án phát triển, đấu đá nội bộ',
      'Thăng tiến tuần tự: cán bộ xã → huyện → tỉnh → trung ương, mỗi bước có thử thách chính trị khác nhau',
      'Mỗi lần thăng chức, kẻ thù và đồng minh đều thay đổi — không có đồng minh vĩnh viễn',
      // Hệ thống sức mạnh (quyền lực)
      'Sức mạnh = quyền lực + quan hệ + thông tin: MC chiến thắng bằng mưu kế và nhân mạch, KHÔNG bạo lực',
      'Mỗi quyết định có hệ quả chính trị: giúp người này sẽ đắc tội người kia, phải cân nhắc phe phái',
      // Leo thang xung đột
      'Xung đột từ xã/phường → huyện → tỉnh → bộ → trung ương → cấp quốc gia, mỗi cấp phức tạp hơn',
      'Mỗi arc kẻ thù mưu mô hơn, background mạnh hơn, MC phải dùng chiến thuật tinh vi hơn',
      // Phụ tuyến & hook
      'Tình cảm phức tạp: vợ/bạn gái có thể là con gái thế lực chính trị, tình yêu gắn liền lợi ích',
      'Phát triển kinh tế địa phương: MC dùng kiến thức hiện đại cải cách, tạo thành tích chính trị để thăng tiến',
      'Mạng lưới quan hệ: bạn đại học, đồng nghiệp cũ, quý nhân — mỗi mối quan hệ có thể dùng hoặc bị lợi dụng',
      'Kết chương bằng bước ngoặt chính trị: backer gặp nạn, đối thủ phản đòn, tin đồn phá hoại, nhân sự thay đổi',
      // Exposition thông minh
      'Kiến thức chính trị, kinh tế, luật pháp qua hành động và đối thoại thực tế, KHÔNG giảng giải chính sách',
      // Multi-POV
      'Đa góc nhìn thường xuyên: scene đối thủ bày mưu (POV rival), cấp trên đánh giá MC (POV superior), dân chúng hưởng lợi/phản đối (POV public)',
    ],
  },
  'di-gioi': {
    authorVoice: 'Giọng văn adventure, khám phá',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['xuyên không', 'thế giới khác', 'sinh tồn'],
    avoidKeywords: [],
    dialogueRatio: [30, 40],
    descriptionRatio: [35, 45],
    innerThoughtRatio: [15, 25],
    actionRatio: [10, 20],
    pacingStyle: 'fast',
    genreConventions: [
      // Nhân vật mẫu
      'MC xuyên không sang thế giới khác, mang theo tri thức hiện đại và/hoặc hệ thống golden finger',
      'MC ban đầu yếu ớt trong thế giới mới, phải thích nghi với quy tắc khác biệt để sinh tồn',
      'Villain là thế lực bản địa coi MC là ngoại lai nguy hiểm, hoặc kẻ xuyên không khác tranh đoạt',
      'Đồng hành là dân bản địa giúp MC hiểu thế giới mới, có chemistry từ culture clash',
      // Tiến trình cốt truyện
      'Adaptation arc đầu tiên (10-15 chương): MC học ngôn ngữ, quy tắc, sinh tồn cơ bản trong thế giới mới',
      'MC dùng tri thức hiện đại gây sốc: nấu ăn, y học, kỹ thuật, chiến thuật quân sự — mỗi arc 1-2 innovation',
      'Mỗi 15-20 chương MC mở rộng lãnh thổ khám phá: vùng đất mới, chủng tộc mới, hệ thống mới',
      // Hệ thống sức mạnh
      'Sức mạnh dị giới (ma pháp, battle qi, bloodline) kết hợp tri thức hiện đại tạo unique advantage',
      'MC thăng cấp theo hệ thống dị giới nhưng có approach khác biệt nhờ tư duy logic/khoa học',
      // Leo thang xung đột
      'Xung đột từ sinh tồn cá nhân → bộ tộc nhỏ → thành bang → vương quốc → đại lục → thần giới/về Trái Đất',
      'Mỗi vùng đất mới có hệ thống quyền lực và quy tắc riêng, MC phải adapt lại từ đầu',
      // Phụ tuyến & hook
      'Culture clash comedy: MC dùng kiến thức hiện đại (mì gói, bật lửa, toán học) gây sốc cho dân bản địa',
      'Worldbuilding rich: mỗi 5 chương giới thiệu 1 yếu tố thế giới mới (sinh vật, phong tục, ẩm thực, ngôn ngữ)',
      'Homesickness: MC nhớ nhà, tìm cách về nhưng dần gắn bó với thế giới mới, internal conflict',
      'Base/kingdom building: MC xây dựng lãnh thổ riêng, recruit dân bản địa, phát triển kinh tế/quân sự',
      // Exposition thông minh
      'Thế giới mới giải thích qua trải nghiệm trực tiếp và phản ứng ngạc nhiên của MC, KHÔNG info-dump worldbuilding',
      // Multi-POV
      'Đa góc nhìn: scene dân bản địa kinh ngạc trước tri thức MC (POV local), thế lực thù địch đánh giá mối đe dọa (POV enemy), đồng hành bối rối vì MC hành xử khác lạ (POV companion)',
    ],
  },
  'ngon-tinh': {
    authorVoice: 'Giọng văn mềm mại, giàu cảm xúc, miêu tả nội tâm tinh tế và lãng mạn',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['lãng mạn', 'ngọt ngào', 'sâu lắng', 'tình cảm', 'da diết'],
    avoidKeywords: ['bạo lực quá mức', 'máu me', 'kinh dị'],
    dialogueRatio: [40, 55],
    descriptionRatio: [25, 35],
    innerThoughtRatio: [20, 30],
    actionRatio: [5, 10],
    pacingStyle: 'medium',
    genreConventions: [
      // ── 2026 META: 大女主 + sự nghiệp + 无CP options ──
      'GHI CHÚ THỜI ĐẠI 2024-2026: TQ 女频 đã chuyển dịch — "tổng tài lạnh lùng + nữ chính ngây thơ" cliché bị chế giễu. Top labels: 大女主 (career female lead), 反恋爱脑 (anti-love-brain), 无CP (no romance — top 3 label trên 晋江/番茄), nữ tổng tài, sự nghiệp đặt trước romance. VN reader lag 2-3 năm nhưng "Sam Sam Đến Đây Ăn Nào" pattern (đời thường ngọt sủng, không drama) đang lên — engine ưu tiên VARIATIONS, KHÔNG ép tổng tài bá đạo formula.',
      // ── Variant types — chọn theo seed ──
      'NGON-TINH có 4 variant chính (chọn theo project seed/anti-trope flag):',
      '  (a) 大女主 sự nghiệp (CAREER FEMALE LEAD): nữ chính tự xây sự nghiệp/danh tiếng, romance là phụ. Nam chính (nếu có) = đối tác/đồng nghiệp ngang tầm, KHÔNG phải tổng tài bảo hộ. Tone: empowering, pragmatic.',
      '  (b) Đời thường ngọt sủng (DAILY SWEET): cặp đôi đã hiểu nhau, không drama, tập trung khoảnh khắc ngọt ngào hàng ngày (nấu ăn, đi làm, trêu chọc). Tone: cozy, low-stakes, comfort.',
      '  (c) Cưới trước yêu sau / hợp đồng hôn nhân: cặp đôi bắt đầu từ vị trí kỳ lạ, dần dần phát triển tình cảm thật. Tone: slow burn realistic.',
      '  (d) Tổng tài bá đạo (CLASSIC, dùng cho 30% project): nam chính lạnh lùng + nữ chính dịu dàng. CHỈ DÙNG khi project explicit chọn variant này. KHÔNG mặc định.',
      '  (e) 无CP / friendship-focused: nữ chính không có love interest chính, focus career/friendship/family. Tone: independent, mature.',
      // ── Nhân vật mẫu ──
      'Nữ chính KHÔNG cứ "kiên cường nhưng dịu dàng" — đa dạng: tham vọng quyết liệt, tinh ranh thực dụng, lạnh lùng tự lập, hài hước thông minh, hoặc nhẹ nhàng ấm áp. KHÔNG mặc định "không hoa bình yếu đuối" như default — có nữ chính thực sự dịu dàng vẫn ok.',
      'Nam chính (NẾU CÓ) KHÔNG cứ "tổng tài lạnh lùng bá đạo" — có thể là đồng nghiệp tự nhiên, bạn cùng lớp, đối tác kinh doanh ngang tầm, hoặc người chăm sóc nhẹ nhàng. CẤM ép nam chính sủng chiều vô điều kiện cho mọi project.',
      'Nữ phụ KHÔNG cứ "xấu xa ghen tỵ tạo drama" — modern reader chán "nữ phụ ác cần". Có thể là đồng minh, rival lành mạnh trong sự nghiệp, hoặc bạn thân tốt.',
      'Tình địch nam KHÔNG mặc định — chỉ dùng khi project chọn tam giác tình cảm.',
      // ── Tiến trình cốt truyện ──
      'Pattern "Gặp gỡ → hiểu lầm → xung đột → hòa giải → yêu → thử thách → HE" KHÔNG cứng nhắc — có thể skip hiểu lầm, hoặc mở đầu khi đã yêu nhau (variant b daily sweet).',
      'Sweet moment KHÔNG ép "mỗi 3-5 chương" — daily sweet variant có thể có sweet moment mỗi chương; 大女主 variant có thể chỉ vài chương 1 sweet moment.',
      'Hiểu lầm/chia ly TÙY CHỌN — modern reader đặc biệt 24+ chán "drama for drama sake". Slow burn realistic + đời thường ngọt sủng đang lên.',
      // ── Relationship dynamics ──
      'Tình cảm phát triển qua chi tiết nhỏ (ánh mắt, cử chỉ, lời nói hai nghĩa) — GIỮ vì là core craft.',
      'Cảnh lãng mạn tinh tế, gợi cảm xúc nội tâm — GIỮ.',
      // ── Leo thang xung đột (đa dạng) ──
      'Xung đột KHÔNG cứ "hiểu lầm → gia đình phản đối → thế lực chia rẽ → sinh ly tử biệt" linear. Có thể horizontal (career challenges, social pressure, internal growth) thay vì vertical drama.',
      // ── Phụ tuyến (modern emphasis) ──
      'Sự nghiệp KHÔNG là phụ tuyến nữa — với 大女主 variant, sự nghiệp là MAIN tuyến, romance là phụ. Engine cần phân biệt rõ.',
      'Bí mật thân phận TÙY CHỌN — không phải mọi ngon-tinh cần "quá khứ bí ẩn".',
      'Cảnh sủng (pampering) chỉ dùng cho variant tổng tài bá đạo — KHÔNG ép cho variant 大女主 hoặc daily sweet.',
      // ── Pattern còn giữ ──
      'Nữ chính có depth: sự nghiệp riêng, quyết định riêng, không chỉ xoay quanh nam chính. Đặc biệt cần với 大女主 + 无CP variants.',
      'Side character có arc riêng (không bỏ lửng) — modern reader đòi hỏi.',
      'Emotional variety: ngọt + căng + đau lòng + hài + rung động — GIỮ vì là core craft.',
      'Multi-POV ưu tiên: nam chính suy nghĩ (nếu có), bạn thân quan sát, đồng nghiệp/đối tác trong sự nghiệp. POV "nữ phụ ghen tuông bày mưu" CHỈ dùng cho variant tổng tài cliché — KHÔNG mặc định.',
    ],
  },
};

// ============================================================================
// POWER SYSTEM TEMPLATES
// ============================================================================

export const POWER_SYSTEMS: Record<string, PowerSystem> = {
  cultivation_standard: {
    name: 'Tu Tiên Chuẩn',
    realms: [
      { name: 'Luyện Khí', rank: 1, subLevels: 9, description: '9 tầng', abilities: ['Phi kiếm', 'Pháp thuật cơ bản'], breakthroughDifficulty: 'easy' },
      { name: 'Trúc Cơ', rank: 2, subLevels: 9, description: '9 tầng', abilities: ['Ngự vật phi hành', 'Pháp thuật trung cấp'], breakthroughDifficulty: 'medium' },
      { name: 'Kim Đan', rank: 3, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Bản mệnh pháp bảo', 'Lôi thuật'], breakthroughDifficulty: 'hard' },
      { name: 'Nguyên Anh', rank: 4, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Nguyên anh xuất khiếu'], breakthroughDifficulty: 'hard' },
      { name: 'Hóa Thần', rank: 5, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Xé không gian'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Hợp Thể', rank: 6, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Thiên địa pháp tướng'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Đại Thừa', rank: 7, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Trường sinh'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Độ Kiếp', rank: 8, subLevels: 9, description: 'Vượt thiên kiếp', abilities: ['Phi thăng'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Linh thạch', 'Linh đan', 'Pháp bảo', 'Bí tịch'],
    techniqueGrades: ['Phàm', 'Hoàng', 'Huyền', 'Địa', 'Thiên', 'Thánh', 'Thần'],
    itemGrades: ['Phàm', 'Linh', 'Địa', 'Thiên', 'Thánh', 'Thần'],
    currencies: [
      { name: 'Linh thạch hạ phẩm', value: 1, description: 'Cơ bản' },
      { name: 'Linh thạch trung phẩm', value: 100, description: '100 hạ phẩm' },
      { name: 'Linh thạch thượng phẩm', value: 10000, description: '100 trung phẩm' },
    ],
  },
  martial_world: {
    name: 'Võ Đạo Giang Hồ',
    realms: [
      { name: 'Hậu Thiên', rank: 1, subLevels: 9, description: '9 trọng', abilities: ['Kình lực'], breakthroughDifficulty: 'easy' },
      { name: 'Tiên Thiên', rank: 2, subLevels: 9, description: '9 trọng', abilities: ['Chân khí', 'Khinh công'], breakthroughDifficulty: 'medium' },
      { name: 'Vương Cấp', rank: 3, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Ý cảnh', 'Vương khí'], breakthroughDifficulty: 'hard' },
      { name: 'Hoàng Cấp', rank: 4, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Hoàng áp'], breakthroughDifficulty: 'hard' },
      { name: 'Đế Cấp', rank: 5, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Đế uy'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Thánh Cấp', rank: 6, subLevels: 3, description: 'Bất tử', abilities: ['Bất diệt'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Võ học bí tịch', 'Linh dược', 'Thần binh'],
    techniqueGrades: ['Phàm', 'Hoàng', 'Huyền', 'Địa', 'Thiên', 'Thánh'],
    itemGrades: ['Phàm binh', 'Bảo binh', 'Linh binh', 'Thần binh'],
    currencies: [
      { name: 'Lượng bạc', value: 1, description: 'Cơ bản' },
      { name: 'Lượng vàng', value: 10, description: '10 bạc' },
    ],
  },
  urban_system: {
    name: 'Đô Thị Hệ Thống',
    realms: [
      { name: 'Cấp F', rank: 1, subLevels: 10, description: 'Người thường', abilities: ['Thể chất tăng nhẹ'], breakthroughDifficulty: 'easy' },
      { name: 'Cấp E', rank: 2, subLevels: 10, description: 'Siêu phàm sơ cấp', abilities: ['Năng lực yếu'], breakthroughDifficulty: 'easy' },
      { name: 'Cấp D', rank: 3, subLevels: 10, description: 'Cấp thấp', abilities: ['Năng lực ổn định'], breakthroughDifficulty: 'medium' },
      { name: 'Cấp C', rank: 4, subLevels: 10, description: 'Cấp trung', abilities: ['Năng lực mạnh'], breakthroughDifficulty: 'medium' },
      { name: 'Cấp B', rank: 5, subLevels: 10, description: 'Cấp cao', abilities: ['Rất mạnh'], breakthroughDifficulty: 'hard' },
      { name: 'Cấp A', rank: 6, subLevels: 10, description: 'Đỉnh quốc gia', abilities: ['Cấp thảm họa'], breakthroughDifficulty: 'hard' },
      { name: 'Cấp S', rank: 7, subLevels: 10, description: 'Đứng đầu thế giới', abilities: ['Cấp thần'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Cấp SSS', rank: 8, subLevels: 3, description: 'Siêu việt', abilities: ['Gần toàn năng'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Tinh thể năng lượng', 'Thuốc tăng cường', 'Thiết bị'],
    techniqueGrades: ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'],
    itemGrades: ['Thường', 'Hiếm', 'Sử thi', 'Huyền thoại', 'Thần khí'],
    currencies: [
      { name: 'Tiền', value: 1, description: 'Tiền thường' },
      { name: 'Điểm hệ thống', value: 100, description: 'Tiền tệ hệ thống' },
    ],
  },
  beast_taming: {
    name: 'Ngự Thú Sư',
    realms: [
      { name: 'Ngự Thú Đồ Tể', rank: 1, subLevels: 9, description: 'Mới khế ước thú', abilities: ['Câu thông tinh thần'], breakthroughDifficulty: 'easy' },
      { name: 'Sơ Cấp', rank: 2, subLevels: 9, description: 'Khế ước 2 thú', abilities: ['Sủng thú dung hợp (yếu)'], breakthroughDifficulty: 'easy' },
      { name: 'Trung Cấp', rank: 3, subLevels: 9, description: 'Lĩnh vực ngự thú', abilities: ['Chia sẻ sinh mệnh'], breakthroughDifficulty: 'medium' },
      { name: 'Cao Cấp', rank: 4, subLevels: 9, description: 'Trọng sinh sủng thú', abilities: ['Triệu hồi không gian'], breakthroughDifficulty: 'medium' },
      { name: 'Đại Sư', rank: 5, subLevels: 9, description: 'Tiến hóa ẩn', abilities: ['Khế ước Thần Thú'], breakthroughDifficulty: 'hard' },
      { name: 'Truyền Thuyết', rank: 6, subLevels: 3, description: 'Đứng đầu thế giới', abilities: ['Tạo quy tắc mới'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Thần Thoại', rank: 7, subLevels: 3, description: 'Bất hủ', abilities: ['Sáng thế'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Vật liệu tiến hóa', 'Lõi năng lượng', 'Mảnh vỡ tinh thạch'],
    techniqueGrades: ['Thức tỉnh', 'Siêu phàm', 'Thống lĩnh', 'Quân vương', 'Bá chủ', 'Thần thoại'],
    itemGrades: ['Thường', 'Cấp cao', 'Đỉnh phong', 'Sử thi', 'Truyền thuyết'],
    currencies: [
      { name: 'Ngự thú tệ', value: 1, description: 'Tiền mặt' },
      { name: 'Điểm cống hiến', value: 1000, description: 'Mua tài nguyên hiếm' },
    ],
  },
  rules_horror: {
    name: 'Quy Tắc Quái Đàm',
    realms: [
      { name: 'Người sống sót mới', rank: 1, subLevels: 1, description: 'Chỉ có cái mạng', abilities: ['Suy luận cơ bản'], breakthroughDifficulty: 'easy' },
      { name: 'Kẻ phá đảo', rank: 2, subLevels: 3, description: 'Qua 3 phó bản', abilities: ['Nhìn thấu ảo ảnh (Hạn chế)'], breakthroughDifficulty: 'medium' },
      { name: 'Kẻ nắm giữ quy tắc', rank: 3, subLevels: 3, description: 'Qua 10 phó bản', abilities: ['Sửa 1 dòng quy tắc', 'Dùng quỷ dị làm vũ khí'], breakthroughDifficulty: 'hard' },
      { name: 'Chủ Quái Đàm', rank: 4, subLevels: 3, description: 'Chiếm phó bản', abilities: ['Tạo phó bản mới', 'Miễn nhiễm ô nhiễm tinh thần'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Cthulhu', rank: 5, subLevels: 1, description: 'Cấm kỵ', abilities: ['Đọc tâm trí quỷ', 'Nuốt chửng ác thần'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Điểm san trị (Sanity)', 'Đạo cụ quỷ dị', 'Mảnh vỡ quy tắc'],
    techniqueGrades: ['Cấp D', 'Cấp C', 'Cấp B', 'Cấp A', 'Cấp S (Vô giải)'],
    itemGrades: ['Đồ thường', 'Đồ bị nguyền rủa', 'Vật phẩm cấm kỵ'],
    currencies: [
      { name: 'Quỷ tệ', value: 1, description: 'Giao dịch với thế giới bên kia' },
      { name: 'Tuổi thọ', value: 9999, description: 'Đánh đổi để lấy cơ hội' },
    ],
  },
  lord_building: {
    name: 'Lãnh Chúa Cầu Sinh',
    realms: [
      { name: 'Thôn Trưởng', rank: 1, subLevels: 3, description: 'Nhà tranh vách đất', abilities: ['Chiêu mộ nông dân'], breakthroughDifficulty: 'easy' },
      { name: 'Trấn Trưởng', rank: 2, subLevels: 5, description: 'Trấn nhỏ, có dân binh', abilities: ['Chiêu binh', 'Xây chợ'], breakthroughDifficulty: 'medium' },
      { name: 'Thành Chủ', rank: 3, subLevels: 5, description: 'Thành phố vững chắc', abilities: ['Mở rào chắn phép thuật', 'Tướng lĩnh cấp sử thi'], breakthroughDifficulty: 'hard' },
      { name: 'Lĩnh Chủ Tối Cao', rank: 4, subLevels: 3, description: 'Đế quốc rộng lớn', abilities: ['Đội quân bay', 'Dịch chuyển không gian'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Thần Chủ', rank: 5, subLevels: 3, description: 'Kiểm soát thế giới', abilities: ['Tạo anh hùng mới', 'Nâng cấp vạn vật'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Gỗ', 'Đá', 'Lương thực', 'Quặng sắt', 'Bản đồ xây dựng', 'Lệnh bài chiêu mộ'],
    techniqueGrades: ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4', 'Cấp 5'],
    itemGrades: ['Rách nát', 'Thường', 'Tinh xảo', 'Hoàn mỹ', 'Truyền Thuyết', 'Thần Thoại'],
    currencies: [
      { name: 'Đồng xu', value: 1, description: 'Trao đổi kênh chat' },
      { name: 'Linh thạch năng lượng', value: 500, description: 'Nâng cấp kiến trúc lõi' },
    ],
  },
};

// ============================================================================
// GOLDEN CHAPTER REQUIREMENTS (3 chương đầu)
// ============================================================================

export const GOLDEN_CHAPTER_REQUIREMENTS = {
  chapter1: {
    mustHave: [
      'Xung đột ngay lập tức HOẶC Mâu thuẫn sinh hoạt/Kế hoạch kinh doanh',
      'Mục tiêu rõ ràng của MC (cứu mạng, kiếm tiền, thăng tiến, hay yên bình)',
      'Demo sức mạnh, trí tuệ hoặc bàn tay vàng',
      'Giới thiệu thiết lập thế giới tự nhiên, cuốn hút',
      'Tạo sự mong đợi hoặc căng thẳng nhỏ',
    ],
    avoid: ['Mở đầu chậm, lan man', 'Worldbuilding dump', 'MC thụ động không làm gì'],
  },
  chapter2: {
    mustHave: [
      'Thành quả hoặc chiến thắng nhỏ đầu tiên',
      'Mở rộng hệ thống/sức mạnh/kế hoạch',
      'Nhân vật mới xuất hiện',
      'Khó khăn/Trở ngại mới',
      'Hook cho chapter tiếp',
    ],
    avoid: ['Chỉ training/giải thích không hành động', 'Cốt truyện dậm chân'],
  },
  chapter3: {
    mustHave: [
      'Thử thách thực sự hoặc Rào cản đầu tiên',
      'Face-slap, chốt deal lớn, hoặc đạt thành quả thu hoạch',
      'Growth rõ ràng của MC (tiền, sức mạnh, trí tuệ, quan hệ)',
      'Hint về plot/quy mô thế giới lớn hơn',
      'Reader bị hook',
    ],
    avoid: ['Giải quyết quá dễ dàng', 'Không stakes/hậu quả'],
  },
};

// ============================================================================
// CHAPTER TITLE RULES - Quy tắc đặt tên chương hấp dẫn
// ============================================================================

export interface TitleTemplate {
  id: string;
  name: string;
  pattern: string;
  examples: string[];
  description: string;
}

export const TITLE_TEMPLATES: TitleTemplate[] = [
  {
    id: 'mystery_question',
    name: 'Nghi Vấn/Kích Thích Tò Mò',
    pattern: '[Đối tượng] + [Hành động bí ẩn]?',
    examples: ['Giao Dịch? Các Người Không Đủ Tư Cách!', 'Ai Đang Nói Dối?', 'Chuyện Gì Xảy Ra Trong Đêm Đó?'],
    description: 'Tạo câu hỏi khiến người đọc muốn tìm câu trả lời',
  },
  {
    id: 'action_location',
    name: 'Nửa Kín Nửa Hở',
    pattern: '[Hành động kịch tính] + [Địa điểm/Tình huống]',
    examples: ['Biến Số Đêm Đấu Giá, Vạn Kim Khó Cầu', 'Huyết Chiến Vạn Thú Sơn', 'Cuộc Gặp Gỡ Bất Ngờ'],
    description: 'Chỉ hé lộ một nửa sự kiện quan trọng',
  },
  {
    id: 'power_moment',
    name: 'Quyền Lực Áp Đảo',
    pattern: '[Đối tượng] + [Thể hiện sức mạnh]',
    examples: ['Quỳ Xuống!', 'Một Kiếm Trảm Thiên Địa', 'Đừng Ép Ta Phải Ra Tay'],
    description: 'Thích hợp cho chương có face-slap hoặc breakthrough',
  },
  {
    id: 'character_focus',
    name: 'Tiêu Điểm Nhân Vật',
    pattern: '[Đặc điểm] + [Tên/Danh xưng]',
    examples: ['Sự Lựa Chọn Của Kẻ Mạnh', 'Nước Mắt Của Ác Ma', 'Nụ Cười Bí Ẩn'],
    description: 'Dành cho chương phát triển nội tâm hoặc nhân vật mới',
  },
  {
    id: 'turning_point',
    name: 'Bước Ngoặt Bất Ngờ',
    pattern: '[Tình huống] + [Kết quả bất ngờ]',
    examples: ['Lật Ngược Thế Cờ', 'Kế Hoạch Đổ Vỡ', 'Sự Thật Phơi Bày'],
    description: 'Dùng cho chương có plot twist hoặc revelation',
  },
  {
    id: 'foreshadowing',
    name: 'Điềm Báo/Gợi Ý',
    pattern: '[Sự vật/Sự kiện] + [Hệ quả tương lai]',
    examples: ['Bão Tố Sắp Bắt Đầu', 'Bóng Đen Đang Đến Gần', 'Cái Giá Của Quyền Lực'],
    description: 'Tạo tension cho những chương setup',
  },
  {
    id: 'declaration',
    name: 'Tuyên Bố Sốc/Mệnh Lệnh',
    pattern: '[Câu nói ấn tượng]',
    examples: ['Ta Sẽ Trở Lại!', 'Từ Nay Về Sau, Ta Là Luật!', 'Đừng Cản Đường Ta!'],
    description: 'Chương có quyết định mạnh mẽ của MC',
  },
  {
    id: 'emotion_atmosphere',
    name: 'Cảm Xúc/Bầu Không Khí',
    pattern: '[Cảm xúc/Không khí ấn tượng]',
    examples: ['Giọt Lệ Của Kẻ Mạnh', 'Đêm Dài Không Ngủ', 'Tiếng Cười Trong Mưa Máu'],
    description: 'Thích hợp cho chương cảm xúc mạnh, romance, bi kịch',
  },
  {
    id: 'countdown_urgency',
    name: 'Đếm Ngược/Cấp Bách',
    pattern: '[Thời gian/Deadline] + [Nguy hiểm]',
    examples: ['Ba Ngày Trước Đại Chiến', 'Giờ Phút Sinh Tử', 'Trước Khi Đan Dược Hết Hạn'],
    description: 'Tạo urgency, thích hợp cho chương tension cao',
  },
  {
    id: 'ironic_contrast',
    name: 'Tương Phản/Nghịch Lý',
    pattern: '[Tương phản gây sốc]',
    examples: ['Tên Ăn Mày Và Bản Hợp Đồng Ngàn Tỷ', 'Phế Vật? Thiên Tài!', 'Kẻ Cứu Thế Hay Ác Ma', 'Ân Nhân Chính Là Kẻ Thù'],
    description: 'Tạo twist, gợi tò mò bằng mâu thuẫn',
  },
];

export const CHAPTER_TITLE_RULES = {
  // Quy tắc chung
  general: [
    'Tên chương mang phong cách CLICKBAIT Qidian, phải có LỰC CLICK (CTR cao)',
    'Tên chương phải NGẮN GỌN (3-10 từ), ẤN TƯỢNG, gợi TÒ MÒ tột độ',
    'KHÔNG dùng mẫu tóm tắt nội dung hiền lành (VD: "Giao dịch thành công", "Đột phá Kim Đan")',
    'Mỗi tên chương phải KHÁC BIỆT rõ ràng với các chương trước',
    'Ưu tiên: lời thoại nghênh ngang, câu hỏi nghi vấn, tương phản sốc, hoặc mệnh lệnh',
    'Có thể dùng: lời thoại, câu hỏi, hình ảnh mạnh, tương phản',
  ],

  // Anti-patterns cần tránh
  antiPatterns: [
    'Chương tóm tắt nhàm chán (VD: "Cuộc gặp gỡ", "Đi mua đồ", "Đột phá Kim Đan")',
    'X Và Sự Y (VD: "Linh Kiện Phế Thải Và Sự Sỉ Nhục")',
    'Sự [Danh từ] Của [Đối tượng]',
    'Nghịch Lý Của X',
    'Quy Luật Của X',
    'Định Luật Của X',
    'Sự Trỗi Dậy Của X',
    'Sự Kinh Ngạc Của X',
    'Bí Mật Của X (dùng tối đa 1 lần/20 chương)',
    'Lặp cùng keyword giữa 2 chương liên tiếp',
  ],

  // Quy tắc đa dạng
  diversityRules: {
    maxSamePatternConsecutive: 2,
    maxSamePatternPer20: 4,
    maxSameKeywordPer10: 2,
    minUniquePatterns: 5,
  },

  // Mẫu title theo loại chương
  chapterTypeTitleGuide: {
    action: ['declaration', 'power_moment', 'action_location'] as string[],
    revelation: ['mystery_question', 'turning_point', 'ironic_contrast'] as string[],
    cultivation: ['power_moment', 'turning_point', 'ironic_contrast'] as string[],
    romance: ['emotion_atmosphere', 'character_focus', 'foreshadowing'] as string[],
    tension: ['countdown_urgency', 'foreshadowing', 'mystery_question'] as string[],
    comedy: ['declaration', 'ironic_contrast', 'mystery_question'] as string[],
  },
};

// ============================================================================
// ENGAGEMENT CHECKLIST - Yếu tố hấp dẫn truyện TQ (Qidian-style)
// ============================================================================

export const ENGAGEMENT_CHECKLIST = {
  // Yếu tố BẮT BUỘC mỗi chương
  perChapter: [
    'Có ít nhất 1 micro-hook (gợi tò mò nhỏ) trong 500 từ đầu',
    'Ending hợp lý — KHÔNG bắt buộc cliffhanger nguy hiểm mỗi chương. Có 4 loại ending:',
    '  • Plot cliffhanger (chỉ ~1/3 chương): tình huống nguy hiểm/bất ngờ — dùng cho chương climax/villain_focus/revelation',
    '  • Emotional ending: nội tâm sâu / quyết định nhân vật / cảm xúc rõ — dùng cho aftermath/breathing/calm_before_storm',
    '  • Reveal/seed ending: hé lộ thông tin nhỏ hoặc gieo manh mối cho chương sau — dùng cho buildup/training/transition',
    '  • Comfort/resolution ending: đóng nhẹ scene với note ấm áp/hài hước — dùng cho comedic_break/breathing',
    'CẤM dùng cliffhanger nguy hiểm 3 chương liên tiếp — gây cliffhanger fatigue (đọc giả 2024+ phản đối)',
    'Duy trì độ hấp dẫn qua tension, mystery, phát triển nhân vật hoặc worldbuilding (KHÔNG bắt buộc dopamine mỗi chương)',
    'MC phải có ít nhất 1 khoảnh khắc đáng nhớ (quyết định chiến lược, khám phá, đối thoại sâu hoặc tiến triển nhỏ)',
    'Ít nhất 1 chi tiết worldbuilding nhỏ (mở rộng thế giới) — ưu tiên emerge từ action/cảm xúc, KHÔNG info-dump',
    'Emotional contrast: cảm xúc phải thay đổi ít nhất 1 lần trong chương',
  ],

  // Yếu tố BẮT BUỘC mỗi 5 chương
  per5Chapters: [
    'MC phải có tiến bộ rõ ràng (sức mạnh, địa vị, hoặc relationship)',
    'Ít nhất 1 face-slap, power reveal, smooth opportunity, hoặc casual competence moment (KHÔNG bắt buộc qua confront kẻ thù)',
    'CẤM TUYỆT ĐỐI 2 GIAI ĐOẠN ngược liên tiếp không có breathing ở giữa — sau khi 1 sự kiện ngược kết thúc PHẢI có ≥1-3 chương breathing trước sự kiện ngược tiếp theo',
    'Giới thiệu ít nhất 1 yếu tố mới (nhân vật, địa danh, kỹ thuật)',
    'Ít nhất 1 hint/foreshadowing cho plot lớn hơn',
  ],

  // Yếu tố BẮT BUỘC mỗi arc (15-30 chương)
  perArc: [
    'MC đột phá cảnh giới hoặc có power-up đáng kể',
    'Đánh bại boss/kẻ thù chính của arc',
    'Ít nhất 1 major revelation (thân phận, thế giới, hoặc hệ thống)',
    'Relationship development (romance, huynh đệ, hoặc sư đồ)',
    'Mở rộng thế giới: MC tiến vào khu vực/tầng mới',
    'Emotional climax: moment khiến người đọc rung động',
  ],

  // Yếu tố "gây nghiện" đặc trưng TQ webnovel
  addictiveElements: {
    faceSlapFormula: {
      name: 'Công Thức Tát Mặt',
      description: 'PROACTIVE (ưu tiên cho do-thi/quan-truong/kinh-doanh): MC hành động → đạt kết quả → đối thủ kinh ngạc → cố phản kháng nhưng quá muộn → câm lặng nể phục. REACTIVE (cho fantasy/wuxia): kẻ thù coi thường → MC ẩn nhẫn → kẻ thù ra tay → MC nghiền nát → bàng quan kinh ngạc.',
      frequency: 'KHÔNG bắt buộc mỗi 2-3 chương — chỉ khi arc plan có "đối thủ" tự nhiên xuất hiện. Ép tần suất sẽ tạo villain-first narrative giả tạo.',
      escalation: 'Quy mô tăng dần (cá nhân → nhóm → quốc gia) ONLY KHI arc plan yêu cầu. Truyện kinh doanh có thể leo thang qua scale doanh nghiệp (cửa hàng → chuỗi → tập đoàn → đa quốc gia) thay vì kẻ thù.',
    },
    businessEmpire: {
      name: 'Đế Chế Kinh Doanh',
      description: 'Tính toán chi phí/lợi nhuận → Chống ép giá/đối thủ → Tung sản phẩm/mưu kế → Đối thủ sụp đổ/khách hàng cuồng nhiệt',
      frequency: 'Mỗi arc một thương vụ lớn hoặc mở rộng sản phẩm mới',
    },
    cozyFarming: {
      name: 'Điền Viên Chữa Lành',
      description: 'Lao động chăm sóc → Khó khăn sinh hoạt/kẻ gian phá → Giải quyết khéo léo → Thu hoạch bùng nổ/đồ ăn ngon/hài hước',
      frequency: 'Mỗi 2-3 chương có một thu hoạch nhỏ hoặc cảnh ăn ngon ấm áp',
    },
    powerFantasyLoop: {
      name: 'Vòng Lặp Sức Mạnh / Trí Tuệ',
      description: 'Encounter → Bị khinh thường → Training/Cơ duyên/Chuẩn bị → Đột phá/Thành công → Thể hiện → Chấn kinh',
      frequency: 'Vòng lặp 10-15 chương, mỗi vòng scale lớn hơn',
    },
    treasureHunt: {
      name: 'Săn Kho Báu',
      description: 'Manh mối → Bí cảnh → Thử thách → Boss → Thu hoạch → Kẻ thù đuổi theo',
      frequency: 'Mỗi arc 1 bí cảnh/treasure hunt',
    },
    mysteryReveal: {
      name: 'Bí Mật Từng Lớp',
      description: 'Hint nhỏ → Manh mối → Nghi ngờ → Xác nhận → Sốc → Hệ quả',
      layers: ['Thân phận MC', 'Bí mật thế giới', 'Âm mưu lớn', 'Kẻ đứng sau tất cả'],
    },
    haremTeasing: {
      name: 'Tình Cảm Mờ Ảo',
      description: 'Gặp gỡ ấn tượng → Xung đột → Cứu giúp → Hint tình cảm → Chia ly tạm → Hội ngộ',
      rule: 'Mỗi arc giới thiệu 1 nữ nhân vật, mỗi 5 chương có 1 sweet moment nhẹ',
    },
    statusFlex: {
      name: 'Flex Địa Vị',
      description: 'Đặc biệt trong đô thị: siêu xe, biệt thự, VIP, nhân mạch khủng',
      rule: 'Mỗi 10 chương có 1 scene MC flex tài sản/quyền lực khiến kẻ khinh câm lặng',
    },
  },

  // Nguyên tắc "ngược trước sảng sau" — anti-self-torture (CHỐNG TỰ NGƯỢC)
  // QUAN TRỌNG: Tư duy theo GIAI ĐOẠN/SỰ KIỆN, không đếm theo chương.
  // 1 giai đoạn ngược (event) có thể trải dài 1-3 chương — diễn biến tự nhiên, KHÔNG cắt vụn.
  // Sau mỗi giai đoạn ngược kết thúc → BẮT BUỘC giai đoạn breathing trước khi sự kiện ngược tiếp theo.
  adversityToTriumphRatio: {
    description: 'Conflict phải GIÃN RA giữa các GIAI ĐOẠN/SỰ KIỆN. Trong cùng 1 sự kiện thì cứ để diễn biến tự nhiên. MC vượt qua không quá đau khổ. Dopamine không cần adversity setup.',
    idealRatio: '15% chương thuộc giai đoạn ngược → 85% chương thuộc giai đoạn breathing/sảng. Không phải mỗi victory đều cần adversity build-up.',
    hardRules: [
      'TƯ DUY THEO GIAI ĐOẠN: 1 sự kiện ngược (MC bị truy sát, bị bắt, đối đầu villain, gặp tai nạn) có thể trải 1-3 chương — diễn biến tự nhiên, KHÔNG ép cắt giữa sự kiện để chèn breathing.',
      'CẤM 2 GIAI ĐOẠN ngược liên tiếp KHÔNG có giai đoạn breathing ở giữa. Sau khi 1 sự kiện ngược kết thúc (resolution) → ≥1-3 chương breathing trước khi mở sự kiện ngược mới.',
      'Mỗi GIAI ĐOẠN ngược phải resolve trong tối đa 3-5 chương — KHÔNG kéo dài 6+ chương lê thê. Resolution có thể là MC thắng, MC thua nhưng sống, hoặc MC tìm được lối thoát.',
      'Mỗi arc có ≥40% chương thuộc giai đoạn breathing — MC small wins, casual competence, peaceful growth, recognition, slice of life, world-building.',
      'Mỗi chương dù thuộc giai đoạn ngược cũng PHẢI có ≥2 breathing moments (đối thoại ấm, observation đời thường, recognition nhỏ, hài hước nhẹ) để cân bằng.',
    ],
    antiPattern: 'TỰ NGƯỢC — chuỗi nhiều giai đoạn ngược liên tiếp không có breathing ở giữa, hoặc 1 giai đoạn ngược kéo dài 5+ chương lê thê. Đây là pattern reader Việt Nam ghét.',
  },

  // Density cap theo GIAI ĐOẠN — KHÔNG đếm theo chương (vì 1 sự kiện có thể span nhiều chương)
  conflictDensityCap: {
    description: 'Giới hạn tần suất GIAI ĐOẠN ngược — không đếm chương. Giữa 2 giai đoạn ngược cần giai đoạn breathing.',
    perGenre: {
      // breathingChaptersBetweenEvents: số chương breathing TỐI THIỂU giữa 2 giai đoạn ngược
      // maxEventLengthChapters: chiều dài tối đa của 1 giai đoạn ngược (chương)
      'do-thi':       { breathingChaptersBetweenEvents: 2, maxEventLengthChapters: 3 },
      'ngon-tinh':    { breathingChaptersBetweenEvents: 2, maxEventLengthChapters: 3 },
      'quan-truong':  { breathingChaptersBetweenEvents: 2, maxEventLengthChapters: 3 },
      'tien-hiep':    { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'huyen-huyen':  { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'kiem-hiep':    { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'khoa-huyen':   { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'vong-du':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'dong-nhan':    { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'di-gioi':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'lich-su':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'mat-the':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 5 },
      'linh-di':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 5 },
    },
    hardCap: 'KHÔNG genre nào được phép 1 giai đoạn ngược kéo dài 6+ chương, hoặc 2 giai đoạn ngược back-to-back không có breathing ở giữa.',
  },

  // Ngân sách sức mạnh — chống power creep trong truyện dài
  powerBudget: {
    description: 'Kiểm soát tốc độ tăng sức mạnh để giữ tension bền vững cho truyện 1000-2000 chương',
    perArcRules: {
      maxPowerUps: 3,
      maxBreakthroughs: 1,
      nonPowerChapters: 'Tối thiểu 17/20 chương phát triển qua chiến lược, quan hệ, worldbuilding, mưu kế, khám phá',
    },
    deceleratingFrequency: {
      earlyArcs: 'Arc 1-5: power-up mỗi 7 chương; breakthrough tối đa 1 lần/arc',
      midArcs: 'Arc 6-15: power-up mỗi 10 chương; breakthrough tối đa 1 lần/2 arc',
      lateArcs: 'Arc 16-30: power-up mỗi 15 chương; breakthrough tối đa 1 lần/3 arc',
      endArcs: 'Arc 31+: power-up mỗi 20 chương; breakthrough chỉ tại climax arc',
    },
    antiPowerCreep: [
      'KHÔNG tăng sức mạnh mỗi chương',
      'Mỗi power-up phải có điều kiện hoặc cái giá rõ ràng',
      'Kẻ thù và trở ngại phải leo thang tương ứng để giữ áp lực',
      'Sau breakthrough cần 3-5 chương thích nghi thay vì breakthrough liên tiếp',
    ],
  },
};

/**
 * Genre-specific title examples — injected into title rules to guide genre-appropriate naming.
 * Each genre has 6 example titles that capture the genre's unique flavor.
 */
export const GENRE_TITLE_EXAMPLES: Record<GenreType, string[]> = {
  'tien-hiep': ['Một Kiếm Phá Thiên', 'Quỳ Xuống!', 'Đan Thành, Thiên Kiếp Giáng', 'Ai Dám Coi Thường?', 'Chín Tầng Trời Rung Chuyển', 'Kẻ Không Xứng Đứng Đây'],
  'huyen-huyen': ['Thức Tỉnh Huyết Mạch', 'Đừng Ép Ta Ra Tay', 'Bí Mật Trong Hư Không', 'Thiên Đạo Sợ Ta?', 'Khế Ước Với Bóng Tối', 'Vạn Pháp Thần Giới'],
  'do-thi': ['Thẻ Đen Và Nụ Cười', 'Ai Cho Ngươi Quyền?', 'Chốt Deal Ngàn Tỷ', 'Kẻ Đứng Sau Tất Cả', 'Giao Dịch? Không Đủ Tư Cách!', 'Nước Cờ Kinh Thiên'],
  'khoa-huyen': ['Mã Gen Thứ 13', 'Hệ Thống Đã Thức Tỉnh', 'Vũ Trụ Đang Sợ', 'Tiến Hóa Bất Khả Nghịch', 'Trạm Không Gian Số 7', 'Tín Hiệu Từ Hư Vô'],
  'lich-su': ['Long Bào Dưới Áo Rách', 'Mưu Kế Trong Tiệc Rượu', 'Ai Mới Là Quân Sư?', 'Nước Cờ Cuối Cùng', 'Máu Đổ Trước Ngọ Môn', 'Lệnh Hổ Phù Đã Ban'],
  'dong-nhan': ['Nguyên Tác? Đã Vỡ', 'Ta Không Theo Kịch Bản', 'Hắn Biết Kết Cục Của Ngươi', 'Cướp Cơ Duyên? Chậm Rồi!', 'Nhân Vật Phụ Phản Kích', 'Thiên Mệnh Không Thuộc Về Hắn'],
  'vong-du': ['Hidden Quest: ???', 'Toàn Server Chấn Động', 'Bug Hay Cố Ý?', 'PK Tại Vùng An Toàn', 'First Blood Đẫm Máu', 'Top 1 Không Phải Để Chơi'],
  'kiem-hiep': ['Một Kiếm Xé Mây', 'Giang Hồ Ai Xứng Đệ Nhất?', 'Huyết Ảnh Dưới Trăng', 'Rượu Cạn, Kiếm Tuốt', 'Ân Oán Mười Năm', 'Thanh Kiếm Không Tên'],
  'mat-the': ['Ngày Thứ 47', 'Tiếng Gầm Trong Bóng Tối', 'Đồ Ăn Còn 3 Ngày', 'Ai Đang Theo Dõi?', 'Bức Tường Cuối Cùng', 'Sống Sót Bằng Mọi Giá'],
  'linh-di': ['Đừng Nhìn Lại', 'Căn Phòng Số 444', 'Xương Cốt Dưới Giếng', 'Nửa Đêm Có Người Gõ Cửa', 'Bóng Ma Trong Gương', 'Lời Nguyền Thứ Bảy'],
  'quan-truong': ['Ai Đứng Sau Bản Báo Cáo?', 'Cuộc Họp Kín', 'Thăng Chức Hay Bẫy?', 'Nước Cờ Của Kẻ Nhẫn', 'Phong Thanh Từ Tầng Trên', 'Lá Phiếu Quyết Định'],
  'di-gioi': ['Lãnh Chúa Bất Đắc Dĩ', 'Đất Mới, Luật Mới', 'Thổ Dân Quỳ Gối?', 'Xây Thành Từ Hoang Vu', 'Chiến Tranh Đầu Tiên', 'Vương Quốc Phôi Thai'],
  'ngon-tinh': ['Anh Ấy Lại Đến', 'Nụ Cười Và Nước Mắt', 'Đêm Mưa Không Ngủ', 'Ai Đang Giấu Bí Mật?', 'Trái Tim Không Nói Dối', 'Hoa Rơi Trước Cửa Nhà'],
};

/**
 * Genre-specific engagement items — supplement the generic ENGAGEMENT_CHECKLIST.perChapter
 * with items tailored to each genre's reader expectations.
 */
export const GENRE_ENGAGEMENT: Record<GenreType, string[]> = {
  'tien-hiep': [
    'Mỗi 2-3 chương phải có 1 face-slap hoặc khoảnh khắc "chấn kinh" (bàng quan kinh ngạc)',
    'Tu luyện phải có chi tiết cụ thể (cảm giác thể xác, biến hóa linh khí) — KHÔNG chỉ nói "đột phá"',
    'Đan dược/pháp khí phải có tên riêng và hiệu quả rõ ràng',
  ],
  'huyen-huyen': [
    'Hệ thống sức mạnh phải có quy tắc rõ ràng — người đọc phải hiểu MC mạnh cỡ nào so với kẻ thù',
    'Mỗi arc phải mở rộng thế giới (tầng mới, vùng đất mới, cảnh giới mới)',
    'Cơ duyên phải có giá phải trả (không free lunch)',
  ],
  'do-thi': [
    'Flex tài sản/quyền lực phải cụ thể (con số, thương hiệu, vị trí) — KHÔNG chỉ nói "giàu"',
    'Mỗi 5 chương CÓ THỂ có 1 scene đối đầu xã hội (đàm phán, lật kèo, chốt deal) — phần lớn chương ưu tiên smooth wins (chốt deal mượt, tìm được nhân tài, khoảnh khắc gia đình ấm áp, flex không gặp resistance)',
    'Tình cảm có thể smooth progression (gặp gỡ → ấn tượng tốt → gần gũi tự nhiên), KHÔNG bắt buộc tam giác/hiểu lầm/khoảng cách giai cấp',
    'MC tránh confront đối thủ chính diện trừ khi arc plan yêu cầu — ưu tiên thắng bằng tài năng/quan hệ/thông tin',
  ],
  'khoa-huyen': [
    'Công nghệ/hệ thống phải có chi tiết kỹ thuật hấp dẫn — không quá khô nhưng phải "có vẻ thật"',
    'Mỗi arc phải có 1 khám phá khoa học hoặc technology reveal gây WOW',
    'Mối đe dọa phải leo thang (cá nhân → hành tinh → vũ trụ)',
  ],
  'lich-su': [
    'Chi tiết lịch sử phải chính xác (triều đại, phong tục, xưng hô) — sai 1 chi tiết mất uy tín',
    'Mưu kế chính trị phải nhiều lớp (mưu trong mưu, kẻ hưởng lợi bất ngờ)',
    'Nhân vật lịch sử thật phải có chiều sâu — không chỉ là NPC',
  ],
  'dong-nhan': [
    'Nhân vật gốc phải IN-CHARACTER — fan sẽ phát hiện ngay nếu OOC',
    'MC phải tận dụng "meta knowledge" một cách thông minh (không quá OP nhưng cũng không ngu)',
    'Butterfly effect: hành động MC phải tạo hệ quả khác nguyên tác',
  ],
  'vong-du': [
    'Game mechanics phải nhất quán (stats, skills, rules) — KHÔNG thay đổi tùy tiện',
    'Mỗi 3-5 chương phải có 1 "thao tác thần thánh" (exploit system, PvP outplay, hidden quest)',
    'Players phải có hành vi giống game thật (trade, PK, guild drama)',
  ],
  'kiem-hiep': [
    'Chiêu thức kiếm pháp phải có tên và mô tả cảm quan (không chỉ "vung kiếm")',
    'Giang hồ phải có quy tắc (nghĩa khí, thù hận, tôn ti bang phái)',
    'Mỗi arc phải có 1 đại hội/tỷ thí hoặc ân oán giang hồ cần giải quyết',
  ],
  'mat-the': [
    'Sinh tồn phải có chi tiết cụ thể (tìm nước, xây trại, chế tạo vũ khí)',
    'Mỗi 3-5 chương phải có 1 mối đe dọa mới (dị thú, thiên tai, phe phái thù địch)',
    'Base building phải có tiến triển rõ ràng qua từng arc',
  ],
  'linh-di': [
    'Horror phải có atmosphere — miêu tả 5 giác quan, đặc biệt thính giác và xúc giác',
    'Bí ẩn phải có manh mối hợp lý — người đọc có thể đoán nếu chú ý',
    'Mỗi arc phải có 1 plot twist kinh hoàng mà người đọc không ngờ tới',
  ],
  'quan-truong': [
    'Quan hệ quyền lực phải rõ ràng (ai bảo kê ai, phe phái nào chống phe nào)',
    'Mỗi 5 chương phải có 1 mưu kế chính trị hoàn chỉnh (setup → thực hiện → kết quả)',
    'Thăng tiến phải có logic (công trạng, quan hệ, thời cơ) — KHÔNG may mắn suông',
  ],
  'di-gioi': [
    'Thế giới mới phải có quy tắc khác biệt rõ ràng (MC phải thích nghi)',
    'Xây dựng lãnh địa phải có milestone cụ thể qua từng arc',
    'Dân bản địa phải có văn hóa riêng — KHÔNG chỉ là NPC vô hồn',
  ],
  'ngon-tinh': [
    'Tình cảm có thể có push-pull nhẹ — KHÔNG bắt buộc tiến 1 lùi 2; smooth progression cũng được nếu hợp ngữ cảnh',
    'Mỗi 2-3 chương phải có 1 sweet moment hoặc heart-fluttering scene (tăng tần suất so với trước)',
    'Side couples phải có câu chuyện riêng — không chỉ là background',
  ],
};

/**
 * Universal anti-pattern blacklist — TQ 2024-2026 đã chán/loại bỏ các trigger sến.
 * Engine CẤM tạo những setup này trong Architect outline + Writer content.
 * Áp dụng cross-genre.
 */
export const UNIVERSAL_ANTI_SEEDS: string[] = [
  'CẤM "Mẹ MC ung thư / bệnh nặng cần tiền cứu" làm trigger động lực — sến, đã chán từ 2020',
  'CẤM "Bạn gái/người yêu bỏ MC vì nghèo" làm setup chương 1 — overused, đã thành meme',
  'CẤM "MC bị họ hàng/gia đình giàu khinh ra mặt, ăn cơm thừa" — xa lông, không relate cho reader 2024+',
  'CẤM "Tai nạn xe tải khiến MC xuyên không/trọng sinh" — meme đùa, dùng nghiêm túc thì cringe',
  'CẤM "Hôn ước bị hủy" làm trigger DUY NHẤT — overused; có thể dùng nếu kết hợp motif khác sâu hơn',
  'CẤM scene khóc lóc tủi thân kéo dài >1 đoạn (>200 từ) — TQ premium reader đã chán "凄惨开局"',
  'CẤM "MC mồ côi từ nhỏ + bị bạn cùng lớp bắt nạt + được lão gia trong nhẫn cứu" — formula cliché 2015-2018',
  'CẤM lạm dụng "tổng tài lạnh lùng + nữ chính ngây thơ + hợp đồng hôn nhân ép buộc" — TQ 女频 2024 đã reverse trend',
];

/**
 * Universal anti-self-torture rules — appended to EVERY genre via getGenreEngagement().
 * Triết lý: Tư duy theo GIAI ĐOẠN/SỰ KIỆN, không đếm chương. Giữa các giai đoạn ngược cần breathing.
 */
export const ANTI_SELF_TORTURE_RULES: string[] = [
  'TƯ DUY THEO GIAI ĐOẠN: 1 sự kiện ngược (truy sát, đối đầu villain, tai nạn) có thể trải 1-3 chương theo diễn biến tự nhiên — KHÔNG cắt vụn giữa sự kiện để chèn breathing',
  'CẤM 2 GIAI ĐOẠN ngược liên tiếp không có breathing ở giữa. Sau khi sự kiện ngược kết thúc → ≥1-3 chương breathing trước sự kiện ngược mới',
  'Giai đoạn ngược resolve trong tối đa 3-5 chương. KHÔNG kéo dài 6+ chương lê thê',
  'Mỗi chương dù thuộc giai đoạn ngược cũng PHẢI có ≥2 breathing moments để cân bằng',
  'Dopamine không cần adversity setup — smooth opportunity, casual competence, peaceful growth đều hợp lệ',
];

/**
 * Get genre-specific engagement items to inject into Architect prompt.
 * Always appends ANTI_SELF_TORTURE_RULES — these apply cross-genre.
 */
export function getGenreEngagement(genre: GenreType): string[] {
  const genreItems = GENRE_ENGAGEMENT[genre] || [];
  return [...genreItems, ...ANTI_SELF_TORTURE_RULES];
}

/**
 * Genre blending — merge engagement items from primary + sub-genres.
 * Modern hits 2024-2026 are cross-genre (urban+xianxia, Cthulhu+Đạo gia, etc.).
 * De-duplicates exact-match items.
 */
export function getBlendedGenreEngagement(primary: GenreType, subGenres: GenreType[] = []): string[] {
  const allGenres = [primary, ...subGenres.filter(g => g !== primary)];
  const items: string[] = [];
  const seen = new Set<string>();

  for (const g of allGenres) {
    const genreItems = GENRE_ENGAGEMENT[g] || [];
    for (const item of genreItems) {
      if (!seen.has(item)) {
        seen.add(item);
        items.push(item);
      }
    }
  }

  // Anti-self-torture rules apply cross-genre
  for (const rule of ANTI_SELF_TORTURE_RULES) {
    if (!seen.has(rule)) {
      seen.add(rule);
      items.push(rule);
    }
  }

  return items;
}

/**
 * Genre blending — merge dopamine patterns from primary + sub-genres.
 * Primary genre's patterns appear first, then unique patterns from sub-genres.
 */
export function getBlendedDopaminePatterns(primary: GenreType, subGenres: GenreType[] = []): DopaminePattern[] {
  const seen = new Set<DopamineType>();
  const result: DopaminePattern[] = [];

  // Primary genre first (its patterns dominate)
  for (const p of getDopaminePatternsByGenre(primary)) {
    if (!seen.has(p.type)) {
      seen.add(p.type);
      result.push(p);
    }
  }

  // Sub-genre patterns appended (skip duplicates)
  for (const sub of subGenres) {
    if (sub === primary) continue;
    for (const p of getDopaminePatternsByGenre(sub)) {
      if (!seen.has(p.type)) {
        seen.add(p.type);
        result.push(p);
      }
    }
  }

  return result;
}

/**
 * Build a hint string warning Architect about the current event/phase status.
 * Tư duy theo GIAI ĐOẠN, không đếm chương.
 *
 * @param genre - The story genre
 * @param currentEventLength - Số chương consecutive đang trong cùng 1 giai đoạn ngược (0 nếu chương trước là breathing)
 * @param chaptersSinceLastEventEnded - Số chương breathing kể từ khi giai đoạn ngược gần nhất kết thúc (Infinity nếu chưa từng có event)
 * @returns String warning or empty string if no constraint applies
 */
export function getConflictDensityHint(
  genre: GenreType,
  currentEventLength: number,
  chaptersSinceLastEventEnded: number,
): string {
  const cap = (ENGAGEMENT_CHECKLIST as { conflictDensityCap?: { perGenre: Record<string, { breathingChaptersBetweenEvents: number; maxEventLengthChapters: number }> } }).conflictDensityCap?.perGenre?.[genre];
  if (!cap) return '';

  // Trường hợp 1: Đang trong giai đoạn ngược kéo dài quá lâu
  if (currentEventLength >= cap.maxEventLengthChapters) {
    return `⚠️ EVENT QUÁ DÀI: Giai đoạn ngược hiện tại đã kéo dài ${currentEventLength} chương (max ${cap.maxEventLengthChapters}). Chương này BẮT BUỘC bắt đầu RESOLUTION — MC thắng, thua nhưng sống, hoặc tìm được lối thoát. KHÔNG được tiếp tục dập.`;
  }

  // Trường hợp 2: Vừa mới hết giai đoạn ngược, chưa đủ breathing chapters
  if (chaptersSinceLastEventEnded >= 0 && chaptersSinceLastEventEnded < cap.breathingChaptersBetweenEvents) {
    return `⚠️ THIẾU BREATHING: Mới ${chaptersSinceLastEventEnded} chương breathing kể từ giai đoạn ngược trước (cần ≥${cap.breathingChaptersBetweenEvents}). Chương này PHẢI là breathing/easy-win, CẤM mở giai đoạn ngược mới.`;
  }

  return '';
}

/**
 * Build title rules string for injection into AI prompts
 */
export function buildTitleRulesPrompt(previousTitles?: string[], genre?: GenreType): string {
  const titleExamples = TITLE_TEMPLATES
    .map(t => `  - ${t.name}: ${t.examples.slice(0, 2).join(', ')}`)
    .join('\n');

  const antiExamples = CHAPTER_TITLE_RULES.antiPatterns.slice(0, 5).join(', ');

  // Genre-specific title examples
  const genreTitleSection = genre && GENRE_TITLE_EXAMPLES[genre]
    ? `\n- VÍ DỤ TỐT CHO THỂ LOẠI ${genre}: ${GENRE_TITLE_EXAMPLES[genre].slice(0, 6).map(t => `"${t}"`).join(', ')}`
    : '';

  let prompt = `QUY TẮC ĐẶT TÊN CHƯƠNG (BẮT BUỘC):
- Ngắn gọn 3-10 từ, gợi tò mò, có lực click
- CẤM TUYỆT ĐỐI lặp lại hoặc tương tự bất kỳ tên chương nào đã viết trước đó
- CẤM dùng các mẫu nhàm chán: ${antiExamples}
- Mỗi tên chương phải là DUY NHẤT — không được trùng keyword chính với chương trước
- Nếu 2 từ khóa chính trùng với tên chương cũ → ĐỔI NGAY
- Có thể chọn 1 trong 10 mẫu đa dạng:
${titleExamples}${genreTitleSection}
- VÍ DỤ NÊN TRÁNH: "Sự Sỉ Nhục Và Sự Trỗi Dậy", "Nghịch Lý Của Linh Áp", "Quy Luật Của Những Con Số", "X Và Sự Y"`;

  if (previousTitles && previousTitles.length > 0) {
    // Cap at 50 most recent titles to avoid context bloat (was unlimited/500)
    const recentTitles = previousTitles.slice(0, 50);
    prompt += `\n\n⚠️ DANH SÁCH ${recentTitles.length} TÊN CHƯƠNG GẦN NHẤT (CẤM LẶP LẠI):
[${recentTitles.join(' | ')}]

KHÔNG ĐƯỢC đặt tên giống hoặc tương tự bất kỳ tên nào ở trên. Tên chương mới phải HOÀN TOÀN KHÁC BIỆT về ý nghĩa và từ khóa.`;
  }

  return prompt;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getStyleByGenre(genre: GenreType): StyleBible {
  return GENRE_STYLES[genre] || GENRE_STYLES['huyen-huyen'];
}

export function getPowerSystemByGenre(genre: GenreType): PowerSystem {
  switch (genre) {
    case 'tien-hiep':
      return POWER_SYSTEMS.cultivation_standard;
    case 'huyen-huyen':
      return POWER_SYSTEMS.cultivation_standard;
    case 'kiem-hiep':
      return POWER_SYSTEMS.martial_world;
    case 'do-thi':
    case 'quan-truong':
      return POWER_SYSTEMS.urban_system;
    case 'vong-du':
      return POWER_SYSTEMS.urban_system;
    case 'mat-the':
      return POWER_SYSTEMS.urban_system;
    case 'khoa-huyen':
      return POWER_SYSTEMS.urban_system;
    case 'linh-di':
      return POWER_SYSTEMS.rules_horror;
    case 'di-gioi':
      return POWER_SYSTEMS.lord_building;
    case 'dong-nhan':
      // dong-nhan depends on the original work; default to cultivation
      return POWER_SYSTEMS.cultivation_standard;
    case 'lich-su':
      // lich-su: power = political/military, no fantasy power; use urban as closest analog
      return POWER_SYSTEMS.urban_system;
    case 'ngon-tinh':
      // ngon-tinh: no combat power system; use urban as closest (social status)
      return POWER_SYSTEMS.urban_system;
    default:
      return POWER_SYSTEMS.cultivation_standard;
  }
}

// Combat patterns — exclude entirely from non-combat genres
const COMBAT_PATTERN_TYPES: DopamineType[] = [
  'face_slap', 'power_reveal', 'breakthrough', 'revenge', 'flex_power_casual',
  'monster_evolution', 'master_flex', 'simulate_success',
];

// Non-combat genres: do-thi (urban), ngon-tinh (romance), quan-truong (office politics)
// — these should NEVER receive combat-based dopamine unless arc plan explicitly requires.
const NON_COMBAT_GENRES: GenreType[] = ['do-thi', 'ngon-tinh', 'quan-truong'];

export function isNonCombatGenre(genre: GenreType): boolean {
  return NON_COMBAT_GENRES.includes(genre);
}

export function getDopaminePatternsByGenre(genre: GenreType): DopaminePattern[] {
  // Anti-self-torture + Modern golden-finger patterns: prepended for non-combat genres
  const SMOOTH_HEAD = [DOPAMINE_PATTERNS.smooth_opportunity, DOPAMINE_PATTERNS.casual_competence, DOPAMINE_PATTERNS.peaceful_growth];
  const GOLDEN_FINGER = [
    DOPAMINE_PATTERNS.knowledge_leverage,
    DOPAMINE_PATTERNS.network_payoff,
    DOPAMINE_PATTERNS.business_pivot,
    DOPAMINE_PATTERNS.quiet_competence,
    DOPAMINE_PATTERNS.insider_advantage,
  ];

  switch (genre) {
    case 'tien-hiep':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.face_slap];
    case 'huyen-huyen':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.revenge];
    case 'do-thi':
      // NON-COMBAT genre: golden finger + business cycle. ZERO combat patterns.
      return [...SMOOTH_HEAD, ...GOLDEN_FINGER, DOPAMINE_PATTERNS.business_success, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.flex_wealth, DOPAMINE_PATTERNS.harvest, DOPAMINE_PATTERNS.comfort, DOPAMINE_PATTERNS.beauty_encounter];
    case 'kiem-hiep':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.revenge, DOPAMINE_PATTERNS.secret_identity];
    case 'lich-su':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.business_success, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.revenge];
    case 'khoa-huyen':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.secret_identity];
    case 'vong-du':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.player_exploitation, DOPAMINE_PATTERNS.face_slap];
    case 'dong-nhan':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.steal_luck, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.face_slap];
    case 'mat-the':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.monster_evolution, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.revenge];
    case 'linh-di':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.revenge];
    case 'quan-truong':
      // NON-COMBAT genre: political mưu kế thắng bằng kiến thức/quan hệ, KHÔNG combat.
      return [...SMOOTH_HEAD, ...GOLDEN_FINGER, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.business_success, DOPAMINE_PATTERNS.flex_wealth, DOPAMINE_PATTERNS.harvest];
    case 'di-gioi':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.two_world_shock, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.face_slap];
    case 'ngon-tinh':
      // NON-COMBAT genre: emotional + 大女主 career arc. ZERO combat patterns.
      return [...SMOOTH_HEAD, ...GOLDEN_FINGER, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.beauty_encounter, DOPAMINE_PATTERNS.comfort, DOPAMINE_PATTERNS.comedy_misunderstanding, DOPAMINE_PATTERNS.tears_of_regret];
    default:
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.power_reveal];
  }
}

// ============================================================================
// SCENE EXPANSION RULES - "CÂU CHƯƠNG" OPTIMIZATION
// ============================================================================

export const SCENE_EXPANSION_RULES = {
  antiSpeed: {
    description: 'Prevent summarizing instead of experiencing',
    forbidden: [
      'Tóm tắt cảnh bằng câu tường thuật ngắn',
      'Liệt kê sự kiện thay vì mô tả chi tiết',
      'Dùng từ "sau đó", "rồi", "tiếp theo" quá nhiều',
      'Chuyển cảnh quá nhanh (trong 1 đoạn)',
    ],
    required: [
      'Mỗi scene kéo dài ít nhất 800-1200 từ',
      'Mô tả 5 giác quan cho mỗi không gian',
      'Nội tâm nhiều lớp: surface → deeper → deepest',
      'Xen kẽ flashback khi MC đau đớn/suy tư',
    ],
  },

  scenePacing: {
    action: {
      sentenceLength: { min: 5, max: 15 },
      paragraphLength: { min: 2, max: 5 },
      description: 'Ngắn, nhanh, dứt khoát',
    },
    emotional: {
      sentenceLength: { min: 15, max: 35 },
      paragraphLength: { min: 5, max: 10 },
      description: 'Dài, chậm, sâu sắc',
    },
    dialogue: {
      sentenceLength: { min: 8, max: 25 },
      paragraphLength: { min: 3, max: 8 },
      description: 'Vừa phải, xen kẽ hành động',
    },
  },

  wordCountTargets: {
    'opening_scene': { min: 500, max: 800 },
    'beating_scene': { min: 800, max: 1200 },
    'despair_scene': { min: 800, max: 1200 },
    'dialogue_scene': { min: 600, max: 1000 },
    'transformation_scene': { min: 500, max: 800 },
    'cliffhanger_scene': { min: 200, max: 400 },
  },

  expansionTechniques: [
    {
      name: 'FiveSenses',
      description: 'Mô tả bằng 5 giác quan',
      example: 'Mùi ẩm mốc nồng nặc. Tiếng chuột chạy. Ánh đèn vàng rung rinh. Lạnh. Rất lạnh.',
    },
    {
      name: 'InnerMonologueLayers',
      description: 'Nhiều lớp nội tâm',
      example: 'Surface: "Đau quá" → Deeper: "Ta sẽ chết?" → Deepest: "Không ai nhớ đến ta..."',
    },
    {
      name: 'BystanderReactions',
      description: 'Phản ứng đám đông',
      example: 'Kẻ cười nhạo, người xót xa, kẻ quay đi, trẻ con sợ hãi',
    },
    {
      name: 'FlashbackIntercutting',
      description: 'Xen kẽ quá khứ',
      example: 'Khi bị đánh, nhớ về nụ cười của mẹ, lời hứa của cha',
    },
    {
      name: 'MicroActionDetail',
      description: 'Phân rã hành động',
      example: 'Nắm tay siết chặt → Cơ bắp căng → Vai xoay → Lực từ hông → Bắn ra',
    },
    {
      name: 'EnvironmentalMirror',
      description: 'Môi trường phản chiếu cảm xúc',
      example: 'Tuyệt vọng → Mưa bão. Tức giận → Sấm chớp. Buồn → Hoàng hôn.',
    },
  ],

  chapter1Rules: {
    structure: [
      { part: 'Opening', percent: 20, minWords: 600 },
      { part: 'Beating/Humiliation', percent: 30, minWords: 900 },
      { part: 'Despair', percent: 30, minWords: 900 },
      { part: 'Transformation', percent: 15, minWords: 450 },
      { part: 'Cliffhanger', percent: 5, minWords: 150 },
    ],
    totalMinWords: 3000,
    totalMaxWords: 5000,
    forbidden: [
      'MC trả thù ngay trong chương 1',
      'Antagonist nói cliché ("Ngươi là phế vật")',
      'Hệ thống game thân thiện ("Chúc mừng bạn...")',
      'Loading percentage bars',
      'Resolution/Ending hạnh phúc',
    ],
  },

  villainDialogue: {
    forbidden: [
      'Ngươi chỉ là con kiến',
      'Tìm chết',
      'Ngươi dám',
      'Đồ phế vật',
      'Cút đi',
      'Biến',
      'Muốn chết sao',
      'Không biết trời cao đất dày',
      'Ếch ngồi đáy giếng',
      'Cũng dám mơ',
    ],
    recommended: [
      'Xử lý sạch sẽ',
      'Đừng để chết trong tông môn, phiền phức',
      'Ngươi nên cảm ơn ta. Ít nhất, ngươi còn được đứng đây',
      'Ở thành phố này, công lý chỉ là một công cụ. Vấn đề là... ai cầm nó',
      'Cường giả vi tôn. Đây là quy luật',
    ],
  },
};

// ============================================================================
// GENRE BOUNDARY RULES
// ============================================================================

export interface GenreBoundary {
  coreIdentity: string;
  forbidden: string[];
  allowedExpansions: string[];
  driftWarnings: string[];
}

export const GENRE_BOUNDARIES: Record<GenreType, GenreBoundary> = {
  'tien-hiep': {
    coreIdentity: 'Tu tiên cổ điển: tu luyện, cảnh giới, tông phái, linh khí, đan dược, pháp bảo',
    forbidden: [
      'Công nghệ hiện đại (máy tính, điện thoại, internet, AI)',
      'Vũ khí hiện đại (súng, tên lửa, bom nguyên tử)',
      'Du hành không gian, hành tinh khác (trừ khi đã setup tinh giới)',
      'Hệ thống game rõ ràng (level up notification, UI panel)',
    ],
    allowedExpansions: [
      'Tu luyện kết hợp luyện khí/luyện thể',
      'Cổ trận pháp, cổ đại di tích',
      'Thần giới, ma giới (khi cảnh giới đủ cao)',
    ],
    driftWarnings: [
      'MC dùng khoa học để giải thích tu luyện',
      'Xuất hiện vũ khí/công nghệ vượt thời đại',
      'Bối cảnh chuyển sang hoàn toàn hiện đại',
    ],
  },
  'huyen-huyen': {
    coreIdentity: 'Huyền huyễn: thế giới hư cấu, hệ thống sức mạnh độc đáo, nhiều chủng tộc',
    forbidden: [
      'Công nghệ Trái Đất hiện đại',
      'Tham chiếu đến thế giới thực (quốc gia, thành phố thực)',
      'Hệ thống game rõ ràng',
    ],
    allowedExpansions: [
      'Ma pháp + tu luyện kết hợp',
      'Nhiều chủng tộc, không gian khác nhau',
      'Thần thoại, truyền thuyết nội tại',
    ],
    driftWarnings: [
      'Xuất hiện yếu tố khoa học cứng',
      'MC xuyên không về Trái Đất',
    ],
  },
  'do-thi': {
    coreIdentity: 'Đô thị hiện đại: thành phố, kinh doanh, quyền lực xã hội, đời thường',
    forbidden: [
      'Tu tiên cao cấp (bay trên trời, hủy diệt thành phố bằng chiêu thức)',
      'Xuyên không sang thế giới khác',
      'Chiến tranh giữa các hành tinh',
      'Ma thuật/phép thuật rõ ràng (trừ khi đã setup từ đầu)',
    ],
    allowedExpansions: [
      'Võ thuật nhẹ (kung fu, boxing)',
      'Năng lực siêu nhiên nhẹ (nếu setup từ đầu)',
      'Hệ thống bí ẩn (nếu là đô thị dị năng)',
    ],
    driftWarnings: [
      'MC bắt đầu bay, phá hủy tòa nhà bằng nội lực',
      'Xuất hiện quái vật, ma quỷ khi không phải thể loại linh dị',
      'Bối cảnh rời thành phố hoàn toàn sang rừng núi tu luyện',
    ],
  },
  'kiem-hiep': {
    coreIdentity: 'Kiếm hiệp cổ trang: giang hồ, bang hội, kiếm pháp, nghĩa hiệp, ân oán',
    forbidden: [
      'Công nghệ hiện đại',
      'Tu tiên level thần tiên (bay vào vũ trụ)',
      'Hệ thống game',
      'Vũ khí hiện đại',
    ],
    allowedExpansions: [
      'Nội công, khinh công, điểm huyệt',
      'Bí kíp võ công, thần binh lợi khí',
      'Ẩn sĩ cao nhân, bí mật giang hồ',
    ],
    driftWarnings: [
      'MC đạt sức mạnh phá hủy núi non',
      'Xuất hiện phép thuật/tu tiên thực sự',
      'Bối cảnh chuyển sang hiện đại',
    ],
  },
  'lich-su': {
    coreIdentity: 'Lịch sử Trung Quốc/châu Á: triều đại, chính trị, quân sự, văn hóa thời đại',
    forbidden: [
      'Phi thuyền, laser, năng lượng hạt nhân',
      'Xâm lăng hành tinh khác',
      'Công nghệ vượt thời đại quá nhiều (máy tính, điện)',
      'Tu tiên cao cấp (trừ khi đã setup rõ từ đầu)',
      'Quái vật ngoài hành tinh',
    ],
    allowedExpansions: [
      'Cải tiến công nghệ hợp lý cho thời đại (thuốc súng sớm, in ấn, thủy lợi)',
      'Chiến thuật quân sự tiên tiến',
      'Yếu tố thần bí nhẹ nếu phù hợp văn hóa (phong thủy, bói toán)',
    ],
    driftWarnings: [
      'MC phát minh công nghệ hiện đại hoàn chỉnh',
      'Xuất hiện vũ khí vượt thời đại 500+ năm',
      'Bối cảnh chuyển sang khoa học viễn tưởng',
      'Tu luyện tu tiên trong truyện lịch sử thuần',
    ],
  },
  'khoa-huyen': {
    coreIdentity: 'Khoa huyễn: công nghệ tương lai, vũ trụ, AI, robot, siêu nhân khoa học',
    forbidden: [
      'Tu tiên truyền thống (linh khí, đan điền)',
      'Ma thuật/phép thuật (trừ khi đã setup là tech-magic)',
      'Kiếm hiệp cổ trang thuần',
    ],
    allowedExpansions: [
      'Năng lực siêu nhiên giải thích bằng khoa học',
      'Alien, du hành vũ trụ',
      'AI, robot, cyborg, gene enhancement',
    ],
    driftWarnings: [
      'MC bắt đầu tu luyện kiểu cổ xưa',
      'Bối cảnh chuyển về cổ đại hoàn toàn',
    ],
  },
  'vong-du': {
    coreIdentity: 'Vọng du/Game: thế giới ảo, game mechanics, quest, raid, PvP, level system',
    forbidden: [
      'Bối cảnh hoàn toàn rời thế giới game mà không quay lại',
      'Mất hoàn toàn yếu tố game (level, quest, boss)',
    ],
    allowedExpansions: [
      'Real-world stakes ảnh hưởng game',
      'AI trong game phát triển ý thức',
      'Multiple games/thế giới ảo',
    ],
    driftWarnings: [
      'Game elements biến mất hoàn toàn',
      'Chuyển sang tu tiên thuần túy không còn game',
    ],
  },
  'dong-nhan': {
    coreIdentity: 'Đồng nhân: fanfiction trong thế giới anime/manga/game nổi tiếng',
    forbidden: [
      'Phá hủy hoàn toàn setting gốc mà không giải thích',
      'OC hoàn toàn không liên quan đến thế giới gốc',
    ],
    allowedExpansions: [
      'Crossover nhiều thế giới',
      'AU (Alternative Universe)',
      'Thêm hệ thống/golden finger',
    ],
    driftWarnings: [
      'Nhân vật gốc bị OOC quá mức',
      'Bối cảnh không còn nhận ra thế giới gốc',
    ],
  },
  'mat-the': {
    coreIdentity: 'Mạt thế: apocalypse, zombie, đột biến, sinh tồn, tài nguyên khan hiếm',
    forbidden: [
      'Xã hội phục hồi hoàn toàn quá sớm',
      'MC trở thành thần/tiên rời khỏi thế giới mạt thế',
    ],
    allowedExpansions: [
      'Năng lực siêu nhiên từ đột biến',
      'Crystal/tinh thể năng lượng',
      'Quái vật đột biến tiến hóa',
    ],
    driftWarnings: [
      'Bối cảnh sinh tồn biến mất, thành đô thị bình thường',
      'MC mạnh quá không có thử thách sinh tồn',
    ],
  },
  'linh-di': {
    coreIdentity: 'Linh dị: ma quỷ, huyền bí, kinh dị, tâm linh, phong thủy',
    forbidden: [
      'Khoa học giải thích mọi thứ siêu nhiên',
      'Tu tiên cao cấp (phá hủy thế giới)',
      'Không gian/vũ trụ, alien',
    ],
    allowedExpansions: [
      'Phong thủy, bùa chú, pháp sư',
      'Tâm linh, luân hồi, nghiệp báo',
      'Yếu tố kinh dị tâm lý',
    ],
    driftWarnings: [
      'Ma quỷ biến thành quái vật kiểu fantasy thuần',
      'MC trở thành tu tiên mạnh mẽ bỏ qua yếu tố kinh dị',
    ],
  },
  'quan-truong': {
    coreIdentity: 'Quan trường: chính trị, leo lên quyền lực, mưu kế, quan hệ, tham nhũng',
    forbidden: [
      'Siêu năng lực, tu luyện',
      'Chiến tranh vũ trụ',
      'Ma thuật/phép thuật',
    ],
    allowedExpansions: [
      'Kinh doanh, tài chính',
      'Tình cảm, gia đình',
      'Điều tra, phá án',
    ],
    driftWarnings: [
      'MC dùng vũ lực thay vì mưu trí',
      'Bối cảnh rời chính trường hoàn toàn',
    ],
  },
  'di-gioi': {
    coreIdentity: 'Dị giới: xuyên không sang thế giới khác, khám phá, sinh tồn, phát triển',
    forbidden: [
      'Quay về Trái Đất vĩnh viễn mà không quay lại dị giới',
    ],
    allowedExpansions: [
      'Hệ thống/golden finger',
      'Tu luyện, ma pháp tùy thế giới',
      'Xây dựng lãnh thổ, phát triển vương quốc',
    ],
    driftWarnings: [
      'Bối cảnh dị giới biến mất, thành đô thị hiện đại',
    ],
  },
  'ngon-tinh': {
    coreIdentity: 'Ngôn tình: tình yêu, cảm xúc, quan hệ, drama gia đình, heal',
    forbidden: [
      'Chiến tranh quy mô lớn',
      'Tu luyện/sức mạnh chiến đấu là focus chính',
      'Khoa học viễn tưởng hardcore',
    ],
    allowedExpansions: [
      'Kinh doanh, sự nghiệp',
      'Gia đình, con cái',
      'Bí mật thân phận, drama',
    ],
    driftWarnings: [
      'MC bắt đầu đánh nhau nhiều hơn yêu đương',
      'Tình cảm biến mất, thành action thuần',
    ],
  },
};

/**
 * Get genre boundary text for injection into context.
 */
export function getGenreBoundaryText(genre: GenreType): string {
  const boundary = GENRE_BOUNDARIES[genre];
  if (!boundary) return '';

  const parts: string[] = [];
  parts.push(`THỂ LOẠI: ${genre.toUpperCase()}`);
  parts.push(`BẢN SẮC CỐT LÕI: ${boundary.coreIdentity}`);
  parts.push(`\nCẤM TUYỆT ĐỐI (nếu vi phạm → genre drift):`);
  for (const item of boundary.forbidden) {
    parts.push(`  - ${item}`);
  }
  parts.push(`\nCHO PHÉP MỞ RỘNG (có kiểm soát):`);
  for (const item of boundary.allowedExpansions) {
    parts.push(`  + ${item}`);
  }
  parts.push(`\nDẤU HIỆU CẢNH BÁO (nếu thấy → đang lệch thể loại):`);
  for (const item of boundary.driftWarnings) {
    parts.push(`  ! ${item}`);
  }

  return parts.join('\n');
}

/**
 * Check if chapter follows scene expansion rules.
 */
// ============================================================================
// ANTI-CLICHÉ DICTIONARY - Triệt tiêu văn phong AI
// ============================================================================

/**
 * Genre-specific anti-cliche blacklists — phrases that mark AI writing in each genre.
 * Supplements the generic ANTI_CLICHE_RULES.blacklist with genre-appropriate bans.
 */
export const GENRE_ANTI_CLICHE: Record<GenreType, string[]> = {
  'tien-hiep': [
    'cảnh giới kinh người', 'linh khí cuộn cuộn', 'chân khí tràn ngập',
    'thiên địa biến sắc', 'uy áp trùm xuống', 'một chưởng phá thiên',
    'trong mắt lóe lên sát ý', 'khí tức hùng hồn', 'tu vi cao thâm mạt trắc',
  ],
  'huyen-huyen': [
    'phóng ra một cỗ lực lượng', 'cảm nhận được một sức mạnh', 'hỗn loạn lan ra',
    'ánh sáng chói lóa', 'đại trận pháp vận hành', 'vẫn mang vẻ bình tĩnh',
    'toàn thân tỏa ra khí tức', 'chỉ là phế vật', 'mắt lạnh nhìn xuống',
  ],
  'do-thi': [
    'anh ta chỉ mỉm cười bí ẩn', 'mọi người sửng sốt', 'không ngờ anh ta lại',
    'cả hội trường im lặng', 'điện thoại đột nhiên reo', 'tài khoản có thêm',
    'tất cả mọi người quay đầu lại', 'siêu xe đỗ trước cửa', 'thẻ đen VIP',
  ],
  'khoa-huyen': [
    'hệ thống phát ra tiếng cảnh báo', 'năng lượng tăng vọt', 'dữ liệu cho thấy',
    'AI phân tích xong', 'công nghệ vượt thời đại', 'tế bào đang biến đổi',
    'con số trên màn hình', 'sức mạnh tăng theo cấp số nhân', 'tiến hóa hoàn hảo',
  ],
  'lich-su': [
    'hoàng thượng sáng suốt', 'thần xin tâu', 'một mưu kế hoàn hảo',
    'triều thần kinh ngạc', 'long nhan đại duyệt', 'tất cả là nằm trong tính toán',
    'muôn năm muôn năm muôn muôn năm', 'thiên hạ đệ nhất', 'vận nước sắp đổi thay',
  ],
  'dong-nhan': [
    'nguyên tác sẽ không xảy ra nữa', 'hắn biết tương lai', 'butterfly effect',
    'cốt truyện đã thay đổi', 'ta sẽ cứu tất cả', 'lịch sử đã rẽ nhánh',
    'nhân vật chính nguyên tác', 'ta biết kết cục của ngươi', 'thiên mệnh đã đổi',
  ],
  'vong-du': [
    'hệ thống thông báo', 'kinh nghiệm +100', 'level up', 'hidden quest triggered',
    'congratulations player', 'stats tăng vọt', 'first kill reward', 'bug hệ thống',
    'server announcement', 'toàn server chấn động', 'top bảng xếp hạng',
  ],
  'kiem-hiep': [
    'kiếm khí tung hoành', 'chiêu thức tinh diệu', 'giang hồ nghĩa khí',
    'huynh đệ xin nhận thua', 'một kiếm xé gió', 'đao quang kiếm ảnh',
    'nội công thâm hậu', 'vận khí đẩy chưởng', 'cao thủ ẩn thế',
  ],
  'mat-the': [
    'cấp bách sinh tồn', 'tìm được nguồn nước sạch', 'dị thú cấp X',
    'base đã nâng cấp', 'nhân loại cuối cùng', 'virus biến đổi',
    'tận thế đã đến', 'chỉ còn N ngày', 'kho vũ khí bí mật',
  ],
  'linh-di': [
    'một luồng khí lạnh', 'bóng đen lướt qua', 'tiếng cười ghê rợn',
    'máu tươi chảy ngược', 'linh hồn oán hận', 'ngôi mộ cổ',
    'đừng nhìn lại phía sau', 'hắn đã chết từ lâu', 'lời nguyền truyền đời',
  ],
  'quan-truong': [
    'đồng chí yên tâm', 'tổ chức đã quyết định', 'một bước lên mây',
    'quan lộ hanh thông', 'bàn tay vô hình phía sau', 'hắn chỉ mỉm cười ý nhị',
    'cuộc họp kết thúc trong im lặng', 'người đứng sau tất cả', 'thế cờ đã rõ',
  ],
  'di-gioi': [
    'thế giới này thật lạ', 'quy tắc khác hẳn', 'lãnh địa phát triển',
    'dân bản địa quỳ lạy', 'xây dựng từ số không', 'vương quốc sẽ hùng mạnh',
    'tài nguyên vô tận', 'sức mạnh thần bí', 'cánh cổng xuyên không',
  ],
  'ngon-tinh': [
    'tim đập thình thịch', 'má ửng hồng', 'cảm giác lạ lùng',
    'anh ấy thật khác biệt', 'nụ cười ấm áp', 'không hiểu sao lại',
    'trái tim rung động', 'đêm đó không ngủ được', 'tình yêu sét đánh',
  ],
};

/**
 * Get genre-specific anti-cliche phrases.
 */
export function getGenreAntiCliche(genre: GenreType): string[] {
  return GENRE_ANTI_CLICHE[genre] || [];
}

export const ANTI_CLICHE_RULES = {
  description: 'Tránh sử dụng các cụm từ sáo rỗng, lặp đi lặp lại mang đậm dấu vết AI.',
  blacklist: [
    'Hít một ngụm khí lạnh',
    'Không thể tin nổi',
    'Đột nhiên',
    'Khẽ nhếch mép',
    'Ánh mắt kiên định',
    'Một cỗ lực lượng vô hình',
    'Khí tức khủng bố',
    'Mỉm cười thâm ý',
    'Không hẹn mà cùng',
    'Đồng tử co rụt lại (nếu dùng quá 1 lần/chương)',
    'Trong chớp mắt',
    'Không ai biết rằng',
    'Chỉ thấy',
    'Cảm thấy một luồng',
    'Siết chặt nắm tay',
    'Mồ hôi lạnh túa ra',
    'Da gà nổi lên',
    'Đôi mắt lóe lên tia sáng',
    'Ánh mắt sắc lẹm',
    'Nghiến răng (nếu dùng quá 1 lần/chương)',
    'Hít một hơi thật sâu (nếu dùng quá 1 lần/chương)',
    'Gầm lên',
    'Khóe môi nhếch lên (nếu dùng quá 1 lần/chương)',
  ],
  guidance: 'Thay vì dùng các từ cấm, hãy MÔ TẢ hệ quả của chúng. Ví dụ: thay vì "hít một ngụm khí lạnh", tả "sắc mặt tái nhợt, lùi lại nửa bước". Thay vì "đột nhiên", tả trực tiếp âm thanh/hình ảnh cắt ngang.',
  colorRepetitionRule: `QUY TẮC LẶP MÀU SẮC & TÍNH TỪ (CỰC KỲ QUAN TRỌNG):
- KHÔNG dùng cùng một tính từ/trạng từ/cụm miêu tả màu sắc quá 3 lần trong MỘT chương.
- Sau lần thứ 3, BẮT BUỘC dùng từ đồng nghĩa, ẩn dụ, hoặc miêu tả gián tiếp.
- Ví dụ thay thế:
  + "tím sẫm" lần 4+ → "màu bầm tím trên da", "sắc hoàng hôn pha loãng", "như mực cũ loang trên giấy", "tối như đáy vực"
  + "vàng kim" lần 4+ → "màu nắng chói chang", "rực như hoàng hôn sa mạc", "sắc mật ong đặc quánh", "lấp lánh tựa kim sa"
  + "rực rỡ" lần 4+ → "chói mắt", "tỏa sáng rạng ngời", "lóa mắt", "rực lửa"
  + "kinh hoàng" lần 4+ → "ớn lạnh", "máu đông cứng", "hồn vía lên mây", "tim nhảy khỏi lồng ngực"
  + "pixel hóa" lần 4+ → "tan rã thành điểm ảnh", "vỡ vụn thành hạt sáng", "phân giải", "bị số hóa cưỡng ép"
- Các từ THƯỜNG BỊ LẶP cần chú ý: rỉ sét, ken két, rực rỡ, đặc quánh, mờ ảo, chập chờn, kinh hoàng, kinh ngạc, khủng bố, sững sờ
- CẤU TRÚC AI THƯỜNG LẶP: "là một" (thay: bỏ hoặc dùng gạch ngang), "bắt đầu" (thay: dùng động từ trực tiếp), "mang theo" (thay: pha lẫn, nhuốm), "tỏa ra" (thay: lan tỏa, phả ra), "đôi mắt" (thay: mắt, cặp mắt, tròng mắt, ánh nhìn)
- TUYỆT ĐỐI KHÔNG dùng cùng tính từ 2 lần trong 1 đoạn văn (paragraph).`,
};

// ============================================================================
// SUBTEXT DIALOGUE RULES - Hội thoại kẹp dao
// ============================================================================

export const SUBTEXT_DIALOGUE_RULES = {
  description: 'Hội thoại nhiều tầng nghĩa, không nói thẳng, kẹp dao trong nụ cười.',
  rules: [
    'Phản diện cấp cao KHÔNG chửi bới, KHÔNG dùng từ ngữ hạ cấp. Nói lời lịch sự nhưng đầy sát khí, uy hiếp ngầm.',
    'Nhân vật mưu mô KHÔNG bao giờ nói thẳng mục đích. Dùng ẩn dụ (metaphor), mượn vật nói người (chỉ trà, chỉ cây, chỉ thời tiết).',
    'Mọi đoạn hội thoại quan trọng PHẢI đi kèm vi biểu cảm (micro-expressions) hoặc hành động nhỏ để che giấu nội tâm (nhấp trà, vuốt nếp áo, nhìn bâng quơ, gõ ngón tay).',
    'Tránh kiểu hỏi đáp QA (Hỏi 1 câu, trả lời 1 câu đầy đủ). Trả lời bằng câu hỏi ngược lại, sự im lặng, hoặc trả lời lạc đề có chủ đích.',
    'Lời nói và suy nghĩ nội tâm có thể trái ngược hoàn toàn (ví dụ: cười nói khen ngợi nhưng trong lòng đang tính toán cách giết).',
  ]
};

// ============================================================================
// COMEDY MECHANICS RULES - Kỹ thuật tấu hài webnovel
// ============================================================================

export const COMEDY_MECHANICS_RULES = {
  description: 'Kỹ thuật tạo tiếng cười qua tình huống và tính cách, CẤM dùng trò đùa chơi chữ phương Tây.',
  mechanics: [
    {
      name: 'Não Bổ (Suy Diễn)',
      description: 'MC làm một hành động lãng xẹt/vô tình/tham tiền. Người xung quanh (đặc biệt là cao thủ) tự suy diễn đó là nước đi cao thâm mạt trắc, tự dọa mình sợ.',
    },
    {
      name: 'Vô Sỉ (Shameless)',
      description: 'Phá vỡ hình tượng hoàn mỹ. MC tỏ ra đạo mạo nhưng lại lật lọng, sợ chết, tham món lợi nhỏ, chối bỏ trách nhiệm với khuôn mặt tỉnh bơ.',
    },
    {
      name: 'Phản Kém (Gap Moe)',
      description: 'Tạo tương phản cực gắt: Ma đầu giết người không chớp mắt nhưng cực sợ vợ; Thần khí uy chấn thiên hạ nhưng lải nhải chửi bậy như trẻ trâu.',
    },
    {
      name: 'Hệ Thống Troll',
      description: 'Hệ thống không đưa quà ngoan ngoãn mà đưa ra các lựa chọn mất mặt (VD: Cứu người được 10 xu, vứt liêm sỉ bỏ chạy được Thần binh).',
    }
  ],
  forbidden: [
    'Tự nhiên kể một câu chuyện cười/tiếu lâm',
    'Chơi chữ, gieo vần gượng ép',
    'Tạo tiếng cười đùa cợt trong lúc nhân vật khác đang bi kịch/chết chóc (làm hỏng mood)',
  ]
};

export function checkSceneExpansion(
  content: string,
  chapterNumber: number
): { valid: boolean; issues: string[]; wordCount: number } {
  const issues: string[] = [];
  const wordCount = content.split(/\s+/).length;

  if (chapterNumber === 1) {
    if (wordCount < SCENE_EXPANSION_RULES.chapter1Rules.totalMinWords) {
      issues.push(`Chương 1 quá ngắn: ${wordCount} từ (cần ${SCENE_EXPANSION_RULES.chapter1Rules.totalMinWords}+)`);
    }
  }

  const forbiddenPatterns = [
    /sau đó[^\.,;]{0,30}sau đó/i,
    /tiếp theo[^\.,;]{0,30}tiếp theo/i,
    /rồi[^\.,;]{0,20}rồi[^\.,;]{0,20}rồi/i,
  ];

  forbiddenPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      issues.push('Phát hiện tóm tắt nhanh - cần mô tả chi tiết hơn');
    }
  });

  SCENE_EXPANSION_RULES.villainDialogue.forbidden.forEach(phrase => {
    if (content.toLowerCase().includes(phrase.toLowerCase())) {
      issues.push(`Phát hiện cliché villain: "${phrase}" - cần viết lại`);
    }
  });

  if (/\d+%.*\d+%.*100%/.test(content) || /Chúc mừng.*nhận được/i.test(content)) {
    issues.push('Phát hiện hệ thống game - cần viết lại theo phong cách kinh dị/huyền bí');
  }

  if (chapterNumber === 1) {
    const revengePatterns = [
      /trả thù.*ngay/i,
      /đánh lại.*ngay/i,
      /phản kháng.*thành công/i,
    ];
    revengePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        issues.push('Chương 1 có cảnh trả thù ngay - cần kéo dài xây dựng');
      }
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    wordCount,
  };
}
