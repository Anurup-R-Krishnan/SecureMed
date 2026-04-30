'use client';

import React from 'react';
import { PortalLayout } from '@/components/layout/portal-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <PortalLayout
            userType="admin"
            allowedRoles={['admin', 'sysadmin']}
            showCriticalAlert={true}
        >
            {children}
        </PortalLayout>
    );
}
