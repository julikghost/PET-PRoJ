/**
 * Date utilities for report checks: local calendar day from ISO, current-month ranges (local and UTC)
 * using `E2E_TIME_ZONE` from config.
 *
 * Call `getTodayAndTomorrowDays` / `getCurrentMonthRangeDays` (etc.) at **test run time** (inside a test or
 * `beforeAll`), not at module top level, so long-lived workers or runs across midnight do not use stale days.
 */
import { addDays, parseISO, format, startOfMonth, endOfMonth } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { config } from '../config-logistics';

const defaultTimeZone = config.timeZone || 'UTC';

export function getTodayAndTomorrowDays (timeZone: string = config.timeZone || defaultTimeZone): {
    todayDay: string;
    tomorrowDay: string;
} {
    try {
        const zonedToday = toZonedTime(new Date(), timeZone);
        const zonedTomorrow = addDays(zonedToday, 1);

        return {
            todayDay: format(zonedToday, 'yyyy-MM-dd'),
            tomorrowDay: format(zonedTomorrow, 'yyyy-MM-dd'),
        };
    } catch {
        const today = new Date();
        const tomorrow = addDays(today, 1);

        return {
            todayDay: format(today, 'yyyy-MM-dd'),
            tomorrowDay: format(tomorrow, 'yyyy-MM-dd'),
        };
    }
}

export function getCurrentAndTomorrowDateTimes (timeZone: string = config.timeZone || defaultTimeZone): {
    currentDateTime: string;
    tomorrowDateTime: string;
} {
    try {
        const zonedNow = toZonedTime(new Date(), timeZone);
        const zonedTomorrow = addDays(zonedNow, 1);

        return {
            currentDateTime: format(zonedNow, 'yyyy-MM-dd HH:mm'),
            tomorrowDateTime: format(zonedTomorrow, 'yyyy-MM-dd HH:mm'),
        };
    } catch {
        const now = new Date();
        const tomorrow = addDays(now, 1);

        return {
            currentDateTime: format(now, 'yyyy-MM-dd HH:mm'),
            tomorrowDateTime: format(tomorrow, 'yyyy-MM-dd HH:mm'),
        };
    }
}

export function toLocalDay (
    isoString: string,
    timeZone: string = config.timeZone || defaultTimeZone
): string {
    if (!isoString) {
        return '';
    }
    try {
        const date = parseISO(isoString);
        const zoned = toZonedTime(date, timeZone);

        return format(zoned, 'yyyy-MM-dd');
    } catch {
        try {
            const dUtc = new Date(isoString);
            const offsetMin = Number.isFinite(Number(config.timeZoneOffsetMinutes))
                ? Number(config.timeZoneOffsetMinutes)
                : 0;
            const shifted = new Date(dUtc.getTime() + offsetMin * 60 * 1000);
            const y = shifted.getUTCFullYear();
            const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
            const day = String(shifted.getUTCDate()).padStart(2, '0');

            return `${y}-${m}-${day}`;
        } catch {
            try {
                return String(isoString).slice(0, 10);
            } catch {
                return '';
            }
        }
    }
}

export function formatInTZ (
    isoString: string,
    fmt = 'yyyy-MM-dd HH:mm:ssXXX',
    timeZone: string = config.timeZone || defaultTimeZone
): string {
    const date = parseISO(isoString);
    const zoned = toZonedTime(date, timeZone);

    return format(zoned, fmt);
}

export function getCurrentMonthRangeDays (timeZone: string = config.timeZone || defaultTimeZone): {
    startDay: string;
    endDay: string;
} {
    try {
        const now = new Date();
        let zonedNow: Date;
        try {
            zonedNow = toZonedTime(now, timeZone);
        } catch {
            const offsetMin = Number.isFinite(Number(config.timeZoneOffsetMinutes))
                ? Number(config.timeZoneOffsetMinutes)
                : 0;
            zonedNow = new Date(now.getTime() + offsetMin * 60 * 1000);
        }
        const startOfCurMonth = startOfMonth(zonedNow);
        const end = endOfMonth(zonedNow);

        return {
            startDay: format(startOfCurMonth, 'yyyy-MM-dd'),
            endDay: format(end, 'yyyy-MM-dd'),
        };
    } catch {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const end = new Date(y, m + 1, 0);
        const pad = (n: number) => String(n).padStart(2, '0');

        return {
            startDay: `${y}-${pad(m + 1)}-01`,
            endDay: `${y}-${pad(m + 1)}-${pad(end.getDate())}`,
        };
    }
}

export function getCurrentMonthRangeDaysUTC (timeZone: string = config.timeZone || defaultTimeZone): {
    startDayUTC: string;
    endDayUTC: string;
} {
    const { startDay, endDay } = getCurrentMonthRangeDays(timeZone);
    const toUTCDateStr = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const localMidnight = new Date(y, m - 1, d);
        const utcDate = fromZonedTime(localMidnight, timeZone);
        const pad = (n: number) => String(n).padStart(2, '0');

        return `${utcDate.getUTCFullYear()}-${pad(utcDate.getUTCMonth() + 1)}-${pad(utcDate.getUTCDate())}`;
    };

    return {
        startDayUTC: toUTCDateStr(startDay),
        endDayUTC: toUTCDateStr(endDay),
    };
}
