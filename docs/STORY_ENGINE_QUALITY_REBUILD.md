# Story Engine Quality Rebuild — 2026-04-30

## Vấn đề user phản ánh

> "Mô tả, set up truyện còn rất tệ … Triển khai nội dung truyện cũng rất ngây ngô,
> dở và không đạt được như các bộ truyện hiện tại."

Hai gap riêng biệt:

1. **Setup gap (seed time)** — `world_description` được sinh quá ngắn (120-220 từ), không có
   structure, dẫn đến generic plot. Cast vô danh, golden finger mơ hồ, phase roadmap thiếu.
2. **Execution gap (write time)** — `WRITER_SYSTEM` + `ARCHITECT_SYSTEM` đầy negative rules
   ("CẤM X / CẤM Y") nhưng không có concrete prose voice anchor. Model match rule nhưng
   không match voice của bestseller.

---

## Phần 1 — Research Findings: Bestseller Voice Patterns

Phân tích voice/craft của top 30+ webnovel TQ contemporary (2018-2026), grouped theo
genre cluster. Tài liệu này ghi lại pattern nhận diện được — dùng làm reference khi sửa
prompt hoặc thêm genre mới.

### 1.1 Cultivation cluster (tien-hiep, kiem-hiep)

**Benchmark novels**: 大奉打更人, 詭祕之主 (cultivation arc), 我師兄實在太穩健了, 凡人修仙傳

**Voice signature**:
- Câu trầm, ít cảm thán. "Tô Mục mở mắt." (3 từ) hơn là "Tô Mục đột nhiên mở mắt một cách bất ngờ." (10 từ).
- Nội tâm KIỀM CHẾ. Bestseller MC không monologue dài — show qua hành động + 1-2 câu nội tâm sắc.
- Pronoun discipline: "y/hắn/tiểu tử" thay "anh"/"cậu". "Lão phu" / "tiểu nữ" cho nhân vật cụ thể.
- Tu tiên jargon dày: linh khí / đan điền / kim đan / thần thức / nguyên anh — assumed reader đã biết.
- Câu mở chương thường tĩnh: MC ngồi/đứng/mở mắt. Action escalate sau.

**Anti-pattern**: hành văn modern Western style ("Anh ấy cảm thấy buồn vì..."). Bestseller TQ
viết "Y khẽ thở dài, đặt chén trà xuống. Trà đã nguội."

### 1.2 Epic Fantasy cluster (huyen-huyen, dong-phuong-huyen-huyen)

**Benchmark**: 萬族之劫, 全職法師, 詭祕之主 (Lord of Mysteries), 完美世界

**Voice signature**:
- Câu DÀI hơn cultivation, bối cảnh hoành tráng. "Vực Hắc Diệp dài ba vạn dặm." Mỗi paragraph mở rộng scope thế giới.
- Power scale visible: số liệu cụ thể (3 vạn dặm, 50 tộc, ngàn năm). Không vague "rất lớn".
- "Đại Đế / Chí Tôn / Cổ Tộc" — register cao hơn tien-hiep (cultivation chỉ "Trưởng lão / Tông chủ").
- Boss reveal qua MULTI-LAYER: bystander shock → equal level shock → high level confirm. Không jump-cut.

**Anti-pattern**: power inflation chương 1-3 (MC level up quá nhanh). Bestseller giấu real power MC,
chỉ reveal khi context buộc.

### 1.3 Modern Urban cluster (do-thi, quan-truong)

**Benchmark**: 學霸的黑科技系統, 重生之神級學霸, 官場之風雲人物, 我的医妓生涯 (medical urban)

**Voice signature**:
- **Câu PUNCHY**, modern. Mix câu ngắn 3-7 từ + câu dài 15-25 từ ratio 3:1.
- **Numbers cụ thể**: tài khoản còn 1.8 triệu đồng, lãi 20K/suất, tiền phòng 4.5 triệu sắp đáo hạn.
- **System pop-up dialogue** kiểu *Kỹ năng Nấu Nướng Sơ Cấp +0.3 điểm* — mô phỏng smartphone UI.
- **MC pragmatic**: tính toán trước, action sau. Internal monologue ngắn, focus vào ROI.
- Subtext nặng. Đối thoại quan-truong: nói A nhưng ý B, im lặng có nghĩa, gõ bàn ba tiếng = tín hiệu.

**Anti-pattern**: combat scenes (gangster ambush, MC đánh tay đôi). Top do-thi novels 2024-2026 ZERO physical combat. Conflict qua: kiện tụng, M&A, lobby, thị phần, phá giá.

### 1.4 Romance cluster (ngon-tinh)

**Benchmark**: 偷偷藏不住, 你是我的榮耀, 何以笙簫默, 致我們暖暖的小時光

**Voice signature**:
- **Câu TRỮ TÌNH**, hình ảnh đẹp. "Mưa tháng ba ngoài cửa kính rơi đều như nhịp tim đang bình tĩnh giả vờ."
- **Female POV** chiếm 70%+ chương. Internal monologue layered — surface, deeper, deepest.
- **Reveal chậm**: hai nhân vật gặp lại, không ai nói, 5 giây im lặng → câu thoại đầu KHÔNG phải xin lỗi.
- "Nam chính" KHÔNG phải tổng tài lạnh lùng (đã chán). Modern: nam chính có occupation thực, có khuyết điểm cụ thể, có quá khứ rõ.

**Anti-pattern**: cliché 2015-2020:
- Hôn ước bị hủy
- Tổng tài lạnh lùng + nữ chính ngây thơ + hợp đồng hôn nhân ép buộc
- Nam chính cứu nữ chính khỏi gangster

### 1.5 Apocalypse cluster (mat-the)

**Benchmark**: 末日:無限資源, 末世:囤積百億物資, 我把空間囤滿了

**Voice signature**:
- **Gritty + survival-focused**. Câu ngắn, time pressure visible.
- **Đếm số liên tục**: ngày 47 sau mặt trời tắt, 1247 lon, 320 lít nước, 47 viên đạn.
- **Resource scarcity = drama**. Không phải combat zombie, mà là phân chia nước cuối cùng.
- **Trust ladder**: ngày 1-30 trust 0%, ngày 30-100 trust theo proof of action.

**Anti-pattern**: zombie horde scenes hoành tráng kiểu Hollywood. Top mat-the focus vào BUNKER + INVENTORY + INTERPERSONAL TENSION, không action movie.

### 1.6 Horror cluster (linh-di, quy-tac-quai-dam)

**Benchmark**: 詭異復甦, 死亡循環, 規則怪談, 我有一座恐怖屋, 鬼喘氣

**Voice signature**:
- **Atmosphere over jumpscare**. Reveal CHẬM. Câu mô tả thị giác tối + thính giác sắc.
- **Quy tắc horror**: list 10 rules, mâu thuẫn rule thật/giả, MC sinh tồn = tuân thủ KHÔNG combat.
- **Thị giác visceral**: "dưới lớp da, không phải mô tim người thường — là đất đen, ẩm, có rễ cỏ."
- **Reveal final luôn ambiguous**: đèn vụt tắt + tin nhắn từ số lạ. KHÔNG full explanation.

**Anti-pattern**: ma quỷ kiểu phim Hollywood (jumpscare, exorcism battle). Top horror TQ là PSYCHOLOGICAL + RULE-BASED, không combat ma.

### 1.7 Isekai cluster (di-gioi)

**Benchmark**: 異世界悠閒農家, 異世界藥局, 轉生史萊姆, 全民領主

**Voice signature**:
- **MC modern knowledge gap** = goal cụ thể (uplift tech, build empire, run tavern).
- **Culture clash**: MC observe local customs, calc gap, action.
- **Câu MẠCH LẠC**, ít poetic. Focus vào MC PLAN + EXECUTE.

**Anti-pattern**: MC tỉnh dậy chưa biết gì, lan man 5 chương trước khi biết bản thân ở đâu. Modern isekai 2024-2026 MC arrive với inventory + skills + golden finger ACTIVATED ngay chương 1.

### 1.8 Quick Transmigration (khoai-xuyen)

**Benchmark**: 快穿:炮灰女配逆襲, 快穿之打臉狂魔, 快穿:女配翻身計劃

**Voice signature**:
- **Episodic modular**: mỗi 30-50 chương xuyên thân phận mới. Cấu trúc 4-act mini-arc.
- **System narrator**: AI 0001 / Hub Space giữa các thế giới.
- **Identity swap**: MC là pháo hôi nữ phụ → cứu nguyên chủ → KHÔNG yêu nam chính → chuyển nguyên chủ sang con đường mới.
- **Pace nhanh**: 30-50 chương = 1 nhiệm vụ. Mỗi nhiệm vụ có goal + deadline cụ thể.

**Anti-pattern**: dài lê thê 1 thân phận 200+ chương. khoai-xuyen READER expectation: thay đổi mỗi 30-50 chương.

### 1.9 Beast Evolution (ngu-thu-tien-hoa)

**Benchmark**: 寵獸進化, 神獸契約, 最強獸控

**Voice signature**:
- **Pet bond + evolution lines**. MC có "Tuyến Tiến Hóa Ẩn" — info advantage so với ngự thú sư khác.
- **Pet vs pet combat** — KHÔNG MC tay đôi. MC chỉ huy + nuôi pet.
- **Hidden formula reveals**: tier evolution cần feed cụ thể — "47 viên Linh Hỏa Hồng Liễu vào ngày tiến hóa lần 1."

**Anti-pattern**: MC tự fight monsters. Genre này ngự thú sư phải theo công thức.

### 1.10 Rules Horror (quy-tac-quai-dam)

**Benchmark**: 規則怪談, 詭異復甦 (rules arc), 老子是被洗白的大反派 (rules section)

**Voice signature**:
- **Uncanny valley**: bối cảnh thường (văn phòng / metro / chung cư) bị BIẾN DỊ.
- **List rules**: 10 điều, một số rule mâu thuẫn (gõ 3 tiếng KHÔNG mở, gõ 2 tiếng MỞ).
- **Sinh tồn = tuân thủ + suy luận rule thật/giả**. KHÔNG combat.
- **Reveal cuối CHẬM**: chương 1-3 chỉ list rule + 1 incident nhỏ. Big reveal chương 10+.

### 1.11 Historical (lich-su)

**Benchmark**: 慶餘年, 大明王朝1566, 雪中悍刀行

**Voice signature**:
- **Văn ngôn cổ phong**. "Trẫm/khanh/thần/chức." Câu dài, nặng nề, formal.
- **Cung đấu + chiến lược**. Không action, mà là decision tại triều đường.
- **Subtext NẶNG**: 1 câu thoại có 3 lớp nghĩa.

### 1.12 Sci-fi (khoa-huyen)

**Benchmark**: 學霸的黑科技 (sci-fi side), 諸界第一因, 末日:科學家

**Voice signature**:
- **Hard sci-fi terms**. CRISPR, lượng tử, AI safety, quantum entanglement.
- **Câu CHÍNH XÁC**. Số liệu chuẩn (0.003 giây vs 0.05 giây — tách biệt rõ).
- **MC = scientist + engineer**, không superhero.

### 1.13 Gaming (vong-du)

**Benchmark**: 全職高手, 網游之天下無雙

**Voice signature**:
- **Game UI integration**. System messages, party chat, ranking ladder.
- **Damage numbers + mechanics visible**. PvP/PvE strategy explicit.
- **Solo content**: top vong-du MC thường solo content cần party, drop legendary.

### 1.14 Fan-fic (dong-nhan)

**Benchmark**: 漫威之我有一座神級舞台, 火影之最強白絕, 海賊王之神級獎勵系統

**Voice signature**:
- **Reference IP gốc**, parallel canon timeline.
- **Voice meta-aware**: MC biết canon, dùng knowledge gap.
- **Tương tác với canon characters** = dopamine moments (Itachi gọi MC là "anh").

---

## Phần 2 — Setup Schema Rebuild

### 2.1 Vấn đề: world_description 120-220 từ là quá ngắn

Cũ:
```
"worldDescription": "Mô tả thế giới 120-220 chữ (địa danh, thế lực, quy tắc)"
```

Output thực tế: 1 paragraph generic, không có cast names cụ thể, không có golden
finger mechanics, không có phase roadmap. Architect phải tự invent → drift.

### 2.2 Solution: 9-Section Blueprint

Mỗi seed PHẢI tuân thủ 9 section đánh dấu rõ ràng:

1. **BỐI CẢNH** — time + place cụ thể
2. **NHÂN VẬT CHÍNH** — name, age, occupation, tài sản hiện tại (số liệu), tính cách 3-5 trait, weakness 1-2
3. **GOLDEN FINGER** — tên, cơ chế cụ thể, trigger, đường tăng trưởng (Sơ→Đại Sư), điểm yếu (KHÔNG omnipotent)
4. **CAST CHÍNH** — ≥4 nhân vật named, mỗi người có concrete intersect với MC
5. **ANTAGONISTS** — ≥2 đối thủ named, mỗi đối thủ có timing escalation
6. **PHASE ROADMAP** — 4 phase × chương range × goal × milestone × stakes
7. **OPENING SCENE** — chương 1: location, MC đang làm gì (warm baseline), hook event (opportunity-driven)
8. **WORLD RULES** — 3-5 quy tắc thế giới
9. **TONE & ANTI-PATTERNS** — proactive ratio, comedy density, pacing target, 3-5 concrete bans

### 2.3 Validation thresholds

`validateSeedStructure(text)` returns score 0-100:
- 45 points: 9 sections present (5 each)
- 25 points: word count 800+
- 15 points: ≥4 named cast
- 10 points: ≥2 named antagonists
- 5 points: 4 phase roadmap entries

`passed = score >= 70`. Soft threshold ban đầu (log + warn). Sau khi production batch
ổn định, hard reject + regen seed nào < 70.

### 2.4 Rationale per section

| Section | Tại sao bắt buộc |
|---|---|
| BỐI CẢNH | Architect dùng để inject world details vào outline mỗi chương |
| NHÂN VẬT CHÍNH | Writer dùng cho character voice, tài sản numbers cho subplot tài chính |
| GOLDEN FINGER | Cơ chế cụ thể giúp Architect plan dopamine timing (khi golden finger trigger) |
| CAST | Architect cần named characters để insert vào scenes — không generic "bạn của MC" |
| ANTAGONISTS | Phase roadmap escalation theo timing đối thủ — không random villain |
| PHASE ROADMAP | Master outline + arc plans dựa vào đây để generate |
| OPENING SCENE | Chương 1 = retention chính. Warm baseline ngăn rock-bottom opening |
| WORLD RULES | Constraint extractor index từ đây — Critic dùng để check consistency |
| TONE/ANTI-PATTERNS | Bans cụ thể giúp Critic reject drift sang combat / harem / cliché |

---

## Phần 3 — Execution Rebuild: Voice Anchors

### 3.1 Vấn đề: WRITER_SYSTEM full negative rules, no positive prose

Cũ: "CẤM văn mẫu AI Tier 1 (HARD CAP = 0): khẽ nhếch mép, khóe miệng nhếch lên, không khỏi..."

Model học được "không dùng X" nhưng không học "voice nào nên dùng". Output kết quả: prose
"safe" nhưng generic — không có voice signature của bestseller.

### 3.2 Solution: Voice Anchors per genre

Mỗi genre có 4 trường:
- `voiceNotes` — 1-line characterization của voice
- `voiceAnchor` — 150-200 từ prose sample anchor giọng văn target
- `chapterOneHook` — 60-80 từ example mở chương 1 (warm baseline + immediate hook)
- `dopamineMoment` — 60-80 từ example face-slap/competence moment

Tất cả Vietnamese (vì writer output Vietnamese). Sample mimic voice register/rhythm/vocab
của top novel genre đó.

### 3.3 Injection points

- **Writer**: full anchor (voiceNotes + voiceAnchor + chapterOneHook + dopamineMoment) — needs prose match
- **Architect**: compact hint (voiceNotes + chapterOneHook + dopamineMoment) — không cần full prose, chỉ cần plan scenes phù hợp voice

Per-call overhead: ~250-400 tokens. Worth it cho quality lift.

### 3.4 16 genres covered

tien-hiep, kiem-hiep, huyen-huyen, do-thi, quan-truong, lich-su, khoa-huyen, vong-du,
dong-nhan, mat-the, linh-di, di-gioi, ngon-tinh, quy-tac-quai-dam, ngu-thu-tien-hoa,
khoai-xuyen.

(Note: 'xuyen-khong' và 'di-nang' không có trong GenreType — chúng là sub-themes implementable
qua sub-genre flags trong project metadata, không phải top-level genre.)

---

## Phần 4 — Files Changed

| File | Purpose |
|---|---|
| `src/services/story-engine/templates/genre-voice-anchors.ts` | NEW — 16 genre voice anchors |
| `src/services/story-engine/seed-blueprint.ts` | NEW — 9-section blueprint + validator |
| `src/services/story-engine/pipeline/chapter-writer.ts` | Hook voice anchors into Writer + Architect |
| `src/services/content-seeder/index.ts` | Inject blueprint into seed prompt + validate output |
| `docs/STORY_ENGINE_QUALITY_REBUILD.md` | This research synthesis |

---

## Phần 5 — Verification Plan

### Cho seeds (setup quality)
1. Spawn 5 novel mới qua `daily-spawn-cron`
2. Check log: `[Seeder] Blueprint check FAILED for ...` — count fail rate
3. Sample 3 world_description, đếm sections present, named cast count
4. Acceptance: ≥80% pass blueprint check (score ≥ 70)

### Cho execution (voice quality)
1. Reset 1 novel test, ghi 5 chương đầu với voice anchors active
2. Diff voice với chapters cũ (trước voice anchor) — sample paragraphs
3. Check signal:
   - Câu opening match `chapterOneHook` register?
   - Có dopamine moment chương 2-3?
   - Voice signature distinct vs other genres?
4. Acceptance: voice rõ ràng khác giọng generic, anchor matched ≥70% paragraphs

### Cho both
1. Sau 24h, query `quality_metrics` cho 10 novel — check `overall_score` mean
2. Compare với historical mean (trước rebuild)
3. Acceptance: tăng ≥0.5 điểm trên thang 10

---

## Phần 6 — Future Extensions (out of scope hiện tại)

### Per-arc voice variation
Chương đầu arc khác chương climax. Có thể:
- `arcOpeningVoice` — ấm, khám phá
- `arcClimaxVoice` — căng, dồn dập
- `arcRestingVoice` — chậm, suy tư

Hiện tại 1 voiceAnchor cover toàn arc. Đủ tốt cho v1.

### Sub-genre voice anchors
Trọng sinh trong do-thi voice khác xuyên không trong do-thi. Chưa cần bây giờ — voice anchor
hiện tại đủ general để cover sub-genres của cùng top-level genre.

### Architect scene-type templates per genre
Mỗi genre có scene types khác (cultivation: bế quan / luyện đan / đấu pháp; do-thi: deal /
khách hàng / đối thủ phá giá). Có thể thêm `GENRE_SCENE_TEMPLATES` map. Để sau khi voice
anchors prove out hiệu quả.

### Bestseller benchmark database
Lưu vào DB sample paragraphs của top bestseller TQ translated → reference cho writer khi
viết. Cần coordination với scraping pipeline, out of scope hiện tại.

---

## Tham khảo (Top webnovels reference)

Nếu cần expand research/genre sau này, đây là reading list:

**Cultivation/Wuxia**: 凡人修仙傳, 大奉打更人, 雪中悍刀行, 我師兄實在太穩健了, 詭祕之主
**Modern Urban**: 學霸的黑科技系統, 重生之神級學霸, 神級插班生, 我有一個百寶袋
**Romance**: 偷偷藏不住, 何以笙簫默, 你是我的榮耀, 致我們暖暖的小時光
**Sci-fi/Apocalypse**: 末日:無限資源, 諸界第一因, 末世:囤積百億物資
**Horror**: 詭異復甦, 規則怪談, 鬼喘氣, 我有一座恐怖屋
**Isekai**: 異世界悠閒農家, 異世界藥局, 轉生史萊姆, 全民領主
**Historical**: 慶餘年, 大明王朝1566, 知否?知否?應是綠肥紅瘦
**Gaming**: 全職高手, 網游之天下無雙, 神級英雄
**Fan-fic**: 漫威之我有一座神級舞台, 火影之最強白絕, 海賊王之神級獎勵系統
**Beast taming**: 寵獸進化, 神獸契約, 最強獸控
**Quick transmigration**: 快穿:炮灰女配逆襲, 快穿之打臉狂魔

---

**Last Updated**: 2026-04-30
**Status**: v1 shipped — voice anchors + seed blueprint live in production
**Next action**: monitor blueprint pass rate + chapter quality_metrics over 7 days
