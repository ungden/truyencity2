# Blueprint Workflow — 1000-Chapter Pre-Plan

Mọi novel mới (>= 1000 chương target) PHẢI dùng blueprint workflow. Plan
toàn bộ chương trước khi AI viết bất kỳ chương nào → AI chỉ expand brief
→ drift impossible.

## Tại sao

Quan sát thực tế trên 5+ novels:

- AI tự sinh arc plan ad-hoc per arc → drift across arcs.
- AI tự sinh chapter brief ad-hoc → quên context cũ (ví dụ: pet đã evolve
  → AI re-evolve trong chương sau, gọi là "double-evolve drift").
- Engine `quality_metrics` không catch pattern drift (paranoia cliffhanger,
  MC chõ mồm, đối thủ pressure stack).
- Cron-driven write làm gatekeeping reactive (drift đã ship rồi mới fix).

→ Blueprint = đặt sườn cứng từ đầu. Tác giả (Claude/Codex) plan → AI viết
follow brief.

## Cấu trúc

```
src/services/story-engine/blueprint/
  ├── types.ts            # ChapterBrief, BeatType, ArcSkeleton, NovelBlueprint
  ├── universal-bans.ts   # UNIVERSAL_BANNED_PATTERNS + UNIVERSAL_TONE_DIRECTIVES
  ├── sync.ts             # syncBlueprintToDb()
  ├── index.ts            # re-export
  └── README.md           # this file

blueprints/<novel-id>/    # per-novel folder
  ├── index.ts            # exports the NovelBlueprint
  ├── arc-skeleton.ts     # 7+ arcs × sub-arcs (chapter ranges + theme + payoff)
  └── arc-N-detail.ts     # detailed chapter briefs per arc (5-7 line each)

scripts/
  ├── sync-blueprint.ts   # sync blueprint to DB
  └── spawn-novel.ts      # generic spawn (NEW)
```

## Per-chapter brief format

```ts
{
  n: 6,
  beat: 'breathing',  // setup | breathing | confront | big_wow | resolution
  brief: 'one-line chapter goal',
  scenes: ['scene 1', 'scene 2', ...],  // 4-7 short phrases
  mcBenefit: 'concrete benefit (must contain keyword: tài nguyên/uy tín/manh mối/network/...)',
  threadsAdvance: ['plot thread 1'],  // optional
  threadsResolve: ['...'],             // optional
  newThreads: ['...'],                 // optional
  risks: ['CẤM pattern X for this chapter'],  // optional, chapter-specific bans
}
```

**Universal bans** (`src/services/story-engine/blueprint/universal-bans.ts`)
get auto-injected into every chapter's `sceneDirection` field. Per-novel
extras live in `NovelBlueprint.extraBannedPatterns`.

## 5-chapter cluster pattern

Default beat allocation per cluster of 5 chapters:

| Position | Beat |
|---|---|
| ch.X+0 | setup (introduce next conflict / observe / plant) |
| ch.X+1 | breathing (warm scenes, family, mentor, training) |
| ch.X+2 | confront (face-off with antagonist or obstacle) |
| ch.X+3 | big_wow (mass face-slap / milestone / evolve visible) |
| ch.X+4 | resolution + breathing nhẹ (consolidate + setup next) |

1000 ch / 5 = 200 clusters → 200 big_wow events. Mật độ dopamine đại thần
sảng văn standard.

Per-arc payoff = arc-level big_wow (climax). Per-novel core_payoff = ending
big_wow.

## Workflow tạo novel mới

1. **Design focus preset** (nếu chưa có) trong
   `src/services/story-engine/codex-automation/focus-presets.ts`.
2. **Plan blueprint** — tác giả viết:
   - `blueprints/<novel-id>/arc-skeleton.ts` — 7+ arcs × sub-arcs
   - `blueprints/<novel-id>/arc-1-detail.ts`, `arc-2-detail.ts`, ... — chapter briefs
   - `blueprints/<novel-id>/index.ts` — exports `NovelBlueprint`
3. **Spawn novel + project DB rows** (sau dùng `scripts/spawn-novel.ts`).
4. **Sync blueprint to arc_plans**:
   ```bash
   PROJECT_ID=<uuid> BLUEPRINT=<novel-id> npx tsx scripts/sync-blueprint.ts
   ```
5. **Manual write ch.1-3** (`scripts/write-chapter-flash.ts`) + audit deep
   per chapter (đọc full content, không chỉ peek).
6. **Promote sang cron** khi 3 chương đầu pass — add project vào
   `FOCUSED_PROJECT_IDS` Vercel env + redeploy.

## Audit checklist mỗi chương

- [ ] `quality_metrics.overall_score` ≥ 7
- [ ] `continuity_health.verdict='pass'`
- [ ] Word count ≥ `flash_bulk_min_words` (typically 2600)
- [ ] **Đọc FULL content** (không peek 500 chars)
- [ ] Cliffhanger không paranoia ("kẻ rình mò", "ai đó theo dõi")
- [ ] MC tone match preset (lão lục/calm transmigrator/etc.)
- [ ] Pet/skill/cảnh giới state khớp brief (no double-evolve)
- [ ] `chapter_summaries.cliffhanger` khớp với expected next-chapter setup
- [ ] `character_states` extract đủ cast roster (≥ 4 by ch.10)
- [ ] `plot_threads` extract ≥ 3 threads by ch.20

## Maintenance

Khi tìm thấy 1 drift pattern mới (qua audit hoặc reader feedback), cập nhật:

- `src/services/story-engine/blueprint/universal-bans.ts` —
  add to `UNIVERSAL_BANNED_PATTERNS` nếu áp dụng cho mọi novel.
- `blueprints/<novel-id>/index.ts` `extraBannedPatterns` — nếu chỉ áp dụng
  cho novel đó.

Re-sync blueprint:
```bash
PROJECT_ID=<uuid> BLUEPRINT=<novel-id> npx tsx scripts/sync-blueprint.ts
```

Drift fix sẽ áp dụng cho mọi chương chưa viết (engine reads sceneDirection
fresh mỗi chương).
