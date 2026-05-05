import { e2ePoints } from '../utils/e2eTestData';
import { points as pointsText } from '../utils/text';

export const pointCases = [
    {
        title: 'hub to stop',
        create: {
            name: e2ePoints.nameCreate,
            city: e2ePoints.cityCreate,
            kindLabel: pointsText.kindHub,
        },
        update: {
            name: e2ePoints.nameUpdate,
            city: e2ePoints.cityUpdate,
            kindLabel: pointsText.kindStop,
        },
    },
] as const;
