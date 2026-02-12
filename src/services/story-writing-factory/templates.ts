/**
 * Story Writing Factory - Genre Templates
 *
 * Tinh hoa từ: _legacy/story-factory/genre-templates.ts
 * Chứa templates cho các thể loại, dopamine patterns, protagonist/antagonist types
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
};

// ============================================================================
// GOLDEN CHAPTER REQUIREMENTS (3 chương đầu)
// ============================================================================

export const GOLDEN_CHAPTER_REQUIREMENTS = {
  chapter1: {
    mustHave: [
      'Golden finger/hệ thống xuất hiện',
      'Xung đột ngay lập tức',
      'Mục tiêu rõ ràng của MC',
      'Demo sức mạnh tiềm năng',
      'Giới thiệu thế giới tự nhiên',
    ],
    avoid: ['Mở đầu chậm', 'Worldbuilding dump', 'MC passive'],
  },
  chapter2: {
    mustHave: [
      'Chiến thắng nhỏ đầu tiên',
      'Mở rộng hệ thống/sức mạnh',
      'Nhân vật mới xuất hiện',
      'Reward/thu hoạch đầu tiên',
      'Hook cho chapter tiếp',
    ],
    avoid: ['Chỉ training không action', 'Không tiến triển'],
  },
  chapter3: {
    mustHave: [
      'Thử thách thực sự',
      'Face-slap hoặc đánh bại kẻ coi thường',
      'Growth rõ ràng của MC',
      'Hint về plot lớn hơn',
      'Reader bị hook',
    ],
    avoid: ['Giải quyết quá dễ', 'Không stakes'],
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
    id: 'action_location',
    name: 'Hành Động + Địa Điểm',
    pattern: '[Hành động] [Tại/Ở] [Địa điểm]',
    examples: ['Huyết Chiến Vạn Thú Sơn', 'Đại Náo Vạn Bảo Lâu', 'Quyết Đấu Trên Sinh Tử Đài'],
    description: 'Gợi cảnh chiến đấu, thích hợp cho chương action',
  },
  {
    id: 'declaration',
    name: 'Tuyên Bố/Lời Nói',
    pattern: '"[Câu nói ấn tượng]"',
    examples: ['Ta Chính Là Luật Lệ', 'Ngươi Không Xứng', 'Từ Hôm Nay, Không Ai Được Động Vào Nàng'],
    description: 'Dùng lời thoại mạnh mẽ làm title, gợi tò mò ai nói',
  },
  {
    id: 'mystery_question',
    name: 'Câu Hỏi Bí Ẩn',
    pattern: '[Ai/Gì/Tại Sao] [Bí ẩn]?',
    examples: ['Ai Là Kẻ Phản Bội?', 'Bí Mật Của Huyết Ngọc', 'Thân Phận Thực Sự Của Lão Nhân'],
    description: 'Kích thích tò mò, thích hợp cho chương tiết lộ/twist',
  },
  {
    id: 'foreshadowing',
    name: 'Gợi Ý/Ám Thị',
    pattern: '[Hình ảnh ám chỉ sự kiện sắp tới]',
    examples: ['Bóng Tối Sau Cổng Thành', 'Cơn Bão Đang Đến', 'Máu Nhuộm Đỏ Hoàng Hôn'],
    description: 'Tạo bầu không khí, hint cho sự kiện lớn',
  },
  {
    id: 'turning_point',
    name: 'Bước Ngoặt',
    pattern: '[Sự kiện thay đổi cục diện]',
    examples: ['Sự Thật Về Huyết Mạch', 'Ngày Tông Môn Sụp Đổ', 'Lần Đột Phá Nghịch Thiên'],
    description: 'Thích hợp cho chương climax, major revelation',
  },
  {
    id: 'power_moment',
    name: 'Khoảnh Khắc Sức Mạnh',
    pattern: '[Chiêu thức/Cảnh giới/Sức mạnh mới]',
    examples: ['Thiên Lôi Diệt Thế', 'Kim Đan Thành Tựu', 'Nhất Kiếm Phá Vạn Pháp'],
    description: 'Gợi cảm giác sảng, power fantasy',
  },
  {
    id: 'character_focus',
    name: 'Nhân Vật Trọng Tâm',
    pattern: '[Tên nhân vật] + [Hành động/Trạng thái]',
    examples: ['Lâm Phong Trở Về', 'Nữ Đế Giáng Lâm', 'Sư Phụ Bí Ẩn Của Lão Quái'],
    description: 'Highlight nhân vật quan trọng, thích hợp giới thiệu nhân vật mới',
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
    examples: ['Phế Vật? Thiên Tài!', 'Kẻ Cứu Thế Hay Ác Ma', 'Ân Nhân Chính Là Kẻ Thù'],
    description: 'Tạo twist, gợi tò mò bằng mâu thuẫn',
  },
];

export const CHAPTER_TITLE_RULES = {
  // Quy tắc chung
  general: [
    'Tên chương phải NGẮN GỌN (3-10 từ), ẤN TƯỢNG, gợi TÒ MÒ',
    'KHÔNG dùng mẫu "X Và Sự Y" lặp đi lặp lại',
    'KHÔNG dùng mẫu "Sự [Danh từ] Của [Đối tượng]" quá 2 lần trong 20 chương',
    'Tên chương phải khiến người đọc MUỐN click vào đọc ngay',
    'Mỗi tên chương phải KHÁC BIỆT rõ ràng với các chương trước',
    'Ưu tiên: hành động cụ thể > miêu tả trừu tượng',
    'Có thể dùng: lời thoại, câu hỏi, hình ảnh mạnh, tương phản',
  ],

  // Anti-patterns cần tránh
  antiPatterns: [
    'X Và Sự Y (VD: "Linh Kiện Phế Thải Và Sự Sỉ Nhục")',
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
    action: ['action_location', 'power_moment', 'declaration'] as string[],
    revelation: ['mystery_question', 'turning_point', 'ironic_contrast'] as string[],
    cultivation: ['power_moment', 'turning_point', 'countdown_urgency'] as string[],
    romance: ['emotion_atmosphere', 'character_focus', 'foreshadowing'] as string[],
    tension: ['countdown_urgency', 'foreshadowing', 'mystery_question'] as string[],
    comedy: ['declaration', 'ironic_contrast', 'character_focus'] as string[],
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
    'Ít nhất 1 điểm dopamine (face-slap, đột phá, thu hoạch, recognition...)',
    'MC phải có ít nhất 1 tiến triển tích cực nhỏ (thu hoạch/tăng lợi thế/xóa nguy cơ)',
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
    powerFantasyLoop: {
      name: 'Vòng Lặp Sức Mạnh',
      description: 'Encounter → Bị khinh thường → Training/Cơ duyên → Đột phá → Thể hiện → Chấn kinh',
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
};

/**
 * Build title rules string for injection into AI prompts
 */
export function buildTitleRulesPrompt(previousTitles?: string[]): string {
  const titleExamples = TITLE_TEMPLATES
    .map(t => `  - ${t.name}: ${t.examples.slice(0, 2).join(', ')}`)
    .join('\n');

  const antiExamples = CHAPTER_TITLE_RULES.antiPatterns.slice(0, 5).join(', ');

  let prompt = `ĐỊNH HƯỚNG ĐẶT TÊN CHƯƠNG:
- Ưu tiên ngắn gọn 3-10 từ, gợi tò mò và có lực click
- Hạn chế dùng các mẫu nhàm chán sau: ${antiExamples}
- Có thể chọn 1 trong 10 mẫu đa dạng:
${titleExamples}
- VÍ DỤ TỐT: "Huyết Chiến Vạn Thú Sơn", "Ngươi Không Xứng!", "Phế Vật? Thiên Tài!", "Bóng Tối Sau Cổng Thành"
- VÍ DỤ NÊN TRÁNH: "Sự Sỉ Nhục Và Sự Trỗi Dậy", "Nghịch Lý Của Linh Áp", "Quy Luật Của Những Con Số", "X Và Sự Y"`;

  if (previousTitles && previousTitles.length > 0) {
    const recent = previousTitles.slice(-10);
    prompt += `\n- CÁC CHƯƠNG GẦN ĐÂY: [${recent.join(' | ')}]. Ưu tiên tránh lặp keyword hoặc pattern với chúng.`;
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
// Nguyên tắc: 1 scene = 1 chapter, expand don't summarize
// ============================================================================

export const SCENE_EXPANSION_RULES = {
  // Anti-speed rules - prevent rushing through plot
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

  // Pacing by scene type
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

  // Word count targets per scene type
  wordCountTargets: {
    'opening_scene': { min: 500, max: 800 },
    'beating_scene': { min: 800, max: 1200 },
    'despair_scene': { min: 800, max: 1200 },
    'dialogue_scene': { min: 600, max: 1000 },
    'transformation_scene': { min: 500, max: 800 },
    'cliffhanger_scene': { min: 200, max: 400 },
  },

  // Techniques for expansion
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
      example: 'Kẻ cưở nhạo, ngườ xót xa, kẻ quay đi, trẻ con sợ hãi',
    },
    {
      name: 'FlashbackIntercutting',
      description: 'Xen kẽ quá khứ',
      example: 'Khi bị đánh, nhớ về nụ cưới của mẹ, lờ hứa của cha',
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

  // Chapter 1 specific
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

  // Villain dialogue anti-cliché
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
      'Ếch ngời đáy giếng',
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

// Helper function to check if chapter follows câu chương rules
export function checkSceneExpansion(
  content: string,
  chapterNumber: number
): { valid: boolean; issues: string[]; wordCount: number } {
  const issues: string[] = [];
  const wordCount = content.split(/\s+/).length;
  
  // Check word count for chapter 1
  if (chapterNumber === 1) {
    if (wordCount < SCENE_EXPANSION_RULES.chapter1Rules.totalMinWords) {
      issues.push(`Chương 1 quá ngắn: ${wordCount} từ (cần ${SCENE_EXPANSION_RULES.chapter1Rules.totalMinWords}+)`);
    }
  }
  
  // Check for forbidden patterns
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
  
  // Check for cliché villain dialogue
  SCENE_EXPANSION_RULES.villainDialogue.forbidden.forEach(phrase => {
    if (content.toLowerCase().includes(phrase.toLowerCase())) {
      issues.push(`Phát hiện cliché villain: "${phrase}" - cần viết lại`);
    }
  });
  
  // Check for game-like system
  if (/\d+%.*\d+%.*100%/.test(content) || /Chúc mừng.*nhận được/i.test(content)) {
    issues.push('Phát hiện hệ thống game - cần viết lại theo phong cách kinh dị/huyền bí');
  }
  
  // Check for immediate revenge
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
