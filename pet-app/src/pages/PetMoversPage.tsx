import { useCallback, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Switch, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { toast } from '../petToast';
import { type PetMoverMovementType, type PetMoverRow, usePetMovers } from '../petMoversStorage';

export type { PetMoverRow } from '../petMoversStorage';

const MOVEMENT_TYPE_OPTIONS: { value: PetMoverMovementType; label: string }[] = [
    { value: 'shipping', label: 'Shipping (PetShipping)' },
    { value: 'taxi', label: 'Taxi (city delivery)' },
];

const CURRENCY_OPTIONS = [
    { value: 'EUR', label: 'EUR' },
    { value: 'USD', label: 'USD' },
];

function newId (): string {
    return `pm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** PetMovers admin list with create / edit / delete (PetAdmin only). */
export function PetMoversPage (): JSX.Element {
    const [rows, setRows] = usePetMovers();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PetMoverRow | null>(null);
    const [form] = Form.useForm<
        Pick<PetMoverRow, 'name' | 'code' | 'active' | 'currency' | 'cars' | 'drivers' | 'movementType'>
    >();

    const openCreate = useCallback(() => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            name: '',
            code: '',
            active: true,
            currency: 'EUR',
            cars: '',
            drivers: '',
            movementType: 'shipping',
        });
        setModalOpen(true);
    }, [form]);

    const openEdit = useCallback(
        (record: PetMoverRow) => {
            setEditing(record);
            form.setFieldsValue({
                name: record.name,
                code: record.code,
                active: record.active,
                currency: record.currency,
                cars: record.cars,
                drivers: record.drivers,
                movementType: record.movementType,
            });
            setModalOpen(true);
        },
        [form]
    );

    const submitModal = useCallback(async () => {
        const v = await form.validateFields();
        const codeNorm = v.code.trim().toLowerCase();
        const dupOther = (excludeId: string | undefined) =>
            rows.some(
                (r) => r.id !== excludeId && r.code.trim().toLowerCase() === codeNorm
            );

        if (editing) {
            if (dupOther(editing.id)) {
                form.setFields([{ name: 'code', errors: ['Code must be unique'] }]);

                return;
            }
            setRows((prev) =>
                prev.map((r) =>
                    r.id === editing.id
                        ? { ...r, ...v }
                        : r
                )
            );
            toast.success('PetMover updated');
        } else if (dupOther(undefined)) {
            form.setFields([{ name: 'code', errors: ['Code must be unique'] }]);

            return;
        } else {
            setRows((prev) => [...prev, { id: newId(), ...v }]);
            toast.success('PetMover created');
        }
        setModalOpen(false);
        setEditing(null);
    }, [editing, form, rows]);

    const requestDelete = useCallback((record: PetMoverRow) => {
        Modal.confirm({
            title: 'Delete PetMover?',
            content: `Remove “${record.name}” (${record.code})?`,
            okText: 'Delete',
            okButtonProps: { danger: true },
            cancelText: 'Cancel',
            onOk: () => {
                setRows((prev) => prev.filter((r) => r.id !== record.id));
                toast.success('PetMover deleted');
            },
        });
    }, []);

    const columns: ColumnsType<PetMoverRow> = useMemo(
        () => [
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Code', dataIndex: 'code', key: 'code', width: 140 },
            {
                title: 'Type',
                key: 'movementType',
                width: 140,
                render: (_, record) => (record.movementType === 'taxi' ? 'Taxi' : 'Shipping'),
            },
            { title: 'Curr.', dataIndex: 'currency', key: 'currency', width: 64 },
            {
                title: 'Active',
                dataIndex: 'active',
                key: 'active',
                width: 90,
                render: (v: boolean) => (v ? 'Yes' : 'No'),
            },
            {
                title: 'Actions',
                key: 'actions',
                width: 180,
                render: (_, record) => (
                    <Space>
                        <Button
                            type="link"
                            size="small"
                            data-testid={`pet-mover-edit-${record.code}`}
                            onClick={() => openEdit(record)}
                        >
                            Edit
                        </Button>
                        <Button
                            type="link"
                            danger
                            size="small"
                            data-testid={`pet-mover-delete-${record.code}`}
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
        <div data-testid="pet-movers-page">
            <Space align="center" style={{ marginBottom: 16 }} wrap>
                <h2 style={{ margin: 0 }}>PetMovers</h2>
                <Button type="primary" data-testid="pet-movers-add" onClick={openCreate}>
                    Add PetMover
                </Button>
            </Space>
            <p style={{ marginBottom: 16, color: 'rgba(0,0,0,0.55)' }}>
                PetMovers directory (PetAdmin only).
            </p>
            <div data-testid="pet-movers-table">
                <Table<PetMoverRow>
                    columns={columns}
                    dataSource={rows}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: 'No PetMovers yet' }}
                />
            </div>

            <Modal
                title={editing ? 'Edit PetMover' : 'Add PetMover'}
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setEditing(null);
                }}
                onOk={submitModal}
                okText="Save"
                destroyOnClose
                data-testid="pet-mover-modal"
            >
                <Form
                    data-testid="pet-mover-form"
                    form={form}
                    layout="vertical"
                    className="ant-form"
                    initialValues={{
                        active: true,
                        currency: 'EUR',
                        cars: '',
                        drivers: '',
                        movementType: 'shipping',
                    }}
                >
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="pet-mover-field-name" />
                    </Form.Item>
                    <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="pet-mover-field-code" />
                    </Form.Item>
                    <Form.Item
                        name="movementType"
                        label="Movement type"
                        rules={[{ required: true, message: 'Required' }]}
                        tooltip="Shipping is used for PetShipping routes. Taxi is used for city address-to-address delivery."
                    >
                        <Select options={MOVEMENT_TYPE_OPTIONS} data-testid="pet-mover-field-movement-type" />
                    </Form.Item>
                    <Form.Item name="cars" label="Cars">
                        <Input.TextArea
                            rows={2}
                            placeholder="Optional"
                            data-testid="pet-mover-field-cars"
                        />
                    </Form.Item>
                    <Form.Item name="drivers" label="Drivers">
                        <Input.TextArea
                            rows={2}
                            placeholder="Optional"
                            data-testid="pet-mover-field-drivers"
                        />
                    </Form.Item>
                    <Form.Item
                        name="currency"
                        label="Currency"
                        tooltip="Pet ship and booking prices use this tariff currency (EUR / USD rates)."
                        rules={[{ required: true }]}
                    >
                        <Select options={CURRENCY_OPTIONS} data-testid="pet-mover-field-currency" />
                    </Form.Item>
                    <Form.Item name="active" label="Active" valuePropName="checked">
                        <Switch data-testid="pet-mover-field-active" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
