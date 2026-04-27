import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { getCurrentAndTomorrowDateTimes, getTodayAndTomorrowDays } from '../../utils/date';
import { E2E_SKIP, e2eBooking, e2eRefs, e2eRoutes } from '../../utils/e2eTestData';
import { booking as bookingText } from '../../utils/text';
import { petShipping as petShippingText } from '../../utils/text';
import { points as pointsText } from '../../utils/text';
import { getSameDayPetShipDateTimes, getTodayAndTomorrowDays } from '../../utils/date';

const { adminUsername, adminPassword } = config;

test.describe('Booking', () => {
    test('create booking on an available pet ship', async ({ page, logisticsApp }) => {
        test.skip(!adminUsername || !adminPassword, E2E_SKIP.LOGISTICS_ADMIN_BOOKING_FLOW);

        const ts = Date.now();
        const shipRef = `E2E-BK-SHIP-${ts}`;
        const bkRef = `E2E-BK-${ts}`;
        const { departure, arrival } = getSameDayPetShipDateTimes();
        const { todayDay, tomorrowDay } = getTodayAndTomorrowDays();
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
                from: { ...e2eRoutes.booking.from, kindLabel: pointsText.kindHub },
                to: { ...e2eRoutes.booking.to, kindLabel: pointsText.kindHub },
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
                petLabels: e2eBooking.petLabelsCreate,
                weight: e2eBooking.weightCreate,
            });
            await bk.saveModal();
            await expect(page.getByText(bookingText.toastCreated)).toBeVisible();

            await bk.expectRowContains(bkRef);
            await bk.expectRowContains(e2eBooking.petLabelsCreate[0]);
            await bk.expectRowContains(shipRef);
            await bk.expectRowContains(e2eBooking.rowSnippetEur006);
            await bk.expectRowContains(e2eBooking.rowSnippetCard);

            await test.step('Booking: edit — Dog, tomorrow, weight 7 kg', async () => {
                await bk.clickEdit(bkRef);
                await bk.fillForm({
                    refCode: bkRef,
                    petShipLabel: shipRef,
                    dateYmd: tomorrowDay,
                    petLabels: e2eBooking.petLabelsUpdate,
                    weight: e2eBooking.weightUpdate,
                });
                await bk.saveModal();
                await expect(page.getByText(bookingText.toastUpdated)).toBeVisible();
                await bk.expectRowContains(e2eBooking.petLabelsUpdate[0]);
                await bk.expectRowContains(e2eBooking.rowSnippetEur007);
            });

            await test.step('Booking: delete and assert row removed', async () => {
                await bk.clickDelete(bkRef);
                await bk.confirmDeleteInDialog();
                await expect(page.getByText(bookingText.toastDeleted)).toBeVisible();
                await bk.expectNoRowContains(bkRef);
            });

            /*
             * Ручной обход после автотеста (без паузы): заново откройте Booking под PetUser/PetAdmin,
             * при необходимости создайте pet ship и повторите сценарий вручную.
             * 1) Меню Booking → New booking.
             * 2) Ref, Pet ship (поиск по ref рейса), дата, Species (мультиселект), Weight, Save.
             * 3) В таблице — Edit → сменить вид / дату / вес → Save.
             * 4) Delete → в диалоге подтвердить Delete.
             *
             * Пауза Playwright Inspector: локально задайте E2E_MANUAL_PAUSE=1 (см. .env.example), затем
             * `npx playwright test tests/logistics/booking.spec.ts --headed` — в конце тест остановится,
             * прокликайте UI, в Inspector нажмите Resume; затем выполнится finally (teardown).
             */
            if (process.env.E2E_MANUAL_PAUSE === '1') {
                await test.step('Manual pause — Inspector: Resume to continue (teardown runs after)', async () => {
                    await page.pause();
                });
            }
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
