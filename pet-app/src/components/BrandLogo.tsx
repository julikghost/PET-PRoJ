import type { CSSProperties } from 'react';
import { BRAND_LOGO_SRC, BRAND_NAME } from '../brand';

type BrandLogoProps = {
    height?: number;
    className?: string;
    style?: CSSProperties;
    /**
     * Fill the parent box (parent must set width and height). Uses `object-fit: contain`
     * so the artwork scales to the div without clipping.
     */
    fitContainer?: boolean;
};

export function BrandLogo ({
    height = 56,
    className,
    style,
    fitContainer = false,
}: BrandLogoProps): JSX.Element {
    if (fitContainer) {
        return (
            <img
                src={BRAND_LOGO_SRC}
                alt={BRAND_NAME}
                className={className}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    ...style,
                }}
                draggable={false}
            />
        );
    }

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
                ...style,
            }}
            draggable={false}
        />
    );
}
