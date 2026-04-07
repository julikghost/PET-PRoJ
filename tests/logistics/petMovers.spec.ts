/**
 * PetMovers CRUD (PET admin / PetAdmin): create, update, delete a carrier row.
 *
 * Requires the same credentials in two places (the UI validates against Vite env):
 * - Repo root `.env`: `LOGISTICS_ADMIN_USER_NAME`, `LOGISTICS_ADMIN_PASSWORD`
 * - `pet-app/.env`: `VITE_PET_ADMIN_USER`, `VITE_PET_ADMIN_PASSWORD`
 */
import { test, expect } from '@playwright/test';
import { MENU_ITEM } from '../../utils/constants';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { petMovers as petMoversText } from '../../utils/text';

const { adminUsername, adminPassword } = config;

test.describe('PetMovers', () => {
    test.skip(
        !adminUsername || !adminPassword,
        'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD (see .env.example)'
    );

    test('create, update, and delete a PetMover', async ({ page }) => {
        const app = new LogisticsApp(page);
        await app.openLogisticsApp();
        await app.loginAsPetAdmin();

        await app.navigationSidebar.clickMenuItem(MENU_ITEM.PET_MOVERS);
        const pm = app.petMovers;

        await pm.expectLoaded();

        const code = `E2E-PM-${Date.now()}`;

        await pm.clickAdd();
        await pm.fillForm({ name: 'E2E Alpha', code, region: 'EU', active: true });
        await pm.saveModal();
        await expect(page.getByText(petMoversText.toastCreated)).toBeVisible();

        await pm.expectRowContains('E2E Alpha');
        await pm.expectRowContains(code);

        await pm.clickEdit(code);
        await pm.fillForm({ name: 'E2E Beta', code, region: 'US', active: false });
        await pm.saveModal();
        await expect(page.getByText(petMoversText.toastUpdated)).toBeVisible();

        await pm.expectRowContains('E2E Beta');
        await pm.expectRowContains('US');
        await pm.expectRowContains('No');

        await pm.clickDelete(code);
        await pm.confirmDeleteInDialog();
        await expect(page.getByText(petMoversText.toastDeleted)).toBeVisible();
        await pm.expectNoRowContains('E2E Beta');
    });
});
