# Story Factory

The one system that writes novels. 17 files, one cron, one queue.

`src/services/story-factory/` — flat, no subdirectories. If you are looking for
`story-engine/`, `orchestrator.ts`, `chapter-writer.ts`, DeepSeek routing,
`style_directives`, blueprints or codex-automation: they were deleted on 2026-07-20
(commit `554a5d2`, 1,496 files). Nothing replaced them one-for-one; the whole approach
was replaced by what is documented here.

## Shape

```
cron */2  →  /api/cron/story-factory  →  runStoryFactoryTicks()  →  runStoryFactoryTick() × N
                                                                     ↓
                                            claim_story_factory_job (Postgres, SKIP LOCKED)
                                                                     ↓
                          setup → cover → plan → write → [revise] → window_review → arc → …
```

One invocation drains as many stages as its budget allows. Admission is adaptive: another
stage starts only if the slowest one observed so far still fits, so a chapter is never cut
off by the 300s route ceiling.

| File | Role |
|---|---|
| `runtime.ts` | The state machine. One stage per tick, lease-guarded, commits through RPCs. |
| `pipeline.ts` | Writer and Editor. `draftStoryChapter` → `reviseStoryChapter`. |
| `planner.ts` | Planner, Plan Judge, arc lifecycle, five-chapter window review. |
| `validation.ts` | The causal engine. Deterministic state transitions and 108 hard checks. |
| `setup.ts` | Concept Lab: 9 calls from commission to launch pack. |
| `contracts.ts` | Every schema. The source of truth for artifact shape. |
| `context.ts` | What the Writer and Editor are allowed to see. |
| `memory.ts` | Bounded continuity reads over `story_state_events`. No embeddings, no model calls. |
| `provider.ts` | Gemini REST. No SDK, no fallback provider, 120s per call. |
| `benchmark.ts`, `benchmark-resume.ts` | Offline model evaluation. Not a gate. |
| `cover.ts`, `portfolio.ts`, `prompts.ts`, `release.ts`, `routes.ts`, `index.ts` | Support. |

## Stages

| Stage | Provider calls | Next |
|---|---|---|
| `setup` | 9 (+resumable checkpoints) | `cover` |
| `cover` | 1 image | `plan` |
| `plan` | 1–6 (planner ×2 mechanical, judge, replan, repair, re-judge) | `write` |
| `write` | 2 (Writer, Editor) | commit, or `revise` |
| `revise` | 2 (Rewrite, Editor) | commit |
| `window_review` | 1, every 5th chapter | `write` or `arc` |
| `arc` | 1, at arc boundary | `plan` |

Steady state is roughly 2.9 provider calls per published chapter.

## Two identities

Confusing these is what froze the fleet for 19 days, so they are now separate.

**`STORY_FACTORY_RELEASE`** hashes contract, state and setup versions — the things that
decide whether a persisted `story_kernel`, `arc_plan`, `story_state` or `rolling_plan`
still parses. It gates job claiming. Changing it genuinely orphans stored data and
requires `factory-operator restage`.

**`STORY_FACTORY_REVISION`** hashes prompt, planner, validator, context, memory, window
review and route versions. It is written to every run row for attribution and gates
nothing. Improve a prompt freely; novels already at chapter 40 pick it up on their next
chapter.

An uncommitted rolling window can be invalidated by a planner change. That is handled:
`runChapter` safeParses it and falls to `recoverUncommittedPlan`, which discards the
window and replans once.

## Hard checks vs advisories

`validation.ts` fails closed on anything mechanically decidable: resource arithmetic, ID
existence, the travel graph, scene capacity, chapter sequence, schema shape, evidence
grounding. 108 of the 110 checks are in this class and they block.

Two checks read free-form Vietnamese scene text to guess whether value moved. Those raise
a `PlanAdvisory` instead — an observation plus the question to answer — which is handed to
the Plan Judge with the full window. They can cause a revise; they cannot end a job.
`describesCompletedDurableAsset` matching "chế tạo" in a scene that only *agreed* to build
something is exactly why: the fix for a false positive of that kind is another regex, and
that loop does not terminate.

## Getting a novel into production

```bash
# 1. Prove the machine runs on this release with these routes (~$1, ~5 chapters).
npm run factory:writing-smoke -- --apply

# 2. Seed a hidden canary. Fails fast if step 1 has not passed for this release.
npm run factory:operator -- seed \
  --commission=factory/canary/commission.json \
  --research=factory/canary/research.json --apply

# 3. Watch. The cron does the rest.
npm run factory:operator -- status
```

The novel writes chapters 1–10 with `novels.hidden = true`. Window reviews run at 5 and 10;
passing chapter 10 with a cover present auto-calls `promote_story_factory_canary`, which
publishes it. That is the quality gate: real chapters on real accumulating state, and the
output is saleable rather than discarded.

## Operating

```bash
npm run factory:operator -- status                    # every job, with release
npm run factory:operator -- revive --apply            # return parked jobs to the queue
npm run factory:operator -- revive --job-id=<id> --apply
npm run factory:operator -- restage --all --apply     # migrate jobs onto the current release
npm run factory:operator -- tick --apply              # run one stage now
npm run factory:operator -- stop --job-id=<id> --apply
npx tsx scripts/pause-all-writing.ts --apply          # fleet kill switch
```

Admin UI at `/admin/factory`: per-job state, a revive-all button when jobs are parked, and
manual publish once a canary reaches chapter 10.

Kill switch: `STORY_FACTORY_ENABLED` must be exactly `true` for any work to happen.

### When a job stops

| Status | Meaning | Retried? |
|---|---|---|
| `infra_blocked` | Provider or transport failure | Yes — backoff 1,2,4,8,16 min, then parks |
| `plan_blocked` | Planner or Plan Judge could not produce a valid window | One replan, then parks |
| `quality_blocked` | Editor still failing after one rewrite, or window review found drift | No |
| `setup_blocked` | Artifacts do not match the running release, or the launch pack is invalid | No |

Parked statuses are invisible to the claim query by construction. `revive` is how they come
back.

## Models

`routes.ts` is the exact, versioned route. There is no fallback and no other provider —
`architecture.test.ts` asserts `provider.ts` contains no `fallback|openrouter|deepseek`.

Changing a model is a quality decision: run `factory:model-bakeoff`, then re-run the writing
smoke, which is what the claim gate checks against.

## Verification

```bash
npm run typecheck
npm test                    # 198
npm run security:secrets
```

`src/__tests__/story-factory/architecture.test.ts` guards structural invariants: one writing
cron, no legacy imports, no word-count gating, no provider fallback, the Writer brief never
sees plan internals, the lease exceeds the execution budget, and the production gate is a
smoke check. It resolves the *last* migration defining a function rather than a named file —
a fixed filename let a 5-minute lease silently replace a 30-minute one while the test kept
passing.

## Data

Six tables. `ai_story_projects` (kernel, arc, state, release, routes), `story_factory_jobs`
(queue, lease, stage, quota), `story_factory_runs` (per-run telemetry), `story_state_events`
(the immutable ledger), plus shared `chapters` and `novels`.

Five RPCs do every mutation that must be atomic: `claim_story_factory_job`,
`commit_story_factory_chapter`, `commit_story_factory_arc_transition`,
`reconcile_story_factory_jobs`, `promote_story_factory_canary`.

---

# Design

Normative. Change the code and this section together, or one of them starts lying.

## Four artifacts, and only four

1. `StoryKernel` — immutable identity, cast, world rules, resources, voice, pleasure
   mechanism, ending direction.
2. `ArcPlan` — the current 20–30 chapter objective, active conflicts, due promises,
   terminal changes.
3. `StoryState` — current physical canon plus the bounded outcomes of accepted chapters.
4. `rollingPlan` — mechanical plans for at most three uncommitted chapters, on the job row.

Research, market taxonomy and reference works exist only inside Concept Lab. They never
reach Writer context.

`ChapterOutcome` is not a fifth artifact. It is a bounded row inside `StoryState` — chapter
number and title, the principal event, its result, the concrete method, the ending
situation, and exact prose evidence spans — extracted by the Editor from accepted prose and
committed in the same transaction.

**The Writer does not receive recent outcomes. The Planner and Editor do.** Lock causality
and state; release the telling.

## Three kinds of memory, not three subsystems

- **Physical** — facts, time, locations, knowledge, relationships, resources and promises in
  `StoryState`; immutable deltas in `story_state_events`.
- **Narrative** — the latest 12 `ChapterOutcome` records in `StoryState`. What the reader
  experienced, not a second copy of the ledger.
- **Future intent** — `ArcPlan` and `rollingPlan`.

Current physical state is a snapshot, never an append-only recap. `story_state_events` is
the audit and recovery ledger, queried by stable entity ID when distant canon is needed.

**No vector database and no RAG** until a measured long-run failure proves typed entity and
event lookup is insufficient.

## Role boundaries

**Planner** — receives Kernel, current Arc, current State including recent outcomes, and
evidence from at most one failed uncommitted plan. Plans one to three chapters. Must advance
from actual outcomes; must not restage a recently completed event, method and result unless
the new chapter escalates causally to a materially different result.

**Writer** — receives the relevant Kernel and voice projection, the mechanical chapter plan,
relevant current state, required deltas, and the last 600 words of the previous accepted
chapter. It chooses prose, dialogue, pacing, emotion, scene boundaries and length. **Word
count is telemetry, never a gate** — `architecture.test.ts` asserts `pipeline.ts` contains no
word-count comparison.

**Editor** — receives the relevant canon, recent accepted outcomes, the plan and the draft.
Reports only issues it can evidence verbatim in the prose, plus any unrealized delta. It
also extracts the accepted `ChapterOutcome`. **Code decides publication, not the model**: a
pass requires zero findings and every delta realized, and every evidence span must ground in
the draft or the run fails as `infra_blocked` rather than shipping.

If the Editor proves the *plan* repeats a recently completed problem/method or contradicts
canon, the Writer is not asked to repair an artifact it does not own. The uncommitted window
is discarded and replanned once with the evidence. A second failure blocks the job.

## Concept Lab

Nine calls with clean responsibilities: two independent generators, one blind judge, one
Google-Search-grounded technical dossier, one structured opening and domain simulator, then
four Launch Architect stages producing identity, world, series spine and initial state.

Launch produces only Kernel, first Arc and initial State. The normal Planner owns every
rolling plan, including chapters 1–3. Grounding queries and source URLs stay in immutable
setup telemetry and never enter Writer context.

Setup is checkpointed per stage and resumable, bound to one commission, research snapshot
and setup route.

## Time and cadence

Time is mechanical: every scene has a positive duration, travel consumes it, and
`storyTimeAfterMinutes` can never precede State time plus all planned scene and travel
minutes.

| Cadence | What is checked |
|---|---|
| Every chapter | canon, timeline, location, resources, knowledge, authority, POV, causal transition, required deltas, voice, natural prose, prompt leak, repetition of recent beats |
| Every 5 chapters | progression, reward-loop variation, unresolved-thread movement, voice drift — steers the next rolling plan, does not rewrite canon |
| Every arc | terminal change, promise ledger, progression, ending feasibility |
| Every release | the writing smoke, then a hidden canary through chapter 10 |

Window review runs before the daily-quota delay: quota throttles new chapters, never quality
gates. Surprise, payoff size and recovery pacing are window and arc properties — not boxes
to tick in every chapter.

## What is deliberately not copied

The useful pattern across published long-form writing systems is dynamic planning from what
was actually written, bounded memory, typed state, and evidence-based checking. **The number
of agents is not a quality signal.**

Rejected on purpose: seven-truth-file rule stacks, default RAG, normalizer and patch loops,
layered knowledge bases, live-path knowledge-graph extraction, whole-book static chapter
plans, absolute 0–10 self-scores as a publication gate, and hard length targets.

No public project demonstrates autonomous quality across 1,000 chapters. "Ready for 1,000
chapters" stays an empirical milestone, not a design claim.

## Proof milestones

| Milestone | What it proves |
|---|---|
| 10 hidden chapters | the release can write and commit a launch window |
| 30 chapters | continuity holds and the first arc transition is clean |
| 100 chapters | repeated rolling plans and multiple arc transitions survive |
| 5 stories × 100 chapters | the first 30-story cohort can open |
| One story finished in 800–1,200 chapters | the full lifecycle is proven |

Nothing past the first row has been demonstrated. Do not describe later rows as achieved.
