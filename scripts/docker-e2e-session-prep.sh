#!/usr/bin/env bash
# Chromium: logistics_role_smoke → logistics_session → storageState/session.json
set -euo pipefail
cd /work
npm ci
exec npx playwright test --project=logistics_session --config=playwright.config.ts
