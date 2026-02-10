'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import LoginModal from '@/components/auth/login-modal';
import { getPortalRouteForRole } from '@/lib/routes';

export default function LoginPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();

    // If already authenticated, redirect to the appropriate portal
    useEffect(() => {
        if (isAuthenticated && user) {
            router.replace(getPortalRouteForRole(user.role));
        }
    }, [isAuthenticated, user, router]);

    if (isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Redirecting to your dashboard...</p>
            </div>
        );
    }

    return (
        <LoginModal
            isOpen={true}
            onClose={() => router.push('/')}
        />
    );
}
