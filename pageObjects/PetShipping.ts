/**
 * PetShipping CRUD (PET): table + modal; From/To are network points (`Name (code)`).
 */
import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { petShipping as petShippingText } from '../utils/text';

export class PetShipping {
    readonly page: Page;
    readonly root: Locator;

    constructor (page: Page) {
        this.page = page;
        this.root = page.getByTestId('movement-schedule-page');
    }

    private editDialog (): Locator {
        return this.page.getByRole('dialog').filter({ has: this.page.getByTestId('schedule-form') });
    }

    async expectLoaded (): Promise<void> {
        await test.step('PetShipping page visible', async () => {
            await expect(this.root).toBeVisible();
            await expect(this.page.getByRole('heading', { name: petShippingText.title })).toBeVisible();
        });
    }

    async clickAdd (): Promise<void> {
        await test.step('Click add pet ship', async () => {
            await this.root.getByTestId('schedule-add').click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    async fillForm (values: {
        refCode: string;
        fromLabel: string;
        toLabel: string;
        departure: string;
        arrival: string;
        petMover: string;
        statusLabel: string;
    }): Promise<void> {
        await test.step(`Fill pet ship form: ${values.refCode}`, async () => {
            const modal = this.editDialog();
            await expect(modal).toBeVisible();
            await modal.getByTestId('schedule-field-ref').fill(values.refCode);

            await modal.getByTestId('schedule-field-from').click();
            let dropdown = this.page.locator('.ant-select-dropdown:visible').last();
            await dropdown.locator('.ant-select-item-option-content').filter({ hasText: values.fromLabel }).first().click();

            await modal.getByTestId('schedule-field-to').click();
            dropdown = this.page.locator('.ant-select-dropdown:visible').last();
            await dropdown.locator('.ant-select-item-option-content').filter({ hasText: values.toLabel }).first().click();

            await modal.getByTestId('schedule-field-departure').fill(values.departure);
            await modal.getByTestId('schedule-field-arrival').fill(values.arrival);
            await modal.getByTestId('schedule-field-petmover').fill(values.petMover);
            await modal.getByTestId('schedule-field-status').click();
            dropdown = this.page.locator('.ant-select-dropdown:visible').last();
            await dropdown.locator('.ant-select-item-option-content').filter({ hasText: values.statusLabel }).first().click();
        });
    }

    async saveModal (): Promise<void> {
        await test.step('Save pet ship modal', async () => {
            await this.editDialog().getByRole('button', { name: petShippingText.save }).click();
        });
    }

    async clickEdit (refCode: string): Promise<void> {
        await test.step(`Edit pet ship ${refCode}`, async () => {
            await this.root.getByTestId(`schedule-edit-${refCode}`).click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    async clickDelete (refCode: string): Promise<void> {
        await test.step(`Delete pet ship ${refCode}`, async () => {
            await this.root.getByTestId(`schedule-delete-${refCode}`).click();
        });
    }

    async confirmDeleteInDialog (): Promise<void> {
        await test.step('Confirm delete pet ship', async () => {
            const confirm = this.page.locator('.ant-modal-confirm');
            await expect(confirm).toBeVisible();
            await confirm.getByRole('button', { name: 'Delete' }).click();
        });
    }

    async expectRowContains (substring: string): Promise<void> {
        await test.step(`PetShipping table row contains: ${substring}`, async () => {
            const table = this.root.getByTestId('schedule-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toBeVisible();
        });
    }

    async expectNoRowContains (substring: string): Promise<void> {
        await test.step(`PetShipping table has no row: ${substring}`, async () => {
            const table = this.root.getByTestId('schedule-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toHaveCount(0);
        });
    }
}
