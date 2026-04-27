#!/usr/bin/env node
/**
 * Playwright Codegen: пишет шаги (клики, ввод) в TypeScript-файл по мере действий в открытом браузере.
 *
 * Запуск (из корня репо, `.env` подхватится):
 *   npm run e2e:codegen
 *   npm run e2e:codegen -- /booking
 *
 * Если есть `storageState/session.json` (после setup-сессии), логин подставится через --load-storage.
 * Куда писать: `E2E_CODEGEN_OUT=tests/recorded/my-flow.spec.ts` или по умолчанию `tests/recorded/codegen-steps.spec.ts`.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env'), override: false });

const base = (process.env.LOGISTICS_BASE_CLIENT_URL || 'http://localhost:5173/').trim().replace(/\/+$/, '');
const arg = process.argv[2] || '/home';
/** Путь для старта: относительный к `LOGISTICS_BASE_CLIENT_URL` или полный URL. */
const startPath = arg.startsWith('http')
    ? arg
    : arg.startsWith('/')
        ? arg
        : `/${arg}`;
const startUrl = arg.startsWith('http') ? arg : `${base}${startPath}`;

const outDir = path.join(root, 'tests', 'recorded');
fs.mkdirSync(outDir, { recursive: true });
const out = process.env.E2E_CODEGEN_OUT
    ? path.isAbsolute(process.env.E2E_CODEGEN_OUT)
        ? process.env.E2E_CODEGEN_OUT
        : path.join(root, process.env.E2E_CODEGEN_OUT)
    : path.join(outDir, 'codegen-steps.spec.ts');

const storagePath = path.join(root, 'storageState', 'session.json');
const loadStorage = fs.existsSync(storagePath) ? ['--load-storage', storagePath] : [];

/**
 * Путь к CLI: `require.resolve('playwright/cli.js')` ломается на новых Playwright (поле `exports` не отдаёт cli.js).
 * Берём файл с диска; на Windows дополнительно подходит `.bin/playwright.cmd`.
 */
function resolvePlaywrightCli () {
    const candidates = [
        path.join(root, 'node_modules', 'playwright', 'cli.js'),
        path.join(root, 'node_modules', 'playwright-core', 'cli.js'),
        path.join(root, 'node_modules', '@playwright', 'test', 'node_modules', 'playwright', 'cli.js'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    return null;
}

const playwrightCli = resolvePlaywrightCli();
if (!playwrightCli) {
    console.error('Playwright CLI not found. From repo root run: npm ci');
    process.exit(1);
}

/**
 * Playwright ≥1.57: у `codegen` нет `--base-url`; стартовый URL передаётся целиком.
 * `--target playwright-test` — TypeScript-спеки (раньше часто указывали `typescript`).
 */
const args = ['codegen', '--target', 'playwright-test', '-o', out, ...loadStorage, startUrl];

const child = spawn(process.execPath, [playwrightCli, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env },
});

child.on('exit', (code) => process.exit(code ?? 0));
