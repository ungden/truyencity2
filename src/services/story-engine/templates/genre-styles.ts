/**
 * Genre style configurations (Phase 28 TIER 2 — extracted from templates.ts).
 * Per-genre StyleBible: pacing/tone/dialogue ratio/POV preferences/etc.
 */

import type { GenreType, StyleBible } from '../types';

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
