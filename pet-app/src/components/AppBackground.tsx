import { CADILLAC_PATTERN_SRC } from '../brand';

/**
 * Full-viewport repeating Cadillac pattern (green car, transparent areas in PNG).
 * No blur / no white wash — page chrome stays readable via layout surfaces.
 */
export function AppBackground (): JSX.Element {
    return (
        <div
            aria-hidden
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                backgroundColor: 'transparent',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'transparent',
                    backgroundImage: `url(${CADILLAC_PATTERN_SRC})`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: 'clamp(240px, 36vw, 420px) auto',
                    backgroundPosition: 'center top',
                }}
            />
        </div>
    );
}
