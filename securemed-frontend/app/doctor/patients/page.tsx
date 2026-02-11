'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import MyPatientsTable from '@/components/portals/doctor/patients/my-patients-table';
import { appointmentService } from '@/services/appointments';

// Types
interface DoctorPatient {
    id: number;
    displayId: string;
    name: string;
    lastVisit: string;
    condition: string;
    status: string;
}

interface RawPatient {
    id: number;
    patient_id?: string;
    user_first_name: string;
    user_last_name: string;
    last_visit?: string;
    chronic_conditions?: string;
}

export default function PatientsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<DoctorPatient[]>([]);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchPatients = async () => {
            setLoading(true);
            try {
                // Try dedicated patients endpoint first
                try {
                    const patientsRes = await api.get('/patients/');
                    const patientData: RawPatient[] = Array.isArray(patientsRes.data) ? patientsRes.data :
                        (patientsRes.data.results || []);

                    setPatients(patientData.map((p) => ({
                        id: p.id,
                        displayId: p.patient_id || `P-${p.id}`,
                        name: `${p.user_first_name} ${p.user_last_name}`.trim(),
                        lastVisit: p.last_visit || '',
                        condition: p.chronic_conditions || '',
                        status: 'Active'
                    })));
                } catch {
                    // Fallback: derive from appointments
                    const appts = await appointmentService.getAppointments();
                    const uniquePatients = new Map<number, DoctorPatient>();
                    appts.forEach((apt) => {
                        if (!uniquePatients.has(apt.patient) && apt.patient_name) {
                            uniquePatients.set(apt.patient, {
                                id: apt.patient,
                                displayId: `P-${apt.patient}`,
                                name: apt.patient_name,
                                lastVisit: apt.appointment_date,
                                condition: '',
                                status: 'Active'
                            });
                        }
                    });
                    setPatients(Array.from(uniquePatients.values()));
                }
            } catch (error) {
                console.error('Error fetching patients:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, [isAuthenticated]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight">My Patients</h3>
                    <p className="text-muted-foreground">Manage your patient list and medical records</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
            ) : (
                <MyPatientsTable
                    patients={patients.map(p => ({
                        id: p.id,
                        name: p.name,
                        status: (p.status as any) || 'Outpatient',
                        lastVisit: p.lastVisit,
                        condition: p.condition,
                    }))}
                    onSelectPatient={(p) => {
                        if (p.id !== undefined && p.id !== null) {
                            router.push(`/doctor/patients/${p.id}`);
                        } else {
                            console.error('Patient ID is missing:', p);
                        }
                    }}
                />
            )}
        </div>
    );
}
