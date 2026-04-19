import { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Calendar, DatePicker, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import type { CalendarProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { toast } from '../petToast';
import { petMoverSelectOptions, usePetMovers } from '../petMoversStorage';
import { usePetLogistics } from '../context/PetLogisticsContext';
import { petTheme } from '../theme/palette';
import type { PetShipCurrency, PetShipRecord } from '../types/petLogistics';

dayjs.extend(customParseFormat);

const DATETIME_FMT = 'YYYY-MM-DD HH:mm';

function parseDeparture (s: string): Dayjs | null {
    const d = dayjs(s.trim(), DATETIME_FMT, true);

    return d.isValid() ? d : null;
}

const STATUS_OPTIONS = [
    { value: 'planned', label: 'Planned' },
    { value: 'active', label: 'In transit' },
    { value: 'done', label: 'Completed' },
];

const statusColor: Record<PetShipRecord['status'], string> = {
    planned: 'blue',
    active: 'processing',
    done: 'success',
};

export function MovementSchedulePage (): JSX.Element {
    const {
        points,
        petShips,
        pointOptionLabel,
        petShipRouteText,
        upsertPetShip,
        deletePetShip,
    } = usePetLogistics();
    const [petMovers] = usePetMovers();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PetShipRecord | null>(null);
    const [form] = Form.useForm<
        Pick<
            PetShipRecord,
            | 'refCode'
            | 'fromPointId'
            | 'toPointId'
            | 'departure'
            | 'arrival'
            | 'petMover'
            | 'status'
        >
    >();

    const pointOptions = useMemo(
        () => points.map((p) => ({ value: p.id, label: pointOptionLabel(p) })),
        [points, pointOptionLabel]
    );

    const petMoverOptions = useMemo(
        () => petMoverSelectOptions(petMovers, 'name', (m) => m.movementType === 'shipping'),
        [petMovers]
    );

    /** Include legacy `petMover` string if it no longer matches an active row (editing old ships). */
    const petMoverOptionsForModal = useMemo(() => {
        const base = petMoverOptions;
        if (editing?.petMover && !base.some((o) => o.value === editing.petMover)) {
            return [...base, { value: editing.petMover, label: editing.petMover }];
        }

        return base;
    }, [petMoverOptions, editing]);

    const petShipsByDepartureDay = useMemo(() => {
        const map = new Map<string, PetShipRecord[]>();
        for (const ship of petShips) {
            const dep = parseDeparture(ship.departure);
            if (!dep) {
                continue;
            }
            const key = dep.format('YYYY-MM-DD');
            const list = map.get(key) ?? [];
            list.push(ship);
            map.set(key, list);
        }
        for (const [, list] of map) {
            list.sort((a, b) => {
                const da = parseDeparture(a.departure);
                const db = parseDeparture(b.departure);

                return (da?.valueOf() ?? 0) - (db?.valueOf() ?? 0);
            });
        }

        return map;
    }, [petShips]);

    const calendarCellRender: CalendarProps<Dayjs>['cellRender'] = useCallback(
        (date: Dayjs, info: { type: string }) => {
            if (info.type !== 'date') {
                return null;
            }
            const key = date.format('YYYY-MM-DD');
            const dayShips = petShipsByDepartureDay.get(key) ?? [];

            if (dayShips.length === 0) {
                return null;
            }

            return (
                <ul
                    style={{
                        listStyle: 'none',
                        margin: '4px 0 0',
                        padding: 0,
                        fontSize: 11,
                        lineHeight: 1.35,
                        maxHeight: 72,
                        overflow: 'auto',
                    }}
                >
                    {dayShips.map((ship) => (
                        <li key={ship.id} style={{ marginBottom: 2 }}>
                            <Tag
                                color={statusColor[ship.status]}
                                style={{ marginInlineEnd: 4, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}
                            >
                                {ship.refCode}
                            </Tag>
                            <span style={{ color: petTheme.textMuted }}>{petShipRouteText(ship)}</span>
                        </li>
                    ))}
                </ul>
            );
        },
        [petShipsByDepartureDay, petShipRouteText]
    );

    const openCreate = useCallback(() => {
        if (points.length < 2) {
            toast.error('Create at least two points in Points first');

            return;
        }
        if (petMoverOptions.length === 0) {
            toast.error('Add at least one active PetMover with type Shipping under PetMovers first');

            return;
        }
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            refCode: '',
            fromPointId: undefined,
            toPointId: undefined,
            departure: '',
            arrival: '',
            petMover: undefined,
            status: 'planned',
        });
        setModalOpen(true);
    }, [form, petMoverOptions.length, points.length]);

    const openEdit = useCallback(
        (record: PetShipRecord) => {
            setEditing(record);
            const { currency: _currency, cars: _cars, drivers: _drivers, ...formValues } = record;
            form.setFieldsValue(formValues);
            setModalOpen(true);
        },
        [form]
    );

    const submitModal = useCallback(async () => {
        const v = await form.validateFields();
        const mover = petMovers.find((m) => m.name === v.petMover);
        const currency: PetShipCurrency = mover?.currency === 'USD' ? 'USD' : 'EUR';
        const cars = (mover?.cars ?? '').trim();
        const drivers = (mover?.drivers ?? '').trim();
        const ok = upsertPetShip(
            editing
                ? { ...v, id: editing.id, currency, cars, drivers }
                : { ...v, currency, cars, drivers }
        );
        if (ok) {
            toast.success(editing ? 'Pet ship updated' : 'Pet ship created');
            setModalOpen(false);
            setEditing(null);
        }
    }, [editing, form, petMovers, upsertPetShip]);

    const requestDelete = useCallback(
        (record: PetShipRecord) => {
            Modal.confirm({
                title: 'Delete pet ship?',
                content: `Remove ${petShipRouteText(record)} (${record.refCode})?`,
                okText: 'Delete',
                okButtonProps: { danger: true },
                cancelText: 'Cancel',
                onOk: () => {
                    const ok = deletePetShip(record.id);
                    if (ok) {
                        toast.success('Pet ship deleted');
                    }
                },
            });
        },
        [deletePetShip, petShipRouteText]
    );

    const columns: ColumnsType<PetShipRecord> = useMemo(
        () => [
            { title: 'Ref', dataIndex: 'refCode', key: 'refCode', width: 100 },
            {
                title: 'Route',
                key: 'route',
                render: (_, record) => petShipRouteText(record),
            },
            { title: 'Departure', dataIndex: 'departure', key: 'departure', width: 150 },
            { title: 'Arrival', dataIndex: 'arrival', key: 'arrival', width: 150 },
            {
                title: 'PetMover',
                dataIndex: 'petMover',
                key: 'petMover',
                render: (name: string) => {
                    const m = petMovers.find((x) => x.name === name);

                    return m ? `${m.name} (${m.code})` : name;
                },
            },
            {
                title: 'Curr.',
                dataIndex: 'currency',
                key: 'currency',
                width: 64,
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 130,
                render: (s: PetShipRecord['status']) => (
                    <Tag color={statusColor[s]}>
                        {STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}
                    </Tag>
                ),
            },
            {
                title: 'Actions',
                key: 'actions',
                width: 160,
                render: (_, record) => (
                    <Space>
                        <Button
                            type="link"
                            size="small"
                            data-testid={`schedule-edit-${record.refCode}`}
                            onClick={() => openEdit(record)}
                        >
                            Edit
                        </Button>
                        <Button
                            type="link"
                            danger
                            size="small"
                            data-testid={`schedule-delete-${record.refCode}`}
                            onClick={() => requestDelete(record)}
                        >
                            Delete
                        </Button>
                    </Space>
                ),
            },
        ],
        [openEdit, petMovers, petShipRouteText, requestDelete]
    );

    return (
        <div data-testid="movement-schedule-page">
            <Space align="center" style={{ marginBottom: 16 }} wrap>
                <h2 style={{ margin: 0, color: petTheme.text }}>PetShipping</h2>
                <Button type="primary" data-testid="schedule-add" onClick={openCreate}>
                    Add pet ship
                </Button>
            </Space>
            <p style={{ marginBottom: 16, color: petTheme.textMuted }}>
                Define routes between points. Booking uses planned or active pet ships only. Trips appear in the
                calendar by departure date (add them with the button above).
            </p>
            <div data-testid="schedule-calendar" style={{ marginBottom: 24 }}>
                <Calendar fullscreen={false} cellRender={calendarCellRender} />
            </div>
            <div data-testid="schedule-table">
                <Table<PetShipRecord>
                    columns={columns}
                    dataSource={petShips}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: 'No pet ships yet' }}
                />
            </div>

            <Modal
                title={editing ? 'Edit pet ship' : 'Pet ship'}
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setEditing(null);
                }}
                onOk={submitModal}
                okText="Save"
                destroyOnClose
            >
                {petMoverOptions.length === 0 ? (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message="No active shipping PetMover"
                        description='Add at least one active PetMover with movement type "Shipping" under PetMovers, then create a pet ship.'
                    />
                ) : null}
                <Form data-testid="schedule-form" form={form} layout="vertical" className="ant-form">
                    <Form.Item name="refCode" label="Ref" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="schedule-field-ref" />
                    </Form.Item>
                    <Form.Item
                        name="fromPointId"
                        label="From"
                        tooltip="Point of departure"
                        rules={[{ required: true }]}
                    >
                        <Select
                            options={pointOptions}
                            placeholder="Point of departure"
                            data-testid="schedule-field-from"
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item
                        name="toPointId"
                        label="To"
                        tooltip="Point of arrival"
                        rules={[{ required: true }]}
                    >
                        <Select
                            options={pointOptions}
                            placeholder="Point of arrival"
                            data-testid="schedule-field-to"
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item
                        name="departure"
                        label="Departure"
                        rules={[{ required: true, message: 'Required' }]}
                        getValueFromEvent={(d: Dayjs | null) => (d?.isValid() ? d.format(DATETIME_FMT) : '')}
                        getValueProps={(value: string) => ({
                            value:
                                value && dayjs(value, DATETIME_FMT, true).isValid()
                                    ? dayjs(value, DATETIME_FMT, true)
                                    : undefined,
                        })}
                    >
                        <DatePicker
                            showTime
                            format={DATETIME_FMT}
                            style={{ width: '100%' }}
                            data-testid="schedule-field-departure"
                            inputReadOnly={false}
                        />
                    </Form.Item>
                    <Form.Item
                        name="arrival"
                        label="Arrival"
                        rules={[{ required: true, message: 'Required' }]}
                        getValueFromEvent={(d: Dayjs | null) => (d?.isValid() ? d.format(DATETIME_FMT) : '')}
                        getValueProps={(value: string) => ({
                            value:
                                value && dayjs(value, DATETIME_FMT, true).isValid()
                                    ? dayjs(value, DATETIME_FMT, true)
                                    : undefined,
                        })}
                    >
                        <DatePicker
                            showTime
                            format={DATETIME_FMT}
                            style={{ width: '100%' }}
                            data-testid="schedule-field-arrival"
                            inputReadOnly={false}
                        />
                    </Form.Item>
                    <Form.Item
                        name="petMover"
                        label="PetMover"
                        tooltip="Tariff currency (EUR/USD) comes from this PetMover in PetMovers."
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={petMoverOptionsForModal}
                            placeholder="Select PetMover"
                            data-testid="schedule-field-petmover"
                        />
                    </Form.Item>
                    <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                        <Select options={STATUS_OPTIONS} data-testid="schedule-field-status" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
