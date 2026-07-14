import { FlagshipSetupBriefV2Schema, type FlagshipSetupBriefV2 } from './setup-contracts';
import { FLAGSHIP_FIRST_30_MANIFEST } from './portfolio-data';
import { getChineseBenchmarkPack } from './chinese-benchmark-data';

type SlotId = FlagshipSetupBriefV2['portfolioSlotId'];

interface StorySpecificBriefInput {
  audience: string;
  desiredExperience: string;
  domain: string;
  advantage: string;
  knowledgeLimit: string;
  primaryRewardLoop: string[];
  comfortLoop: string[];
  setbackRecoveryWindow: number;
  faceSlapPolicy: string;
  progressionSignals: string[];
  boundaries: string[];
  seedConstraints: string[];
}

const COMMON_BOUNDARIES = [
  'Không sao chép tên riêng, hệ sức mạnh, vật phẩm nhận diện, cảnh nổi tiếng hoặc chuỗi sự kiện của bất kỳ tác phẩm đối chiếu nào.',
  'Không dùng đối thủ ngu, đám đông tung hô hoặc may mắn vô nguồn để chứng minh nhân vật chính giỏi; thắng lợi phải có chuẩn bị, bằng chứng và cái giá.',
  'Không kéo dài nhục nhã hoặc bất lực quá cửa sổ hồi phục; áp lực phải buộc nhân vật lựa chọn và làm thay đổi trạng thái truyện.',
  'Tên người, địa danh, tổ chức và giọng thoại phải thuộc riêng truyện này; không dùng hậu tố thể loại hoặc thiết chế chung như một setup thay thế.',
];

const STORY_INPUTS: Record<string, StorySpecificBriefInput> = {
  'HX-01': {
    audience: 'Độc giả nam Việt thích huyền huyễn trí mưu, bí ẩn có thể suy luận và cảm giác phá luật bằng quan sát thay vì chịu hành hạ kéo dài.',
    desiredExperience: 'Mỗi dị tượng là một bài toán có vật chứng, người hưởng lợi và rủi ro thật; main thắng sớm bằng một suy luận kiểm chứng được rồi dần giành quyền giải thích thế giới.',
    domain: 'Một thành phố hư cấu xây quanh các giếng chuông cổ, nơi lời khai được ghi lên giấy tro có thể biến thành quy tắc cưỡng chế nếu đủ người tin và một thiết chế kiểm định đóng dấu.',
    advantage: 'Main là nhân viên phục chế hồ sơ có trí nhớ hình ảnh về nét mực và thói quen sửa giấy, nên nhận ra quy tắc đã bị con người can thiệp trước người khác.',
    knowledgeLimit: 'Anh chỉ nhìn ra dấu vết vật chất và mâu thuẫn trong hồ sơ; không biết đáp án, nguồn dị tượng, ý nghĩ người khác hoặc quy tắc chưa từng để lại bằng chứng.',
    primaryRewardLoop: ['Phát hiện dấu vết sai trong một quy tắc đang gây hại.', 'Đặt phép thử nhỏ có người chứng kiến và chấp nhận rủi ro.', 'Dùng kết quả tìm kẽ hở cứu người hoặc đổi thế thương lượng.', 'Thu vật chứng, uy tín và quyền tiếp cận hồ sơ sâu hơn.'],
    comfortLoop: ['Trở về tiệm sửa giấy ăn bữa khuya với người thân sau mỗi vụ.', 'Dùng thắng lợi để bảo vệ một góc phố và khôi phục sinh hoạt bình thường.'],
    setbackRecoveryWindow: 2,
    faceSlapPolicy: 'Chỉ phản đòn người đã bóp méo hồ sơ hoặc lợi dụng quy tắc vì lợi ích thật; bằng chứng phải công khai và đối phương được quyền phản ứng hợp lý.',
    progressionSignals: ['vật chứng', 'quyền tra hồ sơ', 'uy tín điều tra', 'khu phố an toàn', 'đồng minh biết việc'],
    boundaries: ['Không dùng danh sách điều cấm tùy tiện; mỗi quy tắc phải có cơ chế hình thành, phạm vi và dấu vết kiểm chứng.', 'Không biến tổ chức điều tra thành kho lời giải; các bộ phận có quyền lợi và mức hiểu biết xung đột.', 'Không lấy điên loạn, máu me hoặc úp mở làm chiều sâu thay cho lựa chọn nhân vật.'],
    seedConstraints: ['Ba tình huống đặc trưng phải phụ thuộc giấy tro, giếng chuông và quyền đóng dấu.', 'Chương một phải có một phép thử do main chủ động đề xuất và một người được cứu bằng kết quả.', 'Đến chương ba main phải giành được một vật chứng hoặc quyền tiếp cận mới nhưng đồng thời bị một thiết chế chú ý.', 'Ba mươi chương phải làm ít nhất hai hiểu biết cũ mất giá vì quy tắc chồng lấn.'],
  },
  'HX-04': {
    audience: 'Độc giả nam Việt thích xây dựng lãnh địa, sản xuất và đời sống cộng đồng nhưng vẫn muốn nhân vật, tranh lợi và payoff cụ thể trong từng cụm chương.',
    desiredExperience: 'Khoái cảm đến từ biến một khu tro trắng không giữ được nước thành nơi đáng sống, với từng công trình làm bữa ăn, mái nhà và cán cân quyền lực đổi thật.',
    domain: 'Một thung lũng tro trắng hư cấu, nơi nước chỉ bám vào đá mang dấu tay cộng đồng; ba nhóm dân giữ kỹ năng đào kênh, nung đá và gieo rêu nhưng không tin nhau.',
    advantage: 'Main từng làm người đo đất lưu động, hiểu địa hình và biết tổ chức thử nhỏ để các nhóm nhìn thấy lợi ích chung trước khi góp sức.',
    knowledgeLimit: 'Anh không có bảng xây dựng, vật tư tự sinh hay công nghệ toàn năng; mọi phương án phụ thuộc thợ, mùa, quyền sử dụng đất và sự đồng thuận có thể rút lại.',
    primaryRewardLoop: ['Tìm nút thắt sinh kế đang khiến một nhóm bỏ đi.', 'Ghép kỹ năng và nguồn lực của các phe bằng một cam kết có thể kiểm chứng.', 'Hoàn thành công trình nhỏ rồi đo sản lượng và người chịu thiệt.', 'Tái phân phối lợi ích để mở công trình khó hơn và tăng tính chính danh.'],
    comfortLoop: ['Một bếp chung có thêm món và người sau mỗi thay đổi sản xuất.', 'Nhà ở, nước sạch và tiếng trẻ con trở lại theo tiến độ nhìn thấy được.'],
    setbackRecoveryWindow: 3,
    faceSlapPolicy: 'Main chỉ thắng phe cản trở sau khi chứng minh phương án vận hành và chia rủi ro tốt hơn; không biến dân chúng thành đám đông biết ơn vô điều kiện.',
    progressionSignals: ['nước dự trữ', 'sản lượng lương thực', 'dân ở lại', 'tay nghề', 'tính chính danh', 'công trình được bảo trì'],
    boundaries: ['Không kể bằng báo cáo sản lượng thay cho cảnh lao động, thương lượng và hậu quả trên người thật.', 'Không dựng lộ trình công nghiệp hóa Trái Đất dưới tên huyền huyễn.', 'Mỗi công trình phải có chủ bảo trì, chi phí và nhóm bị ảnh hưởng.'],
    seedConstraints: ['Ba tình huống đặc trưng phải sinh từ tro trắng, đá dấu tay và ba cộng đồng kỹ năng.', 'Chương một main phải giải một nút thắt nước nhỏ bằng nguồn lực sẵn có.', 'Chậm nhất chương ba một bữa ăn hoặc mái nhà phải tốt lên và một tranh chấp phân phối mới phải xuất hiện.', 'Ba mươi chương phải đổi không thể đảo ngược một công trình, một tập quán và một cán cân quyền lực.'],
  },
  'HX-05': {
    audience: 'Độc giả nam Việt thích chế tạo, thử nghiệm và kinh doanh tài nguyên, muốn thấy đồ vật có công dụng trong đời sống thay vì bảng chỉ số dài.',
    desiredExperience: 'Main biến phế liệu có sai số thành dụng cụ hữu ích qua thử nghiệm nhìn thấy được; món đồ bán ra làm đổi quan hệ cung ứng, tay nghề và vị thế của xưởng.',
    domain: 'Một thành cảng hư cấu dùng khoáng vật biết giữ âm rung; phế liệu từ chuông vận tải, bếp nhiệt và máy bơm linh lực được định giá theo độ ổn định chứ không theo độ hiếm.',
    advantage: 'Main sống lại sau một tai nạn xưởng, nhớ nguyên lý cộng hưởng và các lỗi từng gây hỏng hàng nhưng không nhớ công thức hoàn chỉnh.',
    knowledgeLimit: 'Thành phần quặng, dụng cụ đo và độ ẩm hiện tại đều khác; mọi công thức phải thử lại, hao vật liệu và có thể thất bại trước khách hàng.',
    primaryRewardLoop: ['Nhận một nhu cầu thật mà hàng chuẩn đang quá đắt.', 'Phân loại phế liệu và đặt phép thử cộng hưởng nhỏ.', 'Chế tạo, làm hỏng hoặc sửa mẫu bằng cái giá cụ thể.', 'Ứng dụng hoặc bán món đồ rồi tái đầu tư vào dụng cụ và nguồn cung.'],
    comfortLoop: ['Xưởng bớt lạnh, bữa ăn thợ đủ hơn khi đơn hàng có lãi.', 'Một dụng cụ tốt giúp đồng đội làm việc an toàn và tự hào về nghề.'],
    setbackRecoveryWindow: 2,
    faceSlapPolicy: 'Chỉ phản đòn nhà cung ứng hoặc đối thủ đã phá chuẩn, ép giá hay giấu lỗi; kết quả được chứng minh qua phép thử và người dùng thực tế.',
    progressionSignals: ['dụng cụ đo', 'tay nghề', 'tỷ lệ phế phẩm', 'đơn hàng', 'quan hệ cung ứng', 'thợ học việc'],
    boundaries: ['Không đổi tên hóa học hoặc luyện kim Trái Đất rồi coi đó là hệ huyền huyễn.', 'Không để lần thử đầu luôn thành công hoặc phế liệu nào cũng là báu vật.', 'Mỗi sản phẩm phải có giới hạn sử dụng, chi phí bảo trì và tác động thị trường.'],
    seedConstraints: ['Ba tình huống đặc trưng phải dùng cộng hưởng âm, sai số phế liệu và chuẩn nghiệm thu.', 'Chương một phải có phép thử thất bại một phần nhưng giúp main kiếm cơ hội đơn hàng.', 'Chậm nhất chương ba sản phẩm đầu tiên phải tạo tiền hoặc cứu một công đoạn và để lại nghĩa vụ bảo hành.', 'Ba mươi chương phải làm nguồn phế liệu, tiêu chuẩn hoặc nhu cầu thị trường đổi ít nhất hai lần.'],
  },
  'TH-01': {
    audience: 'Độc giả nam Việt thích tu tiên gia tộc, tích lũy dài hạn và tình thân nhiều thế hệ nhưng không muốn vòng leo cảnh giới cổ điển.',
    desiredExperience: 'Mỗi quyết định đầu tư vào người, đất và minh ước có payoff sớm ở đời sống nhưng hệ quả thật chỉ lộ qua nhiều thế hệ; main không thể sở hữu gia tộc như quân cờ.',
    domain: 'Một quần cư tu tiên hư cấu quanh cây Thanh Tùng ghi nhớ lời thề qua vòng gỗ; linh điền chỉ phục hồi khi nhiều nhánh họ cùng luân canh và chia nước.',
    advantage: 'Main trọng sinh về lúc gia tộc sắp bán mảnh linh điền cuối, nhớ xu thế đại biến và vài sai lầm chiến lược của đời trước.',
    knowledgeLimit: 'Ký ức lệch nhanh theo lựa chọn mới, không chứa tọa độ kho báu, công pháp hoàn chỉnh hay lòng trung thành tương lai của con cháu.',
    primaryRewardLoop: ['Nhìn ra một quyết định gia tộc sẽ tạo nợ dài hạn.', 'Thuyết phục đúng người góp tài nguyên bằng quyền lợi và giới hạn rõ.', 'Đầu tư vào đất, nghề hoặc nhân tài rồi nhận payoff có độ trễ.', 'Xử lý thế hệ sau dùng thành quả theo cách khác dự tính.'],
    comfortLoop: ['Bữa giỗ và sân nhà đông dần nhưng lời thoại vẫn cho thấy khác biệt giữa các nhánh.', 'Người già bớt lo, trẻ nhỏ có cơ hội học nghề và mỗi mái nhà hưởng lợi khác nhau.'],
    setbackRecoveryWindow: 3,
    faceSlapPolicy: 'Tranh thắng trong họ phải dựa vào kết quả đầu tư và trách nhiệm gánh lỗ; không biến trưởng bối thành người ngu chỉ để main đoạt quyền.',
    progressionSignals: ['linh điền', 'nhân tài', 'nghề truyền thừa', 'minh ước', 'quỹ chung', 'uy tín giữa các nhánh'],
    boundaries: ['Không nhảy thời gian để bỏ qua hậu quả cảm xúc và vận hành.', 'Không coi con cháu là chỉ số sinh sản hoặc quân cờ tuyệt đối phục tùng.', 'Không dùng cảnh giới làm thước đo tiến bộ duy nhất; sinh kế và thiết chế gia tộc phải đổi.'],
    seedConstraints: ['Ba tình huống đặc trưng phải phụ thuộc vòng gỗ lời thề, luân canh linh điền và xung đột giữa các nhánh.', 'Chương một main phải ngăn một thương vụ có hại bằng phương án thay thế có cái giá.', 'Chương ba phải có lợi ích đời sống đầu tiên và một thành viên tự đưa ra lựa chọn ngoài dự tính.', 'Ba mươi chương phải cho thấy một đầu tư có độ trễ và một butterfly effect làm ký ức mất giá.'],
  },
  'TH-03': {
    audience: 'Độc giả nam Việt thích tu tiên mới, nghiên cứu và trí tuệ tập thể, muốn giả thuyết có thể sai và khám phá tác động đến đời sống.',
    desiredExperience: 'Sảng cảm đến từ đặt đúng câu hỏi, dựng phép đo, bất ngờ trước dữ liệu rồi biến kết quả thành giải pháp; phát hiện luôn mở thêm tranh luận đạo đức hoặc quyền công bố.',
    domain: 'Một học cung trên đỉnh mây nghiên cứu linh khí theo các dải màu chỉ hiện khi đi qua thủy tinh sống; thiết bị đo phải được nuôi, hiệu chuẩn và có thể học sai từ người dùng.',
    advantage: 'Main xuyên tới với thói quen lập giả thuyết và thiết kế kiểm soát, nhưng không mang theo định luật đúng sẵn cho linh khí.',
    knowledgeLimit: 'Tư duy khoa học chỉ giúp loại lỗi và hỏi tốt hơn; dữ liệu, vật liệu, thiết bị và consent của người tham gia đều giới hạn kết luận.',
    primaryRewardLoop: ['Gặp một hiện tượng công pháp hoặc đan dược không khớp giáo trình.', 'Dựng phép đo có đối chứng bằng thiết bị hữu hạn.', 'Nhận kết quả bất ngờ, sửa giả thuyết và trả chi phí thử nghiệm.', 'Ứng dụng phát hiện vào ca thật rồi đối mặt quyền sở hữu tri thức.'],
    comfortLoop: ['Nhóm nghiên cứu nấu ăn và sửa thiết bị cùng nhau sau ca thử.', 'Một ứng dụng nhỏ giúp học viên yếu hoặc người lao động bớt tổn thương.'],
    setbackRecoveryWindow: 2,
    faceSlapPolicy: 'Chỉ phản bác trường phái khác bằng dữ liệu tái lập và công khai giới hạn; đối phương được quyền chỉ ra lỗi và bảo vệ lợi ích học thuật.',
    progressionSignals: ['dữ liệu sạch', 'thiết bị đo', 'quyền phòng thí nghiệm', 'cộng sự', 'công bố', 'ứng dụng an toàn'],
    boundaries: ['Không áp nguyên xi vật lý Trái Đất lên linh khí hoặc cho main độc quyền phương pháp khoa học.', 'Không mô tả thí nghiệm bằng kết quả tóm tắt; phải có thao tác, sai số và quyết định.', 'Không dùng người sống làm vật thử không consent chỉ để tăng nhịp.'],
    seedConstraints: ['Ba tình huống đặc trưng phải phụ thuộc thủy tinh sống, hiệu chuẩn và quyền công bố.', 'Chương một main phải phát hiện một phép đo sai đang gây hại và chủ động kiểm tra lại.', 'Chậm nhất chương ba một ứng dụng nhỏ phải có hiệu quả thật cùng một tranh chấp học thuật.', 'Ba mươi chương phải khiến ít nhất một lý thuyết ban đầu bị sửa và một thiết chế nghiên cứu thay đổi.'],
  },
  'DT-03': {
    audience: 'Độc giả nam Việt thích trọng sinh niên đại, làm xưởng và kinh doanh bằng kỹ thuật có nguồn, với gia đình hưởng lợi sớm và tiến bộ vật chất rõ.',
    desiredExperience: 'Main nhớ nhu cầu tương lai nhưng phải tự làm mẫu, sửa lỗi và dựng mạng phân phối; mỗi lô hàng đổi tiền, dụng cụ, đội ngũ và chất lượng sống.',
    domain: 'Một thị trấn công nghiệp hư cấu năm 1989, nơi xưởng cơ khí tập thể đang thanh lý máy cũ còn các cửa hàng huyện thiếu bơm nước nhỏ dễ sửa cho mùa khô.',
    advantage: 'Main trọng sinh với kinh nghiệm từng vận hành nhà máy, nhớ xu hướng nhu cầu và nguyên lý thiết kế bơm nhưng không có bản vẽ hoàn chỉnh.',
    knowledgeLimit: 'Máy móc, vật liệu, tiêu chuẩn, vốn và tay nghề hiện tại khác ký ức; giá, đơn hàng và phản ứng đại lý không thể biết trước.',
    primaryRewardLoop: ['Chọn nhu cầu nhỏ đang bị hàng lớn bỏ qua.', 'Tận dụng máy và tay nghề sẵn có để làm mẫu.', 'Thử thực địa, sửa lỗi và tính đủ hao hụt.', 'Bán lô nhỏ, thu tiền có nguồn rồi đầu tư vào quy trình và phân phối.'],
    comfortLoop: ['Bữa cơm nhà có thêm thịt và cha mẹ bớt lo sau từng lô hàng.', 'Xưởng sáng đèn, thợ có việc và đồ dùng trong nhà được sửa dần.'],
    setbackRecoveryWindow: 2,
    faceSlapPolicy: 'Chỉ phản đòn người đã ép công nợ, phá cam kết hoặc bán hàng lỗi; chiến thắng dựa vào thử thực địa, chất lượng và giao hàng đúng.',
    progressionSignals: ['tiền mặt', 'máy công cụ', 'tỷ lệ lỗi', 'tay nghề đội', 'đại lý', 'vốn lưu động', 'đời sống gia đình'],
    boundaries: ['Không ăn cắp phát minh hoàn chỉnh, nhảy cóc vật liệu hoặc bịa điều kiện sản xuất cuối thập niên 1980.', 'Không dùng hợp đồng lớn hoặc vốn miễn phí xuất hiện đúng lúc.', 'Mỗi khoản công nợ, nguyên liệu và máy móc phải có chủ, thời hạn và rủi ro.'],
    seedConstraints: ['Ba tình huống đặc trưng phải phụ thuộc máy thanh lý, thử bơm thực địa và mạng cửa hàng huyện.', 'Chương một main phải giữ được một máy hoặc đơn thử bằng hành động chủ động.', 'Chương ba phải có tiền/hàng đầu tiên và một lỗi sản phẩm buộc main nhận trách nhiệm.', 'Ba mươi chương phải chuyển từ làm mẫu sang quy trình và làm lợi thế ký ức giảm dần.'],
  },
  'DT-05': {
    audience: 'Độc giả nam Việt thích song xuyên kinh doanh, chênh lệch giá trị và xây quan hệ hai thế giới nhưng không muốn kho vô hạn hoặc cưỡng ép văn minh.',
    desiredExperience: 'Main kiếm lời bằng ghép đúng nhu cầu và logistics hữu hạn; mỗi chuyến hàng làm giá, lòng tin và quyền lực hai bên đổi nên thắng lợi luôn mở bài toán mới.',
    domain: 'Một cánh cổng chỉ mở trong mưa nối kho hàng ven đô Việt hư cấu với thành bang cao nguyên thiếu vật liệu chống ẩm nhưng dư sợi nấm chịu lực; khối lượng qua cổng phụ thuộc lượng nước mưa hứng được.',
    advantage: 'Main là người quản kho biết kiểm hàng và tính tải, đồng thời là người duy nhất hiện biết lịch mở cổng qua dấu áp suất.',
    knowledgeLimit: 'Anh không biết ngôn ngữ, giá trị thật, luật hay ý định đối tác bên kia; cổng có khối lượng, thời gian và hao mòn đo được.',
    primaryRewardLoop: ['Phát hiện nhu cầu lệch giá trị giữa hai bên.', 'Gom hàng có nguồn và thương lượng điều kiện giao.', 'Vận chuyển trong hạn mức mưa rồi kiểm chất lượng.', 'Bán, xử lý phản ứng thị trường và đầu tư vào đối tác cùng logistics.'],
    comfortLoop: ['Một bữa ăn hai thế giới giúp các đối tác hiểu nhau hơn.', 'Kho hàng bớt dột, gia đình bớt nợ và cộng đồng bên kia có vật dụng thiết thực.'],
    setbackRecoveryWindow: 2,
    faceSlapPolicy: 'Chỉ phản đòn bên phá hợp đồng, thao túng nguồn cung hoặc giấu tiêu chuẩn; kết quả phải thể hiện qua hàng, tải và bằng chứng giao nhận.',
    progressionSignals: ['hạn mức vận chuyển', 'vốn hai thế giới', 'đối tác tin cậy', 'kho bãi', 'tỷ giá giá trị', 'giấy phép địa phương'],
    boundaries: ['Không gian không chứa vô hạn, hàng không tự sinh và cổng không mở theo ý main.', 'Không coi đồ hiện đại rẻ tiền là thần vật vô điều kiện; công dụng phụ thuộc bối cảnh và bảo trì.', 'Không biến cư dân thế giới kia thành đám đông lạc hậu dễ lừa.'],
    seedConstraints: ['Ba tình huống đặc trưng phải phụ thuộc lượng mưa, hạn tải và hai hệ tiêu chuẩn hàng hóa.', 'Chương một main phải thử cổng bằng một món hàng có nguồn và nhận hậu quả đo được.', 'Chương ba phải có giao dịch đầu tiên cùng biến động giá hoặc nghĩa vụ mới ở ít nhất một bên.', 'Ba mươi chương phải khiến một mặt hàng hết lợi thế và buộc main chuyển từ buôn chuyến sang hạ tầng tin cậy.'],
  },
  'DT-11': {
    audience: 'Độc giả nam Việt thích giám bảo, thị trường đồ cũ và thương lượng bằng kiến thức, muốn bí mật món đồ gắn với con người thay vì mắt thần báo giá.',
    desiredExperience: 'Khoái cảm đến từ nhận ra một chi tiết bị định giá sai, kiểm chứng nguồn gốc, phục hồi đúng mức và tìm đúng người mua; mỗi món mở thêm quan hệ và trách nhiệm nghề.',
    domain: 'Một khu chợ đồ cũ hư cấu tại đô thị Việt, xoay quanh gốm lò địa phương thất truyền, hồ sơ di cư của các gia đình và mạng thợ phục hồi có tiêu chuẩn khác nhau.',
    advantage: 'Main có công cụ cảm ứng chỉ báo một thuộc tính vật liệu sau khi chạm và kinh nghiệm làm kho bảo tàng, nên biết câu hỏi nào cần kiểm chứng.',
    knowledgeLimit: 'Cảm ứng luôn có sai số, không cho niên đại, giá, nguồn gốc, tính hợp pháp hoặc ý định chủ đồ; mọi kết luận cần hồ sơ và chuyên gia.',
    primaryRewardLoop: ['Nhận món đồ bị đánh giá sai vì một chi tiết vật liệu.', 'Tìm hồ sơ sở hữu và kiểm chứng bằng nhiều nguồn.', 'Chọn phục hồi, giữ nguyên hoặc kết nối người mua phù hợp.', 'Thu lợi hợp pháp rồi tăng vốn, uy tín và quyền tiếp cận nguồn hàng.'],
    comfortLoop: ['Uống trà và nghe chủ cũ kể lại đời món đồ sau khi giao dịch rõ ràng.', 'Dùng tiền lời sửa căn phòng nhỏ và giữ một món bình dân có ý nghĩa gia đình.'],
    setbackRecoveryWindow: 3,
    faceSlapPolicy: 'Chỉ phản đòn người đã làm giả hồ sơ, ép giá hoặc cố che lỗi; thắng bằng provenance, giám định độc lập và điều khoản giao dịch.',
    progressionSignals: ['hồ sơ nguồn gốc', 'vốn quay vòng', 'uy tín', 'mạng chuyên gia', 'kỹ năng phục hồi', 'nguồn hàng hợp pháp'],
    boundaries: ['Không để chạm món nào cũng trúng đồ quý hoặc công cụ cho giá chính xác.', 'Không bịa lịch sử hiện vật thật, vu cáo bảo tàng/nhà đấu giá/thương hiệu có thật.', 'Mỗi món phải có chi phí phục hồi, rủi ro pháp lý và người sở hữu với động cơ riêng.'],
    seedConstraints: ['Ba tình huống đặc trưng phải phụ thuộc men lò địa phương, hồ sơ gia đình và lựa chọn phục hồi.', 'Chương một main phải từ chối một món lời nhanh vì provenance thiếu rồi tìm được manh mối tốt hơn.', 'Chương ba phải hoàn tất giao dịch nhỏ có lãi và mở một món đồ khó hơn bằng quan hệ đã kiếm.', 'Ba mươi chương phải làm uy tín tạo cả cơ hội lẫn nghĩa vụ, không chỉ tăng giá món đồ.'],
  },
  'DT-13': {
    audience: 'Độc giả nam Việt thích y nghiệp thực tế, phá án chẩn đoán và chữa lành quan hệ, không muốn thần y toàn năng hay đồng nghiệp làm nền tung hô.',
    desiredExperience: 'Main thắng bằng thu thập dấu hiệu, loại giả thuyết và phối hợp đúng thẩm quyền; kết quả điều trị làm bệnh nhân, gia đình và năng lực khoa thay đổi thật.',
    domain: 'Một bệnh viện đa khoa hư cấu tại tỉnh ven biển Việt Nam, tập trung cấp cứu nội khoa và độc chất nghề nghiệp từ xưởng chế biến, với nguồn xét nghiệm và giường theo dõi hữu hạn.',
    advantage: 'Main là bác sĩ nội khoa từng làm tại tuyến cuối, giỏi nhận diện mẫu triệu chứng nghề nghiệp và tổ chức đội khi thông tin thiếu.',
    knowledgeLimit: 'Anh vẫn cần xét nghiệm, hội chẩn, consent và theo dõi; không biết trước chẩn đoán, không vượt quyền chuyên khoa và không thể cứu mọi ca.',
    primaryRewardLoop: ['Thu thập dấu hiệu và bối cảnh nghề nghiệp bị bỏ sót.', 'Loại giả thuyết nguy hiểm trong thời gian và nguồn lực hữu hạn.', 'Phối hợp điều trị đúng thẩm quyền rồi theo dõi đáp ứng.', 'Biến bài học thành quy trình, lòng tin và năng lực đội ngũ.'],
    comfortLoop: ['Một cuộc gọi báo bệnh nhân ăn ngủ lại được hoặc trở về với gia đình.', 'Ca trực kết thúc bằng bữa ăn nguội nhưng đội ngũ bớt phòng thủ và hiểu nhau hơn.'],
    setbackRecoveryWindow: 2,
    faceSlapPolicy: 'Không vả mặt đồng nghiệp; bất đồng chuyên môn được giải bằng dấu hiệu, xét nghiệm, hội chẩn và trách nhiệm công khai.',
    progressionSignals: ['độ chính xác chẩn đoán', 'quyền phối hợp', 'quy trình khoa', 'lòng tin bệnh nhân', 'năng lực điều dưỡng', 'thời gian xử trí'],
    boundaries: ['Không kê toa chi tiết nguy hiểm hoặc trình bày hư cấu như hướng dẫn y tế cho độc giả.', 'Không dùng bệnh hiếm liên tục, xét nghiệm thần tốc hoặc bệnh nhân chỉ để chứng minh main thiên tài.', 'Không vượt consent, thẩm quyền và giới hạn nguồn lực mà không có hậu quả.'],
    seedConstraints: ['Ba tình huống đặc trưng phải phụ thuộc dấu hiệu nghề nghiệp, giới hạn tuyến tỉnh và phối hợp đa vai trò.', 'Chương một main phải chủ động hỏi một câu đổi hướng xử trí nhưng chưa được phép tự kết luận.', 'Chương ba phải có kết quả cụ thể cho bệnh nhân và một thay đổi quy trình nhỏ trong khoa.', 'Ba mươi chương phải cho thấy đội ngũ tiến bộ, một ca không cứu được và giới hạn của main vẫn còn.'],
  },
};

function buildBrief(slotId: SlotId, input: StorySpecificBriefInput): FlagshipSetupBriefV2 {
  const slot = FLAGSHIP_FIRST_30_MANIFEST.slots.find(item => item.slotId === slotId);
  if (!slot || slot.promotionCohort !== 'opening_tournament') throw new Error(`Unknown opening-tournament slot ${slotId}.`);
  const benchmark = getChineseBenchmarkPack(slotId);
  if (!benchmark) throw new Error(`Missing benchmark pack for ${slotId}.`);
  const researchNotes = benchmark.sourceUrls.slice(0, 3).map((source, index) => ({
    source: `${source} — nguồn chính thức trong ${benchmark.id}.`,
    finding: benchmark.mechanismConvergences[index % benchmark.mechanismConvergences.length],
  }));
  return FlagshipSetupBriefV2Schema.parse({
    schemaVersion: 2,
    language: 'vi',
    portfolioSlotId: slot.slotId,
    genreLane: slot.genreLane,
    laneCardIds: slot.laneCardIds,
    distinctnessFingerprint: slot.distinctnessFingerprint,
    researchQuestions: slot.researchQuestions,
    promotionCohort: slot.promotionCohort,
    genre: slot.genre,
    audience: input.audience,
    desiredExperience: input.desiredExperience,
    domain: input.domain,
    pleasureProfile: {
      realityMode: slot.worldMode,
      advantage: input.advantage,
      knowledgeLimit: input.knowledgeLimit,
      primaryRewardLoop: input.primaryRewardLoop,
      comfortLoop: input.comfortLoop,
      setbackRecoveryWindow: input.setbackRecoveryWindow,
      faceSlapPolicy: input.faceSlapPolicy,
      progressionSignals: input.progressionSignals,
    },
    boundaries: [...COMMON_BOUNDARIES, ...input.boundaries],
    researchNotes,
    seedConstraints: input.seedConstraints,
  });
}

export const FLAGSHIP_OPENING_COHORT_BRIEFS_V2 = Object.freeze(
  Object.fromEntries(Object.entries(STORY_INPUTS).map(([slotId, input]) => [slotId, buildBrief(slotId as SlotId, input)])),
) as Readonly<Record<string, FlagshipSetupBriefV2>>;

export function getFlagshipOpeningCohortBrief(slotId: string): FlagshipSetupBriefV2 | undefined {
  return FLAGSHIP_OPENING_COHORT_BRIEFS_V2[slotId];
}
