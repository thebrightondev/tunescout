#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

cd "$ROOT_DIR"

if ! command -v podman >/dev/null 2>&1; then
  echo "Podman is required for this workflow. Install Podman and try again." >&2
  exit 1
fi

COMPOSE_BIN="podman compose"
if command -v podman-compose >/dev/null 2>&1; then
  COMPOSE_BIN="podman-compose"
fi

$COMPOSE_BIN up --build -d

echo ""
echo "Tunescout stack is starting. Services exposed:"
echo "- Tunescout: https://tunescout.local.com:3000"
echo "- TuneHub: http://tunescout.local.com:8080"
echo "- MusicEngine: http://tunescout.local.com:8000"
echo "- PostgreSQL: localhost:5432"
echo ""
echo "Use scripts/dev-down.sh to stop services when you're done."
