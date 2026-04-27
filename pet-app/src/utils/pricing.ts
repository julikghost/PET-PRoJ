import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { PetShipCurrency } from '../types/petLogistics';

dayjs.extend(customParseFormat);

const DATETIME_FMT = 'YYYY-MM-DD HH:mm';
const DATE_FMT = 'YYYY-MM-DD';
const DOG_DAYCARE_DEFAULT_HOURS = 4;

export const DOG_DAYCARE_HOURS_PER_DAY_OPTIONS = [2, 4, 6, 8, 12] as const;
export type DogDaycareHoursPerDay = (typeof DOG_DAYCARE_HOURS_PER_DAY_OPTIONS)[number];

/** Per kg per day (booking price = weightKg × rate × tripDays). */
export const BASE_RATE: Record<PetShipCurrency, number> = {
    EUR: 0.01,
    USD: 0.02,
};

/** Daycare hourly tariff: 1 unit (EUR/USD) per hour. */
export const DOG_DAYCARE_HOURLY_RATE: Record<PetShipCurrency, number> = {
    EUR: 1,
    USD: 1,
};

function roundCurrency (value: number): number {
    return Math.round(value * 100) / 100;
}

export function normalizeDogDaycareHoursPerDay (hours: number): DogDaycareHoursPerDay {
    const rounded = Number.isFinite(hours) ? Math.round(hours) : DOG_DAYCARE_DEFAULT_HOURS;
    const exactMatch = DOG_DAYCARE_HOURS_PER_DAY_OPTIONS.find((x) => x === rounded);
    if (exactMatch !== undefined) {
        return exactMatch;
    }
    const nearest = [...DOG_DAYCARE_HOURS_PER_DAY_OPTIONS]
        .sort((a, b) => Math.abs(a - rounded) - Math.abs(b - rounded))[0];

    return nearest ?? DOG_DAYCARE_DEFAULT_HOURS;
}

export function computeDogDaycareDays (startDate: string, endDate: string): number {
    const start = dayjs(startDate.trim(), DATE_FMT, true);
    const end = dayjs(endDate.trim(), DATE_FMT, true);
    if (!start.isValid() || !end.isValid()) {
        return 1;
    }
    if (end.isBefore(start, 'day')) {
        return 1;
    }

    return end.diff(start, 'day') + 1;
}

export function computeDogDaycarePrice (
    currency: PetShipCurrency,
    requestedHoursPerDay: number,
    startDate: string,
    endDate: string
): number {
    const hoursPerDay = normalizeDogDaycareHoursPerDay(requestedHoursPerDay);
    const days = computeDogDaycareDays(startDate, endDate);
    const hourly = DOG_DAYCARE_HOURLY_RATE[currency];

    return roundCurrency(hourly * hoursPerDay * days);
}

export function computeBookingTotalPrice (basePrice: number, daycarePrice: number): number {
    return roundCurrency(basePrice + daycarePrice);
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

const PET_SHIP_MIN_DURATION_MINUTES = 30;

/**
 * Pet ship routes must end on the same calendar day as departure, with duration strictly over 30 minutes.
 * Returns an English toast message or null if valid.
 */
export function petShipScheduleValidationMessage (departure: string, arrival: string): string | null {
    const dep = dayjs(departure.trim(), DATETIME_FMT, true);
    const arr = dayjs(arrival.trim(), DATETIME_FMT, true);
    if (!dep.isValid() || !arr.isValid()) {
        return 'Departure and arrival must be valid dates (YYYY-MM-DD HH:mm)';
    }
    if (!arr.isAfter(dep)) {
        return 'Arrival must be after departure';
    }
    if (!dep.isSame(arr, 'day')) {
        return 'Departure and arrival must be on the same calendar day';
    }
    const minutes = arr.diff(dep, 'minute');
    if (minutes <= PET_SHIP_MIN_DURATION_MINUTES) {
        return `Trip must be longer than ${PET_SHIP_MIN_DURATION_MINUTES} minutes on the same day`;
    }

    return null;
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
