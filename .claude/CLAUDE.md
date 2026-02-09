# TruyenCity2 - AI Webnovel Factory

## Project Overview

Industrial-scale Vietnamese webnovel platform. AI generates 200+ novels with 1000-2000 chapters each, fully automated.

**Stack:** Next.js 15, React 19, TypeScript, Supabase (PostgreSQL + pg_cron + pg_net), Google Gemini AI, Vercel Pro
**Domain:** `truyencity2.vercel.app`
**Repo:** `https://github.com/ungden/truyencity2.git` (branch: `main`)
**User:** Vietnamese, direct/blunt style

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

## Two-Phase Production System

### Phase 1: Initial Seed (one-time, COMPLETED)
- 10 AI authors × 20 novels = 200 novels seeded
- Each novel has `total_planned_chapters` = random 1000-2000
- pg_cron writes ~20 chapters/novel/day automatically
- pg_cron generates covers (20 per tick, 4 parallel)

### Phase 2: Daily Rotation (ongoing, automated)
- `daily-rotate` cron activates **20 new novels/day** (`DAILY_EXPANSION = 20`)
- Each author maintains ~5 active novels (`TARGET_ACTIVE_PER_AUTHOR = 5`)
- When a novel finishes → auto-rotate: activate paused novel from same author
- Cycle: ~20-50 novels finish/day, 20 new start → steady state ~200-400 active

---

## Cron System (3 jobs via pg_cron + Vercel)

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
SEED → PLAN → WRITE → QC → COMPLETE → ROTATE

1. ContentSeeder generates novel ideas via Gemini (batch 20)
2. StoryRunner.run() → planStory() → planSingleArc() → writeArc()
3. Each chapter: Architect (outline) → Writer (prose) → Critic (QC) → Summary
4. 7 quality systems: QC Gating, ConsistencyChecker, PowerTracker, BeatLedger, etc.
5. Soft ending: finish at arc boundary, grace period +20 chapters
6. Auto-rotate: completed → activate next paused novel
```

### Soft Ending Logic (IMPORTANT)
`total_planned_chapters` is a **SOFT TARGET**, not a hard cutoff:
- **Phase 1** (ch 1 → target-20): Normal writing
- **Phase 2** (target-20 → target): "Approaching finale" — wrap up, no new conflicts
- **Phase 3** (target → target+20): Grace period — keep writing until arc boundary (every 20ch)
- **Phase 4** (target+20): Hard stop safety net

The system detects final arc via `theme: 'finale'` and injects ending context:
- Planner uses `ARC_FINALE_PROMPT` (resolve all threads, epilogue, no cliffhanger)
- Runner injects "GIAI ĐOẠN KẾT THÚC" context
- Chapter writer disables cliffhanger instructions
- PlotArcManager adds graduated urgency objectives

---

## Rate Limits (Gemini Tier 3)

| Model | Limit | Our setting | File |
|-------|-------|-------------|------|
| Gemini 3 Flash (text) | 20,000 RPM | **2,000 RPM** (10%) | `ai-provider.ts` |
| Gemini 3 Pro Image | 2,000 RPM | ~60 RPM (4 parallel) | `generate-covers/route.ts` |

AI calls per chapter: ~4 (Architect + Writer + Critic + Summary)
Throughput: 30 projects × 288 ticks/day = **8,640 chapter slots/day**

---

## Key Files

### Cron Endpoints
- `src/app/api/cron/write-chapters/route.ts` — RESUME_BATCH=30, INIT_BATCH=5
- `src/app/api/cron/generate-covers/route.ts` — BATCH=20, PARALLEL=4
- `src/app/api/cron/daily-rotate/route.ts` — EXPANSION=20, TARGET_ACTIVE=5

### Story Writing Engine (`src/services/story-writing-factory/`)
- `runner.ts` — Orchestrator (plan → write → QC), finale detection, dummy arcs
- `chapter.ts` — 3-agent pipeline (Architect/Writer/Critic), cliffhanger/finale toggle
- `planner.ts` — Story outline + arc planning, `ARC_FINALE_PROMPT` for last arc
- `memory.ts` — 4-level hierarchical memory (recent → arc → volume → essence)
- `types.ts` — All types including `ArcTheme` with `'finale'`
- `content-seeder.ts` — Bulk novel seeding, clean description (no metadata)
- `power-tracker.ts` — 9-realm cultivation tracking + breakthrough validation
- `beat-ledger.ts` — 50+ beat types with cooldowns, anti-repetition
- `consistency.ts` — Dead character detection, power/trait contradictions
- `qc-gating.ts` — Chapter scoring, auto-rewrite if < 65/100

### Other Services
- `src/services/ai-provider.ts` — Gemini-only, 2000 RPM rate limiter
- `src/services/plot-arc-manager.ts` — DB-backed arcs, tension curves, finale objectives
- `src/services/factory/gemini-image.ts` — Cover generation with Truyencity.com branding

### Frontend
- `src/app/novel/[id]/page.tsx` — Novel detail (uses `cleanNovelDescription()`)
- `src/components/novel-card.tsx` — Card component (uses `cleanNovelDescription()`)
- `src/lib/utils.ts` — `cleanNovelDescription()` strips metadata from descriptions

### Config
- `vercel.json` — 4 cron entries (write-chapters, generate-covers, daily-rotate, health-check)
- `.env.local` — 5 env vars (gitignored)
- `supabase/migrations/0025_setup_pg_cron.sql` — pg_cron setup

---

## Database State

- **200 novels** in `novels` table (cover_prompt populated)
- **200 ai_story_projects** (196 active, 4 completed)
- **10 ai_authors** with Vietnamese pen names
- **Chapters** growing via pg_cron (~8K+ slots/day)
- **Covers** growing via pg_cron (19+ done, 181 remaining)
- **pg_cron:** 3 jobs active

### Key Tables
```
novels (id, title, author, ai_author_id, description, cover_url, cover_prompt, genres, status)
chapters (id, novel_id, chapter_number, title, content)
ai_story_projects (id, novel_id, genre, main_character, world_description, 
                   total_planned_chapters, current_chapter, status: active|paused|completed)
ai_authors (id, name, bio, writing_style_description, specialized_genres, status)
plot_arcs (id, project_id, arc_number, tension_curve, theme, climax_chapter)
```

---

## Environment Variables (5 only)

```
NEXT_PUBLIC_SUPABASE_URL=https://jxhpejyowuihvjpqwarm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
CRON_SECRET=...
```

---

## Description Cleanup

`novels.description` from seeder contains intro + synopsis ONLY (fixed).
Old seeded novels may have metadata blocks (NHÂN VẬT CHÍNH, THẾ GIỚI, MODERN SETTING...) but `cleanNovelDescription()` in `src/lib/utils.ts` strips them on render.

**Rule:** Never show raw `novel.description` without `cleanNovelDescription()`.

---

## Cover Generation Rules

- Model: `gemini-3-pro-image-preview`
- Aspect: 3:4, resolution: 2K
- **MUST include:** title text + "Truyencity.com" branding at bottom
- Cron injects branding if saved `cover_prompt` is missing it
- Upload to Supabase Storage `covers` bucket

---

## Vietnamese Language Rules (QUAN TRỌNG)

**Tất cả text tiếng Việt hiển thị cho người dùng PHẢI có dấu đầy đủ.**

- "Kiểm tra" chứ KHÔNG phải "Kiem tra"
- "Đang tải..." chứ KHÔNG phải "Dang tai..."
- "Chưa có dữ liệu" chứ KHÔNG phải "Chua co du lieu"
- "Thử lại" chứ KHÔNG phải "Thu lai"

**Áp dụng cho:** UI labels, button text, titles, descriptions, placeholders, error messages, toast messages, admin panel text, page headers, empty states, loading states.

**KHÔNG áp dụng cho:** code comments, variable names, console.log, CSS class names, URL slugs (slugs dùng không dấu là đúng).

---

## Git Conventions

- Push to `main` → auto-deploy on Vercel
- Commit style: `type: description` (fix, feat, perf, refactor)
- Never commit `.env.local` or secrets
- Never force push to main
