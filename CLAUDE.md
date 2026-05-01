# CLAUDE.md - TruyenCity AI Story Writer

> **Story Engine reference hub**: tất cả tài liệu về Story Engine v2 (research, per-genre patterns, version log, common-tasks lookup) ở [`docs/story-engine/README.md`](docs/story-engine/README.md). Bắt đầu từ đó khi cần audit chất lượng, thêm genre, hoặc onboard.

## Project Overview

TruyenCity la nen tang viet truyen tu dong bang AI, ho tro viet truyen dai 1000-2000 chuong voi kha nang "1 Click = 1 Chuong hoan chinh".

**Stack**: Next.js 15, React 19, TypeScript, Supabase (PostgreSQL + pgvector + pg_cron), DeepSeek V4 Flash (text gen) + Google Gemini (embeddings + image), Vercel Pro
**Mobile**: Expo SDK 54, expo-router v6, NativeWind v5, at `/mobile/`
**Repo**: `https://github.com/ungden/truyencity2.git` (branch: `main`)
**Domain**: `truyencity.com` (prod), `truyencity2.vercel.app` (Vercel)

## Architecture

### Story Engine v2 (Production — `USE_STORY_ENGINE_V2=true`)

**Location**: `src/services/story-engine/`

V2 replaced v1 (`story-writing-factory/`). ~19 files, modular pipeline. V1 still exists for some API route dependencies (daily-spawn, ai-editor, ai-authors) but the core writing is all v2.

```
src/services/story-engine/
├── index.ts                    # Public API: writeChapterForProject()
├── types.ts                    # All type definitions
├── config.ts                   # Re-exports active items from templates.ts
├── templates.ts                # Genre configs, rules, prompts (~1578 lines)
├── utils/
│   ├── gemini.ts               # Gemini REST API client (NO penalty params! API key via x-goog-api-key header)
│   ├── supabase.ts             # Singleton Supabase client
│   └── json-repair.ts          # JSON extraction & repair
├── pipeline/
│   ├── context-assembler.ts    # 4-layer context + combined summary+character extraction
│   ├── chapter-writer.ts       # 3-agent: Architect → Writer → Critic
│   └── orchestrator.ts         # Main entry, 12 parallel post-write tasks
└── memory/
    ├── rag-store.ts            # Chunk + embed + vector search
    ├── character-tracker.ts    # Save character states (from combined AI call)
    ├── plot-tracker.ts         # Plot threads + beat ledger + rule indexer
    ├── summary-manager.ts      # Synopsis + bible + arc plan triggers + quality module triggers
    ├── constraint-extractor.ts # Per-project world rules from DB
    ├── style-bible.ts          # Rich style context + vocabulary + pacing
    ├── title-checker.ts        # Title similarity check (70% threshold)
    ├── foreshadowing-planner.ts   # Long-range hint planning (50-500ch apart)
    ├── character-arc-engine.ts    # Character development arcs + signature traits
    ├── pacing-director.ts         # Per-arc pacing blueprints (10 mood types)
    ├── voice-fingerprint.ts       # Style fingerprint + drift detection
    ├── power-system-tracker.ts    # MC power state + anti-plot-armor
    └── world-expansion-tracker.ts # World map + location bibles
```

### API Flow

```
writeOneChapter() [orchestrator.ts]
  ├── loadContext() [context-assembler.ts]
  │   ├── Layer 0: Chapter Bridge (previous summary, cliffhanger, MC state)
  │   ├── Layer 1: Story Bible
  │   ├── Layer 2: Rolling Synopsis (structured fields)
  │   ├── Layer 3: Recent Chapters (3×3000 after ch50, 5×5000 before)
  │   └── Layer 4: Arc Plan (threads injection)
  ├── Inject quality modules (6 parallel, non-fatal, capped 800 chars each)
  │   ├── getForeshadowingContext()
  │   ├── getCharacterArcContext()
  │   ├── getChapterPacingContext()
  │   ├── getVoiceContext()
  │   ├── getPowerContext()
  │   └── getWorldContext()
  ├── writeChapter() [chapter-writer.ts]
  │   ├── runArchitect() — Outline with constraints, emotional arc, golden rules (120K char budget)
  │   ├── runWriter() — Content with lean context (bridge + chars + quality modules only)
  │   └── runCritic() — Review with full content (60K char guard), structured context extraction
  └── Post-write tasks (all non-fatal)
      ├── runSummaryTasks() — Combined summary+character extraction (1 AI call)
      ├── saveCharacterStatesFromCombined() — Save from combined result (no extra AI call)
      ├── chunkAndStoreChapter() — RAG (batch embedding via Promise.all)
      ├── detectAndRecordBeats()
      ├── extractRulesFromChapter()
      ├── checkConsistency() — Every 3 chapters
      ├── updateForeshadowingStatus()
      ├── updateCharacterArcs() — Passes actual genre + protagonistName
      ├── updateVoiceFingerprint() — Every 10 chapters
      ├── updateMCPowerState() — Every 3 chapters
      ├── updateLocationExploration() — Batched UPDATE
      └── prepareUpcomingLocation()
```

## Critical Configuration

### AI Model
- **Primary text model**: `deepseek-v4-flash` (V4 thinking model, OpenAI-compatible at `https://api.deepseek.com/chat/completions`)
  - 1M context, 384K output ceiling, $0.14/$0.28 per 1M tokens (cache miss) — ~12× cheaper than Gemini
  - Auto-routed by `callGemini()` whenever `config.model` starts with `deepseek-` (router in `src/services/story-engine/utils/gemini.ts`)
  - V4 thinking models split output into `reasoning_content` + `content` — adapter falls back to `reasoning_content` when `content` is empty
  - Adapter: `src/services/story-engine/utils/deepseek.ts` (OpenAI-compatible, 5 retries with backoff up to 90s for transient failures)
- **Premium tier**: `deepseek-v4-pro` ($1.74/$3.48 per 1M) — 12× cost; reserved for tasks where quality justifies (currently unused)
- **Backup**: `gemini-3-flash-preview` — kept as a UI option but not selected by default
- **Embeddings**: `gemini-embedding-001`, 768 dims, `outputDimensionality` param (DeepSeek has no embedding API → embeddings stay on Gemini)
- **Image gen**: `gemini-3-pro-image-preview` (covers; DeepSeek doesn't generate images)
- **Rate limit**: DeepSeek doesn't publish hard limits; client-side retries handle 429/503/502 + network fetch errors
- **IMPORTANT**: For Gemini calls, KHONG dung `frequencyPenalty`/`presencePenalty` — thinking models khong support, tra content rong
- **Required env**: `DEEPSEEK_API_KEY` (production) + `GEMINI_API_KEY` (embeddings + image gen)

### Database
- **Supabase pgvector** (premium plan)
- **pg_cron**: Single source of truth cho scheduling
- **Secrets**: Supabase Vault - khong hardcode

### Vercel
- **Pro plan**: `maxDuration = 300s` hard ceiling
- Auto-deploy on `git push` to main

## Important Notes for AI Assistants

### 1. Chapter Writer Logic [chapter-writer.ts]

**3-Agent Pipeline**:
- **Architect**: Outline with min 4 scenes, emotional arc, golden rules. Token budget: 120K chars max, trims context if exceeded.
- **Writer**: Content with lean context (only bridge + character states + quality modules — Architect already consumed full context). Static rules (ANTI_CLICHE, COMEDY, SUBTEXT, SCENE_EXPANSION) are in WRITER_SYSTEM prompt (cached by Gemini).
- **Critic**: Review with full content (60K char head+tail guard). Cross-chapter context extracts bridge + character states + synopsis (not blind slice). Fail-closed on error.

**Retry Logic**: Max 3 attempts. Critic rewrite instructions passed to both Writer AND Architect.

**Repetition Detection**: `detectSevereRepetition()` categorizes words — generic (strict: 5/8 thresholds) vs plot_element (relaxed: 8/12). `buildRepetitionReport()` provides automated report to Critic.

**Scene Type Detection**: `inferSceneType()` uses Vietnamese keyword regex to classify scenes (action/cultivation/revelation/romance/dialogue/tension/comedy).

### 2. Context Assembly [context-assembler.ts]

**4 Layers** (priority order):
1. **Chapter Bridge**: Previous cliffhanger (PHAI giai quyet), MC state, 300 chars cuoi
2. **Story Bible**: World rules, power system
3. **Rolling Synopsis**: + structured fields (mc_state, allies, enemies, open_threads)
4. **Arc Plan**: Chapter brief + threads (advance/resolve/new)

**Combined Summary+Character Call**: `generateSummaryAndCharacters()` — single AI call returns both summary and character states. Orchestrator awaits this first, then saves characters from result (saves ~1 AI call/chapter).

**Adaptive**: After ch50, recent chapters reduced to 3x3000 chars (synopsis covers history). Titles capped at 50 most recent.

### 3. Post-Write Triggers [summary-manager.ts]

- **Synopsis**: Every 5 chapters
- **Arc Plan**: At arc boundaries (every 20 chapters)
- **Story Bible**: Ch.3, then every 150 chapters
- **Quality modules**: Triggered at arc boundaries, OUTSIDE arc plan existence guard (each has its own internal guard)

**Arc-boundary catch-up**: `tryEnsureQualityModules()` runs on first chapter of each arc (ch 21, 41, 61...) to backfill missing modules.

### 4. Security

All admin/internal API routes require auth:
- **Cron routes**: `Authorization: Bearer ${CRON_SECRET}` — shared `verifyCronAuth()` from `src/lib/auth/cron-auth.ts`
- **Admin routes**: `isAuthorizedAdmin()` from `src/lib/auth/admin-auth.ts` — checks Bearer token OR Supabase user with `role='admin'`
- **story-runner**: Admin auth required
- **health-check manual**: Admin auth required (no more `?manual=true` bypass)
- **Input validation**: Zod schemas in `src/lib/security/validation.ts` — 10+ route-specific schemas
- **Error sanitization**: All API routes return generic error messages, no internal details leaked

### 6. Shared Utilities (Phase 9)

- `src/lib/auth/cron-auth.ts` — shared `verifyCronAuth()` (was duplicated in 7 files)
- `src/lib/auth/admin-auth.ts` — shared `isAuthorizedAdmin()` (was duplicated in 5 files)
- `src/lib/supabase/admin.ts` — singleton `getSupabaseAdmin()` (was duplicated in 7 files)
- `src/lib/utils/vietnam-time.ts` — shared `getVietnamDayBounds()` (was duplicated in 2 files)

### 5. Performance Optimizations (Phase 7+)

- Writer gets lean context (~5-10K) instead of full context (~50K) — Architect already distilled it into outline
- Static prompt rules moved to system prompts (Gemini caches them)
- Combined summary+character extraction (1 AI call instead of 2)
- Titles capped at 50, recent chapters adaptive (3x3000 after ch50)
- checkConsistency every 3 chapters instead of every chapter
- Quality module contexts capped at 800 chars each
- N+1 queries batched (character arcs, RAG embeddings, location exploration)
- Duplicate DB queries consolidated in summary-manager

## Common Tasks

### Them Feature Moi vao Chapter Writer

1. **Update types.ts** - Them field vao interface neu can
2. **Update chapter-writer.ts**:
   - Them vao ARCHITECT_SYSTEM hoac WRITER_SYSTEM prompt
   - Them logic trong runArchitect() hoac runWriter()
   - Neu lien quan Critic → update CRITIC_SYSTEM va runCritic()
3. **Update context-assembler.ts** - Neu can load them data tu DB
4. **Run tests** - `npm test`
5. **Type check** - `npm run typecheck`

### Them Memory Module Moi

1. Tao file trong `memory/` (vi du: `new-tracker.ts`)
2. Export functions chinh
3. Import trong `orchestrator.ts` va them vao Promise.all post-write tasks
4. Mark as non-fatal: `.catch(err => console.warn('[orchestrator] TaskName failed:', err))`

### Daily Spawn / Cron Checklist

1. Verify endpoint: `GET /api/cron/daily-spawn?target=1` with `Authorization: Bearer $CRON_SECRET`
2. Validate project has both `master_outline` and `story_outline`
3. For `target=20`, ensure runtime stays below pg_cron timeout
4. If missing outlines: `npx tsx scripts/fix-missing-data.ts`

## Testing

```bash
npm test       # 60 passing
npm run typecheck
npm run dev
```

## Git Workflow

```bash
# Commit message format
feat: description
fix: description
perf: description
refactor: description
docs: description

# Push to production
git push  # Auto deploy to Vercel
```

## Commit History (Phases)

| Commit | Phase | Description |
|--------|-------|-------------|
| `36d2080` | Phase 1 | 6 audit bug fixes |
| `78a1474`, `81a18ac` | Phase 2 | 6 quality modules + bug fixes |
| `f007560` | Phase 3 | Quality audit + 5 dai than level fixes |
| `9bcdf6a` | Phase 4 | Quality stabilization round 2 |
| `6ad0a55` | Phase 5 | Production audit + 4 fixes + backfill |
| `5153317` | Phase 6 | Location bible fix |
| `8060495` | Phase 7 | 12 performance optimizations (~25-30K tokens/chapter saved) |
| `c7a5d99` | Phase 8 | 3 critical + 3 security + 5 bug fixes + dead code cleanup (-8,200 lines) |
| `2833142` | Phase 9 | Comprehensive audit: security + dedup + type safety + hardening (68 issues) |
| `8e24652` | Quality Phases 1-3 | Genre style bible, complete genre conventions, quality module effectiveness |
| `6fe2db2` | Quality Phase 4 | Emotional intelligence: mood enforcement, voice drift, genre engagement |
| `a3d995b` | Quality Phase 5 | Anti-AI polish: genre anti-cliche blacklists, genre title templates |

## Phase 9 Details (2026-02-25) — Comprehensive Audit Fix

### Phase 9A — Critical Security & Error Handling
- **9A-1**: Moved Gemini API key from URL query param to `x-goog-api-key` header (both `callGemini` and `embedBatchInternal`)
- **9A-2**: Added 10+ Zod schemas to `validation.ts`: WriterAction, RatingSubmit, CreateNovel, AIImageJob, AIAuthorGenerate, AIAuthorBatch, ExportNovel, CreditAction, SubscriptionAction
- **9A-3**: Applied Zod validation to 10 routes: claude-writer, ratings, novels, ai-image/jobs, ai-authors/generate, export, billing/credits, billing/subscription, user/api-tokens
- **9A-4**: Added DB error check to orchestrator `current_chapter` update
- **9A-5**: Added DB error checks to context-assembler: saveChapterSummary, generateSynopsis, generateArcPlan, generateStoryBible
- **9A-6**: Deleted `debug-env` route (was exposed in production)
- **9A-7**: Added admin role check to `/api/ai-authors/generate` POST+PUT
- **9A-8**: Added try/catch + error sanitization to ratings GET + 5 other routes

### Phase 9B — Deduplication & maxDuration
- **9B-1**: Shared `verifyCronAuth()` → replaced in 7 cron/seed routes
- **9B-2**: Shared `isAuthorizedAdmin()` → replaced in 5 admin routes
- **9B-3**: Shared singleton `getSupabaseAdmin()` → replaced in 7+ files
- **9B-4**: Shared `getVietnamDayBounds()` → replaced in 2 files
- **9B-5**: Added `maxDuration` to 17 routes (values: 10-300s based on workload)

### Phase 9C — Type Safety & Performance
- **9C-1**: Fixed 11+ `any` types: types.ts storyOutline, context-assembler (6 fixes with new interfaces), chapter-writer vocabulary, master-outline, plot-tracker, chapters/[id]
- **9C-2**: Ratings: DB-level count via `head:true` + `count:'exact'`
- **9C-3**: Story-runner: paginated chapters query (default limit=100, max=500)

### Phase 9D — Cleanup & Hardening
- **9D-1**: Added DB error checks to 7 memory modules (character-tracker, character-arc-engine, foreshadowing-planner, world-expansion-tracker, power-system-tracker, voice-fingerprint, pacing-director)
- **9D-2**: Removed dead code: `formatForPrompt()`, `projectId` field, `optimizeTitle()`, `extractAndSaveCharacterStates()`, unused re-exports
- **9D-3**: Fixed foreshadowing `hint_id` collision — sequential IDs → `crypto.randomUUID()`
- **9D-4**: Added TODO comments to style-bible genre params
- **9D-5**: Standardized error swallowing in orchestrator Tasks 2-6 → descriptive `console.warn`

## Phase 8 Details (2026-02-25)

### Critical Fixes
- **C1**: Removed race-condition rate limiter in gemini.ts — Gemini tier 3 unlimited, retry logic handles 429/503
- **C2**: Added 120K char token budget to Architect prompt — progressive context trimming if too large
- **C3**: Added 60K char head+tail size guard to Critic input — prevents model limit overflow

### Security Fixes
- **S1**: Added admin auth to `/api/admin/health-history`
- **S2**: Added admin auth to `/api/story-runner/[projectId]`
- **S3**: Fixed `?manual=true` auth bypass in health-check — requires authenticated admin user

### Bug Fixes
- **B1**: Fixed hardcoded genre `'tien-hiep'` + empty protagonist in character-arc-engine — now receives actual genre/protagonistName from orchestrator
- **B2**: Fixed regex typo `cườii` → `cười` — comedy scenes were never detected by inferSceneType
- **B3**: Batched N+1 queries in character-arc-engine (.in() update), rag-store (Promise.all), world-expansion-tracker (.in() update)
- **B4**: Consolidated duplicate DB queries in summary-manager — synopsis loaded once with `synopsis_text,open_threads`, project loaded once with `story_bible,story_outline,master_outline`
- **B5**: Fixed Critic cross-chapter context — now extracts bridge + character states + synopsis (structured relevant data) instead of blind `previousContext.slice(0, 5000)`

### Dead Code Removed (~8,200 lines)
- `_legacy/` directory (17 files, ~3,221 lines)
- 17 one-time scripts (backfill, test, seed scripts)
- 2 disabled route stubs (ai-editor-scan, ai-editor-rewrite)
- 2 empty directories (claude-code/, story-writing-tool/)
- `seed-more.js` root stub
- Dead functions: `advanceCharacterPhase`, `loadCharacterStatesText`, `generateStoryVision`, `StoryVision` interface
- Dead imports: `extractAndSaveCharacterStates` from orchestrator, `getGenreBoundaryText` from context-assembler
- Dead re-exports from config.ts: SCENE_EXPANSION_RULES, SUBTEXT_DIALOGUE_RULES, COMEDY_MECHANICS_RULES, getPowerSystemByGenre, getDopaminePatternsByGenre, DopaminePattern type
- Dead type declaration: `mammoth.d.ts`
- Unused npm packages: `mammoth`, `pdf-parse`, `date-fns`

## V1 Legacy Status

V1 (`story-writing-factory/`) reduced from 38 files to **13 files** (Phase 14A+14B).

**Migrated to standalone services**:
- `src/services/content-seeder/` — ContentSeeder (used by daily-spawn, seed/generate-content)
- `src/services/author-generator/` — AuthorGenerator (used by ai-authors/generate)
- `src/services/novel-enricher/` — NovelEnricher (used by seed/enrich-novels)

**Remaining in V1**: 13 files (all are ai-editor.ts dependency chain — chapter.ts, qc-gating.ts, templates.ts, etc.). Full removal requires rewriting ai-editor to use V2 pipeline.

## Phase 10 Details (2026-02-26) — Genre Completion + Ratings Fix

### 10A — 6 Missing Genres Added to Daily Spawn
- **10A-1**: Added 6 genre entries to `GENRE_CONFIG` in `genre-config.ts`: kiem-hiep (7 topics), mat-the (7 topics), linh-di (7 topics), quan-truong (6 topics), di-gioi (7 topics), ngon-tinh (8 topics) — all 13 genres now spawn
- **10A-2**: Added `SOURCE_TOPIC_SEEDS` for 6 genres in `content-seeder.ts`: kiem-hiep (8), mat-the (9), linh-di (9), quan-truong (8), di-gioi (9), ngon-tinh (10) seed descriptions
- Total: 42 new topics with 3-4 topicPromptHints each, 53 new seed descriptions

### 10B — Ratings Aggregate Migrated to DB-Level RPC
- **10B-1**: Replaced client-side JS average in `/api/ratings/route.ts` with `get_novel_stats()` RPC (single DB call returns rating_avg + rating_count)
- **10B-2**: Replaced 3-query parallel fetch in `/app/truyen/[slug]/page.tsx` with single `get_novel_stats()` RPC (also returns view_count, bookmark_count — fewer DB calls)
- **10B-3**: Fixed mobile novel detail column name bug (`r.rating` → uses RPC `get_novel_stats()` instead of broken `.select("rating")` query)

## Monetization System (Phase 11)

### Reader VIP (Freemium Model)
- **Free**: Ads shown, no offline download, 1h audio/day
- **VIP**: 99,000 VND/mo or 999,000 VND/yr (save 2 months) — No ads, offline download, unlimited audio
- DB: `reader_tier_limits` table (incl. `price_vnd_yearly`), `tts_usage`/`download_usage` tracking
- API: `GET/POST /api/billing/reader-vip` (status, cancel, record_tts, record_download — upgrade locked, via RevenueCat only)
- Mobile: `useRevenueCat()` + `useVipStatus()` hooks, paywall screen, `AdBanner`, `useInterstitialAd`
- Web: `AdBanner` + `AdPlacement` components (AdSense), VIP check hides ads

### Writer Tiers (existing)
- Free / Creator / Pro / Enterprise — for AI writing features
- API: `/api/billing/subscription`, `/api/billing/credits`, `/api/billing/tiers`

### Payment Gateway
- **RevenueCat** handles Apple IAP + Google Play Billing (Phase 17)
- Webhook syncs subscription status to Supabase (`/api/webhooks/revenuecat`)
- DB schema supports `apple_iap`, `google_play`, `vnpay`, `momo` payment methods

## Mobile App (Phase 12)

### Features Implemented
- Reader with 4 themes, TTS, offline (SQLite), auto-scroll, keep-awake
- Search with debounce, recent searches
- Star rating input (upsert to ratings table)
- Comments section (pagination, moderation queue, auth-gated)
- Gamification (13 cultivation levels, 22 achievements)
- AdMob integration (banner + interstitial, hidden for VIP)
- Rankings via `get_ranked_novels()` RPC (views, bookmarks, rating, latest, completed)

### App Store Status
- iOS build configured (EAS), buildNumber: 4
- Android versionCode: 2
- NOT yet submitted to App Store/Play Store
- Needs: device testing, screenshots, TestFlight, submission

## Infrastructure (Phase 14C)

### Redis (Upstash)
- Rate limiting: sliding window via `@upstash/ratelimit` (falls back to in-memory)
- Caching: async get/set with TTL (falls back to in-memory)
- Env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

### Error Tracking (Sentry)
- Integrated via `logger.ts` `sendToSentry()` (lazy init)
- Env: `NEXT_PUBLIC_SENTRY_DSN`

### Security Headers
- `vercel.json`: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control, Strict-Transport-Security, Permissions-Policy

## SEO & Analytics (Phase 13)

- JSON-LD: WebSite, Organization, Book (novel detail), BreadcrumbList
- Canonical URLs on novel detail pages
- `/search` page for SEO (not just modal)
- GA4 via `NEXT_PUBLIC_GA4_ID`
- Vercel Analytics + Speed Insights
- AdSense via `NEXT_PUBLIC_ADSENSE_PUB_ID`

## Phase 16 Details (2026-02-27) — Ad Integration Audit Fix

Comprehensive audit found 3 critical + 4 high + 5 medium + 5 low issues in the ad integration layer. All actionable issues fixed.

### 16A — Web Ad Fixes
- **16A-1**: AdSense `<script>` → Next.js `<Script strategy="lazyOnload">` (was render-blocking, now lazy)
- **16A-2**: AdSense script moved from `<head>` to `<body>` (no longer blocks SSR)
- **16A-3**: Created `VipProvider` context (`src/contexts/vip-context.tsx`) — single RPC call shared by all AdBanner instances (was N separate queries)
- **16A-4**: Web AdBanner now uses `get_reader_status` RPC (handles VIP expiration) instead of querying `profiles` table directly
- **16A-5**: `FORMAT_STYLES` now applied to ad container (prevents CLS — reserving min-height for ad slots)
- **16A-6**: `pushed` ref resets when `slot` prop changes (edge case fix)
- **16A-7**: Wired `AdPlacement` into web pages: home (2 between-content + 1 sidebar), novel detail (between desc & chapters desktop+mobile, before comments desktop), chapter reader (post-content), browse (sidebar below filters), ranking (after rank 10 + bottom), genres (after grid), search (after results + no-results)

### 16B — Mobile Ad Fixes
- **16B-1**: `AdBanner` — added `onAdFailedToLoad` handler, collapses to null on failure (was blank gap)
- **16B-2**: `useInterstitialAd` — added `AdEventType.ERROR` listener with retry logic (max 3 attempts, exponential backoff)
- **16B-3**: Wired `AdBanner` into mobile screens: discover home (after hero carousel), novel detail (before tabs), chapter reader (post-content)
- **16B-4**: Wired `useInterstitialAd` into chapter reader `goToChapter()` — shows ad every 4 chapter navigations

### 16C — SQL & Security Fixes
- **16C-1**: Migration 0137 — `get_reader_status()` now clears `reader_tier_expires_at` on VIP expiration (was leaving stale timestamp)
- **16C-2**: `reader-vip-service.ts` — `credit_transactions` insert now checks for errors + logs (was fire-and-forget)
- **16C-3**: `vercel.json` — Added `Strict-Transport-Security` (HSTS with preload) and `Permissions-Policy` (camera/mic/geo disabled)

### 16D — iPad UI & Routing Fixes
- **16D-1**: Fixed routing bug where app launched into `(account)` instead of `(discover)` by adding explicit `/mobile/app/index.tsx` redirect
- **16D-2**: Forced Dark Mode globally (`userInterfaceStyle: "dark"`) and synchronized `global.css` root colors to fix white-flash/inconsistent colors on iPad
- **16D-3**: Fixed `headerLargeTitle` bleeding on iPad OS 18 top tab bar by conditionally disabling it via `useDevice` hook
- **16D-4**: Optimized iPad layouts: constrained Hero carousel width (max 800px), expanded grid columns (4-5 columns), added responsive margins to Settings/Library screens
- **16D-5**: Fixed `get_ranked_novels` RPC crashing Rankings tab (applied Migration 0136 manually, fixed JSONB to TEXT[] cast)
- **16D-6**: Captured 13-inch iPad screenshots (`ipad-13-1.png`, `ipad-13-2.png`) for App Store Connect

## Phase 17 Details (2026-02-28) — RevenueCat Payment Integration

### Architecture
- **RevenueCat** is the single source of truth for VIP subscription status
- Mobile app uses RevenueCat SDK to trigger Apple/Google payment sheets
- RevenueCat validates receipts with Apple/Google servers
- Webhook syncs subscription status to Supabase DB (for web/API access)
- Usage tracking (TTS, downloads) still uses Supabase directly

### 17A — Mobile SDK Integration
- **17A-1**: Installed `react-native-purchases` + `react-native-purchases-ui` in mobile
- **17A-2**: Added `react-native-purchases` plugin to `app.json`, `BILLING` permission for Android
- **17A-3**: Created `src/lib/revenuecat.ts` — SDK init, user identity, entitlement check
- **17A-4**: Init RevenueCat in root `_layout.tsx`

### 17B — Hooks & Paywall
- **17B-1**: Created `use-revenuecat.ts` hook — full purchase flow, offerings, customer info listener
- **17B-2**: Created paywall screen `(account)/paywall.tsx` — VIP features, price, purchase/restore buttons, legal links
- **17B-3**: Added VIP upgrade banner to account screen (conditionally shows upgrade CTA or active badge)
- **17B-4**: Updated `use-vip-status.ts` — hybrid approach: RevenueCat for VIP status, Supabase for usage tracking

### 17C — Server Webhook & Security
- **17C-1**: Created `/api/webhooks/revenuecat/route.ts` — handles INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, etc.
- **17C-2**: Webhook auth via `REVENUECAT_WEBHOOK_SECRET` Bearer token
- **17C-3**: Syncs subscription status to `user_subscriptions` table on each event
- **17C-4**: Records transactions in `credit_transactions` table
- **17C-5**: Locked down `POST /api/billing/reader-vip` upgrade action — returns 403, forces purchase through app/RevenueCat

### Env Variables Required
```
# Mobile (.env)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx

# Server (.env)
REVENUECAT_WEBHOOK_SECRET=whsec_xxx
```

### RevenueCat Dashboard Setup Required
1. Create project at app.revenuecat.com
2. Connect Apple App Store (Shared Secret from ASC)
3. Connect Google Play Store (Service Account JSON)
4. Create entitlement: `reader_vip`
5. Create product: `reader_vip_monthly` in ASC/GPC
6. Create offering with monthly package
7. Configure webhook URL: `https://truyencity.com/api/webhooks/revenuecat`
8. Set webhook auth header: `Bearer ${REVENUECAT_WEBHOOK_SECRET}`

## Phase 18 Details (2026-02-28) — SePay Web Payment Integration

### Architecture
- **SePay** handles web VIP payments via bank transfer + VietQR
- User clicks "Mua VIP" on /pricing -> modal shows VietQR code + bank info
- User scans QR with banking app -> transfers with content `TCVIP{code}`
- SePay detects payment -> webhook POST to `/api/webhooks/sepay`
- Webhook matches payment code to `vip_orders` -> activates VIP
- Frontend polls `/api/billing/vip-order?order_id=X` -> shows success

### 18A — SePay Webhook
- **18A-1**: Created `/api/webhooks/sepay/route.ts` — receives SePay transaction webhook
- **18A-2**: Auth via `Authorization: Apikey ${SEPAY_API_KEY}` header
- **18A-3**: Extracts payment code (TCVIP...) from content, matches to pending order
- **18A-4**: Returns `{success: true}` with HTTP 200 (SePay format)
- **18A-5**: Only returns 500 for transient DB errors (SePay retries on non-200)

### 18B — SePay Service
- **18B-1**: Created `src/services/billing/sepay-service.ts` — singleton service
- **18B-2**: `createVipOrder()` — creates pending order in `vip_orders` table, returns QR URL + bank info
- **18B-3**: `handlePayment()` — processes webhook: dedup check, amount verification, VIP activation
- **18B-4**: `getOrderStatus()` — returns order status for polling
- **18B-5**: Reuses existing pending order if user hasn't paid yet (prevents order spam)
- **18B-6**: Payment code format: `TCVIP` + 8 random alphanumeric chars

### 18C — VIP Order API
- **18C-1**: Created `/api/billing/vip-order/route.ts` — POST (create order) + GET (poll status)
- **18C-2**: POST validates plan, checks if user already VIP, creates order via SePay service
- **18C-3**: GET returns order status (pending/paid/expired) for frontend polling
- **18C-4**: Both endpoints require auth + rate limiting

### 18D — QR Checkout Modal
- **18D-1**: Created `src/components/billing/VipCheckoutModal.tsx` — full checkout flow
- **18D-2**: Shows QR code (via `qr.sepay.vn`) + manual bank transfer info
- **18D-3**: Auto-polls every 3 seconds for payment confirmation
- **18D-4**: Countdown timer (30 min expiry), copy-to-clipboard for payment code
- **18D-5**: Success/error states with appropriate UI

### 18E — Pricing Page Integration
- **18E-1**: Added "Mua gói tháng" + "Mua gói năm" buttons to VIP tier card
- **18E-2**: Redirects to /auth if not logged in
- **18E-3**: Opens VipCheckoutModal with selected plan
- **18E-4**: Reloads page on success to reflect VIP status

### 18F — Database Migration
- **18F-1**: Created `0139_vip_orders_sepay.sql` — `vip_orders` table with plan, amount, payment_code, status
- **18F-2**: SePay transaction dedup via `sepay_transaction_id` unique constraint
- **18F-3**: RLS: users can read own orders, service role for insert/update
- **18F-4**: pg_cron job auto-expires pending orders after 30 minutes

### Env Variables Required
Set in **Vercel** dashboard (Settings > Environment Variables) — these are server-side only, used by Next.js API routes:
```
SEPAY_API_KEY=your_sepay_api_key          # From SePay dashboard > Webhooks > API Key
SEPAY_BANK_CODE=MBBank                    # Bank short code (see qr.sepay.vn/banks.json)
SEPAY_ACCOUNT_NUMBER=0123456789           # Your bank account number
SEPAY_ACCOUNT_NAME=YOUR_NAME              # Account holder name (shown to user)
```

### SePay Dashboard Setup Required
1. Register at my.sepay.vn
2. Link bank account
3. Create webhook: URL = `https://truyencity.com/api/webhooks/sepay`
4. Set webhook auth: API Key mode, key = `${SEPAY_API_KEY}`
5. Event: "Có tiền vào" (incoming transfers only)
6. Configure payment code pattern: `TCVIP` prefix in Cấu hình chung

## Remaining Known Issues

### Pending (needs external setup)
- Phase 12D: Google Play submission (needs Android build)
- Phase 13C: Email notifications (needs email service like Resend/SendGrid)
- RevenueCat dashboard setup (products, entitlements, webhook URL)
- App Store Connect product creation (subscription group, pricing)
- SePay dashboard setup (bank account, webhook URL, API key)

## Phase 19 Details (2026-04-28) — Sảng Văn Pacing Overhaul + Mobile v1.0.5

User feedback drove multiple back-to-back rounds tuning the story engine
toward modern TQ webnovel standards (2024-2026). Each round refined the
prior — read commits in order to understand the trajectory.

### 19A — Chapter Split + TTS Auto-Resume + Interstitial Recovery
**Commit `059dc80`, `c66b531`, mobile v1.0.5/build 43**
- AI write target stays at 2800 từ for narrative coherence; orchestrator
  splits into 2 reader chapters (~1400 each) at paragraph boundaries
  with em-dash protection. Fallback to single chapter when content <4000
  chars. Cron `updateQuotaAfterWrite` now ticks per reader chapter.
- DB: 11 active projects bumped to `target_chapter_length = 2800`.
- TTS auto-resume bug: reader's `[slug, chapterNumber]` cleanup called
  `tts.stop()` on every nav, which cleared `pendingAutoResume` and
  killed cross-chapter audio. Added `hasPendingAutoResume()` peek;
  cleanup now skips stop when auto-advance is in flight.
- Interstitial: hook gave up after 3 retries permanently. Now resets
  retry budget and re-triggers `loadAd` when chapter interval hits
  without a loaded ad — single bad network window no longer disables
  popups for the rest of the session.
- Mobile bumped to v1.0.5 / iOS build 43 / Android versionCode 4.

### 19B — Missing Usage Tracking RPCs (CRITICAL FIX)
**Commit `3f63431`, migration `0152_record_usage_rpcs.sql`**
- `record_tts_usage` and `record_download_usage` RPCs were referenced
  by mobile every 60s but **never existed in the database**. Calls
  errored, client treated null as "no limit", free users had unlimited
  TTS playback and the download UI never gated despite `show_ads` and
  `can_download` flags being correct from `get_reader_status`.
- Both RPCs added: upsert on `(user_id, usage_date)` constraint,
  downgrade expired VIP rows to free before reading limits, return
  field names mobile actually destructures (`seconds_used_today` /
  `can_continue` for TTS, `chapters_downloaded_today` /
  `can_download_more` for downloads).

### 19C — Non-Combat Genre Guardrail
**Commit `7d195af`**
- User reported do-thi novels drifting into "huyết chiến trong hẻm",
  LAN gaming tournaments, gangster fights despite genre rules already
  forbidding combat. Dopamine pattern lists were correct but no actual
  rejection happened when models defaulted into combat.
- `buildGenreSpecificSuffix()` in chapter-writer now appends a hard
  guardrail when `isNonCombatGenre(genre)` (do-thi, ngon-tinh,
  quan-truong): no physical fights, no "Huyết Chiến/Tử Chiến" titles,
  no gangster ambush, no MC in tournaments as A-plot. Critic gets a
  paired hard check that issues critical continuity issue + REWRITE on
  any of these patterns.
- Conflict resolves through commercial channels (price wars, M&A,
  lobby, PR, lawsuits, talent poaching) — never violence.

### 19D — Warm Baseline Opening (Anti-凄惨开局)
**Commit `6e1ef42`**
- Modern TQ trend 2024-2026 has shifted from "凄惨开局" (tragic
  opening) to "稳健流 / 暖开局" (stable / warm opening). MC opens at
  functional baseline, NOT rock bottom.
- `GOLDEN_CHAPTER_REQUIREMENTS` ch.1 mandates: MC arrives with golden
  finger ACTIVE, infrastructure ALREADY operational, hook is
  OPPORTUNITY-driven (customer walks in, deal appears) not
  THREAT-driven (MC starving, getting beaten, losing job, losing
  memory). Avoid list bans rock-bottom pile-on opening.
- `UNIVERSAL_ANTI_SEEDS` adds 6 bans: ngất xỉu/đói lạnh/nô lệ
  openings, amnesia ch.1 hook, suffering pile-on triggers, in-alley
  ambush in first 5 chapters of non-combat genres, "MC tự lực từ con
  số 0", "5-10 chương đầu MC chỉ ăn cơm cám trước khi golden finger
  kích hoạt".
- Architect prompt rule #16 (warm baseline ch.1) + #17 (early-arc
  1-10: competence-led growth, no gangster ambush, GF active from
  page one). Sub-genre rules `isekai-net-cafe` and
  `game-parallel-world` shift baseline so MC opens with shop/studio
  operational.
- **Reset 5 novels** poisoned by old pattern: Trở Về Năm 2000, Quán
  Net Dị Giới, Studio Game Dị Giới, Hollywood 1991, Ngư Dân 1992.
  Chapters wiped, outlines regenerated under new rules via
  `scripts/generate-outlines-for-novels.ts` (now reads
  `TARGET_PROJECTS` env), projects re-activated.

### 19E — Sảng Văn Audit (21 Adversity-Prescribing Rules Softened)
**Commit `5041c12`**
- User: "đa phần là Sảng Văn mà — ít main khổ cùng cực." Audit found
  21 rules across templates.ts / pacing-director.ts / chapter-writer.ts
  still pushing forced suffering or mandatory conflict density.
- templates.ts: power-up no longer requires sacrifice; enemy escalation
  optional; 7 genre engagement floors converted from "every N chapters
  MUST..." to "≥1 per arc, optional in breathing arcs".
- pacing-director.ts: breathing minimum 40% → 60%; villain_focus cap
  2 → 1 per arc; climax cap 3 → 2; non-combat genres explicitly allowed
  0/0 with milestone-as-climax. Word-count multipliers leveled —
  breathing/training/calm now 1.0× baseline (was 0.75-0.85).
- chapter-writer.ts: Architect rule #1 reframed from "ức chế → bùng
  nổ" template to "Sảng Văn pacing default 80%+, suppression model
  only for ~20% climax". Critic pacingScore exception for uniform but
  all-positive scenes. "Easy Win Check" generalized to "Dopamine
  Check". Breathing-chapter grading no longer discounted to ≥5 — equal
  priority at ≥6.

### 19F — Mì-Ăn-Liền Pacing (Dopamine Cadence Floor Restored)
**Commit `95ffae7`** — refines 19E
- User: "nhịp truyện đang khá chậm, đọc rất kìm nén." Round 19E
  over-corrected by softening face-slap and milestone cadence — those
  are dopamine events, not adversity. Reframed as the engagement
  engine.
- Architect rule #1 rewritten as SẢNG VĂN MÌ-ĂN-LIỀN: each chapter ≥2
  dopamine peaks, first peak ≤50% of chapter, setup ≤30%, payoff ≥40%.
  6 valid dopamine types (face-slap small, casual competence, smooth
  opportunity, recognition, harvest, breakthrough).
- `ENGAGEMENT_CHECKLIST.perChapter`/`per5Chapters` mandate cadence:
  ≥2 peaks/chapter distributed early+late, ≥1 big wow per 3-5
  chapters, ≥3 small wows per 5 chapters, setup-without-payoff banned.
- `faceSlapFormula` cadence floor restored: ≥1 small face-slap per 1-2
  chapters + ≥1 big per 5. Reframed as DOPAMINE event so it's not
  conflated with adversity. Escalation 5-chapter windows: individual
  → group → mass → nationwide.
- `adversityToTriumphRatio` tightened to 10/90. Anti-pattern list
  names all three reader-killers: tự ngược, kìm nén, dopamine thiếu.
- `GOLDEN_CHAPTER` ch.1-3 updated with explicit scene timing:
  - Ch.1: FIRST WOW by scene 2 (≤50%), BIG WOW at scenes 4-5
  - Ch.2: ≥1 mass-witnessed face-slap or big deal close
  - Ch.3: "defining wow" — city-level recognition; first peak ≤40%
- Two new Critic rules:
  - DOPAMINE CADENCE CHECK: 0 peaks → critical/REWRITE; 1 peak only
    at end → major; first peak after scene 3 → moderate.
  - KÌM NÉN DETECTION: ≥3 setup beats with 0 payoff in same chapter
    → critical/REWRITE; setup:payoff > 2:1 → major. Multi-chapter
    event cliffhanger is the only carve-out.

### 19G — Refined Sảng Văn Philosophy (consolidated guidance)

When tuning future story-engine work, separate two concerns that were
previously conflated:

1. **Adversity (MC suffers)** — keep LOW (~10% of chapters). Hard rules
   in `ANTI_SELF_TORTURE_RULES`, anti-rock-bottom seeds, non-combat
   guardrail, kìm-nén detection.
2. **Dopamine cadence (MC wins, face-slaps land, recognition arrives)**
   — keep HIGH and DENSE. Hard rules in `faceSlapFormula` frequency,
   `ENGAGEMENT_CHECKLIST.perChapter` peak count, big-wow-per-5 floor,
   golden chapter scene timing.

Face-slap, recognition, milestone, and harvest are dopamine events,
not adversity events. MC is never the one suffering during a face-slap
— the bystander/competitor is. Tune them up, not down.

### Files Changed in Phase 19
- `src/services/story-engine/templates.ts` — 9 sections rewritten
  (GOLDEN_CHAPTER_REQUIREMENTS, UNIVERSAL_ANTI_SEEDS,
  ENGAGEMENT_CHECKLIST.perChapter/per5Chapters/adversityToTriumphRatio/
  faceSlapFormula, NON_COMBAT_GENRES exports, isekai-net-cafe and
  game-parallel-world sub-genre rules)
- `src/services/story-engine/pipeline/chapter-writer.ts` — Architect
  rule #1 rewritten, rules #16-17 added (warm baseline + early-arc),
  rules #18-19 renumbered. Critic gains DOPAMINE CADENCE CHECK and
  KÌM NÉN DETECTION (rules #12-13), subsequent rules renumbered to
  14-22. `runCritic` accepts genre + emits non-combat hard check via
  `nonCombatGuard`. `buildGenreSpecificSuffix` adds non-combat block
  via `isNonCombatGenre`.
- `src/services/story-engine/pipeline/orchestrator.ts` — chapter split
  helper, multi-row chapter upsert, `chaptersCreated` /
  `lastChapterNumber` in OrchestratorResult.
- `src/services/story-engine/memory/pacing-director.ts` — breathing
  floor 60%, villain_focus/climax caps lowered, mood word-count
  multipliers leveled at 1.0× for non-combat moods.
- `src/app/api/cron/write-chapters/route.ts` — quota loop multiplied
  by `chaptersCreated`, `lastWrittenCh` tracks last reader chapter.
- `mobile/src/lib/tts-controller.ts` — `hasPendingAutoResume()` peek.
- `mobile/app/read/[slug]/[chapter].tsx` — cleanup skip during
  auto-advance.
- `mobile/src/hooks/use-interstitial-ad.ts` — retry reset on interval.
- `mobile/app.config.ts` — v1.0.5 / build 43 / versionCode 4.
- `supabase/migrations/0152_record_usage_rpcs.sql` — RPCs added.
- `scripts/generate-outlines-for-novels.ts` — `TARGET_PROJECTS` env.

## Important Files to Read

When working with the story engine:

1. **types.ts** — Data structures
2. **chapter-writer.ts** — 3-agent pipeline + quality compliance (~1385 lines)
3. **context-assembler.ts** — 4-layer context + combined AI call (~700 lines)
4. **orchestrator.ts** — Overall flow + smart truncation (~465 lines)
5. **templates.ts** — Genre configs, engagement, anti-cliche, title templates (~1943 lines)
6. **summary-manager.ts** — Synopsis/bible/arc triggers + quality module triggers (~435 lines)

## Scripts (kept)

- `scripts/quality-check-v2.ts` — Quality check
- `scripts/coherence-audit-v2.ts` — Coherence audit
- `scripts/audit-pipeline.ts` — Full audit pipeline
- `scripts/fix-missing-data.ts` — Fix missing outlines/data
- `scripts/quality-report.js` — Quality report

---

**Last Updated**: 2026-04-30
**All 5 quality phases complete** — Phases 1-5 shipped to production
**Phase 10 complete** — 6 missing genres + ratings RPC migration
**Phases 11-16 complete** — Monetization, mobile features, SEO, analytics, infra hardening, ad integration audit fix
**Phase 17 complete** — RevenueCat payment integration (mobile IAP + server webhook)
**Phase 18 complete** — SePay web payment integration (bank transfer + VietQR)
**Phase 19 complete** — Sảng Văn pacing overhaul (warm baseline, dopamine cadence, kìm-nén detection) + chapter split + mobile v1.0.5
**Phase 20A complete** — Genre architecture expansion: 3 new top-level genres + 12 new topics + 5 new SUB_GENRE_RULES + disable_chapter_split flag
**Phase 21-22 complete (2026-04-30)** — Story Engine quality rebuild — see [docs/story-engine/](docs/story-engine/README.md) hub:
  - **v1**: voice anchors per genre + 9-section seed blueprint
  - **v2**: outline layer fixes (8-12 arcs × 6-axis, cast/rules/tone, warm-baseline arc 1)
  - **v3**: per-genre process blueprints (16 genres × setup/process/scenes/arc)
  - **wave 1 P1-P5**: type system enforcement + state defenses + branching alignment + hardening + docs
  - **wave 2 P6-P7**: DeepSeek empty content guard + lock duration vs timeout + critical missing index
  - **V1+V4 verification**: quality_trend cron + supreme_goals dashboard at `/admin/supreme-goals`
  - 10 novel reset + spawn fresh với pipeline mới (đa genre: tien-hiep/huyen-huyen/do-thi/kiem-hiep/linh-di/lich-su/khoa-huyen/vong-du/mat-the/dong-nhan)

## Phase 21-22 Details (2026-04-30) — Story Engine Quality Rebuild + Verification

User feedback: "phải thực sự nghiêm túc trau chuốt toàn bộ logic dự án đi chứ cứ lâu lâu lại phát sinh bug thì bao giờ mới xong" + "bạn có nhớ mục tiêu tối thượng của chúng ta không? Hiện nay hệ thống có đạt được mục tiêu đó không"

### Wave 1 (P1-P5) — bug-class elimination

| Bug class | Defense layer |
|---|---|
| Forget genre Record entry | P1 compile-time + P1 jest test |
| Voice anchor literal name leak | P1 lint + P2.2 Critic check + P4.2 canary + P4.3 audit |
| MC name flip across chapters | P2.1 sync verify + P2.2 Critic check + P2.4 synopsis lock + P4.2 canary |
| Cast invent / Khánh→Khang drift | P2.3 castRoster injection |
| Silent post-write task failure | P2.5 failed_memory_tasks persistence |
| Branching list drift | P3.1 single source of truth |
| Sub-genre typo silent fall-through | P3.3 validateSubGenreKeys |
| Bad seed shipped | P4.1 blueprint hard-reject |
| Drift not detected for days | P4.2 canary + P4.3 weekly regression audit |

### Wave 2 (P6-P7) — failure mode fixes from systematic audit

- **P6.1**: DeepSeek `content || reasoning_content || ''` could return empty silently → empty chapter saved. Now throws explicit error.
- **P6.3**: 90s distributed lock < 400s PROJECT_TIMEOUT_MS → race possible. Lock now = `PROJECT_TIMEOUT_MS + 60s buffer (~7.7min)`.
- **P7.1**: missing partial index on `ai_story_projects(status, current_chapter, updated_at)` — full table scan at 1000+ projects. Migration 0159 applied.

### V1+V4 — supreme goals verification

- **V1**: `quality-trend-cron` daily 00:30 VN → `quality_trends` table (early avg vs recent avg drift + alert_level ok/watch/warn/critical)
- **V4**: `/admin/supreme-goals` dashboard with 5 traffic lights per novel (coherence / character consist / directional / ending / uniform quality) + aggregate summary
- **V2 + V3 deferred**: deeper regression checks + bestseller calibration — when measurement data shows specific gaps

### Verification harness (every PR)

```bash
npm run typecheck          # TS strict
npm run lint:prompts       # placeholder leak audit
npm test -- genre-coverage # 11/11 pass

# Production smoke
POST /api/admin/operations { action: 'regression_audit' }
POST /api/admin/operations { action: 'supreme_goals' }
POST /api/admin/operations { action: 'stuck_novels' }
```

### Status mục tiêu tối thượng (CLAUDE.md Supreme Goals)

| Goal | Defense | Verified? |
|---|---|---|
| 1. Coherence ch.1→cuối | Bridge, synopsis, arc plan, foreshadowing, plot threads, continuity guardian, critic | ❌ chưa novel ≥ch.100 với pipeline mới |
| 2. Character consistency | character_states, detectMcNameFlip, dead_character, auto-revise | ⚠️ MC defense complete; supporting chars chưa test scale |
| 3. Directional plot | 8-12 arcs × 6-axis, arc plans, plot threads tracker | ❌ chưa verify escalation curve |
| 4. Natural ending 1000-2000ch | Soft ending logic 4-phase | ❌ chưa novel nào reach ending |
| 5. Uniform quality ch.8 vs ch.800 | Voice fingerprints, quality_metrics, V1 trend cron | ❌ HARDEST — needs ≥200ch novel |

→ **Defense ≠ achievement**. Wave 3 ngày tới khi 10 novels reach ch.50+ sẽ có data đầu tiên qua `/admin/supreme-goals` dashboard.

### Files added/changed (cumulative wave 1 + wave 2 + verification)

NEW:
- `scripts/audit-prompts-for-leaks.ts` (P1)
- `src/__tests__/story-engine/genre-coverage.test.ts` (P1)
- `docs/story-engine/PLACEHOLDER_CONVENTION.md` (P5)
- `src/services/story-engine/templates/genre-voice-anchors.ts` (v1)
- `src/services/story-engine/templates/genre-process-blueprints.ts` (v3)
- `src/services/story-engine/seed-blueprint.ts` (v1)
- `src/services/story-engine/pipeline/story-outline.ts` (v2 — extracted from inline duplicates)
- `src/app/admin/stuck-novels/page.tsx` (P4)
- `src/app/admin/supreme-goals/page.tsx` (V4)
- `src/app/api/cron/quality-trend/route.ts` (V1)
- 5 migrations: 0156 cost_tracking_metadata, 0157 failed_memory_tasks, 0158 pause_reason, 0159 ai_story_projects index, 0160 quality_trends

PRs: #14 #15 #16 #17 #18 #19 #20 #21 #22 #23 #24 #25 #26 #27 (14 PRs in this rebuild session, all merged to main).

## Phase 20A Details (2026-04-28) — Genre Architecture Expansion

User-supplied research dump of 19+ TQ web-novel genre briefs (Quy Tắc Quái Đàm, Ngự Thú Tiến Hóa, Khoái Xuyên, Mô Phỏng Khí, Hắc Ám Lưu, Sáng Thế Lưu, Lĩnh Vực Tuyệt Đối, Cẩu Đạo Trường Sinh, Lão Tổ Lưu, Đoạn Tuyệt Quan Hệ, Giải Trí Lưu, Group Chat Vạn Giới, Thành Chủ Lưu, Toàn Dân Lãnh Chúa, Toàn Dân Chuyển Chức, Võng Du Đả Kim Dung Hợp, Nho Đạo, Đánh Cắp Tiếng Lòng, Dân Tục Quái Đàm / Ngỗ Tác, Thiên Đạo Kim Bảng, Mạt Thế Độn Vật Tư, Tri Thức Hiện Đại Cải Biến, Man Hoang). Synthesized into 3-tier engine architecture:

### 20A-1 — 3 New Top-Level Genres
Each has full GENRE_CONFIG entry (8 topics with detailed `topicPromptHints`), all strict Records (GENRE_STYLES, conflictDensityCap, GENRE_TITLE_EXAMPLES, GENRE_ENGAGEMENT, VN_PRONOUN_GUIDE, GENRE_BOUNDARIES, GENRE_ANTI_CLICHE, GENRE_VOCABULARY, GENRE_WRITING_GUIDES), getPowerSystemByGenre + getDopaminePatternsByGenre cases, plus legacy file Records (story-factory + story-writing-factory).

- **`quy-tac-quai-dam`** (Rules Horror, NON_COMBAT) — Uncanny Valley horror, phó bản đời thường (văn phòng/metro/bệnh viện/siêu thị/chung cư/quán ăn đêm/trường học/khách sạn) biến dị. MC sinh tồn bằng tuân thủ + suy luận quy tắc thật/giả. POWER_SYSTEMS.rules_horror (đã có sẵn). Cấu trúc 4 hồi 20 chương / phó bản. KHÔNG combat vật lý.
- **`ngu-thu-tien-hoa`** (Beast Evolution / Pokemon-style) — MC ngự thú sư có Bàn Tay Vàng nhìn thấu Tuyến Tiến Hóa Ẩn + công thức BOM. Sảng văn Bất Đối Xứng Nhận Thức. 8 topics: học viện, cấm khu, gia tộc, thương nhân, trọng sinh, dị thú cuồng loạn, cổ truyền, võng du. Combat = pet vs pet, không MC tay đôi.
- **`khoai-xuyen`** (Quick Transmigration, modular episodic) — MC nhân viên Hệ Thống Đa Vũ Trụ, mỗi 30-50 chương xuyên thân phận mới (pháo hôi/villain/nữ phụ) cứu nguyên chủ. Cấu trúc 4 hồi modular (5+15+15+10). 8 topics: cứu vớt phản phái, bù đắp pháo hôi, đại nữ chủ, lỗi hệ thống, đa bối cảnh, bù đắp tiếc nuối, tân nguyên chủ, cặp đôi xuyên cùng. Hub Space giữa các thế giới.

### 20A-2 — 12 New Topics in Existing Genres
- **`do-thi`** (4): `do-thi-doan-tuyet-quan-he` (Hỏa Táng Tràng), `do-thi-giai-tri-luu` (Media Empire), `do-thi-thanh-chu-luu` (Domain Building), `do-thi-group-chat-vu-tru` (Multiverse Trading Admin)
- **`tien-hiep`** (2): `tien-hiep-cau-dao-truong-sinh` (Lay Flat / Longevity), `tien-hiep-lao-to-luu` (Idle Sect Ancestor Simulator)
- **`linh-di`** (1): `linh-di-dan-tuc-ngo-tac` (Folk Horror / Coroner)
- **`di-gioi`** (3): `di-gioi-toan-dan-lanh-chua` (Global Lord), `di-gioi-tri-thuc-cai-bien` (Tech Uplift), `di-gioi-man-hoang` (Prehistoric Survival)
- **`mat-the`** (1): `mat-the-don-vat-tu` (Doomsday Hoarding)
- **`lich-su`** (1): `lich-su-nho-dao` (Literary Cultivation / Cultural Plagiarism)
- **`dong-nhan`** (1): `dong-nhan-doc-tieng-long` (Eavesdropping Heart Diary)

Note: `vong-du-toan-dan-chuyen-chuc` and `vong-du-vao-hien-thuc` already existed — briefs #15 and #19 enhance via existing topics, no duplication.

### 20A-3 — 5 New SUB_GENRE_RULES (Cross-Cutting Overlays)
Áp được lên BẤT KỲ genre nào qua project `sub_genres[]` array:
- **`mo-phong`** (Simulator Gacha) — vòng lặp 4 bước: Setup → Gacha thiên phú → Text Log mô phỏng → Extraction → Real Execution
- **`linh-vuc-tuyet-doi`** (Absolute Domain Shop) — MC tử thủ trong tiệm 100m², cốt truyện tự gõ cửa, vật phẩm "hàng chợ" hoá thần khí
- **`sang-the`** (Sandbox Creator / Macro Time-skip) — Sa bàn tua nhanh thời gian, văn phong Biên Niên Sử, Hàng duy đả kích
- **`hac-am-luu`** (Villain Protagonist) — Personality Lock cứng, không thánh mẫu, hành động bằng tổ chức + chiến tranh kinh tế
- **`kim-bang-bo-quang`** (Heavenly Dao Leaderboard / Exposure) — Listicle JSON Top 10, vòng lặp Update Bảng → World Reaction → Main Than Vãn

### 20A-4 — disable_chapter_split Flag
- `style_directives.disable_chapter_split = true` → orchestrator giữ AI output ~2800 từ làm 1 reader chapter (KHÔNG split thành 2). Cho representative novels ở Phase 20 — user muốn "độ dài gốc chưa cut".
- Mặc định (cho novels cũ + future novels) vẫn split 2 reader chapters per AI write như Phase 19A.

### 20A-5 — Spawn Script
`scripts/spawn-phase20-representatives.ts` — tạo 10 representative novels (3 top-level genres + 7 priority topics) với:
- Hand-crafted seeds (title/slug/premise/world_description chi tiết theo brief)
- Outlines auto-generated qua DeepSeek (story_outline + master_outline)
- `style_directives.disable_chapter_split = true`
- status='active' sau khi outlines OK → cron tự pickup

Sau spawn, cron `write-chapters-cron` ghi 20 ch/ngày/novel theo DAILY_CHAPTER_QUOTA. Initial 20 chương đến trong ngày đầu, steady state tiếp tục.

Run: `./node_modules/.bin/tsx scripts/spawn-phase20-representatives.ts`

### Files Changed in Phase 20A
- `src/lib/types/genre-config.ts` — 3 new top-level GENRE_CONFIG entries (~24 topics) + 12 new topics in existing genres
- `src/services/story-engine/types.ts` — GenreType union + 2 new entries
- `src/services/story-engine/templates.ts` — GENRE_STYLES + conflictDensityCap + GENRE_TITLE_EXAMPLES + GENRE_ENGAGEMENT + VN_PRONOUN_GUIDE + NON_COMBAT_GENRES + GENRE_BOUNDARIES + GENRE_ANTI_CLICHE + getPowerSystemByGenre + getDopaminePatternsByGenre + 5 new SUB_GENRE_RULES
- `src/services/story-engine/memory/style-bible.ts` — GENRE_VOCABULARY + GENRE_WRITING_GUIDES (3 new entries each)
- `src/services/story-engine/pipeline/orchestrator.ts` — disable_chapter_split flag in style_directives, SPLIT_PARTS dynamic
- `src/services/author-generator/index.ts` — GenreType union
- `src/services/story-writing-factory/types.ts` — GenreType union (legacy)
- `src/services/story-writing-factory/templates.ts` — GENRE_STYLES + GENRE_BOUNDARIES (legacy minimal entries)
- `src/services/story-writing-factory/qc-gating.ts` — genreWordCounts (legacy)
- `src/services/story-factory/types.ts` — GenreType union (legacy)
- `src/services/story-factory/blueprint-generator.ts` — worldNames (legacy)
- `src/services/story-factory/genre-templates.ts` — GENRE_TEMPLATES Record (legacy)
- `src/services/content-seeder/index.ts` — SOURCE_TOPIC_SEEDS + VARIANTS_BY_GENRE + prefixByGenre + suffixByGenre (3 new entries each)
- `scripts/spawn-phase20-representatives.ts` — new script, 10 representative seeds with hand-crafted detail per brief

---

## Phase 24-28 Details (2026-05-01) — Full đại thần workflow rebuild + 5-layer architecture

**Single PR**: [#38](https://github.com/ungden/truyencity2/pull/38) — 19 commits across Phase 24-28. ~5500 lines added, 4097 lines deleted (V1 dead code), 26 new modules, 9 new migrations.

**Read first**: [src/services/story-engine/ARCHITECTURE.md](src/services/story-engine/ARCHITECTURE.md) — 5-layer design + dependency rules.

### Phase summary

| Phase | Wave | Commits | Highlight |
|---|---|---|---|
| 24 | — | 142b1fd, e2c2f1f, 6ef4109 | Codex audit pipeline fixes (REVISE gate fail-closed, per-part loop, pre-save QA gate, auto-revise reorder, guardian skip-bug) |
| 25 | — | cdf2b5c | Rubric judge (5 dims) + First10ChapterEvaluator |
| 26 | — | 9391766, ac78a09 | Volume hierarchy 卷宗 + foreshadowing OVERDUE 伏笔表 + climax ladder 悬念三层 |
| 27 W1 | 4 commits | 02c5b77, 472d128, b675a62, 5da299b | 5-layer refactor (canon/plan/state/quality/context) + plot-tracker.ts split (4 modules) + ARCHITECTURE.md |
| 27 W2 | — | 9748394 | cast-database/timeline/item-inventory/power-canon/factions (5 modules) |
| 27 W3 | — | 8eda221 | plot-twists/themes/worldbuilding (3 modules) |
| 27 W4 | — | f9091eb | relevance-rank + voice-anchor (2 modules) |
| 27 W5 | — | fd7225d | POV/sensory/hook/rolling-briefs (4 polish modules) |
| 28.1 | — | 227aa55 | Default no-split for new novels |
| 28 TIER 1 | — | ddbfdac | Critic enforcement gates (canon-enforcement.ts) |
| 28 TIER 3.1+3.2+4 | — | 7ad8727 | Outline auto-revision + stress test harness + dashboard enhancements |
| 28 TIER 6 | — | 98d5ddf | Backfill canons script + retry handlers + integration tests |
| 28 docs | — | a5f52a9 | Documentation in CLAUDE.md + README.md + .claude/CLAUDE.md |
| 28 TIER 2 | — | 2dc30ba, 4cc5585, 4f8ec1e | File splits: templates.ts (3243→1365), chapter-writer.ts (2350→1554), context/assembler.ts (1407→879). 7 new focused modules. ~3200 LOC moved to single-responsibility files. |

### 5-layer architecture (post Phase 27 W1)

```
src/services/story-engine/
├── ARCHITECTURE.md              ← READ FIRST
├── canon/                       ← IMMUTABLE worldbuilding (set at setup)
│   ├── constraint-extractor.ts
│   ├── world-rules.ts           [W1.6 split from plot-tracker]
│   ├── factions.ts              [W2.5]
│   ├── power-system.ts          [W2.4]
│   └── worldbuilding.ts         [W3.3]
├── plan/                        ← STORY ARCHITECTURE
│   ├── master-outline.ts        (Phase 26 volume hierarchy)
│   ├── story-outline.ts
│   ├── seed-blueprint.ts
│   ├── foreshadowing.ts         (Phase 24 OVERDUE gate)
│   ├── pacing-director.ts
│   ├── plot-twists.ts           [W3.1]
│   ├── themes.ts                [W3.2]
│   └── chapter-briefs.ts        [W5.4]
├── state/                       ← LIVING STATE per chapter
│   ├── character-state.ts
│   ├── character-arcs.ts
│   ├── knowledge-graph.ts
│   ├── relationships.ts
│   ├── mc-power-state.ts
│   ├── geography.ts
│   ├── world-expansion.ts
│   ├── economic-ledger.ts
│   ├── plot-threads.ts          [W1.6 split]
│   ├── cast-database.ts         [W2.1]
│   ├── timeline.ts              [W2.2]
│   └── item-inventory.ts        [W2.3]
├── memory/                      ← HISTORICAL RECORD
│   ├── character-bibles.ts
│   ├── rag-store.ts
│   ├── beat-ledger.ts           [W1.6 split]
│   ├── voice-fingerprint.ts
│   ├── volume-summaries.ts
│   └── voice-anchor.ts          [W4.2]
├── quality/                     ← ASSESSMENT
│   ├── continuity-guardian.ts
│   ├── first-10-evaluator.ts
│   ├── quality-metrics.ts
│   ├── title-checker.ts
│   ├── consistency-check.ts     [W1.6 split]
│   ├── pov-check.ts             [W5.1]
│   ├── sensory-balance.ts       [W5.2]
│   ├── hook-strength.ts         [W5.3]
│   └── canon-enforcement.ts     [Phase 28 TIER 1]
├── context/                     ← SMART CONTEXT ASSEMBLY
│   ├── assembler.ts
│   ├── pre-write-qa.ts
│   └── relevance-rank.ts        [W4.1]
├── pipeline/                    ← ORCHESTRATION
│   ├── orchestrator.ts
│   ├── chapter-writer.ts
│   ├── setup-pipeline.ts
│   ├── auto-reviser.ts
│   ├── summary-orchestrator.ts
│   └── outline-reviser.ts       [Phase 28 TIER 3.1]
├── templates/
│   ├── genre-process-blueprints.ts
│   ├── genre-voice-anchors.ts
│   └── style-bible.ts
├── utils/                       ← infra
└── types.ts / config.ts / templates.ts / index.ts
```

### Đại thần workflow simulation (19/19 practices ✅)

| 大神 practice | Module | Phase |
|---|---|---|
| 卷宗 Volume hierarchy | plan/master-outline.ts | 26 |
| 伏笔表 Foreshadowing OVERDUE gate | plan/foreshadowing.ts | 24+26 |
| 悬念三层 Climax ladder | (volume context + Architect rules) | 26 |
| 角色档案 Cast database | state/cast-database.ts | 27 W2.1 |
| 时间线 Timeline tracker | state/timeline.ts | 27 W2.2 |
| 物品系统 Item inventory | state/item-inventory.ts | 27 W2.3 |
| 修炼体系 Power system canon | canon/power-system.ts | 27 W2.4 |
| 势力档案 Faction registry | canon/factions.ts | 27 W2.5 |
| 反转表 Plot twist registry | plan/plot-twists.ts | 27 W3.1 |
| 主题 Theme tracker | plan/themes.ts | 27 W3.2 |
| 设定集 Worldbuilding bible | canon/worldbuilding.ts | 27 W3.3 |
| Smart context selection | context/relevance-rank.ts | 27 W4.1 |
| 声音锚 Voice anchor | memory/voice-anchor.ts | 27 W4.2 |
| POV consistency | quality/pov-check.ts | 27 W5.1 |
| Sensory balance (5 senses) | quality/sensory-balance.ts | 27 W5.2 |
| Hook strength | quality/hook-strength.ts | 27 W5.3 |
| 日大纲 Rolling briefs | plan/chapter-briefs.ts | 27 W5.4 |
| Rubric judge (5 dims) | (Critic prompt + post-process) | 25 |
| First-10 quality gate | quality/first-10-evaluator.ts | 25 |

### 17 bugs fixed (Codex audit + Phase 27 design gaps)

| # | Bug | Phase |
|---|---|---|
| 1 | Critic REVISE gate advisory only | 24 |
| 2 | Split-memory (ch N+1 missing summary/RAG/state) | 24 |
| 3 | Continuity guardian skip-bug (`nextChapter%2` always odd) | 24 |
| 4 | Auto-revise updated wrong DB row | 24 |
| 5 | Auto-revise post-save (DB had bad content if revise failed) | 24 |
| 6 | `checkConsistency` discarded output | 24 |
| 7 | Guardian only promoted critical (major silently shipped) | 24 |
| 8 | Critic gate threshold mismatch (≥7 vs prompt ≥6) | 24 |
| 9 | No genre contract for Critic | 24 |
| 10 | `plot_threads` had reader but no writer | 24 |
| 11 | `checkConsistencyFast` silent error | 24 |
| 12 | Quality signals = keyword counts (gameable) | 25 |
| 13 | No first-10 quality gate | 25 |
| 14 | Master outline flat 8-12 arcs (too long for 1000ch) | 26 |
| 15 | No volume position context per chapter | 26 |
| 16 | Foreshadowing overdue rot — no hard gate | 26 |
| 17 | Climax markers existed but Architect/Critic didn't enforce | 26 |

### Migrations 0162-0170 (apply post-merge)

| # | Migration | Purpose |
|---|---|---|
| 0162 | first_10_evaluations | Phase 25 ch.1-10 quality gate |
| 0163 | story_timeline | Chapter ↔ in-world date |
| 0164 | item_events | Item picked/used/lost log |
| 0165 | power_system_canon | JSONB column on ai_story_projects |
| 0166 | factions | Faction registry + alliances |
| 0167 | plot_twists | Pre-planned twist registry |
| 0168 | story_themes | Theme + motifs tracker |
| 0169 | worldbuilding_canon | JSONB column on ai_story_projects |
| 0170 | voice_anchors | Ch.1-3 prose snippets |

### Cost (1000-chapter novel, DeepSeek V4 Flash)

With prompt caching ~70% hit rate: **~\$15-22 per novel**.

Per AI write at scale:
- 3 agent calls (Architect/Writer/Critic) ~\$0.014 input + \$0.007 output
- Pre-save extraction + per-part summaries: \$0.01-0.02
- Post-write enrichment (timeline/items/themes/threads/factions/etc.): \$0.005-0.010
- Heuristic gates (POV/sensory/hook/cast roster regex): FREE

Per-project setup (one-time): ~\$0.020 for power+world+twists+themes canons.

**No-split default** (Phase 28.1): chương dài ~2800 từ, halves agent calls vs split=2 → ~10-15% saving. Existing novels with `disable_chapter_split: false` keep working via per-part loop.

### Phase 28 TIER 1 — Critic enforcement (canon-enforcement.ts)

Phase 27 inject 11 canon/state context blocks for Architect. Critic only enforced 3. TIER 1 closes that gap.

`quality/canon-enforcement.ts` runs DETERMINISTIC gates AFTER Critic AI returns:
1. **Cast roster** — flag invented characters (≥10 = major, ≥5 = moderate)
2. **Timeline violations** — calls `detectTimelineViolations` (time-reversal, age regression)
3. **POV consistency** — calls `checkPovConsistency` (only fires if expectedPov set)
4. **Voice drift** — compare current vs ch.1-3 anchor metrics, fires every 50ch (or every chapter ≥500)
5. **Sensory floor** — score ≤2 = major
6. **Hook floor** — both opening+closing ≤3 = major

Major/critical issues auto-promote `requiresRewrite=true`.

Plus AI prompt rules added for: INVENTORY, POWER SYSTEM CANON commonViolations, WORLDBUILDING commonViolations, FACTIONS, PLOT TWISTS, THEMES, CAST ROSTER, TIMELINE, VOICE ANCHOR, ROLLING BRIEFS.

### Phase 28 TIER 3.1 — Outline auto-revision

`pipeline/outline-reviser.ts`:
- Triggers: `quality_trends.alert_level='critical'` 3 consecutive snapshots OR `first_10_evaluations.verdict='fail'`
- Workflow: Pause project (`pause_reason='outline_auto_revision: <trigger>'`) → Load 50 recent chapter summaries → AI revise upcoming volumes (keep locked volumes intact) → Persist + Resume
- Wired into `/api/cron/quality-trend/route.ts` — runs daily after trend snapshot

Admin dashboard `/admin/quality` surfaces "Outline auto-revisions" section with paused-for-revision projects + reason + timestamp.

### Phase 28 TIER 3.2 — Stress test harness

`scripts/stress-test-1000.ts`:
```bash
./node_modules/.bin/tsx scripts/stress-test-1000.ts <projectId> 800
```

Backfills synthetic chapter_summaries + character_states + voice_anchors up to (target-1), then invokes `writeOneChapter()` at target. Compares rubric scores vs ch.8 baseline → drift magnitude. >2.0 = pipeline producing materially different quality at scale.

### Phase 28 TIER 6 — Backfill + retry + tests

`scripts/backfill-canons.ts` — idempotently generate Phase 27 canons (power-system, worldbuilding, plot-twists, themes, voice-anchors) for existing pre-Phase-27 novels. ~\$0.020/project.

```bash
./node_modules/.bin/tsx scripts/backfill-canons.ts                # all active
./node_modules/.bin/tsx scripts/backfill-canons.ts <projectId>     # one project
./node_modules/.bin/tsx scripts/backfill-canons.ts --limit=20
```

`utils/retry-queue.ts` — added handlers for `plot_thread_ledger`, `factions`, `first_10_evaluation`. Aliases for orchestrator's namespaced task names (`task_15c_*`, etc.).

`__tests__/integration/canon-enforcement.test.ts` — 10 tests for POV/sensory/hook gates. Test count 71 → 81.

### Post-merge actions

1. **Apply migrations 0162-0170** in production Supabase
2. **Backfill existing novels**: `./node_modules/.bin/tsx scripts/backfill-canons.ts` (~\$2 for 100 projects)
3. **Spawn test novel** target=1000 (default no-split now). Setup pipeline auto-generates canons.
4. **Watch dashboards**:
   - `/admin/quality` — canon coverage, weak openings, outline revisions, cost
   - `/admin/supreme-goals` — 5 traffic lights per project
5. **Monitor cost_tracking** — verify ~\$0.01-0.02 per chapter at steady state

### Phase 28 TIER 2 — File splits (DONE 2026-05-01)

3 large files split into focused modules. Pure refactor — no behavior change. Re-exports preserve all external imports.

**templates.ts (3243 → 1365 lines, 58% reduction)**:
- `templates/sub-genre-rules.ts` (716 lines) — SUB_GENRE_RULES per-sub-genre patterns
- `templates/genre-boundaries.ts` (331 lines) — GENRE_BOUNDARIES + getGenreBoundaryText + GenreBoundary interface
- `templates/genre-styles.ts` (579 lines) — GENRE_STYLES per-genre StyleBible
- `templates/dopamine-patterns.ts` (300 lines) — DopaminePattern + DOPAMINE_PATTERNS

**chapter-writer.ts (2350 → 1554 lines, 34% reduction)**:
- `pipeline/chapter-writer-prompts.ts` (445 lines) — ARCHITECT_SYSTEM, WRITER_SYSTEM, CRITIC_SYSTEM, VN_PLACE_LOCK
- `pipeline/chapter-writer-helpers.ts` (586 lines) — pure helper functions: cleanContent, extractTitle, synthesizeFallbackCliffhanger, hasCliffhangerSignal, analyzeQualitySignals, buildSignalReport, countWords, detectHardFallback, detectMcNameFlip, detectSevereRepetition, buildRepetitionReport, generateMinimalScenes, loadConstraintSection + QualitySignals interface

**context/assembler.ts (1407 → 879 lines, 37% reduction)**:
- `context/generators.ts` (606 lines) — saveChapterSummary, generateChapterSummary, generateSummaryAndCharacters, generateSynopsis, generateArcPlan, generateStoryBible + AI response interfaces

### Truly deferred (Phase 28+ backlog, not blocking)

- **TIER 3.3** ai-editor V2 migration: admin-only tool for chapter quality re-scanning/rewriting. All 13 V1 `story-writing-factory/` files transitively imported by `ai-editor.ts`. Migration = deep rewrite using V2 modules (continuity-guardian + auto-revise + Critic). 1-2 days work, separate PR scope.
- **TIER 5** Reader feedback loop: comments/ratings/drop-offs feeding back into engine. Requires production novels with engagement data first. 2-3 weeks scope.
- **Per-task retry handlers** for tasks lacking payload to fully replay (currently mark succeeded to drain queue).

### Verified at every commit
- `npx tsc --noEmit` ✅ pass
- `npx jest` ✅ 81/81 tests pass
- 30+ file moves with 0 broken imports
- Cumulative: ~5500 LOC added, ~4100 LOC deleted (net code health: positive)

### Daily commands

```bash
# Verify pipeline
npm run typecheck                                                      # tsc --noEmit
npm test                                                               # jest 81/81
./node_modules/.bin/tsx scripts/stress-test-1000.ts <projectId> 800     # stress test at scale
./node_modules/.bin/tsx scripts/backfill-canons.ts --limit=20          # backfill canons

# Watch
curl -H "Authorization: Bearer $CRON_SECRET" https://truyencity.com/api/cron/quality-trend  # daily quality drift check + auto-revision
```
