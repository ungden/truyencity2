# Narrative Foundation vNext — implementation report

Status: the original eight issues and the eight additional findings in the [post-fix audit](NARRATIVE_FOUNDATION_POSTFIX_AUDIT_2026-09-21.md) are remediated in the working tree. Semantic evidence verification, durable knowledge snapshots, layer-correct review routing, prompt consistency, review context, resumable paid stages, cycle publication review, voice overrides, and usage-preserving localized correction now have regression coverage.

Implemented as an opt-in contract named `lived-causality-2026-09-21.1`. Existing Serial premise v2 / cycle v1 and Story Factory projects without a `craftProfile` keep their legacy validation and prompts. No stored story, draft chapter, public chapter, job, or release state is migrated by this change.

## Shared contract

- `NarrativeFoundation` records character life before the advantage, lived world conditions, acquisition and experiments, author facts, initial character knowledge, and prerequisite-based milestones.
- `NarrativeEvidence` records only what has appeared on the page, with a chapter and exact quote. It is separate from author truth.
- `NarrativeReview` returns grounded findings and routes each one to `foundation`, `plan`, or `prose`.
- The shared craft profile has genre adapters for two-world commerce, cultivation growth, and civilization technology. It explicitly permits daily life, relationship, reflection, and discovery scenes without a forced transaction or level-up.

## Serial v3

- Premise v3 requires the shared foundation. Premise v2 rejects it, preventing a story from silently switching policies.
- Cycle plan v2 permits `customerLoop: null`, empty witnesses, nullable new names, and the new scene modes. Beats declare prerequisites, fact reveals, and milestones advanced.
- Code checks every prerequisite against initial knowledge plus committed narrative evidence. Extracted quotes must occur verbatim in prose, a first fact reveal must belong to the approved beat, and a milestone cannot advance outside the beat or before its prerequisites.
- Writer, judge, extractor, planner, and opening audit receive role-specific foundation guidance. The extractor can only commit grounded narrative evidence.
- Foundation and plan findings pause at their owning layer. Blocking prose findings reject the private opening instead of being committed; they are not converted into foundation or plan repairs.
- Writer/Judge/Revision/Extractor/Verifier/Literary checkpoints resume from the last completed artifact. A retry no longer regenerates accepted prose or double-books earlier usage.
- Every v3 cycle receives a literary review before publish, not only the four-chapter opening. The reviewer receives the complete rolling-plan history plus start/end knowledge state. Runtime and SQL both reject a missing, stale or blocking review.
- Legacy Bible evidence is backfilled into durable character knowledge before its bounded quote history is truncated. Foundation and Serial share a backward-compatible 64-character ID contract, and fact/milestone namespaces cannot collide.

## Story Factory opt-in

- A commission may carry the same craft profile. Setup must preserve it through the selected market blueprint and generated kernel foundation.
- Profiled setup no longer requires chapter 1/3 payoff proofs or the legacy chapter 1/3/5/7/10 commercial schedule.
- Planner, plan judge, writer, editor, revision, and five-chapter review receive the shared rules. Profiled roles select the new creative policy rather than appending it to retired cadence/deadline rules. Writer context includes the lived foundation and an explicit author-truth versus character-knowledge boundary.
- Five-chapter review runs the existing continuity pass plus a literary pass. Non-minor foundation or plan findings block upstream; blocking prose findings return the private window to repair and cannot reach publication.
- Legacy setup and runtime behavior remain unchanged when no profile is present.

## Private pilot

`factory/serial/song-xuyen/private/song-xuyen-tuong-lai-v3-review.json` contains a private foundation and opening progression for rebuilding *Song Xuyên Tương Lai* from chapter 1. It begins with Trần Khải's shop life, the physical discovery and bounded tests of the door, observation of the future world's ordinary economy, and selection of a small broken razor as a research sample. It does not replace either public premise package and is not imported by the production catalog.

## Storage and rollout

Foundation state still fits the existing JSON/JSONB artifacts (`premise`, `bible`, `market_blueprint`, `story_kernel`, and run `output_artifact`). One additive migration adds `serial_runs.draft_artifact`; a second adds cycle plan history, literary review, fingerprint and the exact reviewed chapter snapshot. Activation remains per reviewed story by schema/profile version. The compatibility release remains `sf_0064f61f70c8afa1`, so legacy jobs stay claimable. The chapter-four human review gate remains in place; v3 cycle publication now has an additional automated fail-closed literary gate. Neither migration has been applied to production.

## Verification after remediation

- `npm test -- --runInBand`: 22 suites, 419 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed on Next.js 16.3.3.
- `npm run security:secrets`: passed.
- `git diff --check`: passed.

These checks establish contract and runtime behavior. They do not substitute for the planned same-model, similar-length literary A/B across the three genre groups or the user's reading approval. No model generation, database mutation, deployment, or public chapter replacement was performed.
