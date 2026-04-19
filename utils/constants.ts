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
};
