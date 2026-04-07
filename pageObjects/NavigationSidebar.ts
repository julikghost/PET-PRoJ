/**
 * Page object for the Ant Design sidebar: item clicks with URL check and submenu expansion.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export class NavigationSidebar {
    readonly page: Page;

    constructor (page: Page) {
        this.page = page;
    }

    async clickMenuItem ({ name, route }: { name: string; route: string }): Promise<void> {
        await test.step(`Open sidebar section: ${route}`, async () => {
            const menuItem = this.page.locator('.ant-menu-item').filter({ hasText: name });
            const urlPattern =
                route === 'home'
                    ? /\/home(\/|\?|$)/
                    : new RegExp(`/${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

            await menuItem.click();
            await expect(this.page).toHaveURL(urlPattern);
            await expect(menuItem).toHaveClass(/ant-menu-item-selected/);
        });
    }

    async expandSubMenu ({ name }: { name: string }): Promise<void> {
        await test.step(`Expand sidebar submenu: ${name}`, async () => {
            const menuItem = this.page.locator('.ant-menu-submenu').filter({ hasText: name });
            await menuItem.click();

            await expect(menuItem).toHaveClass(/ant-menu-submenu-open/);
        });
    }
}
