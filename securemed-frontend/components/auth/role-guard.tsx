'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getPortalRouteForRole, ROUTES } from '@/lib/routes';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            router.replace(ROUTES.LOGIN);
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (user && !allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
                            <ShieldAlert className="h-12 w-12 text-destructive" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
                        <p className="text-muted-foreground">
                            You do not have permission to view this page.
                            Current role: <span className="font-mono font-bold">{user.role}</span>
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => router.push(getPortalRouteForRole(user.role))}
                    >
                        Go to My Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
