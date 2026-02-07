'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import DoctorPortal from '@/components/portals/doctor-portal';

export default function DoctorPage() {
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuth();

    useEffect(() => {
        // Redirect if not logged in
        if (!isAuthenticated) {
            router.push('/');
            return;
        }

        // Security: Redirect if user is not a doctor (provider)
        if (user?.role !== 'provider') {
            router.push('/portal');
            return;
        }
    }, [isAuthenticated, user, router]);

    // Don't render until we've verified the user
    if (!isAuthenticated || user?.role !== 'provider') {
        return null;
    }

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const handleSwitchRole = (role: 'patient' | 'doctor' | 'admin' | null) => {
        if (role === 'patient') {
            router.push('/portal');
        } else if (role === 'admin') {
            window.location.href = 'http://localhost:8000/admin';
        }
    };

    return <DoctorPortal onLogout={handleLogout} onSwitchRole={handleSwitchRole} />;
}
