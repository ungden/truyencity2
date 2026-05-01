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
- Examples: cosmology, power system rules, geography map, factions, races, item tiers
- Currently has: `constraint-extractor.ts`, `world-rules.ts`
- Phase 26+ adds: `worldbuilding.ts`, `power-system.ts`, `factions.ts`, `geography.ts`, `races.ts`, `items-registry.ts`, `skills-registry.ts`

### plan/ — STORY ARCHITECTURE
- The skeleton of the novel: outline, volumes, sub-arcs, climax markers, themes
- Refined as the story progresses but doesn't track per-chapter state
- Examples: master outline, volume hierarchy, foreshadowing register, plot twists planned
- Currently has: `master-outline.ts`, `story-outline.ts`, `seed-blueprint.ts`, `foreshadowing.ts`, `pacing-director.ts`
- Phase 26+ adds: `plot-twists.ts`, `themes.ts`, `chapter-briefs.ts`

### state/ — LIVING STATE
- Per-chapter snapshots of in-world state
- Changes every chapter
- Examples: character locations/status, relationships, items in inventory, faction balance
- Currently has: `character-state.ts`, `character-arcs.ts`, `knowledge-graph.ts`, `relationships.ts`, `mc-power-state.ts`, `geography.ts`, `world-expansion.ts`, `economic-ledger.ts`, `plot-threads.ts`
- Phase 26+ adds: `cast-database.ts` (every named char), `item-inventory.ts`, `faction-dynamics.ts`, `timeline.ts`

### memory/ — HISTORICAL RECORD
- Immutable per-chapter records (write-once)
- Used for retrieval/anchoring, not for active state
- Examples: chapter summaries, RAG vector chunks, beat ledger, voice fingerprints
- Currently has: `character-bibles.ts`, `rag-store.ts`, `beat-ledger.ts`, `voice-fingerprint.ts`, `volume-summaries.ts`
- Phase 26+ adds: `voice-anchor.ts` (lock ch.1-3 prose, refresh every 50ch)

### quality/ — ASSESSMENT
- Per-chapter quality judgment (rubric, consistency, gates)
- Not a state holder — outputs go to log/metrics/auto-revise
- Examples: rubric judge, consistency checks, continuity guardian, first-10 evaluator
- Currently has: `continuity-guardian.ts`, `first-10-evaluator.ts`, `quality-metrics.ts`, `title-checker.ts`, `consistency-check.ts`
- Phase 26+ adds: `pov-check.ts`, `sensory-balance.ts`, `hook-strength.ts`

### context/ — SMART CONTEXT ASSEMBLY
- Aggregates layers into the prompt that goes to the AI
- Smart selection at scale (relevance ranking, budget enforcement)
- Currently has: `assembler.ts`, `pre-write-qa.ts`
- Phase 26+ adds: `relevance-rank.ts`, `budget.ts`

### pipeline/ — ORCHESTRATION
- Coordinates the Architect+Writer+Critic flow + post-write tasks
- The "main" of the engine — reads from canon/plan/state/memory, writes to state/memory
- Currently has: `orchestrator.ts`, `chapter-writer.ts`, `setup-pipeline.ts`, `auto-reviser.ts`, `summary-orchestrator.ts`

### templates/ — GENRE-SPECIFIC
- Per-genre style, voice, blueprints
- Currently has: `genre-process-blueprints.ts`, `genre-voice-anchors.ts`, `style-bible.ts`

### utils/ — INFRA
- DeepSeek/Gemini clients, JSON repair, retry queue, model tier router
- Currently has: standard utility modules

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
