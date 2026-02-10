'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import PatientBilling from '@/components/portals/patient/billing/billing';

export default function BillingPage() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-black text-foreground tracking-tight">Billing & Insurance</h3>
                <p className="text-muted-foreground">View invoices, payments, and insurance details</p>
            </div>

            <PatientBilling patient={user?.patient_profile} />
        </div>
    );
}
