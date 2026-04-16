import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { PetShipCurrency } from '../types/petLogistics';

dayjs.extend(customParseFormat);

const DATETIME_FMT = 'YYYY-MM-DD HH:mm';

/** Per kg per day (booking price = weightKg × rate × tripDays). */
export const BASE_RATE: Record<PetShipCurrency, number> = {
    EUR: 0.01,
    USD: 0.02,
};

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

    return Math.round(raw * 100) / 100;
}
