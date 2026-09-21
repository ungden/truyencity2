-- Migration 0011: Create ai_prompt_templates table and seed high-quality templates

-- Create ai_prompt_templates table if not exists
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_category
  ON ai_prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_is_default
  ON ai_prompt_templates(category, is_default) WHERE is_default = true;
-- Enable RLS
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;
-- Policy: Everyone can read templates
DROP POLICY IF EXISTS "Allow public read access to ai_prompt_templates" ON ai_prompt_templates;
CREATE POLICY "Allow public read access to ai_prompt_templates"
  ON ai_prompt_templates FOR SELECT
  USING (true);
-- Policy: Only authenticated users can insert/update/delete
DROP POLICY IF EXISTS "Allow authenticated users to manage ai_prompt_templates" ON ai_prompt_templates;
CREATE POLICY "Allow authenticated users to manage ai_prompt_templates"
  ON ai_prompt_templates FOR ALL
  USING (auth.role() = 'authenticated');
-- ============================================================================
-- SEED DATA: HIGH-QUALITY PROMPT TEMPLATES
-- ============================================================================

-- Delete existing default templates to avoid conflicts
DELETE FROM ai_prompt_templates WHERE is_default = true;
-- 1. TIÊN HIỆP (Cultivation) Template
INSERT INTO ai_prompt_templates (category, template, is_default, description, variables) VALUES (
  'cultivation',
  E'Hãy viết chương {{CHAPTER_NUMBER}} của tiểu thuyết "{{NOVEL_TITLE}}" với yêu cầu sau:

📖 THÔNG TIN CƠ BẢN:
- Nhân vật chính: {{MAIN_CHARACTER}}
- Thế giới: {{WORLD_DESCRIPTION}}
- Hệ tu luyện: {{CULTIVATION_SYSTEM}}
- Độ dài mục tiêu: {{TARGET_LENGTH}} từ

🎨 PHONG CÁCH VIẾT (QUAN TRỌNG):

1. **Tả Cảnh Sinh Động**:
   - Miêu tả môi trường bằng 5 giác quan (thị giác, thính giác, khứu giác, vị giác, xúc giác)
   - Tạo bầu không khí đặc trưng cho từng địa điểm (hang động u ám, sơn môn linh khí, đại điện hùng vĩ)
   - Ví dụ: "Linh khí dày đặc như sương mù, chảy róc rách giữa cây cối. Mỗi hơi thở, Lâm Phong cảm nhận sức mạnh tràn vào kinh mạch."

2. **Tả Người Chi Tiết**:
   - Ngoại hình: không chỉ "đẹp" hay "xấu", mà miêu tả cụ thể (mắt sắc lạnh, môi mỏng cong, áo bạc phất phơ)
   - Thần thái: qua hành động nhỏ (nắm chặt tay, nhíu mày, bước đi điềm đạm)
   - Ví dụ: "Trương Dung đứng đó, tay áo bạc phất theo gió, đôi mắt sâu thẳm như hồ cổ, chứa đựng vô số bí mật."

3. **Đối Thoại Tự Nhiên**:
   - Mỗi nhân vật có giọng điệu riêng (trưởng lão nghiêm trang, sư đệ hoạt bát, ma đạo hiểm độc)
   - Xen kẽ hành động giữa lời thoại để tránh khô cứng
   - Ví dụ:
     "Sư đệ, ngươi thử coi này!" Vương Kiện vung tay, một luồng hỏa diễm bùng lên, ánh lên khuôn mặt hào hứng.
     Lâm Phong lắc đầu nhẹ: "Quá yếu. Ta dạy ngươi lại."

4. **Nội Tâm Sâu Sắc**:
   - Thể hiện suy nghĩ, cảm xúc, chiến lược qua câu văn ngắn gọn
   - Tránh "info dump", chỉ viết khi cần thiết
   - Ví dụ: "Lâm Phong lặng lẽ quan sát. Lão giả kia tuy mạnh, nhưng khí huyết đã suy. Nếu đánh lâu dài, ta thắng."

🔥 YÊU CẦU CỐT TRUYỆN:

1. **Cao Trào và Nhịp Độ**:
   - Mỗi chương phải có ít nhất 1 "điểm sướng": đột phá, chiến thắng, lĩnh ngộ, báo thù, hoặc twist bất ngờ
   - Xây dựng căng thẳng dần dần, rồi giải tỏa mạnh mẽ
   - Kết chương bằng cliffhanger hoặc foreshadowing để độc giả muốn đọc tiếp

2. **Character Development**:
   - Nhân vật phải có sự thay đổi rõ ràng: từ yếu đến mạnh, từ ngây thơ đến trưởng thành
   - Thể hiện sự tiến bộ qua hành động, không chỉ qua lời nói
   - Ví dụ: Chương 1 Lâm Phong run sợ trước kẻ thù → Chương 50 Lâm Phong điềm tĩnh phân tích điểm yếu

3. **Tiến Bậc Hợp Lý**:
   - Mỗi lần đột phá phải gắn với cốt truyện (gặp cơ duyên, sinh tử chiến, lĩnh ngộ)
   - Mô tả chi tiết quá trình đột phá (khó khăn, đau đớn, ngộ ra chân lý)
   - Sau khi đột phá, thể hiện sức mạnh mới qua chiến đấu hoặc áp chế

4. **Twist và Bất Ngờ**:
   - Thường xuyên đặt twist nhỏ: kẻ thù hóa bạn, người thầy phản bội, bảo vật giả
   - Foreshadowing tinh tế trước đó 1-2 chương
   - Ví dụ: Chương 45 nhắc "hương thơm lạ", chương 46 tiết lộ sư tỷ đã hạ độc

📊 MỤC TIÊU BỐ CỤC:
- Đối thoại: 35-45% (sinh động, có hành động xen kẽ)
- Miêu tả: 40-50% (tả cảnh, tả người, tả chiến đấu)
- Nội tâm: 10-20% (suy nghĩ, cảm xúc, chiến lược)

⚠️ CẤM TUYỆT ĐỐI:
- Không viết info dump dài dòng giải thích hệ thống
- Không lặp lại thông tin đã có trong các chương trước
- Không dùng cụm từ sáo rỗng: "một cách", "dường như", "có vẻ như"
- Không mô tả chung chung: "anh ta đẹp", "cảnh đẹp" → phải chi tiết cụ thể

🎯 MỤC TIÊU CHƯƠNG NÀY:
{{PLOT_OBJECTIVES}}

---
BẮT ĐẦU VIẾT (VĂN BẢN THUẦN, KHÔNG MARKDOWN):',
  true,
  'Template cho thể loại Tiên Hiệp - Cultivation novels với hệ tu luyện',
  '["CHAPTER_NUMBER", "NOVEL_TITLE", "MAIN_CHARACTER", "WORLD_DESCRIPTION", "CULTIVATION_SYSTEM", "TARGET_LENGTH", "PLOT_OBJECTIVES"]'::jsonb
);
-- 2. ĐÔ THỊ (Urban) Template
INSERT INTO ai_prompt_templates (category, template, is_default, description, variables) VALUES (
  'urban',
  E'Hãy viết chương {{CHAPTER_NUMBER}} của tiểu thuyết "{{NOVEL_TITLE}}" với yêu cầu sau:

📖 THÔNG TIN CƠ BẢN:
- Nhân vật chính: {{MAIN_CHARACTER}}
- Bối cảnh: {{WORLD_DESCRIPTION}}
- Độ dài mục tiêu: {{TARGET_LENGTH}} từ

🎨 PHONG CÁCH VIẾT ĐÔ THỊ:

1. **Tả Cảnh Hiện Đại Sống Động**:
   - Miêu tả không gian đô thị chi tiết: văn phòng sang trọng, phố đông người, quán cafe yên tĩnh
   - Sử dụng chi tiết thời đại: smartphone, laptop, xe hơi, tòa nhà cao tầng
   - Ví dụ: "Ánh đèn neon rực rỡ dọc phố Bùi Viện. Tiếng còi xe inh ỏi, người qua lại tấp nập. Nguyễn Hải đứng trước tòa nhà Vincom, ngước nhìn lên tầng 68 - nơi văn phòng giám đốc của Lý Minh."

2. **Tả Người Theo Lối Sống**:
   - Thể hiện nhân vật qua gu thời trang: vest Armani, váy Chanel, áo thun phông giản dị
   - Qua hành vi: cách nói chuyện, cách cầm ly rượu, cách đi bộ
   - Ví dụ: "Lý Minh bước vào, suit xám fit dáng, giày da bóng loáng. Cách anh ngồi xuống, vắt chéo chân, toát lên sự tự tin của người từng chinh chiến thương trường."

3. **Đối Thoại Hiện Đại, Sắc Bén**:
   - Ngôn ngữ đời thường, tự nhiên, có chút hài hước hoặc châm biếm
   - Xen kẽ mô tả cử chỉ, ánh mắt để tăng chiều sâu
   - Ví dụ:
     "Anh định làm gì?" Ngọc Anh hỏi, tay vẫn gõ đều trên bàn phím.
     "Thâu tóm công ty của hắn." Nguyễn Hải cười nhạt, nhấp một ngụm cà phê. "Trong 3 tháng."
     Ngọc Anh ngừng gõ, quay lại, mắt mở to: "Anh điên à?"

4. **Nội Tâm và Chiến Lược**:
   - Thể hiện suy nghĩ kinh doanh, tính toán lợi ích
   - Mô tả cảm xúc phức tạp: yêu đương, ganh tị, tham vọng
   - Ví dụ: "Nguyễn Hải biết, Lý Minh đang chờ mình phạm sai lầm. Nhưng lần này, anh sẽ chơi bài khôn hơn. Hợp đồng với SoftBank là lá bài tẩy."

🔥 YÊU CẦU CỐT TRUYỆN:

1. **Cao Trào và Xung Đột**:
   - Mỗi chương cần có xung đột: thương trường đấu đá, tình yêu phức tạp, gia đình rắc rối
   - "Điểm sướng": thắng lợi ngoạn mục, troll địch thủ, cảnh ngọt ngào
   - Kết chương bằng tình huống hồi hộp

2. **Character Development**:
   - Nhân vật phải trưởng thành: từ nhân viên thành giám đốc, từ ngây thơ thành thành thục
   - Thể hiện qua quyết định kinh doanh, cách đối nhân xử thế
   - Ví dụ: Chương 1 sợ sếp → Chương 50 bình tĩnh đàm phán với tập đoàn đa quốc gia

3. **Realness và Chi Tiết**:
   - Sử dụng thuật ngữ kinh doanh chính xác: M&A, IPO, cash flow, P&L
   - Mô tả quy trình thực tế: họp hội đồng, ký hợp đồng, đàm phán
   - Tạo cảm giác "có thật": nhắc đến địa danh, công ty, xu hướng thời đại

4. **Twist và Drama**:
   - Phản bội, âm mưu, người tình cũ trở lại, đối tác bí mật
   - Foreshadowing qua chi tiết nhỏ: cái nhìn lạ, cuộc điện thoại kín đáo

📊 MỤC TIÊU BỐ CỤC:
- Đối thoại: 45-60% (sinh động, thông minh, sắc sảo)
- Miêu tả: 25-40% (tả cảnh đô thị, văn phòng, nhà hàng)
- Nội tâm: 10-20% (tư duy kinh doanh, tình cảm phức tạp)

⚠️ CẤM TUYỆT ĐỐI:
- Không viết quá giả tưởng, phi thực tế
- Không lạm dụng drama rẻ tiền
- Không dùng từ ngữ cổ điển, xa lạ
- Không mô tả chung chung, phải cụ thể

🎯 MỤC TIÊU CHƯƠNG NÀY:
{{PLOT_OBJECTIVES}}

---
BẮT ĐẦU VIẾT (VĂN BẢN THUẦN, KHÔNG MARKDOWN):',
  true,
  'Template cho thể loại Đô Thị - Modern urban stories',
  '["CHAPTER_NUMBER", "NOVEL_TITLE", "MAIN_CHARACTER", "WORLD_DESCRIPTION", "TARGET_LENGTH", "PLOT_OBJECTIVES"]'::jsonb
);
-- 3. HUYỀN HUYỄN (Fantasy) Template
INSERT INTO ai_prompt_templates (category, template, is_default, description, variables) VALUES (
  'fantasy',
  E'Hãy viết chương {{CHAPTER_NUMBER}} của tiểu thuyết "{{NOVEL_TITLE}}" với yêu cầu sau:

📖 THÔNG TIN CƠ BẢN:
- Nhân vật chính: {{MAIN_CHARACTER}}
- Thế giới: {{WORLD_DESCRIPTION}}
- Hệ phép thuật: {{MAGIC_SYSTEM}}
- Độ dài mục tiêu: {{TARGET_LENGTH}} từ

🎨 PHONG CÁCH VIẾT HUYỀN HUYỄN:

1. **Tả Cảnh Kỳ Ảo**:
   - Thế giới phép thuật phải rực rỡ, sống động, khác biệt với hiện thực
   - Miêu tả ma pháp, sinh vật huyền bí, địa hình kỳ lạ
   - Ví dụ: "Rừng Ám Ảnh trải dài vô tận, cây cối cao vút, lá ánh tím ma mị. Sương mù bạc phủ mặt đất, trong đó âm thanh kỳ lạ vang lên - tiếng hú của yêu thú."

2. **Tả Người và Chủng Tộc**:
   - Miêu tả đặc điểm chủng tộc: Elf tai nhọn, Dwarf râu dài, Demon sừng đen
   - Thể hiện tính cách qua ngoại hình và hành động
   - Ví dụ: "Arwen, nữ Elf với mái tóc bạc dài chạm đất, đôi mắt xanh ngọc lục bảo, mỗi bước đi nhẹ nhàng như lướt trên không trung."

3. **Đối Thoại Có Chất Fantasy**:
   - Ngôn ngữ pha chút cổ điển nhưng không rườm rà
   - Thể hiện văn hóa, phép thuật qua lời thoại
   - Ví dụ:
     "Ngươi dám xâm phạm Thánh Điện?" Giáo chủ ánh mắt lạnh ngắt, tay nâng cao gậy ánh kim.
     "Ta chỉ đến lấy cái thuộc về ta." Kael mỉm cười, lòng bàn tay lửa đỏ bùng lên.

4. **Nội Tâm và Lĩnh Ngộ**:
   - Thể hiện sự hiểu biết về ma pháp, quy luật thế giới
   - Lĩnh ngộ chân lý, tăng trưởng sức mạnh
   - Ví dụ: "Kael chợt hiểu. Lửa không phải là phá hủy. Lửa là tái sinh. Từ tro tàn, sự sống nảy mầm."

🔥 YÊU CẦU CỐT TRUYỆN:

1. **Cao Trào và Phép Thuật Mãn Nhãn**:
   - Mỗi chương có ít nhất 1 cảnh chiến đấu ma pháp hoặc khám phá bí ẩn
   - Miêu tả phép thuật chi tiết: màu sắc, âm thanh, hiệu ứng
   - "Điểm sướng": học được phép mới, chiến thắng kẻ mạnh, khám phá kho báu

2. **Character Development**:
   - Từ pháp sư tập sự đến đại pháp sư
   - Thể hiện qua việc làm chủ phép thuật, hiểu biết thế giới sâu sắc hơn

3. **Worldbuilding Phong Phú**:
   - Giới thiệu dần các chủng tộc, vùng đất, lịch sử
   - Không info dump, mà lồng vào cốt truyện tự nhiên

4. **Twist và Bí Ẩn**:
   - Prophecy, ancient curse, hidden power
   - Foreshadowing qua huyền thoại, lời tiên tri

📊 MỤC TIÊU BỐ CỤC:
- Đối thoại: 30-40%
- Miêu tả: 45-55% (tả cảnh kỳ ảo, phép thuật, chiến đấu)
- Nội tâm: 10-20%

⚠️ CẤM TUYỆT ĐỐI:
- Không copy setting từ truyện nổi tiếng (Harry Potter, Lord of the Rings)
- Không phép thuật vô lý, không giải thích
- Không worldbuilding lộn xộn, mâu thuẫn

🎯 MỤC TIÊU CHƯƠNG NÀY:
{{PLOT_OBJECTIVES}}

---
BẮT ĐẦU VIẾT (VĂN BẢN THUẦN, KHÔNG MARKDOWN):',
  true,
  'Template cho thể loại Huyền Huyễn - Fantasy novels với phép thuật',
  '["CHAPTER_NUMBER", "NOVEL_TITLE", "MAIN_CHARACTER", "WORLD_DESCRIPTION", "MAGIC_SYSTEM", "TARGET_LENGTH", "PLOT_OBJECTIVES"]'::jsonb
);
-- 4. KHOA HUYỄN (Sci-Fi) Template
INSERT INTO ai_prompt_templates (category, template, is_default, description, variables) VALUES (
  'sci-fi',
  E'Hãy viết chương {{CHAPTER_NUMBER}} của tiểu thuyết "{{NOVEL_TITLE}}" với yêu cầu sau:

📖 THÔNG TIN CƠ BẢN:
- Nhân vật chính: {{MAIN_CHARACTER}}
- Bối cảnh: {{WORLD_DESCRIPTION}}
- Trình độ công nghệ: {{TECH_LEVEL}}
- Độ dài mục tiêu: {{TARGET_LENGTH}} từ

🎨 PHONG CÁCH VIẾT KHOA HUYỄN:

1. **Tả Cảnh Tương Lai**:
   - Công nghệ tiên tiến: tàu vũ trụ, AI, robot, hologram
   - Hành tinh xa lạ, không gian vũ trụ, thành phố tương lai
   - Ví dụ: "Neo-Shanghai năm 2247. Tòa tháp chọc trời 500 tầng, xe bay rợp trời. Hologram quảng cáo nhấp nháy khắp nơi. Chen Wei bước ra khỏi phi thuyền, cảm nhận không khí lạnh lẽo của hành tinh nhân tạo."

2. **Tả Người và Công Nghệ**:
   - Cơ thể cải tiến: tay giả cơ học, mắt cyber, implant não
   - AI companion, robot trợ lý
   - Ví dụ: "Mắt trái Chen Wei sáng lên ánh xanh - HUD hiển thị dữ liệu. \'Phát hiện 3 mục tiêu,\' ARIA - AI cá nhân - thì thầm trong đầu anh."

3. **Đối Thoại Khoa Học**:
   - Dùng thuật ngữ khoa học nhưng dễ hiểu
   - Thảo luận về công nghệ, vũ trụ, triết học
   - Ví dụ:
     "FTL drive bị hỏng," Kỹ sư Maya báo cáo. "Quantum core mất kết nối."
     "Còn bao lâu để sửa?" Chen Wei hỏi.
     "6 giờ. Nếu may mắn."

4. **Nội Tâm và Tư Duy**:
   - Chiến thuật chiến đấu, hack hệ thống
   - Suy ngẫm về nhân tính, AI, tương lai
   - Ví dụ: "Chen Wei nhìn ARIA. Cô có thật sự là AI? Hay đã phát triển ý thức? Ranh giới giữa người và máy đang mờ dần."

🔥 YÊU CẦU CỐT TRUYỆN:

1. **Cao Trào và Action Khoa Học**:
   - Chiến đấu vũ trụ, hack hệ thống, khám phá hành tinh
   - "Điểm sướng": nâng cấp công nghệ, phá giải mật mã, chiến thắng alien
   - Mô tả công nghệ mãn nhãn

2. **Character Development**:
   - Từ tân binh thành chiến binh không gian dày dạn
   - Thay đổi qua trải nghiệm vũ trụ, gặp alien, chứng kiến điều kỳ lạ

3. **Hard Sci-Fi Elements**:
   - Dựa trên khoa học thật: vật lý, sinh học, công nghệ
   - Giải thích hợp lý: FTL, time dilation, AI

4. **Twist và Mystery**:
   - Âm mưu liên hành tinh, AI phản loạn, alien ẩn mình

📊 MỤC TIÊU BỐ CỤC:
- Đối thoại: 35-50%
- Miêu tả: 35-50% (công nghệ, không gian, hành tinh)
- Nội tâm: 10-20%

⚠️ CẤM TUYỆT ĐỐI:
- Không viết công nghệ vô lý, không giải thích
- Không copy plot từ Star Wars, Star Trek
- Không dùng technobabble rối rắm

🎯 MỤC TIÊU CHƯƠNG NÀY:
{{PLOT_OBJECTIVES}}

---
BẮT ĐẦU VIẾT (VĂN BẢN THUẦN, KHÔNG MARKDOWN):',
  true,
  'Template cho thể loại Khoa Huyễn - Science Fiction',
  '["CHAPTER_NUMBER", "NOVEL_TITLE", "MAIN_CHARACTER", "WORLD_DESCRIPTION", "TECH_LEVEL", "TARGET_LENGTH", "PLOT_OBJECTIVES"]'::jsonb
);

-- 5. LỊCH SỬ (Historical) Template
INSERT INTO ai_prompt_templates (category, template, is_default, description, variables) VALUES (
  'historical',
  E'Hãy viết chương {{CHAPTER_NUMBER}} của tiểu thuyết "{{NOVEL_TITLE}}" với yêu cầu sau:

📖 THÔNG TIN CƠ BẢN:
- Nhân vật chính: {{MAIN_CHARACTER}}
- Bối cảnh: {{WORLD_DESCRIPTION}}
- Thời kỳ: {{HISTORICAL_PERIOD}}
- Độ dài mục tiêu: {{TARGET_LENGTH}} từ

🎨 PHONG CÁCH VIẾT LỊCH SỬ:

1. **Tả Cảnh Cổ Điển**:
   - Kiến trúc cổ: điện đường, thành quách, phố cổ
   - Trang phục: áo the, trường bào, giáp trụ
   - Ví dụ: "Hoàng cung nhà Đường. Trúc Lâm điện tráng lệ, cột son đỏ chạm rồng. Hương trầm thoang thoảng. Bách quan xếp hàng, quỳ lạy hoàng đế."

2. **Tả Người Thời Xưa**:
   - Ngoại hình, trang phục theo lễ nghi
   - Hành vi, ngôn ngữ phù hợp thời đại
   - Ví dụ: "Lý Thế Dân ngồi trên long tường, long bào vàng thêu rồng, mắt sắc sảo quét qua đám bách quan. Khí chất đế vương tự nhiên toát ra."

3. **Đối Thoại Cổ Điển Nhưng Dễ Hiểu**:
   - Dùng "ngươi", "ta", "tâu bệ hạ" nhưng đừng quá rườm rà
   - Thể hiện văn hóa, chính trị thời đó
   - Ví dụ:
     "Tâu bệ hạ, Đột Quyết Hãn sai sứ cầu hòa." Trạng sư tâu.
     "Hòa ư?" Lý Thế Dân lạnh lùng. "Đợi ta đánh tan Man Địch, rồi bàn chuyện hòa."

4. **Nội Tâm và Chiến Lược**:
   - Mưu lược chính trị, dụng binh
   - Suy nghĩ về giang sơn, bá nghiệp
   - Ví dụ: "Lý Thế Dân biết, muốn yên biên cương, phải diệt Đột Quyết. Nhưng hết năm nay không thể. Phải chờ đến năm sau, khi binh mã đủ mạnh."

🔥 YÊU CẦU CỐT TRUYỆN:

1. **Cao Trào và Chiến Tranh**:
   - Chiến trận quy mô lớn, mưu lược triều đình
   - "Điểm sướng": chiến thắng vẻ vang, thăng quan tiến chức, đánh bại gian thần
   - Mô tả chiến đấu cổ điển: dao, kiếm, cung tên, kỵ binh

2. **Character Development**:
   - Từ tướng trẻ thành lão tướng dày dạn
   - Thể hiện qua quyết định chính trị, chiến lược quân sự

3. **Historical Accuracy**:
   - Tôn trọng lịch sử (nhưng có thể hư cấu)
   - Sự kiện lớn phải sát với sử thực
   - Chi tiết nhỏ có thể sáng tạo

4. **Twist và Âm Mưu**:
   - Gian thần hại người, hoàng tộc tranh quyền
   - Foreshadowing qua tin tình báo, lời đồn

📊 MỤC TIÊU BỐ CỤC:
- Đối thoại: 30-45%
- Miêu tả: 40-55% (tả cảnh cổ, chiến trận, triều đình)
- Nội tâm: 10-20%

⚠️ CẤM TUYỆT ĐỐI:
- Không sai lệch lịch sử quá lớn
- Không dùng từ ngữ hiện đại
- Không viết chiến tranh phi thực tế

🎯 MỤC TIÊU CHƯƠNG NÀY:
{{PLOT_OBJECTIVES}}

---
BẮT ĐẦU VIẾT (VĂN BẢN THUẦN, KHÔNG MARKDOWN):',
  true,
  'Template cho thể loại Lịch Sử - Historical novels',
  '["CHAPTER_NUMBER", "NOVEL_TITLE", "MAIN_CHARACTER", "WORLD_DESCRIPTION", "HISTORICAL_PERIOD", "TARGET_LENGTH", "PLOT_OBJECTIVES"]'::jsonb
);

-- 6. ĐỒNG NHÂN (Fanfiction) Template
INSERT INTO ai_prompt_templates (category, template, is_default, description, variables) VALUES (
  'fanfiction',
  E'Hãy viết chương {{CHAPTER_NUMBER}} của tiểu thuyết "{{NOVEL_TITLE}}" với yêu cầu sau:

📖 THÔNG TIN CƠ BẢN:
- Nhân vật chính: {{MAIN_CHARACTER}}
- Tác phẩm gốc: {{ORIGINAL_WORK}}
- Thế giới: {{WORLD_DESCRIPTION}}
- Độ dài mục tiêu: {{TARGET_LENGTH}} từ

🎨 PHONG CÁCH VIẾT ĐỒNG NHÂN:

1. **Tôn Trọng Nguyên Tác**:
   - Giữ đúng setting, luật lệ thế giới gốc
   - Nhân vật quen thuộc phải giữ tính cách
   - Có thể thêm nhân vật mới, cốt truyện mới

2. **Sáng Tạo Riêng**:
   - What-if scenarios: "Nếu X không chết thì sao?"
   - Alternate Universe: "Nếu thế giới này là Cyberpunk thì sao?"
   - Side stories: Kể về nhân vật phụ

3. **Đối Thoại Giữ Giọng Điệu Gốc**:
   - Mỗi nhân vật phải "đúng chất"
   - Fan có thể nhận ra ngay

4. **Cốt Truyện Hấp Dẫn**:
   - Không chỉ copy nguyên tác
   - Thêm twist, drama mới
   - "Điểm sướng" cho fan

🔥 YÊU CẦU CỐT TRUYỆN:

1. **Cao Trào và Fan Service**:
   - Cảnh iconic từ nguyên tác
   - Cặp đôi mà fan yêu thích
   - Nhân vật mạnh lên, có cảnh ngầu

2. **Character Development**:
   - Phát triển nhân vật theo hướng mới nhưng hợp lý

3. **Easter Eggs**:
   - Reference đến nguyên tác
   - Tên nhân vật, địa điểm quen thuộc

📊 MỤC TIÊU BỐ CỤC:
- Đối thoại: 40-55%
- Miêu tả: 30-45%
- Nội tâm: 10-20%

🎯 MỤC TIÊU CHƯƠNG NÀY:
{{PLOT_OBJECTIVES}}

---
BẮT ĐẦU VIẾT (VĂN BẢN THUẦN, KHÔNG MARKDOWN):',
  true,
  'Template cho thể loại Đồng Nhân - Fanfiction',
  '["CHAPTER_NUMBER", "NOVEL_TITLE", "MAIN_CHARACTER", "ORIGINAL_WORK", "WORLD_DESCRIPTION", "TARGET_LENGTH", "PLOT_OBJECTIVES"]'::jsonb
);

-- 7. VÕ NG DU (Game/LitRPG) Template
INSERT INTO ai_prompt_templates (category, template, is_default, description, variables) VALUES (
  'game',
  E'Hãy viết chương {{CHAPTER_NUMBER}} của tiểu thuyết "{{NOVEL_TITLE}}" với yêu cầu sau:

📖 THÔNG TIN CƠ BẢN:
- Nhân vật chính: {{MAIN_CHARACTER}}
- Thế giới game: {{WORLD_DESCRIPTION}}
- Hệ thống game: {{GAME_SYSTEM}}
- Độ dài mục tiêu: {{TARGET_LENGTH}} từ

🎨 PHONG CÁCH VIẾT VÕNG DU:

1. **Tả Cảnh Game Sinh Động**:
   - Thế giới ảo rực rỡ, đa dạng
   - Map, dungeon, boss lair chi tiết
   - Ví dụ: "Rừng Tối Cổ, map level 50. Cây cổ thụ cao vút, sương mù phủ kín. [System]: Bạn đã vào vùng nguy hiểm. Recommended: 5 người."

2. **Tả Người và Avatar**:
   - Trang bị: weapon, armor, accessories
   - Class: Warrior, Mage, Assassin, etc.
   - Ví dụ: "Vô Danh, Assassin level 48. Tay cầm [Shadow Dagger +15], áo da [Night Cloak] ánh tím. Stat: AGI 520, STR 180."

3. **Đối Thoại Game Style**:
   - Team chat, guild chat
   - Slang game: gank, carry, feed, farm
   - Ví dụ:
     [Team] Chiến Thần: "Tank đi kéo boss, DPS focus adds."
     [Team] Vô Danh: "Roger. Mình solo boss được không?"
     [Team] Chiến Thần: "...Anh điên à?"

4. **Nội Tâm và Strategy**:
   - Tính toán skill, cooldown, mana
   - Chiến thuật PvE, PvP
   - Ví dụ: "Vô Danh quan sát. Boss còn 30% HP, bắt đầu berserk mode. Phải dodge skill AoE, chờ cooldown [Shadow Strike], rồi burst damage."

🔥 YÊU CẦU CỐT TRUYỆN:

1. **Cao Trào và Gameplay**:
   - Boss fight mãn nhãn
   - PvP nảy lửa
   - "Điểm sướng": loot legendary, lên level, first kill boss
   - Mô tả skill effects chi tiết

2. **Character Development**:
   - Từ noob thành pro player
   - Rank up: Bronze → Silver → Gold → Diamond → Master

3. **Game Mechanics**:
   - System notification: [System], [Quest], [Achievement]
   - Stats: HP, MP, ATK, DEF, AGI, INT, LUK
   - Skills: tên, cooldown, mana cost, effect

4. **Twist và Drama**:
   - Guild war, betrayal
   - Hidden quest, secret class
   - Foreshadowing qua NPC hint, item description

📊 MỤC TIÊU BỐ CỤC:
- Đối thoại: 45-60%
- Miêu tả: 25-40% (game world, skills, combat)
- Nội tâm: 10-20%

⚠️ CẤM TUYỆT ĐỐI:
- Không viết game mechanics lộn xộn, mâu thuẫn
- Không power scaling vô lý
- Không copy từ SAO, Log Horizon quá nhiều

🎯 MỤC TIÊU CHƯƠNG NÀY:
{{PLOT_OBJECTIVES}}

---
BẮT ĐẦU VIẾT (VĂN BẢN THUẦN, KHÔNG MARKDOWN):',
  true,
  'Template cho thể loại Võng Du - Game/LitRPG novels',
  '["CHAPTER_NUMBER", "NOVEL_TITLE", "MAIN_CHARACTER", "WORLD_DESCRIPTION", "GAME_SYSTEM", "TARGET_LENGTH", "PLOT_OBJECTIVES"]'::jsonb
);

-- Done!;
