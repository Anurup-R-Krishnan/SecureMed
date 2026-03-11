'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import PrescriptionWriter from '@/components/portals/doctor/prescriptions/prescription-writer';
import SignPrescriptionModal from '@/components/portals/doctor/prescriptions/sign-prescription-modal';
import { Button } from '@/components/ui/button';
import { ShieldAlert, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface DoctorPatient {
    id: number;
    displayId: string;
    name: string;
}

export default function PrescriptionsPage() {
    const { isAuthenticated } = useAuth();
    const searchParams = useSearchParams();
    const preselectPatientId = searchParams?.get('patient_id') || '';
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<DoctorPatient[]>([]);
    const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);

    // Signing Modal State
    const [showSignModal, setShowSignModal] = useState(false);
    const [signingPrescription, setSigningPrescription] = useState<any>(null);

    const fetchPatients = async () => {
        try {
            const res = await api.get('/patients/');
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setPatients(data.map((p: any) => ({
                id: p.id,
                displayId: p.patient_id || `P-${p.id}`,
                name: `${p.user_first_name} ${p.user_last_name}`.trim()
            })));
        } catch (error) {
            console.error('Error fetching patients for RX:', error);
        }
    };

    const fetchRecentPrescriptions = async () => {
        try {
            const res = await api.get('/medical-records/prescriptions/');
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setRecentPrescriptions(data.filter((p: any) => !p.is_signed));
        } catch (e) {
            console.error("Failed to fetch recent prescriptions", e);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        setLoading(true);
        Promise.all([fetchPatients(), fetchRecentPrescriptions()])
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-foreground tracking-tight">Prescriptions</h2>

            <PrescriptionWriter
                patients={patients}
                initialPatientId={preselectPatientId}
                onSuccess={() => {
                    toast.success("Prescription created");
                    fetchRecentPrescriptions();
                }}
            />

            {recentPrescriptions.length > 0 && (
                <div className="bg-card rounded-lg border border-border p-6 not-prose">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        Pending Signatures ({recentPrescriptions.length})
                    </h3>
                    <div className="space-y-3">
                        {recentPrescriptions.map((rx) => (
                            <div key={rx.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <div>
                                    <p className="font-medium">{rx.medication_name} <span className="text-muted-foreground text-sm">({rx.dosage})</span></p>
                                    <p className="text-sm text-muted-foreground">Patient ID: {rx.patient} • {new Date(rx.created_at || Date.now()).toLocaleDateString()}</p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setSigningPrescription(rx);
                                        setShowSignModal(true);
                                    }}
                                    className="gap-2"
                                >
                                    <FileText className="h-4 w-4" />
                                    Sign
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Signing Modal */}
            <SignPrescriptionModal
                isOpen={showSignModal}
                prescription={signingPrescription}
                onClose={() => {
                    setShowSignModal(false);
                    setSigningPrescription(null);
                }}
                onSuccess={() => {
                    toast.success("Prescription signed successfully");
                    fetchRecentPrescriptions();
                }}
            />
        </div>
    );
}
