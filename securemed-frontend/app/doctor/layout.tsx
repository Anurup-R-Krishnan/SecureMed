'use client';

import React from 'react';
import { PortalLayout } from '@/components/layout/portal-layout';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    return (
        <PortalLayout
            userType="doctor"
            allowedRoles={['doctor']}
            showCriticalAlert={true}
            showMobileNav={true}
        >
            {children}
        </PortalLayout>
    );
}
