import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { getCurrentAndTomorrowDateTimes } from '../../utils/date';
import { E2E_SKIP, e2eRefs, e2eRoutes } from '../../utils/e2eTestData';
import { petShipping as petShippingText } from '../../utils/text';
import { points as pointsText } from '../../utils/text';
import { expect, test } from '../fixtures/logisticsApp.fixture';

const { adminUsername, adminPassword } = config;

test.describe('PetShipping', () => {
    test('create pet ship after two points, then update and delete', async ({ page, logisticsApp }) => {
        test.skip(!adminUsername || !adminPassword, E2E_SKIP.LOGISTICS_ADMIN_PET_SHIPPING);

        const ts = Date.now();
        const shipRef = e2eRefs.petShip(ts);
        const { currentDateTime, tomorrowDateTime } = getCurrentAndTomorrowDateTimes();
        const departure = currentDateTime;
        const arrival = tomorrowDateTime;
        let pmCode: string | undefined;
        let pm2Code: string | undefined;
        let codeFrom: string | undefined;
        let codeTo: string | undefined;

        try {
            await logisticsApp.openLogisticsApp();
            await logisticsApp.loginAsPetAdmin();
            await logisticsApp.clearPetLogisticsData();
            await logisticsApp.clearPetMoversStorage();

            const pm = await logisticsApp.createPetMoverForPetShippingPrecondition();
            const pm2 = await logisticsApp.createPetMoverForPetShippingPrecondition();
            pmCode = pm.code;
            pm2Code = pm2.code;

            await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
            const routes = await logisticsApp.points.createTwoDistinctPointsForRoutes({
                suffix: String(ts),
                from: { ...e2eRoutes.petShipping.from, kindLabel: pointsText.kindHub },
                to: { ...e2eRoutes.petShipping.to, kindLabel: pointsText.kindHub },
            });
            codeFrom = routes.codeFrom;
            codeTo = routes.codeTo;
            const { fromLabel, toLabel } = routes;

            await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.PET_SHIPPING);
            const ship = logisticsApp.petShipping;

            await ship.createPetShip({
                refCode: shipRef,
                fromLabel,
                toLabel,
                departure,
                arrival,
                petMover: `${pm.name} (${pm.code})`,
                statusLabel: petShippingText.statusPlanned,
            });

            await ship.expectRowContains(shipRef);
            await ship.expectRowContains(e2eRoutes.petShipping.from.name);

            await ship.clickEdit(shipRef);
            await ship.fillForm({
                refCode: shipRef,
                fromLabel,
                toLabel,
                departure,
                arrival,
                petMover: `${pm2.name} (${pm2.code})`,
                statusLabel: petShippingText.statusPlanned,
            });
            await ship.saveModal();
            await expect(page.getByText(petShippingText.toastUpdated)).toBeVisible();
            await ship.expectRowContains(`${pm2.name} (${pm2.code})`);

            await ship.clickDelete(shipRef);
            await ship.confirmDeleteInDialog();
            await expect(page.getByText(petShippingText.toastDeleted)).toBeVisible();
            await ship.expectNoRowContains(shipRef);
        } finally {
            await logisticsApp.teardownPetE2eData({
                petShipRef: shipRef,
                pointCodes: [codeFrom, codeTo].filter(Boolean) as string[],
                petMoverCodes: [pmCode, pm2Code].filter(Boolean) as string[],
            });
        }
    });
});
