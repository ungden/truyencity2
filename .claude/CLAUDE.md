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
- `runner.ts` — Orchestrator (plan -> write -> QC), finale detection
- `chapter.ts` — 3-agent pipeline (Architect/Writer/Critic)
- `planner.ts` — Story outline + arc planning
- `memory.ts` — 4-level hierarchical memory
- `content-seeder.ts` — Bulk novel seeding
- `power-tracker.ts` — 9-realm cultivation tracking
- `beat-ledger.ts` — 50+ beat types with cooldowns
- `consistency.ts` — Dead character detection, contradictions
- `qc-gating.ts` — Chapter scoring, auto-rewrite if < 65/100
- `style-bible.ts` — Style context + em dash dialogue

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

### Types & Utils
- `src/lib/types.ts` — Novel, Chapter, Author types
- `src/lib/types/genre-config.ts` — GENRE_CONFIG with icons/names (canonical source)
- `src/lib/utils.ts` — `cleanNovelDescription()` strips metadata
- `src/lib/utils/genre.ts` — `getGenreLabel()` helper

---

## Two-Phase Production System

### Phase 1: Initial Seed (COMPLETED)
- 10 AI authors x 20 novels = 200 novels seeded
- Each novel has `total_planned_chapters` = random 1000-2000
- pg_cron writes ~20 chapters/novel/day automatically

### Phase 2: Daily Rotation (ongoing, automated)
- `daily-rotate` cron activates **20 new novels/day**
- Each author maintains ~5 active novels
- Auto-rotate when novel finishes

---

## Cron System (4 jobs via pg_cron + Vercel)

| Cron | Interval | File | What it does |
|------|----------|------|-------------|
| `write-chapters` | Every 5 min | `src/app/api/cron/write-chapters/route.ts` | 30 resume + 5 init |
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

#### Scalability Tables (NEW - Migration 0100)
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

## Soft Ending Logic

`total_planned_chapters` is a **SOFT TARGET**:
- **Phase 1** (ch 1 -> target-20): Normal writing
- **Phase 2** (target-20 -> target): Wrap up, no new conflicts
- **Phase 3** (target -> target+20): Grace period until arc boundary
- **Phase 4** (target+20): Hard stop safety net
