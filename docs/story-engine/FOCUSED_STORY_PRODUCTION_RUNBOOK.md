# Focused Story Production Runbook

Checklist cho lần sau tạo một bộ truyện mới chạy bằng cron rẻ, đặc biệt khi chạy song song với các bộ đang active. Mục tiêu của file này là tránh lặp lại các lỗi đã gặp khi thêm bộ `Thiên Đạo Thư Viện: Ta Dùng Văn Minh Trái Đất Phong Thần` ngày 2026-05-10.

## Golden Rule

Không coi "project đã active trong DB" là đủ. Một bộ mới chỉ được xem là đang tự viết khi tất cả điều kiện này cùng đúng:

- Project `status='active'`, `pause_reason is null`.
- Vercel production env `FOCUSED_PROJECT_IDS` có project id mới, không thay thế nhầm project id cũ.
- Production deployment mới đã được redeploy sau khi đổi env.
- `project_daily_quotas` có quota hôm nay hoặc ngày VN hiện tại, `status='active'`, `written_chapters < target_chapters`, `next_due_at <= now`.
- Cron log `/api/cron/write-chapters` có `active candidates` bao gồm project focus.
- DB có chapter mới, `quality_metrics.meta.provider='deepseek_flash_cheap_routine'`, `continuity_health.verdict='pass'`.

## Add A New Focus Story

1. Add or reuse a focus preset.

   Files to check:
   - `src/services/story-engine/codex-automation/focus-presets.ts`
   - `src/services/story-engine/codex-automation/genre-knowledge.ts`
   - `src/services/story-engine/pipeline/flash-cheap-routine.ts`
   - `src/__tests__/story-engine/focus-presets.test.ts`
   - `src/__tests__/story-engine/flash-cheap-routine.test.ts`

2. Seed the live project.

   The project must have a strong kernel before production:
   - `story_outline.setupKernel`
   - `world_description`
   - `main_character`
   - `master_outline`
   - `style_directives.focus_key`
   - `style_directives.flash_bulk_cheap_mode=true`
   - `style_directives.production_daily_chapter_quota=50`
   - `style_directives.target_chapter_length_override=3000`
   - `style_directives.flash_bulk_min_words=2600`
   - `style_directives.deepseek_thinking_tasks=["writer"]`

3. Update production focus allowlist.

   Pull production env and verify before changing:

   ```bash
   vercel env pull /tmp/truyencity-prod.env --environment=production
   grep -E '^(STORY_FOCUS_MODE|STORY_PRODUCTION_PAUSED|FOCUSED_PROJECT_IDS|WRITE_CHAPTERS_DAILY_QUOTA)=' /tmp/truyencity-prod.env
   rm -f /tmp/truyencity-prod.env
   ```

   Append the new id to `FOCUSED_PROJECT_IDS`; do not replace existing active focus ids:

   ```bash
   printf '%s' 'old-project-id,new-project-id' | vercel env update FOCUSED_PROJECT_IDS production --yes
   vercel deploy --prod --yes
   vercel inspect www.truyencity.com
   ```

4. Reset or create today's quota for the project.

   Use the same Vietnam-day convention as `getVietnamDayBounds`. The row should be:
   - `target_chapters=50` or project override
   - `written_chapters=0` for a new day, or the real already written count
   - `status='active'`
   - `next_due_at=now` when testing pickup
   - `retry_count=0`
   - `last_error=null`

5. Verify with DB, not vibes.

   Query these tables after every change:
   - `ai_story_projects`
   - `project_daily_quotas`
   - `chapters`
   - `quality_metrics`
   - `cost_tracking`
   - `chapter_summaries`
   - `story_memory_chunks`
   - `character_states`

## Known Failure Modes

### 1. Focus Env Missing New Project

Symptom:

- Project is `active`.
- Quota is due.
- Cron returns 200.
- Vercel log says `Step 1 OK: 1 active, 0 active candidates`.

Cause:

`FOCUSED_PROJECT_IDS` on Vercel production does not include the new project id. Local DB fixes will not help.

Fix:

Update Vercel env, redeploy production, then verify logs show `active candidates > 0`.

### 2. Env Updated But Deployment Still Uses Old Snapshot

Symptom:

- `vercel env pull --environment=production` shows the right value.
- Cron still behaves like old focus list.

Cause:

Serverless deployment uses the env snapshot from build/deploy time.

Fix:

Run:

```bash
vercel deploy --prod --yes
vercel inspect www.truyencity.com
```

### 3. Cast Roster Heuristic Blocks Fictional Names

Symptom:

`project_daily_quotas.last_error` contains:

```text
FLASH_CHEAP_GATE_BLOCKED: continuity/major: ... tên nhân vật MỚI ... không có trong cast roster
```

This is common in stories where the main character writes books, creates worlds, names techniques, or introduces in-story fictional characters. Regex may mistake book titles, martial techniques, factions, and crowd NPCs for canon cast drift.

Policy:

In `flash_bulk_cheap_mode`, cast-roster heuristic issues are soft audit signals, not publish blockers. True hard blockers still fail closed:

- dead character returns without mechanism
- resource impossible
- timeline contradiction
- canon object/faction impossible
- empty content or prompt leak
- word count below hard minimum
- no MC agency/payoff

Implementation pointer:

- `src/services/story-engine/pipeline/flash-cheap-routine.ts`
- `isFlashCheapHardCanonIssue`
- `src/services/story-engine/quality/canon-enforcement.ts`
- `isLikelyWorldTermCandidate`

### 4. Old Manual Focus Guard Pauses New Story After Publish

Symptom:

- A new chapter is actually published.
- `current_chapter` increments.
- Immediately after that, project becomes paused with:

```text
paused_by_codex_focus_guard: only sang-the-than-minh should run in this cron production window
```

Cause:

An old manual/Codex repair script or heartbeat still assumes only `sang-the-than-minh` may run.

Fix:

- Do not run old single-focus repair scripts for routine writing.
- Resume the project:

```sql
update ai_story_projects
set status='active', pause_reason=null, paused_at=null, updated_at=now()
where id='<new-project-id>';
```

- Verify the active production controller is the app cron allowlist, not a Codex heartbeat writer.

### 5. Retry Loop Burns Tokens

Symptom:

- `cost_tracking` shows repeated `writer`, `writer_retry`, `writer_expand`, `combined_summary` for the same chapter.
- `written_chapters` does not increase.
- `retry_count` climbs.

Fix order:

1. Read `project_daily_quotas.last_error`.
2. Decide if it is a true hard blocker or heuristic false positive.
3. Patch the deterministic gate or prompt.
4. Run focused tests.
5. Push to `main`.
6. Redeploy production.
7. Confirm next retry publishes.

Do not repeatedly trigger manual writes before reading the failure reason.

## Smoke Verification

Use direct DB evidence after the first cron tick:

```bash
node --import tsx - <<'EOF'
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const projectId = '<project-id>';
const novelId = '<novel-id>';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const [label, query] of [
  ['project', db.from('ai_story_projects').select('id,status,pause_reason,current_chapter,ai_model,style_directives,updated_at').eq('id', projectId).maybeSingle()],
  ['quota', db.from('project_daily_quotas').select('*').eq('project_id', projectId).order('vn_date', { ascending: false }).limit(3)],
  ['chapters', db.from('chapters').select('chapter_number,title,created_at').eq('novel_id', novelId).order('chapter_number', { ascending: false }).limit(5)],
  ['quality', db.from('quality_metrics').select('chapter_number,overall_score,word_count,meta,created_at').eq('project_id', projectId).order('chapter_number', { ascending: false }).limit(5)],
  ['costs', db.from('cost_tracking').select('task,chapter_number,cost,created_at,metadata').eq('project_id', projectId).order('created_at', { ascending: false }).limit(20)],
] as const) {
  const { data, error } = await query;
  console.log(`\n## ${label}`);
  console.dir(error ? { error: error.message } : data, { depth: 8 });
}
EOF
```

Check Vercel logs:

```bash
vercel logs --environment production --since 20m --query "write-chapters" --expand --limit 120 --no-follow
```

Expected:

- `Step 1 OK: ... active candidates ...`
- project `current_chapter` increases
- quota `written_chapters` increases
- `retry_count=0`
- `last_error=null`
- latest quality metric has `continuity_health.verdict='pass'`

## Required Tests Before Push

For cheap focused story changes:

```bash
npm test -- --runInBand src/__tests__/story-engine/flash-cheap-routine.test.ts src/__tests__/story-engine/focus-presets.test.ts
npm run typecheck -- --pretty false
```

If touching quota/focus selection:

```bash
npm test -- --runInBand src/__tests__/story-engine/cron-quota.test.ts src/__tests__/story-production-focus.test.ts
```

Then:

```bash
git status -sb
git add <changed-files>
git commit -m "<clear story production fix>"
git push origin main
vercel deploy --prod --yes
```

## Case Study: 2026-05-10 Thiên Đạo Thư Viện

Live project:

- project id: `cf63c678-a0b5-4df2-ae1c-6cb20210f589`
- novel id: `08c72bc6-982f-418e-b754-7f1fe0466112`
- title: `Thiên Đạo Thư Viện: Ta Dùng Văn Minh Trái Đất Phong Thần`

What went wrong:

1. Project was live and active, but Vercel production `FOCUSED_PROJECT_IDS` only listed `sang-the-than-minh`.
2. Cron ran but selected `0 active candidates` for the new story.
3. After env fix and redeploy, ch.2 started but failed on cast-roster heuristic false positive.
4. After softening that gate, ch.2 published successfully.
5. An old single-focus manual guard paused the project after publish; project had to be resumed.

Final healthy state after repair:

- `current_chapter=2`
- latest chapter: `Sư Huynh Đố Kỵ`
- latest word count: `3226`
- `quality_metrics.overall_score=8`
- `continuity_health.verdict='pass'`
- quota `written_chapters=1`, `retry_count=0`, `last_error=null`
- project `status='active'`, `pause_reason=null`

