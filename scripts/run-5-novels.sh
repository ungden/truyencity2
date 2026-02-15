#!/bin/bash
# Launch 5 novels in parallel for overnight batch writing.
# Each runs as a separate background process with its own log file.
#
# Usage: bash scripts/run-5-novels.sh
# Stop:  kill $(cat logs/batch-*.pid)

set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p logs

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ════════════════════════════════════════════════════════════════
# 5 NOVELS — key project_id novel_id target_chapters
# Use plain indexed array for macOS bash 3.2 compatibility.
# ════════════════════════════════════════════════════════════════

NOVELS=(
  "1_van_yeu 62b7ce71-887c-4b9b-9fbc-bbcdcd8cfe01 524c60e0-0af5-448e-b458-53e62a5f3ec5 1500"
  "2_quy_tac 54402228-f503-4a19-bb34-67b9637709d5 bfabe43b-7098-4f94-8ff0-59518f3e74b8 1810"
  "3_shipper 7435910f-825e-49a0-a89f-8363d6ca111f 45a84994-8974-4b2d-af35-4c35fa14a4b8 1021"
  "4_tinh_hai 1636223f-e7f1-4ce8-980a-99633a587c9d 14daf145-a014-4816-85a1-4a823482bd2e 1602"
  "5_npc 365bbff9-28e0-472d-b54f-c8bba7227bad 8517390b-4f02-4408-b286-a2bd1d387d95 1131"
)

echo "══════════════════════════════════════════════════"
echo "  LAUNCHING 5 NOVELS — $TIMESTAMP"
echo "══════════════════════════════════════════════════"
echo ""

for ROW in "${NOVELS[@]}"; do
  IFS=' ' read -r KEY PROJECT_ID NOVEL_ID TARGET <<< "$ROW"
  LOG="logs/batch-${KEY}-${TIMESTAMP}.log"
  PID_FILE="logs/batch-${KEY}.pid"

  echo "  ▸ $KEY: $PROJECT_ID → $TARGET chapters"
  echo "    Log: $LOG"

  nohup npx tsx scripts/batch-write-1500.ts "$PROJECT_ID" "$NOVEL_ID" "$TARGET" \
    >> "$LOG" 2>&1 &
  
  echo $! > "$PID_FILE"
  echo "    PID: $!"
  echo ""

  # Stagger starts by 5 seconds to avoid Gemini rate limit spikes
  sleep 5
done

echo "══════════════════════════════════════════════════"
echo "  ALL 5 LAUNCHED"
echo "  Monitor: tail -f logs/batch-*-${TIMESTAMP}.log"
echo "  Stop:    kill \$(cat logs/batch-*.pid)"
echo "══════════════════════════════════════════════════"
