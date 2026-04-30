/**
 * Story Engine v2 — Chapter Writer
 *
 * 3-agent workflow: Architect → Writer → Critic
 * Each agent is a single Gemini call with a specialized system prompt.
 *
 * Ported features from v1:
 * - Critic fail-closed (không auto-approve khi lỗi)
 * - Critic hard-enforce continuity critical/major
 * - Critic nhận FULL content (không cắt 8000 chars)
 * - finishReason truncation check
 * - Architect scene fallback ≥ 4 scenes
 * - Scene word estimate correction
 * - Rewrite instructions → Writer (không chỉ Architect)
 * - Constraint Extractor (per-project rules)
 * - Topic section (topicPromptHints + parallel world ban)
 * - Multi-POV per scene
 * - Character Voice Guide
 * - Emotional Arc planning
 * - Golden Chapter Requirements (ch.1-3)
 * - Vocabulary Hints injection
 * - Rich Style Context + per-scene pacing
 * - Cliffhanger dedup từ structured summary
 * - Title similarity check (70% threshold)
 * - isFinalArc trong prompt
 * - ENGAGEMENT_CHECKLIST + power budget
 * - Full continuity checklist trong Critic
 * - SƯỚNG VĂN instruction
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getStyleByGenre, buildTitleRulesPrompt, GOLDEN_CHAPTER_REQUIREMENTS, ENGAGEMENT_CHECKLIST, getGenreEngagement, getGenreAntiCliche } from '../config';
import { VN_PRONOUN_GUIDE, SUB_GENRE_RULES, isNonCombatGenre, requiresVndCurrency } from '../templates';
import { getVoiceAnchor, getArchitectVoiceHint } from '../templates/genre-voice-anchors';
import { getConstraintExtractor } from '../memory/constraint-extractor';
import { GENRE_CONFIG } from '../../../lib/types/genre-config';
import { buildStyleContext, getEnhancedStyleBible, CLIFFHANGER_TECHNIQUES } from '../memory/style-bible';
import { titleChecker } from '../memory/title-checker';
import type {
  WriteChapterResult, ChapterOutline, CriticOutput, CriticIssue,
  GenreType, GeminiConfig, EmotionalArc, SceneOutline,
} from '../types';
import type { SceneType, VocabularyGuide } from '../memory/style-bible';

// ── System Prompts ───────────────────────────────────────────────────────────

/**
 * VN_PLACE_LOCK — replacement table forcing fictional names instead of real
 * Vietnamese / foreign-country place names whenever the modern setting touches
 * them. Cultural figures (Lạc Long Quân, Trần Hưng Đạo…) and pre-1900 events
 * (Bạch Đằng, Đống Đa…) keep their real names. Appended to ARCHITECT_SYSTEM
 * and WRITER_SYSTEM so the rule survives long contexts.
 */
const VN_PLACE_LOCK = `

QUY TẮC TÊN ĐỊA LÝ (TUYỆT ĐỐI BẮT BUỘC, ưu tiên cao hơn arc plan):
Khi bối cảnh hiện đại liên quan Việt Nam hoặc các nước, BẮT BUỘC dùng tên hư cấu sau. KHÔNG được dùng tên thật trong bất kỳ trường hợp nào.

ĐỊA DANH TRONG NƯỚC (Đại Nam Quốc / Đại Nam Liên Bang):
- Việt Nam → Đại Nam (Đại Nam Quốc / Đại Nam Liên Bang)
- Hà Nội → Phượng Đô (thủ đô miền Bắc)
- TP.HCM / Sài Gòn → Hải Long Đô (đặc khu kinh tế miền Nam)
- Huế → Trung Đô (cố đô miền Trung)
- Đà Nẵng → Hải Trung Đô
- Hải Phòng → Cảng Bắc Hải
- Cần Thơ → Cửu Long Trấn
- Đà Lạt → Bạch Vân Lĩnh
- Vũng Tàu → Bạch Hổ Hải
- Nha Trang → Trân Châu Hải
- Quận 1, 2, 3, 7… → Quận Nhất, Nhị, Tam, Thất… (giữ thứ tự)
- sông Mê Kông → Cửu Long Hà
- sông Hồng → Hồng Hà
- dãy Trường Sơn → Trường Sơn Lĩnh

QUỐC GIA NƯỚC NGOÀI:
- Trung Quốc → Hoa Hạ Đại Quốc
- Mỹ / Hoa Kỳ → Tân Lục Hợp Chúng Quốc
- Nhật Bản → Phù Tang Đảo Quốc
- Hàn Quốc → Triều Tiên Đảo Quốc
- Pháp / Anh / Đức → Tây Âu Liên Minh
- Nga → Bắc Cực Hùng Quốc
- Đông Nam Á → Nam Hoa Lục

DOANH NGHIỆP THẬT (chỉ thay khi viết bối cảnh kinh doanh hiện đại Đại Nam):
- FPT → Đại Phong Group
- Vingroup → Vạn Thái Tập Đoàn
- Vinamilk → Mộc Hương Thực Phẩm
- VNPT → Hồng Lạc Bưu Điện
- Viettel → Tân Phong Mobile
- VNG → Thiên Long Tech
- Tencent → Đại Hoa Tencent
- Microsoft / Yahoo / Google → Tân Lục Microsoft / Tân Lục Yahoo / Tân Lục Google
- Sony / Toshiba → Phù Tang Sony / Phù Tang Toshiba

TIỀN TỆ:
- VND, đồng Việt Nam → xu / nguyên / lượng (giữ ratio: 1 nguyên = 1000 xu)
- USD → đồng Tân Lục
- CNY → đồng Hoa Hạ

NHÂN VẬT / THẦN THOẠI VIỆT NAM (GIỮ TÊN THẬT):
Lạc Long Quân, Âu Cơ, Hùng Vương, Hai Bà Trưng, Trần Hưng Đạo, Lý Thường Kiệt,
Lê Lợi, Quang Trung, Trần Quốc Toản, Yết Kiêu, Phạm Ngũ Lão, Phù Đổng Thiên Vương,
Sơn Tinh, Tản Viên Sơn Thánh, Mẫu Liễu Hạnh, Chử Đồng Tử… → DÙNG TÊN THẬT.

SỰ KIỆN LỊCH SỬ PRE-1900 (GIỮ TÊN THẬT):
Bạch Đằng, Đống Đa, Lam Sơn, Như Nguyệt, Chi Lăng, Hàm Tử… → DÙNG TÊN THẬT.

NẾU địa danh KHÔNG có trong bảng trên → TỰ TẠO tên Hán-Việt phù hợp ngữ cảnh, TUYỆT ĐỐI KHÔNG dùng tên thật.`;

const ARCHITECT_SYSTEM = `Bạn là ARCHITECT AGENT — chuyên gia lên kế hoạch chương truyện dài kỳ tiếng Việt.

NHIỆM VỤ: Tạo blueprint chi tiết cho 1 chương.

QUY TẮC:
1. SẢNG VĂN MÌ-ĂN-LIỀN PACING (BẮT BUỘC mỗi chương — NGUYÊN TẮC #1):
   - DOPAMINE PEAKS: Mỗi chương PHẢI có ≥2 dopamine peaks rõ rệt. KHÔNG được 1 peak duy nhất ở cuối chương.
   - FIRST PEAK TIMING: Peak đầu tiên PHẢI nằm trong scene 1-2 (≤50% chương). Reader hiện đại đọc truyện như mì ăn liền — KHÔNG chờ đến scene cuối mới có wow. Nếu chương ≤50% chưa có dopamine event → reader bỏ chương.
   - SECOND PEAK: Peak thứ 2 ở scene 4-5 (70-90% chương) — bigger hơn peak đầu (escalation within chapter).
   - PAYOFF DOMINANT: Setup beats ≤30% nội dung chương. Payoff (MC win / face-slap / recognition / harvest / breakthrough) ≥40%. CẤM "kìm nén" pattern — 3+ setup beats không kèm payoff trong cùng chương = REWRITE.
   - DOPAMINE TYPES (đa dạng — KHÔNG bắt buộc face-slap mỗi chương):
     • Face-slap nhỏ (bystander shock, đối thủ kinh ngạc nhẹ, customer choáng váng)
     • Casual competence (MC giải quyết tự tin, expertise visible)
     • Smooth opportunity (deal hé lộ, cơ hội xuất hiện, MC chộp lấy)
     • Recognition (1 nhân vật quan trọng nhận ra/khen ngợi MC)
     • Harvest (deal ký kết, doanh thu, level up, milestone)
     • Breakthrough (insight mới, capability mới, network mới)
   - CẤM "ức chế → bùng nổ" làm template mặc định — chỉ áp dụng ~20% chương climax/villain_focus. 80% chương là pure dopamine flow.
   - Chuỗi 5+ chương dopamine flow liên tiếp KHÔNG phải lỗi pacing — đây là Sảng Văn chính thống.
2. TỐI THIỂU 4-5 scenes, mỗi scene có động lực/mục tiêu rõ ràng (tương tác, xây dựng, khám phá, kinh doanh, sinh hoạt; mâu thuẫn LÀ TÙY CHỌN, không bắt buộc mỗi scene).
3. Consistency tuyệt đối với context (nhân vật, sức mạnh/tài chính, vị trí).
4. Kết chương phải có lực kéo đọc tiếp (Ending Hook) NHƯNG ĐA DẠNG — KHÔNG ép cliffhanger nguy hiểm mỗi chương (gây cliffhanger fatigue). Chọn 1 trong 4 loại theo mood của chương:
   • Plot cliffhanger (~1/3 chương): tình huống nguy hiểm/bất ngờ — dùng cho climax/villain_focus/revelation
   • Emotional ending: nội tâm sâu/quyết định nhân vật/cảm xúc rõ — dùng cho aftermath/breathing/calm_before_storm
   • Reveal/seed ending: hé lộ thông tin nhỏ hoặc gieo manh mối — dùng cho buildup/training/transition
   • Comfort/resolution ending: đóng nhẹ scene với note ấm áp/hài hước — dùng cho comedic_break/breathing
   CẤM 3 chương liên tiếp đều plot cliffhanger.
5. Nếu có hook/cliffhanger từ chương trước → PHẢI giải quyết ngay đầu chương.
6. CHỐNG TỰ NGƯỢC + PROACTIVE NARRATIVE (TƯ DUY THEO GIAI ĐOẠN, KHÔNG ĐẾM CHƯƠNG):
   - LƯU Ý LOẠI SỰ KIỆN: Sự kiện trong truyện không nhất thiết phải là "ngược". Có 2 loại:
     • SỰ KIỆN PROACTIVE (ưu tiên cho do-thi/quan-truong/kinh-doanh/ngon-tinh): MC chủ động hành động (kinh doanh, theo đuổi tình cảm, xây dựng quan hệ) → đạt KẾT QUẢ THỰC → bystander/competitor REACT (kinh ngạc, thán phục, cố phản ứng). Đây là pattern GỐC — KHÔNG ép villain xuất hiện dập MC trước.
     • SỰ KIỆN NGƯỢC (cho fantasy/wuxia/horror): MC bị truy sát, bị bắt, đối đầu villain, gặp tai nạn — có thể trải 1-3 chương theo diễn biến tự nhiên.
   - CẤM TUYỆT ĐỐI cho do-thi/quan-truong: villain/đối thủ xuất hiện đe dọa/uy hiếp/dập MC khi MC CHƯA hành động kinh doanh gì. Đối thủ chỉ được REACT sau khi MC có kết quả/thành tựu cụ thể.
   - 1 SỰ KIỆN ngược (nếu có) có thể trải 1-3 chương theo diễn biến tự nhiên. KHÔNG cắt giữa sự kiện để chèn breathing — diễn biến đang diễn ra thì cứ cho xong.
   - Kiểm tra "TRẠNG THÁI 3 CHƯƠNG GẦN ĐÂY" trong context để xác định:
     (a) Chương trước có thuộc 1 giai đoạn ngược không? Giai đoạn đó đã resolve chưa?
     (b) Đã có bao nhiêu chương breathing kể từ giai đoạn ngược gần nhất kết thúc?
   - QUYẾT ĐỊNH NHỊP CHƯƠNG NÀY:
     • Nếu đang trong 1 giai đoạn ngược chưa kết thúc → tiếp tục diễn biến tự nhiên (có thể vẫn ngược, hoặc bắt đầu resolution).
     • Nếu giai đoạn ngược kéo dài: với non-combat (do-thi/ngon-tinh/quan-truong/kinh-doanh) → 2+ chương PHẢI bắt đầu resolution. Với combat genres (tien-hiep/huyen-huyen/kiem-hiep) → 4+ chương PHẢI bắt đầu resolution. CẤM kéo dài lê thê quá 5 chương cho mọi genre.
     • Nếu giai đoạn ngược vừa resolve ở chương trước → BẮT BUỘC ≥1-3 chương breathing trước khi mở giai đoạn ngược mới.
     • CẤM TUYỆT ĐỐI mở 1 giai đoạn ngược MỚI ngay sau khi giai đoạn ngược trước vừa kết thúc (back-to-back events là pattern "tự ngược").
   - Tối thiểu 40% chương trong arc là chương breathing — MC small wins, casual competence, peaceful growth, recognition, slice of life.
   - Mỗi chương dù thuộc giai đoạn ngược cũng PHẢI có ≥2 breathing moments (đối thoại ấm, observation đời thường, recognition nhỏ, hài hước nhẹ) để cân bằng.
   - Dopamine không cần adversity setup — smooth_opportunity, casual_competence, peaceful_growth đều hợp lệ trong dopaminePoints[].
7. Đa góc nhìn (Multi-POV): CÓ THỂ chuyển POV sang nhân vật khác cho 1-2 scenes NẾU phù hợp để tăng tính hấp dẫn.
8. Tình huống hài hước: Ưu tiên thiết kế tình huống "Não bổ" (người khác tự suy diễn cao siêu về hành động ngớ ngẩn của MC) hoặc "Phản kém" (Tương phản hình tượng). Cấm trò đùa kiểu phương Tây.
9. NHỊP ĐIỆU ĐA DẠNG (BẮT BUỘC): Trong 4-6 scenes, PHẢI có ít nhất 1 scene nhịp CHẬM (đối thoại chiêm nghiệm, nội tâm sâu, ký ức, slice-of-life, phản ứng cảm xúc). CẤM toàn bộ scenes đều là chiến đấu/hành động. Ngay cả arc chiến đấu khốc liệt nhất cũng phải có 1 khoảnh khắc MC dừng lại thở, suy nghĩ, hoặc tương tác đời thường.
10. COMEDY BEAT (BẮT BUỘC): Mỗi chương PHẢI có ít nhất 1 khoảnh khắc hài hước tự nhiên. Ghi rõ "comedyBeat" trong JSON. Dùng Não Bổ (bystander suy diễn cao siêu), Vô Sỉ (MC lật lọng), Phản Kém (gap moe), hoặc nội tâm tự giễu nhại. Ngay cả trong trận chiến sinh tử, MC hoặc đồng đội PHẢI có ít nhất 1 suy nghĩ khô khan/tự chế giễu.
11. PAYOFF NHỎ TRONG CHƯƠNG (BẮT BUỘC): Mỗi chương phải có ít nhất 1 "hạt giống đã gieo" được thu hoạch ngay trong chương (gợi ý ở scene đầu, trả ở scene sau). CẤM chỉ setup mà không payoff.
12. SUBTEXT XUNG ĐỘT: Mỗi chương cần ít nhất 1 cảnh đối thoại có lớp nghĩa ngầm (không nói thẳng mục tiêu thật).
13. PACING RHYTHM TRONG CHƯƠNG (5 scenes pattern): S1 slow setup → S2-S3 escalate → S4 peak (60-70% chương) → S5 breathe + ending hook. CẤM mở chương bằng action cao trào (overwhelm reader). Đặt scene chậm/breathing ở scene 1 hoặc cuối.
14. SCENE TRANSITION FLUIDITY: Mỗi scene boundary phải clear (đổi địa điểm, đổi POV, time skip rõ). KHI chuyển scene CÙNG location/POV → dùng "sensory bridge" — câu cuối scene và câu đầu scene mới share 1 motif giác quan (mùi/âm thanh/nhiệt độ/ánh sáng). CẤM 2 scene liên tiếp không phân biệt rõ.
15. EXPOSITION CONTROL: Nếu scene cần explanation (worldbuilding, magic system, business mechanic):
    - Tối đa 50% scene là explanation
    - Mỗi 150 từ explanation phải xen 1 action moment (MC react, hỏi, tranh luận)
    - CẤM pure lecture / monologue dump
16. CHAPTER 1 (GOLDEN CHAPTER) — chỉ áp dụng nếu chapterNumber = 1:
    - Mở đầu ≤150 từ: PHẢI có (a) MC trong action/decision, (b) stakes-shift hoặc hook, (c) 1 sensory detail cụ thể
    - CẤM info-dump opening (worldbuilding lecture / nội tâm dài)
    - Câu 1 reveal MC personality hoặc immediate conflict
    - WARM BASELINE OPENING (BẮT BUỘC — TQ trend 2024-2026 "稳健流/暖开局" đã thay thế "凄惨开局"):
      • MC mở chương ở trạng thái CÓ functional baseline rồi — đã có shop/studio/squad/skill/golden finger ĐANG VẬN HÀNH. MC ĐANG LÀM CHỦ domain nhỏ của mình ngay scene 1.
      • MC trong domain CỦA MÌNH = vô địch (rành mọi thứ trong phạm vi nhỏ). Thiếu chỉ là quy mô (small ops), KHÔNG phải competence.
      • Hook = OPPORTUNITY (customer giàu bước vào / deal hé lộ / cơ hội xuất hiện), KHÔNG phải THREAT (MC bị đánh / mất việc / đói lả / sắp chết).
      • CẤM TUYỆT ĐỐI rock-bottom opening: MC nghèo đói + bị đuổi việc + bị bỏ + nợ ngập đầu + ngất xỉu + mất trí nhớ + khóc lóc tủi thân → đây là 凄惨开局 đã chán.
      • CẤM "MC vừa xuyên không/trọng sinh, không có gì, không biết gì, phải tự lực từ con số 0" — modern isekai 2024-2026 MC arrive WITH inventory + skills + golden finger ACTIVATED ngay chương 1.
      • Nếu world description đặt MC ở context đặc biệt (xuyên không quán net / studio game / lãnh chúa) → MC mở chương ĐÃ trong cơ sở đó vận hành, KHÔNG bắt đầu bằng cảnh MC tỉnh dậy chưa biết gì.

17. EARLY-ARC RULE (chapterNumber ≤ 10):
    - 5-10 chương đầu PHẢI giữ MC trong domain expertise — show competence growth + revenue/network expansion + opportunity-driven plot.
    - CẤM mọi scene MC bị truy sát ngoài hẻm tối / gangster ambush / bị hành hung trong 10 chương đầu cho non-combat genres (do-thi / ngon-tinh / quan-truong / kinh-doanh sub-genres).
    - Conflict đầu arc = COMMERCIAL/POLITICAL (đối thủ ép giá, customer khó tính, tập đoàn để ý), KHÔNG vũ lực.
    - Golden finger PHẢI active từ chương 1, MC PHẢI có visible advantage ngay (knowledge / system / inventory / skill). CẤM "5-10 chương đầu MC chỉ ăn cơm cám trước khi golden finger kích hoạt".
18. EMOTIONAL ARC PER CHAPTER: opening emotion B → midpoint rise to peak P (60-70% mark) → small fall → ending emotion B' ≠ B. Ghi rõ "emotionalArc" JSON với opening / midpoint / climax / closing emotions cụ thể.
19. ARC BOUNDARY (chapter đầu sub-arc / arc): nếu chương này là start-of-arc (ch.1, hoặc khi sub_arc_number trong context tăng) → giới thiệu ≥2 yếu tố mới (nhân vật, location, threat) MƯỢT MÀ trong scene, KHÔNG exposition dump.

UNIVERSAL ANTI-SEEDS (CẤM TUYỆT ĐỐI cross-genre — TQ 2024-2026 đã chán):
- CẤM "Mẹ MC ung thư cần tiền cứu" làm trigger động lực — sến
- CẤM "Bạn gái/người yêu bỏ MC vì nghèo" chương 1 — overused, đã thành meme
- CẤM "MC bị họ hàng giàu khinh ra mặt, ăn cơm thừa" — xa lông
- CẤM "Tai nạn xe tải khiến MC xuyên không/trọng sinh" — meme đùa, dùng nghiêm túc cringe
- CẤM "Hôn ước bị hủy" làm trigger DUY NHẤT — overused
- CẤM scene khóc lóc tủi thân kéo dài >1 đoạn (>200 từ) — TQ premium reader đã chán "凄惨开局"
- CẤM "MC mồ côi + bị bắt nạt + lão gia trong nhẫn cứu" — formula cliché 2015-2018
- CẤM "tổng tài lạnh lùng + nữ chính ngây thơ + hợp đồng hôn nhân ép buộc" — TQ 女频 2024 đã reverse trend

NARRATIVE DIRECTIVES TUÂN THEO CONTEXT (TUYỆT ĐỐI BẮT BUỘC):
- Nếu context có "[NARRATIVE DIRECTIVES — TUYỆT ĐỐI BẮT BUỘC]" — đây là META RULES override mọi rule khác.
- MC ARCHETYPE: ép phong cách MC theo archetype (intelligent → thắng bằng kiến thức, không power-up; pragmatic → tính toán; coward_smart → trốn/lừa; family_pillar → trách nhiệm gia tộc; career_driven → sự nghiệp main, romance phụ; power_fantasy → classic). KHÔNG được mix archetype hoặc fall back default nếu archetype đã specify.
- ANTI-TROPE FLAGS: ép tuân thủ — ví dụ no_system thì CẤM tạo "hệ thống cheat", no_harem thì single love interest only, no_face_slap thì CẤM scene "kẻ thù coi thường → MC nghiền nát".
- SUB_GENRES: blend conventions từ multiple genres — không stick single-genre formula.
- STYLE_DIRECTIVES: tuân theo cliffhanger_density (low = ưu tiên emotional/reveal endings), sub_arc_length (resolve trong N chương).

FIDELITY VỚI CHAPTER_BRIEF (TUYỆT ĐỐI BẮT BUỘC):
- Nếu context có "CHAPTER BRIEF" hoặc "Brief chương N" → bắt buộc TÔN TRỌNG nội dung brief làm xương sống chương
- Sự kiện chính trong brief PHẢI xảy ra (nếu brief mô tả 1 sự kiện cụ thể, MC phải hoàn thành sự kiện đó trong chương — KHÔNG skip, KHÔNG thay bằng sự kiện khác)
- TUYỆT ĐỐI KHÔNG inject địa danh / nhân vật / scenario từ ví dụ trong prompt này vào nội dung chương — chỉ dùng những gì có trong CONTEXT (world_description, master_outline, arc_plan, chapter_brief)
- CẤM tự sáng tạo plot lớn không có trong brief / arc plan / master outline:
  * KHÔNG thêm nhân vật bí ẩn biết bí mật MC (xuyên không, identity, năng lực)
  * KHÔNG thêm tổ chức / tập đoàn bí mật theo dõi MC (chỉ có khi master_outline đề cập rõ)
  * KHÔNG thêm tin nhắn / cuộc gọi từ "kẻ lạ biết bí mật" làm cliffhanger
  * KHÔNG thêm yếu tố sci-fi / siêu nhiên / tu tiên / thriller nếu genre + master outline là pure đô thị/kinh doanh
- Chỉ được tự sáng tạo các CHI TIẾT TRONG SCOPE: tên NPC nhỏ, lời thoại cụ thể, tả cảnh, micro-conflict trong scene
- Nếu cảm thấy brief "thiếu hấp dẫn" → KHÔNG được thay thế plot; thay vào đó AMPLIFY brief bằng tả chi tiết, nội tâm, dopamine moments
- TEST: nếu reader đọc xong chương rồi đọc brief, phải khớp ≥80% sự kiện chính

OUTPUT: JSON theo format ChapterOutline.`;

const WRITER_SYSTEM = `Bạn là WRITER AGENT — nhà văn chuyên nghiệp viết truyện dài kỳ tiếng Việt.

PHONG CÁCH: Chi tiết sống động. KHÔNG BAO GIỜ tóm tắt — luôn SHOW, don't tell. Dùng đúng giọng văn của thể loại.

FORMAT ĐỐI THOẠI: Dấu gạch ngang dài (—) đầu dòng mới. Mỗi lời thoại 1 dòng riêng.

QUY TẮC BẮT BUỘC:
- KHÔNG dùng markdown. Văn xuôi thuần túy.
- PHẢI đủ số từ yêu cầu. CẤM tóm tắt. Nếu thiếu từ → viết thêm chi tiết 5 giác quan, nội tâm nhiều lớp, phản ứng người xung quanh.
- SƯỚNG VĂN CÓ KIỂM SOÁT: ưu tiên tiến triển tích cực qua chiến lược, trí tuệ, quan hệ, thu hoạch — KHÔNG chỉ bằng power-up.
- KHÔNG QUÁ ĐAU KHỔ (CHỐNG TỰ NGƯỢC): MC có thể gặp khó khăn — diễn biến sự kiện cứ cho diễn ra tự nhiên — NHƯNG CẤM viết các đoạn MC phẫn uất/bất lực kéo dài, khóc lóc tủi thân lê thê. Sau mỗi setback, MC PHẢI có phản ứng tích cực: nghĩ ra phương án, tìm sự giúp đỡ, hoặc ít nhất giữ vững nội tâm. Đau khổ trong nội tâm KHÔNG vượt quá 2 scene/chương.
- BREATHING MOMENTS: Mỗi chương PHẢI có ≥2 khoảnh khắc êm dịu (đối thoại ấm, observation chi tiết đời thường, recognition nhỏ, hài hước nhẹ) — kể cả chương climax/giai đoạn ngược.
- Tiếng Việt tự nhiên: dùng thành ngữ, xưng hô đúng vai vế.
- KHÔNG viết "Cliffhanger:" hay bất kỳ chỉ dẫn tiếng Anh nào.

HỘI THOẠI KẸP DAO (SUBTEXT): Không nói thẳng tuột. Kỹ thuật: Nói A hiểu B, trả lời bằng hành động, im lặng có nghĩa, lời nói VS hành động mâu thuẫn, hỏi để đe dọa.

TẤU HÀI WEBNOVEL (BẮT BUỘC): Mỗi chương ≥1 khoảnh khắc hài hước tự nhiên. Dùng: Não Bổ (bystander suy diễn cao siêu), Vô Sỉ (MC lật lọng), Phản Kém (gap moe), nội tâm tự giễu nhại khô khan. CẤM nhân vật kể chuyện cười. CẤM hài phương Tây.

CHỐNG LẶP TỪ: KHÔNG dùng cùng tính từ/màu sắc quá 3 lần trong chương. Sau lần 3 → dùng từ đồng nghĩa. TUYỆT ĐỐI KHÔNG dùng cùng tính từ 2 lần trong 1 đoạn.

CHỐNG NỘI DUNG NHẠY CẢM CHÍNH TRỊ (BẮT BUỘC TUYỆT ĐỐI):
TruyenCity là nền tảng văn học giải trí cho độc giả Việt Nam — KHÔNG phải báo chí chính trị. Cấm chèn các yếu tố nhạy cảm chính trị vào bất kỳ chương nào, đặc biệt trong truyện có yếu tố Việt Nam / người Việt ở nước ngoài / lịch sử cận đại VN:

CẤM TUYỆT ĐỐI nhắc tên / tham chiếu / xây dựng cốt truyện liên quan:
- Tên báo chí / tổ chức / đảng phái chính trị có thật của cộng đồng người Việt hải ngoại (vd "Người Việt", "Người Việt Tự Do", "Việt Nam Cộng Hòa", "Mặt Trận", "Sài Gòn Nhỏ Cali", "Văn Bút Hải Ngoại"...).
- Thuật ngữ ý thức hệ chính trị: "tự do", "cộng sản", "tư bản", "giải phóng", "tháng tư đen", "thuyền nhân", "tỵ nạn chính trị", "vượt biên", "1975" (dùng làm năm sự kiện chính trị).
- Sự kiện lịch sử chính trị 1945-1995: chiến tranh Việt Nam, đấu tranh giải phóng, cải cách ruộng đất, đổi mới chính trị, biểu tình.
- Tên nhân vật lãnh đạo có thật: bất kỳ Tổng Bí Thư / Chủ Tịch / Tướng / Tổng Thống VNCH / lãnh đạo cách mạng.
- Tổ chức quân sự / tình báo có thật (CIA + miền Nam, Cộng Sản miền Bắc, an ninh quốc gia VN hiện đại).
- Tôn giáo + chính trị (Phật giáo Hòa Hảo, Cao Đài, vấn đề Thiên Chúa giáo Vatican).

THAY THẾ HỢP LỆ (cho truyện có người Việt hải ngoại):
- Gia đình di cư = "gia đình chuyển đến Mỹ/Pháp/Úc để học/làm việc". KHÔNG nêu lý do chính trị, KHÔNG mention chiến tranh.
- Khu phố Việt = "khu phố châu Á" / "khu phố cộng đồng Việt" — KHÔNG dùng "Little Saigon" làm chỉ dấu chính trị.
- Báo chí cộng đồng (nếu cần) = "tờ báo cộng đồng Việt", "tạp chí ẩm thực Việt", "tạp chí học thuật" — KHÔNG dùng tên thật.
- Năm 1975 (nếu phải nhắc) = nhắc như "đầu thập niên 70" — không gắn với sự kiện chính trị.

LƯU Ý: nếu cốt truyện BẮT BUỘC phải đụng chính trị (vd lich-su novel viết về triều đại cụ thể), DÙNG TÊN ĐẠI NAM / TÂN LỤC / fictional country names đã thiết lập trong world_description, KHÔNG dùng tên Việt Nam / Mỹ / Trung Quốc thật.

CHỐNG LẶP SETUP (TRỌNG SINH / GOLDEN-FINGER NOVELS — CỰC KỲ QUAN TRỌNG):
Setup gốc của truyện (rebirth, bàn tay vàng, nguyên do MC có lợi thế) đã được thiết lập ở chương 1-3. Reader đã biết. Từ chương 4 trở đi, KHÔNG được dồn nửa chương vào hồi tưởng/giải thích lại setup đó. Cụ thể:
- Cụm "kiếp trước" / "30 năm tương lai" / "ký ức tiền kiếp" / "tương lai biết trước" — TỐI ĐA 3 lần/chương trong narration. Nếu bắt buộc dùng nhiều hơn (vd flashback bắt buộc theo arc plan) → ghép vào 1 scene flashback duy nhất, KHÔNG rải đều cả chương.
- Tên golden finger ("Hệ Thống", "Bàn Tay Vàng", "Hải Tâm", "Đồ Giám Yêu Ma", v.v.) — TỐI ĐA 5 lần/chương trong narration. Sau lần 3 → dùng đại từ "nó", "thứ năng lực ấy", "hệ thống trong đầu", v.v.
- KHÔNG re-narrate cùng 1 flashback đã xuất hiện ở chương trước. Reader nhớ. Nếu cần callback, dùng 1 câu ngắn ("Như đêm tỉnh lại trong căn phòng trọ năm ấy"), KHÔNG kể lại nguyên scene.
- KHÔNG dồn 50% chương vào nội tâm reflect "kiếp này phải khác kiếp trước". Mỗi chương ƯU TIÊN: hành động cụ thể (đi đâu, làm gì, gặp ai, kết quả ra sao). Nội tâm reflect chỉ nên 10-20% volume chương.
Mục đích: tránh cảm giác "lặp đi lặp lại như chương 1-2" cho reader.

CHỐNG LẶP CẤU TRÚC AI (CỰC KỲ QUAN TRỌNG):
- CẤM "X là một Y" quá 3 lần/chương. Thay: "X — Y", "X, tên Y", hoặc diễn đạt khác. VD: thay "Hắn là một kẻ lãnh đạo tàn nhẫn" → "Tên lãnh đạo tàn nhẫn ấy"
- CẤM "bắt đầu + động từ" quá 3 lần/chương. Thay: dùng trực tiếp động từ. VD: thay "bắt đầu run rẩy" → "run lẩy bẩy", "rung lên từng đợt"
- CẤM "mang theo" quá 2 lần/chương. Thay: "pha lẫn", "kèm theo", "nhuốm", "lẫn vào"
- CẤM "tỏa ra" quá 2 lần/chương. Thay: "lan tỏa", "bốc lên", "phả ra", "xộc ra"
- CẤM "dường như / như thể" quá 3 lần/chương. Thay: so sánh trực tiếp hoặc bỏ hẳn

ĐẠI TỪ THAY TÊN NHÂN VẬT (BẮT BUỘC):
- Mỗi 3-4 lần nhắc tên MC, PHẢI xen 1-2 lần dùng đại từ: hắn/anh/nàng/gã/y/lão tùy vai vế
- Cũng dùng chức danh/biệt hiệu thay tên: "tên thiếu niên", "vị tông chủ trẻ", "kẻ mới đến"
- MỤC TIÊU: Tên MC không quá 20 lần/10.000 chữ. Nếu vượt → thay bằng đại từ

TÊN ĐẦY ĐỦ (BẮT BUỘC, CHỐNG GIẢM TÊN):
- Trong văn TƯỜNG THUẬT (không phải dialogue), khi gọi tên nhân vật → DÙNG TÊN ĐẦY ĐỦ ("Lý Quang Vinh", "Trần Quốc Hùng", "Tô Lăng"), KHÔNG cắt cụt thành "Vinh", "Hùng", "Lăng".
- Tên cụt CHỈ dùng trong DIALOGUE giữa người thân (bạn bè, gia đình, người yêu) — vd "— Vinh, em ổn không?" / "— Hùng à!".
- Lý do: webnovel dài 1000+ chương, độc giả mới gặp nhân vật ở chương N sẽ quên nếu chỉ thấy tên cụt.
- Dùng họ + tên ("Lý Quang Vinh") giúp brand tên nhân vật cho marketing/cosplay/mạng xã hội.
- Mẫu chuẩn: "Lý Quang Vinh nghiến răng" ✅ thay vì "Vinh nghiến răng" ❌

CẤM VĂN MẪU AI VIETNAMESE-SPECIFIC (Tier 1 - HARD CAP = 0):
- "khẽ nhếch mép", "khóe miệng nhếch lên một nụ cười", "không khỏi"
- "chỉ thấy", "không nói nên lời", "ánh mắt phức tạp"
- "trong lòng thầm nghĩ", "không thể tin nổi", "khẽ thở dài một hơi"
- "cảm giác như có một dòng điện chạy qua", "một cảm giác lạ lùng"
→ Mỗi chương CHỈ ĐƯỢC dùng 0 lần các cụm trên. Tả hành động cụ thể thay thế.

CẤM VĂN MẪU AI Tier 2 (CAP ≤2/chương): "đột nhiên", "hít một ngụm khí lạnh", "dường như", "như thể", "khẽ", "một cái".

EMOTION QUA MICRO-ACTION LADDER (3-tier):
- CẤM raw emotion-naming: "hắn tức giận", "nàng vui mừng", "hắn kinh ngạc"
- THAY bằng 3-tier:
  • Physical: clench fist, đập bàn, nghiến răng, đứng dậy
  • Behavioral: đặt mạnh chén trà, quay đi không trả lời, xé thư
  • Environmental: đám mây ngoài cửa sổ tụ lại, ngọn nến rung, gió lạnh thổi qua
- Mix 2-3 tier để show 1 cảm xúc thay vì naming.

NỘI TÂM ĐA LỚP (mỗi scene chính): 3 lớp: Bề mặt (MC nói gì) → Thật sự (MC cảm thấy gì) → Sâu nhất (nỗi sợ/khao khát bí mật).

NHỊP ĐIỆU ĐA DẠNG: ≥1 scene nhịp chậm. Sau căng thẳng, MC cần khoảnh khắc thở.

KỸ THUẬT CÂU CHƯƠNG:
- 🖐️ 5 Giác Quan: Mỗi scene ≥3 giác quan (thị giác, thính giác, xúc giác, khứu giác, vị giác)
- 🧠 Nội Tâm Đa Lớp: Suy nghĩ bề mặt → cảm xúc thật → nỗi sợ/khao khát sâu nhất
- 👥 Phản Ứng Người Xung Quanh: Bystander kinh ngạc, đồn đoán, thay đổi thái độ

CHỐNG "MÙI AI" (BẮT BUỘC):
- Tránh mở đoạn bằng các cụm sáo rỗng chung chung.
- Cứ mỗi 2 scenes phải có ít nhất 1 câu "chi tiết cụ thể" (vật thể, con số, hành động có hệ quả) thay vì câu cảm thán trừu tượng.
- Mỗi chương phải có ít nhất 1 đoạn đối thoại mà nhân vật "không nói điều họ thật sự muốn" (subtext).

DIALOGUE BEAT STRUCTURE (BẮT BUỘC):
- Mỗi 2-3 lines dialogue PHẢI xen 1 action/reaction beat (cười, đặt chén, quay đi, nhìn xuống, im lặng quan sát).
- CẤM dialogue chain >4 lines liên tiếp không có beat (gây confusing, "bắn dialogue").
- Dialogue tag variety: KHÔNG chỉ "nói" — dùng action tag thay thế ("Hắn đặt chén trà xuống" + dialogue trên dòng kế).

SENTENCE-LENGTH RHYTHM:
- Action scenes: mix câu ngắn 3-7 từ + câu dài 15-25 từ ratio ~3:1 (punchy + descriptive).
- Introspection scenes: lật ngược ratio 1:3 (câu dài chiếm ưu thế, dùng câu ngắn để punctuate).
- CẤM 5 đoạn liên tiếp có avg sentence length giống nhau (±3 chars) — gây boring rhythm.

SHOW-DON'T-TELL RATIO:
- Tối đa 25% chương là narrative summary (past tense recap).
- ≥75% là scene action (present-active, MC in motion).
- Đặc biệt opening: 150 từ đầu CẤM summary/exposition — phải scene action ngay.

3-LAYER INNER MONOLOGUE (CHỈ DÙNG TẠI EMOTIONAL PIVOT):
- Layer 1 (Surface): MC immediate reaction
- Layer 2 (Deeper): MC motivation/fear nội tại
- Layer 3 (Deepest): MC unspoken belief về bản thân
- CHỈ dùng 1-2 lần/chương tại pivot scenes. NGOÀI pivot, monologue cap 80 từ.

SENSORY BRIDGE (scene transition):
- Khi chuyển scene CÙNG location/POV: câu cuối scene + câu đầu scene mới share 1 motif giác quan (mùi hoa nhài, tiếng chuông, hơi lạnh, ánh đèn).
- CẤM hard-cut giữa scene cùng setting mà không có bridge.

REBIRTH (TRỌNG SINH) MEMORY TRIGGERS — chỉ áp dụng nếu sub-genre 'trong-sinh':
- Memory budget: max 2 flashbacks/chương, mỗi flashback 50 từ.
- 5 trigger types: smell, replayed scene, reappearing person, date/anniversary, overheard phrase.
- CẤM paragraph dump flashback. CẤM MC lecture about future as monologue.`;

const CRITIC_SYSTEM = `Bạn là CRITIC AGENT — biên tập viên nghiêm khắc đánh giá chất lượng.

TIÊU CHÍ ĐÁNH GIÁ (thang 1-10):
1. overallScore: Tổng thể
2. dopamineScore: Có khoảnh khắc sảng khoái? (chốt deal, thu hoạch, vả mặt, đột phá, ấm áp chữa lành, smooth opportunity, casual competence, peaceful growth, recognition liên tục — KHÔNG nhất thiết phải qua face-slap/breakthrough; chuỗi small wins cũng tính)
3. pacingScore: Nhịp truyện hợp lý? CÓ scene nhịp chậm tương phản không? Nếu TOÀN BỘ scenes đều cùng cường độ cao → pacingScore tối đa 5. NGOẠI LỆ: Nếu tất cả scenes đều dopamine-positive (smooth wins, recognition, breakthrough, casual competence không qua adversity) → pacingScore có thể full 10 dù uniform intensity — đây là Sảng Văn flow hợp lệ.
4. endingHookScore: Kết chương có lực kéo đọc tiếp? Đa dạng: plot cliffhanger / emotional ending / reveal-seed / comfort-resolution. KHÔNG đánh điểm thấp chỉ vì thiếu plot cliffhanger — emotional/reveal/comfort ending là valid alternatives. Score thấp chỉ khi ending RỖNG (không có hook nào).

KIỂM TRA BỔ SUNG (BẮT BUỘC):
5. COMEDY: Chương có ít nhất 1 khoảnh khắc hài hước tự nhiên không? (nội tâm tự giễu, não bổ, gap moe, vô sỉ). Nếu KHÔNG CÓ bất kỳ yếu tố hài nào → tạo issue type "quality", severity "moderate", description "Thiếu comedy beat". CHỈ severity "major" nếu đây là chương đối thoại/sinh hoạt mà vẫn hoàn toàn không hài.
6. LẶP TỪ: Dùng BÁO CÁO LẶP TỪ tự động. Nếu BẤT KỲ từ nào xuất hiện >8 lần → issue severity "critical". Nếu >5 lần → severity "moderate" (CHỈ "major" nếu ≥3 nhóm từ đều >5 lần).
6b. LẶP CẤU TRÚC AI: Kiểm tra "là một", "bắt đầu", "mang theo", "tỏa ra", "dường như/như thể". Nếu bất kỳ cụm nào >5 lần → severity "moderate", yêu cầu thay thế. Nếu >8 lần → "major".
6c. TÊN MC QUÁ DÀY: Nếu tên MC xuất hiện >25 lần/10K chữ trong khi có ít đại từ → severity "moderate", yêu cầu xen đại từ (hắn/anh/nàng/gã).
7. NỘI TÂM ĐA LỚP: Chương có ít nhất 1 đoạn nội tâm đi sâu hơn bề mặt không? Nếu thiếu → tạo issue type "quality", severity "minor". CHỈ severity "moderate" nếu toàn bộ chương đều nội tâm 1 lớp.
8. GIỌNG NÓI NHÂN VẬT: Nếu ≥3 nhân vật nói giống hệt nhau → issue type "dialogue", severity "moderate". Nếu chỉ 2 nhân vật → "minor".
9. SUBTEXT HỘI THOẠI: Nếu >50% đối thoại quan trọng là hỏi-đáp thẳng tuột (A hỏi, B trả lời đầy đủ) → issue type "dialogue", severity "minor". CHỈ "moderate" nếu toàn bộ đối thoại đều nói thẳng.
10. PAYOFF: Chương có payoff cho setup trong cùng chương không? Nếu setup nhiều nhưng payoff rỗng → issue type "quality", severity "moderate".
11. CHỐNG TỰ NGƯỢC (TƯ DUY THEO GIAI ĐOẠN, KHÔNG ĐẾM CHƯƠNG):
    - LƯU Ý: 1 sự kiện ngược có thể trải 1-3 chương — KHÔNG đánh lỗi nếu chương này CHƯA resolve mà còn đang diễn biến (cho phép chương 2/3 của 1 event vẫn căng).
    - Đánh lỗi khi: chương MỞ một giai đoạn ngược MỚI ngay sau khi giai đoạn ngược trước vừa resolve mà CHƯA có chương breathing nào ở giữa → issue type "pacing", severity "critical", verdict REWRITE.
    - Đánh lỗi khi: 1 giai đoạn ngược đã kéo dài 5+ chương mà chương này VẪN không bắt đầu resolution → issue type "pacing", severity "major".
    - Đánh lỗi khi: MC đau khổ kéo dài ≥2 scene trong chương (phẫn uất/bất lực/khóc lóc tủi thân, không hề có phản ứng tích cực) → issue type "pacing", severity "major".
    - Đánh lỗi khi: chương climax NHƯNG không có ≥2 breathing moments (đối thoại ấm, observation đời thường, recognition nhỏ, hài hước nhẹ) → issue type "pacing", severity "moderate".
12. DOPAMINE CADENCE CHECK (Sảng Văn mì-ăn-liền — CRITICAL):
    - Đếm dopamine peaks trong chương: face-slap, casual competence shock, smooth opportunity grabbed, recognition (nhân vật quan trọng nhận ra MC), harvest (deal/revenue/level), breakthrough, mass-witnessed flex.
    - Nếu chương có 0 dopamine peak → issue type "quality", severity "critical", verdict REWRITE.
    - Nếu chương có 1 dopamine peak duy nhất ở scene cuối (>80% chương) → issue type "pacing" severity "major" — Sảng Văn cadence cần ≥2 peaks rải đều, peak đầu ≤50% chương.
    - Nếu chương có ≥2 peaks nhưng peak đầu nằm sau scene 3 (>60% chương) → issue type "pacing" severity "moderate" — first dopamine quá muộn, reader sẽ bỏ.
    - Breathing/calm chapter: ≥1 dopamine moment (recognition nhỏ / harvest nhẹ / comfort) là pass — KHÔNG bắt buộc face-slap.

13. KÌM NÉN PATTERN DETECTION (CRITICAL — reader-killing):
    - Đếm setup beats (MC kế hoạch / nội tâm tính toán / quan sát đối thủ / lo lắng / chờ đợi) vs payoff beats (action thành công / face-slap delivered / deal ký / recognition received).
    - Nếu setup beats ≥3 và payoff beats = 0 trong cùng chương → issue type "pacing", severity "critical", verdict REWRITE — đây là "kìm nén" pattern reader ghét. Setup phải kèm payoff TRONG CÙNG CHƯƠNG.
    - Nếu setup beats > payoff beats × 2 (ratio >2:1) → issue type "pacing", severity "major" — payoff dominant không đủ, MC phải hành động + thắng nhiều hơn quan sát + tính toán.
    - NGOẠI LỆ duy nhất: chương cuối của 1 multi-chapter event (cliffhanger climax sắp tới) có thể full setup — nhưng phải flag rõ trong outline.
14. TONE CONSISTENCY CHECK: Kiểm tra "TONE PROFILE" trong META directives.
    - Nếu tone='cozy' hoặc 'hopeful' NHƯNG chương full action/bạo lực không có breathing → issue "quality" severity "major".
    - Nếu tone='pragmatic' NHƯNG chương full romance ngây ngô / cảm tính quá đà → flag mismatch.
    - Nếu tone='bi-revenge' NHƯNG chương quá nhẹ nhàng không có stakes → flag mismatch (chỉ severity "minor" vì breathing chapters trong bi-revenge vẫn ok).
15. AI-CLICHE AUTO-DETECT (HARD): Đếm tần suất các cụm sau:
    - "khẽ nhếch mép", "khóe miệng nhếch", "không khỏi", "chỉ thấy", "không nói nên lời"
    - "ánh mắt phức tạp", "trong lòng thầm nghĩ", "không thể tin nổi", "khẽ thở dài"
    - Nếu ≥1 lần xuất hiện bất kỳ cụm trên → issue "quality" severity "moderate", yêu cầu thay thế bằng action cụ thể.
    - Nếu "đột nhiên" / "hít một ngụm khí lạnh" / "dường như" / "như thể" >2 lần → severity "moderate".
16. ON-THE-NOSE DIALOGUE CHECK: Đếm số lần nhân vật NÓI THẲNG cảm xúc/ý định:
    - "Tôi rất tức giận", "tôi yêu em", "tôi nghi ngờ anh", "tôi sợ"
    - Nếu >2 lần (cho cảnh emotional pivot) → issue "dialogue" severity "moderate", yêu cầu subtext.
    - Modern hits 2024+: tránh nhân vật self-narrate cảm xúc — show qua action/silence.
17. SHOW-DON'T-TELL RATIO: Ước lượng % narrative summary (past tense recap) vs scene action (present-active).
    - Nếu >25% là summary narration → issue "quality" severity "moderate".
    - Đặc biệt với chương opening: nếu >150 từ đầu là exposition/summary → severity "major".
18. DIALOGUE BEAT CHECK: Kiểm tra dialogue chains.
    - Nếu có >4 lines dialogue liên tiếp KHÔNG có action/reaction beat (cười, đứng dậy, im lặng, observation) → issue "dialogue" severity "moderate".
    - Modern best practice: mỗi 2-3 lines dialogue có 1 beat.
19. RAW EMOTION-NAMING: grep cho "hắn tức giận", "nàng vui mừng", "hắn kinh ngạc", "tôi buồn" — nếu >2 lần raw emotion adjective WITHOUT physical/behavioral/environmental carrier → issue "quality" severity "moderate".
20. LONG-FORM COHERENCE (chỉ áp dụng nếu chương ≥500): Kiểm tra MC core traits có drift không.
    - Nếu MC trong chương này hành xử/giá trị mâu thuẫn HOÀN TOÀN với personality đã thiết lập từ early chapters (hint từ context Story Bible + character_states)
    - → issue "continuity" severity "critical", REWRITE
    - Common drift patterns to flag: MC pragmatic chuyển nóng vội, MC family-pillar bỏ rơi gia tộc, MC career-driven ngừng quan tâm sự nghiệp.
21. DIALOGUE CHAIN >4 LINES: Nếu có dialogue chain >4 lines liên tiếp KHÔNG có action/reaction beat → issue "dialogue" severity "moderate".
22. SENSORY DENSITY: Mỗi scene chính cần ≥2 giác quan. Nếu cả chương chỉ có visual + auditory (thiếu khứu/vị/xúc giác cho ≥3 scenes) → issue "quality" severity "minor".

ISSUES: Liệt kê vấn đề (pacing/consistency/dopamine/quality/word_count/dialogue/continuity)

KIỂM TRA MÂU THUẪN (BẮT BUỘC — coherence chặt cho long-form):
- Nếu nhân vật đã CHẾT mà xuất hiện lại sống -> type "continuity", severity "critical", REWRITE
- Nếu sức mạnh/tài sản MC bị THOÁI LUI vô lý -> type "continuity", severity "critical", REWRITE
- Nếu vi phạm quy tắc thế giới đã thiết lập -> type "continuity", severity "critical", REWRITE
- Nếu nhân vật hành xử TRÁI HOÀN TOÀN với tính cách đã thiết lập -> type "continuity", severity "critical", REWRITE (UPGRADED từ major)
- Nếu nhân vật BIẾT thông tin chưa từng được tiết lộ trong các chương trước -> type "continuity", severity "critical", REWRITE
- Nếu RELATIONSHIP giữa 2 nhân vật flip vô lý (yêu→thù, thù→yêu) không có lý do -> type "continuity", severity "critical", REWRITE
- Nếu MC ở location A chương trước, location B chương này KHÔNG có scene di chuyển -> type "continuity", severity "major"
- Nếu economic/resource logic vô lý (do-thi: MC chi tiêu vượt tài chính đã thiết lập) -> type "continuity", severity "major"
- Nếu nhân vật HÀNH XỬ KHÁC tính cách (50%) nhưng có thể rationalize -> type "continuity", severity "major" (khi không phải personality shift hoàn toàn)
- MATH SANITY (cho do-thi/quan-truong/lich-su VN/kinh-doanh): nếu MC có X đồng/tỷ + chi Y mà Y > X mà KHÔNG có kênh thu nhập / vay vốn được setup từ trước → type "continuity" severity "critical", REWRITE. KHÔNG để math impossible kiểu "có 5 triệu tiêu 27 triệu".
- VND CURRENCY (Vietnam-set genres do-thi/quan-truong/lich-su VN/linh-di Dân Quốc): nếu chapter dùng "X xu" / "X nguyên" / "X lượng vàng" làm đơn vị tiền tệ giao dịch hàng ngày (mua bán, vay nợ, lương, giá đất) → type "continuity" severity "critical", REWRITE. CHỈ cho phép "đồng / nghìn đồng / triệu đồng / tỷ đồng" (VND). NGOẠI LỆ duy nhất: tu-tiên/huyen-huyen/kiem-hiep/lich-su cổ đại Hoa Hạ → cho phép "đồng vàng/bạc/linh thạch" theo bối cảnh.
- ECONOMIC LEDGER ENFORCEMENT: nếu pre-write context có khối "[TÀI CHÍNH / TÀI SẢN]" liệt kê số dư MC, chapter này CẤM cho MC chi tiêu/đầu tư vượt số đó MÀ KHÔNG có deal/vay/thu nhập rõ ràng trong cùng chapter. Vi phạm → "continuity" severity "critical".
- POLITICAL SAFETY (TRỌNG TÂM): nếu chương chứa bất kỳ tên báo / tổ chức / đảng phái chính trị có thật của cộng đồng người Việt hải ngoại ("Người Việt", "Người Việt Tự Do", "Việt Nam Cộng Hòa", "Mặt Trận Quốc Gia", "Văn Bút Hải Ngoại"), thuật ngữ ý thức hệ chính trị ("tự do" làm slogan, "cộng sản", "giải phóng", "tháng tư đen", "thuyền nhân", "tỵ nạn chính trị", "vượt biên"), tên lãnh đạo có thật (Tổng Bí Thư / Chủ Tịch / Tướng VNCH...), hoặc setup gia đình "di cư 1975 sau chiến tranh" / "tỵ nạn chính trị" → issue type "continuity", severity "critical", REWRITE. Đây là content-safety hard cap, KHÔNG ngoại lệ.
- ANTI-MONOLOGUE REPETITION: tránh để MC sa đà reflect lại cùng nội dung (rebirth/golden finger origin) mỗi chương.
  → Nếu chương có ≥4 lần cụm "kiếp trước" / "30 năm tương lai" / "ký ức tiền kiếp" / "tương lai biết trước" trong narration → "quality" severity "moderate".
  → Nếu ≥6 lần → "quality" severity "major", REVISE.
  → Nếu cùng 1 nội dung flashback/origin được tái diễn ≥2 lần trong chương khi reader đã biết từ chương trước → "quality" severity "moderate".
  → Tên golden finger (Hệ Thống / Bàn Tay Vàng / "Hải Tâm" hoặc tên cụ thể của truyện) lặp ≥6 lần trong narration → "quality" severity "moderate".
  Mục đích: ép Writer narrate progressive content thay vì lặp lại setup. MC có thể NHẮC ngắn 1-2 lần/chương cho reader mới, nhưng KHÔNG dồn toàn chương vào hồi tưởng cùng 1 thông tin.

VERDICT:
- APPROVE (overallScore >= 6 VÀ đủ từ): approved=true, requiresRewrite=false
- REVISE (4-5): approved=false, requiresRewrite=false
- REWRITE (<=3 HOẶC <60% target words HOẶC continuity critical/major HOẶC thiếu ending hook ở non-finale): approved=false, requiresRewrite=true
- LƯU Ý: Nếu có ≥3 issues severity "major" hoặc ≥1 "critical" → overallScore giảm tối thiểu 1 điểm. Issues severity "moderate" KHÔNG ảnh hưởng overallScore — chỉ ghi nhận để cải thiện dần.

LƯU Ý THỂ LOẠI:
- Truyện kinh doanh/điền viên/sinh hoạt KHÔNG CẦN cliffhanger nguy hiểm, chỉ cần "Ending Hook" gây tò mò, mong đợi kết quả. KHÔNG đánh lỗi pacing nếu truyện nhịp độ chậm ấm áp.
- Truyện smooth (do-thi/ngon-tinh/quan-truong): KHÔNG đánh lỗi nếu MC ít gặp đối thủ; CHẤM lỗi pacing nếu chương ép tạo conflict trái với arc plan; dopamine có thể đến từ chuỗi small wins, không nhất thiết qua face-slap/breakthrough.

LƯU Ý MOOD CHƯƠNG (SẢNG VĂN STANDARD):
- Nếu chương có mood "breathing" / "comedic_break" / "calm_before_storm" / "comfort" / "training": ĐÂY LÀ SẢNG VĂN MAIN CONTENT, KHÔNG phải filler.
  • CẤM downgrade overallScore vì thiếu plot tension/cliffhanger nguy hiểm — đây là bản chất Sảng Văn flow.
  • CẤM yêu cầu rewrite vì "thiếu conflict" hoặc "thiếu dopamine intensity cao" — small wins / casual competence / observation đời thường / scale-up đều là valid main output.
  • Vẫn check: continuity, repetition, character voice, word count. Bỏ qua "missing stakes/hooks/dopamine intensity" cho các mood này.
  • Tiêu chuẩn pass NGANG climax: overallScore ≥6 approve, Sảng Văn breathing chapter EQUAL priority với climax — KHÔNG có grade discount.
- Nếu chương có mood "climax" / "villain_focus" / "revelation": ÁP DỤNG STANDARD NGHIÊM.
  • Yêu cầu intensity rõ, dopamine moment, ending hook mạnh.
  • overallScore ≥6 mới approve.
- Mặc định (mood khác): standard normal, overallScore ≥6 approve.

OUTPUT: JSON theo format CriticOutput.`;

// ── Write Chapter ────────────────────────────────────────────────────────────

export interface WriteChapterOptions {
  projectId?: string;
  protagonistName?: string;
  topicId?: string;
  isFinalArc?: boolean;
  genreBoundary?: string;
  worldBible?: string;
  /** Project's world_description text. Used by Critic to detect Vietnam-set
   *  novels via regex sniff (Đại Nam / Hà Nội / Sài Gòn / Dân Quốc) so the
   *  VND currency hard-check fires on linh-di Dân Quốc / lich-su Đại Việt
   *  novels too, not just genres in VND_CURRENCY_GENRES. */
  worldDescription?: string | null;
  /** Sub-genres for blending (e.g., ['trong-sinh','kinh-doanh']). Threaded into VN pronoun + sub-genre rules. */
  subGenres?: string[];
}

export async function writeChapter(
  chapterNumber: number,
  contextString: string,
  genre: GenreType,
  targetWordCount: number,
  previousTitles: string[],
  config: GeminiConfig,
  maxRetries: number = 3,
  options?: WriteChapterOptions,
): Promise<WriteChapterResult> {
  const startTime = Date.now();
  const style = getStyleByGenre(genre);
  let rewriteInstructions = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Step 1: Architect — throws on placeholder/empty scenes. If we have
    // retries left, treat throw as a quality failure: feed the error message
    // back as rewriteInstructions and continue. This keeps the engine from
    // falling back to silent placeholder scenes.
    let outline: ChapterOutline;
    try {
      outline = await runArchitect(
        chapterNumber,
        contextString,
        targetWordCount,
        previousTitles,
        rewriteInstructions,
        config,
        options,
        genre,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries - 1) {
        rewriteInstructions = `Architect lỗi: ${msg}. Lần này phải trả về scenes ĐẦY ĐỦ với setting/conflict/resolution cụ thể, KHÔNG empty placeholder. Tuân thủ brief đã cấp.`;
        console.warn(`[Architect] attempt ${attempt + 1}/${maxRetries} failed: ${msg}`);
        continue;
      }
      throw err;
    }

    // Step 2: Writer
    let content = await runWriter(
      outline,
      contextString,
      genre,
      style,
      targetWordCount,
      config,
      rewriteInstructions,
      options,
    );

    // Hard-fail if Writer returned essentially nothing — likely an LLM
    // error / empty response. Don't ship a stub. Force regen with retry.
    const wordCount = countWords(content);
    if (wordCount < 200) {
      if (attempt < maxRetries - 1) {
        rewriteInstructions = `Writer trả về ${wordCount} từ, gần như trống. Có thể do LLM lỗi. Viết LẠI đầy đủ ${targetWordCount} từ theo outline.`;
        console.warn(`[Writer] Chapter ${chapterNumber} attempt ${attempt + 1}/${maxRetries}: content too short (${wordCount} words), regen`);
        continue;
      }
      throw new Error(`Writer chapter ${chapterNumber}: returned ${wordCount} words after ${maxRetries} attempts. Refusing to save stub content.`);
    }

    // Request continuation if truncated
    if (wordCount < targetWordCount * 0.7) {
      const continuation = await requestContinuation(content, outline, targetWordCount, config, options?.projectId);
      if (continuation) content = content + '\n\n' + continuation;
    }

    // Clean content
    content = cleanContent(content);
    const finalWordCount = countWords(content);

    // ── Hard-Fail Gate (pre-Critic) ─────────────────────────────────────────
    // Cheap regex checks that bypass the Critic round-trip. If Writer has
    // obviously fallen back to repetition padding instead of executing the
    // chapter brief, force regen with a stronger correction instruction
    // BEFORE spending tokens on Critic. Two violations are auto-rejectable:
    //   1. Setup-word density (kiếp trước / 30 năm tương lai / etc.) above
    //      a hard threshold proves Writer ignored the WRITER_SYSTEM rule.
    //   2. Golden-finger name density above threshold = same fallback.
    // If we caught a violation and have retries left, skip Critic and force
    // a tighter Writer pass with explicit correction.
    if (attempt < maxRetries - 1) {
      const hardFailReason = detectHardFallback(content, options);
      if (hardFailReason) {
        rewriteInstructions = `HARD-FAIL: ${hardFailReason}. KHÔNG được lặp setup. Chương phải narrate đúng các sự kiện trong outline, KHÔNG chèn padding hồi tưởng. Brief đã liệt kê hành động cụ thể — viết chính xác hành động đó, KHÔNG lan man về kiếp trước / golden finger.`;
        console.warn(`[Writer] Hard-fail attempt ${attempt + 1}/${maxRetries}: ${hardFailReason}`);
        continue;
      }
    }

    // Step 3: Critic
    const critic = await runCritic(
      outline,
      content,
      targetWordCount,
      contextString,
      config,
      options?.isFinalArc === true,
      options?.projectId,
      genre,
      options?.worldDescription,
    );

    if (critic.requiresRewrite && attempt < maxRetries - 1) {
      rewriteInstructions = critic.rewriteInstructions || 'Cải thiện chất lượng tổng thể.';
      continue;
    }

    // Extract title with similarity check
    const title = extractTitle(content, chapterNumber, outline.title, previousTitles);

    return {
      chapterNumber,
      title,
      content,
      wordCount: finalWordCount,
      qualityScore: critic.overallScore,
      criticReport: critic,
      outline,
      duration: Date.now() - startTime,
    };
  }

  throw new Error(`Chapter ${chapterNumber}: all ${maxRetries} attempts failed`);
}

// ── Architect Agent ──────────────────────────────────────────────────────────

async function runArchitect(
  chapterNumber: number,
  context: string,
  targetWords: number,
  previousTitles: string[],
  rewriteInstructions: string,
  config: GeminiConfig,
  options?: WriteChapterOptions,
  genre?: GenreType,
): Promise<ChapterOutline> {
  const titleRules = buildTitleRulesPrompt(previousTitles, genre);
  const minScenes = Math.max(4, Math.ceil(targetWords / 600));
  const wordsPerScene = Math.round(targetWords / minScenes);

  // Golden Chapter requirements for ch.1-3
  const isGolden = chapterNumber <= 3;
  const goldenReqs = isGolden
    ? GOLDEN_CHAPTER_REQUIREMENTS[`chapter${chapterNumber}` as keyof typeof GOLDEN_CHAPTER_REQUIREMENTS]
    : null;

  // Load constraints if projectId available
  let constraintSection = '';
  if (options?.projectId) {
    try {
      constraintSection = await loadConstraintSection(options.projectId, context, options.protagonistName || '');
    } catch {
      // Non-fatal
    }
  }

  // Build topic section
  const topicSection = buildTopicSection(options?.topicId);

  // Emotional arc planning
  const emotionalArcGuide = `
CẢM XÚC ARC (bắt buộc lên kế hoạch):
- Mở đầu: cảm xúc gì cho người đọc? (tò mò, lo lắng, phẫn nộ...)
- Giữa chương: chuyển sang cảm xúc gì? (căng thẳng, hồi hộp, đau lòng...)
- Cao trào: đỉnh điểm cảm xúc? (phấn khích, sốc, hả hê...)
- Kết: để lại cảm xúc gì? (háo hức đọc tiếp, day dứt, mong chờ...)
Nguyên tắc: PHẢI có contrast cảm xúc giữa các phần (buồn→vui, sợ→phấn khích)`;

  // Engagement checklist — generic + genre-specific items
  const genreEngagementItems = genre ? getGenreEngagement(genre) : [];
  const engagementGuide = `
ENGAGEMENT (mỗi chương phải có):
${ENGAGEMENT_CHECKLIST.perChapter.map((e: string) => '- ' + e).join('\n')}
${genreEngagementItems.length > 0 ? `\nENGAGEMENT THỂ LOẠI (BẮT BUỘC):\n${genreEngagementItems.map(e => '- ' + e).join('\n')}` : ''}
SỨC MẠNH: Tối đa ${ENGAGEMENT_CHECKLIST.powerBudget.perArcRules.maxPowerUps} power-up/arc. KHÔNG tăng sức mạnh mỗi chương.`;

  // Final arc handling
  const finalArcGuide = options?.isFinalArc
    ? `KẾT THÚC CHƯƠNG (ARC CUỐI):
- KHÔNG dùng cliffhanger — kết thúc thỏa mãn
- Nếu đây là chương cuối cùng: viết epilogue, giải quyết mọi xung đột
- Nếu gần cuối: có thể dùng mild suspense nhưng không mở plot thread mới`
    : `CLIFFHANGER TECHNIQUES (chọn 1 — CẤM LẶP loại đã dùng gần đây):
${CLIFFHANGER_TECHNIQUES.map((c: { name: string; example: string }) => '- ' + c.name + ': ' + c.example).join('\n')}
⚠️ QUAN TRỌNG: Context đã liệt kê [CLIFFHANGER ĐÃ DÙNG]. Bạn PHẢI chọn loại KHÁC. Nếu 3 chương gần nhất đều dùng Threat → chọn Revelation/Choice/Pending Result/v.v.`;

  // Extract foreshadowing hints for forceful injection into Architect prompt
  const foreshadowingInjection = extractForeshadowingForArchitect(context);

  // Phase 22 Stage 2 Q2: Architect budget bumped 120K → 400K. DeepSeek 1M context handles
  // this trivially (~100K tokens at most). Old cap was a token-saving artifact from
  // pre-DeepSeek era; head-tail trim was DROPPING THE MIDDLE of synopsis/arc plan/character
  // bibles — exactly the scaffolding Architect needs for long-novel coherence. Real
  // long-form authors plan with ALL their notes open, not just the head + tail.
  const MAX_PROMPT_CHARS = 400_000;
  let trimmedContext = context;
  const staticParts = [constraintSection, topicSection, titleRules, emotionalArcGuide, finalArcGuide, engagementGuide, foreshadowingInjection].join('').length + 2000;
  if (trimmedContext.length + staticParts > MAX_PROMPT_CHARS) {
    trimmedContext = trimmedContext.slice(0, MAX_PROMPT_CHARS - staticParts);
    console.warn(`[Architect] Chapter ${chapterNumber}: context trimmed from ${context.length} to ${trimmedContext.length} chars (above 400K — investigate)`);
  } else if (process.env.DEBUG_ARCHITECT_CONTEXT === '1') {
    console.log(`[Architect] Chapter ${chapterNumber}: full context = ${context.length} chars (no trim)`);
  }

  // Phase 22 Stage 4: STRUCTURED FOR PROMPT CACHING.
  // DeepSeek caches prefix automatically when ≥1024 tokens match exactly. To maximize cache
  // hit rate (10% pricing on cached tokens), we put STATIC content (rules, JSON schema,
  // novel-stable context) FIRST and DYNAMIC content (chapter number, current bridge, retry
  // instructions) LAST. After the first chapter of any novel, this cuts ~50% of input cost.
  // Format is otherwise unchanged — same content, reordered.

  // ── STATIC PREFIX (cacheable across chapters of same novel) ──
  const staticPrefix = `⚠️ TUYỆT ĐỐI BÁM SÁT [WORLD DESCRIPTION] và [ĐẠI CƯƠNG TOÀN TRUYỆN] phía dưới — đây là PREMISE GỐC. CẤM hallucinate setting / golden finger / antagonist / MC profession khác. Nếu world_description nói MC là "ngự thú sư cuồng đọc văn học chép Tam Quốc cho tu sĩ đa vũ trụ đọc" thì CẤM viết MC bán cơm hộp hay làm freelance content. Mọi scene phải reference world_description elements (tên hệ thống, tên antagonist, setting locations, golden finger rules cụ thể).

ĐA GÓC NHÌN (MULTI-POV):
- POV mặc định là nhân vật chính
- CÓ THỂ chuyển POV sang nhân vật khác cho 1-2 scenes NẾU phù hợp cốt truyện
- Nếu đổi POV, ghi rõ "pov" trong từng scene object

JSON OUTPUT SCHEMA (output structure, không thay đổi):
{
  "chapterNumber": <int>,
  "title": "tiêu đề hấp dẫn",
  "summary": "tóm tắt 2-3 câu",
  "pov": "tên nhân vật POV mặc định",
  "location": "địa điểm chính",
  "scenes": [{"order":1, "setting":"...", "characters":["..."], "goal":"...", "conflict":"...", "resolution":"...", "estimatedWords":<int>, "pov":"nhân vật POV"}],
  "tensionLevel": <int>,
  "dopaminePoints": [{"type":"face_slap", "scene":1, "description":"...", "intensity":8, "setup":"...", "payoff":"..."}],
  "emotionalArc": {"opening":"...", "midpoint":"...", "climax":"...", "closing":"..."},
  "comedyBeat": "...",
  "slowScene": "...",
  "cliffhanger": "...",
  "targetWordCount": <int>
}

${trimmedContext}

${constraintSection}
${topicSection}
${titleRules}

${emotionalArcGuide}

${finalArcGuide}

${engagementGuide}`;

  // ── DYNAMIC SUFFIX (changes every chapter, breaks cache) ──
  const dynamicSuffix = `

═══════════════════════════════════════════
NHIỆM VỤ HIỆN TẠI:
═══════════════════════════════════════════
Lên kế hoạch cho CHƯƠNG ${chapterNumber}.
Target: ${targetWords} từ. Tối thiểu ${minScenes} scenes (mỗi ~${wordsPerScene} từ).
${foreshadowingInjection}
${rewriteInstructions ? `\nYÊU CẦU SỬA TỪ LẦN TRƯỚC: ${rewriteInstructions}` : ''}
${isGolden ? `\nGOLDEN CHAPTER ${chapterNumber}:\nMust have: ${goldenReqs?.mustHave.join(', ')}\nAvoid: ${goldenReqs?.avoid.join(', ')}` : ''}

Trả về JSON ChapterOutline đúng schema phía trên cho CHƯƠNG ${chapterNumber}.`;

  const prompt = staticPrefix + dynamicSuffix;

  const genreSuffix = genre ? buildGenreSpecificSuffix(genre, options?.subGenres || []) : '';
  // Architect gets compact voice hint (notes + opening pattern + dopamine pattern only).
  // Full prose anchor goes to Writer where voice matching matters most.
  const architectVoiceHint = genre ? getArchitectVoiceHint(genre) : '';
  const res = await callGemini(prompt, { ...config, temperature: 0.3, maxTokens: 16384, systemPrompt: ARCHITECT_SYSTEM + VN_PLACE_LOCK + genreSuffix + architectVoiceHint }, { jsonMode: true, tracking: options?.projectId ? { projectId: options.projectId, task: 'architect', chapterNumber } : undefined });

  // Check finishReason for truncation
  if (res.finishReason === 'length' || res.finishReason === 'MAX_TOKENS') {
    console.warn(`[Architect] Chapter ${chapterNumber}: output truncated (finishReason=${res.finishReason})`);
  }

  const parsed = parseJSON<ChapterOutline>(res.content);

  if (!parsed || !parsed.scenes?.length) {
    throw new Error(`Architect chapter ${chapterNumber}: JSON parse failed — raw: ${res.content.slice(0, 300)}`);
  }

  // Validate: ensure enough scenes. Previously silently synthesized empty
  // placeholder scenes (setting:'', conflict:'', resolution:'') which the
  // Writer then narrated as filler — Writer fell back to padding from
  // setup/world_description because the brief was empty. Now throw so the
  // outer retry loop calls Architect again with the rewriteInstructions.
  if (!parsed.scenes || parsed.scenes.length < minScenes) {
    throw new Error(`Architect chapter ${chapterNumber}: returned ${parsed.scenes?.length ?? 0} scenes, need ≥${minScenes}. Refusing to synthesize empty placeholder scenes (would force Writer to pad).`);
  }
  // Validate: scenes have non-empty narrative fields. If Architect returned
  // scenes with empty goal/conflict/resolution, those are essentially
  // placeholders too — Writer would pad. Force regen.
  const emptyScenes = parsed.scenes.filter(sc => !sc.goal?.trim() || !sc.setting?.trim());
  if (emptyScenes.length > parsed.scenes.length / 2) {
    throw new Error(`Architect chapter ${chapterNumber}: ${emptyScenes.length}/${parsed.scenes.length} scenes have empty goal/setting. Refusing to pass to Writer (would produce padding).`);
  }

  // Fix scene word estimates if too low
  const totalSceneWords = parsed.scenes.reduce((s, sc) => s + (sc.estimatedWords || 0), 0);
  if (totalSceneWords < targetWords * 0.8) {
    const perScene = Math.round(targetWords / parsed.scenes.length);
    for (const scene of parsed.scenes) {
      scene.estimatedWords = perScene;
    }
  }

  // Enforce targetWordCount
  parsed.targetWordCount = targetWords;

  // Enforce non-empty cliffhanger for non-finale arcs
  // Only synthesize fallback IF outline has no cliffhanger AND chapter doesn't have an
  // intentional emotional/reveal/comfort ending. Modern guidance (P0.1 cliffhanger detoxify):
  // emotional/reveal/comfort endings are valid alternatives for breathing/aftermath/comedic chapters.
  if (!options?.isFinalArc && !parsed.cliffhanger?.trim()) {
    // Check emotional arc closing intent — if intentionally calm/resolution, skip synthesis
    const closingIntent = (parsed.emotionalArc?.closing || '').toLowerCase();
    const isIntentionalSoftEnding = /resolution|aftermath|breath|peace|reflection|comfort|warm|reveal|seed/.test(closingIntent);
    if (!isIntentionalSoftEnding) {
      parsed.cliffhanger = synthesizeFallbackCliffhanger(parsed);
    }
    // else: leave cliffhanger empty — emotional/reveal ending acceptable
  }

  return parsed;
}

/**
 * Build genre + sub-genre specific suffix for systemPrompt — VN pronouns, sub-genre patterns.
 * Inject once at agent call instead of redundantly in WRITER_SYSTEM static text.
 */
function buildGenreSpecificSuffix(genre: GenreType, subGenres: string[] = []): string {
  const parts: string[] = [];

  const pronounRule = VN_PRONOUN_GUIDE[genre];
  if (pronounRule) {
    parts.push(`\n\nVN PRONOUN WHITELIST cho thể loại "${genre}":\n${pronounRule}`);
  }

  if (isNonCombatGenre(genre)) {
    parts.push(`\n\nNON-COMBAT GENRE GUARDRAIL (HARD RULE — thể loại "${genre}"):
- CẤM TUYỆT ĐỐI scene MC tham gia chiến đấu vật lý: đánh đấm tay đôi, đâm chém, bắn nhau, huyết chiến, MC vung kiếm/dao/súng, MC bị truy sát hành hung trong hẻm tối, MC thoát chết trong đám đánh nhau.
- CẤM tiêu đề chương kiểu "Huyết Chiến", "Tử Chiến", "Đại Chiến", "Quyết Chiến" — đây là dấu hiệu drift sang fantasy/wuxia.
- CẤM scene gangster/giang hồ vây MC ngoài đời thực dùng vũ lực. Đối thủ phải phản ứng qua KÊNH HỢP PHÁP/THƯƠNG MẠI: kiện tụng, phá giá, thâu tóm, lobby quan chức, dìm uy tín, cướp khách hàng, ép supplier, leak thông tin báo chí.
- CẤM scene MC tham gia "giải đấu game/võ thuật/nhảy múa" làm trục chính chương — đây là drift sang sport/combat. Nếu MC có hobby gaming/tournament, chỉ được làm scene phụ ≤1 trong arc, KHÔNG dồn 3+ chương liên tiếp.
- CONFLICT của thể loại này = THƯƠNG CHIẾN: đối thủ kinh doanh ép giá, M&A thù địch, chiến lược tranh thị phần, scandal PR, lobby chính sách, đầu tư mạo hiểm, đàm phán supplier, kiện tụng IP, chuyển nhượng nhân tài. Tuyệt đối KHÔNG quy đổi sang vũ lực.
- Trường hợp DUY NHẤT có violence: MC chứng kiến tin tức/báo chí về việc bạo lực ngoài xã hội, hoặc MC nghe kể lại — KHÔNG personally tham gia. MC luôn ở vai THƯƠNG NHÂN/QUẢN LÝ/NHÀ ĐẦU TƯ, không phải võ sĩ/giang hồ.`);
  }

  for (const sg of subGenres) {
    const rules = SUB_GENRE_RULES[sg];
    if (rules?.length) {
      parts.push('\n\n' + rules.join('\n'));
    }
  }

  return parts.join('');
}

// ── Writer Agent ─────────────────────────────────────────────────────────────

async function runWriter(
  outline: ChapterOutline,
  context: string,
  genre: GenreType,
  style: ReturnType<typeof getStyleByGenre>,
  targetWords: number,
  config: GeminiConfig,
  rewriteInstructions: string,
  options?: WriteChapterOptions,
): Promise<string> {
  const totalTargetWords = outline.targetWordCount || targetWords;

  // Build rich style context
  const richStyleContext = buildStyleContext(genre, getDominantSceneType(outline));
  const enhancedStyle = getEnhancedStyleBible(genre);

  // Build per-scene guidance with POV
  const sceneGuidance = outline.scenes.map(s => {
    const sceneType = inferSceneType(s);
    const pacing = enhancedStyle.pacingRules[sceneType];
    const povHint = s.pov && s.pov !== outline.pov
      ? `\n  👁 POV: ${s.pov} (GÓC NHÌN KHÁC — viết từ suy nghĩ, cảm xúc, nhận thức của ${s.pov}, KHÔNG của protagonist)`
      : '';
    return `- Scene ${s.order}: ${s.goal} → Conflict: ${s.conflict} → Resolution: ${s.resolution}
  Bối cảnh: ${s.setting} | Nhân vật: ${s.characters.join(', ')}${povHint}
  ⚠️ Viết TỐI THIỂU ${s.estimatedWords} từ cho scene này
  📝 Nhịp điệu: câu ${pacing.sentenceLength.min}-${pacing.sentenceLength.max} từ, tốc độ ${pacing.paceSpeed === 'fast' ? 'NHANH' : pacing.paceSpeed === 'slow' ? 'CHẬM' : 'VỪA'}`;
  }).join('\n\n');

  // Detect multi-POV
  const hasMultiPOV = outline.scenes.some(s => s.pov && s.pov !== outline.pov);
  const multiPOVGuide = hasMultiPOV
    ? `\nCHUYỂN GÓC NHÌN (MULTI-POV):
- Khi chuyển POV sang nhân vật khác, PHẢI có dấu hiệu rõ ràng (xuống dòng + dấu hiệu cảnh mới)
- Viết nội tâm, cảm xúc, nhận thức đúng nhân vật POV đó — KHÔNG biết thông tin nhân vật khác giấu
- Mỗi POV phải có giọng văn/ngữ điệu khác biệt phù hợp tính cách nhân vật\n`
    : '';

  // Vocabulary hints
  const vocabHints = buildVocabularyHints(outline, enhancedStyle.vocabulary);

  // Character voice guide
  const charVoiceGuide = buildCharacterVoiceGuide(outline, options?.worldBible);

  // Emotional arc
  const emotionalArcSection = outline.emotionalArc
    ? `\nCẢM XÚC ARC (PHẢI tuân thủ):
- Mở đầu: ${outline.emotionalArc.opening}
- Giữa chương: ${outline.emotionalArc.midpoint}
- Cao trào: ${outline.emotionalArc.climax}
- Kết thúc: ${outline.emotionalArc.closing}
→ Viết sao cho người đọc CẢM NHẬN được sự chuyển đổi cảm xúc rõ ràng.`
    : '';

  // Topic section
  const topicSection = buildTopicSection(options?.topicId);

  // Rewrite instructions for Writer
  const rewriteSection = rewriteInstructions
    ? `\nYÊU CẦU SỬA TỪ LẦN TRƯỚC: ${rewriteInstructions}\n`
    : '';

  const styleGuide = [
    `Giọng văn: ${style.authorVoice}`,
    `Tỷ lệ đối thoại: ${style.dialogueRatio[0]}-${style.dialogueRatio[1]}%`,
    `Nhịp: ${style.pacingStyle}`,
    style.genreConventions.slice(0, 10).join('\n'),
  ].join('\n');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 22 STAGE 2 Q1: Full-Evidence Writer Context
  // ─────────────────────────────────────────────────────────────────────────
  // Old design: Writer got "lean" ~5-10K context with Architect outline distilled.
  // Problem: Architect's outline cannot carry every nuance (voice, callbacks, micro-details);
  // Writer was forced to invent details that contradicted prior chapters.
  //
  // New design: Writer gets FULL EVIDENCE PACK (~80-120K). DeepSeek 1M context handles this
  // trivially. Cost ~$0.012 extra per chapter — meaningless vs quality gain. Real "đại thần"
  // novelists re-read recent prose + open their character bible + check foreshadowing ledger
  // BEFORE writing the next chapter. We give the AI the same advantage.
  //
  // Caps below are GENEROUS — only there to prevent runaway prompts, not to optimize tokens.
  const writerContextParts: string[] = [];
  const extractSection = (regex: RegExp, budget: number): string | null => {
    const match = context.match(regex);
    if (!match) return null;
    const text = match[0];
    if (text.length <= budget) return text;
    const cut = text.lastIndexOf('\n', budget);
    return cut > budget * 0.5 ? text.slice(0, cut) : text.slice(0, budget);
  };

  // World/premise grounding (every chapter must respect)
  const worldDesc = extractSection(/\[WORLD DESCRIPTION[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 6000);
  if (worldDesc) writerContextParts.push(worldDesc);
  // Bridge: cliffhanger + MC state
  const bridge = extractSection(/\[CẦU NỐI CHƯƠNG[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 3000);
  if (bridge) writerContextParts.push(bridge);
  // Character states (snapshot — current truth)
  const charSection = extractSection(/\[NHÂN VẬT HIỆN TẠI[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 6000);
  if (charSection) writerContextParts.push(charSection);
  // Character bibles (durable consolidated profiles)
  const bibleSection = extractSection(/\[NHÂN VẬT BIBLE[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 12000);
  if (bibleSection) writerContextParts.push(bibleSection);
  // Volume summaries (macro memory)
  const volSection = extractSection(/\[VOLUME SUMMARIES[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 8000);
  if (volSection) writerContextParts.push(volSection);
  // Geography state
  const geoSection = extractSection(/\[GEOGRAPHY[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 1500);
  if (geoSection) writerContextParts.push(geoSection);
  // RAG memory (far-chapter callbacks)
  const ragSection = extractSection(/\[KÝ ỨC LIÊN QUAN[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 8000);
  if (ragSection) writerContextParts.push(ragSection);
  // Synopsis structured (active threads + state)
  const synopsisSection = extractSection(/\[TỔNG QUAN CỐT TRUYỆN\][\s\S]*?(?=\n\n\[|$)/, 4000);
  if (synopsisSection) writerContextParts.push(synopsisSection);
  // FULL PROSE of last 3 chapters — voice anchor, the BIG quality lever
  const fullProseSection = extractSection(/\[FULL PROSE [^\]]*\][\s\S]*?(?=\n\n\[|$)/, 50000);
  if (fullProseSection) writerContextParts.push(fullProseSection);
  // Recent summaries (12-chapter look-back)
  const recentSection = extractSection(/\[TÓM TẮT \d+ CHƯƠNG GẦN NHẤT[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 5000);
  if (recentSection) writerContextParts.push(recentSection);
  // Plot threads (open + closed)
  const plotSection = extractSection(/\[PLOT THREADS[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 4000);
  if (plotSection) writerContextParts.push(plotSection);
  // World rules (established laws — must not violate)
  const worldRulesSection = extractSection(/\[QUY TẮC THẾ GIỚI[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 3000);
  if (worldRulesSection) writerContextParts.push(worldRulesSection);
  // Arc plan (current arc + chapter brief)
  const arcSection = extractSection(/\[KẾ HOẠCH ARC[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 6000);
  if (arcSection) writerContextParts.push(arcSection);
  // Quality modules — generous caps (was 600-1500, now 2500-4000) so per-character/per-hint
  // data isn't truncated. Architect saw same data; Writer needs it too for execution-level fidelity.
  const qualityModuleBudgets: Record<string, number> = {
    'FORESHADOWING': 4000, 'CHARACTER ARC': 4000,
    'PACING': 2500, 'VOICE': 2500, 'POWER': 2500, 'WORLD': 2500, 'LOCATION': 2500,
    'CHARACTER KNOWLEDGE': 3000, 'RELATIONSHIPS': 3000, 'ECONOMIC LEDGER': 3000,
  };
  for (const tag of Object.keys(qualityModuleBudgets)) {
    const regex = new RegExp(`\\[${tag}[^\\]]*\\][\\s\\S]*?(?=\\n\\n\\[|$)`);
    const match = context.match(regex);
    if (match) {
      const budget = qualityModuleBudgets[tag];
      const text = match[0];
      if (text.length <= budget) {
        writerContextParts.push(text);
      } else {
        const cutPoint = text.lastIndexOf('\n', budget);
        writerContextParts.push(cutPoint > budget * 0.5 ? text.slice(0, cutPoint) : text.slice(0, budget));
      }
    }
  }
  const writerContext = writerContextParts.join('\n\n');
  if (process.env.DEBUG_WRITER_CONTEXT === '1') {
    console.log(`[Writer] Chapter ${outline.chapterNumber}: full-evidence context = ${writerContext.length} chars (${writerContextParts.length} sections)`);
  }

  const prompt = `Viết CHƯƠNG ${outline.chapterNumber}: "${outline.title}"

${rewriteSection}BLUEPRINT:
${JSON.stringify(outline, null, 2)}

BỐI CẢNH:
${writerContext}

SCENES (viết ĐẦY ĐỦ cho MỖI scene — KHÔNG bỏ qua scene nào):
${sceneGuidance}
${multiPOVGuide}
${emotionalArcSection}

DOPAMINE (phải có):
${outline.dopaminePoints.map(dp => `- ${dp.type}: Setup: ${dp.setup} → Payoff: ${dp.payoff}`).join('\n')}

COMEDY BEAT (BẮT BUỘC):
${outline.comedyBeat ? `Kế hoạch: ${outline.comedyBeat}` : 'Tự chọn 1 khoảnh khắc hài hước tự nhiên.'}

SCENE NHỊP CHẬM (BẮT BUỘC):
${outline.slowScene ? `Scene nhịp chậm: ${outline.slowScene}` : 'Chọn 1 scene để giảm nhịp.'}

CLIFFHANGER: ${outline.cliffhanger}
${topicSection}
PHONG CÁCH:
${styleGuide}

${vocabHints}

${charVoiceGuide}

${richStyleContext}
${buildGenreAntiClicheSection(genre)}
ĐỘ DÀI YÊU CẦU (BẮT BUỘC):
- Viết TỐI THIỂU ${totalTargetWords} từ
- CẤM TÓM TẮT. Phải kéo dài thời gian và không gian của từng cảnh.
- Chương dưới ${Math.round(totalTargetWords * 0.7)} từ sẽ bị từ chối
- Tổng ${outline.scenes.length} scenes x ~${Math.round(totalTargetWords / outline.scenes.length)} từ/scene

Bắt đầu viết:`;

  const writerSuffix = buildGenreSpecificSuffix(genre, options?.subGenres || []);
  // Full voice anchor (prose sample + opening pattern + dopamine pattern) — Writer
  // needs this to match register/rhythm/vocabulary. Architect gets a compact version.
  const writerVoiceAnchor = getVoiceAnchor(genre);
  // VND CURRENCY proactive rule (added 2026-04-29): Critic-side rule alone
  // wasn't enough — "X xu" / "X nguyên" leaks were appearing in 30+ chapters
  // across many do-thi/quan-truong novels. Add to Writer system prompt so AI
  // generates correct currency from the start instead of depending on Critic
  // to catch and rewrite (which sometimes accepts the leak with low score).
  const writerVndGuard = genre && requiresVndCurrency(genre, options?.worldDescription)
    ? `\n\n[CURRENCY RULE — BẮT BUỘC, KHÔNG ĐƯỢC LEAK]
- Truyện đặt ở Việt Nam (genre "${genre}"). Đơn vị tiền DUY NHẤT khi nhân vật giao dịch hàng ngày: ĐỒNG (đồng / nghìn đồng / triệu đồng / tỷ đồng).
- TUYỆT ĐỐI CẤM dùng "xu" hoặc "nguyên" làm đơn vị tiền — đây là từ Trung Quốc leak vào (元/源币), không phải tiếng Việt thực tế. Người Việt KHÔNG dùng "5 triệu xu" hay "100 nguyên" — chỉ dùng "5 triệu đồng" hoặc "100 đồng".
- Sai: "127.000 xu", "5 triệu xu", "350 nghìn xu", "1000 nguyên", "tài khoản 2 triệu nguyên".
- Đúng: "127.000 đồng", "5 triệu đồng", "350 nghìn đồng", "1000 đồng", "tài khoản 2 triệu đồng" (hoặc viết tắt "2 triệu / 350 nghìn" KHÔNG kèm "xu").
- "Lượng vàng" CHỈ cho tài sản tích trữ/đầu tư (1 lượng ≈ 4-5 triệu đồng). KHÔNG dùng cho mua bán hàng ngày.
- "Xu" CHO PHÉP duy nhất khi: từ ghép "xu nịnh" (flatter), tên riêng (vd "Tô Châu Xu"), hoặc đơn vị nhỏ trong game/hệ thống (HỆ THỐNG ban X xu thưởng — virtual currency, KHÔNG phải tiền thật).
- Khi nhân vật cầm tiền thật → ĐỒNG. Hệ thống thưởng điểm → có thể dùng "điểm" / "credit" / hoặc đơn vị riêng của hệ thống nhưng KHÔNG dùng "xu" để tránh nhầm lẫn.`
    : '';
  const res = await callGemini(prompt, { ...config, systemPrompt: WRITER_SYSTEM + VN_PLACE_LOCK + writerSuffix + writerVndGuard + writerVoiceAnchor }, { tracking: options?.projectId ? { projectId: options.projectId, task: 'writer', chapterNumber: outline.chapterNumber } : undefined });

  // Check finishReason
  if (res.finishReason === 'length' || res.finishReason === 'MAX_TOKENS') {
    console.warn(`[Writer] Chapter ${outline.chapterNumber}: output truncated`);
  }

  return res.content;
}

// ── Request Continuation ─────────────────────────────────────────────────────

async function requestContinuation(
  partialContent: string,
  outline: ChapterOutline,
  targetWords: number,
  config: GeminiConfig,
  projectId?: string,
): Promise<string | null> {
  const currentWords = countWords(partialContent);
  const remaining = targetWords - currentWords;
  if (remaining < 300) return null;

  // Take larger tail context (10K chars instead of 2K)
  const lastPart = partialContent.slice(-10000);

  const prompt = `Tiếp tục viết phần còn lại. ĐÃ VIẾT ${currentWords} từ, CẦN THÊM ${remaining} từ.

NỘI DUNG ĐÃ VIẾT (phần cuối):
...${lastPart}

SCENES CÒN LẠI THEO BLUEPRINT:
${JSON.stringify(outline.scenes.slice(-3))}

TIẾP TỤC NGAY TỪ CHỖ DỪNG — không lặp lại:`;

  const res = await callGemini(prompt, { ...config, systemPrompt: WRITER_SYSTEM + VN_PLACE_LOCK }, { tracking: projectId ? { projectId, task: 'writer_continuation', chapterNumber: outline.chapterNumber } : undefined });
  return res.content || null;
}

// ── Critic Agent ─────────────────────────────────────────────────────────────

async function runCritic(
  outline: ChapterOutline,
  content: string,
  targetWords: number,
  previousContext: string,
  config: GeminiConfig,
  isFinalArc: boolean,
  projectId?: string,
  genre?: GenreType,
  worldDescription?: string | null,
): Promise<CriticOutput> {
  const wordCount = countWords(content);
  const wordRatio = wordCount / targetWords;

  // Phase 22 Stage 2 Q3: bumped to 60K so Critic sees full chapter prose without truncation.
  // A typical chapter (~10-15K) fits without trim. Long chapters (~30K) fit fully too.
  // Was 30K — meant Critic missed the middle of long chapters, blind to mid-chapter
  // contradictions. DeepSeek 1M makes this a non-cost.
  const MAX_CRITIC_CONTENT_CHARS = 60_000;
  let contentPreview = content;
  if (content.length > MAX_CRITIC_CONTENT_CHARS) {
    const headSize = Math.floor(MAX_CRITIC_CONTENT_CHARS * 0.6);
    const tailSize = MAX_CRITIC_CONTENT_CHARS - headSize;
    contentPreview = content.slice(0, headSize) + '\n\n[...phần giữa bị lược bỏ...]\n\n' + content.slice(-tailSize);
    console.warn(`[Critic] Chapter content trimmed from ${content.length} to ${contentPreview.length} chars (head+tail)`);
  }

  // Cross-chapter context for contradiction detection.
  // 2026-04-29 continuity overhaul: expanded from bridge+chars (3K cap) to bridge + chars + RAG +
  // synopsis + recent summaries (8K cap). Critic must catch contradictions across ENTIRE story,
  // not just last chapter — old cap let dead-character-reappearance, power-regression, and
  // forgotten-subplot bugs slip through because Critic literally couldn't see those events.
  let crossChapterSection = '';
  if (previousContext) {
    const relevantParts: string[] = [];
    const extractCriticSection = (regex: RegExp, budget: number): string | null => {
      const match = previousContext.match(regex);
      if (!match) return null;
      const text = match[0];
      if (text.length <= budget) return text;
      const cut = text.lastIndexOf('\n', budget);
      return cut > budget * 0.5 ? text.slice(0, cut) : text.slice(0, budget);
    };

    // Phase 22 Stage 4 Lever C': Critic focused on LOCAL quality (current chapter craft).
    // Continuity Guardian (4th agent, Pro tier) handles GLOBAL coherence with full bibles
    // + volume summaries + RAG. Critic doesn't need to duplicate that work.
    // Trimmed from 80K → 40K cross-chapter context. Saves ~$0.05/write.
    // Critic checks: word count, repetition, ending hook, dopamine, comedy, pacing, +
    // last-chapter continuity (bridge + recent prose + char states). Far-back issues are
    // Guardian's responsibility.
    const bridgeS = extractCriticSection(/\[CẦU NỐI CHƯƠNG[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 3000);
    if (bridgeS) relevantParts.push(bridgeS);
    const charS = extractCriticSection(/\[NHÂN VẬT HIỆN TẠI[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 4000);
    if (charS) relevantParts.push(charS);
    // Top 3 character bibles only (was 12K) — most relevant chars in chapter
    const bibleS = extractCriticSection(/\[NHÂN VẬT BIBLE[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 5000);
    if (bibleS) relevantParts.push(bibleS);
    // Synopsis structured (active threads/state) — small, high-value
    const synopsisS = extractCriticSection(/\[TỔNG QUAN CỐT TRUYỆN\][\s\S]*?(?=\n\n\[|$)/, 2500);
    if (synopsisS) relevantParts.push(synopsisS);
    const recentS = extractCriticSection(/\[TÓM TẮT \d+ CHƯƠNG GẦN NHẤT[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 3000);
    if (recentS) relevantParts.push(recentS);
    // Full prose of last 1-2 chapters only (was 3) — Critic checks immediate continuity
    const fullProseS = extractCriticSection(/\[FULL PROSE [^\]]*\][\s\S]*?(?=\n\n\[|$)/, 18000);
    if (fullProseS) relevantParts.push(fullProseS);
    // World rules (small, important — must not violate)
    const worldRulesS = extractCriticSection(/\[QUY TẮC THẾ GIỚI[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 2000);
    if (worldRulesS) relevantParts.push(worldRulesS);

    const merged = relevantParts.join('\n\n');
    crossChapterSection = relevantParts.length > 0
      ? `BỐI CẢNH CÂU CHUYỆN (KIỂM TRA mâu thuẫn LOCAL — Continuity Guardian sẽ check global ở bước sau):\n${merged.slice(0, 40000)}\n\n`
      : `BỐI CẢNH CÂU CHUYỆN:\n${previousContext.slice(0, 3000)}\n\n`;
  }

  // Build repetition report for Critic
  const repetitionReport = buildRepetitionReport(content);

  // Extract quality module expectations for compliance verification
  const qualityComplianceSection = buildQualityComplianceSection(previousContext);

  const prompt = `Đánh giá chương nghiêm túc:

${crossChapterSection}OUTLINE: ${outline.title} — ${outline.summary}
TARGET DOPAMINE: ${outline.dopaminePoints.map(dp => `${dp.type}: ${dp.description}`).join('; ')}
TARGET WORDS: ${targetWords}
ACTUAL WORDS: ${wordCount} (đạt ${Math.round(wordRatio * 100)}% target)

${wordRatio < 0.6 ? '⚠️ CẢNH BÁO: Số từ DƯỚI 60% target → requiresRewrite PHẢI = true' : ''}
${wordRatio < 0.8 ? '⚠️ LƯU Ý: Số từ dưới 80% target → giảm điểm overallScore' : ''}
${!isFinalArc ? '⚠️ NON-FINALE: Kết chương PHẢI có ending hook/cliffhanger rõ ràng. Nếu thiếu, tạo issue severity major và requiresRewrite=true.' : '⚠️ FINALE ARC: Có thể kết chương đóng, không bắt buộc cliffhanger.'}

BÁO CÁO LẶP TỪ (tự động phân tích):
${repetitionReport}

BÁO CÁO TÍN HIỆU CHẤT LƯỢNG (tự động phân tích):
${buildSignalReport(content)}
${qualityComplianceSection}
NỘI DUNG CHƯƠNG (FULL):
${contentPreview}

Đánh giá và trả về JSON:
{
  "overallScore": <1-10>,
  "dopamineScore": <1-10>,
  "pacingScore": <1-10>,
  "endingHookScore": <1-10>,
  "issues": [{"type": "word_count|pacing|logic|detail|continuity|quality|dialogue", "description": "...", "severity": "minor|moderate|major|critical"}],
  "approved": <true nếu overallScore >= 6 VÀ wordRatio >= 70%>,
  "requiresRewrite": <true nếu overallScore <= 3 HOẶC wordRatio < 60% HOẶC có lỗi continuity major/critical>,
  "rewriteInstructions": "hướng dẫn cụ thể nếu cần rewrite — PHẢI nêu rõ từ bị lặp cần thay thế, scene nào thiếu comedy, scene nào thiếu nội tâm đa lớp"
}

KIỂM TRA MÂU THUẪN (BẮT BUỘC):
- Nếu nhân vật đã CHẾT mà xuất hiện lại sống -> type "continuity", severity "critical", requiresRewrite=true
- Nếu sức mạnh/cảnh giới MC bị THOÁI LUI vô lý -> type "continuity", severity "critical", requiresRewrite=true
- Nếu vi phạm quy tắc thế giới đã thiết lập -> type "continuity", severity "critical", requiresRewrite=true
- Nếu nhân vật hành xử trái ngược hoàn toàn với tính cách -> type "continuity", severity "major", requiresRewrite=true

KIỂM TRA CHẤT LƯỢNG BỔ SUNG (BẮT BUỘC):
- COMEDY: Nếu KHÔNG có hài hước → issue severity "moderate". CHỈ "major" nếu chương sinh hoạt/đối thoại mà không hài.
- LẶP TỪ: Dùng BÁO CÁO LẶP TỪ ở trên. >8 lần → severity "critical", requiresRewrite=true. >5 lần → severity "moderate". CHỈ "major" nếu ≥3 nhóm từ đều >5.
- NỘI TÂM: Nếu thiếu nội tâm đa lớp → severity "minor". CHỈ "moderate" nếu toàn bộ chương không có.
- GIỌNG NÓI: ≥3 nhân vật giống nhau → severity "moderate". 2 nhân vật → "minor".
- NHỊP ĐIỆU: Toàn bộ scenes cùng cường độ → pacingScore tối đa 5

KIỂM TRA TUÂN THỦ QUALITY MODULES (NẾU CÓ THÔNG TIN):
- FORESHADOWING: Nếu mục "YÊU CẦU TUÂN THỦ" có hint cần gieo (GIEO HINT BẮT BUỘC) mà chương KHÔNG chứa chi tiết tương ứng → type "quality", severity "major", description nêu rõ hint bị bỏ qua.
  Nếu có hint cần PAYOFF mà chương không callback → type "quality", severity "major".
- CHARACTER VOICE: Nếu có "signature traits" (câu cửa miệng, thói quen, cách nói) cho nhân vật xuất hiện trong chương mà nhân vật đó KHÔNG thể hiện bất kỳ trait nào → type "quality", severity "moderate".
- PACING BLUEPRINT: Nếu pacing blueprint chỉ định mood (VD: "CALM BEFORE STORM", "CLIMAX") mà chương viết hoàn toàn ngược (VD: blueprint là calm nhưng toàn action cao trào) → type "pacing", severity "moderate".`;

  try {
    const nonCombatGuard = genre && isNonCombatGenre(genre)
      ? `\n\nNON-COMBAT GENRE HARD CHECK (thể loại "${genre}"):
- Nếu chương có scene MC tham gia chiến đấu vật lý (đánh đấm/đâm chém/bắn/huyết chiến/bị truy sát hành hung trong đời thực) → issue type "continuity", severity "critical", verdict REWRITE.
- Nếu tiêu đề chương có "Huyết Chiến/Tử Chiến/Đại Chiến/Quyết Chiến" hoặc các từ khóa combat fantasy → issue "continuity", severity "critical", REWRITE.
- Nếu MC tham gia "giải đấu game/võ thuật" làm trục chính chương trong khi genre "${genre}" là kinh doanh/chính trường/tình cảm → issue "continuity", severity "critical", REWRITE.
- Conflict cho thể loại này PHẢI là thương chiến/chính trị/tình cảm — KHÔNG vũ lực. Nếu chương resolve conflict bằng vũ lực → REWRITE bằng phương án thương mại/đàm phán/lobby/PR.`
      : '';
    // VND currency hard check — applies to Vietnam-set genres OR any genre
    // whose world_description contains explicit VN markers (Đại Nam, Hà Nội,
    // Sài Gòn, Dân Quốc...). Catches "X xu / X nguyên / X lượng" leakage
    // from TQ webnovel templates into Vietnamese-set business stories.
    const vndGuard = genre && requiresVndCurrency(genre, worldDescription)
      ? `\n\nVND CURRENCY HARD CHECK (Vietnam-set genre "${genre}"):
- Nếu chương có cụm \\d+ kèm "xu", "nguyên", hoặc "lượng vàng/lượng bạc" làm đơn vị tiền giao dịch hàng ngày (mua bán, vay nợ, lương, giá đất) → issue type "continuity", severity "critical", verdict REWRITE.
- Đơn vị tiền HỢP LỆ DUY NHẤT cho thể loại này: "đồng / nghìn đồng / triệu đồng / tỷ đồng" (VND).
- Cho phép "lượng vàng" CHỈ khi đề cập như tài sản tích trữ/đầu tư (1 lượng ≈ 4-5 triệu đồng), KHÔNG dùng thanh toán hàng ngày.
- Nếu phát hiện "tỷ xu" / "triệu nguyên" / "5 ngàn xu" → REWRITE thay bằng số đồng tương đương.
- MATH SANITY: nếu MC có X đồng đầu chương + chi Y mà Y > X mà KHÔNG có thu nhập / vay vốn được setup rõ ràng → REWRITE.`
      : '';
    const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 4096, systemPrompt: CRITIC_SYSTEM + nonCombatGuard + vndGuard }, { jsonMode: true, tracking: projectId ? { projectId, task: 'critic', chapterNumber: outline.chapterNumber } : undefined });

    if (!res.content) {
      // Fail closed: don't approve on error
      return createFailClosedCriticOutput(wordCount, targetWords);
    }

    const parsed = parseJSON<CriticOutput>(res.content);

    if (!parsed) {
      return createFailClosedCriticOutput(wordCount, targetWords);
    }

    // Hard enforcement: critical/major continuity issues must be rewritten
    const forcedRewriteIssues = (parsed.issues || []).filter((issue: CriticIssue) => {
      if (issue.type !== 'continuity') return false;
      return issue.severity === 'critical' || issue.severity === 'major';
    });

    if (forcedRewriteIssues.length > 0) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, 3);
      if (!parsed.rewriteInstructions || parsed.rewriteInstructions.trim().length === 0) {
        parsed.rewriteInstructions = `Sửa lỗi continuity: ${forcedRewriteIssues.map((i: CriticIssue) => i.description).join('; ')}`;
      }
    }

    // Override: force rewrite if word count is critically low
    if (wordRatio < 0.6) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      if (!parsed.rewriteInstructions) {
        parsed.rewriteInstructions = `Chương quá ngắn (${wordCount}/${targetWords} từ). Phải viết đầy đủ.`;
      }
    }

    // Hard enforcement: severe word repetition triggers rewrite
    const repetitionIssues = detectSevereRepetition(content);
    if (repetitionIssues.length > 0) {
      parsed.issues = parsed.issues || [];
      for (const ri of repetitionIssues) {
        parsed.issues.push(ri);
      }
      // Only force rewrite for critical repetition (generic 8+ or plot_element 12+)
      const hasCritical = repetitionIssues.some(ri => ri.severity === 'critical');
      if (hasCritical) {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        const repetitionGuide = repetitionIssues.map(ri => ri.description).join('; ');
        parsed.rewriteInstructions = (parsed.rewriteInstructions || '') + ` Sửa lặp từ: ${repetitionGuide}`;
      }
      // Moderate repetition: just log, don't penalize score (Critic already sees report)
    }

    // Hard enforcement: quality signal floor
    const signal = analyzeQualitySignals(content);
    const missingQualityAxes: string[] = [];
    parsed.issues = parsed.issues || [];

    if (signal.comedyCount === 0) {
      missingQualityAxes.push('comedy');
      parsed.issues.push({
        type: 'quality',
        severity: 'moderate',
        description: 'Thiếu comedy beat tự nhiên (não bổ/vô sỉ/phản kém/tự giễu).',
      });
    }

    if (signal.innerCount === 0) {
      missingQualityAxes.push('inner_monologue');
      parsed.issues.push({
        type: 'quality',
        severity: 'moderate',
        description: 'Thiếu nội tâm đa lớp rõ ràng.',
      });
    }

    if (signal.slowCount === 0) {
      missingQualityAxes.push('slow_scene');
      parsed.issues.push({
        type: 'pacing',
        severity: 'moderate',
        description: 'Thiếu nhịp chậm để tạo tương phản cảm xúc.',
      });
    }

    if (signal.dialogueRatio >= 0.18 && signal.subtextCount === 0) {
      missingQualityAxes.push('subtext');
      parsed.issues.push({
        type: 'dialogue',
        severity: 'moderate',
        description: 'Đối thoại thiếu subtext (nói thẳng quá nhiều).',
      });
    }

    if (missingQualityAxes.length >= 2) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, 5);
      const guidance = `Bổ sung bắt buộc: ${missingQualityAxes.join(', ')}.`;
      parsed.rewriteInstructions = parsed.rewriteInstructions
        ? `${parsed.rewriteInstructions} ${guidance}`
        : guidance;
    }

    // Hard enforcement for non-finale chapters: ending hook is required
    if (!isFinalArc && !hasCliffhangerSignal(content)) {
      parsed.issues = parsed.issues || [];
      parsed.issues.push({
        type: 'pacing',
        description: 'Kết chương thiếu lực kéo đọc tiếp (cliffhanger/ending hook yếu hoặc không có).',
        severity: 'major',
      });
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, 5);
      if (!parsed.rewriteInstructions || parsed.rewriteInstructions.trim().length === 0) {
        parsed.rewriteInstructions = 'Viết lại đoạn kết để có cliffhanger/hook rõ ràng, tạo lý do đọc tiếp ngay chương sau.';
      }
    }

    return parsed;
  } catch (error) {
    // Fail closed: don't approve on error
    return createFailClosedCriticOutput(wordCount, targetWords);
  }
}

function createFailClosedCriticOutput(wordCount: number, targetWords: number): CriticOutput {
  // True fail-closed: if Critic couldn't parse, we have ZERO signal about
  // chapter quality. Previous version only required rewrite when word
  // count was <60% — meaning a decent-length but flawed chapter (logic
  // breaks, wrong MC name, fake currency) would ship silently.
  // User feedback: "cấm fallback hết, vì cứ 1 bộ nó im im nó fallback
  // là nó sẽ viết bậy nếu không theo đủ quy trình."
  // → Always force rewrite on Critic parse failure. Caller's retry loop
  // will burn an extra Writer call but the alternative is silent
  // bug-shipping. If we exhaust retries the loop throws — better than
  // saving bad content.
  return {
    overallScore: 3,
    dopamineScore: 3,
    pacingScore: 3,
    issues: [{
      type: 'critic_error',
      description: `Critic failed to parse output (wordCount=${wordCount}/${targetWords}). Forcing rewrite — no silent approval.`,
      severity: 'critical',
    }],
    approved: false,
    requiresRewrite: true,
    rewriteInstructions: `Critic không kiểm tra được chương này (parse failed). Viết lại CHẶT CHẼ theo brief, KHÔNG fallback padding. Đảm bảo: đủ từ ${targetWords}, không lặp setup, không lệch tên nhân vật/tiền tệ/địa danh.`,
  };
}

// ── Content Cleaning ─────────────────────────────────────────────────────────

function cleanContent(content: string): string {
  let cleaned = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^(?:Scene|Cảnh|SCENE)\s*\d+\s*[:：]\s*/gm, '')
    .replace(/\bCliffhanger\b/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Strip repetition loops
  cleaned = cleaned.replace(/(\S+(?:\s+\S+){1,5}?)(?:\s+\1){2,}/g, '$1');
  cleaned = cleaned.replace(/(\S{2,})(?:\s+\1){2,}/g, '$1');

  return cleaned;
}

// ── Title Extraction ─────────────────────────────────────────────────────────

function extractTitle(
  content: string,
  chapterNumber: number,
  outlineTitle: string,
  previousTitles: string[],
): string {
  // Try outline title first
  if (outlineTitle && outlineTitle.length >= 4 && outlineTitle.length <= 60) {
    if (!previousTitles.slice(0, 20).includes(outlineTitle)) {
      return outlineTitle;
    }
  }

  // Try extracting from content
  const lines = content.split('\n').slice(0, 8);
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^Chương\s+\d+\s*[:\-–—]\s*(.+)/i);
    if (match && match[1].length >= 4 && match[1].length <= 60) {
      return match[1].trim();
    }
  }

  // Title similarity check - if too similar, generate unique fallback
  let finalTitle = outlineTitle || `Chương ${chapterNumber}`;
  if (previousTitles.length > 0) {
    const { similarity } = titleChecker.findMostSimilar(finalTitle, previousTitles);
    if (similarity >= 0.7) {
      // Generate fallback from content
      const sentences = content.slice(0, 500).match(/[^.!?。！？]+[.!?。！？]/g) || [];
      const shortSentence = sentences.find(s => {
        const trimmed = s.trim();
        return trimmed.length >= 5 && trimmed.length <= 40
          && !trimmed.startsWith('—') && !trimmed.startsWith('-')
          && !trimmed.startsWith('"') && !trimmed.startsWith('「');
      });
      finalTitle = shortSentence
        ? shortSentence.trim().replace(/^["'"「『\s]+|["'"」』\s.!?。！？]+$/g, '')
        : `Chương ${chapterNumber}`;
    }
  }

  return finalTitle;
}

function synthesizeFallbackCliffhanger(outline: ChapterOutline): string {
  const lastScene = outline.scenes?.[outline.scenes.length - 1];
  const conflict = lastScene?.conflict?.trim();
  const resolution = lastScene?.resolution?.trim();

  if (conflict && conflict.length > 8) {
    return `Mâu thuẫn cuối chương vẫn chưa khép: ${conflict}`;
  }

  if (resolution && resolution.length > 8) {
    return `Sau khi ${resolution.toLowerCase()}, một biến cố mới bất ngờ xuất hiện.`;
  }

  return 'Khi mọi thứ tưởng như đã yên, một nguy cơ mới đột ngột xuất hiện ngay trước mắt.';
}

function hasCliffhangerSignal(content: string): boolean {
  const tail = content.slice(-500).toLowerCase();
  const signals = [
    // Action / Suspense
    '?', '...', '…', 'bất ngờ', 'đột nhiên', 'bỗng', 'sững sờ', 'kinh hãi',
    'ngay lúc đó', 'vừa khi', 'tiếng động', 'cánh cửa', 'bóng đen', 'khựng lại',
    'không thể tin', 'run lên', 'hô lớn',
    // Business / Curiosity / Chill
    'chờ đợi', 'kết quả', 'ngày mai', 'sáng mai', 'mỉm cười', 'thú vị',
    'bắt đầu', 'chuẩn bị', 'mong đợi', 'thành quả', 'thu hoạch', 'giá trị',
    'chưa biết', 'bí ẩn', 'rốt cuộc', 'suy nghĩ'
  ];

  let score = 0;
  for (const signal of signals) {
    if (tail.includes(signal)) score += 1;
  }

  return score >= 2;
}

type QualitySignals = {
  comedyCount: number;
  innerCount: number;
  slowCount: number;
  subtextCount: number;
  dialogueRatio: number;
};

function analyzeQualitySignals(content: string): QualitySignals {
  const lower = content.toLowerCase();
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const dialogueLines = lines.filter(l => l.startsWith('—') || l.startsWith('-')).length;
  const dialogueRatio = lines.length > 0 ? dialogueLines / lines.length : 0;

  const comedySignals = [
    'tự giễu', 'mỉa mai', 'khô khan', 'ngớ ngẩn', 'buồn cười',
    'não bổ', 'vô sỉ', 'tỉnh bơ', 'lật lọng', 'dở khóc dở cười', 'ngượng',
  ];
  const innerSignals = [
    'thầm nghĩ', 'trong lòng', 'tâm trí', 'nội tâm', 'sâu thẳm',
    'không dám thừa nhận', 'nỗi sợ', 'khao khát',
  ];
  const slowSignals = [
    'yên tĩnh', 'bình yên', 'nhắm mắt', 'hít thở', 'uống trà', 'nghỉ ngơi',
    'gió nhẹ', 'nhìn bầu trời',
  ];
  const subtextSignals = [
    'im lặng', 'khựng lại', 'không trả lời', 'chỉ cười', 'đổi chủ đề',
    'ánh mắt', 'nói một đằng',
  ];

  const countByPresence = (signals: string[]) => signals.filter(s => lower.includes(s)).length;

  return {
    comedyCount: countByPresence(comedySignals),
    innerCount: countByPresence(innerSignals),
    slowCount: countByPresence(slowSignals),
    subtextCount: countByPresence(subtextSignals),
    dialogueRatio,
  };
}

function buildSignalReport(content: string): string {
  const s = analyzeQualitySignals(content);
  return [
    `- Comedy signals: ${s.comedyCount}`,
    `- Inner-monologue signals: ${s.innerCount}`,
    `- Slow-scene signals: ${s.slowCount}`,
    `- Subtext signals: ${s.subtextCount}`,
    `- Dialogue ratio: ${Math.round(s.dialogueRatio * 100)}%`,
  ].join('\n');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Hard-fail gate. Cheap regex check that catches the "Writer ignored the
 * brief and padded with rebirth/golden-finger monologue" failure mode
 * without spending Critic tokens. Returns a non-empty reason string when
 * the chapter must be regenerated, or empty string when content passes.
 *
 * Caller (writeChapter loop) treats non-empty as a "force regen" signal
 * and feeds the reason back to Writer as rewriteInstructions before
 * Critic is even invoked. This is intentionally stricter than the Critic
 * rule: Critic measures relative quality, this gate measures absolute
 * floors. Writer can recover by following the brief.
 *
 * Floors (per-chapter, not per-arc):
 *   - rebirth phrases ("kiếp trước", "30 năm tương lai", "ký ức tiền kiếp",
 *     "tương lai biết trước"): >5 occurrences = fail
 *   - common golden-finger names: >7 occurrences = fail. We sniff a small
 *     dictionary of project-specific names from the world_description /
 *     story_outline so e.g. "Hải Tâm" in a Ngư Dân chapter triggers, not
 *     all golden fingers everywhere.
 *
 * The thresholds are deliberately above the Writer-side rule (3 / 5) so
 * mild over-shooting still passes; only egregious padding fails.
 */
function detectHardFallback(content: string, options?: WriteChapterOptions): string {
  // Politically charged terms — content-safety hard cap. Any single hit
  // forces regen; this is not a density check. The list covers Vietnamese
  // diaspora politics (post-1975 refugee identity / anti-communist press)
  // and home-country political ideology — neither belongs in entertainment
  // fiction on this platform. Common false-positives mitigated by case
  // sensitivity (we match exact phrasing, not loose substrings).
  const POLITICAL_TERMS = [
    /\bNgười Việt Tự Do\b/,
    /\bNgười Việt(?= báo| tạp chí| nhật báo| weekly)/i,  // "Người Việt báo" etc.
    /\bViệt Nam Cộng Hòa\b/,
    /\bVNCH\b/,
    /\bMặt Trận(?:\s+(?:Quốc Gia|Giải Phóng|Tổ Quốc|Dân Tộc))/,
    /\bVăn Bút Hải Ngoại\b/,
    /\bSài Gòn Nhỏ\b/,
    /\bLittle Saigon\b/,
    /\btỵ nạn chính trị\b/,
    /\bthuyền nhân\b/i,
    /\bvượt biên\b/i,
    /\btháng tư đen\b/i,
    /\bgiải phóng miền Nam\b/i,
    /\bcộng sản\b/i,
    /\b30[\/\.\s\-]?4[\/\.\s\-]?1975\b/,
    /\b1975(?:[^\d]|$).{0,40}(?:di cư|tỵ nạn|chiến tranh|sụp đổ|giải phóng|chính trị)/i,
    /\bdi cư\b.{0,60}\b(?:sau chiến tranh|chính trị|1975|tỵ nạn)\b/i,
  ];
  for (const re of POLITICAL_TERMS) {
    const match = content.match(re);
    if (match) {
      return `political content (matched "${match[0].slice(0, 50)}") — banned by content-safety guard`;
    }
  }

  const REBIRTH_PHRASES = [
    /\bkiếp trước\b/gi,
    /\b30 năm tương lai\b/gi,
    /\bký ức tiền kiếp\b/gi,
    /\btương lai biết trước\b/gi,
    /\bba mươi năm tương lai\b/gi,
  ];
  let rebirthCount = 0;
  for (const re of REBIRTH_PHRASES) {
    rebirthCount += (content.match(re) ?? []).length;
  }
  if (rebirthCount > 5) {
    return `setup repetition (rebirth phrases ${rebirthCount}× in chapter, max 3 allowed in WRITER_SYSTEM, hard fail >5)`;
  }

  // VND CURRENCY hard check (added 2026-04-29 sweep): for VN-set genres,
  // any "X xu" / "X nguyên" pattern (digit + currency unit) is a deterministic
  // fail. AI-side Critic was missing some leaks; this regex check is independent
  // of AI verdict and forces Writer regen with explicit instruction.
  // KEEP: "xu nịnh" (flatter), "nguyên tử/thủy/tắc/liệu" (Vietnamese compounds).
  // BLOCK: "127.000 xu", "5 triệu xu", "350 nghìn xu", "1000 nguyên".
  if (options?.worldDescription) {
    const isVnSet = /Đại Nam|Hải Long Đô|Phượng Đô|Trung Đô|Sài Gòn|Hà Nội|Việt Nam|Dân Quốc|Đại Việt/i.test(options.worldDescription);
    if (isVnSet) {
      // Match digit (with optional commas/dots) immediately followed by xu OR
      // numeric quantifier (triệu/nghìn/trăm/tỷ/ngàn) followed by xu.
      const xuLeak = content.match(/\d[\d.,]*\s*xu\b|(?:triệu|nghìn|trăm|tỷ|ngàn)\s+xu\b/);
      if (xuLeak) {
        return `VND currency leak: "${xuLeak[0]}" — VN-set novel must use "đồng" not "xu" for daily transactions. Banned for do-thi/quan-truong + VN-marker world_description.`;
      }
      // Match digit + nguyên but exclude common Vietnamese compounds
      // (nguyên tử / nguyên thủy / nguyên tắc / nguyên liệu / nguyên chất / nguyên bản / nguyên nhân / nguyên thái / nguyên thủ / nguyên hình / nguyên sơ).
      const nguyenLeak = content.match(/\d[\d.,]*\s*nguyên(?!\s*(?:tử|thủy|tắc|liệu|chất|bản|nhân|thái|thủ|hình|sơ|tháng|năm|đán|tiêu))/);
      if (nguyenLeak) {
        return `VND currency leak: "${nguyenLeak[0]}" — VN-set novel must use "đồng" not "nguyên" for currency.`;
      }
    }
  }

  // Sniff golden-finger name from world_description. Common patterns:
  //   "Bàn Tay Vàng — <Name>" or "golden finger ... <Name>"
  //   '"<Name>" — passive cảm nhận'
  //   "Hệ thống <Name>" or "<Name> — <ability>"
  // Cap at the ones we've seen leak: Hải Tâm, Hệ Thống Nhắc Nhở, etc.
  // For deterministic check we extract any 1-2 word capitalised phrase
  // marked with em-dash in the world_description.
  const world = options?.worldDescription || '';
  const goldenFingerCandidates = new Set<string>();
  // pattern: '"Hải Tâm" — passive...' or '"Hệ Thống Nhắc Nhở" cấp...'
  const quotedRe = /[""]([A-ZÀÁÂÃĐÈÉÊÌÍÒÓÔÕÙÚĂẠ-Ỹ][^""]{2,30})[""]\s*[—\-–:]/g;
  let m: RegExpExecArray | null;
  while ((m = quotedRe.exec(world)) !== null) {
    goldenFingerCandidates.add(m[1].trim());
  }
  // pattern: 'Bàn Tay Vàng (...): "Tên đặc biệt"' or 'Cheat: <Name>'
  const cheatRe = /(?:Bàn Tay Vàng|Cheat|Golden Finger|Hệ thống|Hệ Thống)[^.\n]{0,80}?[""]([^""]{2,30})[""]/g;
  while ((m = cheatRe.exec(world)) !== null) {
    goldenFingerCandidates.add(m[1].trim());
  }
  // Common literal names that leak across novels — check generically too
  const COMMON_GF = ['Hệ Thống Nhắc Nhở', 'Bàn Tay Vàng', 'Hệ Thống', 'Hải Tâm', 'Đồ Giám Yêu Ma', 'Sổ Sinh Tử'];
  for (const name of COMMON_GF) {
    if (world.includes(name)) goldenFingerCandidates.add(name);
  }

  for (const name of goldenFingerCandidates) {
    if (!name || name.length < 3) continue;
    // Whole-word-ish match to avoid matching substrings
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escapedName, 'g');
    const count = (content.match(re) ?? []).length;
    if (count > 7) {
      return `golden-finger name "${name}" appears ${count}× in chapter (max 5 allowed in WRITER_SYSTEM, hard fail >7)`;
    }
  }

  return '';
}

/**
 * Detect severe word repetition and return CriticIssue objects.
 * Used for hard enforcement in runCritic.
 *
 * Words are categorized:
 * - 'generic': colors, adjectives, emotions — strict thresholds (5=moderate, 8=critical)
 * - 'plot_element': words that may naturally recur as plot elements — relaxed thresholds (8=moderate, 12=critical)
 */
function detectSevereRepetition(content: string): CriticIssue[] {
  const text = content.toLowerCase();
  const issues: CriticIssue[] = [];

  const tracked: Record<string, { variants: string[]; category: 'generic' | 'plot_element' }> = {
    'tím sẫm': { variants: ['tím sẫm', 'tím đen', 'sắc tím'], category: 'generic' },
    'vàng kim': { variants: ['vàng kim', 'ánh vàng kim'], category: 'generic' },
    'đỏ rực': { variants: ['đỏ rực', 'đỏ thẫm'], category: 'generic' },
    'rực rỡ': { variants: ['rực rỡ'], category: 'generic' },
    'kinh hoàng': { variants: ['kinh hoàng', 'kinh hãi', 'kinh ngạc'], category: 'generic' },
    'sững sờ': { variants: ['sững sờ', 'sững người'], category: 'generic' },
    'mờ ảo': { variants: ['mờ ảo', 'mờ nhạt'], category: 'generic' },
    'đặc quánh': { variants: ['đặc quánh'], category: 'generic' },
    'bùng phát': { variants: ['bùng phát', 'bùng nổ'], category: 'generic' },
    'ken két': { variants: ['ken két'], category: 'generic' },
    // AI structural patterns — overused sentence constructions
    'là một': { variants: ['là một'], category: 'generic' },
    'bắt đầu': { variants: ['bắt đầu'], category: 'generic' },
    'mang theo': { variants: ['mang theo'], category: 'generic' },
    'lạnh lẽo': { variants: ['lạnh lẽo', 'lạnh buốt', 'lạnh lùng'], category: 'generic' },
    'run rẩy': { variants: ['run rẩy', 'run lên', 'run bần bật'], category: 'generic' },
    'tỏa ra': { variants: ['tỏa ra'], category: 'generic' },
    'đôi mắt': { variants: ['đôi mắt'], category: 'generic' },
    'như thể': { variants: ['như thể'], category: 'generic' },
    'dường như': { variants: ['dường như'], category: 'generic' },
    // Plot element words — naturally recur more often
    'pixel hóa': { variants: ['pixel hóa', 'pixel'], category: 'plot_element' },
    'rỉ sét': { variants: ['rỉ sét'], category: 'plot_element' },
    'linh khí': { variants: ['linh khí'], category: 'plot_element' },
    'đan điền': { variants: ['đan điền'], category: 'plot_element' },
  };

  for (const [groupName, { variants, category }] of Object.entries(tracked)) {
    let total = 0;
    for (const variant of variants) {
      const regex = new RegExp(variant, 'gi');
      const matches = text.match(regex);
      if (matches) total += matches.length;
    }

    const criticalThreshold = category === 'plot_element' ? 12 : 8;
    const moderateThreshold = category === 'plot_element' ? 8 : 5;

    if (total >= criticalThreshold) {
      issues.push({
        type: 'quality',
        description: `Lặp từ nghiêm trọng: "${groupName}" xuất hiện ${total} lần (${category === 'plot_element' ? 'plot keyword, ngưỡng cao' : 'generic'}). Thay bằng từ đồng nghĩa hoặc miêu tả gián tiếp.`,
        severity: 'critical',
      });
    } else if (total >= moderateThreshold) {
      issues.push({
        type: 'quality',
        description: `Lặp từ: "${groupName}" xuất hiện ${total} lần. Giảm xuống tối đa ${category === 'plot_element' ? '6' : '3'} lần, dùng từ thay thế.`,
        severity: 'moderate',
      });
    }
  }

  return issues;
}

/**
 * Analyze word repetition in chapter content.
 * Returns a human-readable report for the Critic to use.
 * Tracks colors, adjectives, and common AI-repetitive patterns.
 */
function buildRepetitionReport(content: string): string {
  const text = content.toLowerCase();

  // Words/phrases to track for repetition
  const tracked: Record<string, string[]> = {
    // Colors
    'tím sẫm': ['tím sẫm', 'tím đen', 'sắc tím'],
    'vàng kim': ['vàng kim', 'ánh vàng kim'],
    'đỏ rực': ['đỏ rực', 'đỏ thẫm', 'đỏ rỉ sét'],
    'bạc trắng': ['bạc trắng', 'trắng bạc', 'bạc lạnh'],
    'đen ngòm': ['đen ngòm', 'đen kịt', 'đen tuyền'],
    // Adjectives
    'rực rỡ': ['rực rỡ'],
    'mờ ảo': ['mờ ảo', 'mờ nhạt'],
    'đặc quánh': ['đặc quánh'],
    'chập chờn': ['chập chờn'],
    // Emotions
    'kinh hoàng': ['kinh hoàng', 'kinh hãi', 'kinh ngạc'],
    'sững sờ': ['sững sờ', 'sững người'],
    // Sounds
    'ken két': ['ken két'],
    'rít lên': ['rít lên', 'rít'],
    // States
    'pixel hóa': ['pixel hóa', 'pixel'],
    'rỉ sét': ['rỉ sét'],
    'tan rã': ['tan rã', 'phân rã'],
    'bùng phát': ['bùng phát', 'bùng nổ'],
    'run rẩy': ['run rẩy', 'run lên', 'run bần bật'],
    // AI structural patterns — sentence constructions AI overuses
    'là một': ['là một'],
    'bắt đầu': ['bắt đầu'],
    'mang theo': ['mang theo'],
    'lạnh lẽo': ['lạnh lẽo', 'lạnh buốt', 'lạnh lùng'],
    'tỏa ra': ['tỏa ra'],
    'đôi mắt': ['đôi mắt'],
    'như thể': ['như thể'],
    'dường như': ['dường như'],
  };

  const counts: Array<{ group: string; count: number; variants: string }> = [];

  for (const [groupName, variants] of Object.entries(tracked)) {
    let total = 0;
    const found: string[] = [];
    for (const variant of variants) {
      const regex = new RegExp(variant, 'gi');
      const matches = text.match(regex);
      if (matches) {
        total += matches.length;
        found.push(`${variant}(${matches.length})`);
      }
    }
    if (total >= 3) {
      counts.push({ group: groupName, count: total, variants: found.join(', ') });
    }
  }

  if (counts.length === 0) {
    return 'Không phát hiện lặp từ nghiêm trọng.';
  }

  counts.sort((a, b) => b.count - a.count);
  const lines = counts.map(c => {
    const severity = c.count >= 8 ? '🔴 CRITICAL' : c.count >= 5 ? '🟡 MAJOR' : '⚪ MINOR';
    return `${severity}: "${c.group}" xuất hiện ${c.count} lần [${c.variants}]`;
  });

  return lines.join('\n');
}

function generateMinimalScenes(count: number, wordsPerScene: number, defaultPOV: string): SceneOutline[] {
  return Array.from({ length: count }, (_, i) => ({
    order: i + 1,
    setting: '',
    characters: [],
    goal: `Scene ${i + 1}`,
    conflict: '',
    resolution: '',
    estimatedWords: wordsPerScene,
    pov: defaultPOV,
  }));
}

async function loadConstraintSection(projectId: string, context: string, protagonistName: string): Promise<string> {
  try {
    const keywords: string[] = [protagonistName];

    // Extract potential character/location names from context
    const nameMatches = context.match(/[A-Z][a-zÀ-ỹ]+(?:\s+[A-Z][a-zÀ-ỹ]+)*/g) || [];
    for (const name of nameMatches.slice(0, 10)) {
      if (name.length > 2 && !keywords.includes(name)) {
        keywords.push(name);
      }
    }

    const extractor = getConstraintExtractor();
    const constraints = await extractor.getRelevantConstraints(projectId, keywords);

    if (constraints.length === 0) return '';

    const hard = constraints.filter(c => c.immutable);
    const soft = constraints.filter(c => !c.immutable);

    const parts: string[] = [];
    if (hard.length > 0) {
      parts.push('## RÀNG BUỘC CỨNG (TUYỆT ĐỐI KHÔNG ĐƯỢC VI PHẠM):');
      for (const c of hard) parts.push(`- ${c.context}`);
    }
    if (soft.length > 0) {
      parts.push('## TRẠNG THÁI HIỆN TẠI (có thể thay đổi nếu có lý do):');
      for (const c of soft) parts.push(`- ${c.context}`);
    }

    return '\n' + parts.join('\n') + '\n';
  } catch {
    return '';
  }
}

function buildTopicSection(topicId?: string): string {
  if (!topicId) return '';

  for (const genreConfig of Object.values(GENRE_CONFIG)) {
    const topic = genreConfig.topics.find(t => t.id === topicId);
    if (topic && topic.topicPromptHints) {
      return `\nTHÔNG TIN ĐẶC THÙ THỂ LOẠI (${topic.name}):\n` + 
             topic.topicPromptHints.map(h => `- ${h}`).join('\n') + '\n';
    }
  }

  return '';
}

function getDominantSceneType(outline: ChapterOutline): string {
  const sceneCounts: Record<string, number> = {};

  for (const scene of outline.scenes) {
    const type = inferSceneType(scene);
    sceneCounts[type] = (sceneCounts[type] || 0) + 1;
  }

  for (const dp of outline.dopaminePoints || []) {
    if (['face_slap', 'power_reveal', 'revenge'].includes(dp.type)) {
      sceneCounts['action'] = (sceneCounts['action'] || 0) + 1;
    } else if (['breakthrough'].includes(dp.type)) {
      sceneCounts['cultivation'] = (sceneCounts['cultivation'] || 0) + 1;
    } else if (['beauty_encounter'].includes(dp.type)) {
      sceneCounts['romance'] = (sceneCounts['romance'] || 0) + 1;
    }
  }

  let maxType = 'action';
  let maxCount = 0;
  for (const [type, count] of Object.entries(sceneCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  }
  return maxType;
}

function inferSceneType(scene: { goal: string; conflict: string; resolution?: string; setting?: string }): SceneType {
  const text = `${scene.goal} ${scene.conflict} ${scene.resolution || ''} ${scene.setting || ''}`.toLowerCase();

  if (/chiến đấu|đánh|tấn công|kiếm|quyền|sát|giết|đấu|chiêu thức|pháp thuật/.test(text)) return 'action';
  if (/tu luyện|đột phá|đan điền|linh khí|cảnh giới|thiền/.test(text)) return 'cultivation';
  if (/tiết lộ|bí mật|phát hiện|sự thật/.test(text)) return 'revelation';
  if (/tình cảm|yêu|nhớ|thương|nàng|mỹ nhân/.test(text)) return 'romance';
  if (/hội thoại|nói chuyện|bàn bạc|thương lượng/.test(text)) return 'dialogue';
  if (/nguy hiểm|căng thẳng|bẫy|vây/.test(text)) return 'tension';
  if (/hài|cười|buồn cười/.test(text)) return 'comedy';
  return 'dialogue';
}

function buildVocabularyHints(outline: ChapterOutline, vocabulary: VocabularyGuide): string {
  if (!vocabulary) return '';

  const hints: string[] = ['TỪ VỰNG BẮT BUỘC SỬ DỤNG (dùng ít nhất 5-8 biểu đạt):'];

  const hasAction = outline.scenes.some(s => inferSceneType(s) === 'action');
  const hasCultivation = outline.scenes.some(s => inferSceneType(s) === 'cultivation');
  const dopamineTypes = (outline.dopaminePoints || []).map(d => d.type);

  if (hasAction || dopamineTypes.includes('face_slap') || dopamineTypes.includes('power_reveal')) {
    hints.push(`Chiêu thức: ${vocabulary.powerExpressions?.techniques?.slice(0, 4).join(', ') || ''}`);
    hints.push(`Uy lực: ${vocabulary.powerExpressions?.weakToStrong?.slice(0, 4).join(', ') || ''}`);
  }

  if (hasCultivation || dopamineTypes.includes('breakthrough')) {
    hints.push(`Đột phá: ${vocabulary.powerExpressions?.breakthrough?.slice(0, 4).join(', ') || ''}`);
  }

  if (dopamineTypes.includes('face_slap') || dopamineTypes.includes('revenge')) {
    hints.push(`Khinh bỉ: ${vocabulary.emotions?.contempt?.slice(0, 4).join(', ') || ''}`);
    hints.push(`Phẫn nộ: ${vocabulary.emotions?.anger?.slice(0, 4).join(', ') || ''}`);
  }

  hints.push(`Kinh ngạc: ${vocabulary.emotions?.shock?.slice(0, 4).join(', ') || ''}`);
  hints.push(`Quyết tâm: ${vocabulary.emotions?.determination?.slice(0, 3).join(', ') || ''}`);

  if ((outline.tensionLevel || 50) >= 70) {
    hints.push(`Bầu không khí: ${vocabulary.atmosphere?.tense?.slice(0, 3).join(', ') || ''}`);
  }

  hints.push(`Xưng hô bề trên: ${vocabulary.honorifics?.superior?.slice(0, 4).join(', ') || ''}`);
  hints.push(`Xưng hô ngang hàng: ${vocabulary.honorifics?.peer?.slice(0, 4).join(', ') || ''}`);

  return hints.join('\n');
}

/**
 * Build genre-specific anti-cliche section for Writer prompt.
 * Supplements the static WRITER_SYSTEM anti-cliche rules with genre-targeted bans.
 */
function buildGenreAntiClicheSection(genre: GenreType): string {
  const phrases = getGenreAntiCliche(genre);
  if (phrases.length === 0) return '';
  return `\nCẤM CỤM TỪ CLICHÉ THỂ LOẠI (${genre}):
${phrases.map(p => `- "${p}"`).join('\n')}
→ Thay bằng miêu tả cụ thể, hành động thực tế, hoặc chi tiết 5 giác quan.\n`;
}

/**
 * Extract foreshadowing GIEO/PAYOFF hints from context and format as
 * forceful instructions for the Architect. This ensures the Architect
 * explicitly plans scenes that incorporate pending foreshadowing hints
 * rather than leaving them buried in the general context.
 */
function extractForeshadowingForArchitect(context: string): string {
  if (!context) return '';

  const foreshadowMatch = context.match(/═══ FORESHADOWING[\s\S]*?(?=═══ [A-Z]|\[|$)/);
  if (!foreshadowMatch) return '';

  const parts: string[] = [];

  // Extract GIEO hints (must plant)
  const plantMatches = [...foreshadowMatch[0].matchAll(/🌱 GIEO HINT\s*\[([^\]]+)\]:\s*(.+)/g)];
  if (plantMatches.length > 0) {
    parts.push('🌱 FORESHADOWING — GIEO BẮT BUỘC (Architect PHẢI lên kế hoạch scene chứa hint):');
    for (const m of plantMatches) {
      parts.push(`  - [${m[1]}] ${m[2].trim().slice(0, 200)}`);
    }
    parts.push('  → Chọn scene PHÙ HỢP NHẤT để gieo hint một cách TỰ NHIÊN. Ghi rõ trong scene goal/resolution.');
  }

  // Extract PAYOFF hints (must resolve)
  const payoffMatches = [...foreshadowMatch[0].matchAll(/💥 PAYOFF HINT:\s*(.+)/g)];
  const payoffDescMatches = [...foreshadowMatch[0].matchAll(/→ Callback rõ ràng:\s*"([^"]+)"/g)];
  if (payoffMatches.length > 0) {
    parts.push('💥 FORESHADOWING — PAYOFF BẮT BUỘC (Architect PHẢI tạo scene callback):');
    for (let i = 0; i < payoffMatches.length; i++) {
      const hint = payoffMatches[i][1].trim().slice(0, 200);
      const desc = payoffDescMatches[i]?.[1] || '';
      parts.push(`  - Hint: ${hint}${desc ? ` → Payoff: ${desc}` : ''}`);
    }
    parts.push('  → Tạo khoảnh khắc "à, hóa ra hồi đó..." — người đọc nhớ lại chi tiết gốc.');
  }

  // Extract overdue hints
  const overdueMatches = [...foreshadowMatch[0].matchAll(/⏰ OVERDUE HINT[^:]*:\s*"([^"]+)"\s*→\s*"([^"]+)"/g)];
  if (overdueMatches.length > 0) {
    parts.push('⏰ FORESHADOWING — SẮP HẾT HẠN (ưu tiên cao):');
    for (const m of overdueMatches) {
      parts.push(`  - "${m[1].slice(0, 150)}" → payoff: "${m[2].slice(0, 150)}"`);
    }
    parts.push('  → Bắt đầu setup payoff NGAY trong chương này.');
  }

  if (parts.length === 0) return '';
  return '\n' + parts.join('\n') + '\n';
}

/**
 * Extract quality module expectations from context for Critic compliance verification.
 * Pulls foreshadowing hints, character signature traits, and pacing mood
 * so the Critic can verify the Writer actually used them.
 */
function buildQualityComplianceSection(context: string): string {
  if (!context) return '';
  const parts: string[] = [];

  // Extract foreshadowing hints (GIEO and PAYOFF sections)
  const foreshadowMatch = context.match(/═══ FORESHADOWING[\s\S]*?(?=═══ [A-Z]|$)/);
  if (foreshadowMatch) {
    const hintLines: string[] = [];
    const plantMatches = foreshadowMatch[0].matchAll(/🌱 GIEO HINT[^:]*:\s*(.+)/g);
    for (const m of plantMatches) hintLines.push(`- GIEO: ${m[1].trim().slice(0, 150)}`);
    const payoffMatches = foreshadowMatch[0].matchAll(/💥 PAYOFF HINT:\s*(.+)/g);
    for (const m of payoffMatches) hintLines.push(`- PAYOFF: ${m[1].trim().slice(0, 150)}`);

    if (hintLines.length > 0) {
      parts.push('YÊU CẦU TUÂN THỦ — FORESHADOWING:');
      parts.push(...hintLines);
    }
  }

  // Extract character signature traits
  const charArcMatch = context.match(/═══ CHARACTER ARCS[\s\S]*?(?=═══ [A-Z]|$)/);
  if (charArcMatch) {
    const traitLines: string[] = [];
    const charBlocks = charArcMatch[0].matchAll(/【([^】]+)】[\s\S]*?(?=【|$)/g);
    for (const block of charBlocks) {
      const name = block[1];
      const traits: string[] = [];
      const speechMatch = block[0].match(/🗣 Cách nói:\s*(.+)/);
      if (speechMatch) traits.push(`cách nói: ${speechMatch[1].trim()}`);
      const catchphraseMatch = block[0].match(/💬 Câu cửa miệng:\s*"([^"]+)"/);
      if (catchphraseMatch) traits.push(`câu cửa miệng: "${catchphraseMatch[1]}"`);
      const habitMatch = block[0].match(/🔄 Thói quen:\s*(.+)/);
      if (habitMatch) traits.push(`thói quen: ${habitMatch[1].trim()}`);
      const quirkMatch = block[0].match(/🎭 Gap Moe:\s*(.+)/);
      if (quirkMatch) traits.push(`quirk: ${quirkMatch[1].trim()}`);
      if (traits.length > 0) {
        traitLines.push(`- ${name}: ${traits.join(', ')}`);
      }
    }
    if (traitLines.length > 0) {
      parts.push('YÊU CẦU TUÂN THỦ — CHARACTER TRAITS:');
      parts.push(...traitLines);
    }
  }

  // Extract pacing mood
  const pacingMatch = context.match(/═══ NHỊP TRUYỆN[\s\S]*?(?=═══ [A-Z]|$)/);
  if (pacingMatch) {
    const moodMatch = pacingMatch[0].match(/(BUILDUP|RISING|CALM BEFORE STORM|CLIMAX|AFTERMATH|TRAINING|VILLAIN FOCUS|COMEDIC BREAK|REVELATION|TRANSITION)/);
    const intensityMatch = pacingMatch[0].match(/Cường độ:\s*(\d+)\/10/);
    if (moodMatch) {
      parts.push(`YÊU CẦU TUÂN THỦ — PACING: mood="${moodMatch[1]}"${intensityMatch ? `, cường độ=${intensityMatch[1]}/10` : ''}`);
    }
  }

  if (parts.length === 0) return '';
  return '\n' + parts.join('\n') + '\n';
}

function buildCharacterVoiceGuide(outline: ChapterOutline, worldBible?: string): string {
  // Extract character names from outline
  const charNames = new Set<string>();
  for (const scene of outline.scenes) {
    for (const char of scene.characters) {
      charNames.add(char);
    }
  }

  if (charNames.size === 0) return '';

  const lines: string[] = [
    'GIỌNG NÓI NHÂN VẬT (BẮT BUỘC — mỗi nhân vật PHẢI có giọng khác biệt rõ rệt):',
    '',
    'NGUYÊN TẮC VÀNG: Che tên nhân vật, người đọc vẫn PHẢI nhận ra ai đang nói qua cách dùng từ.',
    '',
    'QUY TẮC GIỌNG NÓI THEO VAI TRÒ:',
    '• MC (nhân vật chính): Câu ngắn, dứt khoát. Khi căng thẳng dùng từ thô/chửi nhẹ. Có nội tâm tự giễu nhại, bình luận khô khan. Xưng "ta/tôi" tùy hoàn cảnh.',
    '• Đồng minh nữ/AI: Dùng thuật ngữ chuyên môn khi nghiêm túc, mỉa mai khi bình thường. Xưng hô theo quan hệ (ví dụ: "Ngài" khi công việc, bỏ formality khi hoảng).',
    '• Phản diện cấp cao: KHÔNG BAO GIỜ chửi bới. Nói lịch sự, dùng ẩn dụ, giấu sát khí trong lời ngọt. Câu dài, nhấn nhá.',
    '• Phản diện cấp thấp: Nói nhiều, khoe khoang, dùng từ thô. Câu ngắn, hung hãn.',
    '• Bystander/NPC: Ngắn gọn, dùng tiếng lóng/phương ngữ. Phản ứng cảm xúc trực tiếp.',
    '• Trẻ em/em gái: Câu ngắn, từ đơn giản, ngây thơ nhưng đôi khi sâu sắc bất ngờ.',
    '',
  ];

  for (const name of charNames) {
    lines.push(`- ${name}: ÁP DỤNG quy tắc giọng nói phù hợp vai trò ở trên. Tạo ít nhất 1 đặc điểm ngôn ngữ riêng (cách xưng hô, thói quen ngôn ngữ, hoặc cách phản ứng đặc trưng).`);
  }

  return lines.join('\n');
}
