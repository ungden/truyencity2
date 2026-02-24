# CLAUDE.md - TruyenCity AI Story Writer

## Project Overview

TruyenCity là nền tảng viết truyện tự động bằng AI, hỗ trợ viết truyện dài 1000-2000 chương với khả năng "1 Click = 1 Chương hoàn chỉnh".

## Architecture

### Story Engine v2 (Current - 2026-02-18)

**Location**: `src/services/story-engine/`

V2 là rewrite từ v1 (`story-writing-factory/`) với architecture tối ưu hơn. Now 19 files (~4,700 lines) with 6 new quality modules.

```
src/services/story-engine/
├── index.ts                    # Public API: writeChapterForProject()
├── types.ts                    # All type definitions
├── config.ts                   # Re-exports from v1 templates.ts
├── utils/
│   ├── gemini.ts               # Gemini REST API client (NO penalty params!)
│   ├── supabase.ts             # Singleton Supabase client
│   └── json-repair.ts          # JSON extraction & repair
├── pipeline/
│   ├── context-assembler.ts    # 4-layer context + post-write generators
│   ├── chapter-writer.ts       # 3-agent: Architect → Writer → Critic
│   └── orchestrator.ts         # Main entry, 12 parallel post-write tasks
└── memory/
    ├── rag-store.ts            # Chunk + embed + vector search
    ├── character-tracker.ts    # Extract + save character states
    ├── plot-tracker.ts         # Plot threads + beat ledger + rule indexer
    ├── summary-manager.ts      # Synopsis + bible triggers + StoryVision + quality module triggers
    ├── constraint-extractor.ts # Per-project world rules from DB
    ├── style-bible.ts          # Rich style context + vocabulary + pacing
    ├── title-checker.ts        # Title similarity + optimization
    ├── foreshadowing-planner.ts   # [NEW] Long-range hint planning (50-500ch apart)
    ├── character-arc-engine.ts    # [NEW] Character development + signature traits
    ├── pacing-director.ts         # [NEW] Per-arc pacing blueprints (10 mood types)
    ├── voice-fingerprint.ts       # [NEW] Style fingerprint + drift detection
    ├── power-system-tracker.ts    # [NEW] MC power state + anti-plot-armor
    └── world-expansion-tracker.ts # [NEW] World map + location bibles
```


### Quality Audit & Đại Thần Level Fixes (2026-02-24)

**Full audit report**: `docs/quality-audit-v1.md`

Scored chapters 160-163 against 10-dimension rubric comparing to đại thần authors. **Overall: 5.8/10** ("competent but clearly AI-generated"). Implemented 5 fixes targeting the biggest gaps:

- **P0: Anti-Repetition System** — Added `colorRepetitionRule` to `ANTI_CLICHE_RULES` in templates.ts. Added `buildRepetitionReport()` (JS word frequency analyzer) and `detectSevereRepetition()` (hard enforcement) in chapter-writer.ts. Critic now receives automated repetition report. Words appearing 8+ times trigger forced rewrite; 5+ times trigger score penalty.
- **P1: Mandatory Comedy** — Added rule 10 to ARCHITECT_SYSTEM requiring `comedyBeat` field in outline JSON. Writer prompt now enforces comedy beat per chapter. Critic checks for humor and creates major issue if absent.
- **P2: Pacing Variety** — Added rule 9 to ARCHITECT_SYSTEM requiring `slowScene` field (at least 1 slow/breathing scene per chapter). Writer prompt enforces rhythm diversity. Critic caps pacingScore at 5 if all scenes are same intensity.
- **P3: Character Voice Differentiation** — Rewrote `buildCharacterVoiceGuide()` with concrete speech rules per role (MC: short/direct/self-deprecating, AI companion: technical/sarcastic, high-level villain: polite/metaphorical, low-level villain: crude/short, etc.).
- **P4: Emotional Depth** — Added "3-layer inner monologue" rule to WRITER_SYSTEM with concrete example. Critic checks for multi-layered inner thoughts and creates moderate issue if absent.

**New types**: `comedyBeat?: string` and `slowScene?: string` added to `ChapterOutline` in types.ts.

**Estimated improvement**: 58/100 → 68-72/100.

### Quality Stabilization Round 2 (2026-02-24)

6 fixes addressing post-audit issues (Critic paradox, false positives, data quality, subtext, foreshadowing, cliffhanger):

- **P1: Critic Calibration** — Quality checks (comedy, inner monologue, voice) downgraded from `major` to `moderate` severity. Only `critical` or `≥3 major` penalize overallScore. Prevents unnecessary rewrites on decent chapters (Ch164 scored 5/10 due to over-strict checks).
- **P2: Contextual Repetition** — `detectSevereRepetition()` now categorizes words: `generic` (tím sẫm, kinh hoàng) keeps strict thresholds (5/8), `plot_element` (rỉ sét, pixel hóa, linh khí, đan điền) uses relaxed thresholds (8/12). Prevents false positives on plot keywords.
- **P3: Character Name Validation** — Added `isValidCharacterName()` filter in character-tracker.ts. Rejects numbers-only ('001'), single chars, generic labels ('NPC', 'villain'), too-long names. Improved AI prompt to explicitly prohibit non-name extractions.
- **P4: Dialogue Subtext** — Enhanced Writer prompt with 5 concrete subtext techniques (Nói A hiểu B, trả lời bằng hành động, im lặng có nghĩa, lời nói VS hành động mâu thuẫn, hỏi để đe dọa). Added Critic check #9 for straight Q&A dialogue detection.
- **P5: Foreshadowing Lifecycle** — Added stale hint abandonment: planned hints >10 chapters overdue auto-abandon, planted hints >20 chapters past payoff deadline auto-abandon. Added overdue hint urgency warnings in `getForeshadowingContext()`.
- **P6: Cliffhanger Variety** — Expanded `CLIFFHANGER_TECHNIQUES` from 5→13 types (added business/emotional/mystery categories). Architect prompt now explicitly requires choosing a DIFFERENT type from recent chapters.

**Files modified**: chapter-writer.ts, character-tracker.ts, foreshadowing-planner.ts, style-bible.ts, CLAUDE.md

### Production Quality Audit & Fixes (2026-02-24)

Full production audit of 90 active projects (50+ novels writing in parallel, 1 chapter/cron cycle each). Scored system health, identified 3 critical module failures, and fixed them.

**Audit Results (before fixes)**:
- Word count: avg=3170, min=2388, max=4290. **0% under 2000 words** ✅
- Chapter summaries: 100% cliffhanger, 0% degraded ✅ (was 49% before)
- mc_state: only 55% populated ⚠️
- Character names: 178 unique, only 3 garbage (2%) ✅
- **foreshadowing_plans: 13 rows** (should be hundreds) ❌
- **arc_pacing_blueprints: 3 rows** ❌
- **location_bibles: 13 rows** ❌
- Content quality spot-check: Comedy 1-4/ch ✅, Inner monologue 2-3 ✅, Dialogue ~43% ✅

**Root Cause**: Quality module triggers (foreshadowing, pacing, worldmap) were chained inside `tryGenerateArcPlan()` AFTER the `if (existing) return;` guard. Since arc plans for arcs 2-8 were generated before quality module code was deployed, the guard skipped the entire function — quality modules never executed.

**Fixes Applied**:
- **P0: Decoupled quality module triggers** — Moved foreshadowing/pacing/worldmap generation OUTSIDE the arc plan existence guard in summary-manager.ts. Now runs regardless of whether arc plan already existed (each module has its own internal guard).
- **P1: Arc-boundary catch-up** — Added `tryEnsureQualityModules()` triggered on first chapter of each arc (ch 21, 41, 61...) to backfill missing modules for the current arc.
- **P2: mc_state fallback** — Added `extractFallbackMcState()` in context-assembler.ts. If AI returns empty mcState, extracts cultivation/power/condition keywords from chapter tail.
- **P3: Character name filter tightened** — Added rejection for parenthesized group descriptions and comma-separated lists. Cleaned 8 garbage names from DB.
- **P4: Backfill script** — Created `scripts/backfill-quality-modules.ts`. Ran for all 90 projects: 0 errors.

**Post-fix Data**:
- foreshadowing_plans: 13 → **384 rows** (90 projects)
- arc_pacing_blueprints: 3 → **96 rows** (90 projects)  
- location_bibles: 13 → **368 rows** (48+ projects with master_outline)

**Files modified**: summary-manager.ts, context-assembler.ts, character-tracker.ts, scripts/backfill-quality-modules.ts

### Qidian Master Update (2026-02-22)
- **Master Outline System:** Added `generateMasterOutline` which runs in the background upon project creation to build a 2000-chapter skeleton (main plot, final boss, world map). Injected as Layer 0.5 in Context Assembler.
- **Scene Expansion Rules:** Enforced 5-senses description, layered inner monologues, and bystander reactions to reach natural 2500+ word counts (Anti-summarize).
- **Comedy & Subtext:** Added `COMEDY_MECHANICS_RULES` (Overthinking, Shameless, Gap Moe) and `SUBTEXT_DIALOGUE_RULES` to fix generic AI tones.
- **Anti-Cliche Dictionary:** Banned repetitive AI phrases like "Hít một ngụm khí lạnh".
- **Logic Checkers:** Enhanced Plot Tracker to verify business/finance logic using fast LLM calls. Added `personality_quirks` to Character Tracker.
- **10 New Super Genres (Wave 4):** Sáng Thế, Đệ Tứ Thiên Tai, Tứ Hợp Viện, Dị Thú, Thần Bút, Lưỡng Giới Mậu Dịch, Cá Mặn, Vô Địch, Phản Phái, Bộc Quang.

### Daily Spawn Reliability Update (2026-02-22)
- **spawnDailyNovels fix:** New projects now generate `master_outline` and `story_outline` inside daily spawn flow (not only bulk seed flow).
- **Performance hardening:** Genre idea generation in daily spawn now runs in parallel batches to keep total runtime under pg_cron HTTP timeout.
- **Production validation:** `daily-spawn?target=20` verified successful on `truyencity2.vercel.app` after deploy.
- **Data backfill:** Missing outlines/covers for projects created during test/deploy were backfilled.
- **Operational decision:** Keep test-spawned novels (already valid data) instead of deleting.

### Key Features Ported from v1 (36 items)

#### HIGH Priority (9)
1. **Critic fail-closed** - Không auto-approve khi lỗi (line 576-587)
2. **Critic hard-enforce continuity & cliffhanger** - Bắt buộc rewrite nếu thiếu ending hook ở non-finale (line 546-560)
3. **Critic FULL content** - Không cắt 8000 chars nữa (line 509)
4. **finishReason check** - Phát hiện truncate, log warning (line 273-276)
5. **Architect scene fallback** - Tối thiểu 4 scenes (line 310-314)
6. **Scene word estimate correction** - Fix nếu total < 80% target (line 316-323)
7. **Rewrite instructions → Writer** - Pass vào cả Writer, không chỉ Architect (line 400-405)
8. **Constraint Extractor** - Load per-project rules từ DB (line 659-709)
9. **Topic section** - topicPromptHints + parallel world ban (line 711-717)

#### MEDIUM Priority (16)
10. **Multi-POV** - `pov` field trong SceneOutline (types.ts line 96)
11. **Character Voice Guide** - Giọng riêng mỗi nhân vật (line 760-780)
12. **Emotional Arc** - Opening/midpoint/climax/closing (line 415-420)
13. **Golden Chapter Requirements** - Ch.1-3 special rules (line 256-258)
14. **Vocabulary Hints** - Injection theo scene type (line 761-794)
15. **Rich Style Context** - Per-scene pacing rules (line 395-399)
16. **Cliffhanger dedup** - Từ structured summary
17. **Title similarity check** - 70% threshold fallback (line 649-666)
18. **isFinalArc** - Trong prompt, không cliffhanger (line 235-242)
19. **ENGAGEMENT_CHECKLIST** - Per chapter requirements (line 225-233)
20. **Synopsis structured fields** - mc_state, allies, enemies, threads (context-assembler.ts line 67-77)
21. **ArcPlan threads injection** - advance/resolve/new (line 180-195)
22. **StoryVision** - Từ synopsis + arc plans (summary-manager.ts line 265-297)
23. **shouldBeFinaleArc()** - AI detection (line 215-231)
24. **refreshStoryBible()** - Dùng synopsis + recent chapters, không chỉ 3 chương đầu (line 170-213)
25. **Story outline persistence** - Support trong types

### API Flow

```
writeOneChapter() [orchestrator.ts]
  ├── loadContext() [context-assembler.ts]
  │   ├── Layer 0: Chapter Bridge (previous summary, cliffhanger, MC state)
  │   ├── Layer 1: Story Bible
  │   ├── Layer 2: Rolling Synopsis (structured fields)
  │   ├── Layer 3: Recent Chapters (5 chương × 5K chars)
  │   └── Layer 4: Arc Plan (threads injection)
  ├── Inject quality modules (6 parallel, non-fatal)
  │   ├── getForeshadowingContext()
  │   ├── getCharacterArcContext()
  │   ├── getChapterPacingContext()
  │   ├── getVoiceContext()
  │   ├── getPowerContext()
  │   └── getWorldContext()
  ├── writeChapter() [chapter-writer.ts]
  │   ├── runArchitect() - Tạo outline với constraints, emotional arc, golden rules
  │   ├── runWriter() - Viết content với style context, vocab hints, multi-POV
  │   └── runCritic() - Review với continuity check, fail-closed
  └── 12 parallel post-write tasks (all non-fatal)
      ├── runSummaryTasks() - Synopsis, arc plan, bible + quality module triggers
      ├── extractAndSaveCharacterStates()
      ├── chunkAndStoreChapter() - RAG
      ├── detectAndRecordBeats()
      ├── extractRulesFromChapter()
      ├── checkConsistency()
      ├── updateForeshadowingStatus()
      ├── updateCharacterArcs()
      ├── updateVoiceFingerprint() - every 10 chapters
      ├── updateMCPowerState() - every 3 chapters
      ├── updateLocationExploration()
      └── prepareUpcomingLocation()
```

## Critical Configuration

### AI Model
- **Model**: `gemini-3-flash-preview` (thinking model)
- **IMPORTANT**: KHÔNG dùng `frequencyPenalty`/`presencePenalty` - thinking models không support, sẽ trả content rỗng
- **Embeddings**: `gemini-embedding-001`, 768 dims, `outputDimensionality` param

### Database
- **Supabase pgvector** (premium plan)
- **pg_cron**: Single source of truth cho scheduling
- **Secrets**: Supabase Vault - không hardcode

### Feature Flag
- `USE_STORY_ENGINE_V2=true` trên Vercel → v2 đang chạy production
- V1 (`story-writing-factory/`) vẫn còn, chưa xóa (Phase 7 pending)

## Important Notes for AI Assistants

### 1. Chapter Writer Logic [chapter-writer.ts]

**3-Agent Pipeline**:
- **Architect**: Tạo outline với min 4 scenes, emotional arc, golden rules
- **Writer**: Viết content với constraints, vocab hints, multi-POV guidance
- **Critic**: Review với full content, hard-enforce continuity issues

**Retry Logic**:
- Max 3 attempts
- Nếu Critic yêu cầu rewrite → pass instructions vào cả Writer và Architect lần sau
- Fail-closed: Nếu Critic lỗi → không approve, trả về requiresRewrite nếu word count < 60%

### 2. Context Assembly [context-assembler.ts]

**4 Layers** (theo thứ tự priority):
1. **Chapter Bridge**: Previous cliffhanger (PHẢI giải quyết), MC state, 300 chars cuối
2. **Story Bible**: World rules, power system
3. **Rolling Synopsis**: + structured fields (mc_state, allies, enemies, open_threads)
4. **Arc Plan**: Chapter brief + threads (advance/resolve/new)

**Non-fatal Modules** (catch errors, don't crash):
- RAG context retrieval
- Constraint extraction
- All post-write tasks

### 3. Post-Write Tasks [summary-manager.ts]

**Trigger Conditions**:
- **Synopsis**: Every 5 chapters
- **Arc Plan**: At arc boundaries (every 20 chapters)
- **Story Bible**: Ch.3, then every 150 chapters
- **StoryVision**: On demand (not automatic)

**Arc-Triggered Quality Module Generation** (when a new arc plan is generated):
- `generateForeshadowingAgenda()` — Plan hints for the new arc
- `generatePacingBlueprint()` — Create mood blueprint for the new arc
- `initializeWorldMap()` — Initialize world map (only once, first arc)

**shouldBeFinaleArc()**:
- Remaining <= 10 chapters → true
- Progress >= 95% → true
- Progress >= 85% AND open threads <= 2 → true

### 4. Types [types.ts]

**Key Types**:
```typescript
// Multi-POV support
interface SceneOutline {
  order: number;
  setting: string;
  characters: string[];
  goal: string;
  conflict: string;
  resolution: string;
  estimatedWords: number;
  pov?: string;  // Per-scene POV
}

// Emotional arc
interface ChapterOutline {
  // ... other fields
  emotionalArc?: {
    opening: string;
    midpoint: string;
    climax: string;
    closing: string;
  };
}

// Structured synopsis
interface ContextPayload {
  synopsis?: string;
  synopsisStructured?: {
    mc_current_state?: string;
    active_allies?: string[];
    active_enemies?: string[];
    open_threads?: string[];
  };
  arcPlanThreads?: {
    threads_to_advance?: string[];
    threads_to_resolve?: string[];
    new_threads?: string[];
  };
}
```

### 5. Constraints [constraint-extractor.ts]

**World Constraints** từ DB (`world_constraints` table):
- Category: quantity | hierarchy | rule | geography | character_limit | power_cap
- Immutable vs Mutable
- Auto-load theo keywords (character names, locations)

### 6. Style & Vocabulary [style-bible.ts]

**Pacing Rules** per SceneType:
- action: fast, short sentences, low dialogue
- cultivation: slow, long sentences, description-heavy
- dialogue: medium, high dialogue ratio
- tension: fast, very short sentences

**Vocabulary Injection**:
- Động từ chiến đấu (action scenes)
- Từ đột phá (cultivation scenes)
- Cảm xúc (theo dopamine points)
- Xưng hô (honorifics)

## Common Tasks

### Daily Spawn / Cron Checklist

1. Verify endpoint manually: `GET /api/cron/daily-spawn?target=1` with `Authorization: Bearer $CRON_SECRET`
2. Validate newly created project has both `master_outline` and `story_outline`
3. For `target=20`, ensure runtime stays below pg_cron `net.http_get` timeout
4. If missing outlines appear, run `npx tsx scripts/fix-missing-data.ts`

### Thêm Feature Mới vào Chapter Writer

1. **Update types.ts** - Thêm field vào interface nếu cần
2. **Update chapter-writer.ts**:
   - Thêm vào ARCHITECT_SYSTEM hoặc WRITER_SYSTEM prompt
   - Thêm logic trong runArchitect() hoặc runWriter()
   - Nếu liên quan Critic → update CRITIC_SYSTEM và runCritic()
3. **Update context-assembler.ts** - Nếu cần load thêm data từ DB
4. **Run tests** - `npm test`
5. **Type check** - `npm run typecheck`

### Fix Bug trong Pipeline

1. **Check 3-agent flow**:
   - Architect output có đúng format?
   - Writer có nhận đủ context?
   - Critic có nhận full content?
2. **Check non-fatal handling**:
   - Có try-catch đúng chỗ?
   - Có `.catch(() => {})` trong Promise.all?
3. **Check types**:
   - Interface có đầy đủ fields?
   - Optional vs required đúng chưa?

### Thêm Memory Module Mới

1. Tạo file trong `memory/` (ví dụ: `new-tracker.ts`)
2. Export functions chính
3. Import trong `orchestrator.ts` và thêm vào Promise.all post-write tasks
4. Mark as non-fatal: `.catch(() => {})`

## Testing

```bash
# Run all tests
npm test

# Type check
npm run typecheck

# Dev server
npm run dev
```

**Test Coverage**: 60 passing, 1 known failure (critic rejects mock 18-word chapter) ✅

## Git Workflow

```bash
# Commit message format
feat: description
fix: description
refactor: description
docs: description

# Push to production
git push  # Auto deploy to Vercel
```

## V1 vs V2

| Aspect | V1 (story-writing-factory/) | V2 (story-engine/) |
|--------|---------------------------|-------------------|
| Files | 41 files, 28,470 lines | 19 files, ~4,700 lines |
| Architecture | Monolithic class | Modular pipeline |
| AI Calls | Multiple per agent | 3 calls (Architect→Writer→Critic) |
| Context | Manual assembly | 4-layer automatic + 6 quality modules |
| Post-write | Sequential | 12 parallel tasks |
| Status | Legacy (kept for reference) | Production (USE_STORY_ENGINE_V2=true) |

## Important Files to Read

Khi làm việc với story engine:

1. **types.ts** - Hiểu data structures
2. **chapter-writer.ts** - Hiểu 3-agent pipeline
3. **context-assembler.ts** - Hiểu 4-layer context
4. **orchestrator.ts** - Hiểu overall flow
5. **templates.ts** (trong v2) - Genre configs, GOLDEN_CHAPTER_REQUIREMENTS, ENGAGEMENT_CHECKLIST
6. **check-v2-status.ts** - Script kiểm tra trạng thái production của v2 (throughput, metrics, cliffhanger quality)

## Contact & Support

- Repo: https://github.com/ungden/truyencity2
- Current commit: (pending — 6 quality modules + integration)
- Previous: `0a94924` (audit bug fixes), `090b800` (parallelize daily spawn)

---

**Last Updated**: 2026-02-24
**Author**: AI Assistant (Claude)
