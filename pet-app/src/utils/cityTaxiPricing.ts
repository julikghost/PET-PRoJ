/** City pet taxi: fixed EUR tariffs per km (no currency switch in UI). */

export type CityTaxiSpecies = 'dog' | 'cat';
export type CityTaxiClass = 'economy' | 'business';

/** EUR per km before height surcharge and class multiplier */
export function cityTaxiRateEurPerKm (species: CityTaxiSpecies, dogWithCage: boolean): number {
    if (species === 'cat') {
        return 2;
    }

    return dogWithCage ? 3.5 : 3;
}

/**
 * Extra charge on dog trips by withers height (shoulder, cm), applied to the km subtotal (with or without cage rate).
 * Below 26 cm: no extra. Bands: 26–50 +10%, 51–75 +15%, 76–110 +25%.
 */
export function dogWithersHeightSurchargeMultiplier (heightCm: number): number {
    if (heightCm >= 76 && heightCm <= 110) {
        return 1.25;
    }
    if (heightCm >= 51 && heightCm <= 75) {
        return 1.15;
    }
    if (heightCm >= 26 && heightCm <= 50) {
        return 1.1;
    }

    return 1;
}

/** Business class surcharge on trip total (after km rate and dog height surcharge). */
const BUSINESS_MULTIPLIER = 1.25;

export function cityTaxiTripPriceEur (
    distanceKm: number,
    species: CityTaxiSpecies,
    dogWithCage: boolean,
    taxiClass: CityTaxiClass,
    dogWithersHeightCm?: number
): number {
    const rate = cityTaxiRateEurPerKm(species, dogWithCage);
    let subtotal = distanceKm * rate;

    if (species === 'dog' && dogWithersHeightCm !== undefined) {
        subtotal *= dogWithersHeightSurchargeMultiplier(dogWithersHeightCm);
    }

    const raw = subtotal * (taxiClass === 'business' ? BUSINESS_MULTIPLIER : 1);

    return Math.round(raw * 100) / 100;
}
