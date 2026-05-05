import { e2eRefs } from '../../utils/e2eTestData';
import { MENU_ITEM } from '../../utils/constants';
import { test } from '../../fixtures/logisticsApp.fixture';
import { pointCases } from '../../fixtures/pointsCases';

test.describe('Points', () => {
    for (const pointCase of pointCases) {
        test(`create, update, delete point (${pointCase.title})`, async ({ logisticsApp }) => {
            await logisticsApp.ensurePetAdminSessionWithCleanData();
            await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
            const pt = logisticsApp.points;
            await pt.expectLoaded();

            let code: string | undefined;

            try {
                code = e2eRefs.point(Date.now());

                await pt.createPoint({
                    code,
                    name: pointCase.create.name,
                    city: pointCase.create.city,
                    kindLabel: pointCase.create.kindLabel,
                });

                await pt.expectRowHasCodeAndName(code, pointCase.create.name);

                await pt.editPoint(code, {
                    name: pointCase.update.name,
                    city: pointCase.update.city,
                    kindLabel: pointCase.update.kindLabel,
                });
                await pt.expectRowHasCodeAndName(code, pointCase.update.name);

                await pt.deletePointAndAssertRemoved(code);
            } finally {
                await logisticsApp.teardownPetE2eData({ pointCodes: code ? [code] : [] });
            }
        });
    }
});
