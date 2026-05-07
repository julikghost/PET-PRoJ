import { MENU_ITEM } from '../../utils/constants';
import { e2ePetMovers, e2eRefs } from '../../utils/e2eTestData';
import { petMovers as petMoversText } from '../../utils/text';
import { expect, test } from '../../fixtures/logisticsApp.fixture';

test.describe('PetMovers', () => {
    test('create, update, and delete a PetMover', async ({ page, logisticsApp }) => {
        await logisticsApp.ensurePetAdminSessionWithCleanData();
        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.PET_MOVERS);
        const pm = logisticsApp.petMovers;

        await pm.expectLoaded();

        const cleanup = {
            code: undefined as string | undefined,
        };

        try {
            cleanup.code = e2eRefs.petMover(Date.now());

            await pm.createPetMover({ name: e2ePetMovers.nameCreate, code: cleanup.code, active: true });
            await expect(page.getByText(petMoversText.toastCreated).first()).toBeVisible();

            await pm.expectCreatedPetMoverVisible(e2ePetMovers.nameCreate, cleanup.code);

            await pm.updatePetMover(cleanup.code, {
                name: e2ePetMovers.nameUpdate,
                code: cleanup.code,
                active: false,
                currency: e2ePetMovers.currencyUpdate,
            });
            await expect(page.getByText(petMoversText.toastUpdated).first()).toBeVisible();

            await pm.expectUpdatedAndDeletePetMover({
                code: cleanup.code,
                updatedName: e2ePetMovers.nameUpdate,
                updatedCurrency: e2ePetMovers.currencyUpdate,
                activeLabel: 'No',
            });
        } finally {
            await logisticsApp.teardownPetE2eData({ petMoverCode: cleanup.code });
        }
    });
});
