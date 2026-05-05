import * as fs from 'fs';
import { randomUUID } from 'node:crypto';
import { config } from '../../config-logistics';
import { MENU_ITEM, REPORTS_DATA_TESTID } from '../../utils/constants';
import { getCurrentMonthRangeDays, getCurrentMonthRangeDaysUTC } from '../../utils/date';
import { E2E_SKIP, e2eReports } from '../../utils/e2eTestData';
import type { EmailSendCapture } from '../../pageObjects/Reports';
import { reports } from '../../utils/text';
import {
    loadLogisticsReportFixtures,
    type LogisticsReportGraphqlExpected,
    type LogisticsReportFixtures
} from './reportFixtures';
import { expect, test } from '../../fixtures/logisticsApp.fixture';

// --- Module-level inputs (env + external fixtures) ---
const { uiUsername } = config;

const fixtures: LogisticsReportFixtures | null = loadLogisticsReportFixtures();

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
    test.skip(!fixtures, E2E_SKIP.REPORTS_FIXTURES_NDA);

    test('Send report by email with updated filters', async ({ page, logisticsApp }) => {
        test.skip(
            !config.adminUsername
            || !config.adminPassword
            || !config.accountantUsername
            || !config.accountantPassword,
            E2E_SKIP.REPORTS_ADMIN_AND_ACCOUNTANT
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

        // Calendar range at run time (not module load) so long-lived workers / midnight do not stale the range.
        const { startDay: currentMonthStart, endDay: currentMonthEnd } = getCurrentMonthRangeDays();
        const { startDayUTC: currentMonthStartUTC, endDayUTC: currentMonthEndUTC } =
            getCurrentMonthRangeDaysUTC();
        const startDate = currentMonthStart;
        const endDate = currentMonthEnd;

        // --- Act + assert; finally: remove PetMover `petmover-<uuid>` ---
        await logisticsApp.loginAsPetAdmin();
        await logisticsApp.clearPetMoversStorage();

        const pmUuid = randomUUID();
        const petMoverName = `${e2eReports.petMoverNamePrefix}${pmUuid}`;
        const petMoverCode = e2eReports.petMoverCodeFromUuid(pmUuid);
        const cleanup = { petMoverCode: undefined as string | undefined };

        try {
            await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.PET_MOVERS);
            const petMoverUi = await logisticsApp.petMovers.createActivePetMover({
                name: petMoverName,
                code: petMoverCode,
            });
            cleanup.petMoverCode = petMoverCode;

            // Reports form (incl. `data-testid="pet-reports-pet-mover"`) is used as PetAccountant; admin only for PetMovers precondition.
            await logisticsApp.loginAsPetAccountant();

            const base = config.baseUrl.trim().replace(/\/?$/, '');
            await page.goto(`${base}/reports`, { waitUntil: 'domcontentloaded' });
            await expect(page.getByRole('heading', { name: e2eReports.pageHeading })).toBeVisible({
                timeout: 20000,
            });
            await expect(page.getByTestId(REPORTS_DATA_TESTID.petMoverField)).toBeVisible({
                timeout: 20000,
            });

            await logisticsApp.reports.field.selectOptions({
                name: reports.petMover,
                options: petMoverUi.label,
                testId: REPORTS_DATA_TESTID.petMoverField,
            });
            await logisticsApp.reports.field.fillDateRange({ name: reports.dateRange, startDate, endDate });
            await logisticsApp.reports.field.selectOptions({ name: reports.paymentType, options: uiPaymentMethods });
            await logisticsApp.reports.field.selectOptions({ name: reports.currency, options: uiCurrencies });

            if (uiUsername) {
                await logisticsApp.reports.field.fillField({ name: reports.sendReportTo, value: uiUsername });
            } else {
                await logisticsApp.reports.field.fillField({
                    name: reports.sendReportTo,
                    value: e2eReports.fallbackSendReportEmail,
                });
            }

            const emailSend: EmailSendCapture = await logisticsApp.reports.sendByEmail();

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
            if (cleanup.petMoverCode) {
                try {
                    await logisticsApp.loginAsPetAdmin();
                    await logisticsApp.deletePetMoverByCode(cleanup.petMoverCode);
                } catch {
                    /* ignore */
                }
            }
        }
    });
});
