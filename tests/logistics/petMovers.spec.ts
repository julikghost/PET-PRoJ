import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { E2E_SKIP, e2ePetMovers, e2eRefs } from '../../utils/e2eTestData';
import { petMovers as petMoversText } from '../../utils/text';
import { expect, test } from '../fixtures/logisticsApp.fixture';

const { adminUsername, adminPassword } = config;

test.describe('PetMovers', () => {
    test.skip(!adminUsername || !adminPassword, E2E_SKIP.LOGISTICS_ADMIN);

    test('create, update, and delete a PetMover', async ({ page, logisticsApp }) => {
        await logisticsApp.openLogisticsApp();
        await logisticsApp.loginAsPetAdmin();

        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.PET_MOVERS);
        const pm = logisticsApp.petMovers;

        await pm.expectLoaded();

        let code: string | undefined;

        try {
            code = e2eRefs.petMover(Date.now());

            await pm.clickAdd();
            await pm.fillForm({ name: e2ePetMovers.nameCreate, code, active: true });
            await pm.saveModal();
            await expect(page.getByText(petMoversText.toastCreated).first()).toBeVisible();

            await pm.expectRowContains(e2ePetMovers.nameCreate);
            await pm.expectRowContains(code);

            await pm.clickEdit(code);
            await pm.fillForm({
                name: e2ePetMovers.nameUpdate,
                code,
                active: false,
                currency: e2ePetMovers.currencyUpdate,
            });
            await pm.saveModal();
            await expect(page.getByText(petMoversText.toastUpdated).first()).toBeVisible();

            await pm.expectRowContains(e2ePetMovers.nameUpdate);
            await pm.expectRowContains(e2ePetMovers.currencyUpdate);
            await pm.expectRowContains('No');

            await pm.clickDelete(code);
            await pm.confirmDeleteInDialog();
            await expect(page.getByText(petMoversText.toastDeleted).first()).toBeVisible();
            await pm.expectNoRowContains(e2ePetMovers.nameUpdate);
        } finally {
            await logisticsApp.teardownPetE2eData({ petMoverCode: code });
        }
    });
});
