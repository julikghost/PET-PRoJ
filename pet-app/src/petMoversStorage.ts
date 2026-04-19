import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { PetShipCurrency } from './types/petLogistics';

/** Pet mover serves either point-to-point shipping (PetShipping) or city taxi (City Taxi). */
export type PetMoverMovementType = 'shipping' | 'taxi';

export type PetMoverRow = {
    id: string;
    name: string;
    code: string;
    active: boolean;
    /** Tariff / booking currency (PetShipping & booking pricing follow this). City taxi UI is EUR-only. */
    currency: PetShipCurrency;
    /** Optional; copied onto pet ships when saved. */
    cars: string;
    drivers: string;
    /** One mover is either shipping or taxi (not both). */
    movementType: PetMoverMovementType;
};

export const PET_MOVERS_STORAGE_KEY = 'pet-movers-v1';

function parsePetMoverRow (x: unknown): PetMoverRow | null {
    if (x === null || typeof x !== 'object') {
        return null;
    }
    const o = x as Record<string, unknown>;
    const currencyOk =
        o.currency === undefined || o.currency === 'EUR' || o.currency === 'USD';

    if (
        typeof o.id !== 'string'
        || typeof o.name !== 'string'
        || typeof o.code !== 'string'
        || typeof o.active !== 'boolean'
        || !currencyOk
    ) {
        return null;
    }

    const movementType: PetMoverMovementType =
        o.movementType === 'taxi' ? 'taxi' : 'shipping';

    return {
        id: o.id,
        name: o.name,
        code: o.code,
        active: o.active,
        currency: o.currency === 'USD' ? 'USD' : 'EUR',
        cars: typeof o.cars === 'string' ? o.cars : '',
        drivers: typeof o.drivers === 'string' ? o.drivers : '',
        movementType,
    };
}

export function loadPetMovers (): PetMoverRow[] {
    try {
        const raw = localStorage.getItem(PET_MOVERS_STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const p = JSON.parse(raw) as unknown;
        if (!Array.isArray(p)) {
            return [];
        }

        return p.map(parsePetMoverRow).filter((r): r is PetMoverRow => r !== null);
    } catch {
        return [];
    }
}

/**
 * Options for Ant `Select`: same list as on {@link PetMoversPage} (active rows only).
 * - `id` — form value for Reports (API expects mover id).
 * - `name` — form value for Pet ship rows (legacy string field; stable display name).
 */
export function petMoverSelectOptions (
    rows: PetMoverRow[],
    valueKey: 'id' | 'name',
    filter?: (row: PetMoverRow) => boolean
): { value: string; label: string }[] {
    return rows
        .filter((m) => m.active && (filter ? filter(m) : true))
        .map((m) => ({
            value: m[valueKey],
            label: `${m.name} (${m.code})`,
        }));
}

/**
 * PetMovers directory shared by {@link PetMoversPage}, Reports, PetShipping, etc.
 */
export function usePetMovers (): [PetMoverRow[], Dispatch<SetStateAction<PetMoverRow[]>>] {
    const [rows, setRows] = useState<PetMoverRow[]>(loadPetMovers);

    useEffect(() => {
        localStorage.setItem(PET_MOVERS_STORAGE_KEY, JSON.stringify(rows));
    }, [rows]);

    return [rows, setRows];
}
