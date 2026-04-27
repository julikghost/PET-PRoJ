/**
 * Dummy stack API for Docker Compose: waits until Postgres accepts TCP, then serves HTTP :3000.
 * Replace this service with your real backend image when it exists; keep `depends_on` + healthchecks.
 */
import http from 'node:http';
import net from 'node:net';

const host = process.env.PGHOST || 'db';

function waitForPostgres () {
    return new Promise((resolve) => {
        const attempt = () => {
            const s = net.createConnection({ host, port: 5432 }, () => {
                s.end();
                resolve();
            });
            s.on('error', () => {
                setTimeout(attempt, 400);
            });
        };
        attempt();
    });
}

await waitForPostgres();

http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
}).listen(3000, '0.0.0.0', () => {
    console.log('stack-api: postgres reachable, listening on :3000');
});
