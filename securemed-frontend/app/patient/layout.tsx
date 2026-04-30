'use client';

import React from 'react';
import { PortalLayout } from '@/components/layout/portal-layout';
import AiTriageWidget from '@/components/portals/patient/ai-triage-widget';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
    return (
        <PortalLayout
            userType="patient"
            allowedRoles={['patient']}
            extraWidgets={<AiTriageWidget />}
        >
            {children}
        </PortalLayout>
    );
}
