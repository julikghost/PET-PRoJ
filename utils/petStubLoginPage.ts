/**
 * PET stub: open `/login` reliably under `vite preview` / Docker (SPA fallback).
 * Matches `tests/auth/logisticsSession.setup.ts` — relative `/login` alone can miss the bundle in CI.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function openPetStubLoginPage (page: Page, baseUrl: string): Promise<void> {
    const trimmed = baseUrl?.trim();
    if (!trimmed) {
        throw new Error('LOGISTICS_BASE_CLIENT_URL is empty — cannot open PET login.');
    }

    const rootUrl = `${trimmed.replace(/\/?$/, '/')}`;
    const loginUrl = new URL('login', rootUrl).href;
    const loginForm = page.getByTestId('pet-login-form');

    await page.context().clearCookies();
    /** Do not use `addInitScript` to clear `pet-auth` — it runs on every full navigation and logs the user out after login. */
    await page.goto('about:blank');
    await page.evaluate(() => {
        try {
            localStorage.removeItem('pet-auth');
        } catch {
            /* ignore */
        }
    });

    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try {
        await expect(loginForm).toBeVisible({ timeout: 30000 });
    } catch {
        /** Fallback: open `/` and wait for the login surface — do not require URL `/login` (SPA redirect can lag or stay on `/` until hydrated). */
        await page.goto(rootUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(loginForm).toBeVisible({ timeout: 60000 });
    }
}
