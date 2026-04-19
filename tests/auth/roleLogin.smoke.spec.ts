/**
 * One smoke test per PET stub role: fails fast when LOGISTICS_* and VITE_PET_* (Docker build) disagree.
 *
 * CI: runs before every matrix job (`logistics_web` deps); Docker sets `E2E_PET_STUB_LOGIN`, `E2E_DOCKER`.
 * Each test uses a fresh context; `openPetStubLoginPage` clears PET session — no describe-level serial coupling.
 */
import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { usePetStubLoginFlow } from '../../utils/petStubLoginFlow';
import { expect, test } from '../fixtures/logisticsApp.fixture';

test.describe('PET stub: role login smoke', () => {
    test.beforeEach(() => {
        test.skip(
            !usePetStubLoginFlow(),
            'PET stub login only (E2E_PET_STUB_LOGIN / E2E_DOCKER, or local identifier + localhost)'
        );
        test.skip(!config.baseUrl?.trim(), 'LOGISTICS_BASE_CLIENT_URL is empty');
    });

    test('PetUser signs in and reaches Home', async ({ page, logisticsApp }) => {
        test.skip(!config.uiUsername || !config.password, 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD');

        const header = page.getByRole('banner');
        const sider = page.locator('.ant-layout-sider');

        await test.step('Sign in as PetUser', async () => {
            await logisticsApp.loginAsPetUser();
        });

        await test.step('Assert PetUser shell (Home, no admin/accountant badge)', async () => {
            await expect(page).toHaveURL(/\/home(\/|$)?/);
            await expect(sider.getByRole('menuitem', { name: MENU_ITEM.BOOKING.name })).toBeVisible();
            await expect(header.getByText('PetAdmin', { exact: true })).not.toBeVisible();
            await expect(header.getByText('PetAccountant', { exact: true })).not.toBeVisible();
        });
    });

    test('PetAdmin signs in and sees PetMovers', async ({ page, logisticsApp }) => {
        test.skip(!config.adminUsername || !config.adminPassword, 'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD');

        const header = page.getByRole('banner');
        const sider = page.locator('.ant-layout-sider');

        await test.step('Sign in as PetAdmin', async () => {
            await logisticsApp.loginAsPetAdmin();
        });

        await test.step('Assert PetAdmin shell', async () => {
            await expect(page).toHaveURL(/\/home(\/|$)?/);
            await expect(header.getByText('PetAdmin', { exact: true })).toBeVisible();
            await expect(sider.getByRole('menuitem', { name: MENU_ITEM.PET_MOVERS.name })).toBeVisible();
        });
    });

    test('PetAccountant signs in and lands on Reports', async ({ page, logisticsApp }) => {
        test.skip(
            !config.accountantUsername || !config.accountantPassword,
            'Set LOGISTICS_ACCOUNTANT_USER_NAME and LOGISTICS_ACCOUNTANT_PASSWORD'
        );

        const header = page.getByRole('banner');
        const sider = page.locator('.ant-layout-sider');

        await test.step('Sign in as PetAccountant', async () => {
            await logisticsApp.loginAsPetAccountant();
        });

        await test.step('Assert PetAccountant shell (Reports only)', async () => {
            await expect(page).toHaveURL(/\/reports(\/|$)?/);
            await expect(header.getByText('PetAccountant', { exact: true })).toBeVisible();
            await expect(sider.getByRole('menuitem', { name: MENU_ITEM.REPORTS.name })).toBeVisible();
            await expect(sider.getByRole('menuitem', { name: MENU_ITEM.BOOKING.name })).not.toBeVisible();
        });
    });
});
