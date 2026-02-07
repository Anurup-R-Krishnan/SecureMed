'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import PatientPortal from '@/components/portals/patient-portal';

export default function PatientPage() {
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuth();

    useEffect(() => {
        // Redirect if not logged in
        if (!isAuthenticated) {
            router.push('/');
            return;
        }

        // Security: Redirect if user is not a patient
        if (user?.role !== 'patient') {
            // If they're a doctor (either 'doctor' or 'provider' role), send them to doctor portal
            if (user?.role === 'doctor' || user?.role === 'provider') {
                router.push('/doctor');
            } else {
                // Otherwise send them home
                router.push('/');
            }
            return;
        }
    }, [isAuthenticated, user, router]);

    // Don't render until we've verified the user
    if (!isAuthenticated || user?.role !== 'patient') {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const handleSwitchRole = (role: 'patient' | 'doctor' | 'admin' | null) => {
        if (role === 'doctor') {
            router.push('/doctor');
        } else if (role === 'patient') {
            router.push('/portal');
        } else {
            router.push('/');
        }
    };

    return <PatientPortal onLogout={handleLogout} onSwitchRole={handleSwitchRole} />;
}
