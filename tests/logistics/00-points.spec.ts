import { test, expect } from '@playwright/test';
import { MENU_ITEM } from '../../utils/constants';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { points as pointsText } from '../../utils/text';

const { uiUsername, password } = config;

test.describe('Points', () => {
    test('create, update, delete point via Points menu', async ({ page }) => {
        test.skip(!uiUsername || !password, 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD');

        const app = new LogisticsApp(page);
        // Session: PetUser from project `logistics_session` (`storageState/session.json`) — no extra login.
        await page.goto('/home');
        await app.clearPetLogisticsData();

        await app.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
        const pt = app.points;
        await pt.expectLoaded();

        const code = `E2E-P-${Date.now()}`;

        await pt.clickAdd();
        await pt.fillCodeNameAndCity({
            code,
            name: 'E2E Terminal',
            city: 'Berlin',
        });
        await pt.selectKindHub();
        await pt.saveModal();
        await expect(page.getByText(pointsText.toastCreated)).toBeVisible();

        await pt.expectRowContains(code);
        await pt.expectRowContains('E2E Terminal');

        await pt.clickEdit(code);
        await pt.fillCodeNameAndCity({
            code,
            name: 'E2E Terminal Plus',
            city: 'Munich',
        });
        await pt.selectKindByLabel(pointsText.kindStop);
        await pt.saveModal();
        await expect(page.getByText(pointsText.toastUpdated)).toBeVisible();
        await pt.expectRowContains('E2E Terminal Plus');

        await pt.clickDelete(code);
        await pt.confirmDeleteInDialog();
        await expect(page.getByText(pointsText.toastDeleted)).toBeVisible();
        await pt.expectNoRowContains(code);
    });
});
