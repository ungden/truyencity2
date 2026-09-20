# Thiết kế lại hệ thống viết truyện — bản kế hoạch

Ngày: 2026-09-19. Trạng thái: **đề xuất, chưa làm gì**. Đọc xong và duyệt trước khi động vào code.

Mục tiêu sản phẩm không đổi: một app truyện mà máy tự viết truyện, độc giả Việt đọc trên web
và mobile, truyện dài 800–1.200 chương, chất lượng đều từ đầu đến cuối. Cái cần đổi là *cách*
đạt tới đó.

---

## 1. Chẩn đoán — tại sao sửa mãi không xong

Không phải do thiếu cố gắng. Từ ngày rewrite (2026-07-20) đến nay: **287 commit, 208 là `fix`**.
`planner.ts` bị sửa 97 lần, `validation.ts` 57 lần, `prompts.ts` 70 lần. Đây là hệ thống thứ ba
(sau `story-engine/` bị xoá 1.496 file, rồi factory v1, rồi factory + "Faloo correction" 14/08).
Cả ba lần cùng một kiểu chết. Số liệu production nói rõ nguyên nhân.

### 1.1 Máy tự dừng, và thứ nó viết ra lặp lại chính nó

| Số liệu (từ 20/07) | Giá trị |
|---|---|
| Chương đã xuất bản | 460 (5 bộ public, dài nhất 93 chương) |
| Job đang chạy hôm nay | **0** — toàn bộ queue là `cancelled` hoặc `*_blocked` từ 02/09 |
| `plan` hỏng | 46% số lần chạy |
| `window_review` chặn | 67% số lần chạy |

> **Lượt đọc không phải bằng chứng ở đây.** Bản đầu của tài liệu này mở bằng "460 chương, 3
> lượt đọc" và coi đó là kết luận quan trọng nhất. Sai: app chưa quảng bá lần nào, nên không
> có traffic là chuyện đương nhiên, không nói gì về chất lượng truyện. Chẩn đoán dưới đây
> đứng bằng **bằng chứng nội tại** — chính reviewer của hệ thống, cấu trúc kernel, và tỉ lệ
> hỏng của từng stage — và không cần tới số liệu độc giả.

Bộ dài nhất là *"Trùng Sinh 1988: Ta Từ Xưởng Máy Rách Xây Đội Tàu Vạn Tấn"* — tiêu đề kiểu
Faloo, nhưng đến
**chương 92 nhân vật chính vẫn đang cùng cha lựa sắt vụn ở bãi rã tàu**. Kernel của bộ này có
đúng **3 nhân vật** (Trần Sinh, Hai Thép, Ông Sáu) sau 93 chương, và 8 "resource" được theo dõi
bằng ledger, trong đó có *"Dầu hỏa tẩy rửa"* và *"Điểm uy tín thợ máy"*. Reviewer của chính hệ
thống chặn cửa sổ 86–90 với lý do: *"Chương 87 và 88 lặp lại y hệt một quy trình sửa chữa (vệ
sinh kim phun bằng dầu hỏa, đo khe hở xupap) và cùng một mức thù lao (50 đồng) giống hệt các
chương 79, 80, 84."* Bộ "Giao Kèo" bị chặn vì *"Trần Gia viết khế ước, Lê Thiết rạch tay ký,
khế ước phát sáng, đối thủ bất lực — lặp y hệt ở chương 66, 67, 68, 69, 70."*

Văn không tệ — câu chữ, chi tiết nghề, giọng thoại đọc ổn, thậm chí tốt. Nhưng nó là **văn học
quy trình**: mọi chương là một thao tác kỹ thuật được kể chậm, không có leo thang, không có đối
thủ có ý chí, không có cái để độc giả *chờ*. Đây là điều ngược lại của truyện YY.

**Đo đối chiếu với chương Faloo thật (19/09, xem [`FALOO_CRAFT.md`](FALOO_CRAFT.md)) cho một
kết quả bất ngờ:** *hình thức* văn xuôi của ta đã đạt chuẩn rồi. Chương ta 1.920 từ so với
Faloo 1.200–2.600 chữ Hán — tương đương. Đoạn văn trung vị của ta 81 ký tự (~1 câu), 38% đoạn
cực ngắn, 35% đoạn là thoại — Faloo lần lượt là ~1 câu, 16%, 17%: **ta còn vụn và nhiều thoại
hơn Faloo.** Vậy đừng đi sửa độ dài chương hay cách xuống dòng.

Khác biệt nằm nguyên ở **khối lượng biến cố trên cùng một lượng chữ**. Chương 1 Faloo: xuyên
việt → nhận ra thế giới → hệ thống trói → gặp một huyền thoại tương lai → ngày tận thế khởi
động; năm thực thể mới **có tên** được đặt ra. Chương 92 của ta: hai cha con lựa sắt vụn, người
cha tự nhận ra một vết nứt; **không thực thể mới nào có tên, không hook kết chương**. Đó là
toàn bộ khoảng cách, và nó nằm ở Premise + khâu lập kế hoạch, không nằm ở prompt văn phong.

### 1.2 Kiến trúc hiện tại buộc phải ra truyện như thế

Vòng lặp lõi hiện nay: **Planner** sinh ra một "kế hoạch cơ học" (scene → `requiredDeltas` →
`mechanicUses` → số phút → đồ thị di chuyển) → **validator** 108 luật cứng kiểm tra số học
tài nguyên, đường đi, tri thức, quyền hạn → **Writer** phải "diễn" đúng các delta đó, không được
tự tạo thay đổi nào → **Editor** kiểm lại delta bằng trích dẫn nguyên văn.

Hệ này tối ưu cho *tính kiểm chứng được của sổ cái*, không phải cho *kỳ vọng của độc giả*. Hệ quả
tất yếu:

- Thế giới chỉ có thể lớn bằng thứ ledger theo dõi được: 3 nhân vật, 8 tài nguyên, 4 luật thế
  giới. Thêm nhân vật, phe phái, cấp bậc là thêm entity phải khai báo, nối vào travel graph,
  cấp mechanic acquisition path — nên Planner tránh, và validator chặn khi nó cố.
- Mọi "chiến thắng" phải là một delta số học hợp lệ → nhân vật chính thắng bằng cách... đo khe
  hở xupap và nhận 50 đồng. Không có cách nào biểu diễn "cả bến ghe im lặng nhìn nó" trong
  `numericResourceDelta`.
- Sửa lỗi = thêm luật. Chính `docs/STORY_FACTORY.md` đã thừa nhận: *"the fix for a false
  positive of that kind is another regex, and that loop does not terminate."* Rồi 30 commit
  sau vẫn thêm regex ("block repeated harvest sale storage beats", "block repeated quality
  restraint beats").
- Bản "Faloo correction" 14/08 chẩn đúng bệnh (*"chapters over-index on process", "repetitive
  catch–sell–repay loop"*) nhưng chữa bằng cách bắt vít thêm `marketBlueprint`, "payoff
  checkpoints", "opening payoff proofs" **lên trên** cùng cái máy ledger. Máy vẫn là máy mô
  phỏng kinh tế; thêm luật "phải sướng" không làm nó viết ra truyện sướng.

### 1.3 Máy tự làm nghẽn mình

| Stage | Pass | Fail | Tỉ lệ fail |
|---|---:|---:|---:|
| `plan` | 291 | 81 plan_blocked + 115 stale_lease + 55 infra | **46%** |
| `window_review` | 50 | 47 quality_blocked + 56 infra | **67%** |
| `chapter` | 460 | 43 + 26 + 12 | 15% |

Planner là bottleneck: đắt hơn Writer ($0.117 vs $0.030 mỗi call), chậm ngang chương (145s), và
gần nửa số lần chạy thất bại. Chi phí *đơn vị* thực ra ổn (~$0.20/chương ở trạng thái lý
tưởng); chi phí *thực tế* là **~$1/chương** vì phần lớn tiền đốt vào plan hỏng, review chặn,
smoke, benchmark, rồi job đứng chờ người.

Một phần lớn độ phức tạp của state machine (lease, checkpoint từng nửa stage, "một retry
duy nhất", stale_lease 115 lần) tồn tại chỉ để nhét mọi thứ vào trần **300 giây** của
Vercel. Trần đó đã lỗi thời: Vercel Fluid compute cho **800s GA trên Pro, 1.800s beta**.

### 1.4 Kết luận chẩn đoán

> Hệ thống được thiết kế để *chứng minh* truyện không mâu thuẫn, không phải để *làm* độc giả
> muốn đọc chương tiếp theo. Mọi bản fix đều làm nó chứng minh giỏi hơn và viết dở hơn.

Bằng chứng mạnh nhất không đến từ độc giả mà đến từ chính cái máy: **reviewer của nó tự chặn
67% số cửa sổ vì lặp**, và nó tự khoá toàn bộ hàng đợi. Một hệ thống nói với ta rằng nó đang
viết lặp thì không cần thêm ý kiến nào từ bên ngoài.

Không có bản vá nào trên kiến trúc này đổi được kết quả. Phải đổi cái được tối ưu.

---

## 2. Nghiên cứu bên ngoài — người ta làm thế nào

### 2.1 Faloo (飞卢) và văn phạm 爽文

Faloo là nền tảng của "飞卢风": độc giả nam trẻ, đọc để sướng, ghét dài dòng. Những quy tắc
đã được tác giả và biên tập ở đó tổng kết (nguồn ở cuối):

- **期待感 (cảm giác chờ đợi) là động cơ.** Tác giả tìm ra *cái độc giả đang mong* rồi viết
  hướng về nó; khi đã có kỳ vọng, gần như mọi diễn biến đều thành 爽点. Không có kỳ vọng thì
  không có gì "sướng" được.
- **爽点 = dồn nén → giải phóng.** Cấu trúc chuẩn: *小不爽 → 小爽 → 小不爽 → 小爽 … → 大不爽 →
  大爽*. Nén nhỏ cho sướng nhỏ, nén lớn cho sướng lớn. Thiết kế **đại cao trào trước**, rồi mới
  lấp các chu kỳ nhỏ vào giữa.
- **Mật độ:** một tiểu cao trào mỗi ~10.000 chữ (≈ 3–5 chương). Faloo còn đòi "章章高潮" —
  mỗi chương một cú payoff nhìn thấy được, nhưng cảnh báo: khung truyện không đủ lớn mà đuổi
  theo cao trào liên tục thì *"很快会写崩"* (sập rất nhanh).
- **金手指 (kim thủ chỉ) kích hoạt ở chương 1–2**, có kết quả nhìn thấy ngay. Chương 1 phải
  có áp lực và hành động, không có nền giới thiệu.
- **装逼打脸 (khoe rồi vả mặt)** là đơn vị cơ bản, nhưng phải *đổi kiểu* qua từng chương —
  lặp đúng một kịch bản là chết. 15 loại 爽点 để xoay vòng: vả mặt, nghịch tập, nghiền ép, ẩn
  mạnh lộ mạnh, phá vây, trí thắng, kho báu hiện thế, được công nhận, cứu nguy, kỳ ngộ, đột
  phá cảnh giới, kẻ mạnh trở lại, tuyệt địa phản kích, tình trường, lực vãn cuồng lan.
- **Đối thủ leo thang theo giai cấp**, không phải cùng một kẻ đổi chiêu. *"Setup + Conflict =
  Payoff"*; *"冲突不要拖"* — không kéo dài một cuộc đối đầu khi kỳ vọng của độc giả đòi giải
  quyết dứt khoát.
- **Kỹ thuật lưu (技术流) chỉ là gia vị**: kiến thức nghề có giá trị khi tạo lợi thế cạnh
  tranh hoặc quyết định, không phải bản thân câu chuyện. (Đây chính xác là chỗ hệ hiện tại
  làm ngược.)
- **Tiêu đề nói thẳng fantasy**, dạng `ĐẤU TRƯỜNG: NHÂN VẬT + LỢI THẾ + PAYOFF`; mô tả đi từ
  áp lực → lợi thế → thắng đầu → leo thang. Chương 2.000–3.000 chữ, cập nhật nhiều chương mỗi
  ngày.
- Chu kỳ 5 chương đầu định hình nhịp và loại 爽点, rồi **lặp lại có tiến hoá** suốt bộ.

**Kiểm chứng trực tiếp trên b.faloo.com (19/09/2026, trang gốc decode GBK).** Số đo chi tiết
và spec viết chương nằm riêng ở [`FALOO_CRAFT.md`](FALOO_CRAFT.md):

- Trang chủ và bảng xếp hạng hôm nay bị **đồng nhân (同人)** thống trị: `名义：…`, `综漫：…`,
  `崩铁：…`, `四合院：…`, `综武：…`, `港综：…`, `盗墓：…`. Faloo bán *IP quen + kim thủ chỉ +
  vả mặt*. TruyenCity không thể dùng IP (bản quyền) — ta lấy **văn phạm**, không lấy IP; đấu
  trường phải là lane nguyên tác mà độc giả Việt đã quen qua convert.
- **Công thức tiêu đề** nhất quán: `ĐẤU TRƯỜNG：[开局/人在/从…开始] + LỢI THẾ + PAYOFF`.
  Ví dụ đọc được hôm nay: *综武：开局大内高手，吊打叶孤城* · *重生财阀家小儿子，开局投资大嫂* ·
  *御兽：我的宠兽来自未来* · *废墟求生：我能让万物无限进化* · *四合院：开局躺平，傻柱替我代练*.
  Tiếng Việt convert đã có sẵn từ vựng này: *Khai cục*, *Bắt đầu từ…*, *Ta ở…*, *Mở đầu…*.
- **Tên chương là câu thoại/câu cảm**, không phải danh từ: *第1章：真给我穿到苍城毁灭日了？？*,
  *第4章：是个剑修都爱装，天打雷劈也嚣张！*, *第8093章 装什么装*. Tên chương của ta hiện nay
  (*"Vạch Kim Và Mối Ghép"*, *"Sức Kéo Trên Mạn Ghe"*) là ngược hoàn toàn.
- **Độ dài chương thật**: các bộ đầu bảng đang cập nhật "hôm nay" có 820万字/8.632 chương,
  981万/8.093, 1.401万/11.548, 1.489万/10.513, 1.195万/9.347 → **≈ 950–1.400 chữ Hán/chương,
  8.000–11.500 chương/bộ**, vẫn ra hằng ngày. Quy tắc chính thức: chương < 1.000 chữ không
  được tính tiền/全勤; đẩy mạnh sách mới cần **日更 ≥ 4.000 chữ**, ≥ 8,5 vạn chữ, ≥ 1 vạn
  lượt sưu tầm VIP. Tức Faloo là **nhiều chương ngắn mỗi ngày, mỗi chương một cú**.
- **Công thức xếp hạng sách mới** (chính thức): `周点击/30 + 周鲜花×3 + 总收藏×15 + 总打赏/3`.
  Sưu tầm (follow) nặng nhất. → KPI của ta nên là *follow/bookmark* và *đọc tiếp chương sau*,
  không phải lượt xem.
- **Biên tập Faloo khuyến nghị đề tài** (bài "新手教程" của ban biên tập): huyền huyễn =
  *phế tài quật khởi, cường giả trở về trang bức, khai cục vô địch nghiền ép*; kỳ huyễn =
  *dưỡng thành, xây thành, toàn năng*; đô thị = *sáng tạo, nhịp nhanh*; lịch sử = *thịnh
  Đường, bá đạo Tần, cương mãnh Minh, Tống*; võng du = *sáng tạo + thi đấu (PUBG, LoL)*.
- **Văn phạm simple một bộ đang ký độc quyền** (*崩铁：万界词条，开局帝弓天将*): xuyên việt →
  "khai cục địa ngục" → hệ thống giáng lâm → rút lần đầu ra vàng → chém X đánh Y cứu thành →
  lên ghế tướng quân → dân gọi biệt danh vui → dàn nữ → câu chốt gây war. Đúng thứ tự
  *áp lực → kim thủ chỉ → payoff đầu → nhảy địa vị → hook*. Không có một dòng bối cảnh.

Với thị trường Việt: độc giả truyện chữ Việt đọc chủ yếu convert Trung — Hệ thống, Vô địch
lưu, Trọng sinh, Xuyên việt, Huyền huyễn, Đô thị. Truyện hệ thống đô thị là subgenre mạnh
nhất của tác giả Việt. TruyenCity viết *nguyên tác tiếng Việt theo văn phạm đó* — đó là lợi
thế duy nhất so với convert: văn mượt, tên Việt, bối cảnh Việt khi phù hợp, ra đều mỗi ngày.

### 2.2 Người viết bằng AI dài hơi thực tế đang làm gì

**fanqie-novel-skill** (skill cho Trae, viết xong một bộ **1 triệu chữ** trên Phiên Cà, ký
được hợp đồng; 500k chữ đầu tốt, sau đó xuống). Cách làm rất đáng học:

| File "Truth" | Nội dung | Cập nhật |
|---|---|---|
| `story_bible.md` | thế giới, thiết lập, hệ thống sức mạnh | khi có thiết lập mới |
| `current_state.md` | **quan trọng nhất** — ai đang ở đâu, có gì, biết gì | sau mỗi chương |
| `pending_hooks.md` | phục bút: mở / đang tiến / đã đóng | sau mỗi chương |
| `character_matrix.md` | quan hệ và ranh giới thông tin (ai biết gì) | sau mỗi chương |
| `outline.md` | đại cương 4 quyển, mục tiêu từng chương | mỗi quyển |
| `style_guide.md` | quy ước văn phong, luật "khử mùi AI" | liên tục |

Quy trình mỗi chương: *write-next → draft → ai-detox → audit (27 chiều, do LLM chấm) → revise
→ extract-state → state-update*. Điểm mấu chốt: **trạng thái là văn bản có cấu trúc, không
phải số học**; audit là LLM đọc với checklist, không phải regex; "khử mùi AI" là bước riêng
(排比三连, 空洞抒情, 万能过渡, 万能形容词, 情感标签). Bài học phụ: chất lượng giảm sau 500k
chữ → cần **nén và reset ở ranh giới quyển**.

**Novelcrafter / Sudowrite**: Codex/Story Bible — chỉ nhét vào prompt những entry *liên quan
tới cảnh đang viết*. Tất cả đều có người trong vòng lặp; không tool nào tự chạy 1.000 chương.

**Nền tảng Trung (番茄) chính thức**: AI chỉ là trợ lý (gợi ý, tục viết, sửa, đặt tên). Không
có "máy tự viết" nào được nền tảng chứng thực. Vị trí của TruyenCity là chỗ trống thật.

### 2.3 Nghiên cứu học thuật 2025–2026

- **StoryWriter** (2506.16445): outline agent → planning agent → writing agent; writing agent
  *nén lịch sử theo sự kiện hiện tại* thay vì mang cả truyện.
- **DOME** (2412.13575): **dàn ý phân cấp động** (không viết sẵn cả bộ) + module nhớ.
- **ConWriter** (2608.05169): sinh theo *cảnh*, mỗi cảnh phải thoả một *chuyển trạng thái* được
  khai báo; kiểm tra bằng **neuro-symbolic nhẹ**: ký hiệu cho fact/thời gian/nhân vật, LLM cho
  phần còn lại; **sửa cục bộ**, ưu tiên kiểm chỗ mô hình bất định. Đây là phiên bản "đúng liều"
  của cái validator 108 luật đang làm quá liều.
- **Lost in Stories** (2603.05890): lỗi nhất quán tập trung ở **sự kiện thực tế và thời gian**,
  hay xuất hiện ở *giữa* truyện, ở đoạn entropy cao. → kiểm tra cứng nên nhắm đúng hai chiều
  này, không phải sổ cái tài nguyên.
- **So sánh đa framework** (2608.26177): không framework nào thắng tuyệt đối; hiệu quả phụ
  thuộc khớp giữa cấu trúc sinh và độ dài mục tiêu. → đừng chép nguyên một paper, ghép đúng
  phần.

### 2.4 Rút ra

1. Trạng thái truyện = **văn bản có cấu trúc + một lõi ký hiệu rất nhỏ** (sống/chết, cảnh
   giới, vị trí, ngày tháng, vật phẩm then chốt). Không mô phỏng kinh tế.
2. Kế hoạch = **kỳ vọng và payoff**, phân cấp, động: Bộ → Quyển → Chu kỳ → Chương.
3. Kiểm tra = **LLM đọc như độc giả với checklist + trích dẫn**, cộng ~10 luật cứng cho hai
   chiều fact/time. Không 108 luật.
4. Nhịp = **văn phạm Faloo**: 金手指 ở chương 1, 爽点 xoay vòng, đối thủ leo giai cấp, chu kỳ
   nén–bung 5–15 chương, tiểu cao trào ~3–5 chương, đại cao trào mỗi quyển.
5. Không bao giờ để một bộ đứng chờ người. Failure phải có đường tự phục hồi.

---

## 3. Kiến trúc mới

### 3.1 Nguyên tắc

| # | Nguyên tắc | Thay cho |
|---|---|---|
| 1 | **Fantasy của độc giả là spec.** Mọi artifact trả lời: độc giả đang chờ gì, bao giờ được. | "Causal validity là spec" |
| 2 | **State là Bible văn bản**, lõi ký hiệu ≤ 10 trường. | Ledger 981 event, 8 resource |
| 3 | **Lập kế hoạch kỳ vọng**, không lập kế hoạch delta. | `requiredDeltas`, `mechanicUses` |
| 4 | **Judge đọc như độc giả**, chặn chỉ khi mâu thuẫn fact/time có trích dẫn. | 108 luật cứng + Editor delta |
| 5 | **Cast và thế giới phải lớn dần** theo quyển — code ép, không cấm. | Cast 3 người sau 93 chương |
| 6 | **Không park.** Retry → re-plan chu kỳ → hạ cấp có kiểm soát. Chỉ dừng khi outage toàn cục. | 4 loại `*_blocked` chờ operator |
| 7 | **Một chương = một lần gọi hàm** (Fluid 800s). Không lease nửa stage. | 300s, 1 stage/tick, checkpoint |
| 8 | **Chi phí ≤ $0.15/chương thực tế**, đo bằng tổng chi / chương public. | ~$1 |

### 3.2 Artifact

Tất cả là JSON có trường prose, kích thước nhỏ, đọc được bằng mắt.

**`Premise`** — bất biến sau khi duyệt.
- `title`, `hook` (1 câu), `lane` (hệ thống đô thị / vô địch lưu / trọng sinh thương chiến /
  toàn dân lãnh chúa / …), `readerFantasy` (độc giả muốn *cảm thấy* gì).
- `goldenFinger`: tên, luật hoạt động như độc giả sẽ thấy, **đường tiến hoá** 6–8 nấc (mỗi nấc
  đổi *cách dùng*, không chỉ số to hơn), giới hạn/giá phải trả.
- `worldKernel`: canon hoàn chỉnh bất biến gồm hai thế giới, địa điểm/phe phái,
  `progressionSystems`, `gradeSystems`, `equivalences`, `economyLoops`, `launchProducts`
  và hợp đồng bốn chương mở đầu. Cảnh giới, nghề, cửa hàng và công ty là các trục riêng.
- `endingDirection`, `voiceSheet` (giọng, POV, cấm kỵ, từ vựng riêng, **quy tắc tên chương:
  một câu thoại/câu cảm có cú**), `taboos`.
- `castSeed`: 6–10 nhân vật khởi đầu **có agenda riêng**, địa điểm đầu, các trạng thái tiến
  triển đầu và 3–5 mốc đi lên có tên; trong đó ≥ 2 đối thủ ở hai giai cấp.

**`Bible`** — sống, 3–6k token, là thứ *mọi* prompt đều nhận.
- `symbolicCore` (code sở hữu, kiểm cứng): `storyDay`, `mc: {characterId, locationId,
  keyAssetIds[], goldenFingerRungId}`, `cast[]`, `progressions[]: {subjectId, systemId,
  trackId?, rankId, minorStageId?}`, `openHooks[]`.
- `castSheet`: mỗi nhân vật 3–5 dòng — vai trò, muốn gì, bí mật, quan hệ với MC, đã biết gì
  về kim thủ chỉ (**ranh giới thông tin**).
- `world`: chỉ các phe phái, địa điểm và luật *đã xuất hiện*; canon đầy đủ ở `worldKernel`.
- `recentSummary`: 10 chương gần nhất, mỗi chương 1–2 dòng + loại 爽点 đã dùng + kết chương.
- `volumeSummaries`: mỗi quyển đã qua một đoạn 150–300 chữ.
- `styleMemory`: khuôn câu/motif đã dùng nhiều (từ telemetry tiếng Việt hiện có), để tránh.

**`VolumePlan`** (quyển, 100–200 chương, động — viết lại ở mỗi ranh giới quyển).
- Giai cấp đối thủ, đấu trường, trạng thái vào → ra theo từng progression system, 4–8 chu kỳ với
  loại 爽点 chủ đạo, các hook phải trả trong quyển, 2–3 nhân vật mới bắt buộc xuất hiện, nấc
  kim thủ chỉ sẽ mở.

**`CyclePlan`** (chu kỳ 5–15 chương = một 副本).
- `pressure` (cái không sướng), `escalation[]` (3–6 bước), `climax` (loại 爽点, kết quả nhìn
  thấy được, ai chứng kiến), `aftermath` + `nextHook`.
- `beatSheets[]` cho **3 chương tới** (rolling): mỗi chương 2–4 beat, mục tiêu cảm xúc, kết
  chương phải mở gì. Không delta, không phút, không đồ thị.

**`ChapterDigest`** — trích từ chương *đã viết*, bởi model rẻ.
- 1–2 dòng tóm tắt, loại 爽点 đã đạt, kết chương mở gì, thay đổi `symbolicCore` (cast mới,
  ai chết, ai lên cấp, vật phẩm then chốt, hook mở/đóng, ngày tháng), thay đổi `castSheet`.

### 3.3 Vòng lặp mỗi chương (một invocation, mục tiêu ≤ 300s, trần 800s)

```
1. load   Premise + Bible + CyclePlan(beat của chương này) + 800 chữ cuối chương trước
2. write  Writer  → 2.000–3.000 chữ                                  (Terra hoặc model bakeoff)
3. judge  Reader-Judge (1 call) →
            a. continuity: mâu thuẫn fact/time/ai-biết-gì, có trích dẫn  → hard
            b. scorecard 爽: có kỳ vọng? có nén? payoff đúng loại? kết chương mở?  → 0–5 mỗi ô
            c. repetition: so với recentSummary + styleMemory                  → soft
            d. AI-flavor: 5 nhóm khử mùi                                      → soft
4. fix    chỉ khi có hard finding: 1 lần sửa có đích, rồi judge lại continuity (không chấm lại 爽)
5. digest Extractor (flash) → ChapterDigest
6. merge  code: symbolicCore (deterministic) + castSheet/recentSummary (LLM merge, flash)
          luật cứng: chết không sống lại; mỗi progression chỉ dùng ID canon và tiến tuần tự;
          storyDate đơn điệu; hook id tồn tại; cast mới phải có sheet.
7. commit chương ở trạng thái draft trong cửa sổ chu kỳ; lưu scorecard + digest
```

Cuối chu kỳ (5–15 chương): **Cycle Review** (pro, 1 call): payoff có "cash" không, lặp với
chu kỳ trước, hook nào bị bỏ quên → **publish cả chu kỳ** (giữ RPC atomic hiện có, đổi window =
cycle) → **plan chu kỳ kế** với ràng buộc code: loại 爽点 không trùng chu kỳ liền trước; mỗi
2 chu kỳ phải có nhân vật mới hoặc đấu trường mới; đối thủ hiện tại phải *bị loại hoặc đổi
giai cấp* trước khi quyển kết thúc.

Cuối quyển: **Volume Review** + `VolumePlan` mới + **nén Bible** (archive nhân vật ngủ, gộp
recentSummary vào volumeSummaries, reset styleMemory). Đây là cơ chế chống "xuống sau 500k
chữ".

Lỗi 爽 (scorecard thấp) **không bao giờ chặn** — nó chảy vào CyclePlan kế tiếp như chỉ đạo.
Chỉ mâu thuẫn fact/time có trích dẫn mới chặn, và chặn chỉ dẫn tới sửa, không tới park.

### 3.4 Chính sách thất bại

| Sự cố | Hành động tự động |
|---|---|
| Model lỗi/timeout | retry cùng route, backoff 1–3–9 phút, tối đa 5 |
| Judge trả hard finding sau sửa | viết lại chương từ đầu 1 lần với finding; nếu vẫn hỏng → **re-plan beat của chương** rồi viết lại |
| 3 chương liên tiếp phải viết lại | re-plan cả CyclePlan từ chương đã commit gần nhất |
| Cycle Review chê | không xoá draft; sửa CyclePlan còn lại, publish với cảnh báo; chỉ giữ private khi có mâu thuẫn fact |
| Credential/quota toàn cục | pause toàn fleet + alert; không phải lỗi của job |

Không còn `plan_blocked` / `quality_blocked` như trạng thái đợi người. Operator có dashboard
scorecard, không có queue việc phải "revive".

### 3.5 Model và chi phí (ước tính, phải đo lại ở Giai đoạn 1)

| Call | Model | Tần suất | $/chương |
|---|---|---|---:|
| Writer | gpt-5.6-terra (giữ, đã thắng bakeoff) — bakeoff lại gemini-3.7-flash | 1/chương | 0,030 |
| Reader-Judge | gemini-3.1-pro, output ngắn (~2k) | 1/chương (+0,3 sửa) | 0,045 |
| Extractor + merge | gemini-3.5-flash | 1/chương | 0,006 |
| Cycle plan + review | gemini-3.1-pro | 2 / 10 chương | 0,040 |
| Volume plan/review/nén | gemini-3.1-pro | 3 / 150 chương | 0,004 |
| **Tổng** | | | **≈ 0,125** |

So với hiện tại: Planner ($0,117, 1–3 chương) và window review ($0,228/5 chương) biến mất,
thay bằng cycle plan rẻ hơn vì đầu ra là văn bản ngắn, không phải JSON delta 6k token. Chi phí
thực tế xuống dưới $0,15 chủ yếu nhờ **không còn 46% plan hỏng**.

### 3.6 Runtime

- Bật **Fluid compute**, `maxDuration = 800`. Một cron tick = một chương trọn vẹn cho một job
  (hoặc nhiều job nếu còn ngân sách). Bỏ checkpoint giữa stage, bỏ `stale_lease`.
- Queue vẫn là Postgres `SKIP LOCKED` (giữ). Lease = một chương (15 phút).
- Cadence: **3 chương/ngày/bộ** mặc định (tham số), cron mỗi 10 phút. 5 bộ → 15 chương/ngày
  ≈ $2/ngày.
- Xuất bản theo chu kỳ (private draft → public cả chu kỳ) — giữ và generalize
  `story_factory_windows` → `story_cycles`.
- Nếu Vercel Fluid gây bất tiện, phương án B là một worker Node nhỏ (Fly/Railway) đọc cùng
  queue. Thiết kế không phụ thuộc vào cron 2 phút nữa.

### 3.7 Concept Lab rút gọn

9 call → **3 call**: hai generator độc lập sinh gói `Premise` + `worldKernel` theo văn phạm
Faloo cho lane được chọn, một judge chọn và sửa. Thêm **một bước người duyệt** toàn gói trước
khi chi model cho chương; bốn chương mở đầu có cổng duyệt riêng. Giữ
`FALOO_MARKET_PROFILE.md` làm văn phạm sản phẩm.

### 3.8 Xoá gì, giữ gì

**Xoá** (không refactor — viết lại từ đầu, giữ tối đa ~15% code):
`validation.ts` (causal engine, mechanics compiler, travel graph, conversion rates, 108 luật),
`requiredDeltas`/`mechanicUses`/`StateDelta` trong contracts, `story_state_events` như nguồn
sự thật, Plan Judge, `benchmark*` chain 4 bước, `portfolio` signature, promotion canary, hai
identity release/revision (một version string là đủ), phần lớn `planner.ts` (3.318 dòng).

**Giữ**: queue + lease RPC pattern, RPC publish atomic (đổi window→cycle), operator alert
outbox, `provider.ts` dispatch (rút gọn), cover pipeline, telemetry style tiếng Việt (làm
input cho Judge), `FALOO_MARKET_PROFILE.md`, reader app/mobile nguyên vẹn, secret scan, CI.

**5 bộ cũ**: giữ public như hiện tại (không xoá chương độc giả đã thấy), dừng job. Sau khi hệ
mới ổn, có thể viết cho mỗi bộ một "quyển kết" 20–30 chương để đóng lại tử tế, hoặc ẩn.

---

## 4. Lộ trình

| Giai đoạn | Thời gian | Làm gì | Bằng chứng để đi tiếp |
|---|---|---|---|
| **0. Quyết định** | ✅ xong 19/09 | Chốt hướng: học theo Faloo. 8 quyết định ở mục 5. Factory đã dừng sẵn. | Xong. |
| **1a. Lõi offline (miễn phí)** | ✅ xong 19/09 | Schema `Premise`/`Bible`/`CyclePlan`/`Digest`; prompt Writer/Judge/Extractor dựng thẳng từ [`FALOO_CRAFT.md`](FALOO_CRAFT.md); merge + 10 luật cứng; script runner local. | 302 test xanh (37 test cho `serial/`), typecheck + build + secret scan sạch, dry-run chạy được. |
| **1b. Chạy thử (~$8–12)** | 1–2 ngày | Bakeoff writer 3 model; sinh **4 chương vàng + 11 chương** cho 1 premise. | Bạn đọc 4 chương vàng: có kim thủ chỉ ch1, payoff có tên ch2, hook mọi chương. Scorecard ≥ 3,5/5. Cost ≤ $0,15/ch. |
| **2. Kế hoạch động** | 5–7 ngày | Cycle/Volume planner + review + nén Bible; chạy **2 premise × 40 chương** offline; đo lặp (repetition), hook bị quên, cast growth. | Cast ≥ 12 sau 40 chương; không loại 爽点 nào lặp 2 chu kỳ liền; 0 mâu thuẫn fact do người đọc bắt được. |
| **3. Runtime** | ✅ hạ tầng xong 19/09 | 4 bảng + 5 RPC đã apply lên production, cron `/api/cron/serial`, `/admin/serial`, operator CLI, chính sách thất bại. Xem [`SERIAL_ENGINE.md`](SERIAL_ENGINE.md). Còn lại: chạy **2 bộ ẩn tới 100 chương** sau khi 1b đạt. | 0 job park trong 14 ngày; ≥ 3 chương/ngày/bộ đều đặn; cost thực tế ≤ $0,15. |
| **4. Ra mắt** | tuần 4 | 5 lane ở mục 5, 3 chương/ngày, cover mới, mô tả bán hàng theo Faloo; ẩn 5 bộ cũ. | Bookmark và tỉ lệ đọc tiếp ch1→ch10. Chỉ có nghĩa sau khi quảng bá — việc riêng, ngoài plan này. |
| **5. Đường dài** | liên tục | Mỗi bộ chạy tới 300 chương → đo quality drift bằng blind A/B chương 8 vs chương 250 (tool `literary-ab` giữ được). | Chương 250 không thua chương 8 trong blind test. |

Thứ tự này cố ý để **giai đoạn 1 và 2 không đụng runtime, DB hay Vercel** — chỉ là script và
prompt. Nếu 15 chương đầu không đọc sướng hơn bộ cũ, dừng ở đó, mất một tuần, không mất gì
khác. Giai đoạn 1a không tốn tiền nên bắt đầu ngay; 1b dừng lại hỏi trước khi tiêu.

---

## 5. Quyết định đã chốt

Chỉ đạo: **"cứ học theo b.faloo.com"**. Mọi câu hỏi mở được quyết theo đúng cách Faloo làm;
chỗ nào Faloo không trả lời thì ghi rõ là suy luận của tôi.

| # | Quyết định | Căn cứ |
|---|---|---|
| 1 | **5 lane ra mắt**: ① hệ thống đô thị ② huyền huyễn vô địch lưu (khai cục vô địch / phế tài quật khởi) ③ toàn dân lãnh chúa – xây thành – dưỡng thành ④ trọng sinh biết trước (đô thị/thương chiến) ⑤ thức tỉnh toàn dân – chuyển chức. **Bỏ hẳn lane "198x nghề biển/cơ khí"** đang có. | Ban biên tập Faloo khuyến nghị đúng các hướng này cho sách nguyên tác. Lane cũ chính là bẫy văn-học-quy-trình. |
| 2 | **Không đổi độ dài chương**: giữ 1.800–2.400 từ. Không băm đoạn thêm. | Đo trực tiếp: ta đã nằm trong dải Faloo và đoạn còn ngắn hơn họ. Câu hỏi cũ dựa trên giả định sai. |
| 3 | **3 chương/ngày/bộ** (mỗi bộ ≈ 6.000 từ/ngày). | Chỉ tiêu 强推 chính thức: 日更 ≥ 4.000 chữ ≈ 3 chương. |
| 4 | **Có cổng duyệt người**: bạn đọc Premise 1 trang **+ 4 chương vàng** rồi mới cho bộ chạy tiếp. | Faloo bắt nộp ≥ 4 chương và 责编 chấm kim thủ chỉ + mở đầu trước khi vào thư viện. |
| 5 | **5 bộ cũ: ẩn** (`hidden = true`), không xoá. Không viết quyển kết. | Faloo gọi là 切书. 3 lượt đọc tổng cộng, không có gì để cứu; nhưng 2 người đã đọc nên không xoá dữ liệu. |
| 6 | **Bakeoff lại Writer** ở Giai đoạn 1 (Terra vs Gemini 3.7 Flash vs 3.1 Pro, ~$5). | Suy luận của tôi: prose mục tiêu đổi sang giọng thông tục + độc thoại + bảng 【】; kết quả bakeoff cũ (văn tả nghề) không còn đại diện. |
| 7 | **Lane có hệ thống thì bảng số hiện cho độc giả** trong 【】; lane không hệ thống vẫn giấu ledger như cũ. | `FALOO_CRAFT.md` §3.4 — với truyện hệ thống, bảng thưởng *chính là* phần thưởng của độc giả. |
| 8 | **KPI là bookmark + tỉ lệ đọc tiếp ch1→ch10**, không phải lượt xem. Chỉ đo được sau khi có traffic; trước đó cổng chất lượng duy nhất là người đọc thử. | Công thức bảng sách mới của Faloo: 总收藏×15 so với 周点击/30. |

Hai ràng buộc không được quên:

- **Không chép IP.** Bảng xếp hạng Faloo sống bằng đồng nhân (`名义：`, `综漫：`, `四合院：`).
  Ta lấy *văn phạm*, không lấy IP. "Cái quen thuộc" phải đến từ quy ước thể loại mà độc giả
  convert Việt đã thuộc.
- **Không nhắc AI ở bất cứ đâu độc giả thấy** (`CLAUDE.md`).

### Việc còn lại cần bạn gật một tiếng

World Kernel v2, Bible đa trục và hai package production đã hoàn tất trong source. Toàn bộ
vòng lặp chương chạy được với provider giả trong test, nên chính sách thất bại đã được kiểm
chứng mà không tốn đồng nào.

Còn lại là **1b: sau khi duyệt package, chạy thật** — sinh bốn chương vàng và dừng ở cổng
đọc trước khi viết tiếp. Lệnh đã sẵn sàng và mặc định là dry-run:

```bash
npm run serial:run -- --premise=factory/serial/song-xuyen/01-cua-hang-cong-phap-tu-tien.json --chapters=4 --apply
```

Không có `--apply` thì nó không gọi model nào.

## 6. Nguồn

Faloo / 爽文:
- 网文IP3.0：飞卢文的特点以及制胜之道 — <https://www.sohu.com/a/405862783_120162360>
- 爽文写作指南：什么是爽点，爽点15例 — <https://m.163.com/dy/article/J9GIQOET05568V6M.html>
- Faloo forum: 6 nguyên tắc viết (开篇/节奏/冲突不要拖) — <https://bbs.faloo.com/t/1776242.html>
- Faloo trang chủ + bảng xếp hạng (decode GBK, 19/09/2026) — <https://b.faloo.com/>, <https://b.faloo.com/y_0_0_0_0_0_0_1.html>
- Faloo 作者必读 (chương ≥1.000 chữ, 日更 4.000, 强推 8,5 vạn chữ) — <https://bbs.faloo.com/t/1776238.html>
- Faloo 新手教程 + đề tài biên tập khuyến nghị — <https://bbs.faloo.com/doc/1775838/1.html>
- Faloo 新书PK榜 công thức, VIP ký kết — <https://b.faloo.com/help/newbookpk.htm>, <https://b.faloo.com/help/vipqianyue.htm>
- Ví dụ giới thiệu + tên chương một bộ ký độc quyền — <https://wap.faloo.com/1455340.html>
- 飞卢老作者总结 节奏&主线&期待感&爽点逻辑 — <https://zhuanlan.zhihu.com/p/564122034> (qua tóm tắt tìm kiếm; zhihu chặn fetch)
- 飞卢 章节字数/日更 — <https://zhidao.baidu.com/question/1882695362662084468.html>, <https://zhuanlan.zhihu.com/p/696646970>
- 小不爽/小爽 循环, 每万字一小高潮 — <https://www.jianshu.com/p/6565b9c59568>, <https://blog.csdn.net/huayishuo/article/details/145509049>, <https://blog.csdn.net/xinxiyinhe/article/details/147087868>
- Thị trường Việt: <https://waka.vn/top-17-bo-truyen-he-thong-hot-nhat-dang-duoc-nhieu-nguoi-tim-kiem-Yxa0>, <https://tiki.vn/blog/top-truyen-he-thong-hay/>, <https://metruyencv.vn/the-loai/vo-dich>

Công cụ / thực hành:
- fanqie-novel-skill (Truth Files, 27 chiều audit, AI去味, 1M chữ) — <https://forum.trae.cn/t/topic/17215>
- snow-sakura/novel-generator (4 agent) — <https://github.com/snow-sakura/novel-generator>
- Fanqie official AI tools — <https://fanqienovel.com/writer/zone/article/7327136545129906238>
- Novelcrafter vs Sudowrite — <https://blog.mylifenote.ai/the-11-best-ai-tools-for-writing-fiction-in-2026/>, <https://scriptumwriterstudio.com/en/blog/scriptum-vs-sudowrite-vs-novelcrafter.html>
- Vercel Fluid compute 800s/1800s — <https://vercel.com/docs/fluid-compute>, <https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute>

Nghiên cứu:
- StoryWriter — <https://arxiv.org/abs/2506.16445>
- DOME (dynamic hierarchical outlining + memory) — <https://arxiv.org/abs/2412.13575>
- ConWriter (transition-constrained, neuro-symbolic nhẹ) — <https://arxiv.org/abs/2608.05169>
- Lost in Stories (taxonomy lỗi nhất quán) — <https://arxiv.org/abs/2603.05890>
- StoryBox (AAAI 2026) — <https://arxiv.org/abs/2510.11618>
- Multi-framework comparison of outline stages — <https://arxiv.org/abs/2608.26177>

Nội bộ: [`docs/FALOO_CRAFT.md`](FALOO_CRAFT.md) (đo 4 chương Faloo thật), `git log 554a5d2..HEAD`, `story_factory_runs`, `story_factory_jobs`, `chapter_reads`,
`ai_story_projects` (project `2c001721…`), `docs/STORY_FACTORY.md`, `docs/FALOO_MARKET_PROFILE.md`.
