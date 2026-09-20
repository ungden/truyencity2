import type { EditorialFact } from './editorial-policy';

const fact = (key: string, fromChapter: number, throughChapter: number, value: string): EditorialFact =>
  ({ key, fromChapter, throughChapter, value });

/** Consolidated outcomes replace the old append-only directions from rewrite v1–v7. */
export const EDITORIAL_PILOTS = {
  'mat-the': {
    serialNovelId: '67265a0f-9270-486b-b296-9d158f0821b3',
    novelId: '8c67e4bd-86fa-426e-9169-c71cf7ae7236',
    chapters: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    directions: {
      2: ['Thành Vệ đưa danh sách tới quầy, một bệnh nhân dùng viên số 01. Lâm Việt đổi sáu tinh hạch lấy vốn mua bí tịch.', 'Chu Dã mua Man Ngưu Luyện Thể Quyết, tự luyện tới Luyện Khí tầng một trước người hiểu nghề rồi nhận việc săn có thưởng.'],
      3: ['Lâm Việt định giá lô Tro Tàn, người mua Thanh Huyền gọi đúng phẩm và cạnh tranh bằng đơn thật. Lợi nhuận mở đường chuẩn bị nghề luyện đan.', 'Một lần kiểm phẩm gánh việc chứng minh giá trị; giao dịch nối trong cùng ngày.'],
      4: ['Hứa An và Chu Dã trở lại bằng thân phận mới: Thành Vệ xác nhận kết quả điều trị, đội săn mời Chu Dã bằng quyền chia phần.', 'Thành Vệ đặt sáu đan. Lâm Việt chốt mục tiêu Nhất giai Luyện Đan Sư và điểm giao dịch lớn nhất Đông Hà.'],
      5: ['Lâm Việt dùng giá bán thực tế để chọn quyền định giá độc lập trước Đan Các, rồi tái đầu tư lợi nhuận.', 'Kho thu mua mở, Tro Tàn đổi phiếu cũ và ký nhận tuyến thử, vật tư cùng bản đồ. Chuyến săn bắt đầu chương sau.'],
      6: ['Tô Vãn cấp viên niêm phong 03; Tro Tàn đóng dấu xuất phát trên hợp đồng đã ký. Lâm Việt thiết kế thu mua, khách tự đi săn.', 'Một mẹo thu hoạch Hồng Tuệ tạo lợi ích cho đội. Biển xoay, vết máu và lang canh ổ ghim họ trong bãi lau ở cuối chương.'],
      7: ['Chu Dã dùng công pháp gánh đòn trước những người từng xem thường hắn, tự lấy tinh hạch thuộc phần mình.', 'Hạ bốn lang thường và lang canh ổ. Tiếng tru báo Liệt Trảo Lang Nhất giai hậu kỳ ở sâu trong ổ; Chu Dã muốn mua phù bằng tiền săn.'],
      8: ['Hứa An dùng viên 03, đội phối hợp hạ lang hậu kỳ bằng các năng lực và hàng đã mua.', 'Chia chiến lợi phẩm trước nhân chứng; Chu Dã đổi hạch riêng lấy phù 01. Phiếu 001 nhận năm xác sạch, giữ xác dính bẫy làm chứng.'],
      9: ['Lâm Việt mua và lưu mẫu lô 001, biến 12 cân huyết nhục thành phụ liệu cho một mẻ đan tại Thanh Huyền.', 'Hàn Dược Sư chấm mẻ sáu viên sau khi Lâm Việt nộp phí và thuê lò; trao thẻ Nhất giai Luyện Đan Sư. Main giao đủ sáu viên và nhận 12 hạch còn lại.'],
      10: ['Lâm Việt dùng chứng cứ quyền sở hữu lô 001 bác yêu cầu tịch thu. Dẫn Huyết Phấn dẫn một Lang Vương Nhị giai mới đến.', 'Thành Vệ và Hứa An hạ Lang Vương rồi ký gửi theo phần 6/4. Lâm Việt bán công khai, nhận phí và mở quy mô thương mại mới.'],
    } as Record<number, string[]>,
    canon: [
      fact('gate', 2, 10, 'Chỉ Lâm Việt qua cửa. Hàn Dược Sư ở Thanh Huyền; Hứa An trinh sát ở Đông Hà.'),
      fact('cores', 2, 3, 'Trong 18 hạch ban đầu, bán 6 lấy 1 linh thạch; giữ 12. Chu Dã trả thêm 4 hạch mua bí tịch.'),
      fact('pills', 2, 8, 'Chương 1 Hứa An dùng 1 đan, Thành Vệ nhận 5. Chương 2 bệnh nhân dùng 01 còn 4; chương 6 xuất 03 cho Hứa An, kho còn 3; chương 8 Hứa An dùng 03, kho vẫn 3.'),
      fact('tro_tan_credit', 3, 5, 'Tro Tàn giao 6 cân thịt và 5 Hỏa hạch; nhận phiếu thủ công 6+5=11 đơn vị. Kho mở chương 5 mới đổi thành 11 điểm.'),
      fact('capital', 3, 5, 'Bán 6 cân thịt và 5 Hỏa hạch lấy 44 linh thạch, giá Hỏa hạch 4/viên. Mua 3 bí tịch còn 41.'),
      fact('new_order', 4, 9, 'Thành Vệ đặt đơn mới 6 đan chương 4, cọc 6 hạch. Chương 9 luyện và giao đủ 6 một lần, thu 12 hạch còn lại.'),
      fact('investment', 5, 9, '41 linh thạch: 6 mua phù 01–03; 3 mua dây thép, thuốc và vật tư; 12 mua ba phần Tịnh Mạch thảo, Thanh dịch quả, bột dẫn mạch; giữ 5 phí thi, 5 thuê lò và 10 vốn. Phí thi/lò nộp chương 9.'),
      fact('route', 5, 6, 'Tro Tàn ký Phiếu Tuyến Thử, nhận vật tư 13 điểm và bản đồ chương 5. Chương 6 dùng quyền đã ký để xuất phát.'),
      fact('wolves', 7, 10, 'Chương 7 hạ 4 lang thường và 1 canh ổ, chương 8 hạ 1 hậu kỳ. Xác canh ổ giữ làm chứng; 5 xác sạch vào Phiếu 001. Hạch canh ổ thuộc Chu Dã, đổi phù 01; Tro Tàn mua phù 02–03 chương 9.'),
      fact('lot001', 9, 10, '5 xác cho 43 cân thịt, cửa hàng mua với 32,25 điểm (0,75/cân), dùng 12 còn 31 cân. 5 bộ da/xương và hạch hậu kỳ thuộc Tro Tàn. 10 ống mẫu chia mỗi bên 5.'),
      fact('auction', 10, 10, 'Lang Vương Nhị giai là chiến lợi phẩm mới: Thành Vệ 60%, Hứa An 40%. 50 hạch=5000 điểm, phí 3%=150, ròng 4850 chia 2910/1940.'),
    ],
  },
  'rau-tuoi': {
    serialNovelId: 'b47b6510-182b-4b64-96e1-c4ead89dc477',
    novelId: '67408d38-65fb-4bf6-9351-a63006bf1913',
    chapters: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    directions: {
      2: ['Trần Khải gặp Diệp Ninh tại Tân Hải, xác nhận nguồn 300 kg và điều kiện truy xuất. Tự mang AI về Vân Cảng.', 'Tần Mặc xuất dữ liệu và kiểm mẫu; AI cứu 3.200 đơn thật, Hải Đăng ký hợp đồng 60 triệu, cọc 18 triệu.'],
      3: ['La Chính làm Hồng Ngọc Bồi Dưỡng Nhất giai thượng phẩm, khách đặt bàn bằng tiền thật.', 'Chủ Bếp Hồng Ngọc trao quyền vận hành/chia doanh thu bằng hợp đồng có hiệu lực rõ, giúp La Chính đi từ người thuê bếp sang người quản quầy.'],
      4: ['Khải đối soát quota, tự tới Tân Hải ký hợp đồng robot. Nguồn thực phẩm giúp Diệp Ninh đạt quyền xưởng hoặc một mốc nghề nhìn thấy.', 'Kim thủ chỉ từ Kho lạnh hai thời đại lên Hợp đồng nguồn cung; nghĩa vụ mới thúc đẩy main xây mạng nông trại.'],
      5: ['Phạm Khoa là Phạm tổng của Vạn Tượng, chào mua lõi và quyền sản phẩm. Khải chọn giữ tài sản sinh lời dài hạn.', 'Một ca vận hành thật chứng minh giá trị, Tần Mặc nhận trách nhiệm rồi giải quyết; Khải mở nguồn cung tiếp theo.'],
      6: ['Diệp Ninh kiểm mẫu ở Tân Hải; Khải tự đưa tiêu chuẩn và robot về bốn trại Vân Cảng.', 'Mỗi chủ trại góp xe, kho hoặc trách nhiệm theo lợi ích riêng. Lô Thanh Hạ, Minh Thổ, kiện Quách Tài được kiểm, ký niêm cùng chuyến; neo ngày mới trước chuyến thứ ba.'],
      7: ['Giao hàng thật vào Hải Đăng. Tần Mặc truy mốc quét, giúp hàng đến đúng và phân trách nhiệm; người mua chọn kết quả.', 'Khải Minh nhận phụ lục mở rộng đầu tiên cho Quy trình Truy xuất Đồi Gió. Vạn Tượng dùng vị thế ép chuyến tiếp theo.'],
      8: ['Khải qua Tân Hải đổi lô rau có mã lấy mô-đun Nhãn khóa chuỗi và quyền sử dụng rồi tự mang về cứu chuyến chiều.', 'Vết keo, nhãn cũ và mã bị từ chối tạo vật chứng. Lưu Dũng giữ giá cho 27 thùng sạch, được Liên minh trao quyền kiểm soát nhãn.'],
      9: ['Sáng hôm sau, hoàn tất Nghiệm thu Tuyến Kho Gió Nam trên trang; ba nguồn dữ liệu và vật chứng dẫn tới Ngô Thừa.', 'Quyền vào kho của nhà thầu bị cắt, hồ sơ chuyển điều tra. Phạm Khoa rút khiếu nại, Đường Hải ký tuyến kho mẫu; kiện của Diệp Ninh vẫn niêm phong cho chương 10.'],
      10: ['Đối soát thương mại sau nghiệm thu cho Liên minh đầu ra thật. Khải đề nghị quyền xem kiểm định theo lô, các trại giữ dữ liệu đất khi từ chối độc quyền Thiên Vị.', 'Diệp Ninh nhận 80 kg đầu, giành đơn dịch vụ robot có phí trước người trong nghề, rồi đặt nguồn rau phẩm cao bằng đơn mới.', 'Hạ Vân thử rau trồng đất làm hạt giống nảy mầm. Khải tự tới Tân Hải chốt đơn 36 kg với Tống Kiêu, mở cơ hội khai phá đất.'],
    } as Record<number, string[]>,
    canon: [
      fact('gate', 2, 10, 'Chỉ Trần Khải qua cửa; Diệp Ninh làm việc tại Tân Hải. Các lần giao công nghệ diễn ra tại Tân Hải, Khải tự mang về Vân Cảng.'),
      fact('software', 2, 7, 'Hải Đăng mua dịch vụ và quyền truy cập có hạn; Khải Minh sở hữu lõi Tinh Hỏa, cấu hình và mã nguồn. Hợp đồng đầu ở chương 2 trị giá 60 triệu, cọc 18 triệu.'),
      fact('quota', 2, 10, 'Quota 300 kg Đồi Gió có hạn 30 ngày. La Chính nhận 30 kg/tuần được bảo đảm 4 tuần, 4 tuần sau là quyền ưu tiên khi có nguồn mới. Sau lô 30 kg đầu còn 90 kg bảo đảm.'),
      fact('robot', 4, 10, 'Robot đổi 80 kg/tuần trong 8 tuần. Đến chương 10 Khải giao đủ 80 kg đầu, còn 560 kg nghĩa vụ. Đơn rau phẩm cao mới tách riêng đối giá, giá và thanh toán.'),
      fact('acceptance', 9, 10, 'Nghiệm thu Tuyến Kho Gió Nam và truy Ngô Thừa hoàn tất chương 9. Chương 10 là đối soát thương mại sau nghiệm thu.'),
      fact('research_order', 10, 10, 'Đơn 36 kg nghiên cứu chỉ giải ngân cọc sau khi Khải trực tiếp niêm yết giá và ký tại Tân Hải; trước đó tiền ở ký quỹ viện.'),
    ],
  },
};
