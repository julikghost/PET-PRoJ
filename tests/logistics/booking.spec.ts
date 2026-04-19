import { test, expect } from '@playwright/test';
import { MENU_ITEM } from '../../utils/constants';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { booking as bookingText } from '../../utils/text';
import { petShipping as petShippingText } from '../../utils/text';
import { points as pointsText } from '../../utils/text';
import { getSameDayPetShipDateTimes, getTodayAndTomorrowDays } from '../../utils/date';

const { adminUsername, adminPassword } = config;

test.describe('Booking', () => {
    test('create booking on an available pet ship', async ({ page }) => {
        test.skip(
            !adminUsername || !adminPassword,
            'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD (PetMover precondition + full flow).'
        );

        const ts = Date.now();
        const shipRef = `E2E-BK-SHIP-${ts}`;
        const bkRef = `E2E-BK-${ts}`;
        const { departure, arrival } = getSameDayPetShipDateTimes();
        const { todayDay, tomorrowDay } = getTodayAndTomorrowDays();
        let pmCode: string | undefined;
        let codeFrom: string | undefined;
        let codeTo: string | undefined;

        const app = new LogisticsApp(page);
        try {
            await app.openLogisticsApp();
            await app.loginAsPetAdmin();
            await app.clearPetLogisticsData();
            await app.clearPetMoversStorage();

            const pm = await app.createPetMoverForPetShippingPrecondition();
            pmCode = pm.code;

            await app.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
            const routes = await app.points.createTwoDistinctPointsForRoutes({
                suffix: String(ts),
                from: { name: 'Hub A', city: 'Amsterdam', kindLabel: pointsText.kindHub },
                to: { name: 'Hub B', city: 'Zurich', kindLabel: pointsText.kindHub },
            });
            codeFrom = routes.codeFrom;
            codeTo = routes.codeTo;
            const { fromLabel, toLabel } = routes;

            await app.navigationSidebar.clickMenuItem(MENU_ITEM.PET_SHIPPING);
            await app.petShipping.createPetShip({
                refCode: shipRef,
                fromLabel,
                toLabel,
                departure,
                arrival,
                petMover: `${pm.name} (${pm.code})`,
                statusLabel: petShippingText.statusPlanned,
            });

            await app.navigationSidebar.clickMenuItem(MENU_ITEM.BOOKING);
            const bk = app.booking;
            await bk.expectLoaded();

            await bk.clickAdd();
            await bk.fillForm({
                refCode: bkRef,
                petShipLabel: shipRef,
                dateYmd: todayDay,
                petLabels: ['Cat'],
                weight: '6',
            });
            await bk.saveModal();
            await expect(page.getByText(bookingText.toastCreated)).toBeVisible();

            await bk.expectRowContains(bkRef);
            await bk.expectRowContains('Cat');
            await bk.expectRowContains(shipRef);
            await bk.expectRowContains('0.06 EUR');
            await bk.expectRowContains('Card');

            await bk.clickEdit(bkRef);
            await bk.fillForm({
                refCode: bkRef,
                petShipLabel: shipRef,
                dateYmd: tomorrowDay,
                petLabels: ['Dog'],
                weight: '7',
            });
            await bk.saveModal();
            await expect(page.getByText(bookingText.toastUpdated)).toBeVisible();
            await bk.expectRowContains('Dog');
            await bk.expectRowContains('0.07 EUR');

            await bk.clickDelete(bkRef);
            await bk.confirmDeleteInDialog();
            await expect(page.getByText(bookingText.toastDeleted)).toBeVisible();
            await bk.expectNoRowContains(bkRef);
        } finally {
            await app.teardownPetE2eData({
                bookingRef: bkRef,
                petShipRef: shipRef,
                pointCodes: [codeFrom, codeTo].filter(Boolean) as string[],
                petMoverCode: pmCode,
            });
        }
    });
});
