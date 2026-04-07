import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

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
        configurePreviewServer (server) {
            server.middlewares.use(petApiMiddleware());
        },
    };
}
