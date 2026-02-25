# TruyenCity2 — Supplementary Context

> This file supplements the root `CLAUDE.md` which covers the **Story Engine v2 architecture, pipeline, Phase 1-8 history, and known issues**.
> Read root `CLAUDE.md` FIRST for the core engine. This file covers everything else: branding, web frontend, mobile app, database, cron, iOS submission, and operational notes.

---

## Confirmed Decisions (Do Not Re-Ask)

- Framework is **Next.js 15 App Router** (NOT Vite). No migration needed.
- Cover generation stays **2K**; optimize at delivery layer via Next Image.
- Dialogue in generated chapters must follow Vietnamese novel format with em dash `—`.
- Dark theme is the default/primary theme.
- WebNovel/Wuxiaworld modern style for UI.
- 5-star rating system (not thumbs up/down).
- Brand name is **TruyenCity** (one word, no diacritics, capital T and C). Not "Truyen City" or "Truyện City".
- Brand color: `#7c3aed` (purple).
- **NO AI mentions** in any public/reader-facing text. Admin tools keep AI references internally only.

---

## Vietnamese Language Rules (QUAN TRONG)

**Tat ca text tieng Viet hien thi cho nguoi dung PHAI co dau day du.**

Vi du dung:
- "Kiem tra" chu KHONG phai "Kiem tra" (khong dau)
- "Tien Hiep" chu KHONG phai "Tien Hiep"

**Ap dung cho:** UI labels, button text, titles, descriptions, placeholders, error messages, toast messages, admin panel text, page headers, empty states, loading states, genre labels.

**KHONG ap dung cho:** variable names, CSS class names, URL slugs (slugs khong dau la dung), brand name "TruyenCity".

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

## Supreme Goals — Long-Form Novel Quality (MANDATORY)

1. **Coherence tu chuong 1 den chuong cuoi** — zero plot holes, zero logic breaks.
2. **Character consistency tuyet doi** — nhan vat da chet KHONG duoc xuat hien lai; suc manh/canh gioi KHONG duoc tu thoai lui vo ly.
3. **Directional plot progression** — khong lan man, co escalating conflict, co climax, co payoff.
4. **Natural ending trong khoang 1000-2000 chuong** — de AI tu quyet dinh diem ket thuc phu hop.
5. **Uniform quality xuyen suot** — chuong 800 phai giu chat luong tuong duong chuong 8.

### Technical Principles

- **Cost is not a concern**: uu tien chat luong toi da. Gemini tier 3 unlimited.
- Model context window: **1,000,000 input tokens / 65,000 output tokens**.
- He thong phai ho tro chay batch **5 novel song song qua dem**.

---

## Web App — Key Files

### Frontend — Pages
- `src/app/page.tsx` — Homepage: ContinueReading, genre sections, latest updates carousel
- `src/app/truyen/[slug]/page.tsx` — Novel detail (WebNovel style): cover, stats, StarDisplay, interactive rating, related novels
- `src/app/truyen/[slug]/read/[chapter]/page.tsx` — Reading page (dark-friendly, collapsible sidebar)
- `src/app/ranking/page.tsx` — Rankings: 5 tabs (Hot/Rating/Updated/Chapters/Bookmarks), Top 50
- `src/app/browse/page.tsx` — Browse: genre/status/chapter-range filters, grid/list view, sort, pagination
- `src/app/login/LoginClient.tsx` — Auth UI with Supabase, Google OAuth, Vietnamese localization

### Frontend — Components
- `src/components/star-rating.tsx` — `StarDisplay` (read-only) + `StarRating` (interactive)
- `src/components/related-novels.tsx` — Same-genre novels with overlap scoring
- `src/components/author-works.tsx` — Same-author novels
- `src/components/continue-reading.tsx` — "Tiep tuc doc" from `reading_progress`
- `src/components/latest-updates-carousel.tsx` — Prev/next pagination
- `src/components/search-modal.tsx` — localStorage recent searches, relevance/chapter/updated sort
- `src/components/novel-card.tsx` — Multi-variant novel card
- `src/components/chapter-list.tsx` — Paginated chapter list
- `src/components/header.tsx` — Header with search trigger
- `src/components/layout/desktop-sidebar.tsx` — Sidebar with TruyenCity branding
- `src/components/onboarding/OnboardingWizard.tsx` — Reader-focused onboarding (NO AI mentions)
- `src/components/pwa-provider.tsx` — PWA context, service worker, push notifications

### Types & Utils
- `src/lib/types.ts` — Novel, Chapter, Author types
- `src/lib/types/genre-config.ts` — GENRE_CONFIG with icons/names (canonical source)
- `src/lib/utils.ts` — `cleanNovelDescription()` strips metadata
- `src/lib/utils/genre.ts` — `getGenreLabel()` helper

---

## Mobile App (`/mobile/`)

### Architecture & Dependencies
- **Expo SDK 54** with `expo-router` v6
- **NativeTabs** from `expo-router/unstable-native-tabs` (NOT JS Tabs)
- **SF Symbols** via `expo-symbols` for tab icons
- **react-native-css** v3.0.1 + **nativewind** v5.0.0-preview.2 for styling
- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **lightningcss 1.30.1** — MUST stay at this version. 1.31.1 causes deserialization error.
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
│       ├── (discover)/               # Tab 1: "Trang Chu" — branded header
│       ├── (rankings)/               # Tab 2: "Kham Pha"
│       ├── (library)/                # Tab 3: "Tu Sach" — has "Da tai" tab
│       └── (account)/                # Tab 4: "Cai Dat" — gamified profile
├── src/
│   ├── tw/index.tsx                   # CSS wrapper components
│   ├── tw/image.tsx                   # expo-image CSS wrapper
│   ├── global.css                     # Tailwind v4 + nativewind/theme + custom colors
│   ├── components/                    # novel-card, underline-tabs, hero-carousel, section-header
│   ├── hooks/                         # use-user-stats, use-tts, use-offline
│   └── lib/                           # config, gamification, genre, offline-db, storage, supabase, tts, types
├── assets/logo.png                    # TruyenCity brand icon
├── app.config.ts
├── metro.config.js
└── package.json                       # lightningcss pinned at 1.30.1
```

### Mobile Features Built
1. **Full UI** — 4 tab structure, novel cards (7 variants), hero carousel, underline tabs
2. **Reading screen** — Dark theme, 4 themes (Dark/Light/Sepia/Green), 3 fonts, font size 14-32, line spacing presets
3. **TTS (Nghe Truyen)** — expo-speech vi-VN, mini player bar, speed 0.5x-2x, chunk queuing
4. **Offline Download** — SQLite `truyencity-offline.db`, batch download (20 at a time), offline-first fetch
5. **Gamified Profile** — XP system, 13 cultivation levels (Pham Nhan → Tien De), 22 achievements
6. **Branding** — Logo in header, login, account screen, version footer

### Reader Screen Details
- **4 Reading Themes**: Dark (#09090b) / Light (#ffffff) / Sepia (#f4ecd8) / Green (#dce8d2)
- **Settings Bottom Sheet**: animated slide up, swipe down dismiss
- **Brightness**: Dark overlay approach (not expo-brightness — doesn't work in dev client)
- **Auto-scroll**: Configurable speed 0-100 px/s
- **Tap zones**: Left 1/3 = scroll up, Center 1/3 = toggle controls, Right 1/3 = scroll down
- **Keep screen awake**: `expo-keep-awake`
- **Plain text → HTML**: Auto-wraps paragraphs with textIndent: 24, marginBottom: 20, textAlign: justify

---

## Database

### Key Tables

#### Core
```
novels (id, title, author, ai_author_id, description, cover_url, cover_prompt, genres, status, slug, chapter_count)
chapters (id, novel_id, chapter_number, title, content)
ai_story_projects (id, novel_id, genre, main_character, world_description,
                   total_planned_chapters, current_chapter, status, story_bible,
                   master_outline, story_outline)
ai_authors (id, name, bio, writing_style_description, specialized_genres, status)
plot_arcs (id, project_id, arc_number, tension_curve, theme, climax_chapter)
chapter_reads — Per-chapter read tracking
reading_progress — Per-novel progress
bookmarks — User bookmarks (unique user+novel)
comments — Comments with moderation
ratings — 5-star ratings (unique user+novel, RLS enabled)
```

#### Story Engine Context Tables
```
chapter_summaries (project_id, chapter_number, title, summary, opening_sentence, mc_state, cliffhanger)
story_synopsis (project_id, synopsis_text, mc_current_state, active_allies, active_enemies, open_threads)
arc_plans (project_id, arc_number, start_chapter, end_chapter, arc_theme, plan_text, chapter_briefs, threads_to_advance, threads_to_resolve, new_threads)
character_states (project_id, chapter_number, character_name, status, power_level, power_realm_index, location, notes)
story_memory_chunks (project_id, chapter_number, chunk_type, content, embedding vector(768), metadata)
```

#### Scalability Tables
```
plot_threads (project_id, name, description, priority, status, foreshadowing_hints JSONB, importance)
world_rules_index (project_id, rule_text, category, tags TEXT[], importance, usage_count)
beat_usage (project_id, chapter_number, beat_type, beat_category, intensity, cooldown_until)
volume_summaries (project_id, volume_number, summary, major_milestones, character_development)
```

#### Quality Module Tables
```
foreshadowing_agenda, foreshadowing_hints — Long-range hint planning
character_arcs, character_signature_traits — Character development
pacing_blueprints — Per-arc pacing
voice_fingerprints — Style drift detection
mc_power_states — MC power tracking
world_locations, location_bibles — World expansion
```

### Denormalized `chapter_count` (Migration 0109)
- Trigger `trg_update_novel_chapter_count` auto-increments/decrements on chapter INSERT/DELETE
- Index: `idx_novels_chapter_count ON novels(chapter_count DESC)`
- Mobile queries use `chapter_count` instead of `chapters(count)` subquery

### RPC Functions
- `get_novel_stats(novel_id)` — single novel stats
- `get_novels_with_stats(novel_ids[])` — batch stats (avoids N+1)
- `get_top_novels_by_views(days, limit)` — Hot ranking
- `get_top_novels_by_rating(min_ratings, limit)` — Rating ranking
- `get_top_novels_by_bookmarks(limit)` — Bookmarks ranking
- `match_story_chunks()` — pgvector similarity search

### Important DB Notes
- `ai_story_projects.updated_at` has a DB trigger that auto-sets to `now()`. Cannot be backdated. The cron uses `.lt('updated_at', fourMinutesAgo)` as a distributed lock.
- `ai_story_projects` does NOT have `protagonist_name` column.
- `ensureProjectRecord` uses arbitrary first user from `profiles` table for ownership.

---

## Cron System (pg_cron → pg_net → Vercel)

ALL scheduling via pg_cron. Vercel cron REMOVED. Secret stored in Supabase Vault as 'cron_secret'.

| Job | Interval | Description |
|-----|----------|-------------|
| `write-chapters-cron` | `*/5 * * * *` | Core pipeline — writes chapters |
| `generate-covers-cron` | `*/10 * * * *` | AI cover generation |
| `daily-rotate-cron` | `0 0 * * *` | Activate paused novels (midnight UTC) |
| `daily-spawn-cron` | `55 23 * * *` | Create 20 new novels (23:55 UTC) |
| `health-check-cron` | `2 * * * *` | Hourly health check + webhook alert |
| `ai-editor-scan-cron` | `5 0 * * *` | Daily quality scan |
| `ai-editor-rewrite-cron` | `*/10 * * * *` | Rewrite low-quality chapters |

**Auth:** All crons use `Authorization: Bearer ${CRON_SECRET}`
**Alerting:** Health check sends webhook to `ALERT_WEBHOOK_URL` (Discord/Slack) on critical status.

### Secret Rotation Procedure
1. Generate: `openssl rand -hex 32`
2. Update vault: `SELECT vault.update_secret(id, 'new_secret_here') FROM vault.secrets WHERE name = 'cron_secret';`
3. Update Vercel env: `CRON_SECRET=new_secret_here`
4. Re-run migration 0121
5. Verify: check `cron.job_run_details` for 'succeeded'

---

## Soft Ending Logic

`total_planned_chapters` is a **SOFT TARGET**:
- **Phase 1** (ch 1 → target-20): Normal writing
- **Phase 2** (target-20 → target): Wrap up, no new conflicts
- **Phase 3** (target → target+20): Grace period until arc boundary
- **Phase 4** (target+20): Hard stop safety net

---

## iOS App Store Submission

### EAS Build Pipeline
- **EAS project**: `@titanlabs/truyencity` (projectId: `b08cdab3-d9a8-49f9-9a8d-c0789d4df743`)
- **Bundle ID**: `com.truyencity.app`
- **ASC App ID**: `6759160705`
- **Apple Team**: `Q8A7CBYV5Z` (Tien Duong Le, Individual)
- **Current version**: 1.0.0, buildNumber: `"2"`

### Build Command
```bash
cd /Users/alexle/Documents/truyencity2/mobile
EXPO_ASC_API_KEY_PATH="/Users/alexle/Downloads/AuthKey_K4XKK27BYH.p8" \
EXPO_ASC_KEY_ID="K4XKK27BYH" \
EXPO_ASC_ISSUER_ID="16b1bc8e-5a12-4788-b4d2-4c9ebe0068fb" \
EXPO_APPLE_TEAM_ID="Q8A7CBYV5Z" \
EXPO_APPLE_TEAM_TYPE="INDIVIDUAL" \
npx eas build --platform ios --profile production --non-interactive --auto-submit
```

### ASC Status
- **Build**: v1.0.0 build #1 — VALID, assigned to version
- **Version**: 1.0 — PREPARE_FOR_SUBMISSION
- **Metadata**: description, keywords, subtitle, copyright, categories (Books + Entertainment), privacy URL, support URL, age rating (12+), pricing (FREE)
- **Screenshots**: 4x iPhone 6.7" + 4x iPad Pro 12.9"
- **BLOCKING**: App Privacy must be set in ASC web UI — select "Data Not Collected" → Publish
- **After privacy**: Submit for review

### ASC Resource IDs
- App Info ID: `4ae1c9a9-f118-4e25-ad98-eb0e88d15328`
- Version ID: `a12fa36c-2e3f-4ab4-ad66-af040a7c406b`
- Build ID: `8c739520-d257-4402-84f1-e52bd6c89063`

---

## Image Delivery + Branding

- All covers use `next/image` (no raw `<img>` or CSS `background-image`)
- Cover generation: 2K, 3:4 aspect, title text + "Truyencity.com" branding
- Brand icon source: `public/icons/brand-logo.png`
- Mobile logo: `mobile/assets/logo.png` (copied from web PWA icon)

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

## V1 Legacy Status

V1 (`story-writing-factory/`) has ~38 files but only **7 are still actively imported** by 5 API routes:
- `/api/cron/daily-spawn` → `ContentSeeder`
- `/api/admin/ai-editor` → `aiEditorService`
- `/api/ai-authors/generate` → `AuthorGenerator`
- `/api/seed/generate-content` → `ContentSeeder`
- `/api/seed/enrich-novels` → `NovelEnricher`

The remaining ~31 files are dead. Full V1 removal requires migrating these 5 routes to V2 equivalents.

---

## Description Cleanup

`novels.description` from seeder contains intro + synopsis ONLY.
Old novels may have metadata blocks but `cleanNovelDescription()` in `src/lib/utils.ts` strips them.
**Rule:** Never show raw `novel.description` without `cleanNovelDescription()`.

---

## Git Conventions

- Push to `main` → auto-deploy on Vercel
- Commit style: `type: description` (fix, feat, perf, refactor, docs)
- Never commit `.env.local` or secrets
- Never force push to main

---

**Last Updated**: 2026-02-25
**Complements**: Root `CLAUDE.md` (Story Engine v2 architecture, Phase 1-8 details, known issues)
