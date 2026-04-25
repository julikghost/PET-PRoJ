import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { dogDaycare as dogDaycareText } from '../../utils/text';
import { expect, test } from '../fixtures/logisticsApp.fixture';

const { uiUsername, password } = config;

test.describe('Dog Daycare', () => {
    test('create, update, delete daycare stop', async ({ page, logisticsApp }) => {
        test.skip(!uiUsername || !password, 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD');

        await page.goto('/home');
        await logisticsApp.clearPetLogisticsData();

        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.DOG_DAYCARE);
        const dc = logisticsApp.dogDaycare;
        await dc.expectLoaded();

        const ts = Date.now();
        const refCode = `E2E-DC-${ts}`;
        const bookingRef = `BK-DC-${ts}`;
        const t = new Date();
        const bookingDateYmd = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
            t.getDate()
        ).padStart(2, '0')}`;

        await dc.clickAdd();
        await dc.fillForm({
            refCode,
            bookingRefCode: bookingRef,
            bookingDateYmd,
            dogName: 'E2E Rex',
            dogWeightKg: '8',
            currencyLabel: 'EUR',
            hours: '4',
            statusLabel: 'Scheduled',
        });
        await dc.saveModal();
        await expect(page.getByText(dogDaycareText.toastCreated).first()).toBeVisible();
        await dc.expectRowContains(refCode);
        await dc.expectRowContains('E2E Rex');

        await dc.clickEdit(refCode);
        await dc.fillForm({
            refCode,
            bookingRefCode: bookingRef,
            bookingDateYmd,
            dogName: 'E2E Rex Pro',
            dogWeightKg: '8',
            currencyLabel: 'EUR',
            hours: '4',
            statusLabel: 'Checked in',
        });
        await dc.saveModal();
        await expect(page.getByText(dogDaycareText.toastUpdated).first()).toBeVisible();
        await dc.expectRowContains('E2E Rex Pro');

        await dc.clickDelete(refCode);
        await dc.confirmDeleteInDialog();
        await expect(page.getByText(dogDaycareText.toastDeleted).first()).toBeVisible();
        await dc.expectNoRowContains(refCode);
    });
});
