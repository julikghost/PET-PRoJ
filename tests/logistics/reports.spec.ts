import * as fs from 'fs';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { config } from '../../config-logistics';
import { MENU_ITEM, REPORTS_DATA_TESTID } from '../../utils/constants';
import { LogisticsApp } from '../../pageObjects/LogisticsApp';
import type { EmailSendCapture } from '../../pageObjects/Reports';
import { reports } from '../../utils/text';
import { getCurrentMonthRangeDays, getCurrentMonthRangeDaysUTC } from '../../utils/date';
import {
    loadLogisticsReportFixtures,
    type LogisticsReportGraphqlExpected,
    type LogisticsReportFixtures
} from './reportFixtures';

// --- Module-level inputs (env + external fixtures) ---
const { uiUsername } = config;

const fixtures: LogisticsReportFixtures | null = loadLogisticsReportFixtures();

// Calendar range shown in the UI date filter (local) and expected ISO date substrings in GraphQL (UTC helpers).
const { startDay: currentMonthStart, endDay: currentMonthEnd } = getCurrentMonthRangeDays();
const { startDayUTC: currentMonthStartUTC, endDayUTC: currentMonthEndUTC } = getCurrentMonthRangeDaysUTC();
const startDate = currentMonthStart;
const endDate = currentMonthEnd;

// --- Shapes for parsing the persisted GraphQL request body (see `emailSend.requestJsonPath`) ---
interface TicketReportRequestVars {
    paymentType?: string[];
    targetColumnForDateSearch?: string;
    fromDate?: string;
    toDate?: string;
    petMoverIds?: string[];
    petMoverId?: string;
    emailForSendReport?: string;
    currency?: string[];
}

interface GraphqlRequestBody {
    operationName?: string;
    query?: string;
    variables?: { req?: TicketReportRequestVars };
}

test.describe('Reports', () => {
    // No suite runs without fixture data (keeps NDA payloads out of git).
    test.skip(
        !fixtures,
        'NDA: add tests/logistics/fixtures.local.json (see fixtures.example.json) or LOGISTICS_REPORT_FIXTURES_JSON'
    );

    test('Send report by email with updated filters', async ({ page }) => {
        test.skip(
            !config.adminUsername || !config.adminPassword,
            'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD: Reports precondition creates PetMover via PetMovers (PetAdmin only).'
        );

        // --- Fixture unpack: labels, id maps, and expected GraphQL fragment ---
        const fx = fixtures as LogisticsReportFixtures;
        const {
            uiPaymentMethods,
            uiCurrencies,
            paymentCodeToName,
            currencyIdToName,
            graphql: expectedRequest
        } = fx;

        // --- Act + assert; finally: remove PetMover `petmover-<uuid>` ---
        const app = new LogisticsApp(page);
        await app.loginAsPetAdmin();
        await app.clearPetMoversStorage();

        const pmUuid = randomUUID();
        const petMoverName = `petmover-${pmUuid}`;
        const petMoverCode = `E2E-RPT-${pmUuid.replace(/-/g, '').slice(0, 12)}`;
        let petMoverCodeForTeardown: string | undefined;

        try {
            await app.navigationSidebar.clickMenuItem(MENU_ITEM.PET_MOVERS);
            const petMoverUi = await app.petMovers.createActivePetMover({
                name: petMoverName,
                code: petMoverCode,
            });
            petMoverCodeForTeardown = petMoverCode;

            const base = config.baseUrl.trim().replace(/\/?$/, '');
            await page.goto(`${base}/reports`, { waitUntil: 'domcontentloaded' });

            await app.reports.field.selectOptions({
                name: reports.petMover,
                options: petMoverUi.label,
                testId: REPORTS_DATA_TESTID.petMoverSelect,
            });
            await app.reports.field.fillDateRange({ name: reports.dateRange, startDate, endDate });
            await app.reports.field.selectOptions({ name: reports.paymentType, options: uiPaymentMethods });
            await app.reports.field.selectOptions({ name: reports.currency, options: uiCurrencies });

            if (uiUsername) {
                await app.reports.field.fillField({ name: reports.sendReportTo, value: uiUsername });
            } else {
                await app.reports.field.fillField({
                    name: reports.sendReportTo,
                    value: 'reports-e2e@example.com',
                });
            }

            const emailSend: EmailSendCapture = await app.reports.sendByEmail();

            // --- Assert: request basics ---
            expect(emailSend && emailSend.requestUrl).toBeTruthy();
            expect(emailSend.method).toBe('POST');

            // --- Assert: multipart / file artifacts (each block runs only if the capture produced that path) ---
            if (emailSend.savedBodyPath) {
                expect(fs.existsSync(emailSend.savedBodyPath)).toBeTruthy();
                const stat = fs.statSync(emailSend.savedBodyPath);
                expect(stat.size).toBeGreaterThan(0);
            }
            if (emailSend.filename) {
                expect(emailSend.filename).toMatch(/\.(json|csv|xlsx)$/i);
            }

            if (emailSend.extractedFilePath) {
                expect(fs.existsSync(emailSend.extractedFilePath)).toBeTruthy();
                const stat2 = fs.statSync(emailSend.extractedFilePath);
                expect(stat2.size).toBeGreaterThan(0);
                expect(emailSend.extractedFilePath).toMatch(/\.(json|csv|xlsx)$/i);
            }

            if (emailSend.responseJsonPath) {
                expect(fs.existsSync(emailSend.responseJsonPath)).toBeTruthy();
                const json = JSON.parse(fs.readFileSync(emailSend.responseJsonPath, 'utf8')) as { data?: unknown };
                expect(json && json.data).toBeTruthy();
            }
            if (emailSend.jobId) {
                expect(String(emailSend.jobId)).toMatch(/^\d+$/);
            }

            // --- Assert: GraphQL request body vs fixture (`operationName`, query substring, `variables.req`) ---
            if (emailSend.requestJsonPath) {
                const requestJson = JSON.parse(
                    fs.readFileSync(emailSend.requestJsonPath, 'utf8')
                ) as GraphqlRequestBody;

                expect(requestJson).toBeTruthy();
                expect(expectedRequest).toBeTruthy();
                expect(requestJson.operationName).toBe(expectedRequest.operationName);

                const norm = (s: string | undefined | null): string =>
                    String(s || '').replace(/\\[nrt]/g, ' ').replace(/\s+/g, ' ').trim();
                expect(norm(requestJson.query)).toContain(norm(expectedRequest.queryContains));

                const reqVars = requestJson?.variables?.req ?? {};
                const expVars: LogisticsReportGraphqlExpected['variables']['req'] =
                    expectedRequest?.variables?.req ?? {
                        paymentTypeNames: [],
                        targetColumnForDateSearch: '',
                        currencyNames: []
                    };

                expect(Array.isArray(reqVars.paymentType)).toBeTruthy();
                const reqPaymentNames = (reqVars.paymentType ?? []).map(
                    (code: string) => paymentCodeToName[code] || `UNKNOWN:${code}`
                );
                expect(reqPaymentNames).toStrictEqual(expVars.paymentTypeNames);

                expect(reqVars.targetColumnForDateSearch).toBe(expVars.targetColumnForDateSearch);

                const expectedFromDay =
                    expVars.fromDateDay === 'CURRENT_MONTH_START' || !expVars.fromDateDay
                        ? currentMonthStartUTC
                        : expVars.fromDateDay;
                const expectedToDay =
                    expVars.toDateDay === 'CURRENT_MONTH_END' || !expVars.toDateDay
                        ? currentMonthEndUTC
                        : expVars.toDateDay;
                const fromDateStr = String(reqVars.fromDate || '').slice(0, 10);
                const toDateStr = String(reqVars.toDate || '').slice(0, 10);
                expect(fromDateStr).toBe(expectedFromDay);
                expect(toDateStr).toBe(expectedToDay);

                if (Array.isArray(reqVars.petMoverIds)) {
                    expect(reqVars.petMoverIds).toStrictEqual([petMoverUi.id]);
                } else {
                    expect(reqVars.petMoverId).toBe(petMoverUi.id);
                }

                if (reqVars.emailForSendReport !== undefined && uiUsername) {
                    expect(reqVars.emailForSendReport).toBe(uiUsername);
                }

                expect(Array.isArray(reqVars.currency)).toBeTruthy();
                const reqCurrencyNames = (reqVars.currency ?? []).map(
                    (id: string) => currencyIdToName[id] || `UNKNOWN:${id}`
                );
                expect(reqCurrencyNames).toStrictEqual(expVars.currencyNames);
            }

            // --- Assert: binary/stream response saved from backend (when present) ---
            if (emailSend.backendFilePath) {
                expect(fs.existsSync(emailSend.backendFilePath)).toBeTruthy();
                const stat3 = fs.statSync(emailSend.backendFilePath);
                expect(stat3.size).toBeGreaterThan(0);
            }
        } finally {
            if (petMoverCodeForTeardown) {
                try {
                    await app.deletePetMoverByCode(petMoverCodeForTeardown);
                } catch {
                    /* ignore */
                }
            }
        }
    });
});
