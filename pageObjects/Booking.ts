/**
 * Booking CRUD (PET): table + modal; pet ship chosen from PetShipping.
 */
import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { booking as bookingText } from '../utils/text';

export class Booking {
    readonly page: Page;
    readonly root: Locator;

    constructor (page: Page) {
        this.page = page;
        this.root = page.getByTestId('booking-records-page');
    }

    private editDialog (): Locator {
        return this.page.getByRole('dialog').filter({ has: this.page.getByTestId('booking-form') });
    }

    async expectLoaded (): Promise<void> {
        await test.step('Booking page visible', async () => {
            await expect(this.root).toBeVisible();
            await expect(this.page.getByRole('heading', { name: bookingText.title })).toBeVisible();
        });
    }

    async clickAdd (): Promise<void> {
        await test.step('Click new booking', async () => {
            await this.root.getByTestId('booking-add').click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    async fillForm (values: {
        refCode: string;
        petShipLabel: string;
        dateYmd: string;
        petLabel: string;
        weight: string;
    }): Promise<void> {
        await test.step(`Fill booking form: ${values.refCode}`, async () => {
            const modal = this.editDialog();
            await expect(modal).toBeVisible();
            await modal.getByTestId('booking-field-ref').fill(values.refCode);

            await modal.getByTestId('booking-field-pet-ship').click();
            const dropdown = this.page.locator('.ant-select-dropdown:visible').last();
            await dropdown.locator('.ant-select-item-option-content').filter({ hasText: values.petShipLabel }).first().click();
            await modal.locator('.ant-modal-title').click();

            const dateInput = modal.getByTestId('booking-field-date').getByRole('textbox');
            await dateInput.click();
            await dateInput.clear();
            await dateInput.fill(values.dateYmd);
            await dateInput.press('Enter');

            await modal.getByTestId('booking-field-pet').fill(values.petLabel);
            const weightInput = modal.getByTestId('booking-field-weight').locator('input');
            await weightInput.click();
            await weightInput.fill(values.weight);
        });
    }

    async saveModal (): Promise<void> {
        await test.step('Save booking modal', async () => {
            await this.editDialog().getByRole('button', { name: bookingText.save }).click();
        });
    }

    async clickEdit (refCode: string): Promise<void> {
        await test.step(`Edit booking ${refCode}`, async () => {
            await this.root.getByTestId(`booking-edit-${refCode}`).click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    async clickDelete (refCode: string): Promise<void> {
        await test.step(`Delete booking ${refCode}`, async () => {
            await this.root.getByTestId(`booking-delete-${refCode}`).click();
        });
    }

    async confirmDeleteInDialog (): Promise<void> {
        await test.step('Confirm delete booking', async () => {
            const confirm = this.page.locator('.ant-modal-confirm');
            await expect(confirm).toBeVisible();
            await confirm.getByRole('button', { name: 'Delete' }).click();
        });
    }

    async expectRowContains (substring: string): Promise<void> {
        await test.step(`Booking table row contains: ${substring}`, async () => {
            const table = this.root.getByTestId('booking-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toBeVisible();
        });
    }

    async expectNoRowContains (substring: string): Promise<void> {
        await test.step(`Booking table has no row: ${substring}`, async () => {
            const table = this.root.getByTestId('booking-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toHaveCount(0);
        });
    }
}
