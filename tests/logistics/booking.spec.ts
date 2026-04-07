/**
 * Booking CRUD: Points → PetShipping (planned/active) → booking selects a pet ship.
 */
import { test, expect } from '@playwright/test';
import { MENU_ITEM } from '../../utils/constants';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { booking as bookingText } from '../../utils/text';
import { petShipping as petShippingText } from '../../utils/text';
import { points as pointsText } from '../../utils/text';

const { uiUsername, password } = config;

test.describe('Booking', () => {
    test('create booking on an available pet ship', async ({ page }) => {
        test.skip(!uiUsername || !password, 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD');

        const ts = Date.now();
        const codeA = `E2E-BK-A-${ts}`;
        const codeB = `E2E-BK-B-${ts}`;
        const fromLabel = `Hub A (${codeA})`;
        const toLabel = `Hub B (${codeB})`;
        const shipRef = `E2E-BK-SHIP-${ts}`;
        const bkRef = `E2E-BK-${ts}`;

        const app = new LogisticsApp(page);
        await app.openLogisticsApp();
        await app.loginAsPetUser();
        await app.clearPetLogisticsData();

        await app.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
        const pt = app.points;
        await pt.clickAdd();
        await pt.fillForm({
            code: codeA,
            name: 'Hub A',
            city: 'C1',
            kindLabel: pointsText.kindHub,
        });
        await pt.saveModal();
        await pt.clickAdd();
        await pt.fillForm({
            code: codeB,
            name: 'Hub B',
            city: 'C2',
            kindLabel: pointsText.kindHub,
        });
        await pt.saveModal();

        await app.navigationSidebar.clickMenuItem(MENU_ITEM.PET_SHIPPING);
        await app.petShipping.clickAdd();
        await app.petShipping.fillForm({
            refCode: shipRef,
            fromLabel,
            toLabel,
            departure: '2026-07-01 09:00',
            arrival: '2026-07-01 18:00',
            petMover: 'PM-E2E',
            statusLabel: petShippingText.statusPlanned,
        });
        await app.petShipping.saveModal();

        await app.navigationSidebar.clickMenuItem(MENU_ITEM.BOOKING);
        const bk = app.booking;
        await bk.expectLoaded();

        await bk.clickAdd();
        await bk.fillForm({
            refCode: bkRef,
            petShipLabel: shipRef,
            dateYmd: '2026-07-15',
            petLabel: 'E2E Rex',
            weight: '6',
        });
        await bk.saveModal();
        await expect(page.getByText(bookingText.toastCreated)).toBeVisible();

        await bk.expectRowContains(bkRef);
        await bk.expectRowContains('E2E Rex');
        await bk.expectRowContains(shipRef);

        await bk.clickEdit(bkRef);
        await bk.fillForm({
            refCode: bkRef,
            petShipLabel: shipRef,
            dateYmd: '2026-07-16',
            petLabel: 'E2E Max',
            weight: '7',
        });
        await bk.saveModal();
        await expect(page.getByText(bookingText.toastUpdated)).toBeVisible();
        await bk.expectRowContains('E2E Max');

        await bk.clickDelete(bkRef);
        await bk.confirmDeleteInDialog();
        await expect(page.getByText(bookingText.toastDeleted)).toBeVisible();
        await bk.expectNoRowContains(bkRef);
    });
});
