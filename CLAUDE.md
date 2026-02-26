# CLAUDE.md - TruyenCity AI Story Writer

## Project Overview

TruyenCity la nen tang viet truyen tu dong bang AI, ho tro viet truyen dai 1000-2000 chuong voi kha nang "1 Click = 1 Chuong hoan chinh".

**Stack**: Next.js 15, React 19, TypeScript, Supabase (PostgreSQL + pgvector + pg_cron), Google Gemini AI, Vercel Pro
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
- **Model**: `gemini-3-flash-preview` (thinking model)
- **IMPORTANT**: KHONG dung `frequencyPenalty`/`presencePenalty` - thinking models khong support, se tra content rong
- **IMPORTANT**: Gemini tier 3 unlimited — khong can client-side rate limiter
- **Embeddings**: `gemini-embedding-001`, 768 dims, `outputDimensionality` param

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

V1 (`story-writing-factory/`) has ~38 files but only **7 are still actively imported** by API routes:
- `/api/cron/daily-spawn` → `ContentSeeder`
- `/api/admin/ai-editor` → `aiEditorService`
- `/api/ai-authors/generate` → `AuthorGenerator`
- `/api/seed/generate-content` → `ContentSeeder`
- `/api/seed/enrich-novels` → `NovelEnricher`

The remaining ~31 files are dead. Full V1 removal requires migrating these 5 routes to V2 equivalents.

## Phase 10 Details (2026-02-26) — Genre Completion + Ratings Fix

### 10A — 6 Missing Genres Added to Daily Spawn
- **10A-1**: Added 6 genre entries to `GENRE_CONFIG` in `genre-config.ts`: kiem-hiep (7 topics), mat-the (7 topics), linh-di (7 topics), quan-truong (6 topics), di-gioi (7 topics), ngon-tinh (8 topics) — all 13 genres now spawn
- **10A-2**: Added `SOURCE_TOPIC_SEEDS` for 6 genres in `content-seeder.ts`: kiem-hiep (8), mat-the (9), linh-di (9), quan-truong (8), di-gioi (9), ngon-tinh (10) seed descriptions
- Total: 42 new topics with 3-4 topicPromptHints each, 53 new seed descriptions

### 10B — Ratings Aggregate Migrated to DB-Level RPC
- **10B-1**: Replaced client-side JS average in `/api/ratings/route.ts` with `get_novel_stats()` RPC (single DB call returns rating_avg + rating_count)
- **10B-2**: Replaced 3-query parallel fetch in `/app/truyen/[slug]/page.tsx` with single `get_novel_stats()` RPC (also returns view_count, bookmark_count — fewer DB calls)
- **10B-3**: Fixed mobile novel detail column name bug (`r.rating` → uses RPC `get_novel_stats()` instead of broken `.select("rating")` query)

## Remaining Known Issues

### Low Priority (deferred)
- None currently tracked

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

**Last Updated**: 2026-02-26
**Latest Commit**: `a3d995b` (Quality Phase 5)
**All 5 quality phases complete** — Phases 1-5 shipped to production
**Phase 10 complete** — 6 missing genres + ratings RPC migration
