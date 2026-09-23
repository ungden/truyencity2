# CLAUDE.md — TruyenCity

Vietnamese web-novel platform. AI writes the novels; readers read them on web and mobile.

**Read [docs/STORY_FACTORY.md](docs/STORY_FACTORY.md) before touching anything that writes
chapters.** This file covers everything else. `.claude/CLAUDE.md` covers the reader-facing
app, mobile, database and release process.

> Everything written here describes code that exists today. If you find a doc, a comment or
> a memory describing `story-engine/`, `orchestrator.ts`, `chapter-writer.ts`, DeepSeek
> routing, `style_directives`, `USE_STORY_ENGINE_V2`, blueprints, codex-automation or a
> "5-layer architecture", it is describing a system deleted on 2026-07-20 (commit
> `554a5d2`, 1,496 files). Verify against the source before acting on any of it.

## Stack

Next.js 15 App Router · React 19 · TypeScript · Supabase (Postgres + pgvector + pg_cron) ·
Vercel Pro (`maxDuration` 300s hard ceiling) · Gemini for all generation.
Mobile: Expo SDK 54 at `/mobile/`.

Repo `github.com/ungden/truyencity2` (branch `main`) · `truyencity.com`.

## Two writing systems

`src/services/story-factory/` is the incumbent, documented below and in
[docs/STORY_FACTORY.md](docs/STORY_FACTORY.md). **It is stopped** — every job has been
blocked or cancelled since 2026-09-02 — and it is being replaced, not repaired. Do not
add validators or rules to it.

`src/services/serial/` is the replacement, built 2026-09-19. Read
[docs/SERIAL_ENGINE.md](docs/SERIAL_ENGINE.md) before touching it, and
[docs/REDESIGN_PLAN.md](docs/REDESIGN_PLAN.md) for why it exists. Its first two pilots
(20 chapters, premise v3 "lived-causality") read as inspection logs, not 爽文 — see
[docs/WRITING_SYSTEM_AUDIT_2026-09-23.md](docs/WRITING_SYSTEM_AUDIT_2026-09-23.md). v3 is
retired; only schema v2 premises launch, numbers are owned by the planned ledger, and
arithmetic never discards a chapter. `SERIAL_ENGINE_ENABLED=true` in production since
2026-09-24; the first story on it is *Song Xuyên Mạt Thế: Cửa Hàng Của Ta Bán Công Pháp Tu
Tiên* (slug `cua-hang-cua-ta-ban-cong-phap-tu-tien`).

Vercel has two projects building this repo. **`truyencity2` is production** (owns
`www.truyencity.com`, holds the secrets). `truyencity` is the one this checkout is
`vercel link`ed to; it has no environment variables. Change env vars on `truyencity2`.

**When Serial writes a weak chapter, fix the premise or the plan — never forbid an event,
never gate on arithmetic, never add a rejection rule for one failure.** That fix is how all
four engines here died. `src/__tests__/serial/policy-lock.test.ts` enforces it; do not
loosen it to make a change pass.

## The writing system (incumbent)

One service, one cron, one queue: `src/services/story-factory/` → `/api/cron/story-factory`.
17 files, no subdirectories. Full documentation in [docs/STORY_FACTORY.md](docs/STORY_FACTORY.md).

The short version:

- **Stages**: setup → cover → plan → write private drafts → (revise) → window_review → publish 5 → arc → loop.
  One stage per tick; one invocation drains as many as its time budget allows.
- **Agents**: Planner and Plan Judge decide what happens; Writer and Editor produce and
  check the prose. Exactly one rewrite is allowed, and it runs in its own tick.
- **State** is a deterministic transition validated before any model call. `validation.ts`
  owns it; the models never invent durable state.
- **Two identities**: `STORY_FACTORY_RELEASE` (artifact compatibility — gates claiming) and
  `STORY_FACTORY_REVISION` (generation quality — telemetry only). Improving a prompt does
  not orphan running novels.
- **Gate**: a writing smoke proves the machine runs. Every production window is written as
  five private drafts, reviewed, then atomically auto-published only when it passes.

```bash
npm run factory:writing-smoke -- --apply      # authorize the current release
npm run factory:operator -- status            # what the fleet is doing
npm run factory:operator -- revive --apply    # un-park blocked jobs
```

`STORY_FACTORY_ENABLED=true` is required for any writing to happen at all.

## Models

Exact routes live in `src/services/story-factory/routes.ts`. All Gemini.

**No substitution, ever.** If the routed model fails, the stage throws and the job retries
the SAME route on a later tick — never a different model or a template. The provider
dispatches by model id: slash-vendor ids (`deepseek/…`) go through OpenRouter, `gpt-*`
direct to OpenAI, the rest to Gemini. `architecture.test.ts` enforces the no-substitution
structure.

Changing a model is a quality decision, not a config tweak: run `factory:model-bakeoff`,
then re-run the writing smoke — that is what the claim gate checks.

## Supreme goals

The standard the writing system is judged against.

1. **Coherence from chapter 1 to the last** — no plot holes, no logic breaks.
2. **Character consistency** — the dead stay dead; power and rank never regress without cause.
3. **Directional progression** — escalating conflict, real climaxes, paid-off setups.
4. **A natural ending somewhere in 800–1,200 chapters**, chosen by the story, not a counter.
5. **Uniform quality** — chapter 800 reads as well as chapter 8.

Cost is secondary to quality, but it is measured: `story_factory_runs.estimated_cost_usd`,
target median ≤ $0.25 per chapter.

Goals 1–3 are defended by the causal validator, the event ledger and window review. Goals
4–5 have no production evidence yet — no novel has run long enough. Do not claim otherwise.

## Environment

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
OPENAI_API_KEY               # gpt-* text routes and the default cover model
COVER_IMAGE_MODEL            # optional; default gpt-image-2.5-sunburst
CRON_SECRET
STORY_FACTORY_ENABLED=true
SERIAL_ENGINE_ENABLED=true   # the replacement engine; unset today
```

`verifyCronAuth` falls open in development when `CRON_SECRET` is unset. Make sure it is set
in every deployed environment.

## Verification

Run all three before pushing. They are cheap, and they are the only thing between a change
and a silent production stall.

```bash
npm run typecheck
npm test                 # 489
npm run security:secrets
```

## Conventions

- Commits: `type: description` (`fix`, `feat`, `perf`, `refactor`, `docs`).
- Push to `main` auto-deploys to Vercel. Never force-push. Never commit `.env.local`.
- User-facing Vietnamese text must carry full diacritics. Slugs, identifiers and the brand
  name `TruyenCity` do not.
- No mention of AI anywhere a reader can see.
