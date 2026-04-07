/**
 * App facade: composes Login, Reports, and sidebar; opens base URL and asserts URL.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { config } from '../config-logistics';
import { Login } from './Login';
import { Reports } from './Reports';
import { PetMovers } from './PetMovers';
import { PetShipping } from './PetShipping';
import { Booking } from './Booking';
import { Points } from './Points';
import { NavigationSidebar } from './NavigationSidebar';

export class LogisticsApp {
    readonly page: Page;
    readonly login: Login;
    readonly reports: Reports;
    readonly petMovers: PetMovers;
    readonly petShipping: PetShipping;
    readonly booking: Booking;
    readonly points: Points;
    readonly navigationSidebar: NavigationSidebar;

    constructor (page: Page) {
        this.page = page;
        this.login = new Login(page);
        this.reports = new Reports(page);
        this.petMovers = new PetMovers(page);
        this.petShipping = new PetShipping(page);
        this.booking = new Booking(page);
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
            await this.page.goto('/');
            await this.page.evaluate(() => {
                localStorage.removeItem('pet-auth');
            });
            await this.page.goto('/login');
            await this.login.signInPetApp(adminUsername, adminPassword);
            await expect(this.page).not.toHaveURL(/\/login$/, { timeout: 20000 });
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
            await this.page.goto('/');
            await this.page.evaluate(() => {
                localStorage.removeItem('pet-auth');
            });
            await this.page.goto('/login');
            await this.login.signInPetApp(uiUsername, password);
            await expect(this.page).not.toHaveURL(/\/login$/, { timeout: 20000 });
        });
    }

    /** Clears persisted Points / PetShipping / Booking demo data (`pet-logistics-v1`). */
    async clearPetLogisticsData (): Promise<void> {
        await test.step('Clear PET logistics local data', async () => {
            await this.page.evaluate(() => localStorage.removeItem('pet-logistics-v1'));
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
            await this.page.goto('/');
            await this.page.evaluate(() => {
                localStorage.removeItem('pet-auth');
            });
            await this.page.goto('/login');
            await this.login.signInPetApp(accountantUsername, accountantPassword);
            await expect(this.page).not.toHaveURL(/\/login$/, { timeout: 20000 });
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
