import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { getTodayAndTomorrowDays } from '../../utils/date';
import { E2E_SKIP, e2eDogDaycare, e2eRefs } from '../../utils/e2eTestData';
import { dogDaycare as dogDaycareText } from '../../utils/text';
import { expect, test } from '../../fixtures/logisticsApp.fixture';

const { uiUsername, password } = config;

test.describe('Dog Daycare', () => {
    test('create, update, delete daycare stop', async ({ page, logisticsApp }) => {
        test.skip(!uiUsername || !password, E2E_SKIP.LOGISTICS_UI_CREDENTIALS);

        const { todayDay: bookingDateYmd } = getTodayAndTomorrowDays();
        const dd = e2eDogDaycare as typeof e2eDogDaycare & {
            breed: string;
            ageYears: string;
            ageMonths: string;
        };

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

            await dc.clickAdd();
            await dc.fillForm({
                refCode: cleanup.refCode,
                bookingRefCode: bookingRef,
                clientFirstName: dd.clientFirstName,
                clientLastName: dd.clientLastName,
                startDateYmd: bookingDateYmd,
                endDateYmd: bookingDateYmd,
                dogName: dd.dogNameCreate,
                breed: dd.breed,
                dogWeightKg: dd.dogWeightKg,
                currencyLabel: dd.currencyLabel,
                hoursPerDay: dd.hours,
                statusLabel: dd.statusCreate,
            });
            await test.step('Assert required fields populated (create)', async () => {
                await expect(page.getByTestId('daycare-field-ref').locator('input')).toHaveValue(cleanup.refCode ?? '');
                await expect(page.getByTestId('daycare-field-booking-ref').locator('input')).toHaveValue(bookingRef);
                await expect(page.getByTestId('daycare-field-client-first-name').locator('input')).toHaveValue(dd.clientFirstName);
                await expect(page.getByTestId('daycare-field-client-last-name').locator('input')).toHaveValue(dd.clientLastName);
                await expect(page.getByTestId('daycare-field-dog-name').locator('input')).toHaveValue(dd.dogNameCreate);
                await expect(
                    page.getByTestId('daycare-field-hours-per-day').locator('.ant-select-selection-item').first()
                ).toHaveText(dd.hours);
            });
            await dc.saveModal();
            await expect(page.getByText(dogDaycareText.toastCreated).first()).toBeVisible();
            await dc.expectRowContains(cleanup.refCode);
            await dc.expectRowContains(e2eDogDaycare.dogNameCreate);

            await dc.clickEdit(cleanup.refCode);
            await dc.fillForm({
                refCode: cleanup.refCode,
                bookingRefCode: bookingRef,
                clientFirstName: dd.clientFirstName,
                clientLastName: dd.clientLastName,
                startDateYmd: bookingDateYmd,
                endDateYmd: bookingDateYmd,
                dogName: dd.dogNameUpdate,
                breed: dd.breed,
                dogWeightKg: dd.dogWeightKg,
                currencyLabel: dd.currencyLabel,
                hoursPerDay: dd.hours,
                statusLabel: dd.statusUpdate,
            });
            await dc.expectRequiredFieldsPopulated({
                refCode: cleanup.refCode ?? '',
                bookingRefCode: bookingRef,
                clientFirstName: dd.clientFirstName,
                clientLastName: dd.clientLastName,
                dogName: dd.dogNameUpdate,
                hoursPerDay: dd.hours,
            });
            await dc.saveModal();
            await expect(page.getByText(dogDaycareText.toastUpdated).first()).toBeVisible();
            await dc.expectRowContains(e2eDogDaycare.dogNameUpdate);

            await dc.clickDelete(cleanup.refCode);
            await dc.confirmDeleteInDialog();
            await expect(page.getByText(dogDaycareText.toastDeleted).first()).toBeVisible();
            await dc.expectNoRowContains(cleanup.refCode);
        } finally {
            await logisticsApp.teardownPetE2eData({ dogDaycareRef: cleanup.refCode });
        }
    });
});
