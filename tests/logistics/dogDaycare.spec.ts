import { MENU_ITEM } from '../../utils/constants';
import { getTodayAndTomorrowDays } from '../../utils/date';
import { e2eDogDaycare, e2eRefs } from '../../utils/e2eTestData';
import { dogDaycare as dogDaycareText } from '../../utils/text';
import { expect, test } from '../../fixtures/logisticsApp.fixture';

test.describe('Dog Daycare', () => {
    test('create, update, delete daycare stop', async ({ page, logisticsApp }) => {
        const { todayDay: bookingDateYmd } = getTodayAndTomorrowDays();
        const dd = e2eDogDaycare as typeof e2eDogDaycare & {
            breed: string;
            ageYears: string;
            ageMonths: string;
        };
        const ageText = `${dd.ageYears}y ${dd.ageMonths}m`;

        await logisticsApp.ensurePetAdminSessionWithCleanData();
        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.DOG_DAYCARE);
        const dc = logisticsApp.dogDaycare;
        await dc.expectLoaded();

        const ts = Date.now();
        const cleanup = {
            refCode: undefined as string | undefined,
        };
        const bookingRef = e2eRefs.dogDaycareBooking(ts);

        try {
            cleanup.refCode = e2eRefs.dogDaycare(ts);

            await dc.createDaycare({
                refCode: cleanup.refCode,
                bookingRefCode: bookingRef,
                clientFirstName: dd.clientFirstName,
                clientLastName: dd.clientLastName,
                startDateYmd: bookingDateYmd,
                endDateYmd: bookingDateYmd,
                dogName: dd.dogNameCreate,
                breed: dd.breed,
                ageText,
                dogWeightKg: dd.dogWeightKg,
                currencyLabel: dd.currencyLabel,
                hoursPerDay: dd.hours,
                statusLabel: dd.statusCreate,
            });
            await expect(page.getByText(dogDaycareText.toastCreated).first()).toBeVisible();
            await dc.expectRowContains(cleanup.refCode);
            await dc.expectRowContains(e2eDogDaycare.dogNameCreate);

            await dc.updateDaycare(cleanup.refCode, {
                refCode: cleanup.refCode,
                bookingRefCode: bookingRef,
                clientFirstName: dd.clientFirstName,
                clientLastName: dd.clientLastName,
                startDateYmd: bookingDateYmd,
                endDateYmd: bookingDateYmd,
                dogName: dd.dogNameUpdate,
                breed: dd.breed,
                ageText,
                dogWeightKg: dd.dogWeightKg,
                currencyLabel: dd.currencyLabel,
                hoursPerDay: dd.hours,
                statusLabel: dd.statusUpdate,
            });
            await expect(page.getByText(dogDaycareText.toastUpdated).first()).toBeVisible();
            await dc.expectRowContains(e2eDogDaycare.dogNameUpdate);

            await dc.deleteByRef(cleanup.refCode);
            await expect(page.getByText(dogDaycareText.toastDeleted).first()).toBeVisible();
            await dc.expectNoRowContains(cleanup.refCode);
        } finally {
            await logisticsApp.teardownPetE2eData({ dogDaycareRef: cleanup.refCode });
        }
    });
});
