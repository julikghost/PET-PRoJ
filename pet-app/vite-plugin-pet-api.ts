import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin, PreviewServer } from 'vite';
import type {
    BookingRecord,
    DogDaycareRecord,
    PetSeaterRecord,
    PetShipRecord,
    PointRecord,
} from './src/types/petLogistics';
import { PetStore, type PetMoverRow } from './src/server/petStore';

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
    const store = new PetStore();

    const sendJson = (res: ServerResponse, status: number, payload: unknown): void => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
    };

    const readJson = async <T>(req: IncomingMessage): Promise<T | null> => {
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => resolve());
        });
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    };

    const routeEntity = (pathname: string): { base: string; id?: string } | null => {
        const m = pathname.match(
            /^\/api\/(points|pet-ships|bookings|dog-daycares|pet-seaters|pet-movers)(?:\/([^/]+))?$/
        );
        if (!m) {
            return null;
        }
        return { base: m[1], id: m[2] };
    };

    return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const urlRaw = req.url ?? '';
        if (!urlRaw.startsWith('/api')) {
            next();

            return;
        }
        const url = new URL(urlRaw, 'http://localhost');
        const pathname = url.pathname;

        if (pathname === '/api/graphql' && req.method === 'POST') {
            void readJson(req).then(() => {
                sendJson(res, 200, {
                    data: { reportEmailQueued: true },
                    jobId: 9001,
                });
            });

            return;
        }

        if (pathname === '/api/test/reset' && req.method === 'POST') {
            store.reset();
            sendJson(res, 200, { ok: true });
            return;
        }
        if (pathname === '/api/test/seed' && req.method === 'POST') {
            void readJson<Partial<ReturnType<typeof store.snapshot>>>(req).then((body) => {
                store.replaceAll(body ?? {});
                sendJson(res, 200, { ok: true, data: store.snapshot() });
            });
            return;
        }

        const entity = routeEntity(pathname);
        if (!entity) {
            sendJson(res, 404, { error: 'Not found' });
            return;
        }

        const { base, id } = entity;
        if (req.method === 'GET' && !id) {
            if (base === 'points') return sendJson(res, 200, store.listPoints());
            if (base === 'pet-ships') return sendJson(res, 200, store.listPetShips());
            if (base === 'bookings') return sendJson(res, 200, store.listBookings());
            if (base === 'dog-daycares') return sendJson(res, 200, store.listDogDaycares());
            if (base === 'pet-seaters') return sendJson(res, 200, store.listPetSeaters());
            if (base === 'pet-movers') return sendJson(res, 200, store.listPetMovers());
        }
        if (req.method === 'POST' && !id) {
            if (base === 'points') {
                void readJson<Omit<PointRecord, 'id'> & { id?: string }>(req).then((body) => {
                    const r = store.upsertPoint(body ?? ({ code: '', name: '', city: '', kind: 'hub' } as Omit<PointRecord, 'id'>));
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'pet-ships') {
                void readJson<Omit<PetShipRecord, 'id'> & { id?: string }>(req).then((body) => {
                    const r = store.upsertPetShip(body as Omit<PetShipRecord, 'id'> & { id?: string });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'bookings') {
                void readJson<Omit<BookingRecord, 'id' | 'price' | 'currency' | 'billingCurrency'> & { id?: string }>(req).then((body) => {
                    const r = store.upsertBooking(body as Omit<BookingRecord, 'id' | 'price' | 'currency' | 'billingCurrency'> & { id?: string });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'dog-daycares') {
                void readJson<Omit<DogDaycareRecord, 'id' | 'petSeaterName' | 'price'> & { id?: string }>(req).then((body) => {
                    const r = store.upsertDogDaycare(body as Omit<DogDaycareRecord, 'id' | 'petSeaterName' | 'price'> & { id?: string });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'pet-seaters') {
                void readJson<Omit<PetSeaterRecord, 'id'> & { id?: string }>(req).then((body) => {
                    const r = store.upsertPetSeater(body as Omit<PetSeaterRecord, 'id'> & { id?: string });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'pet-movers') {
                void readJson<Omit<PetMoverRow, 'id'> & { id?: string }>(req).then((body) => {
                    const r = store.upsertPetMover(body as Omit<PetMoverRow, 'id'> & { id?: string });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
        }
        if (req.method === 'PUT' && id) {
            if (base === 'points') {
                void readJson<Omit<PointRecord, 'id'>>(req).then((body) => {
                    const r = store.upsertPoint({ ...(body ?? { code: '', name: '', city: '', kind: 'hub' }), id });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'pet-ships') {
                void readJson<Omit<PetShipRecord, 'id'>>(req).then((body) => {
                    const r = store.upsertPetShip({ ...(body as Omit<PetShipRecord, 'id'>), id });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'bookings') {
                void readJson<Omit<BookingRecord, 'id' | 'price' | 'currency' | 'billingCurrency'>>(req).then((body) => {
                    const r = store.upsertBooking({
                        ...(body as Omit<BookingRecord, 'id' | 'price' | 'currency' | 'billingCurrency'>),
                        id,
                    });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'dog-daycares') {
                void readJson<Omit<DogDaycareRecord, 'id' | 'petSeaterName' | 'price'>>(req).then((body) => {
                    const r = store.upsertDogDaycare({
                        ...(body as Omit<DogDaycareRecord, 'id' | 'petSeaterName' | 'price'>),
                        id,
                    });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'pet-seaters') {
                void readJson<Omit<PetSeaterRecord, 'id'>>(req).then((body) => {
                    const r = store.upsertPetSeater({ ...(body as Omit<PetSeaterRecord, 'id'>), id });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
            if (base === 'pet-movers') {
                void readJson<Omit<PetMoverRow, 'id'>>(req).then((body) => {
                    const r = store.upsertPetMover({ ...(body as Omit<PetMoverRow, 'id'>), id });
                    if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                    return sendJson(res, 200, r.data);
                });
                return;
            }
        }
        if (req.method === 'PUT' && !id && base === 'pet-movers') {
            void readJson<PetMoverRow[]>(req).then((rows) => {
                sendJson(res, 200, store.replacePetMovers(Array.isArray(rows) ? rows : []));
            });
            return;
        }
        if (req.method === 'DELETE' && id) {
            if (base === 'points') {
                const r = store.deletePoint(id);
                if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                return sendJson(res, 200, r.data);
            }
            if (base === 'pet-ships') {
                const r = store.deletePetShip(id);
                if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                return sendJson(res, 200, r.data);
            }
            if (base === 'bookings') return sendJson(res, 200, store.deleteBooking(id).data);
            if (base === 'dog-daycares') return sendJson(res, 200, store.deleteDogDaycare(id).data);
            if (base === 'pet-seaters') {
                const r = store.deletePetSeater(id);
                if (!r.ok) return sendJson(res, r.status ?? 400, { error: r.error });
                return sendJson(res, 200, r.data);
            }
            if (base === 'pet-movers') return sendJson(res, 200, store.deletePetMover(id).data);
        }

        sendJson(res, 404, { error: 'Not found' });
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
