/**
 * Playwright configuration: `logistics_session` (persist session), `logistics_web` (CRUD + Reports).
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

export default defineConfig({
    timeout: 80000,
    use: {
        actionTimeout: 40000,
    },
    workers: 1,
    reporter: [
        ['junit', { outputFile: 'results.xml' }],
        ['allure-playwright'],
    ],
    expect: {
        timeout: 12000,
    },
    projects: [
        {
            name: 'logistics_session',
            testDir: './tests/auth',
            testMatch: /.*logisticsSession\.setup\.ts/,
        },
        {
            name: 'logistics_web',
            use: {
                ...defaultOptions,
                baseURL: baseUrl,
                storageState: storageStatePath,
            },
            testDir: './tests/logistics',
            dependencies: ['logistics_session'],
        },
    ],
});
