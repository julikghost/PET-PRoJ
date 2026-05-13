/** Admin role name in PET UI (PetMovers admin area). */
export const ROLE_PET_ADMIN = 'PetAdmin' as const;

export const ROLE_PET_USER = 'PetUser' as const;

/** Read-only financial reports access. */
export const ROLE_PET_ACCOUNTANT = 'PetAccountant' as const;

export type PetRole = typeof ROLE_PET_ADMIN | typeof ROLE_PET_USER | typeof ROLE_PET_ACCOUNTANT;

export type PetAuthSession = {
    accessToken: string;
    role: PetRole;
};

const AUTH_STORAGE_KEY = 'pet-auth';

export function getAuthSession (): PetAuthSession | null {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        const p = JSON.parse(raw) as { accessToken?: string; role?: string };
        if (typeof p.accessToken !== 'string' || !p.accessToken) {
            return null;
        }
        let role: PetRole = ROLE_PET_USER;
        if (p.role === ROLE_PET_ADMIN) {
            role = ROLE_PET_ADMIN;
        } else if (p.role === ROLE_PET_ACCOUNTANT) {
            role = ROLE_PET_ACCOUNTANT;
        }

        return { accessToken: p.accessToken, role };
    } catch {
        return null;
    }
}

export function isPetAdmin (): boolean {
    return getAuthSession()?.role === ROLE_PET_ADMIN;
}

export function isPetAccountant (): boolean {
    return getAuthSession()?.role === ROLE_PET_ACCOUNTANT;
}

/** Clear PET session (localStorage). Call before navigating to `/login`. */
export function signOut (): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function setAuthSession (session: PetAuthSession): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}
