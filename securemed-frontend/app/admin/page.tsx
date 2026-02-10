'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

/** /admin → redirects to /admin/dashboard */
export default function AdminIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace(ROUTES.ADMIN_DASHBOARD);
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="text-muted-foreground">Loading admin portal...</div>
        </div>
    );
}
