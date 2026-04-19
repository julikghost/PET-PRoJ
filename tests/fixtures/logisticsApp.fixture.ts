/**
 * Shared Playwright fixtures: one {@link LogisticsApp} POM per test (no shared mutable state between tests).
 */
import { test as base } from '@playwright/test';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';

export type LogisticsWorkerFixtures = {
    logisticsApp: LogisticsApp;
};

export const test = base.extend<LogisticsWorkerFixtures>({
    logisticsApp: async ({ page }, use) => {
        await use(new LogisticsApp(page));
    },
});

export { expect } from '@playwright/test';
