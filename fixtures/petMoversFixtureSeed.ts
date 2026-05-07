import type { LogisticsReportFixtures, LogisticsReportPetMoverSeed } from './reportFixtures';

export type PetMoverStorageRow = {
    id: string;
    name: string;
    code: string;
    active: boolean;
    /** Tariff currency; must match `pet-app` PetMoverRow. */
    currency: 'EUR' | 'USD';
    cars: string;
    drivers: string;
};

/** Matches Reports option label: `Name (code)`. */
export function parseReportPetMoverLabel (reportPetMover: string): { name: string; code: string } | null {
    const m = reportPetMover.trim().match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (!m) {
        return null;
    }

    return { name: m[1].trim(), code: m[2].trim() };
}

export function buildPetMoverRowForReportsFixture (fx: LogisticsReportFixtures): PetMoverStorageRow {
    const explicit = fx.petMoverSeed;
    if (explicit) {
        return {
            id: explicit.id,
            name: explicit.name,
            code: explicit.code,
            active: explicit.active ?? true,
            currency: explicit.currency === 'USD' ? 'USD' : 'EUR',
            cars: typeof explicit.cars === 'string' ? explicit.cars : '',
            drivers: typeof explicit.drivers === 'string' ? explicit.drivers : '',
        };
    }

    const parsed = parseReportPetMoverLabel(fx.reportPetMover);
    if (!parsed) {
        throw new Error(
            'Set petMoverSeed in fixtures or use reportPetMover like "Name (CODE)" so the test can seed PetMovers.'
        );
    }

    const id =
        fx.petMoverIdsExpected && fx.petMoverIdsExpected.length > 0
            ? fx.petMoverIdsExpected[0]
            : `pm-e2e-${parsed.code.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;

    return {
        id,
        name: parsed.name,
        code: parsed.code,
        active: true,
        currency: 'EUR',
        cars: '',
        drivers: '',
    };
}
