/**
 * PetShipping CRUD (PET): table + modal; From/To are network points (`Name (code)`).
 */
import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { petShipping as petShippingText } from '../utils/text';

export class PetShipping {
    readonly page: Page;
    readonly root: Locator;
    readonly heading: Locator;
    readonly calendar: Locator;
    readonly addButton: Locator;
    readonly table: Locator;

    constructor (page: Page) {
        this.page = page;
        this.root = page.getByTestId('movement-schedule-page');
        this.heading = page.getByRole('heading', { name: petShippingText.title });
        this.calendar = this.root.getByTestId('schedule-calendar');
        this.addButton = this.root.getByTestId('schedule-add');
        this.table = this.root.getByTestId('schedule-table');
    }

    private editDialog (): Locator {
        return this.page.getByRole('dialog').filter({ has: this.page.getByTestId('schedule-form') });
    }

    async expectLoaded (): Promise<void> {
        await test.step('PetShipping page visible', async () => {
            await expect(this.root).toBeVisible();
            await expect(this.heading).toBeVisible();
            await expect(this.calendar).toBeVisible();
        });
    }

    async clickAdd (): Promise<void> {
        await test.step('Click add pet ship', async () => {
            await this.addButton.click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    private visibleSelectDropdown (): Locator {
        return this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    }

    /**
     * From/To use `showSearch` + rc-virtual-list: filter by label then Enter (same idea as Points city),
     * so we never click an option that sits outside the window viewport inside the virtual scroller.
     */
    private async selectOpenedSelectOption (fieldTestId: string, optionText: string): Promise<void> {
        const modal = this.editDialog();
        const field = modal.getByTestId(fieldTestId);
        await field.locator('.ant-select-selector').click({ force: true });
        const search = field.locator('input[type="search"]').or(field.locator('.ant-select-selection-search-input'));
        await expect(search).toBeVisible({ timeout: 5000 });
        await search.fill(optionText);
        // Leave/enter animation can leave two visible portals with the same filtered options; `.last()` is the active layer.
        const dropdown = this.visibleSelectDropdown()
            .filter({
                has: this.page.getByText(optionText, { exact: true }),
            })
            .last();
        await expect(dropdown).toBeVisible({ timeout: 15000 });
        await dropdown.getByRole('option', { name: optionText, exact: true }).waitFor({ state: 'attached', timeout: 15000 });
        await search.press('Enter');
        // Scope to this option’s portal — the page may keep other `.ant-select-dropdown` nodes around; global count must not be 0.
        await expect.poll(async () => await dropdown.count(), { timeout: 15000 }).toBe(0);
    }

    async fillForm (values: {
        refCode: string;
        fromLabel: string;
        toLabel: string;
        departure: string;
        arrival: string;
        /** Visible option label: `Name (code)` from PetMovers directory (tariff currency from PetMover). */
        petMover: string;
        statusLabel: string;
    }): Promise<void> {
        await test.step(`Fill pet ship form: ${values.refCode}`, async () => {
            await expect(this.editDialog()).toBeVisible();
            await this.editDialog().getByTestId('schedule-field-ref').fill(values.refCode);

            await this.selectOpenedSelectOption('schedule-field-from', values.fromLabel);
            await this.selectOpenedSelectOption('schedule-field-to', values.toLabel);

            // Do not press Escape here — Ant Design Modal closes on Escape and the form would disappear.

            const dialog = this.editDialog();
            const fillDateTimeInput = async (fieldLabel: 'Departure' | 'Arrival', value: string): Promise<void> => {
                const input = dialog.getByRole('textbox', { name: new RegExp(`\\*\\s*${fieldLabel}`, 'i') }).first();
                await expect(input).toBeVisible({ timeout: 15000 });
                await input.click({ force: true });
                await input.clear();
                await input.fill(value, { force: true });
                await input.press('Enter');
                await expect(input).toHaveValue(value, { timeout: 15000 });
            };
            await fillDateTimeInput('Departure', values.departure);
            await fillDateTimeInput('Arrival', values.arrival);
            await this.selectOpenedSelectOption('schedule-field-petmover', values.petMover);

            const normalize = (s: string): string => s.trim().toLowerCase();
            const statusOrder = [
                petShippingText.statusPlanned,
                petShippingText.statusActive,
                petShippingText.statusDone,
            ];
            const statusField = dialog.getByTestId('schedule-field-status');
            const selectedStatusText =
                (await statusField.locator('.ant-select-selection-item').first().textContent()) ?? '';
            if (normalize(selectedStatusText) !== normalize(values.statusLabel)) {
                const targetIdx = statusOrder.findIndex((x) => normalize(x) === normalize(values.statusLabel));
                if (targetIdx === -1) {
                    throw new Error(`Unknown status label: ${values.statusLabel}`);
                }
                const currentIdx = statusOrder.findIndex((x) => normalize(x) === normalize(selectedStatusText));
                await statusField.locator('.ant-select-selector').click({ force: true });
                await expect(this.visibleSelectDropdown()).toBeVisible({ timeout: 15000 });
                if (currentIdx !== -1) {
                    const diff = targetIdx - currentIdx;
                    const key = diff > 0 ? 'ArrowDown' : 'ArrowUp';
                    for (let i = 0; i < Math.abs(diff); i++) {
                        await this.page.keyboard.press(key);
                    }
                } else {
                    for (let i = 0; i < targetIdx; i++) {
                        await this.page.keyboard.press('ArrowDown');
                    }
                }
                await this.page.keyboard.press('Enter');
                await expect(this.visibleSelectDropdown()).toHaveCount(0, { timeout: 15000 });
            }
        });
    }

    async saveModal (): Promise<void> {
        await test.step('Save pet ship modal', async () => {
            await this.editDialog().getByRole('button', { name: petShippingText.save }).click();
        });
    }

    /**
     * Precondition for Booking: caller opened PetShipping (sidebar); From/To points already exist.
     * Creates one pet ship via Add → Save and expects the success toast.
     */
    async createPetShip (values: {
        refCode: string;
        fromLabel: string;
        toLabel: string;
        departure: string;
        arrival: string;
        /** Visible option label: `Name (code)` from PetMovers directory */
        petMover: string;
        statusLabel: string;
    }): Promise<void> {
        await test.step(`Precondition: create pet ship ${values.refCode}`, async () => {
            await this.expectLoaded();
            await this.clickAdd();
            await this.fillForm(values);
            await this.saveModal();
            await expect(this.page.getByText(petShippingText.toastCreated)).toBeVisible();
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
            await expect(this.table.locator('tr').filter({ hasText: substring })).toBeVisible();
        });
    }

    async expectNoRowContains (substring: string): Promise<void> {
        await test.step(`PetShipping table has no row: ${substring}`, async () => {
            await expect(this.table.locator('tr').filter({ hasText: substring })).toHaveCount(0);
        });
    }
}
