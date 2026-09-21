# Audit lại sau bản sửa — 21/09/2026

> Cập nhật từ lượt audit tiếp theo: kết luận đóng toàn bộ bên dưới chưa bao phủ các đường lỗi và phục hồi. Xem [audit sau remediation](NARRATIVE_FOUNDATION_POSTFIX_AUDIT_2026-09-21.md): 8 finding còn mở đã được đối chiếu code và ca tái hiện. Nội dung dưới đây được giữ làm lịch sử kiểm chứng của lượt trước.

Kết luận sau remediation: tám finding dưới đây đã được sửa trong working tree và có regression test. Kết luận ban đầu của lượt audit vẫn được giữ bên dưới làm bằng chứng trước sửa; phần “Trạng thái sau sửa” ghi chính xác đường xử lý mới. Chưa deploy, chạy migration production, sinh truyện trả phí hoặc thay nội dung công khai.

Phạm vi: working tree trên HEAD `74fec5d`. Đọc code và SQL hiện có; chạy hàm thực với provider/database giả lập bằng Node + tsx. Không gọi dịch vụ sinh nội dung, không đọc hoặc ghi database production, không deploy. Các số usage trong ca giả lập là dữ liệu kiểm thử, không phải tiền đã chi.

## Trạng thái sau sửa

1. Serial chạy thêm lượt semantic evidence verifier sau Extractor, đối chiếu claim, learner và `evidenceNeeded` với prose trước merge. Exact quote và dependency vẫn là lớp kiểm cơ học.
2. Bible có snapshot bền vững `revealedNarrativeIds`, `achievedNarrativeMilestoneIds` và `characterKnowledge`; cửa sổ 240 quote chỉ còn là lịch sử gần. Ca 242 chương xác nhận fact, milestone, prerequisite và người học không bị quên.
3. Hết một lượt sửa Extractor trả `needs_review`, giữ prose, verdict và digest lỗi trong `serial_runs.draft_artifact`, rồi pause job; không gọi `replan_serial_cycle`.
4. Literary `blocking/prose` ở Serial và Story Factory pause bản riêng tư để duyệt, không gọi RPC xóa/replan. Nhánh sửa cửa sổ cũ chỉ còn dùng cho review cơ học.
5. Editor và Arc đi qua adapter theo profile; các luật sáng tác cũ mâu thuẫn bị loại. Writer giữ được voice override A/B và vẫn nhận chính sách lived-causality.
6. Literary reviewer nhận Arc, state đầu/cuối cửa sổ, approved rolling plan và prior review evidence để phân tầng nguyên nhân.
7. Voice marker A/B được kiểm bằng test trên system prompt thực sau adapter.
8. Quote literary sai được sửa cục bộ đúng một lần. Nếu vẫn sai, `StoryFactoryError` giữ tổng usage của mechanical review và cả hai literary calls; không chạy lại mechanical review.

Migration cục bộ `20260921142929_narrative_foundation_review_artifacts.sql` chỉ thêm cột JSONB riêng tư `serial_runs.draft_artifact`. Migration chưa được áp dụng lên production.

## Dấu mốc của bản trước remediation

- Blueprint profile mới đọc được `openingExecutionProofs=[]` sau JSON roundtrip.
- Compatibility release hiện là `sf_0064f61f70c8afa1`, giữ tương thích với release trước thay đổi foundation.
- Rolling planner v3 cho phép tiếp tục cùng sceneMode; legacy vẫn giữ điều kiện cũ.
- Hai sự kiện học cùng fact ở hai chương liên tiếp đều được giữ khi chưa chạm giới hạn dung lượng.
- Quote không có trong prose bị chặn trước merge.
- Trước remediation, chạy `runStoryFactoryTick()` thật với review cũ pass và literary `blocking/prose` cho thấy RPC gọi `repair_story_factory_draft_window`, không gọi `publish_story_factory_window`; finding 4 ghi lại lỗi này và phần trạng thái sau sửa ở trên ghi đường mới.

## 1. P1 — Quote có thật nhưng không chứng minh fact/milestone vẫn làm bẩn canon

Vị trí: `src/services/serial/foundation.ts:144-174`, gọi từ `src/services/serial/engine.ts:165`.

Kiểm tra mới chỉ xác nhận substring, ID nằm trong beat và prerequisite đã có ID. Nó không đối chiếu nội dung quote với fact, `evidenceNeeded`, hay việc nhân vật được ghi là người học có thật sự tiếp cận thông tin. Judge chạy trước Extractor nên không hề duyệt các claim mà Extractor bổ sung sau đó.

Tái hiện qua toàn bộ `writeOneChapter()`:

- Prose chỉ lặp “Khải đóng sổ, rửa tay rồi ngồi ăn cơm.”
- Beat cho phép phát hiện các fact và kiểm chứng cửa.
- Extractor gắn quote “Khải đóng sổ” cho ba fact và milestone `kiem_chung_cua`; ghi Khải đã học tất cả.
- Milestone trong foundation đòi hai phép thử có vật đánh dấu, đồng hồ, sai số và chuyến đi được chuẩn bị.

Kết quả thực:

```json
{"status":"committed","calls":3,"evidence":["cua_noi_hai_kho","thoi_gian_dong_bo","dao_cao_rau_dan_dung","kiem_chung_cua"]}
```

Hướng sửa: đưa các claim evidence vào lượt kiểm semantic trước commit, đối chiếu claim/learner/evidenceNeeded với prose; giữ kiểm exact quote và dependency làm lớp cơ học. Không lấy việc một mốc đã được lên kế hoạch làm chứng cứ nó đã xảy ra.

## 2. P1 — Giới hạn 240 sự kiện làm mất tri thức đã học và mốc đã đạt

Vị trí: `src/services/serial/state.ts:361-369`; tiêu thụ bởi `src/services/serial/foundation.ts:86-89`.

Dedup theo ID đã được sửa, nhưng sau đó vẫn `.slice(-240)`. Đây lại là nguồn duy nhất để planner biết điều gì đã xảy ra và writer biết ai đã học. Một fact quan trọng có thể bị đẩy ra bởi các lần xuất hiện của fact khác; không có snapshot tri thức/milestone lâu dài thay thế.

Tái hiện: evidence cửa và người học ở chương 1, thêm 239 sự kiện đồng hồ rồi merge sự kiện thứ 241. Kết quả:

```json
{"length":240,"retainsDoor":false,"retainsProtagonistLearning":false}
```

Plan chương tiếp theo dùng fact cửa bị từ chối:

```text
narrative_prerequisite_missing Chapter 242 depends on cua_noi_hai_kho before the reader has seen it.
```

Giới hạn tính theo số sự kiện, không theo chương: một chương có thể thêm tới 24 evidence nên vấn đề có thể xuất hiện sớm hơn nhiều.

Hướng sửa: tách snapshot bền vững về reader reveal, knowledge theo nhân vật và milestone đã đạt khỏi cửa sổ quote gần đây. Có thể giới hạn lịch sử chi tiết, nhưng không được quên trạng thái đã xác lập.

## 3. P1 — Lỗi Extractor vẫn có thể hủy cả chu kỳ hợp lệ

Vị trí: `src/services/serial/engine.ts:184-189`, `src/services/serial/runtime.ts:309-319`, `supabase/migrations/20260919212857_serial_replan_quota_refund.sql:35-54`.

Tái hiện bằng `writeOneChapter()` với prose đã qua Judge, cả hai lượt Extractor trả quote vắng mặt:

```json
{"status":"needs_replan","calls":4,"reason":"State merge rejected the digest after one extractor repair (narrative_evidence_quote): Evidence cua_noi_hai_kho quotes text that is not present in chapter 1."}
```

Runtime nhận `needs_replan` và gọi `replan_serial_cycle`. SQL của RPC xóa toàn bộ chương draft trong chu kỳ, khôi phục Bible đầu chu kỳ, tăng số lần replan; lần thứ hai có thể pause. Lỗi trích xuất của một chương vì vậy xóa cả những chương trước đã hợp lệ. Prose vừa viết cũng không được trả về trong outcome này để tiếp tục sửa riêng Extractor.

Hướng sửa: checkpoint prose/verdict/digest lỗi, có trạng thái chờ sửa Extractor riêng; khi hết budget sửa thì pause đúng tầng, bảo toàn chu kỳ và bản nháp. Không mua lại Writer/Planner cho lỗi quote hoặc ID của Extractor.

## 4. P2 — Blocking prose đã chặn publish nhưng vẫn sửa sai tầng

Vị trí: `src/services/story-factory/runtime.ts:1092-1108`, `supabase/migrations/20260906151718_story_factory_staged_windows_and_security.sql:292-300`; Serial tương ứng ở `src/services/serial/runtime.ts:371-389`.

Ca runtime thật dùng database giả lập cho kết quả:

```json
{"rpcs":["reconcile_story_factory_jobs","claim_story_factory_job","repair_story_factory_draft_window"]}
```

RPC này không biên tập prose: nó xóa năm chương draft và state events, bỏ rolling plan, đưa job về `stage=plan`. Serial cũng dùng nhánh `replan_serial_cycle` cho literary `blocking/prose`. Như vậy target sửa đã xác định là prose nhưng tác động lại là thay kế hoạch và sinh lại cả cửa sổ/chu kỳ.

Hướng sửa: giữ plan đã hợp lệ, sửa/duyệt draft bị nêu và kiểm lại tác động nối tiếp; hoặc pause để người duyệt xử lý. Việc chặn xuất bản không phải lý do xóa công việc ở tầng khác.

## 5. P2 — Prompt cũ quay lại ở Editor và ranh giới Arc

Vị trí: `src/services/story-factory/foundation.ts:28-47`, `src/services/story-factory/prompts.ts:92`, `src/services/story-factory/planner.ts:3205`.

Adapter chỉ lọc các dòng của planner/plan_judge. Editor giữ nguyên chỉ dẫn phạt cảnh tập trung vào thao tác, kiểm tra dụng cụ và giải thích kỹ thuật khi cạnh tranh/payoff ít. Ở `planArcLifecycle`, system dùng thẳng `PLANNER_SYSTEM_PROMPT`; role `arc` đã khai trong adapter không được gọi.

Bắt payload ngay tại provider của `planArcLifecycle()` thực (dừng trước sinh nội dung):

```json
{"legacyPayoff":true,"microTechnicalBan":true,"containsFoundationPolicy":false}
```

`foundationSystemPrompt(EDITOR_SYSTEM_PROMPT, ...)` cũng vẫn chứa câu “Đừng nhầm ‘đúng quy trình’ với sảng cảm” cùng chỉ dẫn phía sau. Đường viết các chương đầu có thể đã đổi nhịp nhưng đổi Arc lại nhận luật cũ; Editor và Writer vẫn có chính sách không nhất quán cho cảnh thăm dò.

Hướng sửa: chọn chính sách theo profile ở mọi vai trò/call site, gồm setup, Editor, window review và Arc; tách protocol khỏi creative policy thay vì lọc dòng bằng prefix.

## 6. P2 — Literary reviewer phân tầng nguyên nhân nhưng không được cấp plan hoặc lịch sử trước cửa sổ

Vị trí: `src/services/story-factory/foundation.ts:86-103` và hai call site ở `src/services/story-factory/planner.ts:3111`, `planner.ts:3152`.

Payload thực thu được từ lượt runtime chỉ có:

```json
["task","foundation","chapters"]
```

Reviewer phải chọn `foundation`, `plan`, `prose`, trong khi không thấy approved plan để phân biệt “plan bỏ bước” với “Writer bỏ cảnh”. Cửa sổ sau cũng không có state/checkpoint/evidence đã xác lập trước nó. Nó có thể đánh giá trải nghiệm năm chương, nhưng không đủ dữ liệu để quyết định chính xác thiếu sót nằm ở tầng nào hoặc một prerequisite đã có ở chương trước. Runtime lại dùng target này để block cả job.

Hướng sửa: tách đánh giá đọc mù khỏi bước chẩn đoán nguyên nhân; bước chẩn đoán phải đối chiếu plan, trạng thái đầu cửa sổ và chứng cứ truy xuất được. Thiếu context phải yêu cầu bổ sung, không suy ra nhân vật chưa từng học hoặc tác giả chưa chuẩn bị.

## 7. P2 — Profile mới âm thầm bỏ qua voice override của thử nghiệm A/B

Vị trí: `src/services/story-factory/foundation.ts:57-59`, caller `src/services/story-factory/pipeline.ts:1103-1107`.

Pipeline dựng prompt với `input.writerVoicePolicy`, nhưng adapter profile mới bỏ toàn bộ prompt đó và gọi `buildWriterSystemPrompt()` lần nữa với hằng `LIVED_CAUSALITY_WRITER_POLICY`.

Tái hiện: truyền voice policy chứa marker riêng, lấy system sau adapter; marker biến mất. Caller nghĩ đang chạy một biến thể văn phong nhưng model luôn nhận cùng policy. Điều này ảnh hưởng tính hợp lệ của thử nghiệm văn học được yêu cầu.

Hướng sửa: cho phép chọn voice variant trên nền craft profile cố định và lưu digest prompt thực. Không báo đã thử hai biến thể nếu system thực tế giống nhau.

## 8. P2 — Quote lỗi ở literary review mất usage và lặp cả hai lượt review

Vị trí: `src/services/story-factory/foundation.ts:107-115`, `src/services/story-factory/runtime.ts:307-333`.

Reviewer mới ném `Error` thuần khi quote không có trong chương. Lỗi không mang usage của review cơ học lẫn review văn học. Runtime biến nó thành `infra_blocked`, lưu cost 0 và xếp retry theo backoff, dù lỗi là đầu ra review không hợp lệ.

Tái hiện qua `runStoryFactoryTick()` với hai lượt provider giả lập, mỗi lượt báo usage 0,01:

```json
{"providerCalls":2,"reportedUsageTotal":0.02,"storedCost":0,"error":"Narrative review quote is not grounded in chapter 3."}
```

Không có checkpoint review đã xong; retry phải chạy lại cả hai lượt. Đây là sai telemetry ở run row và phạm vi retry; chưa kết luận usage ledger độc lập bị mất.

Hướng sửa: lỗi grounding có kiểu riêng, giữ đủ usage/checkpoint của từng lượt và chỉ sửa review lỗi. Giữ nguyên draft và verdict cơ học đã có.

## Kiểm chứng sau sửa và việc còn thiếu

- Chạy lại 22 suites / 410 tests: pass; các ca đối kháng semantic evidence, tràn 240 evidence, giữ draft không replan, voice override, diagnostic context và usage grounding đều nằm trong bộ test.
- Typecheck: pass.
- Chưa chạy literary A/B hoặc sinh chương mới. Chưa xác minh deployment/job production.
- Cần áp migration trong một đợt triển khai được duyệt trước khi bật đường pause artifact ở runtime production.
