# PET Logistics UI + E2E

## Project Purpose

This pet project is designed as a learning and portfolio project to practice QA Automation in a production-like workflow.  
The goal is to cover the full E2E testing cycle (UI + API), build a maintainable Playwright architecture, and generate clear test reports with Allure.

## Quick Start

Get up and running in 2 minutes:

```bash
npm install && npm install --prefix pet-app
cp .env.example .env && cp pet-app/.env.example pet-app/.env
npm run pet:dev    # Terminal 1: starts UI at http://localhost:5173
npm run e2e        # Terminal 2: runs full test suite
```

## What the Project Includes

The repository contains two connected parts:

- `pet-app/` - a local demo app built with React + Vite + Ant Design for logistics scenarios.
- Root E2E layer (`tests/`, `pageObjects/`) - Playwright automation tests written in TypeScript.

Main application modules:

- Points
- Pet Shipping
- Booking
- Dog Daycare (separate page and flow)
- Pet Movers
- Reports (with GraphQL payload checks)

Core automation practices:

- Page Object Model (`pageObjects/`)
- Reusable browser session via `storageState/session.json`
- Stable `data-testid` locators
- Dynamic test data setup and cleanup within scenarios
- Allure reporting via `allure-playwright`

## Repository Structure

- `pet-app/` - UI app and local API stub (`POST /api/graphql`)
- `tests/auth/` - PET stub role smoke (`logistics_role_smoke`) + session persistence (`logistics_session`)
- `tests/logistics/` - business E2E scenarios
- `pageObjects/` - page object classes
- `storageState/` - persisted session state (gitignored)
- `playwright.config.ts` - runner configuration, projects, and reporters
- `docker-compose.e2e.yml` - PET UI + Playwright in Docker (CI / local)

## Architecture Overview

```
┌─ pet-app/ (React + Vite)
│  └─ POST /api/graphql (stub)
│
└─ tests/ (Playwright + TypeScript)
   ├─ auth/ (role login smoke, then session bootstrap)
   └─ logistics/ (business scenarios)

pageObjects/ (Page Object Model)
```

## Environment Setup

### Requirements

- Node.js 16+ (with npm 8+)
- Allure CLI 2.20+ (installed globally)

### Install Dependencies

From the repository root:

```bash
npm install
npm install --prefix pet-app
```

### Configure Environment Variables

1. **Copy `.env.example` to `.env`** (repository root)  
   Sets base URLs, credentials, and test configuration.

2. **Copy `pet-app/.env.example` to `pet-app/.env`**  
   Configures the Vite app with test user credentials.

3. **Verify credentials match** between both `.env` files.

4. **For Reports tests** (optional):
   - Copy `tests/logistics/fixtures.example.json` → `tests/logistics/fixtures.local.json`, **or**
   - Set `LOGISTICS_REPORT_FIXTURES_JSON` environment variable

## Run the Project (UI)

From the repository root:

```bash
npm run pet:dev
```

By default, the app runs at `http://localhost:5173/`.

**Port conflicts?** Set `PET_DEV_PORT` in `pet-app/.env` (for example, `5174`) and update `LOGISTICS_BASE_CLIENT_URL` / `LOGISTICS_BASE_API_URL` in root `.env`.

Windows port cleanup example:

```powershell
netstat -ano | findstr :5173
taskkill /PID <pid_from_last_column> /F
```

## Run Automation Tests

1. Start the UI (`npm run pet:dev`) in a separate terminal.
2. Run Playwright commands from the repository root:

```bash
# Full run: role smoke → persist user session → logistics specs
npm run e2e

# Same suite with an explicit `tests/` path (see `package.json`)
npm run e2e-logistics

# PET stub: login smoke per role only
npx playwright test --project=logistics_role_smoke

# Persist session (runs role smoke first — Playwright project dependencies)
npx playwright test --project=logistics_session

# Single spec
npx playwright test tests/logistics/booking.spec.ts --project=logistics_web
```

### Run E2E in Docker

The stack builds **pet-app** from `pet-app/Dockerfile`, waits until it is healthy, then runs the full Playwright suite in the **Playwright** image (`docker-compose.e2e.yml`). URLs point at `http://pet-app:5173/` inside the Compose network; `E2E_PET_STUB_LOGIN=1` is set there so the PET login form flow is used (not OIDC). **`E2E_PLAYWRIGHT_WORKERS`** defaults to **4** (passed as `npx playwright test --workers=…`, overriding `workers: 1` in `playwright.config.ts`). Override from the host, e.g. `E2E_PLAYWRIGHT_WORKERS=1 docker compose …`. With `E2E_DOCKER=1`, Playwright adds the **`list`** reporter so each spec shows a pass/fail line in the container logs (JUnit and Allure are unchanged).

**Requirements:** Docker Engine and Docker Compose v2.

#### Manual Docker run (local)

All commands are from the **repository root** (where `docker-compose.e2e.yml` lives).

1. **Credentials** — Copy `.env.example` → `.env` if needed. Build-time `VITE_PET_*` must match these `LOGISTICS_*` values; after changing passwords run `docker compose -f docker-compose.e2e.yml build --no-cache pet-app` (or `up --build`).
2. **Full suite** — builds `pet-app`, starts it, runs `scripts/docker-e2e-run.sh` (role smoke → session → logistics specs). Playwright **`storageState`** for `logistics_web` is `storageState/session.json` inside the repo (see `E2E_STORAGE_STATE_PATH` in `docker-compose.e2e.yml`, cwd `/work` in the container). Reports land on the host under `./test-results`, `results.xml`, `allure-results` (bind mount `.:/work`).

```bash
docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from e2e
```

3. **Single spec** (same as CI) — still runs dependency projects (`logistics_role_smoke`, `logistics_session`) then the file:

```bash
docker compose -f docker-compose.e2e.yml build pet-app
E2E_PLAYWRIGHT_SPEC=tests/logistics/booking.spec.ts docker compose -f docker-compose.e2e.yml up --no-build --abort-on-container-exit --exit-code-from e2e
```

PowerShell (Windows):

```powershell
docker compose -f docker-compose.e2e.yml build pet-app
$env:E2E_PLAYWRIGHT_SPEC = "tests/logistics/booking.spec.ts"
docker compose -f docker-compose.e2e.yml up --no-build --abort-on-container-exit --exit-code-from e2e
Remove-Item Env:E2E_PLAYWRIGHT_SPEC -ErrorAction SilentlyContinue
```

4. **Cleanup** — `docker compose -f docker-compose.e2e.yml down -v`

5. **Optional: shell inside the runner image** (pet-app must already be up / healthy — e.g. another terminal ran `docker compose -f docker-compose.e2e.yml up -d pet-app` and you waited for health):

```bash
docker compose -f docker-compose.e2e.yml run --rm e2e bash -lc 'cd /work && npm ci && npx playwright test tests/logistics/booking.spec.ts --project=logistics_web --workers=4 --config=playwright.config.ts'
```

Adjust paths and `--workers` as needed; env vars such as `LOGISTICS_*` are inherited from `docker-compose.e2e.yml` when using `docker compose run e2e`.

---

From the repository root (short reference):

```bash
docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from e2e
```

To **build the UI image first, then run tests** (same order as GitHub Actions: isolate build failures from the Playwright run):

```bash
docker compose -f docker-compose.e2e.yml build pet-app
docker compose -f docker-compose.e2e.yml up --no-build --abort-on-container-exit --exit-code-from e2e
```

When finished, remove containers (and anonymous volumes if any):

```bash
docker compose -f docker-compose.e2e.yml down -v
```

**GitHub Actions:** [`.github/workflows/e2e-docker.yml`](.github/workflows/e2e-docker.yml) runs **only Docker E2E** on pushes / PRs to `main`. A prep job discovers every `tests/logistics/*.spec.ts`; each file is its own matrix row (`E2E Docker / <basename>`). Add a new spec under `tests/logistics/` and it appears as a **new job** automatically. Each job builds `pet-app`, runs Compose with `--no-build`, sets `E2E_PLAYWRIGHT_SPEC` to that path; Playwright still runs **`logistics_role_smoke`** → **`logistics_session`** → spec (`dependencies` in `playwright.config.ts`). On failure, `test-results` / traces / `results.xml` upload as **`e2e-docker-<basename>`**, and the job summary includes a **clickable zip link** (`artifact-url`) when available.

## Generate Allure Report

1. Run tests with the standard command (`npm run e2e`) to generate `allure-results`.
2. Start an interactive local report:

```bash
allure serve allure-results
```

Optional static report generation:

```bash
allure generate allure-results --clean -o allure-report
allure open allure-report
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port `5173` is busy | Set `PET_DEV_PORT` in `pet-app/.env` and update root `.env` URLs |
| Stale session errors | Delete `storageState/session.json` and rerun `npm run e2e` |
| `ENOENT … storageState/session.json` in Docker CI | With `E2E_WEB_NO_DEPS=1`, Playwright uses `--no-deps` and expects `storageState/session.json` from a **prep job** (GitHub: `e2e-session-prep` uploads `e2e-storage-state`). Either add the same prep + artifact in GitLab, or unset `E2E_WEB_NO_DEPS` — `scripts/docker-e2e-run.sh` automatically runs with dependencies if the file is missing. |
| Tests timeout | Increase `timeout` in `playwright.config.ts` or use `--timeout=60000` flag |
| Allure not showing results | Ensure you ran `npm run e2e` (not with `--reporter=line` override) |
| Reports test skipped | Add `fixtures.local.json` or set `LOGISTICS_REPORT_FIXTURES_JSON` |
| Docker E2E fails to pull Playwright image | Check tag in `docker-compose.e2e.yml` matches `@playwright/test` in `package-lock.json` |
| Docker E2E: login / home never appears | `vite preview` needs an SPA fallback for `/login` etc.; `pet-app/vite-plugin-pet-api.ts` adds it for preview — rebuild the `pet-app` image (`docker compose … build pet-app`) |
| Docker E2E: invalid password / login after changing `.env` | PET stub passwords are baked at **`npm run build`** (`VITE_PET_*`). They must match root `.env` `LOGISTICS_*`. Rebuild: `docker compose -f docker-compose.e2e.yml build --no-cache pet-app` (see comments in `docker-compose.e2e.yml`) |

## Important Notes

- ⚠️ Do **not** override reporter with `--reporter=line` if you need Allure results — `allure-playwright` won't be used.
- Do **not** commit `storageState/session.json` — it's gitignored and user-specific.
- Do **not** hardcode credentials in tests; use environment variables.
- Tests run with `workers: 1` (configured in `playwright.config.ts`) for deterministic local storage flows.
- For deterministic date checks, recommended: `E2E_TIME_ZONE=UTC`.

## Useful Links

- **Playwright**: [https://playwright.dev/docs/intro](https://playwright.dev/docs/intro)
- **Allure**: [https://allurereport.org/docs/how-it-works/](https://allurereport.org/docs/how-it-works/)
- **Debugging**: [Playwright Inspector](https://playwright.dev/docs/inspector), [VS Code Playwright Extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
- **GitHub Publishing Notes**: [docs/GITHUB.md](docs/GITHUB.md)