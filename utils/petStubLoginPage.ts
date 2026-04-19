/**
 * PET stub: open `/login` reliably under `vite preview` / Docker (SPA fallback).
 * Matches `tests/auth/logisticsSession.setup.ts` — relative `/login` alone can miss the bundle in CI.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Trailing slash for `new URL('login', …)` → `/login`; strip a duplicated `/login` if env repeats it. */
function petClientRootAndLogin (baseUrl: string): { rootUrl: string; loginUrl: string } {
    const noTrail = baseUrl.trim().replace(/\/+$/, '');
    const origin = noTrail.replace(/\/login$/i, '');

    const rootUrl = `${origin}/`;
    const loginUrl = new URL('login', rootUrl).href;

    return { rootUrl, loginUrl };
}

export async function openPetStubLoginPage (page: Page, baseUrl: string): Promise<void> {
    if (!baseUrl?.trim()) {
        throw new Error('LOGISTICS_BASE_CLIENT_URL is empty — cannot open PET login.');
    }

    const { rootUrl, loginUrl } = petClientRootAndLogin(baseUrl);
    const loginForm = page.getByTestId('pet-login-form');

    await page.context().clearCookies();

    /**
     * Clear `pet-auth` only after we are on the PET origin. `about:blank` uses an opaque origin, so
     * `localStorage.removeItem('pet-auth')` there does not clear the demo session for `pet-app`.
     */
    await page.goto(loginUrl, { waitUntil: 'load', timeout: 90_000 });
    await page.evaluate(() => {
        try {
            localStorage.removeItem('pet-auth');
        } catch {
            /* ignore */
        }
    });

    /** `load` waits for subresources; `domcontentloaded` alone can fire before the Vite/React bundle runs (form never mounts). */
    try {
        await expect(loginForm).toBeVisible({ timeout: 45_000 });
    } catch {
        /** Fallback: open `/` and wait for the login surface — do not require URL `/login` (SPA redirect can lag or stay on `/` until hydrated). */
        await page.goto(rootUrl, { waitUntil: 'load', timeout: 90_000 });
        await page.evaluate(() => {
            try {
                localStorage.removeItem('pet-auth');
            } catch {
                /* ignore */
            }
        });
        await page.goto(loginUrl, { waitUntil: 'load', timeout: 90_000 });
        await expect(loginForm).toBeVisible({ timeout: 90_000 });
    }
}
