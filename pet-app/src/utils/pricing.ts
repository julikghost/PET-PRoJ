import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { PetShipCurrency } from '../types/petLogistics';

dayjs.extend(customParseFormat);

const DATETIME_FMT = 'YYYY-MM-DD HH:mm';
const DOG_DAYCARE_MIN_HOURS = 1;
const DOG_DAYCARE_MAX_HOURS = 12;

/** Per kg per day (booking price = weightKg × rate × tripDays). */
export const BASE_RATE: Record<PetShipCurrency, number> = {
    EUR: 0.01,
    USD: 0.02,
};

/** Dog daycare hourly rates by size class. */
export const DOG_DAYCARE_RATE: Record<PetShipCurrency, Record<DogDaycareSize, number>> = {
    EUR: {
        small: 0.5,
        medium: 0.75,
        large: 1,
    },
    USD: {
        small: 0.7,
        medium: 1,
        large: 1.3,
    },
};

export type DogDaycareSize = 'small' | 'medium' | 'large';

function roundCurrency (value: number): number {
    return Math.round(value * 100) / 100;
}

export function dogDaycareSizeByWeight (weightKg: number): DogDaycareSize {
    if (weightKg <= 10) {
        return 'small';
    }
    if (weightKg <= 25) {
        return 'medium';
    }

    return 'large';
}

export function normalizeDogDaycareHours (hours: number): number {
    if (!Number.isFinite(hours)) {
        return DOG_DAYCARE_MIN_HOURS;
    }
    const rounded = Math.round(hours);

    return Math.max(DOG_DAYCARE_MIN_HOURS, Math.min(DOG_DAYCARE_MAX_HOURS, rounded));
}

export function dogDaycareHourlyRate (currency: PetShipCurrency, weightKg: number): number {
    const size = dogDaycareSizeByWeight(weightKg);

    return DOG_DAYCARE_RATE[currency][size];
}

/**
 * Trip length in days for pricing: any partial 24h block counts as a day (min 1).
 */
export function tripDayCount (departure: string, arrival: string): number {
    const dep = dayjs(departure.trim(), DATETIME_FMT, true);
    const arr = dayjs(arrival.trim(), DATETIME_FMT, true);
    if (!dep.isValid() || !arr.isValid()) {
        return 1;
    }
    if (!arr.isAfter(dep)) {
        return 1;
    }
    const hours = arr.diff(dep, 'hour', true);

    return Math.max(1, Math.ceil(hours / 24));
}

export function computeBookingPrice (
    weightKg: number,
    currency: PetShipCurrency,
    departure: string,
    arrival: string
): number {
    const days = tripDayCount(departure, arrival);
    const rate = BASE_RATE[currency];
    const raw = weightKg * rate * days;

    return roundCurrency(raw);
}

export function computeDogDaycarePrice (
    weightKg: number,
    currency: PetShipCurrency,
    requestedHours: number
): number {
    const hours = normalizeDogDaycareHours(requestedHours);
    const hourly = dogDaycareHourlyRate(currency, weightKg);

    return roundCurrency(hourly * hours);
}

export function computeBookingTotalPrice (basePrice: number, daycarePrice: number): number {
    return roundCurrency(basePrice + daycarePrice);
}
