# Story Engine — Reference Hub

Tổng hợp **mọi tài liệu tham khảo** liên quan đến Story Engine v2 — engine AI tự viết
truyện 1000-2000 chương của TruyenCity. Mục đích: 1 nơi duy nhất để truy xuất khi cần
research, debug, mở rộng, hoặc onboard người mới.

> **Quick start**: nếu chỉ cần biết engine làm gì, đọc [Section 1](#1-overview-30s) bên dưới.
> Nếu cần fix bug / mở rộng feature, dùng [Section 5 — Common tasks lookup](#5-common-tasks--which-doc-to-read).

---

## 1. Overview (30s)

Story Engine v2 (`src/services/story-engine/`) là pipeline 3-agent (Architect → Writer → Critic) viết truyện Vietnamese webnovel quy mô lớn:

- **Spawn**: content-seeder tạo `world_description` 9-section blueprint (1500+ từ)
- **Outlines**: master_outline (8-12 arcs × 6-axis) + story_outline (cast/rules/tone) generated 1× per novel
- **Per-arc**: arc_plan với chapter_briefs + scenes + threads (1× per 20 chương)
- **Per-chapter**: Architect plans scenes → Writer drafts prose → Critic reviews → 17 post-write tasks (memory/quality)

Key innovations (2026-04-30 quality rebuild):
- **Voice anchors per genre** — concrete prose samples instead of negative rules
- **Seed blueprint** — 9-section world_description with validation
- **Per-genre process blueprints** — 16 genres × { setup, process, scene types, arc template }
- **Outline layer multi-axis** — master_outline 6 axes per arc, story_outline cast/rules/tone

---

## 2. Documents in This Hub

| Doc | Purpose | When to read |
|---|---|---|
| [`README.md`](./README.md) | This index — bắt đầu từ đây | Always |
| [`PLACEHOLDER_CONVENTION.md`](./PLACEHOLDER_CONVENTION.md) | **Convention `<MC>`/`<LOVE>`/`<CITY>` + enforcement runbook (lint:prompts)** | Trước khi sửa voice anchors / templates / prompts |
| [`QUALITY_REBUILD.md`](./QUALITY_REBUILD.md) | **Research synthesis + 16-genre patterns + 4-version evolution log** | Khi mở rộng/debug quality, thêm genre, hoặc audit per-genre |
| [`QUALITY_AUDIT_V1.md`](./QUALITY_AUDIT_V1.md) | Audit 2026-02 — sample chapters vs đại thần level (chapters 160-163) | Reference baseline: hệ thống đã từng tệ thế nào, fix nào đã apply |
| [`LEGACY_STORY_FACTORY.md`](./LEGACY_STORY_FACTORY.md) | Legacy v1 architecture (`story-writing-factory/`) | Khi đụng v1 code paths (ai-editor, daily-spawn còn dùng v1) |

---

## 3. Code-Level Reference Files

Các file code dưới đây có comment top-of-file viết như tài liệu — đọc trực tiếp nếu cần
chi tiết hoặc verify hành vi hiện tại (single source of truth).

### Pipeline (3-agent core)

| File | Chứa gì | Doc-quality? |
|---|---|---|
| [`src/services/story-engine/pipeline/orchestrator.ts`](../../src/services/story-engine/pipeline/orchestrator.ts) | Main entry `writeOneChapter()` + 17 post-write tasks + S1/S2 self-heal | ✓ extensive comments |
| [`src/services/story-engine/pipeline/chapter-writer.ts`](../../src/services/story-engine/pipeline/chapter-writer.ts) | Architect/Writer/Critic system prompts (~120 lines mỗi prompt) | ✓ prompts are docs |
| [`src/services/story-engine/pipeline/context-assembler.ts`](../../src/services/story-engine/pipeline/context-assembler.ts) | 4-layer context loading + arc_plan generation | ✓ |
| [`src/services/story-engine/pipeline/master-outline.ts`](../../src/services/story-engine/pipeline/master-outline.ts) | Master outline generator (8-12 arcs × 6-axis) | ✓ |
| [`src/services/story-engine/pipeline/story-outline.ts`](../../src/services/story-engine/pipeline/story-outline.ts) | Story outline generator (cast/rules/tone/anti-tropes) | ✓ |

### Templates (genre customization)

| File | Chứa gì |
|---|---|
| [`src/services/story-engine/templates.ts`](../../src/services/story-engine/templates.ts) | GENRE_STYLES + GENRE_TITLE_EXAMPLES + GENRE_ENGAGEMENT + UNIVERSAL_ANTI_SEEDS + GOLDEN_CHAPTER_REQUIREMENTS + SUB_GENRE_RULES + VN_PRONOUN_GUIDE + NON_COMBAT_GENRES |
| [`src/services/story-engine/templates/genre-voice-anchors.ts`](../../src/services/story-engine/templates/genre-voice-anchors.ts) | **16 genres × prose voice sample + chương-1 hook + dopamine moment** (v1, 2026-04-30) |
| [`src/services/story-engine/templates/genre-process-blueprints.ts`](../../src/services/story-engine/templates/genre-process-blueprints.ts) | **16 genres × setup/process/scenes/arc template** (v3, 2026-04-30) |
| [`src/services/story-engine/seed-blueprint.ts`](../../src/services/story-engine/seed-blueprint.ts) | 9-section world_description schema + validateSeedStructure() |

### Memory modules (post-write quality)

| File | Chứa gì |
|---|---|
| [`src/services/story-engine/memory/style-bible.ts`](../../src/services/story-engine/memory/style-bible.ts) | GENRE_VOCABULARY + GENRE_WRITING_GUIDES + per-scene pacing rules |
| [`src/services/story-engine/memory/character-tracker.ts`](../../src/services/story-engine/memory/character-tracker.ts) | Save character states from combined AI call |
| [`src/services/story-engine/memory/foreshadowing-planner.ts`](../../src/services/story-engine/memory/foreshadowing-planner.ts) | Long-range hint planning (50-500ch apart) |
| [`src/services/story-engine/memory/character-arc-engine.ts`](../../src/services/story-engine/memory/character-arc-engine.ts) | Character development arcs + signature traits |
| [`src/services/story-engine/memory/pacing-director.ts`](../../src/services/story-engine/memory/pacing-director.ts) | Per-arc pacing blueprints (10 mood types) |
| [`src/services/story-engine/memory/voice-fingerprint.ts`](../../src/services/story-engine/memory/voice-fingerprint.ts) | Style drift detection |
| [`src/services/story-engine/memory/power-system-tracker.ts`](../../src/services/story-engine/memory/power-system-tracker.ts) | MC power state + anti-plot-armor |
| [`src/services/story-engine/memory/world-expansion-tracker.ts`](../../src/services/story-engine/memory/world-expansion-tracker.ts) | World map + location bibles |

### Utils + types

| File | Chứa gì |
|---|---|
| [`src/services/story-engine/utils/gemini.ts`](../../src/services/story-engine/utils/gemini.ts) | callGemini router (Gemini + DeepSeek dispatch) + cost tracking |
| [`src/services/story-engine/utils/deepseek.ts`](../../src/services/story-engine/utils/deepseek.ts) | DeepSeek OpenAI-compatible adapter |
| [`src/services/story-engine/utils/model-tier.ts`](../../src/services/story-engine/utils/model-tier.ts) | Pro tier routing (master/story/arc/bible → Pro; per-chapter → Flash) |
| [`src/services/story-engine/types.ts`](../../src/services/story-engine/types.ts) | All type definitions (GenreType, MCArchetype, AntiTropeFlag, ...) |

### CRON / API integration

| File | Chứa gì |
|---|---|
| [`src/app/api/cron/write-chapters/route.ts`](../../src/app/api/cron/write-chapters/route.ts) | 3-tier cron (resume + init-prep + init-write) + circuit breaker + cost cap |
| [`src/app/api/admin/operations/route.ts`](../../src/app/api/admin/operations/route.ts) | Admin ops: status/pause/resume/rewrite/stuck_novels |
| [`src/app/admin/stuck-novels/page.tsx`](../../src/app/admin/stuck-novels/page.tsx) | Stuck novels drilldown UI |
| [`src/services/content-seeder/index.ts`](../../src/services/content-seeder/index.ts) | Seed generation (uses buildSeedBlueprintInstructions per genre) |

---

## 4. Root-level docs reference

Các tài liệu root level (đã tồn tại trước rebuild) vẫn còn relevant:

| Doc | Liên quan story engine? |
|---|---|
| [`/CLAUDE.md`](../../CLAUDE.md) | Root project instructions — có Phase 1-19 history, V2 architecture, Story Engine v2 chi tiết |
| [`/.claude/CLAUDE.md`](../../.claude/CLAUDE.md) | Supplementary: AI model assignments, model swap (DeepSeek/Gemini), Vietnamese rules |
| [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) | App-wide architecture |
| [`docs/API.md`](../API.md) | REST API endpoints |
| [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) | Deploy + Vercel + Supabase setup |
| [`docs/SCALABILITY_INTEGRATION_GUIDE.md`](../SCALABILITY_INTEGRATION_GUIDE.md) | Scalability tables (plot_threads, beat_usage, etc.) |
| [`docs/TROUBLESHOOTING.md`](../TROUBLESHOOTING.md) | Common errors + fixes |

---

## 5. Common Tasks → Which doc to read

| Task | Đọc gì |
|---|---|
| Hiểu engine flow tổng quan | [`/CLAUDE.md`](../../CLAUDE.md) → "Architecture" + "API Flow" sections |
| Thêm genre mới | [`templates/genre-voice-anchors.ts`](../../src/services/story-engine/templates/genre-voice-anchors.ts) + [`templates/genre-process-blueprints.ts`](../../src/services/story-engine/templates/genre-process-blueprints.ts) — copy 1 genre cũ làm template |
| Audit chất lượng 1 genre | [`QUALITY_REBUILD.md`](./QUALITY_REBUILD.md) → Phần 1 (per-cluster patterns) + Phần 8 (per-genre table) |
| Debug rock-bottom opening | [`QUALITY_REBUILD.md`](./QUALITY_REBUILD.md) → Phần 7 (v2 — outline layer fixes, bug 3) |
| Edit chương 1 hook engineering | [`templates.ts`](../../src/services/story-engine/templates.ts) → `GOLDEN_CHAPTER_REQUIREMENTS` (line ~1008) |
| Fix Architect/Writer/Critic prompts | [`pipeline/chapter-writer.ts`](../../src/services/story-engine/pipeline/chapter-writer.ts) → 3 system prompts top of file (line 110-346) |
| Add new world rule per genre | [`templates/genre-process-blueprints.ts`](../../src/services/story-engine/templates/genre-process-blueprints.ts) → `setup.worldRulesFocus` |
| Thêm scene type cho genre | [`templates/genre-process-blueprints.ts`](../../src/services/story-engine/templates/genre-process-blueprints.ts) → `sceneTypes` array |
| Tune cron config (timeout, concurrency, cost cap) | [`src/app/api/cron/write-chapters/route.ts`](../../src/app/api/cron/write-chapters/route.ts) → top constants (line 36-72) |
| Add admin ops action | [`src/app/api/admin/operations/route.ts`](../../src/app/api/admin/operations/route.ts) → switch statement |
| Verify seed blueprint compliance | [`seed-blueprint.ts`](../../src/services/story-engine/seed-blueprint.ts) → `validateSeedStructure()` |
| Reset 10 novels test | [`scripts/rewrite-recent-10.ts`](../../scripts/rewrite-recent-10.ts) |
| Fix non-combat drift (gangster ambush in do-thi) | [`pipeline/chapter-writer.ts`](../../src/services/story-engine/pipeline/chapter-writer.ts) → `buildGenreSpecificSuffix` non-combat block |

---

## 6. Glossary (TQ webnovel terms)

| Term | Meaning |
|---|---|
| **Sảng văn (爽文)** | "Satisfying read" — high dopamine, MC wins more than loses, modern TQ webnovel default |
| **Kìm nén** | Suppression — setup-without-payoff pattern that frustrates readers (anti-pattern) |
| **Tự ngược** | Self-torture — MC suffering pile-on (anti-pattern, TQ chán từ 2022) |
| **Đại thần (大神)** | "Great god" — top-tier author level. "Đại thần grade" = bestseller quality target |
| **Phế vật** | "Wastrel" — common opening trope (MC starts as failure). Modern trend rejects this. |
| **凄惨开局 (Tragic opening)** | Old TQ trope: rock-bottom MC opening. Replaced by 稳健流/暖开局 (warm baseline) trend 2024-2026 |
| **Trùm cuối** | Final boss — combat-genre framing. Non-combat genres should reframe as "milestone tối thượng" |
| **Mì-ăn-liền** | "Instant noodle" pacing — every chapter ≥2 dopamine peaks, modern TQ standard |
| **Bàn tay vàng / Golden finger** | MC's cheat ability (system, knowledge, item, talent) |
| **Vả mặt / Face-slap (打脸)** | Dopamine event where someone underestimates MC then witnesses MC competence — bystander shock |
| **Cảnh giới** | Cultivation realm tier — locked progression in tien-hiep (Luyện Khí → Trúc Cơ → ...) |
| **Sub-genre flag** | Per-project metadata: trong-sinh / xuyen-khong / hac-am-luu / etc. — overlays on top-level genre |

---

## 7. Version Log (story engine quality work)

| Date | Version | Change |
|---|---|---|
| 2026-04-30 | v4 | Systemic refactor P1-P5 — type system + state defenses + branching alignment + hardening + docs — PR #21-25 |
| 2026-04-30 | v3 | Per-genre process blueprints (16 genres × setup/process/scenes/arc) — PR #17 |
| 2026-04-30 | v2 | Outline layer fixes — master_outline 6-axis, story_outline cast/rules/tone, arc_plan warm-baseline — PR #16 |
| 2026-04-30 | v1 | Voice anchors + seed blueprint — 16-genre prose samples + 9-section world_description — PR #15 |
| 2026-04-30 | safety | Circuit breaker + cost cap + stuck-novels admin UI — PR #14 |
| 2026-04-29 | continuity | Self-healing outlines (S1) + memory retry queue (S2) — Phase 23 |
| 2026-04-28 | sảng văn | Pacing overhaul — Phase 19 |
| 2026-04-28 | genre arch | Genre architecture expansion — Phase 20A (3 new top-level + 12 topics + 5 sub-genre rules) |
| 2026-02-25 | hardening | Phase 8-10 — security + dedup + type safety |
| 2026-02 baseline | initial | First production engine v2 — pre-quality-work baseline |

---

## 8. Hỏi đáp nhanh

**Q: Engine viết truyện theo workflow nào?**
A: Spawn → master_outline + story_outline (1× per novel) → arc_plan (mỗi 20 chương) → per-chapter Architect→Writer→Critic + 17 post-write tasks. Code: [`pipeline/orchestrator.ts`](../../src/services/story-engine/pipeline/orchestrator.ts).

**Q: Làm sao add genre mới?**
A: 4 chỗ cần update — [`templates/genre-voice-anchors.ts`](../../src/services/story-engine/templates/genre-voice-anchors.ts) (prose voice), [`templates/genre-process-blueprints.ts`](../../src/services/story-engine/templates/genre-process-blueprints.ts) (setup/process), [`templates.ts`](../../src/services/story-engine/templates.ts) (GENRE_STYLES + GENRE_TITLE_EXAMPLES + GENRE_ENGAGEMENT + VN_PRONOUN_GUIDE), [`memory/style-bible.ts`](../../src/services/story-engine/memory/style-bible.ts) (vocabulary). + add to `GenreType` union in [`types.ts`](../../src/services/story-engine/types.ts).

**Q: Novel bị stuck (không viết được)?**
A: Vào `/admin/stuck-novels` xem reason. Common causes: seed landmine (currency leak / political term / repetition cap), Critic loop, hard-fail circuit breaker fired. Recovery: fix root cause + click Resume.

**Q: Chương output kém chất lượng — debug ở đâu?**
A: 1) Đọc world_description / story_outline / arc_plan của novel — có concrete cast + world rules không? 2) Xem voice anchor cho genre đó. 3) Sample 3 chương, check rule violations bằng [`templates.ts`](../../src/services/story-engine/templates.ts) anti-cliché lists.

**Q: Cron không pickup novel?**
A: Check [`/admin`](../../src/app/admin/) → Production Report. Verify status='active', current_chapter < total_planned, daily_quota chưa completed, retry_count < 5 (circuit breaker).

---

**Last Updated**: 2026-04-30
**Maintainer**: When you ship something story-engine related, update version log + cross-reference here.
