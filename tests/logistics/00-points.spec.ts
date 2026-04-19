import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { points as pointsText } from '../../utils/text';
import { expect, test } from '../fixtures/logisticsApp.fixture';

const { uiUsername, password } = config;

test.describe('Points', () => {
    test('create, update, delete point via Points menu', async ({ page, logisticsApp }) => {
        test.skip(!uiUsername || !password, 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD');

        // Session: PetUser from project `logistics_session` (`storageState/session.json`) — no extra login.
        await page.goto('/home');
        await logisticsApp.clearPetLogisticsData();

        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
        const pt = logisticsApp.points;
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
