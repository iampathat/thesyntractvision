#!/usr/bin/env bash
set -euo pipefail

mkdir -p .codespaces/intelligence_store

if curl -fsS http://127.0.0.1:8765/api/health >/dev/null 2>&1; then
  exit 0
fi

nohup qcds-live \
  --host 0.0.0.0 \
  --port 8765 \
  --store .codespaces/intelligence_store \
  --frontier examples/continuous_reality_growth_mvp.json \
  --no-browser \
  > .codespaces/qcds-live.log 2>&1 &

echo $! > .codespaces/qcds-live.pid
