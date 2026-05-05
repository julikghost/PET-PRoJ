/**
 * Booking CRUD (PET): table + modal; pet ship chosen from PetShipping.
 */
import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { expectAntPickerDropdownsClosed, expectAntSelectDropdownsClosed } from '../utils/antdUiWaits';
import { booking as bookingText } from '../utils/text';

export type BookingModalValues = {
    refCode: string;
    clientFirstName: string;
    clientLastName: string;
    petShipLabel: string;
    dateYmd: string;
    petLabels: string[];
    weight: string;
    paymentLabel?: string;
};

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

    /**
     * Species (`data-testid="booking-field-pet"`): открытие внутри поля, пункт в портале — `getByText`, не `role=option`.
     * После выбора проверка тега — `field.getByText` под тем же test id.
     */
    private async addMultiSelectOptionBySearch (
        modal: Locator,
        field: Locator,
        optionName: string
    ): Promise<void> {
        const combobox = field.getByRole('combobox');
        if ((await combobox.count()) > 0) {
            await combobox.first().click({ force: true });
        } else {
            await field.locator('.ant-select-selector').click({ force: true });
        }
        const search = field
            .locator('input[type="search"]')
            .or(field.locator('.ant-select-selection-search-input'))
            .or(field.locator('.ant-select-selection-search').locator('input'))
            .first();
        await expect(search).toBeVisible({ timeout: 10000 });
        await search.click({ force: true });
        await search.fill('');
        await search.fill(optionName);
        const dropdown = this.visibleSelectDropdown().last();
        await expect(dropdown).toBeVisible({ timeout: 15000 });
        // Как в DogDaycare: клик по [role=option] с rc-virtual-list даёт “hidden” / вне viewport; после поиска Enter выбирает отфильтрованный пункт.
        await search.press('Enter');
        // Теги Species в `.ant-select-selection-item`; голый `field.getByText` на контейнере ненадёжен для Ant.
        await expect(
            field.locator('.ant-select-selection-item').getByText(optionName, { exact: true }).first()
        ).toBeVisible({ timeout: 15000 });
        await modal.getByTestId('booking-field-ref').click({ force: true });
        await expectAntSelectDropdownsClosed(this.page);
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

    async fillForm (values: BookingModalValues): Promise<void> {
        await test.step(`Fill booking form: ${values.refCode}`, async () => {
            const modal = this.editDialog();
            await expect(modal).toBeVisible();
            await modal.getByTestId('booking-field-ref').fill(values.refCode);
            await modal.getByTestId('booking-field-client-first-name').fill(values.clientFirstName);
            await modal.getByTestId('booking-field-client-last-name').fill(values.clientLastName);

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
                await this.page.keyboard.press('Escape');
                await expectAntPickerDropdownsClosed(this.page);
                // `clear()` often times out on Ant DatePicker; `fill` replaces value without a separate clear step.
                await dateInput.fill(values.dateYmd);
                await dateInput.press('Enter');
            }
            await expect(dateInput).toHaveValue(values.dateYmd, { timeout: 15000 });

            /** Species: `BookingPage` sets `data-testid="booking-field-pet"` on the Select. */
            const petField = modal.getByTestId('booking-field-pet');
            // Replace existing tags (edit flow) so `petLabels` does not accumulate on top of loaded values.
            for (;;) {
                const removes = petField.locator('.ant-select-selection-item-remove');
                if ((await removes.count()) === 0) {
                    break;
                }
                await removes.first().click({ force: true });
            }
            for (const name of values.petLabels) {
                await this.addMultiSelectOptionBySearch(modal, petField, name);
            }
            const speciesDropdowns = this.visibleSelectDropdown();
            if (await speciesDropdowns.count()) {
                await modal.getByRole('heading').first().click({ force: true });
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

    async createBookingExpectCreatedToast (values: BookingModalValues): Promise<void> {
        await test.step(`Create booking ${values.refCode} — toast created`, async () => {
            await this.clickAdd();
            await this.fillForm(values);
            await this.saveModal();
            await expect(this.page.getByText(bookingText.toastCreated)).toBeVisible();
        });
    }

    async updateBookingExpectUpdatedToast (refCode: string, values: BookingModalValues): Promise<void> {
        await test.step(`Update booking ${refCode} — toast updated`, async () => {
            await this.clickEdit(refCode);
            await this.fillForm(values);
            await this.saveModal();
            await expect(this.page.getByText(bookingText.toastUpdated)).toBeVisible();
        });
    }

    async deleteBookingExpectDeletedToast (refCode: string): Promise<void> {
        await test.step(`Delete booking ${refCode} — toast deleted, row gone`, async () => {
            await this.clickDelete(refCode);
            await this.confirmDeleteInDialog();
            await expect(this.page.getByText(bookingText.toastDeleted)).toBeVisible();
            await this.expectNoRowContains(refCode);
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
            const pop = this.page.getByRole('dialog').filter({ hasText: 'Delete booking?' });
            await expect(pop).toBeVisible();
            await pop.getByRole('button', { name: 'Delete' }).click();
        });
    }

    async expectRowContains (substring: string): Promise<void> {
        await test.step(`Booking table row contains: ${substring}`, async () => {
            const table = this.root.getByTestId('booking-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toBeVisible();
        });
    }

    async expectRowContainsAll (substrings: string[]): Promise<void> {
        await test.step(`Booking table row contains all: ${substrings.join(' | ')}`, async () => {
            let rows = this.root.getByTestId('booking-table').locator('tr');
            for (const s of substrings) {
                rows = rows.filter({ hasText: s });
            }
            await expect(rows.first()).toBeVisible();
        });
    }

    async expectNoRowContains (substring: string): Promise<void> {
        await test.step(`Booking table has no row: ${substring}`, async () => {
            const table = this.root.getByTestId('booking-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toHaveCount(0);
        });
    }
}
