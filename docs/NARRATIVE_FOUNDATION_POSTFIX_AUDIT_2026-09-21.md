# Audit sau remediation — 21/09/2026

> Trạng thái sau lượt sửa tiếp theo: cả 8 finding trong báo cáo này đã được xử lý trong working tree. Serial có checkpoint/resume theo tầng và literary gate cho mọi v3 cycle; reviewer nhận plan history cùng state đầu/cuối; Bible cũ backfill knowledge; ID dùng chung một hợp đồng và không thể trùng fact/milestone; Story Factory giữ usage khi correction lỗi. Runtime và migration có regression test. Chưa áp migration, deploy, sinh truyện thật hoặc thay nội dung công khai.

Kết luận tại thời điểm audit: hệ thống khi đó chưa ổn; báo cáo đã xác nhận 8 finding gồm 2 P1 và 6 P2. Các mục dưới đây giữ nguyên bằng chứng trước sửa, còn trạng thái hiện tại nằm ở ghi chú remediation phía trên.

Phạm vi: working tree trên HEAD `74fec5d`, Serial và Story Factory, hợp đồng dữ liệu và SQL liên quan. Chạy hàm runtime thật với provider/database giả lập; đầu ra provider trong các ca Serial được parse bằng schema mà hàm thật truyền vào. Không gọi model thật, không đọc/ghi production, không deploy hoặc đổi chương công khai. Giá trị cost trong bằng chứng là số giả lập.

## 1. P1 — Serial chỉ duyệt văn học ở chương 4

Vị trí: `src/services/serial/runtime.ts:349`, `:458-472`; `src/services/serial/engine.ts:81`.

Caller duy nhất của `reviewNarrativeSequence` là `auditFourChapterOpening`; runtime chỉ gọi khi `chapterNumber === 4`. `stagePublishCycle` không tải review văn học của chu kỳ hoặc chạy review mới. SQL `publish_serial_cycle` kiểm lease và đủ chương, không kiểm kết quả literary review của phần sắp đăng.

Tái hiện: đưa job vào `publish_cycle`, cycle 2, chương 6–10. Runtime gọi `claim_serial_job`, rồi `publish_serial_cycle`, với **0 model calls**. Đây là bằng chứng đường gọi tới RPC trong giả lập, không phải đã xuất bản thật. Cơ chế duyệt mở đầu hiện có không duyệt được các chương viết sau đó.

Tác động: lỗi bỏ bước, đời sống bị kể tắt hoặc thành công thiếu chuẩn bị ở chương 5 trở đi không được lớp đánh giá văn học mới kiểm trước đăng. Judge từng chương chỉ chặn continuity có quote; điểm đọc là steering.

Hướng sửa: gắn literary review với chuỗi chương chuẩn bị xuất bản, lưu kết quả gắn với đúng phiên bản draft, và yêu cầu kết quả đó tại đường publish. Giữ ranh giới duyệt của người dùng.

## 2. P1 — Một số lỗi sau Writer vẫn làm mất draft và usage của run

Vị trí: `src/services/serial/engine.ts:169-208`, `src/services/serial/foundation.ts:281-286`, `src/services/serial/runtime.ts:365`, `:374-382`, `:531-550`.

`writeOneChapter` chỉ chuyển `SerialStateError` sau Extractor thành nhánh sửa/giữ draft. Lỗi provider/schema từ Extractor hoặc verifier thoát ra ngoài trước khi runtime có checkpoint. Literary review của Serial cũng vẫn ném `Error` thuần khi quote sai; chưa có lần sửa cục bộ hay usage-bearing error như nhánh Story Factory.

Ba ca runtime đã tái hiện:

| Đầu vào lỗi | Kết quả |
|---|---|
| Verifier timeout sau Writer, Judge, Extractor | 4 calls đã được gọi; không có update nào cho `serial_runs`; job về `ready`; không trả tổng usage đã hoàn tất |
| Literary review trả quote không tồn tại sau khi viết chương 4 | 6 calls; không có update nào cho run; job về `ready`; lỗi `Narrative review quote is not grounded in chapter 1.` |
| Literary finding `plan/blocking` hợp lệ | Pause và lưu cost 0.06, nhưng không lưu prose/digest chương 4 vào artifact |

Hai ca đầu để run ở `running` và lần retry đi lại từ Writer. Ca thứ ba giữ ba chương trước nhưng mất bản chương 4 cần đối chiếu khi sửa plan. Đây là thất thoát checkpoint và telemetry của run; chưa kết luận ledger sử dụng provider độc lập bị mất.

Hướng sửa: checkpoint đầu ra và usage sau từng bước hoàn tất; lỗi bước nào tiếp tục/sửa bước đó. Mọi nhánh pause cần giữ draft cùng context chẩn đoán, kể cả lỗi upstream. Lỗi lưu artifact cũng phải được kiểm tra trước khi báo pause thành công.

## 3. P2 — Artifact đã lưu không được dùng khi resume

Vị trí: `src/services/serial/runtime.ts:297-310`, `:328-347`; `supabase/migrations/20260919211906_serial_resume_preserve_feedback.sql:31-35`.

`draft_artifact` chỉ có đường ghi trong service, không có đường đọc để tiếp tục Extractor hoặc sửa prose. RPC resume giữ nguyên `stage=write` và đưa job về ready. Tick tiếp theo tạo run mới, gọi Writer từ đầu.

Tái hiện: database giả lập đã có artifact loại `extractor`, prose tên “Draft đã duyệt”, chapter 1. Tick vẫn gọi đủ Writer → Judge → Extractor → verifier, trả chương mới “Ca tối”, tổng 4 calls. Không đọc draft cũ để tiếp tục bước bị lỗi.

Hướng sửa: có nhánh phục hồi artifact theo loại review và checkpoint; khi context đã thay đổi phải xác định artifact còn dùng được hay cần duyệt lại. Không coi nút resume hiện tại là chức năng sửa riêng Extractor.

## 4. P2 — Reviewer Serial phân loại lỗi plan nhưng không được xem plan

Vị trí: `src/services/serial/engine.ts:81-86`, `src/services/serial/foundation.ts:255-276`.

`auditFourChapterOpening` không nhận/truyền Bible hoặc approved cycle. Payload thực bắt được trong ca runtime gồm `foundation`, `evidence=[]`, `durableNarrativeState=null`, `chapters`; không có approved beat sheets.

Reviewer có thể nhận ra trải nghiệm đọc bị thiếu bước, nhưng không đủ dữ liệu phân biệt plan đã chuẩn bị cảnh mà Writer bỏ với plan vốn thiếu cảnh. Runtime vẫn dùng `target=foundation/plan` để pause yêu cầu sửa upstream.

Hướng sửa: cấp plan đã duyệt và state/evidence tương ứng để chẩn đoán tầng lỗi, hoặc tách lượt đọc văn học khỏi lượt đối chiếu nguyên nhân. Test cần đi qua caller runtime, không chỉ gọi helper với context được truyền thủ công.

## 5. P2 — Bible cũ không phục hồi tri thức theo nhân vật

Vị trí: `src/services/serial/state.ts:346-361`.

Các durable index về fact/milestone được backfill từ `core.narrativeEvidence`, nhưng `characterKnowledge` chỉ lấy snapshot cũ cộng evidence của digest mới. Bible được ghi trước khi có snapshot sẽ parse với `characterKnowledge=[]`; thông tin người học trong evidence cũ không được chuyển sang snapshot.

Tái hiện: Bible có 240 evidence; chương 1 ghi main đã học fact cửa, 239 evidence sau không thêm người học; bỏ ba trường snapshot để mô phỏng JSON cũ. Merge chương 241 đẩy quote chương 1 khỏi cửa sổ:

```json
{"reader":["cua_noi_hai_kho"],"learners":[],"retainedLearnerQuote":false}
```

Tác động: mất vĩnh viễn dấu vết main đã học gì khi tiếp tục dữ liệu v3 ghi bằng bản trước snapshot. Ca test hiện tại gieo Bible bằng `seedBible` mới nên không phát hiện đường tương thích này. Chưa xác nhận có Bible thuộc trường hợp đó trên production.

Hướng sửa: khôi phục toàn bộ learner từ evidence còn có trước khi cắt lịch sử, đồng thời giữ knowledge ban đầu hợp lệ; kiểm thử JSON cũ thiếu các trường mới.

## 6. P2 — Fact và milestone được phép trùng ID

Vị trí: `src/services/narrative/foundation.ts:62-66`, `src/services/serial/foundation.ts:156-166`, `src/services/serial/state.ts:355-357`.

Schema chỉ kiểm unique riêng từng mảng. Trong validator, ID trùng đi vào nhánh fact rồi `continue`, bỏ kiểm milestone có trong beat và prerequisite của milestone. Khi merge, cùng evidence lại được thêm vào cả revealed facts và achieved milestones.

Tái hiện bằng premise có fact và milestone cùng ID `cua_noi_hai_kho`, milestone không có prerequisite, beat chỉ reveal fact:

```json
{"schemaAccepted":true,"plannedMilestones":[],"achieved":["cua_noi_hai_kho"]}
```

Đây là ca gọi schema, `assertNarrativeDigest` và `applyDigest` thật. Không khẳng định model verifier luôn chấp nhận một quote vô nghĩa: verifier cũng bị cấp claim fact kèm `evidenceNeeded` của milestone, tức payload đã nhập nhằng hai khái niệm. Ngay cả quote đủ nghĩa vẫn không sửa được việc milestone nằm ngoài beat được duyệt.

Hướng sửa: dùng namespace ID không giao nhau, hoặc khai báo loại evidence rõ ràng và kiểm tương ứng xuyên suốt schema, plan, verifier và state.

## 7. P2 — Hợp đồng độ dài ID không thống nhất

Vị trí: `src/services/narrative/foundation.ts:6`, `src/services/serial/contracts.ts:24`, `:415-419`.

Foundation cho ID tối đa 64 ký tự; durable state dùng ID Serial tối đa 48. Premise v3 có fact ID dài 49 ký tự hợp lệ, nhưng `seedBible` thất bại nếu fact nằm trong tri thức ban đầu. Nếu fact xuất hiện sau, merge/plan cũng gặp hợp đồng không tương thích.

Tái hiện: ID gồm 49 ký tự `f`, được gán vào fact, initial knowledge và prerequisite. `PremiseSchema.parse` pass, `seedBible` báo lỗi ở `symbolicCore.revealedNarrativeIds.0` và `symbolicCore.characterKnowledge.0.factIds.0`.

Hướng sửa: thống nhất schema ID tại ranh giới dùng chung; premise đã được chấp nhận phải có khả năng seed, plan và commit bằng cùng hợp đồng.

## 8. P2 — Story Factory mất usage nếu lần sửa literary review bị lỗi provider

Vị trí: `src/services/story-factory/foundation.ts:121-134`.

Nhánh sửa quote gộp usage sau khi `await makeCall()` lần hai trả về. Nếu lần hai timeout hoặc provider ném lỗi, usage của mechanical review và literary review lần một không được gắn vào lỗi. Trường hợp schema parse thất bại cũng có khoảng trống tương tự. Bản sửa trước mới bao phủ hai lần trả review hợp lệ về schema nhưng quote vẫn sai.

Tái hiện: base review cost 0.01, literary review đầu cost 0.01 và quote sai; lần sửa ném timeout. Kết quả: 2 literary calls, lỗi `simulated literary timeout`, `usageEvidence=null`, trong khi hai lượt hoàn tất đã báo tổng 0.02. Chưa tính cost của lượt timeout.

Hướng sửa: tích lũy usage và checkpoint đã có trước mỗi await; bọc lỗi provider/schema với thông tin các bước hoàn tất để runtime không ghi thiếu cost hoặc phải chạy lại review đã xong.

## Kiểm chứng và giới hạn

- `npx jest --runInBand src/__tests__/narrative-foundation.test.ts src/__tests__/serial src/__tests__/story-factory`: 16 suites, 371 tests pass.
- `npm run typecheck`: pass.
- `git diff --check`: pass trước khi thêm báo cáo.
- Script tái hiện cục bộ: `/tmp/truyencity-foundation-audit.ts`; không gọi network hoặc model thật. Provider giả lập chứng minh đường xử lý phần mềm, không chứng minh chất lượng văn học của model thật.
- Lượt này chỉ ghi báo cáo audit, không sửa runtime, schema, tests hay migration. Không chạy literary A/B và không xác minh trạng thái production.

Ưu tiên sửa: giữ checkpoint và phục hồi đúng bước; mở rộng gate văn học tới phần chuẩn bị xuất bản; hoàn thiện context reviewer; sửa tương thích tri thức/ID và usage khi lỗi. Sau đó mới có cơ sở chạy chuỗi chương riêng tư để người dùng đọc duyệt chất lượng thực.
