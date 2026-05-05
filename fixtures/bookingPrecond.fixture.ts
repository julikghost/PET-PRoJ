import { test as base } from './logisticsApp.fixture';
import { e2eRefs, e2eRoutes } from '../utils/e2eTestData';
import { getCurrentAndTomorrowDateTimes, getTodayAndTomorrowDays } from '../utils/date';
import { MENU_ITEM } from '../utils/constants';
import { points as pointsText } from '../utils/text';
import { petShipping as petShippingText } from '../utils/text';

type BookingPrecond = {
    ts: number;
    shipRef: string;
    bkRef: string;
    departure: string;
    arrival: string;
    todayDay: string;
    tomorrowDay: string;
    cleanup: {
        pmCode?: string;
        codeFrom?: string;
        codeTo?: string;
    };
};

export const test = base.extend<{ bookingPrecond: BookingPrecond }>({
    bookingPrecond: async ({ logisticsApp }, use) => {
        await logisticsApp.ensurePetAdminSessionWithCleanData();
        const ts = Date.now();
        const shipRef = e2eRefs.bookingShip(ts);
        const bkRef = e2eRefs.booking(ts);
        const { currentDateTime, tomorrowDateTime } = getCurrentAndTomorrowDateTimes();
        const { todayDay, tomorrowDay } = getTodayAndTomorrowDays();
        const cleanup = {
            pmCode: undefined as string | undefined,
            codeFrom: undefined as string | undefined,
            codeTo: undefined as string | undefined,
        };

        const pm = await logisticsApp.createPetMoverForPetShippingPrecondition();
        cleanup.pmCode = pm.code;

        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
        const routes = await logisticsApp.points.createTwoDistinctPointsForRoutes({
            suffix: String(ts),
            from: { ...e2eRoutes.booking.from, kindLabel: pointsText.kindHub },
            to: { ...e2eRoutes.booking.to, kindLabel: pointsText.kindHub },
        });
        cleanup.codeFrom = routes.codeFrom;
        cleanup.codeTo = routes.codeTo;
        const { fromLabel, toLabel } = routes;

        await logisticsApp.goToPetShippingAndCreateShip({
            refCode: shipRef,
            fromLabel,
            toLabel,
            departure: currentDateTime,
            arrival: tomorrowDateTime,
            petMover: `${pm.name} (${pm.code})`,
            statusLabel: petShippingText.statusPlanned,
        });

        await use({
            ts,
            shipRef,
            bkRef,
            departure: currentDateTime,
            arrival: tomorrowDateTime,
            todayDay,
            tomorrowDay,
            cleanup,
        });
    },
});

export { expect } from './logisticsApp.fixture';
