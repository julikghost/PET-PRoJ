import type { DogDaycareStatus } from '../types/petLogistics';

/**
 * Shared with Reports filters and Booking form — keep labels/values in sync.
 */
export const REPORT_PAYMENT_OPTIONS = [
    { value: 'card', label: 'Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'petpay', label: 'PetPay' },
] as const;

export const REPORT_CURRENCY_OPTIONS = [
    { value: 'cur-usd', label: 'USD' },
    { value: 'cur-eur', label: 'EUR' },
] as const;

export const DOG_DAYCARE_STATUS_OPTIONS = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'checked-in', label: 'Checked in' },
    { value: 'active', label: 'Active' },
    { value: 'checked-out', label: 'Checked out' },
] as const satisfies readonly { value: DogDaycareStatus; label: string }[];
