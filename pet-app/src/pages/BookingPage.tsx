import { useCallback, useMemo, useState } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { toast } from '../petToast';
import { BOOKING_PET_SPECIES } from '../data/bookingPets';
import { REPORT_CURRENCY_OPTIONS, REPORT_PAYMENT_OPTIONS } from '../data/reportsAndBookingOptions';
import { usePetLogistics } from '../context/PetLogisticsContext';
import { petTheme } from '../theme/palette';
import type { BookingBillingCurrency, BookingPaymentMethod, BookingRecord } from '../types/petLogistics';
import { BASE_RATE, computeBookingPrice, tripDayCount } from '../utils/pricing';

function paymentMethodLabel (m: BookingPaymentMethod): string {
    const o = REPORT_PAYMENT_OPTIONS.find((x) => x.value === m);

    return o?.label ?? m;
}

function billingCurrencyLabel (c: BookingBillingCurrency): string {
    const o = REPORT_CURRENCY_OPTIONS.find((x) => x.value === c);

    return o?.label ?? c;
}

export function BookingPage (): JSX.Element {
    const {
        bookings,
        petShips,
        bookablePetShips,
        petShipOptionLabel,
        upsertBooking,
        deleteBooking,
    } = usePetLogistics();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<BookingRecord | null>(null);
    const [form] = Form.useForm<{
        refCode: string;
        petShipId: string;
        date: dayjs.Dayjs;
        petLabels: string[];
        weightKg: number;
        paymentMethod: BookingPaymentMethod;
    }>();

    const shipOptionsForModal = useMemo(() => {
        const avail = [...bookablePetShips];
        if (editing) {
            const cur = petShips.find((s) => s.id === editing.petShipId);
            if (cur && !avail.some((s) => s.id === cur.id)) {
                avail.unshift(cur);
            }
        }

        return avail.map((s) => ({ value: s.id, label: petShipOptionLabel(s) }));
    }, [bookablePetShips, editing, petShips, petShipOptionLabel]);

    const petSpeciesOptions = useMemo(
        () => BOOKING_PET_SPECIES.map((s) => ({ value: s, label: s })),
        []
    );

    const openCreate = useCallback(() => {
        if (bookablePetShips.length === 0) {
            toast.error('Add points, then create a planned or active pet ship first');

            return;
        }
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            refCode: '',
            petShipId: undefined,
            date: dayjs().add(1, 'day'),
            petLabels: [],
            weightKg: 5,
            paymentMethod: 'card',
        });
        setModalOpen(true);
    }, [bookablePetShips.length, form]);

    const openEdit = useCallback(
        (record: BookingRecord) => {
            setEditing(record);
            form.setFieldsValue({
                refCode: record.refCode,
                petShipId: record.petShipId,
                date: dayjs(record.date, 'YYYY-MM-DD'),
                petLabels: record.petLabels,
                weightKg: record.weightKg,
                paymentMethod: record.paymentMethod,
            });
            setModalOpen(true);
        },
        [form]
    );

    const submitModal = useCallback(async () => {
        const v = await form.validateFields();
        const dateStr = v.date.format('YYYY-MM-DD');
        const ok = upsertBooking(
            editing
                ? {
                      refCode: v.refCode,
                      petShipId: v.petShipId,
                      date: dateStr,
                      petLabels: v.petLabels,
                      weightKg: v.weightKg,
                      paymentMethod: v.paymentMethod,
                      id: editing.id,
                  }
                : {
                      refCode: v.refCode,
                      petShipId: v.petShipId,
                      date: dateStr,
                      petLabels: v.petLabels,
                      weightKg: v.weightKg,
                      paymentMethod: v.paymentMethod,
                  }
        );
        if (ok) {
            toast.success(editing ? 'Booking updated' : 'Booking created');
            setModalOpen(false);
            setEditing(null);
        }
    }, [editing, form, upsertBooking]);

    const requestDelete = useCallback(
        (record: BookingRecord) => {
            Modal.confirm({
                title: 'Delete booking?',
                content: `Remove booking ${record.refCode}?`,
                okText: 'Delete',
                okButtonProps: { danger: true },
                cancelText: 'Cancel',
                onOk: () => {
                    deleteBooking(record.id);
                    toast.success('Booking deleted');
                },
            });
        },
        [deleteBooking]
    );

    const columns: ColumnsType<BookingRecord> = useMemo(
        () => [
            { title: 'Ref', dataIndex: 'refCode', key: 'refCode', width: 100 },
            {
                title: 'Pet ship',
                key: 'petShip',
                render: (_, record) => {
                    const ship = petShips.find((s) => s.id === record.petShipId);

                    return ship ? petShipOptionLabel(ship) : record.petShipId;
                },
            },
            { title: 'Date', dataIndex: 'date', key: 'date', width: 120 },
            {
                title: 'Species',
                key: 'petLabels',
                render: (_, record) => record.petLabels.join(', '),
            },
            { title: 'Weight (kg)', dataIndex: 'weightKg', key: 'weightKg', width: 90 },
            {
                title: 'Price',
                key: 'price',
                width: 120,
                render: (_, record) => `${record.price.toFixed(2)} ${record.currency}`,
            },
            {
                title: 'Payment',
                dataIndex: 'paymentMethod',
                key: 'paymentMethod',
                width: 90,
                render: (m: BookingPaymentMethod) => paymentMethodLabel(m),
            },
            {
                title: 'Billing',
                dataIndex: 'billingCurrency',
                key: 'billingCurrency',
                width: 80,
                render: (c: BookingBillingCurrency) => billingCurrencyLabel(c),
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
                            data-testid={`booking-edit-${record.refCode}`}
                            onClick={() => openEdit(record)}
                        >
                            Edit
                        </Button>
                        <Button
                            type="link"
                            danger
                            size="small"
                            data-testid={`booking-delete-${record.refCode}`}
                            onClick={() => requestDelete(record)}
                        >
                            Delete
                        </Button>
                    </Space>
                ),
            },
        ],
        [openEdit, petShipOptionLabel, petShips, requestDelete]
    );

    return (
        <div data-testid="booking-records-page">
            <Space align="center" style={{ marginBottom: 16 }} wrap>
                <h2 style={{ margin: 0, color: petTheme.text }}>Booking</h2>
                <Button type="primary" data-testid="booking-add" onClick={openCreate}>
                    New booking
                </Button>
            </Space>
            <p style={{ marginBottom: 16, color: petTheme.textMuted }}>
                Reserve a slot on an existing planned or active pet ship from PetShipping.
            </p>
            <div data-testid="booking-table">
                <Table<BookingRecord>
                    columns={columns}
                    dataSource={bookings}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: 'No bookings yet' }}
                />
            </div>

            <Modal
                title={editing ? 'Edit booking' : 'New booking'}
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setEditing(null);
                }}
                onOk={submitModal}
                okText="Save"
                destroyOnClose
            >
                <Form data-testid="booking-form" form={form} layout="vertical" className="ant-form">
                    <Form.Item name="refCode" label="Ref" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="booking-field-ref" />
                    </Form.Item>
                    <Form.Item name="petShipId" label="Pet ship" rules={[{ required: true }]}>
                        <Select
                            options={shipOptionsForModal}
                            placeholder="Choose a pet ship"
                            data-testid="booking-field-pet-ship"
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                        <div data-testid="booking-field-date">
                            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                        </div>
                    </Form.Item>
                    <Form.Item
                        name="petLabels"
                        label="Species"
                        rules={[
                            { required: true, message: 'Required' },
                            { type: 'array', min: 1, message: 'Select at least one species' },
                        ]}
                    >
                        <Select
                            mode="multiple"
                            showSearch
                            optionFilterProp="label"
                            options={petSpeciesOptions}
                            placeholder="Select one or more species"
                            data-testid="booking-field-pet"
                        />
                    </Form.Item>
                    <Form.Item name="weightKg" label="Weight (kg)" rules={[{ required: true }]}>
                        <div data-testid="booking-field-weight">
                            <InputNumber min={0.5} max={80} step={0.5} style={{ width: '100%' }} />
                        </div>
                    </Form.Item>
                    <Form.Item
                        name="paymentMethod"
                        label="Payment method"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Select
                            options={[...REPORT_PAYMENT_OPTIONS]}
                            data-testid="booking-field-payment"
                        />
                    </Form.Item>
                    <Form.Item dependencies={['petShipId', 'weightKg']} noStyle>
                        {() => {
                            const petShipId = form.getFieldValue('petShipId') as string | undefined;
                            const weightKg = form.getFieldValue('weightKg') as number | undefined;
                            const ship = petShips.find((s) => s.id === petShipId);
                            if (
                                !ship
                                || weightKg === undefined
                                || weightKg === null
                                || Number.isNaN(Number(weightKg))
                                || Number(weightKg) <= 0
                            ) {
                                return null;
                            }
                            const w = Number(weightKg);
                            const days = tripDayCount(ship.departure, ship.arrival);
                            const price = computeBookingPrice(w, ship.currency, ship.departure, ship.arrival);
                            const rate = BASE_RATE[ship.currency];

                            const carsLine = ship.cars.trim();
                            const driversLine = ship.drivers.trim();
                            const showFleet = Boolean(carsLine || driversLine);

                            return (
                                <div data-testid="booking-price-line" style={{ marginBottom: 16 }}>
                                    <div style={{ fontWeight: 600, color: petTheme.text }}>
                                        Price: {price.toFixed(2)} {ship.currency}
                                    </div>
                                    <div style={{ color: petTheme.textMuted, fontSize: 12 }}>
                                        {w} kg × {rate} × {days} day(s) on selected pet ship
                                    </div>
                                    {showFleet ? (
                                        <div
                                            data-testid="booking-ship-cars-drivers"
                                            style={{
                                                marginTop: 8,
                                                color: petTheme.textMuted,
                                                fontSize: 12,
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            {carsLine ? <div>Cars: {carsLine}</div> : null}
                                            {driversLine ? <div>Drivers: {driversLine}</div> : null}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        }}
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
