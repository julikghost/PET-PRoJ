import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { petApiPlugin } from './vite-plugin-pet-api';

export default defineConfig({
    plugins: [react(), petApiPlugin()],
    server: {
        port: Number(process.env.PET_DEV_PORT || process.env.PORT) || 5173,
        /** If 5173 is taken (old `pet:dev`), try the next port — check the terminal for the real URL. */
        strictPort: false,
    },
});
