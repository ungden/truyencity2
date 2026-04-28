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
  'ngu-thu-tien-hoa': {
    authorVoice: 'Giọng văn năng động, kết hợp data-game (bảng chỉ số, tuyến tiến hóa, BOM nguyên liệu) với phiêu lưu adventure. Tone Sảng văn Bất Đối Xứng Nhận Thức.',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['ngự thú', 'tiến hóa', 'thuần hóa', 'collection', 'bảng chỉ số', 'BOM', 'thần thú'],
    avoidKeywords: ['tu tiên cảnh giới', 'huyết chiến phàm nhân', 'pháp sư trừ tà'],
    dialogueRatio: [25, 35],
    descriptionRatio: [40, 50],
    innerThoughtRatio: [15, 25],
    actionRatio: [15, 25],
    pacingStyle: 'medium',
    genreConventions: [
      'GHI CHÚ THỂ LOẠI: Ngự Thú là Pokemon × Tu tiên × RPG. Sảng văn = bất đối xứng nhận thức (đối thủ thấy "phế vật", thực tế là thần thú đột biến). KHÔNG combat tay đôi MC vs đối thủ — combat là pet vs pet.',
      'MC là ngự thú sư có Bàn Tay Vàng nhìn thấu Tuyến Tiến Hóa Ẩn + công thức BOM. Bản thân MC yếu, sức mạnh đến từ pet đột biến + chiến thuật điều phối đội hình.',
      'Mỗi pet có DATA RÕ RÀNG: tên, cấp (F→SSS), skill gốc, skill đột biến tiềm năng, công thức tiến hóa (3-5 nguyên liệu), tính cách. Như bộ bài Pokemon — luôn nhất quán xuyên truyện, không "quên skill".',
      'Đột biến skill theo 3 quy tắc: (1) khuếch đại số/phạm vi, (2) xoá cooldown/cost, (3) bẻ cong logic. Mỗi đột biến = dopamine peak — mô tả CỤ THỂ skill cũ vs skill mới + phản ứng quái vật/đối thủ.',
      'Đội hình pet đa năng: tank (chịu đòn), DPS (sát thương), healer/buffer (hỗ trợ), khống chế (CC), exploit (skill độc đáo). MC bất bại không vì 1 pet mạnh mà vì điều phối thông minh.',
      'Mỗi giải đấu / cuộc săn / boss raid = 1 mini-arc 3-15 chương: setup (chuẩn bị, scout, BOM nguyên liệu) → thực chiến (combat pet vs pet với tính toán chiến thuật) → loot (vật phẩm rớt + skill book + tài nguyên đột biến) → harvest (đột biến pet mới hoặc tăng cấp pet cũ).',
      'NPC reactions = engine sảng văn chính: bạn cùng lớp ngạc nhiên, đối thủ tài phiệt sụp đổ tinh thần, thầy giáo nhìn ra MC giấu nghề, đám fan girl cuồng nhiệt. ≥30% chương phải có scene phản ứng đám đông.',
      'Pet có nhân cách: con cáo nhỏ tinh nghịch, con đại điểu nghiêm túc, con slime tham ăn — mỗi pet là 1 nhân vật phụ với arc riêng. Mối quan hệ MC-pet = trái tim cảm xúc, không chỉ là "công cụ chiến đấu".',
      'Multi-POV: scene đối thủ thiên kiêu chuẩn bị giải đấu (POV rival kiêu ngạo trước, sụp đổ sau), scene thầy giáo quan sát đột biến của MC (POV mentor ngạc nhiên), scene pet cảm nhận tình cảm với MC (POV pet ấm áp).',
    ],
  },
  'khoai-xuyen': {
    authorVoice: 'Giọng văn modular episodic — mỗi 30-50 chương đổi thân phận + thế giới hoàn toàn. MC senior level deadpan humor. Tone tùy thế giới (đô thị / cổ đại / mạt thế / dị giới) nhưng nội tâm MC nhất quán.',
    narrativeStyle: 'first_person',
    toneKeywords: ['hệ thống', 'nhiệm vụ', 'cứu vớt', 'đa vũ trụ', 'pháo hôi', 'nguyên chủ', 'KPI', 'đăng xuất'],
    avoidKeywords: ['tu tiên cảnh giới dài hạn', 'gia tộc 1000 năm bám trụ'],
    dialogueRatio: [30, 40],
    descriptionRatio: [25, 35],
    innerThoughtRatio: [25, 35],
    actionRatio: [10, 20],
    pacingStyle: 'fast',
    genreConventions: [
      'GHI CHÚ THỂ LOẠI: Khoái Xuyên là episodic — mỗi thế giới 30-50 chương đóng. Reset modular: nhân vật phụ thế giới cũ KHÔNG xuất hiện thế giới mới (trừ cặp đôi xuyên cùng / nguyên chủ tự ý thức).',
      'MC là nhân viên Hệ Thống Đa Vũ Trụ — có tính cách + voice nhất quán xuyên thế giới (deadpan, professional, đôi khi mệt mỏi với task), KHÁC với pháo hôi/nguyên chủ MC nhập vai.',
      'Cấu trúc thế giới chuẩn 4 hồi (5+15+15+10 chương cho thế giới 45 chương): Hồi 1 - đồng bộ kịch bản gốc + nhận task + làm quen thân phận; Hồi 2 - lật ngược thiết lập + rời nguyên kịch bản; Hồi 3 - phá vỡ kịch bản + vả mặt khí vận chi tử; Hồi 4 - hoàn thành KPI + thu hoạch + đăng xuất.',
      'Khí vận chi tử (nguyên chủ chính của các tiểu thuyết MC xuyên vào) phải bị reframe là KẺ ĐẠO ĐỨC GIẢ — bề ngoài thiện lương, thực chất ích kỷ/độc ác/giả nhân. MC vạch trần qua chứng cớ + tình huống lộ chân tướng. Vả mặt nguyên chủ = dopamine chính.',
      'Pháo hôi / phản phái nguyên chủ MC nhập vai phải có CHIỀU SÂU TÂM LÝ — không phải ác thuần. Có lý do bị tổn thương, có ước nguyện không hoàn thành, có trauma. MC cứu vớt bằng tâm lý + hành động cụ thể.',
      'Hub Space (1-2 chương giữa 2 thế giới): MC tổng kết điểm, mua kỹ năng, gặp NPC hệ thống (hài hước hoặc bí ẩn), setup thế giới tiếp theo. Đây là nhịp "thở" cho reader + chỗ tích lũy power-up.',
      'Skill stacking: MC tích lũy kỹ năng từ thế giới trước (y thuật cổ đại + hacker hiện đại + chiến thuật mạt thế + ma pháp dị giới) — thế giới mới có advantage, nhưng KHÔNG được "Mary Sue vô địch". Mỗi thế giới có challenge riêng skill stacking không tự động giải.',
      'Tone tùy thế giới: thế giới đô thị (sảng văn business/trọng sinh), thế giới cổ đại (cung đấu mưu kế), thế giới mạt thế (sinh tồn căng thẳng), thế giới ngôn tình (slice-of-life ngọt sủng). MC adapt voice nhưng nội tâm professional + deadpan.',
      'Multi-POV thường xuyên: scene khí vận chi tử bày mưu (trước khi sụp đổ), scene nguyên chủ thật xác hồn (nếu hệ thống cho phép — bonus emotional), scene NPC quan sát MC out-play (vả mặt từ góc bên).',
    ],
  },
  'quy-tac-quai-dam': {
    authorVoice: 'Giọng văn lạnh, lâm sàng (clinical), pha kinh dị tâm lý. Nhịp chậm tạo Uncanny Valley — chi tiết bình thường lệch nhỏ làm rùng mình. KHÔNG jump scare.',
    narrativeStyle: 'first_person',
    toneKeywords: ['quy tắc', 'phó bản', 'quái dị', 'sinh tồn', 'suy luận', 'lạnh sống lưng'],
    avoidKeywords: ['pháp sư trừ tà cao tay', 'tu tiên đột phá', 'huyết chiến', 'thiên kiếp'],
    dialogueRatio: [20, 30],
    descriptionRatio: [35, 45],
    innerThoughtRatio: [30, 40],
    actionRatio: [3, 10],
    pacingStyle: 'slow',
    genreConventions: [
      // ── Bản chất thể loại ──
      'GHI CHÚ THỂ LOẠI 2024-2026: Quy Tắc Quái Đàm là "mỏ vàng" mới của TQ web novel. KHÁC biệt tuyệt đối với linh-di truyền thống: KHÔNG hầm mộ/nghĩa địa/pháp sư, mà là VĂN PHÒNG/TÀU ĐIỆN/SIÊU THỊ/BỆNH VIỆN bình thường biến dị. KHÔNG combat vật lý — MC dùng NÃO thắng quái vật bằng cách tuân thủ + suy luận quy tắc.',
      // ── Nhân vật mẫu ──
      'MC là người bình thường (nhân viên mới, sinh viên, lễ tân, ngỗ tác, thực tập sinh) — KHÔNG pháp sư/đạo trưởng/võ lâm cao thủ. MC sinh tồn bằng kiến thức + quan sát + IQ, KHÔNG bằng pháp lực/võ công.',
      'Bàn tay vàng MC THIÊN VỀ NÃO: (1) "Hệ thống nhắc nhở" — nhìn ra dòng chữ đỏ chỉ quy tắc giả; HOẶC (2) "Mô phỏng tử vong" — chết thử 3 lần trong đầu trước khi quyết định; HOẶC (3) "Lý trí tuyệt đối" — không cảm giác sợ, sinh vật quái dị không ô nhiễm tinh thần MC. CHỈ chọn 1 cheat — không stack.',
      'Quái vật vô địch về sức mạnh vật lý, KHÔNG thể đánh bại bằng vũ lực. MC CẤM tuyệt đối đánh tay đôi, CẤM cầm vũ khí "diệt ma" kiểu pháp sư. Thắng = né được + tuân thủ đúng + lừa quái vào bẫy quy tắc của chính nó.',
      'NPC nạn nhân (đồng nghiệp/hành khách/khách hàng) thường chết để DẠY độc giả luật chơi. ≥1 NPC chết trong 5 chương đầu mỗi phó bản vì vi phạm quy tắc số 1. MC quan sát học hỏi, KHÔNG cứu được tất cả.',
      // ── Tiến trình cốt truyện ──
      'Mỗi PHÓ BẢN (dungeon) = 1 arc 20 chương theo cấu trúc 4 hồi: (Hồi 1: nhập cuộc + nhặt tờ quy tắc, ch.1-3) → (Hồi 2: thử nghiệm + chạm trán quái dị, ch.4-8) → (Hồi 3: xung đột + ô nhiễm tinh thần + quy tắc đá nhau, ch.9-15) → (Hồi 4: phá giải quy tắc cốt lõi + thoát + bonus, ch.16-20).',
      'Tờ quy tắc = trái tim mỗi phó bản. 8-14 điều, viết trên giấy note / nội quy / sổ tay người tiền nhiệm / tin nhắn điện thoại. ≥1 điều CỐ TÌNH SAI (do tà thế lực gài bẫy) — MC phải suy luận qua quan sát chi tiết để phát hiện. Phá giải quy tắc giả = dopamine peak chính.',
      'Overarching mystery: ai tạo ra phó bản? Tại sao chọn MC? Có "Chủ Quái Đàm" hậu trường không? Mỗi 3-4 phó bản hé lộ 1 mảnh ghép. MC dần leo từ "người sống sót mới" → "kẻ phá đảo" → "kẻ nắm giữ quy tắc" → "Chủ Quái Đàm".',
      // ── Hệ thống sức mạnh ──
      'Sức mạnh đến từ: (1) thuộc lòng quy tắc của 5-10 phó bản đã qua → bù đắp lẫn nhau khi gặp phó bản mới; (2) đạo cụ quỷ dị (giấy bùa "vé giả" đi tàu ma, hộp quẹt cháy được dưới nước, chìa khoá mở cửa tầng 13); (3) "Mảnh vỡ quy tắc" — đổi lấy quyền chỉnh 1 dòng quy tắc.',
      'Đơn vị tăng trưởng MC: ĐIỂM SAN TRỊ (Sanity). Mỗi phó bản trừ 10-30 san trị. Hết san = MC trở thành 1 phần phó bản (NPC quái dị). Phục hồi san trị = thoát phó bản + nghỉ ngơi thế giới thực + ăn món bình thường (mì gói nóng, trà sữa, cơm mẹ nấu).',
      // ── Leo thang xung đột ──
      'Leo thang phó bản: D-Cấp (Văn phòng / cửa hàng tiện lợi, ≤10 quy tắc, 1 quái vật chính) → C-Cấp (chung cư / bệnh viện, 12-14 quy tắc, 2-3 quái vật) → B-Cấp (trường học khép kín, quy tắc đá nhau) → A-Cấp (toà nhà cổ thành phố, mạng lưới phó bản nối tiếp) → S-Cấp (vô đáp án, MC phải tự viết quy tắc).',
      'Crossover phó bản: từ ch.150+ MC bắt đầu gặp các "kẻ phá đảo" khác — đôi khi liên minh, đôi khi phản bội. Có "tổ chức Quái Đàm" giấu mặt theo dõi MC. Có thị trường ngầm trao đổi "mảnh vỡ quy tắc" + "đạo cụ quỷ dị".',
      // ── Phụ tuyến & hook ──
      'Atmospheric horror qua 5 giác quan: thính giác (tiếng quạt máy lệch nhịp, đồng hồ tích tắc 0.3s chậm), khứu giác (mùi formaldehyde xen mùi nước hoa, mùi thức ăn cũ), thị giác (đèn neon flicker, gương phản chiếu chậm), xúc giác (tay nắm cửa lạnh bất thường, ghế ấm như vừa có ai ngồi), vị giác (cà phê có vị kim loại). KHÔNG dùng "máu", "xương", "ngôi mộ".',
      'Mô tả Uncanny Valley = chìa khoá: KHÔNG bịa quái vật rồng/yêu, mà miêu tả NGƯỜI BÌNH THƯỜNG sai 1 chi tiết (đồng nghiệp có 6 ngón, không chớp mắt, răng đều quá, bóng đứng yên khi người di chuyển). Đáng sợ vì GẦN GIỐNG.',
      'Mỗi phó bản lưu lại trong MC 1 "vết tích" — ám ảnh nhỏ ngoài đời (sợ đèn neon, không bao giờ ăn ramen sau 3h sáng, đếm ngón tay người lạ). Tích lũy vết tích = MC ngày càng giống "Chủ Quái Đàm". Internal conflict.',
      // ── Exposition thông minh ──
      'Quy tắc + manh mối lộ qua: tờ giấy tìm thấy, sổ tay người tiền nhiệm, đoạn camera CCTV xem được, lời kể NPC ranh giới (lao công 20 năm, chú gác cổng già). KHÔNG info-dump. KHÔNG có "sư phụ" giảng giải.',
      // ── Multi-POV ──
      'Đa góc nhìn: scene đồng nghiệp/khách hàng/hành khách bị quy tắc xử tử (POV nạn nhân — kinh hoàng), scene "kẻ phá đảo" cấp cao quan sát MC từ xa (POV ally bí ẩn — tạo nghi ngờ), scene Chủ Quái Đàm hậu trường (POV antagonist — cảm giác bị theo dõi).',
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
      'WARM BASELINE OPENING (BẮT BUỘC — TQ trend 2024-2026 "稳健流/暖开局"): MC mở chương ở trạng thái CÓ functional baseline rồi — đã có shop/studio/squad/skill/golden finger ĐANG VẬN HÀNH, KHÔNG phải rock bottom. MC đang LÀM CHỦ domain nhỏ của mình ngay trang 1.',
      'MC trong domain CỦA MÌNH = competence-leader (vô địch trong phạm vi nhỏ): chủ quán net biết mọi PC, dev biết mọi engine, lãnh chúa biết mọi thuộc hạ. Thiếu chỉ là quy mô (small ops), KHÔNG phải competence.',
      'FIRST WOW BY SCENE 2 (BẮT BUỘC — retain reader): Scene 2 PHẢI có dopamine event đầu tiên — small face-slap (1 customer khinh thường → MC giải quyết → choáng), casual competence shock (MC fix vấn đề người thường thấy khó), smooth opportunity grabbed (deal nhỏ ký nhanh), hoặc recognition (1 nhân vật uy tín nhận ra MC). KHÔNG để reader đọc 50% chương 1 mới có payoff.',
      'BIG WOW AT SCENE 4-5: Scene cuối chương 1 PHẢI có wow lớn hơn small wow scene 2 — milestone đạt được rõ (deal lớn ký, đối thủ uy tín bị nghiền, recognition mass-witnessed).',
      'Hook chương 1 = OPPORTUNITY-driven, KHÔNG threat-driven: 1 customer giàu bước vào, 1 deal hiện ra, 1 manh mối lộ ra, 1 lựa chọn xuất hiện — KHÔNG phải "MC bị đánh / mất việc / hết tiền / sắp chết".',
      'Mục tiêu rõ ràng của MC (mở rộng quy mô, chốt deal, cứu một người cụ thể, dùng cơ hội mới hé lộ)',
      'Demo competence/golden finger ngay scene 1-2: MC quan sát/thao tác đúng kiểu chuyên gia, bystander react với expertise đó.',
      'Giới thiệu thiết lập thế giới qua HÀNH ĐỘNG (MC vận hành, customer hỏi, deal đến) — KHÔNG dump exposition',
    ],
    avoid: [
      'Mở đầu chậm, lan man',
      'Worldbuilding dump',
      'MC thụ động không làm gì',
      'ROCK-BOTTOM OPENING (CẤM TUYỆT ĐỐI): MC nghèo đói + bị đuổi việc + bị đánh + bị bỏ + nợ ngập đầu + ngất xỉu + mất trí nhớ + khóc lóc tủi thân → đây là "凄惨开局" TQ đã chán từ 2022',
      'Pre-action backstory dump: dành >150 từ đầu kể past suffering của MC trước khi vào action — TUYỆT ĐỐI CẤM',
      'MC vừa xuyên không "không biết gì", "chưa có gì", "phải tự lực từ con số 0" — modern trend là MC arrive WITH golden finger ACTIVATED + tools in hand',
    ],
  },
  chapter2: {
    mustHave: [
      'BIG WOW MOMENT (BẮT BUỘC): Chương 2 PHẢI có ≥1 face-slap mass-witnessed HOẶC deal lớn ký kết HOẶC competence shock đỉnh — bystander kinh ngạc rõ rệt. Reader phải có "khoảnh khắc hooked" trong chương 2.',
      'EARLY WOW IN-CHAPTER: First dopamine peak ≤50% chương (small face-slap hoặc opportunity grabbed). KHÔNG để chương 2 toàn build-up.',
      'Thành quả nhân đôi từ chương 1 — MC unlock thêm 1 capability/network/resource visible.',
      'Nhân vật mới xuất hiện thông qua MC competence (1 nhân vật uy tín nghe đồn → tự tìm đến MC).',
      'Mini-conflict mức nhẹ (competitor noticed, supplier hỏi giá, customer khó tính) — MC giải quyết ngay TRONG chương, KHÔNG để dây dưa.',
      'Hook cho chapter tiếp.',
    ],
    avoid: ['Chỉ training/giải thích không hành động', 'Cốt truyện dậm chân', 'Đột ngột chuyển sang dark tone (giang hồ/bạo lực/villain dập)', 'Setup-only chương — phải có payoff trong cùng chương'],
  },
  chapter3: {
    mustHave: [
      'DEFINING WOW MOMENT: Chương 3 PHẢI có moment "đóng đinh" — face-slap quy mô lớn hơn ch.2 / deal khủng / recognition tầm city-level / breakthrough cảnh giới rõ. Đây là chương "quyết định reader có theo truyện không".',
      'EARLY DOPAMINE: First peak ≤40% chương (sớm hơn ch.1-2 vì reader đã hooked).',
      'Growth visible (revenue tăng X-lần, quy mô +1 cấp, network mở rộng, capability mới).',
      'Hint về plot/quy mô thế giới lớn hơn (tập đoàn lớn để ý / quan chức ghé / nhân vật quan trọng nghe đồn).',
      'Reader bị hook bằng OPPORTUNITY (deal lớn sắp đến / nhân vật quan trọng sẽ tìm MC) chứ KHÔNG phải THREAT.',
    ],
    avoid: ['Giải quyết quá dễ dàng (cần show MC khéo léo, không phải GF deus ex machina)', 'Không stakes/hậu quả', 'Ép villain hard-conflict ngay khi MC mới có 2-3 chương baseline', '"Kìm nén" — full setup không payoff'],
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
  // Yếu tố BẮT BUỘC mỗi chương — SẢNG VĂN MÌ-ĂN-LIỀN (snappy delivery)
  perChapter: [
    'MICRO-HOOK + EARLY WOW: ≥1 micro-hook trong 500 từ đầu, VÀ first dopamine peak (small face-slap, casual competence shock, recognition, smooth opportunity unlock) PHẢI xuất hiện trong scene 1-2 (≤50% chương). CẤM để reader chờ payoff đến scene cuối.',
    'DOPAMINE PEAKS: Mỗi chương PHẢI có ≥2 dopamine moments rõ rệt — không phải "1 hint cuối chương". Phân bố: 1 small wow ở 30-50% chương + 1 bigger wow ở 70-90% chương. Mì-ăn-liền pacing.',
    'PAYOFF DOMINANT: Setup beats ≤30% nội dung chương. Payoff/win/recognition/face-slap chiếm ≥40%. CẤM "kìm nén" pattern (3+ setup beats không kèm payoff trong cùng chương).',
    'Ending hợp lý — 4 loại ending hợp lệ:',
    '  • Plot cliffhanger (~1/3 chương): tình huống nguy hiểm/bất ngờ — cho chương climax/villain_focus/revelation',
    '  • Reveal/seed ending: hé lộ thông tin lớn (face-slap victim choáng váng, deal lớn ký kết, milestone đạt được) — DOPAMINE-positive ending',
    '  • Triumph/payoff ending: chương kết thúc bằng MC vừa thắng/thu hoạch/recognition đỉnh — KHÔNG cliffhanger nguy hiểm nhưng vẫn hấp dẫn vì reader muốn xem MC tận hưởng',
    '  • Emotional/comfort ending: cho aftermath/breathing — đóng note ấm áp',
    'CẤM dùng cliffhanger nguy hiểm 3 chương liên tiếp — cliffhanger fatigue.',
    'CẤM 1 chương full-setup với 0 payoff (ALL build-up, 0 victory) — đây là "kìm nén" pattern reader bỏ truyện. Setup + payoff PHẢI nằm CÙNG chương.',
    'Worldbuilding qua action/cảm xúc, KHÔNG info-dump.',
    'Emotional contrast: cảm xúc phải thay đổi ít nhất 1 lần.',
  ],

  // Yếu tố BẮT BUỘC mỗi 5 chương — DOPAMINE FLOOR (Sảng Văn cadence cao)
  per5Chapters: [
    'BIG WOW MOMENT: ≥1 big face-slap (đối thủ choáng váng) HOẶC milestone lớn (deal ký, breakthrough, network mở rộng, recognition mass-scale). KHÔNG được skip 5 chương không có wow lớn.',
    'SMALL WOW CADENCE: ≥3 small wow moments rải đều (recognition cá nhân, casual competence shock, smooth opportunity grabbed, harvest). Cadence dày — mì-ăn-liền retain reader.',
    'MC tiến bộ rõ ràng (sức mạnh, địa vị, doanh thu, network) — visible progress mỗi 5 chương.',
    'Ít nhất 1 face-slap/power reveal/business win mass-witnessed (≥3 bystanders chứng kiến + react). Solo win không tính.',
    'CẤM TUYỆT ĐỐI 2 GIAI ĐOẠN ngược liên tiếp không có breathing ở giữa.',
    'Giới thiệu ít nhất 1 yếu tố mới (nhân vật, địa danh, kỹ thuật, opportunity).',
    'Ít nhất 1 hint/foreshadowing cho plot lớn hơn.',
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
      name: 'Công Thức Tát Mặt (Sảng Văn dopamine engine)',
      description: 'PROACTIVE (ưu tiên cho do-thi/quan-truong/kinh-doanh): MC hành động → đạt kết quả → đối thủ kinh ngạc → cố phản kháng nhưng quá muộn → câm lặng nể phục. REACTIVE (cho fantasy/wuxia): kẻ thù coi thường → MC ẩn nhẫn → kẻ thù ra tay → MC nghiền nát → bàng quan kinh ngạc. ĐÂY LÀ DOPAMINE EVENT, KHÔNG phải adversity event — MC KHÔNG thực sự khổ, đối thủ chỉ là bystander để contrast competence.',
      frequency: 'BẮT BUỘC cadence cao: ≥1 small face-slap mỗi 1-2 chương (bystander shock cá nhân, đối thủ kinh ngạc nhỏ) + ≥1 big face-slap mỗi 5 chương (mass-witnessed, đối thủ uy tín bị nghiền). Đây là Sảng Văn engine retain reader — KHÔNG bị xếp vào "adversity" hay "tự ngược" vì MC không hề khổ. Đối thủ trong face-slap có thể là customer khinh thường, supplier ép giá, đối thủ kinh doanh phỏng vấn cùng MC, fan ghen tị — KHÔNG bắt buộc villain hardcore.',
      escalation: 'Mỗi 5 chương face-slap quy mô tăng: chương 1-5 cá nhân (1 bystander shock) → chương 5-10 nhóm (table/team shock) → chương 10-15 mass (cộng đồng/báo chí biết) → chương 15+ nationwide. Truyện kinh doanh leo thang qua scale doanh nghiệp + reputation, KHÔNG cần combat.',
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
    description: 'SẢNG VĂN MÌ-ĂN-LIỀN: MC ít khổ + dopamine cadence CAO. Conflict (MC suffer) ít, NHƯNG face-slap/recognition/milestone (dopamine events, MC không khổ) DÀY ĐẶC. KHÔNG nhầm 2 thứ — face-slap KHÔNG phải adversity, đó là dopamine.',
    idealRatio: '10% chương MC thực sự suffer → 90% chương dopamine flow (smooth wins / face-slap / milestone / recognition / breakthrough). Trong 90% dopamine flow, mỗi chương PHẢI có 2-3 dopamine peaks rải đều.',
    hardRules: [
      'DOPAMINE CADENCE FLOOR: ≥2 dopamine peaks mỗi chương (small face-slap / casual competence shock / recognition / smooth opportunity / harvest / breakthrough). First peak ≤50% chương — KHÔNG để reader đợi đến cuối.',
      'BIG WOW FLOOR: ≥1 big wow moment mỗi 3-5 chương (deal lớn ký, big face-slap mass-witnessed, milestone đỉnh, breakthrough cảnh giới). KHÔNG để 5 chương trôi qua mà không có wow lớn.',
      'CẤM "kìm nén" pattern: chương full-setup không có payoff trong cùng chương → REWRITE. Setup beats và payoff PHẢI nằm CÙNG chương (ngoại trừ multi-chapter event natural span).',
      'TƯ DUY THEO GIAI ĐOẠN: 1 sự kiện adversity (MC bị truy sát, đối đầu villain, gặp tai nạn) có thể trải 1-3 chương — diễn biến tự nhiên. Adversity event hiếm — chỉ ~10% chapters.',
      'CẤM 2 GIAI ĐOẠN adversity liên tiếp KHÔNG breathing ở giữa.',
      'Mỗi GIAI ĐOẠN adversity resolve trong tối đa 2-3 chương cho non-combat genres / 3-5 chương cho combat genres. KHÔNG kéo dài lê thê.',
      'Mỗi arc ≥60% chương Sảng Văn flow — face-slap stream + casual competence + recognition + milestone progression. Face-slap KHÔNG bị xếp vào adversity ratio.',
    ],
    antiPattern: '(1) TỰ NGƯỢC — chuỗi adversity liên tiếp; (2) KÌM NÉN — chương full-setup không payoff; (3) DOPAMINE THIẾU — chương trôi qua không có face-slap/milestone/recognition. Cả 3 đều khiến reader bỏ truyện.',
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
      // Quy-tac-quai-dam: phó bản 20-chương đóng → mỗi sự kiện căng tối đa 4 chương trong 1 hồi, BẮT BUỘC ≥1 chương breathing giữa 2 hồi để san trị MC hồi phục
      'quy-tac-quai-dam': { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      // Ngự Thú: combat pet vs pet, mỗi giải đấu/raid 3-5 chương căng, breathing 1-2 chương sau
      'ngu-thu-tien-hoa': { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      // Khoái Xuyên: thế giới mới reset modular, mỗi sự kiện trong thế giới căng tối đa 4 chương
      'khoai-xuyen':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
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
      'Mỗi power-up CẦN lý do rõ ràng (milestone đạt được, insight, tài nguyên, đồng đội hỗ trợ). "Cái giá phải trả" là TÙY CHỌN — Sảng Văn cho phép MC earn power-up qua intelligence/timing mà KHÔNG cần sacrifice/wound. CẤM ép MC bị thương/tốn tài nguyên nặng để "cân bằng" mỗi lần mạnh lên.',
      'Kẻ thù/trở ngại CÓ THỂ leo thang HOẶC MC chọn target dễ hơn / outmaneuver bằng kế. Áp lực KHÔNG phải nguồn engagement duy nhất — Sảng Văn lấy engagement từ stream of victories, recognition, scale-up.',
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
  'quy-tac-quai-dam': ['Đừng Trả Lời Sau 3h Sáng', 'Tầng 13 Không Tồn Tại', 'Quy Tắc Số 7 Là Giả', 'Đồng Nghiệp Có 6 Ngón', 'Phòng 444 Không Bao Giờ Trống', 'Áo Mưa Đỏ Sau 2h'],
  'ngu-thu-tien-hoa': ['Slime Của Ta Nuốt Cả Rồng', 'Phế Vật Tiến Hóa Thành Thần', 'Đột Biến Cấp SSS!', 'Ngươi Khinh Con Cáo Của Ta?', 'Hệ Thống Đột Biến Vô Địch', 'Vạn Linh Đồ Thượng Cổ'],
  'khoai-xuyen': ['Pháo Hôi Phản Công', 'Ta Là Phản Diện Cứu Thế', 'Hệ Thống Lại Phái Ta Đi Cứu', 'Nguyên Tác Đã Sụp Đổ', 'Khí Vận Chi Tử Chết Rồi', 'Đăng Xuất Trước Khi Yêu'],
};

/**
 * Genre-specific engagement items — supplement the generic ENGAGEMENT_CHECKLIST.perChapter
 * with items tailored to each genre's reader expectations.
 */
export const GENRE_ENGAGEMENT: Record<GenreType, string[]> = {
  'tien-hiep': [
    'Mỗi arc CÓ THỂ có vài khoảnh khắc face-slap HOẶC casual victory (recognition, smooth competence). KHÔNG ép cadence "mỗi 2-3 chương 1 face-slap" — Sảng Văn cho phép chuỗi small wins liên tiếp không cần adversity setup.',
    'Tu luyện phải có chi tiết cụ thể (cảm giác thể xác, biến hóa linh khí) — KHÔNG chỉ nói "đột phá"',
    'Đan dược/pháp khí phải có tên riêng và hiệu quả rõ ràng',
  ],
  'huyen-huyen': [
    'Hệ thống sức mạnh phải có quy tắc rõ ràng — người đọc phải hiểu MC mạnh cỡ nào so với kẻ thù',
    'Mỗi arc phải mở rộng thế giới (tầng mới, vùng đất mới, cảnh giới mới)',
    'Cơ duyên ƯU TIÊN compound advantage (MC earn nhiều, mất ít). Giá phải trả TÙY CHỌN — Sảng Văn cho phép "free lunch" khi MC may mắn/destined/timing đúng. CẤM ép sacrifice cho mỗi cơ duyên.',
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
    '≥1 "thao tác thần thánh" (exploit system, PvP outplay, hidden quest) per arc — KHÔNG ép cadence cứng. Sảng Văn cho phép arc full smooth grinding/farming nếu pacing yêu cầu.',
    'Players phải có hành vi giống game thật (trade, PK, guild drama)',
  ],
  'kiem-hiep': [
    'Chiêu thức kiếm pháp phải có tên và mô tả cảm quan (không chỉ "vung kiếm")',
    'Giang hồ phải có quy tắc (nghĩa khí, thù hận, tôn ti bang phái)',
    '≥1 đại hội/tỷ thí hoặc ân oán giang hồ trong 2-3 arcs — KHÔNG bắt buộc mỗi arc. Breathing arc (luyện công, kết giao, du lịch giang hồ) hoàn toàn hợp lệ.',
  ],
  'mat-the': [
    'Sinh tồn phải có chi tiết cụ thể (tìm nước, xây trại, chế tạo vũ khí)',
    'Đe dọa mới (dị thú, thiên tai, phe phái thù địch) đến KHI world state escalate tự nhiên — KHÔNG ép cadence cứng. MC có thể có chuỗi chương khám phá/build base / tích trữ tài nguyên không gặp threat mới.',
    'Base building phải có tiến triển rõ ràng qua từng arc',
  ],
  'linh-di': [
    'Horror phải có atmosphere — miêu tả 5 giác quan, đặc biệt thính giác và xúc giác',
    'Bí ẩn phải có manh mối hợp lý — người đọc có thể đoán nếu chú ý',
    '≥1 revelation/plot twist mỗi 2-3 arcs (KHÔNG bắt buộc "kinh hoàng" — có thể là hé lộ thân thế, lý do hành động kẻ thù, mảnh ghép quá khứ). Breathing arc cho phép MC củng cố sức mạnh / quan hệ không cần twist.',
  ],
  'quan-truong': [
    'Quan hệ quyền lực phải rõ ràng (ai bảo kê ai, phe phái nào chống phe nào)',
    '≥1 mưu kế chính trị hoàn chỉnh per arc (KHÔNG ép mỗi 5 chương). Cho phép arc thuần "ngồi ghế cao quan sát" hoặc "thu lợi từ mưu kế trước đó vận hành" mà không cần mưu kế mới.',
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
  'quy-tac-quai-dam': [
    'Mỗi PHÓ BẢN = 1 arc 20 chương theo cấu trúc 4 hồi (5+5+7+3). KHÔNG nén phó bản dưới 15 chương — sẽ mất Hồi 3 căng thẳng. KHÔNG kéo trên 25 chương — reader bão hoà.',
    'Tờ quy tắc đầu tiên xuất hiện CHẬM NHẤT chương 2. Quy tắc giả ≥1 nhưng ≤2 trong mỗi bộ. Phá giải quy tắc giả = dopamine peak BẮT BUỘC ở Hồi 3-4.',
    '≥1 NPC chết vì vi phạm quy tắc trong 5 chương đầu mỗi phó bản — DẠY độc giả luật chơi. NHƯNG: NPC đó phải có tên + 1-2 dòng tính cách trước khi chết, để cái chết có trọng lượng.',
    'Quái vật KHÔNG bao giờ bị MC đánh chết bằng vũ lực. Chiến thắng = tuân thủ đúng + né + lừa quái vật vi phạm chính quy tắc của nó. Nếu Critic phát hiện MC vung dao/súng/bùa giết quái → REWRITE.',
    'San trị MC tracking: mỗi quy tắc vi phạm hoặc gặp Uncanny event nặng = -5 đến -15 san trị. Hồi phục = scene đời thường ngoài phó bản (mì gói nóng, tin nhắn mẹ, ngủ trưa). KHÔNG bỏ qua resource economy này.',
    'Atmospheric horror qua chi tiết Uncanny Valley nhỏ (đèn neon flicker, đồng hồ chậm 0.3s, đồng nghiệp 6 ngón). KHÔNG dùng máu/xương/quan tài/nghĩa địa cliché.',
  ],
  'ngu-thu-tien-hoa': [
    'Mỗi giải đấu / cuộc săn / boss raid = mini-arc 3-15 chương: setup + thực chiến + loot + harvest. Combat = pet vs pet, KHÔNG MC vs đối thủ tay đôi.',
    'Mỗi pet phải có DATA RÕ RÀNG xuyên truyện: tên, cấp, skill gốc + đột biến tiềm năng, công thức tiến hóa (3-5 nguyên liệu), tính cách. KHÔNG quên skill / KHÔNG nâng cấp tự phát.',
    'Đột biến skill theo 3 quy tắc: khuếch đại số/phạm vi, xoá cooldown/cost, bẻ cong logic. Mô tả CỤ THỂ skill cũ vs skill mới + phản ứng đối thủ "không thể tin" — đây là dopamine peak chính.',
    '≥1 face-slap / casual competence / collection moment per chapter (đồng cấp với Sảng văn cadence). Pet "phế vật" thực chiến đè bẹp pet "huyết mạch quý" của đối thủ.',
    'NPC reactions ≥30% chương: bạn cùng lớp ngạc nhiên, đối thủ tài phiệt sụp đổ, thầy giáo nhìn ra giấu nghề, fan girl cuồng nhiệt. KHÔNG bỏ qua "phản ứng đám đông".',
    'Pet có nhân cách rõ + arc cảm xúc riêng. Tránh "công cụ chiến đấu" thuần. Ít nhất 1 pet mỗi 50 chương có moment cảm xúc với MC (pet hi sinh, pet trưởng thành, pet biết ơn).',
  ],
  'khoai-xuyen': [
    'Mỗi thế giới = arc 30-50 chương đóng. Hồi 1 (5-7ch): đồng bộ kịch bản gốc + nhận task + làm quen thân phận. Hồi 2 (12-15ch): lật ngược thiết lập + rời nguyên kịch bản. Hồi 3 (12-15ch): phá vỡ kịch bản + vả mặt khí vận chi tử. Hồi 4 (5-10ch): hoàn thành KPI + thu hoạch + đăng xuất.',
    'Khí vận chi tử (nguyên chủ chính của tiểu thuyết MC xuyên vào) phải bị vạch trần là KẺ ĐẠO ĐỨC GIẢ qua chứng cớ + tình huống cụ thể. KHÔNG được "ác hiển nhiên từ đầu" — phải reveal qua arc.',
    'Pháp hôi / phản phái MC nhập vai phải có CHIỀU SÂU + lý do bị tổn thương. KHÔNG phải "phế vật ngu ngốc". Cứu vớt = chữa lành tâm lý + thay đổi quyết định bi thảm cụ thể.',
    'Hub Space giữa 2 thế giới: 1-2 chương "thở", tổng kết điểm + mua kỹ năng + setup thế giới tiếp theo. KHÔNG bỏ qua — đây là nhịp engine của thể loại.',
    'Skill stacking = MC senior level: tích lũy y thuật cổ đại + hacker hiện đại + chiến thuật mạt thế. Nhưng MỖI thế giới có challenge mới skill cũ không tự giải. KHÔNG để Mary Sue.',
    'Tone tùy thế giới: đô thị (sảng văn business), cổ đại (cung đấu mưu kế), mạt thế (sinh tồn căng), ngôn tình (slice-of-life ngọt). MC adapt voice nhưng nội tâm nhất quán deadpan + professional.',
  ],
};

/**
 * AI-cliché blacklist Vietnamese-specific (mùi convert thô + mùi AI).
 * Tier 1 (HARD CAP = 0): các cụm reader-VN ghét tuyệt đối, Critic auto-rewrite nếu phát hiện.
 * Tier 2 (CAP ≤2/chương): cho phép hạn chế.
 */
export const AI_CLICHE_BLACKLIST_HARD: string[] = [
  'khẽ nhếch mép', 'khóe miệng nhếch lên một nụ cười', 'không khỏi',
  'chỉ thấy', 'không nói nên lời', 'ánh mắt phức tạp',
  'trong lòng thầm nghĩ', 'không thể tin nổi', 'khẽ thở dài một hơi',
  'cảm giác như có một dòng điện chạy qua', 'một cảm giác lạ lùng',
];
export const AI_CLICHE_BLACKLIST_SOFT: string[] = [
  'đột nhiên', 'hít một ngụm khí lạnh', 'dường như', 'như thể',
  'khẽ', 'một cái',
];

/**
 * Vietnamese pronoun whitelist per genre cluster.
 * Forces appropriate pronouns: hắn/y/lão/nàng for cổ trang, anh/cô for hiện đại.
 */
export const VN_PRONOUN_GUIDE: Record<string, string> = {
  'tien-hiep': 'hắn (MC + nam đồng cấp), y (nam đối thủ), lão (cao niên), nàng (nữ MC/nữ chính), gã (nam phản diện khinh miệt), bà (nữ cao niên). CẤM "anh ta", "cô ta".',
  'huyen-huyen': 'hắn / y / lão / nàng / gã / bà. CẤM "anh ta", "cô ta".',
  'kiem-hiep': 'hắn / y / lão / nàng / gã / bà / hảo hán / đại hiệp. CẤM "anh ta".',
  'do-thi': 'anh / cô / chị / em / chú / bác (HIỆN ĐẠI). DÙNG "anh/cô" cho MC + người trẻ; "chú/bác" cho người lớn tuổi. CẤM "hắn/nàng/y" (cổ trang).',
  'ngon-tinh': 'anh / cô / chị / em (HIỆN ĐẠI tổng tài) HOẶC hắn / nàng (cổ trang ngôn tình tùy bối cảnh). KHÔNG mix 2 hệ.',
  'quy-tac-quai-dam': 'tôi / anh / cô / em / chú / bác (HIỆN ĐẠI). Default first-person "tôi" cho MC. CẤM "hắn / nàng / y / lão" (cổ trang). NPC quái dị xưng hô bình thường nhưng SAI 1 chi tiết (gọi tên MC khi MC chưa giới thiệu, dùng kính ngữ kiểu cũ trong văn phòng hiện đại).',
  'ngu-thu-tien-hoa': 'hắn / nàng / y / lão / sư phụ (cổ trang ngự thú); hoặc anh / cô / em / thầy (hiện đại học viện). CHỌN 1 hệ theo bối cảnh topic. Pet luôn xưng hô qua tên riêng + tiếng kêu/biểu cảm.',
  'khoai-xuyen': 'TÙY THẾ GIỚI: thế giới hiện đại đô thị → anh/cô/em/chú/bác; thế giới cổ đại cung đấu → hắn/nàng/y/lão/bệ hạ/công công; thế giới mạt thế → cô/em/đồng đội; thế giới ngôn tình → anh/cô. MC giữ first-person "ta/tôi" trong nội tâm xuyên suốt mọi thế giới (giọng senior nhất quán).',
  'quan-truong': 'anh / cô / chú / bác / đồng chí / lãnh đạo (HIỆN ĐẠI). CẤM "hắn/nàng/y".',
  'lich-su': 'hắn / y / lão / nàng / gã / bệ hạ / công công / nương nương / vương / hầu (theo cấp bậc).',
  'mat-the': 'hắn / cô / em (post-apocalypse mix) — choose by character age + tone.',
  'linh-di': 'hắn / cô / anh / em (hiện đại horror) — flexible.',
  'di-gioi': 'hắn / nàng / lãnh chúa / chủ nhân (tuỳ vai vế trong dị giới).',
  'khoa-huyen': 'anh / cô / hắn / nàng (sci-fi mix). Default modern: "anh/cô"; future-far: "hắn/nàng".',
  'vong-du': 'anh / cô / em / hắn (game mix) — modern player default "anh/cô".',
  'dong-nhan': 'theo nguyên tác. Tu tiên: hắn/nàng/y; modern fanfic: anh/cô.',
};

/**
 * Sub-genre specific patterns (when sub_genres array contains these tags).
 */
export const SUB_GENRE_RULES: Record<string, string[]> = {
  'trong-sinh': [
    'TRỌNG SINH PATTERNS:',
    '  • Memory triggers (mỗi 1-2 chương 1 lần, max): smell / replayed scene / reappearing person / date / overheard phrase → 1-2 câu flashback, KHÔNG paragraph dump.',
    '  • Reader-knows-MC-knows: MC nhìn thấy người/sự kiện → reader cảm nhận MC biết trước nhưng không cần explain hết.',
    '  • Avoid overpowered cliché: MC không phải biết MỌI THỨ tương lai — chỉ key events. Nhiều chi tiết MC vẫn phải thử + sai.',
    '  • Causality cost: mỗi action MC dựa trên future memory phải có rủi ro hoặc chi phí (đầu tư có thể fail vì MC làm thị trường thay đổi).',
    '  • Callback to old life: ≥1 lần/arc nhắc đến kiếp trước (regret, gratitude, lesson learned).',
  ],
  'kinh-doanh': [
    'KINH DOANH PATTERNS:',
    '  • Concrete numbers: doanh thu / vốn / market share / nhân sự — DÙNG SỐ CỤ THỂ, không "rất nhiều", "vô số".',
    '  • Realistic timeline: khởi nghiệp → có deal đầu → break-even → scale — KHÔNG skip giai đoạn.',
    '  • Competitor as REACTIVE: đối thủ phản ứng SAU khi MC act, KHÔNG xuất hiện proactive đe dọa.',
    '  • Meeting/negotiation scenes: dialogue-heavy, có subtext (mỗi bên có agenda riêng).',
    '  • Resource tracking: tiền đã chi / còn → consistent với chương trước.',
  ],
  'cung-dau': [
    'CUNG ĐẤU PATTERNS:',
    '  • Mưu kế đa lớp: mỗi lần ra tay phải có ≥2 lớp ý định.',
    '  • Phụ nữ vs phụ nữ chính trị: rivals trong cung không nhất thiết evil — có lý do hợp lý.',
    '  • Chi tiết lễ nghi cụ thể (xưng hô, hành lễ, áo quần) — không generic.',
  ],
  'gia-toc': [
    'GIA TỘC PATTERNS (CLAN-GROWTH FOCUS, KHÔNG external-danger constant):',
    '  • Multi-gen narrative: MC chết giữa truyện (arc 3), hậu duệ kế tục — reader đầu tư vào DÒNG GIA TỘC, không chỉ MC.',
    '  • POV handoff: arc 3 chuyển POV sang em gái / con MC / đệ tử thân tín; mỗi thế hệ mới có thử thách tương ứng.',
    '  • 70% growth/diplomacy/family + 30% combat — combat có resolution rõ trong 3-5 chương, KHÔNG liên tục.',
    '  • Resource management = gameplay loop chính: linh thạch / linh điền / pháp khí / đan dược / đệ tử như nation-state inventory.',
    '  • Sàng lọc đệ tử qua tools (gương ancestor, linh kiểm, ngọc bội) — INFRASTRUCTURE, không power buff.',
    '  • Inter-clan diplomacy > combat: liên minh, hôn nhân chính trị, thương mại với gia tộc khác.',
    '  • Internal politics: succession dispute, nhánh tranh đoạt, hôn nhân thông gia — drama nguồn chính.',
    '  • Disciples/elders combat từ POV họ — MC orchestrate, KHÔNG personally fight.',
    '  • MC = orchestrator (resource + people + decisions), KHÔNG personally combat constant.',
    '  • Crisis arcs structured: resource crisis / succession crisis / inheritance discoveries / disaster management — KHÔNG cứ external attack.',
    '  • Cultivation breakthroughs as community celebrations (đệ tử kết Trúc cơ → cả tộc tụ tập).',
    '  • Trách nhiệm > tham vọng cá nhân: MC quyết định dựa trên gia tộc trước, không lone wolf.',
    '  • Top examples: 《玄鉴仙族》(Qidian 2024), 《青莲之巅》, 《修仙从沙漠开始》',
  ],
  'isekai-trade': [
    'ISEKAI TRADE PATTERNS (chư thiên giao dịch / dị giới mở shop):',
    '  • MC luôn ở vai vendor/shop owner — KHÔNG bao giờ combat trực tiếp; combat chỉ xuất hiện qua lời customer kể lại sau khi dùng item',
    '  • Mỗi chương có ít nhất 1 customer dị giới đến shop — họ là hiệp sĩ/pháp sư/quý tộc/công chúa/yêu tộc, ăn mặc khác biệt rõ rệt với Earth',
    '  • Power transfer mechanic CỐ ĐỊNH: đồ tầm thường Earth = thần khí dị giới (paracetamol = thánh dược, đèn pin LED = pháp bảo quang minh, sách giáo khoa hoá = cấm thuật, mì gói = tiên phẩm, cồn 90 độ = nước thánh)',
    '  • MC physically yếu/bình thường — edge duy nhất là biết đồ Earth giá rẻ và arbitrage tỉ giá (linh thạch ↔ VND, ma tinh ↔ USD)',
    '  • Customer "report-back" scene là CỐT LÕI: customer quay lại chương sau kể họ dùng item ra sao, ai bị đánh bại, MC lắng nghe + ngạc nhiên hài hước (chiếm 30% chương)',
    '  • Comedy ratio 50-60%: fish-out-of-water reactions của customer khi gặp coca, kem đánh răng, máy sấy tóc — luôn over-react',
    '  • Cliffhanger NHẸ — kết chương bằng comfort beat (customer hài lòng đi về, MC đếm tiền, regular mới xuất hiện) thay vì tension cao',
    '  • Regular cast 4-6 customer cố định trở lại — mỗi người 1 dị giới khác (tu tiên / ma pháp / kiếm thánh / thần thoại Bắc Âu) — tạo cảm giác community',
    '  • MC tuyệt đối KHÔNG xuyên dị giới — shop là portal, MC ngồi yên một chỗ; customer là người di chuyển',
    '  • Currency arbitrage scene mỗi 3-5 chương: MC đổi linh thạch lấy vàng → mua hàng Earth → bán giá thần khí → reader sướng vì gradient lợi nhuận',
    '  • Anti-tropes: KHÔNG cho MC tự đi luyện tu, KHÔNG có harem dị giới ngủ với MC, KHÔNG cho MC "thật ra là chí tôn ẩn thân"',
    '  • MC archetypes: (1) sinh viên thất nghiệp kế thừa shop ông, (2) nhân viên văn phòng burnout phát hiện kho, (3) chủ tiệm tạp hoá già thừa kế cổ vật, (4) otaku NEET tỉnh dậy thấy cửa hàng, (5) freelancer dùng app giao dịch trên điện thoại',
    '  • Top examples: 《我在异界开网吧》, 《诸天交易家》, 《异界饭店》, 《我在异界倒卖现代货》',
  ],
  'cultural-carry': [
    'CULTURAL PRODUCT CARRY PATTERNS (mang văn hoá/sản phẩm Earth sang setting alien):',
    '  • MC = creator/curator/producer — KHÔNG combat; conflict là industry/market/critic, không phải vũ lực',
    '  • Earth content (phim Marvel, game Zelda, tiểu thuyết Kim Dung, nhạc Beatles, công thức KFC) trở thành "thiên đạo" — dân setting mới gọi MC là thiên tài',
    '  • Knowledge edge SPECIFIC: MC nhớ CHI TIẾT (cốt truyện Titanic shot-by-shot, công thức Coca, chord progression Hotel California) — không phải nhớ chung chung',
    '  • Recreation scene là cốt lõi: 1 chương = 1 phần work được tái hiện (script meeting / recording session / tasting / playtest) — show production process, không tóm tắt',
    '  • Audience reaction scene chiếm 30% chương: critic viết bài, fan khóc trong rạp, đối thủ shock — reader sướng qua phản ứng người khác',
    '  • Power transfer thông qua content: dân học leadership từ Three Kingdoms, kiếm thuật từ Star Wars, kinh doanh từ Wolf of Wall Street → grow nhờ MC content',
    '  • Industry battle pattern: competitor copy/đạo nhái → MC pivot tới next Earth IP → để competitor luôn 6 tháng sau lưng',
    '  • Cultural impact arc dài 30-50 chương: 1 sản phẩm MC định nghĩa cả thế hệ (game console, phim đầu kỷ, công thức fast food chain)',
    '  • Setting alien BUT modern-adjacent: thường là Hollywood thập niên 80, Hong Kong 90s, hoặc parallel world thiếu Earth IP — KHÔNG fantasy có ma pháp',
    '  • Tone variations CHỌN 1: (a) cozy creator (nhà hàng/nhạc sĩ), (b) pragmatic mogul (đạo diễn/CEO), (c) glamour celebrity (idol/diễn viên)',
    '  • Anti-tropes: KHÔNG để MC quên content (knowledge unlimited), KHÔNG có hệ thống tiến độ điểm thưởng, KHÔNG combat physical với rival',
    '  • Chapter ratio bắt buộc: 50% creative production + 30% audience/critic reactions + 20% business politics (đầu tư, kiện tụng, đối thủ)',
    '  • MC archetypes: (1) đạo diễn trẻ trọng sinh nhớ phim 30 năm, (2) nhạc sĩ thất bại tỉnh dậy parallel world, (3) game designer xuyên việt, (4) chef nhớ 1000 công thức, (5) writer nhớ tiểu thuyết bestseller',
    '  • Top examples: 《我可能是个假游戏制作人》, 《我有一座好莱坞》, 《重生之好莱坞大亨》, 《我在地球开公司》',
  ],
  'rebirth-niche': [
    'REBIRTH PROFESSIONAL NICHE PATTERNS (trọng sinh nghề nghiệp — knowledge edge thuần tuý):',
    '  • MC trọng sinh về mốc thời gian SPECIFIC: 1985 (Đổi Mới), 1990 (mở cửa), 1995, 2000, 2005, 2010 — ngày tháng cụ thể, KHÔNG chung chung',
    '  • Knowledge edge = SOLE advantage: KHÔNG hệ thống, KHÔNG signing-in, KHÔNG cheat siêu nhiên — chỉ là MC nhớ tương lai 20-40 năm',
    '  • Niche profession SPECIFIC với knowledge actionable: đạo diễn (nhớ phim hit + tech timing), ngư dân (mùa cá + thị trường xuất khẩu), đầu bếp (food trend + supply), chủ nhà máy (export window + automation), tavern owner (consumer trend)',
    '  • KHÔNG combat — conflict là market shift, đối thủ kinh doanh, gia đình mâu thuẫn, chính sách thay đổi (cải cách / WTO / COVID)',
    '  • Family-pillar core: gia đình (vợ/cha mẹ/em ruột) là motivation chính — mỗi 5-10 chương phải có family scene (bữa cơm, đi viện, cưới hỏi)',
    '  • Era detail RICH per chương: tên ca khúc đang hit (Bức Thư Tình Đầu Tiên 1995), giá vàng thực tế, tên thương hiệu (Honda Cub, Sony Walkman, Vinamilk), sự kiện chính trị/thể thao của năm đó',
    '  • Tone palette 40/40/20: 40% cozy nostalgic (era warmth) + 40% ambitious progression (business growing) + 20% family tension/warmth',
    '  • Slow-burn pacing: 1 business deal = 5-10 chương (negotiation / setup / execution / payoff), KHÔNG nhanh — reader đọc thư giãn',
    '  • Crisis arc structure rotate: (1) market shift (đối thủ tấn công), (2) family illness (cha mẹ bệnh nặng), (3) policy change (WTO/COVID/khủng hoảng), (4) personal scandal (vu khống/tin đồn) — mỗi 30-50 chương',
    '  • Diplomacy + outmaneuver thay combat: bargain với supplier, lobby quan chức, đàm phán M&A, PR crisis management',
    '  • Rebirth memory rules: MC nhớ MAJOR events (chính sách, phim hit, công nghệ) NHƯNG KHÔNG nhớ chi tiết nhỏ → tránh god-mode, để có khoảng cho butterfly effect',
    '  • Era-specific guidelines: 1980s (bao cấp → đổi mới, hàng hiếm), 1990s (mở cửa, hàng Trung tràn vào), 2000s (internet bùng nổ, dot-com), 2010s (smartphone, e-commerce)',
    '  • Anti-tropes: KHÔNG hệ thống điểm danh, KHÔNG xuyên việt với golden finger, KHÔNG MC biết võ công đánh nhau, KHÔNG harem (1 wife loyal)',
    '  • MC archetypes: (1) đạo diễn nổi tiếng tử nạn, trọng sinh 1990 lúc còn sinh viên FAMU, (2) ngư dân nghèo trọng sinh trước cơn bão lớn 1985, (3) đầu bếp Michelin trọng sinh 1995 quê nhà, (4) ông chủ phá sản trọng sinh 1988 với 100 nghìn vốn, (5) bác sĩ trọng sinh 1992 thời thiếu thuốc',
    '  • Top examples: 《重生之好莱坞大亨》, 《重生渔村之富甲天下》, 《重生之我是国宴大厨》, 《重生1980小酒馆》, 《重生之我成了厂长》',
  ],
  'dut-gay-lich-su': [
    'ĐỨT GÃY LỊCH SỬ PATTERNS (历史架空 — alternate history):',
    '  • MC trọng sinh / xuyên không về thời điểm lịch sử SPECIFIC (Tam Quốc, Tống mạt, Minh sơ, Thanh, WWII, Đại Việt Trần) với knowledge edge về tương lai',
    '  • REALISM ưu tiên: KHÔNG huyền bí, KHÔNG combat MC. MC là chiến lược gia / vua / học giả / quan / thương nhân',
    '  • Knowledge edge SPECIFIC: military tactics future, technology timeline (gunpowder/steam engine/electricity), economic policies, agricultural reforms',
    '  • Butterfly effect awareness: MC tránh thay đổi quá lớn gây timeline sụp; phải hiểu causality',
    '  • Realistic politics: triều đình intrigue, quan hệ vua-tôi, gia tộc đối lập, foreign envoys',
    '  • Era detail RICH: phong tục, lễ nghi, ngôn ngữ cổ, áo quần, ẩm thực, tiền tệ thật của era',
    '  • Conflict drivers: foreign invasion, civil war, court intrigue, corruption — MC navigate via wisdom + politics',
    '  • Time skip allowed: 1 chương = vài tháng/năm cho expansion arc; deep dive cho key event',
    '  • MC archetypes: (1) hiện đại trọng sinh thành hoàng tử thứ ba, (2) historian tỉnh dậy thành tướng quân, (3) sinh viên xuyên không thành thư sinh, (4) doanh nhân về làm thái thú phủ huyện',
    '  • Anti-tropes: KHÔNG huyền bí cheat, KHÔNG harem cung phi 100 người, KHÔNG MC tự tay đánh quân địch, KHÔNG knowledge unlimited (chỉ key events + tech)',
    '  • Top examples: 《晚明霸业》, 《唐砖》, 《大明1937》, 《抗日烽火之我是冷血悍将》, 《回到隋唐当土匪》',
  ],
  'toan-dan-sang-the': [
    'TOÀN DÂN SÁNG THẾ PATTERNS (全民创世 — universal genesis system):',
    '  • Cataclysm trigger: "Hệ Thống Sáng Thế" giáng xuống, mỗi người được cấp 1 "World Seed" để tạo thế giới riêng',
    '  • CORE GAMEPLAY: design + grow world (như SimCity nhưng cosmic scale) — civilizations rise/fall, technology evolve, magic emerge',
    '  • MC golden finger: world của MC phát triển nhanh hơn nhờ knowledge thật (lịch sử Earth, tiến hóa, văn minh)',
    '  • World battles: worlds compete cho cosmic resources, MC defends/expands',
    '  • World trade: MC trade resources/civilizations với world khác',
    '  • POV split: 50% MC orchestrate, 30% NPC trong world của MC (POV theo civilization rising), 20% real-world MC business',
    '  • Combat through CIVILIZATIONS — MC orchestrates, civilizations fight in worlds; MC vulnerable in real world',
    '  • Tone: epic + creator-pride + nostalgic (reader thấy lịch sử Earth tái hiện as MC design)',
    '  • Reference real history: ánh sáng Genesis, Big Bang, Stone Age, Bronze, Iron, Industrial — MC seed các milestone',
    '  • Anti-tropes: KHÔNG MC personally combat, KHÔNG harem (focus design), KHÔNG copy-paste 1 civilization (mỗi world phải unique)',
    '  • Top examples: 《全民创世》, 《我的世界副本》, 《诸天: 从盘古开天开始》',
  ],
  'viet-van-sang-the': [
    'VIẾT VĂN SÁNG THẾ PATTERNS (文创流 / 文笔造世 — literary genesis):',
    '  • CORE MECHANIC: MC viết tiểu thuyết, độc giả lên "Thiên Đạo Thư Viện" đọc → nội dung trở thành THẬT trong thế giới riêng',
    '  • Power transfer: dân các thế giới khác vào Thiên Đạo Thư Viện đọc tiểu thuyết MC → "nhập tâm" thì lĩnh ngộ chiêu thức / công pháp / vũ khí từ tiểu thuyết → mang ra thế giới họ chiến đấu',
    '  • MC = AUTHOR, KHÔNG combat. MC viết, readers fight với knowledge từ tiểu thuyết',
    '  • Knowledge edge: MC nhớ chi tiết các tác phẩm classic Earth — Tam Quốc Diễn Nghĩa, Tây Du Ký, Lord of the Rings, Harry Potter, One Piece, Naruto, Naruto, Sherlock Holmes, Star Wars',
    '  • Audience POV interludes: 30% chương "góc nhìn reader" — họ học leadership từ Tam Quốc, kiếm thuật từ Star Wars, magic từ Harry Potter, ninja jutsu từ Naruto → dùng thắng đối thủ',
    '  • Industry battle: tác giả khác cũng có Thiên Đạo Thư Viện access — cạnh tranh viết tiểu thuyết hay nhất',
    '  • Cultural impact arcs: tiểu thuyết MC định nghĩa 1 thời kỳ (Tam Quốc → era of war strategy, Harry Potter → magical school renaissance)',
    '  • Recreation scene là cốt lõi: 1 chương = 1 phần tác phẩm được viết (writing room / draft / publication / fan reactions)',
    '  • POV "reader inside book world" possible: occasionally show MC tiểu thuyết world thực hoá, nhân vật MC trong sách hành động',
    '  • Anti-tropes: KHÔNG MC combat, KHÔNG copy-paste plot tác phẩm gốc 100% (must adapt + Vietnamese angle), KHÔNG harem (single love interest editor/fellow author)',
    '  • MC archetypes: (1) sinh viên Văn khoa NEET đột nhiên có Thiên Đạo Thư Viện, (2) nhà văn flop trọng sinh, (3) freelancer ghostwriter phát hiện ability, (4) reviewer literary turn author',
    '  • Top examples: 《文娱: 我的偶像生涯》(parallel), 《我有一座洪荒书院》, 《我的书友是诸天大佬》',
  ],
  'sang-the-chu': [
    'SÁNG THẾ CHỦ PATTERNS (创世主流 — Genesis Lord, create world from spores):',
    '  • CORE: MC trở thành "Sáng Thế Chủ" — tạo thế giới từ bào tử nguyên thủy, observe + nudge evolution qua eons',
    '  • Mythological references: "Hãy có ánh sáng" (Genesis), Big Bang, Pangaea, Cambrian explosion, dinosaurs, mammals, sentient races',
    '  • TIME SCALE EPIC: 1 chương = vạn năm hoặc triệu năm; reader thấy civilization rise/fall',
    '  • MC = CREATOR/OBSERVER, KHÔNG personal combat. Civilizations trong world fight cho MC theo tín ngưỡng',
    '  • POV split: 60% MC outside world (creator perspective + cosmic politics) + 40% NPC theo civilization (POV the chosen one of each era)',
    '  • Variant: Thế giới của MC trở thành GAME ONLINE 100% realism — players from real Earth join, đạt năng lực thật từ game',
    '  • Players in world: real Earth gamers vào thế giới của MC, level up real skills, đem skill về Earth dùng thật',
    '  • Cosmic rivals: other Sáng Thế Chủ compete — wars between worlds via civilization proxy',
    '  • Religion + tín ngưỡng mechanics: NPC tín ngưỡng tăng MC power; MC ban miracles cho key NPCs',
    '  • Anti-tropes: KHÔNG MC suốt ngày trong world (thời gian skip), KHÔNG combat personal, KHÔNG harem in-world',
    '  • MC archetypes: (1) gamer hardcore tỉnh dậy thành Sáng Thế Chủ, (2) lập trình viên đột nhiên có world seed, (3) writer trọng sinh + Sáng Thế Chủ ability, (4) developer studio merged với Sáng Thế Chủ',
    '  • Top examples: 《我的微观世界》, 《诸界第一神》, 《我有一座创世神宫》, 《重生神级游戏制作人》',
  ],
  'game-kiem-tien': [
    'CHƠI GAME KIẾM TIỀN PATTERNS (网游打金赚钱 — game-to-cash):',
    '  • CORE: MC chơi MMORPG / game online, farm items / accounts → bán cho real money',
    '  • Knowledge edge: MC biết game meta tương lai (rebirth or insider info), biết item nào valuable, dungeon nào drop rare',
    '  • Pragmatic business through gaming: arbitrage, account flipping, gold farming, market manipulation',
    '  • Conflict: gold farmer wars, account bans, GM crackdowns, market manipulation rivals',
    '  • Combat trong game CÓ — MC fights NPC monsters / players, but combat = means to MAKE MONEY, không glory',
    '  • Real-world side: family poverty → MC pay debts / build company → upgrade lifestyle qua gaming income',
    '  • Tone pragmatic + cynical: MC tính toán cost/benefit mỗi action, ít drama',
    '  • Era specific: 2003-2010 (MMORPG golden age), 2015-2020 (mobile + esports), 2020+ (NFT/metaverse)',
    '  • MC archetypes: (1) sinh viên nghèo, (2) game thủ trọng sinh từ tương lai, (3) IT chuyên gia bị layoff, (4) ex-pro gamer come back',
    '  • Anti-tropes: KHÔNG hệ thống cheat (chỉ rebirth/knowledge), KHÔNG MC bất khả chiến bại in-game (vẫn phải grind smart), KHÔNG harem (focus money)',
    '  • Top examples: 《重生网游之黄金时代》, 《网游之天地》, 《我的虚拟时代》',
  ],
  'game-thanh-hien-thuc': [
    'GAME TRỞ THÀNH HIỆN THỰC PATTERNS (网游降临现实 — game becomes reality):',
    '  • CORE: MC biết game online sắp merge với thực tại → invest hết vốn vào game trước thời điểm merge',
    '  • Knowledge edge: MC từ tương lai / có insider info — biết exact merge timeline, knows OP items/skills',
    '  • PRE-MERGE phase (arc 1-2): MC táng gia bại sản farm game, level + items, thiết lập guild',
    '  • POST-MERGE phase (arc 3+): MC level/items/skills become REAL — class abilities, equipment, gold',
    '  • Combat: MC fights in-game pre-merge for power; fights real monsters post-merge using game powers',
    '  • Reader sướng: pre-merge arc đầy "MC bị gia đình mắng vì chơi game" → reveal post-merge MC vô địch',
    '  • Family dynamic: MC family ban đầu chỉ trích, sau merge thành đồng minh (MC saved them)',
    '  • Tone: pragmatic + dramatic-irony (reader knows merge sẽ đến, family characters không know)',
    '  • Era setting: thường 2020-2025 modern, post-merge = post-apocalyptic + game mechanics',
    '  • MC archetypes: (1) game streamer fail → trọng sinh biết merge, (2) hardcore gamer được warn, (3) developer biết game design will become real, (4) reborn player from post-merge era',
    '  • Anti-tropes: KHÔNG MC pure phế vật (need motivation realistic), KHÔNG family irreparably damaged (post-merge reconcile), KHÔNG harem (pragmatic tone)',
    '  • Top examples: 《全球网游》, 《这游戏也太真实了》, 《网游降临之我是奶妈》, 《全球进化》',
  ],
  'giao-dich-chu-thien': [
    'GIAO DỊCH CHƯ THIÊN PATTERNS (诸天交易 — multi-verse heroes trade):',
    '  • CORE: MC có "Chư Thiên Vạn Giới Giao Dịch Hệ Thống" — trade với multi-verse heroes (Tam Quốc, Tây Du, Marvel, Naruto, Star Wars, Game of Thrones)',
    '  • Trade mechanic: MC offer Earth content (game / phim / sách / công nghệ / đồ tầm thường) ↔ exchange với pháp khí / công pháp / đan dược / kiến thức từ multi-verse',
    '  • MC arbitrage giá trị across worlds — what cheap on Earth = thần khí dimensional',
    '  • Heroes interaction: Sun Wukong, Spider-Man, Naruto, Sherlock đến trade với MC — comedic + meta',
    '  • Power transfer: MC dùng items trade về để strengthen Earth (or his small team) — KHÔNG combat personally',
    '  • Comedy 50%: meta dialogue (heroes from different worlds discuss Earth memes, debate who is strongest)',
    '  • Cast: 5-8 heroes regulars (varied universes) — develop personality riêng, friendship arcs',
    '  • Trade scene cốt lõi: mỗi 2-3 chương 1 trade — MC negotiate, hero reveal weakness/need, exchange',
    '  • Real-world stakes: MC build small team Earth có power qua items trade về (không full apocalypse)',
    '  • Anti-tropes: KHÔNG MC combat, KHÔNG harem heroes (chỉ friendship), KHÔNG copy-paste plot original universes',
    '  • Tone: comedy + meta + collector-pride',
    '  • Top examples: 《诸天交易家》, 《我能在诸天万界开商店》, 《诸天最强店主》',
  ],
  'song-xuyen': [
    'SONG XUYÊN PATTERNS (双穿 — double crossover, MC traverses multiple worlds):',
    '  • CORE: MC xuyên giữa 2+ thế giới (Earth modern + dị giới ma pháp, hoặc parallel universes)',
    '  • Resource arbitrage: MC bring resources/knowledge từ A → use ở B; vice versa',
    '  • Often: MC bù đắp / strengthen weaker world (Earth weak vs dị giới mạnh, hoặc ngược lại)',
    '  • Cross-world identity: MC có 2 lifestyles parallel — Earth student + dị giới hero, balance hai cuộc sống',
    '  • Bring Earth tech to dị giới: gunpowder, electricity, internet, medicine — develop their civilization',
    '  • Bring dị giới resources to Earth: magic items, healing herbs, monster materials → solve Earth problems',
    '  • Combat possible BUT MC role often "bridge/strategist" rather than personal fighter — MC may have small combat ability for self-defense ở weaker world',
    '  • Time mechanics: time differ between worlds (1 day Earth = 1 month dị giới, etc.) — MC exploits',
    '  • Tone: pragmatic + dual-identity drama + cross-cultural comedy',
    '  • Family/relationship: MC may have family Earth + love interest dị giới (or vice versa)',
    '  • Anti-tropes: KHÔNG MC overpowered cả 2 world (must balance + struggle), KHÔNG harem 2 worlds, KHÔNG MC bỏ rơi 1 world',
    '  • MC archetypes: (1) sinh viên Earth + cứu thế dị giới part-time, (2) ngư dân Earth + lord dị giới, (3) doctor Earth + battlefield medic dị giới, (4) chef Earth + ruler dị giới',
    '  • Top examples: 《地球之主》, 《两个世界的我》, 《我有一座万界商城》, 《跨越两界的修仙者》',
  ],
  'chat-group': [
    'NHÓM CHAT GROUP PATTERNS (诸天聊天群 — group chat with multi-verse heroes):',
    '  • CORE: MC có chat group app (qq/wechat-style) với heroes from various stories (Sun Wukong, Spider-Man, Naruto, Sherlock, etc.)',
    '  • Daily interaction: heroes chat, exchange info, MC learn from them',
    '  • Knowledge transfer: heroes share their power/strategy/wisdom → MC level up qua learning',
    '  • Comedy heavy 60%: meta jokes (Sun Wukong roast Naruto, Sherlock debate IQ với Tony Stark), slice-of-life chat',
    '  • Occasional travel: MC travel to their worlds for missions (~1 arc per world)',
    '  • Knowledge transfer mechanic: heroes teach MC small skills, give items for missions',
    '  • Cast 6-10 heroes from popular stories, mỗi người distinctive personality + speech style',
    '  • Group dynamics: friendships form, rivalries, MC mediator',
    '  • Earth stakes: MC tăng strength qua chat group → cứu Earth or local community',
    '  • Comedy structure: 50% chat (text dialogue) + 30% MC real life + 20% travel mission arcs',
    '  • Anti-tropes: KHÔNG harem heroes, KHÔNG MC ngạo mạn (he is youngest in group), KHÔNG copy-paste original story plots',
    '  • Tone: light + comedic + nostalgic (reader yêu các hero references)',
    '  • Top examples: 《诸天聊天群》, 《诸界聊天群》, 《我的微信连三界》',
  ],
  'isekai-net-cafe': [
    'ISEKAI NET-CAFE PATTERNS (xuyên không mở quán net ở dị giới — theo trope chuẩn TQ 异界开网吧):',
    '  • CORE DISTINCTION: MC KHÔNG làm/develop game. MC = OPERATOR / OWNER quán net. Game đã có sẵn trên server cũ — MC chỉ vận hành, sửa máy, bán đồ ăn.',
    '  • SETTING (BẮT BUỘC, theo trope chuẩn TQ): dị giới = TU TIÊN / VÕ LÂM TRUNG HOA / TIÊN HIỆP. Customer = TU SĨ / VÕ LÂM HIỆP KHÁCH / ĐỆ TỬ TÔNG MÔN / TRƯỞNG LÃO / CÔNG TỬ THẾ GIA — KHÔNG phải knight/mage/elf Western fantasy. Tông môn (Thanh Vân Tông, Thiên Long Sơn, Vạn Hoa Cung), thế gia (Lý gia, Tô gia), cảnh giới tu vi (Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần). CẤM TUYỆT ĐỐI knight/wizard/elf/dwarf/orc Western — modern TQ reader thấy lai căng kì cục.',
    '  • CURRENCY: linh thạch hạ phẩm / linh thạch trung phẩm / linh thạch thượng phẩm. KHÔNG dùng vàng/đồng/Earth currency. Giá quán net example: 3 linh thạch hạ phẩm/giờ, 1 linh thạch trung phẩm/buổi đêm, gói thẻ tháng 50 linh thạch hạ phẩm.',
    '  • WARM BASELINE OPENING (BẮT BUỘC — TQ trend 2024-2026): Chương 1 PHẢI mở với MC ĐÃ vận hành quán net trong dị giới — máy đã chạy, linh thạch trận đã cung điện, customer đầu tiên đã đến hoặc sắp đến. MC LÀ VÔ ĐỊCH trong quán net của mình ngay từ scene 1: rành mọi PC, biết từng game, hiểu mọi thiết bị. Thiếu chỉ là QUY MÔ (10 PC nhỏ → tham vọng 100 PC), KHÔNG phải competence. CẤM mở bằng "MC vừa rớt vào dị giới chưa biết gì, lang thang đói khát, bị truy sát".',
    '  • Hook chương 1 = OPPORTUNITY: 1 tu sĩ trẻ (đệ tử ngoại môn / hiệp khách giang hồ / công tử thế gia) tình cờ đi qua, tò mò bước vào quán → MC chào mời thành thạo → bystander shocked. KHÔNG threat-driven (giang hồ tới đập, ma đầu đòi bảo kê).',
    '  • HOOKED-BEFORE-BUFF DISCOVERY (CỰC KỲ QUAN TRỌNG — không skip):',
    '    Customer cadence chuẩn = 4 giai đoạn ÉP THEO ĐÚNG THỨ TỰ, KHÔNG skip:',
    '    GĐ1 — TÌNH CỜ PHÁT HIỆN (1-2 scene): tu sĩ đi ngang, thấy ánh đèn LED kì lạ, nghe âm nhạc lạ, ngửi mùi mì Hảo Hảo → tò mò bước vào, KHÔNG biết là gì.',
    '    GĐ2 — TÌNH CỜ THỬ CHƠI (1-2 scene): MC giải thích "đây là một loại pháp khí giải trí của bản thiếu gia", bảo customer ngồi thử. Customer lúng túng cầm chuột bàn phím, MC dạy click-by-click. Customer thử 1 game (Võ Lâm Truyền Kỳ / CS 1.6 / AoE) — vài phút đầu lóng ngóng.',
    '    GĐ3 — MÊ GAME THUẦN TÚY (3-5 scene, tối thiểu): customer THÍCH game vì gameplay, vì cốt truyện, vì cảm giác sảng khoái khi giết quái / clear map / thắng PvP. PHẢI có scene customer chơi LIÊN TỤC nhiều giờ, quên ăn quên ngủ, ám ảnh muốn quay lại. Ở giai đoạn này CẤM TUYỆT ĐỐI customer nhận buff/skill/breakthrough — chỉ là addiction thuần túy. Reader cảm nhận "wow game này hay thật".',
    '    GĐ4 — VÔ TÌNH NHẬN RA BENEFIT (sau GĐ3, không trước): customer áp dụng thử game logic vào tu vi/võ công thực tế (vd: chiêu thức trong Võ Lâm Truyền Kỳ → thực chiến giang hồ; map awareness CS → trận pháp trinh sát; micro AoE → multi-tasking ngự kiếm) → BẤT NGỜ thành công → epiphany scene "thì ra trò chơi này có thể giúp ta đột phá!". Buff/breakthrough là HỆ QUẢ PHÁT HIỆN TÌNH CỜ, không phải reward auto khi chơi.',
    '    Anti-pattern (CẤM TUYỆT ĐỐI): customer vừa cầm chuột → +1 cảnh giới, vừa chơi 5 phút → linh lực tăng vọt, hệ thống quán net auto-buff khi chơi. Reader chán ngay vì không "đã".',
    '  • GAME CATALOG TIERING (CẤM bắt đầu bằng game basic):',
    '    FLAGSHIP GAMES (game đại diện quán net, customer mê nhất, dùng làm A-plot arc):',
    '    Tier S (HẠT NHÂN, customer nghiện nặng nhất): Võ Lâm Truyền Kỳ (MMO kiếm hiệp, tự nhiên fit tu sĩ TQ), Counter-Strike 1.6 (FPS team play, dễ hiểu), AoE 2 (chiến thuật binh pháp), Diablo 2 (ARPG hack-and-slash), DotA / LoL (MOBA team).',
    '    Tier A (deep cuts cho regulars): MU Online, World of Warcraft, Đột Kích, StarCraft, Heroes of Might & Magic, Fifa Online.',
    '    Tier B (casual filler, KHÔNG dùng làm flagship): Audition, Plants vs Zombies, Tetris, Snake, Flappy Bird, Bejeweled. CẤM dùng Snake/Tetris/Rắn ăn mồi làm game đại diện chương đầu — quá tầm thường, customer không thể "mê" nổi để dẫn dắt arc, reader cảm giác MC kinh doanh đồ chơi trẻ con.',
    '    Quy tắc chương đầu (1-30): MC phải giới thiệu ÍT NHẤT 1 game Tier S trong 5 chương đầu (Võ Lâm Truyền Kỳ là choice mặc định vì culturally fit nhất với tu sĩ). Game Tier B chỉ xuất hiện làm side-game cho customer phụ, KHÔNG làm trung tâm.',
    '  • ANTAGONIST DESIGN (CẤM trope kì cục — phản diện solo MC qua game):',
    '    Phản diện trong genre này TUYỆT ĐỐI KHÔNG được "đến challenge MC bằng game" / "đánh PvP với MC trong game để định thắng thua đời thực". Đây là trope cringe, modern reader bỏ ngay. MC = chủ quán, không phải pro gamer.',
    '    Conflict types ALLOWED:',
    '    (a) ĐỐI THỦ KINH DOANH: tông môn / thế gia khác mở quán net nhái, sao chép format → MC face-slap qua game library độc quyền + customer loyalty + dịch vụ tốt hơn. Conflict resolved qua market competition, KHÔNG combat.',
    '    (b) CHÍNH TRỊ TÔNG MÔN: trưởng lão bảo thủ phán "yêu thuật mê hoặc đệ tử" → MC dùng customer (đệ tử cao cấp đã hooked) làm proxy biện hộ + show real benefit (đệ tử đột phá nhanh hơn nhờ chơi game) → trưởng lão tâm phục.',
    '    (c) BẢO KÊ / GIANG HỒ: ma đầu đòi tiền bảo kê → customer regulars (1 trưởng lão Kim Đan đang nghiện CS) ra tay đuổi → MC không tự đánh.',
    '    (d) THƯƠNG MẠI BÍ MẬT: tổ chức tu tiên muốn cướp công nghệ "pháp khí giải trí" → MC phòng thủ qua trận pháp + customer hộ giá + đàm phán liên minh.',
    '    Phản diện CẤM types: (i) tu sĩ tự xưng "ta cũng giỏi game đến đây solo MC" — kì cục; (ii) đệ tử tông môn enemy đến PvP MC trong game để "đoạt linh thạch" — childish; (iii) ma đầu cao cảnh giới đến đập nhưng MC dùng "thần thông game" 1v1 lật kèo — phá vỡ logic.',
    '  • CUSTOMER ARC TEMPLATE (mỗi regular = 1 mini-arc 5-10 chương theo cadence trên):',
    '    Ch.A — TÌNH CỜ PHÁT HIỆN (1 ch): customer đi ngang, tò mò vào quán, gặp MC.',
    '    Ch.A+1 đến A+2 — TÌNH CỜ THỬ + LÓNG NGÓNG (1-2 ch): MC dạy chơi, customer fail nhiều lần, hài.',
    '    Ch.A+3 đến A+5 — MÊ GAME THUẦN TÚY (2-3 ch): customer addicted, quay lại liên tục, ám ảnh, đời thực bị ảnh hưởng (trễ tu luyện, bỏ buổi giảng pháp). Reader sướng vì game của MC "ngon" thật.',
    '    Ch.A+6 đến A+8 — VÔ TÌNH NHẬN RA BENEFIT (2-3 ch): customer áp dụng game logic vào thực chiến → bất ngờ thành công → reveal scene "pháp khí này thực sự có thể độ ta đột phá!" → customer trở thành regular trung thành + lan truyền cho bạn bè.',
    '  • Net cafe progression ladder: Cấp 1 (10-20 PC cũ, mì gói + trà linh khí) → Cấp 2 (30-50 PC, ghế gaming, đồ ăn đa dạng + bán linh thạch nạp) → Cấp 3 (80+ PC, gaming center, đại hội tỉ võ qua game + RẠP CHIẾU PHIM mini) → Cấp 4 (multi-floor entertainment empire phục vụ tu sĩ Kim Đan / Nguyên Anh — gaming + rạp + trà lâu + tửu lâu).',
    '  • F&B layer: bán đồ ăn quán net Việt Nam adapt cho dị giới (mì Hảo Hảo nấu với linh thảo, trà sữa pha linh tuyền, bánh mì kẹp thịt yêu thú, cơm tấm với gạo linh điền, bia Heineken-style từ ngũ cốc dị giới) — fish-out-of-water comedy.',
    '  • Rạp chiếu phim arc: chiếu lại phim Earth từ media library cũ (Tây Du Ký, Anh Hùng Xạ Điêu, Tiếu Ngạo Giang Hồ, Tru Tiên drama, Thiên Long Bát Bộ, Hồng Lâu Mộng) — culturally fit tu sĩ TQ. Power transfer qua phim (đệ tử xem võ thuật phim → ngộ chiêu mới).',
    '  • Esports arc: tổ chức đại hội tỉ võ giới tu tiên qua game có sẵn (Võ Lâm Truyền Kỳ Cup, CS Championship) → các tông môn cử đệ tử thi đấu → streaming qua trận pháp truyền hình ảnh.',
    '  • MC physically yếu: phàm nhân hoặc tu sĩ Luyện Khí thấp. Dùng business smart + customer relationships, KHÔNG combat. Customer cao cảnh giới (Trúc Cơ, Kim Đan) hộ giá nếu cần.',
    '  • Cast 5-8 customer regulars (template): (1) đệ tử ngoại môn Thanh Vân Tông trẻ tuổi nghiện CS 1.6, (2) trưởng lão Kim Đan ẩn cư ghé quán đêm chơi Võ Lâm Truyền Kỳ, (3) tiểu thư thế gia trốn nhà nghiện Audition, (4) ma đầu hối cải nghiện Diablo 2, (5) thư sinh sa cơ chơi AoE giải sầu, (6) hiệp khách giang hồ già nghiện DotA — mỗi người có arc đột phá nhờ game theo template Hooked-Before-Buff.',
    '  • Comedy ratio 60%: fish-out-of-water tu sĩ reactions với mì gói (cứ tưởng linh dược), AC (cứ tưởng băng cấm trận), đèn LED (cứ tưởng dạ minh châu), internet (cứ tưởng truyền âm phù), headset (cứ tưởng pháp khí thông tâm) — phản ứng over-react.',
    '  • MC KHÔNG quay về Earth (one-way isekai), permanently ở dị giới — KHÔNG dual-world parallel scenes.',
    '  • Anti-tropes: KHÔNG MC develop game (làm game = thể loại khác), KHÔNG MC combat, KHÔNG harem (single love interest slow-burn), KHÔNG knight/wizard/elf Western fantasy, KHÔNG Snake/Tetris/Rắn-ăn-mồi làm flagship, KHÔNG customer auto-buff vừa chơi đã đột phá, KHÔNG phản diện challenge MC qua game.',
    '  • Tone: cozy + comedy + nostalgic + tu tiên flavor. KHÔNG epic, KHÔNG combat-driven.',
    '  • MC archetypes: (1) sinh viên IT kế thừa quán net ông ngoại bị xuyên không, (2) ex-net-cafe owner đóng cửa vì game online, (3) gamer hardcore xuyên với máy chủ cũ, (4) IT support tỉnh dậy thành chủ quán dị giới — TẤT CẢ đều xuyên đến TQ tu tiên world, không phải Western fantasy.',
    '  • Top examples (canonical TQ): 《我在异界开网吧》, 《异世界开网吧》, 《异界网吧救世主》, 《网吧客户都是异界大佬》, 《封神网吧》 — đọc kỹ để hiểu trope chuẩn.',
  ],
  'game-parallel-world': [
    'GAME PARALLEL-WORLD PATTERNS (LÀM GAME — xuyên không/trọng sinh thế giới song song làm Game/Công nghệ — đô thị+võng du+hệ thống):',
    '  • DISTINCTION: MC = GAME DEVELOPER / STUDIO OWNER. MC tự CODE/DESIGN/PUBLISH game. KHÁC HOÀN TOÀN với "mở quán net" (operator có game sẵn).',
    '  • CORE MECHANIC: MC xuyên không / trọng sinh sang thế giới song song (parallel Earth) — công nghệ ngang/nhỉnh hơn Earth, NHƯNG ngành game CỰC TỆ (toàn P2W, nạp VIP, cày tẻ nhạt). Thiếu khái niệm: AAA, cốt truyện điện ảnh, esports chuyên nghiệp, indie sáng tạo.',
    '  • ENEMY ARCHITECTURE: 1-2 tập đoàn khổng lồ độc quyền (Tencent/NetEase analog — đặt tên fictional "Hằng Nguyên", "Vạn Giới") chuyên copy + hút máu. MC face-slap qua sản phẩm (KHÔNG combat).',
    '  • GOLDEN FINGER (chọn 1):',
    '    (a) HỆ THỐNG THU THẬP CẢM XÚC: MC release game → thu "Điểm sợ hãi" (game kinh dị), "Điểm ức chế" (Flappy Bird/Getting Over It), "Điểm cảm động" (Undertale/Stardew). Điểm = currency mua source code Earth, engine, kỹ năng.',
    '    (b) THƯ VIỆN TRÁI ĐẤT: kho game/nhạc/phim Earth — MC retrieve theo level / điểm.',
    '  • MC = LẬP TRÌNH VIÊN ĐỘC LẬP / chủ studio nhỏ. PRAGMATIC + creative + business savvy. WARM BASELINE (bắt buộc): chương 1 mở với MC ĐÃ có studio nhỏ + máy tính + golden finger activated + ý tưởng/prototype đầu trong tay — KHÔNG bắt đầu bằng "MC vừa bị đuổi việc lang thang về nhà nợ ngập đầu". Có thể có dấu hiệu áp lực nhẹ (rent due, deadline, 1 khách hàng khó tính) NHƯNG MC operational ngay từ trang đầu.',
    '  • 4-PHASE ROADMAP (cấu trúc cho 1500 chương):',
    '    PHASE 1 (ch.1-50) "Khởi nghiệp tinh gọn": MC ĐÃ có studio + golden finger activated → release game indie nhỏ nhưng đột phá (Five Nights at Freddys, Outlast, Undertale, Getting Over It style) → marketing 0 đồng qua streamer (streamer la hét/phá chuột → viral) → vốn liếng đầu tay. CẤM mở chương 1 bằng "MC vừa rớt vào dị giới chưa biết gì" — MC arrive WITH inventory + skills + golden finger active.',
    '    PHASE 2 (ch.51-200) "Studio + cuộc chiến bản quyền": Tuyển team (nhân tài có tật — họa sĩ bị tẩy chay, nhạc sĩ thất thời) → tựa game tầm trung (Stardew Valley, Plants vs Zombies, CS:GO) → tập đoàn lớn copy clone → MC face-slap bằng cập nhật core feature bản nhái không kịp, hoặc kiện ngược bản quyền.',
    '    PHASE 3 (ch.201-500) "Phá vỡ độc quyền + hệ sinh thái": Game AAA đầu tiên (GTA V, The Witcher, Dark Souls, Sekiro) → game = nghệ thuật → tự build platform riêng (Steam analog "Hồng Tâm") → thu hút indie devs → tổ chức esports global (LoL, DotA tournaments).',
    '    PHASE 4 (ch.501+) "VR / Metaverse": Hệ thống đưa hắc khoa kỹ → MC làm thiết bị VR neural-interface (Sword Art Online / Ready Player One) → metaverse trở thành "thế giới thứ hai", apply quân sự/y tế/giáo dục → MC = Bố Già công nghệ.',
    '  • TROPE BẮT BUỘC #1 — STREAMER POV (30-40% chương): Cảnh streamer/người chơi vật vã trải nghiệm game của MC + reaction cộng đồng mạng. Đây là engine "sảng văn" hiệu quả nhất — show không tả, audience kể experience.',
    '  • TROPE BẮT BUỘC #2 — MC PERSONA "TRÙM PHẢN DIỆN GIẤU MẶT": người chơi gọi MC là "Cẩu Tặc", "Ác Ma Thiết Kế" vì hay ra game hành hạ tâm lý — NHƯNG mỗi game mới ra ai cũng thi nhau nạp tiền. Dramatic irony engine.',
    '  • TROPE BẮT BUỘC #3 — VĂN HÓA INFUSION: cài cắm aesthetic đặc thù (Cyberpunk, Yakuza, thần thoại Việt Nam, kiếm hiệp Kim Dung) → game không chỉ giải trí mà "khai sáng" gamer thế giới song song.',
    '  • POWER TRANSFER (KHÔNG combat MC): game của MC ảnh hưởng văn hóa setting → industry rivals copycat → MC innovate next IP. Combat Earth (giữa game characters in-game) có, NHƯNG MC không personally fight — MC = creator + curator + business strategist.',
    '  • Anti-tropes: KHÔNG MC combat, KHÔNG harem (nữ team member single love interest slow-burn), KHÔNG copy plot game/phim Earth gốc 100% (adapt + Vietnamese-Asian angle), KHÔNG instant master (MC luôn fail debug + crunch + bug crashes lần đầu)',
    '  • Comedy ratio CAO (50%): dev pain (deadline, bug, customer complaints), streamer reactions (la hét, phá chuột, khóc lóc), industry irony (P2W tycoon thi nhau nạp tiền vào game indie của MC)',
    '  • Tone: pragmatic + meta-comedy + cultural-impact glamour. Match phase: phase 1-2 underdog grind, phase 3 mogul, phase 4 visionary.',
    '  • Chapter structure: 30% MC creative work + 30% streamer/community POV + 25% business politics + 15% team dynamics',
    '  • MC archetypes: (1) ex-AAA QA bị burnout xuyên không, (2) indie dev TQ bị hủy game trọng sinh, (3) gamer hardcore tỉnh dậy thân lập trình viên, (4) lập trình viên enterprise quit job, (5) ex-streamer fail trở thành dev',
    '  • Top examples: 《我可能是个假游戏制作人》, 《我开始当游戏主播那些年》, 《菌挂游戏制作人》, 《全球游戏:我把网游做成现实》, 《我的游戏让全球玩家哭着尖叫》',
  ],
  'vo-han-luu': [
    'VÔ HẠN LƯU PATTERNS (无限流 — death-loop / repeating instance):',
    '  • Loop structure CỐ ĐỊNH: mỗi arc 8-15 chương = 1 instance/phó bản, có ENTRY (briefing rules) → SURVIVAL (giải đố/giết boss) → SETTLEMENT (điểm thưởng + reward shop)',
    '  • Rules-of-the-instance phải show ngay chương mở phó bản: time limit, win condition, death penalty, forbidden actions — reader cần khế ước rõ',
    '  • Memory carry-over chỉ KIẾN THỨC + ĐIỂM, KHÔNG mang vật phẩm phó bản này sang phó bản khác (trừ key item bought from shop)',
    '  • Death stakes có TEETH: side characters chết thật từ chương 5-10 đầu để reader tin nguy hiểm; MC bị thương/cụt tay/mất giác quan ít nhất 1 lần/3 phó bản',
    '  • Genre-mash mỗi instance: phó bản 1 = horror Trung cổ, phó bản 2 = mecha sci-fi, phó bản 3 = zombie modern, phó bản 4 = fairy tale dark — tránh lặp tone',
    '  • Reward shop economy: mỗi điểm có giá rõ (1000pt = súng, 5000pt = năng lực D-rank), MC luôn poor đầu phó bản → reader theo dõi budget tracker',
    '  • Team dynamics 40%: 4-6 fellow players cố định trở lại nhiều phó bản, mỗi người 1 chuyên môn (hacker / hỏa lực / trinh sát / chữa thương), backstab + alliance shift mỗi 2 phó bản',
    '  • Puzzle > combat: ≥50% phó bản giải bằng đọc-rules-kỹ + suy luận, không đập boss trực diện; MC archetype chính = paranoid analyst',
    '  • Anti-tropes: KHÔNG cho MC max-stat từ phó bản 1, KHÔNG có "hệ thống thân thiện" giải thích mọi thứ, KHÔNG harem trong loop',
    '  • Lore reveal nhỏ giọt: ai tạo loop? mục đích? — chỉ reveal 1 mảnh/10 phó bản, KHÔNG dump nguồn gốc trước chương 100',
    '  • MC archetypes: (1) sinh viên triết học bị kéo vào, (2) cảnh sát điều tra biến mất, (3) game thủ nghĩ là VR, (4) bệnh nhân ung thư chấp nhận liều mạng, (5) cựu binh PTSD',
    '  • Top examples: 《十日终焉》, 《无限恐怖》, 《诡秘之主》(loop elements), 《死亡万花筒》',
  ],
  'lanh-chua': [
    'LÃNH CHÚA PATTERNS (领主流 — territory builder / city sim):',
    '  • Stat sheet OPEN ngay chương 1: lãnh thổ có [dân số / lương thực / vàng / quân đội / công trình] — số cụ thể, update mỗi 2-3 chương như HUD game',
    '  • Resource loop: thu thuế → đầu tư công trình → tăng population → tăng thuế — show từng bước, KHÔNG skip',
    '  • Building tier system rõ: nhà gỗ → nhà đá → tháp canh → thành tường → toà thành — mỗi tier cost + unlock requirement cụ thể',
    '  • Population events mỗi 5-7 chương: dịch bệnh / tị nạn đến / nông nô bỏ trốn / thợ thủ công xin gia nhập — MC quyết định policy, có hậu quả dài hạn',
    '  • Hero/đặc thù NPC: 1 NPC cá tính riêng đến gia nhập mỗi 8-12 chương (tướng quân lưu vong, pháp sư già, thương nhân tinh ranh) — mỗi người 1 buff cho lãnh thổ',
    '  • War vs neighboring lord là season climax (mỗi 30-40 chương): chuẩn bị 10 chương → đánh 5 chương → tiếp quản 5 chương → tích hợp lãnh thổ mới',
    '  • MC KHÔNG personally combat sau chương 20: orchestrator role, sai tướng đi đánh, MC ngồi war room nghe report',
    '  • Map expansion visible: chương 1 = 1 làng, chương 50 = 1 county, chương 150 = 1 vương quốc',
    '  • Diplomacy 30% screen time: liên minh, hôn nhân chính trị, tribute, gián điệp',
    '  • Anti-tropes: KHÔNG cho MC một mình giết quân địch, KHÔNG instant city từ "hệ thống tặng", KHÔNG bỏ qua hậu cần (lương thực/mùa đông/dịch bệnh phải có)',
    '  • MC archetypes: (1) sĩ quan game thủ xuyên việt, (2) hậu duệ quý tộc bị truất, (3) du dân được dân chúng tôn lên, (4) trọng sinh hoàng tử thứ 7, (5) NPC self-aware trong game lord',
    '  • Top examples: 《重生之最强领主》, 《全民领主》, 《我的玩家是异界领主》, 《领主求生》',
  ],
  'trieu-hoi': [
    'TRIỆU HỒI PATTERNS (召唤流 — summon historical/mythical/anime heroes):',
    '  • Summon mechanic: gacha-like (rare/epic/legendary tiers) hoặc condition-based (cúng tế/hợp đồng/điểm danh) — rule rõ chương 1-3',
    '  • Each hero là CELEBRITY identity reader nhận ra: Lữ Bố, Triệu Vân, Naruto, Saber, Hercules, Tào Tháo — KHÔNG dùng tên fake',
    '  • Hero personality FAITHFUL với nguồn gốc: Lữ Bố kiêu ngạo phản trắc, Triệu Vân trung dũng, Saber knight code — không OOC',
    '  • Power tier ranking rõ: SSR > SR > R, đối đầu cross-tier có rule — reader cần dự đoán được',
    '  • Hero ≠ MC: heroes làm combat, MC strategist + summoner — MC bản thân yếu',
    '  • Hero loyalty arc: summon ra ban đầu lạnh nhạt → MC làm gì đó (giữ lời hứa, hy sinh vì hero, share vision) → loyalty up → ultimate skill unlock',
    '  • Hero-vs-Hero scenes là viral chapter: 2 hero famous đối đầu (Lữ Bố vs Hercules) — fight choreography chi tiết',
    '  • Summon resource KHAN HIẾM: tinh thạch/thiện nguyện/khí vận giới hạn → MC phải chọn summon ai',
    '  • Anti-tropes: KHÔNG để MC mạnh hơn heroes, KHÔNG summon all SSR ngay 10 chương đầu, KHÔNG để hero chết vĩnh viễn',
    '  • Hero introduction MANDATORY: mỗi hero summon mới có 1 chương dedicated — entrance pose, signature line, first battle',
    '  • MC archetypes: (1) học sinh phổ thông được hệ thống chọn, (2) tướng quân thua trận tuyệt vọng triệu thần, (3) game thủ TCG xuyên việt, (4) thầy đồng cổ truyền, (5) hoàng tử bị phế dùng huyết tế summon',
    '  • Top examples: 《全民召唤》, 《我能召唤诸天英雄》, 《召唤万岁》, 《三国从忽悠刘备开始》',
  ],
  'beast-tamer': [
    'BEAST TAMER PATTERNS (御兽流 — contract/tame creature companions):',
    '  • Contract mechanic: cách tame (huyết khế/linh hồn link/item/quenching), số beast tối đa MC contract được (3-7), break-contract penalty',
    '  • Beast evolution tree visible: trứng → tuổi nhỏ → trưởng thành → vương → đế — mỗi tier có form change + skill mới (Pokémon-style)',
    '  • Each contract beast = personality riêng + speech tag: Cloud Wolf cao ngạo, Slime ngu ngơ, Black Dragon kiêu hãnh — đối thoại với MC chiếm 25% screen',
    '  • Beast CHIẾN ĐẤU, MC support: MC ra lệnh / cung cấp linh lực / phối hợp formation — MC physically bình thường',
    '  • Mỗi beast 1 niche role: tank/dps/heal/scout/utility — đội hình composition là tactical content',
    '  • Breeding/lai tạo arc mỗi 30-40 chương: 2 beast giao phối → trứng hybrid → species mới → MC = breeder pioneer',
    '  • Wild beast hunt: săn beast quý hiếm có taming process step-by-step — KHÔNG insta-tame',
    '  • Beast society lore: hierarchy beast (vương thú thống trị mountain range), beast politics, ancient civilizations',
    '  • Sentimental bonding mỗi 10 chương: MC chữa beast bị thương, beast cứu MC suýt chết',
    '  • Anti-tropes: KHÔNG cho beast biết nói tiếng người ngay, KHÔNG để MC tự fight bypass beast, KHÔNG vô số beast (giới hạn slot tạo tension)',
    '  • Tournament arc mỗi 40-60 chương 1 lần',
    '  • MC archetypes: (1) học sinh học viện ngự thú thiên phú thấp, (2) trọng sinh master tamer biết evolution paths, (3) thợ săn rừng nguyên thủy, (4) nhà nghiên cứu sinh học xuyên việt, (5) outcast chỉ contract được "trash" beast tiến hóa khủng',
    '  • Top examples: 《全球御兽》, 《我的契约兽是凯多》, 《御兽飞升》, 《我能给万物加词条》',
  ],
  'y-thuat': [
    'Y THUẬT PATTERNS (神医流 — medical specialist edge):',
    '  • MC = doctor với edge SPECIFIC (chọn 1): trọng sinh biết tiến bộ y học / gia truyền mật phương cổ / xuyên việt đem y học hiện đại sang cổ đại / thấu thị siêu năng',
    '  • Case-of-the-week: mỗi 3-5 chương 1 ca bệnh — symptom presentation → misdiagnosis → MC catch detail → đề xuất phương pháp → cure',
    '  • Medical detail SPECIFIC: tên bệnh, triệu chứng, cơ chế, thuốc/châm/phẫu — KHÔNG "kỳ bệnh khó chữa" generic',
    '  • Patient archetype rotation: nhà giàu mắc bệnh kín, quan chức cần discretion, trẻ em nghèo MC chữa miễn phí, đại lão giả bệnh ám sát → mỗi case 1 stake',
    '  • Ethics conflict ≥1 lần/arc: cứu kẻ ác? gia đình giàu hối lộ vs nghèo cần gấp? thí nghiệm rủi ro?',
    '  • Đồng nghiệp jealous arc: bác sĩ trưởng khinh thường MC → MC chữa ca nan giải họ bó tay → respect dần (qua 5-8 chương)',
    '  • Hospital/clinic politics 30%: kinh phí, malpractice suit, drug company kickback, viện trưởng tham nhũng',
    '  • Romance soft-coded: y tá/đồng nghiệp/bệnh nhân — slow-burn',
    '  • Anti-tropes: KHÔNG để MC chữa "bách bệnh" bằng 1 chiêu, KHÔNG dùng siêu năng giải mọi case (90% phải chuyên môn), KHÔNG để bệnh nhân chết vì MC sai',
    '  • Real medical references: tên thuốc, ICD code, surgical procedure, herbal formula',
    '  • MC archetypes: (1) bác sĩ Mỹ trở về VN/TQ, (2) bác sĩ trọng sinh sau bị kiện, (3) đệ tử cuối cùng thần y, (4) sinh viên y năm cuối có hệ thống chẩn đoán, (5) cựu quân y giải nghệ',
    '  • Top examples: 《妙手回春》, 《重生之神医归来》, 《大医凌然》, 《国医高手》',
  ],
  'cao-vo-modern': [
    'CAO VÕ MODERN PATTERNS (高武流 — modern world + martial cultivation revealed):',
    '  • Setting = world hiện đại (smartphone, internet, đại học) NHƯNG võ giả = nghề công khai, có hiệp hội võ giả, học viện võ thuật quốc gia, ngân hàng pháp khí',
    '  • Tier system: võ sĩ → võ sư → đại võ sư → tông sư → đại tông sư → vũ giả → vũ thánh → vũ tiên (8 tầng) — mỗi tier có physical stat cap rõ',
    '  • Aura/khí huyết as resource: mỗi attack tốn % khí huyết, recovery cần thuốc/ngủ',
    '  • Beast tide / dungeon = lý do võ giả tồn tại: vùng hoang dã có yêu thú, thành phố có tunnel xuất hiện monster',
    '  • National exam / school ranking arc: học viện võ thuật có entrance exam, ranking điểm hằng tháng, bảng đại học toàn quốc',
    '  • Resource economy modern-fused: linh thạch giao dịch trên app, pháp khí auction online, võ kỹ video tutorial premium',
    '  • Family/financial gap motif: MC từ gia đình thường, đối thủ là con đại tộc võ giả',
    '  • Tournament every 40-50 chapters: trường-cấp → thành-cấp → quốc-cấp → toàn cầu',
    '  • Hidden lore: nguồn gốc beast tide, ancient civilization fall, cosmic war',
    '  • Anti-tropes: KHÔNG để MC bypass tier system bằng "talent vô địch", KHÔNG harem instant, KHÔNG để civilian world ignore võ giả',
    '  • Combat scene format: stat compare → exchange blow-by-blow → khí huyết depletion check → kết quả hợp lý vs tier',
    '  • MC archetypes: (1) học sinh nghèo gia đình thiếu nợ, (2) trọng sinh đại tông sư về thân thể trẻ, (3) lính đặc chủng giải ngũ vào học viện, (4) thiên phú trash awakening muộn, (5) game thủ VRMMO biết rule trước',
    '  • Top examples: 《全球高武》, 《我从顶级武者开始》, 《武炼巅峰》(modern), 《超神机械师》',
  ],
  'kiem-tu': [
    'KIẾM TU PATTERNS (剑修流 — sword cultivator pure path):',
    '  • MC dedicated SOLE đường kiếm: KHÔNG học trận pháp/luyện đan/phù lục/thể tu — combat duy nhất bằng kiếm',
    '  • Kiếm ý / sword intent là core progression: nhập môn ý → tiểu thành → đại thành → viên mãn → kiếm tâm → thiên nhân hợp nhất kiếm',
    '  • Mỗi tier ý có ENLIGHTENMENT scene: MC đứng dưới thác/nhìn lá rơi/sau trận thua → ngộ ra concept (rapidity/silence/inevitability) → break through',
    '  • Sword evolution: phàm kiếm → linh kiếm → bảo kiếm → tiên kiếm → bản mệnh kiếm — kiếm grow cùng chủ',
    '  • One-strike philosophy: combat ngắn, dứt điểm 1-3 chiêu — KHÔNG kéo dài 5 chương đánh nhau; "một kiếm chém đứt..." là signature beat',
    '  • Sword vs other path showdown: arc MC gặp đan tu/phù tu/thể tu strong → MC dùng kiếm ý vượt kỹ thuật',
    '  • Loneliness motif: kiếm tu = solitary path, MC ít bạn, ít harem; mentors chết/biến mất sớm',
    '  • Sword sect politics: MC thuộc tông kiếm danh môn, sư huynh đệ, sư phụ; tông internal struggle, kiếm cốc thí luyện 30-50 chương 1 lần',
    '  • Sword-dao naming: chiêu thức tên thi pháp/triết học (Vạn Lý Hành Vân, Thu Thuỷ Trảm, Cô Tinh Quyết) — KHÔNG flashy "Thiên Long Long Hỏa Cuồng Phong Trảm"',
    '  • Anti-tropes: KHÔNG cho MC học kỹ năng khác, KHÔNG thâu hút đệ tử nữ làm harem, KHÔNG combat dài lê thê',
    '  • Tone aesthetic: Đông Phương poetic, autumn/snow/mountain imagery dày',
    '  • MC archetypes: (1) tâm cảnh kiếm si từ nhỏ, (2) trọng sinh kiếm tiên về phế thân thiếu niên, (3) cô nhi nhặt kiếm cổ, (4) đệ tử bị trục xuất tự lập tông, (5) sát thủ kiếm khách giải nghệ tu chân',
    '  • Top examples: 《一剑斩破诸天》, 《我有一剑》, 《剑来》, 《问道红尘》',
  ],
  'chuyen-sinh-quai': [
    'CHUYỂN SINH THÀNH QUÁI PATTERNS (转生为怪物 — reborn as low-tier monster):',
    '  • MC chương 1 thức tỉnh trong thân quái yếu: slime/goblin/chuột/rắn/khủng long con/xương sọ — KHÔNG con người, body horror moment đầu',
    '  • Evolution tree visible từ đầu: form A → B → C... với requirement cụ thể (ăn X con prey, hấp thu Y mana, kill mini-boss)',
    '  • Eat-to-grow mechanic: MC hấp thu trait từ prey ăn được (ăn sói = nail claw, ăn rồng = fire breath)',
    '  • Skill panel HUD style: MC đọc status window — Level/HP/Skills/Evolution Available',
    '  • Monster society politics: hang động slime có vua, rừng goblin có shaman, mountain dragon có hierarchy',
    '  • Human contact arc đến muộn (chương 30-50): MC sau evolution lên human-form mới gặp adventurer/village',
    '  • Companion = monster minions: MC làm chủ tribe/swarm, các minion individual personality',
    '  • Speech adaptation: chương đầu MC nói "Pyu pyu" (slime sound), sau evolution unlock speech skill',
    '  • Comedy ratio 40%: fish-out-of-water phản ứng với cơ thể quái mới',
    '  • Anti-tropes: KHÔNG cho MC instant human form chương 1, KHÔNG cho MC quay lại làm con người, KHÔNG để MC genocide human ngay',
    '  • Naming convention: MC tự đặt tên cho minion (Goblin số 1 → Gobta), tribe có tên',
    '  • MC archetypes: (1) nhân viên văn phòng chết bị xe đâm tỉnh dậy là slime, (2) game thủ tỉnh dậy trong body monster, (3) học sinh self-insert thành mob phụ, (4) trọng sinh chiến binh giờ là xương sọ undead, (5) AI consciousness load vào dragon trứng',
    '  • Top examples: 《关于我转生成史莱姆这件事》, 《我转生成蛇魔的我》, 《我转生成了恐龙》, 《转生从蜘蛛开始》',
  ],
  'thien-dao-luu': [
    'THIÊN ĐẠO LƯU PATTERNS (天道流 — MC = avatar/agent of Heaven Dao):',
    '  • MC identity = thiên đạo bản thân/phân thân thiên đạo/con cưng thiên đạo/kế nhiệm thiên đạo — chọn 1, reveal trong 5 chương đầu',
    '  • Cosmic perspective: MC nhìn thế giới ở scale ngàn năm, tỷ linh hồn — nội tâm monologue "trong dòng sông số mệnh", "khí vận của thế giới này"',
    '  • Karma/khí vận as currency: MC làm "đúng việc thiên đạo cần" → khí vận tăng → cultivation up; làm "trái thiên đạo" → khí vận giảm',
    '  • Power = passive/automatic: MC ít cần thi triển skill — tồn tại của MC tự áp chế (kẻ ác đứng gần MC tự bốc cháy do nghiệp lực)',
    '  • Plot driver ngược pattern: thay vì MC chase enemies, enemies tự đến — MC ngồi yên xử lý cosmic justice',
    '  • Cause-and-effect display: mỗi action MC tác động → ledger update visible (good karma +X, bad karma -Y)',
    '  • Other "main characters" exist: world này có nhiều "thiên chi kiêu tử" — MC quan sát họ, thỉnh thoảng can thiệp như god above board',
    '  • Detached romance: MC khó yêu, nếu có thì là incarnation cycle / nữ chính reincarnate qua nhiều đời',
    '  • Test/calamity arc mỗi 50 chương: thiên đạo bản thân test MC (heart tribulation, nine-nine cosmic tribulation)',
    '  • Anti-tropes: KHÔNG để MC face-slap petty (genre tone cao), KHÔNG harem, KHÔNG combat 1v1 prolonged',
    '  • Tone: detached, philosophical, aphorism-heavy — reader đọc cảm giác triết học Đạo Đức Kinh',
    '  • Pacing slow-burn: chapter goal thường là "MC quan sát và quyết định KHÔNG can thiệp"',
    '  • MC archetypes: (1) thiên đạo gãy vỡ tự tu phục lại bằng identity con người, (2) cổ thần cuối cùng giả hèn mọn, (3) trọng sinh thấy mình là "con thiên đạo" trong game, (4) AI quản trị vũ trụ load vào human, (5) tu sĩ chết cuối cùng tử thân hợp nhất pháp tắc',
    '  • Top examples: 《我成了天道》, 《天道剑神》, 《我成了天道亲儿子》',
  ],
  'dan-duoc-luu': [
    'ĐAN DƯỢC LƯU PATTERNS (炼丹流 — alchemy/pill master specialist):',
    '  • MC core craft = luyện đan; combat secondary or non-existent — economic + craft progression genre',
    '  • Pill grade hierarchy: nhất phẩm → cửu phẩm → tiên đan → thần đan; mỗi grade requirement (lò, dược thảo tier, hỏa khí) cụ thể',
    '  • Recipe research arc: MC tìm/recreate cổ phương → ingredient hunt → trial-and-error luyện',
    '  • Failure scenes MANDATORY: MC luyện thất bại lần đầu — show ash/lò nổ/độc khí; KHÔNG instant master',
    '  • Furnace/lò = MC lifelong companion: "Nhược Thuỷ Đỉnh", "Cửu U Lò" — đặt tên, có evolution',
    '  • Hỏa khí variety: phàm hoả → địa hoả → thiên hoả → dị hoả ranking — MC quest tìm dị hoả là arc 30-50 chương',
    '  • Auction house scene mỗi 15-20 chương: MC mang đan ra đấu giá / mua dược thảo hiếm — number-driven dopamine',
    '  • Customer/khách hàng tier rotation: tu sĩ thường mua hồi hỏa đan, đại lão thân chuyển cảnh giới đến cầu phá cảnh đan, hoàng thất cần trường thọ đan',
    '  • Đan dược competition arc: đan hội / đại hội luyện đan — bracket judging, MC face-slap đan sư danh tiếng',
    '  • Anti-tropes: KHÔNG cho MC instant biết tất cả phương ngay đầu, KHÔNG để combat dominate, KHÔNG harem nặng',
    '  • Pill side-effect realism: đan có hậu di chứng, dùng quá liều thành dược nghiện',
    '  • MC archetypes: (1) trọng sinh đan vương về phế thân, (2) hậu duệ tuyệt học family đan tộc tro tàn, (3) hệ thống đan đạo (gacha công thức), (4) chef hiện đại xuyên việt biết hóa học, (5) phế vật bị đuổi nhặt được dược điển cổ',
    '  • Top examples: 《超品炼丹师》, 《丹道至尊》, 《一品高手》, 《丹师剑宗》',
  ],
  'phe-vat-phan-kich': [
    'PHẾ VẬT PHẢN KÍCH PATTERNS (废柴逆袭 — modern reframe, smart-strategy revenge):',
    '  • Opening setup chương 1-3: MC bị ruột rà/vị hôn thê/sư môn đối xử như rác → public humiliation scene cụ thể',
    '  • Awakening moment chương 3-5: MC nhận hệ thống/kế thừa truyền thừa/awakening huyết mạch/trọng sinh — power source rõ ràng',
    '  • 2024 RULE: MC KHÔNG self-pity dài — sau awakening 1 chương MC chuyển sang plotting cold-headed; KHÔNG khóc 5 chương',
    '  • Strategy > brute strength: MC face-slap không phải bằng "ta giờ mạnh hơn" mà bằng setup → bait → exposure',
    '  • Face-slap pacing: target ban đầu là người bullied MC → giải quyết hết trong 30-50 chương, sau đó escalate đến ancestral enemies',
    '  • Public-witness rule: face-slap chỉ thoả mãn khi có audience (đại hội, trường lớp, đại điện)',
    '  • Power growth visible số liệu: MC chương 1 = võ sĩ tầng 1, chương 30 = võ sư tầng 5, chương 100 = đại tông sư',
    '  • Allies recruitment qua respect: người từng giúp MC khi yếu → MC reward sau khi mạnh',
    '  • Old-girlfriend-comeback trope cấm cliché: vị hôn thê cũ regret → MC từ chối thẳng + đem đi khoe new partner',
    '  • Anti-tropes: KHÔNG cho MC tha thứ enemy đầu vì "thiện lương", KHÔNG mother fakes-loving-MC arc kéo dài, KHÔNG slow burn 50 chương trước face-slap đầu',
    '  • Smart-revenge tier: tier 1 (5-10 chương): face-slap người trực tiếp bully → tier 2 (30-50): mastermind → tier 3 (100+): cosmic scale',
    '  • MC archetypes: (1) phế vật huyết mạch giấu kín bùng nổ, (2) trọng sinh đại lão về thân phế tu, (3) bị đầu độc nay khôi phục thiên phú, (4) hệ thống chosen one wake-up muộn, (5) cô nhi nhặt được di vật ancestor god',
    '  • Top examples: 《斗破苍穹》(legacy gold), 《武动乾坤》, 《大主宰》, 《万古神帝》, 《元尊》',
  ],
  'nguy-trang': [
    'NGỤY TRANG PATTERNS (伪装流 — secret OP, pretending weak, dramatic irony):',
    '  • CORE RULE: MC tuyệt đối KHÔNG flex/khoe — mỗi lần MC vô tình lộ power, lập tức cover up bằng excuse vô lý ("may mắn thôi")',
    '  • POV layered: 60% chapter từ POV MC + 40% từ POV người xung quanh (gradually nhận ra MC khủng) — dramatic irony engine',
    '  • Misunderstanding compound: 1 hành động bình thường của MC → người xung quanh suy diễn thành "đại lão có thâm ý" → MC không biết bị hiểu nhầm',
    '  • School/workplace setting common: MC giả làm sinh viên/nhân viên thấp/đệ tử ngoại môn — but truth là chairman-level',
    '  • Identity reveal pacing: MC có 5-7 identity hidden — mỗi 30-40 chương 1 identity bị peer crew khám phá',
    '  • Nemesis pattern: nhóm "thiên kiêu" cố make name → liên tục dẫm phải MC vô tình → bị đập / mất face',
    '  • Comedy ratio 50%: tone phải light, KHÔNG dark thriller',
    '  • Sidekick/confidant 1-2 người biết phần truth → reaction tracker cho reader',
    '  • Reveal scene pattern: enemy đang dồn ép → MC bất đắc dĩ show 1% power → enemy entire faction freeze / quỳ → MC "vậy thôi tôi đi học tiếp"',
    '  • Anti-tropes: KHÔNG để MC chủ động khoe (phá genre), KHÔNG để romance interest biết hết từ đầu, KHÔNG để MC thực sự bị bully',
    '  • Reason for hiding: MC có lý do CỤ THỂ ẩn thân — hứa với master / chán politic / muốn thanh tịnh / bị truy sát',
    '  • Phrase signature: MC hay nói "tôi chỉ là người thường", "may mắn thôi", "đại ca quá khen rồi"',
    '  • MC archetypes: (1) đại lão nghỉ hưu vào trường đại học cho vui, (2) chairman tỷ phú giấu identity yêu cô gái thường, (3) thần y ẩn cư mở quán nhỏ, (4) cao thủ tông vương ẩn thân làm thầy giáo cấp 3, (5) cha của nữ chính giấu identity trông con',
    '  • Top examples: 《大佬装弱小》, 《我在末日卖装备》, 《伪装的大佬》, 《最强反套路系统》, 《赘婿》(adjacent)',
  ],
  'toan-dan-luu': [
    'TOÀN DÂN LƯU PATTERNS (apocalyptic awakening — toàn dân thức tỉnh):',
    '  • Cataclysm trigger chương 1-3: cửa quỷ mở / hệ thống xanh giáng / virus / bức tường thực tại nứt → toàn nhân loại buộc thay đổi.',
    '  • Class system (job): MC chọn class hidden/rare (NPC class, system coder, gardener, janitor) — không generic kiếm sĩ/pháp sư.',
    '  • MC pragmatic survivor (NOT phế vật cliché): có não, có kế hoạch, có rebirth/foreknowledge phổ biến.',
    '  • Tier progression có quan trọng cảm: Đồng → Bạc → Vàng → Bạch Kim → Truyền Thuyết → Thần Thoại → Thần Cấp.',
    '  • Dungeon raid/Linh Vực = core gameplay loop. MỖI 5-10 chương 1 dungeon clear.',
    '  • National rankings + competition: bảng xếp hạng quốc tế, Olympic-style.',
    '  • Class user community: MC build team/studio/guild — không lone wolf.',
    '  • Anti-grind 2024+: bỏ "system báo nhiệm vụ ngày", thay "MC có thiên phú đặc biệt + chiến lược pragmatic".',
    '  • Modern tech + class fusion: MC dùng kiến thức khoa học/IT để optimize skill, build, route.',
    '  • Multi-dimensional escalation: Trái Đất → Hành tinh láng giềng → Ngân hà → Đa vũ trụ.',
    '  • Comedy 30-40%: cynical internal monologue + boast giả vờ thấp profile.',
    '  • Top examples: 《全球高武》, 《全球冰封》, 《全民转职：我有亿万亿亿之力》',
  ],

  'mo-phong': [
    'MÔ PHỎNG KHÍ (Simulator Gacha) PATTERNS:',
    '  • Cơ chế: MC có Hệ Thống Mô Phỏng — nạp tài nguyên (tiền/linh thạch/năng lượng) để chạy giả lập tương lai. Mô tả MC có thể xem trước cuộc đời mình ở các nhánh quyết định khác nhau.',
    '  • Vòng lặp 4 bước CỨNG (mỗi 3-5 chương 1 lần): (1) Setup — MC đứng trước khủng hoảng đời thực; (2) Gacha — rút 3-5 thiên phú ngẫu nhiên (đẹp trai + chỉ thu hút đàn ông = combo lệch hài hước); (3) Simulation Run — kết xuất Text Log nhịp nhanh ("Năm 18 tuổi: bạn gia nhập Thanh Vân Môn / Năm 20 tuổi: bạn bị đại sư huynh hạ độc / Bạn đã chết"); (4) Extraction — chọn 1 trong 3 phần thưởng (tu vi / ký ức / vật phẩm) đem về thực tế; (5) Real Execution — áp dụng bài học mô phỏng vào hiện thực.',
    '  • Sự sảng khoái = Information Asymmetry: MC biết trước kỳ ngộ + bóc trần âm mưu + tích lũy sống vạn năm trong giả lập. Sáng hôm sau MC bước ra "out trình" toàn bản đồ.',
    '  • Văn phong Text Log: dùng câu đơn liệt kê + nhịp cực nhanh khi mô phỏng. Đoạn mô phỏng 200-500 chữ. Sau đó back về văn phong bình thường khi MC quay lại đời thực.',
    '  • Mở rộng bối cảnh chi phí thấp: text log "Năm 30 tuổi, bạn rời đại lục đi thuyền 10 năm đến Nam Vực..." = mở map mới mà KHÔNG cần mô tả 10 chương du lịch.',
    '  • Anti-pattern: KHÔNG để mô phỏng giải quyết hết mọi vấn đề (otherwise no tension). Mô phỏng cho insight + skill, nhưng đời thực vẫn cần MC hành động + có rủi ro.',
  ],

  'linh-vuc-tuyet-doi': [
    'LĨNH VỰC TUYỆT ĐỐI / VÔ ĐỊCH LƯU (Absolute Domain Shop) PATTERNS:',
    '  • Cơ chế: trong bán kính Lãnh địa (100m² quanh quán ăn / tiệm sách / võ quán), MC là Thần. Bất kể đối thủ là Tiên Đế / Ma Tôn / Thần Linh, vào Lãnh địa đều bị tước sức mạnh + áp chế bằng 1 cái búng tay. Bước ra ngoài, MC chỉ là phàm nhân.',
    '  • Triết lý hành động: MC tử thủ ở nhà, KHÔNG ra ngoài. Cốt truyện tự "gõ cửa" tiệm — Thánh nữ bị truy sát chạy vào, Thiên tài trọng thương cầu cứu, đám sát thủ vô tình lao vào và bị xoá sổ.',
    '  • Vật phẩm "hàng chợ" hóa Thần Khí: MC bán lon Coca / mì gói / truyện manga giá rẻ Trái Đất. Trong mắt đại năng tu tiên: uống Coca = đột phá bình cảnh trăm năm; đọc manga = lĩnh ngộ kiếm pháp tuyệt thế. Mô tả CỤ THỂ phản ứng "thần thánh hóa" của khách hàng tu sĩ.',
    '  • Tăng trưởng theo ROI Lãnh địa: 100m² (1-50ch) → 1 vạn dặm (50-300ch, scale-up khi cần đè bẹp đại quân kẻ địch) → toàn tinh hệ (300+, MC trở thành Sáng Thế Thần).',
    '  • Cơ chế Gamification: thu thập điểm (qua kinh doanh / thu nạp đệ tử / gây sốc khách) để nâng cấp diện tích Lãnh địa + mở khu vực mới + mua vật phẩm hệ thống.',
    '  • Cấu trúc NPC dạng "Phiên giao dịch": khách bước vào tiệm (Session Start) → ngạc nhiên trước vật phẩm → mua hàng / bị vả mặt → bước ra (Session End). NPC KHÔNG cần xuất hiện lại — engine giải phóng bộ nhớ. MỖI khách = 1 mini-arc 2-5 chương.',
    '  • Anti-pattern: KHÔNG để MC chủ động đi tìm cốt truyện ngoài Lãnh địa (mất engine). KHÔNG cho phép Lãnh địa scale chậm hơn 100 chương / cấp.',
  ],

  'sang-the': [
    'SÁNG THẾ LƯU / SANDBOX CREATOR PATTERNS:',
    '  • Cơ chế: MC ở Trái Đất nhận được "Sa bàn" (bể cá / đa chiều trong vỏ hạt / trò chơi mô phỏng máy tính). Trong Sa bàn, MC là Đấng Tạo Hóa tuyệt đối + tua nhanh thời gian (1 ngày Trái Đất = 1 vạn năm trong Sa bàn).',
    '  • Cơ chế Thu hoạch: sinh vật trong Sa bàn tiến hóa → sáng tạo công pháp / phép thuật / công nghệ → MC trích xuất (copy) thành tựu để cường hóa bản thân ở Trái Đất.',
    '  • Cấu trúc 4 Kỷ nguyên (mỗi 50-100 chương): (1) Khởi nguyên Tế bào (đơn bào → đa bào → quái vật nguyên thủy); (2) Kỷ nguyên Thần thoại (sinh mệnh trí tuệ + công pháp + sử thi); (3) Xung đột + Reset (đại hồng thủy / thiên thạch quét sạch 99% sinh mệnh, mở Kỷ nguyên mới với hệ thống sức mạnh khác); (4) Đa Sa bàn + Xâm Lăng Hiện Thực.',
    '  • Văn phong "Biên Niên Sử": KHÔNG tả cảnh hai tên lính đánh nhau; tả "Năm Thánh Lịch thứ 1200, Vua Arthur dẫn kỵ binh rồng san phẳng phương Bắc, máu chảy thành sông". Sử thi, hùng tráng, macro-scale.',
    '  • Hàng duy đả kích (Dimensional Strike): Đại Đế tu 10 vạn năm trong Sa bàn 1 kiếm chẻ tinh hà → trong mắt MC chỉ to bằng con kiến. MC dùng ngón tay ấn xuống = hủy diệt cả kỷ nguyên. Tương phản kích thước = engine sảng văn.',
    '  • Quản trị Biến số (Variable Injection): MC bơm biến số vào Sa bàn (bệnh dịch / sách toán học hiện đại / chiếc điện thoại / cọng tóc) → AI nội suy ra sự sụp đổ hoặc thăng hoa văn minh. Mỗi biến số = 1 mini-arc tiến hóa văn minh.',
    '  • Engine Reset Memory: cứ sau 20-50 chương, MC tua nhanh 1 vạn năm — toàn bộ NPC kỷ nguyên cũ già chết. Engine clear context + nạp Prompt "Kỷ nguyên mới bắt đầu" → AI tự do sáng tạo lứa nhân vật mới mà không sợ hổng logic.',
  ],

  'hac-am-luu': [
    'HẮC ÁM LƯU / VILLAIN PROTAGONIST PATTERNS:',
    '  • MC định vị bản thân ở ĐỈNH chuỗi thức ăn. KHÔNG tình bạn đơn thuần — chỉ quan hệ lợi ích + trao đổi đồng giá. Trí tuệ + mưu mô luôn đi trước sức mạnh cơ bắp.',
    '  • Bàn tay vàng: "Hệ thống Cướp đoạt Khí Vận" hoặc "Hệ thống Bồi dưỡng Trùm Phản Diện". MC nhìn thấu các "Khí vận chi tử" (nhân vật được định mệnh sắp đặt làm anh hùng) + thấy điểm yếu của chúng.',
    '  • Triết lý "Trảm Thảo Trừ Căn": MC tuyệt đối không để lại hậu họa. KHÔNG cứu nhân độ thế bừa bãi. KHÔNG tha thứ kẻ đã gây hại.',
    '  • Khí vận chi tử (con mồi) phải được module hóa: Mẫu 1 (thiếu niên phế vật bị từ hôn nhặt được nhẫn lão gia gia) → MC chặn đường cướp nhẫn ngày đầu. Mẫu 2 (binh vương đô thị về làm vệ sĩ nữ tổng tài) → MC dùng tài chính + pháp lý nghiền nát thay vì đấu võ. Mẫu 3 (chuyển sinh giả) → MC dùng tư duy ép kẻ này khai bí mật tương lai rồi thủ tiêu.',
    '  • Hành động bằng tổ chức, không phải cá nhân: MC ngồi ghế sau xe đen, ra lệnh sát thủ / hacker dưới quyền xử lý. Sử dụng chiến tranh kinh tế / cắt chuỗi cung ứng / thao túng truyền thông để nội bộ kẻ thù tự tàn sát.',
    '  • Phong cách Minimalism: KHÔNG tả cảnh đánh nhau dông dài. Chuộng "Một kích tất sát" (One-hit kill) hoặc thủ tiêu trong im lặng. Cấu trúc văn bản gọn gàng, tối ưu token.',
    '  • Personality Lock cứng: MC tuyệt đối không "thánh mẫu hóa". Dù đối phương khóc lóc / quỳ gối / tự tử, phản ứng MC luôn là thờ ơ + dùng logic lợi ích để từ chối. Critic phát hiện vi phạm → REWRITE.',
    '  • Thiết kế Đế Chế: MC vận hành tổ chức kỷ luật cao (Yakuza / lính đánh thuê tư nhân / mafia syndicate). Cấp bậc rõ ràng. Quản trị tài nguyên tuyến tính: dòng tiền + nhân sự + cấp vũ khí + lãnh thổ kiểm soát.',
  ],

  'kim-bang-bo-quang': [
    'THIÊN ĐẠO KIM BẢNG / BỘC QUANG LƯU (Heavenly Dao Leaderboard / Exposure) PATTERNS:',
    '  • Cơ chế: MC đã cày "Cẩu Đạo" trong bóng tối đến mức vô địch vũ trụ, nhưng tuyệt đối không khoe. "Thiên Đạo" đột ngột giáng "Kim Bảng" (Bảng Xếp Hạng vàng) lên bầu trời cho toàn thế giới chiêm ngưỡng → bộc lộ thân phận MC ngoài ý muốn.',
    '  • Cấu trúc Listicle JSON: mỗi Bảng (Bảng Vũ Khí / Bảng Thú Cưỡi / Bảng Sát Thủ / Bảng Thế Lực Ngầm) là 1 mảng 10 mục. Top 100-11 = lão quái vật / hoàng đế / tông sư nổi tiếng. Top 10-1 = vô danh + toàn của MC.',
    '  • Vòng lặp tĩnh 3 bước (mỗi 5-15 chương): (1) Thiên Đạo Update Bảng Mới; (2) Thế Giới Reaction (chấn động ở Hoàng Cung / cảm thán ở Tửu lâu / tức giận của các môn phái); (3) Main Than Vãn ("Hệ thống rác rưởi lại bộc quang thẻ tẩy của ta"). Engine giải trí cao + chi phí compute thấp.',
    '  • Reaction Engine = 80% dung lượng truyện: cứ mỗi vị trí Top được công bố, sinh ra góc nhìn của 5-10 NPC (Kiếm Tôn sụp đổ đạo tâm, Thiếu nữ ngưỡng mộ, Thái tử ghen tị, Lão sư phụ thán phục). Tận dụng AI sinh content đa dạng nhân vật từ pre-trained knowledge.',
    '  • Cấu trúc 4 giai đoạn: (1) Bảng đầu tiên + bắt đầu nghi ngờ (1-50, manh mối nhỏ dẫn đến khu MC); (2) Bảng liên hoàn + bão táp (50-150, thiên tài liên minh tìm MC); (3) Bị ép xuất thủ (150-300, đại quân bao vây → MC phẩy tay = bốc hơi); (4) Kim Bảng Đa Vũ Trụ (300+).',
    '  • Anti-pattern: MC TUYỆT ĐỐI không chủ động khoe khoang. Bộc quang luôn là do Thiên Đạo / hệ thống / kẻ ngoài → MC chỉ phàn nàn thụ động. Đây là Personality Lock — Critic enforce.',
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
  // ── Anti-tragic-opening (TQ trend 2024-2026: "稳健流" / "暖开局" thay thế "凄惨开局") ──
  'CẤM "MC vừa xuyên không/trọng sinh đã ngất xỉu vì đói/lạnh/bị đánh/bị bán làm nô lệ" — modern trend là MC arrive WITH golden finger ACTIVATED, có ngay 1 thứ trong tay (shop, studio, squad, cheat function visible)',
  'CẤM "MC mất trí nhớ chương 1, không biết mình là ai" làm hook — đã chán, lazy worldbuilding',
  'CẤM "MC bị đuổi việc + nợ chồng chất + người yêu bỏ + mèo chết" cluster suffering làm trigger chương 1 — pile-on cringe, TQ đã reverse',
  'CẤM "MC bị truy sát ngoài hẻm tối / bị thủ đoạn lưu manh dập" trong 5 chương đầu — đây là combat drift cho non-combat genre, modern reader bỏ truyện ngay',
  'CẤM "MC tỉnh dậy ở dị giới với 0 tài nguyên, 0 kiến thức, phải tự lực từ con số 0" — modern isekai 2024-2026 MC arrive với INFRASTRUCTURE/INVENTORY/SYSTEM đã activated',
  'CẤM "5-10 chương đầu MC chỉ ăn cơm cám, ngủ đường, làm cu li" trước khi golden finger kích hoạt — golden finger PHẢI active từ chương 1, MC PHẢI có visible advantage ngay',
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
    case 'quy-tac-quai-dam':
      return POWER_SYSTEMS.rules_horror;
    case 'ngu-thu-tien-hoa':
      // Ngự thú: pet evolution là power system. Chưa có dedicated power system, dùng cultivation_standard với mô tả qua prompt
      return POWER_SYSTEMS.cultivation_standard;
    case 'khoai-xuyen':
      // Khoái xuyên: power system theo từng thế giới (modular). Default urban_system cho thế giới hiện đại, override qua prompt cho cổ đại/dị giới
      return POWER_SYSTEMS.urban_system;
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
const NON_COMBAT_GENRES: GenreType[] = ['do-thi', 'ngon-tinh', 'quan-truong', 'quy-tac-quai-dam'];

export function isNonCombatGenre(genre: GenreType): boolean {
  return NON_COMBAT_GENRES.includes(genre);
}

// Genres set in modern/parallel-world Vietnam where currency MUST be VND.
// Used by Critic to flag fake currency ("xu" / "nguyên" / "lượng vàng") that
// leaks from TQ webnovel templates into Vietnamese-set business stories.
// Excludes pure-fantasy worlds (huyen-huyen / tien-hiep / kiem-hiep) where
// "đồng vàng / linh thạch / bạc" are canonical.
const VND_CURRENCY_GENRES: GenreType[] = ['do-thi', 'quan-truong'];

export function requiresVndCurrency(genre: GenreType, worldDescription?: string | null): boolean {
  if (VND_CURRENCY_GENRES.includes(genre)) return true;
  // linh-di / lich-su CAN be Vietnam-set (Dân Quốc / Đại Việt) — sniff
  // the world description for VN markers to enable VND rule selectively.
  if (worldDescription && /Đại Nam|Hải Long Đô|Phượng Đô|Trung Đô|Sài Gòn|Hà Nội|Việt Nam|Dân Quốc|Đại Việt/i.test(worldDescription)) {
    return true;
  }
  return false;
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
    case 'quy-tac-quai-dam':
      // NON-COMBAT: dopamine = phá giải quy tắc giả + thoát phó bản + sống sót. ZERO combat.
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.knowledge_leverage, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.harvest];
    case 'ngu-thu-tien-hoa':
      // Pet evolution + collection: face_slap qua pet (chứ không phải MC), recognition khi pet đột biến trước đám đông
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.harvest];
    case 'khoai-xuyen':
      // Modular reset: dopamine = vạch trần khí vận chi tử + cứu vớt nguyên chủ + thu hoạch điểm Hub
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.knowledge_leverage, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.tears_of_regret, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.harvest];
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
  'ngu-thu-tien-hoa': {
    coreIdentity: 'Ngự Thú Tiến Hóa: Pokemon × Tu tiên × RPG. MC ngự thú sư có Bàn Tay Vàng nhìn thấu Tuyến Tiến Hóa Ẩn + công thức BOM, biến pet phế vật thành thần thú. Sảng văn Bất Đối Xứng Nhận Thức.',
    forbidden: [
      'MC tự tay đánh nhau như võ sĩ / kiếm khách (combat phải qua pet)',
      'Pet được "buff vô lý" không có công thức tiến hóa rõ — phải có data nhất quán',
      'Tu tiên cảnh giới đột phá MC (sai genre — tu tiên không phải ngự thú)',
      'Pet biến mất hoặc bị nâng cấp không qua công thức → thiếu nhất quán data',
    ],
    allowedExpansions: [
      'Học viện ngự thú / cấm khu thợ săn / gia tộc / thương nhân / VR game / cổ truyền',
      'Hệ thống đột biến BOM + pet evolution tree đa dạng',
      'Đa loại pet: thú/cá/chim/côn trùng/thực vật/khoáng/hồn/cơ giới/nguyên tố',
    ],
    driftWarnings: [
      'MC bắt đầu tự đánh nhau thay vì điều phối pet → drift sang tu tiên/võ hiệp',
      'Pet "thiên thần đẳng" thay vì có data tiến hóa rõ → mất bản sắc thể loại',
      'Combat tay đôi MC vs villain → đang drift sang fantasy combat',
    ],
  },
  'khoai-xuyen': {
    coreIdentity: 'Khoái Xuyên: MC nhân viên Hệ Thống Đa Vũ Trụ, mỗi 30-50 chương xuyên vào 1 thân phận mới (pháo hôi/villain) ở 1 thế giới khác để cứu vớt nguyên chủ. Modular episodic, reset cao.',
    forbidden: [
      'Nhân vật phụ thế giới cũ xuất hiện thế giới mới (trừ cặp đôi xuyên cùng / nguyên chủ tự ý thức)',
      'Khí vận chi tử (nguyên chủ chính nguyên tác) là "kẻ tốt thuần" — phải vạch trần đạo đức giả',
      'MC quên skill stacking giữa các thế giới → mất tính progression',
      'Thế giới kéo dài >55 chương → mất tính modular episodic',
    ],
    allowedExpansions: [
      'Đa thể loại thế giới: đô thị tổng tài, cung đấu cổ đại, mạt thế zombie, dị giới ma pháp, võng du VR',
      'Hub Space giữa các thế giới với NPC hệ thống có cá tính',
      'Cặp đôi xuyên cùng (linh hồn nhận ra linh hồn qua nhiều thân phận)',
      'Bù đắp tiếc nuối (slice-of-life cảm xúc, không vả mặt)',
    ],
    driftWarnings: [
      'Thế giới biến thành arc dài >60 chương → mất tính modular',
      'MC mất voice senior nhất quán, bị "đồng hóa" thành nguyên chủ → drift bản sắc',
      'Khí vận chi tử thành "đồng minh sau cùng" → mất engine sảng văn vả mặt',
    ],
  },
  'quy-tac-quai-dam': {
    coreIdentity: 'Quy Tắc Quái Đàm: phó bản đời thường biến dị, MC sinh tồn bằng tuân thủ + suy luận quy tắc thật/giả. Atmospheric horror, Uncanny Valley, KHÔNG combat vật lý.',
    forbidden: [
      'Pháp sư / đạo trưởng / thiên sư cao tay vung bùa giết ma',
      'Tu tiên cảnh giới / đột phá / luyện đan',
      'Kiếm khách / võ lâm / chiến đấu vật lý tay đôi',
      'Hầm mộ / nghĩa địa / quan tài / xác sống cổ điển',
      'Jump scare máu me, miêu tả "máu / xương / nội tạng" gratuitous',
      'MC dùng vũ khí (kiếm, dao, súng, bùa diệt ma) đánh chết quái vật',
    ],
    allowedExpansions: [
      'Đa dạng phó bản đời thường (văn phòng / metro / bệnh viện / chung cư / siêu thị / khách sạn / trường học / quán ăn đêm)',
      'Hệ thống điểm san trị (Sanity) + đạo cụ quỷ dị + mảnh vỡ quy tắc',
      'Crossover các "kẻ phá đảo" khác, tổ chức Quái Đàm hậu trường',
      'Yếu tố trinh thám / suy luận khi MC ghép manh mối quy tắc giả/thật',
    ],
    driftWarnings: [
      'MC bắt đầu vung kiếm/súng đánh quái vật → đang drift sang fantasy/horror combat',
      'Phó bản biến thành hầm mộ cổ / nghĩa địa → đang drift sang linh-di truyền thống',
      'MC tu luyện đột phá cảnh giới → đang drift sang tu-tiên',
      'Quái vật được mô tả như rồng / yêu / quỷ thay vì người-bình-thường-sai-1-chi-tiết → mất Uncanny Valley',
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
  'ngu-thu-tien-hoa': [
    'tiến hóa hoàn mỹ', 'huyết mạch viễn cổ thức tỉnh', 'cấp SSS bạo kích',
    'ngươi thật sự là phế vật', 'một con slime nhỏ nuốt rồng', 'thiên phú ẩn lộ ra',
    'nhìn xuyên quy luật vạn vật', 'pet của ta là vô địch', 'đột biến vượt khái niệm',
  ],
  'khoai-xuyen': [
    'hệ thống lại giáng task', 'khí vận chi tử lộ chân tướng', 'kịch bản nguyên tác đã sụp đổ',
    'đăng xuất khỏi thế giới này', 'pháo hôi không bao giờ đáng pháo hôi', 'cứu vớt thành công 100%',
    'đa vũ trụ thật là phiền', 'điểm hệ thống tăng vọt', 'tâm nguyện cuối cùng đã hoàn thành',
  ],
  'quy-tac-quai-dam': [
    'lạnh sống lưng', 'gáy tóc dựng đứng', 'một luồng khí lạnh chạy dọc',
    'không khí như đông cứng', 'thời gian như ngừng trôi', 'tim đập thình thịch trong lồng ngực',
    'cảm giác bị theo dõi', 'một dự cảm chẳng lành', 'âm thanh kỳ lạ vang lên',
    'bóng đen lướt qua khóe mắt', 'thứ gì đó không đúng', 'mọi thứ trông bình thường nhưng',
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
