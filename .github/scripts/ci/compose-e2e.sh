#!/usr/bin/env bash
# Обёртка docker compose для E2E: при PET_APP_USE_PREBUILT=1 подключается docker-compose.e2e.prebuilt.yml.
set -euo pipefail
cd "${GITHUB_WORKSPACE:-$(pwd)}"
if [ "${PET_APP_USE_PREBUILT:-0}" = "1" ]; then
  exec docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.prebuilt.yml "$@"
fi
exec docker compose -f docker-compose.e2e.yml "$@"
