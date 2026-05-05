import { e2eBooking } from '../../utils/e2eTestData';
import { test } from '../../fixtures/bookingPrecond.fixture';
import { bookingCases } from '../../fixtures/bookingCases';

test.describe('Booking', () => {
    for (const bookingCase of bookingCases) {
        test(`create booking on an available pet ship (${bookingCase.title})`, async ({ logisticsApp, bookingPrecond }) => {

            const { shipRef, bkRef, todayDay, tomorrowDay, cleanup } = bookingPrecond;

            try {
                await logisticsApp.goToBookingAndCreate({
                    refCode: bkRef,
                    clientFirstName: e2eBooking.clientFirstName,
                    clientLastName: e2eBooking.clientLastName,
                    petShipLabel: shipRef,
                    dateYmd: todayDay,
                    petLabels: e2eBooking.petLabelsCreate,
                    weight: e2eBooking.weightCreate,
                });
                await logisticsApp.booking.expectRowContainsAll([
                    bkRef,
                    e2eBooking.petLabelsCreate[0],
                    shipRef,
                    e2eBooking.rowSnippetEur006,
                    e2eBooking.rowSnippetCard,
                ]);

                await test.step('Booking: edit — Dog, tomorrow, weight 7 kg', async () => {
                    await logisticsApp.booking.updateBookingExpectUpdatedToast(bkRef, {
                        refCode: bkRef,
                        clientFirstName: e2eBooking.clientFirstName,
                        clientLastName: e2eBooking.clientLastName,
                        petShipLabel: shipRef,
                        dateYmd: tomorrowDay,
                        petLabels: e2eBooking.petLabelsUpdate,
                        weight: e2eBooking.weightUpdate,
                    });
                    await logisticsApp.booking.expectRowContains(e2eBooking.petLabelsUpdate[0]);
                    await logisticsApp.booking.expectRowContains(e2eBooking.rowSnippetEur007);
                });

                await test.step('Booking: delete and assert row removed', async () => {
                    await logisticsApp.booking.deleteBookingExpectDeletedToast(bkRef);
                });
            } finally {
                await logisticsApp.teardownPetE2eData({
                    bookingRef: bkRef,
                    petShipRef: shipRef,
                pointCodes: [cleanup.codeFrom, cleanup.codeTo].filter(Boolean) as string[],
                petMoverCode: cleanup.pmCode,
                });
            }
        });
    }
});
