# Flagship Story Pipeline v2

The flagship lane is quality-first and isolated from the legacy fleet. A project enters it only when `style_directives.pipeline_version = "flagship_v2"`. Legacy projects remain paused and unchanged.

## Required artifacts

1. `ai_story_projects.story_spec_v2` must validate as `StorySpecV2`, include a unique `storyIdentity`, and have a computed foundation score of at least 8/10 with no dimension below 7.
2. `ai_story_projects.arc_plan_v2` must validate as `ArcPlanV2` and cover the chapter being written.
3. `ai_story_projects.story_state_v2` must validate as `StoryStateV2` and match `current_chapter` exactly.
4. Every next chapter must have `chapter_blueprints.meta.chapterPlanV2`; Director may refine wording but cannot add scene IDs, cast, resources, promises, or state keys.
5. The project must use `publication_mode = "offline_only"` while artifacts and opening simulations are under review.
6. Human checkpoints advance in order: `concept` → `story_spec` → `chapter_3` → `chapter_10` → `chapter_30` → `chapter_50`.

## Safe workflow

```bash
npm run flagship:concepts -- --input=/absolute/concepts.json
npm run flagship:preflight -- --spec=/absolute/story-spec.json --arc=/absolute/arc-plan.json --state=/absolute/story-state.json --plans=/absolute/chapter-plans.json
npm run flagship:bakeoff -- --ballots=/absolute/blind-ballots.json --candidate-ids=A,B
npm run flagship:classify-legacy -- --limit=5000
```

The preflight and classifier are read-only. The bake-off requires at least ten decisive blind ballots and a winner with at least 65% preference.

Before any flagship project can run against production:

1. Apply `20260711014524_flagship_v2_quality_pipeline.sql` through the normal Supabase migration workflow.
2. Verify `story_write_runs`, `story_write_checkpoints`, `story_cast_ledger`, `story_resource_ledger`, `story_promise_ledger`, and `story_flagship_reviews` exist and are inaccessible to `anon`/`authenticated`.
3. Verify the configured writer and independent critic providers are funded and reachable.
4. Keep all legacy `production_enabled` projects paused.

## Publication behavior

- Dispatch happens before the legacy orchestrator loads context or runs setup repair. Flagship never imports the legacy writer, prompts, templates, context assembler, polishers, or fallback gates.
- Each chapter uses Director → Writer → independent Editor. A publish uses three model calls; one evidence-scoped local revision may use a fourth and final call.
- `routine_soft` and golden fallback are unavailable to flagship projects.
- There are no cross-story setup fallbacks. Missing story identity, arc plan, prior state, cast ledger, timeline, retrieval, or independent calibration fails closed.
- Quality axes never receive default passing scores; every axis must be scored for this exact story by the independent reviewer.
- A deterministic hard failure rejects the candidate before persistence.
- A passing deterministic result still needs an independent calibrated review.
- Provider billing/network failures set the daily quota to `infra_blocked`; they do not consume quality retries or alter canon.
- A chapter cannot persist until the appropriate human checkpoint has already been approved.
- Publishing calls `commit_flagship_chapter_v2`; chapter, state, cast/resource/promise ledgers, checkpoints, and final run decision commit in one transaction.
