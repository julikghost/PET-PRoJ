/**
 * PET PetAccountant: Reports only; operational routes redirect away from schedule/home/booking.
 */
import { test, expect } from '@playwright/test';
import { MENU_ITEM } from '../../utils/constants';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { menu } from '../../utils/text';
import { petShipping as petShippingText } from '../../utils/text';

const { accountantUsername, accountantPassword } = config;

test.describe('Auth PetAccountant', () => {
    test('sidebar has only Reports; /schedule and /booking redirect', async ({ page }) => {
        test.skip(
            !accountantUsername || !accountantPassword,
            'Set LOGISTICS_ACCOUNTANT_USER_NAME and LOGISTICS_ACCOUNTANT_PASSWORD (and VITE_PET_ACCOUNTANT_* in pet-app/.env)'
        );

        const app = new LogisticsApp(page);
        await app.openLogisticsApp();
        await app.loginAsPetAccountant();

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
        expect(role).toBe('PetAccountant');

        await expect(page.getByText('PetAccountant', { exact: true })).toBeVisible();
        await expect(
            page.locator('.ant-menu-item').filter({ hasText: MENU_ITEM.REPORTS.name })
        ).toBeVisible();
        await expect(page.locator('.ant-menu-item').filter({ hasText: menu.home })).toHaveCount(0);
        await expect(
            page.locator('.ant-menu-item').filter({ hasText: MENU_ITEM.PET_SHIPPING.name })
        ).toHaveCount(0);

        await page.goto('/schedule');
        await expect(page).not.toHaveURL(/\/schedule/);
        await expect(page.getByRole('heading', { name: petShippingText.title })).not.toBeVisible();

        await page.goto('/booking');
        await expect(page).not.toHaveURL(/\/booking/);
    });
});
