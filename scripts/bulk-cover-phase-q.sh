#!/bin/bash
# Bulk Codex CLI cover generation for Phase Q novels (production_enabled = true).
#
# Usage: bash scripts/bulk-cover-phase-q.sh

set -e

cd "$(dirname "$0")/.."

# List of novel IDs without covers (manually curated from production_enabled novels)
NOVELS=(
  "0a3b1ace-3796-4528-9d20-a0a5ed2dc1fa|Đại Ca Bao Cấp"
)

# Actually, let me dynamically fetch via list query
LIST_SCRIPT="/tmp/_list-no-cover.ts"
cat > "$LIST_SCRIPT" <<'EOF'
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
    .select('novel_id, style_directives, novels!ai_story_projects_novel_id_fkey(id, title, cover_url, created_at)')
    .order('created_at', { ascending: true });
  if (!projects) return;
  for (const p of projects) {
    const sd = (p.style_directives ?? {}) as Record<string, unknown>;
    if (sd.production_enabled !== true) continue;
    const n = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    if (!n || n.cover_url) continue;
    console.log(`${n.id}|${n.title}`);
  }
}
main().catch(console.error);
EOF

NOVELS_LIST=$(npx tsx "$LIST_SCRIPT" 2>/dev/null)
COUNT=$(echo "$NOVELS_LIST" | grep -c "|" || true)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase Q novels without cover: $COUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$NOVELS_LIST"
echo ""

if [ "$COUNT" = "0" ]; then exit 0; fi

INDEX=0
SUCCESS=0
FAILED=0

while IFS='|' read -r NOVEL_ID NOVEL_TITLE; do
  if [ -z "$NOVEL_ID" ]; then continue; fi
  INDEX=$((INDEX + 1))

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[$INDEX/$COUNT] $NOVEL_TITLE"
  echo "  novel_id=$NOVEL_ID"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Step 1: prepare-cover → emits runDir
  PREP_OUTPUT=$(npm run codex:automation -- prepare-cover --novel-id="$NOVEL_ID" 2>&1)
  RUN_DIR=$(echo "$PREP_OUTPUT" | grep -E "^Prepared cover task:" | sed 's/^Prepared cover task: //')
  if [ -z "$RUN_DIR" ]; then
    echo "  ✗ prepare-cover failed:"
    echo "$PREP_OUTPUT" | tail -5
    FAILED=$((FAILED + 1))
    continue
  fi
  echo "  → Run dir: $RUN_DIR"

  PROMPT_PATH="$RUN_DIR/prompt.md"
  if [ ! -f "$PROMPT_PATH" ]; then
    echo "  ✗ Missing prompt: $PROMPT_PATH"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Step 2: codex exec → generate cover.png at $RUN_DIR/cover.png
  CODEX_PROMPT="Đọc đầy đủ file $PROMPT_PATH rồi tạo ảnh bìa truyện 3:4 ratio (1086×1448 hoặc tương đương), premium webnovel cover style, lưu thành file $RUN_DIR/cover.png. Phải nhìn rõ tiêu đề Vietnamese + Truyencity.com watermark. Chỉ output ảnh PNG, không lưu gì khác."
  echo "  → Invoking codex exec (may take 1-3 min)..."
  if codex exec --skip-git-repo-check --color=never --sandbox workspace-write "$CODEX_PROMPT" >/dev/null 2>&1; then
    if [ -f "$RUN_DIR/cover.png" ]; then
      echo "  ✓ cover.png generated"
    else
      echo "  ✗ codex exec returned 0 but no cover.png produced"
      FAILED=$((FAILED + 1))
      continue
    fi
  else
    echo "  ✗ codex exec failed"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Step 3: apply-cover (upload to Supabase + update DB)
  APPLY_OUTPUT=$(npm run codex:automation -- apply-cover --run-dir="$RUN_DIR" --apply 2>&1)
  if echo "$APPLY_OUTPUT" | grep -qE "Uploaded|cover_url|✓"; then
    echo "  ✓ cover applied"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ✗ apply-cover failed:"
    echo "$APPLY_OUTPUT" | tail -5
    FAILED=$((FAILED + 1))
  fi
done <<< "$NOVELS_LIST"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary: $SUCCESS success / $FAILED failed / $COUNT total"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
