#!/usr/bin/env bash
set -euo pipefail
cd /work
npm ci
if [[ -n "${E2E_PLAYWRIGHT_SPEC:-}" ]]; then
  exec npx playwright test "${E2E_PLAYWRIGHT_SPEC}" --project=logistics_web --config=playwright.config.ts
fi
exec npx playwright test --config=playwright.config.ts
