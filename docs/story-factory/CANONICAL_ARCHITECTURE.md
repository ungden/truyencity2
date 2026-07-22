# TruyenCity Story Factory — canonical architecture

Status: normative. This document is the only runtime architecture for automatic story production.

## Goal and evidence boundary

The factory must create story-specific concepts and worlds, then write 800–1,200 connected chapters without content fallback. A chapter is only committed when its prose realizes the planned state transition and passes an independent evidence-based edit.

No public project reviewed here proves autonomous quality over 1,000 chapters. “Ready for 1,000 chapters” therefore remains an empirical milestone: one story must actually complete its ending contract. Unit tests and short demos are necessary but cannot substitute for that run.

## Research synthesis

The useful common pattern is dynamic planning from what was actually written, bounded memory, typed state, and evidence-based checking. The number of agents is not a quality signal.

| Source | Keep | Deliberately do not copy |
| --- | --- | --- |
| [InkOS](https://github.com/Narcooo/inkos) | Typed chapter summaries, recent summaries in planning, immutable state delta | Seven truth files, large rule stack, default RAG, normalizer, patch loops |
| [make-ur-Agent-writer](https://github.com/ARMANDSnow/make-ur-Agent-writer) | Rolling summaries from accepted prose; rewind summaries with a rejected chapter | Layered knowledge bases, dozens of iteration-specific patches, hard length targets |
| [DOME](https://aclanthology.org/2025.naacl-long.63/) | Dynamic hierarchical outline; retrieve concise relevant history | Neo4j/temporal-KG extraction in the live write path |
| [StoryWriter](https://arxiv.org/abs/2506.16445) | Event/causal planning and history selected for the current event | Whole-book event graphs presented as proof of thousand-chapter operation |
| [GOAT Storytelling Agent](https://github.com/GOAT-AI-lab/GOAT-Storytelling-Agent) | A scene must have an outcome; pass the immediately preceding prose | Static whole-book chapter plan |
| [ConStory-Bench](https://github.com/Picrew/ConStory-Bench) | Exact evidence for character, fact, timeline, style and world-rule contradictions | Turning all 19 diagnostic categories into per-chapter creative requirements |
| [Writing benchmark](https://github.com/lechmazur/writing) | Blind pairwise release comparison | Absolute 0–10 self-scores as a publication gate |

## Four sources of truth

There are exactly four story artifacts:

1. `StoryKernel`: immutable identity, cast, world rules, resources, voice, pleasure mechanism and ending direction.
2. `ArcPlan`: the current 20–30 chapter objective, active conflicts, due promises and terminal changes.
3. `StoryState`: current physical canon plus bounded outcomes of accepted chapters.
4. `rollingPlan`: mechanical plans for at most five uncommitted chapters, stored on the factory job.

Research, market taxonomy and reference works exist only in Concept Lab. They never enter Writer context.

Concept Lab uses six calls with clean responsibilities: two independent generators, one blind judge, one Google-Search-grounded technical dossier for the top two concepts, one structured opening/domain simulator, and one Launch Architect. Launch creates only Kernel, first Arc and initial State. The normal Planner owns every rolling plan, including chapters 1-5. Grounding queries and source URLs stay in immutable setup telemetry and never enter Writer context.

### Three kinds of memory, not three subsystems

- **Physical memory:** current facts, time, locations, knowledge, relationships, resources and promises in `StoryState`; immutable deltas in `story_state_events`.
- **Narrative memory:** the latest accepted `ChapterOutcome` records inside `StoryState`. This records what the reader experienced, not another copy of the ledger.
- **Future intent:** `ArcPlan` and `rollingPlan`.

`ChapterOutcome` is not a fifth artifact. It is a bounded row in `StoryState`, produced by the independent Editor from accepted prose and committed in the same transaction:

- chapter number and title;
- the principal event;
- its result;
- the concrete method used, when one exists;
- the ending situation;
- exact prose evidence spans.

The Writer does not receive recent outcomes. The Planner and Editor do. This preserves the rule: lock causality and state, release the telling.

## Runtime

```text
claim job
  -> validate Kernel / Arc / State
  -> render deterministic cover background/title when missing
  -> validate or create rollingPlan
  -> plan up to five chapters when needed
  -> Writer(previous prose tail + small mechanical brief)
  -> deterministic preflight
  -> independent Editor(state + recent outcomes + plan + prose)
  -> optional full rewrite
  -> mandatory re-edit
  -> atomic chapter + state + outcome + event commit
```

Normal chapters use two model calls. A prose repair uses four. There is no local patch, model/provider switch, old-draft publication or content fallback.

Timeline is mechanical: each scene has a positive duration, travel consumes time, and `storyTimeAfterMinutes` cannot be earlier than State time plus all planned scene/travel minutes. Every five-chapter review runs before daily-quota delay; quota controls new chapters, not quality gates.

If the Editor proves that the plan itself repeats a recently completed problem/method or contradicts canon, the Writer is not asked to repair the artifact. The uncommitted rolling window is discarded and may be replanned once with the evidence. A second plan failure blocks the job.

## Role boundaries

### Planner

Receives Kernel, current Arc, current State including recent outcomes, and optional evidence from one failed uncommitted plan. It plans only the next one to five chapters. It must advance from actual outcomes and must not restage a recently completed event, method and result unless the new chapter has a materially different causal escalation and result.

### Writer

Receives only the relevant Kernel/voice projection, current mechanical chapter plan, relevant current state, required deltas and 800–1,200 words from the end of the previous accepted chapter. It chooses prose, dialogue, pacing, emotion, scene boundaries and length. Word count is telemetry, not a quality gate.

### Editor

Receives the relevant canon, recent accepted outcomes, current plan and draft. It reports only verifiable issues with prose evidence or a missing delta. It additionally extracts the accepted `ChapterOutcome`; every evidence span must occur in the draft. Code—not the model—decides publication.

## Quality cadence

- **Every chapter:** canon, timeline, location, resources, knowledge, authority, POV, causal transition, required delta, character voice, natural prose, prompt leak and material repetition of recent completed beats.
- **Every five chapters:** progression, reward-loop variation, unresolved-thread movement and voice drift. This produces steering for the next rolling plan; it does not rewrite public canon.
- **Every arc:** terminal change, promise ledger, progression and ending feasibility.
- **Every release:** frozen blind pairwise benchmark against the last production release.

Creative traits such as surprise, payoff size and recovery pacing are window/arc properties. They are not mandatory boxes in every chapter.

## Boundedness

- `StoryState` keeps only the latest 12 `ChapterOutcome` records.
- Current physical state is a snapshot, not an append-only recap.
- `story_state_events` is the immutable recovery/audit ledger and is queried by stable entity IDs when distant canon is needed.
- No vector database or RAG is added until a measured long-run failure demonstrates that typed entity/event lookup is insufficient.

## Failure classes

- Provider, billing, timeout or schema transport: `infra_blocked`.
- Kernel/State invalid: `setup_blocked`.
- Invalid or twice-rejected uncommitted rolling plan: `plan_blocked`.
- Prose still fails after one full rewrite: `quality_blocked`.

None of these changes canon or selects a fallback provider.

## Proof milestones

- 10 hidden chapters: release can write and commit a launch window.
- 30 chapters: continuity and first arc transition are clean.
- 100 chapters: repeated rolling plans and multiple arc transitions survive.
- Five stories × 100 chapters: open the first 30-story cohort.
- One story completed within 800–1,200 chapters: only then is the full lifecycle proven.
