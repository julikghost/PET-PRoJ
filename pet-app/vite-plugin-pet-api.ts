import fs from 'node:fs';
import path from 'node:path';
import { createHmac } from 'node:crypto';
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

type PetRole = 'PetAdmin' | 'PetUser' | 'PetAccountant';
type JwtPayload = {
    sub: string;
    role: PetRole;
    exp: number;
    iat: number;
};

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

function normalizeEnvValue (v: unknown): string | undefined {
    if (typeof v !== 'string') {
        return undefined;
    }
    const t = v.trim();
    return t.length > 0 ? t : undefined;
}

function firstDefined (...values: Array<string | undefined>): string | undefined {
    return values.find((v) => typeof v === 'string' && v.length > 0);
}

function base64UrlEncode (value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function parseJwtPayload (token: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }
    try {
        const decoded = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(decoded) as Partial<JwtPayload>;
        if (
            typeof payload.sub !== 'string'
            || (payload.role !== 'PetAdmin' && payload.role !== 'PetUser' && payload.role !== 'PetAccountant')
            || typeof payload.exp !== 'number'
            || typeof payload.iat !== 'number'
        ) {
            return null;
        }
        return payload as JwtPayload;
    } catch {
        return null;
    }
}

function signJwt (payload: JwtPayload, secret: string): string {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
}

function verifyJwt (token: string, secret: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }
    const expectedSig = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (expectedSig !== parts[2]) {
        return null;
    }
    const payload = parseJwtPayload(token);
    if (!payload) {
        return null;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSec) {
        return null;
    }
    return payload;
}

const LEGACY_TOKENS: Record<string, { sub: string; role: PetRole }> = {
    'pet-e2e-access-token': { sub: 'e2e-admin', role: 'PetAdmin' },
};

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

    const jwtSecret = normalizeEnvValue(process.env.PET_JWT_SECRET) ?? 'pet-dev-jwt-secret';
    const jwtTtlSec = Number(normalizeEnvValue(process.env.PET_JWT_TTL_SEC) ?? '28800');

    const credentials: Array<{ identifier: string; password: string; role: PetRole }> = [
        {
            identifier: firstDefined(
                normalizeEnvValue(process.env.VITE_PET_USER),
                normalizeEnvValue(process.env.LOGISTICS_UI_USER_NAME),
                normalizeEnvValue(process.env.LOGISTICS_E2E_USER_NAME)
            ) ?? 'pet.user@example.com',
            password: firstDefined(
                normalizeEnvValue(process.env.VITE_PET_PASSWORD),
                normalizeEnvValue(process.env.LOGISTICS_PASSWORD)
            ) ?? 'PetUser123!',
            role: 'PetUser',
        },
        {
            identifier: firstDefined(
                normalizeEnvValue(process.env.VITE_PET_ADMIN_USER),
                normalizeEnvValue(process.env.LOGISTICS_ADMIN_USER_NAME)
            ) ?? 'pet.admin@example.com',
            password: firstDefined(
                normalizeEnvValue(process.env.VITE_PET_ADMIN_PASSWORD),
                normalizeEnvValue(process.env.LOGISTICS_ADMIN_PASSWORD)
            ) ?? 'PetAdmin123!',
            role: 'PetAdmin',
        },
        {
            identifier: firstDefined(
                normalizeEnvValue(process.env.VITE_PET_ACCOUNTANT_USER),
                normalizeEnvValue(process.env.LOGISTICS_ACCOUNTANT_USER_NAME)
            ) ?? 'pet.accountant@example.com',
            password: firstDefined(
                normalizeEnvValue(process.env.VITE_PET_ACCOUNTANT_PASSWORD),
                normalizeEnvValue(process.env.LOGISTICS_ACCOUNTANT_PASSWORD)
            ) ?? 'PetAccountant123!',
            role: 'PetAccountant',
        },
    ];

    const createAccessToken = (identifier: string, role: PetRole): string => {
        const nowSec = Math.floor(Date.now() / 1000);
        return signJwt(
            {
                sub: identifier,
                role,
                iat: nowSec,
                exp: nowSec + Math.max(300, jwtTtlSec),
            },
            jwtSecret
        );
    };

    const getBearerToken = (req: IncomingMessage): string | null => {
        const authHeader = req.headers.authorization;
        if (typeof authHeader !== 'string') {
            return null;
        }
        const m = authHeader.match(/^Bearer\s+(.+)$/i);
        return m?.[1] ?? null;
    };

    const requireAuth = (req: IncomingMessage, res: ServerResponse): JwtPayload | null => {
        const token = getBearerToken(req);
        if (!token) {
            sendJson(res, 401, { error: 'Missing bearer token' });
            return null;
        }
        const payload = verifyJwt(token, jwtSecret);
        if (!payload && LEGACY_TOKENS[token]) {
            const nowSec = Math.floor(Date.now() / 1000);
            return {
                sub: LEGACY_TOKENS[token].sub,
                role: LEGACY_TOKENS[token].role,
                iat: nowSec,
                exp: nowSec + 3600,
            };
        }
        if (!payload) {
            sendJson(res, 401, { error: 'Invalid or expired token' });
            return null;
        }
        return payload;
    };

    const requireRole = (
        req: IncomingMessage,
        res: ServerResponse,
        roles: readonly PetRole[]
    ): JwtPayload | null => {
        const payload = requireAuth(req, res);
        if (!payload) {
            return null;
        }
        if (!roles.includes(payload.role)) {
            sendJson(res, 403, { error: 'Forbidden' });
            return null;
        }
        return payload;
    };

    return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const urlRaw = req.url ?? '';
        if (!urlRaw.startsWith('/api')) {
            next();

            return;
        }
        const url = new URL(urlRaw, 'http://localhost');
        const pathname = url.pathname;

        if (pathname === '/api/auth/login' && req.method === 'POST') {
            void readJson<{ identifier?: string; password?: string }>(req).then((body) => {
                const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';
                const password = typeof body?.password === 'string' ? body.password.trim() : '';
                const matched = credentials.find((cred) => cred.identifier === identifier && cred.password === password);
                if (!matched) {
                    return sendJson(res, 401, { error: 'Invalid credentials' });
                }
                return sendJson(res, 200, {
                    accessToken: createAccessToken(matched.identifier, matched.role),
                    role: matched.role,
                });
            });
            return;
        }

        if (pathname === '/api/graphql' && req.method === 'POST') {
            if (!requireRole(req, res, ['PetAdmin', 'PetAccountant'])) {
                return;
            }
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
        const authPayload = requireAuth(req, res);
        if (!authPayload) {
            return;
        }
        if (entity.base === 'pet-movers' && authPayload.role !== 'PetAdmin') {
            sendJson(res, 403, { error: 'PetMovers requires PetAdmin role' });
            return;
        }
        if (entity.base !== 'pet-movers' && authPayload.role === 'PetAccountant') {
            sendJson(res, 403, { error: 'PetAccountant role is read-only for reports only' });
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
