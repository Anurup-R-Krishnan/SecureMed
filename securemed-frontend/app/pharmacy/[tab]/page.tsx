'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import PharmacyPortal from '@/components/portals/pharmacy-portal';
import RoleGuard from '@/components/auth/role-guard';
import { getPortalRouteForRole, ROUTES, VALID_TABS } from '@/lib/routes';

type PharmacyTab = (typeof VALID_TABS.pharmacy)[number];

export default function PharmacyTabPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const tab = params.tab as string;

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            router.push(ROUTES.LOGIN);
            return;
        }
        if (user?.role !== 'pharmacist') {
            router.push(getPortalRouteForRole(user?.role || ''));
            return;
        }
        if (!VALID_TABS.pharmacy.includes(tab as PharmacyTab)) {
            router.replace(ROUTES.PHARMACY_DASHBOARD);
        }
    }, [isLoading, isAuthenticated, user, router, tab]);

    if (isLoading || !isAuthenticated || user?.role !== 'pharmacist') {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const currentTab: PharmacyTab = VALID_TABS.pharmacy.includes(tab as PharmacyTab)
        ? (tab as PharmacyTab)
        : 'dashboard';

    const handleLogout = () => {
        logout();
        router.push(ROUTES.HOME);
    };

    const handleSwitchRole = (role: 'patient' | 'doctor' | 'admin' | null) => {
        if (role) {
            router.push(getPortalRouteForRole(role));
        } else {
            router.push(ROUTES.HOME);
        }
    };

    return (
        <RoleGuard allowedRoles={['pharmacist']}>
            <PharmacyPortal
                currentTab={currentTab}
                onTabChange={(newTab) => router.push(`/pharmacy/${newTab}`)}
                onLogout={handleLogout}
                onSwitchRole={handleSwitchRole}
            />
        </RoleGuard>
    );
}
