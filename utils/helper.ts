/**
 * E2E helpers: read access token from persisted Playwright `storageState` (localStorage).
 */
import * as fs from 'fs';

export async function getAccessToken (pathToJson: string): Promise<string> {
    const json = JSON.parse(fs.readFileSync(pathToJson, 'utf-8')) as {
        origins: Array<{ localStorage: Array<{ value: string }> }>;
    };
    let value: string = json.origins[0].localStorage[0].value;
    if (typeof value === 'string' && value.trim().startsWith('{')) {
        value = (JSON.parse(value) as { accessToken: string }).accessToken;
    }

    return value;
}
