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

**Last Updated**: 2026-04-30 (v2 update — outline layer fixes)
**Status**: v2 shipped — voice anchors + seed blueprint + outline-layer fixes live
**Next action**: monitor blueprint pass rate + chapter quality_metrics over 7 days

---

## Phần 7 — v2 Update: Outline Layer Fixes (2026-04-30)

Diagnosis sau khi v1 ship phát hiện 3 bugs còn lại ở outline layer:

### Bug 1: master_outline arcs quá rộng

Cũ: 4 arcs × 100-300 chương, prose summary 1-paragraph.

Hậu quả: arc spans quá rộng → nhịp arc mất, không có pacing rõ. Bestseller modern chia
arc 50-100 chương với multi-axis description.

**Fix**:
- Bumped arc count → 8-12 arcs × 50-100 chương
- Multi-axis description (6 axes per arc):
  - theme (thematic register)
  - mood (warm-buildup / tense-conflict / triumphant / etc.)
  - biggestSetpiece (cinematic centerpiece scene)
  - characterArcBeat (internal change, NOT skill upgrade)
  - worldExpansion (new region/faction unlocked)
  - pacingTarget (fast-action / balanced / introspective-slow / climax-dense)
- maxTokens 8K → 16K to fit expanded schema

File: \`src/services/story-engine/pipeline/master-outline.ts\`

### Bug 2: story_outline thiếu cast / world_rules / tone flags

Cũ: \`{ premise, themes, mainConflict, protagonist, majorPlotPoints }\`. Architect không có cast roster → invent ad-hoc → drift.

**Fix**: extracted into shared module \`pipeline/story-outline.ts\` with new fields:
- \`castRoster\` (≥4 named, mỗi nhân vật có role + relationToMC + introduceArc + archeType)
- \`worldRules\` (≥4 concrete rules — Constraint Extractor index từ đây)
- \`toneFlags\` ({ proactiveRatio, comedyDensity, pacingTarget })
- \`antiTropes\` (≥3 concrete bans cho genre)

Both call sites (orchestrator.ts S1 self-heal + cron init-prep) now use the shared
\`generateStoryOutline()\` — eliminates the duplicated bare-bones prompt.

File: \`src/services/story-engine/pipeline/story-outline.ts\` (NEW)

### Bug 3: arc_plan ch.1-3 propose rock-bottom opening

Cũ: \`generateArcPlan()\` prompt KHÔNG inject GOLDEN_CHAPTER_REQUIREMENTS hay
UNIVERSAL_ANTI_SEEDS. Result: arc_plan briefs cho chương 1 contain "Chủ nhà giục trả tiền,
MC bế tắc" — vi phạm warm-baseline rule mà WRITER_SYSTEM bắt phải tuân.

Architect chương 1 sau đó phải chọn: (a) follow arc_plan → vi phạm warm-baseline, (b) override
arc_plan → drift sang scene khác. Cả 2 đều dở.

**Fix**: inject 4 blocks vào generateArcPlan prompt khi \`arcNumber === 1\`:
- GOLDEN_CHAPTER_REQUIREMENTS.chapter1/chapter2/chapter3 (mustHave + avoid)
- UNIVERSAL_ANTI_SEEDS (12 most critical bans)
- getArchitectVoiceHint(genre) (compact voice notes + opening pattern + dopamine pattern)
- Hard rule: "CẤM TUYỆT ĐỐI brief mở chương 1 với MC nghèo đói / chủ nhà giục / bế tắc / tự tử"

File: \`src/services/story-engine/pipeline/context-assembler.ts\`

### v2 Files Changed

| File | Change |
|---|---|
| \`pipeline/master-outline.ts\` | Multi-axis arcs (6 axes) + 8-12 arc count |
| \`pipeline/story-outline.ts\` | NEW shared module with cast/rules/tone/anti-tropes |
| \`pipeline/orchestrator.ts\` | Use shared generateStoryOutline (was inline) |
| \`api/cron/write-chapters/route.ts\` | Use shared generateStoryOutline (was inline) |
| \`pipeline/context-assembler.ts\` | Inject golden-chapter rules + anti-seeds into arc_plan ch.1 |

### Impact summary (v1 + v2 combined)

| Layer | Before | After v1 | After v2 |
|---|---|---|---|
| world_description | 120-220 từ vague | 9-section blueprint, validate | (no further change) |
| master_outline | 4 arcs × 100-300 ch, 1-axis | (no change) | 8-12 arcs × 50-100 ch, 6-axis |
| story_outline | premise + plot points | (no change) | + cast + world_rules + tone + anti-tropes |
| arc_plan ch.1-3 | rock-bottom OK | (no change) | warm-baseline ENFORCED |
| writer voice | rule-only | sample-anchored per genre | (no change) |
| architect voice | rule-only | compact hint per genre | (no change) |

Tất cả 4 layer setup + execution giờ đã consistent với bestseller standard. Sau deploy,
chương 1-3 của novel mới sẽ KHÔNG còn rock-bottom opening, arc_plan briefs sẽ propose
warm baseline scenes, và voice match anchor của top webnovel.

---

## Phần 8 — v3 Update: Per-Genre Process Blueprints (2026-04-30)

User feedback v3: "research kĩ cho từng genre, cái quan trọng là quy trình viết, set up làm sao để bảo đảm chất lượng và số lượng chương truyện … nhưng vẫn có không gian để AI sáng tạo."

Diagnosis: voice anchors (v1) + outline layer fixes (v2) đã anchor PROSE và STRUCTURE chung,
nhưng KHÔNG customize per-genre. Each genre có "rules of the game" khác nhau.

### v3 Solution: 16-genre process blueprint module

`src/services/story-engine/templates/genre-process-blueprints.ts` — mỗi genre có:

1. **essence** — one-line genre essence
2. **setup**: requiredCastRoles (≥4-6), goldenFingerType, phaseFramework, worldRulesFocus, openingPattern
3. **process**: qualityFloor, quantitySustainability, commonFailures, creativeSpace
4. **sceneTypes** — 7-8 scene types specific cho genre
5. **arcTemplate** — 50-150 chapter arc structure
6. **stakesLadder** — escalation framework

### Per-genre research synthesis

| Genre | Quality Bottleneck | Sustainability (1000ch) | Creative Space |
|---|---|---|---|
| tien-hiep | Power inflation 100ch đầu | Cảnh giới progression: Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → ... | Tên đan dược/bí cảnh tự do |
| kiem-hiep | Battle scenes repetitive | 100ch = 1 đại sự kiện giang hồ | Tên chiêu thức / quán trọ tự do |
| huyen-huyen | MC ch.50 đã solo cổ tộc | 5-6 cấp bậc thần ma × 2-3 sub-arc | Tên đại đế / cổ tộc tự do |
| do-thi | Combat drift (gangster ambush) | 5-6 phases business scale | Tên brand / dish / customer tự do |
| quan-truong | Subtext mất → flatten | 5-6 cấp quan × 3-4 sub-arc | Tên dự án / scandal tự do |
| lich-su | Slip into modern dialogue | 5-6 cấp quan × 2-3 đời hoàng đế | Tên cải cách / scandal tự do |
| khoa-huyen | Tech vague theo arc | 5-6 tech tier × 3-4 problem | Tên dự án / lab tự do |
| vong-du | IRL bị bỏ rơi | 5-6 ranking tier × 3-4 raid + 2 PvP | Tên guild / player / item tự do |
| dong-nhan | OOC canon characters | Canon arc cycle | Original characters / AU tự do |
| mat-the | Resource math broken | 5-6 stages × 3-4 community arc | Tên survivor / mutation tự do |
| linh-di | Jumpscare cliché thay atmosphere | 5-6 supernatural tier × 4-5 case | Tên ma / case / pháp khí tự do |
| di-gioi | MC instant master | Scope ladder × tech tier ladder | Tên local cities / factions tự do |
| ngon-tinh | Tổng tài lạnh lùng cliché | Career arc parallel relationship | Tên brand / cafe / friend tự do |
| quy-tac-quai-dam | Rule arbitrary → unfair | 5-6 phó bản tier × 3-4 instance | Rule cụ thể từng phó bản tự do |
| ngu-thu-tien-hoa | Pet trở thành unit | 5-6 tier × pet count expand | Pet names / lineage tự do |
| khoai-xuyen | Nhiệm vụ kéo dài >50ch | 25-30 nhiệm vụ × 30-50ch/nv | Từng thế giới setting tự do |

### Layer flow with v3

```
SPAWN TIME
└── content-seeder asks AI for world_description
    └── prompt: blueprint 9 sections + GENRE setup (cast roles + GF type + phase + opening)

GENERATE OUTLINES TIME
├── master-outline.ts → prompt: GENRE setup + GENRE architect guide
│   (8-12 arcs × multi-axis × genre arc template + stakes ladder)
└── story-outline.ts → prompt: GENRE setup
    (cast roster matches genre cast roles + world rules per genre focus)

WRITE TIME
├── arc_plan → GENRE architect guide + golden chapter rules (arc 1)
│   (scene types from genre-specific list + arc template + quality floor)
├── architect → GENRE architect guide + voice anchor compact
└── writer → voice anchor full (per-genre prose voice)
```

### v3 Files Changed

- NEW: `templates/genre-process-blueprints.ts` (16 genres × 50-line blueprint each)
- M: `seed-blueprint.ts` (buildSeedBlueprintInstructions(genre))
- M: `pipeline/master-outline.ts` (inject genre setup + architect guide)
- M: `pipeline/story-outline.ts` (inject genre setup)
- M: `pipeline/context-assembler.ts` (inject genre architect guide vào arc_plan)
- M: `pipeline/chapter-writer.ts` (inject genre architect guide vào Architect)
- M: `services/content-seeder/index.ts` (use builder + pass genre)

### Impact summary (v1 + v2 + v3)

| Layer | v0 | v1 voice | v2 outline | v3 per-genre |
|---|---|---|---|---|
| world_description | Vague 200 từ | 9-section blueprint | — | + per-genre cast/GF/phase |
| master_outline | 4×1-axis | — | 8-12×6-axis | + per-genre arc template |
| story_outline | premise+plot | — | + cast/rules/tone | + per-genre cast roles |
| arc_plan | generic | — | + warm-baseline | + per-genre scene types |
| architect | generic | + voice hint | — | + per-genre guide |
| writer | generic | + voice full | — | — |

Mỗi genre giờ có "rules of the game" riêng từ seed → outline → arc plan → chapter write.
Creative space được preserve (tên brand/dish/cụ thể) nhưng structural decisions (cast roles,
phase progression, scene types, quality floor, common failures) đều genre-locked.

---

**Last Updated v3**: 2026-04-30 (per-genre process blueprints shipped)

---

## Phần 9 — v4 Update: Systemic Refactor (2026-04-30)

User: "phải thực sự nghiêm túc trau chuốt toàn bộ logic dự án đi chứ cứ lâu lâu lại phát sinh bug thì bao giờ mới xong"

3 explore agents mapped issue space → 5-phase refactor (P1-P5) shipped trong 5 PRs:

### P1 — Type system enforcement (PR #21)
- 5 Records tightened to `Record<GenreType, T>` (or `Partial<>`) — TypeScript catches missing genre keys at compile time
- 11 jest assertions pass cho genre coverage (`npm test -- genre-coverage`)
- `npm run lint:prompts` script catches placeholder leaks (FORBIDDEN_LITERAL_NAMES)

### P2 — Critical state fixes (PR #22)
- **P2.1**: orchestrator MC sync hard-validate post-DB-update (re-fetch + verify, throw on mismatch)
- **P2.2**: deterministic detectMcNameFlip() in Critic — counts expected MC vs competing candidates, REWRITE if drift detected
- **P2.3**: castRoster + worldRules + antiTropes injected into context (was generated but never read)
- **P2.4**: synopsis regen MC name lock — prompt prepend hard rule + post-gen verify; throw if synopsis missing expected name
- **P2.5**: 14 post-write tasks now persist failures to `failed_memory_tasks` via `recordTaskFailure()` helper instead of silent swallow

### P3 — Branching alignment (PR #23)
- PROACTIVE_GENRES + isProactiveGenre exported from templates.ts (master-outline.ts now imports — no duplication)
- NON_COMBAT_GENRES exported (helper still works, list now public)
- validateSubGenreKeys() in context-assembler — typos in style_directives.sub_genres logged + dropped, không silent fall through
- Fixed types.ts ContextPayload.subGenres mistyped as GenreType[] (actually sub-genre tag strings)

### P4 — Hardening (PR #24)
- **P4.1**: hard-reject seeds failing blueprint check — was soft-warn, now `.filter()` step drops failing seeds; daily-spawn retries fresh
- **P4.2**: per-chapter quality canary in orchestrator Step 5c — regex check for placeholder leaks / MC name absence / VND currency leak; persists to failed_memory_tasks
- **P4.3**: `POST /api/admin/operations` action `regression_audit` — samples last N chapters across active projects, returns per-project score 0-100 + overall_score

### P5 — Doc + verification harness (this PR)
- `docs/story-engine/PLACEHOLDER_CONVENTION.md` — formal convention + enforcement runbook
- This Phần 9 evolution log

### Bug classes eliminated by P1-P5

| Bug class | Defense layer |
|---|---|
| Forget genre Record entry | P1 (compile-time + test) |
| Voice anchor literal name leak | P1 lint + P2.2 Critic check + P4.2 canary + P4.3 audit |
| MC name flip across chapters | P2.1 sync verify + P2.2 Critic check + P2.4 synopsis lock + P4.2 canary |
| Cast invent / Khánh→Khang drift | P2.3 castRoster injection + antiTropes injection |
| Silent post-write task failure | P2.5 failed_memory_tasks persistence + admin UI |
| Branching list drift (3 isVN places, 2 non-combat places) | P3.1 single source of truth |
| Sub-genre typo silent fall-through | P3.3 validateSubGenreKeys |
| Bad seed shipped | P4.1 blueprint hard-reject |
| Drift not detected for days | P4.2 canary + P4.3 weekly regression audit |

### Verification harness post-refactor

```bash
# Full local check
npm run typecheck       # TS strict
npm run lint:prompts    # placeholder leak audit
npm test -- genre-coverage  # 11 assertions

# Production smoke
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://truyencity2.vercel.app/api/admin/operations \
  -d '{"action":"regression_audit","sampleSize":20,"perProjectChapters":3}'
# Returns overall_score 0-100. Aim ≥90 baseline.
```

### Files added/changed in P1-P5 (cumulative)

NEW:
- `scripts/audit-prompts-for-leaks.ts` (P1)
- `src/__tests__/story-engine/genre-coverage.test.ts` (P1)
- `docs/story-engine/PLACEHOLDER_CONVENTION.md` (P5)

CHANGED:
- `src/services/story-engine/templates.ts` (P1 Record types, P3 export predicates)
- `src/services/story-engine/templates/genre-voice-anchors.ts` (P1 lint clean)
- `src/services/story-engine/memory/style-bible.ts` (P1 export Records)
- `src/services/story-engine/types.ts` (P3 subGenres type)
- `src/services/story-engine/seed-blueprint.ts` (kept as-is)
- `src/services/story-engine/pipeline/orchestrator.ts` (P2.1 MC sync verify, P2.5 recordTaskFailure helper, P4.2 canary)
- `src/services/story-engine/pipeline/chapter-writer.ts` (P2.2 detectMcNameFlip)
- `src/services/story-engine/pipeline/context-assembler.ts` (P2.3 castRoster, P2.4 synopsis lock, P3.3 validateSubGenreKeys)
- `src/services/story-engine/pipeline/master-outline.ts` (P3 import predicates)
- `src/services/content-seeder/index.ts` (P1 Record types, P4.1 hard-reject)
- `src/app/api/admin/operations/route.ts` (P4.3 regression_audit)
- `package.json` (lint:prompts script)

---

**Last Updated v4**: 2026-04-30 (systemic refactor P1-P5 shipped)

---

## Phần 10 — Wave 2 Audit (P6-P7) 2026-04-30

3 explore agents tìm các failure mode P1-P5 chưa cover:

### P6.1 — DeepSeek empty content guard (deepseek.ts)
Cũ: `content || reasoning_content || ''` → both empty trả về empty silently → save chương trống.
Mới: throw nếu content empty + finish_reason='length' → maxTokens issue surfaced;
     transient empty → retry within RETRY_DELAYS budget; final failure throws explicit error.

### P6.3 — Distributed lock vs project timeout (cron/write-chapters/route.ts)
Cũ: 90s lock window, PROJECT_TIMEOUT_MS=400s → tick A viết 100s, tick B (5min sau) thấy lockBoundary
     đã pass, pickup cùng project → race write 2x.
Mới: lockWindowMs = PROJECT_TIMEOUT_MS + 60s buffer (460s = ~7.7min). Lock ≥ timeout đảm bảo
     tick A xong (or aborted by Vercel maxDuration 800s) trước tick B claim.

### P7.1 — ai_story_projects(status, current_chapter) partial index
Cũ: cron query `WHERE status IN ('active','paused')` full table scan ở 1000+ projects.
Mới: migration 0159 — partial index `(status, current_chapter, updated_at) WHERE status IN ('active','paused')`.
     Cron pickup chuyển từ O(n) → O(log n) lookup.

### Deferred (low impact / out of scope)

- **P7.2 quota double-count**: theoretical race; chưa hit production. Defer until observed.
- **P7.3 summary-before-revise drift**: auto-revise rare (~5% chương), drift bounded to 1 ch.
     Synopsis regen self-corrects. Defer.
- **P8.1 Gemini prompt caching**: DeepSeek đã auto-cache (tracked via prompt_cache_hit_tokens).
     Per-chapter agents chạy DeepSeek Flash → caching đã realize. Gemini caching cần stateful
     lifecycle (POST /v1beta/cachedContents) — defer.
- **P8.2 per-task maxTokens**: cosmetic optimization, không affect correctness.

---

**Last Updated v5**: 2026-04-30 (Wave 2 — P6.1 + P6.3 + P7.1 shipped)
