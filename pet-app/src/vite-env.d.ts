/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PET_USER: string;
    readonly VITE_PET_PASSWORD: string;
    /** Login that receives role PetAdmin (full app including PetMovers and Reports). */
    readonly VITE_PET_ADMIN_USER?: string;
    readonly VITE_PET_ADMIN_PASSWORD?: string;
    /** Login that receives role PetAccountant (Reports sidebar only). */
    readonly VITE_PET_ACCOUNTANT_USER?: string;
    readonly VITE_PET_ACCOUNTANT_PASSWORD?: string;
    /** Optional: enables Places search + route preview on City Taxi (`/city-taxi`). Without it, manual distance entry works. */
    readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
