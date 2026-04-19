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

    /** Ant adds `ant-select-dropdown-hidden` on the portal root when closed; `hasNot` does not apply to the same element, so use :not(). */
    private visibleSelectDropdown (): Locator {
        return this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    }

    /** Prefer over a bare visible dropdown: city and kind portals can overlap during leave/enter animation (strict mode / wrong target). */
    private selectDropdownWithOption (optionName: string): Locator {
        return this.visibleSelectDropdown()
            .filter({
                has: this.page.getByRole('option', { name: optionName, exact: true }),
            })
            .last();
    }

    /** Wait until the open city dropdown portal is gone — avoids Kind click hitting an animating overlay / `ant-modal-wrap` interception. */
    private async waitUntilOpenDropdownForOptionGone (optionName: string): Promise<void> {
        await expect.poll(async () => await this.selectDropdownWithOption(optionName).count(), {
            timeout: 15000,
        }).toBe(0);
    }

    /**
     * Points modal → City (search + Enter). English name as in `pointCities` / UI.
     */
    async selectCity (city: string): Promise<void> {
        await test.step(`Points: select city ${city}`, async () => {
            await this.selectCityInModal(this.editDialog(), city);
        });
    }

    /**
     * Points modal → Kind by visible label (`pointsText.kindHub` / `kindStop` / `kindAirport`).
     */
    async selectKindByLabel (kindLabel: string): Promise<void> {
        await test.step(`Points: select kind ${kindLabel}`, async () => {
            await this.selectKindInModal(kindLabel);
        });
    }

    /** Points modal → Kind = Hub. */
    async selectKindHub (): Promise<void> {
        await this.selectKindByLabel(pointsText.kindHub);
    }

    private async selectCityInModal (modal: Locator, city: string): Promise<void> {
        const cityField = modal.getByTestId('points-field-city');
        const selector = cityField.locator('.ant-select-selector');
        await selector.waitFor({ state: 'visible', timeout: 15000 });
        await selector.click({ force: true, timeout: 60000 });
        const citySearch = cityField.locator('input[type="search"]').or(cityField.locator('.ant-select-selection-search-input'));
        await expect(citySearch).toBeVisible({ timeout: 5000 });
        await citySearch.fill(city);
        const cityDd = this.selectDropdownWithOption(city);
        await expect(cityDd).toBeVisible({ timeout: 15000 });
        await cityDd.getByRole('option', { name: city, exact: true }).waitFor({ state: 'attached', timeout: 15000 });
        await citySearch.press('Enter');
        await this.waitUntilOpenDropdownForOptionGone(city);
        // Do not press Escape here — with the overlay closed, Escape can close the whole Modal (no save, no toast).
    }

    /**
     * Kind Select order matches `pet-app` PointsPage `KIND_OPTIONS` (Hub → Stop → Airport).
     * Keyboard avoids `evaluate(click)` leaving the dropdown open (rc-select closes on real Enter).
     */
    private async selectKindInModal (kindLabel: string): Promise<void> {
        const order = [pointsText.kindHub, pointsText.kindStop, pointsText.kindAirport];
        const idx = order.indexOf(kindLabel);
        if (idx === -1) {
            throw new Error(`Unknown kind label: ${kindLabel}`);
        }
        const dialog = this.editDialog();
        const kindField = dialog.getByTestId('points-field-kind');
        await expect(kindField).toBeVisible({ timeout: 15000 });
        await kindField.locator('.ant-select-selector').click({ force: true });
        const kindDd = this.selectDropdownWithOption(pointsText.kindHub);
        await expect(kindDd).toBeVisible({ timeout: 15000 });
        for (let i = 0; i < idx; i++) {
            await this.page.keyboard.press('ArrowDown');
        }
        await this.page.keyboard.press('Enter');
        // Enter already commits and closes the Kind dropdown; extra Escape can hit the Modal and close it.
    }

    private async fillCodeNameAndCityInModal (
        modal: Locator,
        values: { code: string; name: string; city: string }
    ): Promise<void> {
        await modal.getByTestId('points-field-code').fill(values.code);
        await modal.getByTestId('points-field-name').fill(values.name);
        await this.selectCityInModal(modal, values.city);
    }

    /**
     * Add/Edit modal: Code, Name, City only. Pair with {@link selectKindHub} / {@link selectKindByLabel} for Kind.
     */
    async fillCodeNameAndCity (values: { code: string; name: string; city: string }): Promise<void> {
        await test.step(`Fill point code/name/city: ${values.code}`, async () => {
            const modal = this.editDialog();
            await expect(modal).toBeVisible();
            await this.fillCodeNameAndCityInModal(modal, values);
        });
    }

    async expectLoaded (): Promise<void> {
        await test.step('Points page visible', async () => {
            await expect(this.root).toBeVisible();
            await expect(this.page.getByRole('heading', { name: pointsText.title })).toBeVisible();
        });
    }

    /**
     * Precondition for PetShipping routes: caller opened Points (sidebar) and the page is usable.
     * Creates two distinct points (different codes) for From / To selects.
     */
    async createTwoDistinctPointsForRoutes (options: {
        suffix: string;
        from: { name: string; city: string; kindLabel: string };
        to: { name: string; city: string; kindLabel: string };
    }): Promise<{
        codeFrom: string;
        codeTo: string;
        fromLabel: string;
        toLabel: string;
    }> {
        return await test.step('Precondition: two distinct points for From/To', async () => {
            const codeFrom = `E2E-F-${options.suffix}`;
            const codeTo = `E2E-T-${options.suffix}`;
            await this.expectLoaded();

            await this.clickAdd();
            await this.fillForm({
                code: codeFrom,
                name: options.from.name,
                city: options.from.city,
                kindLabel: options.from.kindLabel,
            });
            await this.saveModal();
            await expect(this.page.getByText(pointsText.toastCreated).last()).toBeVisible();

            await this.clickAdd();
            await this.fillForm({
                code: codeTo,
                name: options.to.name,
                city: options.to.city,
                kindLabel: options.to.kindLabel,
            });
            await this.saveModal();
            await expect(this.page.getByText(pointsText.toastCreated).last()).toBeVisible();

            return {
                codeFrom,
                codeTo,
                fromLabel: `${options.from.name} (${codeFrom})`,
                toLabel: `${options.to.name} (${codeTo})`,
            };
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
            await this.fillCodeNameAndCityInModal(modal, {
                code: values.code,
                name: values.name,
                city: values.city,
            });
            await this.selectKindInModal(values.kindLabel);
        });
    }

    async saveModal (): Promise<void> {
        await test.step('Save point modal', async () => {
            await this.editDialog().getByRole('button', { name: pointsText.save }).click({ force: true });
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
