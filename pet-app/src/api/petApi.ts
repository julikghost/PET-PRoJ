import type {
    BookingRecord,
    DogDaycareRecord,
    PetSeaterRecord,
    PetShipRecord,
    PointRecord,
} from '../types/petLogistics';
import type { PetMoverRow } from '../petMoversStorage';
import { getAuthSession } from '../auth';

type ApiErrorPayload = {
    error?: string;
};

async function requestJson<T> (path: string, init?: RequestInit): Promise<T> {
    const token = getAuthSession()?.accessToken;
    const response = await fetch(`/api${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) as T | ApiErrorPayload : undefined;
    if (!response.ok) {
        const message = (json as ApiErrorPayload | undefined)?.error || `Request failed (${response.status})`;
        throw new Error(message);
    }
    return json as T;
}

type LoginResponse = {
    accessToken: string;
    role: 'PetAdmin' | 'PetUser' | 'PetAccountant';
};

export const petApi = {
    auth: {
        login: (identifier: string, password: string) => requestJson<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password }),
        }),
    },
    points: {
        list: () => requestJson<PointRecord[]>('/points'),
        create: (row: Omit<PointRecord, 'id'> & { id?: string }) => requestJson<PointRecord>('/points', {
            method: 'POST',
            body: JSON.stringify(row),
        }),
        update: (id: string, row: Omit<PointRecord, 'id'>) => requestJson<PointRecord>(`/points/${id}`, {
            method: 'PUT',
            body: JSON.stringify(row),
        }),
        remove: (id: string) => requestJson<{ id: string }>(`/points/${id}`, { method: 'DELETE' }),
    },
    petShips: {
        list: () => requestJson<PetShipRecord[]>('/pet-ships'),
        create: (row: Omit<PetShipRecord, 'id'> & { id?: string }) => requestJson<PetShipRecord>('/pet-ships', {
            method: 'POST',
            body: JSON.stringify(row),
        }),
        update: (id: string, row: Omit<PetShipRecord, 'id'>) => requestJson<PetShipRecord>(`/pet-ships/${id}`, {
            method: 'PUT',
            body: JSON.stringify(row),
        }),
        remove: (id: string) => requestJson<{ id: string }>(`/pet-ships/${id}`, { method: 'DELETE' }),
    },
    bookings: {
        list: () => requestJson<BookingRecord[]>('/bookings'),
        create: (
            row: Omit<BookingRecord, 'id' | 'price' | 'currency' | 'billingCurrency'> & { id?: string }
        ) => requestJson<BookingRecord>('/bookings', {
            method: 'POST',
            body: JSON.stringify(row),
        }),
        update: (
            id: string,
            row: Omit<BookingRecord, 'id' | 'price' | 'currency' | 'billingCurrency'>
        ) => requestJson<BookingRecord>(`/bookings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(row),
        }),
        remove: (id: string) => requestJson<{ id: string }>(`/bookings/${id}`, { method: 'DELETE' }),
    },
    dogDaycares: {
        list: () => requestJson<DogDaycareRecord[]>('/dog-daycares'),
        create: (
            row: Omit<DogDaycareRecord, 'id' | 'petSeaterName' | 'price'> & { id?: string }
        ) => requestJson<DogDaycareRecord>('/dog-daycares', {
            method: 'POST',
            body: JSON.stringify(row),
        }),
        update: (
            id: string,
            row: Omit<DogDaycareRecord, 'id' | 'petSeaterName' | 'price'>
        ) => requestJson<DogDaycareRecord>(`/dog-daycares/${id}`, {
            method: 'PUT',
            body: JSON.stringify(row),
        }),
        remove: (id: string) => requestJson<{ id: string }>(`/dog-daycares/${id}`, { method: 'DELETE' }),
    },
    petSeaters: {
        list: () => requestJson<PetSeaterRecord[]>('/pet-seaters'),
        create: (row: Omit<PetSeaterRecord, 'id'> & { id?: string }) => requestJson<PetSeaterRecord>('/pet-seaters', {
            method: 'POST',
            body: JSON.stringify(row),
        }),
        update: (id: string, row: Omit<PetSeaterRecord, 'id'>) => requestJson<PetSeaterRecord>(`/pet-seaters/${id}`, {
            method: 'PUT',
            body: JSON.stringify(row),
        }),
        remove: (id: string) => requestJson<{ id: string }>(`/pet-seaters/${id}`, { method: 'DELETE' }),
    },
    petMovers: {
        list: () => requestJson<PetMoverRow[]>('/pet-movers'),
        create: (row: Omit<PetMoverRow, 'id'> & { id?: string }) => requestJson<PetMoverRow>('/pet-movers', {
            method: 'POST',
            body: JSON.stringify(row),
        }),
        update: (id: string, row: Omit<PetMoverRow, 'id'>) => requestJson<PetMoverRow>(`/pet-movers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(row),
        }),
        remove: (id: string) => requestJson<{ id: string }>(`/pet-movers/${id}`, { method: 'DELETE' }),
        replaceAll: (rows: PetMoverRow[]) => requestJson<PetMoverRow[]>('/pet-movers', {
            method: 'PUT',
            body: JSON.stringify(rows),
        }),
    },
    test: {
        reset: () => requestJson<{ ok: boolean }>('/test/reset', { method: 'POST', body: '{}' }),
        seed: <T>(data: T) => requestJson<{ ok: boolean; data: unknown }>('/test/seed', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    },
};

