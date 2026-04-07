import { Button, Flex } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { HOME_HEADLINE_EN, HOME_SUBHEADLINE_EN } from '../brand';
import { petTheme } from '../theme/palette';

export function HomePage (): JSX.Element {
    const navigate = useNavigate();

    return (
        <Flex
            vertical
            align="center"
            justify="center"
            gap={28}
            style={{
                padding: '48px 24px',
                minHeight: '100vh',
                position: 'relative',
            }}
        >
            <Flex
                vertical
                align="center"
                gap={20}
                style={{
                    maxWidth: 560,
                    padding: '40px 36px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.88)',
                    border: `1px solid ${petTheme.mutedBorder}`,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                    backdropFilter: 'blur(10px)',
                }}
            >
                <BrandLogo height={120} />
                <h1
                    style={{
                        margin: 0,
                        textAlign: 'center',
                        fontSize: 26,
                        lineHeight: 1.3,
                        fontWeight: 600,
                        color: petTheme.text,
                    }}
                >
                    {HOME_HEADLINE_EN}
                </h1>
                <h3
                    style={{
                        margin: 0,
                        textAlign: 'center',
                        fontSize: 17,
                        lineHeight: 1.55,
                        fontWeight: 500,
                        color: petTheme.textMuted,
                        maxWidth: 480,
                    }}
                >
                    {HOME_SUBHEADLINE_EN}
                </h3>
                <Button type="primary" size="large" onClick={() => navigate('/login')}>
                    Sign in
                </Button>
            </Flex>
        </Flex>
    );
}
