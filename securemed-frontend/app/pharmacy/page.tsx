'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

/** /pharmacy → redirects to /pharmacy/dashboard */
export default function PharmacyIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace(ROUTES.PHARMACY_DASHBOARD);
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="text-muted-foreground">Loading pharmacy portal...</div>
        </div>
    );
}
