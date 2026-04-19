/**
 * Height at withers (shoulder, cm) for dogs — discrete steps for UI.
 * Range reflects real-world FCI-style breed extremes: smallest toy breeds (~15 cm class)
 * through giant breeds (Great Dane / Irish Wolfhound class, upper standard ~80–90+ cm).
 */
export const DOG_WITHERS_HEIGHT_CM_MIN = 15;
export const DOG_WITHERS_HEIGHT_CM_MAX = 110;

export const DOG_WITHERS_HEIGHT_CM_OPTIONS = Array.from(
    { length: DOG_WITHERS_HEIGHT_CM_MAX - DOG_WITHERS_HEIGHT_CM_MIN + 1 },
    (_, i) => {
        const cm = DOG_WITHERS_HEIGHT_CM_MIN + i;

        return { value: cm, label: `${cm} cm` };
    }
);
