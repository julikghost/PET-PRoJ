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
import { Reports } from './Reports';
import { PetMovers } from './PetMovers';
import { PetShipping } from './PetShipping';
import { Booking } from './Booking';
import { DogDaycare } from './DogDaycare';
import { Points } from './Points';
import { NavigationSidebar } from './NavigationSidebar';

/** Docker runners are slower; PET stub navigation after submit needs more slack than local dev. */
const PET_POST_LOGIN_ASSERT_MS = process.env.E2E_DOCKER === '1' ? 45_000 : 20_000;

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
