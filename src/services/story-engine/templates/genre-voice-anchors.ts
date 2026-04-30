/**
 * Genre Voice Anchors — bestseller-grade prose samples per genre.
 *
 * Embedded into WRITER_SYSTEM and ARCHITECT_SYSTEM at runtime so the model has
 * a concrete target to match — not just a list of "CẤM X / CẤM Y" rules.
 *
 * Samples are written to mimic the prose register of the top contemporary TQ
 * webnovel each genre cluster aspires to:
 *   tien-hiep / kiem-hiep    → 大奉打更人, 我師兄實在太穩健了, 詭祕之主 (cultivation arc)
 *   huyen-huyen              → 萬族之劫, 全職法師, 詭秘之主 (lord-of-mysteries voice)
 *   do-thi / quan-truong     → 學霸的黑科技系統, 重生之神級學霸, 官場之風雲人物
 *   mat-the                  → 末日:無限資源 / 末世:囤積百億物資
 *   linh-di / quy-tac-quai-dam → 詭異復甦, 死亡循環, 規則怪談
 *   ngon-tinh                → 偷偷藏不住, 你是我的榮耀, 何以笙簫默
 *   di-gioi                  → 異世界悠閒農家, 異世界藥局, 轉生史萊姆
 *   ngu-thu-tien-hoa         → 寵獸進化, 神獸契約, 最強獸控
 *   khoai-xuyen              → 快穿:炮灰女配逆襲, 快穿之打臉狂魔
 *   khoa-huyen               → 學霸的黑科技 (sci-fi side), 諸界第一因
 *   vong-du                  → 全職高手, 網游之天下無雙
 *   lich-su                  → 慶餘年, 大明王朝1566, 雪中悍刀行
 *   dong-nhan                → 漫威之我有一座神級舞台, 火影之最強白絕
 *
 * Each sample is calibrated to ~150-200 từ — long enough to anchor voice,
 * short enough to fit in system prompt overhead (~250 tokens) without bloating
 * per-call cost.
 *
 * Usage: getVoiceAnchor(genre) returns a structured anchor block for injection.
 */

import type { GenreType } from '../types';

export interface VoiceAnchor {
  /** What makes this voice distinct — one-line characterization. */
  voiceNotes: string;
  /** 150-200 từ prose sample showing target rhythm + register + vocab. */
  voiceAnchor: string;
  /** 60-80 từ example of how chương 1 opens (warm baseline + immediate hook). */
  chapterOneHook: string;
  /** 60-80 từ example of a dopamine moment (face-slap / competence / harvest). */
  dopamineMoment: string;
}

const ANCHORS: Record<GenreType, VoiceAnchor> = {
  // ── CULTIVATION ──────────────────────────────────────────────────────────
  'tien-hiep': {
    voiceNotes: 'Cổ phong + tu tiên jargon. Câu trầm, ít cảm thán. Nội tâm kiềm chế. Dùng "y/hắn/tiểu tử" thay "anh".',
    voiceAnchor: `Tô Mục mở mắt. Đan điền trống rỗng — không một sợi linh khí. Hắn ngồi dậy trên giường gỗ cũ, đưa tay sờ ngực: trái tim còn đập, nhưng huyết mạch chậm như nước đông.\n\nNgoài cửa sổ, sương sớm phủ trên đỉnh núi Thanh Vân. Đệ tử ngoại môn đã ra sân tập kiếm. Tiếng kim loại va vào nhau lạnh buốt, đều đặn như nhịp tim của ai đó còn sống.\n\nHắn nhìn xuống bàn tay. Da gầy, ngón thon — không phải tay người luyện võ. Trí nhớ của thân thể này từ từ trào lên: con thứ ba của Tô gia, ba lần thi nhập môn đều rớt, vừa qua đời tối qua vì uất ức. Tô Mục — kiếp trước Kim Đan trưởng lão, kiếp này phế đan điền.\n\nHắn khẽ cười. Một nụ cười không có ý nghĩa với bất kỳ ai khác.\n\n— Phế đan điền hay không, ta cũng đã từng đăng đỉnh.`,
    chapterOneHook: `Tô Mục mở mắt giữa tiếng chuông sớm của núi Thanh Vân. Đan điền trống rỗng — phế nhân. Nhưng trí nhớ tu tiên của kiếp trước, hắn vẫn nhớ rõ từng đường vận khí, từng lò đan, từng kẻ đã hại mình ba trăm năm trước.`,
    dopamineMoment: `Trưởng lão Lý Bình nhặt viên đan dược lên, nhăn mày: "Đan này... phẩm tam phẩm, nhưng dược lực vượt qua tứ phẩm." Lão nhìn Tô Mục, ánh mắt từ khinh thường chuyển thành nghi hoặc — không, là hoảng hốt. "Ngươi... ngươi nói ngươi tự luyện?"\nTô Mục gật đầu, không giải thích thêm.`,
  },

  'kiem-hiep': {
    voiceNotes: 'Giang hồ + nghĩa khí. Câu chắc, hành động cụ thể. Ít tu tiên jargon, nhiều "chiêu thức/võ công". Khí khái cao.',
    voiceAnchor: `Lý Tầm Hoan đặt vò rượu xuống mép bàn, ngón tay khẽ gõ ba tiếng. Quán trọ Bạch Vân chiều mưa thưa khách. Ngoài cửa, vó ngựa bùn lép nhép — bốn người, kiếm dài đeo lưng, áo đen.\n\nTiểu nhị nuốt nước bọt: "Khách quan, có lẽ ngài nên đi cửa sau."\n\nLý Tầm Hoan rót cho mình một chén. Rượu Trúc Diệp Thanh, vị nhạt, hơi đắng. Hắn uống cạn, đặt chén xuống.\n\n— Cửa sau ướt. Ta đi cửa trước.\n\nKhi bốn người áo đen đẩy cửa bước vào, tay đã đặt trên chuôi kiếm. Người đứng đầu lên tiếng, giọng khàn:\n\n— Tiểu Lý phi đao, Tô đại ca cho người gửi ngươi mấy lời.\n\nLý Tầm Hoan cười, không đáp. Tay phải hắn vẫn cầm chén rượu. Tay trái không thấy đâu.`,
    chapterOneHook: `Mưa gió quán Bạch Vân, Lý Tầm Hoan ngồi một mình uống rượu. Bốn kiếm khách áo đen vừa đẩy cửa vào — chưa kịp rút kiếm, ba người đã ngã xuống. Phi đao của hắn nhanh đến mức cả tiếng gió cũng chưa kịp vang lên.`,
    dopamineMoment: `Tô Hữu Bằng nhìn lưỡi đao găm vào cột gỗ, cách cổ mình đúng một thốn. Tay run, mồ hôi lạnh chảy dọc sống lưng. Lý Tầm Hoan đã đứng dậy, uống chén rượu cuối cùng:\n— Đao thứ hai sẽ không trật.\nCả tửu lâu im phăng phắc.`,
  },

  // ── EPIC FANTASY ─────────────────────────────────────────────────────────
  'huyen-huyen': {
    voiceNotes: 'Hùng tráng + thiên địa rộng lớn. Câu dài hơn tien-hiep, bối cảnh hoành tráng. "Đại đế/chí tôn/cổ tộc". Power scale visible.',
    voiceAnchor: `Vực Hắc Diệp dài ba vạn dặm. Phía Tây là Cấm Khu — nơi một vị Đại Đế đã tử chiến với Thiên Đạo ngàn năm trước, máu thấm vào đá núi đến nay vẫn còn ấm. Phía Đông là Vạn Tộc Liên Minh, năm mươi gia tộc cổ xưa cùng giữ một bí mật đã chôn sâu hàng vạn năm.\n\nLâm Hạo đứng trên đỉnh Vọng Thiên Phong, áo trắng phất trong gió. Đan điền hắn chỉ có Luyện Khí cảnh — cấp thấp nhất trong tu giới — nhưng trong bàn tay, một mảnh xương cốt cổ xưa đang phát ra ánh sáng huyết hồng.\n\n— Mảnh xương này... — hắn lẩm bẩm — không phải của người thường.\n\nDưới chân núi, đoàn xe bảy chiếc dừng lại. Một bóng người mặc áo bào tím bước xuống — Tử Y Hầu của Vạn Tộc Liên Minh, ngũ phẩm Kim Đan. Hắn ngẩng đầu, ánh mắt sắc như dao khắc đá:\n\n— Tiểu tử trên núi, mảnh xương đó là của tổ tiên ta. Trả lại, ta tha mạng.`,
    chapterOneHook: `Lâm Hạo nhặt được mảnh xương phát quang trong hang Hắc Diệp. Vừa cầm lên, năm mươi tộc trưởng cổ xưa toàn bộ Vạn Tộc Liên Minh đồng loạt mở mắt — sau ba ngàn năm bế quan.`,
    dopamineMoment: `Tử Y Hầu vung kiếm, ngũ phẩm Kim Đan toàn lực. Lâm Hạo không né. Mảnh xương trong tay tỏa sáng đỏ, kiếm khí va vào — vỡ vụn như bụi.\nCả đoàn xe quỳ xuống. Tử Y Hầu mặt trắng bệch:\n— Cổ... cổ tộc đại nhân... ngài là...?`,
  },

  // ── MODERN URBAN ─────────────────────────────────────────────────────────
  'do-thi': {
    voiceNotes: 'Hiện đại + ngắn gọn. Câu punchy. System pop-up dialogue. Numbers cụ thể (giá tiền, số liệu). MC pragmatic.',
    voiceAnchor: `Trần Vũ tắt báo thức lúc năm giờ rưỡi. Phòng trọ tầng hai, đường Nguyễn Huệ. Bếp gas mini, một chảo gang, một thớt gỗ ngả màu nâu sậm vì dùng lâu năm.\n\nHôm nay năm suất cơm hộp. Khách quen ba phòng kế toán Saigon Future Tower, một anh shipper, một chị lễ tân. Lãi hai mươi nghìn một suất.\n\nĐiện thoại rung. Tin nhắn Zalo: "Em ơi, có cơm gà xé chưa?"\n\nHắn nhìn vào nồi, nhăn mày. Gà còn — nhưng nước sốt đặc quá. Theo công thức trong ứng dụng *Hệ Thống Đô Thị* mở sáng nay, độ sệt phải cách nhau hai centimet trên muỗng. Hắn đang ở ba.\n\nThêm muỗng nước dùng. Đảo đều. Hai centimet. Đúng.\n\nMùi gà thơm phả ra. Trên màn hình điện thoại cũ Samsung J7 nứt mặt kính, một thông báo nhỏ hiện lên:\n\n*Kỹ năng Nấu Nướng Sơ Cấp +0.3 điểm.*\n\nHắn cười. Hôm nay là một ngày tốt.`,
    chapterOneHook: `Năm giờ rưỡi sáng đường Nguyễn Huệ, Trần Vũ tắt báo thức. Hôm qua, ứng dụng lạ tự cài lên Samsung cũ — *Hệ Thống Đô Thị*. Hôm nay, hắn vừa đảo nồi gà xé, hệ thống thông báo: "Khách hàng tiếp theo sẽ trả tiền tip 200K."`,
    dopamineMoment: `Anh khách Phạm Minh nếm miếng cơm gà, đặt thìa xuống. Im lặng năm giây. Rồi hắn rút điện thoại, gọi:\n— Anh Thắng à, mai đặt 200 suất cho hội nghị nhân viên. Đúng quán này. Không, không có đối thủ — đây là cấp đầu bếp khách sạn năm sao.\nTrần Vũ ghi đơn, tay chỉ hơi run.`,
  },

  'quan-truong': {
    voiceNotes: 'Chính trị + thứ bậc. Câu thoại cẩn trọng, subtext nặng. Chức danh đầy đủ. KHÔNG combat, conflict qua văn bản/cuộc họp/báo cáo.',
    voiceAnchor: `Phòng Phó Bí Thư Huyện Ủy lúc tám giờ sáng. Cửa khép, điều hòa hai mươi lăm độ, trên bàn ba bộ hồ sơ và một ấm trà sen Tây Hồ.\n\nLý Trưởng Khang đặt cuốn báo cáo xuống mặt bàn, nhìn thẳng vào Bí Thư Trần Hải.\n\n— Anh Hải, vụ đất Khu Công Nghiệp Đông Sơn — em đã đọc kỹ. Có ba điểm.\n\nTrần Hải rót trà, không ngẩng đầu:\n— Ba điểm gì?\n\n— Thứ nhất, định giá đất chênh ba mươi phần trăm so với thị trường. Thứ hai, công ty trúng thầu mới thành lập sáu tháng, chưa có dự án tham chiếu. Thứ ba — Khang dừng, gập tay — chữ ký phê duyệt của em là chữ ký giả.\n\nKhông gian im lặng. Trần Hải đặt ly trà xuống, từ tốn. Mép môi co một chút.\n\n— Khang à, em mới về huyện sáu tháng. Có những việc... em chưa hiểu hết.\n\nKhang đứng dậy, gật đầu:\n— Em hiểu. Nhưng em đã gửi báo cáo lên Tỉnh Ủy lúc bảy giờ sáng nay.`,
    chapterOneHook: `Lý Trưởng Khang nhậm chức Phó Bí Thư Huyện Sơn Đông tuần trước. Sáng nay, hắn phát hiện chữ ký giả trong hồ sơ đất Khu Công Nghiệp — ký tên chính Bí Thư Huyện. Bảy giờ sáng, báo cáo đã lên đến Tỉnh.`,
    dopamineMoment: `Cuộc họp Thường Vụ. Tỉnh Ủy gọi tên Lý Trưởng Khang trước hội đồng:\n— Đồng chí Khang, báo cáo Đông Sơn của đồng chí — chính xác từng con số, từng chữ ký. Tỉnh ủy quyết định: thanh tra toàn diện huyện Sơn Đông, bắt đầu hôm nay.\nTrần Hải ngồi đối diện, mặt không biểu cảm. Nhưng tay phải gõ nhẹ ba lần lên bàn.`,
  },

  // ── HISTORICAL ───────────────────────────────────────────────────────────
  'lich-su': {
    voiceNotes: 'Cổ phong văn ngôn. Câu dài, dùng "trẫm/khanh/thần/chức". Triều đình + cung đấu + chiến lược. Chậm, nặng nề.',
    voiceAnchor: `Năm Càn Long thứ mười bảy, Tô Trọng Ngạn từ Hàn Lâm Viện về phủ Thượng Thư. Trời tháng chín Bắc Kinh, lá ngô đồng vàng rụng đầy ngõ.\n\nNgạn vén áo bước vào thư phòng cha. Tô Đại Học Sĩ — Tô Bá Khắc — đang viết tấu chương, không ngẩng đầu:\n— Hôm nay vào triều, Hoàng Thượng có hỏi về vụ Hà Bắc?\n\n— Có. — Ngạn cúi người chào, đứng tránh hai bước — Hoàng Thượng hỏi: "Tô khanh trẻ tuổi, ngươi nghĩ thế nào?"\n\nTô Bá Khắc đặt bút xuống. Lần đầu trong ba ngày, lão nhìn con trai trực diện.\n\n— Ngươi đáp gì?\n\n— Thần đáp: Thiên hạ chi sự, không ở Hà Bắc một châu. Ở chỗ thuế đất chưa định, quan binh chưa luyện, lương thảo chưa đủ.\n\nMột khoảnh khắc dài. Rồi Tô Bá Khắc cười khẽ:\n— Ngươi nói câu đó trước Hoàng Thượng?\n\n— Vâng.\n\n— Vậy là ngươi đã quyết định đứng về phe Hòa Thân rồi. Tốt. Cha vẫn còn cứu được ngươi.`,
    chapterOneHook: `Năm Càn Long thứ mười bảy, Tô Trọng Ngạn — tân khoa Trạng Nguyên — vào triều ngày đầu tiên. Hoàng Thượng hỏi về Hà Bắc, hắn đáp một câu ngắn — đủ để cha hắn, Đại Học Sĩ Tô Bá Khắc, hiểu rằng đứa con trai đã chọn phe.`,
    dopamineMoment: `Hoàng Thượng đọc tấu chương của Tô Trọng Ngạn, ngẩng đầu nhìn Hòa Thân, cười:\n— Hòa Khanh, Tô khanh đề xuất pháp Quân Điền cải lương. Khanh đọc kỹ chưa?\nHòa Thân cúi đầu:\n— Thần đã đọc. Sách lược... thiên hạ vô song.\nMặt lão tái đi một chút. Tô Trọng Ngạn đứng phía sau, không cười.`,
  },

  // ── SCI-FI ───────────────────────────────────────────────────────────────
  'khoa-huyen': {
    voiceNotes: 'Khoa học + viễn tưởng. Hard sci-fi terms cụ thể. AI/lab/tech corp. Ít tu tiên, nhiều kỹ thuật. Câu chính xác.',
    voiceAnchor: `Phòng Lab 7, Tầng B3, Viện Nghiên Cứu Sinh Học Phượng Đô. Hai giờ sáng, đèn LED trắng. Trần Hạo nhìn vào màn hình hiển vi điện tử — phân tử CRISPR-Cas9 cải tiến đang gắn vào sợi DNA chuột thí nghiệm.\n\nThời gian gắn: 0.003 giây. Hiệu suất: 99.7%.\n\nKỷ lục thế giới hiện tại: 0.04 giây, 78%.\n\nHắn không ăn mừng. Chỉ ghi vào sổ tay: *Lần thứ 41. Thành công.* Đóng nắp.\n\nĐiện thoại rung. Tin nhắn từ Giáo sư Lê: "Hạo, Mỹ vừa công bố — họ đạt 0.05 giây, 80%. Báo chí đang gọi đó là đột phá thế kỷ. Chúc mừng họ."\n\nTrần Hạo nhìn dòng tin, không đáp. Hắn lưu kết quả vào ổ cứng cá nhân, mã hóa hai lớp. Rồi bật ứng dụng *Hệ Thống Khoa Học* trên điện thoại — giao diện tối giản, không quảng cáo. Trên màn hình, một thông báo:\n\n*Phát hiện đối thủ tiềm năng. Đề xuất công bố nghiên cứu công khai để chiếm thế dẫn đầu? [Có / Không]*\n\nHắn chọn Không. Còn quá sớm.`,
    chapterOneHook: `Hai giờ sáng phòng lab Viện Phượng Đô, Trần Hạo vừa hoàn thành lần thí nghiệm thứ 41 — gắn CRISPR vào DNA chuột trong 0.003 giây, hiệu suất 99.7%. Cả thế giới chưa ai đạt nổi 0.05 giây. Hệ thống trong điện thoại hắn nháy: "Đề xuất giấu kỹ — chưa phải lúc."`,
    dopamineMoment: `Hội nghị Nature Genetics, San Francisco. Đại diện MIT đứng dậy:\n— Tôi muốn hỏi tác giả paper "Sub-millisecond CRISPR" — chỉ số 99.7% có thật không? Đây là... không thể.\nTrần Hạo, hai mươi sáu tuổi, cười nhẹ qua màn hình. Không đáp. Hắn click chuột. Trên slide hiện ra video real-time — thí nghiệm đang chạy live tại Phượng Đô.\nCả phòng họp 3000 người im phăng phắc.`,
  },

  // ── GAMING ───────────────────────────────────────────────────────────────
  'vong-du': {
    voiceNotes: 'Game UI integration. System messages. Party chat. Damage numbers. Ranking ladder. PvP/PvE strategy.',
    voiceAnchor: `Server *Cửu Châu Online*, sáng thứ Bảy. Trần Vũ login lúc bảy giờ sáng — sớm hơn cả guild master.\n\nBản đồ Hắc Lâm Vực, level 50-60 zone. Hắn — nhân vật "Vô Danh Kiếm Khách", level 47, chuyên Kiếm Sĩ, không guild — đứng trước cổng Boss Hắc Long.\n\nBoss này, theo wiki, cần party 8 người, full level 60+, drop rate kiếm thần thoại 2%.\n\nHắn đứng một mình.\n\n*[Hệ thống] Bạn đã vào Hắc Long Lãnh Địa. Đề xuất rời ngay.*\n\nHắn skip pop-up, rút kiếm. Skill bar: ba kỹ năng cơ bản, một skill ultimate đang cooldown.\n\nNhưng hắn có một thứ wiki không biết — kỹ năng ẩn "Phản Sát". Activate khi HP dưới 1%, sát thương x100, một lần per ngày.\n\nHắn lao vào Boss. HP bay xuống 100% → 50% → 10% → 1%.\n\n*[Phản Sát kích hoạt]*\n\nMàn hình toàn server hiện thông báo đỏ:\n*Player "Vô Danh Kiếm Khách" đã solo Boss Hắc Long. Reward: Kiếm Hắc Long Nghịch Lân (legendary).*\n\nGuild chat toàn server bùng nổ.`,
    chapterOneHook: `Server Cửu Châu Online giờ thứ ba sau khi mở, Trần Vũ — tài khoản "Vô Danh Kiếm Khách" — solo Boss Hắc Long mà cả wiki nói cần 8 người. Drop kiếm legendary. Toàn server sốc.`,
    dopamineMoment: `Guild Master "Thiên Hạ Vô Địch" gửi tin riêng: "Brother, tôi cho 50 triệu vàng + suất S-tier guild, vào team không?"\nTrần Vũ trả lời ba từ:\n"Không cần."\nHắn rút kiếm Hắc Long, đi tiếp về Boss kế. Trong khi guild chat 50 ngàn người đang nháy đỏ.`,
  },

  // ── FAN-FIC ──────────────────────────────────────────────────────────────
  'dong-nhan': {
    voiceNotes: 'Tham chiếu IP gốc. Voice tự sự + meta. Reference original characters. Parallel canon timeline.',
    voiceAnchor: `Năm 1999, Konoha. Trần Hạo mở mắt trong thân xác đứa trẻ tám tuổi tên Hatake Kakashi II — cousin đời của Hatake Kakashi mà mọi fan Naruto đều biết.\n\nTrong trí nhớ kiếp trước, hắn là sinh viên Đại Học Bách Khoa, chuyên ngành Cơ Khí. Đột tử vì làm việc 18 tiếng liên tục.\n\nThân xác mới, sáu tuổi vào Học Viện Nhẫn Giả. Genetic Hatake — Sharingan ẩn, chakra thuần.\n\nNhưng thứ hắn quan tâm không phải Sharingan. Mà là — hắn nhớ rõ canon. Năm sau, Uchiha Itachi sẽ thảm sát toàn tộc Uchiha. Hai năm nữa, Sasuke sẽ bị bỏ lại một mình. Mười năm nữa, Pain sẽ phá hủy Konoha.\n\nVà hắn — Hatake Kakashi II — có 10 năm để chuẩn bị.\n\n*Hệ thống Trí Thức Cơ Khí Hiện Đại — đã đồng bộ.*\n\nHắn cười khẽ. Konoha sẽ không còn yếu nữa.`,
    chapterOneHook: `Trần Hạo xuyên không vào thân Hatake Kakashi II — em họ Kakashi trong Naruto canon, tám tuổi. Hắn nhớ rõ: một năm nữa thảm sát Uchiha. Hắn có hệ thống cơ khí hiện đại + 10 năm chuẩn bị + một câu hỏi duy nhất: cứu hay không?`,
    dopamineMoment: `Uchiha Itachi sáu tuổi nhìn thí nghiệm máy điện từ của Hatake Kakashi II — bóng đèn sáng từ pin tự chế, không cần chakra.\n— Anh... — Itachi hiếm khi gọi ai bằng "anh" — anh dạy em được không?\nHatake Kakashi II gật đầu:\n— Được. Nhưng có điều kiện. Anh dạy em — em không được giết tộc mình.\nÁnh mắt Itachi run nhẹ.`,
  },

  // ── APOCALYPSE ───────────────────────────────────────────────────────────
  'mat-the': {
    voiceNotes: 'Sinh tồn + tài nguyên khan hiếm. Câu ngắn, gritty. Time pressure. Đếm số (lon nước, viên đạn, ngày sống sót).',
    voiceAnchor: `Ngày 47 sau khi mặt trời tắt.\n\nTrần Vũ kiểm tra kho ngầm Phượng Đô lần thứ ba trong ngày. 1,247 lon thức ăn đóng hộp. 320 lít nước lọc. 47 viên đạn shotgun. 3 đèn pin chạy năng lượng mặt trời — vô dụng kể từ ngày 47.\n\nNgoài cửa hầm, gió rít qua lỗ thông gió. Nhiệt độ ngoài: âm 12 độ.\n\nHắn ngồi xuống, mở app *Hệ Thống Trữ Tài Nguyên* — thứ duy nhất chạy được trên điện thoại tự cấp pin từ thân nhiệt.\n\n*Cảnh báo: Có chuyển động trong vòng 200m. 3 thực thể.*\n\nHắn rút súng, lên đạn. Thực thể — không phải người. Sau ngày thứ 30, mặt người đã quên cách ấm.\n\nGõ cửa. Một tiếng. Hai tiếng. Ba tiếng — cách đều, cố tình.\n\nHắn dừng. Người. Còn người.\n\n— Là ai? — hắn gọi qua loa, súng vẫn lên đạn.\n\n— Cô gái ngày thứ ba mươi anh cứu ngoài siêu thị Big C. Tên Linh.`,
    chapterOneHook: `Ngày 47 mặt trời tắt, nhiệt độ âm 12 độ. Trần Vũ trong hầm Phượng Đô — 1,247 lon, 320 lít nước, 47 viên đạn. Hệ thống nháy: "3 thực thể đang đến." Một trong số đó gõ cửa đúng nhịp con người.`,
    dopamineMoment: `Trần Vũ mở van bể nước cho 12 người sống sót. Trưởng nhóm gangster Trọng cười nhếch:\n— Anh thật ngu, cho người ngoài uống nước của mình.\nVũ rót cho mình một ly nhỏ:\n— Tôi tính rồi. 12 người, 320 lít, dùng đến mùa xuân. Anh tính được 320 chia 12 là bao nhiêu không?\nTrọng cứng họng. Cả bàn nhìn hắn.`,
  },

  // ── HORROR ───────────────────────────────────────────────────────────────
  'linh-di': {
    voiceNotes: 'Không khí ngột ngạt. Câu ngắn-dài xen kẽ. Thị giác tối + thính giác sắc. Reveal chậm. Cấm jumpscare cliché.',
    voiceAnchor: `Ngỗ tác Lê Đình Phong nhận xác lúc một giờ sáng. Cô gái, hai mươi mốt tuổi, tử vong cách đây sáu giờ. Vết thương — không có. Không vết bầm, không vết cào, không dấu siết cổ.\n\nNhưng mắt cô — mở. Tròng đen co lại bằng đầu kim.\n\nPhòng giải phẫu chỉ có hai bóng đèn. Một bóng phía trên bàn mổ — sáng. Một bóng góc phòng — chập chờn.\n\nPhong đeo găng. Lấy dao mổ. Bắt đầu cắt từ đầu xương ức.\n\nDưới lớp da, không phải mô tim người thường. Là — đất. Đất đen, ẩm, có rễ cỏ.\n\nHắn dừng dao. Hít một hơi.\n\nTrong phòng, đèn góc phòng tắt hẳn. Bóng đèn còn lại bắt đầu chập chờn theo nhịp tim của ai đó — không phải hắn, không phải xác.\n\nĐiện thoại rung trong túi. Tin nhắn không rõ số:\n*"Đừng cắt tiếp. Chôn lại."*\n\nPhong rút dao ra khỏi xác. Nhìn lên trần nhà.\n\nTrần nhà có một dấu chân — hướng xuống.`,
    chapterOneHook: `Một giờ sáng phòng giải phẫu sông Hương, ngỗ tác Lê Đình Phong rạch xác cô gái — không thấy mô tim, chỉ thấy đất đen có rễ cỏ. Đèn vụt tắt. Tin nhắn từ số lạ: "Đừng cắt tiếp. Chôn lại."`,
    dopamineMoment: `Phong gặp lại cô gái — sống — ba ngày sau, ngoài chợ. Cô đi qua không nhận ra hắn. Trên cổ tay, vẫn có hình xăm mà hắn đã thấy trên xác.\nHắn không hét. Không hỏi. Chỉ rút điện thoại, mở ghi âm:\n— Ngày bốn tháng tư, lần đầu tiên tôi gặp một người chết hai lần.`,
  },

  // ── ISEKAI ───────────────────────────────────────────────────────────────
  'di-gioi': {
    voiceNotes: 'Modern knowledge gap. Culture clash. Tech uplift / business / lord-building. MC has goal cụ thể, không lan man.',
    voiceAnchor: `Trần Hạo tỉnh dậy trong rừng Cấm Trung Đại Lục, trên người chỉ có áo phông Bách Khoa và một chiếc điện thoại cạn pin.\n\nTrời sáng rõ rồi. Tiếng chim lạ kêu. Cây có lá tím — không phải Trái Đất.\n\nHắn mở điện thoại. Hai phần trăm pin. Nhưng wifi tự kết nối — *Hệ Thống Tri Thức Hiện Đại* hiện lên. Database 47TB kiến thức nhân loại 2025. Offline.\n\nHắn cười. Vậy là pin không quan trọng nữa.\n\nĐi bộ ba tiếng, đến một thôn — Hoa Thôn. Lúa nước, ruộng bậc thang, một ngôi đền đá. Văn minh nông nghiệp, có lẽ tương đương Đường-Tống Trái Đất.\n\nHắn ngồi xuống bên bờ ruộng. Quan sát: nông dân cày bừa bằng trâu. Mất 12 giờ một mẫu. Trên Trái Đất, máy cày 30 phút.\n\nLần đầu tiên trong đời, hắn nghĩ: *Có lẽ ta sẽ thay đổi thế giới này. Bắt đầu từ một cái cày sắt.*`,
    chapterOneHook: `Trần Hạo xuyên không vào rừng Cấm Trung Đại Lục, áo phông Bách Khoa, điện thoại cạn pin nhưng có Hệ Thống Tri Thức Hiện Đại 47TB offline. Đến Hoa Thôn lúc trưa, hắn quan sát nông dân cày bằng trâu — 12 giờ một mẫu. Bắt đầu từ một cái cày sắt.`,
    dopamineMoment: `Lý trưởng Hoa Thôn xem cày sắt mới của Trần Hạo, mặt từ nghi ngờ chuyển thành kinh ngạc:\n— Thiếu hiệp, cái cày này... một mình ngươi cày được hai mẫu một ngày?\nHạo gật đầu, không khoe.\n— Thôn ta có ba trăm mẫu. Năm nay sẽ thu hoạch gấp đôi năm ngoái.\nLý trưởng quỳ xuống. Hạo vội đỡ:\n— Bác đứng dậy. Tôi cần thuê thợ rèn.`,
  },

  // ── ROMANCE ──────────────────────────────────────────────────────────────
  'ngon-tinh': {
    voiceNotes: 'Trữ tình + nội tâm sâu. Câu dài, hình ảnh đẹp. Female POV chiếm ưu thế. Tâm lý tinh tế. KHÔNG cliché tổng tài lạnh lùng.',
    voiceAnchor: `Lâm Hạ Vy đứng trong tiền sảnh khách sạn Sheraton, váy lụa xanh nhạt, mưa tháng ba ngoài cửa kính rơi đều như nhịp tim đang bình tĩnh giả vờ.\n\nNăm năm. Đã năm năm rồi cô không gặp anh.\n\nThang máy mở. Một bóng người bước ra — vai rộng, áo vest đen, ô gập trong tay vẫn còn nhỏ giọt. Anh ngẩng đầu, ánh mắt va vào cô.\n\nNăm giây.\n\nKhông ai nói gì.\n\nRồi anh — Trịnh Nam Du, người đã từng hứa với cô năm hai mươi tuổi rằng "anh sẽ về" rồi biến mất một tuần sau lễ tốt nghiệp — bước đến. Đặt ô vào tay cô. Giọng trầm, nhẹ như chưa từng có năm năm:\n\n— Em ướt áo rồi. Cầm lấy.\n\nCô nhận. Không nhìn anh. Không cảm ơn.\n\nNhưng tay cô — tay cô đang run.`,
    chapterOneHook: `Lâm Hạ Vy gặp lại Trịnh Nam Du sau năm năm — trong tiền sảnh Sheraton, một chiều mưa tháng ba. Anh không xin lỗi. Chỉ đặt cây ô của mình vào tay cô: "Em ướt áo rồi." Cô nhận, tay run, nhưng không nhìn anh.`,
    dopamineMoment: `Trịnh Nam Du gọi điện cho mẹ Lâm Hạ Vy:\n— Cô à, cháu xin phép đến nhà thứ Bảy. Cháu... cháu cần xin lỗi cô và em Vy.\nMẹ cô lặng im một lúc:\n— Năm năm, cháu mới gọi điện. Vy đã quên cháu rồi.\nNam Du đáp, giọng vẫn trầm:\n— Cháu biết. Nhưng cháu chưa quên. Và cháu sẽ chờ đến khi em ấy nhớ lại.`,
  },

  // ── RULES HORROR (Phase 20A) ─────────────────────────────────────────────
  'quy-tac-quai-dam': {
    voiceNotes: 'Uncanny valley. Liệt kê quy tắc. Paranoia. Mâu thuẫn quy tắc thật/giả. MC sinh tồn = tuân thủ, không combat.',
    voiceAnchor: `Trần Vũ nhận được tờ giấy lúc bảy giờ tối. Trên giấy, mười điều, đánh máy:\n\n1. Vào lúc 23:00, tắt tất cả đèn trừ đèn ngủ trong phòng ngủ chính.\n2. Nếu nghe tiếng gõ cửa ba tiếng đều, KHÔNG mở.\n3. Nếu nghe tiếng gõ cửa hai tiếng, MỞ.\n4. Trong tủ lạnh có một hũ sữa. Đừng uống. Đừng vứt.\n5. ...\n\nHắn đọc đến điều 10. Đặt tờ giấy xuống bàn. Hít sâu.\n\nĐồng hồ chỉ 22:58.\n\nHắn đứng dậy, đi vòng quanh căn hộ tầng 14 mới chuyển vào — cách đây một giờ. Tắt tất cả đèn. Đèn ngủ phòng ngủ chính — bật.\n\n22:59:30.\n\nHành lang ngoài cửa, có tiếng bước chân. Đến trước cửa căn hộ. Dừng.\n\n23:00:00.\n\nGõ cửa. Một tiếng. Hai tiếng.\n\nHắn đặt tay lên nắm. Kiểm tra lại quy tắc số 3 trong đầu — *hai tiếng, MỞ*.\n\nMở cửa.\n\nNgoài cửa, không có ai. Nhưng trên thảm chùi chân, có một hũ sữa — giống hệt cái trong tủ lạnh.`,
    chapterOneHook: `Trần Vũ chuyển vào căn hộ tầng 14, nhận tờ giấy 10 quy tắc. 23:00 đêm đầu tiên: hai tiếng gõ cửa, hắn mở — không có ai, chỉ có một hũ sữa giống hệt cái trong tủ lạnh.`,
    dopamineMoment: `Hàng xóm tầng 14 chết hết, chỉ còn Trần Vũ. Cảnh sát đến điều tra:\n— Anh là người duy nhất sống sót. Tại sao?\nHắn đưa tờ giấy 10 quy tắc.\n— Tôi tuân thủ.\nViên cảnh sát đọc, mặt từ từ trắng bệch.\n— Tôi cũng vừa nhận được... một tờ giống hệt. Sáng nay.`,
  },

  // ── BEAST EVOLUTION (Phase 20A) ──────────────────────────────────────────
  'ngu-thu-tien-hoa': {
    voiceNotes: 'Pet bond + evolution lines. Hidden formula reveals. Pet vs pet combat — không phải MC tay đôi. Asymmetric info advantage.',
    voiceAnchor: `Trần Vũ — sinh viên năm hai Học Viện Ngự Thú Phượng Đô — đứng trước bảng tin đăng ký Thí Đấu Thường Niên. Bốn ngàn sinh viên. Một trăm suất chung kết.\n\nCạnh hắn, đám bạn cười ầm:\n— Vũ ơi, mày dắt thú gì đi đấu? Con Mèo Lửa Sơ Cấp à?\n\nHắn không đáp. Móc trong túi ra một quả trứng nhỏ — màu xám tro, kích thước bằng nắm tay.\n\n— Tao đi đấu cái này.\n\nĐám bạn cười to hơn:\n— Trứng chưa nở mà đi đấu? Mày điên à?\n\nHắn cũng cười, nhẹ. Nhưng trong đầu, *Hệ Thống Tuyến Tiến Hóa Ẩn* đang hiển thị:\n\n*Trứng Mèo Hoang. Tuyến tiến hóa hiển nhiên: Mèo Lửa Sơ → Mèo Lửa Trung. Tuyến ẩn: Mèo Hoang → Hắc Báo Núi → Báo Tuyết Cực Bắc → Tuyết Long Sơn (Thần Cấp).*\n\n*Cần ăn: 47 viên Linh Hoả Hồng Liễu vào ngày tiến hóa lần 1.*\n\nHắn đút trứng vào ba lô. Sáng mai, đi rừng.`,
    chapterOneHook: `Trần Vũ đăng ký Thí Đấu Ngự Thú Phượng Đô với một quả trứng chưa nở. Đám bạn cười: "Mày điên à?" Hệ thống Tuyến Tiến Hóa Ẩn nói: tuyến này dẫn đến Tuyết Long Sơn — Thần Cấp.`,
    dopamineMoment: `Vòng tứ kết Thí Đấu, đối thủ là Lâm Hạo — quý tử dòng họ Lâm, dắt Lôi Báo Cao Cấp.\nLâm Hạo cười:\n— Trứng của ngươi nở chưa?\nVũ thả con thú nhỏ ra khỏi ba lô — Báo Tuyết Cực Bắc, lông trắng tinh, đôi mắt xanh lam. Cả đấu trường im phăng phắc.\nGiám khảo đứng bật dậy:\n— Em... em lấy con này ở đâu?`,
  },

  // ── QUICK TRANSMIGRATION (Phase 20A) ─────────────────────────────────────
  'khoai-xuyen': {
    voiceNotes: 'Modular episodic. System narrator. Identity swap mỗi 30-50 chương. Hub Space giữa các thế giới. Mục tiêu cứu nguyên chủ.',
    voiceAnchor: `Phòng Hub Space, không gian trắng, không có cửa sổ. Lâm Yên ngồi trên ghế xoay, cốc cà phê trên tay đã nguội.\n\nMàn hình AI 0001 hiện thông báo:\n\n*Nhiệm vụ #47. Thế giới: Hiện đại Trung Quốc, năm 2018. Nguyên chủ: Tô Tuyết Nhi. Tuổi: 22. Nghề: Thư ký.*\n*Tóm tắt: Pháo hôi nữ phụ. Yêu thầm CEO Tô Trạch sáu năm. Bị nữ chính Trần Mỹ Vy hãm hại, mất việc, tự tử ngày 15/3/2018.*\n*Mục tiêu: Cứu Tô Tuyết Nhi. KHÔNG yêu Tô Trạch. Chuyển nguyên chủ sang con đường mới.*\n\nLâm Yên đặt cốc xuống. Mở folder hồ sơ Tô Tuyết Nhi — đọc lướt 200 trang trong ba phút.\n\nThư ký, IQ 138 (cao nhưng giấu), gia đình nông dân, sáu năm yêu thầm — mỗi sáng pha cà phê đúng nhiệt độ 65 độ cho CEO Tô Trạch.\n\nLâm Yên nhếch môi.\n\n— AI 0001, vào thế giới.\n\nKhông gian méo. Cô tỉnh dậy trong căn phòng trọ Bắc Kinh, ngày 1/3/2018, hai tuần trước khi Tô Tuyết Nhi tự tử. Đồng hồ chỉ sáu giờ sáng.\n\n*Đến lúc rồi.*`,
    chapterOneHook: `Hub Space giữa các thế giới, AI 0001 giao nhiệm vụ thứ 47 cho Lâm Yên: cứu pháo hôi Tô Tuyết Nhi — yêu thầm CEO sáu năm, sắp tự tử trong hai tuần. Mục tiêu: KHÔNG yêu CEO. Chuyển nguyên chủ sang con đường mới.`,
    dopamineMoment: `Tô Tuyết Nhi (Lâm Yên) đem hồ sơ M&A trị giá 800 triệu USD đến phòng họp công ty mới — tập đoàn đối thủ của Tô Trạch.\nGiám đốc đối thủ — Lý Khang — nhìn hồ sơ, ngẩng đầu:\n— Cô là... Tô thư ký? Sao cô có hợp đồng này?\n— Tôi đã nghỉ việc Tô Tập Đoàn ba ngày trước. Bây giờ tôi làm Phó Tổng Giám Đốc cho ông — nếu ông đồng ý.\nLý Khang đặt bút xuống, ký hợp đồng tại chỗ.`,
  },

};

/**
 * Returns a structured voice anchor block for injection into WRITER_SYSTEM
 * or ARCHITECT_SYSTEM. Returns empty string if genre not in registry.
 */
export function getVoiceAnchor(genre: GenreType): string {
  const a = ANCHORS[genre];
  if (!a) return '';
  return `\n\n=== VOICE ANCHOR — THỂ LOẠI "${genre}" ===
${a.voiceNotes}

📖 GIỌNG VĂN MẪU (match nhịp + register + vocabulary):
${a.voiceAnchor}

🎬 CHƯƠNG 1 OPENING MẪU (warm baseline + immediate hook):
${a.chapterOneHook}

⚡ DOPAMINE MOMENT MẪU (face-slap / competence / harvest):
${a.dopamineMoment}

→ Khi viết, MATCH register + sentence rhythm + vocabulary của giọng văn mẫu.
   Đây KHÔNG phải plot — chỉ là voice. Plot vẫn theo brief + outline.
=== END VOICE ANCHOR ===`;
}

/**
 * Compact version for ARCHITECT_SYSTEM — only voiceNotes + chapterOneHook,
 * to keep architect prompt size reasonable while still anchoring scene voice.
 */
export function getArchitectVoiceHint(genre: GenreType): string {
  const a = ANCHORS[genre];
  if (!a) return '';
  return `\n\n=== VOICE TARGET — "${genre}" ===
${a.voiceNotes}

CHƯƠNG 1 OPENING PATTERN: ${a.chapterOneHook}

DOPAMINE PATTERN: ${a.dopamineMoment}

→ Plan scenes sao cho writer có thể match voice này. Pacing/sentence rhythm phải align.
=== END VOICE TARGET ===`;
}
