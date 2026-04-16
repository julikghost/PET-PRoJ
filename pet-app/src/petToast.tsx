import { toast as sonnerToast } from 'sonner';
import type { ExternalToast } from 'sonner';
import { BrandLogo } from './components/BrandLogo';

/** Same icon + visual weight as Reports “Submitted successfully” (sonner + BrandLogo). */
const PET_TOAST_ICON = <BrandLogo height={28} />;

function withPetIcon (opts?: ExternalToast): ExternalToast {
    return { ...opts, icon: opts?.icon ?? PET_TOAST_ICON };
}

/**
 * App-wide toasts: success and error use the brand logo at 28px unless `icon` is passed explicitly.
 */
export const toast = {
    success: (message: Parameters<typeof sonnerToast.success>[0], opts?: ExternalToast) =>
        sonnerToast.success(message, withPetIcon(opts)),
    error: (message: Parameters<typeof sonnerToast.error>[0], opts?: ExternalToast) =>
        sonnerToast.error(message, withPetIcon(opts)),
};
