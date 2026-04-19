/**
 * Loads environment variables and shared E2E settings: client/API URLs, login, timezone,
 * and the path to the Playwright `storageState` file (browser session).
 */
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

/** Load `.env` reliably when Playwright’s cwd differs from the repo root. */
function loadEnvFromRepoRoot (): void {
    const candidates = [
        path.resolve(process.cwd(), '.env'),
        path.join(__dirname, '.env'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            // `override: false`: Compose / CI already set `LOGISTICS_*` etc.; mounted `.env` must not overwrite them.
            dotenv.config({ path: p, override: false });
        }
    }
}

loadEnvFromRepoRoot();

function resolveStorageStatePath (): string {
    const custom = process.env.E2E_STORAGE_STATE_PATH?.trim();
    if (custom) {
        return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
    }

    return path.join(process.cwd(), 'storageState', 'session.json');
}

/** Playwright `storageState` file (cookies + storage). Gitignored; override with `E2E_STORAGE_STATE_PATH`. */
export const storageStatePath = resolveStorageStatePath();

export const config = {
    baseUrl: process.env.LOGISTICS_BASE_CLIENT_URL?.trim() || '',
    baseApiUrl: process.env.LOGISTICS_BASE_API_URL?.trim() || '',
    /** E2E user login (logistics web UI). Prefer LOGISTICS_UI_USER_NAME. */
    uiUsername:
        process.env.LOGISTICS_UI_USER_NAME?.trim()
        || process.env.LOGISTICS_E2E_USER_NAME?.trim()
        || '',
    password: process.env.LOGISTICS_PASSWORD?.trim() || '',
    /** PetAdmin login for PET UI (PetMovers, etc.). Align with `VITE_PET_ADMIN_*` in `pet-app/.env`. */
    adminUsername: process.env.LOGISTICS_ADMIN_USER_NAME?.trim() || '',
    adminPassword: process.env.LOGISTICS_ADMIN_PASSWORD?.trim() || '',
    /** PetAccountant — Reports only in PET UI. Match `VITE_PET_ACCOUNTANT_*` in `pet-app/.env`. */
    accountantUsername: process.env.LOGISTICS_ACCOUNTANT_USER_NAME?.trim() || '',
    accountantPassword: process.env.LOGISTICS_ACCOUNTANT_PASSWORD?.trim() || '',
    /** IANA zone for date helpers (set per environment; avoid committing tenant-specific defaults). */
    timeZone: process.env.E2E_TIME_ZONE || 'UTC',
    timeZoneOffsetMinutes: process.env.E2E_TIME_ZONE_OFFSET_MINUTES
        ? Number(process.env.E2E_TIME_ZONE_OFFSET_MINUTES)
        : undefined,
};
