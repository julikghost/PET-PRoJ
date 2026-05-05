import type { Points } from '../pageObjects/Points';
import { MENU_ITEM } from '../utils/constants';
import { test as base } from './logisticsApp.fixture';

type PointsFixtures = {
    pointsPage: Points;
};

/**
 * Points-specific fixture: opens app (session storage already provided by project),
 * clears data, navigates to Points, waits for the table to load, and exposes the Points POM.
 */
export const test = base.extend<PointsFixtures>({
    pointsPage: async ({ page, logisticsApp }, use) => {
        await page.goto('/home');
        await logisticsApp.clearPetLogisticsData();
        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
        await logisticsApp.points.expectLoaded();
        await use(logisticsApp.points);
    },
});

export { expect } from './logisticsApp.fixture';
