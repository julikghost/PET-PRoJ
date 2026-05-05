import { useCallback, useMemo, useState } from 'react';
import { Avatar, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { toast } from '../petToast';
import { DOG_DAYCARE_STATUS_OPTIONS } from '../data/reportsAndBookingOptions';
import { usePetLogistics } from '../context/PetLogisticsContext';
import { petTheme } from '../theme/palette';
import type { DogDaycareRecord, DogDaycareStatus, PetShipCurrency } from '../types/petLogistics';
import {
    computeDogDaycareDays,
    computeDogDaycarePrice,
    DOG_DAYCARE_HOURS_PER_DAY_OPTIONS,
} from '../utils/pricing';

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

const DATE_FMT = 'YYYY-MM-DD';
const MAX_PET_PHOTO_SIZE_MB = 3;

const DOG_BREEDS_TOP_20 = [
    'Australian Shepherd',
    'Beagle',
    'Bernese Mountain Dog',
    'Border Collie',
    'Boxer',
    'Bulldog',
    'Chihuahua',
    'Cocker Spaniel',
    'Dachshund',
    'Doberman',
    'German Shepherd',
    'Golden Retriever',
    'Great Dane',
    'Husky',
    'Labrador Retriever',
    'Maltese',
    'Pembroke Welsh Corgi',
    'Pomeranian',
    'Poodle',
    'Pug',
    'Rottweiler',
    'Shiba Inu',
    'Welsh Cardigan Corgi',
    'Yorkshire Terrier',
].sort((a, b) => a.localeCompare(b));

function formatDogAge (years: number, months: number): string {
    const parts: string[] = [];
    if (years > 0) {
        parts.push(`${years}y`);
    }
    if (months > 0) {
        parts.push(`${months}m`);
    }

    return parts.length > 0 ? parts.join(' ') : '0m';
}

function fileToDataUrl (file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);

                return;
            }
            reject(new Error('Invalid image payload'));
        };
        reader.onerror = () => reject(new Error('Cannot read image file'));
        reader.readAsDataURL(file);
    });
}

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
        startDate: dayjs.Dayjs;
        endDate: dayjs.Dayjs;
        clientFirstName: string;
        clientLastName: string;
        dogName: string;
        petPhotoUrl?: string;
        breed?: string;
        ageText: string;
        currency: PetShipCurrency;
        hoursPerDay: number;
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
            startDate: dayjs(),
            endDate: dayjs(),
            clientFirstName: '',
            clientLastName: '',
            dogName: '',
            petPhotoUrl: undefined,
            breed: undefined,
            ageText: '',
            currency: 'EUR',
            hoursPerDay: 4,
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
                startDate: record.startDate ? dayjs(record.startDate, DATE_FMT) : dayjs(),
                endDate: record.endDate ? dayjs(record.endDate, DATE_FMT) : dayjs(),
                clientFirstName: record.clientFirstName,
                clientLastName: record.clientLastName,
                dogName: record.dogName,
                petPhotoUrl: record.petPhotoUrl,
                breed: record.breed,
                ageText: formatDogAge(record.ageYears, record.ageMonths),
                currency: record.currency,
                hoursPerDay: record.hoursPerDay,
                status: record.status,
                petSeaterId: record.petSeaterId,
                notes: record.notes,
            });
            setModalOpen(true);
        },
        [form]
    );

    const parseAgeText = useCallback((ageText: string): { years: number; months: number } | null => {
        const norm = ageText.replace(/,/g, ' ').toLowerCase();
        const matches = Array.from(norm.matchAll(/(\d+)(\s*[ym]|[^\d\s]+)?/g));
        if (matches.length === 0) return null;
        let years = 0;
        let months = 0;
        for (const m of matches) {
            const value = Number(m[1]);
            const unit = m[2]?.trim() ?? '';
            if (unit.startsWith('y')) {
                years += value;
            } else if (unit.startsWith('m')) {
                months += value;
            } else if (!unit) {
                if (years === 0) {
                    years += value;
                } else {
                    months += value;
                }
            }
        }
        if (months >= 12) {
            years += Math.floor(months / 12);
            months = months % 12;
        }
        if (years < 0 || months < 0 || months > 11 || Number.isNaN(years) || Number.isNaN(months)) {
            return null;
        }
        return { years, months };
    }, []);

    const submitModal = useCallback(async () => {
        const v = await form.validateFields();
        const ageParsed = parseAgeText(v.ageText);
        if (!ageParsed) {
            toast.error('Enter age like "1y 5m" or "18m"');
            return;
        }
        const payload = {
            ...v,
            startDate: v.startDate.format(DATE_FMT),
            endDate: v.endDate.format(DATE_FMT),
            breed: v.breed?.trim() ?? '',
            ageYears: ageParsed.years,
            ageMonths: ageParsed.months,
            hoursPerDay: Number(v.hoursPerDay),
            clientFirstName: v.clientFirstName,
            clientLastName: v.clientLastName,
            petSeaterId: typeof v.petSeaterId === 'string' ? v.petSeaterId : undefined,
            petPhotoUrl: typeof v.petPhotoUrl === 'string' && v.petPhotoUrl.trim() ? v.petPhotoUrl : undefined,
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

    const clearPhoto = useCallback(() => {
        form.setFieldValue('petPhotoUrl', undefined);
    }, [form]);

    const handlePhotoBeforeUpload = useCallback<NonNullable<UploadProps['beforeUpload']>>(
        async (file) => {
            if (!file.type.startsWith('image/')) {
                toast.error('Only image files are supported');

                return Upload.LIST_IGNORE;
            }
            const maxBytes = MAX_PET_PHOTO_SIZE_MB * 1024 * 1024;
            if (file.size > maxBytes) {
                toast.error(`Image size must be <= ${MAX_PET_PHOTO_SIZE_MB} MB`);

                return Upload.LIST_IGNORE;
            }
            try {
                const dataUrl = await fileToDataUrl(file as File);
                form.setFieldValue('petPhotoUrl', dataUrl);
            } catch {
                toast.error('Failed to load image');
            }

            return Upload.LIST_IGNORE;
        },
        [form]
    );

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
            { title: 'Booking', dataIndex: 'bookingRefCode', key: 'bookingRefCode', width: 130 },
            { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', width: 120 },
            {
                title: 'End Date',
                dataIndex: 'endDate',
                key: 'endDate',
                width: 120,
            },
            { title: 'Dog', dataIndex: 'dogName', key: 'dogName', width: 140 },
            {
                title: 'Photo',
                key: 'petPhotoUrl',
                width: 90,
                render: (_, record) => (
                    record.petPhotoUrl
                        ? (
                            <Avatar
                                src={record.petPhotoUrl}
                                shape="circle"
                                size={40}
                                data-testid={`daycare-thumb-${record.refCode}`}
                            />
                        )
                        : '—'
                ),
            },
            { title: 'Breed', dataIndex: 'breed', key: 'breed', width: 170 },
            {
                title: 'Age',
                key: 'age',
                width: 110,
                render: (_, record) => formatDogAge(record.ageYears, record.ageMonths),
            },
            {
                title: 'Hours/day',
                dataIndex: 'hoursPerDay',
                key: 'hoursPerDay',
                width: 95,
            },
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
                Manage daycare with start/end dates, daily hours and optional pet seater assignment.
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
                style={{ top: 24 }}
                bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
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
                        name="clientFirstName"
                        label="Client First Name"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input data-testid="daycare-field-client-first-name" />
                    </Form.Item>
                    <Form.Item
                        name="clientLastName"
                        label="Client Last Name"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input data-testid="daycare-field-client-last-name" />
                    </Form.Item>
                    <Form.Item
                        name="startDate"
                        label="Start Date"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <div data-testid="daycare-field-start-date">
                            <DatePicker style={{ width: '100%' }} format={DATE_FMT} />
                        </div>
                    </Form.Item>
                    <Form.Item
                        name="endDate"
                        label="End Date"
                        dependencies={['startDate']}
                        rules={[
                            { required: true, message: 'Required' },
                            {
                                validator: (_rule, value) => {
                                    if (!value) {
                                        return Promise.resolve();
                                    }
                                    const start = form.getFieldValue('startDate');
                                    if (!start || !dayjs.isDayjs(start) || !dayjs.isDayjs(value)) {
                                        return Promise.resolve();
                                    }
                                    if (value.isBefore(start, 'day')) {
                                        return Promise.reject(new Error('End date must be >= Start Date'));
                                    }

                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <div data-testid="daycare-field-end-date">
                            <DatePicker style={{ width: '100%' }} format={DATE_FMT} />
                        </div>
                    </Form.Item>
                    <Form.Item name="dogName" label="Dog name" rules={[{ required: true, message: 'Required' }]}>
                        <Input data-testid="daycare-field-dog-name" />
                    </Form.Item>
                    <Form.Item name="petPhotoUrl" hidden>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Pet photo (optional)">
                        <Form.Item
                            noStyle
                            shouldUpdate={(prev, next) => (
                                prev.petPhotoUrl !== next.petPhotoUrl || prev.dogName !== next.dogName
                            )}
                        >
                            {() => {
                                const photoUrl = form.getFieldValue('petPhotoUrl') as string | undefined;
                                const dogName = (form.getFieldValue('dogName') as string | undefined)?.trim() ?? '';
                                const fallback = dogName ? dogName.slice(0, 1).toUpperCase() : 'P';

                                return (
                                    <Space wrap size={12} align="center" data-testid="daycare-field-photo">
                                        <Avatar shape="circle" size={88} src={photoUrl}>
                                            {fallback}
                                        </Avatar>
                                        <Upload
                                            accept="image/*"
                                            showUploadList={false}
                                            beforeUpload={handlePhotoBeforeUpload}
                                        >
                                            <Button data-testid="daycare-photo-upload-btn">Upload photo</Button>
                                        </Upload>
                                        <Button
                                            onClick={clearPhoto}
                                            disabled={!photoUrl}
                                            data-testid="daycare-photo-remove-btn"
                                        >
                                            Remove photo
                                        </Button>
                                    </Space>
                                );
                            }}
                        </Form.Item>
                    </Form.Item>
                    <Form.Item
                        name="breed"
                        label="Breed"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={DOG_BREEDS_TOP_20.map((breed) => ({ value: breed, label: breed }))}
                            placeholder="Select breed"
                            data-testid="daycare-field-breed"
                        />
                    </Form.Item>
                    <Form.Item
                        name="ageText"
                        label="Age (years and months)"
                        rules={[
                            { required: true, message: 'Required' },
                            {
                                validator: async (_, value) => {
                                    if (!value?.trim()) return;
                                    if (!parseAgeText(value)) {
                                        throw new Error('Enter age like "1y 5m" or "18m"');
                                    }
                                },
                            },
                        ]}
                    >
                        <Input
                            data-testid="daycare-field-age-text"
                            placeholder="e.g. 1y 5m or 18m"
                        />
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
                        name="hoursPerDay"
                        label="Hours per day"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Select
                            options={DOG_DAYCARE_HOURS_PER_DAY_OPTIONS.map((value) => ({
                                value,
                                label: `${value}`,
                            }))}
                            data-testid="daycare-field-hours-per-day"
                        />
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
                    <Form.Item dependencies={['startDate', 'endDate', 'currency', 'hoursPerDay']} noStyle>
                        {() => {
                            const start = form.getFieldValue('startDate') as dayjs.Dayjs | undefined;
                            const end = form.getFieldValue('endDate') as dayjs.Dayjs | undefined;
                            const currency = form.getFieldValue('currency') as PetShipCurrency | undefined;
                            const hoursPerDay = Number(form.getFieldValue('hoursPerDay'));
                            if (!start || !end || !currency || !Number.isFinite(hoursPerDay)) {
                                return null;
                            }
                            const startDate = start.format(DATE_FMT);
                            const endDate = end.format(DATE_FMT);
                            const days = computeDogDaycareDays(startDate, endDate);
                            const price = computeDogDaycarePrice(currency, hoursPerDay, startDate, endDate);
                            const hourlyRate = 1;

                            return (
                                <div data-testid="daycare-price-line" style={{ marginBottom: 12 }}>
                                    <div style={{ fontWeight: 600, color: petTheme.text }}>
                                        Price: {price.toFixed(2)} {currency}
                                    </div>
                                    <div style={{ color: petTheme.textMuted, fontSize: 12 }}>
                                        {hourlyRate} × {hoursPerDay}h/day × {days} day(s)
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
