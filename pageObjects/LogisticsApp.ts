/**
 * App facade: composes Login, Reports, and sidebar; opens base URL and asserts URL.
 */
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { config } from '../config-logistics';
import { openPetStubLoginPage } from '../utils/petStubLoginPage';
import { MENU_ITEM } from '../utils/constants';
import { Login } from './Login';
import type { BookingModalValues } from './Booking';
import { Reports } from './Reports';
import { PetMovers } from './PetMovers';
import { PetShipping } from './PetShipping';
import { Booking } from './Booking';
import { DogDaycare } from './DogDaycare';
import { Points } from './Points';
import { NavigationSidebar } from './NavigationSidebar';

/** Docker runners are slower; PET stub navigation after submit needs more slack than local dev. */
const PET_POST_LOGIN_ASSERT_MS = process.env.E2E_DOCKER === '1' ? 45_000 : 20_000;
const PET_AUTH_STORAGE_KEY = 'pet-auth';
const PET_ADMIN_ROLE = 'PetAdmin';

export class LogisticsApp {
    readonly page: Page;
    readonly login: Login;
    readonly reports: Reports;
    readonly petMovers: PetMovers;
    readonly petShipping: PetShipping;
    readonly booking: Booking;
    readonly dogDaycare: DogDaycare;
    readonly points: Points;
    readonly navigationSidebar: NavigationSidebar;

    constructor (page: Page) {
        this.page = page;
        this.login = new Login(page);
        this.reports = new Reports(page);
        this.petMovers = new PetMovers(page);
        this.petShipping = new PetShipping(page);
        this.booking = new Booking(page);
        this.dogDaycare = new DogDaycare(page);
        this.points = new Points(page);
        this.navigationSidebar = new NavigationSidebar(page);
    }

    async openLogisticsApp (): Promise<void> {
        await test.step('Open logistics application base URL', async () => {
            const url = config.baseUrl?.trim();
            if (!url) {
                throw new Error(
                    'LOGISTICS_BASE_CLIENT_URL is missing or empty. Set it in .env (e.g. http://localhost:5173/ for the PET app).'
                );
            }
            await this.page.goto(url);
        });
    }

    async expectPageAt (url: string | RegExp): Promise<void> {
        await test.step('Assert current URL', async () => {
            await expect(this.page).toHaveURL(url);
        });
    }

    /**
     * Clears PET session and signs in as PetAdmin (see `LOGISTICS_ADMIN_*` in `.env`).
     * Use when tests need the admin sidebar (e.g. PetMovers) while `storageState` is a normal user.
     */
    async loginAsPetAdmin (): Promise<void> {
        await test.step('PET: sign in as PetAdmin', async () => {
            const { adminUsername, adminPassword } = config;
            if (!adminUsername || !adminPassword) {
                throw new Error(
                    'LOGISTICS_ADMIN_USER_NAME and LOGISTICS_ADMIN_PASSWORD must be set for PetAdmin flows.'
                );
            }
            await openPetStubLoginPage(this.page, config.baseUrl);
            await this.login.signInPetApp(adminUsername, adminPassword);
            await expect(this.page).not.toHaveURL(/\/login$/, { timeout: PET_POST_LOGIN_ASSERT_MS });
        });
    }

    /**
     * Clears PET session and signs in as a normal user (`LOGISTICS_UI_USER_NAME` / `LOGISTICS_PASSWORD`).
     */
    async loginAsPetUser (): Promise<void> {
        await test.step('PET: sign in as PetUser', async () => {
            const { uiUsername, password } = config;
            if (!uiUsername || !password) {
                throw new Error(
                    'LOGISTICS_UI_USER_NAME (or LOGISTICS_E2E_USER_NAME) and LOGISTICS_PASSWORD must be set.'
                );
            }
            await openPetStubLoginPage(this.page, config.baseUrl);
            await this.login.signInPetApp(uiUsername, password);
            await expect(this.page).not.toHaveURL(/\/login$/, { timeout: PET_POST_LOGIN_ASSERT_MS });
        });
    }

    /**
     * Injects a PetAdmin session into localStorage (`pet-auth`) on the PET origin.
     * Useful when `storageState` is missing or holds a non-admin role.
     */
    private async seedPetAdminSession (): Promise<void> {
        await test.step('Seed PetAdmin session in localStorage', async () => {
            await this.page.goto('/home', { waitUntil: 'domcontentloaded' });
            await this.page.evaluate(([key, role]) => {
                    localStorage.setItem(
                        key,
                        JSON.stringify({
                            accessToken: 'pet-e2e-access-token',
                            role,
                        })
                    );
                },
            [PET_AUTH_STORAGE_KEY, PET_ADMIN_ROLE]);
            await this.page.reload({ waitUntil: 'domcontentloaded' });
        });
    }

    /**
     * Use existing session from storageState (already logged in) and just clean local storages.
     * Assumes caller project set `use.storageState` to an active PET session (e.g., PetAdmin).
     */
    async openWithSessionAndCleanData (): Promise<void> {
        await test.step('Open with stored session and clear data', async () => {
            await this.page.goto('/home');
            await this.clearPetLogisticsData();
            await this.clearPetMoversStorage();
        });
    }

    /**
     * Ensure PetAdmin role is active: use stored session if it works, otherwise seed PetAdmin auth.
     * Always clears local storages afterward.
     */
    async ensurePetAdminSessionWithCleanData (): Promise<void> {
        await test.step('Ensure PetAdmin session (storageState or login) and clear data', async () => {
            await this.page.goto('/home', { waitUntil: 'domcontentloaded' });
            const isAdmin = await this.page.evaluate(([key, role]) => {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) return false;
                    const parsed = JSON.parse(raw) as { role?: string };
                    return parsed.role === role;
                } catch {
                    return false;
                }
            }, [PET_AUTH_STORAGE_KEY, PET_ADMIN_ROLE]).catch(() => false);

            if (!isAdmin) {
                await this.seedPetAdminSession();
            }

            await this.clearPetLogisticsData();
            await this.clearPetMoversStorage();
        });
    }

    async goToPetShippingAndCreateShip (values: {
        refCode: string;
        fromLabel: string;
        toLabel: string;
        departure: string;
        arrival: string;
        petMover: string;
        statusLabel: string;
    }): Promise<void> {
        await test.step(`PetShipping: create pet ship ${values.refCode}`, async () => {
            await this.navigationSidebar.clickMenuItem(MENU_ITEM.PET_SHIPPING);
            await this.petShipping.createPetShip(values);
        });
    }

    async goToBookingAndCreate (values: BookingModalValues): Promise<void> {
        await test.step(`Booking: create ${values.refCode}`, async () => {
            await this.navigationSidebar.clickMenuItem(MENU_ITEM.BOOKING);
            const bk = this.booking;
            await bk.expectLoaded();
            await bk.createBookingExpectCreatedToast(values);
        });
    }

    async goToBookingCreateAndAssertList (values: BookingModalValues & {
        rowPetLabel?: string;
        rowShipLabel?: string;
        rowPriceSnippet?: string;
        rowPaymentSnippet?: string;
    }): Promise<void> {
        await test.step(`Booking: create ${values.refCode} and assert in list`, async () => {
            await this.goToBookingAndCreate(values);
            await this.booking.expectRowContains(values.refCode);
            if (values.rowPetLabel ?? values.petLabels[0]) {
                await this.booking.expectRowContains(values.rowPetLabel ?? values.petLabels[0]);
            }
            if (values.rowShipLabel ?? values.petShipLabel) {
                await this.booking.expectRowContains(values.rowShipLabel ?? values.petShipLabel);
            }
            if (values.rowPriceSnippet) {
                await this.booking.expectRowContains(values.rowPriceSnippet);
            }
            if (values.rowPaymentSnippet) {
                await this.booking.expectRowContains(values.rowPaymentSnippet);
            }
        });
    }

    /**
     * PetAdmin entrypoint for booking/pet shipping flows: open app, login as admin, clear local storages.
     */
    async openAsPetAdminWithCleanData (): Promise<void> {
        await test.step('Open app as PetAdmin with clean data', async () => {
            await this.openLogisticsApp();
            await this.loginAsPetAdmin();
            await this.clearPetLogisticsData();
            await this.clearPetMoversStorage();
        });
    }

    /**
     * Assumes storageState already holds a valid PetUser session (project `logistics_session`).
     * Clears local data, opens Home, navigates to Points, waits until Points page is ready.
     * Returns the Points POM for chaining.
     */
    async openPointsWithSession (): Promise<Points> {
        await test.step('Open Points page (session already active)', async () => {
            await this.page.goto('/home');
            await this.clearPetLogisticsData();
            await this.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
            await this.points.expectLoaded();
        });
        return this.points;
    }

    /** Clears persisted Points / PetShipping / Booking demo data (`pet-logistics-v1`). */
    async clearPetLogisticsData (): Promise<void> {
        await test.step('Clear PET logistics local data', async () => {
            await this.page.evaluate(() => localStorage.removeItem('pet-logistics-v1'));
        });
    }

    /** Clears PetMovers directory storage (`pet-movers-v1`). */
    async clearPetMoversStorage (): Promise<void> {
        await test.step('Clear PET PetMovers local data', async () => {
            await this.page.evaluate(() => localStorage.removeItem('pet-movers-v1'));
        });
    }

    /**
     * PetAdmin: open PetMovers and create an active PetMover named `petmover-<uuid>` (PetShipping “PetMover” field).
     * Returns `name` for the ship form and `code` for teardown via {@link deletePetMoverByCode}.
     */
    async createPetMoverForPetShippingPrecondition (): Promise<{ name: string; code: string }> {
        return await test.step('Precondition: PetMover petmover-<uuid> for Pet ship', async () => {
            const uuid = randomUUID();
            const name = `petmover-${uuid}`;
            const code = `PM${uuid.replace(/-/g, '').slice(0, 16)}`;
            await this.navigationSidebar.clickMenuItem(MENU_ITEM.PET_MOVERS);
            await this.petMovers.createActivePetMover({ name, code });

            return { name, code };
        });
    }

    /** PetAdmin: PetMovers → delete row by `code` (confirm + toast). */
    async deletePetMoverByCode (code: string): Promise<void> {
        await test.step(`Teardown: delete PetMover ${code}`, async () => {
            await this.navigationSidebar.clickMenuItem(MENU_ITEM.PET_MOVERS);
            await this.petMovers.expectLoaded();
            await this.petMovers.deletePetMoverAndConfirm(code);
        });
    }

    /**
     * Best-effort cleanup after E2E (order: booking → pet ship → points → dog daycare → pet movers).
     * Ignores missing rows / errors so `finally` stays safe.
     */
    async teardownPetE2eData (opts: {
        bookingRef?: string;
        petShipRef?: string;
        pointCodes?: string[];
        /** Dog Daycare row ref (`daycare-delete-<ref>`). */
        dogDaycareRef?: string;
        /** Delete one PetMover by code (legacy). */
        petMoverCode?: string;
        /** Delete several PetMovers by code. */
        petMoverCodes?: string[];
    }): Promise<void> {
        await test.step('Teardown: E2E booking / pet ship / points / dog daycare / pet mover', async () => {
            const {
                bookingRef,
                petShipRef,
                pointCodes = [],
                dogDaycareRef,
                petMoverCode,
                petMoverCodes = [],
            } = opts;
            if (bookingRef) {
                try {
                    await this.navigationSidebar.clickMenuItem(MENU_ITEM.BOOKING);
                    await this.booking.expectLoaded();
                    const del = this.page.getByTestId(`booking-delete-${bookingRef}`);
                    if (await del.isVisible().catch(() => false)) {
                        await this.booking.clickDelete(bookingRef);
                        await this.booking.confirmDeleteInDialog();
                    }
                } catch {
                    /* ignore */
                }
            }
            if (petShipRef) {
                try {
                    await this.navigationSidebar.clickMenuItem(MENU_ITEM.PET_SHIPPING);
                    await this.petShipping.expectLoaded();
                    const del = this.page.getByTestId(`schedule-delete-${petShipRef}`);
                    if (await del.isVisible().catch(() => false)) {
                        await this.petShipping.clickDelete(petShipRef);
                        await this.petShipping.confirmDeleteInDialog();
                    }
                } catch {
                    /* ignore */
                }
            }
            for (const code of pointCodes) {
                try {
                    await this.navigationSidebar.clickMenuItem(MENU_ITEM.POINTS);
                    await this.points.expectLoaded();
                    const del = this.page.getByTestId(`point-delete-${code}`);
                    if (await del.isVisible().catch(() => false)) {
                        await this.points.clickDelete(code);
                        await this.points.confirmDeleteInDialog();
                    }
                } catch {
                    /* ignore */
                }
            }
            if (dogDaycareRef) {
                try {
                    await this.navigationSidebar.clickMenuItem(MENU_ITEM.DOG_DAYCARE);
                    await this.dogDaycare.expectLoaded();
                    const del = this.page.getByTestId(`daycare-delete-${dogDaycareRef}`);
                    if (await del.isVisible().catch(() => false)) {
                        await this.dogDaycare.clickDelete(dogDaycareRef);
                        await this.dogDaycare.confirmDeleteInDialog();
                    }
                } catch {
                    /* ignore */
                }
            }
            const moverCodes = [...new Set([...petMoverCodes, ...(petMoverCode ? [petMoverCode] : [])])];
            for (const code of moverCodes) {
                try {
                    await this.deletePetMoverByCode(code);
                } catch {
                    /* ignore */
                }
            }
        });
    }

    /**
     * PET: PetAccountant (Reports menu only). Match `LOGISTICS_ACCOUNTANT_*` / `VITE_PET_ACCOUNTANT_*`.
     */
    async loginAsPetAccountant (): Promise<void> {
        await test.step('PET: sign in as PetAccountant', async () => {
            const { accountantUsername, accountantPassword } = config;
            if (!accountantUsername || !accountantPassword) {
                throw new Error(
                    'LOGISTICS_ACCOUNTANT_USER_NAME and LOGISTICS_ACCOUNTANT_PASSWORD must be set for PetAccountant flows.'
                );
            }
            await openPetStubLoginPage(this.page, config.baseUrl);
            await this.login.signInPetApp(accountantUsername, accountantPassword);
            await expect(this.page).not.toHaveURL(/\/login$/, { timeout: PET_POST_LOGIN_ASSERT_MS });
        });
    }

    /**
     * Sign in as a role that may open Reports (accountant preferred, else admin).
     */
    async loginForReportsAccess (): Promise<void> {
        await test.step('PET: sign in for Reports (accountant or admin)', async () => {
            const { accountantUsername, accountantPassword, adminUsername, adminPassword } = config;
            if (accountantUsername && accountantPassword) {
                await this.loginAsPetAccountant();

                return;
            }
            if (adminUsername && adminPassword) {
                await this.loginAsPetAdmin();

                return;
            }
            throw new Error(
                'Set LOGISTICS_ACCOUNTANT_* or LOGISTICS_ADMIN_* for Reports access.'
            );
        });
    }
}
