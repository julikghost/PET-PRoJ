/** Major metropolitan areas (FR / DE / GB) — city taxi is limited to these centres + radius. */

export type CityTaxiCountryCode = 'FR' | 'DE' | 'GB';

export type MajorCityDef = {
    id: string;
    label: string;
    country: CityTaxiCountryCode;
    /** City centre / downtown reference point */
    center: { lat: number; lng: number };
    /** Radius around centre within which pickup/drop-off must fall */
    radiusKm: number;
};

/** Lowercase ISO region codes for Google Places bias */
export const COUNTRY_ISO: Record<CityTaxiCountryCode, string> = {
    FR: 'fr',
    DE: 'de',
    GB: 'gb',
};

export const MAJOR_CITIES_FR_DE_GB: MajorCityDef[] = [
    // France
    { id: 'fr-paris', label: 'Paris', country: 'FR', center: { lat: 48.8566, lng: 2.3522 }, radiusKm: 35 },
    { id: 'fr-lyon', label: 'Lyon', country: 'FR', center: { lat: 45.764, lng: 4.8357 }, radiusKm: 25 },
    { id: 'fr-marseille', label: 'Marseille', country: 'FR', center: { lat: 43.2965, lng: 5.3698 }, radiusKm: 28 },
    { id: 'fr-toulouse', label: 'Toulouse', country: 'FR', center: { lat: 43.6047, lng: 1.4442 }, radiusKm: 22 },
    { id: 'fr-nice', label: 'Nice', country: 'FR', center: { lat: 43.7102, lng: 7.262 }, radiusKm: 22 },
    { id: 'fr-nantes', label: 'Nantes', country: 'FR', center: { lat: 47.2184, lng: -1.5536 }, radiusKm: 22 },
    { id: 'fr-strasbourg', label: 'Strasbourg', country: 'FR', center: { lat: 48.5734, lng: 7.7521 }, radiusKm: 22 },
    // Germany
    { id: 'de-berlin', label: 'Berlin', country: 'DE', center: { lat: 52.52, lng: 13.405 }, radiusKm: 35 },
    { id: 'de-hamburg', label: 'Hamburg', country: 'DE', center: { lat: 53.5511, lng: 9.9937 }, radiusKm: 28 },
    { id: 'de-munich', label: 'Munich', country: 'DE', center: { lat: 48.1374, lng: 11.5755 }, radiusKm: 28 },
    { id: 'de-cologne', label: 'Cologne', country: 'DE', center: { lat: 50.9375, lng: 6.9603 }, radiusKm: 25 },
    { id: 'de-frankfurt', label: 'Frankfurt', country: 'DE', center: { lat: 50.1109, lng: 8.6821 }, radiusKm: 25 },
    { id: 'de-stuttgart', label: 'Stuttgart', country: 'DE', center: { lat: 48.7758, lng: 9.1829 }, radiusKm: 22 },
    // United Kingdom
    { id: 'gb-london', label: 'London', country: 'GB', center: { lat: 51.5074, lng: -0.1278 }, radiusKm: 40 },
    { id: 'gb-birmingham', label: 'Birmingham', country: 'GB', center: { lat: 52.4862, lng: -1.8904 }, radiusKm: 25 },
    { id: 'gb-manchester', label: 'Manchester', country: 'GB', center: { lat: 53.4808, lng: -2.2426 }, radiusKm: 28 },
    { id: 'gb-leeds', label: 'Leeds', country: 'GB', center: { lat: 53.8008, lng: -1.5491 }, radiusKm: 22 },
    { id: 'gb-glasgow', label: 'Glasgow', country: 'GB', center: { lat: 55.8642, lng: -4.2518 }, radiusKm: 25 },
    { id: 'gb-liverpool', label: 'Liverpool', country: 'GB', center: { lat: 53.4084, lng: -2.9916 }, radiusKm: 22 },
].sort((a, b) => a.label.localeCompare(b.label));

export function findCityById (id: string): MajorCityDef | undefined {
    return MAJOR_CITIES_FR_DE_GB.find((c) => c.id === id);
}
