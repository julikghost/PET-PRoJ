/**
 * Playwright setup project: sign into the web UI, optional authorization consent,
 * persist `storageState`, and set `E2E_SESSION_ACCESS_TOKEN` on the worker.
 */
import * as fs from 'fs';
import * as path from 'path';
import { test as setup, expect } from '@playwright/test';
import { config, storageStatePath } from '../../config-logistics';
import { getAccessToken } from '../../utils/helper';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';

/** PET: `/home` (ops) or `/reports` (accountant); OIDC clients often stay on `/`. */
function postLoginClientUrlRegex (clientBaseUrl: string): RegExp {
    const root = clientBaseUrl.replace(/\/+$/, '');
    const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return new RegExp(`^${escaped}(/(home|reports))?/?$`);
}

const { baseUrl, uiUsername, password } = config;

const offlineScopeCheckbox =
    process.env.E2E_OFFLINE_SCOPE_CHECKBOX_LABEL?.trim()
    || process.env.E2E_OIDC_OFFLINE_CHECKBOX?.trim()
    || 'offline_access';

setup('Persist logistics web session storage', async ({ page }) => {
    const app = new LogisticsApp(page);
    await app.openLogisticsApp();

    await app.login.clickLogin();
    await app.login.signIn(uiUsername, password);

    try {
        await app.login.checkConsentIsVisible();
        await page.getByRole('checkbox', { name: offlineScopeCheckbox }).check();
        await app.login.clickAllow();
    } catch {
        // consent screen optional
    }

    await expect(page).toHaveURL(postLoginClientUrlRegex(baseUrl));

    fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
    await page.context().storageState({ path: storageStatePath });

    const accessToken = await getAccessToken(storageStatePath);
    process.env.E2E_SESSION_ACCESS_TOKEN = accessToken;
});
