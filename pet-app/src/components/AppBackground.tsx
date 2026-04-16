import { useLocation } from 'react-router-dom';
import { CADILLAC_PATTERN_SRC } from '../brand';
import { petTheme } from '../theme/palette';

/**
 * Full-viewport background: plain fill on `/login`; repeating pattern elsewhere.
 */
export function AppBackground (): JSX.Element {
    const { pathname } = useLocation();
    const isLogin = pathname === '/login';

    if (isLogin) {
        return (
            <div
                aria-hidden
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 0,
                    pointerEvents: 'none',
                    backgroundColor: petTheme.pageBg,
                }}
            />
        );
    }

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
