export type PetShipCurrency = 'EUR' | 'USD';

/** Same values as Reports → Payment methods (`reportsAndBookingOptions`). */
export type BookingPaymentMethod = 'card' | 'cash' | 'petpay';

/** Same values as Reports → Currency filter (`cur-usd` / `cur-eur`). */
export type BookingBillingCurrency = 'cur-usd' | 'cur-eur';

/** Dog daycare stop lifecycle inside a booking. */
export type DogDaycareStatus = 'scheduled' | 'checked-in' | 'active' | 'checked-out';

export type PointKind = 'hub' | 'stop' | 'airport';

export type PointRecord = {
    id: string;
    code: string;
    name: string;
    city: string;
    kind: PointKind;
};

export type PetShipRecord = {
    id: string;
    refCode: string;
    fromPointId: string;
    toPointId: string;
    departure: string;
    arrival: string;
    petMover: string;
    /** Pricing currency for bookings on this ship (base rate EUR 0.01 / USD 0.02 per kg·day). */
    currency: PetShipCurrency;
    /** Snapshot from Pet Mover at save (optional). */
    cars: string;
    drivers: string;
    status: 'planned' | 'active' | 'done';
};

export type BookingRecord = {
    id: string;
    refCode: string;
    petShipId: string;
    date: string;
    clientFirstName: string;
    clientLastName: string;
    /** Species from the booking catalog (`bookingPets.ts`), English labels, alphabetical in UI. */
    petLabels: string[];
    weightKg: number;
    /** Snapshot: weight × base rate × trip days (see {@link PetShipRecord.currency}). */
    price: number;
    /** Pet ship tariff currency (EUR/USD). */
    currency: PetShipCurrency;
    paymentMethod: BookingPaymentMethod;
    /** Billing / reporting currency — aligned with Reports filters. */
    billingCurrency: BookingBillingCurrency;
};

export type PetSeaterRecord = {
    id: string;
    code: string;
    name: string;
    phone: string;
    active: boolean;
};

export type DogDaycareRecord = {
    id: string;
    refCode: string;
    /** Internal booking reference specific to Dog Daycare feature. */
    bookingRefCode: string;
    /** Start date in YYYY-MM-DD format. */
    startDate: string;
    /** End date in YYYY-MM-DD format. */
    endDate: string;
    clientFirstName: string;
    clientLastName: string;
    dogName: string;
    breed: string;
    /** Age split in years and months. Combined validation: 5 months .. 12 years. */
    ageYears: number;
    ageMonths: number;
    /** Requested hours per day. Allowed values: 2, 4, 6, 8, 12. */
    hoursPerDay: number;
    status: DogDaycareStatus;
    /** Optional assignment to an existing pet seater. */
    petSeaterId?: string;
    /** Optional uploaded pet photo (data URL/base64). */
    petPhotoUrl?: string;
    /** Snapshot of selected pet seater name (empty when unassigned). */
    petSeaterName: string;
    notes: string;
    /** Snapshot: hourly daycare tariff × hours. */
    price: number;
    currency: PetShipCurrency;
};
