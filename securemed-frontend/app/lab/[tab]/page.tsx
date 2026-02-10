'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import LabTechnicianPortal from '@/components/portals/lab-technician-portal';
import RoleGuard from '@/components/auth/role-guard';
import { getPortalRouteForRole, ROUTES, VALID_TABS } from '@/lib/routes';

type LabTab = (typeof VALID_TABS.lab)[number];

export default function LabTabPage() {
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
        if (user?.role !== 'lab_technician') {
            router.push(getPortalRouteForRole(user?.role || ''));
            return;
        }
        if (!VALID_TABS.lab.includes(tab as LabTab)) {
            router.replace(ROUTES.LAB_WORKLIST);
        }
    }, [isLoading, isAuthenticated, user, router, tab]);

    if (isLoading || !isAuthenticated || user?.role !== 'lab_technician') {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const currentTab: LabTab = VALID_TABS.lab.includes(tab as LabTab)
        ? (tab as LabTab)
        : 'worklist';

    const handleLogout = () => {
        logout();
        router.push(ROUTES.HOME);
    };

    const handleSwitchRole = (role: 'patient' | 'doctor' | 'admin' | 'lab_technician' | null) => {
        if (role) {
            router.push(getPortalRouteForRole(role));
        } else {
            router.push(ROUTES.HOME);
        }
    };

    return (
        <RoleGuard allowedRoles={['lab_technician']}>
            <LabTechnicianPortal
                currentTab={currentTab}
                onTabChange={(newTab) => router.push(`/lab/${newTab}`)}
                onLogout={handleLogout}
                onSwitchRole={handleSwitchRole}
            />
        </RoleGuard>
    );
}
