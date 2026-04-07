import { Button, Form, Select, DatePicker } from 'antd';
import { toast } from 'sonner';
import { BrandLogo } from '../components/BrandLogo';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const API_BASE = `${window.location.origin}/api`;

/** Labels must match default `utils/text.ts` in the e2e repo. */
const LABELS = {
    carrier: 'PetMover',
    dateRange: 'Date',
    paymentType: 'Payment methods',
    currency: 'Currency',
};

const CARRIER_OPTIONS = [{ value: 'carrier-pet-1', label: 'PetMover' }];

const PAYMENT_OPTIONS = [
    { value: 'card', label: 'Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'petpay', label: 'PetPay' },
];

const CURRENCY_OPTIONS = [
    { value: 'cur-usd', label: 'USD' },
    { value: 'cur-eur', label: 'EUR' },
];

export function ReportsPage (): JSX.Element {
    const [form] = Form.useForm<{
        carrier: string;
        range: [Dayjs, Dayjs];
        payments: string[];
        currencies: string[];
    }>();

    const initialRange: [Dayjs, Dayjs] = [dayjs().startOf('month'), dayjs().endOf('month')];

    return (
        <div>
            <h2>Reports</h2>
            <Form
                form={form}
                layout="vertical"
                className="ant-form"
                initialValues={{
                    carrier: 'carrier-pet-1',
                    range: initialRange,
                    // Empty so Playwright `selectOptions` clicks add tags (pre-filled multi would toggle off).
                    payments: [],
                    currencies: [],
                }}
            >
                <Form.Item name="carrier" label={LABELS.carrier}>
                    <Select showSearch options={CARRIER_OPTIONS} />
                </Form.Item>
                <Form.Item name="range" label={LABELS.dateRange}>
                    <RangePicker
                        format="YYYY-MM-DD"
                        placeholder={['Start date', 'End date']}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
                <Form.Item name="payments" label={LABELS.paymentType}>
                    <Select mode="multiple" options={PAYMENT_OPTIONS} />
                </Form.Item>
                <Form.Item name="currencies" label={LABELS.currency}>
                    <Select mode="multiple" options={CURRENCY_OPTIONS} />
                </Form.Item>
                <Form.Item>
                    <Button
                        type="primary"
                        onClick={async () => {
                            try {
                                await form.validateFields();
                                const carrier = form.getFieldValue('carrier');
                                const range = form.getFieldValue('range') as [Dayjs, Dayjs];
                                const payments = form.getFieldValue('payments');
                                const currencies = form.getFieldValue('currencies');
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
                                            carrierIds: [carrier],
                                            emailForSendReport:
                                                import.meta.env.VITE_PET_USER ||
                                                'pet@example.com',
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
                                toast.success('Submitted successfully', {
                                    icon: <BrandLogo height={28} />,
                                });
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
