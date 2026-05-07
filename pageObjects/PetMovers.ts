/**
 * PetMovers admin screen: table CRUD via modal and delete confirmation.
 */
import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { petMovers as petMoversText } from '../utils/text';

export class PetMovers {
    readonly page: Page;
    readonly root: Locator;

    constructor (page: Page) {
        this.page = page;
        this.root = page.getByTestId('pet-movers-page');
    }

    /** Add/Edit modal (Ant Design renders in a portal — use dialog + form, not Modal’s data-testid). */
    private editDialog (): Locator {
        return this.page.getByRole('dialog').filter({ has: this.page.getByTestId('pet-mover-form') });
    }

    async expectLoaded (): Promise<void> {
        await test.step('PetMovers page visible', async () => {
            await expect(this.root).toBeVisible();
            await expect(this.page.getByRole('heading', { name: petMoversText.title })).toBeVisible();
        });
    }

    async clickAdd (): Promise<void> {
        await test.step('Click Add PetMover', async () => {
            await this.root.getByTestId('pet-movers-add').click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    /**
     * Precondition for Reports: PetAdmin page; creates one active PetMover and returns its storage id + Select label `Name (code)`.
     */
    async createActivePetMover (values: {
        name: string;
        code: string;
    }): Promise<{ id: string; label: string }> {
        return await test.step(`Precondition: PetMover ${values.code}`, async () => {
            await this.expectLoaded();
            await this.clickAdd();
            await this.fillForm({ ...values, active: true });
            await this.saveModal();
            await expect(this.page.getByText(petMoversText.toastCreated).first()).toBeVisible();
            const id = await this.page.evaluate(
                async ({ code }: { code: string }) => {
                    const res = await fetch('/api/pet-movers');
                    if (!res.ok) {
                        return '';
                    }
                    const rows = await res.json() as { id: string; code: string }[];
                    const row = rows.find((r) => r.code === code);

                    return row?.id ?? '';
                },
                { code: values.code }
            );
            if (!id) {
                throw new Error(`PetMover id not found in API for code "${values.code}"`);
            }

            return { id, label: `${values.name} (${values.code})` };
        });
    }

    async fillForm (values: {
        name: string;
        code: string;
        active?: boolean;
        /** Defaults to EUR in UI; set to switch tariff currency. */
        currency?: 'EUR' | 'USD';
    }): Promise<void> {
        await test.step(`Fill PetMover form: ${values.code}`, async () => {
            const modal = this.editDialog();
            await expect(modal).toBeVisible();

            await modal.getByTestId('pet-mover-field-name').fill(values.name);
            await modal.getByTestId('pet-mover-field-code').fill(values.code);

            if (values.currency !== undefined) {
                await modal.getByTestId('pet-mover-field-currency').click();
                const curDd = this.page.locator('.ant-select-dropdown:visible').last();
                await curDd.locator('.ant-select-item-option-content').filter({ hasText: values.currency }).first().click();
            }

            const sw = modal.getByTestId('pet-mover-field-active');
            const checked = (await sw.getAttribute('aria-checked')) === 'true';
            if (values.active === false && checked) {
                await sw.click();
            }
            if (values.active === true && !checked) {
                await sw.click();
            }
        });
    }

    async saveModal (): Promise<void> {
        await test.step('Save PetMover modal', async () => {
            await this.editDialog().getByRole('button', { name: petMoversText.save }).click();
        });
    }

    async clickEdit (code: string): Promise<void> {
        await test.step(`Edit PetMover ${code}`, async () => {
            await this.root.getByTestId(`pet-mover-edit-${code}`).click();
            await this.editDialog().waitFor({ state: 'visible', timeout: 15000 });
        });
    }

    async clickDelete (code: string): Promise<void> {
        await test.step(`Delete PetMover ${code}`, async () => {
            await this.root.getByTestId(`pet-mover-delete-${code}`).click();
        });
    }

    async deletePetMoverAndConfirm (code: string): Promise<void> {
        await test.step(`Delete PetMover ${code} and confirm`, async () => {
            await this.clickDelete(code);
            await this.confirmDeleteInDialog();
            await expect(this.page.getByText(petMoversText.toastDeleted).first()).toBeVisible();
        });
    }

    async confirmDeleteInDialog (): Promise<void> {
        await test.step('Confirm delete in Ant Design modal', async () => {
            const confirm = this.page.locator('.ant-modal-confirm');
            await expect(confirm).toBeVisible();
            await confirm.getByRole('button', { name: 'Delete' }).click();
        });
    }

    async expectRowContains (substring: string): Promise<void> {
        await test.step(`Table row contains: ${substring}`, async () => {
            const table = this.root.getByTestId('pet-movers-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toBeVisible();
        });
    }

    async expectNoRowContains (substring: string): Promise<void> {
        await test.step(`Table has no row with: ${substring}`, async () => {
            const table = this.root.getByTestId('pet-movers-table');
            await expect(table.locator('tr').filter({ hasText: substring })).toHaveCount(0);
        });
    }
}
