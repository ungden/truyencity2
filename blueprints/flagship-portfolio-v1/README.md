# Flagship First 30

Đây là danh mục chuẩn bị truyện, không phải prompt viết truyện và không phải 30 StorySpec làm sẵn.

Nguồn sự thật typed nằm ở `src/services/story-engine/flagship/portfolio-data.ts`. Mỗi slot chỉ khóa một vùng cơ chế đủ khác để research và thi concept. Khi một concept thắng, mọi chi tiết nhân vật, thế giới, giọng văn và pleasure loop mới được viết riêng vào `FlagshipSetupBriefV2` và `StorySpecV2` của truyện đó.

## Phân bổ đã khóa

- 30 bộ đều male-primary; giọng đọc và payoff vẫn tự nhiên để độc giả nữ có thể đọc, không viết kiểu loại trừ giới tính.
- 12 fantasy: 7 huyền huyễn, 5 tiên hiệp phi cổ điển.
- 18 đô thị, niên đại, nghề nghiệp, hưu nhàn và song xuyên.
- Advantage mix: 11 native, 6 rebirth, 4 transmigration, 2 script awareness, 3 bounded system, 2 dual world, 2 simulation loop.

## Cohort opening tournament (9)

| Slot | Cơ chế | Nhánh |
| --- | --- | --- |
| HX-01 | Quy tắc và dị tượng | Huyền huyễn |
| HX-04 | Văn minh và lãnh địa | Huyền huyễn |
| HX-05 | Luyện khí và kinh tế tài nguyên | Huyền huyễn |
| TH-01 | Gia tộc nhiều thế hệ | Tiên hiệp |
| TH-03 | Tu tiên nghiên cứu và thí nghiệm | Tiên hiệp |
| DT-03 | Trọng sinh công nghiệp và phân phối | Niên đại–kinh doanh |
| DT-05 | Giao dịch song xuyên | Dị giới–kinh doanh |
| DT-11 | Giám bảo và thị trường đồ cũ | Đô thị–nghề nghiệp |
| DT-13 | Y nghiệp có giới hạn | Đô thị–nghề nghiệp |

Mỗi slot đi qua `ChineseBenchmarkPackV1 → 20 concept có worldProof → pairwise rank → 3 opening`. Chỉ sau blind review mới chọn ba slot để materialize StorySpec. Cohort đích là một huyền huyễn, một tiên hiệp và một commercial winner từ bốn opening đô thị/niên đại/song xuyên.

Mỗi pack có tối thiểu sáu tác phẩm Trung Quốc để đối chiếu cơ chế, tối thiểu ba nguồn chính thức và ranh giới chống sao chép. Engine chỉ đưa phần kết luận cơ chế đã chưng cất vào Concept Lab; tên truyện, tác giả và URL nguồn không được vào prompt. Danh sách đầy đủ nằm tại [chinese-benchmarks-v1.md](./chinese-benchmarks-v1.md).

## Ranh giới bắt buộc

- Market cards và portfolio data không được import vào Director, Writer hoặc Editor.
- Chinese benchmark chỉ được dùng trước khi tạo concept; thiếu pack ở một opening lane phải `setup_blocked` trước model call đầu tiên.
- Mỗi concept phải nêu đúng ba `worldProof.signatureSituations`; nếu đổi tên bối cảnh mà vẫn dùng được thì concept chưa đủ riêng.
- Không tạo project placeholder. Thiếu brief riêng hoặc concept được duyệt thì trả `setup_blocked`.
- Không generic genre suffix, không fallback, không mượn kernel của slot khác.
- Hai pilot cũ là `lab_reference`, không tính vào 30 và không được viết tiếp.
- Project chỉ được tạo sau khi có brief typed riêng; trạng thái ban đầu phải paused, hidden và manual-only.

## Lệnh vận hành

```bash
npm run flagship:portfolio:validate
npm run flagship:portfolio:tournaments
npm run flagship:portfolio:review
npm run flagship:portfolio:materialize
npm run flagship:portfolio:write-openings
npm run flagship:covers:verify
npm run flagship:portfolio:promote
```

`tournaments` tạo 20 concept, pairwise rank và ba opening cho từng slot bằng checkpoint có hash. `review` chấm mù ba opening, kiểm evidence nguyên văn và tạo [khuyến nghị 9 → 3](./portfolio-recommendation.md). Cả hai lệnh đều offline và không import Supabase, chapter writer hoặc legacy orchestrator.

Kết quả tournament: 9 tournament, 180 concept, 27 opening và 81 chương mẫu. Blind editor đề cử `HX-04 / HX04-B`, `TH-01 / TH01-C` và `DT-11 / DT11-B`; human gate ngày 15/07/2026 đã duyệt cả ba cùng tên xuất bản trực diện. `materialize` đã tạo ba kernel riêng với foundation score lần lượt `9.7 / 9.7 / 9.4`. `write-openings` đã chạy đủ 9 chương 1–3: cả 9 verdict là `publish`, plan fidelity 10/10, trục thấp nhất từ 8.0 trở lên; TH-01 chương 1 dùng một revision có evidence, tám chương còn lại dùng đúng ba call. [Opening human gate](./materialized/opening-human-review.md) vẫn bắt buộc trước khi tạo project pilot. Hai lệnh không ghi production, không tạo project và không có content fallback.

Tên catalogue đã qua [market-title audit V2](./title-market-audit-v2.md): tên xuất bản phải nói thẳng setup/cơ chế/payoff và được human gate duyệt riêng, không tái sử dụng nhãn ngắn do Concept Lab sinh. Ba opening thắng có [title options riêng](./finalist-title-options-v2.md).

`flagship:covers:verify` kiểm tra đủ 30 source/rendered cover, WebP 1086×1448 và hash của từng ảnh trong [cover-render-manifest.json](./cover-render-manifest.json). Manifest khóa title đã duyệt và watermark `truyencity.com`; nếu đổi title phải render lại cover rồi cập nhật manifest, không được âm thầm dùng bìa cũ.

Lệnh `promote` hiện chỉ tạo promotion packet trên stdout và không ghi database. `--apply` cố ý bị chặn cho tới khi từng slot có brief riêng và concept được duyệt; đây là fail-closed, không phải tính năng còn thiếu để engine tự lấp.

## Research basis

- [2025中国网络文学发展研究报告](https://www.cssn.cn/skgz/bwyc/202604/t20260420_5981165.shtml): đô thị huyền huyễn, mạt thế cao võ, hiện thực, huyền ảo và chữa lành cùng phát triển; độc giả đòi hỏi đa dạng, chiều sâu và đổi mới hơn sảng cảm đơn nhất.
- [智性幻想小说的崛起](https://wyb.chinawriter.com.cn/content/202602/06/content82721.html): fantasy nam tần kết hợp tư duy lý tính, nghề nghiệp, công nghiệp, khoa học và thế giới có logic.
- [诚于时代，诚于文学](https://wyb.chinawriter.com.cn/content/202601/21/content82487.html): tiên hiệp, tu chân đang dung hợp khoa huyễn, mạt thế, vòng lặp và thẩm mỹ mới.
- [从玄幻到现实——网络文学的回归与超越](https://www.chinawriter.com.cn/n1/2025/0814/c404027-40542448.html): công thức xuất thân thấp, cơ duyên, nâng cấp và đánh quái đã trở thành lối mòn dễ nhận ra.
- [中国网络文学的社会价值生成](https://www.cssn.cn/skgz/bwyc/202603/t20260304_5974950.shtml): sảng, nhiệt huyết, ngọt và chữa lành có giá trị giải tỏa áp lực khi tạo nhập vai và bù đắp cảm xúc.
- [好故事、好设定、好人物依旧是“新网文”的核心](https://wyb.chinawriter.com.cn/Pad/content/202605/22/content83945.html): story, setting và character vẫn là lõi; dung hợp hiện thực, nghề nghiệp, hài và fantasy không thay thế chất lượng nhân vật.

Các nguồn này chỉ định hướng portfolio. Chúng không được đưa nguyên văn vào prompt chương và không thay thế blind review với độc giả Việt.
