/**
 * Approximate WGS84 coordinates for cities in {@link POINT_CITY_OPTIONS} (map markers).
 * Keys must match the city strings exactly (including diacritics).
 */
const CITY_LAT_LNG_RAW: Record<string, [number, number]> = {
    Amsterdam: [52.37, 4.9],
    Athens: [37.98, 23.73],
    Barcelona: [41.39, 2.15],
    Belgrade: [44.79, 20.45],
    Berlin: [52.52, 13.41],
    Brussels: [50.85, 4.35],
    Bucharest: [44.43, 26.1],
    Budapest: [47.5, 19.04],
    Cologne: [50.94, 6.96],
    Copenhagen: [55.68, 12.57],
    Frankfurt: [50.11, 8.68],
    Geneva: [46.2, 6.14],
    Gothenburg: [57.71, 11.97],
    Hamburg: [53.55, 9.99],
    Helsinki: [60.17, 24.94],
    Kraków: [50.06, 19.95],
    Lisbon: [38.72, -9.14],
    Ljubljana: [46.05, 14.51],
    Lyon: [45.76, 4.84],
    Madrid: [40.42, -3.7],
    Marseille: [43.3, 5.37],
    Milan: [45.46, 9.19],
    Munich: [48.14, 11.58],
    Oslo: [59.91, 10.75],
    Paris: [48.86, 2.35],
    Porto: [41.16, -8.63],
    Prague: [50.08, 14.44],
    Riga: [56.95, 24.11],
    Rome: [41.9, 12.48],
    Rotterdam: [51.92, 4.48],
    Sofia: [42.7, 23.32],
    Stockholm: [59.33, 18.07],
    Stuttgart: [48.78, 9.18],
    Tallinn: [59.44, 24.75],
    Thessaloniki: [40.64, 22.94],
    Tirana: [41.33, 19.82],
    Toulouse: [43.6, 1.44],
    Turin: [45.07, 7.69],
    Valencia: [39.47, -0.38],
    Vienna: [48.21, 16.37],
    Vilnius: [54.69, 25.28],
    Warsaw: [52.23, 21.01],
    Zagreb: [45.81, 15.98],
    Zurich: [47.38, 8.54],
};

/** @returns [lat, lng] or null if the city is not in the catalog. */
export function getCityCoordinates (city: string): [number, number] | null {
    const key = city.trim();
    const c = CITY_LAT_LNG_RAW[key];

    return c ?? null;
}
