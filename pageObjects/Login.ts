/**
 * Page object for sign-in and authorization prompt: entry button, password form,
 * optional consent screen (selectors driven by `E2E_*` env vars).
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const loginButton =
    process.env.E2E_LOGIN_ENTRY_PATTERN || '^(Login|Sign in|Войти в аккаунт)$';

const loginUrlGlob = process.env.E2E_LOGIN_URL_GLOB?.trim();

const loginUserFieldName = process.env.E2E_LOGIN_USER_FIELD_NAME?.trim();

const consentRootSelector = process.env.E2E_CONSENT_ROOT_SELECTOR?.trim();

const consentAcceptSelector = process.env.E2E_CONSENT_ACCEPT_SELECTOR?.trim();

export class Login {
    readonly page: Page;

    constructor (page: Page) {
        this.page = page;
    }

    async clickLogin (): Promise<void> {
        await test.step('Open authentication flow', async () => {
            const petEntry = this.page.getByTestId('pet-home-sign-in');
            if (await petEntry.count()) {
                await expect(petEntry).toBeVisible();
                await petEntry.click();
                await this.page.waitForURL(/\/login/, { timeout: 15000 });

                return;
            }

            const btn = this.page.getByRole('button', { name: new RegExp(loginButton) }).first();
            await expect(btn).toBeVisible();
            await btn.click();

            const waiters: Array<Promise<unknown>> = [
                this.page
                    .locator('form[action*="/login"]')
                    .first()
                    .waitFor({ timeout: 15000 })
                    .catch(() => {}),
                this.page.getByTestId('pet-login-form').waitFor({ timeout: 15000 }).catch(() => {}),
            ];
            if (loginUrlGlob) {
                waiters.unshift(
                    this.page.waitForURL(loginUrlGlob, { timeout: 15000 }).catch(() => {})
                );
            }
            await Promise.race(waiters);
        });
    }

    /**
     * PET stub (`pet-app`): fixed field names `identifier` / `password`, no `E2E_LOGIN_USER_FIELD_NAME`.
     */
    async signInPetApp (email: string, password: string): Promise<void> {
        await test.step('Submit credentials on PET login form', async () => {
            if (!email || !password) {
                throw new Error('signInPetApp: email and password are required.');
            }
            const pwForm = this.page.getByTestId('pet-login-form');
            await expect(pwForm).toBeVisible();

            // Ant Design Form often omits `name` on the native input; label / role are stable.
            await pwForm.getByLabel('Email').fill(email);
            await pwForm.getByLabel('Password').fill(password);

            const submitBtn = pwForm.getByTestId('pet-login-submit');
            await expect(submitBtn).toBeVisible();
            await submitBtn.click();
        });
    }

    async signIn (email: string, password: string): Promise<void> {
        await test.step('Submit credentials on hosted login form', async () => {
            if (!email || !password) {
                throw new Error('signIn: credentials missing (check environment / secrets store).');
            }
            if (!loginUserFieldName) {
                throw new Error(
                    'signIn: set E2E_LOGIN_USER_FIELD_NAME to the HTML name of the login identifier input.'
                );
            }

            const pwForm = this.page.locator('form[action*="/login"]').last();
            await expect(pwForm).toBeVisible();

            await pwForm.locator(`input[name="${loginUserFieldName}"]`).fill(email);
            await pwForm.locator('input[name="password"]').fill(password);

            const submitBtn = pwForm.getByRole('button', { name: /Sign in|Log in|Войти/i });
            await expect(submitBtn).toBeEnabled();
            await submitBtn.click();
        });
    }

    async checkConsentIsVisible (): Promise<void> {
        await test.step('Check user authorization prompt', async () => {
            if (!consentRootSelector) {
                return;
            }
            await expect(this.page.locator(consentRootSelector)).toBeVisible();
        });
    }

    async clickAllow (): Promise<void> {
        await test.step('Confirm authorization', async () => {
            if (!consentAcceptSelector) {
                return;
            }
            await this.page.click(consentAcceptSelector);
        });
    }

    async selectPermissions ({ permissions }: { permissions: string[] }): Promise<void> {
        await test.step(`Select permission checkboxes: ${permissions.join(', ')}`, async () => {
            for (const permission of permissions) {
                await this.page.locator(`[value="${permission}"] + label`).click();
            }
        });
    }
}
