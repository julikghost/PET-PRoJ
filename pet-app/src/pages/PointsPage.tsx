import { useCallback, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { toast } from 'sonner';
import { usePetLogistics } from '../context/PetLogisticsContext';
import { petTheme } from '../theme/palette';
import type { PointRecord } from '../types/petLogistics';

const KIND_OPTIONS = [
    { value: 'hub', label: 'Hub' },
    { value: 'stop', label: 'Stop' },
    { value: 'airport', label: 'Airport' },
];

const kindColor: Record<PointRecord['kind'], string> = {
    hub: 'geekblue',
    stop: 'default',
    airport: 'cyan',
};

export function PointsPage (): JSX.Element {
    const { points, upsertPoint, deletePoint } = usePetLogistics();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PointRecord | null>(null);
    const [form] = Form.useForm<Pick<PointRecord, 'code' | 'name' | 'city' | 'kind'>>();

    const openCreate = useCallback(() => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ code: '', name: '', city: '', kind: 'hub' });
        setModalOpen(true);
    }, [form]);

    const openEdit = useCallback(
        (record: PointRecord) => {
            setEditing(record);
            form.setFieldsValue(record);
            setModalOpen(true);
        },
        [form]
    );

    const submitModal = useCallback(async () => {
        const v = await form.validateFields();
        const ok = upsertPoint(
            editing
                ? { ...v, id: editing.id }
                : v
        );
        if (ok) {
            toast.success(editing ? 'Point updated' : 'Point created');
            setModalOpen(false);
            setEditing(null);
        }
    }, [editing, form, upsertPoint]);

    const requestDelete = useCallback(
        (record: PointRecord) => {
            Modal.confirm({
                title: 'Delete point?',
                content: `Remove “${record.name}” (${record.code})?`,
                okText: 'Delete',
                okButtonProps: { danger: true },
                cancelText: 'Cancel',
                onOk: () => {
                    const ok = deletePoint(record.id);
                    if (ok) {
                        toast.success('Point deleted');
                    }
                },
            });
        },
        [deletePoint]
    );

    const columns: ColumnsType<PointRecord> = useMemo(
        () => [
            { title: 'Code', dataIndex: 'code', key: 'code', width: 110 },
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'City', dataIndex: 'city', key: 'city', width: 160 },
            {
                title: 'Kind',
                dataIndex: 'kind',
                key: 'kind',
                width: 120,
                render: (k: PointRecord['kind']) => (
                    <Tag color={kindColor[k]}>{KIND_OPTIONS.find((o) => o.value === k)?.label ?? k}</Tag>
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
                            data-testid={`point-edit-${record.code}`}
                            onClick={() => openEdit(record)}
                        >
                            Edit
                        </Button>
                        <Button
                            type="link"
                            danger
                            size="small"
                            data-testid={`point-delete-${record.code}`}
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
        <div data-testid="points-page">
            <Space align="center" style={{ marginBottom: 16 }} wrap>
                <h2 style={{ margin: 0, color: petTheme.text }}>Points</h2>
                <Button type="primary" data-testid="points-add" onClick={openCreate}>
                    Add point
                </Button>
            </Space>
            <p style={{ marginBottom: 16, color: petTheme.textMuted }}>
                Create network points first. PetShipping routes and bookings depend on this directory.
            </p>
            <div data-testid="points-table">
                <Table<PointRecord>
                    columns={columns}
                    dataSource={points}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: 'No points yet' }}
                />
            </div>

            <Modal
                title={editing ? 'Edit point' : 'New point'}
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setEditing(null);
                }}
                onOk={submitModal}
                okText="Save"
                destroyOnClose
            >
                <Form data-testid="points-form" form={form} layout="vertical" className="ant-form">
                    <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="points-field-code" />
                    </Form.Item>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                        <Input data-testid="points-field-name" />
                    </Form.Item>
                    <Form.Item name="city" label="City" rules={[{ required: true }]}>
                        <Input data-testid="points-field-city" />
                    </Form.Item>
                    <Form.Item name="kind" label="Kind" rules={[{ required: true }]}>
                        <Select options={KIND_OPTIONS} data-testid="points-field-kind" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
