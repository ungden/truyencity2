# TruyenCity2 - Vietnamese Webnovel Platform

## Project Overview

Vietnamese webnovel platform with AI-powered content generation. Features:
- AI authors generate novels automatically
- Gemini for novel ideas + cover art (with Vietnamese text)
- OpenRouter for chapter writing
- Full content pipeline: authors → novels → projects → chapters → covers

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, Tailwind CSS, Vercel

**User Communication:** Vietnamese preferred, direct/blunt, zero tolerance for fallback data

---

## Critical Rules

1. **NO FALLBACKS** - If Gemini/AI fails, throw error. Never substitute with templates.
2. **Vietnamese diacritics** - All titles, names, descriptions must have proper diacritics (á, ă, â, é, ê, í, ó, ô, ơ, ú, ư, ý)
3. **Service role key** - Use `SUPABASE_SERVICE_ROLE_KEY` for all seeder/admin operations (bypasses RLS)
4. **Genre consistency** - Always derive from `GENRE_CONFIG`, never hardcode genre lists

---

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── seed/generate-content/     # Content seeder API
│   │   ├── ai-image/jobs/             # Cover generation jobs
│   │   ├── factory/                   # Story writing factory APIs
│   │   ├── story-runner/              # Chapter generation
│   │   └── cron/                      # Cron endpoints
│   ├── admin/                         # Admin dashboard pages
│   ├── truyen/[slug]/                 # Novel detail pages
│   └── (auth)/                        # Auth pages
├── components/
│   ├── admin/                         # Admin components
│   └── ui/                            # shadcn/ui components
├── services/
│   └── story-writing-factory/         # Core AI writing engine
│       ├── content-seeder.ts          # Novel/author seeding
│       ├── novel-enricher.ts          # Enrich existing novels
│       ├── runner.ts                  # Chapter writing orchestrator
│       ├── chapter.ts                 # Single chapter generator
│       ├── memory.ts                  # Story context/memory
│       ├── planner.ts                 # Plot planning
│       └── ...                        # Many more modules
├── lib/
│   ├── types/
│   │   └── genre-config.ts            # GENRE_CONFIG (source of truth)
│   ├── supabase/                      # Supabase clients
│   └── config.ts                      # App configuration
└── integrations/supabase/             # Generated Supabase types

supabase/
├── functions/                         # Edge functions
│   ├── gemini-cover-generate/         # Cover art generation (Gemini Image)
│   ├── openrouter-chat/               # LLM chat completion
│   ├── ai-writer-scheduler/           # Autopilot scheduler
│   ├── factory-*/                     # Factory cron jobs
│   └── notify-new-chapter/            # Notification system
└── migrations/                        # Database migrations (0001-0027)
```

---

## Genre System

**Source of truth:** `src/lib/types/genre-config.ts`

| Genre ID | Name | Required Field | Cover Style |
|----------|------|----------------|-------------|
| `tien-hiep` | Tiên Hiệp | `cultivation_system` | ethereal clouds, celestial |
| `huyen-huyen` | Huyền Huyễn | `magic_system` | mystical, arcane symbols |
| `do-thi` | Đô Thị | `modern_setting` | modern cityscape |
| `vong-du` | Võng Du | `game_system` | digital, game UI |
| `khoa-huyen` | Khoa Huyễn | `tech_level` | futuristic, sci-fi |
| `lich-su` | Lịch Sử | `historical_period` | historical, period drama |
| `dong-nhan` | Đồng Nhân | `original_work` | fanfiction style |

**Never hardcode genres.** Always import from `GENRE_CONFIG`.

---

## Content Seeder Pipeline

**API:** `POST /api/seed/generate-content`

| Step | Action | Description |
|------|--------|-------------|
| `clear` | Delete all AI data | FK-safe deletion: jobs → projects → novels → authors → covers |
| `1` | Seed authors | 10 authors with Vietnamese ordinal names (Nhất, Nhị, Tam...) |
| `2` | Seed novels | 200 novels via Gemini (20 per batch, 60K tokens) |
| `3` | Activate | Mark 5 novels per author as active |
| `covers` | Generate covers | Enqueue cover jobs with 3s delay between |

**Key settings in `content-seeder.ts`:**
- `batchSize: 20` novels per Gemini call
- `maxTokens: 60000`
- `temperature: 0.8`
- Title dedup before insert (unique constraint)
- `cover_prompt` saved to `novels.cover_prompt` column

---

## Cover Generation Pipeline

**Table:** `ai_image_jobs`
**Edge function:** `supabase/functions/gemini-cover-generate/`
**Model:** `gemini-2.0-flash-preview-image-generation` (supports Vietnamese text)

Flow:
1. `enqueueCoversOnly()` creates jobs in `ai_image_jobs`
2. Edge function polls jobs, calls Gemini Image API
3. Image uploaded to Supabase Storage `covers` bucket
4. `novels.cover_url` updated with public URL

**Cover prompt must include:** `"Title text must be exactly: [TITLE]"`

---

## Database Schema (Key Tables)

```sql
-- Core content
novels (id, title, slug, author_id, genre, description, cover_url, cover_prompt, status, ...)
chapters (id, novel_id, chapter_number, title, content, word_count, ...)
ai_authors (id, name, pen_name, bio, avatar_url, ...)

-- AI writing system
ai_story_projects (id, novel_id, status, world_description, main_character, ...)
ai_writing_jobs (id, project_id, status, chapter_number, ...)
story_graph_nodes (id, project_id, chapter_number, plot_data, ...)

-- Cover generation
ai_image_jobs (id, novel_id, prompt, status, result_url, error, ...)
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # Required for seeder

# AI APIs
GEMINI_API_KEY=...                 # Novel generation + covers
OPENROUTER_API_KEY=...             # Chapter writing

# Cron
CRON_SECRET=...                    # Auth for cron endpoints
```

---

## Common Commands

```bash
# Development
pnpm dev                           # Start dev server
pnpm build                         # Production build
pnpm typecheck                     # TypeScript check
pnpm test                          # Run Jest tests

# Database
npx supabase db push               # Push migrations
npx supabase db reset              # Reset + reseed

# Edge functions
npx supabase functions deploy gemini-cover-generate
npx supabase functions logs gemini-cover-generate

# Git
git push                           # Deploy to Vercel (auto)
```

---

## API Quick Reference

### Seed Content
```bash
# Clear all AI data
curl -X POST http://localhost:3000/api/seed/generate-content \
  -H "Content-Type: application/json" \
  -d '{"step": "clear"}'

# Generate 200 novels
curl -X POST http://localhost:3000/api/seed/generate-content \
  -H "Content-Type: application/json" \
  -d '{"step": "2", "authorCount": 10, "novelsPerAuthor": 20}'

# Generate covers (batch of 20)
curl -X POST http://localhost:3000/api/seed/generate-content \
  -H "Content-Type: application/json" \
  -d '{"step": "covers", "coverJobLimit": 20}'
```

---

## Recent Changes (Session History)

### Feb 2026 - Content Seeder Optimization

**Problem:** Old seeder had batchSize=50 + maxTokens=8192 → 80-85% novels got fallback templates.

**Fixed:**
- `batchSize`: 50 → 20
- `maxTokens`: 8192 → 60000
- `temperature`: 1.0 → 0.8
- Removed all fallbacks — Gemini failure = error
- Author names: UUID → Vietnamese ordinals
- Rich Gemini prompt: description, synopsis, world, character, coverPrompt
- Title dedup before DB insert
- `cover_prompt` saved to DB

**Renamed:** `ideogram-generate` → `gemini-cover-generate`

**Migrations added:**
- `0026_create_ai_image_jobs.sql`
- `0027_add_cover_prompt_to_novels.sql`

**Test results:** 200/200 novels, 0 errors, avg 493 words description

---

## Debugging Tips

### Check novel quality
```sql
SELECT 
  COUNT(*) as total,
  AVG(LENGTH(description) - LENGTH(REPLACE(description, ' ', '')) + 1) as avg_words
FROM novels 
WHERE ai_generated = true;
```

### Check cover jobs
```sql
SELECT status, COUNT(*) 
FROM ai_image_jobs 
GROUP BY status;
```

### Edge function logs
```bash
npx supabase functions logs gemini-cover-generate --tail
```

---

## Known Issues / TODOs

1. **Migration 0025 (pg_cron)** - Requires `pg_net` extension enabled in Supabase Dashboard
2. **Jest hangs after tests** - Pre-existing async cleanup issue, tests still pass
3. **react-day-picker** - Peer dependency warning (expects React 18, we use 19)

---

## File Locations for Common Tasks

| Task | File |
|------|------|
| Add new genre | `src/lib/types/genre-config.ts` |
| Modify seeder logic | `src/services/story-writing-factory/content-seeder.ts` |
| Change cover prompt | `content-seeder.ts` → `buildCoverPrompt()` |
| Edit chapter generation | `src/services/story-writing-factory/chapter.ts` |
| Add API endpoint | `src/app/api/[name]/route.ts` |
| Database migration | `supabase/migrations/0028_xxx.sql` |
| Edge function | `supabase/functions/[name]/index.ts` |
