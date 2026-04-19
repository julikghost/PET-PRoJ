#!/usr/bin/env bash
# PR → сборка из checkout; иначе → pull из GHCR (workflow Docker Image CI), иначе сборка.
# В GHCR: :${GITHUB_SHA} всегда; :latest только для push в main.
set -euo pipefail
cd "${GITHUB_WORKSPACE}"

repo_lc="$(echo "${GITHUB_REPOSITORY}" | tr '[:upper:]' '[:lower:]')"
PET_SHA_IMG="ghcr.io/${repo_lc}/pet-app:${GITHUB_SHA}"
PET_LATEST_IMG="ghcr.io/${repo_lc}/pet-app:latest"

if [ "${GITHUB_EVENT_NAME}" = "pull_request" ]; then
  docker compose -f docker-compose.e2e.yml build pet-app
  echo "PET_APP_IMAGE=${PET_LATEST_IMG}" >> "${GITHUB_ENV}"
  echo "PET_APP_USE_PREBUILT=0" >> "${GITHUB_ENV}"
  exit 0
fi

echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin

pull_one () {
  local img="$1"
  if docker pull "${img}"; then
    echo "PET_APP_IMAGE=${img}" >> "${GITHUB_ENV}"
    echo "PET_APP_USE_PREBUILT=1" >> "${GITHUB_ENV}"
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
{
  echo "PET_APP_IMAGE=${PET_LATEST_IMG}"
  echo "PET_APP_USE_PREBUILT=0"
} >> "${GITHUB_ENV}"
