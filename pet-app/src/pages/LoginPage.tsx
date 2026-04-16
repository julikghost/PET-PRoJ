import { App, Button, Flex, Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { BRAND_NAME } from '../brand';
import { petTheme } from '../theme/palette';
import { ROLE_PET_ACCOUNTANT, ROLE_PET_ADMIN, ROLE_PET_USER } from '../auth';

export function LoginPage (): JSX.Element {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [form] = Form.useForm<{ identifier: string; password: string }>();
    const user = import.meta.env.VITE_PET_USER as string | undefined;
    const pass = import.meta.env.VITE_PET_PASSWORD as string | undefined;
    const adminUser = import.meta.env.VITE_PET_ADMIN_USER as string | undefined;
    const adminPass = import.meta.env.VITE_PET_ADMIN_PASSWORD as string | undefined;
    const accountantUser = import.meta.env.VITE_PET_ACCOUNTANT_USER as string | undefined;
    const accountantPass = import.meta.env.VITE_PET_ACCOUNTANT_PASSWORD as string | undefined;

    const hasDemoCredentials =
        Boolean(user && pass)
        || Boolean(adminUser && adminPass)
        || Boolean(accountantUser && accountantPass);

    const onFinish = (values: { identifier: string; password: string }): void => {
        const identifier = values.identifier.trim();
        const password = values.password;

        let role = ROLE_PET_USER;
        if (
            adminUser &&
            adminPass &&
            identifier === adminUser &&
            password === adminPass
        ) {
            role = ROLE_PET_ADMIN;
        } else if (
            accountantUser &&
            accountantPass &&
            identifier === accountantUser &&
            password === accountantPass
        ) {
            role = ROLE_PET_ACCOUNTANT;
        } else if (identifier === user && password === pass) {
            role = ROLE_PET_USER;
        } else {
            if (!hasDemoCredentials) {
                message.error(
                    'Login is not configured. Copy pet-app/.env.example to pet-app/.env and restart Vite.'
                );
            } else {
                message.error('Invalid email or password.');
            }

            return;
        }

        localStorage.setItem(
            'pet-auth',
            JSON.stringify({
                accessToken: 'pet-demo-access-token',
                role,
            })
        );
        navigate(role === ROLE_PET_ACCOUNTANT ? '/reports' : '/home');
    };

    return (
        <Flex
            vertical
            align="center"
            justify="center"
            style={{ minHeight: '100vh', padding: 24, position: 'relative', zIndex: 1 }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 420,
                    padding: 28,
                    /* ~70% transparency (30% opacity) vs solid surface */
                    background: 'rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid rgba(255, 255, 255, 0.45)`,
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                    color: petTheme.text,
                }}
            >
                <Flex vertical align="center" gap={12} style={{ marginBottom: 20 }}>
                    <div
                        style={{
                            width: 'min(100%, 240px)',
                            height: 120,
                            flexShrink: 0,
                            lineHeight: 0,
                        }}
                    >
                        <BrandLogo fitContainer />
                    </div>
                    <span
                        style={{
                            fontSize: 20,
                            fontWeight: 600,
                            color: petTheme.text,
                            lineHeight: 1.3,
                        }}
                    >
                        {BRAND_NAME}
                    </span>
                </Flex>
                <h1 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 600 }}>Sign in</h1>
                <div data-testid="pet-login-form" style={{ width: '100%' }}>
                    <Form
                        form={form}
                        layout="vertical"
                        requiredMark={false}
                        action="/login"
                        method="post"
                        onFinish={onFinish}
                        style={{ width: '100%' }}
                        autoComplete="on"
                    >
                    <Form.Item
                        label="Email"
                        name="identifier"
                        rules={[{ required: true, message: 'Enter email' }]}
                    >
                        <Input
                            type="text"
                            name="identifier"
                            autoComplete="username"
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Password"
                        name="password"
                        rules={[{ required: true, message: 'Enter password' }]}
                    >
                        <Input.Password
                            name="password"
                            autoComplete="current-password"
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            block
                            data-testid="pet-login-submit"
                        >
                            Sign in
                        </Button>
                    </Form.Item>
                    </Form>
                </div>
            </div>
        </Flex>
    );
}
