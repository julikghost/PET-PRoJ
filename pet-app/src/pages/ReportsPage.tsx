import { useMemo } from 'react';
import { Alert, Button, Form, Input, Select, DatePicker } from 'antd';
import { toast } from '../petToast';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { REPORT_CURRENCY_OPTIONS, REPORT_PAYMENT_OPTIONS } from '../data/reportsAndBookingOptions';
import { petMoverSelectOptions, usePetMovers } from '../petMoversStorage';

const { RangePicker } = DatePicker;

const API_BASE = `${window.location.origin}/api`;

/** Labels must match default `utils/text.ts` in the e2e repo. */
const LABELS = {
    petMover: 'PetMover',
    dateRange: 'Date',
    paymentType: 'Payment methods',
    currency: 'Currency',
    sendReportTo: 'Send report to',
};

export function ReportsPage (): JSX.Element {
    const [petMovers] = usePetMovers();
    const [form] = Form.useForm<{
        petMover: string | undefined;
        range: [Dayjs, Dayjs];
        payments: string[];
        currencies: string[];
        emailForSendReport: string;
    }>();

    const initialRange: [Dayjs, Dayjs] = [dayjs().startOf('month'), dayjs().endOf('month')];

    const petMoverOptions = useMemo(() => petMoverSelectOptions(petMovers, 'id'), [petMovers]);

    const hasActivePetMovers = petMoverOptions.length > 0;

    return (
        <div>
            <h2>Reports</h2>

            <Form
                form={form}
                layout="vertical"
                className="ant-form"
                autoComplete="off"
                initialValues={{
                    range: initialRange,
                    payments: [],
                    currencies: [],
                    emailForSendReport: import.meta.env.VITE_PET_USER || '',
                }}
            >
                {!hasActivePetMovers ? (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message="No active PetMover to select"
                        description="Add at least one active PetMover under PetMovers, then return here."
                    />
                ) : null}
                <Form.Item
                    name="petMover"
                    label={LABELS.petMover}
                    rules={[{ required: true, message: 'Select a PetMover' }]}
                >
                    <Select
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        options={petMoverOptions}
                        placeholder="Select PetMover"
                        data-testid="pet-reports-pet-mover"
                    />
                </Form.Item>
                <Form.Item name="range" label={LABELS.dateRange}>
                    <RangePicker
                        format="YYYY-MM-DD"
                        placeholder={['Start date', 'End date']}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
                <Form.Item name="payments" label={LABELS.paymentType}>
                    <Select mode="multiple" options={[...REPORT_PAYMENT_OPTIONS]} />
                </Form.Item>
                <Form.Item name="currencies" label={LABELS.currency}>
                    <Select mode="multiple" options={[...REPORT_CURRENCY_OPTIONS]} />
                </Form.Item>
                <Form.Item
                    name="emailForSendReport"
                    label={LABELS.sendReportTo}
                    rules={[
                        { required: true, message: 'Enter email' },
                        { type: 'email', message: 'Invalid email' },
                    ]}
                >
                    <Input
                        type="email"
                        placeholder="name@company.com"
                        autoComplete="email"
                        data-testid="pet-reports-send-to-email"
                    />
                </Form.Item>
                <Form.Item>
                    <Button
                        type="primary"
                        onClick={async () => {
                            try {
                                await form.validateFields();
                                const petMoverId = form.getFieldValue('petMover');
                                const range = form.getFieldValue('range') as [Dayjs, Dayjs];
                                const payments = form.getFieldValue('payments');
                                const currencies = form.getFieldValue('currencies');
                                const emailForSendReport = String(
                                    form.getFieldValue('emailForSendReport') ?? ''
                                ).trim();
                                const fromDate = range[0].format('YYYY-MM-DD');
                                const toDate = range[1].format('YYYY-MM-DD');

                                const body = {
                                    operationName: 'EmailTicketsReport',
                                    query: 'mutation EmailTicketsReport { emailTicketsReport { ok } }',
                                    variables: {
                                        req: {
                                            paymentType: payments,
                                            targetColumnForDateSearch: 'departureDate',
                                            fromDate: `${fromDate}T00:00:00.000Z`,
                                            toDate: `${toDate}T23:59:59.999Z`,
                                            petMoverIds: [petMoverId],
                                            emailForSendReport:
                                                emailForSendReport || 'pet@example.com',
                                            currency: currencies,
                                        },
                                    },
                                };

                                const res = await fetch(`${API_BASE}/graphql`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(body),
                                });
                                if (!res.ok) {
                                    throw new Error(String(res.status));
                                }
                                toast.success('Submitted successfully');
                            } catch {
                                toast.error('Submit failed');
                            }
                        }}
                    >
                        Send
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}
