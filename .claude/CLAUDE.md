# TruyenCity2 - AI Webnovel Factory

## Project Overview

Industrial-scale Vietnamese webnovel platform. AI generates 200+ novels with 1000-2000 chapters each, fully automated.

**Stack:** Next.js 15, React 19, TypeScript, Supabase (PostgreSQL + pg_cron + pg_net), Google Gemini AI, Vercel Pro
**Domain:** `truyencity.com` (prod), `truyencity2.vercel.app` (Vercel)
**Repo:** `https://github.com/ungden/truyencity2.git` (branch: `main`)
**User:** Vietnamese, direct/blunt style. Do everything at once, not incrementally.

---

## Confirmed Decisions (Do Not Re-Ask)

- Framework is **Next.js 15 App Router** (NOT Vite). No migration needed.
- Cover generation stays **2K**; optimize at delivery layer via Next Image.
- Use provided TruyenCity brand artwork for favicon/logo/PWA icons.
- Dialogue in generated chapters must follow Vietnamese novel format with em dash `—`.
- Dark theme is the default/primary theme.
- WebNovel/Wuxiaworld modern style for UI.
- 5-star rating system (not thumbs up/down).

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

## Vietnamese Language Rules (QUAN TRONG)

**Tat ca text tieng Viet hien thi cho nguoi dung PHAI co dau day du.**

- "Kiem tra" chu KHONG phai "Kiem tra"
- "Dang tai..." chu KHONG phai "Dang tai..."
- "Chua co du lieu" chu KHONG phai "Chua co du lieu"
- "Thu lai" chu KHONG phai "Thu lai"

**Ap dung cho:** UI labels, button text, titles, descriptions, placeholders, error messages, toast messages, admin panel text, page headers, empty states, loading states.

**KHONG ap dung cho:** code comments, variable names, console.log, CSS class names, URL slugs (slugs dung khong dau la dung).

---

## Two-Phase Production System

### Phase 1: Initial Seed (one-time, COMPLETED)
- 10 AI authors x 20 novels = 200 novels seeded
- Each novel has `total_planned_chapters` = random 1000-2000
- pg_cron writes ~20 chapters/novel/day automatically
- pg_cron generates covers (20 per tick, 4 parallel)

### Phase 2: Daily Rotation (ongoing, automated)
- `daily-rotate` cron activates **20 new novels/day** (`DAILY_EXPANSION = 20`)
- Each author maintains ~5 active novels (`TARGET_ACTIVE_PER_AUTHOR = 5`)
- When a novel finishes -> auto-rotate: activate paused novel from same author
- Cycle: ~20-50 novels finish/day, 20 new start -> steady state ~200-400 active

---

## Cron System (4 jobs via pg_cron + Vercel)

| Cron | Interval | File | What it does |
|------|----------|------|-------------|
| `write-chapters` | Every 5 min | `src/app/api/cron/write-chapters/route.ts` | 30 resume + 5 init in parallel |
| `generate-covers` | Every 10 min | `src/app/api/cron/generate-covers/route.ts` | 20 covers, 4 parallel |
| `daily-rotate` | Once/day 0h UTC | `src/app/api/cron/daily-rotate/route.ts` | Backfill + expand 20/day |
| `health-check` | Once/day 6h UTC | `src/app/api/cron/health-check/route.ts` | 8 system checks, save to DB |

**Auth:** All crons use `Authorization: Bearer ${CRON_SECRET}`
**Config:** `vercel.json` + `supabase/migrations/0025_setup_pg_cron.sql`

---

## Story Writing Pipeline

```
SEED -> PLAN -> WRITE -> QC -> COMPLETE -> ROTATE

1. ContentSeeder generates novel ideas via Gemini (batch 20)
2. StoryRunner.run() -> planStory() -> planSingleArc() -> writeArc()
3. Each chapter: Architect (outline) -> Writer (prose) -> Critic (QC) -> Summary
4. 7 quality systems: QC Gating, ConsistencyChecker, PowerTracker, BeatLedger, etc.
5. Soft ending: finish at arc boundary, grace period +20 chapters
6. Auto-rotate: completed -> activate next paused novel
```

### Soft Ending Logic
`total_planned_chapters` is a **SOFT TARGET**, not a hard cutoff:
- **Phase 1** (ch 1 -> target-20): Normal writing
- **Phase 2** (target-20 -> target): "Approaching finale" — wrap up, no new conflicts
- **Phase 3** (target -> target+20): Grace period — keep writing until arc boundary (every 20ch)
- **Phase 4** (target+20): Hard stop safety net

The system detects final arc via `theme: 'finale'` and injects ending context.

### Title Diversity System (commit `c321936`)
- Chapter titles use templates, anti-patterns, engagement checklist
- Files: `templates.ts`, `chapter.ts`, `title-checker.ts`, `quality.ts`, `style-bible.ts`, `runner.ts`

---

## Rate Limits (Gemini Tier 3)

| Model | Limit | Our setting | File |
|-------|-------|-------------|------|
| Gemini 3 Flash (text) | 20,000 RPM | **2,000 RPM** (10%) | `ai-provider.ts` |
| Gemini 3 Pro Image | 2,000 RPM | ~60 RPM (4 parallel) | `generate-covers/route.ts` |

AI calls per chapter: ~4 (Architect + Writer + Critic + Summary)
Throughput: 30 projects x 288 ticks/day = **8,640 chapter slots/day**

---

## Database

### Key Tables
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

### RPC Functions (migration `0030`)
All created and **applied to production Supabase**:
- `get_novel_stats(novel_id)` — single novel stats aggregation
- `get_novels_with_stats(novel_ids[])` — batch stats (avoids N+1)
- `get_top_novels_by_views(days, limit)` — Hot ranking tab
- `get_top_novels_by_rating(min_ratings, limit)` — Rating ranking tab
- `get_top_novels_by_bookmarks(limit)` — Bookmarks ranking tab

### Database State
- **200 novels** in `novels` table (cover_prompt populated)
- **200 ai_story_projects** (196 active, 4 completed)
- **10 ai_authors** with Vietnamese pen names
- **Chapters** growing via pg_cron (~8K+ slots/day)
- **Covers** growing via pg_cron
- **pg_cron:** 4 jobs active

---

## Key Files

### Cron Endpoints
- `src/app/api/cron/write-chapters/route.ts` — RESUME_BATCH=30, INIT_BATCH=5
- `src/app/api/cron/generate-covers/route.ts` — BATCH=20, PARALLEL=4
- `src/app/api/cron/daily-rotate/route.ts` — EXPANSION=20, TARGET_ACTIVE=5
- `src/app/api/cron/health-check/route.ts` — 8 system checks

### Story Writing Engine (`src/services/story-writing-factory/`)
- `runner.ts` — Orchestrator (plan -> write -> QC), finale detection, dummy arcs
- `chapter.ts` — 3-agent pipeline (Architect/Writer/Critic), cliffhanger/finale toggle
- `planner.ts` — Story outline + arc planning, `ARC_FINALE_PROMPT` for last arc
- `memory.ts` — 4-level hierarchical memory (recent -> arc -> volume -> essence)
- `types.ts` — All types including `ArcTheme` with `'finale'`
- `content-seeder.ts` — Bulk novel seeding, clean description (no metadata)
- `power-tracker.ts` — 9-realm cultivation tracking + breakthrough validation
- `beat-ledger.ts` — 50+ beat types with cooldowns, anti-repetition
- `consistency.ts` — Dead character detection, power/trait contradictions
- `qc-gating.ts` — Chapter scoring, auto-rewrite if < 65/100
- `templates.ts` — Title diversity templates
- `title-checker.ts` — Anti-repetition for chapter titles
- `quality.ts` — Engagement quality checklist
- `style-bible.ts` — Style context + few-shot exemplars, em dash dialogue

### Frontend — Pages
- `src/app/page.tsx` — Homepage: ContinueReading, genre sections ("Tien Hiep Moi", "Do Thi Hot"), latest updates carousel
- `src/app/truyen/[slug]/page.tsx` — Novel detail (WebNovel style): 200px cover, 4-stat grid, StarDisplay, interactive rating, related novels, author works, "Latest chapter" button, parallel data fetching
- `src/app/truyen/[slug]/read/[chapter]/page.tsx` — Reading page (dark-friendly, collapsible sidebar)
- `src/app/ranking/page.tsx` — Rankings: 5 tabs (Hot/Rating/Updated/Chapters/Bookmarks), Top 50, uses RPC functions with client-side fallback
- `src/app/browse/page.tsx` — Browse: genre/status/chapter-range filters, grid/list view, sort (updated/chapters/title), load more pagination
- `src/app/novel/[id]/page.tsx` — Legacy redirect/compat route

### Frontend — Components
- `src/components/star-rating.tsx` — `StarDisplay` (read-only, fractional) + `StarRating` (interactive, calls API)
- `src/components/related-novels.tsx` — Same-genre novels with overlap scoring
- `src/components/author-works.tsx` — Same-author novels
- `src/components/continue-reading.tsx` — "Tiep tuc doc" from `reading_progress`
- `src/components/latest-updates-carousel.tsx` — Prev/next pagination with page counter
- `src/components/search-modal.tsx` — localStorage recent searches, relevance/chapter/updated sort, genre filter
- `src/components/novel-card.tsx` — Multi-variant novel card (default/horizontal)
- `src/components/chapter-list.tsx` — Paginated chapter list
- `src/components/novel-actions.tsx` — Read/Bookmark/Share buttons
- `src/components/comments.tsx` — Comment system
- `src/components/reading/desktop-reading-sidebar.tsx` — Expanded/collapsed/hidden states, slug URLs
- `src/components/theme-toggle.tsx` — Overflow fix: inactive=icon-only, active=icon+label

### Frontend — API Routes
- `src/app/api/ratings/route.ts` — GET (avg + user score) / POST (upsert rating)

### Frontend — Rating
- `src/app/truyen/[slug]/rating-section.tsx` — Client component for interactive rating on detail page

### Other Services
- `src/services/ai-provider.ts` — Gemini-only, 2000 RPM rate limiter
- `src/services/plot-arc-manager.ts` — DB-backed arcs, tension curves, finale objectives
- `src/services/factory/gemini-image.ts` — Cover generation with Truyencity.com branding

### Types & Utils
- `src/lib/types.ts` — Novel, Chapter, Author types
- `src/lib/types/genre-config.ts` — GENRE_CONFIG with icons/names
- `src/lib/utils.ts` — `cleanNovelDescription()` strips metadata from descriptions
- `src/lib/utils/genre.ts` — `getGenreLabel()` helper

### Layout
- `src/components/layout.tsx` — AppContainer, TwoColumnLayout, ContentCard
- `src/components/header.tsx` — Header with search trigger
- `src/components/genre-filter.tsx` — Mobile genre/status filter sheet

### Config
- `vercel.json` — 4 cron entries
- `.env.local` — 5 env vars (gitignored)
- `supabase/migrations/0025_setup_pg_cron.sql` — pg_cron setup
- `supabase/migrations/0030_create_ratings_table_and_novel_stats.sql` — Ratings + RPC functions (APPLIED to prod)

---

## Environment Variables (5 only)

```
NEXT_PUBLIC_SUPABASE_URL=https://jxhpejyowuihvjpqwarm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
CRON_SECRET=...
```

Supabase CLI linked to project `jxhpejyowuihvjpqwarm` (truyencity).

---

## Description Cleanup

`novels.description` from seeder contains intro + synopsis ONLY (fixed).
Old seeded novels may have metadata blocks but `cleanNovelDescription()` in `src/lib/utils.ts` strips them on render.

**Rule:** Never show raw `novel.description` without `cleanNovelDescription()`.

---

## Cover Generation Rules

- Model: `gemini-3-pro-image-preview`
- Aspect: 3:4, resolution: 2K
- **MUST include:** title text + "Truyencity.com" branding at bottom
- Cron injects branding if saved `cover_prompt` is missing it
- Upload to Supabase Storage `covers` bucket

---

## Image Delivery + Branding Rules

### Cover Performance Rules
- All user-facing cover rendering must use `next/image` (no raw `<img>` and no CSS `background-image` for covers).
- Primary components already migrated: `novel-card.tsx`, `ranking/page.tsx`, `admin/factory/blueprints/page.tsx`
- `next.config.ts` image optimization: `formats: ["image/avif", "image/webp"]`, `minimumCacheTTL: 60 * 60 * 24 * 30`
- Keep generation at 2K; optimize via responsive `sizes`, controlled `quality`, and selective `priority`.

### Brand Icon/Favicon Source of Truth
- Base brand image: `public/icons/brand-logo.png`
- Favicon: `src/app/favicon.ico`
- App icons: `src/app/icon.png`, `src/app/apple-icon.png`
- PWA icons: `public/icons/icon-72x72.png` ... `public/icons/icon-512x512.png`
- Metadata icons configured in `src/app/layout.tsx`
- Header/sidebar logo uses branded icon image (not default Lucide book icon).

---

## Git Conventions

- Push to `main` -> auto-deploy on Vercel
- Commit style: `type: description` (fix, feat, perf, refactor)
- Never commit `.env.local` or secrets
- Never force push to main

### Recent Commits (latest first)
- `e301ead` — fix: add Vietnamese diacritics to all UI strings across 11 files
- `ca0bb53` — feat: massive UI overhaul — ratings, detail page, ranking, genre sections, continue reading, search
- `00cf725` — fix: cron stuck projects when current_chapter >= total_planned_chapters
- `c321936` — feat: title diversity system + engagement checklist for AI chapter writing
