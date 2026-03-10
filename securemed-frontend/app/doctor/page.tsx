'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '../../../lib/routes';

/** /doctor → redirects to /doctor/dashboard */
export default function DoctorIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace(ROUTES.DOCTOR_DASHBOARD);
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="text-muted-foreground">Loading doctor portal...</div>
        </div>
    );
}
