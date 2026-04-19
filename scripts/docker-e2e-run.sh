#!/usr/bin/env bash
set -euo pipefail
cd /work
npm ci

# Override playwright.config.ts `workers` (default 1). Docker Compose sets E2E_PLAYWRIGHT_WORKERS=4.
PW_WORKERS="${E2E_PLAYWRIGHT_WORKERS:-4}"

# CI matrix: prep job already ran `logistics_role_smoke` + `logistics_session`; reuse `storageState`.
if [[ -n "${E2E_PLAYWRIGHT_SPEC:-}" ]]; then
  if [[ "${E2E_WEB_NO_DEPS:-}" == "1" ]]; then
    exec npx playwright test "${E2E_PLAYWRIGHT_SPEC}" --project=logistics_web --workers="$PW_WORKERS" --no-deps --config=playwright.config.ts
  fi
  exec npx playwright test "${E2E_PLAYWRIGHT_SPEC}" --project=logistics_web --workers="$PW_WORKERS" --config=playwright.config.ts
fi
exec npx playwright test --workers="$PW_WORKERS" --config=playwright.config.ts
