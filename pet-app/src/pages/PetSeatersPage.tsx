import { useCallback, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Space, Switch, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { toast } from '../petToast';
import { usePetLogistics } from '../context/PetLogisticsContext';
import { petTheme } from '../theme/palette';
import type { PetSeaterRecord } from '../types/petLogistics';

export function PetSeatersPage (): JSX.Element {
    const { petSeaters, upsertPetSeater, deletePetSeater } = usePetLogistics();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PetSeaterRecord | null>(null);
    const [form] = Form.useForm<Pick<PetSeaterRecord, 'name' | 'code' | 'phone' | 'active'>>();

    const openCreate = useCallback(() => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ name: '', code: '', phone: '', active: true });
        setModalOpen(true);
    }, [form]);

    const openEdit = useCallback(
        (record: PetSeaterRecord) => {
            setEditing(record);
            form.setFieldsValue({
                name: record.name,
                code: record.code,
                phone: record.phone,
                active: record.active,
            });
            setModalOpen(true);
        },
        [form]
    );

    const submitModal = useCallback(async () => {
        const v = await form.validateFields();
        const ok = upsertPetSeater(editing ? { ...v, id: editing.id } : v);
        if (ok) {
            toast.success(editing ? 'Pet seater updated' : 'Pet seater created');
            setModalOpen(false);
            setEditing(null);
        }
    }, [editing, form, upsertPetSeater]);

    const requestDelete = useCallback(
        (record: PetSeaterRecord) => {
            Modal.confirm({
                title: 'Delete pet seater?',
                content: `Remove “${record.name}” (${record.code})?`,
                okText: 'Delete',
                okButtonProps: { danger: true },
                cancelText: 'Cancel',
                onOk: () => {
                    const ok = deletePetSeater(record.id);
                    if (ok) {
                        toast.success('Pet seater deleted');
                    }
                },
            });
        },
        [deletePetSeater]
    );

    const columns: ColumnsType<PetSeaterRecord> = useMemo(
        () => [
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Code', dataIndex: 'code', key: 'code', width: 140 },
            {
                title: 'Phone',
                dataIndex: 'phone',
                key: 'phone',
                width: 170,
                render: (phone: string) => phone || '—',
            },
            {
                title: 'Active',
                dataIndex: 'active',
                key: 'active',
                width: 90,
                render: (active: boolean) => (active ? 'Yes' : 'No'),
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
                            data-testid={`pet-seater-edit-${record.code}`}
                            onClick={() => openEdit(record)}
                        >
                            Edit
                        </Button>
                        <Button
                            type="link"
                            danger
                            size="small"
                            data-testid={`pet-seater-delete-${record.code}`}
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
        <div data-testid="pet-seaters-page">
            <Space align="center" style={{ marginBottom: 16 }} wrap>
                <h2 style={{ margin: 0, color: petTheme.text }}>Pet Seaters</h2>
                <Button type="primary" data-testid="pet-seaters-add" onClick={openCreate}>
                    Add pet seater
                </Button>
            </Space>
            <p style={{ marginBottom: 16, color: petTheme.textMuted }}>
                Manage daycare caretakers. Assignment in Dog Daycare is optional.
            </p>
            <div data-testid="pet-seaters-table">
                <Table<PetSeaterRecord>
                    columns={columns}
                    dataSource={petSeaters}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: 'No pet seaters yet' }}
                />
            </div>

            <Modal
                title={editing ? 'Edit pet seater' : 'Add pet seater'}
                open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setEditing(null);
                }}
                onOk={submitModal}
                okText="Save"
                destroyOnClose
            >
                <Form data-testid="pet-seater-form" form={form} layout="vertical" className="ant-form">
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="pet-seater-field-name" />
                    </Form.Item>
                    <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="pet-seater-field-code" />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone">
                        <Input data-testid="pet-seater-field-phone" />
                    </Form.Item>
                    <Form.Item name="active" label="Active" valuePropName="checked">
                        <Switch data-testid="pet-seater-field-active" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
