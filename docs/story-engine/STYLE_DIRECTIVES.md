# `style_directives` — the de-facto control plane

`ai_story_projects.style_directives` is a JSONB column. Many behaviours hang off
keys inside it rather than off dedicated columns, so a project's runtime behaviour
is shaped here without any migration. This doc is the single source of truth for
**what keys exist, who reads them, their type, and their default**.

There are two classes of key:

1. **Typed keys** — declared on the `StyleDirectives` interface in
   [`src/services/story-engine/types.ts`](../../src/services/story-engine/types.ts).
   That interface is canonical; the table below mirrors it with the runtime reader
   and effective default (the interface only documents the shape, not who consumes it).
2. **Untyped runtime keys** — written/read dynamically and **NOT** on the interface.
   These are the real tribal-knowledge risk: a typo or shape change is silent. They
   are listed in their own section; treat that list as authoritative until they are
   promoted onto the interface.

> When you add a key: add it to the `StyleDirectives` interface first (so TS catches
> typos), then add a row here. If it must stay untyped (e.g. a stored AI-result blob),
> document it in the "Untyped runtime keys" section with its shape.

---

## Typed keys (on `StyleDirectives` interface)

| Key | Type | Default | Read by | Effect |
|---|---|---|---|---|
| `production_enabled` | boolean | `false` | `lib/story-production-focus.ts` | Opt project into the production cron's daily-quota pipeline. `true` ⇒ write-chapters cron picks it up. The flag-based replacement for the old hardcoded `FOCUSED_PROJECT_IDS`. |
| `production_daily_chapter_quota` | number | `WRITE_CHAPTERS_DAILY_QUOTA` env, else `50` | `lib/story-production-quota.ts` | Per-project override of the daily chapter quota. |
| `disable_chapter_split` | boolean | `true` for new novels (set by content-seeder); `false`/absent ⇒ split=2 | `pipeline/orchestrator.ts` | `true` ⇒ one AI write = one reader chapter (~2800 words). Absent/`false` ⇒ split each AI write into 2 reader chapters. |
| `require_full_chapter_blueprint` | boolean | `false` (via `shouldRequireChapterBlueprint`) | `quality/causal-logic-check.ts`, `plan/chapter-blueprints.ts` | `true` ⇒ writer cannot publish next chapter without full `chapter_blueprints` coverage, and the blueprint-alignment Critic gate runs. Mass-spawned template novels opt out. |
| `chapter_blueprint_version` | number | unset | `plan/chapter-blueprints.ts` | Active blueprint version expected by writer/audit gates. |
| `focus_key` | string \| null | `null` | `pipeline/flash-cheap-routine.ts` | Focus-preset key used by Codex/cron director flows (`buildFocusPresetContext`). |
| `variant_id` | string | unset | `context/assembler.ts` | Genre variant (e.g. `ngon-tinh:dai-nu-chu`). Written by content-seeder per archetype. |
| `starting_archetype` | `StartingArchetype` | unset | `context/assembler.ts` | MC starting circumstances (modern 2024-2026 archetype). |
| `tone_profile` | `ToneProfile` | unset | `context/assembler.ts` | Overall emotional palette. |
| `cliffhanger_density` | `'low'\|'medium'\|'high'` | unset (engine default medium) | `pipeline/chapter-writer-prompts.ts` | How often to use plot cliffhangers vs emotional/reveal endings. |
| `anti_seeds` | string[] | unset | chapter-writer prompts | Explicit prohibition prompts beyond `anti_tropes`. |
| `target_chapter_length_override` | number | `DEFAULT_CONFIG.targetWordCount` | orchestrator | Per-project target word count. |
| `sub_arc_length` | number | engine default | planning | Sub-arc length in chapters (5-10 typical). |
| `critic_strictness` | `'lite'\|'normal'\|'strict'` | `normal` | chapter-writer Critic | Critic strictness — lite for slice-of-life, strict for plot-heavy. |
| `codex_director_only` | boolean | `false` | flash-cheap-routine | Codex acts as high-level director only; routine text written by configured provider. |
| `flash_writer_enabled` | boolean | `false` | flash-cheap-routine | Provider-side routine generation without Codex manual authoring. |
| `flash_routine_soft_gate` | boolean | `false` | flash-cheap-routine | Routine chapters pass a softer gate if no hard continuity/canon issue. |
| `flash_routine_min_quality_score` | number | `5` (director-only Flash) | flash-cheap-routine | Min score for `flash_routine_soft_gate`. |
| `flash_routine_max_retries` | number | `1` | flash-cheap-routine | Retry count for routine Flash writes (low to avoid paid rewrite loops). |
| `flash_routine_extend_on_short` | boolean | `true` | flash-cheap-routine | Allow one cheap continuation pass on short/hookless output. |
| `flash_routine_max_extensions` | number | `2` | flash-cheap-routine | Max cheap continuation passes for undershot chapters. |
| `flash_bulk_cheap_mode` | boolean | `false` | flash-cheap-routine | Cheapest stable routine path: compact brief + one DS Flash thinking call + deterministic gates. |
| `flash_bulk_context_max_chars` | number | `32000` | flash-cheap-routine | Max compact routine context size. |
| `flash_bulk_min_words` | number | `max(1800, 0.72×target)` | flash-cheap-routine | Hard min published word count for cheap routine chapters. |
| `flash_bulk_optional_task_cadence` | number | `5` | flash-cheap-routine | Cadence (chapters) for optional AI memory tasks in cheap mode. |
| `flash_bulk_critic_cadence` | number | `10` | flash-cheap-routine | Cadence for strict Critic sampling in cheap mode (audit runners). |
| `flash_bulk_force_all` | boolean | `false` | flash-cheap-routine | Force cheap mode even near final arc. Experiments only. |
| `routine_prompt_context` | string | unset | flash-cheap-routine | Per-project routine-writer instructions appended to compact Flash prompts. |
| `deepseek_thinking_enabled` | boolean | `false` | gemini/deepseek adapter | Enable DeepSeek V4 thinking mode for selected calls. |
| `deepseek_reasoning_effort` | `'high'\|'max'` | unset | deepseek adapter | DeepSeek V4 thinking effort. |
| `deepseek_thinking_tasks` | string[] | unset (empty ⇒ all) | deepseek adapter | Task allow-list for thinking mode (e.g. architect/writer/critic). |

---

## Untyped runtime keys (NOT on the interface — handle with care)

These are stored/read by name at runtime and bypass TypeScript. A typo here fails
silently. Promote to the interface when convenient.

| Key | Shape | Written by | Read by | Purpose |
|---|---|---|---|---|
| `foundation_review_latest` | `FoundationReviewResult` (`{ passed, totalScore /140, avgScore, minDimScore, dimensions[], overallFeedback, retryRecommendation? }`) | `quality/foundation-reviewer.ts` (`persistFoundationReview`) | **`api/cron/write-chapters/route.ts`** `hasCanonAndPassedReview` — `fr?.passed === true` is the Track-1 gate before ch.1 | Latest 14-dim foundation verdict (PASS_THRESHOLD 80/140, DIMENSION_FLOOR 6). The gate that blocks chapter-1 writing without a passing foundation. |
| `foundation_review_history` | `Array<FoundationReviewResult & { timestamp }>` (last 10) | foundation-reviewer.ts | foundation-reviewer.ts (append) | Rolling history of foundation verdicts for diffing. |
| `retro_foundation_score` | `{ totalScore, avgScore, minDimScore, passed, scoredAt, dimensions: {name,score}[], overallFeedback }` | `scripts/retro-score-legacy.ts` | `scripts/hide-low-coherence.ts` (Track 2b cutoff) | Read-only retro score of legacy pre-gate catalog. Separate from the canonical `foundation_review_latest` so it never feeds the live gate. |
| `positioning` | `PositioningOutput` (topic positioning + benchmark IDs) | `plan/topic-positioning.ts` | `pipeline/setup-pipeline.ts` (IDEA stage injects it) | Topic-positioning artifact computed once at setup; reused as IDEA-stage context. |
| `genre_knowledge_primary` | string | admin operations | `api/admin/operations/route.ts` | Primary genre-knowledge pack for the project (falls back to `project.genre`). |
| `genre_knowledge_pack_version` | string/number | admin operations | `api/admin/operations/route.ts` | Loaded genre-knowledge pack version. |
| `genre_knowledge_benchmark_families` | string[] | admin operations | `api/admin/operations/route.ts` | Benchmark families used during positioning. |
| `knowledge_alignment` | object | admin operations | `api/admin/operations/route.ts` | Genre-knowledge alignment metadata. |
| `cosmic_tier_patterns` / `cosmic_arc_start_chapter` | patterns / number | `blueprint/sync.ts` | `blueprint/sync.ts` | Cosmic-tier endgame blueprint params for sandbox/creator-style novels. |
| `codex_automation_pipeline` / `codex_manual_pipeline` | object | Codex pipeline scripts | `api/admin/operations/route.ts` | Codex pipeline run metadata (automation vs manual authoring). |

---

## Operational entry points

- **Toggle production:** `npx tsx scripts/toggle-production.ts <id> on|off|list`
  (sets `production_enabled`, status, quota row — see Phase Q in root CLAUDE.md).
- **Admin UI:** `/admin/production-toggle` (sidebar "Quản lý sản xuất").
- **API:** `POST /api/admin/production-toggle { projectId, enabled }`.

## Related switches that are NOT in `style_directives`

These are env-level, often confused with the JSONB keys above:

| Switch | Where | Effect |
|---|---|---|
| `STORY_PRODUCTION_PAUSED=1` | env | Master kill — cron writes nothing. |
| `STORY_FOCUS_MODE=0` | env | Disable all gating — every active project runs. |
| `FOCUSED_PROJECT_IDS` | env | Legacy emergency allowlist, OR'd with `production_enabled`. |
| `WRITE_CHAPTERS_DAILY_QUOTA` | env | Fleet default quota (overridden per-project by `production_daily_chapter_quota`). |
| `DISABLE_PRO_TIER=1` | env | Revert model routing to all-`gemini-3.1-flash-lite`. |
