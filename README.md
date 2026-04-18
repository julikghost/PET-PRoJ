# PET Logistics UI + E2E

## Project Purpose

This pet project is designed as a learning and portfolio project to practice QA Automation in a production-like workflow.  
The goal is to cover the full E2E testing cycle (UI + API), build a maintainable Playwright architecture, and generate clear test reports with Allure.

## What the Project Includes

The repository contains two connected parts:

- `pet-app/` - a local demo app built with React + Vite + Ant Design for logistics scenarios.
- Root E2E layer (`tests/`, `pageObjects/`) - Playwright automation tests written in TypeScript.

Main application modules:

- Points
- Pet Shipping
- Booking (including Dog Daycare pricing logic)
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
- `tests/auth/` - setup project for login and session persistence
- `tests/logistics/` - business E2E scenarios
- `pageObjects/` - page object classes
- `storageState/` - persisted session state (gitignored)
- `playwright.config.ts` - runner configuration, projects, and reporters

## Environment Setup

Requirements:

- Node.js + npm
- Allure CLI (installed globally)

Install dependencies from the repository root:

```bash
npm install
npm install --prefix pet-app
```

Configure environment variables:

1. Copy `.env.example` to `.env` (repository root).
2. Copy `pet-app/.env.example` to `pet-app/.env`.
3. Make sure credentials match between `pet-app/.env` and root `.env`.
4. For `reports.spec.ts`, provide fixtures:
   - either `tests/logistics/fixtures.local.json` (from `tests/logistics/fixtures.example.json`),
   - or `LOGISTICS_REPORT_FIXTURES_JSON` environment variable.

## Run the Project (UI)

From the repository root:

```bash
npm run pet:dev
```

By default, the app runs at `http://localhost:5173/`.  
If the port is busy, set `PET_DEV_PORT` in `pet-app/.env` (for example, `5174`) and update `LOGISTICS_BASE_CLIENT_URL` / `LOGISTICS_BASE_API_URL` in root `.env`.

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

Important: do not override the reporter with `--reporter=line` if you need Allure results, because `allure-playwright` will not be used.

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

## Useful Links

- Playwright: [https://playwright.dev/docs/intro](https://playwright.dev/docs/intro)
- Allure: [https://allurereport.org/docs/how-it-works/](https://allurereport.org/docs/how-it-works/)
- GitHub publishing notes: [docs/GITHUB.md](docs/GITHUB.md)
