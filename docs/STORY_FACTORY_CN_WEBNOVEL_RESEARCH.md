# Nghiên cứu hệ thống sáng tác web novel Trung Quốc và Webnovel

Ngày chốt nguồn: 2026-08-25.

Trạng thái triển khai: phase 1 đã được đưa vào code ngày 2026-08-25. Live Planner chỉ còn
initial + tối đa một mechanical repair; Plan Judge chỉ chạy khi benchmark chủ động bật
`offline_judge`; lỗi đọc/văn phong có evidence được lưu làm advisory và không gọi Rewrite;
lỗi continuity/canon/required-delta vẫn có đúng một Rewrite. Editor risk-based sampling ở
mục 5.5 chưa triển khai vì Editor hiện còn là nguồn tạo `ChapterOutcome` cho state.

Mục tiêu của tài liệu này là trả lời hai câu hỏi:

1. Những nền tảng thương mại thực sự hướng dẫn tác giả viết thế nào?
2. TruyenCity nên chuyển những nguyên tắc đó thành hệ thống AI ra sao mà không tạo vòng
   retry tốn tiền hoặc làm cả factory mắc kẹt?

Đây không phải hướng dẫn bắt chước văn phong hay sao chép truyện đang có. Phần nghiên cứu
chỉ rút ra cấu trúc sản phẩm, nhịp kể, cách tạo kỳ vọng và cách vận hành dài kỳ.

## 1. Phạm vi và độ tin cậy của nguồn

### Nhóm A — nguồn chính thức hoặc do đội ngũ nền tảng đăng

- [Fanqie Writer Classroom](https://fanqienovel.com/writer/zone/tutorial?tab=1): thư viện
  chính thức về dàn ý, nhịp truyện, nhân vật, chất văn và cập nhật dài kỳ.
- [Các lỗi phổ biến của tác giả mới](https://fanqienovel.com/writer/zone/article/7530926898411470872):
  tổng hợp từ hoạt động sửa bài của trại huấn luyện tác giả Fanqie.
- [Ổn định cốt truyện để giữ người đọc](https://fanqienovel.com/writer/zone/article/7605818896267870270):
  tập trung vào mở truyện, móc cuối chương, tính mới của năng lực và vượt bottleneck giữa truyện.
- [Webnovel Inkstone — pacing](https://inkstone.webnovel.com/academy/article/725033027864297472):
  bài của Aurora Editorial Team.
- [Webnovel Inkstone — lỗi ba chương đầu](https://inkstone.webnovel.com/academy/article/73048170095006801):
  bài của Hongwen Editorial Team.
- [Webnovel Inkstone — dùng AI trong sáng tác](https://inkstone.webnovel.com/academy/article/643534644608040960):
  bài của Aurora Editorial Team.
- [Yuewen Writer Assistant](https://www.yuewen.com/app/?type=appzj): mô tả chính thức
  công cụ dàn ý, tìm kiếm toàn văn, sửa lỗi, thống kê độc giả và phản hồi đọc.

### Nhóm B — nguồn do nền tảng lưu trữ hoặc gắn với cộng đồng tác giả của nền tảng

- [Webnovel Book of Authors — FAQ](https://www.webnovel.com/book/10589139205070105/29978719070247551):
  hướng dẫn chia truyện dài thành phần, outline khoảng 30.000 chữ kế tiếp và bố trí tiểu cao trào.
- [Faloo — hướng dẫn mở truyện](https://bbs.faloo.com/t/1776242.html): bài hướng dẫn trên
  diễn đàn Faloo về tập trung vào nhân vật chính, mục tiêu, xung đột, tên và synopsis.
- [Faloo — mô tả “Faloo style”](https://bbs.faloo.com/doc/1777770/1.html): ghi nhận đặc trưng
  tên trực diện, ý tưởng lớn, nhịp nhanh và mật độ thỏa mãn cao.

Những nguồn nhóm B hữu ích nhưng không được xem như tiêu chuẩn kỹ thuật chính thức của nền
tảng. Đặc biệt, Faloo không công khai đầy đủ cẩm nang biên tập; kết luận về Faloo phải kết hợp
hướng dẫn công khai với quan sát bảng xếp hạng.

### Nhóm C — quan sát thị trường

- [Faloo ranking](https://wap.faloo.com/ranklist.aspx), ảnh chụp truy cập tháng 8/2026.
- [Webnovel monthly ranking](https://www.webnovel.com/ranking/novel/monthly/power_rank).
- [Webnovel all-time ranking](https://www.webnovel.com/ranking/novel/all_time/power_rank?signStatus=1&sourceType=0&timeType=4).
- Hai chương mở đầu được dùng để phân tích cấu trúc, không dùng để sao chép câu chữ:
  [Shadow Slave — Chapter 1](https://www.webnovel.com/book/shadow-slave_22196546206090805/nightmare-begins_59583457017254387)
  và
  [High Martial: I Can Copy All Root Bones — Chapter 1](https://www.webnovel.com/book/high-martial-i-can-copy-all-root-bones!_36279657308685305/chapter-1-copy-talent_98168491902814013).

## 2. Những điều các nguồn thực sự thống nhất

### 2.1. Lời hứa sản phẩm phải xuất hiện ngay

Fanqie, Faloo và Webnovel đều yêu cầu độc giả nhanh chóng biết:

- Nhân vật chính là ai và đang ở tình thế nào.
- Nhân vật muốn gì ngay lúc này.
- Trở lực hoặc nguy cơ nào đang chặn họ.
- Điểm khác biệt của truyện là gì.
- Vì sao chương sau đáng đọc.

Điều này không có nghĩa chương đầu phải giải thích toàn bộ thế giới. Ngược lại, cả Fanqie
và Webnovel đều cảnh báo việc đổ thông tin và mô tả không phục vụ hành động.

### 2.2. Truyện dài cần khung theo phần, không cần khóa từng chi tiết từ đầu

Webnovel khuyên có khung tổng thể, sau đó outline chi tiết phần khoảng 30.000 chữ trước mắt.
Inkstone yêu cầu ít nhất nhìn rõ arc một và arc hai. Fanqie dạy “core outline + setting” và
chia mục tiêu từ lớn xuống nhỏ.

Điểm chung là **rolling horizon**:

- Biết đích dài hạn.
- Biết rõ phần/arc hiện tại.
- Chỉ chi tiết hóa đoạn sắp viết.
- Điều chỉnh phần sau bằng kết quả của phần trước và phản hồi độc giả.

Không nguồn chính thức nào trong tập nghiên cứu này khuyến nghị tạo nhiều bản plan cho cùng
một chương rồi dùng nhiều model judge để chọn.

### 2.3. Xung đột phải leo thang bằng bản chất, không chỉ bằng con số

Fanqie cảnh báo lặp một loại “sảng điểm”. Webnovel cảnh báo system novel dễ trở thành chuỗi
đánh đối thủ, nhận cấp, rồi đánh đối thủ mạnh hơn. Cách thoát không phải chỉ tăng sức mạnh
địch mà phải thay đổi:

- Loại vấn đề.
- Loại quyết định nhân vật phải đưa ra.
- Cái giá hoặc rủi ro.
- Quan hệ bị ảnh hưởng.
- Phạm vi quyền lực hoặc đấu trường.

Đây là cơ sở sáng tác cho việc chống lặp. “Novelty ledger” là cách triển khai bằng phần mềm
của TruyenCity, không phải thuật ngữ từ các nền tảng.

### 2.4. Cao trào cần chuẩn bị, kết quả và dư âm

Các nguồn không ủng hộ việc nhét một cú twist vào mọi chương. Fanqie mô tả nhịp có lên có
xuống; một payoff hiệu quả cần có nguy cơ/đối chiếu từ trước, khoảnh khắc kết quả và dư âm
đến nhân vật hoặc thế cục. Webnovel cũng nhấn mạnh việc giữ tension, dùng curveball và cho
thấy progression.

Vì vậy đơn vị thiết kế đúng là một **arc có nhịp**, không phải một template chương lặp lại:

`gây kỳ vọng → tăng áp lực → đổi cách nhìn/điều kiện → trả một phần → để lại hệ quả mới`

Các bước có thể trải trên số chương khác nhau và không nên bị cố định thành chu kỳ ba chương.

### 2.5. Nhân vật và giọng riêng phân biệt truyện bền với truyện chỉ có hook

Quan sát Webnovel cho thấy hai tầng sản phẩm:

- Truyện mới lên hạng thường trình bày cơ chế rất nhanh: tái sinh, thiếu thốn, năng lực,
  giới hạn năng lực và mục tiêu hành động kế tiếp.
- Tác phẩm giữ hạng lâu kết hợp hiệu suất đó với một nhân vật có cách nhìn riêng, vết thương,
  mâu thuẫn nội tâm và giọng phản ứng dễ nhận ra.

Trong chương đầu của *Shadow Slave*, hoàn cảnh nghèo, thái độ châm biếm, sự tự trọng và nguy
cơ chết được thể hiện qua lựa chọn nhỏ và hành động trước khi lore được giải thích. Trong
chương đầu của *Copy All Root Bones*, cơ chế được giới thiệu rất nhanh, có giới hạn rõ và lập
tức tạo ra mục tiêu đi tìm người có tư chất tốt hơn. TruyenCity cần kết hợp cả hai: rõ cơ chế
nhưng không để nhân vật trở thành người vận hành cơ chế vô danh.

### 2.6. Cập nhật ổn định quan trọng hơn tối ưu vô hạn

Webnovel và các công cụ của Yuewen đều coi cập nhật, stockpile, dữ liệu đọc và tương tác độc
giả là một phần của sản phẩm. Điều này ủng hộ pipeline có deadline, checkpoint và ngân sách
cố định. Một chương khá nhưng ra đều có giá trị thương mại cao hơn một chương bị sửa vô hạn.

### 2.7. AI có một lỗi phong cách có hệ thống

Inkstone nêu các dấu hiệu thường thấy của văn AI:

- Mô tả nhiều nhưng nội dung cụ thể ít.
- Ngôn ngữ trang trọng hoặc “đẹp” sai chỗ.
- Thiếu sắc thái quan hệ và cảm xúc thật.
- Các đoạn kết có cảm giác đóng lại thay vì kéo người đọc sang chương sau.
- Giọng tác giả và giọng nhân vật thiếu cá tính.

Đây là giới hạn mô hình, nhưng prompt và context hiện tại có thể làm nó nặng hơn nếu chứa quá
nhiều checklist. Model sẽ cố “hoàn thành hợp đồng” thay vì sống trong cảnh.

## 3. Điều bảng xếp hạng cho thấy

### Faloo

Bảng xếp hạng tháng 8/2026 tiếp tục có mật độ cao các tiêu đề theo mẫu:

`đấu trường/IP quen thuộc + điều kiện mở đầu/năng lực + kết quả hứa hẹn`

Những tiêu đề này bán ý tưởng trước khi bán văn phong. Đây là bằng chứng tốt cho packaging,
nhưng không chứng minh mọi truyện Faloo có chất lượng văn chương hoặc retention dài hạn tốt.

### Webnovel

Nhóm truyện mới nổi dùng title/synopsis để nói thẳng cơ chế và quỹ đạo tăng trưởng. Nhóm giữ
hạng lâu vẫn có core fantasy rõ, nhưng phần giới thiệu nhấn mạnh hoàn cảnh cá nhân, giới hạn,
động cơ và quá trình biến đổi của nhân vật nhiều hơn.

Kết luận cho TruyenCity:

- Học Faloo và nhóm mới nổi để đóng gói, vào truyện và tạo kỳ vọng.
- Học nhóm bền để xây nhân vật, quan hệ, lựa chọn và hệ quả dài hạn.
- Không dùng một nhịp “kích hoạt → biểu diễn → đám đông kinh ngạc” làm động cơ mặc định.

## 4. Đối chiếu với baseline trước phase 1

### Những phần đang đúng hướng

- `marketBlueprint` đã khóa arena, lợi thế, comparison engine và scale ladder.
- Causal/resource/knowledge validator giải quyết nhiều lỗi mà hướng dẫn nền tảng cũng coi là
  nguyên nhân làm người đọc mất niềm tin.
- Writer và Editor có route độc lập.
- Hệ thống đã có voice contract, recent outcomes, arc plan, rolling plan và window review.
- Provider deadline và lease giúp một request không treo vô hạn.

### Những phần đang phản tác dụng

#### 1. Chu kỳ ba chương bị biến thành công thức cố định

Prompt hiện yêu cầu mỗi cửa sổ ba chương lần lượt gây áp lực/dùng lợi thế, khuếch đại kết quả,
rồi đổi vị thế và mở mục tiêu. Đây là một cách dạy dễ hiểu nhưng khi áp lên hàng chục cửa sổ,
nó tự tạo ra nhịp lặp mà hệ thống sau đó lại cố dùng Judge để bắt.

#### 2. Planner/Plan Judge vừa sáng tác vừa làm kiểm toán

Stage `plan` của baseline có thể dùng 1–6 call: planner, judge, replan, repair và re-judge. Càng nhiều
hợp đồng sản phẩm và schema, xác suất một mục nhỏ bị Judge từ chối càng cao. Retry làm tăng
chi phí nhưng không bảo đảm tăng bất ngờ hoặc giọng riêng.

#### 3. Editor được gọi cho mọi chương

Steady state của baseline khoảng 2,9 provider call cho mỗi chương xuất bản. Phần lớn call dùng để
chứng minh chương tuân thủ hợp đồng. Điều này tối ưu độ đúng hơn độ sống, đồng thời tạo thêm
điểm timeout.

#### 4. Nhiều tiêu chí văn học đang bị dùng như gate đồng bộ

Canon, số học và quan hệ nhân quả nên fail closed. “Đủ bất ngờ”, “đủ sảng” hoặc “giọng có
hồn” không có đáp án nhị phân ổn định. Dùng model judge để khóa các tiêu chí này sẽ tạo vòng
tranh luận giữa model thay vì tạo chương tốt hơn.

#### 5. Chưa có feedback loop từ độc giả

`quality_score` chưa mang dữ liệu đáng tin từ hành vi đọc. Factory đang tự chấm bằng cùng họ
model đã tạo nội dung, trong khi Yuewen/Fanqie coi dữ liệu độc giả và phản hồi chương là tín
hiệu vận hành quan trọng.

## 5. Thiết kế đề xuất: bounded single-pass editorial system

Mục tiêu: nâng chất lượng bằng context và cấu trúc tốt hơn, không bằng số lần thử.

### 5.1. Một arc call tạo “arc beat map”

Mỗi arc plan phải có:

- `arcQuestion`: câu hỏi cảm xúc hoặc quyền lực mà arc phải trả lời.
- `protagonistObjective` và `oppositionObjective`.
- `conflictEngine`: thị trường, thể chất, thể chế, xã hội, đạo đức, bí ẩn hoặc tài nguyên.
- 6–12 `beats`, mỗi beat có chức năng khác nhau.
- `irreversibleTurn`: một thay đổi không thể quay về trạng thái cũ.
- `climaxPreparation`, `climax`, `aftermath`.
- `forbiddenRecentShapes`: causal shape và stock reaction đã dùng gần đây.

Độ dài arc là kết quả của nội dung, không khóa cứng ở 8 hay 10 chương.

### 5.2. Một planner call cho tối đa ba chương, không có literary replan

Planner chọn các beat kế tiếp và vật chất hóa thành rolling plan. Code kiểm schema, canon,
số học, ID và causal feasibility.

- Nếu sai schema: cho một lần technical repair có chỉ dẫn chính xác.
- Nếu sai canon/nhân quả không thể sửa cục bộ: park để operator xem.
- Nếu chỉ “chưa đủ hay”: ghi advisory cho Writer hoặc arc sau, không replan đồng bộ.

Không dùng Plan Judge cho từng rolling window. Window review định kỳ có thể chấm xu hướng,
nhưng không được làm chương hiện tại retry.

### 5.3. Chapter brief có một mục tiêu cảm xúc, không có checklist văn học dài

Writer chỉ cần biết:

- Ai muốn gì trong cảnh.
- Ai hoặc điều gì cản lại.
- Nhân vật phải lựa chọn gì.
- Điều gì thay đổi sau lựa chọn đó.
- Một chi tiết cụ thể gắn với nghề/thời đại/thế giới.
- Giọng và bias của POV.
- Móc đang mở, không bắt buộc cliffhanger giả.

Các validator cơ học không nên được chép nguyên vào prompt Writer. Chúng kiểm đầu ra sau đó.

### 5.4. Writer một call, không retry vì tiêu chí cảm tính

Writer tạo bản cuối trong một request. Chỉ sửa khi có một lỗi hard, có anchor và có hướng sửa
cụ thể. Mỗi chương tối đa một rewrite.

### 5.5. Editor chuyển từ “mọi chương” sang “risk-based sampling”

- Chương 1–3 của canary: review tất cả.
- Chương có thay đổi canon lớn, payoff arc hoặc deterministic warning: review.
- Bình thường: review mỗi chương thứ năm cùng window review.
- Literary warning không khóa xuất bản; nó cập nhật author directive cho các chương sau.

Hard validator vẫn chạy mọi chương và không cần model call.

### 5.6. Novelty ledger là dữ liệu hỗ trợ, không phải máy bốc thăm

Lưu dấu vân tay của chapter/beat:

- Conflict engine.
- Actor chủ động.
- Phương pháp giải quyết.
- Loại rủi ro/cái giá.
- Loại payoff.
- Witness/reaction function.
- Hệ quả còn mở.

Ledger chỉ cấm trùng toàn bộ causal shape hoặc stock reaction trong cửa sổ gần. Không ép mỗi
chương phải chọn một tổ hợp “mới” ngẫu nhiên vì điều đó phá arc và tính cách nhân vật.

### 5.7. Dữ liệu độc giả điều khiển arc sau, không rewrite chương đã đăng

Tối thiểu cần lưu theo chapter:

- Tỷ lệ mở chương sau.
- Tỷ lệ đọc hết hoặc độ sâu cuộn đáng tin.
- Thời gian đọc đã loại tab nền/bot.
- Điểm thoát.
- Bookmark/comment/follow delta.

Dùng dữ liệu tổng hợp của 5–10 chương để điều chỉnh nhịp arc kế tiếp. Không dùng một tín hiệu
đơn lẻ để tự động rewrite hoặc đổi canon.

## 6. Ngân sách call

### Baseline trước phase 1

- Rolling plan + judge/replan: biến động lớn.
- Writer + Editor mỗi chương.
- Rewrite + Editor khi fail.
- Tài liệu hiện tại ước tính khoảng **2,9 call/chương** ở steady state.

### Đề xuất

- Arc plan: khoảng 0,1 call/chương khi amortize.
- Rolling plan: tối đa 1 call/3 chương, khoảng 0,33.
- Writer: 1.
- Editor/window review theo mẫu: khoảng 0,2.

Mục tiêu steady state: **khoảng 1,6 call/chương**, giảm xấp xỉ 45% số call. Một chương bình
thường không có retry. Trần của một chương có lỗi hard là một lần rewrite; lỗi văn học chỉ
ảnh hưởng brief tương lai.

### Phase 1 đã triển khai

Vì Editor vẫn phải trích `ChapterOutcome` ở mọi chương, phase 1 chưa đạt 1,6. Khi rolling
window đủ ba chương và không có hard rewrite, ngân sách lý thuyết hiện khoảng **2,57
call/chương**: Writer 1 + Editor 1 + Planner 0,33 + window review 0,2 + arc khoảng 0,04.
Phần đã giảm ngay là literary retry: lỗi văn phong không thêm call, Plan Judge không còn nằm
trên critical path, và một hard rewrite thất bại sẽ park thay vì tự redraft vòng nữa.

## 7. Acceptance test đúng cho thay đổi này

Không đánh giá bằng việc tất cả model judge đều trả `pass`. Dùng ba lớp:

1. **Mechanical:** typecheck, tests, schema, causal replay và continuity đều sạch.
2. **Blind editorial:** người đọc không biết route/model, so sánh 10 chương baseline với 10
   chương candidate theo độ muốn đọc tiếp, giọng nhân vật, độ lặp và độ cụ thể.
3. **Operational:** không quá ngân sách call, không có retry nội dung vô hạn, mỗi failure nhả
   lease và job khác vẫn chạy.

Canary phải giữ private cho tới khi có đủ 10 chương. Không dùng một smoke 5 chương chỉ sạch
continuity để tuyên bố chất lượng văn học đã đạt.

## 8. Quyết định đề xuất

Không thay Writer model ngay và không thêm nhiều Judge.

Thứ tự thay đổi hợp lý:

1. Bỏ literary replan/re-judge khỏi critical path; giữ một lần technical repair.
2. Bỏ template nhịp ba chương cố định; thêm arc beat roles và irreversible turn.
3. Chuyển Editor sang risk-based sampling.
4. Thu gọn Writer brief và tăng POV bias/relationship stakes/chi tiết cụ thể.
5. Thêm chapter analytics rồi dùng dữ liệu để steer arc sau.
6. Sau khi pipeline ổn định mới bake-off Writer model trên cùng corpus.

Đây là phương án bám sát nhất với tài liệu nền tảng, bằng chứng thị trường và ràng buộc vận
hành của TruyenCity: **plan ahead, write forward, learn from readers; không retry cho tới khi
AI tự đồng ý rằng văn của nó hay.**
