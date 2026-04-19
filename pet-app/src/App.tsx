import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import {
    getAuthSession,
    isPetAccountant,
    isPetAdmin,
    ROLE_PET_ACCOUNTANT,
    ROLE_PET_USER,
} from './auth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ReportsPage } from './pages/ReportsPage';
import { PetMoversPage } from './pages/PetMoversPage';
import { MovementSchedulePage } from './pages/MovementSchedulePage';
import { BookingPage } from './pages/BookingPage';
import { PointsPage } from './pages/PointsPage';
import { DashboardHome } from './pages/DashboardHome';
import { DogDaycarePage } from './pages/DogDaycarePage';
import { PetSeatersPage } from './pages/PetSeatersPage';

function useAuthed (): boolean {
    return getAuthSession() != null;
}

/** Home, PetShipping, Booking, Points (not Reports); accountants redirected to Reports. */
function OperationalShell ({ children }: { children: ReactNode }): JSX.Element {
    const loc = useLocation();
    if (!useAuthed()) {
        return <Navigate to="/" state={{ from: loc }} replace />;
    }
    if (isPetAccountant()) {
        return <Navigate to="/reports" replace />;
    }

    return <AppLayout>{children}</AppLayout>;
}

/** Reports: PetAdmin and PetAccountant only. */
function ReportsShell ({ children }: { children: ReactNode }): JSX.Element {
    const loc = useLocation();
    if (!useAuthed()) {
        return <Navigate to="/" state={{ from: loc }} replace />;
    }
    if (getAuthSession()?.role === ROLE_PET_USER) {
        return <Navigate to="/home" replace />;
    }

    return <AppLayout>{children}</AppLayout>;
}

function RootIndex (): JSX.Element {
    if (!useAuthed()) {
        return <HomePage />;
    }
    if (getAuthSession()?.role === ROLE_PET_ACCOUNTANT) {
        return <Navigate to="/reports" replace />;
    }

    return <Navigate to="/home" replace />;
}

function PetMoversRoute (): JSX.Element {
    const loc = useLocation();
    if (!useAuthed()) {
        return <Navigate to="/" state={{ from: loc }} replace />;
    }
    if (!isPetAdmin()) {
        return <Navigate to={isPetAccountant() ? '/reports' : '/home'} replace />;
    }

    return (
        <AppLayout>
            <PetMoversPage />
        </AppLayout>
    );
}

export function App (): JSX.Element {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RootIndex />} />
            <Route
                path="/home"
                element={
                    <OperationalShell>
                        <DashboardHome />
                    </OperationalShell>
                }
            />
            <Route
                path="/reports"
                element={
                    <ReportsShell>
                        <ReportsPage />
                    </ReportsShell>
                }
            />
            <Route
                path="/schedule"
                element={
                    <OperationalShell>
                        <MovementSchedulePage />
                    </OperationalShell>
                }
            />
            <Route
                path="/booking"
                element={
                    <OperationalShell>
                        <BookingPage />
                    </OperationalShell>
                }
            />
            <Route
                path="/dog-daycare"
                element={
                    <OperationalShell>
                        <DogDaycarePage />
                    </OperationalShell>
                }
            />
            <Route
                path="/pet-seaters"
                element={
                    <OperationalShell>
                        <PetSeatersPage />
                    </OperationalShell>
                }
            />
            <Route
                path="/points"
                element={
                    <OperationalShell>
                        <PointsPage />
                    </OperationalShell>
                }
            />
            <Route path="/pet-movers" element={<PetMoversRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
