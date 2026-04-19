#!/usr/bin/env bash
# GitHub Actions: образ PET UI для E2E — PR → docker compose build; иначе pull GHCR (:SHA / :latest), иначе build.
# Пишет в GITHUB_ENV; при запуске в одном shell с compose-словом добавляйте export (см. конец каждой ветки).
set -euo pipefail
ROOT="${GITHUB_WORKSPACE:-$(pwd)}"
cd "${ROOT}"

repo_lc="$(echo "${GITHUB_REPOSITORY:-}" | tr '[:upper:]' '[:lower:]')"
PET_SHA_IMG="ghcr.io/${repo_lc}/pet-app:${GITHUB_SHA:-unknown}"
PET_LATEST_IMG="ghcr.io/${repo_lc}/pet-app:latest"

append_github_env () {
  local k="$1"
  local v="$2"
  if [ -n "${GITHUB_ENV:-}" ]; then
    echo "${k}=${v}" >> "${GITHUB_ENV}"
  fi
  export "${k}"="${v}"
}

if [ "${GITHUB_EVENT_NAME:-}" = "pull_request" ]; then
  docker compose -f docker-compose.e2e.yml build pet-app
  append_github_env PET_APP_IMAGE "${PET_LATEST_IMG}"
  append_github_env PET_APP_USE_PREBUILT 0
  exit 0
fi

echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin

pull_one () {
  local img="$1"
  if docker pull "${img}"; then
    append_github_env PET_APP_IMAGE "${img}"
    append_github_env PET_APP_USE_PREBUILT 1
    return 0
  fi
  return 1
}

for attempt in $(seq 1 15); do
  if pull_one "${PET_SHA_IMG}" || pull_one "${PET_LATEST_IMG}"; then
    exit 0
  fi
  echo "::notice::GHCR pull attempt ${attempt}/15 failed (ожидаем Docker Image CI); повтор через 20s…"
  sleep 20
done

echo "::warning::GHCR pull не удался — сборка pet-app из checkout"
docker compose -f docker-compose.e2e.yml build pet-app
append_github_env PET_APP_IMAGE "${PET_LATEST_IMG}"
append_github_env PET_APP_USE_PREBUILT 0
