import { config } from '../../config-logistics';
import { MENU_ITEM } from '../../utils/constants';
import { petMovers as petMoversText } from '../../utils/text';
import { expect, test } from '../fixtures/logisticsApp.fixture';

const { adminUsername, adminPassword } = config;

test.describe('PetMovers', () => {
    test.skip(
        !adminUsername || !adminPassword,
        'Set LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD (see .env.example)'
    );

    test('create, update, and delete a PetMover', async ({ page, logisticsApp }) => {
        await logisticsApp.openLogisticsApp();
        await logisticsApp.loginAsPetAdmin();

        await logisticsApp.navigationSidebar.clickMenuItem(MENU_ITEM.PET_MOVERS);
        const pm = logisticsApp.petMovers;

        await pm.expectLoaded();

        const code = `E2E-PM-${Date.now()}`;

        await pm.clickAdd();
        await pm.fillForm({ name: 'E2E Alpha', code, active: true });
        await pm.saveModal();
        await expect(page.getByText(petMoversText.toastCreated).first()).toBeVisible();

        await pm.expectRowContains('E2E Alpha');
        await pm.expectRowContains(code);

        await pm.clickEdit(code);
        await pm.fillForm({ name: 'E2E Beta', code, active: false, currency: 'USD' });
        await pm.saveModal();
        await expect(page.getByText(petMoversText.toastUpdated).first()).toBeVisible();

        await pm.expectRowContains('E2E Beta');
        await pm.expectRowContains('USD');
        await pm.expectRowContains('No');

        await pm.clickDelete(code);
        await pm.confirmDeleteInDialog();
        await expect(page.getByText(petMoversText.toastDeleted).first()).toBeVisible();
        await pm.expectNoRowContains('E2E Beta');
    });
});
