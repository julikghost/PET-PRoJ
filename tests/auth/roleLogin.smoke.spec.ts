/**
 * One smoke test per PET stub role: fails fast when LOGISTICS_* and VITE_PET_* (Docker build) disagree.
 */
import { test, expect } from '@playwright/test';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { MENU_ITEM } from '../../utils/constants';

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

test.describe('PET stub: role login smoke', () => {
    test.beforeEach(() => {
        test.skip(
            !usePetStubLoginFlow(),
            'PET stub login only (local identifier flow or E2E_PET_STUB_LOGIN=1)'
        );
        test.skip(!config.baseUrl?.trim(), 'LOGISTICS_BASE_CLIENT_URL is empty');
    });

    test('PetUser signs in and reaches Home', async ({ page }) => {
        test.skip(!config.uiUsername || !config.password, 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD');

        const app = new LogisticsApp(page);
        await app.loginAsPetUser();

        await expect(page).toHaveURL(/\/home(\/|$)?/);
        await expect(page.getByRole('menuitem', { name: MENU_ITEM.BOOKING.name })).toBeVisible();
        await expect(page.getByText('PetAdmin', { exact: true })).not.toBeVisible();
        await expect(page.getByText('PetAccountant', { exact: true })).not.toBeVisible();
    });

    test('PetAdmin signs in and sees PetMovers', async ({ page }) => {
        test.skip(!config.adminUsername || !config.adminPassword, 'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD');

        const app = new LogisticsApp(page);
        await app.loginAsPetAdmin();

        await expect(page).toHaveURL(/\/home(\/|$)?/);
        await expect(page.getByText('PetAdmin', { exact: true })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: MENU_ITEM.PET_MOVERS.name })).toBeVisible();
    });

    test('PetAccountant signs in and lands on Reports', async ({ page }) => {
        test.skip(
            !config.accountantUsername || !config.accountantPassword,
            'Set LOGISTICS_ACCOUNTANT_USER_NAME and LOGISTICS_ACCOUNTANT_PASSWORD'
        );

        const app = new LogisticsApp(page);
        await app.loginAsPetAccountant();

        await expect(page).toHaveURL(/\/reports(\/|$)?/);
        await expect(page.getByText('PetAccountant', { exact: true })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: MENU_ITEM.REPORTS.name })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: MENU_ITEM.BOOKING.name })).not.toBeVisible();
    });
});
