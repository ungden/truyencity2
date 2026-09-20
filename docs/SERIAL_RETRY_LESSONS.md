# Editorial retry evidence and policy — 2026-09-21

## What the saved runs show

`npm run serial:rewrite:report -- --dir=/tmp` reads the 13 original rewrite bundles for the two pilots, excluding merged/final copies and deduplicating carried-over chapters by book, chapter number and content hash.

The retained artifacts contain 64 distinct candidate texts, 128 recorded writer attempts, 256 chapter model calls and 13 sequence audits. All 64 candidates used the automatic second attempt; none passed the original automatic acceptance gate. Recorded chapter cost is $7.203262 and sequence-audit cost is $0.827299. These are artifact totals, not a complete provider bill: missing intermediate attempts and identical-output retries cannot be recovered. Automatic rejection also does not establish that every paragraph was bad; stale context and score-only rejection contributed.

## Failures and changes at their source

| Observed failure | Root cause | Current behavior |
| --- | --- | --- |
| Mạt chapter 9 was told both “chưa trao cấp” and to receive the Nhất giai certificate | Corrections accumulated in an append-only direction list | One consolidated scene outcome; temporally scoped facts keyed by subject. Conflicting values for the same active key fail before a model call. |
| Rau v6 sequence audit still rejected the old eight-week supply digest and an already-completed warehouse hook | Derived digests from the superseded prose were treated as immutable truth | Editorial calls consume reviewed canon and current prose. Old digests/beats are absent. Digest/Bible reconciliation is a separate state task after reviewing the text. |
| Mạt chapter 4 was criticized for the old next chapter's inconsistent price | A future chapter scheduled for revision constrained the current writer | Only fixed neighbor text is a boundary. Scheduled neighbors are reconciled in the final sequence audit. |
| Every candidate triggered another full chapter generation | One score below 4 or any important issue caused an unconditional full rewrite | The quality threshold remains. Actionable prose findings can request one exact patch; context errors and score-only dissatisfaction return a review decision. |
| Later fixes introduced new inventory/ownership contradictions | Whole scenes were regenerated to repair a local detail; the last candidate always won | Exact, unique, non-overlapping replacements change at most 35% of text. Review history retains both candidates; a non-improving repair cannot replace the previous one. |
| Repeated manual bundle runs rewrote unaffected chapters and lost intermediate work | Prior review was pasted into a fresh generation; only the final batch was saved | Source bundles select chapters with grounded findings. Existing candidates start at review/repair. Per-chapter checkpoints include request/context hashes, history, decisions and usage; unchanged completed work is reused. |
| Planner learned only from successful chapters, with older notes taking precedence | Failed runs did not persist a verdict; the query excluded failures and reversed recency twice | Failed verdicts are saved and fetched with successful ones; newest feedback is prioritized. |
| Repeating errors always returned to `ready` after five minutes | Runtime treated configuration/schema bugs as transient and never incremented its failure counter | Deterministic failures pause for input correction. Transient failures get at most three failed stage invocations, with the counter reset on success. |

The normal chapter engine also removed the third, clean rewrite under unchanged context. After one repair, surviving evidence returns to the planner without asserting that the beat sheet must be at fault.

## How to use the revised editorial flow

1. Consolidate the scene outcome and scoped canon in `src/services/serial/editorial-pilots.ts`. Replace an obsolete fact or direction at its source.
2. Run `serial:rewrite` once for the requested chapters. A source bundle starts from its current candidates and routes sequence findings into review. With no explicit chapter list, only grounded non-minor findings select chapters.
3. Inspect `decision`, `history`, `diagnostics` and the final sequence audit. `context_review` means reconcile evidence/canon. `needs_review` preserves the quality gate. `repair_rejected` retains the stronger previous candidate.
4. Rerunning the same output path resumes matching checkpoints. A failed source candidate with unchanged context requires an actual context correction; `--restart=yes` is an explicit operator override, not automatic policy.
5. Apply only a reviewed package using the existing publication flow. The report and rewrite commands do not publish chapters.

## Verification and limits

Regression tests cover stale evidence, conflicting facts, score-only failures, local patching, rejected regressions, checkpoint resumption, retry selection and runtime failure feedback. Tests use stub providers and do not buy generations.

No live literary-quality or cost-improvement claim follows from these tests. Measure first-pass acceptance, repairs per chapter, repeated failure categories and cost per accepted chapter on the next authorized generation. Old published chapters remain as they were during this optimization.

The existing publication script still performs task-specific Bible/digest patches after its atomic chapter revision RPC. This change does not turn that into a full atomic re-extraction/replay. Provider-level transport retries are separate from editorial repairs and remain in the shared provider.
