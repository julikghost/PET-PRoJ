import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type { BookingRecord, PetShipRecord, PointRecord } from '../types/petLogistics';

export const PET_LOGISTICS_STORAGE_KEY = 'pet-logistics-v1';

type StoreState = {
    points: PointRecord[];
    petShips: PetShipRecord[];
    bookings: BookingRecord[];
};

const emptyState = (): StoreState => ({
    points: [],
    petShips: [],
    bookings: [],
});

function loadState (): StoreState {
    try {
        const raw = localStorage.getItem(PET_LOGISTICS_STORAGE_KEY);
        if (!raw) {
            return emptyState();
        }
        const p = JSON.parse(raw) as Partial<StoreState>;
        return {
            points: Array.isArray(p.points) ? p.points : [],
            petShips: Array.isArray(p.petShips) ? p.petShips : [],
            bookings: Array.isArray(p.bookings) ? p.bookings : [],
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

export type PetLogisticsContextValue = {
    points: PointRecord[];
    petShips: PetShipRecord[];
    bookings: BookingRecord[];
    pointOptionLabel: (p: PointRecord) => string;
    petShipOptionLabel: (ship: PetShipRecord) => string;
    petShipRouteText: (ship: PetShipRecord) => string;
    getPoint: (id: string) => PointRecord | undefined;
    bookablePetShips: PetShipRecord[];
    upsertPoint: (row: Omit<PointRecord, 'id'> & { id?: string }) => boolean;
    deletePoint: (id: string) => boolean;
    upsertPetShip: (row: Omit<PetShipRecord, 'id'> & { id?: string }) => boolean;
    deletePetShip: (id: string) => boolean;
    upsertBooking: (row: Omit<BookingRecord, 'id'> & { id?: string }) => boolean;
    deleteBooking: (id: string) => void;
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

    const bookablePetShips = useMemo(
        () => state.petShips.filter((s) => s.status === 'planned' || s.status === 'active'),
        [state.petShips]
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
        (row: Omit<BookingRecord, 'id'> & { id?: string }): boolean => {
            const id = row.id ?? newBookingId();
            const full: BookingRecord = {
                id,
                refCode: row.refCode.trim(),
                petShipId: row.petShipId,
                date: row.date,
                petLabel: row.petLabel.trim(),
                weightKg: row.weightKg,
            };
            let accepted = false;
            setState((prev) => {
                const ship = prev.petShips.find((s) => s.id === full.petShipId);
                if (!ship) {
                    toast.error('Select a valid pet ship');

                    return prev;
                }
                const existing = prev.bookings.find((b) => b.id === full.id);
                const bookable = ship.status === 'planned' || ship.status === 'active';
                const sameShipKeep = existing?.petShipId === full.petShipId;
                if (!bookable && !sameShipKeep) {
                    toast.error('Pet ship must be planned or active to book');

                    return prev;
                }
                const refNorm = full.refCode.trim().toLowerCase();
                const dup = prev.bookings.some(
                    (b) => b.id !== full.id && b.refCode.trim().toLowerCase() === refNorm
                );
                if (dup) {
                    toast.error('Booking ref must be unique');

                    return prev;
                }
                accepted = true;
                const exists = prev.bookings.some((b) => b.id === full.id);
                const bookings = exists
                    ? prev.bookings.map((b) => (b.id === full.id ? full : b))
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

    const value = useMemo<PetLogisticsContextValue>(
        () => ({
            points: state.points,
            petShips: state.petShips,
            bookings: state.bookings,
            pointOptionLabel,
            petShipOptionLabel,
            petShipRouteText,
            getPoint,
            bookablePetShips,
            upsertPoint,
            deletePoint,
            upsertPetShip,
            deletePetShip,
            upsertBooking,
            deleteBooking,
        }),
        [
            state.points,
            state.petShips,
            state.bookings,
            pointOptionLabel,
            petShipOptionLabel,
            petShipRouteText,
            getPoint,
            bookablePetShips,
            upsertPoint,
            deletePoint,
            upsertPetShip,
            deletePetShip,
            upsertBooking,
            deleteBooking,
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
