import { BRAND_LOGO_SRC, BRAND_NAME } from '../brand';

type BrandLogoProps = {
    height?: number;
    className?: string;
};

export function BrandLogo ({ height = 56, className }: BrandLogoProps): JSX.Element {
    return (
        <img
            src={BRAND_LOGO_SRC}
            alt={BRAND_NAME}
            height={height}
            className={className}
            style={{
                display: 'block',
                width: 'auto',
                maxWidth: '100%',
                height,
                objectFit: 'contain',
            }}
            draggable={false}
        />
    );
}
