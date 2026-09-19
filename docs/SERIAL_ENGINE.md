# Serial engine

The replacement for the story factory. It writes web serials in the Faloo mould: short
cycles of pressure and release, a golden finger that evolves, a named rank ladder, and a
hook at the end of every chapter.

Design rationale: [`REDESIGN_PLAN.md`](REDESIGN_PLAN.md). Chapter craft, measured from real
Faloo chapters: [`FALOO_CRAFT.md`](FALOO_CRAFT.md). The old system it replaces is documented
in [`STORY_FACTORY.md`](STORY_FACTORY.md) and still runs beside it, untouched.

## Shape

```
cron */5  →  /api/cron/serial  →  reconcile_serial_jobs  →  runSerialTicks()
                                                                ↓
                                        claim_serial_job (Postgres, SKIP LOCKED)
                                                                ↓
                              plan_cycle → write × N → publish_cycle → [fold_volume] → …
```

| Stage | What happens | Next |
|---|---|---|
| `plan_cycle` | Plan a 5–15 chapter cycle, or refresh the rolling three beat sheets inside the open one | `write` |
| `write` | Writer → Judge → [repair] → [rewrite] → Extractor → merge → commit as a **draft** | `write`, or `publish_cycle` at the cycle's last chapter |
| `publish_cycle` | Flip the whole cycle from draft to published in one transaction | `plan_cycle`, or `fold_volume` every 10 cycles |
| `fold_volume` | Compress the Bible: recent chapters become one volume paragraph | `plan_cycle` |

Readers never see a partial cycle. Chapters land in `chapters` with
`publication_state = 'draft'`, which existing RLS already hides from `anon` and
`authenticated`.

## Artifacts

| Artifact | Lives in | Written by |
|---|---|---|
| `Premise` | `serial_novels.premise` | Versioned catalog/model output, then **a human approves it** |
| `Bible` | `serial_novels.bible` | Rewritten every chapter by the deterministic merge |
| `CyclePlan` | `serial_cycles.plan` | Cycle planner |
| `ChapterDigest`, `JudgeVerdict` | `serial_runs` | Extractor and Judge |

The Bible splits in two. `symbolicCore` holds only what a reader would catch a
contradiction in — who is dead, which named rung someone holds, where they stand, what day
it is, which hooks are still open — and is machine-checked by ten rules in `state.ts`.
Everything else is prose the models read and rewrite.

## What the Writer sees

Beats for this chapter, the golden finger's current rung, the relevant cast sheets, the
last 800 words of the previous chapter, worn-out phrases to avoid, and `khongDuocTrai` —
the short do-not-contradict list. It may invent everything else.

That is the inversion against the old engine, which handed the Writer a ledger of required
deltas and asked it to dramatise them. `architecture` tests assert the brief contains no
`requiredDelta` or `mechanicUse`.

## Craft lives in data, not in prompts

`src/services/serial/playbook.json` holds every rule about taste: how to open a chapter,
what a payoff should feel like, what readers have turned against this season. `prompts.ts`
composes them in. The seam is deliberate — **code owns contracts, the playbook owns taste**,
and they rot at very different speeds.

This was learned the hard way. Three craft corrections landed in one afternoon (advantages
that punish their owner, commerce that crawls instead of jumping, gimmick conditions bolted
onto a premise) and each one meant editing TypeScript, re-running the suite and shipping a
deploy to change a sentence about taste.

Every rule carries `evidence` and `observedAt`, so a stale rule is visible:

```bash
npm run craft:audit                          # rules not re-checked in 120 days
npm run craft:audit -- --days=60 --print=premise
```

Payoff kinds are an **open registry** in the same file, not an enum. The closed list of
fifteen could not express "an ally wins using something the protagonist gave them" — a
named, popular pattern — which is exactly the failure a closed taxonomy produces. Adding a
kind is a data edit.

`setPlaybook()` lets a caller swap the whole playbook, so a database-backed version needs
no changes at the call sites. Today it is a file, which means editing craft still ships a
deploy; it no longer touches schemas, tests or prompt code.

## Who wins on stage

`Premise.payoffStance` is `front`, `broker` or `mixed`, and every cycle climax records
`performedBy` and `attribution`. A broker story wins through other people: allies carry
what the protagonist gave them and the reader, not the crowd, knows where it came from.

`assertStanceHeld` guards both drifts, because each is invisible one cycle at a time and
obvious ten cycles later: a broker story that keeps putting the protagonist on stage stops
being that story, and one where nobody ever learns who was behind it leaves the reader
nothing to hold.

## Failure policy

Nothing parks waiting for a repair.

| Failure | Response |
|---|---|
| Provider error or timeout | Lease released, retried in 5 minutes on the same route |
| Judge cites a contradiction | One targeted repair against the quoted passages |
| It survives the repair | One clean rewrite with the findings in front of it |
| It survives that too | `replan_serial_cycle`: drafts deleted, Bible restored to the cycle checkpoint, plan again |
| A cycle replans twice | Job `paused` — the one place a person is needed, and the job is to **read**, not to repair |
| Lease expires mid-stage | `reconcile_serial_jobs` returns it with exponential backoff |

A low reading score never blocks anything. It flows into the next cycle plan as steering.

## Two launch gates

Launching is deliberately two decisions, not one:

1. `awaiting_approval`: a person reads the one-page Premise. Approval allows spending to
   plan and write, but nothing is public.
2. `opening_review`: chapter four commits atomically with this status. The cron cannot
   claim chapter five. `/admin/serial` renders all four private drafts; a second approval
   records `opening_reviewed_at` and lets the story finish its first cycle.

The first cycle remains private until every chapter in it exists and the normal atomic
publish stage runs. Approval of the opening is therefore permission to continue, not a
publication side effect.

## Song Xuyên catalog

Ten production-shaped premises live under `factory/serial/song-xuyen/`. They carry full
cast, six-step advantage evolution, four conflict dimensions, a hidden line and an explicit
payoff stance. `src/services/serial/catalog.ts` adds review-only evidence that does not
belong in the immutable Premise: chapter-one proof, the named buyer at each end, and where
the other world's currency stays as working capital.

```bash
npm run serial:premises                         # validate and list all ten, no credentials
npm run serial:premises -- --id=phe-dan-thuc-tinh
npm run serial:operator -- seed --premise=factory/serial/song-xuyen/03-phe-dan-thuc-tinh.json
```

The first three pilot candidates are `phe-dan-thuc-tinh`, `hang-ma-phap-khi`, and
`tiep-van-cuu-chin-thanh`. Ranking is a review order only; it does not seed, approve, call a
provider or spend money.

## Tables and RPCs

`serial_novels` · `serial_cycles` · `serial_jobs` · `serial_runs` — all service-role only,
RLS on, no reader-facing policy.

`claim_serial_job` · `commit_serial_chapter` · `publish_serial_cycle` ·
`replan_serial_cycle` · `reconcile_serial_jobs`.

`commit_serial_chapter` is the atomic unit: the draft chapter, the new Bible, the run
telemetry and the job cursor move together or not at all.

## Operating

```bash
npm run serial:operator -- status                                    # every story, with its reading score
npm run serial:operator -- seed --premise=<file.json> --apply        # create a hidden novel + job
npm run serial:operator -- approve --job-id=<id> --apply             # approve premise, then later opening
npm run serial:operator -- read --job-id=<id> --chapter=1            # read one of the four private drafts
npm run serial:operator -- pause|resume --job-id=<id> --apply
```

Admin UI at `/admin/serial`: reading score over the last ten chapters, cost, stage, and the
premise approval, the four opening drafts, opening approval, reading score, cost and
pause/resume controls. There is no block count to show, because there are no quality-block
statuses.

Offline rig, no database and no publishing:

```bash
npm run serial:run -- --premise=factory/serial/he-thong-tham-dinh.json --chapters=4
npm run serial:run -- --premise=... --chapters=15 --apply     # the only form that spends
```

## Environment

```
SERIAL_ENGINE_ENABLED=true     # required for the cron to do anything
CRON_SECRET                    # same secret as every other cron
NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, OPENAI_API_KEY
```

`maxDuration` on `/api/cron/serial` is 300s, the ceiling without Fluid compute. A chapter is
a write, a judge and an extract — roughly 150s — so it fits, and the tick loop refuses to
start a stage it cannot finish. Enabling Fluid on the Vercel project allows raising it to
800s, at which point the same code simply drains more stages per invocation.

## Status

Phases 1a and 3 of the plan are built, along with the ten-premise Song Xuyên catalog and the
two launch gates. Catalog entries are source data only: none is seeded, approved or charged
by adding it to the repository. The next spending decision is still a four-chapter pilot.
