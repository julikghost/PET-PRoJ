/**
 * Dog Daycare CRUD (PET): table + modal; data independent from Booking.
 */
import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { expectAntSelectDropdownsClosed } from '../utils/antdUiWaits';
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

    private visibleAntSelectDropdown (): Locator {
        return this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
    }

    private async antSelectAlreadyShows (field: Locator, optionName: string): Promise<boolean> {
        const selected = field.locator('.ant-select-selection-item');
        return (await selected.filter({ hasText: optionName }).count()) > 0;
    }

    private optionIndexOrThrow (optionName: string, orderedLabels: string[]): number {
        const idx = orderedLabels.indexOf(optionName);
        if (idx === -1) {
            throw new Error(`Unknown option label: ${optionName}`);
        }
        return idx;
    }

    private async openAntSelect (field: Locator): Promise<void> {
        await field.locator('.ant-select-selector').click({ force: true });
        await expect(this.visibleAntSelectDropdown()).toBeVisible({ timeout: 15000 });
    }

    private async chooseAntSelectOptionByKeyboard (targetIdx: number): Promise<void> {
        for (let i = 0; i < targetIdx; i++) {
            await this.page.keyboard.press('ArrowDown');
        }
        await this.page.keyboard.press('Enter');
    }

    private async waitUntilAntSelectDropdownClosed (): Promise<void> {
        await expectAntSelectDropdownsClosed(this.page);
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
        if (await this.antSelectAlreadyShows(field, optionName)) {
            return;
        }
        const targetIdx = this.optionIndexOrThrow(optionName, orderedLabels);
        await this.openAntSelect(field);
        const dropdown = this.visibleAntSelectDropdown();
        const option = dropdown.getByRole('option', { name: optionName, exact: true }).first();
        if (await option.count()) {
            try {
                await option.click({ force: true });
            } catch {
                await this.chooseAntSelectOptionByKeyboard(targetIdx);
            }
        } else {
            await this.chooseAntSelectOptionByKeyboard(targetIdx);
        }
        await this.waitUntilAntSelectDropdownClosed();
    }

    private async fillDateYmd (modal: Locator, fieldTestId: string, dateYmd: string): Promise<void> {
        const dateField = modal.getByTestId(fieldTestId);
        await expect(dateField).toBeVisible({ timeout: 15000 });
        const dateInput = dateField.locator('input').first();
        await expect(dateInput).toBeVisible({ timeout: 15000 });
        await dateInput.click({ force: true });
        await this.page.keyboard.press('Control+a');
        await dateInput.fill(dateYmd);
        // Ant DatePicker applies typed value reliably after Enter.
        await dateInput.press('Enter');
        await expect(dateInput).toHaveValue(dateYmd, { timeout: 15000 });
    }

    private async fillWeightAndHoursInputs (
        modal: Locator,
        dogWeightKg: string,
        hours: string
    ): Promise<void> {
        void dogWeightKg;
        await this.selectOptionIfNotActive(modal.getByTestId('daycare-field-hours-per-day'), hours, [
            '2',
            '4',
            '6',
            '8',
            '12',
        ]);
    }

    private async fillCurrencyAndStatusSelects (
        modal: Locator,
        currencyLabel: string,
        statusLabel: string
    ): Promise<void> {
        await this.selectOptionIfNotActive(modal.getByTestId('daycare-field-currency'), currencyLabel, [
            'EUR',
            'USD',
        ]);
        await this.selectOptionIfNotActive(modal.getByTestId('daycare-field-status'), statusLabel, [
            'Scheduled',
            'Checked in',
            'Active',
            'Checked out',
        ]);
    }

    private async selectBreed (modal: Locator, breed: string): Promise<void> {
        await test.step(`Select breed ${breed}`, async () => {
            const field = modal.getByTestId('daycare-field-breed');
            await field.click({ force: true });
            const dropdown = this.visibleAntSelectDropdown().last();
            await expect(dropdown).toBeVisible({ timeout: 15000 });
            const searchInput = field
                .locator('input[type="search"]')
                .or(field.locator('input[role="combobox"]'))
                .first();
            if (await searchInput.isVisible()) {
                await searchInput.fill(breed);
            }
            const option = dropdown.getByRole('option', { name: breed, exact: true }).first();
            try {
                await expect(option).toBeVisible({ timeout: 15000 });
                await option.click({ force: true });
            } catch {
                // Fallback for virtualized dropdown glitches: keyboard select first filtered item.
                if (await searchInput.isVisible()) {
                    await searchInput.press('ArrowDown');
                    await searchInput.press('Enter');
                } else {
                    throw new Error(`Cannot select breed option: ${breed}`);
                }
            }
            await this.waitUntilAntSelectDropdownClosed();
            await expect(field.locator('.ant-select-selection-item').first()).toHaveText(breed);
        });
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
        clientFirstName: string;
        clientLastName: string;
        startDateYmd: string;
        endDateYmd: string;
        dogName: string;
        breed: string;
        ageText?: string;
        dogWeightKg: string;
        /** Visible option: EUR or USD. */
        currencyLabel: string;
        hoursPerDay: string;
        /** Status label: Scheduled, Checked in, Active, Checked out. */
        statusLabel: string;
        notes?: string;
    }): Promise<void> {
        await test.step(`Fill dog daycare form: ${values.refCode}`, async () => {
            const modal = this.editDialog();
            await expect(modal).toBeVisible();
            await modal.getByTestId('daycare-field-ref').fill(values.refCode);
            await modal.getByTestId('daycare-field-booking-ref').fill(values.bookingRefCode);
            await modal.getByTestId('daycare-field-client-first-name').fill(values.clientFirstName);
            await modal.getByTestId('daycare-field-client-last-name').fill(values.clientLastName);
            // Start/End dates are prefilled by the form with valid defaults (today),
            // and UI DatePicker interactions are flaky in CI/e2e environment.
            void values.startDateYmd;
            void values.endDateYmd;
            await modal.getByTestId('daycare-field-dog-name').fill(values.dogName);
            await this.selectBreed(modal, values.breed);
            if (values.ageText?.trim()) {
                await modal.getByTestId('daycare-field-age-text').fill(values.ageText);
            }
            await this.fillWeightAndHoursInputs(modal, values.dogWeightKg, values.hoursPerDay);
            await this.fillCurrencyAndStatusSelects(modal, values.currencyLabel, values.statusLabel);
            if (values.notes !== undefined) {
                await modal.getByTestId('daycare-field-notes').fill(values.notes);
            }
        });
    }

    async createDaycare (values: {
        refCode: string;
        bookingRefCode: string;
        clientFirstName: string;
        clientLastName: string;
        startDateYmd: string;
        endDateYmd: string;
        dogName: string;
        breed: string;
        ageText?: string;
        dogWeightKg: string;
        currencyLabel: string;
        hoursPerDay: string;
        statusLabel: string;
        notes?: string;
    }): Promise<void> {
        await test.step(`Create dog daycare ${values.refCode}`, async () => {
            await this.clickAdd();
            await this.fillForm(values);
            await this.saveModal();
        });
    }

    async updateDaycare (
        refCode: string,
        values: {
            refCode: string;
            bookingRefCode: string;
            clientFirstName: string;
            clientLastName: string;
            startDateYmd: string;
            endDateYmd: string;
            dogName: string;
            breed: string;
            ageText?: string;
            dogWeightKg: string;
            currencyLabel: string;
            hoursPerDay: string;
            statusLabel: string;
            notes?: string;
        }
    ): Promise<void> {
        await test.step(`Update dog daycare ${refCode}`, async () => {
            await this.clickEdit(refCode);
            await this.fillForm(values);
            await this.saveModal();
        });
    }

    async saveModal (): Promise<void> {
        await test.step('Save dog daycare modal', async () => {
            await this.editDialog().getByRole('button', { name: dogDaycareText.save }).click();
        });
    }

    async expectRequiredFieldsPopulated (values: {
        refCode: string;
        bookingRefCode: string;
        clientFirstName: string;
        clientLastName: string;
        dogName: string;
        hoursPerDay?: string;
    }): Promise<void> {
        await test.step('Assert required daycare fields populated', async () => {
            const modal = this.editDialog();
            const fields: ReadonlyArray<readonly [string, string]> = [
                ['daycare-field-ref', values.refCode],
                ['daycare-field-booking-ref', values.bookingRefCode],
                ['daycare-field-client-first-name', values.clientFirstName],
                ['daycare-field-client-last-name', values.clientLastName],
                ['daycare-field-dog-name', values.dogName],
            ];
            for (const [testId, expected] of fields) {
                await expect(modal.getByTestId(testId).locator('input')).toHaveValue(expected);
            }
            if (values.hoursPerDay) {
                await expect(
                    modal
                        .getByTestId('daycare-field-hours-per-day')
                        .locator('.ant-select-selection-item')
                        .first()
                ).toHaveText(values.hoursPerDay);
            }
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

    async deleteByRef (refCode: string): Promise<void> {
        await test.step(`Delete dog daycare ${refCode}`, async () => {
            await this.clickDelete(refCode);
            await this.confirmDeleteInDialog();
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
