#!/usr/bin/env bash
# То же, что compose-e2e.sh, но с полным стеком (БД + api + UI + e2e). См. E2E_COMPOSE_STACK в compose-e2e.sh.
set -euo pipefail
export E2E_COMPOSE_STACK=1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/compose-e2e.sh" "$@"
