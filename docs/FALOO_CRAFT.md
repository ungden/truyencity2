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

## 4b. Kim thủ chỉ không được cắn chủ nhân nó

Bổ sung 19/09 sau một lượt audit. Đây là chỗ dễ sai nhất và tôi đã sai đúng vào đó.

Bằng chứng hai chiều:

- **Faloo**: nhân vật chính hầu như không chịu thiệt thật. *"传统网文可能第二十章主角刚刚觉醒，
  而飞卢风通常在第一章便获得武功绝学，第二章已经进入元婴期"* — chương 1 có tuyệt học, chương 2
  đã Nguyên Anh. Xung đột giải quyết bằng *"主角只需要一巴掌！啪！"*.
- **Xu hướng 2026**: `系统金手指开挂` bị chê *"太模板化了"*; và quan trọng hơn cho dòng song xuyên —
  `种田经商慢慢发育` bị loại thẳng vì *"节奏跟不上了"* (nhịp không theo kịp). **"Làm ăn dần dần"
  là lý do độc giả bỏ dòng kinh thương.**
- **Phía ngược lại**, sách dạy nghề vẫn nói *"没有代价的超能力，写出来一定无聊"* — nhưng câu đầy
  đủ là *"代价越克制"*: càng tiết chế càng tốt.

Cách hoà giải, và là luật của TruyenCity:

| Kiểu giới hạn | Ví dụ | Dùng? |
|---|---|---|
| **Phạm vi** — thứ năng lực không với tới | chỉ mở 0h–4h · chỉ chuyển vật vô tri · chỉ đọc được đồ, không đọc được người | ✅ bắt buộc |
| **Đối kháng ngoài** — kẻ muốn đoạt, kẻ mất phần khi main thắng | hội thẩm định mất quyền chia tiền | ✅ đây mới là nguồn căng thẳng |
| **Trừng phạt chủ nhân** — năng lực quay lại cắn main | trừ thọ nguyên · gánh ngược bệnh · phạt lên thân thể · nợ chồng nợ · nghèo vĩnh viễn | ❌ cấm |

Giới hạn phạm vi làm nhân vật phải **tính toán**. Giới hạn trừng phạt chỉ làm độc giả **khó chịu**.
Cả hai đều ngăn năng lực giải quyết mọi thứ miễn phí; chỉ một cái khiến người ta đọc tiếp.

Thêm hai luật từ cùng lượt audit:

- **Phát hiện, đừng thuyết minh.** *"发现式而非灌输式"* — để nhân vật và độc giả cùng dò ra ranh
  giới. Một hệ thống hiện ra đọc hết bảng năng lực ở chương 1 là đọc câu đầu đoán được nửa sau.
- **Kinh doanh nhảy bậc, không bò.** Mỗi chu kỳ đổi hẳn quy mô và giai cấp đối thủ.

## 5. Leo thang dài hạn

- **Chu kỳ cảm xúc**: 小不爽 → 小爽 → 小不爽 → 小爽 … → 大不爽 → 大爽. Thiết kế đại cao trào
  trước, rồi lấp chu kỳ nhỏ vào giữa. Một tiểu cao trào mỗi ~10.000 chữ (≈ 4–6 chương).
- **15 loại 爽点 để xoay vòng**: vả mặt · nghịch tập · nghiền ép · giấu mạnh lộ mạnh · phá vây ·
  trí thắng · kho báu hiện thế · được công nhận · cứu nguy · kỳ ngộ · đột phá cấp bậc · kẻ mạnh
  trở về · tuyệt địa phản kích · tình trường đắc ý · lực vãn cuồng lan.
  **Luật code: không lặp loại chủ đạo ở hai chu kỳ liền nhau.**
- **Đối thủ leo theo giai cấp**, không phải một kẻ đổi chiêu. Đây chính xác là lỗi window
  review đã bắt được ở ta: *"Ba Hồng chỉ xuất hiện để châm chọc rồi đứng nhìn (ch 82, 84, 85)"*
  và *"Tôn Sách chỉ đứng quan sát rồi tự nguyện quy phục"*.
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
