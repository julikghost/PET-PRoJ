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

    private visibleSelectDropdown (): Locator {
        return this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    }

    private selectDropdownWithOption (optionName: string, exact = true): Locator {
        if (exact) {
            return this.visibleSelectDropdown()
                .filter({
                    has: this.page.getByRole('option', { name: optionName, exact: true }),
                })
                .last();
        }

        return this.visibleSelectDropdown()
            .filter({
                has: this.page.locator('.ant-select-item-option-content').filter({ hasText: optionName }),
            })
            .last();
    }

    private async selectOptionByClick (
        field: Locator,
        optionName: string,
        exact = true
    ): Promise<void> {
        await field.locator('.ant-select-selector').click({ force: true });
        const dropdown = this.selectDropdownWithOption(optionName, exact);
        await expect(dropdown).toBeVisible({ timeout: 15000 });
        const option = exact
            ? dropdown.getByRole('option', { name: optionName, exact: true }).first()
            : dropdown.locator('.ant-select-item-option-content').filter({ hasText: optionName }).first();
        await option.click({ force: true });
        await expect.poll(async () => await dropdown.count(), { timeout: 15000 }).toBe(0);
    }

    private async addMultiSelectOptionBySearch (
        field: Locator,
        optionName: string
    ): Promise<void> {
        await field.locator('.ant-select-selector').click({ force: true });
        const search = field
            .getByRole('combobox')
            .or(field.locator('input[type="search"]'))
            .or(field.locator('.ant-select-selection-search-input'))
            .first();
        await expect(search).toBeVisible({ timeout: 10000 });
        await search.fill(optionName);
        const dropdown = this.selectDropdownWithOption(optionName);
        await expect(dropdown).toBeVisible({ timeout: 15000 });
        await dropdown.getByRole('option', { name: optionName, exact: true }).waitFor({
            state: 'attached',
            timeout: 15000,
        });
        await search.press('Enter');
        await expect(field.locator('.ant-select-selection-item').filter({ hasText: optionName }).first()).toBeVisible({
            timeout: 15000,
        });
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
        /** Species from the booking catalog (multi-select). */
        petLabels: string[];
        weight: string;
        /** Label in Payment method select (default Card). Same set as Reports. */
        paymentLabel?: string;
    }): Promise<void> {
        await test.step(`Fill booking form: ${values.refCode}`, async () => {
            const modal = this.editDialog();
            await expect(modal).toBeVisible();
            await modal.getByTestId('booking-field-ref').fill(values.refCode);

            const petShipField = modal.getByTestId('booking-field-pet-ship');
            await petShipField.locator('.ant-select-selector').click({ force: true });
            const petShipSearch = petShipField
                .locator('input[type="search"]')
                .or(petShipField.locator('.ant-select-selection-search-input'))
                .first();
            await expect(petShipSearch).toBeVisible({ timeout: 5000 });
            await petShipSearch.fill(values.petShipLabel);
            await petShipSearch.press('Enter');
            await expect(
                petShipField.locator('.ant-select-selection-item').filter({ hasText: values.petShipLabel }).first()
            ).toBeVisible({ timeout: 15000 });

            const dateField = modal.getByTestId('booking-field-date');
            await expect(dateField).toBeVisible({ timeout: 15000 });
            /** Ant Design DatePicker: avoid coupling to `.ant-picker-input` (markup varies by version). */
            const dateInput = dateField
                .getByRole('textbox')
                .or(dateField.locator('input:not([type="hidden"])'))
                .first();
            await expect(dateInput).toBeVisible({ timeout: 15000 });
            await dateInput.click({ force: true });
            const dateDropdown = this.page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)').last();
            let pickedFromCalendar = false;
            try {
                await expect(dateDropdown).toBeVisible({ timeout: 3000 });
                const dateCell = dateDropdown.locator(`td[title="${values.dateYmd}"]`).first();
                if (await dateCell.count()) {
                    await dateCell.click({ force: true });
                    pickedFromCalendar = true;
                }
            } catch {
                /* fallback to plain input */
            }
            if (!pickedFromCalendar) {
                // Picker may be open with no matching cell (e.g. wrong month); it blocks the input for clear/fill.
                await this.page.keyboard.press('Escape');
                await this.page
                    .locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')
                    .waitFor({ state: 'hidden', timeout: 5000 })
                    .catch(() => {});
                await dateInput.clear();
                await dateInput.fill(values.dateYmd);
                await dateInput.press('Enter');
            }
            await expect(dateInput).toHaveValue(values.dateYmd, { timeout: 15000 });

            const petField = modal.getByTestId('booking-field-pet');
            for (const name of values.petLabels) {
                await this.addMultiSelectOptionBySearch(petField, name);
            }
            const speciesDropdowns = this.visibleSelectDropdown();
            if (await speciesDropdowns.count()) {
                await modal.locator('.ant-modal-title').click({ force: true });
                await expect.poll(async () => await speciesDropdowns.count(), { timeout: 15000 }).toBe(0);
            }

            const weightInput = modal.getByTestId('booking-field-weight').locator('input');
            await weightInput.click();
            await weightInput.fill(values.weight);

            if (values.paymentLabel?.trim()) {
                const paymentField = modal.getByTestId('booking-field-payment');
                await this.selectOptionByClick(paymentField, values.paymentLabel.trim());
            }
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
