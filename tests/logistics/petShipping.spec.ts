/**
 * PetShipping CRUD: requires at least two Points first (shared store).
 */
import { test, expect } from '@playwright/test';
import { MENU_ITEM } from '../../utils/constants';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { petShipping as petShippingText } from '../../utils/text';
import { points as pointsText } from '../../utils/text';

const { uiUsername, password } = config;

test.describe('PetShipping', () => {
    test('create pet ship after two points, then update and delete', async ({ page }) => {
        test.skip(!uiUsername || !password, 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD');

        const ts = Date.now();
        const codeA = `E2E-A-${ts}`;
        const codeB = `E2E-B-${ts}`;
        const fromLabel = `E2E Alpha (${codeA})`;
        const toLabel = `E2E Beta (${codeB})`;
        const shipRef = `E2E-PS-${ts}`;

        const app = new LogisticsApp(page);
        await app.openLogisticsApp();
        await app.loginAsPetUser();
        await app.clearPetLogisticsData();

        await app.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
        const pt = app.points;
        await pt.clickAdd();
        await pt.fillForm({
            code: codeA,
            name: 'E2E Alpha',
            city: 'CityA',
            kindLabel: pointsText.kindHub,
        });
        await pt.saveModal();
        await expect(page.getByText(pointsText.toastCreated)).toBeVisible();

        await pt.clickAdd();
        await pt.fillForm({
            code: codeB,
            name: 'E2E Beta',
            city: 'CityB',
            kindLabel: pointsText.kindHub,
        });
        await pt.saveModal();
        await expect(page.getByText(pointsText.toastCreated)).toBeVisible();

        await app.navigationSidebar.clickMenuItem(MENU_ITEM.PET_SHIPPING);
        const ship = app.petShipping;
        await ship.expectLoaded();

        await ship.clickAdd();
        await ship.fillForm({
            refCode: shipRef,
            fromLabel,
            toLabel,
            departure: '2026-06-01 08:00',
            arrival: '2026-06-01 20:00',
            petMover: 'PetMover E2E',
            statusLabel: petShippingText.statusPlanned,
        });
        await ship.saveModal();
        await expect(page.getByText(petShippingText.toastCreated)).toBeVisible();

        await ship.expectRowContains(shipRef);
        await ship.expectRowContains('E2E Alpha');

        await ship.clickEdit(shipRef);
        await ship.fillForm({
            refCode: shipRef,
            fromLabel,
            toLabel,
            departure: '2026-06-01 08:00',
            arrival: '2026-06-01 20:00',
            petMover: 'PetMover E2E v2',
            statusLabel: petShippingText.statusActive,
        });
        await ship.saveModal();
        await expect(page.getByText(petShippingText.toastUpdated)).toBeVisible();
        await ship.expectRowContains('PetMover E2E v2');

        await ship.clickDelete(shipRef);
        await ship.confirmDeleteInDialog();
        await expect(page.getByText(petShippingText.toastDeleted)).toBeVisible();
        await ship.expectNoRowContains(shipRef);
    });
});
