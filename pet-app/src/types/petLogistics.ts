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
    /** Booking date in YYYY-MM-DD format for daycare planning. */
    bookingDate: string;
    dogName: string;
    dogWeightKg: number;
    /** Requested daycare duration in hours, clamped to 1..12. */
    hours: number;
    status: DogDaycareStatus;
    /** Optional assignment to an existing pet seater. */
    petSeaterId?: string;
    /** Snapshot of selected pet seater name (empty when unassigned). */
    petSeaterName: string;
    notes: string;
    /** Snapshot: hourly daycare tariff × hours. */
    price: number;
    currency: PetShipCurrency;
};
