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
- Pet Seaters
- Our Clients (aggregated from Booking + Dog Daycare)
- Europe Shows (external event links with previews)
- Pet Movers
- Reports (with GraphQL payload checks)

Recent business rules:

- `Booking` requires client first/last name.
- `Dog Daycare` also stores client first/last name.
- `Our Clients` table aggregates all orders per client across booking/daycare flows.

Core automation practices:

- Page Object Model (`pageObjects/`)
- Reusable browser session via `storageState/session.json`
- Stable `data-testid` locators
- Dynamic test data setup and cleanup within scenarios
- Allure reporting via `allure-playwright`

## Repository Structure

- `pet-app/` - UI app and local API stub (`POST /api/graphql`)
- `tests/auth/` - setup project for login and session persistence
- `tests/logistics/` - business E2E scenarios
- `pageObjects/` - page object classes
- `storageState/` - persisted session state (gitignored)
- `playwright.config.ts` - runner configuration, projects, and reporters

## Architecture Overview

```
┌─ pet-app/ (React + Vite)
│  └─ POST /api/graphql (stub)
│
└─ tests/ (Playwright + TypeScript)
   ├─ auth/ (session bootstrap)
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
# Full run (setup + logistics)
npm run e2e

# Logistics tests only
npm run e2e-logistics

# Session setup only
npx playwright test --project=logistics_session

# Single spec
npx playwright test tests/logistics/booking.spec.ts --project=logistics_web
```

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
| Tests timeout | Increase `timeout` in `playwright.config.ts` or use `--timeout=60000` flag |
| Allure not showing results | Ensure you ran `npm run e2e` (not with `--reporter=line` override) |
| Reports test skipped | Add `fixtures.local.json` or set `LOGISTICS_REPORT_FIXTURES_JSON` |

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