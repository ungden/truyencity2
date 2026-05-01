# Story Engine Architecture

5-layer architecture inspired by **đại thần workflow** (top web novel author practices).
Each layer has a single responsibility — no overlap.

## Layers

```
canon/    — IMMUTABLE worldbuilding (set at project setup, refined occasionally)
plan/     — STORY ARCHITECTURE (volumes/sub-arcs, foreshadowing, climax ladder)
state/    — LIVING STATE (per-chapter snapshots: characters, items, factions)
memory/   — HISTORICAL RECORD (immutable per-chapter: summaries, RAG, beats)
quality/  — ASSESSMENT layer (per-chapter judgment: rubric, consistency, gates)
context/  — SMART CONTEXT ASSEMBLY (selects what to feed the AI)
pipeline/ — ORCHESTRATION (Architect+Writer+Critic flow)
templates/ — GENRE-SPECIFIC (style, voice, blueprints)
utils/    — INFRA (DeepSeek/Gemini, JSON repair, retry queue)
```

## Layer rules

### canon/ — IMMUTABLE worldbuilding
- Set at project setup, only refined occasionally
- Single source of truth for "how does this world work"
- Modules:
  - `constraint-extractor.ts` — extract per-project world rules from DB
  - `world-rules.ts` — rule indexer (organic post-write extraction)
  - `power-system.ts` (Phase 27 W2.4) — cảnh giới ladder + breakthroughs RULES generated at setup, JSONB column
  - `factions.ts` (Phase 27 W2.5) — sect/clan/political registry + alliances + rivalries
  - `worldbuilding.ts` (Phase 27 W3.3) — comprehensive bible (cosmology + history + cultures + regions + economy)

### plan/ — STORY ARCHITECTURE
- The skeleton of the novel: outline, volumes, sub-arcs, climax markers, themes
- Refined as the story progresses but doesn't track per-chapter state
- Modules:
  - `master-outline.ts` — volume hierarchy generator (Phase 26: 5-15 volumes × 4-6 sub-arcs)
  - `story-outline.ts` — premise + protagonist + plot points
  - `seed-blueprint.ts` — world_description blueprint at setup
  - `foreshadowing.ts` — hint register + OVERDUE deterministic gate (Phase 24)
  - `pacing-director.ts` — per-arc mood + tension blueprints
  - `plot-twists.ts` (Phase 27 W3.1) — pre-planned reveal registry + setup chain
  - `themes.ts` (Phase 27 W3.2) — main + supporting themes + motif tracking
  - `chapter-briefs.ts` (Phase 27 W5.4) — rolling 5-chapter ahead briefs

### state/ — LIVING STATE
- Per-chapter snapshots of in-world state
- Changes every chapter
- Modules:
  - `character-state.ts` — per-chapter snapshot + contradiction detection
  - `character-arcs.ts` — character development tracking
  - `knowledge-graph.ts` — who knows what when
  - `relationships.ts` — dynamic relationship graph
  - `mc-power-state.ts` — MC's current power level + breakthroughs
  - `geography.ts` — locations visited + transitions
  - `world-expansion.ts` — region unlock tracking
  - `economic-ledger.ts` — do-thi/quan-truong financial tracking
  - `plot-threads.ts` (Phase 27 W1.6 split) — open/developing/resolved threads + AI extractor
  - `cast-database.ts` (Phase 27 W2.1) — every named char with latest state
  - `timeline.ts` (Phase 27 W2.2) — chapter ↔ in-world date + age progression
  - `item-inventory.ts` (Phase 27 W2.3) — item picked/used/lost event log

### memory/ — HISTORICAL RECORD
- Immutable per-chapter records (write-once)
- Used for retrieval/anchoring, not for active state
- Modules:
  - `character-bibles.ts` — consolidated profiles (refresh every 20ch)
  - `rag-store.ts` — vector chunks for semantic retrieval
  - `beat-ledger.ts` (Phase 27 W1.6 split) — beat usage tracking with cooldowns
  - `voice-fingerprint.ts` — prose style fingerprint per chapter
  - `volume-summaries.ts` — rolled-up volume bibles (every 25ch)
  - `voice-anchor.ts` (Phase 27 W4.2) — lock ch.1-3 prose, refresh every 50ch

### quality/ — ASSESSMENT
- Per-chapter quality judgment (rubric, consistency, gates)
- Not a state holder — outputs go to log/metrics/auto-revise
- Modules:
  - `continuity-guardian.ts` — 4th-agent biên-tập-viên pass
  - `first-10-evaluator.ts` (Phase 25) — opening quality gate at ch.10
  - `quality-metrics.ts` — per-chapter rubric + drift metrics
  - `title-checker.ts` — title similarity check
  - `consistency-check.ts` (Phase 27 W1.6 split) — regex + AI consistency
  - `pov-check.ts` (Phase 27 W5.1) — POV consistency
  - `sensory-balance.ts` (Phase 27 W5.2) — 5-sense description balance
  - `hook-strength.ts` (Phase 27 W5.3) — opening + closing hook scoring
  - `canon-enforcement.ts` (Phase 28 TIER 1) — centralized deterministic gates

### context/ — SMART CONTEXT ASSEMBLY
- Aggregates layers into the prompt that goes to the AI
- Smart selection at scale (relevance ranking, budget enforcement)
- Modules:
  - `assembler.ts` — load 4 layers + inject 11 canon/state blocks (879 lines after Phase 28 TIER 2 split)
  - `generators.ts` (Phase 28 TIER 2 split) — post-write AI generators (saveChapterSummary, generateSynopsis, generateArcPlan, generateStoryBible, generateSummaryAndCharacters)
  - `pre-write-qa.ts` — entity Q&A digest before writing
  - `relevance-rank.ts` (Phase 27 W4.1) — smart selection at ch.500+

### pipeline/ — ORCHESTRATION
- Coordinates the Architect+Writer+Critic flow + post-write tasks
- The "main" of the engine — reads from canon/plan/state/memory, writes to state/memory
- Modules:
  - `orchestrator.ts` — top-level: setup self-heal + write loop + per-part post-write + aggregate cadence
  - `chapter-writer.ts` (1554 lines after Phase 28 TIER 2 split) — Architect + Writer + Critic 3-agent pipeline
  - `chapter-writer-prompts.ts` (Phase 28 TIER 2 split) — system prompts (ARCHITECT_SYSTEM, WRITER_SYSTEM, CRITIC_SYSTEM, VN_PLACE_LOCK)
  - `chapter-writer-helpers.ts` (Phase 28 TIER 2 split) — pure helpers (cleanContent, extractTitle, detectMcNameFlip, detectSevereRepetition, etc.)
  - `setup-pipeline.ts` — project init state machine
  - `auto-reviser.ts` — pre-save auto-revision on critical contradictions
  - `summary-orchestrator.ts` — post-write summary + cadence-gated synopsis/arc/bible
  - `outline-reviser.ts` (Phase 28 TIER 3.1) — auto-revise outline on quality drift

### templates/ — GENRE-SPECIFIC
- Per-genre style, voice, blueprints
- Modules:
  - `genre-process-blueprints.ts` — per-genre setup + arc + scene-types blueprint
  - `genre-voice-anchors.ts` — per-genre voice hint
  - `style-bible.ts` — sceneType + vocabulary types
  - `dopamine-patterns.ts` (Phase 28 TIER 2 split) — DOPAMINE_PATTERNS data
  - `genre-styles.ts` (Phase 28 TIER 2 split) — GENRE_STYLES per-genre StyleBible
  - `genre-boundaries.ts` (Phase 28 TIER 2 split) — GENRE_BOUNDARIES + drift detection
  - `sub-genre-rules.ts` (Phase 28 TIER 2 split) — SUB_GENRE_RULES per-tag patterns

### utils/ — INFRA
- DeepSeek/Gemini clients, JSON repair, retry queue, model tier router
- Standard infra modules

## Data flow per chapter write

```
                                ┌────────────────────────────┐
                                │ 1. SETUP (one-time)        │
                                │    canon/* + plan/* generated │
                                └────────────────────────────┘
                                              │
                                              ▼
┌─────────────┐  ┌──────────────────────────────────────────────────────┐
│ Per chapter │  │ 2. CONTEXT ASSEMBLY (context/assembler)               │
│             │  │    Reads canon + plan + state + memory                │
│   trigger   │  │    Smart-selects, budget-caps                         │
└─────────────┘  └──────────────────────────────────────────────────────┘
                                              │
                                              ▼
                 ┌──────────────────────────────────────────────────────┐
                 │ 3. WRITE (pipeline/chapter-writer)                    │
                 │    Architect → Writer → Critic                         │
                 │    Quality gates: rubric, repetition, name-flip       │
                 └──────────────────────────────────────────────────────┘
                                              │
                                              ▼
                 ┌──────────────────────────────────────────────────────┐
                 │ 4. PRE-SAVE QA (pipeline/orchestrator step 4.5)       │
                 │    consistency, guardian, foreshadowing OVERDUE       │
                 │    auto-revise on critical issues                     │
                 │    THROW if revise fails — chapter NOT saved          │
                 └──────────────────────────────────────────────────────┘
                                              │
                                              ▼
                 ┌──────────────────────────────────────────────────────┐
                 │ 5. SAVE + UPDATE STATE                                │
                 │    chapters table, current_chapter bump               │
                 │    state/* updates per reader chapter                  │
                 │    memory/* records (summary, RAG, beats)              │
                 │    plan/* refinements (foreshadowing status, plot threads) │
                 │    quality/* metrics                                   │
                 └──────────────────────────────────────────────────────┘
```

## Dependency rules

- `canon/` cannot depend on `state/`, `memory/`, `quality/`, `context/`, `pipeline/`
- `plan/` can depend on `canon/`, `templates/`, `utils/`
- `state/` can depend on `canon/`, `templates/`, `utils/`
- `memory/` can depend on `canon/`, `templates/`, `utils/`, `state/` (read-only for snapshots)
- `quality/` can depend on `canon/`, `plan/`, `state/`, `memory/`, `templates/`, `utils/`
- `context/` can depend on all of `canon/plan/state/memory/templates/utils`
- `pipeline/` can depend on everything (it's the conductor)
- `templates/` only depends on `utils/` and types
- `utils/` is leaf (only depends on external libs)

## Why this structure

Đại thần (top web novel authors) maintain mental models that map cleanly to these layers:
- **Canon** = "settings collection" (设定集) — never changes after setup
- **Plan** = "outline + foreshadowing log" (大纲 + 伏笔表) — refined as written
- **State** = "where is everyone now" (人物状态) — living document
- **Memory** = "what already happened" (章节脉络) — written record
- **Quality** = "is this chapter good" — biên tập viên review
- **Context** = "what do I need to remember to write this" — pre-write Q&A
- **Pipeline** = "the act of writing" — the author at the desk

Single-responsibility per layer = easier to navigate, test, and extend.

## Phase history

| Phase | Wave | Date | Description |
|---|---|---|---|
| 24 | — | 2026-05-01 | Codex audit fixes — pre-save QA gate, auto-revise reorder, per-part loop |
| 25 | — | 2026-05-01 | Rubric judge + First10ChapterEvaluator |
| 26 | — | 2026-05-01 | Đại thần workflow modules: volume hierarchy + foreshadowing OVERDUE + climax ladder |
| 27 | W1 | 2026-05-01 | Architecture refactor — 5-layer structure, dead code clear, plot-tracker split |

Future waves: see PR #38 description.
