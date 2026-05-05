import fs from 'node:fs';
import { defineConfig } from '@playwright/test';
import { config, storageStatePath } from './config-logistics';

const { baseUrl } = config;

if (!fs.existsSync(storageStatePath)) {
    throw new Error(
        `Playwright storageState not found at ${storageStatePath}. ` +
        'Run `npx playwright test --project=logistics_session` once to generate it.'
    );
}

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
        ...defaultOptions,
    },
    workers: 1,
    projects: [
        {
            name: 'logistics_web_fast',
            use: {
                ...defaultOptions,
                baseURL: baseUrl,
                storageState: storageStatePath,
            },
            testDir: './tests/logistics',
        },
    ],
});
