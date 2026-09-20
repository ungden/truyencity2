/**
 * Human-directed editorial rewrite for already-published serial chapters.
 *
 * Generation is read-only and writes a reviewable candidate bundle outside the repo:
 *   npm run serial:rewrite -- --book=mat-the --output=/tmp/mat-the-rewrite.json
 *   npm run serial:rewrite -- --book=rau-tuoi --output=/tmp/rau-tuoi-rewrite.json
 *
 * Applying is intentionally handled by the revision RPC after the candidate bundle has
 * been read. This script never silently replaces a published chapter.
 */
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { geminiProvider } from '@/services/story-factory/provider';
import { PremiseSchema, type ChapterDraft } from '@/services/serial/contracts';
import { rewriteChapterEditorially } from '@/services/serial/editorial';
import { EditorialReviewSchema } from '@/services/serial/editorial';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const bookKey = value('book');
const outputPath = value('output');
const model = value('model') ?? 'gpt-5.6-terra';
const sourceBundlePath = value('source-bundle');
if (!bookKey || !outputPath) throw new Error('Usage: --book=mat-the|rau-tuoi --output=/tmp/file.json [--chapters=2,5]');
const candidateOutputPath = outputPath;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const books = {
  'mat-the': {
    serialNovelId: '67265a0f-9270-486b-b296-9d158f0821b3',
    novelId: '8c67e4bd-86fa-426e-9169-c71cf7ae7236',
    chapters: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    directions: {
      2: [
        'Trả lời hẹn cuối chương 1 ngay trên trang: Thành Vệ mang danh sách người thức tỉnh bất ổn tới quầy và xác nhận người hoặc ca đầu tiên sẽ dùng số Tịnh Mạch Đan họ đã mua.',
        'Trước khi mua bí tịch, cho Lâm Việt đem một phần trong mười tám tinh hạch vừa thu được sang Thanh Huyền Giới đổi lấy linh thạch; ghi rõ phần bán và phần còn giữ để vòng vốn song giới đầu tiên khép kín.',
        'Chu Dã mua Man Ngưu Luyện Thể Quyết Nhất giai trung phẩm bằng tài sản hoặc cam kết có giá trị của chính hắn, tự luyện thành Luyện Khí tầng một ngay tại chỗ và được người hiểu nghề gọi đúng cấp.',
        'Kết bằng việc Chu Dã nhận một việc săn có thưởng để dùng sức mạnh mới kiếm tinh hạch. Đây là bước mua và bước ra đồng đi farm, không phải Lâm Việt truyền đạo miễn phí.',
        'Sáu tinh hạch đổi lấy linh thạch phải rời khỏi tay Lâm Việt; chốt sổ rõ mười hai viên cũ còn lại và bốn viên Chu Dã vừa trả.',
      ],
      3: [
        'Giữ trọn vòng sáu cân thịt Thiết Giáp Ngưu và năm tinh hạch Hỏa đổi thành bốn mươi bốn linh thạch rồi ba bản bí tịch, nhưng dựng quanh mắt nhìn giá và quyết định vốn của Lâm Việt.',
        'Không dùng “hôm qua” vì toàn bộ mở đầu đang diễn ra trong cùng ngày; nối trực tiếp từ lần qua cửa trước đó.',
        'Một lần kiểm phẩm đủ chứng minh giá trị; để người mua cạnh tranh bằng giá và đơn thật thay cho hai màn thử liên tiếp.',
        'Cho Lâm Việt giữ lại một phần vốn hoặc nguyên liệu cụ thể cho con đường thi Nhất giai Luyện Đan Sư, chưa tăng nghề trong chương này.',
        'Chỉ dùng một màn kiểm phẩm. Người cạnh tranh mua tinh hạch Hỏa phải có nhu cầu dùng thật, không chen giá cho đủ phản ứng.',
        'Kho thu mua chưa mở ở chương này. Mười một đơn vị trả Đội Tro Tàn chỉ là phiếu số dư thủ công có chữ ký Lâm Việt, chưa được gọi là điểm hệ thống; Bạch Tẫn phải hỏi và nhìn thấy nó trừ được vào món nào.',
      ],
      4: [
        'Trọng tâm là Hứa An và Chu Dã quay lại bằng thân phận mới, khiến Thành Vệ đặt đơn sáu viên và Lâm Việt nhìn thấy quy mô tổ chức.',
        'Gộp việc chứng minh cấp bậc vào một cảnh có va chạm lợi ích; giảm phép tính và lời giải thích sổ sách.',
        'Lâm Việt tuyên bố đúng mục tiêu điểm giao dịch lớn nhất Đông Hà và chốt bước kế tiếp để thi Nhất giai Luyện Đan Sư.',
        'Mười một điểm trên thẻ Tro Tàn là tiền mua thịt và tinh hạch thuộc quyền đội, không được đổi thành hạn mức thưởng; nếu ưu tiên đặt hàng thì ghi thành quyền riêng ngoài số dư.',
        'Nếu dùng quyền ưu tiên của Hứa An, cho phiếu hoặc điều kiện hạn hàng xuất hiện vật chất trên trang và có người cạnh tranh thật; nếu không cần thì bỏ hẳn cơ chế đó.',
        'Bỏ màn Chu Dã thử bia thứ hai. Hứa An có thể được Thành Vệ xác nhận qua ca điều trị hoặc hồ sơ; Chu Dã được đội săn mời thẳng bằng điều kiện chia phần, để payoff không lặp demo-chuyên gia-đám đông.',
      ],
      5: [
        'Dựng cuộc gặp Đan Các thành lựa chọn giữa được bảo hộ và mất quyền định giá; Lâm Việt thắng bằng việc hiểu nguồn hàng và tự chọn con đường độc lập.',
        'Danh mục thu mua xuất hiện như công cụ phản công sau lựa chọn đó, không phải một đoạn đọc catalog.',
        'Cho lợi nhuận chương 3 biến thành một bước chuẩn bị nghề luyện đan nhìn thấy, nhưng Lâm Việt vẫn là Đan đồ.',
        'Nếu nhắc Luyện Khí tầng ba, cho một chi tiết ngắn xác lập đây là tu vi tích từ những tháng trông lò trước khi mở cửa hàng, tuyệt đối không biến thành đột phá mới.',
        'Giữ chứng từ Hỏa Văn Lô đúng bốn linh thạch một tinh hạch Hỏa. Nếu Đan Các mua quyền báo trước thì giá phải cao hơn hoặc lợi ích khác phải được định giá rõ, không được đổi chứng từ thành ba.',
        'Lô huyết nhục đầu của Lão Quách phải được người mua bên Thanh Huyền chốt giá hoặc đổi thành nguyên liệu/linh thạch nhìn thấy ngay trong chương.',
        'Khi Kho thu mua thật sự mở, cho Bạch Tẫn mang phiếu số dư thủ công chương 3 tới đổi công khai thành đúng mười một điểm. Không được dùng điểm hệ thống trước khoảnh khắc mở khóa này.',
        'Chỉ giao bản đồ và hẹn tập hợp; toàn bộ thao tác đào Hồng Tuệ để sang chương 6. Lão Quách tự kéo hàng vào kho hoặc Lâm Việt tự dùng xe đẩy, không xuất hiện nhân viên vô danh.',
        'Dùng 41 linh thạch còn lại tái đầu tư có sổ: 6 linh thạch mua ba Hộ Thân Phù Nhất giai hạ phẩm đánh số 01–03; 3 linh thạch mua tồn dây thép, thuốc cầm máu và vật tư; 12 linh thạch mua ba phần Tịnh Mạch thảo, Thanh dịch quả và bột dẫn mạch; giữ 5 phí báo danh, 5 thuê lò và 10 vốn lưu động.',
      ],
      6: [
        'Cho Lâm Việt chủ động thiết kế chuyến Bãi Săn Bờ Đông bằng một quy tắc thu hàng hoặc cách dùng vật tư tu tiên, còn Hứa An, Chu Dã và Tro Tàn tự gánh hành động ngoài bãi.',
        'Chi tiết thu hoạch chỉ giữ một mẹo có giá trị; phần còn lại là quan hệ trong đội và mối nguy đang siết lại.',
        'Kết đúng việc tấm biển bị xoay và dấu máu kéo họ vào bãi lau; một con lang canh ổ lao ra, cả đội bị ghim tại đó để chương 7 tiếp tục. Không cho họ đổi sang cầu số bốn hoặc thoát khỏi hiện trường.',
        'Trước khi đội xuất phát, Tô Vãn cấp cho Hứa An một viên Tịnh Mạch Đan có số niêm phong từ năm viên Thành Vệ đã mua ở chương 1 và ghi tồn kho còn ba; đây là viên sẽ dùng ở chương 8.',
        'Sổ đan cố định: Thành Vệ mua năm viên ở chương 1; bệnh nhân chương 2 dùng viên số 01 nên còn bốn; chương này xuất viên số 03 cho Hứa An nên kho trung tâm còn ba. Nêu đúng lịch sử ấy trên phiếu, không gọi đây là lô mới nhập.',
      ],
      7: [
        'Trả ngay cuộc phục kích trong bãi lau. Chu Dã dùng Man Ngưu Luyện Thể Quyết gánh đòn và đoạt tinh hạch đầu tiên; Hứa An cùng Tro Tàn có phần chiến lợi phẩm rõ ràng.',
        'Con bị giết ở đây chỉ là lang canh ổ to lớn, không gọi là đầu đàn. Tiếng tru sâu trong khu săn phải báo con Liệt Trảo Lang Nhất giai hậu kỳ thật sự cho chương 8.',
        'Cho Chu Dã công khai sức mạnh trước đội từng xem hắn là người không dị năng, nhận tiền công hoặc phần tinh hạch và quyết định mang vốn quay lại cửa hàng mua đồ phòng thân cao hơn.',
        'Đếm đúng số xác đã được hạ trên trang; Chu Dã tự tay lấy tinh hạch thuộc phần mình. Cuối chương gọi thẳng Liệt Trảo Lang Nhất giai hậu kỳ đang ở sâu trong ổ.',
      ],
      8: [
        'Đầu đàn Liệt Trảo Lang Nhất giai hậu kỳ xuất hiện đúng từ tiếng tru cuối chương 7. Cả đội thắng bằng công pháp, Tịnh Mạch Đan và lựa chọn phối hợp đã mua từ cửa hàng.',
        'Sau khi chiến lợi phẩm được chia trước người chứng kiến, Chu Dã dùng phần tinh hạch vừa farm được quay lại đặt mua Hộ Thân Phù Nhất giai hạ phẩm; đây là cú khép vòng mua → mạnh → farm → khoe → mua cấp cao hơn.',
        'Giữ cái bẫy vật chứng cho tuyến Cao Nguyên nhưng không lặp kết cấu Lâm Việt phát phiếu rồi đám đông xếp hàng; giao dịch nâng cấp phải là cuộc mua có tên, giá và mong muốn riêng.',
        'Khi Hứa An dùng Tịnh Mạch Đan, xé đúng niêm phong đã nhận ở chương 6 và ghi nhận Thành Vệ đã dùng một viên, còn ba viên từ lô cũ.',
        'Sổ xác cố định: chương 7 có bốn lang thường và một lang canh ổ; chương 8 thêm một Liệt Trảo Lang Nhất giai hậu kỳ. Một xác lang canh ổ dính bẫy được giữ làm vật chứng, còn đúng năm xác sạch cùng một tinh hạch hậu kỳ vào Phiếu số 001.',
        'Chu Dã đổi hạch lang canh ổ lấy đúng Hộ Thân Phù số 01 đã được nhập ở chương 5; cửa hàng còn phù số 02–03, không được tự sinh phù mới.',
      ],
      9: [
        'Nén phần tranh luật vào một va chạm ngắn rồi đưa Lâm Việt qua Thanh Huyền Giới biến huyết nhục thành nguyên liệu luyện đan thật.',
        'Hàn Dược Sư phải nhìn thấy một thao tác hoặc phán đoán nghề của Lâm Việt và cho hắn một bước gần hơn tới kỳ khảo Nhất giai Luyện Đan Sư, chưa trao cấp.',
        'Bảo chứng Thành Vệ có giá trị vì nó làm các đội săn lập tức dám giao hàng, không cần giải thích dài điều khoản.',
        'Trước khi bán phần thịt tranh chấp, Lâm Việt phải cân, niêm phong mẫu, ghi đúng chủ hàng và phần chia; chứng cứ ở lại rồi phần hợp lệ mới được đưa sang Thanh Huyền Giới.',
        'Hàn Dược Sư phải cân đúng phần huyết nhục nhận và đổi ra số lượng nguyên liệu hoặc giá trị cụ thể; không được cho Lâm Việt nguyên liệu miễn phí. Xử lý rõ phần lẻ khi 43 cân quy đổi thành điểm.',
        'Dùng nguyên liệu vừa đổi để Lâm Việt mở lò trên trang, luyện thành ít nhất hai Tịnh Mạch Đan đạt chuẩn và được Hàn Dược Sư xác nhận/đăng ký là Nhất giai Luyện Đan Sư. Hắn tự mang đợt đầu giao Thành Vệ, trừ vào đơn sáu viên và nhận phần thanh toán tương ứng.',
        'Không giao quầy cho một Hứa An khác hay nhân viên chưa tồn tại. Hứa An trinh sát vẫn ở Đông Hà; tại Thanh Huyền chỉ có người đã được canon thiết lập.',
        'Trước khi mở lò, Lâm Việt nộp 5 linh thạch phí báo danh và 5 linh thạch thuê lò từ khoản đã giữ; Hàn Dược Sư là giám khảo. Công thức dùng đủ Tịnh Mạch thảo, Thanh dịch quả, bột dẫn mạch đã mua ở chương 5 cùng phụ liệu đổi từ huyết nhục.',
        'Chỉ sau khi sáu viên đạt chuẩn, sổ thu phí và lò thuê khớp thì Lâm Việt mới nhận thẻ Nhất giai Luyện Đan Sư. Hộ Thân Phù số 02–03 nếu bán cho Tro Tàn phải ghi hết tồn kho.',
      ],
      10: [
        'Làm rõ Lang Vương lần theo Dẫn Huyết Phấn trên vật chứng bằng dấu hiệu đã thấy trước khi nó tấn công; Lâm Việt là người nhận ra và quyết định cách biến cái bẫy thành chứng cứ.',
        'Giữ cú kết liễu cho Tô Vãn và vai trò chặn đòn của Hứa An; phản ứng sau trận đến từ người muốn chia việc, mua vật liệu hoặc đổi phe.',
        'Cuộc đối chất phải khép lại thật, Cao Nguyên mất quyền tịch thu nhưng còn lực; đoàn xe bọc thép cuối chương vẫn là hook chương 11.',
        'Thành Vệ phải tuyên bố quyền sở hữu và phần chia Lang Vương Nhị giai trước. Sau đó họ ký gửi Song Giới xử lý hoặc đấu giá; Bạch Nha và Hắc Cẩu chỉ nhận hợp đồng gia công có trả công.',
        'Không kết lần nữa bằng cảnh xếp hàng lấy phiếu. Dùng phiên ký gửi, đấu giá kín hoặc đơn tổ chức để đổi hình dạng payoff.',
        'Hàn Dược Sư không được xuất hiện ở Đông Hà vì chỉ Lâm Việt qua cửa. Dùng Dược đường Đông Hà hoặc người mua bản địa; mẫu dành cho Hàn Dược Sư do Lâm Việt tự mang về sau.',
        'Hứa An phải tự ký hoặc nói rõ đồng ý ký gửi phần bốn của mình và đặt giá sàn. Vật chứng chỉ đủ bác việc tịch thu; chưa được kết luận Cao Nguyên chủ mưu giết người khi chưa có thêm chứng cứ.',
        'Sổ lô tranh chấp cố định: Phiếu 001 có năm xác sạch và một tinh hạch Nhất giai hậu kỳ; chương 9 đã mua đúng 43 cân huyết nhục, giữ năm ống mẫu, còn da/xương thuộc Tro Tàn. Không được tự sinh 17 hạch, 63 cân hoặc bốn da. Hòm tại trạm chỉ chứa phần da/xương, mẫu và chứng từ còn lại.',
        'Lang Vương Nhị giai tấn công trong chương này là chiến lợi phẩm hoàn toàn mới, tách sổ khỏi lô Phiếu 001. Gọi đúng hình thức trả giá công khai hoặc thật sự dùng thẻ giá kín, không trộn thuật ngữ.',
        'Trong đối chất phải nói đúng: cửa hàng chỉ sở hữu 43 cân thịt (đã dùng 12, còn 31); tinh hạch hậu kỳ và năm bộ da/xương vẫn thuộc Đội Tro Tàn. Tuyệt đối không gọi tinh hạch hậu kỳ là hàng cửa hàng đã mua.',
        'Phiên bán Lang Vương mới dùng một đơn vị tự kiểm được: quy ước 1 tinh hạch Nhất giai = 100 hạch điểm. Chốt 50 hạch = 5.000 điểm, phí 3% = 150, ròng 4.850, chia Thành Vệ 2.910 và Hứa An 1.940 theo tỷ lệ 6/4.',
      ],
    } satisfies Record<number, string[]>,
  },
  'rau-tuoi': {
    serialNovelId: 'b47b6510-182b-4b64-96e1-c4ead89dc477',
    novelId: '67408d38-65fb-4bf6-9351-a63006bf1913',
    chapters: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    directions: {
      2: [
        'Trả hook Diệp Ninh ở đầu chương bằng một cuộc gặp qua cửa: Trần Khải xác nhận đã mua quota 300 kg, Diệp Ninh nêu điều kiện truy xuất và giữ quyền đàm phán lô sau; chỉ Trần Khải được đi qua cửa.',
        'Giữ kết quả 3.200 đơn, hợp đồng sáu mươi triệu và cọc mười tám triệu, nhưng cho Tần Mặc xuất dữ liệu thử, ánh xạ trường và kiểm lại mẫu trước khi tin.',
        'Khải Minh bán dịch vụ chạy trên lõi mình sở hữu; Hải Đăng không nhận hoặc mua lại giấy phép Tinh Hỏa.',
        'Sảng đến từ Đường Hải thấy đơn thật được cứu và ký pilot ngay, không đến từ AI tự chui vào ba hệ thống không cần chuẩn bị.',
        'Trong hợp đồng phải viết rõ Hải Đăng mua dịch vụ và quyền truy cập có thời hạn; lõi Tinh Hỏa, cấu hình và mã nguồn vẫn thuộc Khải Minh.',
      ],
      3: [
        'Giữ payoff La Chính làm món Hồng Ngọc Bồi Dưỡng Nhất giai thượng phẩm và được người hiểu nghề gọi đúng cấp, nhưng biến thành quyền kinh doanh đi lên chứ không chỉ giàu thêm.',
        'Quota 300 kg chỉ có quyền lấy linh hoạt trong 30 ngày, nên hợp đồng chắc chắn với La Chính chỉ chốt bốn tuần, 30 kg mỗi tuần. Bốn tuần tiếp theo chỉ là quyền ưu tiên nếu Khải Minh ký được nguồn mới, không được lấy 210 kg cũ chống lưng cho tám tuần.',
        'Bếp Hồng Ngọc ban đầu chỉ được La Chính thuê theo ngày. Chủ bếp phải ký hợp đồng vận hành dài hạn hoặc chia doanh thu, trao quyền treo biển/quản quầy rồi La Chính mới được nói bếp hay nhà hàng của mình.',
        'Phản ứng công khai phải biến thành khách đặt bàn, chủ bếp trao quyền và La Chính có mốc nghề/nghề nghiệp mới; không kết chỉ bằng một màn máy quét rồi đám đông hô.',
      ],
      4: [
        'Đối soát quota đúng sau chương 3: La Chính đã nhận 30 kg tuần đầu, còn 90 kg nghĩa vụ bảo đảm cho ba tuần; 120 kg của bốn tuần ưu tiên sau ghi rõ CHƯA CAM KẾT. Không được nói đã khóa 210 kg cho bảy tuần.',
        'Diệp Ninh ở Tân Hải ký hợp đồng robot đổi 80 kg mỗi tuần trong 8 tuần; nguồn 560 kg còn lại là mục tiêu Trần Khải phải mở rộng bằng mạng nông trại, không được giả vờ quota 300 kg đã đủ.',
        'Chương này chỉ nâng cấp kim thủ chỉ từ Kho lạnh hai thời đại lên Hợp đồng nguồn cung sau khi hai bên ký trực tiếp, nêu điều kiện và đối giá. Diệp Ninh phải có một mốc nghề nghiệp hoặc quyền xưởng nhìn thấy nhờ lô thực phẩm đầu.',
        'Chỉ Trần Khải qua cửa; Diệp Ninh không xuất hiện ở Vân Cảng.',
      ],
      5: [
        'Xác lập ngay Phạm Khoa chính là Phạm tổng có quyền ký của Vạn Tượng, không để hai danh phận mơ hồ.',
        'Biến cuộc gặp Phạm Khoa thành một lựa chọn có mất mát thật: tiền mua đứt đủ giải quyết khó khăn trước mắt nhưng Điều khoản Khóa Lõi sẽ cắt đường sản phẩm.',
        'Cho một sự cố đang chạy ở Hải Đăng hoặc một câu hỏi kỹ thuật cụ thể chứng minh lõi có giá trị; nhân vật nói để ép giá hoặc giữ quyền, không đọc thông điệp doanh nghiệp.',
        'Kết bằng hành động mở nguồn cung tiếp theo, không bằng khẩu hiệu “kết quả trả lời”.',
        'Tần Mặc chỉ được lên quyền vận hành sau khi tự nhận một trách nhiệm có rủi ro cụ thể và giải quyết được nó, không nhận chức như phần thưởng tức thời.',
      ],
      6: [
        'Chỉ Trần Khải được đi qua cửa. Diệp Ninh kiểm tra mẫu và truyền tiêu chuẩn ở đầu Tân Hải; Trần Khải tự mang hiểu biết và robot về tổ chức bốn nông trại Vân Cảng.',
        'Mỗi chủ trại có một nỗi sợ hoặc lợi ích khác nhau; Liên minh Đồi Gió ra đời từ thỏa thuận họ tự chọn, không từ một bài giảng quy trình.',
        'Một lần robot tách được lô tốt khỏi lô lỗi phải tạo ra giá hoặc quyền bán cụ thể ngay tại cảnh.',
        'Tách rõ ngày mới trước chuyến thứ ba. Bốn chủ trại phải tự cam kết phí xe, kho hoặc trách nhiệm theo lợi ích riêng rồi mới có quyền dùng nhãn Liên minh.',
        'Trước khi xe rời đi, cho cả lô Thanh Hạ, Minh Thổ và kiện Quách Tài đã sửa được kiểm bù, ký niêm và chất lên cùng chuyến; chương 7 không được tự sinh hàng ngoài trang.',
      ],
      7: [
        'Đây là chuyến giao thật vào Hải Đăng. Quy trình chứng minh giá trị khi cứu một vấn đề phát sinh tự nhiên của lô hàng, không dựng thêm cuộc thi phần mềm sân khấu.',
        'Vạn Tượng dùng giá rẻ và vị thế để chen vào; Hải Đăng chọn theo hàng đến đúng và truy được trách nhiệm.',
        'Khải Minh nhận hợp đồng triển khai; đòn ép các nông trại hủy chuyến sau tới sau payoff, làm hook mới.',
        'Đây là phụ lục mở rộng đầu tiên cho Quy trình Truy xuất Đồi Gió, không được gọi là hợp đồng đầu tiên của Khải Minh vì chương 2 đã có hợp đồng sáu mươi triệu.',
        'Tần Mặc chứng minh bằng thao tác truy mốc quét và phân trách nhiệm; không đứng giữa cao trào để đọc bài giới thiệu Tinh Hỏa.',
      ],
      8: [
        'Lưu Dũng giữ người bằng quyền lợi minh bạch; Trần Khải mang robot tương lai tới kho, Diệp Ninh không xuất hiện ở Vân Cảng.',
        'Nhãn khóa chuỗi phát hiện can thiệp trong lúc xử lý lô thật. Chỉ nêu nghi vấn và giữ vật chứng; bằng chứng về thủ phạm dành cho chương 9.',
        'Các nông trại đổi thái độ vì phần hàng sạch vẫn được nhận và trả đúng giá, không chỉ vì mọi người hô công nghệ lợi hại.',
        'Trước khi dùng Nhãn khóa chuỗi, Trần Khải tự qua cửa gặp Diệp Ninh ở Tân Hải, đổi một lô rau có mã lấy mô-đun nhãn hoặc kích hoạt phần giấy phép robot; ghi rõ phạm vi sử dụng. Diệp Ninh không sang Vân Cảng.',
        'Vai trò kỹ thuật của Diệp Ninh được giữ qua chính giao dịch, cấu hình và lời dặn trước khi Khải mang mô-đun về; không gọi cô từ Vân Cảng nếu chưa thiết lập kênh liên lạc xuyên giới.',
        'Nối thời gian rõ: sau khi khóa suất xe ở Hải Đăng, Khải lập tức qua cửa lấy công cụ cứu chuyến chiều. Vật chứng tráo nhãn phải có vết keo/bóc nhãn cũ và mã lô bị từ chối, không chỉ là xấp nhãn lạ nằm trong thùng.',
        'Payoff chương này là Liên minh tự trao quyền kiểm soát nhãn và phân trách nhiệm cho Lưu Dũng sau khi ông giữ giá đúng cho 27 thùng sạch; không chốt thêm một hợp đồng demo mới.',
      ],
      9: [
        'Cắt cảnh rõ sang sáng hôm sau trước khi Nghiệm thu Tuyến Kho Gió Nam bắt đầu.',
        'Thực hiện và kết thúc Nghiệm thu Tuyến Kho Gió Nam ngay trong chương này, không hẹn thêm sang ngày mai.',
        'Ba nguồn dữ liệu cùng dấu nhãn dẫn tới Ngô Thừa, nhà thầu của Vạn Tượng; Đường Hải ký tuyến kho mẫu cho Khải Minh và lô Đồi Gió được nhận.',
        'Phạm Khoa không nhận tội thay cấp dưới nhưng buộc phải rút khiếu nại và mất hợp đồng; hắn còn đủ lực chuyển sang đấu bằng vốn và khách hàng.',
        'Khóa dứt khoát Ngô Thừa: tên hắn vào biên bản, quyền vào kho bị cắt và hồ sơ chuyển điều tra. Nếu gieo phản diện cao hơn thì phải bằng một đầu mối mới, không lặp câu hỏi ai dán nhãn.',
        'Điều tra viên chỉ nhận niêm phong, nhật ký và biên bản; Ngô Thừa bị vô hiệu quyền và được mời làm việc ở địa chỉ nhà thầu, không tự dưng bị bắt tại kho khi không có mặt.',
        'Kiện cải tiến của Diệp Ninh nếu xuất hiện cuối chương phải còn nguyên niêm phong để chương 10 chỉ mở một lần. Digest/tracker sau chương phải coi nghiệm thu và truy Ngô Thừa đã trả xong.',
      ],
      10: [
        'Mở bằng thành quả sau nghiệm thu: nông trại có đầu ra và Khải Minh có tuyến kho thật. Sau đó Thiên Vị đưa Điều khoản Bao Tiêu Thanh Khiết để mua quyền dữ liệu đất.',
        'Lưu Dũng tự đọc ra cái giá của hợp đồng và nói “Dữ liệu đất của chúng tôi, không bán”; Trần Khải cung cấp phương án xác minh theo lô thay vì diễn thuyết.',
        'Dành nửa sau cho Hạ Vân và Tống Kiêu phát hiện rau trồng đất làm hạt giống nhiễm hóa nảy mầm; kết vào cơ hội cứu đất tương lai.',
        'Không lặp nghiệm thu và không gài lại Ngô Thừa. Sự kiện kho nếu có chỉ là ca tải cực hạn hoặc đối soát doanh thu sau hợp đồng, với KPI mới và kết quả riêng.',
        'Trần Khải giao đủ 80 kg lô đầu cho Diệp Ninh qua cửa, ghi còn nợ 560 kg. Diệp dùng lô này hoàn thiện robot hoặc giữ trạng thái nghề, giành một đơn/xưởng mới trước người trong nghề rồi quay lại đặt nguồn cung phẩm cao hơn.',
        'Hạ Vân làm đối chứng ngay tại Viện Dinh Dưỡng Tân Hải; Tống Kiêu chốt đơn thử có số lượng, giá, cọc và lịch nhận cho lô rau trồng đất tiếp theo.',
        'Tống Kiêu khi Trần Khải vắng mặt chỉ được gửi yêu cầu giữ chỗ và để tiền trong ký quỹ của viện. Trần Khải phải tự mang mẫu sang Tân Hải, niêm yết giá và ký trực tiếp thì cọc mới giải ngân, đúng luật cửa.',
        'Đối đầu Thiên Vị bằng phụ lục thật: người mua chỉ xem dữ liệu kiểm định theo lô đã che bí quyết, quyền xem hết hạn theo đợt hàng và dữ liệu gốc vẫn thuộc từng trại. Bành Lệ từ chối vì muốn quyền kiểm soát.',
        'Nếu có buổi sáng hôm sau, gọi đúng là đối soát thương mại hoặc phiên định giá dữ liệu và hàng hóa; không gọi lại nghiệm thu tuyến kho đã xong ở chương 9.',
        'Đối soát thương mại phải xảy ra trên trang: Hải Đăng hoặc người mua nhận phụ lục xem dữ liệu theo lô và chốt số lượng/khung giá, cho Liên minh lựa chọn thật trước khi từ chối độc quyền Thiên Vị.',
        'Diệp Ninh phải nhận một lệnh chạy/đơn dịch vụ robot có phí và KPI thật trước người trong nghề. Nghĩa vụ robot cũ còn 7 kỳ x 80 kg = 560 kg; mọi đơn rau cấp tuyển chọn giá cao hơn phải là phụ lục hoặc đơn mua mới tách biệt.',
      ],
    } satisfies Record<number, string[]>,
  },
} as const;

const selectedBook = books[bookKey as keyof typeof books];
if (!selectedBook) throw new Error(`Unknown book ${bookKey}.`);
const requested = value('chapters')?.split(',').map(Number).filter(Number.isInteger);
const targetChapters = requested?.length
  ? selectedBook.chapters.filter(chapter => requested.includes(chapter))
  : [...selectedBook.chapters];

const immutableLedger = bookKey === 'mat-the' ? [
  'SỔ BẤT BIẾN — ĐAN: chương 1 có 6 Tịnh Mạch Đan, Hứa An dùng 1; Thành Vệ mua và nhận 5. Chương 2 bệnh nhân Thành Vệ dùng viên số 01, kho còn 4. Chương 6 xuất viên số 03 cho Hứa An, kho trung tâm còn 3. Chương 8 Hứa An dùng đúng viên số 03, người hắn không còn viên nào, kho trung tâm vẫn còn 3.',
  'SỔ BẤT BIẾN — ĐƠN: chương 4 Thành Vệ đặt một đơn MỚI 6 Tịnh Mạch Đan, trả trước 6 tinh hạch và còn 12 tinh hạch khi giao đủ. Chương 5 tuyệt đối chưa giao đơn. Chương 9 Lâm Việt tự luyện đủ 6 viên, được công nhận Nhất giai Luyện Đan Sư, giao đủ một lần và nhận đúng 12 tinh hạch còn lại.',
  'SỔ BẤT BIẾN — PHIẾU: chương 3 Đội Tro Tàn giao 6 cân thịt Thiết Giáp Ngưu và 5 tinh hạch Hỏa, nhận phiếu thủ công tổng 11 đơn vị gồm đúng 6 đơn vị thịt và 5 đơn vị hạch. Chương 5 khi Kho thu mua mở, phiếu ấy mới đổi thành 11 điểm hệ thống.',
  'SỔ BẤT BIẾN — LANG: chương 7 có 4 lang thường và 1 lang canh ổ. Chương 8 thêm 1 Liệt Trảo Lang Nhất giai hậu kỳ. Xác lang canh ổ dính bẫy giữ làm vật chứng; đúng 5 xác sạch gồm 4 lang thường và 1 hậu kỳ vào Phiếu 001. Tinh hạch lang canh ổ là phần riêng Chu Dã đã dùng mua Hộ Thân Phù. Không tồn tại thêm 12 xác hay 17 hạch.',
  'SỔ BẤT BIẾN — LÔ 001: chương 9 năm xác sạch cho đúng 43 cân huyết nhục; cửa hàng mua toàn bộ 43 cân với 32,25 điểm, dùng 12 cân luyện đan và còn 31 cân thuộc cửa hàng. Năm bộ da/xương và một tinh hạch hậu kỳ vẫn thuộc Tro Tàn. Mỗi xác lấy 2 mẫu thành 10 ống: 5 ống Tro Tàn giữ, 5 ống cửa hàng giữ. Chương 10 đối chất đúng các tài sản này; Trầm Nha Lang Vương Nhị giai xuất hiện chương 10 là chiến lợi phẩm mới, sổ riêng.',
] : [
  'SỔ BẤT BIẾN — QUOTA: quyền lấy linh hoạt 300 kg Đồi Gió chỉ có hạn 30 ngày. Hợp đồng La Chính được bảo đảm 30 kg mỗi tuần trong 4 tuần; 4 tuần kế chỉ là quyền ưu tiên khi Khải Minh ký thêm nguồn.',
  'SỔ BẤT BIẾN — DIỆP NINH: chỉ Trần Khải qua cửa. Hợp đồng robot yêu cầu 80 kg mỗi tuần trong 8 tuần; đợt đầu 80 kg phải được Trần Khải tự giao qua cửa, còn nghĩa vụ 560 kg.',
  'SỔ BẤT BIẾN — KHO: Nghiệm thu Tuyến Kho Gió Nam và truy Ngô Thừa hoàn tất ở chương 9. Chương 10 không lặp nghiệm thu hay gài lại Ngô Thừa; nếu có hoạt động kho thì là ca tải cực hạn hoặc đối soát thương mại có tên khác.',
];

const SequenceAuditSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.object({
    chapterNumber: z.number().int().min(1).max(20),
    severity: z.enum(['blocking', 'important', 'minor']),
    quote: z.string().trim().min(4).max(400),
    explain: z.string().trim().min(4).max(700),
    positiveDirection: z.string().trim().min(4).max(700),
  }).strict()).max(12),
  summary: z.string().trim().min(4).max(1_000),
}).strict();

const tail = (text: string, words: number): string => text.trim().split(/\s+/).slice(-words).join(' ');
const head = (text: string, words: number): string => text.trim().split(/\s+/).slice(0, words).join(' ');

async function main(): Promise<void> {
  const sourceBundle = sourceBundlePath
    ? JSON.parse(readFileSync(sourceBundlePath, 'utf8')) as { rewrites?: Array<{ chapterNumber: number; newTitle: string; newContent: string; review?: unknown }> }
    : null;
  const sourceByNumber = new Map((sourceBundle?.rewrites ?? []).map(item => [item.chapterNumber, item]));
  const [serial, chaptersResult, cyclesResult, runsResult] = await Promise.all([
    db.from('serial_novels').select('id,premise,prompt_version').eq('id', selectedBook.serialNovelId).single(),
    db.from('chapters').select('id,chapter_number,title,content,publication_state')
      .eq('novel_id', selectedBook.novelId).lte('chapter_number', 10).order('chapter_number'),
    db.from('serial_cycles').select('plan').eq('serial_novel_id', selectedBook.serialNovelId).order('cycle_number'),
    db.from('serial_runs').select('chapter_number,digest,finished_at,status')
      .eq('serial_novel_id', selectedBook.serialNovelId).eq('kind', 'chapter')
      .in('status', ['committed', 'published']).not('digest', 'is', null)
      .order('finished_at', { ascending: false }),
  ]);
  if (serial.error) throw serial.error;
  if (chaptersResult.error) throw chaptersResult.error;
  if (cyclesResult.error) throw cyclesResult.error;
  if (runsResult.error) throw runsResult.error;

  const premise = PremiseSchema.parse(serial.data.premise);
  const chapters = chaptersResult.data ?? [];
  const chapterByNumber = new Map(chapters.map(chapter => [chapter.chapter_number, chapter]));
  const digestByNumber = new Map<number, unknown>();
  for (const run of runsResult.data ?? []) {
    if (run.chapter_number && !digestByNumber.has(run.chapter_number)) digestByNumber.set(run.chapter_number, run.digest);
  }
  const beatByNumber = new Map<number, unknown>();
  for (const row of cyclesResult.data ?? []) {
    for (const sheet of (row.plan as { beatSheets?: Array<{ chapterNumber: number }> }).beatSheets ?? []) {
      beatByNumber.set(sheet.chapterNumber, sheet);
    }
  }

  const rewritten = new Map<number, ChapterDraft>();
  const results: Array<Record<string, unknown>> = [];
  for (const chapterNumber of targetChapters) {
    const current = chapterByNumber.get(chapterNumber);
    if (!current) throw new Error(`Missing chapter ${chapterNumber}.`);
    const source = sourceByNumber.get(chapterNumber);
    const sourcePrevious = sourceByNumber.get(chapterNumber - 1);
    const sourceNext = sourceByNumber.get(chapterNumber + 1);
    const previousContent = rewritten.get(chapterNumber - 1)?.content
      ?? sourcePrevious?.newContent
      ?? chapterByNumber.get(chapterNumber - 1)?.content;
    const nextContent = sourceNext?.newContent ?? chapterByNumber.get(chapterNumber + 1)?.content;
    console.log(`[rewrite] ${bookKey} chapter ${chapterNumber}: generating`);
    const result = await rewriteChapterEditorially(geminiProvider, {
      premise,
      chapterNumber,
      chapter: { title: current.title, content: source?.newContent ?? current.content },
      previousTail: previousContent ? tail(previousContent, 650) : '',
      nextHead: nextContent ? head(nextContent, 450) : '',
      canonicalDigest: digestByNumber.get(chapterNumber) ?? null,
      plannedBeat: beatByNumber.get(chapterNumber) ?? null,
      direction: [
        ...(selectedBook.directions[chapterNumber as keyof typeof selectedBook.directions] as unknown as string[]),
        ...immutableLedger,
      ],
      priorCritique: source?.review ? EditorialReviewSchema.parse(source.review) : undefined,
      model,
    });
    rewritten.set(chapterNumber, result.chapter);
    results.push({
      chapterId: current.id,
      chapterNumber,
      publicationState: current.publication_state,
      oldTitle: current.title,
      oldContent: current.content,
      newTitle: result.chapter.title,
      newContent: result.chapter.content,
      review: result.review,
      accepted: result.accepted,
      attempts: result.attempts,
      usage: result.usages,
      costUsd: result.costUsd,
      direction: [
        ...(selectedBook.directions[chapterNumber as keyof typeof selectedBook.directions] as unknown as string[]),
        ...immutableLedger,
      ],
    });
    console.log(`[rewrite] chapter ${chapterNumber}: ${result.accepted ? 'accepted' : 'needs review'}, ${result.chapter.content.length} chars, $${result.costUsd.toFixed(4)}`);
  }

  const sequence = chapters.map(chapter => ({
    chapterNumber: chapter.chapter_number,
    title: rewritten.get(chapter.chapter_number)?.title ?? chapter.title,
    content: rewritten.get(chapter.chapter_number)?.content
      ?? sourceByNumber.get(chapter.chapter_number)?.newContent
      ?? chapter.content,
    canonicalDigest: digestByNumber.get(chapter.chapter_number) ?? null,
  }));
  const sequenceReview = await geminiProvider.json({
    model,
    system: `Bạn là tổng biên tập đọc liền mười chương đầu của một truyện Song Xuyên. Kiểm tra như độc giả trả tiền: nhân quả và giao dịch nối được; cấp bậc và quyền sở hữu không đổi vô cớ; luật ai được qua cửa được giữ; lời hẹn ở cuối chương được trả sớm; main không biến mất khỏi lời hứa tên truyện; cách trả thưởng không lặp thành một mẫu demo-chuyên gia-đám đông-ký đơn. Chỉ nêu lỗi có trích dẫn. Hướng sửa phải dương tính bằng cảnh, lựa chọn và payoff cụ thể. passed chỉ đúng khi không có blocking hoặc important.`,
    prompt: JSON.stringify({
      title: premise.title,
      readerFantasy: premise.readerFantasy,
      goldenFinger: premise.goldenFinger,
      immutableLedger,
      chapters: sequence,
    }, null, 1),
    schema: SequenceAuditSchema,
    temperature: 0.2,
    timeoutMs: 240_000,
  });

  const carryover = (sourceBundle?.rewrites ?? [])
    .filter(item => !(targetChapters as number[]).includes(item.chapterNumber)) as Array<Record<string, unknown>>;
  const bundleRewrites = [...carryover, ...results]
    .sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber));
  const bundle = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    book: bookKey,
    novelId: selectedBook.novelId,
    serialNovelId: selectedBook.serialNovelId,
    model,
    sourcePromptVersion: serial.data.prompt_version,
    targetPromptVersion: SERIAL_PROMPT_VERSION,
    rewrites: bundleRewrites,
    sequenceReview: sequenceReview.value,
    sequenceReviewUsage: sequenceReview.usage,
    accepted: bundleRewrites.every(result => result.accepted === true)
      && sequenceReview.value.passed
      && sequenceReview.value.issues.every(issue => issue.severity === 'minor'),
  };
  writeFileSync(candidateOutputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  console.log(`[rewrite] bundle: ${candidateOutputPath}`);
  console.log(`[rewrite] accepted: ${bundle.accepted}`);
  console.log(`[rewrite] sequence: ${sequenceReview.value.summary}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
