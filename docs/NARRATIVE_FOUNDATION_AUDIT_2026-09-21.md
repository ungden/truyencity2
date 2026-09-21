# Kiểm tra lại nền sáng tác — 2026-09-21

**Kết luận tại thời điểm audit: chưa sẵn sàng triển khai hoặc xác nhận đã sửa được chất lượng truyện.** Tám lỗi dưới đây là baseline đã dẫn tới lượt khắc phục tiếp theo.

## Trạng thái sau khắc phục

**Cập nhật từ audit lần hai:** nhận định đóng toàn bộ lỗi bên dưới đã được kiểm tra lại và không còn chính xác. Xem [audit sau bản sửa](NARRATIVE_FOUNDATION_REAUDIT_2026-09-21.md) để biết các phần đã sửa đúng cùng tám finding còn tồn tại.

Tám lỗi kỹ thuật trong báo cáo này đã được đóng trong working tree:

- Blueprint profile mới chấp nhận và đọc lại `openingExecutionProofs=[]`; legacy vẫn chỉ chấp nhận proof đủ cặp khi field có mặt.
- Serial đối chiếu quote với prose, giới hạn fact/milestone theo beat đã duyệt và kiểm prerequisite trước khi merge.
- Sự kiện nhân vật học một fact ở chương sau được giữ riêng, không bị dedup theo fact ID.
- Literary review `blocking/prose` đóng publication gate và đi vào nhánh sửa bản nháp; lỗi foundation/plan vẫn trả đúng tầng.
- Compatibility release giữ nguyên `sf_0064f61f70c8afa1`; craft profile tiếp tục opt-in theo từng truyện.
- Serial v3 không còn bị luật xoay `sceneMode` của legacy chặn.
- Story Factory đối chiếu fact và tri thức chương 0 với Narrative Foundation.
- Prompt profile mới chọn creative policy mới; các luật 200 từ, ép nén `full_scene`, deadline payoff cố định và thất bại bắt buộc đã bị loại khỏi prompt thật.

Kiểm chứng sau sửa: 22 suites, 405 tests; typecheck, build, secret scan và `git diff --check` được ghi nhận ở báo cáo triển khai. Việc các lỗi tích hợp đã đóng không tự chứng minh chất lượng văn học; A/B ba thể loại và lượt đọc duyệt vẫn là cổng riêng trước khi áp dụng cho truyện công khai.

Phạm vi: working tree trên HEAD `74fec5d`, gồm toàn bộ thay đổi chưa commit của Narrative Foundation. Đọc đường setup → persist → plan → write → extract → review → publish; tái hiện bằng provider và database giả lập. Không gọi model trả phí, không kết nối database production, không sinh hoặc sửa chương công khai. Lượt này chỉ thêm báo cáo audit, chưa sửa mã ứng dụng.

## Kết quả kiểm tra nền

- `npm run typecheck`: qua.
- `npm test -- --runInBand --silent`: 22 suites, 397 tests qua.
- `git diff --check`: qua trước khi thêm báo cáo.
- Các ca tái hiện dưới đây chạy riêng bằng `node --import tsx --input-type=module`, dùng module thực của ứng dụng. Không suy ra chất lượng văn học từ kết quả test.

## 1. P1 — Story Factory profile mới không đi qua được bước lưu và đọc lại blueprint

Vị trí: `src/services/story-factory/setup.ts:127`, `setup.ts:1677`, `src/services/story-factory/runtime.ts:519`, `runtime.ts:1270`.

Setup mới yêu cầu và trả `openingPayoffProofs: []`. Runtime luôn lưu mảng đó vào `market_blueprint.openingExecutionProofs`. Nhưng schema đọc lại vẫn yêu cầu `.length(2).optional()`: bỏ field thì hợp lệ, field có mảng rỗng thì bị từ chối. Tick kế tiếp gọi `requireMarketBlueprint()` trước khi tới Planner và bị `setup_blocked`.

Tái hiện với một blueprint đủ mọi field, profile mới và 6 nấc scale:

```text
SF blueprint before persistence: true
SF persisted blueprint: REJECTED setup_blocked
Market blueprint is required and must be valid before a new story can leave setup.
```

Hướng sửa: định nghĩa proof theo profile và dùng cùng quy tắc tại setup, persist, đọc lại. Thêm test đi qua lưu JSON rồi đọc bằng đúng hàm runtime, không chỉ test `earlyPayoffsForChapterRange()`.

## 2. P1 — Serial vẫn commit thành quả giả, không có chứng cứ trong chương

Vị trí: `src/services/serial/foundation.ts:114`, `src/services/serial/engine.ts:165`.

`assertNarrativeDigest()` chỉ kiểm ID, số chương và ID người học. Nó không nhận nội dung chương để kiểm quote, cũng không kiểm prerequisite của milestone mà Extractor đưa vào digest. Judge chạy trước Extractor nên một digest sai vẫn có thể làm bẩn Bible sau khi prose đã được duyệt.

Tái hiện qua **toàn bộ `writeOneChapter()`**: prose chỉ kể Khải kiểm hàng, nhưng Extractor trả milestone `hieu_mau_dau_tien` với quote hoàn toàn không tồn tại và không có các prerequisite. Kết quả:

```text
Serial full chapter path with forged milestone: committed
fabricatedQuotePresent=false
```

Sau khi lưu, `assertNarrativePlan()` coi ID trong evidence là điều kiện đã có. Một thành quả bịa có thể trở thành căn cứ cho các chương tiếp theo.

Hướng sửa: kiểm quote đối chiếu prose trước merge; kiểm milestone và điều kiện từ trạng thái đã commit cùng chứng cứ hợp lệ của chương hiện tại. Lỗi Extractor phải quay về Extractor, không tự phát sinh thành quả hoặc yêu cầu viết lại prose đã hợp lệ.

## 3. P1 — Lỗi văn học mức blocking vẫn đi tới lệnh xuất bản

Vị trí: `src/services/story-factory/runtime.ts:1080`, `runtime.ts:1093`, `runtime.ts:1122`.

Runtime chỉ chặn literary findings có target khác `prose`. Nếu review cũ pass nhưng review văn học mới trả `target: prose, severity: blocking`, cả hai điều kiện chặn đều false. Finding được lưu như telemetry rồi runtime gọi publish.

Tái hiện bằng **`runStoryFactoryTick()` thực**, kernel/arc/state schema-valid từ fixture, provider giả lập hai lượt review và database giả lập. Blueprint được bỏ field proof để cô lập lỗi này khỏi lỗi số 1:

```json
{
  "runtimeResult": { "status": "completed", "stage": "window_review", "chapterNumber": 5 },
  "blockingProseFinding": "blocking",
  "mockPublishRpcWasCalled": true,
  "rpcCalls": ["reconcile_story_factory_jobs", "claim_story_factory_job", "publish_story_factory_window"]
}
```

Đây là lời gọi vào database giả lập, không phải xuất bản thật. Serial cũng lọc bỏ target `prose` tại opening review, dù còn cổng người dùng duyệt chương 4.

Hướng sửa: tách quyết định có được xuất bản khỏi quyết định sửa ở tầng nào. Finding blocking ở prose phải giữ bản riêng để biên tập/duyệt; finding nền hoặc kế hoạch phải trả upstream. Minor có thể giữ làm góp ý.

## 4. P1 — Đổi release toàn cục làm truyện cũ không còn được worker nhận

Vị trí: `src/services/story-factory/release.ts:13`, `release.ts:32`, `src/services/story-factory/runtime.ts:461`, `runtime.ts:1263`; SQL claim tại `supabase/migrations/20260801130000_setup_slice_recovery.sql:49`.

Thay `FACTORY_CONTRACT_VERSION` và `FACTORY_SETUP_VERSION` làm đổi compatibility release dù dữ liệu cũ vẫn được schema mới đọc. Claim SQL và `loadProject()` yêu cầu release của project khớp tuyệt đối release của worker.

Đối chiếu source HEAD với working tree, tính cùng hàm hash:

```text
HEAD:         sf_0064f61f70c8afa1
Working tree: sf_7e6e4cccff548106
```

Nếu triển khai nguyên bản này, các project còn mang release trước không được claim; schema optional không đủ để bảo đảm tương thích runtime. Đây là hệ quả khi triển khai, không phải xác nhận production hiện đã gặp lỗi.

Hướng sửa: giữ compatibility identity cho thay đổi bổ sung tương thích, hoặc xây đường chạy nhiều version được thử đầy đủ. Opt-in craft theo từng truyện phải độc lập với việc nhận job legacy; không dùng chuyển release hàng loạt để lách.

## 5. P2 — Rolling planner vẫn cấm tiếp tục cùng loại cảnh ở Serial v3

Vị trí: `src/services/serial/engine.ts:257`.

Schema v2 đã cho phép sceneMode lặp, nhưng `planNextCycle()` vẫn luôn áp `recent_scene_mode_repeat`. Ngoại lệ duy nhất là chương có lịch customer loop. Truyện đang khám phá, customerLoop=null, bị ép đổi loại cảnh sau cửa sổ ba chương dù việc khám phá có diễn biến mới hợp lý.

Tái hiện: active cycle v2, chương 3 discovery; candidate chương 4 discovery, không giao dịch, prerequisite hợp lệ. Provider trả cùng một plan hai lượt:

```text
recent_scene_mode_repeat
Chapter 4 repeats recent scene mode discovery outside a scheduled customer milestone.
calls=2
```

Hướng sửa: giới hạn quy tắc cũ ở profile legacy. Với profile mới đánh giá việc lặp hành động/kết quả và sự phát triển của cảnh, không chặn bằng nhãn sceneMode.

## 6. P2 — Mất thông tin nhân vật học một fact đã từng xuất hiện

Vị trí: `src/services/serial/state.ts:358`.

Merge evidence nối bản cũ trước bản mới rồi giữ phần tử đầu tiên theo `id`. Vì vậy khi cùng fact được nhân vật khác học ở chương sau, toàn bộ evidence mới bị bỏ, gồm người học, chương và quote.

Tái hiện: chương 1 độc giả biết cửa tồn tại, `learnedByCharacterIds=[]`; chương 2 Khải tự thử và học cùng fact, `learnedByCharacterIds=['tran_khai']`. Bible sau chương 2 vẫn chỉ có evidence chương 1 và danh sách người học rỗng.

Hướng sửa: lưu riêng việc độc giả đã thấy fact và các sự kiện từng nhân vật tiếp cận fact, có nguồn và thời điểm. Không thay dedup-first bằng dedup-last đơn giản vì cũng sẽ mất lịch sử của người học trước.

## 7. P2 — Tri thức chương 0 của Story Factory chưa được đối chiếu với foundation

Vị trí: `src/services/story-factory/setup.ts:1599`, `src/services/story-factory/validation.ts:119`, `src/services/story-factory/foundation.ts:41`.

Foundation và `state.characters[].knownFactIds` là hai nguồn độc lập. Setup kiểm từng schema và `validateKernelState()`, nhưng chưa đối chiếu việc ai được biết fact ngay từ đầu theo foundation. Writer lại được hướng dẫn tin knownFactIds của State.

Tái hiện với kernel có foundation khai `cua_noi_hai_kho` chưa ai biết, `advantageDiscovery.initiallyKnownFactIds=[]`. Thêm fact đó vào State chương 0 cùng knownFactIds của main. Cả `StoryKernelSchema.parse()` và `validateKernelState()` vẫn chấp nhận.

Hướng sửa: xác lập mapping giữa fact nền và fact State, kiểm initial knowledge trong launch pack và sự kiện học về sau. Đừng để hai nguồn canon đưa ra chỉ dẫn ngược nhau cho Writer.

## 8. P2 — Prompt Story Factory mới vẫn chứa các luật gây ép nhịp cũ

Vị trí: `src/services/story-factory/foundation.ts:28`, `src/services/story-factory/prompts.ts:36`, `prompts.ts:39`, `prompts.ts:118`, `prompts.ts:122`.

Adapter ghép nguyên legacy prompt rồi nối nguyên tắc mới. Prompt gửi thật cho profile mới vẫn có các câu:

- Vào hành động đổi cục diện trong khoảng 200 từ, tối đa hai đoạn dựng không khí.
- Chuẩn bị không có xung đột mới phải kể gọn dù pacing=full_scene.
- Chi tiết kỹ thuật chỉ được làm trung tâm khi có đối thủ, deadline, rủi ro hoặc khoản thưởng đang ép.
- earlyPayoffs là hợp đồng chương 1/3/5/7/10.

Đã kiểm chuỗi do `foundationSystemPrompt()` trả về: các chỉ dẫn trên vẫn tồn tại cùng chỉ dẫn mới cho phép cảnh đời sống, khám phá và thử nghiệm lần đầu. Chưa có bản đọc thực tế chứng minh model xử lý xung đột này đúng; nối thêm ngoại lệ chưa hoàn thành yêu cầu thay quy tắc.

Hướng sửa: tách protocol cơ học khỏi chính sách sáng tác; chọn một chính sách theo version. Test prompt thực của từng role để đảm bảo profile mới không còn nhận quy tắc bị bỏ.

## Phần chưa đủ bằng chứng nghiệm thu

- Năm test mới kiểm vài helper, schema và một review minor. Chưa phủ setup → persist → tick tiếp theo, cửa sổ planning thứ hai, evidence giả, người học bổ sung, release legacy hay blocking prose → publication.
- Chưa có so sánh chuỗi chương cũ/mới trên ba nhóm thể loại với cùng model và dung lượng tương đương. Test kỹ thuật không thay cho lượt đọc duyệt của người dùng.
- Gói `song-xuyen-tuong-lai-v3-review.json` là nền và hướng mở đầu để duyệt, chưa phải Premise v3 đầy đủ có thể seed trực tiếp, cũng chưa phải chương 1 mới.
- Không kiểm tra trạng thái job hoặc deployment production trong lượt audit này. Không có căn cứ nói production đã dùng profile mới.

## Thứ tự khắc phục và kiểm chứng

1. Sửa hợp đồng proof sau persist và tương thích release; test legacy lẫn profile mới qua runtime.
2. Chặn evidence không nằm trong prose, milestone chưa đủ điều kiện và bảo toàn tri thức từng nhân vật.
3. Tách verdict xuất bản khỏi target sửa lỗi; test blocking prose không gọi publish.
4. Gỡ kiểm tra sceneMode cũ khỏi profile mới và chọn prompt theo version để hết xung đột.
5. Chạy chuỗi mô phỏng nhiều cửa sổ, rồi chuẩn bị thử văn học riêng trên ba nhóm. Chỉ kết luận chất lượng sau khi đọc chuỗi chương và có lượt duyệt của người dùng.
