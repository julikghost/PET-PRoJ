/**
 * Dog Daycare CRUD (PET): table + modal; data independent from Booking.
 */
import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { dogDaycare as dogDaycareText } from '../utils/text';

export class DogDaycare {
    readonly page: Page;
    readonly root: Locator;
    readonly heading: Locator;
    readonly addButton: Locator;

    constructor (page: Page) {
        this.page = page;
        this.root = page.getByTestId('dog-daycare-page');
        this.heading = page.getByRole('heading', { name: dogDaycareText.title });
        this.addButton = this.root.getByTestId('daycare-add');
    }

    private editDialog (): Locator {
        return this.page.getByRole('dialog').filter({ has: this.page.getByTestId('daycare-form') });
    }

    /**
     * If the Select already shows this label, skip. Otherwise open and pick by index with ArrowDown + Enter
     * (clicks on options are flaky when the long modal + portal push options outside the viewport).
     */
    private async selectOptionIfNotActive (
        field: Locator,
        optionName: string,
        /** Ordered option labels (must match the Select options, first = index 0). */
        orderedLabels: string[]
    ): Promise<void> {
        const selected = field.locator('.ant-select-selection-item');
        if (await selected.filter({ hasText: optionName }).count() > 0) {
            return;
        }
        const targetIdx = orderedLabels.indexOf(optionName);
        if (targetIdx === -1) {
            throw new Error(`Unknown option label: ${optionName}`);
        }
        await field.locator('.ant-select-selector').click({ force: true });
        const anyDd = this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
        await expect(anyDd).toBeVisible({ timeout: 15000 });
        for (let i = 0; i < targetIdx; i++) {
            await this.page.keyboard.press('ArrowDown');
        }
        await this.page.keyboard.press('Enter');
        await expect.poll(
            async () => await this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').count(),
            { timeout: 15000 }
        ).toBe(0);
    }

    private async fillBookingDateYmd (modal: Locator, dateYmd: string): Promise<void> {
        const dateField = modal.getByTestId('daycare-field-booking-date');
        await expect(dateField).toBeVisible({ timeout: 15000 });
        const dateInput = dateField.locator('input').first();
        await expect(dateInput).toBeVisible({ timeout: 15000 });
        await dateInput.click({ force: true });
        const dateDropdown = this.page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)').last();
        let pickedFromCalendar = false;
        try {
            await expect(dateDropdown).toBeVisible({ timeout: 3000 });
            const dateCell = dateDropdown.locator(`td[title="${dateYmd}"]`).first();
            if (await dateCell.count()) {
                await dateCell.click({ force: true });
                pickedFromCalendar = true;
            }
        } catch {
            /* use manual input path */
        }
        if (!pickedFromCalendar) {
            // Do not press Escape: Ant Design may close the whole form Modal. Blur the picker via another field.
            await modal.getByTestId('daycare-field-ref').click({ force: true });
            await this.page
                .locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')
                .waitFor({ state: 'hidden', timeout: 5000 })
                .catch(() => {});
            await dateInput.click({ force: true });
            await this.page.keyboard.press('Control+a');
            await dateInput.fill(dateYmd, { force: true });
            await dateInput.press('Enter');
        }
        await expect(dateInput).toHaveValue(dateYmd, { timeout: 15000 });
    }

    async expectLoaded (): Promise<void> {
        await test.step('Dog Daycare page visible', async () => {
            await expect(this.root).toBeVisible();
            await expect(this.heading).toBeVisible();
        });
    }

    async clickAdd (): Promise<void> {
        await test.step('Click add daycare', async () => {
            await this.addButton.click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    async fillForm (values: {
        refCode: string;
        bookingRefCode: string;
        bookingDateYmd: string;
        dogName: string;
        /** Numeric string, e.g. "8" or "8.5". */
        dogWeightKg: string;
        /** Visible option: EUR or USD. */
        currencyLabel: string;
        hours: string;
        /** Status label: Scheduled, Checked in, Active, Checked out. */
        statusLabel: string;
        notes?: string;
    }): Promise<void> {
        await test.step(`Fill dog daycare form: ${values.refCode}`, async () => {
            const modal = this.editDialog();
            await expect(modal).toBeVisible();
            await modal.getByTestId('daycare-field-ref').fill(values.refCode);
            await modal.getByTestId('daycare-field-booking-ref').fill(values.bookingRefCode);
            await this.fillBookingDateYmd(modal, values.bookingDateYmd);
            await modal.getByTestId('daycare-field-dog-name').fill(values.dogName);
            const weightInput = modal.getByTestId('daycare-field-weight').locator('input');
            await weightInput.click();
            await weightInput.clear();
            await weightInput.fill(values.dogWeightKg);
            const currencyField = modal.getByTestId('daycare-field-currency');
            await this.selectOptionIfNotActive(currencyField, values.currencyLabel, ['EUR', 'USD']);
            const hoursInput = modal.getByTestId('daycare-field-hours').locator('input');
            await hoursInput.click();
            await hoursInput.clear();
            await hoursInput.fill(values.hours);
            const statusField = modal.getByTestId('daycare-field-status');
            await this.selectOptionIfNotActive(statusField, values.statusLabel, [
                'Scheduled',
                'Checked in',
                'Active',
                'Checked out',
            ]);
            if (values.notes !== undefined) {
                await modal.getByTestId('daycare-field-notes').fill(values.notes);
            }
        });
    }

    async saveModal (): Promise<void> {
        await test.step('Save dog daycare modal', async () => {
            await this.editDialog().getByRole('button', { name: dogDaycareText.save }).click();
        });
    }

    async clickEdit (refCode: string): Promise<void> {
        await test.step(`Edit dog daycare ${refCode}`, async () => {
            await this.root.getByTestId(`daycare-edit-${refCode}`).click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    async clickDelete (refCode: string): Promise<void> {
        await test.step(`Delete dog daycare ${refCode}`, async () => {
            await this.root.getByTestId(`daycare-delete-${refCode}`).click();
        });
    }

    async confirmDeleteInDialog (): Promise<void> {
        await test.step('Confirm delete dog daycare', async () => {
            const confirm = this.page.locator('.ant-modal-confirm');
            await expect(confirm).toBeVisible();
            await confirm.getByRole('button', { name: 'Delete' }).click();
        });
    }

    async expectRowContains (substring: string): Promise<void> {
        await test.step(`Dog Daycare table row contains: ${substring}`, async () => {
            const table = this.root.getByTestId('daycare-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toBeVisible();
        });
    }

    async expectNoRowContains (substring: string): Promise<void> {
        await test.step(`Dog Daycare table has no row: ${substring}`, async () => {
            const table = this.root.getByTestId('daycare-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toHaveCount(0);
        });
    }
}
