/**
 * Pushes business requirements into Qase as suites + cases (tag: business-requirement).
 * Qase «Requirements» module has no public create endpoint in this MCP; cases in a dedicated suite are the portable approach.
 *
 * Usage:
 *   set QASE_API_TOKEN and QASE_PROJECT_CODE (2–10 chars, e.g. PET)
 *   node scripts/push-qase-requirements.mjs
 *
 * Optional: add QASE_API_TOKEN / QASE_PROJECT_CODE to repo root .env (loaded via dotenv).
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const API = 'https://api.qase.io/v1';

const token = process.env.QASE_API_TOKEN?.trim();
const code = process.env.QASE_PROJECT_CODE?.trim();

if (!token || !code) {
    console.error(
        'Missing QASE_API_TOKEN or QASE_PROJECT_CODE. Set them in the environment or in .env at the repo root.'
    );
    process.exit(1);
}

async function api (method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            Token: token,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { raw: text };
    }
    if (!res.ok) {
        const err = new Error(`Qase API ${res.status} ${method} ${path}: ${text.slice(0, 500)}`);
        err.details = data;
        throw err;
    }
    return data;
}

async function createSuite (title, description, parentId) {
    const payload = { title, description: description ?? '' };
    if (parentId) {
        payload.parent_id = parentId;
    }
    const data = await api('POST', `/suite/${encodeURIComponent(code)}`, payload);
    const id = data?.result?.id;
    if (!id) {
        throw new Error(`Unexpected suite response: ${JSON.stringify(data)}`);
    }
    return id;
}

async function createCase (suiteId, title, description, tags) {
    const payload = {
        suite_id: suiteId,
        title,
        description: description ?? '',
        tags: tags ?? ['business-requirement'],
        status: 'draft',
        type: 'other',
        automation: 'is-not-automated',
        severity: 'normal',
        priority: 'medium',
    };
    try {
        await api('POST', `/case/${encodeURIComponent(code)}`, payload);
    } catch (e) {
        if (String(e.message).includes('422') || String(e.message).includes('400')) {
            delete payload.type;
            await api('POST', `/case/${encodeURIComponent(code)}`, payload);
            return;
        }
        throw e;
    }
}

/** @type {{ title: string, description?: string, children: { title: string, description?: string, cases: { title: string, description: string }[] }[] }} */
const tree = {
    title: 'PET Logistics — бизнес-требования',
    description:
        'Демо-решение логистики перевозок животных: сеть, рейсы, брони, передержка, ситтеры, перевозчики, отчёты. Данные в браузере; без продакшен-бэкенда. Исключены из описания: Docker и автотесты.',
    children: [
        {
            title: 'Контекст и роли',
            cases: [
                {
                    title: 'REQ: назначение продукта',
                    description:
                        'Как учебное/портфолио решение система имитирует операционный кабинет логистики животных с разграничением доступа и сценариями ценообразования, согласованными с отчётностью.',
                },
                {
                    title: 'REQ: роль PetUser',
                    description:
                        'Операционный пользователь ведёт расписание рейсов, брони, точки, передержку и ситтеров в рамках операций (без админского справочника перевозчиков и без отчётов, кроме запрета на них по политике роли).',
                },
                {
                    title: 'REQ: роль PetAdmin',
                    description:
                        'Администратор имеет доступ ко всем операциям PetUser плюс справочник перевозчиков (Pet Movers) и отчёты (Reports).',
                },
                {
                    title: 'REQ: роль PetAccountant',
                    description:
                        'Бухгалтер/учёт имеет доступ к отчётности; операционное меню недоступно (редирект в отчёты).',
                },
            ],
        },
        {
            title: 'Базовый функционал (main)',
            cases: [
                {
                    title: 'REQ: точки сети (Points)',
                    description:
                        'Ведение справочника пунктов сети (тип точки, город и связанные атрибуты в модели UI).',
                },
                {
                    title: 'REQ: перевозки (Pet Shipping)',
                    description:
                        'Планирование рейса между двумя точками с привязкой к перевозчику; фиксация валюты и снимка реквизитов перевозчика (авто/водители) на момент сохранения рейса.',
                },
                {
                    title: 'REQ: бронирование (Booking)',
                    description:
                        'Оформление места на выбранном рейсе; учёт видов животных как каталога видов; способы оплаты; связь с рейсом.',
                },
                {
                    title: 'REQ: передержка (Dog Daycare)',
                    description:
                        'Отдельный бизнес-процесс «дневная передержка» с собственной ссылкой на внутреннее бронирование и датой в модели; не сводится к обязательной зависимости от записей рейсовых броней в предметной области.',
                },
                {
                    title: 'REQ: ситтеры (Pet Seaters)',
                    description:
                        'Ведение ситтеров и опциональное назначение на записи передержки.',
                },
                {
                    title: 'REQ: перевозчики (Pet Movers)',
                    description:
                        'Справочник перевозчиков: код, активность, валюта тарифа, текстовые поля про автопарк/водителей; влияет на новые и обновляемые рейсы.',
                },
                {
                    title: 'REQ: отчёты (Reports)',
                    description:
                        'Формирование и отправка отчёта по электронной почте через согласованный с UI сценарий (контракт GraphQL-заглушки).',
                },
            ],
        },
        {
            title: 'Эпик: Dog Daycare + Pet Seaters (ветка feature/dog-daycare-pet-seaters)',
            description:
                'Содержимое эпика вошло в main; историческая ветка может отставать от main.',
            cases: [
                {
                    title: 'REQ: независимый контур передержки',
                    description:
                        'Передержка описывается отдельно от рейсовых броней; собственные ссылки на внутреннее бронирование.',
                },
                {
                    title: 'REQ: опциональные ситтеры',
                    description:
                        'Ситтеры в том же хранилище; подключение к передержке по необходимости; расширение контракта данных под сущности.',
                },
            ],
        },
        {
            title: 'Ветка feature/discount',
            cases: [
                {
                    title: 'REQ: скидки каталожным клиентам',
                    description:
                        'Скидки для бронирования и передержки: дискретные уровни (например 0–50% фиксированным набором); применение к рассчитанной сумме; некорректное значение трактуется как отсутствие скидки.',
                },
                {
                    title: 'REQ: справочник клиентов',
                    description:
                        'Страница/хранилище клиентов для привязки скидок и сценариев бронирования/передержки.',
                },
                {
                    title: 'REQ: валидация расписания рейса (pet ship)',
                    description:
                        'Отправление и прибытие в один календарный день; длительность строго больше 30 минут; пользователю показывается понятное сообщение об ошибке при нарушении.',
                },
                {
                    title: 'REQ: коммуникация на экране расписания',
                    description:
                        'Уточнение описания/поведения на странице расписания перевозок (Movement Schedule).',
                },
            ],
        },
        {
            title: 'Ветка feature/pet-logistics-taxi',
            cases: [
                {
                    title: 'REQ: городское такси для питомцев (City Taxi)',
                    description:
                        'Отдельный сценарий: выбор города/маршрута, вид питомца, класс обслуживания, вес; для собак — рост в холке и опция клетки; расчёт километража через картографический сервис.',
                },
                {
                    title: 'REQ: тариф такси в EUR',
                    description:
                        'Стоимость от километров, вида питомца, клетки, надбавок по росту (диапазоны см), класса economy/business.',
                },
                {
                    title: 'REQ: перевозчик типа taxi',
                    description:
                        'В справочнике поддерживается тип движения «такси»; для такси валюта фиксируется как EUR; форма согласована с правилом.',
                },
                {
                    title: 'REQ: ключ картографического API',
                    description:
                        'Для расчёта маршрута требуется ключ доступа в настройках окружения (организационное требование к развёртыванию).',
                },
            ],
        },
        {
            title: 'Ветка feature/pet-logistics-updates',
            cases: [
                {
                    title: 'REQ: страница «Наши клиенты»',
                    description:
                        'Сводка по клиентам из бронирований и передержки: кто, питомцы/породы, тип услуги, количество обращений.',
                },
                {
                    title: 'REQ: страница «Европейские выставки»',
                    description:
                        'Информационный каталог крупных выставок с внешними ссылками; не заменяет CRM.',
                },
                {
                    title: 'REQ: имя клиента в бронировании и передержке',
                    description:
                        'Единое поле имени клиента для отчётности и аналитики; обновление контекста и типов данных.',
                },
                {
                    title: 'REQ: доработка логики передержки',
                    description:
                        'Приведение поведения и данных передержки в соответствие с расширенной моделью (по ветке).',
                },
            ],
        },
    ],
};

async function main () {
    const rootId = await createSuite(tree.title, tree.description);
    console.log(`Root suite id: ${rootId} (project ${code})`);

    for (const ch of tree.children) {
        const sid = await createSuite(ch.title, ch.description ?? '', rootId);
        console.log(`  Suite "${ch.title}" id: ${sid}`);
        for (const c of ch.cases) {
            await createCase(sid, c.title, c.description);
            console.log(`    + ${c.title}`);
        }
    }

    console.log('\nDone. Open the project in Qase and filter cases by tag "business-requirement" if needed.');
}

main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
});
