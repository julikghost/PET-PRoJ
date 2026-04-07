<!-- Repository documentation: how to run Playwright, required environment variables, Allure. -->
## E2E-Playwright

**Публикация на GitHub:** см. [docs/GITHUB.md](docs/GITHUB.md) (HTTPS, без SSH на первом шаге).

### PET app (local UI stub)

The `pet-app/` folder is a minimal Vite + React + Ant Design UI plus an in-dev `POST /api/graphql` handler so you can run the suite without a real backend. **GraphQL SDL (intended API contract):** `pet-app/graphql/schema.graphql`. See `pet-app/README.md`, copy `pet-app/.env.example` to `pet-app/.env`, align the repo root `.env` with `pet-app/README.md`, copy `pet-app/e2e-fixtures.sample.json` to `tests/logistics/fixtures.local.json`, then `npm run pet:dev` in one terminal and Playwright in another.

TypeScript config: `playwright.config.ts`. Copy `tests/logistics/fixtures.example.json` to `fixtures.local.json` (gitignored) or set `LOGISTICS_REPORT_FIXTURES_JSON`. Optional `E2E_FIXTURE_SUBSTITUTIONS_JSON`: JSON object of literal string replacements applied to loaded fixture JSON (e.g. renaming legacy labels without editing files).

**Logistics web (E2E):** `LOGISTICS_BASE_CLIENT_URL`, `LOGISTICS_BASE_API_URL`, `LOGISTICS_UI_USER_NAME` (or `LOGISTICS_E2E_USER_NAME`), `LOGISTICS_PASSWORD`. **Hosted login:** `E2E_LOGIN_USER_FIELD_NAME` (required: HTML `name` of the user identifier input). Optional: `E2E_LOGIN_URL_GLOB` (Playwright URL glob while opening login), `E2E_CONSENT_ROOT_SELECTOR`, `E2E_CONSENT_ACCEPT_SELECTOR` (authorization prompt), `E2E_OFFLINE_SCOPE_CHECKBOX_LABEL` (or legacy `E2E_OIDC_OFFLINE_CHECKBOX`). Session storage (gitignored): default `storageState/session.json`, or `E2E_STORAGE_STATE_PATH`. After the session setup project, bearer token is in `process.env.E2E_SESSION_ACCESS_TOKEN` for the same worker.

UI labels and timezone: `utils/text.ts` (`E2E_UI_*`) and `E2E_TIME_ZONE` in `config-logistics.ts`. Optional: `E2E_REPORT_DOWNLOAD_URL_HINT` (regex fragment to pick download URLs from JSON responses; default avoids vendor-specific tokens).

```bash
RUN ALL TESTS EXAMPLE: npx playwright test --config=playwright.config.ts --reporter=line
RUN ONE SPECIFIC TEST EXAMPLE: npx playwright test tests/logistics/reports.spec.ts --reporter=line
RUN ONE PROJECT EXAMPLE: npx playwright test --project=logistics_web
```

## ALLURE

```bash
To use allure report, don't use: --reporter=line

RUN ALLURE: allure serve

!!!Allure should be installed globally on your system!!!
```

## DOCS

```bash
PLAYWRIGHT: https://playwright.dev/docs/intro
ALLURE: https://allurereport.org/docs/how-it-works/
```
