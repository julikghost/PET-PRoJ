/**
 * Test constants: map sidebar menu items to routes and visible labels from `text.ts`.
 */
import { menu } from './text';

export const MENU_ITEM = {
    HOME: {
        name: menu.home,
        route: 'home',
    },
    REPORTS: {
        name: menu.reports,
        route: 'reports',
    },
    PET_MOVERS: {
        name: menu.petMovers,
        route: 'pet-movers',
    },
    PET_SHIPPING: {
        name: menu.petShipping,
        route: 'schedule',
    },
    BOOKING: {
        name: menu.booking,
        route: 'booking',
    },
    DOG_DAYCARE: {
        name: menu.dogDaycare,
        route: 'dog-daycare',
    },
    PET_SEATERS: {
        name: menu.petSeaters,
        route: 'pet-seaters',
    },
    POINTS: {
        name: menu.points,
        route: 'points',
    },
    OUR_CLIENTS: {
        name: menu.ourClients,
        route: 'our-clients',
    },
    EUROPE_SHOWS: {
        name: menu.europeShows,
        route: 'europe-shows',
    },
};

/** Matches `pet-app` ReportsPage `data-testid` — stable anchors for FormFields / E2E. */
export const REPORTS_DATA_TESTID = {
    /** `Form.Item` wrapper — always in DOM; prefer for waits / opening `.ant-select` inside. */
    petMoverField: 'pet-reports-pet-mover-field',
    /** Inner Ant `Select` (may vary by antd version). */
    petMoverSelect: 'pet-reports-pet-mover',
    sendReportToEmail: 'pet-reports-send-to-email',
} as const;
