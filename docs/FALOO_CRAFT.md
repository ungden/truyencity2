# Văn phạm chương truyện Faloo — đo trực tiếp

Đo ngày 19/09/2026 trên `b.faloo.com`. Đây là **spec kỹ thuật viết chương**, đi kèm
[`FALOO_MARKET_PROFILE.md`](FALOO_MARKET_PROFILE.md) (đóng gói sản phẩm) và
[`REDESIGN_PLAN.md`](REDESIGN_PLAN.md) (kiến trúc).

Mẫu đo: 4 chương miễn phí đầu của *《崩铁：万界词条，开局帝弓天将》* — một bộ **ký độc quyền
VIP** của Faloo; cộng bảng xếp hạng cập nhật trong ngày; cộng văn bản quy định chính thức
(`help/newbookpk.htm`, `help/vipqianyue.htm`, `bbs.faloo.com/t/1776238.html`).

Trang Faloo mã hoá **GBK** — `WebFetch` trả về chữ rác. Phải dùng `curl` + `iconv -f GBK`.

---

## 1. Cái KHÔNG phải vấn đề của ta

Đo xong mới thấy hai giả định ban đầu là **sai**. Ghi lại để không ai đi sửa nhầm chỗ.

| Chỉ số | Faloo (mẫu đo) | TruyenCity (ch 85–93) | Kết luận |
|---|---|---|---|
| Dung lượng chương | 2.180–2.600 chữ Hán; các bộ top ~1.200–1.400 | 8.570 ký tự ≈ **1.920 từ** | **Tương đương. Không cần đổi.** |
| Đoạn văn — trung vị | 21 chữ Hán (≈ 1 câu) | 81 ký tự (≈ 15 từ, ≈ 1 câu) | **Ta đã đúng form.** |
| Đoạn cực ngắn | 16% ≤ 10 chữ | **38%** ≤ 55 ký tự | Ta còn vụn hơn Faloo. |
| Đoạn dài | 0% > 70 chữ | 1% > 350 ký tự | Không ai viết khối dài. |
| Tỉ lệ đoạn là thoại | 17–19% | **35%** | Ta thoại nhiều hơn. |

> **Hình thức văn xuôi của ta đã đạt chuẩn Faloo rồi.** Quy định chính thức chỉ đòi chương
> ≥ 1.000 chữ; 1.920 từ Việt nằm giữa dải thật. Đừng rút ngắn chương, đừng băm nhỏ đoạn thêm.

## 2. Cái ĐÚNG là vấn đề: khối lượng biến cố mỗi chương

Cùng một dung lượng chữ, hai bên chở khác nhau một trời.

| | Faloo ch1 | Faloo ch2 | TruyenCity ch92 |
|---|---|---|---|
| Biến cố | xuyên việt → nhận ra thế giới → **hệ thống trói** → gặp một huyền thoại tương lai → **ngày tận thế bắt đầu** | mở đại lễ bao → **rút được thẻ vàng "Kiếm Đạo Thông Thần"** → nhập thể → rơi vào thí luyện, bị cao nhân khiêu khích | hai cha con lựa sắt vụn; người cha tự nhận ra vết nứt trên thanh trục |
| Cái mới có tên | Hệ thống Vạn Giới Từ Điều · Kính Lưu · Thương Thành Tiên Châu · Phệ Giới La Hầu · tinh lịch 6300 | Kiếm Đạo Thông Thần (kim) · Giám Định Chi Nhãn · 6 bậc phẩm giai · 3 thế giới rút thẻ | không có |
| Địa vị nhân vật sau chương | vẫn là kẻ lạ, nhưng biết mình sắp chết | có **tiên thiên Nguyên Anh** kiếm thai | vẫn là thợ máy |
| Câu cuối | "Đúng là ta xuyên thẳng vào ngày Thương Thành diệt vong thật à???" | cao nhân ném kiếm cắm trước mặt | (không có hook) |

Sau 93 chương, kernel bộ đó vẫn chỉ có **3 nhân vật** và tài nguyên theo dõi gồm cả *"Dầu hỏa
tẩy rửa"*. Faloo chương 1 đã đặt tên 5 thực thể và một thang cấp bậc.

**Chốt: phải sửa ở Premise và khâu lập kế hoạch, không phải ở prompt văn phong.**

---

## 3. Khung chương chuẩn

### 3.1 Mở chương — 3 đoạn đầu
Vào thẳng **một tình huống cụ thể đang có áp lực hoặc một câu hỏi chưa trả lời**. Faloo ch1
mở bằng: một thanh niên ngồi xổm bên đường nhìn đám đông — rồi ngay đoạn 2 là lời thoại
*"Vậy tức là, ta bị quăng tới đâu đây?"*

Cấm: mở bằng thời tiết, mùi, ánh sáng, hồi tưởng, kiểm kê dụng cụ, mô tả không gian thuần.
(Chương 1 hiện tại của ta mở bằng *"Mùi dầu cũ, muội than và gỗ mục quẩn dưới mái tôn thấp"* —
đúng cái bị cấm.)

### 3.2 Tiền sử — tối đa 3 dòng, mỗi dòng một đoạn
Faloo xử lý toàn bộ background bằng đúng 3 đoạn:
> Nếu không nhớ nhầm, hắn đang ngồi ghế công viên chơi game.
> Tiếp đó điện thoại nổ.
> Rồi tới đây.

Không flashback, không giải thích thân thế. Quá khứ chỉ được nhắc khi nó **đang** tạo hậu quả.

### 3.3 Thân chương — luật "một cái mới có tên"
Mỗi chương phải thêm **ít nhất một thứ mới và nó phải có tên riêng**: một năng lực, một nhân
vật, một phe, một địa danh, một bậc cấp, một mối đe doạ, một con số định mệnh. Nếu một chương
không thêm được gì có tên, chương đó không nên tồn tại — gộp vào chương khác.

Độc thoại nội tâm đứng thành **đoạn riêng, ngôi thứ nhất**, xen thẳng vào tự sự ngôi ba:
> Hắn hình như...... xuyên việt rồi?
> Không phải chứ, giờ xuyên việt tuỳ tiện vậy sao??

### 3.4 Hệ thống hiển thị cho độc giả
Nếu lane có hệ thống, thông báo đứng thành đoạn riêng trong ngoặc 【】 và **độc giả đọc được
nguyên văn**:
> 【Chúc mừng ký chủ nhận được: Kiếm Đạo Thông Thần (Kim)】
> 【Kiếm Đạo Thông Thần: lĩnh ngộ một tia kiếm đạo pháp tắc, tâm uẩn bản thể kiếm thai...】

Đây là đối lập trực tiếp với thiết kế hiện tại của ta — ledger bị **giấu** khỏi độc giả và
Writer bị cấm nêu số. Trong lane hệ thống, bảng số **chính là** phần thưởng của độc giả.
(Ngoài lane hệ thống thì vẫn giấu như cũ.)

### 3.5 Kết chương — bắt buộc có hook, và hook là tiêu đề
Bốn chương đo được kết bằng: (1) trời tối sầm + câu hỏi hoảng loạn; (2) kiếm cắm xuống trước
mặt; (3) mười mấy con quái phá tường xông vào, đồng đội run rẩy tuyệt vọng; (4) lời tuyên bố
*"Hôm nay, đại ca ca dẫn muội làm một lần....... anh hùng cứu thế giới."*

Ba kiểu hook hợp lệ: **mối đe doạ mới bước vào** · **một câu hỏi được đặt ra** · **một lời
tuyên bố/thách thức**. Không bao giờ kết bằng câu tổng kết êm.

### 3.6 Tên chương
Là **một câu nói hoặc câu nghĩ có thái độ**, thường trích thẳng từ cuối chương:
> 第1章：真给我穿到苍城毁灭日了？？ — *Chương 1: Đúng là ta xuyên thẳng vào ngày diệt vong à??*
> 第4章：是个剑修都爱装，天打雷劈也嚣张！
> 第8093章 装什么装

Tên chương hiện tại của ta (*"Vạch Kim Và Mối Ghép"*, *"Sức Kéo Trên Mạn Ghe"*, *"Thứ Không
Bán Theo Cân"*) là danh từ tĩnh — ngược hẳn. Đổi sang câu có cú.

### 3.7 Giọng
Thông tục, tự giễu, có tiếng chửi nhẹ: 我靠 · 完辣 · 这特么是地狱开局 · 谁会把一个乖萌小萝莉
和冰山御姐联系上啊？！ Tương đương tiếng Việt: *Thôi xong*, *Đùa à*, *Mẹ nó*, *Khai cục địa
ngục*, *Ơ hay*. Không văn chương, không trang trọng.

---

## 4. Bốn chương vàng — mẫu đã đo

| Ch | Chức năng | Faloo làm gì |
|---|---|---|
| 1 | **Trói** | Ném thẳng vào thế giới; kim thủ chỉ bám vào ở ~40% chương; nêu tên hiểm hoạ và hạn chót; **tai hoạ khởi động ngay cuối chương**. Đại lễ bao được trao nhưng **chưa mở**. |
| 2 | **Rút** | Mở đại lễ bao → phần thưởng **có tên, có phẩm giai, có thang** → nhập thể lập tức → ném vào thử thách mới. |
| 3 | **Thử** | Năng lực mới bị đặt vào tình thế không đủ; kết chương ở đáy tuyệt vọng. |
| 4 | **Chứng** | Năng lực giải quyết; trả cảm xúc (nhân vật phụ khóc, xin giúp); kết bằng **lời tuyên bố** mở ra mục tiêu cả quyển. |

Tổng 4 chương ≈ 9.400 chữ Hán ≈ **7.500–8.000 từ Việt**. Kỹ thuật lõi: **phần thưởng bị giữ
lại một chương** (ch1 trao hộp, ch2 mới mở) — đó chính là 期待感.

Quy định Faloo: nộp sách phải có sẵn ≥ 4 chương, biên tập **chấm kim thủ chỉ và tình tiết mở
đầu** trước khi cho vào thư viện. → Ta đặt cổng duyệt người ở đúng chỗ đó.

---

## 4b. Lợi thế thực hiện lời hứa với độc giả

Chỉnh gốc ngày 19/09 theo lựa chọn biên tập của người dùng: sảng văn tích lũy thành quả.
Đây là định hướng của dự án, không phải kết luận rằng mọi truyện Trung Quốc cùng một gu.

Đọc trực tiếp phần mở đầu công khai của *修仙双穿末日，修魔的我开心坏了*:
[chương 3](https://b.faloo.com/1324795_3.html) dùng tài nguyên bên kia để giải nút thắt tu luyện,
rồi phát hiện lợi ích thêm về thể chất và tư chất; [chương 4](https://b.faloo.com/1324795_4.html)
tiếp tục mở công dụng. Truyện có khó khăn và giới hạn, nhưng đoạn hấp dẫn ở đây là cách
lợi thế hóa giải chúng và cộng thêm phần thưởng. *双穿乱世：我以米饭养死士*
[chương 2](https://b.faloo.com/1547827_2.html) trả khoản nợ mở màn, để lại vốn tái đầu tư,
rồi đưa thế lực ngoài vào làm đối kháng. Các ví dụ này minh họa thủ pháp, không chứng minh
doanh số hay một quy luật toàn thị trường.

Thiết kế bắt đầu từ điều độc giả muốn hưởng: khám phá giá trị, thắng giao dịch, lên cấp,
có đồng minh, được công nhận, tự chọn mục tiêu lớn hơn. Kim thủ chỉ là công cụ thực hiện
lời hứa ấy. Thành quả trở thành vốn cho vòng sau; đối kháng có người và lợi ích cụ thể.
`scope` là phạm vi chức năng tùy chọn, có thể để `null`.

期待感 là mong một kết quả đáng muốn. Chờ mở phần thưởng, chờ người khác thấy thực lực,
chờ đơn hàng lớn đều tạo kỳ vọng. Dồn nén rồi giải tỏa là một cách dùng, bên cạnh khám phá
→ thành công → phản ứng → cơ hội mới. Độ khó theo tình huống và lời hứa của bộ truyện.

Premise, Planner, Writer và Judge cùng đọc một định hướng này. Sửa định nghĩa nhịp truyện
và tiêu chí chấm tại nguồn; thay chỉ dẫn cũ thay vì bồi thêm ngoại lệ phủ định nó.

## 5. Leo thang dài hạn

- **Chu kỳ cảm xúc**: chọn lời hứa và cú trả thưởng lớn, xen thành công, khám phá, phản ứng
  hoặc đối đầu theo tình huống. Kết quả nhỏ dọc đường làm kết quả lớn đáng mong hơn.
- **15 loại 爽点 để xoay vòng**: vả mặt · nghịch tập · nghiền ép · giấu mạnh lộ mạnh · phá vây ·
  trí thắng · kho báu hiện thế · được công nhận · cứu nguy · kỳ ngộ · đột phá cấp bậc · kẻ mạnh
  trở về · tuyệt địa phản kích · tình trường đắc ý · lực vãn cuồng lan.
  **Luật code: không lặp loại chủ đạo ở hai chu kỳ liền nhau.**
- **Đấu trường mở rộng** từ thành quả: khách hàng, tổ chức, thị trường hoặc đối thủ mới.
  Một đối thủ đã thua có thể kết thúc vai trò; người trở lại cần lợi ích và hành động thật.
- **Kim thủ chỉ tiến hoá 6–8 nấc**, mỗi nấc đổi **cách dùng**, không chỉ đổi số.
- **冲突不要拖** — không kéo dài một cuộc đối đầu khi kỳ vọng độc giả đòi giải quyết dứt điểm.

## 6. Nhịp xuất bản và KPI

- Quy định chính thức: chương < 1.000 chữ không tính tiền; đẩy sách mới cần **日更 ≥ 4.000 chữ**
  (≈ 3 chương), ≥ 8,5 vạn chữ tổng, ≥ 1 vạn lượt sưu tầm.
- Bảng sách mới: `周点击/30 + 周鲜花×3 + 总收藏×15 + 总打赏/3`.
  **Sưu tầm (follow/bookmark) nặng gấp 450 lần một lượt xem.**
  → KPI của TruyenCity là **bookmark và tỉ lệ đọc tiếp ch1→ch10**, không phải lượt xem.

## 7. Cái Faloo làm mà ta KHÔNG được chép

Bảng xếp hạng Faloo hôm nay bị **đồng nhân (同人)** thống trị — `名义：` `综漫：` `崩铁：`
`四合院：` `港综：` `盗墓：` — tức fanfic trên IP có sẵn. Đó là nguồn "đấu trường quen thuộc"
rẻ nhất của họ và **ta không được dùng** (bản quyền, và `CLAUDE.md` cấm).

Thay thế hợp pháp: lấy "cái quen" từ **quy ước thể loại mà độc giả convert Việt đã thuộc** —
thang cảnh giới tu tiên, toàn dân lãnh chúa, thức tỉnh/chuyển chức, hệ thống đô thị, trọng
sinh biết trước. Nhân vật, địa danh, cốt truyện đều nguyên tác.

Mẹo mà bộ đo được dùng và ta **được phép** bắt chước: nhân vật chính là **người hiện đại biết
trước luật chơi** (game thủ / người trọng sinh). Meta-knowledge là kim thủ chỉ số 0, miễn phí,
và tạo ngay khoái cảm "ta biết thứ người khác không biết".

---

## 8. Nguồn

- <https://b.faloo.com/> · <https://b.faloo.com/y_0_0_0_0_0_0_1.html> (bảng xếp hạng, decode GBK)
- <https://b.faloo.com/1455340_1.html> … `_4.html` (4 chương đo được)
- <https://wap.faloo.com/1455340.html> (giới thiệu + danh sách chương)
- <https://bbs.faloo.com/t/1776238.html> (作者必读: chương ≥1.000 chữ, 日更 4.000, chỉ tiêu 强推)
- <https://bbs.faloo.com/doc/1775838/1.html> (新手教程: đề tài biên tập khuyến nghị)
- <https://b.faloo.com/help/newbookpk.htm> · <https://b.faloo.com/help/vipqianyue.htm>
- <https://bbs.faloo.com/t/1776242.html> (6 nguyên tắc: 开篇/节奏/冲突不要拖)
