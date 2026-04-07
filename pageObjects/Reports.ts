/**
 * Report section page object: file download, email submit with POST interception,
 * saving request/response bodies under `e2e-captures` for assertions.
 */
import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FormFields } from './FormFields';
import { reports as reportsText, form } from '../utils/text';
import { config } from '../config-logistics';
import { pickFirstJobId } from './jsonPath';

/** Local artifact folder for downloads / captured bodies (gitignored). */
const E2E_CAPTURE_DIR = path.join(process.cwd(), 'e2e-captures');

const submitReportPattern =
    process.env.E2E_REPORT_SUBMIT_PATTERN || 'Submit|Send|Отправить';

const defaultDownloadUrlHint = /report|export|download|file|storage/i;

function downloadUrlHintRegex (): RegExp {
    const custom = process.env.E2E_REPORT_DOWNLOAD_URL_HINT?.trim();
    if (!custom) {
        return defaultDownloadUrlHint;
    }
    try {
        return new RegExp(custom, 'i');
    } catch {
        return defaultDownloadUrlHint;
    }
}

export interface EmailSendCapture {
    requestUrl: string;
    method: string;
    savedBodyPath: string | null;
    filename: string | null;
    extractedFilePath: string | null;
    backendFilePath: string | null;
    responseStatus: number;
    responseContentType: string;
    downloadUrl: string | null;
    responseJsonPath: string | null;
    jobId: string | number | null;
    requestJsonPath: string | null;
}

export class Reports {
    readonly page: Page;
    readonly reportForm: ReturnType<Page['locator']>;
    readonly field: FormFields;

    constructor (page: Page) {
        this.page = page;
        this.reportForm = this.page.locator('.ant-form');
        this.field = new FormFields(page, this.reportForm);
    }

    async clickDownload (): Promise<void> {
        await test.step('Trigger report download', async () => {
            const downloadPromise = this.page.waitForEvent('download');
            await this.page.getByRole('button', { name: reportsText.download }).click();
            const download = await downloadPromise;

            fs.mkdirSync(E2E_CAPTURE_DIR, { recursive: true });
            const savePath = path.join(E2E_CAPTURE_DIR, download.suggestedFilename());
            await download.saveAs(savePath);
        });
    }

    async sendByEmail (): Promise<EmailSendCapture> {
        return await test.step('Submit report by email and capture outbound HTTP', async () => {
            fs.mkdirSync(E2E_CAPTURE_DIR, { recursive: true });
            const { baseApiUrl } = config;

            const [response] = await Promise.all([
                this.page.waitForResponse(res => {
                    try {
                        const req = res.request();
                        if (req.method() !== 'POST') {
                            return false;
                        }
                        if (baseApiUrl && !req.url().startsWith(baseApiUrl)) {
                            return false;
                        }
                        if (!req.url().includes('graphql')) {
                            return false;
                        }

                        return true;
                    } catch {
                        return false;
                    }
                }, { timeout: 30000 }),
                this.page.getByRole('button', { name: new RegExp(submitReportPattern, 'i') }).click(),
            ]);

            const req = response.request();

            let savedBodyPath: string | null = null;
            let filename: string | null = null;
            let extractedFilePath: string | null = null;
            let backendFilePath: string | null = null;
            const responseStatus = response.status();
            const responseContentType = response.headers()['content-type'] || '';
            let downloadUrl: string | null = null;
            let responseJsonPath: string | null = null;
            let jobId: string | number | null = null;
            let requestJsonPath: string | null = null;

            try {
                const body = await req.postData();
                if (body && body.length) {
                    const nameMatch = body.match(/filename="([^"]+)"/i);
                    if (nameMatch?.[1]) {
                        filename = nameMatch[1];
                    }

                    const ts = new Date().toISOString().replace(/[:.]/g, '_');
                    const base = filename ? `email-request-${ts}-${filename}` : `email-request-${ts}.bin`;
                    savedBodyPath = path.join(E2E_CAPTURE_DIR, base);
                    fs.writeFileSync(savedBodyPath, body);

                    try {
                        const maybeJson = JSON.parse(body) as unknown;
                        requestJsonPath = path.join(E2E_CAPTURE_DIR, `email-request-body-${ts}.json`);
                        fs.writeFileSync(requestJsonPath, JSON.stringify(maybeJson, null, 2), 'utf8');
                    } catch {
                        // not JSON
                    }

                    const firstLineEnd = body.indexOf('\r\n');
                    const boundaryLine = firstLineEnd > 2 ? body.slice(0, firstLineEnd) : '';
                    const boundary = boundaryLine.startsWith('--') ? boundaryLine.slice(2) : null;
                    if (boundary) {
                        const parts = body.split(`\r\n--${boundary}`);
                        for (const part of parts) {
                            const headerEnd = part.indexOf('\r\n\r\n');
                            if (headerEnd === -1) {
                                continue;
                            }
                            const headers = part.slice(0, headerEnd);
                            const content = part.slice(headerEnd + 4);
                            if (!/Content-Disposition/i.test(headers)) {
                                continue;
                            }
                            const fileHeaderMatch = headers.match(/filename="([^"]+)"/i);
                            if (!fileHeaderMatch) {
                                continue;
                            }
                            const partFilename = fileHeaderMatch[1];
                            const trimmedContent = content
                                .replace(/\r\n$/, '')
                                .replace(`\r\n--${boundary}--\r\n`, '')
                                .replace(`--${boundary}--\r\n`, '');
                            const targetPath = path.join(E2E_CAPTURE_DIR, partFilename);
                            fs.writeFileSync(targetPath, trimmedContent);
                            extractedFilePath = targetPath;
                            break;
                        }
                    }
                }
            } catch {
                // ignore capture errors
            }

            try {
                const dispo = response.headers()['content-disposition'] || '';
                const dispoNameMatch = dispo.match(/filename="?([^";]+)"?/i);
                const respBuf = await response.body();
                if (respBuf?.length > 0 && (responseContentType.includes('octet-stream') || dispoNameMatch)) {
                    const ts = new Date().toISOString().replace(/[:.]/g, '_');
                    const fname = dispoNameMatch ? dispoNameMatch[1] : `backend-report-${ts}.bin`;
                    const targetPath = path.join(E2E_CAPTURE_DIR, fname);
                    fs.writeFileSync(targetPath, respBuf);
                    backendFilePath = targetPath;
                } else {
                    let json: unknown;
                    try {
                        json = await response.json();
                    } catch {
                        json = undefined;
                    }
                    try {
                        const ts = new Date().toISOString().replace(/[:.]/g, '_');
                        responseJsonPath = path.join(E2E_CAPTURE_DIR, `email-response-${ts}.json`);
                        fs.writeFileSync(responseJsonPath, JSON.stringify(json, null, 2), 'utf8');
                    } catch {
                        // ignore
                    }
                    try {
                        jobId = pickFirstJobId(json);
                    } catch {
                        jobId = null;
                    }
                    const collectUrls = (obj: unknown, acc: string[] = []): string[] => {
                        if (!obj) {
                            return acc;
                        }
                        if (typeof obj === 'string' && /^https?:\/\//i.test(obj)) {
                            acc.push(obj);
                        }
                        if (Array.isArray(obj)) {
                            obj.forEach(v => collectUrls(v, acc));
                        } else if (typeof obj === 'object') {
                            Object.values(obj).forEach(v => collectUrls(v, acc));
                        }

                        return acc;
                    };
                    const hintRe = downloadUrlHintRegex();
                    const urls = collectUrls(json || {}).filter(u => hintRe.test(u));
                    if (urls.length > 0) {
                        downloadUrl = urls[0];
                        const fileResp = await this.page.request.get(downloadUrl);
                        const fileBuf = await fileResp.body();
                        const cd = fileResp.headers()['content-disposition'] || '';
                        const cdName = cd.match(/filename="?([^";]+)"?/i);
                        const ts = new Date().toISOString().replace(/[:.]/g, '_');
                        const fname2 = cdName ? cdName[1] : `backend-report-download-${ts}.bin`;
                        const targetPath2 = path.join(E2E_CAPTURE_DIR, fname2);
                        fs.writeFileSync(targetPath2, fileBuf);
                        backendFilePath = targetPath2;
                    }
                }
            } catch {
                // ignore backend response capture errors
            }

            try {
                await expect(this.page.getByText(form.successfulSubmit).first()).toBeVisible({ timeout: 10000 });
            } catch {
                // optional toast
            }

            return {
                requestUrl: req.url(),
                method: req.method(),
                savedBodyPath,
                filename,
                extractedFilePath,
                backendFilePath,
                responseStatus,
                responseContentType,
                downloadUrl,
                responseJsonPath,
                jobId,
                requestJsonPath,
            };
        });
    }

    async checkReportData (downloadData: unknown, expectedData: unknown): Promise<void> {
        await test.step('Assert report payload', async () => {
            await expect(downloadData).toStrictEqual(expectedData);
        });
    }
}
