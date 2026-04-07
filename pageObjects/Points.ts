/**
 * Points directory CRUD (PET): table + modal.
 */
import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { points as pointsText } from '../utils/text';

export class Points {
    readonly page: Page;
    readonly root: Locator;

    constructor (page: Page) {
        this.page = page;
        this.root = page.getByTestId('points-page');
    }

    private editDialog (): Locator {
        return this.page.getByRole('dialog').filter({ has: this.page.getByTestId('points-form') });
    }

    async expectLoaded (): Promise<void> {
        await test.step('Points page visible', async () => {
            await expect(this.root).toBeVisible();
            await expect(this.page.getByRole('heading', { name: pointsText.title })).toBeVisible();
        });
    }

    async clickAdd (): Promise<void> {
        await test.step('Click add point', async () => {
            await this.root.getByTestId('points-add').click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    async fillForm (values: {
        code: string;
        name: string;
        city: string;
        kindLabel: string;
    }): Promise<void> {
        await test.step(`Fill point form: ${values.code}`, async () => {
            const modal = this.editDialog();
            await expect(modal).toBeVisible();
            await modal.getByTestId('points-field-code').fill(values.code);
            await modal.getByTestId('points-field-name').fill(values.name);
            await modal.getByTestId('points-field-city').fill(values.city);
            await modal.getByTestId('points-field-kind').click();
            const dropdown = this.page.locator('.ant-select-dropdown:visible').last();
            await dropdown.locator('.ant-select-item-option-content').filter({ hasText: values.kindLabel }).first().click();
        });
    }

    async saveModal (): Promise<void> {
        await test.step('Save point modal', async () => {
            await this.editDialog().getByRole('button', { name: pointsText.save }).click();
        });
    }

    async clickEdit (code: string): Promise<void> {
        await test.step(`Edit point ${code}`, async () => {
            await this.root.getByTestId(`point-edit-${code}`).click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    async clickDelete (code: string): Promise<void> {
        await test.step(`Delete point ${code}`, async () => {
            await this.root.getByTestId(`point-delete-${code}`).click();
        });
    }

    async confirmDeleteInDialog (): Promise<void> {
        await test.step('Confirm delete point', async () => {
            const confirm = this.page.locator('.ant-modal-confirm');
            await expect(confirm).toBeVisible();
            await confirm.getByRole('button', { name: 'Delete' }).click();
        });
    }

    async expectRowContains (substring: string): Promise<void> {
        await test.step(`Points table row contains: ${substring}`, async () => {
            const table = this.root.getByTestId('points-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toBeVisible();
        });
    }

    async expectNoRowContains (substring: string): Promise<void> {
        await test.step(`Points table has no row: ${substring}`, async () => {
            const table = this.root.getByTestId('points-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toHaveCount(0);
        });
    }
}
