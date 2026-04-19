#!/usr/bin/env bash
set -euo pipefail
cd /work
npm ci

# Override playwright.config.ts `workers` (default 1). Docker Compose sets E2E_PLAYWRIGHT_WORKERS=4.
PW_WORKERS="${E2E_PLAYWRIGHT_WORKERS:-4}"

if [[ -n "${E2E_PLAYWRIGHT_SPEC:-}" ]]; then
  exec npx playwright test "${E2E_PLAYWRIGHT_SPEC}" --project=logistics_web --workers="$PW_WORKERS" --config=playwright.config.ts
fi
exec npx playwright test --workers="$PW_WORKERS" --config=playwright.config.ts
