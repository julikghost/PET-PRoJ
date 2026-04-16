import { test, expect } from '@playwright/test';
import { MENU_ITEM } from '../../utils/constants';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { petShipping as petShippingText } from '../../utils/text';
import { points as pointsText } from '../../utils/text';
import { getCurrentAndTomorrowDateTimes } from '../../utils/date';

const { adminUsername, adminPassword } = config;

test.describe('PetShipping', () => {
    test('create pet ship after two points, then update and delete', async ({ page }) => {
        test.skip(
            !adminUsername || !adminPassword,
            'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD (PetMover precondition + Points/PetShipping).'
        );

        const ts = Date.now();
        const shipRef = `E2E-PS-${ts}`;
        const { currentDateTime, tomorrowDateTime } = getCurrentAndTomorrowDateTimes();
        const departure = currentDateTime;
        const arrival = tomorrowDateTime;
        let pmCode: string | undefined;
        let pm2Code: string | undefined;
        let codeFrom: string | undefined;
        let codeTo: string | undefined;

        const app = new LogisticsApp(page);
        try {
            await app.openLogisticsApp();
            await app.loginAsPetAdmin();
            await app.clearPetLogisticsData();
            await app.clearPetMoversStorage();

            const pm = await app.createPetMoverForPetShippingPrecondition();
            const pm2 = await app.createPetMoverForPetShippingPrecondition();
            pmCode = pm.code;
            pm2Code = pm2.code;

            await app.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
            const routes = await app.points.createTwoDistinctPointsForRoutes({
                suffix: String(ts),
                from: { name: 'E2E Alpha', city: 'Amsterdam', kindLabel: pointsText.kindHub },
                to: { name: 'E2E Beta', city: 'Zurich', kindLabel: pointsText.kindHub },
            });
            codeFrom = routes.codeFrom;
            codeTo = routes.codeTo;
            const { fromLabel, toLabel } = routes;

            await app.navigationSidebar.clickMenuItem(MENU_ITEM.PET_SHIPPING);
            const ship = app.petShipping;

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
            await ship.expectRowContains('E2E Alpha');

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
            await app.teardownPetE2eData({
                petShipRef: shipRef,
                pointCodes: [codeFrom, codeTo].filter(Boolean) as string[],
                petMoverCodes: [pmCode, pm2Code].filter(Boolean) as string[],
            });
        }
    });
});
