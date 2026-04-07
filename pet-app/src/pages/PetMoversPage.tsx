import { useCallback, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Switch, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { toast } from 'sonner';

export type PetMoverRow = {
    id: string;
    name: string;
    code: string;
    region: string;
    active: boolean;
};

const REGION_OPTIONS = [
    { value: 'EU', label: 'EU' },
    { value: 'US', label: 'US' },
];

function newId (): string {
    return `pm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Carriers-style admin list with create / edit / delete (PetAdmin only). */
export function PetMoversPage (): JSX.Element {
    const [rows, setRows] = useState<PetMoverRow[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PetMoverRow | null>(null);
    const [form] = Form.useForm<Pick<PetMoverRow, 'name' | 'code' | 'region' | 'active'>>();

    const openCreate = useCallback(() => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ name: '', code: '', region: 'EU', active: true });
        setModalOpen(true);
    }, [form]);

    const openEdit = useCallback(
        (record: PetMoverRow) => {
            setEditing(record);
            form.setFieldsValue({
                name: record.name,
                code: record.code,
                region: record.region,
                active: record.active,
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
            { title: 'Region', dataIndex: 'region', key: 'region', width: 100 },
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
                Carriers directory (PetAdmin only).
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
                    initialValues={{ region: 'EU', active: true }}
                >
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="pet-mover-field-name" />
                    </Form.Item>
                    <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="pet-mover-field-code" />
                    </Form.Item>
                    <Form.Item name="region" label="Region" rules={[{ required: true }]}>
                        <Select options={REGION_OPTIONS} data-testid="pet-mover-field-region" />
                    </Form.Item>
                    <Form.Item name="active" label="Active" valuePropName="checked">
                        <Switch data-testid="pet-mover-field-active" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
