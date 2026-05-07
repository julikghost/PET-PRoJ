import * as fs from 'fs';
import * as path from 'path';

export interface LogisticsReportGraphqlVariablesReq {
    paymentTypeNames: string[];
    targetColumnForDateSearch: string;
    fromDateDay?: string;
    toDateDay?: string;
    currencyNames: string[];
}

export interface LogisticsReportGraphqlExpected {
    operationName: string;
    queryContains: string;
    variables: {
        req: LogisticsReportGraphqlVariablesReq;
    };
}

/** Seed row for PET `pet-movers-v1` so Reports PetMover select has a matching option (same shape as pet-app). */
export interface LogisticsReportPetMoverSeed {
    id: string;
    name: string;
    code: string;
    active?: boolean;
    currency?: 'EUR' | 'USD';
    cars?: string;
    drivers?: string;
}

export interface LogisticsReportFixtures {
    reportPetMover: string;
    uiPaymentMethods: string[];
    uiCurrencies: string[];
    paymentCodeToName: Record<string, string>;
    currencyIdToName: Record<string, string>;
    petMoverIdsExpected?: string[];
    /** Prefer explicit seed; else derived from `reportPetMover` + `petMoverIdsExpected[0]` in tests. */
    petMoverSeed?: LogisticsReportPetMoverSeed;
    graphql: LogisticsReportGraphqlExpected;
}

export const DEFAULT_LOGISTICS_REPORT_FIXTURES: LogisticsReportFixtures = {
    reportPetMover: 'PetMover (PET-1)',
    uiPaymentMethods: ['Card', 'Cash', 'PetPay'],
    uiCurrencies: ['USD', 'EUR'],
    paymentCodeToName: {
        card: 'Card',
        cash: 'Cash',
        petpay: 'PetPay',
    },
    currencyIdToName: {
        'cur-usd': 'USD',
        'cur-eur': 'EUR',
    },
    petMoverIdsExpected: ['carrier-pet-1'],
    graphql: {
        operationName: 'EmailTicketsReport',
        queryContains: 'EmailTicketsReport',
        variables: {
            req: {
                paymentTypeNames: ['Card', 'Cash', 'PetPay'],
                targetColumnForDateSearch: 'departureDate',
                fromDateDay: 'CURRENT_MONTH_START',
                toDateDay: 'CURRENT_MONTH_END',
                currencyNames: ['USD', 'EUR'],
            },
        },
    },
};

function parseSubstitutionMap (): Record<string, string> {
    const raw = process.env.E2E_FIXTURE_SUBSTITUTIONS_JSON?.trim();
    if (!raw) {
        return {};
    }
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
            if (typeof k === 'string' && typeof v === 'string' && k.length > 0) {
                out[k] = v;
            }
        }

        return out;
    } catch {
        return {};
    }
}

let cachedMap: Record<string, string> | null = null;

function substitutionMap (): Record<string, string> {
    if (cachedMap === null) {
        cachedMap = parseSubstitutionMap();
    }

    return cachedMap;
}

/** Optional string replacements for fixture JSON (set `E2E_FIXTURE_SUBSTITUTIONS_JSON`). */
function applyFixtureSubstitutions (value: unknown): unknown {
    const map = substitutionMap();
    if (Object.keys(map).length === 0) {
        return value;
    }

    const applyStr = (s: string): string => {
        let out = s;
        for (const [from, to] of Object.entries(map)) {
            out = out.split(from).join(to);
        }

        return out;
    };

    if (typeof value === 'string') {
        return applyStr(value);
    }
    if (Array.isArray(value)) {
        return value.map(applyFixtureSubstitutions);
    }
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, applyFixtureSubstitutions(v)])
        );
    }

    return value;
}

function parseLogisticsReportFixtures (raw: string): LogisticsReportFixtures {
    const data = JSON.parse(raw) as LogisticsReportFixtures;

    return applyFixtureSubstitutions(data) as LogisticsReportFixtures;
}

export function loadLogisticsReportFixtures (): LogisticsReportFixtures {
    const fromEnv = process.env.LOGISTICS_REPORT_FIXTURES_JSON?.trim();
    if (fromEnv) {
        return parseLogisticsReportFixtures(fromEnv);
    }
    const localPath = path.join(__dirname, 'fixtures.local.json');
    if (fs.existsSync(localPath)) {
        return parseLogisticsReportFixtures(fs.readFileSync(localPath, 'utf8'));
    }

    return applyFixtureSubstitutions(DEFAULT_LOGISTICS_REPORT_FIXTURES) as LogisticsReportFixtures;
}
