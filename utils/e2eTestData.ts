/**
 * Shared E2E spec data: skip messages, ref-code factories, repeated form literals.
 * Import from here instead of duplicating strings across *.spec.ts files.
 */

export const E2E_SKIP = {
    LOGISTICS_UI_CREDENTIALS: 'Set LOGISTICS_UI_USER_NAME and LOGISTICS_PASSWORD',
    LOGISTICS_ADMIN: 'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD (see .env.example)',
    LOGISTICS_ADMIN_BOOKING_FLOW:
        'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD (PetMover precondition + full flow).',
    LOGISTICS_ADMIN_PET_SHIPPING:
        'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD (PetMover precondition + Points/PetShipping).',
    LOGISTICS_ACCOUNTANT: 'Set LOGISTICS_ACCOUNTANT_USER_NAME and LOGISTICS_ACCOUNTANT_PASSWORD',
    REPORTS_ADMIN_AND_ACCOUNTANT:
        'Set LOGISTICS_ADMIN_* (create PetMover in PetMovers) and LOGISTICS_ACCOUNTANT_* (Reports UI is for PetAccountant / financial manager).',
    REPORTS_FIXTURES_NDA:
        'NDA: add tests/logistics/fixtures.local.json (see fixtures.example.json) or LOGISTICS_REPORT_FIXTURES_JSON',
    PET_STUB_LOGIN:
        'PET stub login only (E2E_PET_STUB_LOGIN / E2E_DOCKER, or local identifier + localhost)',
    BASE_URL_EMPTY: 'LOGISTICS_BASE_CLIENT_URL is empty',
} as const;

/** Unique ref codes; pass `Date.now()` (or shared run id) from the test. */
export const e2eRefs = {
    dogDaycare: (ts: number) => `E2E-DC-${ts}`,
    dogDaycareBooking: (ts: number) => `BK-DC-${ts}`,
    bookingShip: (ts: number) => `E2E-BK-SHIP-${ts}`,
    booking: (ts: number) => `E2E-BK-${ts}`,
    petMover: (ts: number) => `E2E-PM-${ts}`,
    petShip: (ts: number) => `E2E-PS-${ts}`,
    point: (ts: number) => `E2E-P-${ts}`,
} as const;

/** PetMovers CRUD sample names (table assertions). */
export const e2ePetMovers = {
    nameCreate: 'E2E Alpha',
    nameUpdate: 'E2E Beta',
    currencyUpdate: 'USD',
} as const;

/** Points CRUD sample labels. */
export const e2ePoints = {
    nameCreate: 'E2E Terminal',
    nameUpdate: 'E2E Terminal Plus',
    cityCreate: 'Berlin',
    cityUpdate: 'Munich',
} as const;

/** Two-point routes: booking precondition vs pet shipping flow (names differ; both use Hub kind). */
export const e2eRoutes = {
    booking: {
        from: { name: 'Hub A', city: 'Amsterdam' },
        to: { name: 'Hub B', city: 'Zurich' },
    },
    petShipping: {
        from: { name: 'E2E Alpha', city: 'Amsterdam' },
        to: { name: 'E2E Beta', city: 'Zurich' },
    },
} as const;

/** Подписи видов в Booking → Species (совпадают с `BOOKING_PET_SPECIES` в pet-app). */
export const bookingSpecies = {
    cat: 'Cat',
    dog: 'Dog',
    duck: 'Duck',
} as const;

export const e2eDogDaycare = {
    dogNameCreate: 'E2E Rex',
    dogNameUpdate: 'E2E Rex Pro',
    dogWeightKg: '8',
    currencyLabel: 'EUR',
    hours: '4',
    statusCreate: 'Scheduled',
    statusUpdate: 'Checked in',
} as const;

export const e2eBooking = {
    petLabelsCreate: [bookingSpecies.cat] as string[],
    petLabelsUpdate: [bookingSpecies.dog] as string[],
    weightCreate: '6',
    weightUpdate: '7',
    rowSnippetEur006: '0.06 EUR',
    rowSnippetEur007: '0.07 EUR',
    rowSnippetCard: 'Card',
} as const;

/**
 * Быстрый CRUD по уже залогиненной сессии: в UI должен существовать pet ship с таким подписным label (как в Select).
 * Переопределение: `E2E_BOOKING_SESSION_REF`, `E2E_BOOKING_SESSION_PET_SHIP`.
 */
export const e2eBookingSession = {
    refCode: '141414',
    /** Подстрока label рейса в поле Pet ship (как в записанном Codegen). */
    petShipLabel: '111 — 566546 →',
    petLabels: [bookingSpecies.cat, bookingSpecies.dog] as string[],
    weightKg: '100',
} as const;

export const e2eReports = {
    pageHeading: 'Reports',
    fallbackSendReportEmail: 'reports-e2e@example.com',
    petMoverNamePrefix: 'petmover-',
    petMoverCodeFromUuid: (uuid: string) => `E2E-RPT-${uuid.replace(/-/g, '').slice(0, 12)}`,
} as const;
