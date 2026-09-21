# Kế hoạch sửa nền sáng tác toàn hệ thống

Ngày 21/09/2026. **Đợt hiện tại chỉ nghiên cứu và thiết kế.** Các bước sửa mã, chạy mô hình,
tạo truyện thử, thay chương hoặc triển khai bên dưới là công việc của đợt tiếp theo.
Chưa có kết quả A/B hay bản Song Xuyên mới để đánh giá chất lượng.

Đầu vào: [nghiên cứu ba nhóm](NARRATIVE_FOUNDATION_RESEARCH_2026-09-21.md),
[hướng dẫn dự thảo có phiên bản](NARRATIVE_FOUNDATION_GUIDE.md), mã nguồn tại `74fec5d`.
Các nhận xét mã dưới đây được đối chiếu trực tiếp, không lấy mô tả trạng thái chạy từ
`CLAUDE.md` làm bằng chứng production. Yêu cầu áp dụng cho cả hai bộ máy của người dùng
thay thế định hướng cũ trong tài liệu dự án rằng chỉ được sửa Serial.

## 1. Chẩn đoán và điểm phải thay

| Hiện trạng đã xác nhận | Tác động | Thay đổi dự kiến |
|---|---|---|
| `docs/FALOO_CRAFT.md` suy rộng bốn chương đồng nhân thành chuẩn; `serial/playbook.json` có “tối đa ba dòng”, mỗi chương thêm tên mới | Dồn lai lịch, bỏ đời sống, thêm thực thể để đạt quota | Nguồn sáng tác chung theo phiên bản, có phạm vi và dẫn chứng. Không nạp cả luật cũ lẫn luật mới vào cùng một prompt |
| `serial/contracts.ts:128` Premise v2 có hợp đồng bốn chương và danh mục thương mại; cast thiên về agenda/mốc lên cấp | Chưa có đời sống trước lợi thế; thăm dò bị mô hình hóa như khai trương kinh doanh | Phiên bản Premise mới có nền nhân vật/thế giới và tiến trình khám phá, sản phẩm chưa định lịch ra mắt |
| `serial/state.ts:459` seed main `knowsFinger=true`; sheet tại dòng 469 chủ yếu role/agenda | Một cờ không diễn tả biết cửa tồn tại, biết quay về hay biết quy tắc khác | Tri thức theo fact và người biết, có nguồn/chương; trạng thái đầu chỉ gồm điều được xác lập ban đầu |
| `serial/contracts.ts:425–545` vòng mua trong hai chương, đủ bốn bước trong năm chương; mỗi beat phải có tên mới; các scene mode phải khác nhau | Cảnh khám phá/sinh hoạt bị ép thành buôn bán/trình diễn, hoặc đổi cảnh chỉ để qua validator | Kế hoạch phiên bản mới cho `customerLoop=null`, kết quả phi vật chất, không bắt nhân chứng hay tên mới; xét lặp về nội dung |
| `serial/context.ts` truyền vòng khách hàng và thứ phải đặt tên cho Writer/Judge | Sửa schema một mình vẫn bị prompt kéo về luật cũ | Adapter ngữ cảnh theo phiên bản, gửi đúng điều kiện và giới hạn tri thức cho từng vai trò |
| `story-factory/setup.ts:48–122` bắt payoff 1/3/5/7/10; proof 1/3 đòi sản phẩm, người chứng kiến, người gây áp lực | Tiền đề phải hứa kết quả sớm, thế giới/cơ chế được dựng ngược để đáp ứng | Setup mới dùng mốc có điều kiện; giữ chứng minh tài nguyên khi có kết quả vật chất, thêm chứng cứ khám phá/quan hệ đúng loại |
| `story-factory/setup.ts:938,1374,1462,1490` lặp cùng hạn thưởng ở concept, world, series, arc | Chỉ sửa Writer không thể chữa được kế hoạch đã ép tiến trình | Rà và chuyển toàn tuyến setup, không chèn ngoại lệ ở cuối Writer prompt |
| Factory đã có fact/knowledge, quan hệ, nhân quả; `context.ts` có `full_scene` / `compress_transition` | Có nền tái sử dụng, không cần dựng một hệ tri thức song song | Liên kết nền sáng tác và sổ tiết lộ vào ID/event hiện hữu; mở cách đánh giá cảnh đời sống |
| `serial/runtime.ts:308–315` đưa `needs_replan` về replan cycle; Factory phân biệt lỗi cứng và advisory | Lỗi tiền đề có thể bị lặp sửa ở tầng chương; điểm văn học không thể tự bảo đảm chất lượng | Kết quả biên tập chỉ rõ tầng sửa; giữ bằng chứng; không tiêu tiền viết lại khi lỗi còn ở nền/plan |

Không gỡ kiểm tra tiền, vật sở hữu, trao đổi, di chuyển, thời gian, người chết hoặc tri
thức có nguồn. Không thêm regex “có bữa cơm/có suy nghĩ” rồi xem đó là chất lượng văn học.

## 2. Hợp đồng dữ liệu đề xuất

Tên trường là thiết kế để triển khai, **chưa có trong runtime**. Một module chung chịu
trách nhiệm phiên bản, kiểu dữ liệu và cách cấp nguyên tắc; adapter mỗi engine chịu trách
nhiệm ID và trạng thái riêng của nó. Tránh sao chép cả hai hệ schema vào module chung.

| Cụm dữ liệu | Nội dung tối thiểu có ý nghĩa | Quy tắc |
|---|---|---|
| `craftProfile` | `version`, nhóm thể loại, digest gói hướng dẫn đã duyệt | Gắn với truyện, plan, run và checkpoint. Không tự chọn “latest” khi đọc truyện cũ |
| `characterFoundation` | Xuất thân, việc hiện tại, kỹ năng có nguồn, giới hạn hiểu biết, quan hệ, thói quen, mong muốn trước lợi thế | Main phải đủ nền trước khi lập opening; người phụ mở rộng khi có vai trò, không ép số nhân vật mới |
| `livedWorlds` | Sinh hoạt, sinh kế, hạ tầng, chênh lệch tiếp cận, tổ chức và mục tiêu độc lập | Stable IDs nối world/cast hiện hữu; không coi lore trong hồ sơ là đã xuất hiện trên trang |
| `advantageDiscovery` | Sự kiện nhận được, phản ứng dự kiến, phép thử có mục đích, điều đã biết đầu truyện, bí mật để dành/manh mối | Phân biệt quyền năng tác giả biết với công dụng main đã thử; không bật mọi tri thức lúc seed |
| `developmentMilestones` | Mục tiêu, điều kiện tri thức/tài nguyên/năng lực/thời gian/quan hệ, chứng cứ đạt, phần còn chưa chắc | Đồ thị phụ thuộc không chu trình, không định sẵn chương phải bán hàng/lên cấp; ngày/chương chỉ là dự kiến theo truyện |
| `knowledgeState` | Ai biết/tin điều gì, từ đâu, mức chắc chắn và thời điểm | Dùng fact/knowledge/event Factory; Serial bổ sung ánh xạ tương đương. Có thể ghi nhận niềm tin sai |
| `readerRevelations` | Điều đã được đọc, chapter ID, đoạn/quote làm chứng, digest bản văn, góc nhìn | Chỉ ghi sau khi bản văn được chấp nhận. Không lấy beat sheet, hồ sơ hoặc dữ liệu trích từ bản đã bị loại |
| `sceneIntent` | POV, điều đang muốn, trọng tâm trải nghiệm, cách tiếp cận thông tin; chỗ cần viết kỹ hay tóm lược | Có thể không có giao dịch hay delta tài sản. Không biến các yếu tố này thành công thức bắt mọi cảnh đủ ô |

Kiểm tra tham chiếu và thứ tự là kiểm tra cơ học. “Nếp sống đủ thuyết phục”, “quan hệ
đã đáng tin” là nhận xét văn học cần đọc, không được coi là đúng chỉ vì các ô đã có chữ.

Sổ chứng cứ dùng sự kiện đã commit. Khi sửa/loại bản nháp, gỡ hoặc tính lại chứng cứ phụ
thuộc và vô hiệu hóa plan chưa commit dựa vào nó. Khi nén trí nhớ, giữ nguồn/ID của điều
kiện quan trọng; đoạn tóm tắt không được nâng suy đoán thành sự thật. Thuật toán merge phải
giữ tri thức theo từng người, tránh gộp “độc giả biết” thành “mọi nhân vật biết”.

## 3. Đường triển khai cho Serial

1. Thêm parser và profile mới bên cạnh Premise v2/CyclePlan v1. Old fixtures vẫn đọc đúng.
   Không đổi mọi field cũ thành optional rồi mất kiểm tra vốn cần cho truyện thương mại.
2. Premise mới hỗ trợ nền trước cửa xuyên và các mốc chưa thương mại hóa. `launchProducts`
   là ứng viên có căn cứ, chưa phải hàng đã sở hữu. Không ép bốn món xuất hiện bốn chương.
3. `seedBible` khởi tạo tài sản, kiến thức và quan hệ đúng thời điểm bắt đầu. Nếu opening
   kể trước khi cửa xuất hiện, main chưa biết nó. Không mang knowledge từ bản công khai cũ
   sang pilot kể lại ch1.
4. Plan mới cho phép không có `customerLoop`; nhánh có giao dịch tiếp tục kiểm tra quyền
   sở hữu, số lượng, đối giá và trình tự phù hợp. Khám phá/quan hệ có thể là mốc chính và
   không có nhân chứng. Không buộc cảnh liền nhau khác nhãn nếu nội dung đang phát triển.
5. Rà `agents.ts`, `prompts.ts`, `playbook.ts/.json`, `context.ts`, `engine.ts`: Premise,
   Planner, Writer, Judge, Extractor, opening audit và repair cùng dùng đúng profile.
   Kiểm tra cả nhánh retry, rolling plan ghép với active cycle và nén Bible.
6. Writer thấy thông tin nền cần diễn, phần main biết và phần cần phát hiện được phân
   biệt rõ. Author-only facts chỉ đưa vào ràng buộc continuity có kiểm soát; không đổ
   toàn bộ bí mật vào đoạn ngữ cảnh kể chuyện.
7. Extractor ghi sự kiện/tri thức có chứng cứ trong văn bản đã chấp nhận. Judge giữ lỗi
   continuity; review văn học trả tầng sửa. Runtime không gọi `replan_serial_cycle` mù
   quáng cho lỗi foundation; giữ draft/bằng chứng để rà lại premise, có giới hạn retry.
8. Catalog production cũ giữ nguyên. Pilot mới tách ID và artifact riêng; không dùng
   seed/approve/resume hiện có để tự động thay thế bộ đang công khai.

## 4. Đường triển khai cho Story Factory

1. Thêm profile vào commission/launch artifact/kernel theo thiết kế tương thích. Giữ
   yêu cầu có market/world contract; profile mới thay nội dung/ràng buộc của hợp đồng đó,
   không “sửa” bằng bỏ toàn bộ blueprint.
2. `runConceptLab` chọn pipeline setup theo profile ngay từ đầu. Concept, research,
   ranking, simulation, identity, world, series và initial state phải đánh giá cùng
   mục tiêu: main sống thế nào và có điều kiện nào cho bước tiến. Không chạy setup cũ
   rồi xóa deadline ở sản phẩm cuối.
3. Proof vật chất vẫn kiểm tra cơ chế và đầu vào/đầu ra khi mốc thực sự là sản phẩm/tiền.
   Mốc khám phá cần nguồn tiếp cận thông tin; mốc quan hệ cần hành động và phản ứng.
   Không tạo tiền hoặc nhân chứng giả để lách `OpeningPayoffProofSchema` cũ.
4. Kết nối biography với characters hiện hữu; facts/knowledge với State/event ledger.
   Thêm reader revelations dựa bản văn, vì fact tồn tại trong State chưa có nghĩa độc
   giả đã được đọc cảnh làm nó dễ hiểu.
5. Rà `planRollingWindow`, plan assessment, `buildWriterBrief`, `draftStoryChapter`,
   `assessStoryDraft`, revision, `reviewFiveChapterWindow` và `planArcLifecycle`.
   `full_scene`/`compress_transition` dùng theo mức mới/quan trọng của việc, không chỉ
   theo có delta hay không. Giữ chặn leak POV và resource/travel/time validation.
6. Editor tách lỗi kế hoạch và lỗi thể hiện. Pipeline cần truyền `repairTarget` tới
   runtime/operator để lỗi foundation về setup review, lỗi plan về plan repair và lỗi
   prose mới được rewrite. Không để nhận xét nghiêm trọng bị nuốt thành score advisory.
7. Checkpoint phải bind commission, profile digest, routes và input digest. Chạy lại
   không được dùng checkpoint setup cũ cho profile mới; giữ thống kê chi phí và lỗi gốc.

## 5. Đánh giá văn học và phân tuyến sửa

Đề xuất kết quả review gồm phạm vi chương đã đọc, nhận xét main/thế giới/nhân quả/độ gắn
bó/mong muốn đọc tiếp và danh sách finding. Mỗi finding có tầng sửa, mức độ, vị trí chứng
cứ, giải thích và hướng xử lý. Đây là review riêng, không trộn điểm vào sổ tài sản.

| Tầng | Ví dụ | Hành động |
|---|---|---|
| Foundation | Main bán dịch vụ phần mềm nhưng nền chưa có năng lực hoặc nguồn hỗ trợ; AI không có nguồn gốc truyện | Chặn nhánh draft thử, đưa về gói nền để duyệt; không vá bằng đoạn kể đã có sẵn một quá khứ mới |
| Plan | Có đồ tương lai nhưng chưa kiểm tra/sản xuất đã nhận đơn hàng lớn | Sửa mốc và cảnh phụ thuộc, giữ lịch sử đã commit; không tự sửa chương công khai |
| Prose | Kế hoạch có lần thử cửa nhưng văn bản chỉ nói “anh đã hiểu hết” | Sửa đúng cảnh, đánh giá lại bằng bản mới; retry có giới hạn và có log |
| Preference | Người đọc muốn một sắc thái giọng khác, chưa có lỗi chứng minh được | Ghi nhận cho người duyệt; không tự chạy vòng sửa trả phí vô hạn |

Thiếu chuẩn bị cần chỉ rõ kết quả đòi hỏi nó và phạm vi đã tìm; chỉ kết luận “chưa thấy
trong đoạn đã đọc” nếu không có toàn bộ lịch sử. Kiểm tra quote/hash trước khi dùng finding
để chặn. Máy không được chặn chỉ vì cảnh không có tiền, cấp bậc, tên mới hoặc người xem.
Ngay cả review máy sạch cũng chưa đồng nghĩa người dùng đã duyệt trải nghiệm đọc.

## 6. Tương thích và áp dụng theo từng truyện

- Không tự đổi profile khi parse, không default truyện thiếu profile sang phiên bản mới.
  Gói legacy có cách resolve rõ ràng và ổn định; unknown version dừng với thông báo có ích.
- Giữ snapshot quy tắc cũ cho truyện chưa rà, thay vì cho global prompt mới ngầm tác động
  tới mọi truyện trong lần deploy tiếp theo. Khóa profile/digest trong plan và run; mixed
  versions phải được phát hiện trước khi gọi mô hình.
- Kiểm tra cơ chế `STORY_FACTORY_RELEASE`/claim gate trước thay schema để không làm
  toàn bộ job cũ mất tương thích. Không dùng `restage --all` hoặc bật lại fleet làm cách
  áp dụng. Việc đọc được JSON cũ và việc job cũ còn claim được đều cần kiểm chứng riêng.
- Mỗi lần opt-in cần bản rà nền, mapping IDs, trạng thái đầu/ranh giới áp dụng và người
  duyệt. Không suy ra “main đã biết từ đầu” bằng cách chép toàn bộ kernel vào knowledge.
- Rebuild từ ch1 là một nhánh riêng có lineage tới truyện gốc, không dùng chung Bible,
  ledger hay hàng đợi publish. Chuyển profile giữa truyện phải dừng ở ranh giới an toàn,
  rà hậu quả và có snapshot để quay lại.
- Rollback trước public switch bỏ nhánh thử và tiếp tục giữ nguyên bản công khai. Nếu
  bản đã công khai được thay trong đợt sau, phải có gói mapping chương, trạng thái và
  phương án trả lại; không thực hiện việc đó trong đợt nghiên cứu.

## 7. Ca thử Song Xuyên Tương Lai — thiết kế để duyệt

Giữ Trần Khải và cửa kho Khải Minh làm điểm liên tục nếu phù hợp bản rà. Tiêu đề hiện tại
hứa “rau tươi đổi AI” sẽ cần thay trong gói pilot; chưa đổi tên truyện đang đăng. Dự kiến
định vị: người kinh doanh nhỏ tìm công nghệ hữu ích, dần xây năng lực sản phẩm và doanh
nghiệp ở cả hai thế giới. Không có thức ăn tăng cấp, phẩm giai tu luyện hay AI toàn năng
tự giải bài toán công ty.

**Nền main đề xuất:** Trần Khải đang trông tiệm gia đình, có kinh nghiệm bán lẻ và sửa đồ
điện nhỏ ở mức đã học. Muốn cải thiện cuộc sống và tự làm ra sản phẩm đáng bán; chưa có
đội R&D, kinh nghiệm sản xuất công nghiệp hoặc mạng khách hàng công nghệ. Thói quen giữ
đồ hỏng để tìm nguyên nhân có thể ảnh hưởng cách anh nhìn đồ tương lai. Cần dựng một vài
quan hệ đang sống với tiệm trước cửa xuất hiện, không mở bằng bản tuyên bố làm tập đoàn.

**Cửa xuyên đề xuất:** trong lúc dọn và sửa kho sau tiệm, một lớp khung cũ lộ ra; khi
thao tác vào nó, lối đi mở sang không gian lạ. Dấu vết ở khung và đầu bên kia là manh mối
được giữ nhất quán. Main kiểm tra lối về, thử đưa một vật nhỏ qua, so thời gian và nhận
biết phạm vi mình đã thử. Đây là phương án sáng tác chưa phải canon: cần duyệt nguyên
nhân kích hoạt và manh mối trước khi viết; không khẳng định đã biết người tạo ra cửa.
Không trao sẵn cho main toàn bộ luật “chỉ mình anh được qua” trước khi có căn cứ.

**Hai thế giới:** tương lai có đồ tiêu dùng tốt hơn nhưng vẫn có người sửa đồ, người mua
hàng cũ, chủ xưởng và người không đủ tiền dùng dòng cao cấp. Các bên có việc làm, thu nhập,
hạ tầng và lợi ích cụ thể. Công nghệ phổ biến ở đó không mặc nhiên miễn phí hay dùng được
trên hạ tầng hiện tại. Phía hiện tại phải có khả năng hấp thụ từng bước. Giá trị hai chiều
được phát hiện từ nhu cầu của cư dân, không mặc định mọi người tương lai thiếu rau đến mức
đổi cả bản quyền AI vĩnh viễn cho một giỏ thực phẩm.

**Sản phẩm đầu đề xuất:** một đồ dùng nhỏ như dao cạo râu; chọn sau khi thấy đời sống và
điều kiện công nghệ. Dao cạo dùng để khảo sát một lợi ích cụ thể (êm hơn, sạch hơn, bền hơn),
không phải ép sẵn phải bán nó. Điện thoại, quần áo và app là các hướng về sau khi có nguồn
lực; không dựng trước hàng chục món chỉ để đủ danh mục.

| Mốc có điều kiện | Điều cần tồn tại trước | Cách kể có thể chọn |
|---|---|---|
| Quyết định quay lại thế giới mới | Lối về đã được thử, công việc/quan hệ bên hiện tại được tính đến | Lo sợ, tò mò, một cuộc nói chuyện hoặc chuẩn bị vừa đủ |
| Nhìn ra cơ hội từ đồ nhỏ | Quan sát người thực sự dùng nó, hiểu lợi ích và có đường tiếp cận | Cảnh ở nơi sửa đồ/cửa hàng, thử dùng và hỏi những điều main chưa biết |
| Mang được mẫu về | Có cách nhận/mua/đổi được giải thích, quyền sở hữu và vận chuyển rõ | Giao dịch có thể nhỏ và riêng tư, không bắt buộc tại một chương cố định |
| Tin rằng có thể thành sản phẩm | Biết điều gì hoạt động, điều gì cần thiết bị/vật liệu/hạ tầng bên kia | Phân biệt dùng thành phẩm, phân phối và tự sản xuất; không mặc định tháo ra là sao chép được |
| Làm mẫu phù hợp hiện tại | Công nghệ/nguồn cung, người có kỹ năng và thời gian đủ | Viết kỹ lựa chọn đầu; tóm lược thử nghiệm quen, tránh thất bại giả |
| Có người muốn trả tiền | Nhu cầu, bằng chứng lợi ích, mức giá và khả năng giao hàng | Người dùng thử có phản ứng cụ thể; lời khen không tự biến thành đơn hàng |
| Xây doanh nghiệp và hợp tác hai phía | Nhu cầu đã rõ, khả năng cung ứng, trách nhiệm và quan hệ | Tổ chức xuất hiện để giải công việc đã phát sinh, không xuất hiện trước sản phẩm cho oai |

Không gán mốc vào chương 1/3/5/10. Một chương có thể dành cho đời sống trước cửa; một
khoảng khám phá có thể chưa kinh doanh. Nhịp do trải nghiệm đọc và điều kiện câu chuyện
quyết định. Gói pilot phải gồm nền + tiến trình + giới hạn tri thức trước khi viết prose.

## 8. Kế hoạch kiểm chứng sau khi được phép triển khai

**Kiểm tra kỹ thuật hai chiều:**

| Ca thử | Kỳ vọng |
|---|---|
| Truyện legacy thiếu profile; cycle v1 có giao dịch | Đọc được, hành vi cũ vẫn ổn định; invariant tài sản giữ nguyên |
| Profile mới có nhiều chương khám phá, `customerLoop=null`, không nhân chứng/tên mới | Kế hoạch và Writer/Judge chấp nhận; không lén bổ sung vòng khách hàng |
| Bữa ăn/đi bộ làm rõ quan hệ hoặc thay đổi góc nhìn | Không bị từ chối chỉ vì không có vật phẩm hay tăng cấp |
| Main dùng bí mật chỉ có trong kernel hoặc POV khác | Bị phát hiện thiếu đường tiếp cận; không backfill tri thức để hợp thức hóa |
| Bán hàng trước mẫu/nguồn cung; prototype bị coi là thị trường | Finding trả plan/foundation, không retry prose để vá |
| Qua cửa lần đầu nhưng seed đã đánh dấu biết mọi quy tắc | Bị phát hiện trước viết; chỉ biết điều initial state có căn cứ |
| Sai tiền/tài sản/vị trí/thời gian trong cảnh sinh hoạt | Vẫn bị kiểm tra consistency; “cảnh chậm” không được miễn |
| Sửa văn bản, quote cũ không còn; nén memory làm mất nguồn | Chứng cứ cũ không được tiếp tục dùng; giữ hoặc phục hồi nguồn hợp lệ |
| Retry/resume/arc mới dùng profile khác checkpoint | Chặn trước provider, không âm thầm trộn prompt |
| Review nhận ra lỗi foundation | Runtime giữ bằng chứng và trả đúng tầng; không xóa bản public hoặc tự tái sinh |

**Thử đọc có đối chứng:** chuẩn bị ba commission nguyên tác tương ứng ba nhóm. Trong
mỗi engine, mỗi commission có nhánh phương pháp cũ và mới, cùng brief đầu vào, cùng model
ID/revision, thông số, công cụ, mục tiêu dung lượng và giới hạn retry. Ghi lại mọi khác
biệt để tránh quy công cho prompt khi thực tế đã đổi mô hình hoặc tăng gấp đôi số chữ.

Chạy tuần tự từng cặp, lưu checkpoint và chi phí, chỉ xuất artifact private. Bắt đầu một
cặp trước để kiểm tra đường thử, rồi mở sang ba nhóm ở cả hai engine: sáu cặp. Đề xuất cửa
sổ đọc đầu năm chương mỗi nhánh; đây là kích thước mẫu kiểm chứng, không phải hạn bán hàng
hay trả thưởng. Khi đánh giá đoạn phát triển sau, tiếp tục chính lineage đó, không chọn
ngẫu nhiên một chương hay nhất. Hai nhánh cùng được cấp cơ hội sửa tương đương, bản trước
sửa vẫn giữ lại. Không chọn lại mẫu đến khi kết quả có lợi mà giấu các lần hỏng.

Tách hai câu hỏi: A/B toàn tuyến từ commission đo hiệu quả hệ thống; thử cùng một nền đã
duyệt đo riêng cách lập plan/viết/biên tập. Không dùng kết quả phép thử sau để tuyên bố đã
kiểm chứng setup mới. Nếu một nhánh không sinh đủ chuỗi vì lỗi schema/plan, ghi là lỗi
thử nghiệm đó, không so một đoạn sót lại như chuỗi hoàn chỉnh.

Đảo nhãn A/B khi đưa người đọc duyệt. Đọc liên tục và trả lời bằng dẫn chứng:
main là ai; cuộc sống/thế giới vận hành ra sao; vì sao main quyết định thế; thành quả có
đáng tin; đoạn nào muốn đọc tiếp và đoạn nào muốn lướt. Máy kiểm tra thiếu bước/biết trước,
đồng thời rà các cảnh có ý nghĩa nhưng chưa kiếm tiền/lên cấp để tránh phạt nhầm. Không
dùng số biến cố, độ ngắn đoạn hoặc điểm máy làm chỉ tiêu thay lượt đọc của người dùng.

**Cổng hoàn thành:** test kỹ thuật qua chỉ cho phép đưa bản thử tới người đọc. Người dùng
duyệt riêng nền, chuỗi truyện và phương án thay chương công khai. Kết quả cần đạt là chuỗi
đọc được với tiến trình đáng tin; chưa đạt thì sửa đúng tầng. Không tự resume/publish vì
CI xanh hay một review máy khen hay.

## 9. Thứ tự bàn giao

1. **Đợt này:** hồ sơ nguồn/cảnh, hướng dẫn dự thảo và kế hoạch này. Không có mã runtime mới.
2. **Sau duyệt triển khai:** profile + tương thích + nền dữ liệu, tiếp đến adapter cả hai
   engine và phân tuyến biên tập; kiểm tra prompt cuối ở mọi nhánh trước khi dùng provider.
3. **Sau kiểm tra kỹ thuật:** chuẩn bị các gói nền thử và chạy đối chứng private theo
   ngân sách được xác định trước; báo đủ chi phí/thất bại, không có publish side effect.
4. **Sau lượt đọc duyệt:** quyết định sửa tiếp hay áp dụng từng truyện; Song Xuyên dùng
   nhánh kể lại từ ch1. Phương án đổi bản công khai là bước riêng, không nằm trong đợt này.
