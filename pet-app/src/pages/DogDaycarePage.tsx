import { useCallback, useMemo, useState } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { toast } from '../petToast';
import { DOG_DAYCARE_STATUS_OPTIONS } from '../data/reportsAndBookingOptions';
import { usePetLogistics } from '../context/PetLogisticsContext';
import { petTheme } from '../theme/palette';
import type { DogDaycareRecord, DogDaycareStatus, PetShipCurrency } from '../types/petLogistics';
import { computeDogDaycarePrice, dogDaycareHourlyRate, dogDaycareSizeByWeight } from '../utils/pricing';

function daycareStatusLabel (status: DogDaycareStatus): string {
    const item = DOG_DAYCARE_STATUS_OPTIONS.find((x) => x.value === status);

    return item?.label ?? status;
}

const statusColor: Record<DogDaycareStatus, string> = {
    scheduled: 'blue',
    'checked-in': 'processing',
    active: 'gold',
    'checked-out': 'success',
};

export function DogDaycarePage (): JSX.Element {
    const {
        dogDaycares,
        petSeaters,
        activePetSeaters,
        petSeaterOptionLabel,
        upsertDogDaycare,
        deleteDogDaycare,
    } = usePetLogistics();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<DogDaycareRecord | null>(null);
    const [form] = Form.useForm<{
        refCode: string;
        bookingRefCode: string;
        bookingDate: dayjs.Dayjs;
        dogName: string;
        dogWeightKg: number;
        currency: PetShipCurrency;
        hours: number;
        status: DogDaycareStatus;
        petSeaterId?: string;
        notes: string;
    }>();

    const petSeaterOptionsForModal = useMemo(() => {
        const source = [...activePetSeaters];
        if (editing) {
            const current = editing.petSeaterId
                ? petSeaters.find((s) => s.id === editing.petSeaterId)
                : undefined;
            if (current && !source.some((s) => s.id === current.id)) {
                source.unshift(current);
            }
        }

        return source.map((petSeater) => ({
            value: petSeater.id,
            label: petSeaterOptionLabel(petSeater),
        }));
    }, [activePetSeaters, editing, petSeaterOptionLabel, petSeaters]);

    const openCreate = useCallback(() => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            refCode: '',
            bookingRefCode: '',
            bookingDate: dayjs(),
            dogName: '',
            dogWeightKg: 8,
            currency: 'EUR',
            hours: 4,
            status: 'scheduled',
            petSeaterId: undefined,
            notes: '',
        });
        setModalOpen(true);
    }, [form]);

    const openEdit = useCallback(
        (record: DogDaycareRecord) => {
            setEditing(record);
            form.setFieldsValue({
                refCode: record.refCode,
                bookingRefCode: record.bookingRefCode,
                bookingDate: record.bookingDate ? dayjs(record.bookingDate, 'YYYY-MM-DD') : dayjs(),
                dogName: record.dogName,
                dogWeightKg: record.dogWeightKg,
                currency: record.currency,
                hours: record.hours,
                status: record.status,
                petSeaterId: record.petSeaterId,
                notes: record.notes,
            });
            setModalOpen(true);
        },
        [form]
    );

    const submitModal = useCallback(async () => {
        const v = await form.validateFields();
        const payload = {
            ...v,
            bookingDate: v.bookingDate.format('YYYY-MM-DD'),
            dogWeightKg: Number(v.dogWeightKg),
            hours: Number(v.hours),
            petSeaterId: typeof v.petSeaterId === 'string' ? v.petSeaterId : undefined,
        };
        const ok = upsertDogDaycare(
            editing
                ? { ...payload, id: editing.id }
                : payload
        );
        if (ok) {
            toast.success(editing ? 'Dog daycare updated' : 'Dog daycare created');
            setModalOpen(false);
            setEditing(null);
        }
    }, [editing, form, upsertDogDaycare]);

    const requestDelete = useCallback(
        (record: DogDaycareRecord) => {
            Modal.confirm({
                title: 'Delete dog daycare?',
                content: `Remove dog daycare ${record.refCode}?`,
                okText: 'Delete',
                okButtonProps: { danger: true },
                cancelText: 'Cancel',
                onOk: () => {
                    deleteDogDaycare(record.id);
                    toast.success('Dog daycare deleted');
                },
            });
        },
        [deleteDogDaycare]
    );

    const columns: ColumnsType<DogDaycareRecord> = useMemo(
        () => [
            { title: 'Ref', dataIndex: 'refCode', key: 'refCode', width: 120 },
            {
                title: 'Booking',
                key: 'bookingRefCode',
                render: (_, record) => `${record.bookingRefCode} (${record.bookingDate || 'n/a'})`,
            },
            { title: 'Dog', dataIndex: 'dogName', key: 'dogName', width: 140 },
            { title: 'Weight (kg)', dataIndex: 'dogWeightKg', key: 'dogWeightKg', width: 90 },
            { title: 'Hours', dataIndex: 'hours', key: 'hours', width: 80 },
            {
                title: 'Pet Seater',
                key: 'petSeaterName',
                width: 160,
                render: (_, record) => record.petSeaterName || 'Unassigned',
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (status: DogDaycareStatus) => (
                    <Tag color={statusColor[status]}>{daycareStatusLabel(status)}</Tag>
                ),
            },
            {
                title: 'Price',
                key: 'price',
                width: 120,
                render: (_, record) => `${record.price.toFixed(2)} ${record.currency}`,
            },
            {
                title: 'Notes',
                dataIndex: 'notes',
                key: 'notes',
                render: (notes: string) => notes || '—',
            },
            {
                title: 'Actions',
                key: 'actions',
                width: 170,
                render: (_, record) => (
                    <Space>
                        <Button
                            type="link"
                            size="small"
                            data-testid={`daycare-edit-${record.refCode}`}
                            onClick={() => openEdit(record)}
                        >
                            Edit
                        </Button>
                        <Button
                            type="link"
                            danger
                            size="small"
                            data-testid={`daycare-delete-${record.refCode}`}
                            onClick={() => requestDelete(record)}
                        >
                            Delete
                        </Button>
                    </Space>
                ),
            },
        ],
        [openEdit, requestDelete]
    );

    return (
        <div data-testid="dog-daycare-page">
            <Space align="center" style={{ marginBottom: 16 }} wrap>
                <h2 style={{ margin: 0, color: petTheme.text }}>Dog Daycare</h2>
                <Button type="primary" data-testid="daycare-add" onClick={openCreate}>
                    Add daycare stop
                </Button>
            </Space>
            <p style={{ marginBottom: 16, color: petTheme.textMuted }}>
                Manage daycare with an internal daycare booking (independent from Booking page). Pet seater assignment
                is optional.
            </p>
            <div data-testid="daycare-table">
                <Table<DogDaycareRecord>
                    columns={columns}
                    dataSource={dogDaycares}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: 'No daycare stops yet' }}
                />
            </div>

            <Modal
                title={editing ? 'Edit dog daycare' : 'New dog daycare'}
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setEditing(null);
                }}
                onOk={submitModal}
                okText="Save"
                destroyOnClose
            >
                <Form data-testid="daycare-form" form={form} layout="vertical" className="ant-form">
                    <Form.Item name="refCode" label="Ref" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="daycare-field-ref" />
                    </Form.Item>
                    <Form.Item
                        name="bookingRefCode"
                        label="Daycare booking ref"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input data-testid="daycare-field-booking-ref" />
                    </Form.Item>
                    <Form.Item
                        name="bookingDate"
                        label="Daycare booking date"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <div data-testid="daycare-field-booking-date">
                            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                        </div>
                    </Form.Item>
                    <Form.Item name="dogName" label="Dog name" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="daycare-field-dog-name" />
                    </Form.Item>
                    <Form.Item
                        name="dogWeightKg"
                        label="Dog weight (kg)"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <div data-testid="daycare-field-weight">
                            <InputNumber min={0.5} max={90} step={0.5} style={{ width: '100%' }} />
                        </div>
                    </Form.Item>
                    <Form.Item
                        name="currency"
                        label="Currency"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Select
                            options={[
                                { value: 'EUR', label: 'EUR' },
                                { value: 'USD', label: 'USD' },
                            ]}
                            data-testid="daycare-field-currency"
                        />
                    </Form.Item>
                    <Form.Item
                        name="hours"
                        label="Hours"
                        rules={[
                            { required: true, message: 'Required' },
                            {
                                validator: (_rule, value) => {
                                    const parsed = Number(value);
                                    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 12) {
                                        return Promise.resolve();
                                    }

                                    return Promise.reject(new Error('Must be between 1 and 12'));
                                },
                            },
                        ]}
                    >
                        <div data-testid="daycare-field-hours">
                            <InputNumber min={1} max={12} step={1} style={{ width: '100%' }} />
                        </div>
                    </Form.Item>
                    <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Required' }]}>
                        <Select options={[...DOG_DAYCARE_STATUS_OPTIONS]} data-testid="daycare-field-status" />
                    </Form.Item>
                    <Form.Item
                        name="petSeaterId"
                        label="Pet seater (optional)"
                        tooltip="You can leave this empty and assign later."
                    >
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={petSeaterOptionsForModal}
                            placeholder="Optional"
                            data-testid="daycare-field-pet-seater"
                        />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={3} maxLength={240} data-testid="daycare-field-notes" />
                    </Form.Item>
                    <Form.Item dependencies={['dogWeightKg', 'currency', 'hours']} noStyle>
                        {() => {
                            const weight = Number(form.getFieldValue('dogWeightKg'));
                            const currency = form.getFieldValue('currency') as PetShipCurrency | undefined;
                            const hours = Number(form.getFieldValue('hours'));
                            if (!Number.isFinite(weight) || weight <= 0 || !currency || !Number.isFinite(hours)) {
                                return null;
                            }
                            const price = computeDogDaycarePrice(weight, currency, hours);
                            const hourly = dogDaycareHourlyRate(currency, weight);
                            const size = dogDaycareSizeByWeight(weight);

                            return (
                                <div data-testid="daycare-price-line" style={{ marginBottom: 12 }}>
                                    <div style={{ fontWeight: 600, color: petTheme.text }}>
                                        Price: {price.toFixed(2)} {currency}
                                    </div>
                                    <div style={{ color: petTheme.textMuted, fontSize: 12 }}>
                                        {hours}h × {hourly} ({size}) for {weight}kg
                                    </div>
                                </div>
                            );
                        }}
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
