/**
 * Playwright configuration:
 * `logistics_role_smoke` (PET stub login per role), `logistics_session` (persist session),
 * `logistics_web` (CRUD + Reports).
 *
 * CI (Docker): headless Chromium; матрица GitHub — один job на `tests/logistics/*.spec.ts`.
 */

import { defineConfig } from '@playwright/test';
import { config, storageStatePath } from './config-logistics';

const { baseUrl } = config;

const defaultOptions = {
    browserName: 'chromium' as const,
    bypassCSP: true,
    headless: true,
    viewport: { width: 1920, height: 1280 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure' as const,
    trace: 'retain-on-failure' as const,
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
            use: {
                ...defaultOptions,
                ...(baseUrl.trim() ? { baseURL: baseUrl } : {}),
            },
        },
        {
            name: 'logistics_session',
            testDir: './tests/auth',
            testMatch: /.*logisticsSession\.setup\.ts/,
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
