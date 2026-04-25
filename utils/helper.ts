/**
 * E2E helpers: read access token from persisted Playwright `storageState` (localStorage).
 */
import * as fs from 'fs';

type StorageStateJson = {
    cookies?: unknown[];
    origins?: Array<{ origin?: string; localStorage?: Array<{ name: string; value: string }> }>;
};

/** Fails fast if `storageState()` wrote an empty shell (common if save raced navigation or login never set `pet-auth`). */
export function assertPetStorageStateHasPetAuth (pathToJson: string): void {
    const raw = fs.readFileSync(pathToJson, 'utf-8');
    let parsed: StorageStateJson;
    try {
        parsed = JSON.parse(raw) as StorageStateJson;
    } catch {
        throw new Error(`storageState file is not valid JSON: ${pathToJson}`);
    }
    const origins = parsed.origins ?? [];
    if (origins.length === 0) {
        throw new Error(
            `storageState has no origins (empty session). Path: ${pathToJson}. `
            + 'PET stub needs localStorage `pet-auth` on the client origin — wait until after /home or /reports before saving.'
        );
    }
    const hasPetAuth = origins.some((o) =>
        (o.localStorage ?? []).some((e) => e.name === 'pet-auth' && (e.value?.length ?? 0) > 0)
    );
    if (!hasPetAuth) {
        throw new Error(
            `storageState has no pet-auth entry. Path: ${pathToJson}. origins=${origins.length}. `
            + 'Ensure login finished and URL is /home or /reports before persisting.'
        );
    }
}

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
