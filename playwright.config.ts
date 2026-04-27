/**
 * Playwright configuration:
 * `logistics_role_smoke` (PET stub login per role), `logistics_session` (persist session),
 * `logistics_web` (CRUD + Reports).
 *
 * CI (Docker): headless Chromium; матрица GitHub — один job на `tests/logistics/*.spec.ts`.
 */

import path from 'node:path';
import { defineConfig } from '@playwright/test';
import { config, storageStatePath } from './config-logistics';
import { usePetStubLoginFlow } from './utils/petStubLoginFlow';

const { baseUrl } = config;

/**
 * Local runs: start Vite for `pet-app` when tests target loopback and PET stub login is active.
 * Docker CI sets `E2E_DOCKER=1` (no webServer — `pet-app` is a separate compose service).
 * To run the UI yourself on the same port: `E2E_SKIP_WEB_SERVER=1`.
 */
function localPetStubWebServer ():
    | {
          command: string;
          cwd: string;
          url: string;
          reuseExistingServer: boolean;
          timeout: number;
      }
    | undefined {
    if (process.env.E2E_SKIP_WEB_SERVER === '1' || process.env.E2E_DOCKER === '1') {
        return undefined;
    }
    const u = baseUrl.trim().toLowerCase();
    if (!u || (!u.includes('localhost') && !u.includes('127.0.0.1'))) {
        return undefined;
    }
    if (!usePetStubLoginFlow()) {
        return undefined;
    }
    const origin = baseUrl.trim().replace(/\/+$/, '');

    /** Run Vite from `pet-app/` so `node_modules/.bin` is on PATH (Windows rejects root `npm run pet:dev` without deps). */
    return {
        command: 'npm run dev',
        cwd: path.join(process.cwd(), 'pet-app'),
        url: `${origin}/login`,
        reuseExistingServer: process.env.CI !== 'true',
        timeout: 120_000,
    };
}

const petStubWebServer = localPetStubWebServer();

/** Compose `e2e` service should set `shm_size` (see docker-compose.e2e.yml); this flag avoids tiny /dev/shm crashes. */
const dockerChromiumUse =
    process.env.E2E_DOCKER === '1'
        ? {
              launchOptions: {
                  args: [
                      '--disable-dev-shm-usage',
                      '--no-sandbox',
                      '--disable-setuid-sandbox',
                      '--disable-gpu',
                  ],
              },
          }
        : {};

const defaultOptions = {
    browserName: 'chromium' as const,
    bypassCSP: true,
    headless: true,
    viewport: { width: 1920, height: 1280 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure' as const,
    trace: 'retain-on-failure' as const,
    ...dockerChromiumUse,
};

/** One line per test in stdout (used by `docker-compose.e2e.yml`). JUnit + Allure stay enabled. */
const reporters =
    process.env.E2E_DOCKER === '1'
        ? [
              ['list'] as const,
              ['junit', { outputFile: 'results.xml' }] as const,
              ['allure-playwright'] as const,
          ]
        : [
              ['junit', { outputFile: 'results.xml' }] as const,
              ['allure-playwright'] as const,
          ];

export default defineConfig({
    timeout: 80000,
    ...(petStubWebServer
        ? {
              webServer: {
                  ...petStubWebServer,
                  stdout: 'pipe',
                  stderr: 'pipe',
              },
          }
        : {}),
    use: {
        actionTimeout: 40000,
    },
    workers: 1,
    reporter: reporters,
    expect: {
        timeout: 12000,
    },
    projects: [
        {
            name: 'logistics_role_smoke',
            testDir: './tests/auth',
            testMatch: /roleLogin\.smoke\.spec\.ts/,
            /** PET stub: `openPetStubLoginPage` may chain `/login` → `/` fallback (worst-case nav + waits can exceed 5 min). */
            timeout: 320_000,
            use: {
                ...defaultOptions,
                ...(baseUrl.trim() ? { baseURL: baseUrl } : {}),
            },
        },
        {
            name: 'logistics_session',
            testDir: './tests/auth',
            testMatch: /.*logisticsSession\.setup\.ts/,
            timeout: 320_000,
            use: {
                ...defaultOptions,
                ...(baseUrl.trim() ? { baseURL: baseUrl } : {}),
            },
            dependencies: ['logistics_role_smoke'],
        },
        {
            name: 'logistics_web',
            use: {
                ...defaultOptions,
                baseURL: baseUrl,
                storageState: storageStatePath,
            },
            testDir: './tests/logistics',
            dependencies: ['logistics_role_smoke', 'logistics_session'],
        },
    ],
});
