import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { E2E_SKIP, e2ePoints, e2eRefs } from '../../utils/e2eTestData';
import { points as pointsText } from '../../utils/text';
import { expect, test } from '../fixtures/logisticsApp.fixture';

const { uiUsername, password } = config;

test.describe('Points', () => {
    test('create, update, delete point via Points menu', async ({ page, logisticsApp }) => {
        test.skip(!uiUsername || !password, E2E_SKIP.LOGISTICS_UI_CREDENTIALS);

        // Session: PetUser from project `logistics_session` (`storageState/session.json`) — no extra login.
        await page.goto('/home');
        await logisticsApp.clearPetLogisticsData();

        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
        const pt = logisticsApp.points;
        await pt.expectLoaded();

        let code: string | undefined;

        try {
            code = e2eRefs.point(Date.now());

            await pt.clickAdd();
            await pt.fillCodeNameAndCity({
                code,
                name: e2ePoints.nameCreate,
                city: e2ePoints.cityCreate,
            });
            await pt.selectKindHub();
            await pt.saveModal();
            await expect(page.getByText(pointsText.toastCreated)).toBeVisible();

            await pt.expectRowContains(code);
            await pt.expectRowContains(e2ePoints.nameCreate);

            await pt.clickEdit(code);
            await pt.fillCodeNameAndCity({
                code,
                name: e2ePoints.nameUpdate,
                city: e2ePoints.cityUpdate,
            });
            await pt.selectKindByLabel(pointsText.kindStop);
            await pt.saveModal();
            await expect(page.getByText(pointsText.toastUpdated)).toBeVisible();
            await pt.expectRowContains(e2ePoints.nameUpdate);

            await pt.clickDelete(code);
            await pt.confirmDeleteInDialog();
            await expect(page.getByText(pointsText.toastDeleted)).toBeVisible();
            await pt.expectNoRowContains(code);
        } finally {
            await logisticsApp.teardownPetE2eData({ pointCodes: code ? [code] : [] });
        }
    });
});
