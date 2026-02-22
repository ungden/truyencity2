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
    description: 'MC đánh bại kẻ coi thường mình',
    frequency: 'every_chapter',
    intensity: 'high',
    setup: 'Villain coi thường/xúc phạm MC',
    payoff: 'MC đánh bại villain ngoạn mục',
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
    setup: 'Bị ép giá, gặp rào cản kinh doanh hoặc đối thủ chèn ép',
    payoff: 'Lật ngược thế cờ, kiếm tiền sốc, thị trường kinh ngạc',
  },
  harvest: {
    type: 'harvest',
    name: 'Thu hoạch thành quả',
    description: 'Đạt được thành quả sau thời gian dài chăm sóc',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'Chăm sóc vất vả, chờ đợi hoặc có nguy cơ thất thu',
    payoff: 'Thu hoạch đột biến, sản phẩm chất lượng cao hiếm có',
  },
  flex_wealth: {
    type: 'flex_wealth',
    name: 'Thể hiện tài phú/IQ',
    description: 'Giải quyết vấn đề bằng tiền hoặc trí tuệ áp đảo',
    frequency: 'every_chapter',
    intensity: 'high',
    setup: 'Bị coi thường vì vẻ ngoài hoặc bị dồn vào góc',
    payoff: 'Dùng tiền hoặc IQ đập nát âm mưu, đối phương câm nín',
  },
  comfort: {
    type: 'comfort',
    name: 'Ấm áp/Chữa lành',
    description: 'Khoảnh khắc bình yên, thấu hiểu, đồ ăn ngon',
    frequency: 'every_chapter',
    intensity: 'medium',
    setup: 'Mệt mỏi, áp lực từ bên ngoài hoặc vết thương cũ',
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
      // Nhân vật mẫu
      'MC bắt đầu từ vị trí thấp nhất (phế vật, cô nhi, bị khinh thường) nhưng ẩn chứa tiềm năng vô hạn',
      'Villain thiếu gia kiêu ngạo xuất hiện mỗi arc để bị đánh mặt, mỗi lần cấp bậc cao hơn',
      'Lão quái/tiền bối ẩn thân chỉ điểm MC tại thời khắc quan trọng, rồi biến mất bí ẩn',
      'Nữ chính kiêu ngạo ban đầu khinh thường MC, dần bị thu phục bởi tài năng và nhân cách',
      // Tiến trình cốt truyện
      'Mỗi 5-10 chương MC phải đột phá 1 tiểu cảnh giới, mỗi 20-30 chương đột phá đại cảnh giới',
      'Cứ 3 chương phải có 1 trận chiến hoặc xung đột, mỗi arc kết thúc bằng đại chiến',
      'Bí cảnh/phế tích chứa cơ duyên xuất hiện mỗi arc, bên trong có thử thách + bảo vật',
      // Hệ thống sức mạnh
      'Tu luyện tuân theo quy luật: tích lũy → gặp nguy → lĩnh ngộ → đột phá, mỗi lần đột phá có thiên tượng dị thường',
      'Golden finger (hệ thống, lão gia trong nhẫn, huyết mạch thần thú) là động lực chính cho sự phát triển',
      // Leo thang xung đột
      'Kẻ thù leo thang: thiếu gia → gia tộc → tông phái → đế quốc → thần giới, mỗi cấp mạnh hơn vạn lần',
      'Đấu giá/thi đấu tournament là cơ hội để MC tỏa sáng trước đám đông và tạo thù oán mới',
      // Phụ tuyến & hook
      'Harem ngầm: mỗi arc giới thiệu 1 nữ nhân vật mới có background đặc biệt, tạo tình cảm mơ hồ',
      'Thân phận bí ẩn của MC được hint dần dần: manh mối nhỏ → tiết lộ sốc → thân phận chấn động thiên hạ',
      'Kết chương bằng cliffhanger: kẻ thù mới xuất hiện, bí mật lộ ra, nguy hiểm ập đến bất ngờ',
      'Thế giới mở rộng theo cảnh giới MC: thôn → thành → quốc → đại lục → tinh giới → thần giới',
      // Bổ sung: yếu tố còn thiếu
      'Phế vật → thiên tài setup phải dài tối thiểu 3 chương: bị khinh → tích lũy → bùng nổ, KHÔNG đột ngột',
      'Foreshadowing: mỗi arc plant ít nhất 2 seed cho arc tiếp theo (manh mối nhỏ về kẻ thù/bí mật lớn hơn)',
      'Side character phải có diễn biến riêng: huynh đệ có thể phản bội, sư muội có thể hy sinh, không chỉ phục vụ MC',
      'Đấu giá scene: miêu tả chi tiết giá cả, phản ứng đám đông, MC flex tiền/quyền lực khiến mọi người sốc',
      'Ngược → Sảng ratio: mỗi 5 chương có 1-2 chương MC gặp khó khăn thực sự trước khi chiến thắng ngoạn mục',
      // Exposition thông minh
      'Worldbuilding qua trải nghiệm: hệ thống sức mạnh, quy tắc thế giới phải được giải thích qua hành động, đối thoại, khám phá — KHÔNG dùng đoạn văn giải thích dài (info-dump)',
      // Multi-POV
      'Đa góc nhìn khi cần: scene phản diện bày mưu (POV villain), đám đông chứng kiến MC tỏa sáng (POV bystander), đồng minh phản ứng — tạo chiều sâu thế giới',
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
      // Nhân vật mẫu
      'MC có thể chất đặc biệt hoặc linh hồn chuyển sinh, mang tri thức/kinh nghiệm vượt trội',
      'Villain là thiên tài cùng thế hệ hoặc tà ma đạo cường giả, tạo áp lực liên tục cho MC',
      'Sư phụ/tiền bối ban đầu mạnh mẽ nhưng dần yếu đi hoặc hy sinh, MC phải tự lập',
      'Nữ chính là thiên kiêu nữ, có background tông phái/gia tộc khủng, bảo hộ MC giai đoạn đầu',
      // Tiến trình cốt truyện
      'Hệ sức mạnh rõ ràng với nhiều nhánh: thể tu, pháp tu, kiếm tu, đan sư, trận sư, luyện khí sư',
      'Tournament arc mỗi 15-25 chương: thi đấu tông phái, đại hội đan dược, tranh đoạt bí cảnh',
      'Mỗi arc có boss battle cuối cùng, quy mô tăng dần: 1v1 → nhóm chiến → đại chiến vạn người',
      // Hệ thống sức mạnh
      'Chiến đấu epic scale: miêu tả chiêu thức bằng hình ảnh vũ trụ, thiên địa đổi sắc, sơn hà chấn động',
      'MC có khả năng việt cấp chiến đấu: đánh thắng kẻ cao hơn 1-2 cảnh giới nhờ ngộ tính và cơ duyên',
      // Leo thang xung đột
      'Thế lực thù địch mở rộng: cá nhân → tông phái → vương triều → cổ tộc → thần tộc → thiên đạo',
      'Bí mật thế giới hé lộ dần: thế giới hiện tại chỉ là góc nhỏ, có thượng giới/thần giới đang quan sát',
      // Phụ tuyến & hook
      'Huynh đệ kết nghĩa giai đoạn đầu, sau này trở thành cường giả các phương, hội ngộ hoặc đối đầu',
      'Mỗi 10 chương giới thiệu 1 loại tài nguyên/bảo vật mới kích thích ham muốn sưu tập của người đọc',
      'Prophecy/lời tiên tri bí ẩn liên quan MC được hint từ đầu, giải mã dần qua các arc',
      'Kết chương bằng phát hiện sốc: kẻ thù thật sự, bí mật thân phận, nguy cơ mới lớn hơn',
      // Bổ sung
      'Rival phát triển song song MC: có đối thủ cùng thế hệ cũng mạnh lên, không chỉ villain tĩnh',
      'Foreshadowing network: plant seeds sớm (chương 5), harvest muộn (chương 30+), tạo "aha moment"',
      'Side character arc: ít nhất 1 nhân vật phụ có diễn biến riêng (phản bội, hy sinh, trưởng thành)',
      // Exposition thông minh
      'Worldbuilding qua khám phá: hệ thống ma pháp, quy tắc thế giới được MC và người đọc khám phá cùng lúc qua thử thách, đối thoại, không dùng đoạn văn giải thích',
      // Multi-POV
      'Đa góc nhìn khi cần: scene rival cùng thế hệ cũng đang nỗ lực (POV rival), hội trưởng bàn mưu đối phó (POV villain), quần chúng kinh ngạc (POV bystander)',
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
      // Nhân vật mẫu
      'MC có thân phận bí ẩn cực khủng: con rơi gia tộc đỉnh, binh vương trở về, thần y ẩn thế',
      'Villain là phú nhị đại/thiếu gia kiêu ngạo, dựa thế gia đình ức hiếp người, bị MC dạy dỗ',
      'Nữ chính là nữ tổng tài lạnh lùng hoặc mỹ nữ kiêu ngạo, dần phát hiện MC không đơn giản',
      'Nhạc phụ/nhạc mẫu ban đầu khinh thường MC, sau phải nể phục khi biết thân phận thật',
      // Tiến trình cốt truyện
      'Mỗi 3-5 chương có 1 tình huống đánh mặt: tiệc tùng, họp lớp, tiệc gia tộc, đấu thầu kinh doanh',
      'MC thể hiện tài năng đa dạng: y thuật thần kỳ, quyền cước siêu phàm, kinh doanh thiên tài, đầu tư bách phát bách trúng',
      'Plot mở rộng từ thành phố nhỏ → thủ đô → quốc tế, kẻ thù và stakes ngày càng lớn',
      // Hệ thống sức mạnh (đô thị style)
      'Sức mạnh MC đến từ chuyển sinh/hệ thống/tu luyện bí mật, giấu kín trong xã hội hiện đại',
      'MC có mạng lưới quan hệ khủng khiếp: quân đội, hắc đạo, tài phiệt đều nể mặt',
      // Leo thang xung đột
      'Kẻ thù leo thang: cá nhân vô lại → gia tộc địa phương → tập đoàn lớn → thế lực quốc gia → tổ chức quốc tế',
      'Mỗi lần MC giải quyết 1 kẻ thù, lộ ra kẻ đứng sau mạnh hơn, tạo chuỗi xung đột không ngừng',
      // Phụ tuyến & hook
      'Harem: mỗi nữ nhân vật có nghề nghiệp khác nhau (bác sĩ, cảnh sát, minh tinh, nữ sinh), tạo đa dạng',
      'Tiệc tùng/sự kiện xã hội là sân khấu để MC tỏa sáng, khiến kẻ khinh thường câm lặng',
      'Bí mật thân phận MC hé lộ từng phần: manh mối → nghi ngờ → xác nhận → chấn động',
      'Đời sống xa hoa miêu tả chi tiết: siêu xe, biệt thự, nhà hàng 5 sao, du thuyền, tạo cảm giác sảng',
      // Bổ sung
      'Status flex mỗi 10 chương: scene MC thể hiện tài sản/quyền lực trước mặt kẻ khinh thường, miêu tả chi tiết',
      'Nhạc phụ/nhạc mẫu arc: từ khinh thường → nghi ngờ → kinh ngạc → nể phục → tự hào, kéo dài 10-15 chương',
      'Foreshadowing cho thân phận: mỗi 5 chương drop 1 hint nhỏ (vết sẹo, kỹ năng lạ, quen biết bí ẩn)',
      'Ngược → Sảng: mỗi tiệc/sự kiện MC bị khinh trước → flex sau, KHÔNG cho MC flex ngay từ đầu',
      // Exposition thông minh
      'Kiến thức kinh doanh, y thuật, võ công được phổ cập tự nhiên qua đối thoại, hành động, tranh luận — KHÔNG có đoạn giải thích dài kiểu sách giáo khoa',
      // Multi-POV
      'Đa góc nhìn khi cần: scene thiếu gia bàn mưu hại MC (POV villain), nữ tổng tài quan sát MC (POV love interest), bạn bè/nhạc phụ kinh ngạc (POV bystander)',
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
    genreConventions: ['System/stats rõ ràng', 'Boss fights epic'],
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
    genreConventions: ['Callbacks tới original', 'Thay đổi số phận'],
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
    genreConventions: ['Stakes cao', 'Character deaths có thể'],
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
    genreConventions: ['Atmosphere quan trọng', 'Plot twists'],
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
    genreConventions: ['Chính trị phức tạp', 'Thăng tiến từng bước'],
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
    genreConventions: ['Worldbuilding quan trọng', 'Adaptation arc'],
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
      // Nhân vật mẫu
      'Nữ chính kiên cường nhưng dịu dàng, có nội tâm phong phú, không phải hoa bình yếu đuối',
      'Nam chính lạnh lùng bá đạo bề ngoài nhưng chỉ dịu dàng với nữ chính, sủng chiều vô điều kiện',
      'Nữ phụ xấu xa ghen tỵ tạo drama, hoặc bạn thân nữ chính tạo comic relief',
      'Tình địch nam là thiếu gia/hoàng tử si tình, theo đuổi nữ chính tạo tam giác tình cảm',
      // Tiến trình cốt truyện
      'Gặp gỡ → hiểu lầm → xung đột → hòa giải → yêu → thử thách → HE, mỗi giai đoạn 5-10 chương',
      'Mỗi 3-5 chương có 1 khoảnh khắc ngọt ngào (sweet moment) khiến người đọc rung động',
      'Hiểu lầm/chia ly tạm thời mỗi 15-20 chương để kéo tension, nhưng PHẢI giải quyết thỏa đáng',
      // Relationship dynamics
      'Tình cảm phát triển qua chi tiết nhỏ: ánh mắt, cử chỉ vô tình, lời nói hai nghĩa, bảo hộ thầm lặng',
      'Cảnh lãng mạn miêu tả tinh tế: không explicit nhưng gợi cảm, tập trung vào cảm xúc nội tâm',
      // Leo thang xung đột
      'Xung đột từ hiểu lầm cá nhân → gia đình phản đối → thế lực chia rẽ → sinh ly tử biệt → đoàn viên',
      'Mỗi lần giải quyết xung đột, tình cảm sâu đậm hơn, nhưng thử thách mới cũng nặng hơn',
      // Phụ tuyến & hook
      'Gia đình/sự nghiệp là phụ tuyến quan trọng: nữ chính phải chứng minh bản thân, không chỉ yêu đương',
      'Bí mật thân phận: nữ chính/nam chính có quá khứ bí ẩn ảnh hưởng đến mối quan hệ hiện tại',
      'Cảnh sủng (pampering): nam chính bảo hộ/chiều chuộng nữ chính trước mặt mọi người, tạo cảm giác sảng',
      'Kết chương bằng hiểu lầm mới, xuất hiện tình địch, hoặc tin sốc về quá khứ ảnh hưởng tình yêu',
      // Bổ sung
      'Nữ chính phải có depth: có sự nghiệp riêng, quyết định riêng, không chỉ xoay quanh nam chính',
      'Side character có arc riêng: bạn thân có tình yêu riêng, nữ phụ có kết cục rõ ràng (không bỏ lửng)',
      'Emotional variety: không chỉ ngọt ngào, cần xen kẽ căng thẳng, đau lòng, hài hước, rung động',
      // Multi-POV
      'Đa góc nhìn khi cần: scene nam chính suy nghĩ về nữ chính (POV male lead), nữ phụ ghen tuông bày mưu (POV rival), bạn thân quan sát tình cảm (POV friend)',
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
    'Cliffhanger hoặc strong ending cuối chương',
    'Duy trì độ hấp dẫn qua tension, mystery, phát triển nhân vật hoặc worldbuilding (KHÔNG bắt buộc dopamine mỗi chương)',
    'MC phải có ít nhất 1 khoảnh khắc đáng nhớ (quyết định chiến lược, khám phá, đối thoại sâu hoặc tiến triển nhỏ)',
    'Ít nhất 1 chi tiết worldbuilding nhỏ (mở rộng thế giới)',
    'Emotional contrast: cảm xúc phải thay đổi ít nhất 1 lần trong chương',
  ],

  // Yếu tố BẮT BUỘC mỗi 5 chương
  per5Chapters: [
    'MC phải có tiến bộ rõ ràng (sức mạnh, địa vị, hoặc relationship)',
    'Ít nhất 1 face-slap hoặc power reveal moment',
    'Không được có chuỗi 3 chương liên tiếp chỉ thua thiệt hoặc bị đè nén',
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
      description: 'Setup: kẻ thù coi thường → MC ẩn nhẫn → Kẻ thù ra tay → MC nghiền nát → Bàng quan kinh ngạc',
      frequency: 'Mỗi 2-3 chương có 1 lần minor, mỗi arc có 1 lần major',
      escalation: 'Quy mô tăng dần: cá nhân → nhóm → gia tộc → tông phái → quốc gia',
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

  // Nguyên tắc "ngược trước sảng sau"
  adversityToTriumphRatio: {
    description: 'Mỗi victory phải được build bằng adversity trước đó',
    idealRatio: '20% ngược (MC gặp khó) → 80% sảng (MC tiến bộ/chiến thắng/được tôn trọng)',
    rule: 'Ưu tiên tránh chuỗi thua kéo dài; nếu có adversity thì nên có minor win hoặc cửa thoát sớm',
    antiPattern: 'MC thắng liên tục không gặp khó khăn = nhàm chán, mất tension',
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
 * Build title rules string for injection into AI prompts
 */
export function buildTitleRulesPrompt(previousTitles?: string[]): string {
  const titleExamples = TITLE_TEMPLATES
    .map(t => `  - ${t.name}: ${t.examples.slice(0, 2).join(', ')}`)
    .join('\n');

  const antiExamples = CHAPTER_TITLE_RULES.antiPatterns.slice(0, 5).join(', ');

  let prompt = `QUY TẮC ĐẶT TÊN CHƯƠNG (BẮT BUỘC):
- Ngắn gọn 3-10 từ, gợi tò mò, có lực click
- CẤM TUYỆT ĐỐI lặp lại hoặc tương tự bất kỳ tên chương nào đã viết trước đó
- CẤM dùng các mẫu nhàm chán: ${antiExamples}
- Mỗi tên chương phải là DUY NHẤT — không được trùng keyword chính với chương trước
- Nếu 2 từ khóa chính trùng với tên chương cũ → ĐỔI NGAY
- Có thể chọn 1 trong 10 mẫu đa dạng:
${titleExamples}
- VÍ DỤ TỐT: "Huyết Chiến Vạn Thú Sơn", "Ngươi Không Xứng!", "Phế Vật? Thiên Tài!", "Bóng Tối Sau Cổng Thành"
- VÍ DỤ NÊN TRÁNH: "Sự Sỉ Nhục Và Sự Trỗi Dậy", "Nghịch Lý Của Linh Áp", "Quy Luật Của Những Con Số", "X Và Sự Y"`;

  if (previousTitles && previousTitles.length > 0) {
    const allTitles = previousTitles;
    prompt += `\n\n⚠️ DANH SÁCH TẤT CẢ TÊN CHƯƠNG ĐÃ DÙNG (CẤM LẶP LẠI):
[${allTitles.join(' | ')}]

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
    case 'kiem-hiep':
      return POWER_SYSTEMS.martial_world;
    case 'do-thi':
    case 'vong-du':
    case 'mat-the':
      return POWER_SYSTEMS.urban_system;
    default:
      return POWER_SYSTEMS.cultivation_standard;
  }
}

export function getDopaminePatternsByGenre(genre: GenreType): DopaminePattern[] {
  const common = [DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.power_reveal];

  switch (genre) {
    case 'tien-hiep':
    case 'huyen-huyen':
      return [...common, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain];
    case 'do-thi':
      return [...common, DOPAMINE_PATTERNS.beauty_encounter, DOPAMINE_PATTERNS.recognition];
    case 'mat-the':
      return [...common, DOPAMINE_PATTERNS.treasure_gain];
    default:
      return common;
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
  ],
  guidance: 'Thay vì dùng các từ cấm, hãy MÔ TẢ hệ quả của chúng. Ví dụ: thay vì "hít một ngụm khí lạnh", tả "sắc mặt tái nhợt, lùi lại nửa bước". Thay vì "đột nhiên", tả trực tiếp âm thanh/hình ảnh cắt ngang.',
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
