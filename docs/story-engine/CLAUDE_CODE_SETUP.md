# Claude Code authors one-time setup; DeepSeek V4 Pro writes every chapter

> **TL;DR** — The one-time per-novel SETUP (idea / world / character / canon / outlines /
> foundation review) is authored **locally by Claude Code** (Max 20× subscription → \$0
> marginal API cost) and persisted with `scripts/cc-apply-setup.ts`. The model-API setup
> pipeline is skipped for these novels. Every CHAPTER is then written by **deepseek-v4-pro**
> through the standard write-chapters cron — no gemini-3.1-flash-lite on the creative write
> path.

## Why this exists (2026-05-29)

User feedback: *"thôi không dùng gemini-3.1-flash-lite vì so với deepseek v4 pro nó vẫn
còn hơi lởm, giờ thay đổi cấu trúc Claude Code làm mấy cái 1 lần setup cho các đầu truyện,
còn lại deepseek v4 pro làm."*

flash-lite was only "lởm" **when WRITING chapters**. So:

| Concern | Decision |
|---|---|
| Per-chapter creative writing (architect / writer / continuation / guardian / auto-revision) | **deepseek-v4-pro** (already routed via `PRO_TASKS` in `model-tier.ts`) |
| Critic | **gemini-3.5-flash** (cross-model grading — avoids Pro self-bias) |
| ~12 mechanical extraction / summary / state tasks per chapter | **gemini-3.1-flash-lite** (cheap, mechanical JSON) |
| One-time per-novel setup | **Claude Code (local)** → this runbook |

The only path that hardcoded flash-lite for chapter writing — `flash-cheap-routine.ts` —
has been **retired** (`shouldUseFlashBulkCheapMode()` always returns `false`). A guard
(`assertChapterWriterRouting()`, called in `orchestrator.ts`) now throws loudly if the
writer would ever fall back to flash-lite, so a forgotten `installModelTierRouting()` can
never silently degrade chapter quality.

## How a Claude-Code-setup novel flows

```
Claude Code authors artifacts          cc-apply-setup.ts                write-chapters cron
─────────────────────────────          ─────────────────                ───────────────────
blueprints/<novel>/setup/*    ──────▶   validate + write DB    ──────▶   INIT-WRITE ch.1
  world.md, character.json,             ai_story_projects:                via deepseek-v4-pro
  description.md, *-outline.json,          setup_stage=ready_to_write     (standard 3-agent
  canon.json, arc-plan.json,               status=active                  Architect→Writer→Critic)
  foundation.json                          setup_source=claude_code
                                         + canon + arc_plans + ...
```

Because `style_directives.setup_source='claude_code'`, the model-API setup pipeline
(`runOneStage` in `setup-pipeline.ts`) **skips** every stage for this project — it will
never overwrite the curated artifacts. `cc-apply-setup` pushes the project straight to
`ready_to_write` with all write-chapters INIT-WRITE gates satisfied.

## Step 1 — Author the artifacts

Create `blueprints/<novel-id>/setup/` with the files below. The exact schema is enforced
by `cc-apply-setup.ts` validation, so a dry run tells you precisely what's missing.

### `world.md` (REQUIRED, ≥500 chars)
Plain markdown. → `ai_story_projects.world_description`. The write-chapters `hasFullSetup`
gate requires ≥500 chars. Cover the world rules, power/magic system at a high level,
geography, factions overview, tone.

### `character.json` (REQUIRED)
```json
{ "mainCharacter": "Lương Hạo" }
```
`mainCharacter` ≥2 chars → `ai_story_projects.main_character`. Use the **full họ+tên**
(webnovel convention for 1000+ chapter reader memory).

### `description.md` (REQUIRED)
Reader-facing pitch → `novels.description`. **NO AI mentions.** Full Vietnamese diacritics.

### `master-outline.json` (REQUIRED, object)
→ `ai_story_projects.master_outline`. The volume/arc hierarchy (5-15 volumes × 4-6
sub-arcs × 6-axis). Must be a non-null object. Must NOT contradict `mcOrigin` (origin guard).

### `story-outline.json` (REQUIRED — must hold a valid `setupKernel`)
→ `ai_story_projects.story_outline`. Shape:
```json
{
  "premise": "...",
  "mainConflict": "...",
  "themes": ["..."],
  "majorPlotPoints": ["..."],
  "setupKernel": { /* StoryKernel — see below */ }
}
```
The `setupKernel` is the chapter writer's source of truth and is hard-gated by
`hasValidSetupKernel()`. **All** of these must be present and pass length checks:

| Field | Requirement |
|---|---|
| `readerFantasy` | string ≥20 chars |
| `protagonistEngine` | string ≥20 chars |
| `pleasureLoop` | array, ≥4 non-empty entries |
| `systemMechanic` | `{ name, input, output, limit, reward }` — input/output/limit/reward all non-empty |
| `mcOrigin` | one of `native` / `transmigrator` / `reincarnated` / `system-bestowed` / `returnee` (lock once; outlines must not contradict) |
| `originLockNote` | 1-sentence lock note (recommended) |
| `mcSecret` | `{ secret, outsideWorldKnowledge, revealRule, coverStory? }` — first 3 non-empty |
| `benefitLoop` | `{ goal, action, benefit, cadence }` — all non-empty |
| `interventionRule` | string ≥30 chars |
| `phase1Playground` | `{ locations≥2, cast≥2, resources, localAntagonists≥1, repeatableSceneTypes≥3 }` |
| `noveltyLadder` | array ≥3 of `{ chapterRange, newToy, keepsSameLane }` |
| `socialReactor` | `{ witnesses, reactionModes, reportBackCadence }` |
| `controlRules` | `{ payoffCadence, attentionGradient, openThreadsPerArc, closeThreadsPerArc }` |
| `patternCards` | array of pattern names |

### `canon.json` (REQUIRED: `power_system` + `worldbuilding`)
```json
{
  "power_system": { /* non-null object → power_system_canon */ },
  "worldbuilding": { /* non-null object → worldbuilding_canon */ },
  "factions":      [ { "name": "...", "type": "...", "power_level": 7, "summary": "...",
                       "territory": "...", "mc_relation": "...", "alliances": [], "conflicts": [],
                       "importance": 7, "introduce_arc": 1 } ],
  "plot_twists":   [ { "summary": "...", "payoff_type": "...", "setup_chapters": [3,40],
                       "twist_chapter": 120, "reader_impact": "major", "arc_number": 2 } ],
  "themes":        [ { "name": "...", "type": "main", "description": "...", "motifs": [], "importance": 8 } ],
  "voice_anchors": [ { "snippet_type": "opening", "prose_text": "...", "key_traits": [] } ],
  "foreshadowing": [ { "hintText": "...", "category": "object", "plantCh": 5, "pickupCh": 80,
                       "payoffDescription": "..." } ]
}
```
- `power_system` + `worldbuilding` are **required non-null** — they satisfy the Track1
  `hasCanonAndPassedReview` gate (`power_system_canon != null && worldbuilding_canon != null`).
- `factions / plot_twists / themes / voice_anchors / foreshadowing` are optional. The applier
  accepts both Claude-friendly keys (`name`, `summary`, `plantCh`…) and DB-native keys
  (`faction_name`, `description`, `plant_chapter`…) and normalizes enums/importance for you.

### `arc-plan.json` (REQUIRED — arc 1)
```json
{
  "arc_number": 1,
  "start_chapter": 1,
  "end_chapter": 30,
  "arc_theme": "...",
  "plan_text": "...",
  "chapter_briefs": [],
  "threads_to_advance": [], "threads_to_resolve": [], "new_threads": [],
  "sub_arcs": []
}
```
`plan_text` + numeric `start_chapter`/`end_chapter` are mandatory (write-chapters `hasArcPlan`
gate needs an `arc_plans` row at `arc_number=1`).

### `foundation.json` (REQUIRED — `passed: true`)
```json
{ "passed": true, "totalScore": 120, "avgScore": 8.5, "minDimScore": 7,
  "dimensions": [...], "overallFeedback": "..." }
```
`passed === true` → written into `style_directives.foundation_review_latest`. The Track1
gate requires `foundation_review_latest.passed === true`.

## Step 2 — Dry run, then apply

```bash
# DRY RUN (default) — validate artifacts + print the plan, no DB writes
npx tsx scripts/cc-apply-setup.ts <projectId> <blueprintName>

# APPLY — persist to DB
npx tsx scripts/cc-apply-setup.ts <projectId> <blueprintName> --apply
```

The applier is **idempotent** and **pre-write only** (refuses to run if
`current_chapter > 0`). On `--apply` it:

1. Updates `ai_story_projects`: `world_description`, `main_character`, `master_outline`,
   `story_outline`, `power_system_canon`, `worldbuilding_canon`, `setup_stage='ready_to_write'`,
   `status='active'`, `pause_reason=null`, and merges `style_directives` with
   `setup_source='claude_code'` + `foundation_review_latest` (+ rolling history).
2. Updates `novels.description`.
3. Replaces (delete-then-insert) this project's setup-owned child rows: `arc_plans[arc1]`,
   `factions`, `plot_twists`, `story_themes`, `voice_anchors[chapter_number=0]`,
   `foreshadowing_plans`.

Secrets come from `.env.runtime` then `.env.local` (override) — needs
`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Step 3 — Activate the per-chapter blueprint

The setup makes the novel writable; the per-chapter blueprint (one brief per chapter) is
stored separately in `chapter_blueprints` and injected into the writer at
`context/assembler.ts` (`loadChapterBlueprint` → Layer 0.5k.1). Author it per
[`CHAPTER_BLUEPRINT_UNIFIED.md`](CHAPTER_BLUEPRINT_UNIFIED.md), then:

```bash
# After all 1..totalChapters briefs are covered:
PROJECT_ID=<projectId> BLUEPRINT=<blueprintName> npx tsx scripts/sync-blueprint.ts --activate
```

`--activate` sets `require_full_chapter_blueprint=true` so the writer enforces the brief.

## Step 4 — Hand off to the cron

Opt the project into the 50 ch/day production pipeline (Phase Q flag):

```bash
npx tsx scripts/toggle-production.ts <projectId> on
```

The write-chapters cron picks it up at `ready_to_write` and writes ch.1 with
**deepseek-v4-pro** (standard 3-agent path; routing installed at
`route.ts` + `orchestrator.ts`).

## Verification

```bash
# Routing — confirm writer is Pro, critic is gemini-3.5-flash, extraction is flash-lite
DEBUG_ROUTING=1 npx tsx scripts/<any-write-driver>.ts   # look for:
#   [ModelTier] writer→deepseek-v4-pro architect→deepseek-v4-pro critic→gemini-3.5-flash _default→gemini-3.1-flash-lite
# and per-call: task=writer target=deepseek-v4-pro  (NEVER task=writer target=gemini-3.1-flash-lite)

# Setup applied correctly (query DB)
#   ai_story_projects: power_system_canon != null, worldbuilding_canon != null,
#     setup_stage='ready_to_write', style_directives->>'setup_source'='claude_code',
#     style_directives->'foundation_review_latest'->>'passed'='true'
```

## Gate cross-reference (why each artifact is required)

`write-chapters` INIT-WRITE (ch.1) gates → the artifact that satisfies each:

| Gate (route.ts) | Requirement | Satisfied by |
|---|---|---|
| `hasArcPlan` | `arc_plans` row `arc_number=1` | `arc-plan.json` |
| `hasFullSetup` | `world_description` ≥500 && `main_character` ≥2 | `world.md` + `character.json` |
| `isReadyToWrite` | `setup_stage` ∈ {`ready_to_write`,`writing`} | applier sets `ready_to_write` |
| `hasValidSetupKernel` | valid `setupKernel` in `story_outline` | `story-outline.json` |
| `hasCanonAndPassedReview` | `power_system_canon`!=null && `worldbuilding_canon`!=null && `foundation_review_latest.passed===true` | `canon.json` + `foundation.json` |

## Files

- `scripts/cc-apply-setup.ts` — this applier (dry-run default; `--apply` to write)
- `scripts/sync-blueprint.ts` — per-chapter blueprint → `chapter_blueprints` (`--activate`)
- `src/services/story-engine/pipeline/setup-pipeline.ts` — `runOneStage` skips when
  `setup_source='claude_code'`
- `src/services/story-engine/utils/model-tier.ts` — per-task routing +
  `assertChapterWriterRouting()` guard
- `src/services/story-engine/pipeline/setup-kernel-guards.ts` — `hasValidSetupKernel`
- `src/services/story-engine/plan/origin-guard.ts` — `detectOriginContradiction`
