import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { petApiPlugin } from './vite-plugin-pet-api';

export default defineConfig({
    /** Explicit root so preview/Docker and Playwright always resolve `/assets/*` from the same origin as `LOGISTICS_BASE_CLIENT_URL`. */
    base: '/',
    plugins: [react(), petApiPlugin()],
    server: {
        /**
         * Docker E2E reaches the app as `http://pet-app:5173` (not localhost).
         * Vite's default CORS policy can reject module/css fetches with Origin header, yielding 403 and empty `#root`.
         */
        cors: true,
        port: Number(process.env.PET_DEV_PORT || process.env.PORT) || 5173,
        /** If 5173 is taken (old `pet:dev`), try the next port — check the terminal for the real URL. */
        strictPort: false,
    },
    preview: {
        /**
         * `vite preview` is reached from the `e2e` container via `http://pet-app:5173`.
         * Allow this host explicitly, otherwise Vite returns 403 for `/assets/*` and React never mounts.
         */
        allowedHosts: ['pet-app', 'localhost', '127.0.0.1'],
        /** Same CORS rule for `npm run preview` used inside Docker (`pet-app` service). */
        cors: true,
        port: Number(process.env.PET_DEV_PORT || process.env.PORT) || 5173,
    },
});
