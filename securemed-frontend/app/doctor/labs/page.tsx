'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import LabOrderForm from '@/components/portals/doctor/labs/lab-order-form';
import { toast } from 'sonner';

interface DoctorPatient {
    id: number;
    displayId: string;
    name: string;
    mrn: string;
}

export default function LabsPage() {
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<DoctorPatient[]>([]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const fetchPatients = async () => {
            try {
                const res = await api.get('/patients/');
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setPatients(data.map((p: any) => ({
                    id: p.id,
                    displayId: p.patient_id || `P-${p.id}`,
                    mrn: p.patient_id || `P-${p.id}`,
                    name: `${p.user_first_name} ${p.user_last_name}`.trim(),
                })));
            } catch (error) {
                console.error('Error fetching patients for Labs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, [isAuthenticated]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-foreground tracking-tight">Lab Orders</h2>
            <LabOrderForm
                patients={patients}
                onSubmitOrder={async (order) => {
                    console.log("Order submitted:", order);
                    toast.success("Lab order submitted successfully");
                    return Promise.resolve();
                }}
            />
        </div>
    );
}
