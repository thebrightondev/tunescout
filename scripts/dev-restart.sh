#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

# Stop stack
./scripts/dev-down.sh || true

# Start stack
./scripts/dev-up.sh

# Wait for app to be healthy
BASE_URL="${PLAYWRIGHT_BASE_URL:-https://tunescout.local.com:3000}"
HEALTH_ENDPOINTS=("/" "/api/health")

attempts=${PW_WAIT_ATTEMPTS:-60}
delay=${PW_WAIT_DELAY_MS:-1000}

for ((i=1; i<=attempts; i++)); do
  ok=false
  for ep in "${HEALTH_ENDPOINTS[@]}"; do
    if curl -skf "${BASE_URL%/}${ep}" >/dev/null 2>&1; then
      ok=true
      break
    fi
  done
  if $ok; then
    echo "Stack is healthy at ${BASE_URL}"
    exit 0
  fi
  sleep "$((delay/1000))"
  echo "Waiting for stack to be healthy... ($i/${attempts})"
done

echo "Stack did not become healthy at ${BASE_URL} after ${attempts} attempts" >&2
exit 1
