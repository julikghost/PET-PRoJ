import * as fs from 'fs';
import * as path from 'path';
import { test as setup, expect } from '@playwright/test';
import { config, storageStatePath } from '../../config-logistics';
import { assertPetStorageStateHasPetAuth, getAccessToken } from '../../utils/helper';
import { openPetStubLoginPage } from '../../utils/petStubLoginPage';
import { usePetStubLoginFlow } from '../../utils/petStubLoginFlow';
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

    if (usePetStubLoginFlow()) {
        if (!baseUrl?.trim()) {
            throw new Error(
                'LOGISTICS_BASE_CLIENT_URL is empty — set it (e.g. http://pet-app:5173/ in Docker Compose).'
            );
        }
        await openPetStubLoginPage(page, baseUrl);

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

    /** PET auth lives in `localStorage`; ensure it exists before `storageState()` or the file can be empty origins. */
    await page.waitForFunction(
        () => {
            try {
                return Boolean(localStorage.getItem('pet-auth'));
            } catch {
                return false;
            }
        },
        { timeout: 20_000 }
    );

    fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
    await page.context().storageState({ path: storageStatePath });
    assertPetStorageStateHasPetAuth(storageStatePath);

    const accessToken = await getAccessToken(storageStatePath);
    process.env.E2E_SESSION_ACCESS_TOKEN = accessToken;
});
