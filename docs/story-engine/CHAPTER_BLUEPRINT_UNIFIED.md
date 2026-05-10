# Unified Chapter Blueprint System

**Status**: Active từ 2026-05-10. Combines Codex's DB-backed `chapter_blueprints` table với Claude's file-based authoring + 5-cluster pattern.

Dùng cho mọi novel ≥1000 chương target. Cả Codex và Claude đều theo flow này.

## Kiến trúc 6 layer

| Layer | Owner | Responsibility |
|---|---|---|
| 1. Authoring | Claude (file-based) | TS modules trong `blueprints/<id>/` |
| 2. Storage | Codex (DB) | `chapter_blueprints` + `story_blueprint_runs` tables |
| 3. Sync | Both | `scripts/sync-blueprint.ts` đọc file → write DB |
| 4. Universal patterns | Claude | `universal-bans.ts` (3 arrays: literal terms / guidance / tone) |
| 5. Writer integration | Codex | `flash-cheap-routine.ts` reads `chapter_blueprints` rows |
| 6. Lifecycle | Codex | planned → used → repaired/invalid |

## File tree

```
src/services/story-engine/blueprint/
  types.ts            # ChapterBrief (rich, unified Codex + Claude fields)
  universal-bans.ts   # UNIVERSAL_FORBIDDEN_TERMS + UNIVERSAL_BANNED_PATTERNS + UNIVERSAL_TONE_DIRECTIVES
  sync.ts             # syncBlueprintToDb() — writes chapter_blueprints rows
  index.ts            # barrel export
  README.md           # quick-start

src/services/story-engine/plan/
  chapter-blueprints.ts  # writer integration (assertChapterBlueprintReady, formatChapterBlueprintContext, evaluateBlueprintAlignment, markChapterBlueprintUsed)

blueprints/<novel-id>/
  arc-skeleton.ts     # 7+ arcs × sub-arcs
  arc-N-detail.ts     # detailed chapter briefs per arc
  index.ts            # exports NovelBlueprint

scripts/
  sync-blueprint.ts                # generic CLI: sync + activate
  generate-chapter-blueprints.ts   # legacy heuristic generator (Codex's, for repair)

supabase/migrations/0169_chapter_blueprint_map.sql
  # Defines chapter_blueprints + story_blueprint_runs tables
```

## ChapterBrief unified shape

```ts
{
  // Position
  n: number;                  // chapter_number
  beat: BeatType;             // setup/breathing/confront/big_wow/resolution (Claude's 5-cluster)
  volumeNumber?, arcNumber?, subArcNumber?;

  // Story (Codex's rich fields → DB columns)
  titleHint?, goal?, conflict?, payoff?, endingHook?;
  cast?: string[], location?;

  // Mechanics (Codex's domain-specific deltas → DB columns)
  resourceLedgerDelta?, worldStateDelta?, speciesDelta?,
  templateInspiration?, authorityConstraints?;

  // Bans
  forbiddenTerms?: string[];  // literal strings auto-checked post-write (Codex semantic)

  // Authoring (Claude's → DB meta JSONB)
  brief?: string;             // legacy 1-line — falls back to goal
  scenes: string[];           // 4-7 phrases
  mcBenefit: string;          // concrete payoff with keyword
  threadsAdvance?, threadsResolve?, newThreads?;
  risks?: string[];           // high-level guidance (NOT literal terms — for prompt only)
}
```

## Storage layout

`chapter_blueprints` table (1 row/chương):

| Column | Source | Notes |
|---|---|---|
| chapter_number | brief.n | UNIQUE per (project_id, chapter_number) |
| volume_number, arc_number, sub_arc_number | brief.* / arc skeleton | |
| title_hint, goal, conflict, payoff, ending_hook | brief.* | Falls back: goal ← brief, payoff ← mcBenefit |
| cast, location | brief.* | |
| resource_ledger_delta, world_state_delta, species_delta | brief.* | |
| template_inspiration, authority_constraints | brief.* | |
| forbidden_terms TEXT[] | merged: UNIVERSAL_FORBIDDEN_TERMS + extraForbiddenTerms + brief.forbiddenTerms | Auto-checked by `evaluateBlueprintAlignment` |
| status | 'planned' (default) | Lifecycle: planned → used → repaired/invalid |
| version | sync arg (default 1) | |
| meta JSONB | beat, scenes, mcBenefit, threadsAdvance/Resolve/new, sceneDirection, riskGuidance, toneDirectives | Claude's additions; future migration may promote to columns |

`arc_plans` row (legacy arc-level context):
- `plan_text` — sub-arcs + universal bans + tone (still loaded by writer for synopsis context)
- `chapter_briefs[]` JSONB — DEPRECATED, sync sets to `[]`. Kept as schema column for backward compat with legacy writer code paths.

## Sync workflow

```bash
# 1. Author blueprint trong blueprints/<novel-id>/
# 2. Run sync (planned status, không activate writer):
PROJECT_ID=<uuid> BLUEPRINT=<novel-id> npx tsx scripts/sync-blueprint.ts

# 3. Khi all 1..totalChapters covered, activate (gates writer to chapter_blueprints):
PROJECT_ID=<uuid> BLUEPRINT=<novel-id> npx tsx scripts/sync-blueprint.ts --activate
```

`syncBlueprintToDb()` does:
1. For each arc with non-empty briefs[]:
   - Upsert `chapter_blueprints` rows (1/chương) with status='planned'
   - Upsert `arc_plans` row (plan_text + sub_arcs only; `chapter_briefs[]` cleared)
2. Recompute coverage (count rows for project_id+version, find missing/invalid)
3. Upsert `story_blueprint_runs` row with coverage status (valid/invalid)
4. If `--activate` AND coverage OK:
   - Set `style_directives.require_full_chapter_blueprint=true`
   - Set `style_directives.chapter_blueprint_version=N`
5. If `--activate` AND coverage INCOMPLETE: throw error (refuse to activate).

## Writer integration (already wired in flash-cheap-routine.ts)

Pre-write gate (`assertChapterBlueprintReady`):
```ts
if (style_directives.require_full_chapter_blueprint === true) {
  // Refuse if blueprint missing or invalid
  // Throws CHAPTER_BLUEPRINT_MISSING_OR_INVALID
}
```

Context injection (`formatChapterBlueprintContext`):
- Inject all DB column fields + meta JSONB into writer prompt
- Writer expands brief into prose; goal/payoff/resource/authority constraints must hold

Post-write check (`evaluateBlueprintAlignment`):
- Regex check forbidden_terms (literal containment)
- Authority constraint check (regex pattern matching)
- Resource ledger signal check (must mention source/cost/gain if delta present)
- Payoff keyword match (≥2 keywords from blueprint.payoff must appear in chapter content)

Lifecycle (`markChapterBlueprintUsed`):
- After successful chapter write, sets `status='used'` + records `actual_summary_delta`

## 5-cluster beat pattern (Claude's contribution)

Default beat allocation per cluster of 5 chapters:

| Position | Beat |
|---|---|
| ch.X+0 | setup (introduce next conflict / observe / plant) |
| ch.X+1 | breathing (warm scenes, family, mentor, training) |
| ch.X+2 | confront (face-off with antagonist or obstacle) |
| ch.X+3 | big_wow (mass face-slap / milestone / evolve visible) |
| ch.X+4 | resolution + breathing nhẹ (consolidate + setup next) |

1000 ch / 5 = 200 clusters → 200 big_wow events. Sảng văn standard.

Universal bans (`UNIVERSAL_BANNED_PATTERNS`): 9 patterns catching common AI drift (paranoia cliffhanger, MC chõ mồm, double-evolve, cosmic antagonist quá sớm, etc.).

## Migration cũ → unified

Cho project đã có `arc_plans.chapter_briefs[]` (Claude's legacy):
1. Read existing briefs
2. Run sync via new CLI → upserts `chapter_blueprints` rows
3. `--activate` để switch writer

`scripts/migrate-arc-plans-to-chapter-blueprints.ts` (TBD) automates step 1+2.

## Audit checklist

Sau mỗi chương:
- [ ] `quality_metrics.overall_score` ≥ 7
- [ ] `continuity_health.verdict='pass'`
- [ ] `chapter_blueprints.status` updated to 'used' (lifecycle correct)
- [ ] Đọc FULL content (không peek 500 chars)
- [ ] Cliffhanger không paranoia
- [ ] MC tone match preset
- [ ] Pet/skill/cảnh giới state khớp với brief.goal/payoff (no double-evolve)
- [ ] `evaluateBlueprintAlignment` returned no critical issues (forbidden_terms, authority, ledger, payoff_mismatch)
- [ ] `chapter_summaries.cliffhanger` khớp expected next-chapter setup (chapter_blueprints[n+1].goal)

## Auto-derived item bans (itemLedger)

Mọi novel có items đặc biệt sẽ được introduce ở chương cụ thể (vd
"Vòng Linh Tinh" giới thiệu ch.10). AI có thể nhắc các items này SỚM
hơn khi không có source ledger → trigger `resource_without_source` gate
+ false positive.

`NovelBlueprint.itemLedger[]` declare items + introduction chapter:

```ts
itemLedger: [
  { name: 'Vòng Linh Tinh', introChapter: 10, aliases: ['vòng đeo tổ phụ'] },
  { name: 'bản đồ Bắc Vực', introChapter: 50 },
],
```

Sync auto-adds các items này vào `forbidden_terms[]` + `sceneDirection`
của MỌI chương `< introChapter`. Sau introChapter, item established —
no ban. Replaces hardcoded `BAN_RESOURCES` whack-a-mole pattern.

## Cosmic-tier config

Cosmic-tier elements (god lore, primordial origin, pháp tắc) chỉ nên
xuất hiện ở 70%+ novel length. AI hay invent sớm.

`NovelBlueprint.cosmicArcStartChapter` (default 70% × totalChapters)
+ `NovelBlueprint.cosmicTierPatterns` (default UNIVERSAL_COSMIC_PATTERNS)
được persist vào `project.style_directives.cosmic_arc_start_chapter` +
`cosmic_tier_patterns` khi sync. Delta-detector + future engine gates
read từ đó.

## Maintenance

Khi tìm thấy 1 drift pattern mới (qua audit hoặc reader feedback):

- **Literal banned phrase** (e.g., "có ai theo dõi") → add vào
  `UNIVERSAL_FORBIDDEN_TERMS` (universal-bans.ts) → auto-checked post-write
- **High-level guidance** (e.g., "MC không tự khoe") → add vào
  `UNIVERSAL_BANNED_PATTERNS` → into prompt
- **Tone shift** (e.g., "lạnh đạm + tự tin") → add vào
  `UNIVERSAL_TONE_DIRECTIVES`
- **Cosmic pattern** (e.g., "thần điển") → add vào `UNIVERSAL_COSMIC_PATTERNS`
- **Per-novel only ban guidance** → `blueprints/<id>/index.ts`
  `extraBannedPatterns` / `extraForbiddenTerms`
- **Item not yet introduced** → `blueprints/<id>/index.ts` `itemLedger[]`
  with introChapter
- **Different cosmic timing** → `blueprints/<id>/index.ts`
  `cosmicArcStartChapter` + `cosmicTierPatterns`

Re-sync: `PROJECT_ID=X BLUEPRINT=Y npx tsx scripts/sync-blueprint.ts` → áp dụng cho mọi chương `status='planned'` chưa viết.

## Quick FAQ

**Q: Codex's heuristic generator (`scripts/generate-chapter-blueprints.ts`) còn dùng không?**
A: Yes — fallback khi novel không có file blueprint. Generates rows từ heuristic + per-novel hardcoded patches. File-based authoring (Claude's pattern) preferred cho quality.

**Q: `arc_plans.chapter_briefs[]` JSONB còn không?**
A: Schema column còn (backward compat) nhưng sync clears array thành `[]`. Single source of truth = `chapter_blueprints` table. Writer gates via `require_full_chapter_blueprint` flag.

**Q: Tôi có brief shape cũ (chỉ `brief` + `mcBenefit`), có cần migrate?**
A: Không bắt buộc. Sync fallback: `goal ← brief.brief`, `payoff ← brief.mcBenefit`. Nhưng để dùng đầy đủ Codex's rich validation (authority, resource ledger), nên upgrade brief với explicit `goal`, `payoff`, `resourceLedgerDelta`, `authorityConstraints`.

**Q: Khi nào activate (--activate flag)?**
A: Sau khi blueprint covers tất cả 1..totalChapters. Activate gates writer — refuses chapters missing blueprint.
