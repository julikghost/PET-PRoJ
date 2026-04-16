# PET Logistics UI + E2E

This repository contains two connected parts:

- `pet-app/`: a local React + Vite demo UI for pet logistics flows.
- Repo root Playwright suite (`tests/`, `pageObjects/`): end-to-end tests that run against this UI.

The app is intentionally test-friendly: role-based login, stable `data-testid` selectors, local storage backed data, and a Vite API stub for `POST /api/graphql`.

## What the PET app includes

- **Operational modules**: Points, Pet Shipping (movement schedule), Booking.
- **Admin module**: Pet Movers directory.
- **Reports module**: email report flow through GraphQL endpoint.
- **Roles**:
  - `PetUser`: operational pages.
  - `PetAdmin`: operational pages + Pet Movers + Reports.
  - `PetAccountant`: Reports only.
- **Storage model**:
  - `pet-logistics-v1` for points, pet ships, bookings.
  - `pet-movers-v1` for pet movers.

GraphQL contract lives in `pet-app/graphql/schema.graphql`. The dev server uses a lightweight stub (not a full GraphQL runtime) to support E2E checks.

## Project structure

- `pet-app/src/pages/`: UI pages (`PointsPage`, `MovementSchedulePage`, `BookingPage`, `PetMoversPage`, `ReportsPage`).
- `pet-app/src/context/PetLogisticsContext.tsx`: local storage state, CRUD rules, cross-entity validations.
- `pageObjects/`: Playwright page objects used by tests.
- `tests/auth/`: session bootstrap project.
- `tests/logistics/`: business flow specs.

## Local run (UI only)

From `pet-app/`:

```bash
cp .env.example .env
npm install
npm run dev
```

Default URL is `http://localhost:5173/`.

- If `5173` is busy, set `PET_DEV_PORT` (for example `5174`) before `npm run dev`.
- Vite has `strictPort: false`, so it can auto-pick the next free port.

Windows port cleanup example:

```powershell
netstat -ano | findstr :5173
taskkill /PID <pid_from_last_column> /F
```

## E2E setup

1. In repo root, copy `.env.example` to `.env`.
2. Keep credentials aligned between:
   - root `.env` (`LOGISTICS_*` variables),
   - `pet-app/.env` (`VITE_PET_*` variables).
3. Make sure base URLs point to the running PET app:
   - `LOGISTICS_BASE_CLIENT_URL=http://localhost:5173/`
   - `LOGISTICS_BASE_API_URL=http://localhost:5173/api`
4. Recommended for deterministic date checks: `E2E_TIME_ZONE=UTC`.

## Run Playwright tests

From repo root:

```bash
npm install
npm install --prefix pet-app
```

Then use one of:

```bash
npm run pet:dev
npm run e2e
```

Useful commands:

- Full suite with setup + business tests: `npm run e2e`
- Logistics tests only: `npm run e2e-logistics`
- Session setup only: `npx playwright test --project=logistics_session`
- One spec example: `npx playwright test tests/logistics/booking.spec.ts --project=logistics_web`

## What is covered by tests

- `tests/auth/logisticsSession.setup.ts`
  - logs in once and persists `storageState/session.json`.
- `tests/logistics/00-points.spec.ts`
  - CRUD for points (create, update, delete).
- `tests/logistics/petMovers.spec.ts`
  - CRUD for pet movers with admin credentials.
- `tests/logistics/petShipping.spec.ts`
  - creates pet movers and points, then CRUD for pet shipping rows.
  - uses dynamic dates: today and tomorrow.
- `tests/logistics/booking.spec.ts`
  - creates preconditions (pet mover, points, pet ship), then booking CRUD.
  - uses dynamic dates: today and tomorrow.
- `tests/logistics/reports.spec.ts`
  - fills filters, sends report by email, asserts intercepted GraphQL payload and saved artifacts.

Playwright runs with `workers: 1` in `playwright.config.ts`, which keeps shared local storage flows deterministic.

## Reports fixture (required for reports.spec.ts)

`reports.spec.ts` is skipped unless fixture data is provided.

Use one option:

- `LOGISTICS_REPORT_FIXTURES_JSON` environment variable, or
- local gitignored file `tests/logistics/fixtures.local.json`.

Starter template: `tests/logistics/fixtures.example.json`.

## Common issues

- **Port mismatch**: if PET starts on `5174`, update root `.env` URLs accordingly.
- **Stale session**: delete `storageState/session.json` and rerun `logistics_session`.
- **Reports skipped**: add `fixtures.local.json` or `LOGISTICS_REPORT_FIXTURES_JSON`.
