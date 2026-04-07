import { useCallback, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { toast } from 'sonner';
import { usePetLogistics } from '../context/PetLogisticsContext';
import { petTheme } from '../theme/palette';
import type { PetShipRecord } from '../types/petLogistics';

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
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PetShipRecord | null>(null);
    const [form] = Form.useForm<
        Pick<
            PetShipRecord,
            'refCode' | 'fromPointId' | 'toPointId' | 'departure' | 'arrival' | 'petMover' | 'status'
        >
    >();

    const pointOptions = useMemo(
        () => points.map((p) => ({ value: p.id, label: pointOptionLabel(p) })),
        [points, pointOptionLabel]
    );

    const openCreate = useCallback(() => {
        if (points.length < 2) {
            toast.error('Create at least two points in Points first');

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
            petMover: '',
            status: 'planned',
        });
        setModalOpen(true);
    }, [form, points.length]);

    const openEdit = useCallback(
        (record: PetShipRecord) => {
            setEditing(record);
            form.setFieldsValue(record);
            setModalOpen(true);
        },
        [form]
    );

    const submitModal = useCallback(async () => {
        const v = await form.validateFields();
        const ok = upsertPetShip(
            editing
                ? { ...v, id: editing.id }
                : v
        );
        if (ok) {
            toast.success(editing ? 'Pet ship updated' : 'Pet ship created');
            setModalOpen(false);
            setEditing(null);
        }
    }, [editing, form, upsertPetShip]);

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
            { title: 'PetMover', dataIndex: 'petMover', key: 'petMover' },
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
        [openEdit, petShipRouteText, requestDelete]
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
                Define routes between points. Booking uses planned or active pet ships only.
            </p>
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
                    <Form.Item name="departure" label="Departure" rules={[{ required: true }]}>
                        <Input data-testid="schedule-field-departure" placeholder="2026-04-08 09:00" />
                    </Form.Item>
                    <Form.Item name="arrival" label="Arrival" rules={[{ required: true }]}>
                        <Input data-testid="schedule-field-arrival" placeholder="2026-04-08 18:30" />
                    </Form.Item>
                    <Form.Item name="petMover" label="PetMover" rules={[{ required: true }]}>
                        <Input data-testid="schedule-field-petmover" />
                    </Form.Item>
                    <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                        <Select options={STATUS_OPTIONS} data-testid="schedule-field-status" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
