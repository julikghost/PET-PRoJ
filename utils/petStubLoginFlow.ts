/**
 * Whether E2E should use the PET stub login flow (`identifier` field, same as `openPetStubLoginPage`).
 * Must stay in sync with `tests/auth/logisticsSession.setup.ts` — single place for CI (Docker) and local runs.
 */
import { config } from '../config-logistics';

export function usePetStubLoginFlow (): boolean {
    if (process.env.E2E_HOSTED_LOGISTICS_LOGIN === '1') {
        return false;
    }
    if (process.env.E2E_PET_STUB_LOGIN === '1') {
        return true;
    }
    /** `docker-compose.e2e.yml` sets this; base URL is `http://pet-app:5173/` (not localhost). */
    if (process.env.E2E_DOCKER === '1') {
        return true;
    }
    const idField = process.env.E2E_LOGIN_USER_FIELD_NAME?.trim();
    if (idField !== 'identifier') {
        return false;
    }
    const base = config.baseUrl.trim().toLowerCase();

    return base.includes('localhost') || base.includes('127.0.0.1');
}
