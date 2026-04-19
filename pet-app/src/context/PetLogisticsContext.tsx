import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { toast } from '../petToast';
import type {
    BookingBillingCurrency,
    BookingPaymentMethod,
    BookingRecord,
    DogDaycareRecord,
    DogDaycareStatus,
    PetSeaterRecord,
    PetShipCurrency,
    PetShipRecord,
    PointRecord,
} from '../types/petLogistics';
import {
    computeBookingPrice,
    computeDogDaycarePrice,
    normalizeDogDaycareHours,
    petShipScheduleValidationMessage,
} from '../utils/pricing';

export const PET_LOGISTICS_STORAGE_KEY = 'pet-logistics-v1';

type StoreState = {
    points: PointRecord[];
    petShips: PetShipRecord[];
    bookings: BookingRecord[];
    dogDaycares: DogDaycareRecord[];
    petSeaters: PetSeaterRecord[];
};

const DOG_DAYCARE_STATUSES: readonly DogDaycareStatus[] = [
    'scheduled',
    'checked-in',
    'active',
    'checked-out',
];

const emptyState = (): StoreState => ({
    points: [],
    petShips: [],
    bookings: [],
    dogDaycares: [],
    petSeaters: [],
});

function normalizePetShip (raw: unknown): PetShipRecord | null {
    if (raw === null || typeof raw !== 'object') {
        return null;
    }
    const s = raw as Record<string, unknown>;
    if (
        typeof s.id !== 'string'
        || typeof s.refCode !== 'string'
        || typeof s.fromPointId !== 'string'
        || typeof s.toPointId !== 'string'
        || typeof s.departure !== 'string'
        || typeof s.arrival !== 'string'
        || typeof s.petMover !== 'string'
        || typeof s.status !== 'string'
    ) {
        return null;
    }
    const currency: PetShipCurrency = s.currency === 'USD' ? 'USD' : 'EUR';
    if (s.status !== 'planned' && s.status !== 'active' && s.status !== 'done') {
        return null;
    }
    const cars = typeof s.cars === 'string' ? s.cars : '';
    const drivers = typeof s.drivers === 'string' ? s.drivers : '';

    return {
        id: s.id,
        refCode: s.refCode,
        fromPointId: s.fromPointId,
        toPointId: s.toPointId,
        departure: s.departure,
        arrival: s.arrival,
        petMover: s.petMover,
        currency,
        cars,
        drivers,
        status: s.status,
    };
}

function parseStoredPetLabels (b: Record<string, unknown>): string[] | null {
    if (Array.isArray(b.petLabels)) {
        const arr = b.petLabels
            .filter((x): x is string => typeof x === 'string')
            .map((s) => s.trim())
            .filter(Boolean);

        return arr.length > 0 ? arr : null;
    }
    if (typeof b.petLabel === 'string' && b.petLabel.trim()) {
        return [b.petLabel.trim()];
    }

    return null;
}

function normalizeDogDaycareStatus (raw: unknown): DogDaycareStatus {
    if (typeof raw === 'string' && DOG_DAYCARE_STATUSES.includes(raw as DogDaycareStatus)) {
        return raw as DogDaycareStatus;
    }

    return 'scheduled';
}

function normalizeBooking (raw: unknown, petShips: PetShipRecord[]): BookingRecord | null {
    if (raw === null || typeof raw !== 'object') {
        return null;
    }
    const b = raw as Record<string, unknown>;
    const petLabels = parseStoredPetLabels(b);
    if (
        typeof b.id !== 'string'
        || typeof b.refCode !== 'string'
        || typeof b.petShipId !== 'string'
        || typeof b.date !== 'string'
        || petLabels === null
        || typeof b.weightKg !== 'number'
    ) {
        return null;
    }
    const ship = petShips.find((x) => x.id === b.petShipId);
    const currency: PetShipCurrency =
        b.currency === 'USD' || b.currency === 'EUR' ? b.currency : ship?.currency ?? 'EUR';
    const price = ship
        ? computeBookingPrice(b.weightKg, ship.currency, ship.departure, ship.arrival)
        : typeof b.price === 'number' && !Number.isNaN(b.price)
            ? b.price
            : 0;
    const paymentMethod: BookingPaymentMethod =
        b.paymentMethod === 'card' || b.paymentMethod === 'cash' || b.paymentMethod === 'petpay'
            ? b.paymentMethod
            : 'card';
    const billingCurrency: BookingBillingCurrency = ship
        ? ship.currency === 'USD'
            ? 'cur-usd'
            : 'cur-eur'
        : b.billingCurrency === 'cur-usd' || b.billingCurrency === 'cur-eur'
            ? b.billingCurrency
            : 'cur-eur';

    return {
        id: b.id,
        refCode: b.refCode,
        petShipId: b.petShipId,
        date: b.date,
        petLabels,
        weightKg: b.weightKg,
        price,
        currency,
        paymentMethod,
        billingCurrency,
    };
}

function normalizePetSeater (raw: unknown): PetSeaterRecord | null {
    if (raw === null || typeof raw !== 'object') {
        return null;
    }
    const s = raw as Record<string, unknown>;
    if (typeof s.id !== 'string' || typeof s.code !== 'string' || typeof s.name !== 'string') {
        return null;
    }

    return {
        id: s.id,
        code: s.code.trim(),
        name: s.name.trim(),
        phone: typeof s.phone === 'string' ? s.phone.trim() : '',
        active: s.active !== false,
    };
}

function normalizeDogDaycare (raw: unknown, petSeaters: PetSeaterRecord[]): DogDaycareRecord | null {
    if (raw === null || typeof raw !== 'object') {
        return null;
    }
    const d = raw as Record<string, unknown>;
    if (typeof d.id !== 'string' || typeof d.refCode !== 'string' || typeof d.hours !== 'number') {
        return null;
    }
    const bookingRefCode = typeof d.bookingRefCode === 'string'
        ? d.bookingRefCode.trim()
        : typeof d.bookingId === 'string'
            ? d.bookingId.trim()
            : '';
    const bookingDate = typeof d.bookingDate === 'string'
        ? d.bookingDate.trim()
        : typeof d.date === 'string'
            ? d.date.trim()
            : '';
    const dogName = typeof d.dogName === 'string' && d.dogName.trim() ? d.dogName.trim() : 'Dog';
    const dogWeightKg = typeof d.dogWeightKg === 'number' && Number.isFinite(d.dogWeightKg)
        ? d.dogWeightKg
        : typeof d.weightKg === 'number' && Number.isFinite(d.weightKg)
            ? d.weightKg
            : 10;
    const currency: PetShipCurrency = d.currency === 'USD' ? 'USD' : 'EUR';
    const hours = normalizeDogDaycareHours(d.hours);
    const status = normalizeDogDaycareStatus(d.status);
    const notes = typeof d.notes === 'string' ? d.notes.trim() : '';
    const petSeaterId = typeof d.petSeaterId === 'string' && d.petSeaterId.trim()
        ? d.petSeaterId.trim()
        : undefined;
    const petSeater = petSeaterId ? petSeaters.find((x) => x.id === petSeaterId) : undefined;

    return {
        id: d.id,
        refCode: d.refCode.trim(),
        bookingRefCode,
        bookingDate,
        dogName,
        dogWeightKg,
        hours,
        status,
        petSeaterId: petSeater?.id,
        petSeaterName: petSeater?.name ?? '',
        notes,
        price: computeDogDaycarePrice(dogWeightKg, currency, hours),
        currency,
    };
}

function loadState (): StoreState {
    try {
        const raw = localStorage.getItem(PET_LOGISTICS_STORAGE_KEY);
        if (!raw) {
            return emptyState();
        }
        const p = JSON.parse(raw) as Partial<StoreState>;
        const points = Array.isArray(p.points) ? p.points : [];
        const petShipsRaw = Array.isArray(p.petShips) ? p.petShips : [];
        const petShips = petShipsRaw.map(normalizePetShip).filter((x): x is PetShipRecord => x !== null);
        const bookingsRaw = Array.isArray(p.bookings) ? p.bookings : [];
        const bookings = bookingsRaw
            .map((row) => normalizeBooking(row, petShips))
            .filter((x): x is BookingRecord => x !== null);
        const petSeatersRaw = Array.isArray(p.petSeaters) ? p.petSeaters : [];
        const petSeaters = petSeatersRaw
            .map((row) => normalizePetSeater(row))
            .filter((x): x is PetSeaterRecord => x !== null);
        const dogDaycaresRaw = Array.isArray(p.dogDaycares) ? p.dogDaycares : [];
        const dogDaycares = dogDaycaresRaw
            .map((row) => normalizeDogDaycare(row, petSeaters))
            .filter((x): x is DogDaycareRecord => x !== null);

        return {
            points,
            petShips,
            bookings,
            dogDaycares,
            petSeaters,
        };
    } catch {
        return emptyState();
    }
}

function newPointId (): string {
    return `pt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newShipId (): string {
    return `mv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newBookingId (): string {
    return `bk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newDogDaycareId (): string {
    return `dc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newPetSeaterId (): string {
    return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type PetLogisticsContextValue = {
    points: PointRecord[];
    petShips: PetShipRecord[];
    bookings: BookingRecord[];
    dogDaycares: DogDaycareRecord[];
    petSeaters: PetSeaterRecord[];
    activePetSeaters: PetSeaterRecord[];
    pointOptionLabel: (p: PointRecord) => string;
    petShipOptionLabel: (ship: PetShipRecord) => string;
    petShipRouteText: (ship: PetShipRecord) => string;
    petSeaterOptionLabel: (petSeater: PetSeaterRecord) => string;
    getPoint: (id: string) => PointRecord | undefined;
    bookablePetShips: PetShipRecord[];
    upsertPoint: (row: Omit<PointRecord, 'id'> & { id?: string }) => boolean;
    deletePoint: (id: string) => boolean;
    upsertPetShip: (row: Omit<PetShipRecord, 'id'> & { id?: string }) => boolean;
    deletePetShip: (id: string) => boolean;
    upsertBooking: (
        row: Omit<BookingRecord, 'id' | 'price' | 'currency' | 'billingCurrency'> & { id?: string }
    ) => boolean;
    deleteBooking: (id: string) => void;
    upsertDogDaycare: (
        row: Omit<DogDaycareRecord, 'id' | 'petSeaterName' | 'price'> & { id?: string }
    ) => boolean;
    deleteDogDaycare: (id: string) => void;
    upsertPetSeater: (row: Omit<PetSeaterRecord, 'id'> & { id?: string }) => boolean;
    deletePetSeater: (id: string) => boolean;
};

const PetLogisticsContext = createContext<PetLogisticsContextValue | null>(null);

export function PetLogisticsProvider ({ children }: { children: ReactNode }): JSX.Element {
    const [state, setState] = useState<StoreState>(loadState);

    useEffect(() => {
        localStorage.setItem(PET_LOGISTICS_STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    const getPoint = useCallback(
        (id: string) => state.points.find((p) => p.id === id),
        [state.points]
    );

    const pointOptionLabel = useCallback((p: PointRecord) => `${p.name} (${p.code})`, []);

    const petShipRouteText = useCallback(
        (ship: PetShipRecord) => {
            const a = getPoint(ship.fromPointId);
            const b = getPoint(ship.toPointId);
            const left = a ? a.name : '?';
            const right = b ? b.name : '?';

            return `${left} → ${right}`;
        },
        [getPoint]
    );

    const petShipOptionLabel = useCallback(
        (ship: PetShipRecord) => `${ship.refCode} — ${petShipRouteText(ship)}`,
        [petShipRouteText]
    );

    const petSeaterOptionLabel = useCallback(
        (petSeater: PetSeaterRecord) => `${petSeater.name} (${petSeater.code})`,
        []
    );

    const bookablePetShips = useMemo(
        () => state.petShips.filter((s) => s.status === 'planned' || s.status === 'active'),
        [state.petShips]
    );

    const activePetSeaters = useMemo(
        () => state.petSeaters.filter((x) => x.active),
        [state.petSeaters]
    );

    const upsertPoint = useCallback((row: Omit<PointRecord, 'id'> & { id?: string }): boolean => {
        const id = row.id ?? newPointId();
        const full: PointRecord = {
            id,
            code: row.code.trim(),
            name: row.name.trim(),
            city: row.city.trim(),
            kind: row.kind,
        };
        let accepted = false;
        setState((prev) => {
            const codeNorm = full.code.trim().toLowerCase();
            const dup = prev.points.some(
                (p) => p.id !== full.id && p.code.trim().toLowerCase() === codeNorm
            );
            if (dup) {
                toast.error('Point code must be unique');

                return prev;
            }
            accepted = true;
            const exists = prev.points.some((p) => p.id === full.id);
            const points = exists
                ? prev.points.map((p) => (p.id === full.id ? full : p))
                : [...prev.points, full];

            return { ...prev, points };
        });

        return accepted;
    }, []);

    const deletePoint = useCallback((id: string): boolean => {
        let accepted = false;
        setState((prev) => {
            const used = prev.petShips.some((s) => s.fromPointId === id || s.toPointId === id);
            if (used) {
                toast.error('Cannot delete: point is used in a pet ship');

                return prev;
            }
            accepted = true;

            return { ...prev, points: prev.points.filter((p) => p.id !== id) };
        });

        return accepted;
    }, []);

    const upsertPetShip = useCallback(
        (row: Omit<PetShipRecord, 'id'> & { id?: string }): boolean => {
            const id = row.id ?? newShipId();
            const full: PetShipRecord = {
                id,
                refCode: row.refCode.trim(),
                fromPointId: row.fromPointId,
                toPointId: row.toPointId,
                departure: row.departure.trim(),
                arrival: row.arrival.trim(),
                petMover: row.petMover.trim(),
                currency: row.currency === 'USD' ? 'USD' : 'EUR',
                cars: typeof row.cars === 'string' ? row.cars.trim() : '',
                drivers: typeof row.drivers === 'string' ? row.drivers.trim() : '',
                status: row.status,
            };
            let accepted = false;
            setState((prev) => {
                const fp = prev.points.some((p) => p.id === full.fromPointId);
                const tp = prev.points.some((p) => p.id === full.toPointId);
                if (!fp || !tp) {
                    toast.error('From and To must be existing points');

                    return prev;
                }
                if (full.fromPointId === full.toPointId) {
                    toast.error('From and To must differ');

                    return prev;
                }
                const scheduleErr = petShipScheduleValidationMessage(full.departure, full.arrival);
                if (scheduleErr) {
                    toast.error(scheduleErr);

                    return prev;
                }
                const refNorm = full.refCode.trim().toLowerCase();
                const dup = prev.petShips.some(
                    (s) => s.id !== full.id && s.refCode.trim().toLowerCase() === refNorm
                );
                if (dup) {
                    toast.error('Pet ship ref must be unique');

                    return prev;
                }
                accepted = true;
                const exists = prev.petShips.some((s) => s.id === full.id);
                const petShips = exists
                    ? prev.petShips.map((s) => (s.id === full.id ? full : s))
                    : [...prev.petShips, full];

                return { ...prev, petShips };
            });

            return accepted;
        },
        []
    );

    const deletePetShip = useCallback((id: string): boolean => {
        let accepted = false;
        setState((prev) => {
            const used = prev.bookings.some((b) => b.petShipId === id);
            if (used) {
                toast.error('Cannot delete: pet ship is used in a booking');

                return prev;
            }
            accepted = true;

            return { ...prev, petShips: prev.petShips.filter((s) => s.id !== id) };
        });

        return accepted;
    }, []);

    const upsertBooking = useCallback(
        (
            row: Omit<BookingRecord, 'id' | 'price' | 'currency' | 'billingCurrency'> & { id?: string }
        ): boolean => {
            const id = row.id ?? newBookingId();
            let accepted = false;
            setState((prev) => {
                const ship = prev.petShips.find((s) => s.id === row.petShipId);
                if (!ship) {
                    toast.error('Select a valid pet ship');

                    return prev;
                }
                const paymentMethod: BookingPaymentMethod =
                    row.paymentMethod === 'card' || row.paymentMethod === 'cash' || row.paymentMethod === 'petpay'
                        ? row.paymentMethod
                        : 'card';
                const billingCurrency: BookingBillingCurrency = ship.currency === 'USD' ? 'cur-usd' : 'cur-eur';
                const petLabels = row.petLabels.map((s) => s.trim()).filter(Boolean);
                if (petLabels.length === 0) {
                    toast.error('Select at least one species');

                    return prev;
                }
                const full: BookingRecord = {
                    id,
                    refCode: row.refCode.trim(),
                    petShipId: row.petShipId,
                    date: row.date,
                    petLabels,
                    weightKg: row.weightKg,
                    price: computeBookingPrice(row.weightKg, ship.currency, ship.departure, ship.arrival),
                    currency: ship.currency,
                    paymentMethod,
                    billingCurrency,
                };
                const existing = prev.bookings.find((b) => b.id === id);
                const bookable = ship.status === 'planned' || ship.status === 'active';
                const sameShipKeep = existing?.petShipId === full.petShipId;
                if (!bookable && !sameShipKeep) {
                    toast.error('Pet ship must be planned or active to book');

                    return prev;
                }
                const refNorm = full.refCode.trim().toLowerCase();
                const dup = prev.bookings.some(
                    (b) => b.id !== id && b.refCode.trim().toLowerCase() === refNorm
                );
                if (dup) {
                    toast.error('Booking ref must be unique');

                    return prev;
                }
                accepted = true;
                const exists = prev.bookings.some((b) => b.id === id);
                const bookings = exists
                    ? prev.bookings.map((b) => (b.id === id ? full : b))
                    : [...prev.bookings, full];

                return { ...prev, bookings };
            });

            return accepted;
        },
        []
    );

    const deleteBooking = useCallback((id: string) => {
        setState((prev) => ({
            ...prev,
            bookings: prev.bookings.filter((b) => b.id !== id),
        }));
    }, []);

    const upsertPetSeater = useCallback((row: Omit<PetSeaterRecord, 'id'> & { id?: string }): boolean => {
        const id = row.id ?? newPetSeaterId();
        const full: PetSeaterRecord = {
            id,
            code: row.code.trim(),
            name: row.name.trim(),
            phone: row.phone.trim(),
            active: row.active,
        };
        let accepted = false;
        setState((prev) => {
            if (!full.code || !full.name) {
                toast.error('Pet seater code and name are required');

                return prev;
            }
            const codeNorm = full.code.toLowerCase();
            const dup = prev.petSeaters.some(
                (s) => s.id !== full.id && s.code.trim().toLowerCase() === codeNorm
            );
            if (dup) {
                toast.error('Pet seater code must be unique');

                return prev;
            }
            accepted = true;
            const exists = prev.petSeaters.some((s) => s.id === full.id);
            const petSeaters = exists
                ? prev.petSeaters.map((s) => (s.id === full.id ? full : s))
                : [...prev.petSeaters, full];
            const dogDaycares = prev.dogDaycares.map((d) => (
                d.petSeaterId === full.id
                    ? { ...d, petSeaterName: full.name }
                    : d
            ));

            return { ...prev, petSeaters, dogDaycares };
        });

        return accepted;
    }, []);

    const deletePetSeater = useCallback((id: string): boolean => {
        let accepted = false;
        setState((prev) => {
            const used = prev.dogDaycares.some((d) => d.petSeaterId === id);
            if (used) {
                toast.error('Cannot delete: pet seater is assigned in dog daycare');

                return prev;
            }
            accepted = true;

            return { ...prev, petSeaters: prev.petSeaters.filter((s) => s.id !== id) };
        });

        return accepted;
    }, []);

    const upsertDogDaycare = useCallback(
        (
            row: Omit<DogDaycareRecord, 'id' | 'petSeaterName' | 'price'> & { id?: string }
        ): boolean => {
            const id = row.id ?? newDogDaycareId();
            let accepted = false;
            setState((prev) => {
                const refCode = row.refCode.trim();
                if (!refCode) {
                    toast.error('Daycare ref is required');

                    return prev;
                }
                const refNorm = refCode.toLowerCase();
                const dup = prev.dogDaycares.some(
                    (d) => d.id !== id && d.refCode.trim().toLowerCase() === refNorm
                );
                if (dup) {
                    toast.error('Daycare ref must be unique');

                    return prev;
                }
                const bookingRefCode = row.bookingRefCode.trim();
                if (!bookingRefCode) {
                    toast.error('Daycare booking ref is required');

                    return prev;
                }
                const bookingDate = row.bookingDate.trim();
                if (!bookingDate) {
                    toast.error('Daycare booking date is required');

                    return prev;
                }
                const dogName = row.dogName.trim();
                if (!dogName) {
                    toast.error('Dog name is required');

                    return prev;
                }
                const dogWeightKg = Number(row.dogWeightKg);
                if (!Number.isFinite(dogWeightKg) || dogWeightKg <= 0) {
                    toast.error('Dog weight must be greater than 0');

                    return prev;
                }
                const petSeaterId = typeof row.petSeaterId === 'string' && row.petSeaterId.trim()
                    ? row.petSeaterId.trim()
                    : undefined;
                const petSeater = petSeaterId
                    ? prev.petSeaters.find((x) => x.id === petSeaterId)
                    : undefined;
                if (petSeaterId && !petSeater) {
                    toast.error('Selected pet seater does not exist');

                    return prev;
                }
                const hours = normalizeDogDaycareHours(row.hours);
                const status = normalizeDogDaycareStatus(row.status);
                const currency: PetShipCurrency = row.currency === 'USD' ? 'USD' : 'EUR';
                const full: DogDaycareRecord = {
                    id,
                    refCode,
                    bookingRefCode,
                    bookingDate,
                    dogName,
                    dogWeightKg,
                    hours,
                    status,
                    petSeaterId: petSeater?.id,
                    petSeaterName: petSeater?.name ?? '',
                    notes: row.notes.trim(),
                    price: computeDogDaycarePrice(dogWeightKg, currency, hours),
                    currency,
                };
                accepted = true;
                const exists = prev.dogDaycares.some((d) => d.id === id);
                const dogDaycares = exists
                    ? prev.dogDaycares.map((d) => (d.id === id ? full : d))
                    : [...prev.dogDaycares, full];

                return { ...prev, dogDaycares };
            });

            return accepted;
        },
        []
    );

    const deleteDogDaycare = useCallback((id: string) => {
        setState((prev) => ({
            ...prev,
            dogDaycares: prev.dogDaycares.filter((d) => d.id !== id),
        }));
    }, []);

    const value = useMemo<PetLogisticsContextValue>(
        () => ({
            points: state.points,
            petShips: state.petShips,
            bookings: state.bookings,
            dogDaycares: state.dogDaycares,
            petSeaters: state.petSeaters,
            activePetSeaters,
            pointOptionLabel,
            petShipOptionLabel,
            petShipRouteText,
            petSeaterOptionLabel,
            getPoint,
            bookablePetShips,
            upsertPoint,
            deletePoint,
            upsertPetShip,
            deletePetShip,
            upsertBooking,
            deleteBooking,
            upsertDogDaycare,
            deleteDogDaycare,
            upsertPetSeater,
            deletePetSeater,
        }),
        [
            state.points,
            state.petShips,
            state.bookings,
            state.dogDaycares,
            state.petSeaters,
            activePetSeaters,
            pointOptionLabel,
            petShipOptionLabel,
            petShipRouteText,
            petSeaterOptionLabel,
            getPoint,
            bookablePetShips,
            upsertPoint,
            deletePoint,
            upsertPetShip,
            deletePetShip,
            upsertBooking,
            deleteBooking,
            upsertDogDaycare,
            deleteDogDaycare,
            upsertPetSeater,
            deletePetSeater,
        ]
    );

    return <PetLogisticsContext.Provider value={value}>{children}</PetLogisticsContext.Provider>;
}

export function usePetLogistics (): PetLogisticsContextValue {
    const v = useContext(PetLogisticsContext);
    if (!v) {
        throw new Error('usePetLogistics must be used within PetLogisticsProvider');
    }

    return v;
}
