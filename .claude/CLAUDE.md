# TruyenCity2 — Vietnamese Webnovel Platform

## Project Overview

Vietnamese webnovel reading platform with two frontends:
1. **Web app** — Next.js 15 at project root (`/`)
2. **Mobile app** — Expo React Native at `/mobile/`

Both share the same Supabase backend.

**Stack (Web):** Next.js 15, React 19, TypeScript, Supabase (PostgreSQL + pg_cron + pg_net), Google Gemini AI, Vercel Pro
**Stack (Mobile):** Expo SDK 54, expo-router v6, NativeWind v5, Tailwind CSS v4, react-native-css v3, Supabase
**Domain:** `truyencity.com` (prod), `truyencity2.vercel.app` (Vercel)
**Repo:** `https://github.com/ungden/truyencity2.git` (branch: `main`)
**User:** Vietnamese, direct/blunt style. Do everything at once, not incrementally.

**Brand positioning:** TruyenCity là nền tảng đọc truyện tiên tiến nhất của người Việt cho người Việt. NO mention of AI in any public/reader-facing text. Admin tools keep AI references internally only.

---

## Confirmed Decisions (Do Not Re-Ask)

- Framework is **Next.js 15 App Router** (NOT Vite). No migration needed.
- Cover generation stays **2K**; optimize at delivery layer via Next Image.
- Use provided TruyenCity brand artwork for favicon/logo/PWA icons.
- Dialogue in generated chapters must follow Vietnamese novel format with em dash `—`.
- Dark theme is the default/primary theme.
- WebNovel/Wuxiaworld modern style for UI.
- 5-star rating system (not thumbs up/down).
- Brand name is **TruyenCity** (one word, no diacritics, capital T and C). Not "Truyen City" or "Truyện City".
- Brand color: `#7c3aed` (purple).

---

## Supreme Goals — Long-Form Novel Quality (MANDATORY)

All agents working on story generation must preserve these 5 goals:

1. **Coherence từ chương 1 đến chương cuối** — zero plot holes, zero logic breaks.
2. **Character consistency tuyệt đối** — nhân vật đã chết KHÔNG được xuất hiện lại; sức mạnh/cảnh giới KHÔNG được tự thoái lui vô lý.
3. **Directional plot progression** — không lan man, có escalating conflict, có climax, có payoff.
4. **Natural ending trong khoảng 1000-2000 chương** — để AI tự quyết định điểm kết thúc phù hợp trong range, không ép cứng đúng 1 con số.
5. **Uniform quality xuyên suốt** — chương 800 phải giữ chất lượng tương đương chương 8.

### Technical Principles (Gemini 3 Flash Preview)

- **Cost is not a concern**: ưu tiên chất lượng tối đa.
- Model context window: **1,000,000 input tokens / 65,000 output tokens**.
- Không tự bóp context vô lý. Mục tiêu mỗi AI call:
  - Input: ~100K-200K tokens khi cần ngữ cảnh sâu.
  - Output: ~16K-32K tokens cho các bước viết/chuyển cảnh dài.
- Ưu tiên context đầy đủ cho Architect/Writer/Critic để giảm mâu thuẫn dài hạn.
- Hệ thống phải hỗ trợ chạy batch **5 novel song song qua đêm** đến điểm kết tự nhiên.

---

## Core Runtime Fixes (2026-02-16)

Đã triển khai trực tiếp vào pipeline để tránh phụ thuộc vào audit ngoài:

1. **Atomic project claim** (`src/app/api/cron/write-chapters/route.ts`)
   - Claim job dùng `UPDATE ... WHERE updated_at < fourMinutesAgo ... RETURNING id`.
   - Chỉ chạy các project thực sự claim được (`claimedResumeProjects`, `claimedInitProjects`).
   - Loại race condition SELECT-then-UPDATE (TOCTOU) khi có nhiều worker.

2. **Mandatory post-write summary pipeline** (`src/app/api/cron/write-chapters/route.ts` + `src/services/story-writing-factory/context-loader.ts`)
   - Chapter summary là bước **critical**: retry tối đa 3 lần, fail thì throw.
   - `current_chapter` chỉ được tăng sau khi chapter + summary đã persist.
   - `saveChapterSummary` hỗ trợ `throwOnError` để đảm bảo fail-closed khi cần.

3. **Power progression budget (anti power-creep)** (`src/services/story-writing-factory/templates.ts` + `src/services/story-writing-factory/chapter.ts`)
   - Bỏ ép dopamine/power-up mỗi chương.
   - Thêm ngân sách per-arc: tối đa 3 power-up, tối đa 1 breakthrough/20 chương.
   - Prompt Architect/Writer nhấn mạnh tiến triển qua chiến lược, quan hệ, worldbuilding.

4. **Anti-repetition ending/cliffhanger** (`src/services/story-writing-factory/context-loader.ts` + `src/services/story-writing-factory/chapter.ts`)
   - Nạp `recentCliffhangers` từ `chapter_summaries` vào context layer.
   - Inject vào prompt Architect để cấm lặp motif kết thúc 5-10 chương gần nhất.

5. **Continuity hard enforcement in Critic** (`src/services/story-writing-factory/chapter.ts`)
   - Prompt critic quy định hard reject cho: resurrection vô lý, power regression vô lý, world-rule violations.
   - Sau parse, code cưỡng bức `requiresRewrite=true` nếu có issue continuity `major|critical`.

Khi tiếp tục tối ưu sau này, ưu tiên chỉnh trong runtime pipeline hiện có, không thêm lớp audit bên ngoài trừ khi bắt buộc.

---

## Vietnamese Language Rules (QUAN TRỌNG)

**Tất cả text tiếng Việt hiển thị cho người dùng PHẢI có dấu đầy đủ.**

Ví dụ đúng:
- "Kiểm tra" chứ KHÔNG phải "Kiem tra"
- "Đang tải..." chứ KHÔNG phải "Dang tai..."
- "Tiên Hiệp" chứ KHÔNG phải "Tien Hiep"
- "Huyền Huyễn" chứ KHÔNG phải "Huyen Huyen"
- "Đô Thị" chứ KHÔNG phải "Do Thi"

**Áp dụng cho:** UI labels, button text, titles, descriptions, placeholders, error messages, toast messages, admin panel text, page headers, empty states, loading states, genre labels, code comments có tiếng Việt.

**KHÔNG áp dụng cho:** variable names, CSS class names, URL slugs (slugs không dấu là đúng), brand name "TruyenCity".

---

## Critical Rules — AI Models

### ONLY TWO MODELS ALLOWED:

| Purpose | Model ID |
|---------|----------|
| **ALL text** (chapters, planning, ideas, authors) | `gemini-3-flash-preview` |
| **ALL images** (covers with title + branding) | `gemini-3-pro-image-preview` |

### BANNED:
- Any old Gemini model (2.0, 2.5, 1.5, exp)
- Any non-Gemini provider (OpenRouter, DeepSeek, OpenAI, Anthropic)
- Any API key other than `GEMINI_API_KEY`
- **NO FALLBACKS** — if Gemini fails, throw error, never substitute with templates

---

## Mobile App (`/mobile/`)

### Architecture & Dependencies
- **Expo SDK 54** with `expo-router` v6
- **NativeTabs** from `expo-router/unstable-native-tabs` (NOT JS Tabs)
- **SF Symbols** via `expo-symbols` for tab icons
- **react-native-css** v3.0.1 + **nativewind** v5.0.0-preview.2 for styling
- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **lightningcss 1.30.1** — MUST stay at this version. 1.31.1 causes `failed to deserialize; expected an object-like struct named Specifier` error.
- **expo-image** for all images (not RN Image)
- **expo-secure-store** for Supabase auth tokens
- **expo-sqlite** for localStorage polyfill — NEVER use AsyncStorage
- **expo-speech** for TTS (Vietnamese vi-VN)
- **expo-haptics** for haptic feedback
- CSS wrapper components in `src/tw/index.tsx` using `useCssElement` from `react-native-css`
- Metro port: **8088** (8081 is used by another app)
- `process.env.EXPO_OS` not `Platform.OS`
- **Inline styles** preferred over `StyleSheet.create`
- `contentInsetAdjustmentBehavior="automatic"` on ScrollViews
- Supabase: `EXPO_PUBLIC_SUPABASE_URL=https://jxhpejyowuihvjpqwarm.supabase.co`

### Tailwind/Styling Gotchas (Mobile)
- `bg-gradient-*` doesn't work on RN — use View overlay with rgba backgroundColor
- `var(--color-*)` doesn't work in RN inline `style={{}}` — use hardcoded colors
- `Link asChild` + CSS-wrapped `Pressable` can have style merging issues — use inline styles as fallback
- `FlatList` is NOT CSS-wrapped — always from `react-native`, use `style={{}}` not `className`

### Verification Commands (Mobile)
```bash
cd mobile && npx tsc --noEmit          # TypeScript check
cd mobile && npx expo export --platform ios  # iOS export
```

### Mobile File Structure
```
mobile/
├── app/
│   ├── _layout.tsx                    # Root Stack — imports @/global.css
│   ├── +not-found.tsx
│   ├── read/[slug]/[chapter].tsx      # Reading screen (dark) — TTS + offline-first
│   └── (tabs)/
│       ├── _layout.tsx                # NativeTabs (4 tabs)
│       ├── (discover)/               # Tab 1: "Trang Chủ" — branded header
│       │   ├── _layout.tsx            # Stack with HeaderLogo component
│       │   ├── index.tsx              # Hero carousel + sections
│       │   ├── latest.tsx
│       │   └── novel/[slug].tsx       # Novel detail — has download button
│       ├── (rankings)/               # Tab 2: "Khám Phá"
│       │   ├── _layout.tsx
│       │   └── index.tsx
│       ├── (library)/                # Tab 3: "Tủ Sách" — has "Đã tải" tab
│       │   ├── _layout.tsx
│       │   └── index.tsx
│       └── (account)/                # Tab 4: "Cài Đặt" — gamified profile
│           ├── _layout.tsx
│           ├── index.tsx              # Full gamified profile + offline storage
│           └── login.tsx              # Branded login
├── src/
│   ├── tw/index.tsx                   # CSS wrapper components
│   ├── tw/image.tsx                   # expo-image CSS wrapper
│   ├── global.css                     # Tailwind v4 + nativewind/theme + custom colors
│   ├── components/
│   │   ├── novel-card.tsx             # 7 card variants
│   │   ├── underline-tabs.tsx
│   │   ├── hero-carousel.tsx
│   │   └── section-header.tsx
│   ├── hooks/
│   │   ├── use-user-stats.ts          # Supabase user stats (9 parallel queries)
│   │   ├── use-tts.ts                 # TTS playback hook
│   │   └── use-offline.ts            # Offline download state machine
│   ├── lib/
│   │   ├── config.ts                  # READING, CACHE, PAGINATION constants
│   │   ├── gamification.ts            # XP, 13 cultivation levels, 22 achievements
│   │   ├── genre.ts                   # Vietnamese genre labels
│   │   ├── offline-db.ts              # SQLite offline schema + CRUD
│   │   ├── storage.ts                 # expo-sqlite localStorage polyfill
│   │   ├── supabase.ts                # Supabase client
│   │   ├── tts.ts                     # HTML stripping, text chunking
│   │   └── types.ts                   # Novel, Chapter, Author types
│   └── utils/
│       └── use-storage.ts             # useSyncExternalStore + storage
├── assets/
│   └── logo.png                       # TruyenCity brand icon (from web PWA)
├── app.config.ts
├── metro.config.js
├── postcss.config.mjs
├── tsconfig.json
└── package.json                       # lightningcss pinned at 1.30.1
```

### Mobile Features Built
1. **Full UI** — 4 tab structure, novel cards (7 variants), hero carousel, underline tabs, section headers
2. **Reading screen** — `app/read/[slug]/[chapter].tsx` with dark theme
3. **TTS (Nghe Truyện)** — expo-speech with vi-VN, mini player bar, speed control (0.5x-2x), chunk queuing, pseudo-pause on Android
4. **Offline Download** — SQLite `truyencity-offline.db`, batch download (20 at a time), offline-first fetch (SQLite before Supabase), progress tracking, cancel support
5. **Gamified Profile** — XP system, 13 cultivation levels (Phàm Nhân → Tiên Đế), 22 achievements, stats grid, settings menu
6. **Branding** — Logo in header, login, account screen, version footer

---

## Web App — Key Files

### Frontend — Pages
- `src/app/page.tsx` — Homepage: ContinueReading, genre sections (Tiên Hiệp, Đô Thị), latest updates carousel
- `src/app/truyen/[slug]/page.tsx` — Novel detail (WebNovel style): 200px cover, 4-stat grid, StarDisplay, interactive rating, related novels, author works
- `src/app/truyen/[slug]/read/[chapter]/page.tsx` — Reading page (dark-friendly, collapsible sidebar)
- `src/app/ranking/page.tsx` — Rankings: 5 tabs (Hot/Rating/Updated/Chapters/Bookmarks), Top 50, RPC functions
- `src/app/browse/page.tsx` — Browse: genre/status/chapter-range filters, grid/list view, sort, pagination
- `src/app/login/LoginClient.tsx` — Auth UI with Supabase, Google OAuth, Vietnamese localization

### Frontend — Components
- `src/components/star-rating.tsx` — `StarDisplay` (read-only, fractional) + `StarRating` (interactive)
- `src/components/related-novels.tsx` — Same-genre novels with overlap scoring
- `src/components/author-works.tsx` — Same-author novels
- `src/components/continue-reading.tsx` — "Tiếp tục đọc" from `reading_progress`
- `src/components/latest-updates-carousel.tsx` — Prev/next pagination with page counter
- `src/components/search-modal.tsx` — localStorage recent searches, relevance/chapter/updated sort, genre filter
- `src/components/novel-card.tsx` — Multi-variant novel card (default/horizontal)
- `src/components/chapter-list.tsx` — Paginated chapter list
- `src/components/header.tsx` — Header with search trigger, default title "TruyenCity"
- `src/components/layout/desktop-sidebar.tsx` — Sidebar with TruyenCity branding
- `src/components/onboarding/OnboardingWizard.tsx` — Reader-focused onboarding (NO AI mentions)
- `src/components/pwa-provider.tsx` — PWA context, service worker, push notifications
- `src/components/admin/pwa-install-button.tsx` — PWA install + notification panel
- `src/components/admin/admin-sidebar.tsx` — Admin panel navigation

### Story Writing Engine (`src/services/story-writing-factory/`)
- `runner.ts` — Orchestrator (plan -> write -> QC), finale detection, 4-layer context assembly
- `chapter.ts` — 3-agent pipeline (Architect/Writer/Critic), multi-POV, scene label stripping
- `planner.ts` — Story outline + arc planning
- `memory.ts` — Legacy hierarchical memory (fallback only; primary is context-loader)
- `context-loader.ts` — **4-layer DB-backed context** (story bible + synopsis + last 5 chapters + arc plan)
- `context-generators.ts` — AI generators (synopsis, arc plans, story bible, chapter summaries)
- `constraint-extractor.ts` — World constraint extraction for consistency
- `content-seeder.ts` — Bulk novel seeding
- `power-tracker.ts` — 9-realm cultivation tracking
- `beat-ledger.ts` — 50+ beat types with cooldowns
- `consistency.ts` — Dead character detection, contradictions
- `qc-gating.ts` — Chapter scoring, auto-rewrite if < 65/100
- `style-bible.ts` — Style context + em dash dialogue
- `title-checker.ts` — Jaccard + containment similarity, banned titles, 70% hard rejection

### **Scalability System (4 Phases) — IMPLEMENTED 2026-02-11**

**Purpose**: Support 1000-2000 chapter novels without AI "forgetting" plot threads

#### Phase 1: Plot Thread Manager
- **File**: `src/services/story-writing-factory/plot-thread-manager.ts`
- **Features**:
  - Smart thread selection (top 5 most relevant per chapter)
  - Thread lifecycle: Open → Developing → Climax → Resolved → Legacy
  - Character recaps for returning characters (>50 chapters absence)
  - Abandonment detection (>100 chapters inactive)
  - Foreshadowing deadline tracking with urgency warnings
- **DB Table**: `plot_threads`

#### Phase 2: Volume Summary Manager
- **File**: `src/services/story-writing-factory/volume-summary-manager.ts`
- **Features**:
  - 4-level memory: Story → Volume (100 ch) → Arc (20 ch) → Recent (3 ch)
  - Auto-generate volume summary every 100 chapters
  - Relevance scoring: Threads (40%) + Characters (30%) + Proximity (20%) + Importance (10%)
  - Character arc tracking across volumes
- **DB Table**: `volume_summaries`

#### Phase 3: Rule Indexer
- **File**: `src/services/story-writing-factory/rule-indexer.ts`
- **Features**:
  - Tag-based indexing: `power:realm=KimDan`, `location=ThanhVanTong`
  - Hybrid search: Tags (40%) + Category (25%) + Text (20%) + Context (15%)
  - 8 categories: power_system, politics, economy, geography, culture, history, mechanics, restrictions
  - Auto-extract rules from chapter content
  - Usage tracking for rule importance
- **DB Table**: `world_rules_index`

#### Phase 4: Long-term Validator
- **File**: `src/services/story-writing-factory/long-term-validator.ts`
- **Features**:
  - Milestone validation at Ch.100, 250, 500, 750, 1000, 1500, 2000
  - 5 validation types: thread_resolution, character_arc, power_consistency, foreshadowing_payoff, pacing
  - Auto-recommendations for issues
  - Critical issue detection
- **DB Table**: `milestone_validations`

#### Integration
```typescript
// In runner.ts or memory initialization:
await memoryManager.initializePlotThreadManager();
await memoryManager.initializeVolumeSummaryManager();

// Before writing each chapter:
const threadContext = await plotThreadManager.selectThreadsForChapter(chapter, characters, arc, tension);
const volumeContext = await volumeManager.selectVolumesForChapter(chapter, threads, characters);
const ruleSuggestions = ruleIndexer.suggestRulesForChapter(chapter, context, characters, location);

// After milestone chapter:
const report = await validator.checkAndValidate(chapterNumber);
```

#### Results
- Max chapters: 300 → **2000+** (6.7x improvement)
- Thread retention: 40% → **95%** (+55%)
- Context size: **~1200 tokens** (optimized, within LLM limits)

#### Documentation
- **Integration Guide**: `docs/SCALABILITY_INTEGRATION_GUIDE.md`
- **Changes Summary**: `SCALABILITY_CHANGES_SUMMARY.md`
- **Tests**: `src/__tests__/scalability.test.ts` (12 tests, all passing)

#### Migration
```sql
-- Run this on production:
psql -d your_db -f supabase/migrations/0100_create_plot_thread_tables.sql
```

### 4-Layer Context System (IMPLEMENTED 2026-02-15)

**Problem:** Each cron run creates a fresh StoryRunner with zero memory. MemoryManager uses ephemeral `/tmp` — always empty in resume mode. Result: duplicate titles (15-25%), repetitive openings (10-40%), zero plot coherence across 1,000-2,000 chapter novels.

**Solution:** DB-backed 4-layer context system providing ~22,000-27,000 tokens per chapter write.

#### Architecture
```
LAYER 1: STORY BIBLE (~2,000 tokens, static after ch.3)
  - AI-generated from first 3 chapters, persisted in ai_story_projects.story_bible
  - Triggers: ch.3 in cron post-write callback

LAYER 2: ROLLING SYNOPSIS (~1,000-3,000 tokens, updated every 20 chapters)
  - AI reads old synopsis + 20 new chapter summaries → writes new synopsis
  - Persisted in story_synopsis table
  - Triggers: ch % 20 == 0 in cron post-write callback

LAYER 3: LAST 5 FULL CHAPTERS (~17,000 tokens)
  - Raw text loaded from chapters table

LAYER 4: ARC INTELLIGENCE (~1,000-2,000 tokens)
  - AI-generated 20-chapter arc plan with per-chapter briefs
  - Persisted in arc_plans table
  - Triggers: ch % 20 == 0 in cron post-write callback

ANTI-REPETITION (~500-1,000 tokens)
  - All previous titles for dedup
  - Last 20 opening sentences from chapter_summaries
```

#### Cron Flow Per Chapter
```
1. ContextLoader loads all 4 layers from DB in parallel
2. If arc boundary (chapter % 20 == 0):
   a. Generate new ROLLING SYNOPSIS
   b. Generate ARC PLAN for next 20 chapters
3. If chapter == 3: Generate STORY BIBLE
4. Assemble ~22K-27K token context into previousSummary
5. Write chapter (3-agent pipeline: Architect → Writer → Critic)
6. Post-write: AI generates chapter summary, save to DB
```

#### Key Files
- `context-loader.ts` — `ContextLoader.load()` + `ContextLoader.assembleContext()` + persistence helpers
- `context-generators.ts` — `summarizeChapter()`, `generateSynopsis()`, `generateArcPlan()`, `generateStoryBible()`
- `write-chapters/route.ts` — Post-write callback wiring (lines 325-405)
- `runner.ts` — Context assembly in `writeArc()` (line 588-591)

#### DB Tables (Migration 0113)
```
chapter_summaries (project_id, chapter_number, title, summary, opening_sentence, mc_state, cliffhanger)
story_synopsis (project_id, synopsis_text, mc_current_state, active_allies, active_enemies, open_threads)
arc_plans (project_id, arc_number, start_chapter, end_chapter, arc_theme, plan_text, chapter_briefs)
ai_story_projects.story_bible (text column)
```

#### Quality Results (40 chapters audited)
| Metric | Old System | New System |
|---|---|---|
| Duplicate titles | 15-25% | **0%** |
| Duplicate openings | 10-40% | **0%** |
| Avg chapter length | ~13,777 chars | **16,646 chars** |

#### What's NOT Yet Tested at Scale
- **Story Bible**: triggers at ch.3 — working (1 novel has it)
- **Synopsis**: triggers at ch.20 — **NOT YET TESTED** (no novel has 20+ chapters yet)
- **Arc Plan**: triggers at ch.20 — **NOT YET TESTED**
- Plot drift, character inconsistency — only visible after 50-100+ chapters

#### Current Data (as of 2026-02-15)
- **20 novels** active, each at ch.1-2 (fresh start with new system)
- **40 chapters** written total
- **0 duplicate titles, 0 duplicate openings** confirmed
- All old data (46,093 chapters, 243 novels) wiped and regenerated

### Bug Fixes Applied (2026-02-15)

1. **Scene label leak** — `cleanContent()` in `chapter.ts` now strips `Scene N:` / `Cảnh N:` leaked from Architect outline
2. **Chapter numbering gap** — Pre-write gap check in cron route: if `current_chapter` is ahead of actual max chapter in DB, auto-correct before writing
3. **Fallback overwrite** — Cron fallback `runAttempt` now skips if the chapter was already generated (prevents overwriting 3-agent quality with simple workflow)
4. **Silent save failures** — `saveChapterSummary`, `saveSynopsis`, `saveArcPlan`, `saveStoryBible` now use `console.warn` instead of `logger.debug` (these were silently losing context data)
5. **Unsafe singletons** — Removed `getStoryRunner()` and `chapterWriter` singleton exports (mutable state not safe for concurrent requests)
6. **Stale completion logic** — `nextCh` renamed to `lastWrittenCh` with correct value accounting for whether a chapter was actually written
7. **Wrong averageWordsPerChapter** — Resume mode was dividing session-only word count by total historical chapter count; now uses `sessionChaptersWritten`
8. **Natural ending false positives** — `detectNaturalEnding` now only checks last 800 chars (not whole chapter), weakened mid-story achievement markers, added more anti-signals
9. **Title dialogue fragments** — Fallback title extraction now filters out lines starting with `—` (dialogue markers)
10. **Fragile cursor pattern** — `executeWithConcurrency` uses atomic `cursor++` instead of separate read-increment
11. **Hardcoded protagonist flaw** — Character tracker now derives flaw/strength from outline instead of hardcoding "kinh mạch bị phế"

### Known Remaining Issues

1. **Context payload loaded once per run** — If `chaptersToWrite > 1`, the same context is reused for all chapters in that batch (stale `recentChapters` and `previousTitles`). Currently mitigated because cron uses `chaptersToWrite: 1`, but would be a bug for multi-chapter runs.
2. **Two Supabase clients** — Cron route creates its own via `getSupabaseAdmin()` while factory modules use `getSupabase()` from supabase-helper. Not a bug, but wastes connection pool slots.
3. **`isArcBoundary` in ContextPayload unused** — The field is loaded but never consumed downstream. Dead code.
4. **ensureProjectRecord uses arbitrary first user** — All auto-created projects are owned by whatever user is first in `profiles` table. Would break if RLS is enforced.

### Types & Utils
- `src/lib/types.ts` — Novel, Chapter, Author types
- `src/lib/types/genre-config.ts` — GENRE_CONFIG with icons/names (canonical source)
- `src/lib/utils.ts` — `cleanNovelDescription()` strips metadata
- `src/lib/utils/genre.ts` — `getGenreLabel()` helper

---

## Two-Phase Production System

### Phase 1: Initial Seed (RE-SEEDED 2026-02-15)
- 10 AI authors x 2 novels each = **20 novels** seeded fresh
- Each novel has `total_planned_chapters` = random 1000-2000
- All old novels/chapters wiped to start with 4-layer context system
- pg_cron writes ~20 chapters/novel/day automatically

### Phase 2: Daily Rotation (ongoing, automated)
- `daily-rotate` cron activates **20 new novels/day**
- Each author maintains ~5 active novels
- Auto-rotate when novel finishes

---

## Cron System (4 jobs via pg_cron + Vercel)

| Cron | Interval | File | What it does |
|------|----------|------|-------------|
| `write-chapters` | Every 5 min | `src/app/api/cron/write-chapters/route.ts` | 30-180 resume + 8 init, 12 concurrency, 4-layer context |
| `generate-covers` | Every 10 min | `src/app/api/cron/generate-covers/route.ts` | 20 covers, 4 parallel |
| `daily-rotate` | Once/day 0h UTC | `src/app/api/cron/daily-rotate/route.ts` | Backfill + expand 20/day |
| `health-check` | Once/day 6h UTC | `src/app/api/cron/health-check/route.ts` | 8 system checks |

**Auth:** All crons use `Authorization: Bearer ${CRON_SECRET}`

---

## Database

### Key Tables

#### Core Tables
```
novels (id, title, author, ai_author_id, description, cover_url, cover_prompt, genres, status, slug)
chapters (id, novel_id, chapter_number, title, content)
ai_story_projects (id, novel_id, genre, main_character, world_description,
                   total_planned_chapters, current_chapter, status: active|paused|completed)
ai_authors (id, name, bio, writing_style_description, specialized_genres, status)
plot_arcs (id, project_id, arc_number, tension_curve, theme, climax_chapter)
chapter_reads — Per-chapter read tracking
reading_progress — Per-novel progress (for "Continue Reading")
bookmarks — User bookmarks (unique user+novel)
comments — Comments with moderation
ratings — 5-star ratings (unique user+novel, RLS enabled, auto updated_at)
```

#### 4-Layer Context Tables (Migration 0113)
```
chapter_summaries (project_id, chapter_number, title, summary, opening_sentence, mc_state, cliffhanger)
story_synopsis (project_id, synopsis_text, mc_current_state, active_allies, active_enemies, open_threads, last_updated_chapter)
arc_plans (project_id, arc_number, start_chapter, end_chapter, arc_theme, plan_text, chapter_briefs, threads_to_advance, threads_to_resolve, new_threads)
ai_story_projects.story_bible — text column added
```

#### Scalability Tables (Migration 0100)
```
plot_threads (id, project_id, name, description, priority, status,
              start_chapter, target_payoff_chapter, resolved_chapter,
              related_characters, related_locations, foreshadowing_hints)
              — Plot thread management with lifecycle tracking

volume_summaries (id, project_id, volume_number, start_chapter, end_chapter,
                  title, summary, major_milestones, arcs_included,
                  plot_threads_resolved, plot_threads_introduced,
                  character_development)
                  — Volume-level summaries for long-form memory

world_rules_index (id, project_id, rule_text, category, tags,
                   introduced_chapter, importance, usage_count)
                   — Tag-based world rules for quick retrieval

milestone_validations (id, project_id, milestone_chapter, validation_type,
                       status, details, recommendations)
                       — Quality checkpoints at Ch.100, 500, 1000, etc.
```

### RPC Functions (migration `0030`)
- `get_novel_stats(novel_id)` — single novel stats aggregation
- `get_novels_with_stats(novel_ids[])` — batch stats (avoids N+1)
- `get_top_novels_by_views(days, limit)` — Hot ranking tab
- `get_top_novels_by_rating(min_ratings, limit)` — Rating ranking tab
- `get_top_novels_by_bookmarks(limit)` — Bookmarks ranking tab

---

## Rate Limits (Gemini Tier 3)

| Model | Limit | Our setting |
|-------|-------|-------------|
| Gemini 3 Flash (text) | 20,000 RPM | 2,000 RPM (10%) |
| Gemini 3 Pro Image | 2,000 RPM | ~60 RPM (4 parallel) |

---

## Environment Variables

### Web (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://jxhpejyowuihvjpqwarm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
CRON_SECRET=...
```

### Mobile (in app.config.ts)
```
EXPO_PUBLIC_SUPABASE_URL=https://jxhpejyowuihvjpqwarm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Image Delivery + Branding Rules

- All covers use `next/image` (no raw `<img>` or CSS `background-image`)
- Cover generation: 2K, 3:4 aspect, title text + "Truyencity.com" branding
- Brand icon source: `public/icons/brand-logo.png`
- Mobile logo: `mobile/assets/logo.png` (copied from web PWA icon)

---

## Website Rebrand Status (COMPLETED)

All public-facing text rebranded from "AI Story Writer" to reading platform. Files updated:
- `src/app/layout.tsx` — Title: "TruyenCity - Đọc Truyện Online Miễn Phí"
- `public/manifest.json` — Consistent PWA name/description
- `src/components/onboarding/OnboardingWizard.tsx` — Reader-focused welcome, no AI
- `src/app/login/LoginClient.tsx` — "Đăng nhập để lưu tiến trình đọc"
- `src/components/admin/admin-sidebar.tsx` — Toned down descriptions
- `src/components/admin/pwa-install-button.tsx` — "Đọc truyện nhanh hơn, ngay cả khi offline"
- `src/components/pwa-provider.tsx` — Generic SW messages (no "viết chương")

Genre labels in 5 factory pages (`blueprints`, `config`, `authors`, `production`, `ideas`) all converted to proper Vietnamese with diacritics.

---

## Git Conventions

- Push to `main` -> auto-deploy on Vercel
- Commit style: `type: description` (fix, feat, perf, refactor)
- Never commit `.env.local` or secrets
- Never force push to main

---

## Description Cleanup

`novels.description` from seeder contains intro + synopsis ONLY.
Old novels may have metadata blocks but `cleanNovelDescription()` in `src/lib/utils.ts` strips them.
**Rule:** Never show raw `novel.description` without `cleanNovelDescription()`.

---

## Critical Operational Notes

- **`ai_story_projects.updated_at` has a DB trigger** that auto-sets to `now()`. Cannot be backdated manually. The cron uses `.lt('updated_at', fourMinutesAgo)` as a distributed lock — must wait 4+ minutes between cron calls for the same projects.
- **`ensureDailyQuotasForActiveProjects()` uses `ignoreDuplicates: true`** — forcing `next_due_at` manually works, but the `updated_at` lock is the real gatekeeper for processing.
- **Never use `getStoryRunner()` or `chapterWriter` singletons** — they hold mutable state. Always create new instances.
- **Context payload is loaded once per `runner.run()` call** — safe for `chaptersToWrite: 1` (cron), but would need reload logic for multi-chapter runs.

---

## Soft Ending Logic

`total_planned_chapters` is a **SOFT TARGET**:
- **Phase 1** (ch 1 -> target-20): Normal writing
- **Phase 2** (target-20 -> target): Wrap up, no new conflicts
- **Phase 3** (target -> target+20): Grace period until arc boundary
- **Phase 4** (target+20): Hard stop safety net

---

## iOS App Store Submission

### EAS Build Pipeline
- **EAS project**: `@titanlabs/truyencity` (projectId: `b08cdab3-d9a8-49f9-9a8d-c0789d4df743`)
- **Bundle ID**: `com.truyencity.app`
- **ASC App ID**: `6759160705`
- **Apple Team**: `Q8A7CBYV5Z` (Tien Duong Le, Individual)
- **Current version**: 1.0.0, buildNumber: `"2"` in app.config.ts (build #1 was submitted)
- **Build command**:
```bash
cd /Users/alexle/Documents/truyencity2/mobile
EXPO_ASC_API_KEY_PATH="/Users/alexle/Downloads/AuthKey_K4XKK27BYH.p8" \
EXPO_ASC_KEY_ID="K4XKK27BYH" \
EXPO_ASC_ISSUER_ID="16b1bc8e-5a12-4788-b4d2-4c9ebe0068fb" \
EXPO_APPLE_TEAM_ID="Q8A7CBYV5Z" \
EXPO_APPLE_TEAM_TYPE="INDIVIDUAL" \
npx eas build --platform ios --profile production --non-interactive --auto-submit
```

### ASC Status (as of 2026-02-14)
- **Build**: v1.0.0 build #1 — VALID, assigned to version
- **Version**: 1.0 — PREPARE_FOR_SUBMISSION
- **Metadata set via API**: description, keywords, subtitle, copyright ("2026 TruyenCity"), categories (Books + Entertainment), privacy URL, support URL, age rating (12+), review contact info, pricing (FREE)
- **Screenshots uploaded**: 4x iPhone 6.7" (APP_IPHONE_67, 1290x2796) + 4x iPad Pro 12.9" (APP_IPAD_PRO_129, 2048x2732)
- **BLOCKING**: App Privacy must be set in ASC web UI (API doesn't support it) — select "Data Not Collected" → Publish
- **After privacy**: Submit for review via API or ASC web UI

### ASC API Authentication
```python
# JWT token generation for App Store Connect API
key_id = "K4XKK27BYH"
issuer_id = "16b1bc8e-5a12-4788-b4d2-4c9ebe0068fb"
key_path = "/Users/alexle/Downloads/AuthKey_K4XKK27BYH.p8"
# Generate with PyJWT: jwt.encode(payload, key, algorithm="ES256", headers={"kid": key_id})
```

### ASC Resource IDs (for API calls)
- App Info ID: `4ae1c9a9-f118-4e25-ad98-eb0e88d15328`
- Version ID: `a12fa36c-2e3f-4ab4-ad66-af040a7c406b`
- Version Localization (vi): `d90fa54e-6984-4f0e-a9f1-82ae0b313bdf`
- App Info Localization (vi): `90e11dc3-0099-45af-941b-7c94fae407fe`
- Review Detail: `7cb7f0ea-48d2-4d83-a165-c0c024d38881`
- Build ID: `8c739520-d257-4402-84f1-e52bd6c89063`

---

## Database Optimizations

### Denormalized `chapter_count` (Migration 0109)
- Added `chapter_count` integer column to `novels` table
- Trigger `trg_update_novel_chapter_count` auto-increments/decrements on chapter INSERT/DELETE
- Index: `idx_novels_chapter_count ON novels(chapter_count DESC)`
- Mobile queries use `chapter_count` instead of `chapters(count)` subquery (was causing timeouts)
- Migration: `supabase/migrations/0109_add_chapter_count_to_novels.sql`

### Current Stats (2026-02-15 — post-wipe rebuild)
- **20 novels**, **~40 chapters** (fresh start with 4-layer context system)
- All old data (243 novels, 46,093 chapters) wiped and regenerated from scratch
- Supabase project: `jxhpejyowuihvjpqwarm` (region: Singapore)
- Service role key in `.env.local`

---

## Reader Screen (`mobile/app/read/[slug]/[chapter].tsx`)

### Features (Full Rewrite — 2026-02-14)
- **4 Reading Themes**: Dark (#09090b) / Light (#ffffff) / Sepia (#f4ecd8) / Green (#dce8d2) — constants in `config.ts`
- **3 Font Families**: Sans (System) / Serif (Georgia) / Mono (Menlo)
- **Font size slider**: 14-32, custom pure-RN slider (no native module)
- **3 Line spacing presets**: Gọn (1.4) / Vừa (1.7) / Rộng (2.0)
- **Settings Bottom Sheet**: `reader-settings-sheet.tsx` — animated slide up, swipe down dismiss
- **Brightness control**: Dark overlay approach (View with `backgroundColor: "#000"` and `opacity: (1 - brightness) * 0.7`)
- **Auto-scroll**: Configurable speed 0-100 px/s
- **Tap zones**: Left 1/3 = scroll up, Center 1/3 = toggle controls, Right 1/3 = scroll down
- **Keep screen awake**: `expo-keep-awake`
- **TTS speed**: 0.1 step increments (0.5-2.0), persisted to localStorage
- **Chapter title dedup**: `stripChapterHeading()` strips "Chương X: ..." from content
- **Plain text → HTML**: Auto-wraps paragraphs with `textIndent: 24`, `marginBottom: 20`
- **Justified text**: `textAlign: "justify"`
- **Animated controls**: Fade in/out top header + bottom bar

### Bottom bar: `[Aa settings]` | `[Nghe TTS]` | `[auto-scroll]` | `[‹ 1/27 ›]`

### Critical Notes
- `expo-brightness` DOES NOT WORK in Expo dev client (needs native rebuild) — replaced with overlay
- `@react-native-community/slider` — replaced with custom `CustomSlider` using `Pressable` + `onLayout` + `locationX`
- Packages installed: `expo-keep-awake`
- Packages removed: `@react-native-community/slider`, `expo-brightness`

---

## Writer Pipeline — Title Deduplication System (2026-02-14)

### Problem
AI writer generates repetitive chapter titles. Top novels had 22-45% duplicate title rate.

### Solution — Multi-layer Defense

#### Layer 1: `title-checker.ts` — Fuzzy Similarity Detection
- **Jaccard + Containment similarity** (weighted 40/60): catches "Kẻ Săn Mồi" ⊂ "Kẻ Săn Mồi Trong Bóng Tối"
- `findMostSimilar()` — scans ALL previous titles, returns highest match
- `checkTitle()` — tiered penalties: ≥90% → -5, ≥70% → -3, ≥50% → -1
- **15 banned titles** (most-repeated offenders): `BANNED_TITLES` set
- Keyword overlap check against last 10 titles (was 5)
- Novelty penalty uses fuzzy sim against all titles (was keyword-only on last 10)

#### Layer 2: `templates.ts` — `buildTitleRulesPrompt()`
- Sends ALL previous titles (up to 50) to AI, not just last 10
- Stronger "CẤM TUYỆT ĐỐI" anti-repetition instructions

#### Layer 3: `runner.ts` + `ai-editor.ts` — `getPreviousTitles()`
- Default limit increased from 10 to **50**
- Fetches from in-memory + Supabase fallback

#### Layer 4: `chapter.ts` — Post-Optimization Safety
- After `optimizeTitle()`, checks fuzzy similarity again
- If still ≥70% similar, fallback to extracting a short sentence from chapter content
- Both `writeChapter` (3-agent) and `writeChapterSimple` have this safety net

### Key Files
- `src/services/story-writing-factory/title-checker.ts` — Core fuzzy matching + banned list
- `src/services/story-writing-factory/templates.ts` — AI prompt injection
- `src/services/story-writing-factory/runner.ts` — Title history fetching
- `src/services/story-writing-factory/chapter.ts` — Post-optimization fallback
- `src/services/story-writing-factory/ai-editor.ts` — Editor title history

---

## Data Fixes Applied (2026-02-14)

### Novel Titles Cleaned
22 novels had batch IDs like `[2026-02-12-8017]` in titles. Stripped via Supabase REST API.

### Chapter Titles Synced
~5,300+ chapter titles were mismatched (metadata `title` vs actual first-line title in content). Fixed via Python script scanning all 40,880 chapters.

### Content Quality Metrics (post-rebuild with 4-layer context)
- **40 chapters** written with new system
- Avg length: **~16,646 chars** per chapter (up from ~13,777)
- **0% duplicate titles** (was 15-25%)
- **0% duplicate openings** (was 10-40%)
- 20 active novels producing content
- Daily quota: 20 chapters/novel/day, distributed across the day via `project_daily_quotas`
