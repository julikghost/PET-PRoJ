import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Button, Flex, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { BRAND_NAME } from '../brand';
import { isPetAccountant, isPetAdmin, signOut } from '../auth';
import { petTheme } from '../theme/palette';

const { Header, Sider, Content } = Layout;

export function AppLayout ({ children }: { children: ReactNode }): JSX.Element {
    const navigate = useNavigate();
    const location = useLocation();
    const admin = isPetAdmin();
    const accountant = isPetAccountant();

    const menuItems: MenuProps['items'] = useMemo(() => {
        if (accountant) {
            return [{ key: 'reports', label: 'Reports' }];
        }
        const items: NonNullable<MenuProps['items']> = [
            { key: 'home', label: 'Home' },
            { key: 'schedule', label: 'PetShipping' },
            { key: 'booking', label: 'Booking' },
            { key: 'dog-daycare', label: 'Dog Daycare' },
            { key: 'pet-seaters', label: 'Pet Seaters' },
            { key: 'points', label: 'Points' },
            { key: 'our-clients', label: 'Our Clients' },
        ];
        if (admin) {
            items.push({ key: 'pet-movers', label: 'PetMovers' });
            items.push({ key: 'reports', label: 'Reports' });
        }
        items.push({ key: 'europe-shows', label: 'Europe Shows' });
        return items;
    }, [admin, accountant]);

    const selectedKeys = useMemo(() => {
        const path = location.pathname;
        if (path.startsWith('/home')) {
            return ['home'];
        }
        if (path.startsWith('/pet-movers')) {
            return ['pet-movers'];
        }
        if (path.startsWith('/reports')) {
            return ['reports'];
        }
        if (path.startsWith('/schedule')) {
            return ['schedule'];
        }
        if (path.startsWith('/booking')) {
            return ['booking'];
        }
        if (path.startsWith('/dog-daycare')) {
            return ['dog-daycare'];
        }
        if (path.startsWith('/pet-seaters')) {
            return ['pet-seaters'];
        }
        if (path.startsWith('/points')) {
            return ['points'];
        }
        if (path.startsWith('/europe-shows')) {
            return ['europe-shows'];
        }
        if (path.startsWith('/our-clients')) {
            return ['our-clients'];
        }
        return [];
    }, [location.pathname]);

    return (
        <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
            <Sider
                width={220}
                style={{
                    background: petTheme.siderBg,
                    borderRight: `1px solid ${petTheme.mutedBorder}`,
                }}
            >
                <Flex vertical align="center" style={{ padding: '16px 12px 12px' }}>
                    <BrandLogo height={72} />
                </Flex>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={selectedKeys}
                    style={{ background: petTheme.siderBg, border: 'none' }}
                    onClick={({ key }) => {
                        const routes: Record<string, string> = {
                            home: '/home',
                            schedule: '/schedule',
                            booking: '/booking',
                            'dog-daycare': '/dog-daycare',
                            'pet-seaters': '/pet-seaters',
                            points: '/points',
                            'pet-movers': '/pet-movers',
                            reports: '/reports',
                            'europe-shows': '/europe-shows',
                            'our-clients': '/our-clients',
                        };
                        const to = routes[key];
                        if (to) {
                            navigate(to);
                        }
                    }}
                    items={menuItems}
                />
            </Sider>
            <Layout>
                <Header
                    style={{
                        background: petTheme.headerBg,
                        color: petTheme.headerText,
                        paddingInline: 24,
                        lineHeight: '64px',
                    }}
                >
                    <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                        <Flex align="center" gap={12}>
                            <span style={{ fontWeight: 600, fontSize: 18 }}>{BRAND_NAME}</span>
                            {admin ? (
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        background: 'rgba(255,255,255,0.12)',
                                    }}
                                >
                                    PetAdmin
                                </span>
                            ) : null}
                            {accountant ? (
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        background: 'rgba(255,255,255,0.12)',
                                    }}
                                >
                                    PetAccountant
                                </span>
                            ) : null}
                        </Flex>
                        <Button
                            type="default"
                            ghost
                            data-testid="pet-quit"
                            onClick={() => {
                                signOut();
                                navigate('/login', { replace: true });
                            }}
                        >
                            Quit
                        </Button>
                    </Flex>
                </Header>
                <Content
                    style={{
                        margin: 16,
                        padding: 16,
                        background: 'rgba(255,255,255,0.92)',
                        borderRadius: 8,
                        border: `1px solid ${petTheme.mutedBorder}`,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    }}
                >
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
}
