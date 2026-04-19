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

/** PET dev server + `.env.example` use `identifier`; skip slow OIDC-only steps unless consent UI is configured. */
function usePetStubLoginFlow (): boolean {
    if (process.env.E2E_HOSTED_LOGISTICS_LOGIN === '1') {
        return false;
    }
    if (process.env.E2E_PET_STUB_LOGIN === '1') {
        return true;
    }
    const idField = process.env.E2E_LOGIN_USER_FIELD_NAME?.trim();
    if (idField !== 'identifier') {
        return false;
    }
    const base = config.baseUrl.trim().toLowerCase();
    return base.includes('localhost') || base.includes('127.0.0.1');
}

setup('Persist logistics web session storage', async ({ page }) => {
    const app = new LogisticsApp(page);

    if (usePetStubLoginFlow()) {
        const loginUrl = new URL('login', `${baseUrl.trim().replace(/\/?$/, '/')}`).href;
        await page.goto(loginUrl);
        await app.login.signInPetApp(uiUsername, password);
    } else {
        await app.openLogisticsApp();
        await app.login.clickLogin();
        await app.login.signIn(uiUsername, password);
    }

    if (process.env.E2E_CONSENT_ROOT_SELECTOR?.trim()) {
        try {
            await app.login.checkConsentIsVisible();
            await page.getByRole('checkbox', { name: offlineScopeCheckbox }).check();
            await app.login.clickAllow();
        } catch {
            // consent screen optional
        }
    }

    await expect(page).toHaveURL(postLoginClientUrlRegex(baseUrl));

    fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
    await page.context().storageState({ path: storageStatePath });

    const accessToken = await getAccessToken(storageStatePath);
    process.env.E2E_SESSION_ACCESS_TOKEN = accessToken;
});
