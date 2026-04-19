#!/usr/bin/env bash
# Wrapper: use GHCR overlay when PET_APP_USE_PREBUILT=1 (needs PET_APP_IMAGE).
set -euo pipefail
cd "${GITHUB_WORKSPACE}"
if [ "${PET_APP_USE_PREBUILT:-0}" = "1" ]; then
  exec docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.prebuilt.yml "$@"
fi
exec docker compose -f docker-compose.e2e.yml "$@"
