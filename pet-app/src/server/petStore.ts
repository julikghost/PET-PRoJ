import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type {
    BookingBillingCurrency,
    BookingPaymentMethod,
    BookingRecord,
    DogDaycareRecord,
    DogDaycareStatus,
    PetSeaterRecord,
    PetShipCurrency,
    PetShipRecord,
    PointKind,
    PointRecord,
} from '../types/petLogistics';
import { computeBookingPrice, computeDogDaycarePrice, normalizeDogDaycareHoursPerDay } from '../utils/pricing';

dayjs.extend(customParseFormat);

export type PetMoverRow = {
    id: string;
    name: string;
    code: string;
    active: boolean;
    currency: PetShipCurrency;
    cars: string;
    drivers: string;
};

export type StoreState = {
    points: PointRecord[];
    petShips: PetShipRecord[];
    bookings: BookingRecord[];
    dogDaycares: DogDaycareRecord[];
    petSeaters: PetSeaterRecord[];
    petMovers: PetMoverRow[];
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

const DAYCARE_DATE_FMT = 'YYYY-MM-DD';

function makeId (prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeDogDaycareStatus (raw: unknown): DogDaycareStatus {
    if (raw === 'scheduled' || raw === 'checked-in' || raw === 'active' || raw === 'checked-out') {
        return raw;
    }
    return 'scheduled';
}

function normalizeDogAge (yearsRaw: unknown, monthsRaw: unknown): { ageYears: number; ageMonths: number } {
    let ageYears = Number.isFinite(Number(yearsRaw)) ? Math.max(0, Math.floor(Number(yearsRaw))) : 0;
    let ageMonths = Number.isFinite(Number(monthsRaw)) ? Math.max(0, Math.floor(Number(monthsRaw))) : 0;
    if (ageMonths >= 12) {
        ageYears += Math.floor(ageMonths / 12);
        ageMonths %= 12;
    }
    const totalAgeMonths = ageYears * 12 + ageMonths;
    if (totalAgeMonths < 5 || totalAgeMonths > 12 * 12) {
        return { ageYears: -1, ageMonths: -1 };
    }

    return { ageYears, ageMonths };
}

export class PetStore {
    private state: StoreState = {
        points: [],
        petShips: [],
        bookings: [],
        dogDaycares: [],
        petSeaters: [],
        petMovers: [],
    };

    snapshot (): StoreState {
        return JSON.parse(JSON.stringify(this.state)) as StoreState;
    }

    replaceAll (next: Partial<StoreState>): StoreState {
        this.state = {
            points: next.points ?? [],
            petShips: next.petShips ?? [],
            bookings: next.bookings ?? [],
            dogDaycares: next.dogDaycares ?? [],
            petSeaters: next.petSeaters ?? [],
            petMovers: next.petMovers ?? [],
        };
        return this.snapshot();
    }

    reset (): StoreState {
        this.state = {
            points: [],
            petShips: [],
            bookings: [],
            dogDaycares: [],
            petSeaters: [],
            petMovers: [],
        };
        return this.snapshot();
    }

    listPoints (): PointRecord[] {
        return this.snapshot().points;
    }

    upsertPoint (row: Omit<PointRecord, 'id'> & { id?: string }): Result<PointRecord> {
        const full: PointRecord = {
            id: row.id ?? makeId('pt'),
            code: String(row.code ?? '').trim(),
            name: String(row.name ?? '').trim(),
            city: String(row.city ?? '').trim(),
            kind: (row.kind as PointKind) ?? 'hub',
        };
        if (!full.code || !full.name || !full.city) {
            return { ok: false, error: 'Point code, name and city are required', status: 400 };
        }
        const dup = this.state.points.some((p) => p.id !== full.id && p.code.trim().toLowerCase() === full.code.toLowerCase());
        if (dup) {
            return { ok: false, error: 'Point code must be unique', status: 400 };
        }
        const exists = this.state.points.some((p) => p.id === full.id);
        this.state.points = exists
            ? this.state.points.map((p) => (p.id === full.id ? full : p))
            : [...this.state.points, full];
        return { ok: true, data: full };
    }

    deletePoint (id: string): Result<{ id: string }> {
        const used = this.state.petShips.some((s) => s.fromPointId === id || s.toPointId === id);
        if (used) {
            return { ok: false, error: 'Cannot delete: point is used in a pet ship', status: 400 };
        }
        this.state.points = this.state.points.filter((p) => p.id !== id);
        return { ok: true, data: { id } };
    }

    listPetShips (): PetShipRecord[] {
        return this.snapshot().petShips;
    }

    upsertPetShip (row: Omit<PetShipRecord, 'id'> & { id?: string }): Result<PetShipRecord> {
        const full: PetShipRecord = {
            id: row.id ?? makeId('mv'),
            refCode: String(row.refCode ?? '').trim(),
            fromPointId: String(row.fromPointId ?? ''),
            toPointId: String(row.toPointId ?? ''),
            departure: String(row.departure ?? '').trim(),
            arrival: String(row.arrival ?? '').trim(),
            petMover: String(row.petMover ?? '').trim(),
            currency: row.currency === 'USD' ? 'USD' : 'EUR',
            cars: String(row.cars ?? '').trim(),
            drivers: String(row.drivers ?? '').trim(),
            status: row.status,
        };
        if (!this.state.points.some((p) => p.id === full.fromPointId) || !this.state.points.some((p) => p.id === full.toPointId)) {
            return { ok: false, error: 'From and To must be existing points', status: 400 };
        }
        if (full.fromPointId === full.toPointId) {
            return { ok: false, error: 'From and To must differ', status: 400 };
        }
        const dup = this.state.petShips.some((s) => s.id !== full.id && s.refCode.trim().toLowerCase() === full.refCode.toLowerCase());
        if (dup) {
            return { ok: false, error: 'Pet ship ref must be unique', status: 400 };
        }
        const exists = this.state.petShips.some((s) => s.id === full.id);
        this.state.petShips = exists
            ? this.state.petShips.map((s) => (s.id === full.id ? full : s))
            : [...this.state.petShips, full];
        return { ok: true, data: full };
    }

    deletePetShip (id: string): Result<{ id: string }> {
        const used = this.state.bookings.some((b) => b.petShipId === id);
        if (used) {
            return { ok: false, error: 'Cannot delete: pet ship is used in a booking', status: 400 };
        }
        this.state.petShips = this.state.petShips.filter((s) => s.id !== id);
        return { ok: true, data: { id } };
    }

    listBookings (): BookingRecord[] {
        return this.snapshot().bookings;
    }

    upsertBooking (
        row: Omit<BookingRecord, 'id' | 'price' | 'currency' | 'billingCurrency'> & { id?: string }
    ): Result<BookingRecord> {
        const ship = this.state.petShips.find((s) => s.id === row.petShipId);
        if (!ship) {
            return { ok: false, error: 'Select a valid pet ship', status: 400 };
        }
        const petLabels = row.petLabels.map((s) => s.trim()).filter(Boolean);
        if (petLabels.length === 0) {
            return { ok: false, error: 'Select at least one species', status: 400 };
        }
        const clientFirstName = String(row.clientFirstName ?? '').trim();
        const clientLastName = String(row.clientLastName ?? '').trim();
        if (!clientFirstName || !clientLastName) {
            return { ok: false, error: 'Client first name and last name are required', status: 400 };
        }
        const id = row.id ?? makeId('bk');
        const full: BookingRecord = {
            id,
            refCode: String(row.refCode ?? '').trim(),
            petShipId: row.petShipId,
            date: row.date,
            clientFirstName,
            clientLastName,
            petLabels,
            weightKg: Number(row.weightKg),
            price: computeBookingPrice(Number(row.weightKg), ship.currency, ship.departure, ship.arrival),
            currency: ship.currency,
            paymentMethod: (row.paymentMethod as BookingPaymentMethod) ?? 'card',
            billingCurrency: ship.currency === 'USD' ? 'cur-usd' : 'cur-eur',
        };
        const existing = this.state.bookings.find((b) => b.id === id);
        const bookable = ship.status === 'planned' || ship.status === 'active';
        const sameShipKeep = existing?.petShipId === full.petShipId;
        if (!bookable && !sameShipKeep) {
            return { ok: false, error: 'Pet ship must be planned or active to book', status: 400 };
        }
        const dup = this.state.bookings.some((b) => b.id !== id && b.refCode.trim().toLowerCase() === full.refCode.toLowerCase());
        if (dup) {
            return { ok: false, error: 'Booking ref must be unique', status: 400 };
        }
        const exists = this.state.bookings.some((b) => b.id === id);
        this.state.bookings = exists
            ? this.state.bookings.map((b) => (b.id === id ? full : b))
            : [...this.state.bookings, full];
        return { ok: true, data: full };
    }

    deleteBooking (id: string): Result<{ id: string }> {
        this.state.bookings = this.state.bookings.filter((b) => b.id !== id);
        return { ok: true, data: { id } };
    }

    listPetSeaters (): PetSeaterRecord[] {
        return this.snapshot().petSeaters;
    }

    upsertPetSeater (row: Omit<PetSeaterRecord, 'id'> & { id?: string }): Result<PetSeaterRecord> {
        const full: PetSeaterRecord = {
            id: row.id ?? makeId('ps'),
            code: String(row.code ?? '').trim(),
            name: String(row.name ?? '').trim(),
            phone: String(row.phone ?? '').trim(),
            active: row.active !== false,
        };
        if (!full.code || !full.name) {
            return { ok: false, error: 'Pet seater code and name are required', status: 400 };
        }
        const dup = this.state.petSeaters.some((s) => s.id !== full.id && s.code.trim().toLowerCase() === full.code.toLowerCase());
        if (dup) {
            return { ok: false, error: 'Pet seater code must be unique', status: 400 };
        }
        const exists = this.state.petSeaters.some((s) => s.id === full.id);
        this.state.petSeaters = exists
            ? this.state.petSeaters.map((s) => (s.id === full.id ? full : s))
            : [...this.state.petSeaters, full];
        this.state.dogDaycares = this.state.dogDaycares.map((d) => (
            d.petSeaterId === full.id ? { ...d, petSeaterName: full.name } : d
        ));
        return { ok: true, data: full };
    }

    deletePetSeater (id: string): Result<{ id: string }> {
        const used = this.state.dogDaycares.some((d) => d.petSeaterId === id);
        if (used) {
            return { ok: false, error: 'Cannot delete: pet seater is assigned in dog daycare', status: 400 };
        }
        this.state.petSeaters = this.state.petSeaters.filter((s) => s.id !== id);
        return { ok: true, data: { id } };
    }

    listDogDaycares (): DogDaycareRecord[] {
        return this.snapshot().dogDaycares;
    }

    upsertDogDaycare (row: Omit<DogDaycareRecord, 'id' | 'petSeaterName' | 'price'> & { id?: string }): Result<DogDaycareRecord> {
        const id = row.id ?? makeId('dc');
        const refCode = String(row.refCode ?? '').trim();
        if (!refCode) return { ok: false, error: 'Daycare ref is required', status: 400 };
        const dup = this.state.dogDaycares.some((d) => d.id !== id && d.refCode.trim().toLowerCase() === refCode.toLowerCase());
        if (dup) return { ok: false, error: 'Daycare ref must be unique', status: 400 };

        const bookingRefCode = String(row.bookingRefCode ?? '').trim();
        if (!bookingRefCode) return { ok: false, error: 'Daycare booking ref is required', status: 400 };
        const startDate = String(row.startDate ?? '').trim();
        const endDate = String(row.endDate ?? '').trim();
        if (!startDate || !endDate) return { ok: false, error: 'Start date and end date are required', status: 400 };
        const start = dayjs(startDate, DAYCARE_DATE_FMT, true);
        const end = dayjs(endDate, DAYCARE_DATE_FMT, true);
        if (!start.isValid() || !end.isValid()) return { ok: false, error: 'Start and end dates must have YYYY-MM-DD format', status: 400 };
        if (end.isBefore(start, 'day')) return { ok: false, error: 'End date must be equal to or after start date', status: 400 };

        const clientFirstName = String(row.clientFirstName ?? '').trim();
        const clientLastName = String(row.clientLastName ?? '').trim();
        if (!clientFirstName || !clientLastName) return { ok: false, error: 'Client first name and last name are required', status: 400 };

        const dogName = String(row.dogName ?? '').trim();
        const breed = String(row.breed ?? '').trim();
        if (!dogName) return { ok: false, error: 'Dog name is required', status: 400 };
        if (!breed) return { ok: false, error: 'Breed is required', status: 400 };

        const age = normalizeDogAge(row.ageYears, row.ageMonths);
        if (age.ageYears < 0) return { ok: false, error: 'Age must be between 5 months and 12 years', status: 400 };

        const petSeaterId = typeof row.petSeaterId === 'string' && row.petSeaterId.trim() ? row.petSeaterId.trim() : undefined;
        const petSeater = petSeaterId ? this.state.petSeaters.find((x) => x.id === petSeaterId) : undefined;
        if (petSeaterId && !petSeater) return { ok: false, error: 'Selected pet seater does not exist', status: 400 };

        const hoursPerDay = normalizeDogDaycareHoursPerDay(row.hoursPerDay);
        const status = normalizeDogDaycareStatus(row.status);
        const currency: PetShipCurrency = row.currency === 'USD' ? 'USD' : 'EUR';
        const petPhotoUrl = typeof row.petPhotoUrl === 'string' && row.petPhotoUrl.trim() ? row.petPhotoUrl : undefined;
        const full: DogDaycareRecord = {
            id,
            refCode,
            bookingRefCode,
            startDate,
            endDate,
            clientFirstName,
            clientLastName,
            dogName,
            breed,
            ageYears: age.ageYears,
            ageMonths: age.ageMonths,
            hoursPerDay,
            status,
            petSeaterId: petSeater?.id,
            petPhotoUrl,
            petSeaterName: petSeater?.name ?? '',
            notes: String(row.notes ?? '').trim(),
            price: computeDogDaycarePrice(currency, hoursPerDay, startDate, endDate),
            currency,
        };
        const exists = this.state.dogDaycares.some((d) => d.id === id);
        this.state.dogDaycares = exists
            ? this.state.dogDaycares.map((d) => (d.id === id ? full : d))
            : [...this.state.dogDaycares, full];
        return { ok: true, data: full };
    }

    deleteDogDaycare (id: string): Result<{ id: string }> {
        this.state.dogDaycares = this.state.dogDaycares.filter((d) => d.id !== id);
        return { ok: true, data: { id } };
    }

    listPetMovers (): PetMoverRow[] {
        return this.snapshot().petMovers;
    }

    replacePetMovers (rows: PetMoverRow[]): PetMoverRow[] {
        this.state.petMovers = rows;
        return this.snapshot().petMovers;
    }

    upsertPetMover (row: Omit<PetMoverRow, 'id'> & { id?: string }): Result<PetMoverRow> {
        const full: PetMoverRow = {
            id: row.id ?? makeId('pm'),
            name: String(row.name ?? '').trim(),
            code: String(row.code ?? '').trim(),
            active: row.active !== false,
            currency: row.currency === 'USD' ? 'USD' : 'EUR',
            cars: String(row.cars ?? '').trim(),
            drivers: String(row.drivers ?? '').trim(),
        };
        if (!full.name || !full.code) {
            return { ok: false, error: 'PetMover name and code are required', status: 400 };
        }
        const dup = this.state.petMovers.some((m) => m.id !== full.id && m.code.trim().toLowerCase() === full.code.toLowerCase());
        if (dup) {
            return { ok: false, error: 'PetMover code must be unique', status: 400 };
        }
        const exists = this.state.petMovers.some((m) => m.id === full.id);
        this.state.petMovers = exists
            ? this.state.petMovers.map((m) => (m.id === full.id ? full : m))
            : [...this.state.petMovers, full];
        return { ok: true, data: full };
    }

    deletePetMover (id: string): Result<{ id: string }> {
        this.state.petMovers = this.state.petMovers.filter((m) => m.id !== id);
        return { ok: true, data: { id } };
    }
}

