#!/usr/bin/env bash
# Обёртка `docker compose` для E2E.
#
# По умолчанию: docker-compose.e2e.yml (только PET UI + Playwright) — так в CI в pet-docker-ci.yml.
#
# Полный стек (Postgres + сервис api + PET UI + e2e): задайте E2E_COMPOSE_STACK=1 → docker-compose.stack.yml
# (удобно локально: bash .github/scripts/ci/compose-e2e-stack.sh … или npm run docker:e2e:stack).
#
# При PET_APP_USE_PREBUILT=1 к выбранному compose подмешивается docker-compose.e2e.prebuilt.yml (образ pet-app из GHCR).
#
# Реальный бэкенд: в docker-compose.stack.yml замените сервис `api` на свой образ (или уберите заглушку и
# подключите сервис с тем же именем `api` для depends_on pet-app). В сервисе `e2e` выставьте LOGISTICS_BASE_API_URL
# на URL вашего API внутри сети compose (например http://api:8080/), при необходимости добавьте переменные сборки pet-app.
set -euo pipefail
cd "${GITHUB_WORKSPACE:-$(pwd)}"

primary='docker-compose.e2e.yml'
if [ "${E2E_COMPOSE_STACK:-0}" = '1' ]; then
    primary='docker-compose.stack.yml'
fi

if [ "${PET_APP_USE_PREBUILT:-0}" = '1' ]; then
    exec docker compose -f "$primary" -f docker-compose.e2e.prebuilt.yml "$@"
fi
exec docker compose -f "$primary" "$@"
