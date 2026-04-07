/** Admin role name in PET UI (carriers-style admin area). */
export const ROLE_PET_ADMIN = 'PetAdmin' as const;

export const ROLE_PET_USER = 'PetUser' as const;

/** Read-only financial reports access. */
export const ROLE_PET_ACCOUNTANT = 'PetAccountant' as const;

export type PetRole = typeof ROLE_PET_ADMIN | typeof ROLE_PET_USER | typeof ROLE_PET_ACCOUNTANT;

export type PetAuthSession = {
    accessToken: string;
    role: PetRole;
};

export function getAuthSession (): PetAuthSession | null {
    const raw = localStorage.getItem('pet-auth');
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
