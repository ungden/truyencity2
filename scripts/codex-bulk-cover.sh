#!/bin/bash
# Bulk Codex CLI cover generation for Phase J novels.
#
# Workflow per novel:
#  1. prepare-cover --novel-id=X → creates rundir with prompt.md + cover.json
#  2. codex exec with prompt → Codex agent generates cover.png in rundir
#  3. apply-cover --run-dir=PATH --apply → uploads + updates novels.cover_url
#
# Usage:
#   bash scripts/codex-bulk-cover.sh            # dry run (show what would happen)
#   bash scripts/codex-bulk-cover.sh --apply    # execute all
#   bash scripts/codex-bulk-cover.sh --apply --limit 5    # first 5 only
#   bash scripts/codex-bulk-cover.sh --apply --start 10 --end 20    # range

set -e

cd "$(dirname "$0")/.."

APPLY=false
LIMIT=0
START=1
END=999
PAUSE_REASON='phase_h_archetype_spawn_2026-05-11'

while [[ $# -gt 0 ]]; do
  case $1 in
    --apply) APPLY=true; shift;;
    --limit) LIMIT="$2"; shift 2;;
    --start) START="$2"; shift 2;;
    --end) END="$2"; shift 2;;
    --pause-reason) PAUSE_REASON="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

# Query novels by pause_reason
echo "Querying novels (pause_reason='$PAUSE_REASON')..."
# (QUERY constant unused — actual fetch via heredoc TS below)

cat > /Users/alexle/Documents/truyencity/scripts/_list-phase-h-novels.ts <<'EOF'
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
async function main() {
  const { data: projects } = await db
    .from('ai_story_projects')
    .select('novel_id, novels!ai_story_projects_novel_id_fkey(id, title, cover_url, created_at)')
    .eq('pause_reason', process.env.PAUSE_REASON!);
  if (!projects) return;
  const rows = projects.map((p: { novels: { id: string; title: string; cover_url: string | null; created_at: string } | { id: string; title: string; cover_url: string | null; created_at: string }[] }) => {
    const n = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    return n;
  }).filter((n) => n && !n.cover_url).sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const n of rows) console.log(`${n.id}|${n.title}`);
}
main().catch(console.error);
EOF

NOVELS=$(PAUSE_REASON="$PAUSE_REASON" npx tsx /Users/alexle/Documents/truyencity/scripts/_list-phase-h-novels.ts 2>/dev/null)
COUNT=$(echo "$NOVELS" | grep -c "|" || true)
echo "Found $COUNT Phase J novels without covers"

if [ "$COUNT" = "0" ]; then
  echo "No covers needed. Exiting."
  exit 0
fi

if [ "$APPLY" = "false" ]; then
  echo ""
  echo "DRY RUN — would generate covers for $COUNT novels. Pass --apply to execute."
  echo ""
  echo "First 5:"
  echo "$NOVELS" | head -5
  exit 0
fi

INDEX=0
SUCCESS=0
FAILED=0
while IFS='|' read -r NOVEL_ID NOVEL_TITLE; do
  INDEX=$((INDEX + 1))
  if [ "$INDEX" -lt "$START" ]; then continue; fi
  if [ "$INDEX" -gt "$END" ]; then break; fi
  if [ "$LIMIT" -gt "0" ] && [ "$INDEX" -gt "$LIMIT" ]; then break; fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[$INDEX] $NOVEL_TITLE"
  echo "  novel_id=$NOVEL_ID"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Step 1: prepare-cover
  PREP_OUTPUT=$(npm run codex:automation -- prepare-cover --novel-id="$NOVEL_ID" 2>&1)
  RUN_DIR=$(echo "$PREP_OUTPUT" | grep -E "^Prepared cover task:" | sed 's/^Prepared cover task: //')
  if [ -z "$RUN_DIR" ]; then
    echo "  ✗ prepare-cover failed:"
    echo "$PREP_OUTPUT" | tail -5
    FAILED=$((FAILED + 1))
    continue
  fi
  echo "  → Run dir: $RUN_DIR"

  # Step 2: codex exec to generate cover.png
  PROMPT_PATH="$RUN_DIR/prompt.md"
  if [ ! -f "$PROMPT_PATH" ]; then
    echo "  ✗ Missing prompt: $PROMPT_PATH"
    FAILED=$((FAILED + 1))
    continue
  fi

  CODEX_PROMPT="Tạo ảnh bìa cho truyện theo prompt trong file $PROMPT_PATH. Đọc file đó, sử dụng tool tạo ảnh để generate ảnh 3:4 ratio premium webnovel cover. Lưu kết quả TUYỆT ĐỐI thành file $RUN_DIR/cover.png. Không gọi Gemini Image. Không thay đổi gì khác."
  echo "  → Invoking codex exec..."
  if codex exec --skip-git-repo-check --color=never "$CODEX_PROMPT" 2>&1 | tail -3; then
    if [ -f "$RUN_DIR/cover.png" ]; then
      echo "  ✓ cover.png generated"
    else
      echo "  ✗ codex exec succeeded but no cover.png produced"
      FAILED=$((FAILED + 1))
      continue
    fi
  else
    echo "  ✗ codex exec failed"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Step 3: apply-cover
  APPLY_OUTPUT=$(npm run codex:automation -- apply-cover --run-dir="$RUN_DIR" --apply 2>&1)
  if echo "$APPLY_OUTPUT" | grep -q "Uploaded Codex cover\|cover_url updated\|✓"; then
    echo "  ✓ cover applied"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ✗ apply-cover failed:"
    echo "$APPLY_OUTPUT" | tail -5
    FAILED=$((FAILED + 1))
  fi
done <<< "$NOVELS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary: $SUCCESS success, $FAILED failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
