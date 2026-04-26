/**
 * Reusable Ant Form interactions: text input, selects, date/time, switches, state checks.
 * Scoped to a root form locator passed into the constructor.
 */
import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { expectAntSelectDropdownsClosed } from '../utils/antdUiWaits';
import { reports as reportUi } from '../utils/text';

export class FormFields {
    readonly page: Page;
    readonly specificSelector: Locator;
    readonly fieldsLocator: Locator;

    constructor (page: Page, specificSelector: Locator) {
        this.page = page;
        this.specificSelector = specificSelector;
        this.fieldsLocator = this.specificSelector.locator('.ant-form-item');
    }

    async verifyFieldState (fieldLocator: Locator, name: string, filled: boolean) {
        await test.step(`Verify '${name}' field is ${filled ? 'filled in' : 'empty'}`, async () => {
            const targetLocator = fieldLocator.first();
            if (filled) {
                await expect(targetLocator).toHaveClass(/ant-form-item-has-success/);
            } else {
                await expect(targetLocator).not.toHaveClass(/ant-form-item-has-success/);
            }
        });
    }
    
    async checkFieldError ({ name, error }: { name: string; error: string }) {
        await test.step(`Verify '${error}' error is visible for the '${name}' field`, async () => {
            await expect(this.fieldsLocator
                .filter({ has: this.page.getByText(name, { exact :true }) })
                .locator('.ant-form-item-explain-error'))
                .toHaveText(error);
        });
    }

    async clearField ({ name }: { name: string }) {
        await test.step(`Clear the '${name}' field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            await fieldLocator.locator('input').clear();

            await this.verifyFieldState(fieldLocator, name, false);
        });
    }

    async fillField ({ name, value }: { name: string; value: string }) {
        await test.step(`Fill in the '${name}' field`, async () => {
            const fieldLocator = this.fieldsLocator
                .filter({ has: this.page.getByText(name, { exact :true }) });

            await fieldLocator.locator('input').fill(value, { force: true });
        });
    }


    async selectOptions ({
        name,
        options,
        testId,
    }: {
        name: string;
        options: string | string[];
        /** When set: `data-testid` on Ant `Select` **or** parent `Form.Item` (use field wrapper if Select node is absent in DOM). */
        testId?: string;
    }) {
        await test.step(`Select option(s) in the '${name}' field`, async () => {
            const optionsArray = Array.isArray(options) ? options : [options];

            let selectTrigger: Locator;

            if (testId?.trim()) {
                const anchor = this.page.getByTestId(testId.trim());
                await expect(anchor, `[data-testid="${testId}"]`).toBeVisible({
                    timeout: 20000,
                });
                const innerSelect = anchor.locator('.ant-select').first();
                selectTrigger = (await innerSelect.count()) > 0 ? innerSelect : anchor;
                await expect(selectTrigger).toBeVisible({ timeout: 5000 });
            } else {
                const fieldLocator = this.fieldsLocator.filter({ hasText: name }).first();
                await expect(fieldLocator, `Form field "${name}"`).toBeVisible({ timeout: 20000 });
                /** Open by clicking the Select shell — reliable for Ant Design 5 (no dependency on inner `input`). */
                selectTrigger = fieldLocator.locator('.ant-select').first();
                await expect(selectTrigger, `Ant Select for "${name}"`).toBeVisible({ timeout: 15000 });
            }

            await selectTrigger.scrollIntoViewIfNeeded();
            await selectTrigger.click({ force: true });

            const dropdown = this.page.locator('.ant-select-dropdown:visible').last();
            await dropdown.waitFor({ state: 'visible', timeout: 15000 });

            for (const option of optionsArray) {
                const optionLocator = dropdown
                    .locator('.ant-select-item-option-content')
                    .filter({ hasText: option })
                    .first();
                await optionLocator.waitFor({ state: 'visible', timeout: 15000 });
                await optionLocator.click();
            }

            if (optionsArray.length > 1) {
                await this.page.keyboard.press('Escape');
            } else if (!testId?.trim()) {
                await this.fieldsLocator
                    .filter({ hasText: name })
                    .first()
                    .locator('.ant-form-item-label')
                    .first()
                    .click()
                    .catch(() => {});
            } else {
                await this.page.keyboard.press('Escape').catch(() => {});
            }
            await expectAntSelectDropdownsClosed(this.page);

            await expect(selectTrigger).toContainText(optionsArray[0], { timeout: 8000 });
        });
    }

    async selectDaysOfWeek ({ name, option }: { name: string; option: string | string[] }) {
        await test.step(`Select days of the week in the '${name}' field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            await fieldLocator.click();

            const optionsArray = Array.isArray(option) ? option : [option];
            for (const option of optionsArray) {
                await this.page.locator('.rc-virtual-list .ant-select-item')
                    .filter({ hasText: option }).first().click(); 
            }
            
    
            await fieldLocator.click();

            await this.verifyFieldState(fieldLocator, name, true);
        });
    }

    async selectDate ({ name, date }: { name: string; date: string }) {
        await test.step(`Select date '${date}' in the '${name}' field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            await fieldLocator.locator('input').click();

            await fieldLocator.locator(`[title="${date}"]`).click();
            await this.verifyFieldState(fieldLocator, name, true);
        });
    }

    async fillDate ({ name, date }: { name: string; date: string }) {
        await test.step(`Fill in date '${date}' in the '${name}' field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            const input = fieldLocator.locator('input');
            await input.click();
            await input.fill(date);
            await input.press('Enter');

            await this.verifyFieldState(fieldLocator, name, true);
        });
    }

    async fillDateRange ({ name, startDate, endDate }: { name: string; startDate: string; endDate: string }) {
        await test.step(`Fill in the date range: ${startDate} - ${endDate}`, async () => {
            const dateField = this.fieldsLocator.filter({ hasText: name });
            const startDateInput = dateField.getByPlaceholder(reportUi.datePlaceholderStart);
            const endDateInput = dateField.getByPlaceholder(reportUi.datePlaceholderEnd);

            await startDateInput.click();
            await startDateInput.fill(startDate);
            await endDateInput.click();
            await endDateInput.fill(endDate);

            await this.page.keyboard.press('Enter');

            await expect(startDateInput).toHaveValue(startDate);
            await expect(endDateInput).toHaveValue(endDate);
        });
    }

    async fillTimeRange ({ name, startTime, endTime }: { name: string; startTime: string; endTime: string }) {
        await test.step(`Fill in the time range: ${startTime} - ${endTime}`, async () => {
            const dateField = this.fieldsLocator.filter({ hasText: name });
            const startDateInput = dateField.getByPlaceholder(reportUi.timePlaceholderStart);
            const endDateInput = dateField.getByPlaceholder(reportUi.timePlaceholderEnd);

            await startDateInput.click();
            await startDateInput.fill(startTime);
            await endDateInput.click();
            await endDateInput.fill(endTime);

            await this.page.keyboard.press('Enter');

            await expect(startDateInput).toHaveValue(startTime);
            await expect(endDateInput).toHaveValue(endTime);
        });
    }

    async checkOption ({ name, value }: { name: string; value: string }) {
        await test.step(`Check option '${value}' in the '${name}' field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            await fieldLocator.locator(`[value="${value}"]`).click();

            await this.verifyFieldState(fieldLocator, name, true);

        });
    }

    async fillAndSelectOption ({ name, option }: { name: string; option: string }) {
        await test.step(`Fill in and select '${option}' option in the '${name}' field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            const inputLocator = fieldLocator.locator('input');
            const isReadonly = await inputLocator.getAttribute('readonly');
            const isDisabled = await inputLocator.isDisabled();
            if (isReadonly !== null || isDisabled) {
                await this.selectOptions({ name, options: option });
                
                return;
            }

            await inputLocator.fill(option);

            await expect(fieldLocator.locator('.ant-select-open')).toBeVisible();
            const optionLocator = this.page.locator('.rc-virtual-list .ant-select-item')
                .filter({ hasText: option }).first();
            await optionLocator.scrollIntoViewIfNeeded();
            try {
                await optionLocator.click({ force: true });
            } catch {
                await optionLocator.evaluate((el: Element) => (el as HTMLElement).click());
            }
        });
    }

    async fillAndSelectOptionInContainer ({
        containerTitle,
        name,
        selectSearchInputId,
        option
    }: { containerTitle: string; name?: string; selectSearchInputId?: string; option: string }) {
        await test.step(`Fill and select '${option}' in '${name || selectSearchInputId}' inside '${containerTitle}'`, async () => {
            const container = this.page.locator('.ant-drawer-wrapper-body')
                .filter({ hasText: containerTitle });

            let input: Locator;
            if (selectSearchInputId) {
                input = container
                    .locator(`input#${selectSearchInputId}.ant-select-selection-search-input`)
                    .first();
            } else if (name) {
                const field = container.locator('.ant-form-item')
                    .filter({ has: this.page.getByText(name, { exact: true }) });
                input = field.locator('input.ant-select-selection-search-input').first();
            } else {
                throw new Error('fillAndSelectOptionInContainer: provide selectSearchInputId or name');
            }

            await input.click({ force: true });
            await input.fill(option);

            const dropdown = this.page.locator('.ant-select-dropdown')
                .filter({ hasNot: this.page.locator('.ant-select-dropdown-hidden') })
                .last();

            await expect(dropdown).toBeVisible();

            const optionLocator = dropdown.locator('.ant-select-item-option-content', { hasText: option }).first();
            await optionLocator.click();
        });
    }

    async clickAddInField ({ name, buttonName }: { name: string; buttonName: string })  {
        await test.step(`Click the [${buttonName}] button in the ${name} select field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            await fieldLocator.click();
            await expect(fieldLocator.locator('.ant-select-open')).toBeVisible();

            await fieldLocator.getByRole('button', { name: buttonName }).click();
        });
    }

    async checkValueInSelectField ({ name, value }: { name: string; value: string }) {
        await test.step(`Verify that the '${name}' select field contains value '${value}'`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            
            await expect(fieldLocator.locator('.ant-select-selection-item')).toHaveText(value);
        });
    }

    /** Optional map: switch label (visible text) → HTML `id` on the control (not tenant-specific; set per build if needed). */
    static readonly ROUTE_SWITCH_DOM_IDS: Record<string, string> = {};

    async clickSwitch ({ name }: { name: string }) {
        await test.step(`Click on the '${name}' switch button`, async () => {
            const domId = FormFields.ROUTE_SWITCH_DOM_IDS[name];
            const switchEl = domId
                ? this.specificSelector.locator(`#${domId}`)
                : this.fieldsLocator.filter({ hasText: name }).getByRole('switch').first();
            await switchEl.click({ timeout: 15000 });
        });
    }

    async checkSwitchStatus ({ name, value }: { name: string; value: boolean }, options: { timeout?: number } = {}) {
        const { timeout = 10000 } = options;
        await test.step(`Verify '${name}' switch is set to: ${value}`, async () => {
            const domId = FormFields.ROUTE_SWITCH_DOM_IDS[name];
            const switchEl = domId
                ? this.specificSelector.locator(`#${domId}`)
                : this.fieldsLocator.filter({ hasText: name }).getByRole('switch').first();
            await expect(switchEl).toHaveAttribute('aria-checked', String(value), { timeout });
        });
    }

    async checkSwitchDisabledState ({ name, disabled }: { name: string; disabled: boolean }) {
        await test.step(`Verify '${name}' switch is ${disabled ? 'disabled' : 'enabled'}`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ has: this.page.getByText(name, { exact: true }) });
            const switchEl = fieldLocator.getByRole('switch');
            if (disabled) {
                await expect(switchEl).toHaveClass(/ant-switch-disabled/);
            } else {
                await expect(switchEl).not.toHaveClass(/ant-switch-disabled/);
            }
        });
    }

    async checkSelectFieldState ({ name, filled }: { name: string; filled: boolean }) {
        await test.step(`Verify that the '${name}' select field is ${filled ? 'filled in' : 'empty'}`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            const selectField = filled 
                ? fieldLocator.locator('.ant-select-selection-item') 
                : fieldLocator.locator('.ant-select-selection-placeholder');
            
            await expect(selectField).toBeVisible();
        });
    }

    async isSelectFilled ({ name }: { name: string }) {
        const fieldLocator = this.fieldsLocator.filter({ hasText: name });
        
        return (await fieldLocator.locator('.ant-select-selection-item').count()) > 0;
    }
    
    async checkFieldValue ({ name, value }: { name: string; value: string }) {
        await test.step(`Check that ${name} field has value: ${value}`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            await expect(fieldLocator.locator('input')).toHaveValue(value);
        });
    }

    async checkFieldAddOn ({ name, value }: { name: string; value: string }) {
        await test.step(`Check the ${value} add-on for the ${name} field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            await expect(fieldLocator.locator('.ant-input-number-group-addon')).toHaveText(value);
        });
    } 

    async clickFieldAddOn ({ name }: { name: string }) {
        await test.step(`Click on the ${name} field add-on`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            await fieldLocator.locator('.ant-input-number-group-addon').click();
        });
    } 

    async checkExtraText ({ name, text }: { name: string; text: string }) {
        await test.step(`Check that the ${name} field extra text is visible: ${text}`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });

            await expect(fieldLocator.locator('.ant-form-item-extra')).toHaveText(text);
        });
    }

    async checkFieldsAreVisible (fields: string[]) {
        await test.step(`Verify fields are visible: ${fields}`, async () => {
            for (const field of fields) {
                const titleLocator = this.fieldsLocator.locator(`[title='${field}']`);
                if (await titleLocator.count()) {
                    await expect(titleLocator).toBeVisible();
                } else {
                    await expect(
                        this.fieldsLocator.locator('.ant-form-item').filter({ hasText: field })
                    ).toBeVisible();
                }
            }
        });
    }

    async fillCommentField ({ name, text }: { name: string; text: string }) {
        await test.step(`Fill in the ${name} field`, async () => {
            const fieldLocator = this.fieldsLocator
                .filter({ has: this.page.getByText(name, { exact :true }) });

            await fieldLocator.locator('[id="comment"]').fill(text, { force: true });
        });
    }

    async selectDropdownOption ({ name, option }: { name: string; option: string }) {
        await test.step(`Select '${option}' from dropdown in '${name}' field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ has: this.page.getByText(name, { exact: true }) });
            const input = fieldLocator.locator('input');
            
            // Scroll the field into view
            await fieldLocator.scrollIntoViewIfNeeded();
            
            // Click on the input to open the dropdown
            await input.click();
            
            // Fill the input with the option text to filter dropdown
            await input.fill(option);
            
            // Wait for the option to appear in the dropdown with text
            const optionText = this.page.getByText(option, { exact: true });
            await expect(optionText).toBeVisible({ timeout: 5000 });
            
            // Click the option
            await optionText.click();

            await expectAntSelectDropdownsClosed(this.page);

            // Verify the field is filled
            await this.verifyFieldState(fieldLocator, name, true);
        });
    }

    async selectRouteOption ({ name, option }: { name: string; option: string }) {
        await test.step(`Select route '${option}' in '${name}' field`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ has: this.page.getByText(name, { exact: true }) });
            const input = fieldLocator.locator('input');
            
            // Scroll the field into view
            await fieldLocator.scrollIntoViewIfNeeded();
            
            // Click on the input to open the dropdown
            await input.click();
            
            // Fill the input with the route name to filter dropdown
            await input.fill(option);
            
            // Wait for the option to appear in the dropdown
            const optionText = this.page.getByText(option, { exact: true });
            await expect(optionText).toBeVisible({ timeout: 5000 });
            
            // Click the option
            await optionText.click();

            await expectAntSelectDropdownsClosed(this.page);

            // Verify the field is filled
            await this.verifyFieldState(fieldLocator, name, true);
        });
    }


    async verifyFieldStateV2 (fieldLocator: Locator, name: string, filled: boolean) {
        await test.step(`Verify '${name}' field is ${filled ? 'filled in' : 'empty'} (V2)`, async () => {
            if (filled) {
                await expect(fieldLocator).toHaveClass(/ant-form-item-has-success/);
            } else {
                await expect(fieldLocator).not.toHaveClass(/ant-form-item-has-success/);
            }
        });
    }

    async selectOptionsV2 ({ name, options }: { name: string; options: string | string[] }) {
        await test.step(`Select option(s) in the '${name}' field (V2)`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ has: this.page.getByText(name, { exact: true }) });
            const optionsArray = Array.isArray(options) ? options : [options];
            await fieldLocator.locator('input').click({ force: true });

            for (const option of optionsArray) {
                await fieldLocator
                    .locator('.ant-select-item-option-content')
                    .filter({ has: this.page.getByText(option, { exact: true }) })
                    .click();
            }

            if (optionsArray.length > 1) {
                await fieldLocator.click();
            }

            await this.verifyFieldState(fieldLocator, name, true);
        });
    }

    async fillAndSelectOptionV2 ({ name, option }: { name: string; option: string }) {
        await test.step(`Fill in and select '${option}' option in the '${name}' field (V2)`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            const input = fieldLocator.locator('input');
            await input.fill(option);

            await expect(fieldLocator.locator('.ant-select-open')).toBeVisible();
            const optionLocator = this.page.locator('.rc-virtual-list .ant-select-item')
                .filter({ hasText: option }).first();
            await expect(optionLocator).toBeVisible();
            await optionLocator.click();
        });
    }

    async checkFieldsAreVisibleV2 (fields: string[]) {
        await test.step(`Verify fields are visible (V2): ${fields}`, async () => {
            for (const field of fields) {
                await expect(this.fieldsLocator.locator(`[title='${field}']`)).toBeVisible();
            }
        });
    }

    async checkOptionV2 ({ name, value }: { name: string; value: string }) {
        await test.step(`Check option '${value}' in the '${name}' field (V2)`, async () => {
            const fieldLocator = this.fieldsLocator.filter({ hasText: name });
            await fieldLocator.locator(`[value="${value}"]`).click();
            await this.verifyFieldState(fieldLocator, name, true);
        });
    }

}
