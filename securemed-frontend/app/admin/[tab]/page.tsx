'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import AdminPortal from '@/components/portals/admin-portal';
import RoleGuard from '@/components/auth/role-guard';
import { getPortalRouteForRole, ROUTES, VALID_TABS } from '@/lib/routes';

type AdminTab = (typeof VALID_TABS.admin)[number];

export default function AdminTabPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const tab = params.tab as string;
    const patientIdParam = searchParams?.get('patientId');
    const initialPatientId = patientIdParam ? Number(patientIdParam) : null;

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            router.push(ROUTES.LOGIN);
            return;
        }
        if (user?.role !== 'admin') {
            router.push(getPortalRouteForRole(user?.role || ''));
            return;
        }
        if (!VALID_TABS.admin.includes(tab as AdminTab)) {
            router.replace(ROUTES.ADMIN_DASHBOARD);
        }
    }, [isLoading, isAuthenticated, user, router, tab]);

    if (isLoading || !isAuthenticated || user?.role !== 'admin') {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const currentTab: AdminTab = VALID_TABS.admin.includes(tab as AdminTab)
        ? (tab as AdminTab)
        : 'dashboard';

    const handleLogout = async () => {
        await logout();
        router.replace(ROUTES.HOME);
    };

    const handleSwitchRole = (role: 'patient' | 'doctor' | 'admin' | null) => {
        if (role) {
            router.push(getPortalRouteForRole(role));
        } else {
            router.push(ROUTES.HOME);
        }
    };

    return (
        <RoleGuard allowedRoles={['admin']}>
            <AdminPortal
                currentTab={currentTab}
                initialPatientId={Number.isFinite(initialPatientId) ? initialPatientId : null}
                onTabChange={(newTab) => router.push(`/admin/${newTab}`)}
                onLogout={handleLogout}
                onSwitchRole={handleSwitchRole}
            />
        </RoleGuard>
    );
}
