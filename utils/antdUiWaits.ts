/**
 * Expect-based waits for Ant Design portal UI (avoid fixed sleeps and fire-and-forget waitFor).
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function expectAntSelectDropdownsClosed (page: Page, timeout = 15000): Promise<void> {
    await expect.poll(
        async () => await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').count(),
        { timeout }
    ).toBe(0);
}

export async function expectAntPickerDropdownsClosed (page: Page, timeout = 15000): Promise<void> {
    await expect.poll(
        async () => await page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)').count(),
        { timeout }
    ).toBe(0);
}
