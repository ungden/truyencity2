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
