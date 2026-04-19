/**
 * E2E helpers: read access token from persisted Playwright `storageState` (localStorage).
 */
import * as fs from 'fs';

export async function getAccessToken (pathToJson: string): Promise<string> {
    const json = JSON.parse(fs.readFileSync(pathToJson, 'utf-8')) as {
        origins: Array<{ localStorage: Array<{ name: string; value: string }> }>;
    };
    let entry = json.origins?.flatMap((o) => o.localStorage ?? []).find((e) => e.name === 'pet-auth');
    if (!entry?.value && json.origins?.[0]?.localStorage?.[0]) {
        entry = json.origins[0].localStorage[0];
    }
    let value: string = entry?.value ?? '';
    if (!value) {
        throw new Error(`No pet-auth localStorage entry in ${pathToJson}`);
    }
    if (typeof value === 'string' && value.trim().startsWith('{')) {
        value = (JSON.parse(value) as { accessToken: string }).accessToken;
    }

    return value;
}
