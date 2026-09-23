# Audit hệ thống viết truyện + nghiên cứu Faloo và truyện mạng Trung Quốc — 23/09/2026

Phạm vi: `src/services/serial/`, `src/services/narrative/`, `src/services/story-factory/`;
dữ liệu production (`serial_*`, `story_factory_*`, `chapters`); đọc trọn 20 chương Serial
đang public; đo trực tiếp `b.faloo.com` ngày 23/09 (curl + GB18030, không đăng nhập, không
mở VIP); tra cứu các bộ truyện mạng kinh điển. Không gọi model trả phí, không ghi database,
không sửa code.

Ký hiệu nguồn: **[Đo]** tự đếm từ trang/DB · **[Trang]** số trang tự hiển thị · **[S]** nguồn
thứ cấp · **[Suy luận]** nhận định của người audit.

## Kết luận một đoạn

Máy chạy được, test xanh (23 suite / 432 test), nhưng **thứ nó viết ra là đối cực của 爽文**.
Serial engine được xây ngày 19/09 để thoát "văn học quy trình" của Story Factory; bốn ngày
sau nó viết "văn học kiểm định": bộ *"Cửa Hàng Của Ta Bán Công Pháp Tu Tiên"* sau 10 chương
chưa bán một bộ công pháp nào, chương 10 là cảnh soạn mẫu phiếu ghi nguồn gốc thịt. Nguyên
nhân nằm trong code và đo được: (1) chính sách v3 "lived-causality" thay thế toàn bộ
playbook Faloo và **cấm tường minh** giao dịch, thăng cấp, tên mới, đám đông, payoff; (2) bộ
kiểm tra kế toán (41 + 11 mã từ chối, opening audit 7 nhóm số học tồn kho) vứt 82% lượt viết
và chỉ để sống sót những chương không có biến cố; (3) mỗi thất bại lại sinh thêm luật — đúng
kiểu chết của ba hệ thống trước. Nghiên cứu Faloo hôm nay xác nhận hướng 19/09 là đúng, sửa
vài số liệu cũ, và thêm một rủi ro mới: **Faloo vừa phạt 402 truyện AI ngày 20/09/2026**.

## Trạng thái sau sửa (23/09, cùng ngày)

Người dùng duyệt "sửa hết". Đã làm, có test (447/447 xanh, typecheck và secret scan sạch):

| Khuyến nghị | Đã làm | Chỗ trong code |
|---|---|---|
| A. Playbook Faloo là chính sách | Premise v3 lived-causality không còn khởi chạy được: `seed`, `approve`, `serial:run` từ chối; runtime pause job v3 trước khi lập kế hoạch/viết. Xoá sáu câu cấm payoff khỏi prompt v3 của Serial. Premise proposal chỉ còn đường v2. | `contracts.ts` `assertSerialLaunchable`, `runtime.ts` `pauseRetiredPremise`, `foundation.ts`, `agents.ts` |
| B. Số liệu thuộc về code | Planner khai `beatSheets[].ledger`; code chuẩn hoá id, cộng trừ trước khi viết (sai → planner thử lại, không tốn chương); Writer/Judge nhận `bangSoLieu` do code dựng; commit ghi đúng sổ đã lập, Extractor thôi đếm hàng. | `state.ts` `normalizeCycleLedger`/`assertCycleLedger`, `context.ts` `renderLedgerLines`, `engine.ts` |
| C. Đảo cổng | Lỗi số liệu sống sót sau một lần sửa → vẫn commit; chỉ lỗ hổng logic mới replan. `sanitizeDigest` gạt id sai của Extractor thay vì từ chối chương. Opening audit chấm như biên tập nhận sách (kim thủ chỉ muộn nhất ch2, kết chương có móc, lời hứa tiêu đề trả trước ch3, bảng 【】 kiểm bằng code). Hai chu kỳ liền điểm kéo đọc < 2,5 → giữ riêng tư một lần chờ người đọc. | `contracts.ts` `HARD_CONTINUITY_KINDS`, `state.ts` `sanitizeDigest`, `prompts.ts`, `runtime.ts` `holdLowPullCycle` |
| Premise / nhịp | Playbook `2026-09-23.1`: kim thủ chỉ muộn nhất cuối ch2, kết chương "hé lộ rồi cắt", luật mới `title_promise_pays_early`. | `playbook.json` |

Chống tái phát (sau pilot 4 chương): khoá chính sách bằng test (`policy-lock.test.ts`),
trần mã từ chối (57 khi đếm đúng cả lời gọi xuống dòng), lint premise (sổ mở đầu không viết như kế toán, hook không trì hoãn lời
hứa), đo văn sổ sách bằng code (> 14 từ/1.000 → sửa một lần), bắt từ ngữ lộ chỉ dẫn, không
công bố lại cấp đã đạt, và `serial:run` chạy opening audit như production.

Chưa làm (cần quyết định hoặc tốn tiền): schema v2 vẫn đòi đúng hai thế giới nên chưa viết
được lane 全民领主/御兽 thuần; chưa chạy pilot trả phí nào với engine đã sửa. Mô-đun
`src/services/narrative/foundation.ts` dùng chung với Story Factory (đã dừng) giữ nguyên.

## 1. Hiện trạng production (đo ngày 23/09/2026)

| Hạng mục | Số liệu |
|---|---|
| Story Factory (cũ) | 20 job `cancelled`, 2 `quality_blocked`, 1 `infra_blocked`; tổng chi đã ghi **$469,31**; 5 bộ cũ đã ẩn |
| Serial engine (mới) | 2 bộ public, mỗi bộ 10 chương; cả hai job `paused` ở `plan_cycle` |
| Lượt chạy chương Serial | 20 `published` · 69 `replanned` · 24 `failed` → **82% lượt viết chương bị vứt** |
| Chi phí Serial đã ghi | $8,41 trong `serial_runs` + ~$8,03 bundle rewrite ngoài DB (`SERIAL_RETRY_LESSONS.md`) ≈ **$0,82 / chương public** (mục tiêu kế hoạch: ≤ $0,15) |
| Kỹ thuật | `typecheck` sạch · 23 suite / 432 test xanh |

Máy chạy được. Test xanh. Vấn đề không nằm ở kỹ thuật.

## 2. Phát hiện chính: bộ máy mới đã tái sinh đúng căn bệnh nó được xây để chữa

`REDESIGN_PLAN.md` (19/09) chẩn đoán Story Factory viết "văn học quy trình": mỗi chương là
một thao tác kỹ thuật kể chậm, không leo thang, không có gì để chờ; nguyên nhân là một cỗ
máy sổ cái tối ưu cho *tính kiểm chứng* thay vì *kỳ vọng của độc giả*.

Bốn ngày sau, 20 chương Serial đang public là **văn học quy trình phiên bản "kiểm chứng"**:

| Bộ | Tiêu đề hứa | Chương 10 thực tế |
|---|---|---|
| *Song Xuyên Mạt Thế: Cửa Hàng Của Ta Bán Công Pháp Tu Tiên* | bán công pháp tu tiên cho thành phố mạt thế | Lâm Việt soạn **mẫu phiếu ghi nguồn gốc thịt** (ngày nhận, tuyến dọn, giờ nhận, người giao…); Hàn Dược Sư duyệt nó "làm chuẩn kiểm nhận cho ba lượt sau. Chưa phải giá mua." Câu kết: hắn biết phải chờ gì mới được gọi là hàng. |
| *Song Xuyên Tương Lai: Từ Một Lưỡi Dao Đến Công Ty Công Nghệ* | từ lưỡi dao thành công ty công nghệ | Khải bo một cung nhỏ trên đầu dao cạo mẫu V1, rửa bằng vụn giấy mô phỏng, lập **"Bảng đối chứng hậu chỉnh V1"**. Nguyên văn: "Không có gì để khoe cả." |

Tên chương tự tố cáo: *"Một Miếng Tốt Không Chứng Minh Cả Lô"*, *"Chỉ Biết Về Mẫu Này"*,
*"Cần Không Có Nghĩa Là Trả Nổi"*, *"Tôi Không Hứa Nó Chữa Được Mọi Thứ"*, *"Bảng Đối Chứng
Hậu Chỉnh V1"*. Đó là tên chương của một sổ tay kiểm định chất lượng, không phải truyện 爽.

Sau 10 chương (~19.000 từ, bằng khoảng 20–25 chương Faloo), bộ "bán công pháp" **chưa bán
một bộ công pháp nào**, không có hệ thống 【】, không có cấp bậc được thăng, không có đối thủ,
không có vả mặt. Giao dịch lớn nhất: đổi ba gói bột cầm máu lấy một tinh hạch cạn và hai
viên pin.

Đo trên 20 chương (đếm từ vựng):

- Từ vựng thận trọng/kiểm chứng (*kiểm, mẫu, ghi, sổ, chưa, xác nhận, đối chứng, giới hạn,
  không hứa*) **tăng dần theo chương**: Mạt Thế 20 → 62 (ch1 → ch7), Tương Lai 22 → 48.
- Từ vựng thương mại/sức mạnh thấp và không tăng.
- 0 bảng 【】 trên 20 chương (kế hoạch 19/09 quyết định lane hệ thống phải hiện bảng).
- Câu kết chương là suy ngẫm êm (*"Với hắn, như vậy đã là một bước đủ thật."*), không phải
  hook — ngược luật `end_on_expectation` trong chính playbook.

Văn xuôi *câu chữ* không tệ: có nhịp, có chi tiết đời sống, có giọng. Giống hệt nhận xét về
bộ cũ ngày 19/09. Vấn đề vẫn là **cái được kể**, không phải cách kể.

## 3. Nguyên nhân gốc — ba cơ chế, có thể chỉ ra trong code

### 3.1 Chính sách v3 "lived-causality" phủ định trực tiếp văn phạm Faloo

Cả hai bộ đang chạy là Premise **schema v3**. Với v3, `serialSystemPrompt()`
(`src/services/serial/foundation.ts:55`) **bỏ qua toàn bộ `playbook.json`** — nơi chứa luật
Faloo (mở chương vào việc muốn thấy, một thứ mới có tên, kết bằng kỳ vọng, 15+ loại 爽点) —
và thay bằng `narrativeCraft()` (`src/services/narrative/foundation.ts`). Các chỉ dẫn đang
chạy thật:

| Vai | Chỉ dẫn v3 (trích prompt) | Tác dụng |
|---|---|---|
| Writer | "Cảnh sinh hoạt, quan hệ, khám phá hoặc suy nghĩ có thể là trọng tâm. Không tự thêm khách hàng, đám đông, cấp bậc, công ty, sản phẩm hay giao dịch để tạo vẻ tiến triển." | Cấm chính các đơn vị payoff của 爽文 |
| Judge | "Không phạt cảnh vì thiếu giao dịch, tăng cấp, tên mới, đám đông hay payoff vật chất." | Tắt cảm biến duy nhất đo độ sướng |
| Opening | "Không đòi chương 1 phải kiếm tiền, mở công ty, có cấp bậc, tên mới hay người chứng kiến." | Tắt cổng 黄金三章 |
| Premise | "Không khóa số chương phải bán hàng hoặc lên cấp." | Không còn lời hứa có hạn |
| Narrative review | "Không phạt cảnh đời sống… chỉ vì chưa có giao dịch, tăng cấp, tên mới, nhân chứng hay hook đe dọa." | Cổng xuất bản không nhìn thấy độ sướng |

Hệ quả thấy rõ trong verdict thật của chương 1 Mạt Thế: scorecard 爽 toàn **0**
(payoff 0, endHook 0, anticipation 0), còn phần steering khen: *"Không cần thêm giao dịch
trong chương này… chưa phải lúc ép payoff thương mại."* Literary review cả chu kỳ 1:
0 finding, `mayPublish: true`, ghi nhận "phần thưởng hiện tại vừa đủ thật — một tiêu chuẩn
kiểm nhận". Điểm đọc trung bình của chính máy cho 10 chương: **2,31/5**, yếu nhất
`structuralFreshness` — nhưng không cổng nào đọc con số đó.

Chính bản Premise cũng đã bị viết lại theo hướng này. Hook của bộ Mạt Thế: *"trước khi bán
công pháp, hắn phải hiểu người bên kia sống bằng gì và thứ mình mang qua có thật sự dùng
được hay không"*. `readerFantasy`: *"…từng bước… rồi mới hình thành cửa hàng"*. Kim thủ chỉ
`Cửa Kho Song Giới` **không có nấc tiến hoá nào** (`rungs: []`).

Nghiên cứu `NARRATIVE_FOUNDATION_RESEARCH_2026-09-21.md` có giá trị ở tầng nhân quả, nhưng nó
rút kết luận từ ba mẫu Faloo có nhịp *chậm nhất* rồi tổng quát thành luật cho mọi chương, và
chủ động loại các thủ pháp nhanh ("không lấy tốc độ đó làm chỉ tiêu", "không cần nhân bản").
Nó chữa triệu chứng "thành quả bịa, không có chuẩn bị" bằng cách bỏ luôn thành quả.

### 3.2 Bộ kiểm tra thưởng cho chương không có biến cố (thiên lệch sống sót)

Mọi lý do vứt chương đều là kế toán, không có lý do nào là "chán":

| Lý do bị loại (trích `serial_runs.error`) | Số lượt |
|---|---|
| `inventory_arithmetic`, `transaction_continuity`, `resource_provenance` | phần lớn opening audit |
| `unknown_world_entity`, `unknown_location`, `unknown_character` | merge |
| `progression_skip`, `golden_finger_skip`, `hook_due_in_past` | merge |
| `opening_contract` (lệch một câu so với hợp đồng mở đầu) | opening audit |
| "Chapter still contradicts canon after a repair and a rewrite" | judge |

Opening auditor (`src/services/serial/prompts.ts:79`) đối chiếu một **"Sổ giao dịch chuẩn"**
theo bảy nhóm số học tồn kho — đúng cái ledger mà REDESIGN_PLAN đã xoá khỏi Story Factory.
Ngày 21/09 còn thêm asset ledger (`asset_overspend`, `asset_lot_timeline`,
`duplicate_asset_lot`…). Đếm trong code: **41 mã từ chối ở `state.ts` + 11 ở foundation**,
cộng opening auditor 7 nhóm, semantic evidence verifier, literary review. Kế hoạch hứa
"~10 luật cứng".

Cơ chế chọn lọc rất đơn giản: **giao dịch, thăng cấp, nhân vật mới, địa danh mới chính là
nơi sinh lỗi kế toán**. Chương nào có nhiều biến cố thì bị loại; chương nào chỉ ghi sổ,
kiểm mẫu, hẹn lần sau thì qua. Sau 93 lượt vứt, cái còn sống là văn học kiểm định. Nhân vật
chính cẩn trọng quá mức không phải "tính cách" — nó là hình dạng mà bộ lọc để lại.

### 3.3 Sửa lỗi bằng thêm luật, lần thứ tư

Từ 19/09: `engine.ts` sửa 11 lần, `prompts.ts` 10, `context.ts` 9, `runtime.ts` 8,
`contracts.ts` 8; 11 script vận hành riêng cho serial (`serial-editorial-rewrite`,
`serial-apply-editorial-rewrites`, `serial-reconcile-state`, `serial-backfill-asset-ledger`…);
bảy tài liệu Narrative Foundation trong hai ngày, ba trong số đó là audit / re-audit /
post-fix audit của chính nó. Đây là mẫu
hình đã giết `story-engine/`, factory v1 và factory "Faloo correction". Chính sách "không
park" cũng đã đảo ngược: lỗi Extractor và literary `blocking` giờ **pause** job chờ người.

## 4. Faloo hôm nay — đo trực tiếp 23/09/2026

Trang đã giải mã lưu ngoài repo (không đưa toàn văn tác phẩm vào repository). Một số trang
xếp hạng cần cookie jar (`curl -c/-b`) vì CDN chuyển hướng bằng cookie `C3VK`.

### 4.1 Faloo đang trừng phạt truyện AI — rủi ro mới, quan trọng nhất

- **20/09/2026**, Faloo đăng thông báo riêng về AI, liệt kê **402 mã truyện** bị trừ toàn bộ
  nhuận bút chưa trả và hạn chế cập nhật. Lý do nêu: truyện AI xuất thẳng tràn kho, spam cập
  nhật để chiếm hiển thị, và 365 yêu cầu gỡ vì bản quyền trong một tháng
  ([bbs t/1777960](https://bbs.faloo.com/t/1777960.html)). [Trang]
- Bị gắn cờ có cả truyện **#1 总收藏** (652447), 6 truyện trong top 59 月票, 3 trong top 30
  总收藏. Cộng các nhãn *AI洗稿抄袭 / AI模版批量生成 / AI废稿续写* trong thông báo phạt hằng
  tháng 11/2024–11/2025 và đợt 09/2026: **981 mã truyện riêng biệt**. [Đo]
- Điều kiện phúc lợi 2025 yêu cầu truyện "无代写、抄袭、AI生成、嫁接废稿"
  ([Author/2](https://b.faloo.com/Author/2.html)). [Trang]
- Tín hiệu phía độc giả: một truyện trong top 30 周收藏 ghi ngay phần giới thiệu là người
  thật gõ tay, từ chối AI và studio (1549013). Một truyện bị cờ viết **30.716 chữ/ngày**;
  [Suy luận] khối lượng bất thường là một tín hiệu phát hiện.
- Bối cảnh rộng hơn [S]: 番茄 bắt khai báo dùng AI từ 01/09/2025, khóa tài khoản 06/2026;
  阅文 gỡ ~100 truyện khỏi 月票/畅销榜 vì "AI痕迹过重" (08/2026); quy định ghi nhãn nội dung
  AI của Trung Quốc hiệu lực 01/09/2025.

**Quyết định của người dùng (23/09):** không áp dụng — TruyenCity phục vụ độc giả Việt, thị
trường Việt còn rất xa kiểu siết này. Phần dưới giữ làm tư liệu.

**Ý nghĩa cho TruyenCity** [Suy luận]: TruyenCity không đăng lên nền tảng Trung Quốc nên
chính sách không áp trực tiếp. Nhưng nó cho thấy (a) thứ độc giả 爽文 ghét nhất ở truyện AI
là **流水文** — trôi, đều, không có cú — chứ không phải bản thân việc dùng máy; (b) cạnh tranh
bằng *khối lượng* là con đường nền tảng đang chặn. TruyenCity chỉ thắng bằng chất lượng từng
chương. Nhịp 3 chương/ngày/bộ trong kế hoạch vẫn nằm trong dải người thật.

### 4.2 Sửa lại các số liệu cũ trong repo

| Ghi trong repo (19/09) | Đo 23/09 | Sửa |
|---|---|---|
| Top books ~1.000–1.400 chữ/chương, 8.000–11.000 chương | Đúng với **siêu truyện mở năm 2022** (1.203–1.276 chữ/ch, nay đã **12.000–12.776 chương**, 7–8 ch/ngày). Truyện top **mở năm 2026**: **2.000–4.800 chữ/chương**, 2–5 ch/ngày | Chương 1.500–2.500 từ Việt của ta nằm đúng dải hiện tại. Không đổi độ dài. |
| 日更 ≥ 4.000 chữ | Đó là chỉ tiêu 强推. **全勤 2025 đòi ≥ 6.000 chữ/ngày**, ≥ 18 vạn/tháng | Sàn thực tế là 6.000 |
| Tên truyện `ARENA：开局/人在 + …` | Tiền tố "X：" 75–83% ✓; "开局" 18–29%; "人在" 2–8% | Giữ "X：", bỏ ép "开局/人在" |
| Tên chương luôn là câu móc | Chỉ ~một nửa số truyện (1516702: 100% có ！/？; 1530098: 5%) | Là lựa chọn phong cách, không phải luật |
| 金手指 bắt buộc ở chương 1 | 5/6 truyện gốc: trong ch1 (12%–98% vị trí). 969757 (#2 周点击): lộ cuối ch2, kích hoạt ch3 | Muộn nhất cuối ch2, nhưng **chương nào cũng kết bằng hé lộ phần thưởng** |

### 4.3 Bảng xếp hạng: đồng nhân áp đảo hiện tại, truyện gốc thắng đường dài

| Bảng | 同人 | Gốc |
|---|---:|---:|
| 周点击 top 60 | 81,7% | 16,7% |
| 月票 top 59 | 74,6% | 16,9% |
| 月打赏 top 30 | 57% | 40% |
| 新书PK top 30 | 97% | 3% |
| **总收藏 top 30 (tích lũy)** | 27% | **~67%** |

Dòng gốc mạnh nhất hiện tại [Đo]: **全民/全球降临** (lãnh chúa, chuyển chức, thẻ bài — 6 truyện,
có #1 月票 1530098 và #2 周点击 969757), **视频/天幕盘点** (5), đô thị tạp (4), 玄幻/洪荒 (3),
rồi 御兽, 高武, 末世, 网游 mỗi dòng 1. **"Song xuyên kinh doanh" không có mặt trong danh sách
dòng gốc mạnh.** Đáng chú ý: quyết định #1 ngày 19/09 chọn 5 lane (hệ thống đô thị, huyền
huyễn vô địch, toàn dân lãnh chúa, trọng sinh, thức tỉnh toàn dân) — hai pilot đang chạy đều
là Song Xuyên, lệch khỏi quyết định đó.

### 4.4 Sáu truyện gốc top, ba chương đầu — số đo

| Truyện | Chữ ch1–3 | Trung vị đoạn | Thoại % | Panel 【】/叮 | GF ở ch1 | Thực thể mới có tên / ch |
|---|---|---|---:|---|---|---|
| 969757 全民领主 | 1830/1970/1394 | 13–20 | 27–37 | 1/11/15 | cuối ch2–ch3 | ~20 / 5 / 3 |
| 1516702 视频盘点 | 2297/3735/3519 | 18–22 | 29–45 | 9/4/10 | 13% | ~12 / 6 / 6 |
| 1530890 御兽 | 2532/2511/2673 | 27–29 | 25–30 | 『』 | 12% | ~15 / 6 / 7 |
| 1530098 卡神 | 1969/1739/2114 | 18–31 | 15–38 | 11/31/18 | 72% | ~11 / 8 / 5 |
| 844627 废墟求生 | 2459/1758/1825 | 19–23 | 32–38 | 1/6/2 | 98% | ~3 / 2 / 5 |
| 1541877 多子多福 | 2175/4184/2136 | 23–26 | 16–19 | 2/3/0 | 80% | ~13 / 13 / 3 |
| **TruyenCity Serial (20 ch)** | 1.000–2.800 từ | — | 6–53 | **0** | cửa mở ~45% ch1, **không có phần thưởng** | ch1 Mạt Thế: ~3 (Đan Các, Thanh Lô Phường, Hàn Dược Sư) |

Cách kết chương phổ biến nhất ở Faloo: **hé lộ phần thưởng rồi cắt** (chữ "金手指！", lá bài
tím 【哥布林杀手】, dòng 叮, câu "打开！"); tiếp theo là mục tiêu/thiếu hụt mới, trớ trêu kịch
tính, phe đối lập ngạo mạn chờ bị vả. Cả 6 phần giới thiệu cùng một thứ tự: **tiền đề → kim
thủ chỉ → 2–4 ví dụ nâng cấp cụ thể (【耕田】→【灵田】×1000%, 树苗→世界树) → một câu khoe hoặc
lời bình của người ngoài**.

Leo thang dài hạn [Đo, từ mục lục]:
- 969757: 46 quyển, mỗi quyển 40–250 chương, **đấu trường mở rộng**: 新人试炼 → 开辟世界 →
  元素之地 → 琉璃宇宙 → 成仙 → 神话世界 → 不朽仙域 → 三灾五劫.
- 844627: leo thang **lãnh thổ** (thành di động → đế quốc Huyền Vũ 1–4).
- 1541877: leo thang **cấp đối thủ** (ch10 一剑斩王 → ch80 五皇出世 → ch200 两宗帝兵 → ch236 尊者).
- 1530890: leo thang **giải đấu/cảnh giới** (ch50 八强赛 → ch80 两仪境 → ch300).
- 1516702: không leo thang mà **xoay chủ đề** (核武 → 高铁 → 抗美援朝 → 汉字).

Biên tập Faloo (bài 2020–2021, chưa có bản mới hơn): mở đầu ≤ 3 nhân vật phụ; xung đột =
mong muốn + trở lực; đánh nhau: main hạ đối thủ trong một đến vài chiêu, đánh dài là câu chữ;
**kim thủ chỉ là công cụ để main tự hành động**, không để phần thưởng giải quyết thay; hệ
thống không bắt buộc ([t/1776242](https://bbs.faloo.com/t/1776242.html),
[t/1776240](https://bbs.faloo.com/t/1776240.html), [t/1776033](https://bbs.faloo.com/t/1776033.html)).

## 5. Kinh điển truyện mạng Trung Quốc — cái gì giữ được hàng nghìn chương

### 5.1 Các bộ dài hơi tiêu biểu

| Tác phẩm | Nền tảng | Độ dài | Chữ/chương [Suy luận] |
|---|---|---|---:|
| 斗破苍穹 (天蚕土豆) | 起点 2009–11 | 533 vạn chữ, 1.620 ch | ~3.290 |
| 凡人修仙传 (忘语) | 起点 2008–13 | ~771 vạn | ~3.000 |
| 遮天 / 完美世界 (辰东) | 起点 | 636 vạn/1.865 ch · 658 vạn/~2.014 ch | ~3.300–3.400 |
| 吞噬星空 (我吃西红柿) | 起点 | ~478 vạn, 1.528 ch | ~3.130 |
| 诡秘之主 (爱潜水的乌贼) | 起点 2018–20 | 446 vạn, 1.418 ch, 8 quyển | ~3.150 |
| 全职高手 (蝴蝶蓝) | 起点 | 535 vạn, 1.728 ch | ~3.100 |
| 大奉打更人 (卖报小郎君) | 起点 | ~380 vạn | — |
| 十日终焉 · 我不是戏神 | 番茄 | 320 vạn · ~400 vạn | — |
| Top 总收藏 Faloo (末世：我有神级选择; 娱乐：从演反派开始; 大唐女帝…) | 飞卢 | 444–828 vạn, 2.715–4.712 ch | 1.410–1.760 |

Sửa giả định cũ: 《重生之最强剑神》 là của 天运老猫 trên **起点**; 《超神机械师》 cũng là 起点.

### 5.2 Cấu trúc chung của các bộ sống lâu

| Cơ chế | Bằng chứng | Ý nghĩa cho engine |
|---|---|---|
| **Một bộ sưu tập hữu hạn song song với thang cấp** | 斗破: săn 异火, mỗi ngọn lửa là một mục tiêu nhỏ; 诡秘: 22 con đường × 序列 9→0 | Kim thủ chỉ cần **nấc có tên**, không chỉ số to hơn |
| **Đổi bản đồ = đổi lớp đối thủ + loại phần thưởng** | 斗破: 乌坦城 → 加玛帝国 → … → 中州; 完美世界: 3 "phó bản" lớn | Chu kỳ/quyển phải đổi đấu trường, không đổi tên nơi chốn |
| **Mục tiêu có hạn chót** | 斗破 三年之约 | Lời hứa có ngày trả |
| **Tuyến bí ẩn dài tách khỏi tuyến lên cấp** | thân thế / chân tướng thế giới | Hook dài hạn không phụ thuộc cấp |
| **Nhịp quyển** | 诡秘: quyển 215/270/250/216/206/116/87/41 chương, mỗi quyển ~1 bậc 序列 + 1 thành phố | ~1 bậc sức mạnh / 100–250 chương; quyển co dần về cuối |
| **Tiểu cảnh giới trả lương giữa đại cảnh giới** | 凡人: 结婴 ~ch634, 元婴中期 ~ch1.100 | Đại cảnh giới xa, nhưng phải có nấc nhỏ đều đặn |

Kiểu chết cuối truyện đã được ghi nhận [S]: **战力崩坏** (吞噬, 大奉), **phục bút bị bỏ**
(遮天 — biệt danh "坑神"), **bản đồ cuối mơ hồ, 注水** (完美世界), **tác giả mệt: chương ngắn
dần, lỗi chữ tăng** (大奉). Đây đúng là bốn thứ Goal 4–5 của TruyenCity phải phòng.

Nhịp thực hành (kinh nghiệm tác giả, chưa có nền tảng xác nhận) [S]: tiểu cao trào ~1 vạn
chữ, trung ~3 vạn, đại ~6 vạn; "3–30–300": 3 chương một 爽点, 30 chương đổi bản đồ/thân phận,
300 chương hé lộ thế giới.

**Quy đổi cho TruyenCity** [Suy luận]: chương ta ~1.900 từ ≈ 2.000–2.500 chữ Hán. 1.000
chương ≈ 200–250 vạn chữ, tức 1/3–1/2 một bộ kinh điển 起点. Nhịp phải dồn tương ứng: 爽点
nhỏ mỗi 2–3 chương, đổi đấu trường mỗi 40–120 chương, đại cảnh giới mỗi 60–120 chương.

## 6. Đối chiếu: TruyenCity Serial vs Faloo

| Thước đo | Faloo (đo) | TruyenCity Serial (đo) |
|---|---|---|
| Kim thủ chỉ trả thưởng | ch1–ch3, có tên, có phẩm giai | Cửa mở ch1; 10 chương không có nấc, không có bảng |
| Kết chương | Hé lộ phần thưởng / mục tiêu mới / đối thủ ngạo mạn | Suy ngẫm êm: "như vậy đã là một bước đủ thật" |
| Panel 【】 | 0–31 mỗi chương ở truyện hệ thống | 0 trên 20 chương |
| Thực thể mới có tên ch1 | ~3–20 (thường 11–15) | ~3 |
| Lời hứa ở tiêu đề | Trả trong 1–3 chương | Chưa trả sau 10 chương |
| Đối thủ | Có, hạ trong một đến vài chiêu | Không có |
| Từ vựng thận trọng | — | Tăng dần theo chương (20 → 62) |
| Độ dài chương, độ ngắn đoạn | 2.000–4.800 chữ, đoạn 13–31 chữ | 1.000–2.800 từ, đoạn trung vị 45–108 ký tự — **tương đương** |

Hình thức đạt. Nội dung ngược.

## 7. Khuyến nghị — theo thứ tự

### 7.1 Dừng ngay (không tốn tiền)

1. **Không viết thêm chương nào dưới chính sách v3 hiện tại.** Hai job đang `paused`; giữ nguyên.
2. **Quyết định số phận 20 chương public** (cần bạn chọn — xem §8).

### 7.2 Sửa tại gốc — ba thay đổi, không thêm luật

**A. Khôi phục playbook Faloo làm chính sách mặc định cho mọi lane YY.**
`serialSystemPrompt()` (`src/services/serial/foundation.ts:55`) đang bỏ playbook khi gặp
Premise v3. Đổi thành: playbook là nền; phần hữu ích của Narrative Foundation (ba tầng tri
thức, ai biết gì, người chết không sống lại, năng lực có nguồn) chỉ đi vào **Judge
continuity**, không đi vào Writer/Planner dưới dạng lệnh cấm. **Xoá năm câu phủ định** đã trích
ở §3.1. Đây là xoá, không phải thêm.

**B. Số liệu thuộc về code, hiện cho độc giả qua 【】.** [Suy luận — đề xuất thiết kế]
Mọi lỗi làm vứt chương đều là con số do LLM tự bịa trong văn xuôi (giá, tồn kho, số viên,
cấp). Giải pháp không phải kiểm kế toán chặt hơn, mà **không để Writer tự viết con số**:
- Planner khai giao dịch/thăng cấp dưới dạng sự kiện có cấu trúc (người mua, món, giá, cấp mới).
- Code áp sự kiện lên state rồi **render bảng 【】** (hóa đơn, bảng thu mua, bảng thăng cấp,
  thông báo hệ thống) — đúng thứ độc giả Faloo muốn nhìn (969757: 11–15 panel/chương;
  1530098: tới 31).
- Writer viết cảnh *quanh* bảng: phản ứng, giành mua, vả mặt; được cấm tự nêu số ngoài bảng.
- Sau đó **xoá opening auditor 7 nhóm số học** và **asset ledger** (`asset_overspend`,
  `asset_lot_timeline`…): nguồn lỗi đã biến mất nên bộ kiểm cũng không cần.

Một thay đổi này vừa tăng 爽 (panel hiện ra), vừa tăng nhất quán (số do code giữ), vừa gỡ thiên
lệch sống sót ở §3.2.

**C. Đảo cổng.** Hiện tại: sai kế toán → vứt chương; điểm 爽 = 0 → vẫn xuất bản. Đổi thành:
- Lỗi continuity có trích dẫn → **sửa cục bộ** (patch ≤ 35% đã có sẵn), không bao giờ vứt cả
  chương vì một con số.
- Bốn chương mở đầu có **cổng 爽 cứng** trước khi người đọc duyệt, dựa trên số đo §4.4:
  kim thủ chỉ hiện muộn nhất cuối ch2; ch1–3 mỗi chương kết bằng hé lộ phần thưởng / mục tiêu
  mới / đối thủ; lời hứa ở tiêu đề được trả lần đầu trong ch1–3; ≥ 1 panel ở lane hệ thống.
- Sau chương 4, điểm 爽 thấp vẫn chỉ là steering (giữ nguyên nguyên tắc 19/09), nhưng **hai
  chu kỳ liền điểm trung bình < 3** thì buộc replan chu kỳ, không cho literary review
  `mayPublish` với lý do "phần thưởng vừa đủ thật".

### 7.3 Premise — nơi quyết định 80% [Suy luận]

- Kim thủ chỉ **bắt buộc 6–8 nấc có tên**, mỗi nấc đổi cách dùng (hiện Mạt Thế: `rungs: []`).
- Hook và `readerFantasy` phải là lời hứa, không phải lời trì hoãn ("trước khi bán công pháp,
  hắn phải hiểu…" là câu trì hoãn).
- Giới thiệu theo đúng thứ tự Faloo: tiền đề → kim thủ chỉ → 2–4 ví dụ nâng cấp cụ thể → câu khoe.
- Chọn lane theo dữ liệu §4.3 và quyết định #1 ngày 19/09: **全民领主/降临 hoặc 御兽** cho pilot
  kế tiếp, không phải Song Xuyên kinh doanh.
- Lộ trình dài hạn trong Premise: danh sách đấu trường (mỗi quyển 40–120 chương) đổi **lớp đối
  thủ + loại phần thưởng**, một bộ sưu tập hữu hạn song song thang cấp, một tuyến bí ẩn dài.

### 7.4 Phòng bốn kiểu chết cuối truyện (Goal 4–5)

Đưa vào Volume Review, mỗi thứ một câu hỏi có số liệu từ Bible — không thêm vào chương:
**战力崩坏** (đối thủ quyển trước có bị biến thành 蝼蚁 vô lý?), **phục bút bỏ quên**
(`openHooks` quá hạn), **bản đồ cuối mơ hồ** (quyển kế có đấu trường có tên chưa?),
**chương co ngắn / lặp** (độ dài trung vị và điểm lặp 10 chương gần nhất).

### 7.5 Quy trình — thứ đã giết bốn hệ thống

1. **Ngân sách luật**: đặt trần số mã từ chối (kế hoạch 19/09: ~10) và một test đếm nó. Muốn
   thêm luật phải xoá luật khác.
2. **Không sửa sau một thất bại.** Một thay đổi về khẩu vị chỉ vào sau A/B mù hai phiên bản mà
   bạn tự đọc; không vào vì Judge/reviewer chê một chương.
3. **Chi phí đo trên chương public**, không trên lượt chạy: hiện ~$0,82/chương so với mục tiêu
   ≤ $0,15. Sau B và C, số lượt vứt phải giảm mạnh; nếu không giảm, dừng lại xem vì sao trước
   khi chi tiếp.
4. **Người đọc là cổng cuối**, như 责编 Faloo: 4 chương vàng, đọc như độc giả, câu hỏi duy nhất
   là "có muốn bấm chương 5 không".

### 7.6 Không nên làm

- Không thêm validator/luật mới cho Serial trước khi làm A–C.
- Không bắt chước IP/đồng nhân dù chúng chiếm 75–97% bảng hiện tại (bản quyền; và §4.3 cho
  thấy truyện gốc mới thắng đường dài).
- Không chạy đua khối lượng: đó chính là tín hiệu nền tảng đang dùng để phạt truyện AI.
- Không đọc lượt xem hiện tại như tín hiệu chất lượng (app chưa quảng bá).

## 8. Quyết định cần bạn

1. **20 chương public của hai bộ Song Xuyên**: (a) ẩn cả hai bộ và viết lại từ Premise mới,
   (b) giữ public và viết tiếp theo chính sách mới từ chương 11, hay (c) giữ nguyên, bỏ hai bộ.
   Đề xuất: **(a)** — lời hứa ở tiêu đề đã bị phá trong 10 chương đầu, và chương đầu là thứ
   quyết định bookmark.
2. **Cho phép làm A + B + C** (thay đổi code, không tốn tiền, có test) trước lượt chạy trả phí
   tiếp theo.
3. **Lane cho pilot kế tiếp**: 全民领主/降临 hay 御兽 (đề xuất theo §4.3), 4 chương vàng,
   ước ~$0,5.

## 9. Nguồn

Faloo (đọc 23/09/2026, giải mã GB18030):
- Bảng xếp hạng `https://b.faloo.com/y_0_0_0_0_0_{1,9,15,17,66}_1.html`; `https://wap.faloo.com/r_0_0_0_0_0_9.html`
- Truyện gốc: [969757](https://b.faloo.com/969757.html), [1516702](https://b.faloo.com/1516702.html),
  [1530890](https://b.faloo.com/1530890.html), [1530098](https://b.faloo.com/1530098.html),
  [844627](https://b.faloo.com/844627.html), [1541877](https://b.faloo.com/1541877.html) và chương `{id}_{1..3}.html`
- Thông báo AI: <https://bbs.faloo.com/t/1777960.html>; phúc lợi 2025: <https://b.faloo.com/Author/2.html>;
  thông báo phạt hằng tháng: <https://bbs.faloo.com/t/1777870.html>; người viết thuê: <https://bbs.faloo.com/t/1777009.html>
- Biên tập: <https://bbs.faloo.com/t/1776242.html>, <https://bbs.faloo.com/t/1776240.html>,
  <https://bbs.faloo.com/t/1776033.html>, <https://bbs.faloo.com/t/1776238.html>, <https://bbs.faloo.com/doc/1777770/1.html>
- Ký hợp đồng/VIP: <https://b.faloo.com/help/vipqianyue.htm>, <https://b.faloo.com/Author/1.html>;
  giá: <https://pay.faloo.com/>; 完本: <https://bbs.faloo.com/t/1777182.html>

Kinh điển và xu hướng:
- 斗破 <https://zh.wikipedia.org/zh-hans/斗破苍穹> · 凡人 <https://zh.wikipedia.org/zh-hans/凡人修仙传> ·
  遮天 <https://book.qidian.com/info/1735921/> · 完美世界 <https://book.qidian.com/info/2952453/> ·
  诡秘 <https://www.qidian.com/book/1010868264/>, nhịp quyển <https://book.douban.com/review/14567318/> ·
  全职 <https://zh.wikipedia.org/zh-hans/全職高手> · 大奉 <https://booknews.sina.cn/zixun/2021-08-06/detail-ikqciyzk9887405.d.html>
- Phê bình 斗破 và 大奉: <http://www.chinawriter.com.cn/n1/2020/0113/c425784-31546527.html>,
  <https://www.chinawriter.com.cn/n1/2022/0824/c404027-32510641.html>
- 黄金三章 (阅文): <https://write.qq.com/portal/content/12871234803277101>
- Báo cáo 2025 (CASS): <https://www.cssn.cn/skgz/bwyc/202604/t20260420_5981165.shtml>; 蓝皮书 2025: <https://news.gmw.cn/2026-07/31/content_38918953.htm>
- AI: 番茄 <https://m.thepaper.cn/newsDetail_forward_31741852>; 阅文 <https://news.qq.com/rain/a/20260831A091GB00>;
  công ước chống xào bài <https://news.qq.com/rain/a/20250430A08SGB00>

Nội bộ: `serial_runs`, `serial_jobs`, `serial_cycles`, `chapters` (production, 23/09);
`factory/serial/song-xuyen/private/runs/cua-hang-cong-phap-v4-ch01-10/`;
`src/services/serial/foundation.ts`, `src/services/narrative/foundation.ts`,
`src/services/serial/prompts.ts`, `src/services/serial/state.ts`; `docs/REDESIGN_PLAN.md`,
`docs/FALOO_CRAFT.md`, `docs/NARRATIVE_FOUNDATION_*.md`, `docs/SERIAL_RETRY_LESSONS.md`.
