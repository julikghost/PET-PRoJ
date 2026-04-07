import { Button, Form, Input } from 'antd';
import { Flex } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { BRAND_NAME } from '../brand';
import { petTheme } from '../theme/palette';
import { ROLE_PET_ACCOUNTANT, ROLE_PET_ADMIN, ROLE_PET_USER } from '../auth';

export function LoginPage (): JSX.Element {
    const navigate = useNavigate();
    const user = import.meta.env.VITE_PET_USER as string | undefined;
    const pass = import.meta.env.VITE_PET_PASSWORD as string | undefined;
    const adminUser = import.meta.env.VITE_PET_ADMIN_USER as string | undefined;
    const adminPass = import.meta.env.VITE_PET_ADMIN_PASSWORD as string | undefined;
    const accountantUser = import.meta.env.VITE_PET_ACCOUNTANT_USER as string | undefined;
    const accountantPass = import.meta.env.VITE_PET_ACCOUNTANT_PASSWORD as string | undefined;

    return (
        <Flex
            vertical
            align="center"
            justify="center"
            style={{ minHeight: '100vh', padding: 24 }}
        >
            <Flex vertical align="center" gap={16} style={{ marginBottom: 8 }}>
                <BrandLogo height={120} />
                <span style={{ fontSize: 20, fontWeight: 600, color: petTheme.text }}>{BRAND_NAME}</span>
            </Flex>
            <div
                style={{
                    width: '100%',
                    maxWidth: 400,
                    padding: 24,
                    background: 'rgba(255,255,255,0.94)',
                    border: `1px solid ${petTheme.mutedBorder}`,
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    color: petTheme.text,
                    backdropFilter: 'blur(8px)',
                }}
            >
                <h1 style={{ marginTop: 0, fontSize: 22 }}>Sign in</h1>
                <form
                    action="/login"
                    method="POST"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const identifier = String(fd.get('identifier') ?? '');
                        const password = String(fd.get('password') ?? '');

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
                    }}
                >
                    <Form.Item label="Email" style={{ marginBottom: 12 }}>
                        <Input name="identifier" type="text" autoComplete="username" />
                    </Form.Item>
                    <Form.Item label="Password" style={{ marginBottom: 12 }}>
                        <Input.Password name="password" autoComplete="current-password" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block>
                        Sign in
                    </Button>
                </form>
            </div>
        </Flex>
    );
}
