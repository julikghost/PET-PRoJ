import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { getCurrentAndTomorrowDateTimes, getTodayAndTomorrowDays } from '../../utils/date';
import { booking as bookingText } from '../../utils/text';
import { petShipping as petShippingText } from '../../utils/text';
import { points as pointsText } from '../../utils/text';
import { expect, test } from '../fixtures/logisticsApp.fixture';

const { adminUsername, adminPassword } = config;

test.describe('Booking', () => {
    test('create booking on an available pet ship', async ({ page, logisticsApp }) => {
        test.skip(
            !adminUsername || !adminPassword,
            'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD (PetMover precondition + full flow).'
        );

        const ts = Date.now();
        const shipRef = `E2E-BK-SHIP-${ts}`;
        const bkRef = `E2E-BK-${ts}`;
        const { currentDateTime, tomorrowDateTime } = getCurrentAndTomorrowDateTimes();
        const { todayDay, tomorrowDay } = getTodayAndTomorrowDays();
        const departure = currentDateTime;
        const arrival = tomorrowDateTime;
        let pmCode: string | undefined;
        let codeFrom: string | undefined;
        let codeTo: string | undefined;

        try {
            await logisticsApp.openLogisticsApp();
            await logisticsApp.loginAsPetAdmin();
            await logisticsApp.clearPetLogisticsData();
            await logisticsApp.clearPetMoversStorage();

            const pm = await logisticsApp.createPetMoverForPetShippingPrecondition();
            pmCode = pm.code;

            await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
            const routes = await logisticsApp.points.createTwoDistinctPointsForRoutes({
                suffix: String(ts),
                from: { name: 'Hub A', city: 'Amsterdam', kindLabel: pointsText.kindHub },
                to: { name: 'Hub B', city: 'Zurich', kindLabel: pointsText.kindHub },
            });
            codeFrom = routes.codeFrom;
            codeTo = routes.codeTo;
            const { fromLabel, toLabel } = routes;

            await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.PET_SHIPPING);
            await logisticsApp.petShipping.createPetShip({
                refCode: shipRef,
                fromLabel,
                toLabel,
                departure,
                arrival,
                petMover: `${pm.name} (${pm.code})`,
                statusLabel: petShippingText.statusPlanned,
            });

            await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.BOOKING);
            const bk = logisticsApp.booking;
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
            await logisticsApp.teardownPetE2eData({
                bookingRef: bkRef,
                petShipRef: shipRef,
                pointCodes: [codeFrom, codeTo].filter(Boolean) as string[],
                petMoverCode: pmCode,
            });
        }
    });
});
