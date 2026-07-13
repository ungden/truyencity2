import { ChineseBenchmarkRegistryV1Schema, type ChineseBenchmarkPackV1 } from './chinese-benchmark';

const researchedAt = '2026-07-13T09:30:00.000Z';
const noCopy = 'Không sao chép tên riêng, hệ sức mạnh, vật phẩm biểu tượng, tình huống nhận diện hoặc chuỗi sự kiện của tác phẩm.';
const work = (title: string, author: string, transferableMechanism: string, doNotCopy = noCopy) => ({
  title,
  author,
  transferableMechanism,
  doNotCopy,
});
const pack = (
  slotId: ChineseBenchmarkPackV1['slotId'],
  input: Omit<ChineseBenchmarkPackV1, 'schemaVersion' | 'id' | 'slotId' | 'researchedAt' | 'usage' | 'mustNeverReachChapterRoles' | 'inspirationMode'>,
): ChineseBenchmarkPackV1 => ({
  schemaVersion: 1,
  id: `benchmark_${slotId.toLowerCase().replace('-', '_')}` as ChineseBenchmarkPackV1['id'],
  slotId,
  researchedAt,
  usage: 'upstream_concept_lab_only',
  mustNeverReachChapterRoles: true,
  inspirationMode: 'mechanisms_not_expression',
  ...input,
});

const packs: ChineseBenchmarkPackV1[] = [
  pack('HX-01', {
    sourceUrls: [
      'https://www.chinawriter.com.cn/n1/2025/1022/c404027-40587015.html',
      'https://www.chinawriter.com.cn/n1/2025/0109/c404023-40398625.html',
      'https://www.cssn.cn/skgz/bwyc/202604/t20260420_5981165.shtml',
    ],
    comparables: [
      work('诡秘之主', '爱潜水的乌贼', 'Gắn mỗi bước tiến năng lực với một vụ việc và một cái giá, để khám phá thế giới đồng thời thay đổi nhân vật.'),
      work('道诡异仙', '狐尾的笔', 'Dùng bất định nhận thức làm nguồn lựa chọn và hậu quả, không chỉ làm lớp trang trí kỳ quái.'),
      work('神秘复苏', '佛前献花', 'Biến năng lực siêu nhiên thành rủi ro phải quản trị, khiến càng mạnh càng phải trả chi phí cụ thể.'),
      work('从红月开始', '黑山老鬼', 'Đặt dị tượng trong thiết chế điều tra và đời sống đô thị để mỗi bí mật tác động đến cộng đồng.'),
      work('深海余烬', '远瞳', 'Cho địa lý, phương tiện và giới hạn nhận thức cùng sinh ra tình huống chỉ thế giới đó mới có.'),
      work('天启预报', '风月', 'Kết hợp nghề nghiệp, tổ chức và quan hệ người với người vào tiến trình giải mã quy tắc nguy hiểm.'),
    ],
    mechanismConvergences: [
      'Quy tắc hấp dẫn khi vừa giải được bằng bằng chứng vừa còn phần bất định buộc nhân vật chấp nhận rủi ro.',
      'Sức mạnh phải tạo thêm nghĩa vụ, nguy cơ hoặc cách bị khai thác thay vì chỉ mở khóa chiến thắng lớn hơn.',
      'Mỗi dị tượng cần làm lệch đời sống, nghề nghiệp hoặc trật tự cộng đồng để bí ẩn có trọng lượng cảm xúc.',
    ],
    differentiationMandates: [
      'Tạo nguồn gốc quy tắc, cách cưỡng chế và ngôn ngữ biểu hiện riêng, không dùng hệ ma dược hoặc đồ vật bị nguyền quen thuộc.',
      'Nhân vật thắng bằng chuỗi quan sát, thử nghiệm và lựa chọn có mất mát, không nhờ lời giải được trao sẵn.',
      'Giữ một trục đời sống ấm và có tiến triển để truyện không biến thành chuỗi tra tấn tâm lý u tối.',
    ],
    saturationRisks: [
      'Dán nhãn quy tắc quái đàm lên những điều cấm tùy tiện không có nguyên nhân hoặc khả năng kiểm chứng.',
      'Lạm dụng hồ sơ bí mật, tổ chức thần bí và nhân vật nói úp mở thay cho hành động có hậu quả.',
      'Bí ẩn chỉ trì hoãn thông tin, không làm thay đổi tài sản, quan hệ, quyền lực hoặc niềm tin của nhân vật.',
    ],
    worldProofTests: [
      'Concept phải nêu ba tình huống không thể xảy ra nếu bỏ hệ quy tắc và lịch sử riêng của thế giới.',
      'Phải chỉ rõ ai có quyền xác nhận quy tắc, ai hưởng lợi khi diễn giải sai và bằng chứng nào có thể phản bác.',
      'Mỗi cách khai thác quy tắc phải để lại dấu vết hoặc cái giá mà đối thủ hợp lý có thể học và phản ứng.',
      'Ba mươi chương phải làm hiểu biết cũ mất giá ít nhất hai lần vì quy tắc chồng lấn hoặc bối cảnh thay đổi.',
    ],
    vietnamizationQuestions: [
      'Nỗi sợ và niềm tin nào trong đời sống Việt có thể tạo cộng hưởng mà không bê nguyên tín ngưỡng Trung Hoa?',
      'Thiết chế địa phương hư cấu sẽ phản ứng ra sao để vẫn tự nhiên với độc giả Việt nhưng không giả tài liệu hiện thực?',
      'Giọng thoại và nhịp sinh hoạt nào giữ được cảm giác gần gũi khi bối cảnh siêu nhiên ngày càng rộng?',
    ],
  }),
  pack('HX-04', {
    sourceUrls: [
      'https://book.qidian.com/booklist/detail/238466/1/',
      'https://www.chinawriter.com.cn/n1/2023/0102/c404027-32598233.html',
      'https://wyb.chinawriter.com.cn/content/202602/06/content82721.html',
    ],
    comparables: [
      work('放开那个女巫', '二目', 'Chuyển năng lực cá nhân thành năng lực sản xuất và tổ chức, để phép màu tác động lên đời sống tập thể.'),
      work('黎明之剑', '远瞳', 'Gắn xây dựng lãnh địa với tri thức lịch sử, giới hạn hạ tầng và nguy cơ ở quy mô văn minh.'),
      work('这游戏也太真实了', '晨星LL', 'Biến đóng góp của nhiều cá nhân thành tài sản cộng đồng và để cộng đồng phản hồi lại chiến lược quản trị.'),
      work('保护我方族长', '傲无常', 'Dùng đầu tư dài hạn vào con người, sản nghiệp và quan hệ để tạo payoff có độ trễ qua nhiều thế hệ.'),
      work('临高启明', '吹牛者', 'Cho kỹ thuật phụ thuộc chuỗi vật tư, nhân lực, tiêu chuẩn và thể chế thay vì một thiên tài tự làm tất cả.'),
      work('绍宋', '榴弹怕水', 'Để tính chính danh được kiếm bằng quyết định công khai, phân bổ lợi ích và kết quả mà nhiều phe cùng chứng kiến.'),
    ],
    mechanismConvergences: [
      'Payoff xây dựng mạnh nhất khi công trình thay đổi cách người dân ăn, ở, làm việc và nhìn người tổ chức.',
      'Mỗi bước tăng sản lượng phải kéo theo bài toán phân phối, quyền sở hữu, bảo trì hoặc tính chính danh mới.',
      'Dàn nhân vật có chuyên môn và lợi ích khác nhau giúp lãnh địa vận hành như xã hội thay vì bàn cờ của main.',
    ],
    differentiationMandates: [
      'Tạo một nút thắt sinh kế và cấu trúc tài nguyên riêng, không tái dựng lộ trình công nghiệp hóa quen thuộc.',
      'Không cho main sở hữu toàn bộ tri thức; mỗi thành tựu phải cần người khác đồng ý, học nghề hoặc chia sẻ rủi ro.',
      'Tính chính danh phải có thể giảm sau quyết định sai, không trở thành điểm danh vọng chỉ tăng một chiều.',
    ],
    saturationRisks: [
      'Kể báo cáo sản lượng và bản vẽ thay cho cảnh người thật tranh luận, lao động và chịu hậu quả.',
      'Dân chúng đồng loạt biết ơn dù lợi ích, tập quán và mức chấp nhận rủi ro của họ khác nhau.',
      'Cứ mở công trình lớn hơn mà không quay lại chi phí vận hành, hao mòn và người bị thiệt.',
    ],
    worldProofTests: [
      'Concept phải nêu nguồn lực khan hiếm nào buộc ba nhóm cư dân chọn ba phương án hợp lý nhưng xung đột.',
      'Phải có một thiết chế phân phối quyền lợi có thể ngăn main dù giải pháp kỹ thuật của anh ta đúng.',
      'Ba tình huống đặc trưng phải sinh từ địa hình, dân cư và công nghệ riêng thay vì chiến tranh chung chung.',
      'Sau ba mươi chương phải nhìn thấy một công trình, một tập quán và một cán cân quyền lực đã đổi không thể đảo ngược.',
    ],
    vietnamizationQuestions: [
      'Cách gọi cộng đồng, họ hàng và quyền sở hữu nào nghe tự nhiên trong tiếng Việt mà vẫn thuộc thế giới hư cấu?',
      'Những payoff về bữa ăn, nhà cửa và sự an tâm nào chạm độc giả Việt rõ hơn số liệu sản lượng thuần túy?',
      'Mâu thuẫn tập thể nào có thể viết qua lợi ích cụ thể thay vì mô phỏng lịch sử chính trị của một quốc gia thật?',
    ],
  }),
  pack('HX-05', {
    sourceUrls: [
      'https://book.qidian.com/booklist/detail/238466/1/',
      'https://h5.if.qidian.com/h5/share/column?columnId=19804',
      'https://wyb.chinawriter.com.cn/content/202602/06/content82721.html',
    ],
    comparables: [
      work('奥术神座', '爱潜水的乌贼', 'Biến phát hiện tri thức thành thay đổi năng lực và phản ứng học thuật, để kiến thức luôn có hậu quả xã hội.'),
      work('走进修仙', '吾道长不孤', 'Dùng giả thuyết và tranh luận phương pháp làm động cơ tu hành thay cho chỉ nhặt công pháp cao hơn.'),
      work('修真四万年', '卧牛真人', 'Gắn pháp bảo, sản xuất và lựa chọn văn minh vào xung đột giá trị chứ không chỉ khoe thông số kỹ thuật.'),
      work('放开那个女巫', '二目', 'Cho năng lực đặc thù giải một công đoạn cụ thể trong chuỗi sản xuất và cần phối hợp để mở rộng.'),
      work('仙工开物', '蛊真人', 'Đặt chế tác trong kinh tế vật liệu, cạnh tranh sáng tạo và lựa chọn chiến lược có thể thất bại.'),
      work('超神机械师', '齐佩甲', 'Cho nghề chế tạo tạo cả sức mạnh, khách hàng, tổ chức và ràng buộc cung ứng theo từng giai đoạn.'),
    ],
    mechanismConvergences: [
      'Cảnh chế tác hay cần nhu cầu cụ thể, vật liệu có sai số, phép thử nhìn thấy được và hậu quả khi ứng dụng.',
      'Tay nghề chỉ có giá trị dài hạn khi gắn với dụng cụ, tiêu chuẩn, người học và mạng cung ứng có thể đứt.',
      'Bất ngờ nên đến từ tính chất vật liệu hoặc nhu cầu bị hiểu sai, không từ công thức hoàn hảo bỗng xuất hiện.',
    ],
    differentiationMandates: [
      'Tạo ngôn ngữ vật liệu và quy trình kiểm chứng riêng, không đổi tên luyện kim hoặc hóa học Trái Đất rồi gọi là huyền huyễn.',
      'Main chỉ nhớ nguyên lý và lỗi cũ; công thức hiện tại phải được tái tạo bằng thử nghiệm có hao hụt.',
      'Mỗi món đồ quan trọng phải thay đổi một quan hệ kinh tế hoặc chiến thuật, không chỉ tăng chỉ số chiến lực.',
    ],
    saturationRisks: [
      'Mô tả công đoạn dài nhưng kết quả luôn đúng ngay lần đầu và không làm phát sinh lựa chọn mới.',
      'Đồ bỏ nào cũng là bảo vật vì chỉ main nhận ra, khiến thị trường và người thợ khác trở nên ngu.',
      'Xưởng tăng cấp bằng tiền không nguồn, máy móc tự có hoặc khách hàng chỉ xuất hiện để trả giá cao.',
    ],
    worldProofTests: [
      'Concept phải nêu ba sản phẩm chỉ có ý nghĩa vì tài nguyên, sinh hoạt và xung đột riêng của thế giới.',
      'Phải mô tả đường đi của một vật liệu từ nguồn khai thác tới phế phẩm và ai giữ quyền ở từng chặng.',
      'Một lỗi chế tạo phải tạo hậu quả đủ lâu để ảnh hưởng uy tín, dòng tiền hoặc an toàn của người dùng.',
      'Sau ba mươi chương lợi thế ký ức phải giảm khi thợ khác học, vật liệu đổi và tiêu chuẩn thị trường tăng.',
    ],
    vietnamizationQuestions: [
      'Từ vựng nghề và thoại thợ nên Việt hóa thế nào để dễ đọc mà không làm mất tính lạ của thế giới?',
      'Độc giả Việt sẽ cảm nhận tiến bộ rõ nhất qua công cụ, thu nhập, vị thế người thợ hay đời sống gia đình nào?',
      'Các tập quán mua bán và học nghề hư cấu nào tạo cảm giác thật mà không sao chép bang hội Trung Quốc?',
    ],
  }),
  pack('TH-01', {
    sourceUrls: [
      'https://www.chinawriter.com.cn/n1/2025/0620/c404027-40505182.html',
      'https://www.chinawriter.com.cn/n1/2026/0525/c404023-40726988.html',
      'https://book.qidian.com/booklist/detail/644418/',
    ],
    comparables: [
      work('玄鉴仙族', '季越人', 'Dùng nhiều thế hệ và nhiều góc nhìn để mỗi quyết định tài nguyên trở thành ký ức lẫn gánh nặng của gia tộc.'),
      work('保护我方族长', '傲无常', 'Biến nuôi người, gây dựng sản nghiệp và liên minh thành tiến trình chính thay cho độc hành tăng cảnh giới.'),
      work('青莲之巅', '肖十一莫', 'Cho tài nguyên tu hành đi qua nghề nghiệp gia tộc, địa bàn và phân công thành viên có độ trễ.'),
      work('逐道长青', '奕念之', 'Dùng lựa chọn giữa lợi ích cá nhân với nền tảng dòng họ để tạo xung đột lâu dài.'),
      work('九品仙路', '晨沧', 'Gắn vị thế gia tộc với quyền địa phương, nghĩa vụ và trật tự mà các thế lực khác có thể phản ứng.'),
      work('仙路至尊', '睡秋', 'Để đất đai, trận pháp và tích lũy nhiều đời tạo sức mạnh nhưng đồng thời khóa gia tộc vào trách nhiệm mới.'),
    ],
    mechanismConvergences: [
      'Gia tộc chỉ có sức sống khi thành viên khác thế hệ có agenda, năng lực và thước đo thành công không giống nhau.',
      'Tài nguyên có độ trễ tạo lựa chọn đau: đầu tư hôm nay có thể chỉ con cháu hưởng hoặc phải gánh hậu quả.',
      'Vị thế phải đến từ sản nghiệp, nhân tài, liên minh và uy tín chứ không quy hết về cảnh giới của tộc trưởng.',
    ],
    differentiationMandates: [
      'Chọn một cơ chế truyền đời riêng ngoài huyết mạch thần bí, ví dụ nghĩa vụ, ký ức, nghề hoặc tài sản sống.',
      'Không để trọng sinh biến thành danh sách kho báu; thông tin tương lai phải sai dần khi gia tộc can thiệp.',
      'Giữ tên người, quan hệ và giọng nói dễ phân biệt; không coi thành viên như đơn vị tài nguyên trên bảng.',
    ],
    saturationRisks: [
      'Gia phả dài nhưng nhân vật không có lựa chọn riêng và chỉ chờ tộc trưởng phân công.',
      'Mỗi arc chỉ tranh linh mạch, bí cảnh hoặc hôn minh rồi lặp lại ở cấp thế lực lớn hơn.',
      'Nhảy thời gian xóa sạch hậu quả quan hệ, biến thế hệ mới thành bản sao của thế hệ cũ.',
    ],
    worldProofTests: [
      'Concept phải nêu ba quyết định mà người sống ngắn, người sống lâu và người chưa sinh sẽ chịu lợi hại khác nhau.',
      'Phải có quy tắc thừa kế tài sản, tri thức và nghĩa vụ đủ rõ để sinh tranh chấp hợp lý.',
      'Ba tình huống đặc trưng phải cần chính cấu trúc gia tộc này, không thể thay bằng tông môn hoặc công ty chung chung.',
      'Sau ba mươi chương phải có ít nhất một khoản đầu tư chưa thu hồi và một hệ quả từ lựa chọn của thế hệ trước.',
    ],
    vietnamizationQuestions: [
      'Cách xưng hô nhiều thế hệ nào rõ và tự nhiên với người Việt mà không bê nguyên hệ tông tộc Trung Hoa?',
      'Payoff gia đình nào ngoài quyền lực giúp độc giả nữ lẫn nam quan tâm đến thành viên yếu hơn?',
      'Làm sao giữ mỹ cảm tiên hiệp nhưng tránh diễn văn tộc quy, gia chủ và huyết mạch quá cổ điển?',
    ],
  }),
  pack('TH-03', {
    sourceUrls: [
      'https://book.qidian.com/booklist/detail/238466/1/',
      'https://book.qidian.com/booklist/detail/645114/',
      'https://wyb.chinawriter.com.cn/content/202602/06/content82721.html',
    ],
    comparables: [
      work('奥术神座', '爱潜水的乌贼', 'Cho phát hiện mới chịu phản biện, công bố và tác động đến trật tự học thuật thay vì chỉ tăng sức mạnh cá nhân.'),
      work('走进修仙', '吾道长不孤', 'Biến phương pháp đặt câu hỏi và kiểm chứng thành bản sắc tu hành có thể đúng, sai và bị sửa.'),
      work('修真四万年', '卧牛真人', 'Đặt công nghệ tu chân vào tranh luận về xã hội và đạo đức để nghiên cứu luôn có đối tượng chịu tác động.'),
      work('仙工开物', '蛊真人', 'Tạo vòng thử nghiệm, chế tạo và cạnh tranh sáng kiến thay cho vòng nhặt công pháp rồi bế quan.'),
      work('没钱修什么仙？', '熊狼狗', 'Dùng kinh tế tu hành và áp lực chi phí để biến lựa chọn học thuật thành lựa chọn sinh tồn cụ thể.'),
      work('道门法则', '八宝饭', 'Gắn phương pháp tu hành với thể chế, thủ tục và quyền lợi để tri thức không tồn tại ngoài xã hội.'),
    ],
    mechanismConvergences: [
      'Nghiên cứu thành truyện khi giả thuyết sai gây hậu quả, đồng nghiệp phản biện và ứng dụng chạm vào lợi ích thật.',
      'Quyền đo, quyền công bố và quyền tiếp cận vật liệu là tài sản tiến triển ngoài cảnh giới cá nhân.',
      'Thế giới phải có hiện tượng không tuân khoa học Trái Đất để main liên tục học lại thay vì giảng bài.',
    ],
    differentiationMandates: [
      'Thiết kế một phương pháp đo và một nguồn sai số độc quyền của linh khí trong thế giới truyện.',
      'Main giỏi đặt câu hỏi nhưng cần cộng sự, thiết bị và quyền thử nghiệm; không tự mình biết mọi ngành.',
      'Mỗi phát hiện phải mở ít nhất một khả năng hữu ích và một nguy cơ đạo đức hoặc thể chế mới.',
    ],
    saturationRisks: [
      'Thay tên nhà khoa học và định luật thật rồi để nhân vật khác vỗ tay vì main quá thông minh.',
      'Thí nghiệm luôn thành công, vật liệu luôn đủ và sai số chỉ xuất hiện khi cần kéo dài chương.',
      'Đối thủ học thuật gian ác vô cớ, phản biện bằng địa vị thay vì có mô hình và lợi ích hợp lý.',
    ],
    worldProofTests: [
      'Concept phải nêu ba hiện tượng khiến phương pháp hiện đại cho kết quả sai theo cách có thể điều tra.',
      'Phải xác định ai cấp vật liệu, ai cho phép thử và ai chịu hậu quả nếu một kết luận được áp dụng quá sớm.',
      'Ba mươi chương phải có ít nhất ba vòng giả thuyết khác nhau, không chỉ lặp nâng độ tinh khiết của cùng sản phẩm.',
      'Một phát hiện phải làm thay đổi giáo trình, thị trường hoặc quyền lực chứ không dừng ở báo tăng chỉ số.',
    ],
    vietnamizationQuestions: [
      'Làm sao viết tranh luận chuyên môn bằng tiếng Việt sáng rõ mà không biến chương thành bài giảng?',
      'Môi trường học nghề, phòng thử và quan hệ thầy trò nào vừa lạ vừa dễ đồng cảm với độc giả Việt?',
      'Payoff đời sống nào cho thấy tri thức giúp người bình thường chứ không chỉ phục vụ tầng lớp tu sĩ mạnh?',
    ],
  }),
  pack('DT-03', {
    sourceUrls: [
      'https://www.chinawriter.com.cn/n1/2025/0506/c404027-40473870.html',
      'https://www.chinawriter.com.cn/n1/2019/0303/c425784-30954734.html',
      'https://www.chinawriter.com.cn/n1/2024/0924/c404027-40326963.html',
    ],
    comparables: [
      work('大国重工', '齐橙', 'Cho kỹ thuật, kinh doanh, tổ chức và hành vi cùng quyết định một dự án công nghiệp có thể thành hay bại.'),
      work('材料帝国', '齐橙', 'Biến tính chất vật liệu, nhu cầu khách hàng và năng lực sản xuất thành chuỗi nút thắt có thể kiểm chứng.'),
      work('工业霸主', '齐橙', 'Dùng cải tiến từng công đoạn và thương lượng thị trường để tích lũy năng lực thay vì phát minh hoàn chỉnh.'),
      work('何日请长缨', '齐橙', 'Cho quản trị doanh nghiệp, động cơ người lao động và thị trường cùng tạo xung đột dài hạn.'),
      work('重生之实业大亨', '过关斩将', 'Dùng ký ức nhu cầu tương lai để chọn sản phẩm nhưng vẫn phải qua máy móc, đội ngũ và đầu ra hiện tại.'),
      work('1991从芯开始', '三分糊涂', 'Cho chiến lược sản phẩm phụ thuộc vốn, chuỗi cung ứng và thời điểm thị trường thay vì lời tiên tri chính xác.'),
    ],
    mechanismConvergences: [
      'Công nghiệp thuyết phục khi kỹ thuật, vốn, tiêu chuẩn, đội ngũ và đầu ra cùng xuất hiện trong nhân quả cảnh.',
      'Ký ức tương lai nên giúp chọn vấn đề đúng nhưng không thay thế bản vẽ, thử mẫu, kiểm định và bán hàng.',
      'Payoff vật chất phải đi từ mẫu đạt, lô hàng, máy móc tới đời sống gia đình và năng lực đội ngũ nhìn thấy được.',
    ],
    differentiationMandates: [
      'Chọn một chuỗi giá trị Việt Nam hư cấu có nguồn dữ liệu thật, không bê lịch sử công nghiệp quốc gia Trung Quốc.',
      'Main bắt đầu ở quy mô phù hợp thân phận; mỗi lần mở rộng phải giải được vốn lưu động và người vận hành.',
      'Đối tác, đại lý và thợ có đòn bẩy riêng, có thể rời đi hoặc học theo khi lợi ích thay đổi.',
    ],
    saturationRisks: [
      'Kể lịch sử doanh nghiệp bằng số liệu và hợp đồng thắng liên tục mà thiếu cảnh lao động, lỗi và quan hệ.',
      'Main nhớ chính xác mọi sản phẩm, thời điểm và giá, khiến nghiên cứu thị trường trở nên vô nghĩa.',
      'Cơ quan, ngân hàng hoặc khách lớn tự phá lệ chỉ vì nhận ra main là thiên tài tương lai.',
    ],
    worldProofTests: [
      'Concept phải nêu ba cảnh chỉ chuỗi cung ứng đã chọn mới sinh ra, không thể đổi tên nhà máy là dùng lại.',
      'Phải vẽ được dòng tiền từ mua vật tư tới thu công nợ và điểm nào có thể làm xưởng chết dù có đơn hàng.',
      'Một lỗi chất lượng phải có cách phát hiện, người chịu thiệt và chi phí sửa chữa cụ thể.',
      'Sau ba mươi chương ký ức tương lai phải giảm giá trị vì đối thủ học, tiêu chuẩn đổi hoặc thị trường phản ứng.',
    ],
    vietnamizationQuestions: [
      'Ngành, địa phương và thời kỳ hư cấu nào cho cảm giác Việt mà không đụng trực tiếp doanh nghiệp hoặc chính sách thật?',
      'Thoại giữa chủ xưởng, thợ, đại lý và gia đình nên khác nhau thế nào để tránh giọng thuyết minh đồng nhất?',
      'Mức tiền, công cụ và cải thiện gia đình nào đủ sảng nhưng vẫn hợp sức mua và quy mô kinh doanh?',
    ],
  }),
  pack('DT-05', {
    sourceUrls: [
      'https://book.qidian.com/booklist/detail/279639/',
      'https://book.qidian.com/booklist/detail/307745/',
      'https://www.qidian.com/kehuan/',
    ],
    comparables: [
      work('两界搬运工', '石闻', 'Dùng chênh lệch nhu cầu giữa hai nơi làm vòng thưởng nhanh, đồng thời cho quan hệ hai bên mở rộng theo giao dịch.'),
      work('我在末世有套房', '晨星LL', 'Cho tài nguyên bị định giá khác nhau ở hai thế giới tạo cơ hội nhưng kéo theo tổ chức và hậu quả quy mô lớn.'),
      work('我在异界有座城', '寒慕白', 'Biến vận chuyển và xây dựng điểm đứng chân thành năng lực tích lũy, không chỉ đổi vật phẩm từng chuyến.'),
      work('苟在两界修仙', '文抄公', 'Dùng hai hệ tài nguyên và rủi ro khác nhau để nhân vật cân bằng tiến triển thay vì một bên cấp đồ miễn phí.'),
      work('两界：从关公像睁眼开始', '七只跳蚤', 'Cho vật phẩm đi qua hai thế giới làm thay đổi cách hiểu, tín nhiệm và quyền lực của người nhận.'),
      work('超时空垃圾站', '小城古道', 'Khai thác giá trị bị bỏ quên nhưng cần kiểm tra công dụng, nguồn gốc và tác động khi đưa vào đời sống hiện tại.'),
    ],
    mechanismConvergences: [
      'Chênh lệch hấp dẫn khi cùng một món đồ giải vấn đề khác nhau ở hai bên và giá trị thay đổi sau mỗi lần giao dịch.',
      'Cổng cần hạn mức khối lượng, thời gian, bảo quản và dấu vết để logistics sinh lựa chọn thay vì làm kho vô hạn.',
      'Đối tác dài hạn tạo áp lực tin cậy, nguồn hàng và phân phối tốt hơn vòng đổi mì gói lấy báu vật.',
    ],
    differentiationMandates: [
      'Thiết kế một đơn vị giá trị không quy đổi thẳng sang tiền và buộc main học nhu cầu văn hóa của cả hai bên.',
      'Mọi hàng hóa phải có nguồn mua, chi phí vận chuyển, người nhận và phản ứng thị trường sau khi xuất hiện.',
      'Main không sở hữu độc quyền tuyệt đối: người khác có thể quan sát, thay thế, điều tra hoặc từ chối giao dịch.',
    ],
    saturationRisks: [
      'Lặp việc mang hàng tiêu dùng rẻ sang đổi tài nguyên quý với người bản địa không biết định giá.',
      'Không ai hỏi nguồn hàng, thuế, bảo quản hoặc biến động giá dù giao dịch ngày càng lớn.',
      'Một bên chỉ là kho đồ còn bên kia chỉ là nơi bán, không có nhân vật và hậu quả độc lập.',
    ],
    worldProofTests: [
      'Concept phải nêu ba giao dịch mà giá trị đến từ văn hóa, luật hoặc sinh thái riêng chứ không chỉ chênh giá.',
      'Phải khóa hạn mức cổng và chứng minh giới hạn đó làm thay đổi lựa chọn trong ít nhất ba tình huống.',
      'Một nguồn cung mới phải khiến giá, quyền lực hoặc nghề nghiệp của ít nhất hai nhóm ở mỗi bên phản ứng.',
      'Sau ba mươi chương vòng thưởng phải tiến từ món hàng sang quan hệ và năng lực logistics, không chỉ tăng giá trị món đổi.',
    ],
    vietnamizationQuestions: [
      'Nguồn hàng và hành vi mua bán nào phù hợp đời sống Việt mà không biến truyện thành hướng dẫn lách luật?',
      'Cách xưng hô và thương lượng nào phân biệt rõ hai thế giới nhưng vẫn giữ thoại tiếng Việt tự nhiên?',
      'Payoff gia đình hoặc cộng đồng nào khiến lợi ích song xuyên có ý nghĩa ngoài việc main giàu nhanh?',
    ],
  }),
  pack('DT-11', {
    sourceUrls: [
      'https://www.chinawriter.com.cn/2013/2013-12-09/184408.html',
      'https://www.chinawriter.com.cn/n1/2023/0215/c404027-32624199.html',
      'https://www.chinawriter.com.cn/2015/2015-07-09/247852.html',
    ],
    comparables: [
      work('黄金瞳', '打眼', 'Dùng tri thức đồ vật, giải mã nguồn gốc và nhịp mỗi món một câu chuyện để tạo tò mò liên tục.'),
      work('天才相师', '打眼', 'Kết hợp nghề đặc thù với mạng quan hệ và bí ẩn văn hóa để năng lực có không gian ứng dụng đa dạng.'),
      work('宝鉴', '打眼', 'Cho kỹ năng giám định mở đường vào thị trường, lịch sử và quan hệ thay vì chỉ báo giá món đồ.'),
      work('大宝鉴', '罗晓', 'Khai thác khoái cảm nhận ra giá trị bị bỏ qua nhưng cần chống lặp mô-típ nhặt rẻ bán đắt.'),
      work('宅师', '烛', 'Biến tri thức truyền thống thành dịch vụ có khách hàng, tranh luận và hậu quả thực tế.'),
      work('捡宝王', '全金属弹壳', 'Dùng đấu giá, kho bãi và phục hồi vật phẩm để tạo quy trình kiếm giá trị thay vì chỉ dựa mắt thần.'),
    ],
    mechanismConvergences: [
      'Đồ vật hấp dẫn khi có lịch sử sở hữu, dấu vết vật liệu, người cần nó và lý do giá trị bị hiểu sai.',
      'Mỗi vụ giám định nên thay đổi uy tín, quan hệ hoặc quyền tiếp cận thị trường chứ không chỉ cộng tiền.',
      'Kiến thức cần được chứng minh bằng thao tác, hồ sơ và phản biện để payoff vừa sảng vừa đáng tin.',
    ],
    differentiationMandates: [
      'Dùng đồ vật, nghề phục hồi và lịch sử văn hóa Việt hư cấu được research riêng, không bê cổ vật Trung Hoa.',
      'Công cụ đặc biệt chỉ gợi một thuộc tính vật liệu; nguồn gốc, giá và tính hợp pháp phải tự điều tra.',
      'Tạo người bán và người mua có nhu cầu chính đáng, không biến mọi giao dịch thành main lừa người ngu.',
    ],
    saturationRisks: [
      'Mỗi món đồ đều là báu vật lớn và người khác đều không nhận ra dấu hiệu hiển nhiên.',
      'Dùng giá tiền cao thay cho câu chuyện vật phẩm, tay nghề và thay đổi quan hệ.',
      'Hàng giả, trộm cắp hoặc xã hội đen xuất hiện tự động mỗi khi cần tăng căng thẳng.',
    ],
    worldProofTests: [
      'Concept phải nêu ba vụ việc chỉ thị trường đồ cũ và văn hóa vật phẩm đã chọn mới sinh ra.',
      'Phải có quy trình hồ sơ nguồn gốc, kiểm tra vật liệu và định giá với ít nhất hai điểm có thể sai.',
      'Một món đồ đúng giá trị nhưng không thể bán ngay phải tạo lựa chọn về vốn, đạo đức hoặc quan hệ.',
      'Sau ba mươi chương main phải tiến từ phát hiện món đồ sang năng lực phục hồi, nguồn hàng và uy tín có thể mất.',
    ],
    vietnamizationQuestions: [
      'Nhóm vật phẩm Việt nào đủ gần gũi để độc giả hiểu payoff nhưng vẫn có chiều sâu nghề nghiệp?',
      'Cách mô tả niên đại, vật liệu và giá trị nào tránh giọng giảng bài hoặc quảng cáo đấu giá?',
      'Giới buôn bán hư cấu cần quan hệ và chuẩn mực gì để tự nhiên mà không gán hành vi xấu cho cộng đồng thật?',
    ],
  }),
  pack('DT-13', {
    sourceUrls: [
      'https://www.chinawriter.com.cn/n1/2022/0331/c404027-32388727.html',
      'https://www.chinawriter.com.cn/n1/2020/0817/c404023-31824563.html',
      'https://www.chinawriter.com.cn/n1/2020/1112/c404027-31928417.html',
    ],
    comparables: [
      work('大医凌然', '志鸟村', 'Dùng ca bệnh và miền kỹ năng mới để tạo vòng hành động, phản hồi và tiến bộ nghề nghiệp dễ theo dõi.'),
      work('手术直播间', '真熊初墨', 'Biến quy trình chuyên môn và áp lực thời gian thành căng thẳng cảnh, đồng thời giữ hậu quả của quyết định y khoa.'),
      work('医路坦途', '臧福生', 'Cho trưởng thành nghề nghiệp đi qua bệnh viện, địa phương, đồng nghiệp và đời sống thay vì chỉ hệ thống thưởng.'),
      work('我能看见状态栏', '罗三观.CS', 'Dùng lợi thế chẩn đoán hẹp để mở giả thuyết nhưng vẫn cần kiểm tra và phối hợp trước khi kết luận.'),
      work('当医生开了外挂', '手握寸关尺', 'Tổ chức nhịp thưởng quanh ca bệnh và kỹ năng nhưng cho thấy nguy cơ khi hệ thống che lấp chủ thể nghề nghiệp.'),
      work('治愈系医生', '真熊初墨', 'Kết hợp kỹ thuật, lựa chọn của bệnh nhân và phát triển đội ngũ để ca bệnh thay đổi nhiều người.'),
    ],
    mechanismConvergences: [
      'Căng thẳng y khoa đến từ thông tin thiếu, thời gian, nguồn lực và quyền bệnh nhân chứ không cần phản diện ngu.',
      'Chi tiết chuyên môn chỉ có giá trị khi biến thành quyết định, thao tác, rủi ro và điều người nhà có thể hiểu.',
      'Tiến bộ nghề nghiệp nên gồm phối hợp, lòng tin và quyền xử lý ca khó, không chỉ mở khóa kỹ năng mới.',
    ],
    differentiationMandates: [
      'Chọn một chuyên khoa và môi trường hư cấu có research quy trình Việt Nam riêng trước khi viết ca bệnh.',
      'Không dùng hệ thống tặng kỹ năng; năng lực phải có lịch sử đào tạo, giới hạn và nhu cầu hội chẩn.',
      'Bệnh nhân có quyền từ chối, hoàn cảnh và đời sống sau điều trị; không tồn tại chỉ để khen bác sĩ.',
    ],
    saturationRisks: [
      'Main nhìn một lần biết hết, xét nghiệm và đồng nghiệp chỉ dùng để xác nhận thiên tài.',
      'Ca nào cũng hiếm, nguy kịch và được cứu ngoạn mục khiến y khoa mất độ thật lẫn nhịp cảm xúc.',
      'Bác sĩ khác vi phạm quy trình vô lý để main có cơ hội vả mặt trước đám đông.',
    ],
    worldProofTests: [
      'Concept phải nêu ba ca hoặc tình huống chỉ chuyên khoa, cơ sở và cộng đồng đã chọn mới sinh ra.',
      'Phải chỉ rõ luồng tiếp nhận, xét nghiệm, hội chẩn và consent cùng điểm nào main không có thẩm quyền tự quyết.',
      'Một kết quả tốt phải vẫn để lại chi phí, theo dõi hoặc lựa chọn của bệnh nhân sau khi rời phòng điều trị.',
      'Sau ba mươi chương phải thấy khoa hoặc đội ngũ thay đổi cách làm, không chỉ danh tiếng cá nhân tăng.',
    ],
    vietnamizationQuestions: [
      'Quy trình và cách xưng hô bệnh viện Việt nào cần xác minh để thoại không mang giọng phim y khoa nước ngoài?',
      'Mức chi phí, bảo hiểm và nguồn lực nào phải hư cấu hóa để tránh tư vấn sai nhưng vẫn có domain truth?',
      'Payoff gia đình và bệnh nhân nào cho độc giả cảm giác ấm áp mà không tô hồng kết quả y khoa?',
    ],
  }),
];

export const FLAGSHIP_CHINESE_BENCHMARKS_V1 = ChineseBenchmarkRegistryV1Schema.parse({
  schemaVersion: 1,
  portfolioId: 'flagship-first-30',
  packs,
});

const bySlot = new Map(FLAGSHIP_CHINESE_BENCHMARKS_V1.packs.map(item => [item.slotId, item]));

export function getChineseBenchmarkPack(slotId: string): ChineseBenchmarkPackV1 | undefined {
  return bySlot.get(slotId);
}
