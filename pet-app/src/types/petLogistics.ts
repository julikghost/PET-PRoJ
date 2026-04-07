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
    status: 'planned' | 'active' | 'done';
};

export type BookingRecord = {
    id: string;
    refCode: string;
    petShipId: string;
    date: string;
    petLabel: string;
    weightKg: number;
};
