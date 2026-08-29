#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STATE_DIR=".codespaces"
STORE_DIR="$STATE_DIR/intelligence_store"
LOG_FILE="$STATE_DIR/qcds-live.log"
PID_FILE="$STATE_DIR/qcds-live.pid"
HEALTH_URL="http://127.0.0.1:8765/api/health"

mkdir -p "$STORE_DIR"

if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "Living Logical Robot already healthy on port 8765."
  exit 0
fi

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$old_pid" ]] && kill -0 "$old_pid" >/dev/null 2>&1; then
    kill "$old_pid" >/dev/null 2>&1 || true
  fi
  rm -f "$PID_FILE"
fi

: > "$LOG_FILE"
nohup python -m qcds_fabric.logical_robot_live \
  --host 0.0.0.0 \
  --port 8765 \
  --store "$STORE_DIR" \
  --frontier examples/continuous_reality_growth_mvp.json \
  --no-browser \
  >> "$LOG_FILE" 2>&1 &

pid=$!
echo "$pid" > "$PID_FILE"

for _ in $(seq 1 60); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "Living Logical Robot healthy on port 8765 (pid $pid)."
    exit 0
  fi
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "Living Logical Robot exited during startup." >&2
    cat "$LOG_FILE" >&2 || true
    exit 1
  fi
  sleep 0.25
done

echo "Living Logical Robot did not become healthy within 15 seconds." >&2
cat "$LOG_FILE" >&2 || true
kill "$pid" >/dev/null 2>&1 || true
exit 1
