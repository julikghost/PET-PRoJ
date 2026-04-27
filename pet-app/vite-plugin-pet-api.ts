import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin, PreviewServer } from 'vite';

/** Connect stores the middleware stack on `.stack` (used to run SPA fallback before static `sirv`). */
type ConnectWithStack = Connect.Server & {
    stack?: { route: string; handle: Connect.NextHandleFunction }[];
};

/**
 * `vite preview` serves static files only; deep links like `/login` 404 without this, so React never mounts
 * in Docker E2E. Serve `dist/index.html` for document navigations (same idea as dev server SPA fallback).
 */
function previewSpaFallbackMiddleware (indexPath: string): Connect.NextHandleFunction {
    let cached: Buffer | null = null;
    const readIndex = (): Buffer | null => {
        if (cached) {
            return cached;
        }
        try {
            cached = fs.readFileSync(indexPath);

            return cached;
        } catch {
            return null;
        }
    };

    return (req, res, next) => {
        if (req.method !== 'GET') {
            next();

            return;
        }
        const url = (req.url ?? '').split('?')[0] ?? '';
        if (url.startsWith('/api')) {
            next();

            return;
        }
        if (url.startsWith('/assets/') || url === '/vite.svg' || url === '/favicon.ico') {
            next();

            return;
        }
        const lastSeg = url.split('/').filter(Boolean).pop() ?? '';
        if (lastSeg.includes('.') && !lastSeg.endsWith('.html')) {
            next();

            return;
        }
        const html = readIndex();
        if (!html) {
            next();

            return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
    };
}

/**
 * Dev / preview middleware: POST /api/graphql echoes JSON the Playwright Reports POM expects
 * (JSON body, not multipart, so request capture can parse GraphQL).
 */
function petApiMiddleware () {
    return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api')) {
            next();

            return;
        }

        if (url.startsWith('/api/graphql') && req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });
            req.on('end', () => {
                void Buffer.concat(chunks);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                    JSON.stringify({
                        data: { reportEmailQueued: true },
                        jobId: 9001,
                    })
                );
            });

            return;
        }

        res.statusCode = 404;
        res.end();
    };
}

export function petApiPlugin (): Plugin {
    return {
        name: 'pet-api',
        configureServer (server) {
            server.middlewares.use(petApiMiddleware());
        },
        configurePreviewServer (server: PreviewServer) {
            const indexPath = path.resolve(server.config.root, server.config.build.outDir, 'index.html');
            const spa = previewSpaFallbackMiddleware(indexPath);
            /**
             * Preview mounts static file middleware first; deep links like `/login` 404 before our handler runs.
             * Prepend SPA fallback so HTML navigations always receive `index.html`.
             */
            const mw = server.middlewares as ConnectWithStack;
            if (Array.isArray(mw.stack)) {
                mw.stack.unshift({ route: '', handle: spa });
            } else {
                mw.use(spa);
            }
            mw.use(petApiMiddleware());
        },
    };
}
