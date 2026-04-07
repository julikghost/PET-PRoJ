/**
 * PET PetAdmin: PetMovers + full menu including Reports.
 */
import { test, expect } from '@playwright/test';
import { MENU_ITEM } from '../../utils/constants';
import { config } from '../../config-logistics';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import { petMovers as petMoversText } from '../../utils/text';

const { adminUsername, adminPassword } = config;

test.describe('Auth PetAdmin', () => {
    test('PetAdmin login, role, PetMovers menu and route', async ({ page }) => {
        test.skip(
            !adminUsername || !adminPassword,
            'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD (and VITE_PET_ADMIN_* in pet-app/.env)'
        );

        const app = new LogisticsApp(page);
        await app.openLogisticsApp();
        await app.loginAsPetAdmin();

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
        expect(role).toBe('PetAdmin');

        await expect(page.getByText('PetAdmin', { exact: true })).toBeVisible();
        await expect(
            page.locator('.ant-menu-item').filter({ hasText: MENU_ITEM.PET_MOVERS.name })
        ).toBeVisible();

        await page.goto('/pet-movers');
        await expect(page).toHaveURL(/\/pet-movers/);
        await expect(page.getByRole('heading', { name: petMoversText.title })).toBeVisible();
    });
});
