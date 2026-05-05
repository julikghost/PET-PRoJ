import { getCurrentAndTomorrowDateTimes, getTodayAndTomorrowDays } from '../utils/date';
import { e2eRefs } from '../utils/e2eTestData';

export type BookingCase = {
    ts: number;
    shipRef: string;
    bkRef: string;
    departure: string;
    arrival: string;
    todayDay: string;
    tomorrowDay: string;
};

function buildBookingCase (): BookingCase {
    const ts = Date.now();
    const shipRef = e2eRefs.bookingShip(ts);
    const bkRef = e2eRefs.booking(ts);
    const { currentDateTime, tomorrowDateTime } = getCurrentAndTomorrowDateTimes();
    const { todayDay, tomorrowDay } = getTodayAndTomorrowDays();

    return {
        ts,
        shipRef,
        bkRef,
        departure: currentDateTime,
        arrival: tomorrowDateTime,
        todayDay,
        tomorrowDay,
    };
}

export const bookingCases: { title: string; make: () => BookingCase }[] = [
    {
        title: 'pet ship happy path (cat→dog)',
        make: buildBookingCase,
    },
];
