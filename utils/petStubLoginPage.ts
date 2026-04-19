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

/** Fails with a concrete hint if `index.html` loaded but the React bundle never mounted the PET login shell. */
async function waitForPetLoginFormInDom (page: Page, openedAs: string, timeoutMs: number): Promise<void> {
    try {
        await page.waitForFunction(
            () => document.querySelector('[data-testid="pet-login-form"]') != null,
            { timeout: timeoutMs }
        );
    } catch {
        const url = page.url();
        let rootHint = '';
        try {
            const inner = await page.locator('#root').innerHTML({ timeout: 3_000 });
            rootHint = inner.length > 0 ? ` #root innerHTML length=${inner.length}` : ' #root is empty (JS bundle likely failed)';
        } catch {
            rootHint = ' #root missing or unreadable';
        }
        throw new Error(
            `PET stub: login form never appeared in DOM (${timeoutMs}ms). Opened: ${openedAs} — now: ${url}.${rootHint} `
            + 'Check LOGISTICS_BASE_CLIENT_URL, rebuild the pet-app image if assets 404, and inspect the trace Network tab for /assets/*.js.'
        );
    }
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
        await waitForPetLoginFormInDom(page, loginUrl, 75_000);
        await expect(loginForm, `PET login form visible (opened ${loginUrl})`).toBeVisible({ timeout: 20_000 });
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
        await waitForPetLoginFormInDom(page, loginUrl, 85_000);
        await expect(loginForm, `PET login form visible after fallback (opened ${loginUrl})`).toBeVisible({
            timeout: 25_000,
        });
    }
}
