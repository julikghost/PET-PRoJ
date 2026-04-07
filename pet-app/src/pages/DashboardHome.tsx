import { petTheme } from '../theme/palette';
import { HOME_HEADLINE_EN, HOME_SUBHEADLINE_EN } from '../brand';

/** Authenticated landing: English copy, inside `AppLayout`. */
export function DashboardHome (): JSX.Element {
    return (
        <div data-testid="dashboard-home">
            <h1
                style={{
                    marginTop: 0,
                    marginBottom: 12,
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
                    maxWidth: 560,
                    marginInline: 'auto',
                }}
            >
                {HOME_SUBHEADLINE_EN}
            </h3>
        </div>
    );
}
