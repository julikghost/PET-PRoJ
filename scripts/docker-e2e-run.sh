#!/usr/bin/env bash
set -euo pipefail
cd /work
npm ci

# Override playwright.config.ts `workers` (default 1). Docker Compose sets E2E_PLAYWRIGHT_WORKERS=4.
PW_WORKERS="${E2E_PLAYWRIGHT_WORKERS:-4}"

# `E2E_WEB_NO_DEPS=1` + `--no-deps` skips logistics_session — requires an existing storage state file
# (GitHub: artifact from e2e-session-prep). If the file is missing (e.g. GitLab template without prep), fall back.
SESSION_PATH="${E2E_STORAGE_STATE_PATH:-storageState/session.json}"
case "$SESSION_PATH" in
  /*) ;;
  *) SESSION_PATH="$(pwd)/${SESSION_PATH}" ;;
esac
if [[ "${E2E_WEB_NO_DEPS:-}" == "1" && -n "${E2E_PLAYWRIGHT_SPEC:-}" ]] && [[ ! -f "$SESSION_PATH" ]]; then
  echo "docker-e2e-run.sh: ${SESSION_PATH} missing with E2E_WEB_NO_DEPS=1 — running with project dependencies (logistics_role_smoke → logistics_session). For faster CI, add a prep job that uploads this path as an artifact (see .github/workflows/pet-docker-ci.yml e2e-session-prep)." >&2
  E2E_WEB_NO_DEPS=0
fi

# Полный прогон по проектам (deps): role_smoke → logistics_session → logistics_web.
# CI-шард (после prep): один файл + --no-deps (скип повторной сессии).
# Один спек (локально без prep): без E2E_WEB_NO_DEPS подтянутся зависимости проектов.
if [[ -n "${E2E_PLAYWRIGHT_SPEC:-}" ]]; then
  if [[ "${E2E_WEB_NO_DEPS:-}" == "1" ]]; then
    exec npx playwright test "${E2E_PLAYWRIGHT_SPEC}" --project=logistics_web --workers="$PW_WORKERS" --no-deps --config=playwright.config.ts
  fi
  exec npx playwright test "${E2E_PLAYWRIGHT_SPEC}" --project=logistics_web --workers="$PW_WORKERS" --config=playwright.config.ts
fi
exec npx playwright test --workers="$PW_WORKERS" --config=playwright.config.ts
