# Placeholder Convention — Story Engine

Rules for any data hardcoded in system prompts / templates / voice anchors that
the Writer/Architect/Critic might LITERALLY COPY into output.

## Why this exists

The "Băng Hà Tận Thế MC name flip" bug (chapter 1-2 = "Lê Minh", chapter 3-4 =
"Trần Vũ", chapter 5 = "Lê Minh" again) happened because the mat-the voice anchor
prose sample used "Trần Vũ" as a literal example MC name. Writer copied it instead
of using `project.main_character` from context. Same risk applies to any literal
character / city / number example in any prompt.

## The convention

Use these placeholders in ALL prose samples + example data:

| Placeholder | Meaning | Replaced from |
|---|---|---|
| `<MC>` | Main character name | `project.main_character` |
| `<LOVE>` | Love interest | `story_outline.castRoster` (archeType=love-interest) |
| `<CITY>` | Primary location | `world_description` (BỐI CẢNH section) |
| `<COMPANY>` | Business entity name | `world_description` (CAST section antagonists) |
| `<NUMBER>` | Quantified goal (revenue / level / etc.) | `master_outline.majorArcs.keyMilestone` |
| `<TITLE>` | Novel title | `novels.title` |
| `<SKILL>` | Power / ability name | `world_description` (GOLDEN FINGER section) |

## Hard rules

1. **No literal character names** in voice anchors / prose samples / scene examples.
   Use `<MC>`, `<LOVE>`, etc.

2. **No literal city names** in genre-process-blueprints scene types or arc
   templates. Use `<CITY>` or refer abstractly ("primary city", "sect headquarters").

3. **No literal numbers as plot anchors** ("Doanh thu 100 tỷ"). Refer to source:
   "milestone từ master_outline.majorArcs[N].keyMilestone".

4. **Counter-example rule**: When you need to write "DON'T do X like 'Tô Mục'",
   rewrite as "DON'T copy literal placeholder names" — the literal "Tô Mục"
   itself becomes a leak target via LLM template-matching.

## Enforcement

`scripts/audit-prompts-for-leaks.ts` (run via `npm run lint:prompts`) scans
story-engine source files for FORBIDDEN_LITERAL_NAMES. Any match → exit 1.

Run before merging any PR that touches:
- `src/services/story-engine/templates/*.ts`
- `src/services/story-engine/pipeline/chapter-writer.ts`
- `src/services/story-engine/pipeline/master-outline.ts`
- `src/services/story-engine/pipeline/story-outline.ts`
- `src/services/story-engine/pipeline/context-assembler.ts`

## Defense in depth

The placeholder convention + lint is layer 1. P2-P4 add more layers:

- **P2.2 deterministic Critic check**: detectMcNameFlip() scans saved content for
  competing MC name candidates. Major/critical drift → REWRITE.
- **P2.4 synopsis MC name lock**: synopsis regen prompt forces expected MC name.
- **P4.2 chapter canary**: scans saved chapter for `<MC>` / `<LOVE>` literal
  leaks + MC name absence + VND currency leak. Surfaces to admin UI.
- **P4.3 regression audit**: `POST /api/admin/operations` action `regression_audit`
  audits last N chapters per active project for the same patterns.

## Adding a new placeholder

1. Pick the marker name: `<UPPERCASE_TOKEN>`
2. Add row to table above
3. Add to canary `placeholderMatches` regex in `orchestrator.ts:runChapterCanary`
4. Add to regression audit `placeholders` regex in `admin/operations:runRegressionAudit`
5. Document the source field (where it gets replaced from)

## Adding a new forbidden literal name

When voice anchors are extended (new genre / new sample with character name):

1. Replace literal in voice anchor source with `<MC>` (or `<LOVE>`)
2. Add the literal name to `FORBIDDEN_LITERAL_NAMES` in
   `scripts/audit-prompts-for-leaks.ts`
3. Run `npm run lint:prompts` — should pass

This way if someone reverts the placeholder later, the lint catches it.
