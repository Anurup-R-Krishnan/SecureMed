'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

/** /lab → redirects to /lab/worklist */
export default function LabIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace(ROUTES.LAB_WORKLIST);
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="text-muted-foreground">Loading lab portal...</div>
        </div>
    );
}
