/**
 * PET PetUser: operational areas only (no Reports, no PetMovers).
 */
import { test, expect } from '@playwright/test';
import { MENU_ITEM } from '../../utils/constants';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { menu, petMovers as petMoversText } from '../../utils/text';

const { uiUsername, password } = config;

test.describe('Auth PetUser', () => {
    test('PetUser session and sidebar: Home, PetShipping, Booking, Points — not Reports or PetMovers', async ({
        page,
    }) => {
        test.skip(!uiUsername || !password, 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD');

        const app = new LogisticsApp(page);
        await app.openLogisticsApp();
        await app.loginAsPetUser();
        await app.clearPetLogisticsData();

        const role = await page.evaluate(() => {
            const raw = localStorage.getItem('pet-auth');
            if (!raw) {
                return null;
            }
            try {
                return (JSON.parse(raw) as { role?: string }).role ?? null;
            } catch {
                return null;
            }
        });
        expect(role).toBe('PetUser');

        for (const label of [menu.home, menu.petShipping, menu.booking, menu.points]) {
            await expect(page.locator('.ant-menu-item').filter({ hasText: label })).toBeVisible();
        }
        await expect(page.locator('.ant-menu-item').filter({ hasText: MENU_ITEM.REPORTS.name })).toHaveCount(0);
        await expect(page.locator('.ant-menu-item').filter({ hasText: menu.petMovers })).toHaveCount(0);

        await app.navigationSidebar.clickMenuItem(MENU_ITEM.HOME);
        await expect(page.getByTestId('dashboard-home')).toBeVisible();
    });

    test('PetUser cannot open /reports or /pet-movers', async ({ page }) => {
        test.skip(!uiUsername || !password, 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD');

        const app = new LogisticsApp(page);
        await app.openLogisticsApp();
        await app.loginAsPetUser();

        await page.goto('/reports');
        await expect(page).not.toHaveURL(/\/reports/);
        await expect(page.getByRole('heading', { name: menu.reports })).not.toBeVisible();

        await page.goto('/pet-movers');
        await expect(page).not.toHaveURL(/\/pet-movers/);
        await expect(page.getByRole('heading', { name: petMoversText.title })).not.toBeVisible();
    });
});
