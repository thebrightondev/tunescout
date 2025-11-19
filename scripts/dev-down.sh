#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

cd "$ROOT_DIR"

COMPOSE_BIN="podman compose"
if command -v podman-compose >/dev/null 2>&1; then
  COMPOSE_BIN="podman-compose"
fi

$COMPOSE_BIN down
