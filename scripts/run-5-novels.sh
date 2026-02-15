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
# 5 NOVELS — project_id, novel_id, target_chapters
# ════════════════════════════════════════════════════════════════

declare -A NOVELS=(
  ["1_van_yeu"]="62b7ce71-887c-4b9b-9fbc-bbcdcd8cfe01 524c60e0-0af5-448e-b458-53e62a5f3ec5 1500"
  ["2_quy_tac"]="54402228-6f27-480b-8543-b1a8de7ab49f bfabe43b-2e94-4fa0-b4e9-fbe19fb11e6f 1810"
  ["3_shipper"]="7435910f-0e42-4e68-bb2c-15e497ad0ac4 45a84994-f3ec-4c49-895b-4e4e259eac0e 1021"
  ["4_tinh_hai"]="1636223f-a3a3-4c0f-bd2f-38d9cfa7dfd4 14daf145-2786-440b-8b91-7a9ce24fab6c 1602"
  ["5_npc"]="365bbff9-1ff5-44cc-84ad-7e7e6b3e3fe7 8517390b-42ad-4dea-b2e5-22d1e7d2c5b3 1131"
)

echo "══════════════════════════════════════════════════"
echo "  LAUNCHING 5 NOVELS — $TIMESTAMP"
echo "══════════════════════════════════════════════════"
echo ""

for KEY in "${!NOVELS[@]}"; do
  IFS=' ' read -r PROJECT_ID NOVEL_ID TARGET <<< "${NOVELS[$KEY]}"
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
