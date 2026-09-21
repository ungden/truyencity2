# Nghiên cứu nền sáng tác — 21/09/2026

Trạng thái: nghiên cứu và thiết kế để duyệt. Chưa áp dụng quy tắc mới vào hai bộ máy,
chưa sinh bản thử, chưa thay chương công khai. Tài liệu đi cùng
[nguyên tắc đề xuất](NARRATIVE_FOUNDATION_GUIDE.md) và
[kế hoạch triển khai](NARRATIVE_FOUNDATION_IMPLEMENTATION_PLAN.md).

## Phương pháp và giới hạn

Đọc văn bản chương trên trang công khai của chính Faloo, giải mã GB18030. Không đăng nhập,
không mở khóa VIP, không dùng bản lậu. Mục lục dùng để chọn đoạn; giới thiệu sách dùng để
đối chiếu lời hứa với phần mở đầu, không dùng thay văn bản. Những chương không nằm trong
phạm vi dưới đây chưa được đọc và không được suy diễn từ tiêu đề.

Mẫu gồm ba tác phẩm, 27 chương dùng để phân tích: 9 chương song xuyên–kinh doanh;
11 chương tu luyện–trưởng thành; 7 chương xây dựng–công nghệ. Ngoài ra đã kiểm tra ba
chương 10–12 của mẫu kinh doanh nhưng loại khỏi phân tích tiến trình do văn bản có dấu hiệu
lặp/xáo trộn. Phần phát triển được chọn vẫn nằm khá sớm trong truyện: nghiên cứu này chưa
chứng minh chất lượng trung/hậu kỳ hay khả năng giữ nhịp hàng trăm chương.

Số liệu dưới đây là **số trang sách hiển thị khi truy cập**, không phải số độc giả duy nhất,
doanh thu, tỷ lệ đọc hết hay một phép đo chất lượng. Ba bộ không phải mẫu đại diện thống kê
cho toàn Faloo; mỗi bộ được đánh giá riêng từng thủ pháp. Trang công khai có lỗi cũng là
lý do phải kiểm tra văn bản thay vì chỉ lấy nhãn ký độc quyền hoặc điểm 10.

| Nhóm | Tác phẩm và trang gốc | Đã đọc liên tục | Tín hiệu hiển thị |
|---|---|---|---|
| Song xuyên–kinh doanh | [穿梭两界：我成了首富！ — 龟虽瘦](https://b.faloo.com/1219409.html) | Ch1–9; mở đầu 1–3, phát triển 6–9, đọc cả đoạn nối 4–5 | Tổng lượt đọc 1.426.661; hoa 1.479 |
| Tu luyện–trưởng thành | [高武：登陆未来一万年 — 每月一更](https://b.faloo.com/1129789.html) | Ch1–8 và 15–17; chưa đọc 9–14 trong mẫu này | Tổng lượt đọc 18.991.908; hoa 7.222.319 |
| Xây dựng–công nghệ | [人人一颗星球：开局打造科技文明 — 四字真言](https://b.faloo.com/1046404.html) | Ch1–4 và 15–17; chưa đọc 5–14 trong mẫu này | Tổng lượt đọc 15.562.029; hoa 2.128.198 |

[Sổ nguồn JSON](narrative-research-2026-09-21.sources.json) ghi URL từng chương,
phạm vi sử dụng, cách truy cập và SHA-256 của phản hồi đã lấy. Không đưa toàn văn tác phẩm
vào repository. Hash ghi nhận lần lấy dữ liệu, không chứng minh trang không bị thay đổi
hay nội dung đã được tác giả xác nhận.

Điểm xuất phát là các nguồn đã ghi trong `FALOO_CRAFT.md` và nghiên cứu Song Xuyên trước
đó. Bốn chương đồng nhân của mẫu 1455340 chỉ có thể minh họa cách mở đầu dựa trên IP quen
thuộc; không đủ căn cứ đặt luật ba dòng quá khứ hoặc mỗi chương thêm một tên cho truyện
nguyên tác. Đợt này bổ sung ba mẫu trên để kiểm tra lại những suy rộng ấy. Một lần kiểm tra
[1081432 ch1](https://b.faloo.com/1081432_1.html) cũng gặp kiểu đồng nhân: main nhận diện
nhân vật từ phim và vào giao dịch ngay. Chương này chỉ dùng làm đối chứng về kiến thức có
sẵn, không được tính vào 27 chương mẫu chính hay dùng làm chuẩn kinh doanh nguyên tác.

## 1. Song xuyên–kinh doanh: chuỗi thu mua và giới hạn của mẫu

| Cảnh / nguồn | Nhân vật biết, muốn, chú ý và suy luận | Chuẩn bị, kết quả và điều cần đánh giá |
|---|---|---|
| [Ch1: việc nhà và hốc cây](https://b.faloo.com/1219409_1.html) | Dư Phong ở quê, được cha giao việc liên quan đến cây; đi qua hốc cây, lạ lẫm, hỏi nơi chốn/thời đại rồi quay về. | Cửa xuyên gắn với một việc đang làm và một vật có trong đời sống. Hành động đi–về là chứng cứ sử dụng, chưa giải thích căn nguyên vũ trụ. Chương vẫn đi bán đèn khá nhanh; không lấy tốc độ đó làm chỉ tiêu. |
| [Ch2: ăn mặc, cứu người](https://b.faloo.com/1219409_2.html) | Main tìm cách hòa vào môi trường mới, gặp người cần giúp. | Quần áo và giao tiếp có vai trò trong việc đi lại. Một số năng lực được bổ sung quá thuận tiện đúng lúc cần; không lấy làm cách dựng năng lực nền. |
| [Ch3: trở về và tìm đầu ra](https://b.faloo.com/1219409_3.html) | Có vật mang về nhưng cần người định giá/mua; tìm đến bạn đại học làm trong ngành. | Quan hệ sẵn có giải thích cửa tiếp cận thị trường. Đem vật về chưa tự động có tiền. Màn người yêu cũ khinh miệt là lựa chọn melodrama của mẫu, không cần nhân bản. |
| [Ch4: định giá và bảo vệ cửa](https://b.faloo.com/1219409_4.html) | Người có nghề kiểm tra đồ; main nói với cha giữ cây, mua vật dụng cho chuyến sau. Tại quán ăn, main nhận ra đèn mình bán đã qua tay người khác. | Cây từ chi tiết mở đầu trở thành thứ phải gìn giữ. Hàng đã bán có đời sống sau giao dịch. Tuy nhiên định giá và lợi nhuận quá dễ, cách gọi main có chỗ lệch; chỉ học mối nối nhân quả, không học mức giá hoặc độ thuận lợi. |
| [Ch5: món quà, chỗ ở, người địa phương](https://b.faloo.com/1219409_5.html) | Quan hệ mới mở chỗ ở; main muốn người giúp việc và thông tin tại chỗ. Hai người từng cướp kể hoàn cảnh bị áp bức. | Chỗ ở gần cửa giải quyết hậu cần đi lại. Nhưng một món quà được đổi lấy tin cậy/chỗ ở quá dễ; lời kể khổ chưa đủ bảo đảm trung thành. |
| [Ch6: bữa sáng và giao việc thu mua](https://b.faloo.com/1219409_6.html) | Main chưa hiểu tiền lẻ địa phương; bữa sáng bộc lộ lỗ hổng ấy. Vì chưa rành phong tục/thị trường, giao tiền cho hai người địa phương đi thu mua; họ mua thêm món vì thương người bán. | Sinh hoạt có thể lộ giới hạn hiểu biết và giá trị của cộng sự. Nhưng main đã giao dịch lớn mà chưa hiểu đơn vị tiền nhỏ là điểm yếu; món ngô ở bối cảnh Đường và chủ nhà bị đổi tên so với ch5 cũng không được dùng làm chuẩn lịch sử/continuity. |
| [Ch7: nhận hàng](https://b.faloo.com/1219409_7.html) | Main phản ứng với việc cộng sự giúp người khó khăn; nghi món vòng có giá trị, muốn đem về kiểm tra, cho cộng sự chỗ ở. | Người phụ có lựa chọn riêng trong lúc main vắng mặt. Cảnh kéo quan hệ sang lần làm việc tiếp. Đồng thời giá trị giao dịch trước được kể thành 90 vạn, lệch tổng 70 vạn ở ch4: cần kiểm tra tài sản độc lập với đánh giá văn học. |
| [Ch8: nhờ người quen vào buổi giám định](https://b.faloo.com/1219409_8.html) | Sau đối đầu người yêu cũ, main tìm bạn, được người giám định dẫn vào. | Lối vào dựa quan hệ được dựng trước. Nhân vật già lập tức sỉ nhục để main đáp trả là xung đột cưỡng ép; không dùng làm luật mỗi cơ hội phải có kẻ khinh thường. |
| [Ch9: hiện vật, người mua và kênh bán](https://b.faloo.com/1219409_9.html) | Người trong phòng kiểm tra vòng; có người muốn mua làm quà. Bạn đề nghị đấu giá vì main chưa rành giá. | Nhu cầu người mua, định giá và lựa chọn kênh bán là ba việc khác nhau. Kỹ thuật này dùng được cho kinh doanh; phản ứng đồng loạt và mức tôn sùng main trong mẫu không đáng nhân bản. |

**Kết luận có giới hạn:** mẫu này giúp chỉ ra đồ vật, quan hệ và người mua phải có đường
đi cụ thể; nó không phải chuẩn văn học tổng thể. Tín hiệu hoa cũng yếu hơn hai mẫu còn lại.
Ch10–12 có các đoạn đấu giá/mua xe lặp hoặc xáo trộn nên không dùng để khẳng định tiến trình
phát triển về sau. Chưa có bằng chứng từ mẫu này về R&D, sản xuất hàng loạt hay thương mại
công nghệ tương lai; các bước đó trong kế hoạch là yêu cầu nhân quả của dự án, không gán
cho Faloo.

## 2. Tu luyện–trưởng thành: đời sống tạo ý nghĩa cho thành quả

| Cảnh / nguồn | Nhân vật biết, muốn, chú ý và suy luận | Chi tiết được dùng lại / điều kiện kết quả |
|---|---|---|
| [Ch1: lớp học, bạn và gia đình](https://b.faloo.com/1129789_1.html) | Lục Thánh biết kết quả khí huyết thấp ảnh hưởng tương lai; bạn rủ đi chơi. Về nhà thấy cha đau lưng, mẹ chăm sóc; cha dành tiền cho con. | Có đời sống trước lợi thế: trường, việc làm, bạn, nguồn tiền và tâm trạng thất vọng. Cao dán không phải vật trang trí. |
| [Ch2: tập trong phòng rồi ngủ](https://b.faloo.com/1129789_2.html) | Bài tập quen, không gian phòng và sự mệt mỏi dẫn vào giấc mơ đáng sợ. | Độc giả biết main đã tập gì trước khi nhận kỹ thuật mới; có cơ sở so sánh. Lịch sử thế giới được gắn vào sinh hoạt tu luyện. |
| [Ch3: đổi cách đối phó trong mơ](https://b.faloo.com/1129789_3.html) | Chọn đánh thay vì chỉ bỏ chạy; nắm đấm đau nên dùng đá. Nhận ký ức người chết sau hành động. | Lựa chọn dựa cảm giác và vật có tại chỗ. Ký ức chứa cả cuộc đời và cái chết, khiến thế giới tương lai có con người. |
| [Ch4: phân biệt ký ức](https://b.faloo.com/1129789_4.html) | So sánh ký ức chiến đấu với ký ức người làm nghề khác; hình thành giả thuyết và hướng tìm căn cứ 1359. Tiếng em gọi ăn kéo về hiện tại. | Có khoảng cách giữa quan sát và hiểu quy tắc. Đích khám phá được gieo, chưa trao toàn bộ lời giải. |
| [Ch5: bữa cơm và em gái](https://b.faloo.com/1129789_5.html) | Nhìn lại tài nguyên gia đình và năng khiếu của em; nhận ra cơ thể/khả năng có vẻ thay đổi, muốn đo kiểm. | Bữa cơm vừa là quan hệ vừa là quan sát hậu quả. Cảm thấy mạnh hơn chưa được xem là kết quả đo chính xác. |
| [Ch6: võ quán](https://b.faloo.com/1129789_6.html) | Tới nơi có thiết bị kiểm tra; quảng cáo/chi phí cho biết điều kiện tiếp cận. Lễ tân cư xử bình thường. | Kết quả đo 0,963 khí huyết và 113 chiến lực cho xác nhận bên ngoài. Không phải biến người phục vụ thành kẻ xúc phạm mới có cảnh hấp dẫn. |
| [Ch7: mục tiêu và bài tập](https://b.faloo.com/1129789_7.html) | Từ kết quả nghĩ đến chứng nhận/trợ cấp; tập bài đã biết, nhận ra khác biệt với kỹ thuật trong ký ức. | Quyền lợi xã hội làm con số có ý nghĩa. Kỹ thuật được phát hiện qua so sánh với kinh nghiệm cũ. |
| [Ch8: tập quen được tóm lược](https://b.faloo.com/1129789_8.html) | Kết hợp phương pháp tập/thở, tiếp tục một tuần rồi đo lại. Lời rủ của bạn gặp một phản ứng khác. | Tóm lược sau khi cách làm đầu tiên đã rõ. Cùng một chi tiết về bạn có thể cho thấy main đổi ưu tiên. |
| [Ch15: học bổng, lớp học, quầy thuốc](https://b.faloo.com/1129789_15.html) | Main hiểu trường muốn đầu tư vào học sinh có thể đem thành tích; xin giữ kín với gia đình. Bạn thân thấy khoảng cách. Sau đó xem giá thuốc trước khi tiền về. | Tổ chức có lợi ích riêng. Thành công đổi quan hệ; sự công nhận cũng có dư âm. Vì chưa đọc ch9–14, không kết luận mọi điều kiện của học bổng đã được chuẩn bị đủ. |
| [Ch16: giá thuốc, đi bộ, bữa cơm](https://b.faloo.com/1129789_16.html) | So 30.000 tiền học bổng với thuốc 3.000–15.000; hiểu gánh nặng cha mẹ. Thấy học sinh vào quán net, tự nhìn lại lựa chọn. Khi có cảm giác tiến bộ, quyết định về nhà thay vì đi đo nữa. | Cao dán lưng cha trở lại, có thêm ý nghĩa từ góc nhìn mới. Đời sống không ngừng tồn tại khi main mạnh lên. Đốn ngộ là quy ước của thể loại này, không dùng để hợp thức hóa việc bỗng biết chế tạo máy. |
| [Ch17: đến căn cứ](https://b.faloo.com/1129789_17.html) | Kinh nghiệm cũ giúp so sức mạnh đối thủ; vẫn chưa biết chết trong mơ sẽ ra sao. Đến tường thành bị phá, đối chiếu ký ức và đặt câu hỏi mới. | Bí mật nguồn gốc còn mở dù công dụng đã được thử. Kích thước/đổ nát của nơi chốn có ý nghĩa nhận thức và cảm xúc, chưa cần lập tức đổi thành tài sản. |

**Phạm vi áp dụng:** ưu tiên cách dựng cơ sở so sánh, nếp sống lặp có biến đổi, giới hạn
biết và phản ứng với thành quả. Không biến một tuần luyện tập, chỉ số khí huyết, đốn ngộ hay
thời điểm căn cứ xuất hiện thành định mức chung. Các cảnh vẫn có nhiều quy ước sảng văn;
nghiên cứu không bảo chứng tính khoa học của sinh lý trong truyện.

## 3. Xây dựng–công nghệ: lựa chọn đường phát triển và thời gian

| Cảnh / nguồn | Nhân vật biết, muốn, chú ý và suy luận | Chuẩn bị, kết quả và giới hạn |
|---|---|---|
| [Ch1: chờ thức tỉnh](https://b.faloo.com/1046404_1.html) | Giang Phàm đã sống tại đây hơn nửa năm, biết quyền lợi chủ tinh cầu khác dân thường. Giáo viên hướng dẫn cách thức tỉnh. | Giải thích sự kiện đang xảy ra và cái được/mất trước khi công cụ đặc biệt xuất hiện. Đây là nguồn cho kiến thức thường thức của main. |
| [Ch2: tinh cầu nhỏ và hệ thống](https://b.faloo.com/1046404_2.html) | Kết quả 0,81 km không hứa hẹn; biết có tinh cầu chưa đồng nghĩa đã có sự sống. Hệ thống xuất hiện cuối chương. | Trường theo dõi kết quả vì danh tiếng/tuyển sinh. Hai mốc có điều kiện khác nhau được phân biệt. Tuy nhiên phản ứng với hệ thống khá ngắn: không coi đây là mẫu tốt nhất về quá trình làm quen lợi thế. |
| [Ch3: cân nhắc các đường](https://b.faloo.com/1046404_3.html) | Xem ba đề xuất, so với hiểu biết về môi trường sống, chọn tạo điều kiện cho sự sống tự phát triển. | Quyết định có phương án và căn cứ theo luật truyện; chưa coi quyết định là kết quả. Xác suất do hệ thống đưa ra là lời hệ thống, không phải tri thức khoa học được kiểm chứng. |
| [Ch4: thiết lập và chờ](https://b.faloo.com/1046404_4.html) | Tạo ánh sáng, nhiệt, nước, khí quyển; dùng tài nguyên và tăng tốc thời gian trước khi có sinh vật đầu tiên. | Có công việc và thời gian giữa ý tưởng và kết quả. Quy mô vật lý/sinh học dựa phép giả tưởng; không chuyển lời giải này thành hướng dẫn công nghệ thực tế. |
| [Ch15: chọn người, tác động gián tiếp](https://b.faloo.com/1046404_15.html) | Muốn người có khả năng tiếp nhận tri thức; cân nhắc giúp công khai hay gián tiếp. Thủ lĩnh phải tự ứng phó đối thủ, dùng thương lượng/cống nạp để có thời gian. | Cộng sự không chỉ nhận vật phẩm rồi mạnh lên; có năng lực xử lý tình thế. Không chấp nhận các phần phân biệt giới hoặc con người bị dùng làm cống phẩm thành chuẩn giá trị của dự án. |
| [Ch16: phát triển qua nhiều năm](https://b.faloo.com/1046404_16.html) | Kiến thức được đưa vào dân số, nông nghiệp, công cụ và tổ chức. Hai mươi năm được nén lại, sau đó thay đổi tương quan; cuối đời thủ lĩnh tìm người dẫn dắt. | Thời gian trong thế giới và dung lượng kể là hai thứ khác nhau. Có thể tóm lược hoạt động đã rõ; thành quả có đời sống qua nhân vật già đi và quan hệ thầy–trò. Mẫu lược nhiều khó khăn thực thi, không đủ làm chuẩn R&D chi tiết. |
| [Ch17: đổi tiêu chí chọn người kế vị](https://b.faloo.com/1046404_17.html) | Main sửa câu hỏi từ người trị vì tốt sang người phù hợp cả quản trị lẫn phát triển công nghệ; người cha giao phó rồi mất. | Đích dài hạn thay đổi quyết định hiện tại. Sự gắn bó của người đã sống cả đời không thể quy hết về tài nguyên. Quyền lực hệ thống và việc chọn trẻ tám tuổi được giải quyết rất thuận tiện; không lấy đó làm bằng chứng thể chế đáng tin. |

**Phạm vi áp dụng:** phân biệt có công cụ → chọn đường → tạo điều kiện → quá trình → kết
quả, và cho người trong thế giới sống với quá trình ấy. Không buộc từng cảnh đi đủ chuỗi,
không buộc mọi thế giới có hệ thống dự đoán toàn tri hoặc nhảy thời gian cực lớn.

## Những kết luận đủ căn cứ để đề xuất thay đổi

1. Hồ sơ tác giả không thay được cảnh độc giả đã đọc. Ví dụ ch3–6 Cao Võ phân biệt nhận
   ký ức, nghi ngờ khả năng và kiểm tra; ch17 vẫn để câu hỏi chưa biết.
2. Đời sống có thể tạo ý nghĩa cho tiến triển. Cao dán, bữa cơm và bạn đi chơi là bằng
   chứng cụ thể; không cần mọi chi tiết có giá bán hay lập tức kích hoạt xung đột.
3. Kết quả cần đúng loại điều kiện: mẫu kinh doanh có người định giá và kênh bán;
   mẫu tinh cầu tách thức tỉnh, môi trường và sự sống. Khám phá công nghệ không tương đương
   có sản phẩm hay có thị trường.
4. Nhịp kể có thể tăng tốc khi việc đã quen; nén một tuần hoặc nhiều năm không phải tự
   thân là lỗi. Lỗi là bỏ phần độc giả cần để hiểu quyết định/thành quả, hoặc lặp phần
   đã hiểu mà không có sắc thái mới.
5. Một cảnh khách hàng, đám đông hay vật có tên là một phương án, không phải điều kiện
   tồn tại của mọi chương. Mẫu tu luyện có kiểm tra riêng, đi bộ và khám phá chưa trả lời.

Chưa đủ căn cứ để kết luận một nhịp duy nhất là “chuẩn Faloo”, mẫu nào chắc chắn bán chạy
nhờ thủ pháp nào, hay phương pháp đề xuất đã làm truyện của ta hay hơn. Điều cuối cần bản
thử liên tục và lượt đọc duyệt theo kế hoạch tiếp theo.
