# PET logistics UI

Minimal React + Ant Design app used to exercise the Playwright suite locally: login flow, sidebar **Reports**, form fields, and `POST /api/graphql` handled by the Vite dev server.

**GraphQL schema (SDL):** [`graphql/schema.graphql`](graphql/schema.graphql) — intended contract for the report-email mutation (`EmailTicketsReport` / `emailTicketsReport`); the Vite stub does not run a full GraphQL engine and returns a fixed JSON body for E2E.

UI colors use the **[open-color](https://github.com/yeun/open-color)** palette (see `src/theme/palette.ts`), not Ant Design’s default blue theme tokens.

## Run

```bash
cd pet-app
cp .env.example .env
npm install
npm run dev
```

Default URL: `http://localhost:5173/`. If you see **Port 5173 is already in use**, either stop the old dev server (see below) or set `PET_DEV_PORT` (e.g. `5174`) in the shell **and** the same host/port in the repo root `LOGISTICS_BASE_CLIENT_URL` / `LOGISTICS_BASE_API_URL`.

**Windows — free port 5173:**

```powershell
netstat -ano | findstr :5173
taskkill /PID <pid_from_last_column> /F
```

With `strictPort: false`, Vite may start on **5174**; use the URL printed in the terminal for `.env`.

## Wire e2e (repo root `.env`)

Use the same user/password as in `pet-app/.env`:

- `LOGISTICS_BASE_CLIENT_URL=http://localhost:5173/`
- `LOGISTICS_BASE_API_URL=http://localhost:5173/api`
- `LOGISTICS_UI_USER_NAME` = `VITE_PET_USER`
- `LOGISTICS_PASSWORD` = `VITE_PET_PASSWORD`
- `E2E_LOGIN_USER_FIELD_NAME=identifier`
- `E2E_TIME_ZONE=UTC` (recommended so PET date math matches `utils/date.ts`)

Optional: delete `storageState/session.json`, then from repo root:

```bash
npx playwright test --project=logistics_session --project=logistics_web
```

## Reports fixture

Copy `e2e-fixtures.sample.json` to `tests/logistics/fixtures.local.json` (gitignored) so `reports.spec.ts` is not skipped.
