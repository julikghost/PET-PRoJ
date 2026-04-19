#!/usr/bin/env bash
# Runs once in CI (`e2e-docker-prep`): role smoke → persist `storageState` for matrix shards (`--no-deps`).
set -euo pipefail
cd /work
npm ci
exec npx playwright test --project=logistics_session --config=playwright.config.ts
