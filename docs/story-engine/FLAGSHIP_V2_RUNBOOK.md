# Flagship Story Pipeline v2

The flagship lane is quality-first and isolated from the legacy fleet. A project enters it only when `style_directives.pipeline_version = "flagship_v2"`. Legacy projects remain paused and unchanged.

## Required artifacts

1. `flagship_setup_brief_v2` is authored for one story and must include real domain research. There is no shared genre setup or default brief.
2. `flagship_concept_tournament_v2` contains 20 generated concepts, lexical duplicate removal, pairwise ranking and three full opening simulations.
3. A human must persist `flagship_setup_selection_v2`; the engine cannot choose its own winner.
4. `ai_story_projects.story_spec_v2` must validate as `StorySpecV2`, preserve the selected concept/characters/world exactly, and have a computed foundation score of at least 8/10 with no dimension below 7.
5. `ai_story_projects.arc_plan_v2` covers only the current 20-30 chapter arc; `story_state_v2` must match `current_chapter` exactly.
6. Only five rolling `ChapterPlanV2` records may be prepared at a time. There is no fake 1,000-chapter detail map.
7. Human checkpoints advance in order: `concept` → `story_spec` → `chapter_3` → `chapter_10` → `chapter_30` → `chapter_50`.

## Safe workflow

```bash
# These commands require both flagship migrations to be applied and a paused,
# unwritten project already marked pipeline_version=flagship_v2.
npm run flagship:create-pilot -- --title="Flagship Pilot" --slug=flagship-pilot --brief=/absolute/story-specific-brief.json --routes=/absolute/model-routes.json
npm run flagship:setup:brief -- --project=<uuid> --brief=/absolute/story-specific-brief.json --routes=/absolute/model-routes.json
npm run flagship:setup:tournament -- --project=<uuid>
npm run flagship:setup:materialize -- --project=<uuid> --selection=/absolute/human-selection.json
npm run flagship:setup:approve -- --project=<uuid> --reviewer=<name>
npm run flagship:write -- --project=<uuid>
npm run flagship:plan-window -- --project=<uuid>
npm run flagship:approve-checkpoint -- --project=<uuid> --stage=chapter_3 --reviewer=<name>

npm run flagship:preflight -- --spec=/absolute/story-spec.json --arc=/absolute/arc-plan.json --state=/absolute/story-state.json --plans=/absolute/chapter-plans.json
npm run flagship:bakeoff -- --ballots=/absolute/blind-ballots.json --candidate-ids=A,B
npm run flagship:classify-legacy -- --limit=5000
```

`flagship:preflight` expects only plans 1-5. The preflight and classifier are read-only. The bake-off requires at least ten decisive blind ballots and a winner with at least 65% preference.

`model-routes.json` must contain explicit `setupCreative`, `setupJudge`, `director`, `writer`, `editor`, and `planner` model names. `setupJudge` must differ from `setupCreative`, and `editor` must differ from `writer`. Global model routing is disabled for every flagship call.

Before any flagship project can run against production:

1. Apply `20260711014524_flagship_v2_quality_pipeline.sql` through the normal Supabase migration workflow.
2. Apply `20260711044323_flagship_setup_v2.sql` only after authenticating to the intended Supabase project.
3. Verify telemetry/ledger tables and all flagship setup/planning/approval RPCs exist and are inaccessible to `anon`/`authenticated`.
4. Verify the explicitly selected model route is funded and reachable.
5. Keep every legacy project paused. The production cron excludes flagship projects too; pilot writes are manual by project ID.

## Publication behavior

- Dispatch happens before the legacy orchestrator loads context or runs setup repair. Flagship never imports the legacy writer, prompts, templates, context assembler, polishers, or fallback gates.
- Each chapter uses Director → Writer → independent Editor. A publish uses three model calls; one evidence-scoped local revision may use a fourth and final call.
- `routine_soft` and golden fallback are unavailable to flagship projects.
- There are no cross-story setup fallbacks. Missing story identity, arc plan, prior state, cast ledger, timeline, retrieval, or independent calibration fails closed.
- Setup is `Concept Lab → pairwise Judge → three Opening Simulators → human selection → Character Designer → Causal World → Launch Architect`. Each role sees only its own input and no legacy prompt.
- Quality axes never receive default passing scores; every axis must be scored for this exact story by the independent reviewer.
- A deterministic hard failure rejects the candidate before persistence.
- A passing deterministic result still needs an independent calibrated review.
- Provider billing/network failures set the daily quota to `infra_blocked`; they do not consume quality retries or alter canon.
- A chapter cannot persist until the appropriate human checkpoint has already been approved.
- Publishing calls `commit_flagship_chapter_v2`; chapter, state, cast/resource/promise ledgers, checkpoints, and final run decision commit in one transaction.
