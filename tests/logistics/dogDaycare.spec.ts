import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { getTodayAndTomorrowDays } from '../../utils/date';
import { E2E_SKIP, e2eDogDaycare, e2eRefs } from '../../utils/e2eTestData';
import { dogDaycare as dogDaycareText } from '../../utils/text';
import { expect, test } from '../fixtures/logisticsApp.fixture';

const { uiUsername, password } = config;

test.describe('Dog Daycare', () => {
    test('create, update, delete daycare stop', async ({ page, logisticsApp }) => {
        test.skip(!uiUsername || !password, E2E_SKIP.LOGISTICS_UI_CREDENTIALS);

        const { todayDay: bookingDateYmd } = getTodayAndTomorrowDays();

        await page.goto('/home');
        await logisticsApp.clearPetLogisticsData();

        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.DOG_DAYCARE);
        const dc = logisticsApp.dogDaycare;
        await dc.expectLoaded();

        const ts = Date.now();
        let refCode: string | undefined;
        const bookingRef = e2eRefs.dogDaycareBooking(ts);

        try {
            refCode = e2eRefs.dogDaycare(ts);

            await dc.clickAdd();
            await dc.fillForm({
                refCode,
                bookingRefCode: bookingRef,
                bookingDateYmd,
                dogName: e2eDogDaycare.dogNameCreate,
                dogWeightKg: e2eDogDaycare.dogWeightKg,
                currencyLabel: e2eDogDaycare.currencyLabel,
                hours: e2eDogDaycare.hours,
                statusLabel: e2eDogDaycare.statusCreate,
            });
            await dc.saveModal();
            await expect(page.getByText(dogDaycareText.toastCreated).first()).toBeVisible();
            await dc.expectRowContains(refCode);
            await dc.expectRowContains(e2eDogDaycare.dogNameCreate);

            await dc.clickEdit(refCode);
            await dc.fillForm({
                refCode,
                bookingRefCode: bookingRef,
                bookingDateYmd,
                dogName: e2eDogDaycare.dogNameUpdate,
                dogWeightKg: e2eDogDaycare.dogWeightKg,
                currencyLabel: e2eDogDaycare.currencyLabel,
                hours: e2eDogDaycare.hours,
                statusLabel: e2eDogDaycare.statusUpdate,
            });
            await dc.saveModal();
            await expect(page.getByText(dogDaycareText.toastUpdated).first()).toBeVisible();
            await dc.expectRowContains(e2eDogDaycare.dogNameUpdate);

            await dc.clickDelete(refCode);
            await dc.confirmDeleteInDialog();
            await expect(page.getByText(dogDaycareText.toastDeleted).first()).toBeVisible();
            await dc.expectNoRowContains(refCode);
        } finally {
            await logisticsApp.teardownPetE2eData({ dogDaycareRef: refCode });
        }
    });
});
